import fixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {createTemplateFieldContentStateV1, materializeTemplateFieldContentV2, normalizeTemplatePackageBundleTemplate, normalizeTemplatePackageV1ToV2, normalizeColorInputV1, parseTemplatePackageV2, reconcileEditableFieldOrderV2, setTemplateFieldValueV2, validateTemplateFieldContentStateV1, validateTemplatePackageV2} from "../src";
import {migrateTemplateFieldContentStateV2ToV2_1, migrateTemplatePackageV2ToV2_1} from "./legacyEntry";
import { resolveTemplateFamilyConfigurationV2 } from "../src/family";
import type { TemplatePackageV1, TemplatePackageV2 } from "../src";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sourcePackage(): TemplatePackageV1 {
  return structuredClone(fixture as unknown as TemplatePackageV1);
}

const normalized = normalizeTemplatePackageV1ToV2(sourcePackage());
assert(normalized.package, "A valid V1 field descriptor should normalize to V2.");
assert(
  normalizeColorInputV1("#F64") === "#ff6644" &&
    normalizeColorInputV1("#FF6644") === "#ff6644" &&
    normalizeColorInputV1("#ff6644cc") === null,
  "Color input normalization should accept only opaque shorthand/full hex and return canonical lowercase RGB.",
);
assert(
  normalized.package.schemaVersion === "2.2" &&
    normalized.package.editableFields[0]?.type === "textarea" &&
    normalized.package.editableFields[0]?.binding.kind === "text-characters" &&
    normalized.package.editableFieldOrder.join(",") === "textarea:headline",
  "V1 normalization should publish typed fields and deterministic editor order.",
);
assert(
  validateTemplatePackageV2(normalized.package).valid,
  "The normalized package must pass the strict V2 schema and semantic contract.",
);

const nestedBooleanSource = sourcePackage();
nestedBooleanSource.editableFields = [{
  id: "cta",
  type: "boolean",
  nodeId: "58:56",
  property: "visible",
  label: "CTA",
  defaultValue: true,
}];
nestedBooleanSource.nodes["58:56"].name = "field:boolean:cta";
nestedBooleanSource.nodes["58:57"].name = "field:text:cta";
nestedBooleanSource.nodes["58:60"].name = "Headline";
const nestedBooleanRaw = structuredClone(nestedBooleanSource);
const nestedBoolean = normalizeTemplatePackageV1ToV2(nestedBooleanSource);
assert(nestedBoolean.package, "A Boolean container and one same-ID nested field should normalize together.");
assert(
  nestedBoolean.package.editableFieldOrder.join(",") === "boolean:cta,text:cta" &&
    nestedBoolean.package.editableFields[0]?.id === "boolean:cta" &&
    nestedBoolean.package.editableFields[0]?.label === "CTA" &&
    nestedBoolean.package.editableFields[1]?.id === "text:cta" &&
    nestedBoolean.diagnostics.some((item) =>
      item.code === "FIELD_ID_TYPE_QUALIFIED" &&
      item.details?.canonicalFieldId === "boolean:cta"
    ),
  "Nested Boolean normalization should type-qualify both fields, preserve editor order, and record provenance.",
);
assert(
  JSON.stringify(nestedBooleanSource) === JSON.stringify(nestedBooleanRaw) &&
    nestedBoolean.package.editableFields[0]?.provenance?.sourceField?.id === "cta",
  "Nested Boolean normalization must not mutate raw V1 evidence and must retain the source field ID in provenance.",
);
const nestedInitial = createTemplateFieldContentStateV1(nestedBoolean.package);
const nestedHidden = setTemplateFieldValueV2(
  nestedBoolean.package,
  nestedInitial,
  "boolean:cta",
  false,
);
assert(
  nestedHidden.accepted,
  "A disabled Boolean container should remain valid canonical content.",
);

const nestedCollisionSource = structuredClone(nestedBooleanSource);
nestedCollisionSource.editableFields.push({
  id: "ctaVisibility",
  type: "text",
  nodeId: "58:60",
  property: "text.characters",
  defaultValue: nestedCollisionSource.nodes["58:60"].type === "TEXT" && "characters" in nestedCollisionSource.nodes["58:60"].text
    ? nestedCollisionSource.nodes["58:60"].text.characters
    : "",
});
const nestedCollision = normalizeTemplatePackageV1ToV2(nestedCollisionSource);
assert(
  nestedCollision.package?.editableFields.some((field) => field.id === "text:ctaVisibility"),
  "An unrelated source name remains valid after type qualification.",
);

