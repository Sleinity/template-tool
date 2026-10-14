import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";
import { sessionAssetUrlLeases } from "../src/session/sessionAssetUrlLeases";
import { assert, deferred, v2Package } from "./sessionContract.fixtures";
const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const copy = <T>(value: T): T => structuredClone(value);
type Session = ReturnType<typeof createTemplateSessionV2> | ReturnType<typeof createTemplateFieldFamilySessionV2>;
export async function verifyImageReplacementOwnership(repaired = true) {
  const rows = [];
  for (const kind of ["single", "family"] as const) for (const scenario of ["same", "different", "roundtrip", "shared-fields", "source-collision", "source-overlap", "receiver", "save-success", "save-reject", "queued-cancel", "invalid", "rejected", "dimension-error", "stale-reset", "stale-load", "stale-dispose", "overlap", "equal-hash", "different-hash", "crop"] as const) {
    const semantic: unknown[] = [], resources: unknown[] = [], pkg = v2Package();
    const heroDefinition = pkg.editableFields.find(f => f.type === "image")!;
    if (scenario === "shared-fields") { pkg.editableFields.push({ ...heroDefinition, id: "image:second", binding: { kind: "image-content", nodeId: "58:87" } }); pkg.editableFieldOrder.push("image:second"); }
    if (scenario === "crop") heroDefinition.configuration = { replacementPlacement: "crop" };
    const family = createTemplateFieldFamilyFromSourcesV2([pkg, pkg], "Ownership comparison");
    const repository = new InMemoryTemplateSessionRepositoryV2();
    let saved: any, reads = 0, writes = 0;
    const started = deferred<void>(), writeGate = deferred<void>();
    const write = async (record: any) => { writes++; semantic.push({ event: "write", record: copy(record) }); saved = copy(record); if (scenario.startsWith("save-") || scenario === "queued-cancel") { started.resolve(); await writeGate.promise; } return record; };
    repository.saveTemplateSessionV2 = write; repository.saveTemplateFieldFamilyV3 = write;
    repository.getTemplateSessionV2 = async () => { semantic.push({ event: "record-read" }); return saved; };
    repository.getTemplateFieldFamilyV3 = async () => { semantic.push({ event: "record-read" }); return saved; };
    repository.getManagedAsset = async hash => { reads++; return { hash, blob: new Blob(["stored"], { type: "image/png" }), mimeType: "image/png", sizeBytes: 6, createdAt: "2026-10-09T00:00:00Z" }; };
    const prefix = `blob:replacement-${kind}-${scenario}-`, created: string[] = [], revoked: string[] = [];
    const objectUrls = { create: () => { const url = prefix + created.length; created.push(url); resources.push({ event: "create", url }); return url; }, revoke: (url: string) => { revoked.push(url); resources.push({ event: "revoke", url }); } };
    const session: Session = kind === "single" ? createTemplateSessionV2({ repository, objectUrls }) : createTemplateFieldFamilySessionV2({ repository, objectUrls });
    const load = () => kind === "single" ? (session as ReturnType<typeof createTemplateSessionV2>).load(pkg) : (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    const checkpoint = (name: string) => { semantic.push({ event: "checkpoint", name, snapshot: copy(session.getSnapshot()) }); resources.push({ event: "checkpoint", name, leases: [...sessionAssetUrlLeases].filter(([url]) => url.startsWith(prefix)).map(([url, lease]) => ({ url, count: lease.count })), revoked: [...revoked] }); };
    const stop = session.subscribe(() => semantic.push({ event: "notification", snapshot: copy(session.getSnapshot()) }));
    load();
    const image = (id = heroDefinition.id) => { const controller = session.getFieldControllers().find(f => f.id === id); assert(controller?.type === "image"); return controller; };
    const replacementId = scenario === "source-collision" || scenario === "source-overlap" ? heroDefinition.defaultValue.assetId! : "same-id";
    const blob = new Blob(["owned replacement"], { type: "image/png" });
    const replaceBlob = () => image().replaceImage({ blob, assetId: replacementId, width: 1, height: 1 });
    const result = (name: string, value: unknown) => semantic.push({ event: "result", name, value: copy(value) });
    let receiver: ReturnType<typeof createTemplateSessionV2> | undefined;
    try {
      result("blob", await replaceBlob());
      if (scenario === "source-overlap") {
        const accepted = session.getSnapshot();
        if (kind === "single") (session as ReturnType<typeof createTemplateSessionV2>).load({ ...pkg, assets: { ...pkg.assets, [replacementId]: accepted.sessionAssets[replacementId] } });
        else { const value = copy(family); for (const variant of value.variants) variant.packageValue.assets[replacementId] = copy(accepted.sessionAssets[replacementId]); (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(value); }
        result("second-blob", await replaceBlob());
      }
      if (scenario === "shared-fields") result("second-field", await image("image:second").replaceImage({ blob, assetId: replacementId, width: 1, height: 1 }));
      const oldUrl = session.getSnapshot().sessionAssets[replacementId].stableUrl!;
      if (scenario === "receiver") { receiver = createTemplateSessionV2(); receiver.load(copy(session.getSnapshot().workingPackage!)); }
      let pending: Promise<any> | undefined, queued: Promise<any> | undefined;
      const settle = (promise: Promise<any>) => promise.then(value => ({ value: copy(value), error: null }), cause => ({ value: null, error: cause instanceof Error ? cause.message : String(cause) }));
      if (scenario.startsWith("save-") || scenario === "queued-cancel") { pending = settle(session.save()); await started.promise; if (scenario === "queued-cancel") queued = settle(session.save()); }
      checkpoint("before-transition");
      if (scenario === "invalid") { result("invalid", await image().replaceImage({ dataUrl: "not-an-image", assetId: replacementId }).catch(cause => ({ error: cause.message }))); assert(!revoked.includes(oldUrl)); }
      else if (scenario === "rejected") { const outcome = await image().replaceImage({ dataUrl, assetId: replacementId, width: 1, height: 1, placement: { mode: "crop", crop: { schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source", transform: [[0, 0, 0], [0, 0, 0]] } } }); result("rejected", outcome); assert(!outcome.accepted && !revoked.includes(oldUrl)); }
      else if (scenario === "dimension-error" || scenario.startsWith("stale-") || scenario === "overlap") {
        const oldImage = globalThis.Image, decoded = deferred<void>();
        let candidate: any;
        globalThis.Image = class { naturalWidth = 1; naturalHeight = 1; onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_url: string) { candidate = this; decoded.resolve(); } } as any;
        try {
          const operation = settle(image().replaceImage({ dataUrl, assetId: replacementId })); await decoded.promise; const pendingImage = candidate;
          if (scenario === "dimension-error") pendingImage.onerror();
          else {
            if (scenario === "stale-reset") result("reset-during-decode", image().reset());
            else if (scenario === "stale-load") load();
            else if (scenario === "stale-dispose") session.dispose();
            else result("winning-replacement", await image().replaceImage({ dataUrl, assetId: replacementId, width: 1, height: 1 }));
            pendingImage.onload();
          }
          result("delayed-replacement", await operation);
          if (scenario === "dimension-error") assert(!revoked.includes(oldUrl));
        } finally { if (oldImage === undefined) delete (globalThis as any).Image; else globalThis.Image = oldImage; }
      } else if (scenario === "equal-hash" || scenario === "different-hash") {
        result("blob-again", await image().replaceImage({ blob: scenario === "equal-hash" ? blob : new Blob(["other"], { type: "image/png" }), assetId: replacementId, width: 1, height: 1 }));
      } else {
        const crop = { mode: "crop" as const, crop: { schemaVersion: "normalized-image-crop-v1" as const, coordinateSpace: "normalized-slot-to-normalized-source" as const, transform: [[1, 0, 0], [0, 1, 0]] as [[number, number, number], [number, number, number]] } };
        result("embedded", await image().replaceImage({ dataUrl, assetId: scenario === "different" ? "new-id" : replacementId, width: 1, height: 1, ...(scenario === "crop" ? { placement: crop } : {}) }));
        const holds = scenario === "receiver" || scenario.startsWith("save-") || scenario === "queued-cancel";
        const fixed = kind === "family" || repaired || scenario === "different";
        assert(revoked.includes(oldUrl) === (fixed && !holds), "Accepted replacement must release the obsolete lease, subject to remaining owners.");
        if (holds) assert(sessionAssetUrlLeases.get(oldUrl)!.count === (fixed ? 1 + (queued ? 1 : 0) : 2 + (queued ? 1 : 0)), "Only remaining receiver/save owners retain the old URL.");
        checkpoint("after-embedded");
        if (scenario === "roundtrip") { result("embedded-again", await image().replaceImage({ dataUrl, assetId: replacementId, width: 1, height: 1 })); result("back-to-blob", await replaceBlob()); }
        if (scenario === "shared-fields") { assert(session.getSnapshot().contentState!.values["image:second"].value && session.getSnapshot().sessionAssets[replacementId].dataUrl === dataUrl); result("first-reset", image().reset()); assert(session.getSnapshot().sessionAssets[replacementId]); result("last-reset", image("image:second").reset()); assert(!session.getSnapshot().sessionAssets[replacementId]); }
        if (scenario === "source-overlap") assert(!revoked.includes(created[0]), "Imported source ownership outlives replacement cleanup.");
        if (scenario === "crop" && kind === "family") { const familySession = session as ReturnType<typeof createTemplateFieldFamilySessionV2>; familySession.selectVariant(family.variants[1].id); result("variant-placement", (image() as any).setVariantPlacement(crop)); familySession.selectVariant(family.variants[0].id); }
      }
      checkpoint("after-transition");
      if (pending) {
        if (scenario === "queued-cancel") session.reset();
        if (scenario === "save-reject") writeGate.reject(new Error("controlled save failure")); else writeGate.resolve();
        result("active-save", await pending); if (queued) result("queued-save", await queued);
        if (kind === "family" || repaired || scenario === "queued-cancel") assert(revoked.includes(oldUrl));
      }
      receiver?.dispose();
      if (session.getSnapshot().contentState && !["stale-dispose", "queued-cancel", "dimension-error", "invalid", "rejected"].includes(scenario) && !pending) { const record = await session.save(); result("saved", record); await session.loadSaved(record.id); checkpoint("reloaded"); result("reset", image().reset()); }
      session.dispose(); session.dispose(); checkpoint("disposed");
      assert(created.length === revoked.length && new Set(revoked).size === revoked.length && ![...sessionAssetUrlLeases.keys()].some(url => url.startsWith(prefix)), "Final owners release every allocation exactly once.");
      rows.push({ kind, scenario, semantic, resources, reads, writes });
    } finally { stop(); receiver?.dispose(); session.dispose(); }
  }
  return rows;
}

export async function measureImageReplacementOwnership(repaired = true) {
  const rows = [];
  for (const kind of ["single", "family"] as const) for (const repetitions of [1, 5, 20]) {
    const pkg = v2Package(), family = createTemplateFieldFamilyFromSourcesV2([pkg], "Synthetic replacement burst");
    let allocations = 0, releases = 0, releaseMs = 0; const lifetimes = new Map<string, number>(), lifetimeMs: number[] = [];
    const objectUrls = { create: () => { const url = `blob:measurement-${kind}-${allocations++}`; lifetimes.set(url, performance.now()); return url; }, revoke: (url: string) => { const start = performance.now(); releases++; lifetimeMs.push(start - lifetimes.get(url)!); releaseMs += performance.now() - start; } };
    const s: Session = kind === "single" ? createTemplateSessionV2({ objectUrls }) : createTemplateFieldFamilySessionV2({ objectUrls });
    if (kind === "single") s.load(pkg); else s.load(family);
    let preparationMs = 0, transitionMs = 0, releaseAtAcceptance = 0, acceptedLeaseReleaseMs = 0;
    for (let i = 0; i < repetitions; i++) { const c = s.getFieldControllers().find(c => c.type === "image")!; assert(c.type === "image"); let start = performance.now(); await c.replaceImage({ blob: new Blob([String(i)], { type: "image/png" }), assetId: "same-id", width: 1, height: 1 }); preparationMs += performance.now() - start; const count = releases, leaseStart = (globalThis as any).__replacementReleaseMeasure?.ms ?? 0; start = performance.now(); await c.replaceImage({ dataUrl, assetId: "same-id", width: 1, height: 1 }); transitionMs += performance.now() - start; releaseAtAcceptance += releases - count; acceptedLeaseReleaseMs += ((globalThis as any).__replacementReleaseMeasure?.ms ?? 0) - leaseStart; }
    assert(releaseAtAcceptance === (kind === "family" || repaired ? repetitions : 0)); s.dispose(); assert(allocations === releases);
    rows.push({ kind, repetitions, allocations, releases, releaseAtAcceptance, preparationMs, transitionMs, acceptedLeaseReleaseMs, releaseMs, lifetimeMs });
  }
  return rows;
}
