import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {type TemplateFamilyV1} from "../src/family";
import {createTemplateFamilyFromPackage, getTemplateFamilyControlOrder, getTemplateFamilyFieldsForVariant, getTemplateFamilyFieldScope, getTemplateFamilyOptionAvailability, materializeTemplateFamilyVariant, parseTemplateFamilyContentStateV1, parseTemplateFamilyV1, planTemplateFamilyFieldMatches, resolveTemplateFamilyFieldRule, resolveTemplateFamilyVariant, setTemplateFamilyControlOrder, updateTemplateFamilyContentField, validateTemplateFamily, wrapLegacyTemplatePackageAsFamily} from "./legacyEntry";
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
for (const staleTupleValue of [
  {
    ...structuredClone(created.family),
    variants: created.family.variants.map(({ groupAssignments: _ignored, ...variant }) => variant),
  },
  {
    ...structuredClone(created.family),
    variantGroups: [{
      id: "group:stale",
      title: "Stale",
      variantIds: [created.family.variants[0]!.id],
    }],
  },
]) {
  let rejected = false;
  try {
    parseTemplateFamilyV1(staleTupleValue);
  } catch {
    rejected = true;
  }
  assert(rejected, "Template Family V1 must reject missing assignments and the unpublished collection shape.");
}

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

const scopeMatrixFamily = structuredClone(created.family);
const portrait = structuredClone(scopeMatrixFamily.variants[0]);
portrait.id = "variant:portrait-blue";
portrait.title = "Portrait Blue";
scopeMatrixFamily.variants.push(portrait);
const subsetField = scopeMatrixFamily.fields[1];
const specificField = scopeMatrixFamily.fields[2];
assert(subsetField && specificField, "The family fixture requires three editable fields.");
for (const [variant, field] of [
  [portrait, subsetField],
  [scopeMatrixFamily.variants[1], specificField],
  [portrait, specificField],
] as const) {
  const removedTargets = variant.bindings.find(
    (binding) => binding.familyFieldId === field.id,
  )?.targets ?? [];
  variant.bindings = variant.bindings.filter(
    (binding) => binding.familyFieldId !== field.id,
  );
  variant.packageValue.editableFields = variant.packageValue.editableFields.filter(
    (packageField) => !removedTargets.some(
      (removed) =>
        removed.fieldId === packageField.id &&
        removed.nodeId === packageField.nodeId &&
        removed.property === packageField.property,
    ),
  );
}
assert(
  getTemplateFamilyFieldScope(scopeMatrixFamily, headline.id).kind === "family-wide" &&
    getTemplateFamilyFieldScope(scopeMatrixFamily, subsetField.id).kind === "variant-subset" &&
    getTemplateFamilyFieldScope(scopeMatrixFamily, specificField.id).kind === "variant-specific" &&
    validateTemplateFamily(scopeMatrixFamily, created.content).definitionValid,
  "Fields bound to all, some, or one variant must all be structurally valid with derived scope metadata.",
);

const sparseFamily = structuredClone(created.family);
const sparseVariant = sparseFamily.variants[1];
sparseVariant.bindings = sparseVariant.bindings.filter(
  (binding) => binding.familyFieldId !== headline.id,
);
delete sparseVariant.ruleOverrides[headline.id];
sparseVariant.packageValue.editableFields =
  sparseVariant.packageValue.editableFields.filter(
    (field) => field.id !== target?.fieldId || field.nodeId !== target?.nodeId,
  );