const repeatedBooleanSource = sourcePackage();
const sourceText = (nodeId: string): string => {
  const node = repeatedBooleanSource.nodes[nodeId];
  return node.type === "TEXT" && "characters" in node.text ? node.text.characters : "";
};
repeatedBooleanSource.editableFields = [
  { id: "carVis", type: "boolean", nodeId: "58:56", property: "visible", label: "Cars", defaultValue: true },
  { id: "top", type: "text", nodeId: "58:57", property: "text.characters", defaultValue: sourceText("58:57") },
  { id: "bottom", type: "textarea", nodeId: "58:60", property: "text.characters", defaultValue: sourceText("58:60") },
];
repeatedBooleanSource.nodes["58:56"].name = "field:boolean:carVis";
repeatedBooleanSource.nodes["58:58"].name = "field:boolean:carVis";
repeatedBooleanSource.nodes["58:57"].name = "field:text:top";
repeatedBooleanSource.nodes["58:60"].name = "field:textarea:bottom";
const repeatedBoolean = normalizeTemplatePackageV1ToV2(repeatedBooleanSource);
assert(repeatedBoolean.package, "Repeated same-ID Boolean markers with matching defaults should normalize to one field.");
const repeatedToggle = repeatedBoolean.package.editableFields.find((field) => field.id === "boolean:carVis");
assert(
  repeatedToggle?.type === "boolean" &&
    repeatedToggle.binding.nodeId === "58:56" &&
    repeatedToggle.binding.additionalNodeIds?.join(",") === "58:58" &&
    repeatedBoolean.diagnostics.some((item) => item.code === "BOOLEAN_VISIBILITY_TARGETS_MERGED"),
  "Repeated Boolean markers should retain one canonical value and preserve every structural target.",
);
const repeatedHidden = setTemplateFieldValueV2(
  repeatedBoolean.package,
  createTemplateFieldContentStateV1(repeatedBoolean.package),
  "boolean:carVis",
  false,
);
const repeatedMaterialized = materializeTemplateFieldContentV2(repeatedBoolean.package, repeatedHidden.state);
const unchangedRepeatedSiblingIds = Object.keys(repeatedBoolean.package.nodes).filter(
  (nodeId) => nodeId !== "58:56" && nodeId !== "58:58",
);
assert(
  repeatedHidden.accepted &&
    repeatedMaterialized.workingPackage?.nodes["58:56"].appearance.visible === false &&
    repeatedMaterialized.workingPackage.nodes["58:58"].appearance.visible === false &&
    unchangedRepeatedSiblingIds.every((nodeId) =>
      repeatedMaterialized.workingPackage!.nodes[nodeId].appearance.visible ===
        repeatedBoolean.package!.nodes[nodeId].appearance.visible
    ),
  "One repeated Boolean control should materialize visibility only to its exact target groups and leave every sibling unchanged.",
);

const explicitRepeatedBooleanSource = structuredClone(repeatedBooleanSource);
explicitRepeatedBooleanSource.editableFields.splice(1, 0, {
  id: "carVis",
  type: "boolean",
  nodeId: "58:58",
  property: "visible",
  label: "Cars",
  defaultValue: true,
});
const explicitRepeatedBundle = normalizeTemplatePackageBundleTemplate(explicitRepeatedBooleanSource);
const explicitRepeatedNormalized = explicitRepeatedBundle.normalizedTemplateJson as TemplatePackageV1;
assert(
  explicitRepeatedBooleanSource.editableFields.filter((field) => field.id === "carVis").length === 2 &&
    explicitRepeatedNormalized.editableFields.filter((field) => field.id === "boolean:carVis").length === 1,
  "Bundle preparation should preserve raw repeated descriptors while retaining one V1 primary for strict parsing.",
);
const explicitRepeatedV2 = normalizeTemplatePackageV1ToV2(explicitRepeatedNormalized);
const explicitRepeatedToggle = explicitRepeatedV2.package?.editableFields.find((field) => field.id === "boolean:carVis");
assert(
  explicitRepeatedToggle?.type === "boolean" && explicitRepeatedToggle.binding.additionalNodeIds?.[0] === "58:58",
  "Explicit repeated Boolean descriptors should reach the same canonical multi-target binding as marker-only source.",
);

