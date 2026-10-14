/** Public-only headless host: no Studio or package-internal imports. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeTemplatePackageV1ToV2 } from "@sleinity/template-core";
import { appendTemplateSourcesV2, mutateTemplateFamilyV2 } from "@sleinity/template-browser/importer";

const raw = JSON.parse(await readFile(new URL("../../src/template-package/fixtures/figma-plugin-v0.4.1.json", import.meta.url), "utf8"));
const base = normalizeTemplatePackageV1ToV2(raw).package;
assert(base);
base.fontRequirements = [];
base.editableFields = [{ id: "text:benchmark", type: "text", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: "ABC", configuration: {} }];
base.editableFieldOrder = ["text:benchmark"];
const source = id => ({ id, name: `${id}.json`, packageValue: structuredClone(base) });
const { InMemoryTemplateSessionRepositoryV2 } = await import("@sleinity/template-browser/persistence");
const repository = new InMemoryTemplateSessionRepositoryV2();
let writes = 0;
repository.saveTemplateSessionV2 = async record => { writes++; return record; };
repository.saveTemplateFieldFamilyV3 = async record => { writes++; return record; };
const dependencies = { single: { repository }, family: { repository } };
const first = source("first");
const single = appendTemplateSourcesV2(null, [], [first], "Public host", {}, dependencies);
await single.save();
const text = single.getSnapshot().basePackage.editableFields.find(field => field.type === "text");
assert(text);
single.configure({ fields: [{ ...text, label: "Public label", configuration: { ...text.configuration, maxCharacters: 120 } }] });
const second = source("second");
second.packageValue.editableFields[0].configuration = { maxCharacters: 80 };
const family = appendTemplateSourcesV2(single, [first], [second], "Public host", {}, dependencies);
assert.equal(family.getSnapshot().family.variants[1].fieldOverrides[text.id].configuration.maxCharacters, 80);
assert.equal(family.getSnapshot().family.fields.find(field => field.id === text.id).label, "Public label");
assert.equal(family.getSnapshot().family.variants[0].id, "first");
assert.equal(family.getSnapshot().family.variants.length, 2);
const before = JSON.stringify(family.getSnapshot().family);
const changed = mutateTemplateFamilyV2(family, [first, second], { type: "move", variantId: "second", targetIndex: 0 }, { session: { repository } });
assert.equal(changed.session.getSnapshot().family.variants[0].id, "second");
assert.equal(JSON.stringify(family.getSnapshot().family), before);
await family.save(); await changed.session.save();
assert.equal(writes, 3, "Host repository dependencies remain in use across candidate creation.");
changed.session.dispose(); family.dispose(); single.dispose();
console.log("Public V2 import host: assembly, promotion, configuration preservation and isolated mutation passed.");

// Exercise URL transfer across independently built public entry points.
const { createIndexedDbAssetStore } = await import("@sleinity/template-browser/assets");
const { createTemplateSessionV2 } = await import("@sleinity/template-browser/session");
const originalDb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
const createUrl = URL.createObjectURL; const revokeUrl = URL.revokeObjectURL;
let revocations = 0;
Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: { open() {
  const request = { result: { close() {}, transaction() {
    const tx = { objectStore: () => ({ put() { queueMicrotask(() => tx.oncomplete()); } }) };
    return tx;
  } } };
  queueMicrotask(() => request.onsuccess()); return request;
} } });
URL.createObjectURL = () => "blob:public-host-transfer";
URL.revokeObjectURL = () => { revocations++; };
try {
  const store = createIndexedDbAssetStore();
  const ref = await store.put("public-host", new Uint8Array([1]), "image/png");
  const value = structuredClone(base);
  const assetId = value.nodes["58:61"].image.assetId;
  value.assets[assetId].stableUrl = ref.stableUrl;
  const owner = createTemplateSessionV2();
  owner.load(value); store.dispose();
  assert.equal(revocations, 0);
  owner.dispose(); assert.equal(revocations, 1);
  console.log("Public V2 import host: cross-entry-point resource transfer passed.");
} finally {
  URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl;
  if (originalDb) Object.defineProperty(globalThis, "indexedDB", originalDb); else delete globalThis.indexedDB;
}

// Current exporter ZIP → public import → authoring → persistence, with no Studio imports.
{
  const { createHash } = await import("node:crypto");
  const { runTemplatePackageImportPipelineV2 } = await import("@sleinity/template-browser/importer");
  const manifest = JSON.parse(await readFile(new URL("../../fidelity/fixtures.json", import.meta.url), "utf8"));
  const entry = manifest.fixtures.find(item => item.id === "exporter-061-deal-of-the-week-post");
  assert(entry, "Current exporter fixture must be registered.");
  const bytes = await readFile(entry.sourcePath.replace("${TEMPLATE_PACKAGE_FIXTURE_DIR}", process.env.TEMPLATE_PACKAGE_FIXTURE_DIR ?? manifest.defaultFixtureDirectory));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.zipSha256);
  const imported = await runTemplatePackageImportPipelineV2({ format: "zip", sourceId: "zip-a", sourceName: entry.filename,
    buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), fontRegistry: null });
  const sessions = [];
  try {
    assert.equal(imported.status, "ready");
    assert(imported.importEvidence?.previewBlob, "Import returns the already-decoded preview without another ZIP read.");
    assert.equal(createHash("sha256").update(Buffer.from(await imported.importEvidence.previewBlob.arrayBuffer())).digest("hex"), entry.embeddedPreview.sha256);
    const parsed = imported.parseResult;
    assert(parsed?.validation?.valid && parsed.package);
    const a = { id: "zip-a", name: entry.filename, packageValue: parsed.package };
    const b = { ...a, id: "zip-b" };
    const repo = new InMemoryTemplateSessionRepositoryV2();
    const options = { single: { repository: repo }, family: { repository: repo } };
    let accepted = appendTemplateSourcesV2(null, [], [a], "ZIP host", {}, options); sessions.push(accepted);
    accepted = appendTemplateSourcesV2(accepted, [a], [b], "ZIP host", {}, options); sessions.push(accepted);
    const batch = appendTemplateSourcesV2(null, [], [a, b], "ZIP host", {}, options); sessions.push(batch);
    const { resolveTemplateFieldFamilyVariantV2 } = await import("@sleinity/template-core/family");
    for (const id of ["zip-a", "zip-b"]) assert.deepEqual(
      resolveTemplateFieldFamilyVariantV2(batch.getSnapshot().family, id).packageValue,
      resolveTemplateFieldFamilyVariantV2(accepted.getSnapshot().family, id).packageValue,
      "Batch import and incremental promotion must resolve equivalent effective packages.",
    );
    const original = JSON.stringify(accepted.getSnapshot().family);
    const selection = structuredClone(accepted.getSnapshot().family);
    selection.variantGroups = [{ id: "size", title: "Size", options: [{ id: "small", title: "Small" }, { id: "large", title: "Large" }, { id: "extra", title: "Extra" }] }];
    selection.variants.forEach((variant, index) => { variant.groupAssignments = { size: index ? "large" : "small" }; });
    const { getTemplateFieldFamilyEditorControlOrderV2 } = await import("@sleinity/template-core/family");
    delete selection.editorControlOrder;
    selection.editorControlOrder = getTemplateFieldFamilyEditorControlOrderV2(selection);
    const selected = mutateTemplateFamilyV2(accepted, [a, b], { type: "selection-metadata", family: selection }, { session: options.family }); sessions.push(selected.session);
    assert.equal(JSON.stringify(accepted.getSnapshot().family), original, "Selection candidates cannot mutate accepted work.");
    const c = { ...a, id: "zip-c" };
    assert.throws(() => appendTemplateSourcesV2(selected.session, selected.sources, [c], "ZIP host", {}, options), /Choose a Size/);
    const appended = appendTemplateSourcesV2(selected.session, selected.sources, [c], "ZIP host", { "zip-c": { size: "extra" } }, options); sessions.push(appended);
    assert.equal(appended.getSnapshot().family.variants[2].groupAssignments.size, "extra");
    const renamed = mutateTemplateFamilyV2(appended, [a, b, c], { type: "rename", variantId: "zip-c", label: "Extra design" }, { session: options.family }); sessions.push(renamed.session);
    assert.equal(renamed.session.getSnapshot().family.variants[2].label, "Extra design");
    const replaced = mutateTemplateFamilyV2(renamed.session, renamed.sources, { type: "replace", variantId: "zip-b", source: { ...b, name: "replacement.zip" } }, { removedFieldDisposition: "discard", session: options.family }); sessions.push(replaced.session);
    assert.equal(replaced.sources.find(source => source.id === "zip-b").name, "replacement.zip");
    const removed = mutateTemplateFamilyV2(replaced.session, replaced.sources, { type: "remove", variantId: "zip-c" }, { session: options.family }); sessions.push(removed.session);
    assert.deepEqual(removed.session.getSnapshot().family.variants.map(variant => variant.id), ["zip-a", "zip-b"]);
    const saved = await removed.session.save();
    const { createTemplateFieldFamilySessionV2 } = await import("@sleinity/template-browser/session");
    const restored = createTemplateFieldFamilySessionV2({ repository: repo }); sessions.push(restored);
    await restored.loadSaved(saved.id);
    assert.deepEqual(restored.getSnapshot().family, removed.session.getSnapshot().family);
    assert.deepEqual(restored.getSnapshot().workingPackage, removed.session.getSnapshot().workingPackage);
    console.log("Public V2 ZIP host: hash-gated current export, reused preview, selectors, append, rename, replacement, removal and save/reload passed.");
  } finally { sessions.forEach(session => session.dispose()); imported.dispose?.(); }
}

// Template-scoped recovery is available to hosts without Studio or renderer storage coupling.
{
  const { createInMemoryTemplateSessionRepositoryV2Storage, InMemoryTemplateSessionRepositoryV2, createInMemoryTemplateRecoveryRepository, createSavedTemplateSessionV2Record } = await import("@sleinity/template-browser/persistence");
  const storage = createInMemoryTemplateSessionRepositoryV2Storage();
  const repo = new InMemoryTemplateSessionRepositoryV2(storage);
  const recovery = createInMemoryTemplateRecoveryRepository(storage);
  const host = createTemplateSessionV2({ repository: repo }); host.load(base);
  const template = await host.save({name:"Recovery host"});
  const key = {kind:"single",templateId:template.id};
  const {lease} = await recovery.begin(key,"fresh");
  const state = host.getSnapshot();
  const record = createSavedTemplateSessionV2Record({name:template.name,basePackage:state.basePackage,contentState:state.contentState,sessionAssets:state.sessionAssets});
  await recovery.save(lease,record);
  assert.deepEqual((await recovery.inspect(key)).payload.contentState,state.contentState);
  let exports=0;
  await recovery.exportAndComplete(lease,async()=>{exports++;});
  assert.equal(exports,1); assert.equal(await recovery.inspect(key),null);
  await assert.rejects(recovery.save(lease,record),/no longer active/);
  host.dispose(); console.log("Public recovery host: scoped save, completion and rejected late save passed.");
}
