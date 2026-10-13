import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  createTemplateFamilyFromPackage,
  getTemplateFamilyFieldScope,
  materializeTemplateFamilyVariant,
  validateTemplateFamily,
  type TemplateFamilyV1,
} from "@sleinity/template-core/family";
import type { EditableFieldBinding, TemplatePackageV1 } from "@sleinity/template-core";
import {
  applyTemplateFamilyVariantReimport,
  applyTemplateFamilyVariantReimportState,
  planTemplateFamilyVariantReimport,
} from "../src/import/templateFamilyReimport";
import {
  createInMemoryTemplateRepositoryStorage,
  InMemoryTemplateRepository,
} from "../src/persistence/inMemoryTemplateRepository";
import {
  createSavedTemplateRecord,
  createSavedTemplateFamilyRecord,
} from "../src/persistence/templateRepository";
import { validateCurrentSavedTemplateFamilyRecord } from "../src/persistence/savedRecordValidation";
import { createResolvedRenderTree, validateTemplatePackage } from "@sleinity/template-core";
import { createTemplateFamilySession } from "../src/session/templateFamilySession";
import { createTemplateSessionWithDependencies } from "../src/session/templateSession";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sourcePackage(): TemplatePackageV1 {
  const packageValue = structuredClone(
    figmaPluginV041 as unknown as TemplatePackageV1,
  );
  const imageField: EditableFieldBinding = {
    id: "hero-image",
    nodeId: "58:61",
    type: "image",
    property: "image.assetId",
    label: "Hero image",
    defaultValue: packageValue.nodes["58:61"].image?.assetId ?? "",
  };
  packageValue.editableFields.push(imageField);
  return packageValue;
}

const seeded = createTemplateFamilyFromPackage({
  familyId: "family:browser-test",
  familyTitle: "Browser Family",
  variantId: "variant:square",
  variantTitle: "Square",
  packageValue: sourcePackage(),
  idFactory: (kind, seed) => `${kind}:${seed}`,
});
const landscape = structuredClone(seeded.family.variants[0]);
landscape.id = "variant:landscape";
landscape.title = "Landscape";
landscape.packageValue.canvas.width += 200;
seeded.family.variants.push(landscape);
seeded.family.variantGroups = [{
  id: "group:format",
  title: "Format",
  options: [
    { id: "option:square", title: "Square" },
    { id: "option:landscape", title: "Landscape" },
  ],
}, {
  id: "group:colour",
  title: "Colour",
  options: [
    { id: "option:blue", title: "Blue" },
    { id: "option:red", title: "Red" },
  ],
}];
seeded.family.variants[0].groupAssignments = {
  "group:format": "option:square",
  "group:colour": "option:blue",
};
seeded.family.variants[1].groupAssignments = {
  "group:format": "option:landscape",
  "group:colour": "option:blue",
};
seeded.family.controlOrder = [
  { kind: "selection-property", groupId: "group:format" },
  { kind: "field", fieldId: seeded.family.fields[0].id },
  { kind: "selection-property", groupId: "group:colour" },
  ...seeded.family.fields.slice(1).map((field) => ({
    kind: "field" as const,
    fieldId: field.id,
  })),
];

const currentSavedRecord = createSavedTemplateFamilyRecord({ family: seeded.family });
const publishedV1Family = structuredClone(seeded.family) as TemplateFamilyV1;
const migratedSavedRecord = validateCurrentSavedTemplateFamilyRecord({
  ...structuredClone(currentSavedRecord),
  family: publishedV1Family,
});
assert(
  migratedSavedRecord.family.schemaVersion === "template-family-v1" &&
    migratedSavedRecord.family.variantGroups.length === 1 &&
    migratedSavedRecord.family.variants[0]?.id === seeded.family.variants[0]?.id &&
    publishedV1Family.variantGroups.length === 1,
  "Reading a saved 0.8 family must preserve its tuple selection contract without mutating the record.",
);