const conflictingRepeatedBooleanSource = structuredClone(explicitRepeatedBooleanSource);
conflictingRepeatedBooleanSource.editableFields[1].defaultValue = false;
const conflictingRepeatedBundle = normalizeTemplatePackageBundleTemplate(conflictingRepeatedBooleanSource).normalizedTemplateJson as TemplatePackageV1;
assert(
  conflictingRepeatedBundle.editableFields.filter((field) => field.id === "boolean:carVis").length === 2 &&
    !normalizeTemplatePackageV1ToV2(conflictingRepeatedBundle).package,
  "Conflicting repeated Boolean defaults must remain blocked.",
);

const legacyVisibilityPackage = structuredClone(nestedBoolean.package) as any;
legacyVisibilityPackage.schemaVersion = "2.0";
legacyVisibilityPackage.editableFields[0].id = "ctaVisibility";
legacyVisibilityPackage.editableFields[0].provenance.normalization.push("nested-boolean-container-id-to-visibility-id-v2");
legacyVisibilityPackage.editableFields[0].provenance.sourceField.id = "cta";
legacyVisibilityPackage.editableFields[1].id = "cta";
legacyVisibilityPackage.editableFieldOrder = ["ctaVisibility", "cta"];
const migratedVisibility = migrateTemplatePackageV2ToV2_1(legacyVisibilityPackage);
assert(
  migratedVisibility.package?.editableFieldOrder.join(",") === "boolean:cta,text:cta" &&
    migratedVisibility.fieldIdMap.ctaVisibility === "boolean:cta" &&
    migratedVisibility.fieldIdMap.cta === "text:cta",
  "Schema 2.0 migration should recover the original name from Visibility-normalization provenance.",
);
const migratedVisibilityContent = migrateTemplateFieldContentStateV2ToV2_1({
  schemaVersion: "template-field-content-v1",
  packageId: legacyVisibilityPackage.packageId,
  packageSchemaVersion: "2.0",
  revision: 7,
  values: { ctaVisibility: { value: false }, cta: { value: "Keep me" } },
}, migratedVisibility.fieldIdMap);
assert(
  migratedVisibilityContent.packageSchemaVersion === "2.2" && migratedVisibilityContent.revision === 7 &&
    migratedVisibilityContent.values["boolean:cta"]?.value === false &&
    migratedVisibilityContent.values["text:cta"]?.value === "Keep me",
  "Content migration should preserve revision and values while remapping canonical keys atomically.",
);

const formattedNumberSource = sourcePackage();
const formattedNumberNode = Object.values(formattedNumberSource.nodes).find((node) => node.type === "TEXT");
assert(formattedNumberNode?.type === "TEXT" && "characters" in formattedNumberNode.text, "Number source test requires a TEXT characters node.");
formattedNumberNode.name = "discount-value";
formattedNumberNode.text.characters = "Up to 40.00% off";
formattedNumberSource.editableFields = [{
  id: "discount",
  type: "number",
  nodeId: formattedNumberNode.id,
  property: "text.characters",
  defaultValue: "Up to 40.00% off",
}];
const sourceNormalizedNumber = normalizeTemplatePackageBundleTemplate(formattedNumberSource).normalizedTemplateJson as TemplatePackageV1;
const normalizedNumber = normalizeTemplatePackageV1ToV2(sourceNormalizedNumber);
assert(normalizedNumber.package, "A source-normalized formatted Number should become a strict V2 package.");
const numberField = normalizedNumber.package.editableFields[0];
assert(
  numberField?.type === "number" &&
    numberField.defaultValue === 40 &&
    numberField.configuration.format?.prefix === "Up to " &&
    numberField.configuration.format?.suffix === "% off" &&
    numberField.configuration.format?.decimalPlaces === 2,
  "V2 normalization should retain canonical numeric authority and inferred display formatting.",
);
const materializedNumber = materializeTemplateFieldContentV2(
  normalizedNumber.package,
  createTemplateFieldContentStateV1(normalizedNumber.package),
);
const materializedNumberNode = materializedNumber.workingPackage?.nodes[formattedNumberNode.id];
assert(
  materializedNumberNode?.type === "TEXT" &&
    "characters" in materializedNumberNode.text &&
    materializedNumberNode.text.characters === "Up to 40.00% off",
  "Initial Number materialization should reproduce the imported displayed text.",
);
const directNumber = normalizeTemplatePackageV1ToV2(formattedNumberSource);
assert(
  directNumber.package?.editableFields[0]?.type === "number" &&
    directNumber.package.editableFields[0].defaultValue === 40,
  "Direct V1 JSON normalization should accept the same unambiguous displayed Number default.",
);
const markerNumberSource = structuredClone(formattedNumberSource);
markerNumberSource.editableFields = [];
markerNumberSource.nodes[formattedNumberNode.id].name = "field:number:discount";
const markerNumber = normalizeTemplatePackageV1ToV2(markerNumberSource);
assert(
  markerNumber.package?.editableFields[0]?.type === "number" &&
    markerNumber.package.editableFields[0].defaultValue === 40 &&
    markerNumber.package.editableFields[0].configuration.format?.prefix === "Up to ",
  "Marker-only Number fields should share displayed-default normalization and formatting.",
);

