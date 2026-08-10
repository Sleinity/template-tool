import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  createTemplateFamilyFromPackage,
  materializeTemplateFamilyVariant,
  validateTemplateFamily,
  type TemplateFamilyV1,
} from "@sleinity/template-core/family";
import type { EditableFieldBinding, TemplatePackageV1 } from "@sleinity/template-core";
import {
  applyTemplateFamilyVariantReimport,
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
const switched = session.selectVariant(landscape.id);
const textTarget = landscape.bindings.find(
  (binding) => binding.familyFieldId === headline.id,
)?.targets[0];
const renderedNode = textTarget
  ? session.renderSession.getSnapshot().workingPackage?.nodes[textTarget.nodeId]
  : null;
assert(
  switched.applied &&
    session.getSnapshot().content?.values[headline.id] === "Shared family value" &&
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
    reopened.getSnapshot().content?.values[headline.id] === "Newer value" &&
    Object.keys(reopened.getSnapshot().sharedImageAssets).length === 1,
  "A fresh session must reopen family content, selection, and shared image assets from browser persistence.",
);

const exactPlan = planTemplateFamilyVariantReimport(
  seeded.family,
  seeded.family.variants[0].id,
  sourcePackage(),
);
const reimported = applyTemplateFamilyVariantReimport(seeded.family, exactPlan, 0);
assert(
  exactPlan.canApply &&
    reimported.id === seeded.family.id &&
    reimported.variants[0].id === seeded.family.variants[0].id,
  "An exact reimport must preserve family and variant identity.",
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