const mixedFamilyStorage = createInMemoryTemplateRepositoryStorage();
mixedFamilyStorage.families!.set("family:unpublished-v2", {
  ...structuredClone(currentSavedRecord),
  id: "family:unpublished-v2",
  family: {
    schemaVersion: "template-family-v2",
    id: "family:unpublished-v2",
  },
} as unknown as typeof currentSavedRecord);
const mixedFamilyRepository = new InMemoryTemplateRepository(mixedFamilyStorage);
await mixedFamilyRepository.saveFamily(currentSavedRecord);
const readableFamilyRecords = await mixedFamilyRepository.listFamilies();
assert(
  readableFamilyRecords.length === 1 &&
    readableFamilyRecords[0]?.id === currentSavedRecord.id &&
    mixedFamilyStorage.families!.has("family:unpublished-v2"),
  "An unreadable unpublished family must remain preserved without hiding valid saved templates from repository listings.",
);

const storage = createInMemoryTemplateRepositoryStorage();
const repository = new InMemoryTemplateRepository(storage);
const session = createTemplateFamilySession({
  familyRepository: repository,
  templateRepository: repository,
  fontRegistry: null,
});
const loaded = session.load({ family: seeded.family, content: seeded.content });
assert(
  loaded.applied &&
    session.getSnapshot().status === "ready" &&
    session.renderSession.getSnapshot().workingPackage?.canvas.width ===
      seeded.family.variants[0].packageValue.canvas.width,
  "A family session must materialize its selected variant through one ordinary render session.",
);

const headline = seeded.family.fields.find((field) => field.key === "headline");
assert(headline, "The family session fixture requires a headline field.");
const contentRevisionBeforeInvalidType = session.getSnapshot().contentRevision;
const invalidType = session.setField(headline.id, {
  kind: "image",
  assetRef: "asset:not-a-text-value",
});
assert(
  !invalidType.applied &&
    session.getSnapshot().contentRevision === contentRevisionBeforeInvalidType,
  "A family session must reject a shared value with the wrong field type without advancing content state.",
);
session.setField(headline.id, "Shared family value");
const beforeSwitchContent = session.getSnapshot().content;
assert(
  session.getOptionAvailability().find(
    (option) => option.optionId === "option:landscape",
  )?.available === true,
  "The family session must expose option availability for host selector controls.",
);
const unavailableSelection = session.selectOption("group:colour", "option:red");
assert(
  !unavailableSelection.applied &&
    session.getSnapshot().selectedVariantId === seeded.family.variants[0].id &&
    session.getSnapshot().groupSelections["group:colour"] === "option:blue",
  "An unavailable option must not silently change another property or the selected ZIP.",
);
const switched = session.selectOption("group:format", "option:landscape");
const textTarget = landscape.bindings.find(
  (binding) => binding.familyFieldId === headline.id,
)?.targets[0];
const renderedNode = textTarget
  ? session.renderSession.getSnapshot().workingPackage?.nodes[textTarget.nodeId]
  : null;
assert(
  switched.applied &&
    session.getSnapshot().content?.values[headline.id] === "Shared family value" &&
    session.getSnapshot().groupSelections["group:format"] === "option:landscape" &&
    session.getSnapshot().content?.revision === beforeSwitchContent?.revision &&
    renderedNode?.type === "TEXT" &&
    "characters" in renderedNode.text &&
    renderedNode.text.characters === "Shared family value",
  "Variant switching must retain one shared content state and rematerialize only the selected package.",
);

const staleRevision = session.getSnapshot().operationRevision;
session.setField(headline.id, "Newer value");
const stale = session.selectVariant(seeded.family.variants[0].id, staleRevision);
assert(
  stale.stale && session.getSnapshot().selectedVariantId === landscape.id,
  "A stale family operation must not overwrite newer shared content or selection state.",
);

