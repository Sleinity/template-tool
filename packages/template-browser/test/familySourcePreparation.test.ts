import assert from "node:assert/strict";
import { parseTemplatePackageV2 } from "@sleinity/template-core";
import { getTemplateFieldFamilyEditorControlOrderV2, resolveTemplateFieldFamilyVariantV2 } from "@sleinity/template-core/family";
import { projectionPackage } from "../../template-core/test/definitionProjection.fixtures";
import { appendTemplateSourcesV2, createTemplateFieldFamilyFromSourcesV2, type TemplateImportSourceV2 } from "../src/import/templateSourceAssemblyV2";
import { prepareInitialFamilyV2, prepareAppendedFamilyV2 } from "../src/import/familySourcePreparationV2";
import { baselineAppendTemplateSourcesV2, baselineCreateTemplateFieldFamilyFromSourcesV2 } from "./familyAuthoringBaseline";
import { sessionAssetUrlLeases } from "../src/session/sessionAssetUrlLeases";

function identity<T>(fn: () => T): T {
  const original = crypto.randomUUID;
  crypto.randomUUID = () => "00000000-0000-4000-8000-000000000001";
  try { return fn(); } finally { crypto.randomUUID = original; }
}
function source(id: string): TemplateImportSourceV2 & { packageValue: ReturnType<typeof projectionPackage> } {
  const packageValue = projectionPackage(); packageValue.packageId = "duplicate-package-id"; packageValue.name = id;
  const image = packageValue.editableFields.find(field => field.type === "image")!;
  image.configuration = { replacementPlacement: "crop" };
  return { id, name: `${id}.zip`, packageValue };
}
function failure(fn: () => unknown) {
  try { fn(); } catch (cause) {
    assert(cause instanceof Error); return { name: cause.name, message: cause.message };
  }
  assert.fail("Operation should reject");
}
const a = source("a"), b = source("b"), c = source("c");
const bTitle = b.packageValue.editableFields.find(field => field.type === "text")!;
delete bTitle.label; delete bTitle.controlRole;
bTitle.defaultValue = "Other";
bTitle.configuration = { choices: { mode: "suggested", options: [{ id: "one", value: "One" }, { id: "two", value: "Two" }] } };
b.packageValue.editableFieldOrder.reverse();
const originalSources = structuredClone([a, b]);

// Full initial output, own optional properties, atomic overrides and source data.
const before = identity(() => baselineCreateTemplateFieldFamilyFromSourcesV2([a.packageValue, b.packageValue], "Initial"));
const after = identity(() => createTemplateFieldFamilyFromSourcesV2([a.packageValue, b.packageValue], "Initial"));
assert.deepEqual(after, before); assert.deepEqual([a, b], originalSources);
assert(Object.hasOwn(after.fields.find(field => field.type === "textarea")!, "label"));
const overrides = after.variants[1].fieldOverrides!["text:title"];
assert(overrides.type === "text");
assert.equal(overrides.configuration!.maxCharacters, null);
assert.deepEqual(overrides.configuration!.choices, bTitle.configuration.choices);
assert.equal(after.variants[1].packageValue.editableFields.find(field => field.type === "text")!.defaultValue, "Other");
assert.deepEqual(after.variants[1].packageValue.nodes, b.packageValue.nodes);
assert.deepEqual(after.variants[0].packageValue.assets, a.packageValue.assets);
after.variants[0].packageValue.nodes[after.variants[0].packageValue.rootNodeId].name = "Candidate only";
assert.deepEqual([a, b], originalSources);

// Private preparation receives IDs; it never invents identities or aliases input.
const isolated = prepareInitialFamilyV2([a.packageValue], "Private", "definition-id", ["source-id"]);
assert.equal(isolated.id, "definition-id"); assert.equal(isolated.variants[0].id, "source-id");
isolated.fields[0].configuration = {}; assert.deepEqual([a, b], originalSources);

// Promotion preserves accepted configuration/order and leaves accepted state alone.
const single = identity(() => baselineAppendTemplateSourcesV2(null, [], [a], "Accepted"));
assert(!("selectVariant" in single));
const configuredText = single.getSnapshot().basePackage!.editableFields.find(field => field.type === "text")!;
single.configure({ fields: [{ ...configuredText, label: "Accepted label", configuration: { maxCharacters: 80 } }],
  editableFieldOrder: [...a.packageValue.editableFieldOrder].reverse() });
