import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { createResolvedRenderTree } from "../../../src/template-package/resolved";
import { validateTemplatePackage } from "@sleinity/template-core";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import type { PackageImportResult } from "../src/import/runTemplatePackageImportPipeline";
import {
  createTemplateFamilyImportWizard,
  loadTemplateFamilyImportConfirmation,
  verifyTemplateFamilyImportConfirmation,
} from "../src/import/templateFamilyImportWizard";
import { createTemplateSessionWithDependencies } from "../src/session/templateSession";
import { createTemplateFamilySession } from "../src/session/templateFamilySession";
import { InMemoryTemplateRepository } from "../src/persistence/inMemoryTemplateRepository";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packageValue = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
packageValue.fontRequirements = [];

function readyImport(sourceName: string): PackageImportResult {
  const validation = validateTemplatePackage(packageValue);
  return {
    package: structuredClone(packageValue),
    validation,
    diagnostics: validation.diagnostics,
    pluginDiagnostics: validation.pluginDiagnostics,
    enrichment: null,
    sourceMetadata: { type: "package-zip", sourceName },
    loadedSource: {
      sourceType: "template-package-zip",
      sourceName,
      formatVersion: "1.0",
      sourceFiles: { template: { path: "template.json", exists: true }, assets: [] },
      rawTemplateJson: packageValue,
      normalizedTemplateJson: packageValue,
      originalPackageValue: structuredClone(packageValue),
      packageValue: structuredClone(packageValue),
      validation,
      packageDiagnostics: validation.diagnostics,
      diagnostics: [],
      valid: true,
      figmaSource: null,
    },
    layeredDiagnostics: {
      canImport: true,
      status: "ready",
      diagnostics: [],
      blockingDiagnostics: [],
      warningDiagnostics: [],
      infoDiagnostics: [],
      layers: [],
    },
  } as unknown as PackageImportResult;
}

const repository = new InMemoryTemplateRepository();
const renderSession = createTemplateSessionWithDependencies(
  { repository, fontRegistry: null },
  {
    importZip: async () => readyImport("unused.zip"),
    createResolvedTree: createResolvedRenderTree,
    validate: validateTemplatePackage,
  },
);
const familySession = createTemplateFamilySession({
  renderSession,
  familyRepository: repository,
  templateRepository: repository,
});
let sequence = 0;
const wizard = createTemplateFamilyImportWizard({
  familySession,
  idFactory: (kind, seed) => `${kind}:${++sequence}:${seed}`,
  now: () => "2026-08-10T12:00:00.000Z",
  importPackage: async (input) => readyImport(input.sourceName ?? "family.zip"),
});

await wizard.loadFirstZip({
  bytes: new ArrayBuffer(0),
  sourceName: "square-blue.zip",
  title: "Square Blue",
});
assert(
  wizard.getSnapshot().family?.variants.length === 1 &&
    familySession.getSnapshot().status === "ready" &&
    Object.values(wizard.getSnapshot().variantImports)[0]?.layeredDiagnostics?.canImport === true,
  "The first ZIP must seed a ready family, retain layered diagnostics and load its selected preview session.",
);

await wizard.addVariant({
  bytes: new ArrayBuffer(0),
  sourceName: "landscape-blue.zip",
  title: "Landscape Blue",
});
const family = wizard.getSnapshot().family;
assert(
  family?.variants.length === 2 &&
    wizard.getSnapshot().matchPlans[family.variants[1].id]
      ?.automaticBindings.length === family.fields.length &&
    wizard.getSnapshot().validation?.definitionValid,
  "A compatible second ZIP must produce exact shared-field bindings without repeated setup.",
);

