import type { FieldLayoutEvidenceV1, TemplatePackageV2 } from "@sleinity/template-core";
import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";
import { assert, v2Package } from "./sessionContract.fixtures";

type Native = ReturnType<typeof createTemplateSessionV2> | ReturnType<typeof createTemplateFieldFamilySessionV2>;
function context(session: Native, generation: number) {
  const s = session.getSnapshot();
  const pkg = "basePackage" in s ? s.basePackage : s.effectivePackage;
  const m = "materialization" in s ? s.materialization : s.familyMaterialization?.materialization;
  assert(pkg && s.contentState && m?.materializationRevision, "Loaded evidence context");
  return { contentRevision: s.contentState.revision, materializationRevision: m.materializationRevision,
    settlementRevision: "settled", fontRevision: "font", publicationGeneration: generation,
    packageIdentity: pkg.packageId };
}
function packageWithFields(count: number): TemplatePackageV2 {
  const pkg = v2Package();
  const body = pkg.editableFields.find(f => f.type === "textarea")!;
  // Synthetic repeated descriptors are contract probes, not source-certified fixtures.
  pkg.editableFields = Array.from({ length: count }, (_, i) => {
    const field = structuredClone(body), nodeId = `evidence-node-${i}`;
    const node = structuredClone(pkg.nodes[field.binding.nodeId]);
    node.id = nodeId; node.parentId = pkg.rootNodeId;
    pkg.nodes[nodeId] = node; pkg.nodes[pkg.rootNodeId].children.push(nodeId);
    field.id = `textarea:body${i}`; field.binding.nodeId = nodeId; return field;
  });
  pkg.editableFieldOrder = pkg.editableFields.map(f => f.id);
  return pkg;
}