const singleSnapshot = single.getSnapshot();
const promotedA = identity(() => baselineAppendTemplateSourcesV2(single, [a], [b], "Promotion"));
const promotedB = identity(() => appendTemplateSourcesV2(single, [a], [b], "Promotion"));
assert.deepEqual(promotedB.getSnapshot(), promotedA.getSnapshot()); assert.equal(single.getSnapshot(), singleSnapshot);
assert("selectVariant" in promotedB);
assert.equal(promotedB.getSnapshot().family!.variants[0].id, a.id);
promotedA.dispose(); promotedB.dispose();
const singleText = single.getFieldControllers().find(field => field.type === "text")!;
assert(singleText.setValue("Edited").accepted);
assert.deepEqual(failure(() => appendTemplateSourcesV2(single, [a], [b], "Forbidden")), failure(() => baselineAppendTemplateSourcesV2(single, [a], [b], "Forbidden")));
single.dispose();

// Accepted Family edits, Choice identity, shared assets and sparse Crop survive append.
const accepted = identity(() => baselineAppendTemplateSourcesV2(null, [], [a, b], "Accepted Family"));
assert("selectVariant" in accepted);
accepted.selectVariant("b");
const choice = accepted.getFieldControllers().find(field => field.type === "text")!;
assert(choice.selectChoice("two").accepted);
const image = accepted.getFieldControllers().find(field => field.type === "image")!;
assert((await image.replaceImage({ dataUrl: "data:image/png;base64,iVBORw0KGgo=", width: 1200, height: 800, placement: { mode: "crop", crop: {
  schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source", transform: [[0.8, 0, 0.1], [0, 0.8, 0.1]],
} } })).accepted);
assert(accepted.getFieldControllers().find(field => field.type === "image")!.setVariantPlacement({ mode: "crop", crop: {
  schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source", transform: [[0.5, 0, 0.4], [0, 0.9, 0.05]],
} }).accepted);
accepted.configure({ editableFieldOrder: [...accepted.getSnapshot().family!.editableFieldOrder].reverse(), variants: [{ id: "b", fieldOverrides: {
  ...accepted.getSnapshot().family!.variants[1].fieldOverrides,
  "text:title": { type: "text", label: null, controlRole: null, configuration: { ...overrides.configuration } },
} }] });
const acceptedSnapshot = accepted.getSnapshot();
const appendedA = identity(() => baselineAppendTemplateSourcesV2(accepted, [a, b], [c], "Ignored new title"));
const appendedB = identity(() => appendTemplateSourcesV2(accepted, [a, b], [c], "Ignored new title"));
assert.deepEqual(appendedB.getSnapshot(), appendedA.getSnapshot()); assert.equal(accepted.getSnapshot(), acceptedSnapshot);
assert("selectVariant" in appendedB);
assert.equal(appendedB.getSnapshot().selectedVariantId, "b");
assert.equal(appendedB.getSnapshot().contentState!.values["text:title"].selectedChoiceId, "two");
assert.deepEqual(appendedB.getSnapshot().contentState!.variantImagePlacements, acceptedSnapshot.contentState!.variantImagePlacements);
appendedA.dispose(); appendedB.dispose();

// Canonical input validation rejects a conflicting typed ID without changing accepted state.
const conflicting = source("conflicting");
const conflictingNumber = conflicting.packageValue.editableFields.find(field => field.type === "number")!;
const priorNumberId = conflictingNumber.id; conflictingNumber.id = "text:title";
conflicting.packageValue.editableFields = conflicting.packageValue.editableFields.filter(field => field.type !== "text");
conflicting.packageValue.editableFieldOrder = conflicting.packageValue.editableFieldOrder.filter(id => id !== "text:title").map(id => id === priorNumberId ? "text:title" : id);
assert.equal(parseTemplatePackageV2(conflicting.packageValue).validation?.valid, false);
assert.deepEqual(failure(() => appendTemplateSourcesV2(accepted, [a, b], [conflicting], "Conflict")),
  failure(() => baselineAppendTemplateSourcesV2(accepted, [a, b], [conflicting], "Conflict")));
assert.equal(accepted.getSnapshot(), acceptedSnapshot);