const imageField = seeded.family.fields.find((field) => field.type === "image");
assert(imageField, "The family session fixture requires an image field.");
const imageEdit = session.replaceImage(imageField.id, {
  dataUrl: "data:image/png;base64,AA==",
  mimeType: "image/png",
  sizeBytes: 1,
  width: 10,
  height: 10,
  assetId: "family-asset:shared-hero",
});
assert(
  imageEdit.applied &&
    session.getSnapshot().content?.values[imageField.id] &&
    Object.keys(session.getSnapshot().sharedImageAssets).length === 1,
  "A shared image replacement must be stored once in family content and projected into the selected variant.",
);
session.setImageReplacementMode(imageField.id, "replacement-fit");
const selectedImageTarget = landscape.bindings.find(
  (binding) => binding.familyFieldId === imageField.id,
)?.targets[0];
assert(
  selectedImageTarget &&
    session.renderSession.getSnapshot().workingPackage?.nodes[selectedImageTarget.nodeId]
      ?.image?.activePlacement?.state === "replacement-fit",
  "A shared image Fill/Fit choice must project into the current variant's ordinary image-placement authority.",
);

const savedFamily = await session.save({ name: "Persisted Browser Family" });
const savedDraft = await session.saveDraft("Persisted Family Draft");
const reopened = createTemplateFamilySession({
  familyRepository: repository,
  templateRepository: repository,
  fontRegistry: null,
});
await reopened.loadSavedFamily(savedFamily.id, savedDraft.id);
assert(
  reopened.getSnapshot().status === "ready" &&
    reopened.getSnapshot().selectedVariantId === landscape.id &&
    reopened.getSnapshot().groupSelections["group:format"] === "option:landscape" &&
    reopened.getSnapshot().groupSelections["group:colour"] === "option:blue" &&
    reopened.getSnapshot().content?.values[headline.id] === "Newer value" &&
    Object.keys(reopened.getSnapshot().sharedImageAssets).length === 1,
  "A fresh session must reopen family content, selection, and shared image assets from browser persistence.",
);

const scopedFamily = structuredClone(seeded.family);
const scopedLandscape = scopedFamily.variants.find((variant) => variant.id === landscape.id)!;
const scopedTargets = scopedLandscape.bindings.find(
  (binding) => binding.familyFieldId === headline.id,
)?.targets ?? [];
scopedLandscape.bindings = scopedLandscape.bindings.filter(
  (binding) => binding.familyFieldId !== headline.id,
);
scopedLandscape.packageValue.editableFields = scopedLandscape.packageValue.editableFields.filter(
  (field) => !scopedTargets.some(
    (candidate) =>
      candidate.fieldId === field.id &&
      candidate.nodeId === field.nodeId &&
      candidate.property === field.property,
  ),
);
const scopedStorage = createInMemoryTemplateRepositoryStorage();
const scopedRepository = new InMemoryTemplateRepository(scopedStorage);
const scopedSession = createTemplateFamilySession({
  familyRepository: scopedRepository,
  templateRepository: scopedRepository,
  fontRegistry: null,
});
scopedSession.load({ family: scopedFamily, content: seeded.content });
scopedSession.setField(headline.id, "Value hidden in Landscape");
scopedSession.selectVariant(landscape.id);
const scopedSavedFamily = await scopedSession.save({ name: "Scoped Browser Family" });
const scopedSavedDraft = await scopedSession.saveDraft("Scoped Browser Draft");
scopedSession.dispose();
const reopenedScopedSession = createTemplateFamilySession({
  familyRepository: scopedRepository,
  templateRepository: scopedRepository,
  fontRegistry: null,
});
await reopenedScopedSession.loadSavedFamily(scopedSavedFamily.id, scopedSavedDraft.id);
assert(
  reopenedScopedSession.getSnapshot().selectedVariantId === landscape.id &&
    reopenedScopedSession.getSnapshot().content?.values[headline.id] ===
      "Value hidden in Landscape",
  "A hidden variant-specific value must survive selection, persistence, disposal, and offline reopening.",
);
reopenedScopedSession.selectVariant(scopedFamily.variants[0].id);
const reopenedTarget = scopedFamily.variants[0].bindings.find(
  (binding) => binding.familyFieldId === headline.id,
)?.targets[0];
const reopenedNode = reopenedTarget
  ? reopenedScopedSession.renderSession.getSnapshot().workingPackage?.nodes[reopenedTarget.nodeId]
  : null;
assert(
  reopenedNode?.type === "TEXT" &&
    "characters" in reopenedNode.text &&
    reopenedNode.text.characters === "Value hidden in Landscape",
  "Selecting the applicable variant again must restore the retained hidden value to rendering.",
);
reopenedScopedSession.dispose();