const formattedDateSource = sourcePackage();
const formattedDateNode = Object.values(formattedDateSource.nodes).find((node) => node.type === "TEXT");
assert(formattedDateNode?.type === "TEXT" && "characters" in formattedDateNode.text, "Date source test requires a TEXT characters node.");
formattedDateSource.source = { ...formattedDateSource.source, exportedAt: "2026-09-14T10:14:11.956Z" };
formattedDateNode.name = "end-date";
formattedDateNode.text.characters = "Ends 04/16";
formattedDateSource.editableFields = [{
  id: "endDate",
  type: "date",
  nodeId: formattedDateNode.id,
  property: "text.characters",
  defaultValue: "Ends 04/16",
}];
const dateBundleResult = normalizeTemplatePackageBundleTemplate(formattedDateSource);
const sourceNormalizedDate = dateBundleResult.normalizedTemplateJson as TemplatePackageV1;
const normalizedDateSourceField = sourceNormalizedDate.editableFields[0];
const normalizedDateSourceFormat = normalizedDateSourceField.format as Record<string, unknown> | undefined;
assert(
  formattedDateSource.editableFields[0].defaultValue === "Ends 04/16" &&
    normalizedDateSourceField.defaultValue === "2026-04-16" &&
    normalizedDateSourceFormat?.prefix === "Ends " &&
    normalizedDateSourceFormat?.preset === "numeric-month-day" &&
    normalizedDateSourceFormat?.separator === "/" &&
    dateBundleResult.diagnostics.some((item) =>
      item.code === "DATE_FIELD_DEFAULT_NORMALIZED" &&
      item.details?.inferredYear === 2026 &&
      item.details?.inferredYearSource === "package.source.exportedAt"
    ),
  "Bundle normalization should preserve raw displayed Date source while deriving canonical content, format and deterministic export-year provenance.",
);
const normalizedDate = normalizeTemplatePackageV1ToV2(sourceNormalizedDate);
const dateField = normalizedDate.package?.editableFields[0];
assert(
  dateField?.type === "date" &&
    dateField.defaultValue === "2026-04-16" &&
    dateField.configuration.format?.prefix === "Ends " &&
    dateField.configuration.format?.preset === "numeric-month-day",
  "A source-normalized formatted Date should become a strict V2 canonical date with editable display formatting.",
);
const directDate = normalizeTemplatePackageV1ToV2(formattedDateSource);
assert(
  directDate.package?.editableFields[0]?.type === "date" &&
    directDate.package.editableFields[0].defaultValue === "2026-04-16" &&
    directDate.package.editableFields[0].configuration.format?.prefix === "Ends ",
  "Direct V1 JSON normalization should share displayed Date parsing and deterministic export-year inference.",
);
const materializedDate = normalizedDate.package
  ? materializeTemplateFieldContentV2(
      normalizedDate.package,
      createTemplateFieldContentStateV1(normalizedDate.package),
    )
  : null;
const materializedDateNode = materializedDate?.workingPackage?.nodes[formattedDateNode.id];
assert(
  materializedDateNode?.type === "TEXT" &&
    "characters" in materializedDateNode.text &&
    materializedDateNode.text.characters === "Ends 04/16",
  "Initial Date materialization should reproduce the imported prefix and yearless month/day display.",
);

for (const [display, canonical, preset, separator] of [
  ["16/04/2026", "2026-04-16", "numeric-day-first", "/"],
  ["04-16-2026", "2026-04-16", "numeric-month-first", "-"],
  ["2026.04.16", "2026-04-16", "numeric-year-first", "."],
  ["16/04 UTC", "2026-04-16", "numeric-day-month", "/"],
] as const) {
  const candidate = structuredClone(formattedDateSource);
  const node = candidate.nodes[formattedDateNode.id];
  assert(node.type === "TEXT" && "characters" in node.text, "Date format case requires a TEXT node.");
  node.text.characters = display;
  candidate.editableFields[0].defaultValue = display;
  const result = normalizeTemplatePackageBundleTemplate(candidate).normalizedTemplateJson as TemplatePackageV1;
  const resultFormat = result.editableFields[0].format as Record<string, unknown> | undefined;
  assert(
    result.editableFields[0].defaultValue === canonical &&
      resultFormat?.preset === preset &&
      resultFormat?.separator === separator,
    `Common displayed Date format ${display} should normalize deterministically.`,
  );
}