export function verifyFieldRenderEvidence() {
  const transcript: unknown[] = [];
  for (const kind of ["single", "family"] as const) {
    const source = v2Package(), other = structuredClone(source), absent = structuredClone(source);
    other.packageId = "other";
    absent.packageId = "absent";
    absent.editableFields = absent.editableFields.filter(f => f.type !== "textarea");
    absent.editableFieldOrder = absent.editableFields.map(f => f.id);
    const family = createTemplateFieldFamilyFromSourcesV2([source, other, absent], "Evidence Family");
    const resourceEvents: unknown[] = [], repositoryEvents: unknown[] = [];
    const repository = new InMemoryTemplateSessionRepositoryV2();
    const getSingle = repository.getTemplateSessionV2.bind(repository), getFamily = repository.getTemplateFieldFamilyV3.bind(repository);
    const saveSingle = repository.saveTemplateSessionV2.bind(repository), saveFamily = repository.saveTemplateFieldFamilyV3.bind(repository);
    repository.getTemplateSessionV2 = id => { repositoryEvents.push({ operation: "read-single", id }); return getSingle(id); };
    repository.getTemplateFieldFamilyV3 = id => { repositoryEvents.push({ operation: "read-family", id }); return getFamily(id); };
    repository.saveTemplateSessionV2 = record => { repositoryEvents.push({ operation: "write-single", record: structuredClone(record) }); return saveSingle(record); };
    repository.saveTemplateFieldFamilyV3 = record => { repositoryEvents.push({ operation: "write-family", record: structuredClone(record) }); return saveFamily(record); };
    const urls = { create() { resourceEvents.push("create"); return "blob:unexpected"; }, revoke(url: string) { resourceEvents.push({ revoke: url }); } };
    const session: Native = kind === "single" ? createTemplateSessionV2({ repository, objectUrls: urls }) : createTemplateFieldFamilySessionV2({ repository, objectUrls: urls });
    const notifications: unknown[] = [];
    const stop = session.subscribe(() => notifications.push(structuredClone(session.getSnapshot())));
    const capture = (name: string, input?: unknown, result?: unknown) => transcript.push({ kind, name,
      input: structuredClone(input), result: structuredClone(result), snapshot: structuredClone(session.getSnapshot()),
      notifications: structuredClone(notifications), resources: [...resourceEvents], repository: [...repositoryEvents] });
    const invoke = (name: string, fn: () => unknown, input?: unknown) => {
      let result: unknown; try { result = fn(); } catch (error) { result = { errorName: (error as Error).name, errorMessage: (error as Error).message }; }
      capture(name, input, result); return result;
    };
    const load = () => kind === "single" ? (session as ReturnType<typeof createTemplateSessionV2>).load(source) : (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    capture("idle"); invoke("idle publisher", () => session.beginRuntimeEvidencePublication());
    invoke("idle runtime rejection", () => session.publishRuntimeReadiness({ contentRevision: 0, materializationRevision: "none", settlementRevision: "none", fontRevision: "none", publicationGeneration: 1 }));
    invoke("load", load);
    let lease = session.beginRuntimeEvidencePublication(); capture("publisher", undefined, lease);
    let c = context(session, lease + 1);
    const runtime = (name: string, patch: Record<string, unknown> = {}) => { const e = { ...c, fonts: "ready" as const, renderer: "ready" as const, ...patch }; return invoke(name, () => session.publishRuntimeReadiness(e), e); };
    const lines = (name: string, patch: Partial<FieldLayoutEvidenceV1> = {}) => {
      const e: FieldLayoutEvidenceV1 = { ...c, schemaVersion: "field-layout-evidence-v1", fieldId: "textarea:body", participation: "active", reliability: "reliable", measuredVisualLines: 1, ...patch };
      return invoke(name, () => session.publishFieldLayoutEvidence(e), e);
    };
    assert(runtime("ready") === true);
    for (const [name, patch] of [
      ["stale content", { contentRevision: -1 }], ["stale materialization", { materializationRevision: "old" }],
      ["stale generation", { publicationGeneration: lease - 1 }], ["unsafe generation", { publicationGeneration: NaN }],
    ] as const) assert(runtime(name, patch) === false, name);
    for (const [name, patch] of [
      ["stale package", { packageIdentity: "old" }], ["stale lines content", { contentRevision: -1 }],
      ["stale lines materialization", { materializationRevision: "old" }], ["stale font", { fontRevision: "old" }],
      ["stale settlement", { settlementRevision: "old" }], ["stale lines generation", { publicationGeneration: lease }],
      ["absent field", { fieldId: "textarea:missing" }], ["non textarea", { fieldId: "text:title" }],
    ] as const) assert(lines(name, patch) === false, name);
    for (const [name, patch] of [
      ["below warning", { measuredVisualLines: 1 }], ["warning and max boundary", { measuredVisualLines: 2 }],
      ["above max", { measuredVisualLines: 3 }], ["missing lines", { measuredVisualLines: undefined }],
      ["zero lines", { measuredVisualLines: 0 }], ["negative lines", { measuredVisualLines: -1 }],
      ["fractional lines", { measuredVisualLines: 1.5 }], ["nan lines", { measuredVisualLines: NaN }],
      ["pending evidence", { reliability: "pending" }], ["unsupported evidence", { reliability: "unsupported" }],
      ["inactive precedence", { participation: "structurally-excluded", reliability: "unsupported", measuredVisualLines: 0 }],
    ] as const) assert(lines(name, patch) === true, name);
    const notices = notifications.length;
    assert(lines("identical inactive", { participation: "structurally-excluded", reliability: "unsupported", measuredVisualLines: 0 }) === true);
    assert(notifications.length === notices, "Identical line evidence emits no notification");
    runtime("new font preserves inactive", { fontRevision: "font-new" }); c = { ...c, fontRevision: "font-new" };
    assert(session.getSnapshot().fields.find(f => f.descriptor.id === "textarea:body")?.renderValidation.state === "inactive");
    runtime("new settlement preserves inactive", { settlementRevision: "settled-new" }); c = { ...c, settlementRevision: "settled-new" };
    lines("active resumes", { measuredVisualLines: 2 });
    runtime("font pending invalidates active", { fontRevision: "font-pending", fonts: "pending" }); c = { ...c, fontRevision: "font-pending" };
    assert(session.getSnapshot().fields.find(f => f.descriptor.id === "textarea:body")?.renderValidation.state === "pending");
    invoke("partial runtime", () => session.publishRuntimeReadiness(c), c);
    runtime("fonts ready"); lines("active current");
    const sameNotice = notifications.length; runtime("identical runtime"); assert(notifications.length === sameNotice);
    const old = { ...c };
    lease = session.beginRuntimeEvidencePublication(); capture("publisher replacement", undefined, lease);
    assert(runtime("old publisher rejected") === false); assert(lines("old publisher lines rejected") === false);
    c = context(session, lease + 1); runtime("new publisher ready"); lines("new publisher lines");
    const firstA = { ...c };
    const original = kind === "single" ? source.editableFields.find(f => f.type === "textarea")! : family.fields.find(f => f.type === "textarea")!;
    invoke("configuration B", () => session.configure({ fields: [{ ...original, label: "B" }] }));
    invoke("configuration A", () => session.configure({ fields: [original] }));
    assert(invoke("first A runtime rejected", () => session.publishRuntimeReadiness(firstA), firstA) === false);
    assert(lines("first A lines rejected") === false);
    const newLease = session.beginRuntimeEvidencePublication(); c = context(session, newLease + 1); runtime("configured ready"); lines("configured lines");
    invoke("canonical edit", () => {
      const field = session.getFieldControllers().find(f => f.type === "textarea"); assert(field?.type === "textarea"); return field.setValue("Changed");
    });
    assert(runtime("pre edit runtime rejected") === false); assert(lines("pre edit lines rejected") === false);
    c = context(session, newLease + 2); runtime("edited ready"); lines("edited lines");
    if (kind === "family") {
      const native = session as ReturnType<typeof createTemplateFieldFamilySessionV2>;
      invoke("selection other", () => native.selectVariant(family.variants[1].id));
      assert(runtime("old variant runtime") === false);
      const l = session.beginRuntimeEvidencePublication(); c = context(session, l + 1); runtime("other ready"); lines("other lines");
      invoke("selection absent", () => native.selectVariant(family.variants[2].id));
      const a = session.beginRuntimeEvidencePublication(); c = context(session, a + 1); runtime("absent ready"); assert(lines("absent selected lines") === false);
      invoke("selection return", () => native.selectVariant(family.variants[0].id));
      assert(invoke("first variant lines rejected", () => native.publishFieldLayoutEvidence({ ...firstA, schemaVersion: "field-layout-evidence-v1", fieldId: "textarea:body", participation: "active", reliability: "reliable", measuredVisualLines: 1 })) === false);
    }
    invoke("reset", () => session.reset()); assert(runtime("post reset rejection") === false);
    invoke("reload", load);
    const blockedSource = structuredClone(source); blockedSource.editableFields.find(f => f.type === "textarea")!.binding.nodeId = "missing";
    invoke("blocked load", () => kind === "single" ? (session as ReturnType<typeof createTemplateSessionV2>).load(blockedSource) : (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(createTemplateFieldFamilyFromSourcesV2([blockedSource], "Blocked")));
    invoke("dispose", () => session.dispose()); invoke("late runtime disposed", () => session.publishRuntimeReadiness(old), old);
    invoke("late lines disposed", () => session.publishFieldLayoutEvidence({ ...old, schemaVersion: "field-layout-evidence-v1", fieldId: "textarea:body", participation: "active", reliability: "reliable", measuredVisualLines: 1 }));
    invoke("publisher disposed", () => session.beginRuntimeEvidencePublication()); stop();
    assert(resourceEvents.length === 0 && repositoryEvents.length === 0, "Evidence operations acquire no resources or persistence");
  }
  return transcript;
}

export function measureFieldRenderEvidence() {
  const rows: unknown[] = [];
  for (const kind of ["single", "family"] as const) for (const count of [1, 5, 20]) {
    const pkg = packageWithFields(count), family = createTemplateFieldFamilyFromSourcesV2([pkg], "Synthetic evidence");
    const session: Native = kind === "single" ? createTemplateSessionV2() : createTemplateFieldFamilySessionV2();
    if (kind === "single") (session as ReturnType<typeof createTemplateSessionV2>).load(pkg); else (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    let notifications = 0; const stop = session.subscribe(() => notifications++);
    const lease = session.beginRuntimeEvidencePublication(), c = context(session, lease + 1);
    session.publishRuntimeReadiness({ ...c, fonts: "ready", renderer: "ready" });
    const before = notifications;
    const start = performance.now();
    for (let i = 0; i < count; i++) assert(session.publishFieldLayoutEvidence({ ...c, schemaVersion: "field-layout-evidence-v1", fieldId: `textarea:body${i}`, participation: "active", reliability: "reliable", measuredVisualLines: 2 }));
    const acceptedMs = performance.now() - start;
    const rejectStart = performance.now();
    for (let i = 0; i < count; i++) assert(!session.publishFieldLayoutEvidence({ ...c, schemaVersion: "field-layout-evidence-v1", fieldId: `textarea:body${i}`, participation: "active", reliability: "reliable", measuredVisualLines: 2, fontRevision: "old" }));
    const rejectedMs = performance.now() - rejectStart;
    const invalidateStart = performance.now(); session.publishRuntimeReadiness({ ...c, fontRevision: "new" }); const invalidationMs = performance.now() - invalidateStart;
    rows.push({ kind, count, accepted: count, rejected: count, notifications: notifications - before, acceptedMs, rejectedMs, invalidationMs });
    stop(); session.dispose();
  }
  return rows;
}