const exactPlan = planTemplateFamilyVariantReimport(
  seeded.family,
  seeded.family.variants[0].id,
  sourcePackage(),
);
const reimported = applyTemplateFamilyVariantReimport(seeded.family, exactPlan, 0);
assert(
  exactPlan.canApply &&
    reimported.id === seeded.family.id &&
    reimported.variants[0].id === seeded.family.variants[0].id &&
    JSON.stringify(reimported.variants[0].groupAssignments) ===
      JSON.stringify(seeded.family.variants[0].groupAssignments) &&
    JSON.stringify(reimported.controlOrder) === JSON.stringify(seeded.family.controlOrder),
  "An exact reimport must preserve family, variant, selection-assignment, and control-order identity.",
);

const packageWithSpecificField = sourcePackage();
const occupiedNodes = new Set(packageWithSpecificField.editableFields.map((field) => field.nodeId));
const specificNode = Object.values(packageWithSpecificField.nodes).find(
  (node) => node.type === "TEXT" && !occupiedNodes.has(node.id),
);
assert(specificNode?.type === "TEXT", "The reimport fixture requires an unused text node.");
packageWithSpecificField.editableFields.push({
  id: "variant-note",
  nodeId: specificNode.id,
  type: "text",
  property: "text.characters",
  label: "Variant note",
  defaultValue: "characters" in specificNode.text ? specificNode.text.characters : "",
});
const addedFieldPlan = planTemplateFamilyVariantReimport(
  seeded.family,
  seeded.family.variants[0].id,
  packageWithSpecificField,
);
const addedTarget = addedFieldPlan.addedTargets.find((item) => item.fieldId === "variant-note");
assert(addedTarget, "A newly imported package field must be reported for an explicit decision.");
const addedFieldState = applyTemplateFamilyVariantReimportState(
  seeded.family,
  seeded.content,
  addedFieldPlan,
  0,
  {
    addedTargetResolutions: [{
      target: addedTarget,
      action: "create-variant-specific",
      fieldId: "field:variant-note",
      key: "variant_note",
      title: "Variant note",
    }],
  },
);
assert(
  getTemplateFamilyFieldScope(addedFieldState.family, "field:variant-note").kind ===
      "variant-specific" &&
    Object.prototype.hasOwnProperty.call(addedFieldState.content.values, "field:variant-note") &&
    validateTemplateFamily(addedFieldState.family, addedFieldState.content).definitionValid,
  "A reviewed reimport must atomically accept an added target as a stable variant-specific field and content value.",
);
const packageWithSuggestedRemap = sourcePackage();
const headlineTarget = seeded.family.variants[0].bindings.find(
  (binding) => binding.familyFieldId === headline.id,
)?.targets[0];
assert(headlineTarget, "The reimport fixture requires the original headline target.");
const renamedHeadline = packageWithSuggestedRemap.editableFields.find(
  (field) =>
    field.id === headlineTarget.fieldId &&
    field.nodeId === headlineTarget.nodeId &&
    field.property === headlineTarget.property,
);
assert(renamedHeadline, "The reimport fixture requires the editable headline field.");
renamedHeadline.id = "renamed-headline";
renamedHeadline.label = headline.title;
const suggestedRemapPlan = planTemplateFamilyVariantReimport(
  seeded.family,
  seeded.family.variants[0].id,
  packageWithSuggestedRemap,
);
const suggestedChange = suggestedRemapPlan.fieldChanges.find(
  (change) => change.familyFieldId === headline.id,
);
const suggestedTarget = suggestedChange?.suggestedTargets[0];
assert(
  suggestedChange?.status === "unresolved" && suggestedTarget,
  "A normalized-name reimport match must remain a reviewed suggestion.",
);
const suggestedRemapState = applyTemplateFamilyVariantReimportState(
  seeded.family,
  seeded.content,
  suggestedRemapPlan,
  0,
  {
    resolvedBindings: [
      ...suggestedRemapPlan.proposedBindings.filter((binding) => binding.targets.length > 0),
      { familyFieldId: headline.id, targets: [suggestedTarget] },
    ],
  },
);
assert(
  suggestedRemapState.family.variants[0].bindings.some(
    (binding) =>
      binding.familyFieldId === headline.id &&
      binding.targets.some((candidate) => candidate.fieldId === "renamed-headline"),
  ),
  "A reviewed suggested remap must not also require or create a second added-field resolution.",
);