const ambiguousDate = structuredClone(formattedDateSource);
const ambiguousDateNode = ambiguousDate.nodes[formattedDateNode.id];
assert(ambiguousDateNode.type === "TEXT" && "characters" in ambiguousDateNode.text, "Ambiguous Date test requires a TEXT node.");
ambiguousDateNode.text.characters = "04/05/2026";
ambiguousDate.editableFields[0].defaultValue = "04/05/2026";
assert(
  (normalizeTemplatePackageBundleTemplate(ambiguousDate).normalizedTemplateJson as TemplatePackageV1).editableFields[0].defaultValue === "04/05/2026" &&
    !normalizeTemplatePackageV1ToV2(ambiguousDate).package,
  "Ambiguous day/month source dates must remain blocked without an explicit format.",
);
ambiguousDate.editableFields[0].format = { preset: "numeric-month-first", prefix: "Due " };
const explicitDate = normalizeTemplatePackageBundleTemplate(ambiguousDate).normalizedTemplateJson as TemplatePackageV1;
assert(
  explicitDate.editableFields[0].defaultValue === "2026-04-05" &&
    explicitDate.editableFields[0].format?.prefix === "Due ",
  "Explicit exporter Date formatting should resolve ambiguous order and override inferred presentation properties.",
);

const missingDateYear = structuredClone(formattedDateSource);
delete missingDateYear.source?.exportedAt;
assert(
  (normalizeTemplatePackageBundleTemplate(missingDateYear).normalizedTemplateJson as TemplatePackageV1).editableFields[0].defaultValue === "Ends 04/16",
  "Yearless displayed Dates must remain blocked when deterministic export-year evidence is unavailable.",
);
for (const unsupportedDisplay of ["Ends 02/30/2026", "04/16/2026 – 05/17/2026"]) {
  const unsupported = structuredClone(formattedDateSource);
  const node = unsupported.nodes[formattedDateNode.id];
  assert(node.type === "TEXT" && "characters" in node.text, "Rejected Date case requires a TEXT node.");
  node.text.characters = unsupportedDisplay;
  unsupported.editableFields[0].defaultValue = unsupportedDisplay;
  assert(
    (normalizeTemplatePackageBundleTemplate(unsupported).normalizedTemplateJson as TemplatePackageV1).editableFields[0].defaultValue === unsupportedDisplay,
    `Invalid or multiple displayed Date tokens must remain blocked: ${unsupportedDisplay}`,
  );
}

const markerColor = sourcePackage();
markerColor.nodes[markerColor.rootNodeId].name = "field:color:background";
const colorResult = normalizeTemplatePackageV1ToV2(markerColor);
assert(colorResult.package, "A marker with exactly one SOLID fill should normalize.");
const color = colorResult.package.editableFields.find((field) => field.id === "color:background");
assert(
  color?.type === "color" &&
    color.binding.kind === "solid-fill-color" &&
    color.binding.sourceIndex === 0 &&
    /^#[0-9a-f]{6}$/u.test(color.defaultValue),
  "Color normalization must freeze an exact opaque SOLID binding at import time.",
);

const genericDescriptorColor = sourcePackage();
genericDescriptorColor.editableFields.push({
  id: "background",
  type: "color",
  nodeId: genericDescriptorColor.rootNodeId,
  property: "appearance.fills",
  defaultValue: "#171717",
});
const genericDescriptorResult = normalizeTemplatePackageV1ToV2(genericDescriptorColor);
assert(
  genericDescriptorResult.package?.editableFields.some((field) =>
    field.type === "color" && field.binding.sourceIndex === 0
  ),
  "The source boundary should resolve a generic legacy Color descriptor when exactly one SOLID target exists.",
);

const rawGenericDescriptorColor = structuredClone(genericDescriptorColor);
const bundleColorResult = normalizeTemplatePackageBundleTemplate(rawGenericDescriptorColor);
const bundleNormalizedColor = bundleColorResult.normalizedTemplateJson as TemplatePackageV1;
const bundleNormalizedField = bundleNormalizedColor.editableFields.find((field) => field.id === "color:background");
assert(
  rawGenericDescriptorColor.editableFields.find((field) => field.id === "background")?.property === "appearance.fills" &&
    bundleNormalizedField?.property === "appearance.fills.0.color" &&
    bundleColorResult.diagnostics.some((item) =>
      item.code === "COLOR_FIELD_BINDING_NORMALIZED" &&
      item.details?.originalProperty === "appearance.fills" &&
      item.details?.resolvedProperty === "appearance.fills.0.color" &&
      item.details?.sourceIndex === 0
    ),
  "Bundle normalization should freeze a generic Color descriptor to one exact SOLID source index without mutating raw source.",
);

