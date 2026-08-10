import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  createTemplateFamilyFromPackage,
  getTemplateFamilyOptionAvailability,
  materializeTemplateFamilyVariant,
  parseTemplateFamilyContentStateV1,
  parseTemplateFamilyV1,
  planTemplateFamilyFieldMatches,
  resolveTemplateFamilyFieldRule,
  resolveTemplateFamilyVariant,
  updateTemplateFamilyContentField,
  validateTemplateFamily,
  wrapLegacyTemplatePackageAsFamily,
  type TemplateFamilyV1,
} from "../src/family";
import type { TemplatePackageV1 } from "../src/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fixture(): TemplatePackageV1 {
  return structuredClone(figmaPluginV041 as unknown as TemplatePackageV1);
}

const created = createTemplateFamilyFromPackage({
  familyId: "family:summer",
  familyTitle: "Summer Campaign",
  variantId: "variant:square-blue",
  variantTitle: "Square Blue",
  packageValue: fixture(),
  idFactory: (kind, seed) => `${kind}:${seed}`,
});

assert(
  created.family.fields.length === fixture().editableFields.length &&
    created.content.familyId === created.family.id,
  "The first package must seed stable shared fields, bindings, and content.",
);
assert(
  JSON.stringify(parseTemplateFamilyV1(JSON.parse(JSON.stringify(created.family)))) ===
      JSON.stringify(created.family) &&
    JSON.stringify(parseTemplateFamilyContentStateV1(JSON.parse(JSON.stringify(created.content)))) ===
      JSON.stringify(created.content),
  "Serializable family definitions and content must round-trip without identity changes.",
);

const headline = created.family.fields[0];
assert(headline, "The family fixture requires a shared headline field.");
headline.rule.constraints = { maxCharacters: 60 };
const unconstrainedMutation = updateTemplateFamilyContentField(
  created.family,
  created.content,
  headline.id,
  "This shared value remains intact even when a variant limit is lower",
);
const invalidTypeMutation = updateTemplateFamilyContentField(
  created.family,
  created.content,
  headline.id,
  { kind: "image", assetRef: "asset:not-text" },
);
assert(
  unconstrainedMutation.applied &&
    unconstrainedMutation.content.revision === created.content.revision + 1 &&
    unconstrainedMutation.content.values[headline.id] ===
      "This shared value remains intact even when a variant limit is lower" &&
    !invalidTypeMutation.applied &&
    invalidTypeMutation.content === created.content,
  "Portable family mutation must validate value types without enforcing a variant's input limit.",
);
const square = created.family.variants[0];
const landscape = structuredClone(square);
landscape.id = "variant:landscape-blue";
landscape.title = "Landscape Blue";
landscape.ruleOverrides[headline.id] = {
  constraints: { maxCharacters: 42 },
};
created.family.variants.push(landscape);
const directSelection = resolveTemplateFamilyVariant(created.family, {
  variantId: landscape.id,
  groupSelections: {},
});
assert(
  directSelection.status === "resolved" && directSelection.variantId === landscape.id,
  "A family without groups must resolve directly from its stable variant ID.",
);

const resolved = resolveTemplateFamilyFieldRule(
  headline.rule,
  landscape.ruleOverrides[headline.id],
);
assert(
  (resolved.rule.constraints as { maxCharacters?: number }).maxCharacters === 42 &&
    resolved.provenance.constraints.maxCharacters === "variant",
  "Variant rules must override a common property with explicit provenance.",
);
const cleared = resolveTemplateFamilyFieldRule(headline.rule, {
  constraints: { maxCharacters: null },
});
assert(
  (cleared.rule.constraints as { maxCharacters?: number } | undefined)
      ?.maxCharacters === undefined &&
    cleared.provenance.constraints.maxCharacters === "cleared",
  "An explicit null override must clear an inherited rule property.",
);

created.content.values[headline.id] = "This headline is deliberately longer than forty-two chars";
created.content.revision = 1;
const familyValidation = validateTemplateFamily(created.family, created.content);
assert(
  familyValidation.variants.find((item) => item.variantId === landscape.id)
      ?.issues.some((item) => item.code.includes("maximum-characters")) === true,
  "Family validation must retain a value and report the variant whose rule rejects it.",
);
assert(
  familyValidation.effectiveRules[landscape.id]?.[headline.id]
    ?.provenance.constraints.maxCharacters === "variant" &&
    familyValidation.effectiveRules[square.id]?.[headline.id]
      ?.provenance.constraints.maxCharacters === "family",
  "Family validation must publish property-level effective-rule provenance for every variant.",
);
const invalidRules = structuredClone(created.family);
invalidRules.variants[1].ruleOverrides[headline.id] = {
  constraints: { maxCharacters: -1 },
};
assert(
  !validateTemplateFamily(invalidRules, created.content).definitionValid,
  "Invalid common or variant rules must block family confirmation instead of reaching runtime materialization.",
);
const materialized = materializeTemplateFamilyVariant(
  created.family,
  landscape.id,
  created.content,
);
const target = landscape.bindings[0]?.targets[0];
const targetNode = target ? materialized.packageValue.nodes[target.nodeId] : null;
assert(
  targetNode?.type === "TEXT" &&
    "characters" in targetNode.text &&
    targetNode.text.characters === created.content.values[headline.id],
  "Materialization must not trim shared content to a variant rule.",
);