let unreviewedRemovalRejected = false;
try {
  applyTemplateFamilyVariantReimportState(
    seeded.family,
    seeded.content,
    exactPlan,
    0,
    { removeOrphanFamilyFieldIds: [headline.id] },
  );
} catch {
  unreviewedRemovalRejected = true;
}
assert(
  unreviewedRemovalRejected,
  "Reimport must reject deletion of a field that the reviewed plan did not identify as orphaned.",
);

const invalidRetainedContent = structuredClone(seeded.content);
invalidRetainedContent.values[headline.id] = {
  kind: "image",
  assetRef: "asset:invalid-for-text",
};
const retainedInvalidState = applyTemplateFamilyVariantReimportState(
  seeded.family,
  invalidRetainedContent,
  exactPlan,
  0,
);
assert(
  typeof retainedInvalidState.content.values[headline.id] === "object",
  "A valid reimport must retain invalid shared content for diagnostics instead of silently rejecting or changing it.",
);
const incompatiblePackage = sourcePackage();
const removedTarget = seeded.family.variants[0].bindings[0]?.targets[0];
assert(removedTarget, "The reimport fixture requires an existing field binding.");
incompatiblePackage.editableFields = incompatiblePackage.editableFields.filter(
  (field) => !(field.id === removedTarget.fieldId && field.nodeId === removedTarget.nodeId),
);
const unresolvedPlan = planTemplateFamilyVariantReimport(
  seeded.family,
  seeded.family.variants[0].id,
  incompatiblePackage,
);
let unresolvedRejected = false;
try {
  applyTemplateFamilyVariantReimport(seeded.family, unresolvedPlan, 0);
} catch {
  unresolvedRejected = true;
}
assert(
  !unresolvedPlan.canApply &&
    unresolvedPlan.removedTargets.length > 0 &&
    unresolvedPlan.unresolvedFamilyFieldIds.length > 0 &&
    unresolvedRejected,
  "Removed or incompatible reimport fields must be surfaced and rejected until explicitly resolved.",
);
const oneVariantFamily = structuredClone(seeded.family);
oneVariantFamily.variants = [oneVariantFamily.variants[0]];
const oneVariantPlan = planTemplateFamilyVariantReimport(
  oneVariantFamily,
  oneVariantFamily.variants[0].id,
  incompatiblePackage,
);
const orphanFieldId = oneVariantPlan.unresolvedFamilyFieldIds[0];
assert(orphanFieldId, "Removing the last target must require an orphan-field decision.");
const removedOrphanState = applyTemplateFamilyVariantReimportState(
  oneVariantFamily,
  seeded.content,
  oneVariantPlan,
  0,
  { removeOrphanFamilyFieldIds: [orphanFieldId] },
);
assert(
  !removedOrphanState.family.fields.some((field) => field.id === orphanFieldId) &&
    !Object.prototype.hasOwnProperty.call(removedOrphanState.content.values, orphanFieldId),
  "Removing a field whose final target disappeared must explicitly and atomically remove its stored content.",
);

const revisionPlan = session.planVariantReimport(landscape.id, sourcePackage());
const renamedFamily: TemplateFamilyV1 = {
  ...session.getSnapshot().family!,
  title: "Newer family title",
};
session.replaceFamily(renamedFamily);
let staleReimportRejected = false;
try {
  session.applyVariantReimport(revisionPlan);
} catch {
  staleReimportRejected = true;
}
assert(
  staleReimportRejected &&
    session.getSnapshot().family?.title === "Newer family title",
  "A reimport plan must not apply after the family revision changes.",
);