for (const nodeType of ["FRAME", "RECTANGLE", "TEXT", "VECTOR", "ELLIPSE", "LINE", "POLYGON", "STAR"] as const) {
  const supported = structuredClone(genericDescriptorColor);
  supported.nodes[supported.rootNodeId].type = nodeType;
  const result = normalizeTemplatePackageBundleTemplate(supported).normalizedTemplateJson as TemplatePackageV1;
  assert(
    result.editableFields.find((field) => field.id === "color:background")?.property === "appearance.fills.0.color",
    `Generic Color source normalization should support ${nodeType} nodes that accept exact fill-color bindings.`,
  );
}

const exactDescriptorColor = structuredClone(genericDescriptorColor);
exactDescriptorColor.editableFields.find((field) => field.id === "background")!.property = "appearance.fills.0.color";
const exactBundleColor = normalizeTemplatePackageBundleTemplate(exactDescriptorColor);
assert(
  (exactBundleColor.normalizedTemplateJson as TemplatePackageV1).editableFields.find((field) => field.id === "color:background")?.property === "appearance.fills.0.color" &&
    !exactBundleColor.diagnostics.some((item) => item.code === "COLOR_FIELD_BINDING_NORMALIZED"),
  "An already exact Color binding should remain unchanged without a compatibility diagnostic.",
);

const indexedGenericColor = structuredClone(genericDescriptorColor);
const imagePaint = sourcePackage().nodes["58:61"].appearance.fills.find((paint) => paint.type === "IMAGE");
assert(imagePaint, "Indexed Color normalization requires a non-SOLID paint fixture.");
indexedGenericColor.nodes[indexedGenericColor.rootNodeId].appearance.fills.unshift(structuredClone(imagePaint));
const indexedBundleColor = normalizeTemplatePackageBundleTemplate(indexedGenericColor).normalizedTemplateJson as TemplatePackageV1;
assert(
  indexedBundleColor.editableFields.find((field) => field.id === "color:background")?.property === "appearance.fills.1.color",
  "Generic Color normalization must preserve the eligible SOLID paint's source index when other paint types exist.",
);

const unsupportedGenericColor = structuredClone(genericDescriptorColor);
unsupportedGenericColor.nodes[unsupportedGenericColor.rootNodeId].type = "GROUP";
assert(
  (normalizeTemplatePackageBundleTemplate(unsupportedGenericColor).normalizedTemplateJson as TemplatePackageV1)
    .editableFields.find((field) => field.id === "color:background")?.property === "appearance.fills",
  "Generic Color bindings on node types without exact fill-color support must remain unresolved.",
);

const missingGenericColor = structuredClone(genericDescriptorColor);
missingGenericColor.nodes[missingGenericColor.rootNodeId].appearance.fills = [];
assert(
  (normalizeTemplatePackageBundleTemplate(missingGenericColor).normalizedTemplateJson as TemplatePackageV1)
    .editableFields.find((field) => field.id === "color:background")?.property === "appearance.fills",
  "Generic Color bindings without a SOLID target must remain unresolved.",
);

const maskedGenericColor = structuredClone(genericDescriptorColor);
const maskedNodeId = "70:73";
maskedGenericColor.editableFields.find((field) => field.id === "background")!.nodeId = maskedNodeId;
maskedGenericColor.nodes[maskedNodeId].mask = { isMask: true, maskType: "ALPHA" };
maskedGenericColor.maskRelationships = [{
  maskSourceId: maskedNodeId,
  affectedSiblingIds: ["58:61"],
  parentId: maskedGenericColor.nodes[maskedNodeId].parentId!,
  scopeTerminationReason: "next_mask",
}];
const maskedBundleColor = normalizeTemplatePackageBundleTemplate(maskedGenericColor).normalizedTemplateJson as TemplatePackageV1;
assert(
  maskedBundleColor.editableFields.find((field) => field.id === "color:background")?.property === "appearance.fills" &&
    normalizeTemplatePackageV1ToV2(maskedGenericColor).diagnostics.some((item) => item.code === "field-v2.color-binding-mask-source"),
  "Declared mask-source RGB must not become an editable visible Color binding at either source boundary.",
);

