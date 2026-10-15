import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";
import { sessionAssetUrlLeases } from "../src/session/sessionAssetUrlLeases";
import { runTemplatePackageImportPipelineV2 } from "../src/import/runTemplatePackageImportPipelineV2";
import { assert, deferred, v2Package } from "./sessionContract.fixtures";
import type { SavedTemplateSessionRecordV2, SavedTemplateFieldFamilyRecordV3 } from "../src/persistence/types";

type RecordValue = SavedTemplateSessionRecordV2 | SavedTemplateFieldFamilyRecordV3;
type Kind = "single" | "family";
type Session = ReturnType<typeof createTemplateSessionV2> | ReturnType<typeof createTemplateFieldFamilySessionV2>;
const capture = <T>(value: T): T => structuredClone(value);
const savedId = (session: Session) => { const snapshot = session.getSnapshot(); return "savedSessionId" in snapshot ? snapshot.savedSessionId : snapshot.savedFamilyId; };

/** Complete native transcripts, generated before extraction as well as afterward.
 * The Node evidence runner controls UUID/time inputs; no snapshot fields are stripped.
 */
export async function verifySaveScheduling() {
  const transcripts: unknown[] = [];
  for (const kind of ["single", "family"] as const) {
    const events: unknown[] = [];
    const source = v2Package();
    const family = createTemplateFieldFamilyFromSourcesV2([source, source], "Save lifecycle");
    const repository = new InMemoryTemplateSessionRepositoryV2();
    const starts = Array.from({ length: 30 }, () => deferred<void>());
    const gates = Array.from({ length: 30 }, () => deferred<RecordValue>());
    const writes: RecordValue[] = [];
    let synchronousError: Error | null = null;
    const write = <T extends RecordValue>(record: T): Promise<T> => {
      const index = writes.length;
      writes.push(record); events.push({ event: "repository-start", index, record: capture(record) });
      starts[index].resolve();
      if (synchronousError) { const error = synchronousError; synchronousError = null; throw error; }
      return gates[index].promise.then(value => { events.push({ event: "repository-finish", index }); return value as T; });
    };
    repository.saveTemplateSessionV2 = write; repository.saveTemplateFieldFamilyV3 = write;
    const session: Session = kind === "single" ? createTemplateSessionV2({ repository }) : createTemplateFieldFamilySessionV2({ repository });
    const load = () => kind === "single" ? (session as ReturnType<typeof createTemplateSessionV2>).load(source)
      : (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    const checkpoint = (name: string) => events.push({ event: "checkpoint", name, snapshot: capture(session.getSnapshot()), writeCount: writes.length });
    const stop = session.subscribe(() => events.push({ event: "notification", snapshot: capture(session.getSnapshot()) }));
    const save = (label: string, id?: string) => {
      const promise = kind === "single" ? (session as ReturnType<typeof createTemplateSessionV2>).save(id ? { id } : {}) : session.save();
      return promise.then(value => { events.push({ event: "save-resolved", label, value: capture(value) }); return { value, error: null }; },
        error => { events.push({ event: "save-rejected", label, name: error.name, message: error.message }); return { value: null, error }; });
    };
    const finish = (index: number) => gates[index].resolve(writes[index]);
    const edit = () => { const field = session.getFieldControllers().find(field => field.type === "text")!; assert(field.type === "text" && field.setValue("Edited").accepted); };
    try {
      load(); checkpoint("loaded");
      const first = save("first"); await starts[0].promise;
      edit(); const second = save("second"); checkpoint("second captured while first pending");
      assert(writes.length === 1, "A pending write serializes later saves.");
      finish(0); await first; checkpoint("first after edit");
      assert(savedId(session) === (kind === "single" ? null : family.id), "Native post-save edit guards remain intentionally different.");
      await starts[1].promise;
      assert(writes[0].id === writes[1].id && writes[1].contentState.revision > writes[0].contentState.revision, "First-save identity and invocation-time revisions.");
      finish(1); await second; checkpoint("second complete");
      const rejected = save("repository rejection"); await starts[2].promise;
      const original = new Error("controlled repository rejection"); gates[2].reject(original);
      assert((await rejected).error === original, "Original rejection object reaches its caller.");
      synchronousError = new Error("controlled synchronous throw"); const syncError = synchronousError;
      assert((await save("synchronous throw")).error === syncError, "Synchronous repository errors retain identity.");
      const retry = save("retry", kind === "single" ? "explicit-save-identity" : undefined); await starts[4].promise;
      if (kind === "single") assert(writes[4].id === "explicit-save-identity");
      finish(4); await retry; checkpoint("retry");

      // Configuration and variant changes preserve each native publication policy.
      const configuring = save("configure during write"); await starts[5].promise;
      session.configure({ editableFieldOrder: [...source.editableFieldOrder].reverse() });
      const beforeConfigurationCompletion = session.getSnapshot().revision;
      finish(5); await configuring;
      assert(session.getSnapshot().revision === beforeConfigurationCompletion + (kind === "family" ? 1 : 0), "Kind-specific configuration publication guard.");
      checkpoint("configuration publication");
      if (kind === "family") {
        const selecting = save("selection during write"); await starts[6].promise;
        (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).selectVariant(family.variants[1].id);
        finish(6); await selecting; checkpoint("selection publication");
      }

      // Every boundary keeps the original queue, including failed restore lookup.
      for (const boundary of ["load", "restore", "missing restore", "reset"] as const) {
        const index = writes.length, active = save(`${boundary}/active`); await starts[index].promise;
        const queued = save(`${boundary}/obsolete`);
        if (boundary === "load") load();
        else if (boundary === "reset") { session.reset(); load(); }
        else {
          repository.getTemplateSessionV2 = async () => boundary === "restore" ? writes[index] as SavedTemplateSessionRecordV2 : null;
          repository.getTemplateFieldFamilyV3 = async () => boundary === "restore" ? writes[index] as SavedTemplateFieldFamilyRecordV3 : null;
          await session.loadSaved(writes[index].id);
        }
        const newer = save(`${boundary}/new`);
        assert(writes.length === index + 1, "The retained queue also orders saves after replacement.");
        finish(index); assert((await active).value, "Already-started writes finish.");
        const result = await queued;
        assert(result.error?.message === `Save cancelled because another ${kind === "single" ? "template" : "family"} was loaded or the session was reset.`, "Queued generation cancellation keeps its exact native error.");
        await starts[index + 1].promise; finish(index + 1); await newer; checkpoint(boundary);
      }
      const index = writes.length, active = save("dispose/active"); await starts[index].promise;
      const queued = save("dispose/queued"); session.dispose(); finish(index);
      assert((await active).value && (await queued).error, "Dispose cancels queued callbacks, not started storage writes.");
      checkpoint("disposed");
    } finally { stop(); session.dispose(); }
    transcripts.push({ kind, events });
  }

  // Save pins, rather than session lifetime, keep accepted replacement URLs alive.
  for (const kind of ["single", "family"] as const) for (const ending of ["success", "reject", "cancel"] as const) {
    const events: unknown[] = [], source = v2Package();
    const family = createTemplateFieldFamilyFromSourcesV2([source], "Resource pins");
    const repository = new InMemoryTemplateSessionRepositoryV2(), started = deferred<void>(), gate = deferred<void>();
    let writes = 0;
    const write = async <T extends RecordValue>(record: T): Promise<T> => { writes++; events.push({ event: "write", record: capture(record) }); started.resolve(); await gate.promise; return record; };
    repository.saveTemplateSessionV2 = write; repository.saveTemplateFieldFamilyV3 = write;
    const url = `blob:save-${kind}-${ending}`;
    let revoked = 0;
    const session: Session = kind === "single" ? createTemplateSessionV2({ repository, objectUrls: { create: () => url, revoke: value => { revoked++; events.push({ event: "revoke", url: value }); } } })
      : createTemplateFieldFamilySessionV2({ repository, objectUrls: { create: () => url, revoke: value => { revoked++; events.push({ event: "revoke", url: value }); } } });
    if (kind === "single") (session as ReturnType<typeof createTemplateSessionV2>).load(source); else (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    const image = session.getFieldControllers().find(field => field.type === "image")!;
    assert(image.type === "image" && (await image.replaceImage({ blob: new Blob(["owned"], { type: "image/png" }), width: 1, height: 1 })).accepted);
    const current = session.getSnapshot();
    const handoff = createTemplateSessionV2();
    handoff.load({ ...capture(current.workingPackage!), assets: { ...current.workingPackage!.assets, ...current.sessionAssets } });
    const pending = session.save().then(value => ({ value, error: null }), error => ({ value: null, error })); await started.promise;
    const queued = ending === "cancel" ? session.save().then(() => false, () => true) : null;
    assert(image.reset().accepted);
    events.push({ event: "reset", snapshot: capture(session.getSnapshot()), pins: sessionAssetUrlLeases.get(url)?.count });
    session.dispose(); handoff.dispose(); assert(revoked === 0, "Save pins outlive reset and both shared session owners.");
    if (ending === "reject") gate.reject(new Error("resource write rejected")); else gate.resolve();
    const outcome = await pending; if (queued) assert(await queued);
    assert((ending === "reject") === Boolean(outcome.error));
    assert(writes === 1 && Number(revoked) === 1 && !sessionAssetUrlLeases.has(url), "Success, rejection and queued cancellation release their final pin exactly once.");
    transcripts.push({ kind, ending, events });
  }

  // Queue ownership is session-local; a pending write cannot block another editor.
  for (const kind of ["single", "family"] as const) {
    const started = deferred<void>(), gate = deferred<void>(), source = v2Package();
    const family = createTemplateFieldFamilyFromSourcesV2([source], "Independent queues");
    const a = new InMemoryTemplateSessionRepositoryV2(), b = new InMemoryTemplateSessionRepositoryV2();
    const hold = async <T extends RecordValue>(record: T): Promise<T> => { started.resolve(); await gate.promise; return record; };
    const immediate = async <T extends RecordValue>(record: T): Promise<T> => record;
    a.saveTemplateSessionV2 = hold; a.saveTemplateFieldFamilyV3 = hold; b.saveTemplateSessionV2 = immediate; b.saveTemplateFieldFamilyV3 = immediate;
    const sessions: Session[] = kind === "single" ? [createTemplateSessionV2({ repository: a }), createTemplateSessionV2({ repository: b })]
      : [createTemplateFieldFamilySessionV2({ repository: a }), createTemplateFieldFamilySessionV2({ repository: b })];
    sessions.forEach(session => { if (kind === "single") (session as ReturnType<typeof createTemplateSessionV2>).load(source); else (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family); });
    const pending = sessions[0].save(); await started.promise;
    const independent = await sessions[1].save(); assert(independent.id);
    gate.resolve(); await pending; sessions.forEach(session => session.dispose());
    transcripts.push({ kind, independent: true });
  }
  return transcripts;
}

/** Supplementary failure/replacement transcripts also run against retained native sources. */
export async function verifySaveSchedulingExtras() {
  const transcripts: unknown[] = [];
  for (const kind of ["single", "family"] as const) {
    const source = v2Package(), family = createTemplateFieldFamilyFromSourcesV2([source], "Failed restore queue");
    const repository = new InMemoryTemplateSessionRepositoryV2(), start = deferred<void>(), gate = deferred<void>();
    const events: unknown[] = [];
    const write = async <T extends RecordValue>(record: T): Promise<T> => { events.push({ write: capture(record) }); start.resolve(); await gate.promise; return record; };
    repository.saveTemplateSessionV2 = write; repository.saveTemplateFieldFamilyV3 = write;
    const error = new Error("original restore read failure");
    repository.getTemplateSessionV2 = async () => { throw error; }; repository.getTemplateFieldFamilyV3 = async () => { throw error; };
    const session: Session = kind === "single" ? createTemplateSessionV2({ repository }) : createTemplateFieldFamilySessionV2({ repository });
    if (kind === "single") (session as ReturnType<typeof createTemplateSessionV2>).load(source); else (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    const unsubscribe = session.subscribe(() => events.push({ notification: capture(session.getSnapshot()) }));
    const active = session.save(); await start.promise;
    const queued = session.save().then(() => null, reason => reason.message);
    const restoreError = await session.loadSaved("read-failure").then(() => null, reason => reason);
    if (kind === "family") assert(restoreError === error, "Family repository-read failure preserves the thrown original exception.");
    else assert(!restoreError && session.getSnapshot().error?.message === error.message, "Single restore retains its native snapshot-error outcome.");
    events.push({ afterRestore: capture(session.getSnapshot()), restoreRejected: Boolean(restoreError) });
    gate.resolve(); await active;
    assert(await queued === `Save cancelled because another ${kind === "single" ? "template" : "family"} was loaded or the session was reset.`);
    events.push({ final: capture(session.getSnapshot()) }); unsubscribe(); session.dispose();
    transcripts.push({ kind, failure: events });

    const resources: unknown[] = [], started = deferred<void>(), pendingWrite = deferred<void>();
    let allocated = 0, writes = 0;
    const urls: string[] = [], revoked: string[] = [];
    const replacementRepository = new InMemoryTemplateSessionRepositoryV2();
    const hold = async <T extends RecordValue>(record: T): Promise<T> => { writes++; resources.push({ write: capture(record) }); started.resolve(); await pendingWrite.promise; return record; };
    replacementRepository.saveTemplateSessionV2 = hold; replacementRepository.saveTemplateFieldFamilyV3 = hold;
    const objectUrls = { create: () => { const url = `blob:pending-replacement-${kind}-${allocated++}`; urls.push(url); return url; },
      revoke: (url: string) => { revoked.push(url); resources.push({ revoke: url }); } };
    const editor: Session = kind === "single" ? createTemplateSessionV2({ repository: replacementRepository, objectUrls }) : createTemplateFieldFamilySessionV2({ repository: replacementRepository, objectUrls });
    if (kind === "single") (editor as ReturnType<typeof createTemplateSessionV2>).load(source); else (editor as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    const image = editor.getFieldControllers().find(field => field.type === "image")!;
    assert(image.type === "image");
    assert((await image.replaceImage({ blob: new Blob(["first"], { type: "image/png" }), width: 1, height: 1 })).accepted);
    const saving = editor.save(); await started.promise;
    assert((await image.replaceImage({ blob: new Blob(["second"], { type: "image/png" }), width: 1, height: 1 })).accepted);
    assert(!revoked.includes(urls[0]), "Replacement cannot revoke an asset pinned by an active save.");
    const cancelled = editor.save().then(() => false, () => true);
    assert(image.reset().accepted); editor.dispose();
    assert(revoked.length === 0, "Both generations remain pinned by active/queued captured records.");
    resources.push({ beforeFinish: urls.map(url => ({ url, count: sessionAssetUrlLeases.get(url)?.count })) });
    pendingWrite.resolve(); await saving; assert(await cancelled);
    assert(writes === 1 && revoked.length === urls.length && new Set(revoked).size === urls.length);
    assert(urls.every(url => !sessionAssetUrlLeases.has(url)), "Active completion and queued cancellation release distinct replacement generations exactly once.");
    transcripts.push({ kind, replacement: resources });
  }
  return transcripts;
}

/** Exact-fixture measurements with labelled synthetic burst depths; no latency target. */
export async function measureSaveScheduling(buffer: ArrayBuffer, filename: string, fixtureId: string) {
  const imported = await runTemplatePackageImportPipelineV2({ sourceId: fixtureId, format: "zip", buffer, sourceName: filename, fontRegistry: null });
  assert(imported.status === "ready" && imported.package);
  const rows: unknown[] = [];
  try { for (const kind of ["single", "family"] as const) for (const depth of [1, 5, 20]) {
    const repository = new InMemoryTemplateSessionRepositoryV2(), writes: Array<{ index: number; waitMs: number; repositoryMs: number }> = [];
    const invoked: number[] = [], gates = Array.from({ length: depth }, () => deferred<void>()), starts = Array.from({ length: depth }, () => deferred<void>());
    const write = async <T extends RecordValue>(record: T): Promise<T> => {
      const index = writes.length, started = performance.now(); writes.push({ index, waitMs: started - invoked[index], repositoryMs: 0 }); starts[index].resolve();
      await gates[index].promise; writes[index].repositoryMs = performance.now() - started; return record;
    };
    repository.saveTemplateSessionV2 = write; repository.saveTemplateFieldFamilyV3 = write;
    const session: Session = kind === "single" ? createTemplateSessionV2({ repository }) : createTemplateFieldFamilySessionV2({ repository });
    if (kind === "single") (session as ReturnType<typeof createTemplateSessionV2>).load(imported.package);
    else (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(createTemplateFieldFamilyFromSourcesV2([imported.package], fixtureId));
    const globals = globalThis as typeof globalThis & { __saveMeasurements: { captures: number; finalizations: number; finalizeMs: number } };
    globals.__saveMeasurements = { captures: 0, finalizations: 0, finalizeMs: 0 };
    const synchronousCaptureMs: number[] = [], promises = [];
    for (let index = 0; index < depth; index++) { const time = performance.now(); invoked.push(time); promises.push(session.save()); synchronousCaptureMs.push(performance.now() - time); }
    for (let index = 0; index < depth; index++) { await starts[index].promise; gates[index].resolve(); await promises[index]; }
    assert(writes.length === depth && globals.__saveMeasurements.captures === depth && globals.__saveMeasurements.finalizations === depth, "Exactly one capture, repository write and finalization per save.");
    rows.push({ fixtureId, kind, syntheticBurstDepth: depth, synchronousCaptureMs, writes, ...globals.__saveMeasurements }); session.dispose();
  } } finally { imported.dispose(); }
  return rows;
}