const sparseReport = validateTemplateFamily(sparseFamily, created.content);
const sparseScope = getTemplateFamilyFieldScope(sparseFamily, headline.id);
const sparseMaterialized = materializeTemplateFamilyVariant(
  sparseFamily,
  sparseVariant.id,
  created.content,
);
assert(
  sparseReport.definitionValid &&
    sparseScope.kind === "variant-specific" &&
    sparseScope.variantIds[0] === square.id &&
    !getTemplateFamilyFieldsForVariant(sparseFamily, sparseVariant.id)
      .some((field) => field.id === headline.id) &&
    !sparseMaterialized.effectiveFields.some(
      (field) => field.id === target?.fieldId && field.nodeId === target?.nodeId,
    ) &&
    !sparseMaterialized.issues.some((issue) => issue.code === "family.binding-missing"),
  "A field bound to one variant must remain valid and disappear cleanly from other materializations.",
);
const orphanedFamily = structuredClone(sparseFamily);
orphanedFamily.variants[0].bindings = orphanedFamily.variants[0].bindings.filter(
  (binding) => binding.familyFieldId !== headline.id,
);
assert(
  getTemplateFamilyFieldScope(orphanedFamily, headline.id).kind === "unbound" &&
    validateTemplateFamily(orphanedFamily).issues.some(
      (issue) => issue.code === "family.field-unbound",
    ),
  "A family field that applies to no variant must remain a structural blocker.",
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
const redPortrait = structuredClone(grouped.variants[0]);
redPortrait.id = "variant:portrait-red";
redPortrait.title = "Red Portrait";
const redLandscape = structuredClone(grouped.variants[1]);
redLandscape.id = "variant:landscape-red";
redLandscape.title = "Red Landscape";
grouped.variants[0].title = "Blue Portrait";
grouped.variants[1].title = "Blue Landscape";
grouped.variants.push(redPortrait, redLandscape);
grouped.variantGroups = [
  {
    id: "group:dimension",
    title: "Dimension",
    options: [
      { id: "option:portrait", title: "Portrait" },
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
  "group:dimension": "option:portrait",
  "group:colour": "option:blue",
};
grouped.variants[1].groupAssignments = {
  "group:dimension": "option:landscape",
  "group:colour": "option:blue",
};
redPortrait.groupAssignments = {
  "group:dimension": "option:portrait",
  "group:colour": "option:red",
};
redLandscape.groupAssignments = {
  "group:dimension": "option:landscape",
  "group:colour": "option:red",
};
const expectedTuples = [
  ["option:blue", "option:portrait", grouped.variants[0].id],
  ["option:blue", "option:landscape", grouped.variants[1].id],
  ["option:red", "option:portrait", redPortrait.id],
  ["option:red", "option:landscape", redLandscape.id],
] as const;
assert(
  expectedTuples.every(([colour, dimension, variantId]) => {
    const selection = resolveTemplateFamilyVariant(grouped, {
      groupSelections: {
        "group:colour": colour,
        "group:dimension": dimension,
      },
    });
    return selection.status === "resolved" && selection.variantId === variantId;
  }),
  "Colour and Dimension tuples must resolve the intended concrete ZIP variants.",
);
const incompleteSelection = resolveTemplateFamilyVariant(grouped, {
  groupSelections: { "group:colour": "option:blue" },
});
assert(
  incompleteSelection.status === "incomplete" &&
    incompleteSelection.missingGroupIds.includes("group:dimension"),
  "A selection must remain incomplete until every configured property has a value.",
);
const availability = getTemplateFamilyOptionAvailability(grouped, {
  groupSelections: { "group:dimension": "option:landscape" },
});
assert(
  availability.find((item) => item.optionId === "option:red")?.available === true &&
    validateTemplateFamily(grouped).definitionValid,
  "Option availability must report combinations backed by a concrete variant.",
);
const missingCombinationFamily = structuredClone(grouped);
missingCombinationFamily.variants = missingCombinationFamily.variants.filter(
  (variant) => variant.id !== redLandscape.id,
);
assert(
  validateTemplateFamily(missingCombinationFamily).definitionValid &&
    resolveTemplateFamilyVariant(missingCombinationFamily, {
      groupSelections: {
        "group:dimension": "option:landscape",
        "group:colour": "option:red",
      },
    }).status === "no-match" &&
    getTemplateFamilyOptionAvailability(missingCombinationFamily, {
      groupSelections: { "group:dimension": "option:landscape" },
    }).find((option) => option.optionId === "option:red")?.available === false,
  "Missing Cartesian combinations must remain valid while resolving explicitly to no-match.",
);
const duplicateTupleFamily = structuredClone(grouped);
duplicateTupleFamily.variants.push({
  ...structuredClone(grouped.variants[0]),
  id: "variant:duplicate",
  title: "Duplicate tuple",
});
assert(
  validateTemplateFamily(duplicateTupleFamily).issues.some(
    (item) => item.code === "family.group-tuple-duplicate",
  ),
  "Two variants using the same complete property tuple must be blocked.",
);
const incompleteTupleFamily = structuredClone(grouped);
delete incompleteTupleFamily.variants[3].groupAssignments["group:colour"];
assert(
  validateTemplateFamily(incompleteTupleFamily).issues.some(
    (item) => item.code === "family.group-assignment-missing",
  ),
  "Every confirmed concrete variant must assign one option for every property.",
);
const renamedTupleFamily = structuredClone(grouped);
const colourId = renamedTupleFamily.variantGroups[1].id;
const redId = renamedTupleFamily.variantGroups[1].options[1].id;
const redVariantId = renamedTupleFamily.variants[2].id;
renamedTupleFamily.variantGroups[1].title = "Palette";
renamedTupleFamily.variantGroups[1].options[1].title = "Crimson";
renamedTupleFamily.variants[2].title = "Crimson Portrait";
assert(
  renamedTupleFamily.variantGroups[1].id === colourId &&
    renamedTupleFamily.variantGroups[1].options[1].id === redId &&
    renamedTupleFamily.variants[2].id === redVariantId &&
    resolveTemplateFamilyVariant(renamedTupleFamily, {
      groupSelections: {
        "group:colour": redId,
        "group:dimension": "option:portrait",
      },
    }).status === "resolved",
  "Renaming a property, option, or variant must preserve stable selection identities.",
);

const ordered = setTemplateFamilyControlOrder(grouped, [
  { kind: "selection-property", groupId: "group:colour" },
  { kind: "field", fieldId: grouped.fields[0].id },
  { kind: "selection-property", groupId: "group:dimension" },
  ...grouped.fields.slice(1).map((field) => ({ kind: "field" as const, fieldId: field.id })),
]);
assert(
  getTemplateFamilyControlOrder(ordered)[0]?.kind === "selection-property" &&
    getTemplateFamilyControlOrder(ordered)[1]?.kind === "field" &&
    validateTemplateFamily(ordered).definitionValid,
  "Selection properties and editable fields must share one stable editor order.",
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