// Selector assignments and sparse fields preserve the complete accepted definition.
const sparse = source("sparse"); sparse.packageValue.editableFields = sparse.packageValue.editableFields.filter(field => field.type === "image");
sparse.packageValue.editableFieldOrder = sparse.packageValue.editableFields.map(field => field.id);
const selectorFamily = structuredClone(acceptedSnapshot.family!);
selectorFamily.variantGroups = [{ id: "size", title: "Size", options: [{ id: "a", title: "A" }, { id: "b", title: "B" }, { id: "c", title: "C" }] }];
selectorFamily.variants.forEach(variant => { variant.groupAssignments = { size: variant.id }; });
selectorFamily.editorControlOrder = getTemplateFieldFamilyEditorControlOrderV2({ ...selectorFamily, editorControlOrder: undefined });
accepted.load(selectorFamily, { contentState: acceptedSnapshot.contentState!, selectedVariantId: "b", sessionAssets: acceptedSnapshot.sessionAssets });
const assignmentSnapshot = accepted.getSnapshot();
const invalidAssignments: Record<string, Record<string, string>>[] = [{}, { sparse: { size: "unknown" } }, { sparse: { size: "b" } }];
for (const assignments of invalidAssignments) {
  assert.deepEqual(failure(() => appendTemplateSourcesV2(accepted, [a, b], [sparse], "Append", assignments)),
    failure(() => baselineAppendTemplateSourcesV2(accepted, [a, b], [sparse], "Append", assignments)));
  assert.equal(accepted.getSnapshot(), assignmentSnapshot);
}
const sparseA = identity(() => baselineAppendTemplateSourcesV2(accepted, [a, b], [sparse], "Append", { sparse: { size: "c" } }));
const sparseB = identity(() => appendTemplateSourcesV2(accepted, [a, b], [sparse], "Append", { sparse: { size: "c" } }));
assert.deepEqual(sparseB.getSnapshot(), sparseA.getSnapshot());
assert("selectVariant" in sparseB);
assert(resolveTemplateFieldFamilyVariantV2(sparseB.getSnapshot().family!, "sparse").valid);
const privateAppend = prepareAppendedFamilyV2(selectorFamily, [{ id: "sparse", packageValue: sparse.packageValue }], { sparse: { size: "c" } });
privateAppend.variants[0].packageValue.name = "Candidate changed";
assert.deepEqual(accepted.getSnapshot().family, selectorFamily); assert.equal(sparse.packageValue.name, "sparse");
sparseA.dispose(); sparseB.dispose(); accepted.dispose();

// Malformed inputs and failed session acceptance retain the original rejection.
const incompatible = source("incompatible");
(incompatible.packageValue.editableFields[0] as unknown as { type: string }).type = "number";
const duplicateChoices = structuredClone(b.packageValue);
const duplicateText = duplicateChoices.editableFields.find(field => field.type === "text")!;
duplicateText.configuration = { choices: { mode: "suggested", options: [{ id: "one", value: "Same" }, { id: "two", value: "Same" }] } };
for (const packages of [[], [a.packageValue, incompatible.packageValue], [duplicateChoices]]) {
  assert.deepEqual(failure(() => createTemplateFieldFamilyFromSourcesV2(packages, "Invalid")), failure(() => baselineCreateTemplateFieldFamilyFromSourcesV2(packages, "Invalid")));
}
const stale = identity(() => baselineAppendTemplateSourcesV2(null, [], [a, b], "Stale"));
assert("selectVariant" in stale);
const fakeAccepted = { ...stale, getSnapshot: () => ({ ...stale.getSnapshot(), selectedVariantId: "missing-variant" }) } as unknown as typeof stale;
assert.deepEqual(failure(() => appendTemplateSourcesV2(fakeAccepted, [a, b], [c], "Reject")), failure(() => baselineAppendTemplateSourcesV2(fakeAccepted, [a, b], [c], "Reject")));
assert.equal(stale.getSnapshot().status, "ready"); stale.dispose();

// Candidate handoff uses the existing lease registry, with final-owner cleanup.
const leased = source("leased"), url = "blob:family-preparation-contract";
const asset = Object.values(leased.packageValue.assets).find(entry => entry.type === "image")!;
Object.assign(asset, { stableUrl: url });
let revoked = 0; sessionAssetUrlLeases.set(url, { count: 1, revoke: () => { revoked++; } });
const predecessor = appendTemplateSourcesV2(null, [], [leased], "Lease");
const successor = appendTemplateSourcesV2(predecessor, [leased], [b], "Lease");
assert("selectVariant" in successor);
const retainedBeforeFailure = sessionAssetUrlLeases.get(url)!.count;
const failedHandoff = { ...successor, getSnapshot: () => ({ ...successor.getSnapshot(), selectedVariantId: "missing-variant" }) } as unknown as typeof successor;
assert.deepEqual(failure(() => appendTemplateSourcesV2(failedHandoff, [leased, b], [c], "Failed handoff")),
  failure(() => baselineAppendTemplateSourcesV2(failedHandoff, [leased, b], [c], "Failed handoff")));
assert.equal(sessionAssetUrlLeases.get(url)!.count, retainedBeforeFailure); assert.equal(revoked, 0);
predecessor.dispose(); assert.equal(revoked, 0);
const lease = sessionAssetUrlLeases.get(url)!; assert(lease.count > 1); lease.count--;
assert.equal(revoked, 0); successor.dispose(); assert.equal(revoked, 1); assert(!sessionAssetUrlLeases.has(url));

console.log("Family preparation: exact definitions, accepted configuration/content, rollback and final-owner cleanup passed.");
