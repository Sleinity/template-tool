import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeTemplatePackageV1ToV2, parseTemplatePackageV2 } from "@sleinity/template-core";
import { createTemplateSessionV2 } from "@sleinity/template-browser/session";
import { TemplateStorageBlockedError } from "@sleinity/template-browser/persistence";
import { FieldHostLifecycle, mergeFontAuthority } from "../../examples/template-editor-integration/src/fieldHostLifecycle";

const source = normalizeTemplatePackageV1ToV2(JSON.parse(await readFile("src/template-package/fixtures/figma-plugin-v0.4.1.json", "utf8"))).package!;
source.fontRequirements = [];
const file = (name = "source.json", value: unknown = source) => new File([JSON.stringify(value)], name);
function deferred<T = any>() { let resolve!: (v: T) => void, reject!: (e: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
const rows: string[] = [];
function fixture(overrides: any = {}) {
  const sessions: any[] = [], disposals: number[] = [];
  const host = new FieldHostLifecycle({ defaultRegistry: () => null, fontSet: () => null,
    autoLink: async (p: any) => p,
    createSession: () => { const session = createTemplateSessionV2(); const n = sessions.length; sessions.push(session); disposals[n] = 0; const dispose = session.dispose.bind(session); session.dispose = () => { disposals[n]++; dispose(); }; return session; }, ...overrides });
  host.attach(null);
  return { host, sessions, disposals, end: async () => { host.detach(); await Promise.resolve(); assert(disposals.every(n => n === 1)); } };
}
const candidate = (p = source) => { let disposed = 0; return { value: { status: "ready", package: p, dispose: () => { disposed++; } } as any, count: () => disposed }; };

export async function runLifecycleTests() {
  {
    const f = fixture(); await f.host.importFile(file()); f.host.open(); const accepted = f.host.getSnapshot().accepted!; f.host.committed(accepted.session);
    accepted.session.getFieldControllers()[0].setValue("Retained edit"); const content = accepted.session.getSnapshot().contentState;
    await f.host.importFile(file("broken.json", {})); assert(f.host.getSnapshot().importError); assert.equal(f.host.getSnapshot().accepted, accepted); assert.equal(accepted.session.getSnapshot().status, "ready"); assert.equal(accepted.session.getSnapshot().contentState, content);
    await f.end(); rows.push("Invalid replacement preserves accepted session/content");
  }
  {
    const old = deferred<string>(), f = fixture(); const slow = file(); slow.text = () => old.promise;
    const task = f.host.importFile(slow); await f.host.importFile(file("new.json")); f.host.open(); const accepted = f.host.getSnapshot().accepted;
    old.reject(new Error("Obsolete read error")); await task; assert.equal(f.host.getSnapshot().accepted, accepted); assert.equal(f.host.getSnapshot().importError, null);
    await f.end(); rows.push("Older error/finalizer cannot replace current feedback");
  }
  for (const action of ["cancel", "supersede", "unmount"]) {
    const started = deferred(), result = deferred(), c = candidate(); let calls = 0;
    const f = fixture({ importZip: () => { calls++; started.resolve(undefined); return result.promise; } });
    const task = f.host.importFile(file("source.zip")); await started.promise;
    if (action === "cancel") f.host.cancelImport(); else if (action === "supersede") await f.host.importFile(file("new.json")); else f.host.detach();
    result.resolve(c.value); await task; assert.equal(c.count(), 1); assert.equal(calls, 1);
    await f.end(); rows.push(`${action}: late pipeline result disposed exactly once`);
  }
  {
    const read = deferred<ArrayBuffer>(), f = fixture({ importZip: () => { throw new Error("Pipeline must not start"); } }); const slow = file("source.zip"); slow.arrayBuffer = () => read.promise;
    const task = f.host.importFile(slow); f.host.cancelImport(); read.resolve(new ArrayBuffer(0)); await task; assert.equal(f.sessions.length, 0); await f.end(); rows.push("Cancellation during file read never invokes pipeline");
  }
  for (const failure of ["blocked", "pipeline-error", "load-error"]) {
    const c = candidate(); if (failure === "blocked") c.value.status = "blocked"; if (failure === "pipeline-error") c.value.status = "error";
    const f = fixture({ importZip: async () => c.value, ...(failure === "load-error" ? { createSession: () => ({ load() { throw new Error("Staged load failed"); }, dispose() {} }) } : {}) });
    await f.host.importFile(file("source.zip")); assert(f.host.getSnapshot().importError); assert.equal(c.count(), 1); assert.equal(f.host.getSnapshot().accepted, null); await f.end(); rows.push(`${failure}: candidate finalized`);
  }
  {
    const c = candidate(), f = fixture({ importZip: async () => c.value }); await f.host.importFile(file("source.zip")); assert.equal(c.count(), 0); assert.equal(f.disposals[0], 0);
    f.host.open(); assert.equal(c.count(), 1); assert.equal(f.disposals[0], 0); const first = f.host.getSnapshot().accepted!;
    await f.host.importFile(file("replacement.json")); f.host.open(); assert.equal(f.disposals[0], 0); f.host.committed(f.host.getSnapshot().accepted!.session); assert.equal(f.disposals[0], 1); assert.equal(f.host.isAccepted(first), false);
    f.host.detach(); f.host.attach(null); await Promise.resolve(); assert.equal(f.disposals[1], 0); await f.end(); rows.push("Candidate handoff, deferred old editor cleanup and StrictMode replay");
  }
  {
    const f = fixture(); await f.host.importFile(file()); f.host.open(); await f.host.importFile(file("b.json")); f.host.open(); await f.end(); rows.push("Unmount before replacement commit disposes both accepted owners");
  }
  for (const transition of ["cancel", "registry", "unmount"]) {
    const start = deferred(), ready = deferred(), f = fixture({ autoLink: () => { start.resolve(undefined); return ready.promise; } });
    const task = f.host.importFile(file()); await start.promise;
    if (transition === "registry") { f.host.detach(); f.host.attach({} as any); f.host.detach(); f.host.attach(null); } else if (transition === "cancel") f.host.cancelImport(); else f.host.detach();
    ready.resolve(source); await task; assert.equal(f.host.getSnapshot().pending, null); assert.equal(f.host.getSnapshot().accepted, null); await f.end(); rows.push(`${transition}: stale font preparation cannot accept candidate`);
  }
  {
    const f = fixture(); const canonical = structuredClone(source); canonical.editableFields[0].label = "V2 authored label";
    const projection = createTemplateSessionV2(); projection.load(canonical); const v1 = structuredClone(projection.getSnapshot().rendererPackage!); v1.name = "Wrong projection"; v1.editableFields = [];
    const merged = mergeFontAuthority(canonical, v1); assert.deepEqual(merged, canonical); assert(parseTemplatePackageV2(merged).validation?.valid); projection.dispose(); await f.end(); rows.push("Font-only merge preserves canonical V2 package and configuration");
  }
  {
    let uploads = 0; const entered = deferred(), finish = deferred();
    const f = fixture({ upload: async (p: any) => { uploads++; if (uploads === 1) { entered.resolve(undefined); await finish.promise; throw new TemplateStorageBlockedError("test", 5); } return { packageValue: p }; } });
    await f.host.importFile(file()); const selected = file("font.ttf"); const task = f.host.uploadFont("test", selected); await entered.promise;
    await f.host.uploadFont("test", selected); assert.equal(uploads, 1); finish.resolve(undefined); await task;
    assert.equal(f.host.getSnapshot().pending?.retryAvailable, true); const done = deferred(); const unsubscribe = f.host.subscribe(() => { if (!f.host.getSnapshot().pending?.busy) done.resolve(undefined); }); f.host.retryFonts(); await done.promise; unsubscribe(); assert.equal(uploads, 2); assert.equal(f.host.getSnapshot().pending?.error, null); assert.equal(f.host.getSnapshot().pending?.retryAvailable, false); await f.end(); rows.push("Serialized upload and typed blocked-storage Retry retains file");
  }
  return { status: "pass", rows };
}