const legacyPackage = sourcePackage();
const legacyRecord = createSavedTemplateRecord({
  name: "Legacy SDK Template",
  packageValue: legacyPackage,
  validation: validateTemplatePackage(legacyPackage),
});
await repository.saveTemplate(legacyRecord);
const legacySession = createTemplateFamilySession({
  familyRepository: repository,
  templateRepository: repository,
  fontRegistry: null,
});
await legacySession.loadLegacyTemplate(legacyRecord.id);
assert(
  legacySession.getSnapshot().status === "ready" &&
    legacySession.getSnapshot().family?.id === legacyRecord.id &&
    (await repository.getTemplate(legacyRecord.id)) !== null &&
    (await repository.getFamily(legacyRecord.id)) === null,
  "Opening a legacy template as a one-variant family must not eagerly rewrite or delete the legacy record.",
);
const migrated = createSavedTemplateFamilyRecord({
  family: legacySession.getSnapshot().family!,
  migratedFromTemplateId: legacyRecord.id,
});
await repository.saveFamily(migrated);
assert(
  (await repository.getTemplate(legacyRecord.id)) !== null &&
    (await repository.getFamily(legacyRecord.id)) !== null,
  "An explicit family save must retain the legacy record as a rollback source.",
);

const performancePackage = sourcePackage();
const seedTextField = performancePackage.editableFields.find((field) => field.type === "text");
assert(seedTextField, "The family performance fixture requires a text field.");
const seedTextNode = performancePackage.nodes[seedTextField.nodeId];
assert(seedTextNode?.type === "TEXT", "The family performance fixture requires a text node.");
const seedParent = seedTextNode.parentId ? performancePackage.nodes[seedTextNode.parentId] : null;
assert(seedParent, "The family performance fixture requires a parent node.");
performancePackage.editableFields = [];
for (let index = 0; index < 30; index += 1) {
  const nodeId = `family-performance-node:${index}`;
  performancePackage.nodes[nodeId] = {
    ...structuredClone(seedTextNode),
    id: nodeId,
    name: `Performance field ${index}`,
    parentId: seedParent.id,
  };
  seedParent.children.push(nodeId);
  performancePackage.editableFields.push({
    ...structuredClone(seedTextField),
    id: `family-performance-field:${index}`,
    nodeId,
    label: `Performance field ${index}`,
  });
}
const performanceSeed = createTemplateFamilyFromPackage({
  familyId: "family:performance",
  familyTitle: "Performance Family",
  variantId: "variant:performance:0",
  variantTitle: "Performance 0",
  packageValue: performancePackage,
  idFactory: (kind, seed) => `${kind}:${seed}`,
});
for (let index = 1; index < 12; index += 1) {
  const variant = structuredClone(performanceSeed.family.variants[0]);
  variant.id = `variant:performance:${index}`;
  variant.title = `Performance ${index}`;
  performanceSeed.family.variants.push(variant);
}
assert(
  performanceSeed.family.variants.length === 12 &&
    performanceSeed.family.fields.length === 30 &&
    validateTemplateFamily(performanceSeed.family, performanceSeed.content).definitionValid,
  "The representative family must contain 12 valid variants and 30 shared fields.",
);
const performanceRenderSession = createTemplateSessionWithDependencies(
  { repository, fontRegistry: null },
  {
    importZip: async () => { throw new Error("Performance fixture does not import ZIPs."); },
    createResolvedTree: createResolvedRenderTree,
    validate: validateTemplatePackage,
  },
);
const performanceSession = createTemplateFamilySession({
  renderSession: performanceRenderSession,
  familyRepository: repository,
  templateRepository: repository,
});
performanceSession.load({
  family: performanceSeed.family,
  content: performanceSeed.content,
});
const performanceField = performanceSeed.family.fields[0];
const renderRevisionBefore = performanceRenderSession.getSnapshot().revision;
performanceSession.setField(performanceField.id, "Selected variant only");
assert(
  performanceRenderSession.getSnapshot().revision === renderRevisionBefore + 1 &&
    performanceSession.getSnapshot().selectedVariantId === "variant:performance:0",
  "Editing a 12-variant family must materialize exactly one selected render-session revision.",
);