const ambiguousColor = sourcePackage();
ambiguousColor.nodes[ambiguousColor.rootNodeId].name = "field:color:background";
ambiguousColor.nodes[ambiguousColor.rootNodeId].appearance.fills.push(
  structuredClone(ambiguousColor.nodes[ambiguousColor.rootNodeId].appearance.fills[0]),
);
const ambiguousResult = normalizeTemplatePackageV1ToV2(ambiguousColor);
assert(
  !ambiguousResult.package &&
    ambiguousResult.diagnostics.some((item) => item.code === "field-v2.color-binding-ambiguous"),
  "Marker-only multi-fill Color targets must block at source normalization.",
);
const ambiguousDescriptorColor = structuredClone(genericDescriptorColor);
ambiguousDescriptorColor.nodes[ambiguousDescriptorColor.rootNodeId].appearance.fills.push(
  structuredClone(ambiguousDescriptorColor.nodes[ambiguousDescriptorColor.rootNodeId].appearance.fills[0]),
);
const ambiguousBundleColor = normalizeTemplatePackageBundleTemplate(ambiguousDescriptorColor).normalizedTemplateJson as TemplatePackageV1;
assert(
  ambiguousBundleColor.editableFields.find((field) => field.id === "color:background")?.property === "appearance.fills",
  "Generic Color descriptors with multiple SOLID candidates must remain unresolved for strict validation.",
);

const legacyCrop = sourcePackage();
legacyCrop.editableFields.push({
  id: "heroImage",
  type: "image",
  nodeId: "58:61",
  property: "image.assetId",
  defaultValue: legacyCrop.nodes["58:61"].image?.assetId ?? null,
  constraints: { replacementMode: "preserve-original-crop" },
});
const legacyCropResult = normalizeTemplatePackageV1ToV2(legacyCrop);
assert(
  !legacyCropResult.package &&
    legacyCropResult.diagnostics.some((item) => item.code === "field-v2.preserve-imported-crop-unsupported"),
  "V2 normalization must not preserve an imported crop for replacement media.",
);

const invalidOrder = structuredClone(normalized.package) as TemplatePackageV2;
invalidOrder.editableFieldOrder = ["text:unknown"];
const invalidOrderValidation = validateTemplatePackageV2(invalidOrder);
assert(
  !invalidOrderValidation.valid &&
    invalidOrderValidation.diagnostics.some((item) => item.code === "field-order.unknown-id") &&
    invalidOrderValidation.diagnostics.some((item) => item.code === "field-order.omitted-id"),
  "V2 field order must be an exact permutation of editable field IDs.",
);

const choices = structuredClone(normalized.package) as TemplatePackageV2;
const textarea = choices.editableFields[0];
assert(textarea?.type === "textarea", "The fixture field should remain a Textarea.");
textarea.configuration.choices = {
  mode: "restricted",
  options: [
    { id: "primary", value: "One" },
    { id: "primary", value: "Two" },
    { id: "third", value: "One" },
  ],
};
const choiceValidation = validateTemplatePackageV2(choices);
assert(
  !choiceValidation.valid &&
    choiceValidation.diagnostics.some((item) => item.code === "field-v2.choice-id-duplicate") &&
    choiceValidation.diagnostics.some((item) => item.code === "field-v2.choice-value-duplicate"),
  "Choice option IDs and normalized values must be unique within the field.",
);

const alphaColor = structuredClone(colorResult.package) as TemplatePackageV2;
const alphaField = alphaColor.editableFields.find((field) => field.type === "color");
assert(alphaField?.type === "color", "The Color field should be available.");
alphaField.defaultValue = "#ff6644cc";
assert(
  !validateTemplatePackageV2(alphaColor).schemaValid,
  "Initial V2 Color must reject alpha-bearing canonical values.",
);

const parsed = parseTemplatePackageV2(sourcePackage());
assert(
  parsed.package?.schemaVersion === "2.2" && parsed.sourceVersion === "1.0",
  "The explicit V2 source boundary should normalize valid V1 source exactly once.",
);

for (const legacyVersion of ["2.0", "2.1"] as const) {
  const legacyCanonical = structuredClone(normalized.package) as unknown as Record<string, unknown>;
  legacyCanonical.schemaVersion = legacyVersion;
  const rejected = parseTemplatePackageV2(legacyCanonical);
  assert(
    !rejected.package && rejected.diagnostics.some((item) => item.code === "version.unsupported"),
    `Canonical schema ${legacyVersion} must require reimport instead of silent migration.`,
  );
}