while (wizard.getSnapshot().activeStep !== "validation-preview") {
  const before = wizard.getSnapshot().activeStep;
  wizard.next();
  assert(
    wizard.getSnapshot().activeStep !== before,
    `Family wizard step "${before}" should be ready to continue.`,
  );
}
for (const variant of family.variants) {
  wizard.selectPreviewVariant(variant.id);
  const report = {
    variantId: variant.id,
    status: "ready" as const,
    sessionRevision: familySession.renderSession.getSnapshot().revision,
    issues: [],
  };
  wizard.publishRenderValidation(report);
  const publishedRevision = wizard.getSnapshot().revision;
  wizard.publishRenderValidation(report);
  assert(
    wizard.getSnapshot().revision === publishedRevision,
    "Publishing the same renderer validation twice must not create a React notification loop.",
  );
}
assert(
  wizard.getSnapshot().canContinue,
  "Every variant must receive a current sequential preview result before confirmation.",
);
const renamedFamily = structuredClone(wizard.getSnapshot().family!);
renamedFamily.title = "Renamed family";
renamedFamily.variants[0].title = "Renamed first variant";
wizard.replaceFamily(renamedFamily);
assert(
  renamedFamily.variants.every(
    (variant) => wizard.getSnapshot().renderValidation[variant.id]?.status === "ready",
  ) && wizard.getSnapshot().canContinue,
  "Changing only family presentation metadata must preserve current renderer evidence.",
);
const regroupedFamily = structuredClone(wizard.getSnapshot().family!);
regroupedFamily.variantGroups = [{
  id: "group:format",
  title: "Format",
  options: [
    { id: "option:square", title: "Square" },
    { id: "option:landscape", title: "Landscape" },
  ],
}];
regroupedFamily.variants[0].groupAssignments = { "group:format": "option:square" };
regroupedFamily.variants[1].groupAssignments = { "group:format": "option:landscape" };
wizard.replaceFamily(regroupedFamily);
assert(
  regroupedFamily.variants.every(
    (variant) => wizard.getSnapshot().renderValidation[variant.id]?.status === "ready",
  ),
  "Selection properties and tuple assignments must preserve unchanged per-variant renderer evidence.",
);
const changedRules = structuredClone(wizard.getSnapshot().family!);
changedRules.fields[0].rule = {
  ...changedRules.fields[0].rule,
  constraints: { ...changedRules.fields[0].rule.constraints, maxCharacters: 12 },
};
wizard.replaceFamily(changedRules);
assert(
  changedRules.variants.every(
    (variant) => wizard.getSnapshot().renderValidation[variant.id]?.status === "stale",
  ) && !wizard.getSnapshot().canContinue,
  "Changing shared field rules must invalidate renderer evidence before confirmation.",
);
for (const variant of changedRules.variants) {
  wizard.selectPreviewVariant(variant.id);
  wizard.publishRenderValidation({
    variantId: variant.id,
    status: "ready",
    sessionRevision: familySession.renderSession.getSnapshot().revision,
    issues: [],
  });
}
wizard.next();
const confirmation = await wizard.confirm();
assert(
  Object.isFrozen(confirmation) &&
    confirmation.family.variants.length === 2 &&
    await verifyTemplateFamilyImportConfirmation(confirmation),
  "Confirmation must freeze the family and verify every package plus the family-level digest.",
);
const historical = { ...structuredClone(confirmation), sdkVersion: "0.9.0" };
assert(await verifyTemplateFamilyImportConfirmation(historical), "Historical 0.9.0 Family confirmations remain accepted without rewriting their digests.");
assert(await verifyTemplateFamilyImportConfirmation({ ...historical, sdkVersion: "0.10.0" }), "Release metadata does not invalidate an otherwise supported confirmation schema and digest.");
assert(!await verifyTemplateFamilyImportConfirmation({ ...historical, sdkVersion: "" }), "A confirmation must identify its producing release.");
assert(confirmation.sdkVersion === "0.8.0", "New Family confirmations identify the actual SDK release.");
const tampered = structuredClone(confirmation);
tampered.family.title = "Tampered family";
assert(
  !(await verifyTemplateFamilyImportConfirmation(tampered)),
  "Changing family metadata after confirmation must invalidate the family digest.",
);
const reopenedFamilySession = createTemplateFamilySession({
  renderSession: createTemplateSessionWithDependencies(
    { repository, fontRegistry: null },
    {
      importZip: async () => readyImport("unused.zip"),
      createResolvedTree: createResolvedRenderTree,
      validate: validateTemplatePackage,
    },
  ),
  familyRepository: repository,
  templateRepository: repository,
});
const invalidLoad = await loadTemplateFamilyImportConfirmation(
  reopenedFamilySession,
  tampered,
);
assert(
  !invalidLoad.applied &&
    !invalidLoad.integrityValid &&
    reopenedFamilySession.getSnapshot().status === "idle",
  "A tampered family confirmation must fail before changing a fresh session.",
);
const validLoad = await loadTemplateFamilyImportConfirmation(
  reopenedFamilySession,
  confirmation,
);
assert(
  validLoad.applied && validLoad.integrityValid &&
    reopenedFamilySession.getSnapshot().status === "ready",
  "A verified family confirmation must reopen atomically in a fresh family session.",
);
reopenedFamilySession.dispose();
wizard.dispose();
