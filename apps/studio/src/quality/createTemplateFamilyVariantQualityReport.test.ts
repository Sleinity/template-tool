import figmaPluginV041 from "../../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  validateTemplatePackage,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {createTemplateFamilyFromPackage, validateTemplateFamily} from "../../../../packages/template-core/test/legacyEntry";
import { packageQualityIssueMatchesSearch } from "@sleinity/template-react/inspection";
import { createTemplateFamilyVariantQualityReport } from "./createTemplateFamilyVariantQualityReport";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packageValue = structuredClone(figmaPluginV041 as unknown as TemplatePackageV1);
packageValue.fontRequirements = [];
const created = createTemplateFamilyFromPackage({
  familyId: "family:quality",
  familyTitle: "Family quality",
  variantId: "variant:gray",
  variantTitle: "Gray",
  packageValue,
  idFactory: (kind, seed) => `${kind}:${seed}`,
});
const family = created.family;
const content = created.content;
const gray = family.variants[0];
const scopedField = family.fields.find(
  (field) => field.type === "text" || field.type === "textarea",
);
assert(scopedField, "The family quality fixture requires a text field.");
const scopedBinding = gray.bindings.find(
  (binding) => binding.familyFieldId === scopedField.id,
);
assert(scopedBinding?.targets[0], "The family quality fixture requires a bound text target.");
scopedField.rule.constraints = { maxCharacters: 1 };
content.values[scopedField.id] = "Variant-specific warning";

const pink = structuredClone(gray);
pink.id = "variant:pink";
pink.title = "Gray";
pink.bindings = pink.bindings.filter(
  (binding) => binding.familyFieldId !== scopedField.id,
);
const scopedTarget = scopedBinding.targets[0];
pink.packageValue.editableFields = pink.packageValue.editableFields.filter(
  (field) =>
    field.id !== scopedTarget.fieldId ||
    field.nodeId !== scopedTarget.nodeId ||
    field.property !== scopedTarget.property,
);
family.variants.push(pink);
family.title = "";

const familyValidation = validateTemplateFamily(family, content);
const grayQuality = createTemplateFamilyVariantQualityReport({
  family,
  familyValidation,
  variantId: gray.id,
  packageValue: gray.packageValue,
  validation: validateTemplatePackage(gray.packageValue),
  renderValidation: {
    variantId: gray.id,
    status: "warning",
    sessionRevision: 12,
    issues: [{
      code: "family-preview.variant-warning",
      severity: "warning",
      message: "Gray preview needs review.",
    }],
  },
});
const repeatedGrayQuality = createTemplateFamilyVariantQualityReport({
  family,
  familyValidation,
  variantId: gray.id,
  packageValue: gray.packageValue,
  validation: validateTemplatePackage(gray.packageValue),
});
const pinkQuality = createTemplateFamilyVariantQualityReport({
  family,
  familyValidation,
  variantId: pink.id,
  packageValue: pink.packageValue,
  validation: validateTemplatePackage(pink.packageValue),
});

const globalBlocker = grayQuality.issues.find(
  (issue) => issue.code === "family.title-missing",
);
assert(
  globalBlocker?.blocks.includes("create") && grayQuality.status === "blocked",
  "Family-wide structural findings must remain visible and block family creation without blocking package import.",
);
const scopedIssue = grayQuality.issues.find(
  (issue) => issue.details?.familyFieldId === scopedField.id,
);
assert(
  scopedIssue?.details?.fieldScope === "variant-specific" &&
    scopedIssue.details?.fieldScopeLabel === "Gray only" &&
    packageQualityIssueMatchesSearch(scopedIssue, scopedField.title) &&
    packageQualityIssueMatchesSearch(scopedIssue, "Gray"),
  "Selected-variant diagnostics must retain searchable family-field, scope and variant evidence.",
);
assert(
  !grayQuality.issues.some(
    (issue) =>
      issue.code === "family.variant-title-duplicate" &&
      issue.details?.variantId === pink.id,
  ) &&
    pinkQuality.issues.some(
      (issue) =>
        issue.code === "family.variant-title-duplicate" &&
        issue.details?.variantId === pink.id,
    ),
  "A variant report must exclude findings owned only by another variant.",
);
assert(
  grayQuality.issues.some((issue) => issue.code === "family-preview.variant-warning"),
  "Current renderer findings must join the selected variant quality report.",
);
assert(
  globalBlocker?.id === repeatedGrayQuality.issues.find(
    (issue) => issue.code === "family.title-missing",
  )?.id,
  "Family quality issue identities must remain stable across equivalent projections.",
);