const obsoleteImagePolicy = structuredClone(normalized.package) as unknown as Record<string, unknown>;
const obsoleteFields = obsoleteImagePolicy.editableFields as Array<Record<string, unknown>>;
obsoleteFields.push({
  id: "image:legacy",
  type: "image",
  binding: { kind: "image-content", nodeId: "58:61" },
  defaultValue: { assetId: null, placement: { mode: "imported" } },
  configuration: { allowedPlacements: ["fill", "fit"], defaultReplacementPlacement: "fill" },
});
(obsoleteImagePolicy.editableFieldOrder as string[]).push("image:legacy");
assert(
  !validateTemplatePackageV2(obsoleteImagePolicy).schemaValid,
  "Schema 2.2 must reject the removed multi-placement Image configuration.",
);

const mismatchedTypedId = structuredClone(normalized.package) as TemplatePackageV2;
mismatchedTypedId.editableFields[0].id = "text:headline";
mismatchedTypedId.editableFieldOrder = ["text:headline"];
assert(
  !validateTemplatePackageV2(mismatchedTypedId).schemaValid,
  "A canonical field ID prefix must match its field discriminator.",
);

const repairedOrder = reconcileEditableFieldOrderV2(
  ["removed", "headline"],
  [{ id: "headline" }, { id: "heroImage" }],
);
assert(
  repairedOrder.order.join(",") === "headline,heroImage" &&
    repairedOrder.diagnostics.some((item) => item.code === "field-order.removed-id") &&
    repairedOrder.diagnostics.some((item) => item.code === "field-order.added-id"),
  "Reimport order repair should retain survivors, remove missing fields, and append new fields.",
);

const familyConfiguration = resolveTemplateFamilyConfigurationV2(
  {
    choices: {
      mode: "restricted" as const,
      options: [
        { id: "a", value: "A" },
        { id: "b", value: "B" },
        { id: "c", value: "C" },
      ],
    },
    replacementPlacement: "fill" as const,
    maxCharacters: 20,
  },
  {
    choices: {
      mode: "restricted",
      options: [
        { id: "a", value: "A" },
        { id: "d", value: "D" },
      ],
    },
    replacementPlacement: null,
  },
);
assert(
  familyConfiguration.configuration.choices.options.map((option) => option.id).join(",") === "a,d" &&
    familyConfiguration.configuration.replacementPlacement === undefined &&
    familyConfiguration.configuration.maxCharacters === 20,
  "Family collections must replace atomically, explicit null must clear, and omitted scalars must inherit.",
);

const contentStateValidation = validateTemplateFieldContentStateV1({
  schemaVersion: "template-field-content-v1",
  packageId: normalized.package.packageId,
  packageSchemaVersion: "2.2",
  revision: 3,
  values: {
    "textarea:headline": { value: "A canonical value", selectedChoiceId: "primary" },
  },
});
assert(contentStateValidation.valid, "Canonical content state should have its own valid serializable envelope.");
assert(
  !validateTemplateFieldContentStateV1({
    schemaVersion: "template-field-content-v1",
    packageId: normalized.package.packageId,
    packageSchemaVersion: "2.2",
    revision: -1,
    values: {},
  }).valid,
  "Content revisions must be non-negative integers.",
);

// Validation memoization is legal only for deeply immutable plain data.
{
  const freeze = <T,>(value: T): T => {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  const immutable = freeze(structuredClone(normalized.package!));
  const expected = validateTemplatePackageV2(structuredClone(immutable));
  const first = validateTemplatePackageV2(immutable);
  first.diagnostics.length = 0;
  first.valid = false;
  const again = validateTemplatePackageV2(immutable);
  assert(JSON.stringify(again) === JSON.stringify(expected), "Cached validation must preserve results and isolate caller mutations.");
  const shallow = Object.freeze(structuredClone(normalized.package!));
  assert(validateTemplatePackageV2(shallow).valid, "Shallow frozen source starts valid.");
  shallow.canvas.width = -1;
  assert(!validateTemplatePackageV2(shallow).valid, "A shallow freeze cannot hide nested mutations from validation.");
  const changed = structuredClone(immutable);
  changed.editableFieldOrder.push("text:missing");
  assert(!validateTemplatePackageV2(freeze(changed)).valid, "A new immutable configuration gets independent validation.");
  const mutable = structuredClone(immutable);
  assert(validateTemplatePackageV2(mutable).valid, "Mutable input remains supported.");
  mutable.canvas.width = -1;
  assert(!validateTemplatePackageV2(mutable).valid, "Repeated calls with the same mutable identity always revalidate.");
}
