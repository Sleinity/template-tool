import fixture from "../../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { normalizeTemplatePackageV1ToV2, type TemplatePackageV1 } from "@sleinity/template-core";
import { createInMemoryTemplateRecoveryRepository, InMemoryTemplateSessionRepositoryV2, createInMemoryTemplateSessionRepositoryV2Storage } from "@sleinity/template-browser/persistence";
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import { familyFromSources } from "../setup/setupSources";
import { createStudioRecords, isFamilyRecord, studioLocator } from "./studioRecords";
import { createStudioAutosave } from "./draftAutosave";
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const storage = createInMemoryTemplateSessionRepositoryV2Storage();
const repo = new InMemoryTemplateSessionRepositoryV2(storage);
const recovery = createInMemoryTemplateRecoveryRepository(storage);
const records = createStudioRecords(repo, repo, recovery);
const pkg = normalizeTemplatePackageV1ToV2(structuredClone(fixture) as unknown as TemplatePackageV1).package!;
pkg.fontRequirements = [];
pkg.editableFields = [{ id: "text:title", type: "text", label: "Title", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: "Original", configuration: {} }];
pkg.editableFieldOrder = ["text:title"];
for (const family of [false, true]) {
  const session = family ? createTemplateFieldFamilySessionV2() : createTemplateSessionV2();
  if ("selectVariant" in session) session.load(familyFromSources([pkg, { ...pkg, packageId: pkg.packageId + "-2" }], "Source family")); else session.load(pkg);
  const template = await records.saveTemplate(session, { name: "Custom name", description: "Retain me" });
  const key = { kind: family ? "family" as const : "single" as const, templateId: template.id };
  const first = await records.beginOutput(template, "fresh");
  assert(!await recovery.inspect(key), "Opening defaults does not persist a payload");
  const draft = records.openSession(first.record, first.lease); await draft.loadSaved(first.record.id);
  const controller = draft.getFieldControllers()[0]; if (controller.type === "text") controller.setValue("Independent");
  await draft.save();
  const saved = (await recovery.inspect(key))!.payload;
  assert(JSON.stringify((await records.get(studioLocator(template)))!.contentState) === JSON.stringify(template.contentState), "Recovery cannot overwrite template");
  session.configure({ fields: [{ id: "text:title", type: "text", label: "Future label", configuration: { maxCharacters: 100 } }] });
  const changed = await records.saveTemplate(session, { name: "Renamed" }, template);
  const resumed = await records.beginOutput(changed, "resume");
  assert(JSON.stringify(resumed.record.contentState) === JSON.stringify(saved.contentState), "Resume preserves canonical values");
  assert((isFamilyRecord(resumed.record) ? resumed.record.family.fields[0] : resumed.record.basePackage.editableFields[0]).label !== "Future label", "Recovery preserves independent configuration");
  let rejected = false; try { await recovery.save(first.lease, first.record); } catch { rejected = true; }
  assert(rejected, "Opening another editor invalidates stale writes");
  await records.remove(changed);
  assert(!await recovery.inspect(key) && !await recovery.isCurrent(resumed.lease), "Deleting a template clears recovery and invalidates its owner");
  draft.dispose(); session.dispose();
}
const collisionSingleSession = createTemplateSessionV2();
collisionSingleSession.load(pkg);
const collisionFamilySession = createTemplateFieldFamilySessionV2();
collisionFamilySession.load(familyFromSources([pkg], "Collision family"));
const collisionSingle = await records.save({ ...records.capture(collisionSingleSession, { name: "Collision single" }), id: "shared-id" });
const collisionFamily = await records.save({ ...records.capture(collisionFamilySession, { name: "Collision family" }), id: "shared-id" });
assert((await records.resolve("shared-id")).status === "ambiguous", "A raw ID collision must never prefer one persistence store");
const exactSingle = await records.resolve("single:shared-id");
const exactFamily = await records.resolve("family:shared-id");
assert(exactSingle.status === "found" && exactSingle.record.name === "Collision single", "Canonical single locator resolves its store");
assert(exactFamily.status === "found" && exactFamily.record.name === "Collision family", "Canonical Family locator resolves its store");
await records.remove(collisionFamily);
const legacySingle = await records.resolve("shared-id");
assert(legacySingle.status === "found" && !legacySingle.canonical && legacySingle.locator.kind === "single", "An unambiguous raw link can be canonicalized safely");
await records.remove(collisionSingle);
collisionSingleSession.dispose(); collisionFamilySession.dispose();
const session = createTemplateSessionV2(); session.load(pkg);
const original = await records.save(records.capture(session, { name: "Existing", description: "Keep output" }));
let failAt = 2, writes = 0;
const failing = createStudioRecords({ ...repo,
  listTemplateSessionsV2: () => repo.listTemplateSessionsV2(), getTemplateSessionV2: (key) => repo.getTemplateSessionV2(key), deleteTemplateSessionV2: (key) => repo.deleteTemplateSessionV2(key), getManagedAsset: (key) => repo.getManagedAsset(key),
  listIncompatibleTemplateSessionsV2: () => repo.listIncompatibleTemplateSessionsV2(), deleteIncompatibleTemplateSessionV2: (key) => repo.deleteIncompatibleTemplateSessionV2(key),
  saveTemplateSessionV2: async (value) => { if (++writes === failAt) throw new Error("Injected write failure"); return repo.saveTemplateSessionV2(value); },
}, repo, recovery);
for (const failure of [2, 3]) {
  const source = failure === 2 ? original : await records.save({ ...original, id: "second-conversion" });
  failAt = failure; writes = 0;
  try { await failing.convert(source); } catch {}
  const pending = (await records.get(studioLocator(source)))!;
  assert(pending.studio?.conversion && !pending.studio.conversion.complete, "Conversion tracks partial failure on original");
  await records.convert(pending); await records.convert(pending);
  const targets = (await records.list()).filter((record) => record.studio?.convertedFrom === source.id);
  assert(targets.length === 1, "Retry creates exactly one template destination");
  assert(JSON.stringify((await recovery.inspect({ kind: "single", templateId: pending.studio!.conversion!.templateId }))!.payload.contentState) === JSON.stringify(source.contentState), "Conversion retains canonical output");
  assert(await records.get(studioLocator(source)), "Original remains accessible");
}
session.dispose();
// Migration is deterministic and retry-safe even after the new recovery is edited.
const migrationSession = createTemplateSessionV2(); migrationSession.load(pkg);
const migrationTemplate = await records.saveTemplate(migrationSession, { name: "Migration" });
for (const legacyId of ["migration-a", "migration-z"]) {
  const legacy = { ...structuredClone(migrationTemplate), id: legacyId, updatedAt: "2026-01-01T00:00:00.000Z", studio: { role: "draft" as const, templateId: migrationTemplate.id } };
  const saved = await records.save(legacy);
  storage.templateSessions.set(legacyId, { ...saved, updatedAt: legacy.updatedAt } as import("@sleinity/template-browser/persistence").SavedTemplateSessionRecordV2);
}
let interruptDeletion = true;
const interruptedRepo = new Proxy(repo, { get(target, property) {
  if (property === "deleteTemplateSessionV2") return async (key: string) => { if (interruptDeletion) { interruptDeletion = false; throw new Error("Interrupted migration"); } return target.deleteTemplateSessionV2(key); };
  const value = Reflect.get(target, property); return typeof value === "function" ? value.bind(target) : value;
} });
try { await createStudioRecords(interruptedRepo, repo, recovery).migrateRecovery(); } catch {}
assert(storage.templateSessions.has("migration-z"), "Interrupted cleanup retains the old owner until retry");
const claimed = await recovery.begin({ kind: "single", templateId: migrationTemplate.id }, "resume");
await recovery.save(claimed.lease, { ...claimed.payload!, name: "Edited after transfer" });
await records.migrateRecovery();
assert((await recovery.inspect(claimed.lease.key))?.payload.name === "Edited after transfer", "Retry does not overwrite work edited after the interrupted transfer");
const migrationKey = { kind: "single" as const, templateId: migrationTemplate.id };
assert((await recovery.inspect(migrationKey))?.payload.id === "migration-z", "Timestamp tie uses greatest record ID");
assert((await recovery.resolveLegacy("single", "migration-z"))?.templateId === migrationTemplate.id, "Retained URL resolves to template");
assert(!await recovery.resolveLegacy("single", "migration-a"), "Superseded URL does not expose another draft");
await records.migrateRecovery();
assert(!await records.get({kind:"single",id:"migration-z"}), "Legacy records removed after transfer");
await records.remove(migrationTemplate); migrationSession.dispose();
let release!: () => void; const stored: number[] = []; const statuses: string[] = [];
const autosave = createStudioAutosave<number>(async (value) => { if (value === 1) await new Promise<void>((resolve) => { release = resolve; }); stored.push(value); }, (status) => statuses.push(status), 10000);
autosave.schedule(1); const flushing = autosave.flush(); autosave.schedule(2); assert(autosave.dirty(), "New revision remains dirty during write"); await Promise.resolve(); release(); await flushing;
assert(stored.join() === "1,2" && !autosave.dirty(), "Navigation flush serializes all revisions");
assert(statuses[statuses.length - 1] === "Saved", "Final revision alone becomes saved"); autosave.dispose();
let fail = true;
const retry = createStudioAutosave<number>(async () => { if (fail) throw new Error("offline"); }, () => {}, 10000);
retry.schedule(1); try { await retry.flush(); } catch {} assert(retry.dirty(), "Failed write remains dirty"); fail = false; await retry.flush(); assert(!retry.dirty(), "Retry saves retained edit"); retry.dispose();
