import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { createSingleSessionSnapshotReader, createFamilySessionSnapshotReader } from "../src/session-internal";
import { assert, v2Package } from "./sessionContract.fixtures";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";

for (const kind of ["single", "family"] as const) {
  const source = v2Package();
  const session = kind === "single" ? createTemplateSessionV2() : createTemplateFieldFamilySessionV2();
  const reader = "family" in session.getSnapshot()
    ? createFamilySessionSnapshotReader(session as ReturnType<typeof createTemplateFieldFamilySessionV2>)
    : createSingleSessionSnapshotReader(session as ReturnType<typeof createTemplateSessionV2>);
  assert(Object.keys(reader).sort().join(",") === "getSnapshot,subscribe", "Readers expose observation only.");
  assert(Object.isFrozen(reader), "The reader wrapper is read-only.");
  assert(reader.getSnapshot().status === "idle" && reader.getSnapshot().contentRevision === null, "Idle content is absent, not revision zero.");
  if ("selectVariant" in session) session.load(createTemplateFieldFamilyFromSourcesV2([source, structuredClone(source)], "Reader Family"));
  else session.load(source);
  let nativeEvents = 0, readerEvents = 0;
  const stopNative = session.subscribe(() => nativeEvents++), stopReader = reader.subscribe(() => readerEvents++);
  const native = session.getSnapshot(), view = reader.getSnapshot();
  assert(view.nativeSnapshot === native && view === reader.getSnapshot(), "Native and cached view identity are exact.");
  assert(view.contentRevision === 0, "Accepted initial revision zero remains representable.");
  for (const key of ["contentState", "fields", "sessionAssets", "readiness", "workingPackage", "rendererPackage", "resolvedTree", "error"] as const)
    assert(view[key] === native[key], `${key} remains borrowed.`);
  const countBefore = nativeEvents;
  // Trap every non-read operation: readers cannot invoke lifecycle, resources or publication.
  const trapped = new Proxy(session, { get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (typeof value === "function" && property !== "getSnapshot" && property !== "subscribe")
      return () => { throw new Error(`A read invoked ${String(property)}`); };
    return value;
  } });
  const isolated = "selectVariant" in trapped
    ? createFamilySessionSnapshotReader(trapped as ReturnType<typeof createTemplateFieldFamilySessionV2>)
    : createSingleSessionSnapshotReader(trapped as ReturnType<typeof createTemplateSessionV2>);
  for (let i = 0; i < 10000; i++) assert(isolated.getSnapshot().nativeSnapshot === native, "Reads do not mutate native state.");
  assert(nativeEvents === countBefore && session.getSnapshot() === native, "Reads publish nothing.");
  const text = session.getFieldControllers().find(field => field.type === "text");
  assert(text?.type === "text" && text.setValue("Reader edit").accepted, "Mutations remain native.");
  assert(nativeEvents === readerEvents && nativeEvents > countBefore, "Subscriptions forward every native notification.");
  assert(reader.getSnapshot() !== view && reader.getSnapshot().nativeSnapshot === session.getSnapshot(), "Accepted publication refreshes the view.");
  stopReader(); const stopped = readerEvents;
  session.reset(); assert(readerEvents === stopped && nativeEvents > countBefore, "Unsubscription detaches the native listener.");
  assert(reader.getSnapshot().status === "idle", "Reset remains an unload.");
  stopNative(); session.dispose();
  assert(reader.getSnapshot().status === "disposed", "The reader does not reinterpret disposed state.");
}

for (const kind of ["single", "family"] as const) {
  const repository = new InMemoryTemplateSessionRepositoryV2();
  if (kind === "single") {
    const session = createTemplateSessionV2({ repository }), reader = createSingleSessionSnapshotReader(session);
    await session.loadSaved("missing");
    assert(reader.getSnapshot().status === "blocked" && reader.getSnapshot().error === session.getSnapshot().error, "Single blocked restore/error stays native.");
    session.dispose();
  } else {
    const session = createTemplateFieldFamilySessionV2({ repository }), reader = createFamilySessionSnapshotReader(session);
    await session.loadSaved("missing");
    assert(reader.getSnapshot().status === "blocked" && reader.getSnapshot().error === session.getSnapshot().error, "Family blocked restore/error stays native.");
    session.dispose();
  }
}