let directMilliseconds = 0;
let familyMilliseconds = 0;
let directContent = structuredClone(performanceSeed.content);
for (let index = 0; index < 12; index += 1) {
  const value = `Benchmark ${index}`;
  directContent = {
    ...directContent,
    revision: directContent.revision + 1,
    values: { ...directContent.values, [performanceField.id]: value },
  };
  let started = performance.now();
  validateTemplateFamily(performanceSeed.family, directContent);
  const materializedPerformance = materializeTemplateFamilyVariant(
    performanceSeed.family,
    "variant:performance:0",
    directContent,
  );
  performanceRenderSession.loadTemplateState({
    importedPackage: performanceSeed.family.variants[0].packageValue,
    packageValue: materializedPerformance.packageValue,
    source: { type: "package-zip", sourceName: "performance-direct.zip" },
    expectedRevision: performanceRenderSession.getSnapshot().revision,
  });
  directMilliseconds += performance.now() - started;

  started = performance.now();
  performanceSession.setField(performanceField.id, value);
  familyMilliseconds += performance.now() - started;
}
assert(
  familyMilliseconds <= directMilliseconds * 1.2,
  `Family orchestration exceeded the 20% representative overhead budget (${familyMilliseconds.toFixed(2)}ms vs ${directMilliseconds.toFixed(2)}ms).`,
);

reopened.dispose();
legacySession.dispose();
performanceSession.dispose();
session.dispose();
assert(
  session.getSnapshot().status === "disposed" &&
    session.renderSession.getSnapshot().status === "disposed",
  "Disposing a family session must dispose its single owned render session.",
);

for (const draft of [false, true]) {
  const storage = new InMemoryTemplateRepository();
  let enter!: () => void; let unblock!: () => void;
  const entered = new Promise<void>(resolve => { enter = resolve; });
  const release = new Promise<void>(resolve => { unblock = resolve; });
  let calls = 0;
  const method = draft ? "saveFamilyDraft" : "saveFamily";
  const original = storage[method].bind(storage);
  (storage[method] as any) = async (record: any) => { calls++; if (calls === 1) { enter(); await release; } return original(record); };
  const owned = createTemplateFamilySession({ familyRepository: storage });
  owned.load({ family: seeded.family });
  const save = (name: string) => draft ? owned.saveDraft(name) : owned.save({ name });
  const first = save("First"); await entered;
  const second = save("Second");
  assert(calls === 1, "Family and draft writes are serialized."); unblock();
  const [a, b] = await Promise.all([first, second]);
  const stored = draft ? await storage.getFamilyDraft(a.id) : await storage.getFamily(a.id);
  assert(a.id === b.id && stored?.name === "Second", "Family and draft first-save identities remain stable across overlap.");
  owned.dispose();
}
for (const draft of [false, true]) for (const end of ["reset", "dispose"] as const) {
  const storage = new InMemoryTemplateRepository();
  let enter!: () => void; let unblock!: () => void;
  const entered = new Promise<void>(resolve => { enter = resolve; });
  const release = new Promise<void>(resolve => { unblock = resolve; }); let calls = 0;
  const method = draft ? "saveFamilyDraft" : "saveFamily";
  (storage[method] as any) = async (record: any) => { calls++; enter(); await release; return record; };
  const owned = createTemplateFamilySession({ familyRepository: storage });
  owned.load({ family: seeded.family });
  const save = () => draft ? owned.saveDraft() : owned.save();
  const first = save(); await entered; const queued = save().then(() => false, () => true);
  owned[end](); unblock(); await first;
  assert(await queued && calls === 1, "Family reset/disposal cancels queued template and draft writes.");
  owned.dispose();
}
for (const draft of [false, true]) {
  const storage = new InMemoryTemplateRepository(); let calls = 0;
  const method = draft ? "saveFamilyDraft" : "saveFamily";
  const original = storage[method].bind(storage);
  (storage[method] as any) = async (record: any) => { if (++calls === 1) throw new Error("Expected failure"); return original(record); };
  const owned = createTemplateFamilySession({ familyRepository: storage });
  owned.load({ family: seeded.family });
  const save = () => draft ? owned.saveDraft() : owned.save();
  const failed = save().then(() => false, () => true); const retry = save();
  assert(await failed && (await retry).id, "Family failures cannot poison subsequent template or draft saves.");
  owned.dispose();
}