const imagePackage = fixture();
imagePackage.editableFields = [{
  id: "hero-image",
  type: "image",
  nodeId: "58:87",
  property: "image.assetId",
  defaultValue: "asset:image:fb18a9f8",
  label: "Hero image",
}];
const imageFamily = createTemplateFamilyFromPackage({
  familyId: "family:images",
  familyTitle: "Image family",
  variantId: "variant:image-a",
  variantTitle: "Image A",
  packageValue: imagePackage,
  idFactory: (kind, seed) => `${kind}:image:${seed}`,
});
const imageVariant = structuredClone(imageFamily.family.variants[0]);
imageVariant.id = "variant:image-b";
imageVariant.title = "Image B";
const localAsset = imageVariant.packageValue.assets["asset:image:fb18a9f8"];
assert(localAsset?.type === "image", "The image fixture requires an embedded image asset.");
delete imageVariant.packageValue.assets["asset:image:fb18a9f8"];
imageVariant.packageValue.assets["asset:image:variant-b"] = {
  ...localAsset,
  id: "asset:image:variant-b",
};
const imageNode = imageVariant.packageValue.nodes["58:87"];
if (imageNode?.image) imageNode.image.assetId = "asset:image:variant-b";
imageVariant.packageValue.editableFields[0].defaultValue = "asset:image:variant-b";
imageFamily.family.variants.push(imageVariant);
const sharedImageValue = imageFamily.content.values[imageFamily.family.fields[0].id];
assert(
  typeof sharedImageValue === "object" && sharedImageValue?.kind === "image",
  "Image defaults must use stable family asset references instead of package-local scalar IDs.",
);
const projectedImage = materializeTemplateFamilyVariant(
  imageFamily.family,
  imageVariant.id,
  imageFamily.content,
);
const projectedImageNode = projectedImage.packageValue.nodes["58:87"];
assert(
  projectedImageNode?.image?.assetId === sharedImageValue.assetRef &&
    projectedImage.packageValue.assets[sharedImageValue.assetRef]?.type === "image" &&
    projectedImage.packageValue.assets[sharedImageValue.assetRef]?.nodeId === "58:87",
  "A shared image must project into a variant whose imported package used a different local asset ID.",
);
const missingImageContent = structuredClone(imageFamily.content);
missingImageContent.values[imageFamily.family.fields[0].id] = {
  kind: "image",
  assetRef: "asset:image:missing-shared-reference",
};
assert(
  materializeTemplateFamilyVariant(
    imageFamily.family,
    imageVariant.id,
    missingImageContent,
  ).issues.some((issue) =>
    issue.code === "family.image-asset-missing" && issue.severity === "error"
  ),
  "A missing shared image reference must be an explicit materialization blocker instead of silently rendering old content.",
);

const matchPlan = planTemplateFamilyFieldMatches(created.family.fields, fixture());
assert(
  matchPlan.automaticBindings.length === created.family.fields.length &&
    matchPlan.candidates.every((candidate) => candidate.confidence === "exact"),
  "Exact compatible package field IDs must produce automatic bindings.",
);
assert(
  matchPlan.ruleDifferences.some((difference) =>
    difference.familyFieldId === headline.id &&
    difference.rulePath === "constraints.maxCharacters"
  ) && Boolean(matchPlan.suggestedRuleOverrides[headline.id]),
  "Imported rule differences must remain explicit setup suggestions instead of silently changing family authority.",
);

const grouped = structuredClone(created.family) as TemplateFamilyV1;
grouped.variantGroups = [
  {
    id: "group:format",
    title: "Format",
    options: [
      { id: "option:square", title: "Square" },
      { id: "option:landscape", title: "Landscape" },
    ],
  },
  {
    id: "group:colour",
    title: "Colour",
    options: [
      { id: "option:blue", title: "Blue" },
      { id: "option:red", title: "Red" },
    ],
  },
];
grouped.variants[0].groupAssignments = {
  "group:format": "option:square",
  "group:colour": "option:blue",
};
grouped.variants[1].groupAssignments = {
  "group:format": "option:landscape",
  "group:colour": "option:blue",
};
const selection = resolveTemplateFamilyVariant(grouped, {
  groupSelections: {
    "group:format": "option:landscape",
    "group:colour": "option:blue",
    "group:removed-host-state": "option:stale",
  },
});
assert(
  selection.status === "resolved" && selection.variantId === landscape.id,
  "A complete unique group tuple must resolve to one variant while ignoring stale host state for removed groups.",
);
const missingCombination = resolveTemplateFamilyVariant(grouped, {
  groupSelections: {
    "group:format": "option:square",
    "group:colour": "option:red",
  },
});
assert(
  missingCombination.status === "no-match" &&
    getTemplateFamilyOptionAvailability(grouped, {
      groupSelections: { "group:format": "option:square" },
    }).some((item) => item.optionId === "option:red" && !item.available),
  "Missing Cartesian combinations must remain valid and discoverable as unavailable.",
);
grouped.variants[1].groupAssignments = {
  ...grouped.variants[0].groupAssignments,
};
assert(
  validateTemplateFamily(grouped).issues.some(
    (item) => item.code === "family.group-tuple-duplicate",
  ),
  "Duplicate group tuples must block a confirmed family.",
);

const legacy = wrapLegacyTemplatePackageAsFamily({
  templateId: "legacy-template",
  title: "Legacy Template",
  sourcePackage: fixture(),
});
const legacyAgain = wrapLegacyTemplatePackageAsFamily({
  templateId: "legacy-template",
  title: "Legacy Template",
  sourcePackage: fixture(),
});
assert(
  legacy.family.id === "legacy-template" &&
    legacy.family.variants[0]?.id === legacyAgain.family.variants[0]?.id &&
    legacy.family.fields[0]?.id === legacyAgain.family.fields[0]?.id,
  "Legacy single-template wrapping must derive stable family, variant, and field identities.",
);
