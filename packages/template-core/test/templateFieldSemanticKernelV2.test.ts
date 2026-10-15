import fixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  countTemplateFieldGraphemesV1,
  createTemplateFieldContentStateV1,
  formatTemplateCalendarDateV1,
  formatTemplateNumberV1,
  getOrderedHostEditableFieldsV2,
  materializeTemplateFieldContentV2,
  normalizeTemplatePackageV1ToV2,
  resetTemplateFieldValueV2,
  selectTemplateFieldChoiceV2,
  setTemplateFieldValueV2,
  setTemplateImageReplacementV2,
  validateTemplateFieldContentForPackageV2,
  validateTemplatePackageV2,
} from "../src";
import type {
  EditableFieldDefinitionV2,
  PackageSolidPaint,
  TemplateFieldContentStateV1,
  TemplatePackageV1,
  TemplatePackageV2,
  TextTemplateNode,
} from "../src";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function textValue(packageValue: TemplatePackageV2, nodeId: string): string {
  const node = packageValue.nodes[nodeId];
  assert(node?.type === "TEXT", `Expected ${nodeId} to be TEXT.`);
  return "characters" in node.text ? node.text.characters : node.text.content;
}

function fieldPackage(): TemplatePackageV2 {
  const normalized = normalizeTemplatePackageV1ToV2(
    structuredClone(fixture as unknown as TemplatePackageV1),
  );
  assert(normalized.package, "The source fixture should normalize to V2.");
  const packageValue = normalized.package;
  const root = packageValue.nodes[packageValue.rootNodeId];
  root.appearance.fills.push({
    type: "SOLID",
    color: { r: 0, g: 0, b: 0, a: 0.4 },
    opacity: 0.6,
    visible: true,
    blendMode: "NORMAL",
  });
  packageValue.editableFields = [
    {
      id: "text:title",
      type: "text",
      label: "Title",
      controlRole: "campaign-title",
      binding: { kind: "text-characters", nodeId: "58:57" },
      defaultValue: "Hi",
      configuration: {
        maxCharacters: 3,
        warningAtCharacters: 2,
        choices: {
          mode: "suggested",
          options: [
            { id: "short", label: "Short", value: "Hi" },
            { id: "other", value: "Yo" },
          ],
        },
      },
    },
    {
      id: "textarea:body",
      type: "textarea",
      binding: { kind: "text-characters", nodeId: "58:60" },
      defaultValue: "Body",
      configuration: {
        maxCharacters: 20,
        maxLines: 2,
        warningAtCharacters: 5,
        warningAtLines: 1,
        choices: {
          mode: "suggested",
          options: [{ id: "intro", value: "Body" }],
        },
      },
    },
    {
      id: "number:amount",
      type: "number",
      binding: { kind: "text-characters", nodeId: "58:76" },
      defaultValue: 125,
      configuration: {
        min: -10,
        max: 200,
        step: 0.1,
        format: {
          schemaVersion: "number-display-v1",
          prefix: "€",
          suffix: ",-",
          decimalSeparator: ",",
          thousandSeparator: ".",
          decimalPlaces: 1,
        },
        choices: {
          mode: "suggested",
          options: [
            { id: "zero", value: 0 },
            { id: "standard", value: 125 },
          ],
        },
      },
    },
    {
      id: "date:launchDate",
      type: "date",
      binding: { kind: "text-characters", nodeId: "58:79" },
      defaultValue: "2026-11-04",
      configuration: {
        format: { schemaVersion: "date-display-v1", preset: "numeric-day-first" },
        choices: {
          mode: "suggested",
          options: [{ id: "launch", value: "2026-11-04" }],
        },
      },
    },
    {
      id: "color:brandColor",
      type: "color",
      binding: { kind: "solid-fill-color", nodeId: packageValue.rootNodeId, sourceIndex: 1 },
      defaultValue: "#000000",
      configuration: {
        choices: {
          mode: "suggested",
          options: [{ id: "primary", value: "#ff3344" }],
        },
      },
    },
    {
      id: "image:heroImage",
      type: "image",
      binding: { kind: "image-content", nodeId: "58:61" },
      defaultValue: {
        assetId: packageValue.nodes["58:61"].image?.assetId ?? null,
        placement: { mode: "imported" },
      },
      configuration: {
        replacementPlacement: "fill",
      },
    },
    {
      id: "boolean:showBrand",
      type: "boolean",
      binding: { kind: "structural-visibility", nodeId: "58:39" },
      defaultValue: true,
      configuration: {},
    },
  ];
  packageValue.editableFieldOrder = [
    "text:title",
    "textarea:body",
    "image:heroImage",
    "number:amount",
    "date:launchDate",
    "boolean:showBrand",
    "color:brandColor",
  ];
  assert(validateTemplatePackageV2(packageValue).valid, "The seven-field V2 package should be valid.");
  return packageValue;
}

const packageValue = fieldPackage();
const styledPackage = structuredClone(packageValue);
const styledTitleNode = styledPackage.nodes["58:57"];
assert(styledTitleNode.type === "TEXT" && "characters" in styledTitleNode.text, "Styled text test requires a current TEXT node.");
styledTitleNode.text.characters = "ABCD";
styledTitleNode.text.styleRanges = [
  { start: 0, end: 2, family: "Inter", style: "Regular", cssStyle: "normal", weight: 400, postScriptName: null },
  { start: 2, end: 4, family: "Inter", style: "Bold", cssStyle: "normal", weight: 700, postScriptName: null },
];
const styledTitleField = styledPackage.editableFields.find((field) => field.id === "text:title");
assert(styledTitleField?.type === "text", "Styled text test requires the title field.");
styledTitleField.defaultValue = "ABCD";
styledTitleField.configuration.maxCharacters = 30;
const initialState = createTemplateFieldContentStateV1(packageValue);
assert(initialState.revision === 0 && Object.keys(initialState.values).length === 0, "Initial content should be sparse at revision zero.");
assert(Object.isFrozen(initialState) && Object.isFrozen(initialState.values), "Canonical content snapshots should be runtime immutable.");

assert(
  countTemplateFieldGraphemesV1("e\u0301") === 1 &&
    countTemplateFieldGraphemesV1("👨‍👩‍👧‍👦") === 1,
  "Text limits should count Unicode grapheme clusters rather than code units.",
);

const textWarning = setTemplateFieldValueV2(packageValue, initialState, "text:title", "e\u0301x");
assert(textWarning.accepted && textWarning.issues.some((item) => item.code === "field-v2.warning-characters"), "Text warning thresholds should be advisory.");
assert(textWarning.state.values["text:title"]?.value === "e\u0301x", "Accepted Text should preserve its canonical string.");
const styledInitialState = createTemplateFieldContentStateV1(styledPackage);
const styledInsertion = setTemplateFieldValueV2(styledPackage, styledInitialState, "text:title", "ABxxCD");
assert(styledInsertion.accepted, "A styled text insertion within the configured limit should be accepted.");
const styledMaterialization = materializeTemplateFieldContentV2(styledPackage, styledInsertion.state);
const styledMaterializedNode = styledMaterialization.workingPackage?.nodes["58:57"];
assert(styledMaterializedNode?.type === "TEXT" && "characters" in styledMaterializedNode.text, "Styled insertion should materialize to its TEXT node.");
assert(
  styledMaterializedNode.text.characters === "ABxxCD" &&
    styledMaterializedNode.text.styleRanges?.map((range) => `${range.start}-${range.end}:${range.weight}`).join(",") === "0-4:400,4-6:700",
  "Inserted text should inherit its preceding Figma style and shift following runs without losing content.",
);
const textLineBreak = setTemplateFieldValueV2(packageValue, textWarning.state, "text:title", "A\nB");
assert(!textLineBreak.accepted && textLineBreak.contentRevision === textWarning.contentRevision, "Text line separators should reject without advancing revision.");
const textTooLong = setTemplateFieldValueV2(packageValue, textWarning.state, "text:title", "ABCD");
assert(!textTooLong.accepted && textTooLong.issues.some((item) => item.code === "field-v2.max-characters"), "Text maxCharacters should be blocking.");
const suggestedText = setTemplateFieldValueV2(packageValue, textWarning.state, "text:title", "OK");
assert(suggestedText.accepted, "Suggested choices should permit other valid values.");
const selectedText = selectTemplateFieldChoiceV2(packageValue, suggestedText.state, "text:title", "other");
assert(selectedText.accepted && selectedText.state.values["text:title"]?.selectedChoiceId === "other", "Choice selection should retain stable option provenance.");

const restrictedPackage = structuredClone(packageValue);
const restrictedText = restrictedPackage.editableFields.find((field) => field.id === "text:title");
assert(restrictedText?.type === "text", "Restricted test field should be Text.");
restrictedText.configuration.choices = {
  mode: "restricted",
  options: [{ id: "short", value: "Hi" }, { id: "other", value: "Yo" }],
};
assert(validateTemplatePackageV2(restrictedPackage).valid, "Restricted configuration should include the imported default.");
assert(
  !setTemplateFieldValueV2(restrictedPackage, initialState, "text:title", "No").accepted,
  "Restricted choices should reject unconfigured values.",
);

const emptyText = setTemplateFieldValueV2(packageValue, initialState, "text:title", "");
assert(emptyText.accepted && emptyText.state.values["text:title"]?.value === "", "Explicit empty Text must remain distinct from reset.");
const resetText = resetTemplateFieldValueV2(packageValue, emptyText.state, "text:title");
assert(resetText.accepted && resetText.contentRevision === 2 && !("text:title" in resetText.state.values), "Reset should remove the override and advance revision.");

const multiline = setTemplateFieldValueV2(packageValue, initialState, "textarea:body", "A\nB\nC");
assert(multiline.accepted, "Textarea should not fake visual maxLines by rejecting explicit or wrapped lines in Core.");
assert(multiline.renderValidation.state === "pending", "Textarea line rules should publish pending render validation.");
const textareaWarning = setTemplateFieldValueV2(packageValue, initialState, "textarea:body", "12345");
assert(textareaWarning.accepted && textareaWarning.issues.some((item) => item.code === "field-v2.warning-characters"), "Textarea character warnings should remain advisory.");
assert(!setTemplateFieldValueV2(packageValue, initialState, "textarea:body", "123456789012345678901").accepted, "Textarea maxCharacters should remain blocking.");
const selectedTextarea = selectTemplateFieldChoiceV2(packageValue, initialState, "textarea:body", "intro");
assert(selectedTextarea.accepted && selectedTextarea.state.values["textarea:body"]?.selectedChoiceId === "intro", "Textarea choices should retain stable identity.");
const resetTextarea = resetTemplateFieldValueV2(packageValue, selectedTextarea.state, "textarea:body");
assert(resetTextarea.accepted && !("textarea:body" in resetTextarea.state.values), "Textarea reset should remove its canonical override.");

const zeroNumber = setTemplateFieldValueV2(packageValue, initialState, "number:amount", 0);
assert(zeroNumber.accepted && zeroNumber.state.values["number:amount"]?.value === 0, "Numeric zero should be a canonical override.");
assert(setTemplateFieldValueV2(packageValue, initialState, "number:amount", -5.5).accepted, "Aligned negative numbers should be accepted.");
assert(!setTemplateFieldValueV2(packageValue, initialState, "number:amount", -10.05).accepted, "Off-step numbers should be rejected deterministically.");
assert(!setTemplateFieldValueV2(packageValue, initialState, "number:amount", -11).accepted, "Number min should be blocking.");
assert(!setTemplateFieldValueV2(packageValue, initialState, "number:amount", 201).accepted, "Number max should be blocking.");
assert(!setTemplateFieldValueV2(packageValue, initialState, "number:amount", Number.NaN).accepted, "Non-finite numbers should be rejected.");
const selectedNumber = selectTemplateFieldChoiceV2(packageValue, initialState, "number:amount", "zero");
assert(selectedNumber.accepted && selectedNumber.state.values["number:amount"]?.value === 0, "Number choices should set canonical numbers.");
const resetNumber = resetTemplateFieldValueV2(packageValue, selectedNumber.state, "number:amount");
assert(resetNumber.accepted && !("number:amount" in resetNumber.state.values), "Number reset should remove its canonical override.");
assert(formatTemplateNumberV1(1234.5, {
  schemaVersion: "number-display-v1",
  prefix: "€",
  suffix: ",-",
  decimalSeparator: ",",
  thousandSeparator: ".",
  decimalPlaces: 1,
}) === "€1.234,5,-", "Number formatting should be deterministic and locale-free.");

assert(setTemplateFieldValueV2(packageValue, initialState, "date:launchDate", "2028-02-29").accepted, "Real leap dates should be accepted.");
assert(!setTemplateFieldValueV2(packageValue, initialState, "date:launchDate", "2027-02-29").accepted, "Invalid leap dates should be rejected.");
assert(!setTemplateFieldValueV2(packageValue, initialState, "date:launchDate", "2026-13-01").accepted, "Invalid months should be rejected.");
const selectedDate = selectTemplateFieldChoiceV2(packageValue, initialState, "date:launchDate", "launch");
assert(selectedDate.accepted && selectedDate.state.values["date:launchDate"]?.value === "2026-11-04", "Date choices should preserve canonical calendar dates.");
const resetDate = resetTemplateFieldValueV2(packageValue, selectedDate.state, "date:launchDate");
assert(resetDate.accepted && !("date:launchDate" in resetDate.state.values), "Date reset should remove its canonical override.");
assert(formatTemplateCalendarDateV1("2026-11-04", {
  schemaVersion: "date-display-v1",
  preset: "numeric-day-first",
}) === "04/11/2026", "Date formatting should remain timezone- and locale-free.");
assert(formatTemplateCalendarDateV1("2026-11-04", {
  schemaVersion: "date-display-v1",
  preset: "numeric-month-day",
  prefix: "Ends ",
  suffix: " UTC",
  separator: ".",
}) === "Ends 11.04 UTC", "Date formatting should support deterministic prefixes, suffixes, separators and yearless presets.");

const colorMutation = setTemplateFieldValueV2(packageValue, initialState, "color:brandColor", "#F64");
assert(colorMutation.accepted && colorMutation.state.values["color:brandColor"]?.value === "#ff6644", "Color shorthand should normalize to canonical lowercase RGB.");
assert(setTemplateFieldValueV2(packageValue, initialState, "color:brandColor", "#FF6644").accepted, "Six-digit opaque Color input should normalize case.");
assert(!setTemplateFieldValueV2(packageValue, initialState, "color:brandColor", "#ff6644cc").accepted, "Alpha-bearing Color input should be rejected.");
assert(!setTemplateFieldValueV2(packageValue, initialState, "color:brandColor", "red").accepted, "CSS named colors should remain outside the frozen Color input subset.");
const selectedColor = selectTemplateFieldChoiceV2(packageValue, initialState, "color:brandColor", "primary");
assert(selectedColor.accepted, "Static Color choices should use ordinary canonical mutation.");
const resetColor = resetTemplateFieldValueV2(packageValue, selectedColor.state, "color:brandColor");
assert(resetColor.accepted && !("color:brandColor" in resetColor.state.values), "Color reset should remove its canonical override.");

const importedImage = packageValue.nodes["58:61"].image;
assert(importedImage?.assetId, "Fixture should provide an imported image default.");
const replacementAssetId = packageValue.nodes["58:87"].image?.assetId;
assert(replacementAssetId, "Fixture should provide a second canonical image asset.");
const replacement = setTemplateImageReplacementV2(packageValue, initialState, "image:heroImage", replacementAssetId);
assert(replacement.accepted &&
  (replacement.state.values["image:heroImage"]?.value as { placement?: { mode?: string } }).placement?.mode === "fill", "Image replacement should resolve its configured default placement.");
assert(!setTemplateImageReplacementV2(packageValue, initialState, "image:heroImage", replacementAssetId, { mode: "fit" }).accepted, "Unauthorized Image placement should be rejected by Core.");
const crop = setTemplateImageReplacementV2(packageValue, initialState, "image:heroImage", replacementAssetId, {
  mode: "crop",
  crop: {
    schemaVersion: "normalized-image-crop-v1",
    coordinateSpace: "normalized-slot-to-normalized-source",
    transform: [[0.8, 0, 0.1], [0, 0.8, 0.1]],
  },
});
assert(!crop.accepted, "Fill policy should reject a host-authored Crop state.");
const cropPolicyPackage = structuredClone(packageValue);
const cropPolicyField = cropPolicyPackage.editableFields.find((field) => field.id === "image:heroImage");
assert(cropPolicyField?.type === "image", "Crop policy test requires the Image field.");
cropPolicyField.configuration = { replacementPlacement: "crop" };
assert(setTemplateImageReplacementV2(cropPolicyPackage, initialState, "image:heroImage", replacementAssetId, {
  mode: "crop",
  crop: {
    schemaVersion: "normalized-image-crop-v1",
    coordinateSpace: "normalized-slot-to-normalized-source",
    transform: [[0.8, 0, 0.1], [0, 0.8, 0.1]],
  },
}).accepted, "Finite invertible canonical Crop state should be accepted under the Crop policy.");
assert(!setTemplateImageReplacementV2(cropPolicyPackage, initialState, "image:heroImage", replacementAssetId, {
  mode: "crop",
  crop: {
    schemaVersion: "normalized-image-crop-v1",
    coordinateSpace: "normalized-slot-to-normalized-source",
    transform: [[0, 0, 0], [0, 0, 0]],
  },
}).accepted, "Non-invertible Crop state should be rejected deterministically.");
const resetImage = resetTemplateFieldValueV2(packageValue, replacement.state, "image:heroImage");
assert(resetImage.accepted && !("image:heroImage" in resetImage.state.values), "Image reset should remove replacement state rather than copying rendered geometry.");

const falseBoolean = setTemplateFieldValueV2(packageValue, initialState, "boolean:showBrand", false);
assert(falseBoolean.accepted && falseBoolean.state.values["boolean:showBrand"]?.value === false, "Explicit false must remain distinct from reset.");
assert(setTemplateFieldValueV2(packageValue, initialState, "boolean:showBrand", true).accepted, "Boolean true should remain a canonical value.");
const resetBoolean = resetTemplateFieldValueV2(packageValue, falseBoolean.state, "boolean:showBrand");
assert(resetBoolean.accepted && !("boolean:showBrand" in resetBoolean.state.values), "Boolean reset should restore the imported default by removing its override.");

const wrongPackageState: TemplateFieldContentStateV1 = {
  ...structuredClone(initialState),
  packageId: "another-package",
};
assert(!validateTemplateFieldContentForPackageV2(packageValue, wrongPackageState).valid, "Content package identity mismatch should be rejected.");
assert(!validateTemplateFieldContentForPackageV2(packageValue, {
  ...structuredClone(initialState),
  values: { missing: { value: "unknown" } },
}).valid, "Malformed persisted content should be diagnosed without changing package authority.");

let allState = createTemplateFieldContentStateV1(packageValue);
for (const [fieldId, value] of [
  ["text:title", "Yo"],
  ["textarea:body", "A\nB\nC"],
  ["number:amount", 125],
  ["date:launchDate", "2026-11-04"],
  ["color:brandColor", "#ff6644"],
  ["boolean:showBrand", false],
] as const) {
  const result = setTemplateFieldValueV2(packageValue, allState, fieldId, value);
  assert(result.accepted, `Expected ${fieldId} mutation to be accepted.`);
  allState = result.state;
}
const allImage = setTemplateImageReplacementV2(packageValue, allState, "image:heroImage", replacementAssetId);
assert(allImage.accepted, "All-field materialization should accept image replacement.");
allState = allImage.state;

const packageSnapshot = JSON.stringify(packageValue);
const stateSnapshot = JSON.stringify(allState);
const materialized = materializeTemplateFieldContentV2(packageValue, allState);
const repeated = materializeTemplateFieldContentV2(packageValue, allState);
assert(materialized.valid && materialized.workingPackage, "All seven field types should materialize through one pure authority.");
assert(!materialized.exportReady && materialized.pendingRenderValidation.some((item) => item.rule === "max-lines" && item.blocksExport), "Configured maxLines should remain pending and block export readiness without blocking editing.");
assert(JSON.stringify(packageValue) === packageSnapshot && JSON.stringify(allState) === stateSnapshot, "Materialization must not mutate package or content inputs.");
assert(JSON.stringify(materialized) === JSON.stringify(repeated), "Repeated materialization should be deterministic.");
assert(materialized.materializationRevision === repeated.materializationRevision, "Equivalent materialization should retain one deterministic revision identity.");
const layoutChangedPackage = structuredClone(packageValue);
layoutChangedPackage.nodes["58:60"].bounds.relative.width += 1;
const layoutChangedMaterialization = materializeTemplateFieldContentV2(layoutChangedPackage, allState);
assert(layoutChangedMaterialization.valid &&
  layoutChangedMaterialization.materializationRevision !== materialized.materializationRevision, "Materialization identity must change when canonical layout changes at the same content revision.");
assert(materialized.fields.some((entry) => entry.fieldId === "text:title" && entry.valueSource === "content-override") &&
  materialized.fields.every((entry) => entry.contentRevision === allState.revision), "Materialization should retain value-source and content-revision provenance.");
assert(textValue(materialized.workingPackage, "58:57") === "Yo", "Text should materialize to exact characters.");
assert(textValue(materialized.workingPackage, "58:60") === "A\nB\nC", "Textarea should remain visibly editable even while line validation is pending.");
assert(textValue(materialized.workingPackage, "58:76") === "€125,0,-", "Number formatting should affect only renderer-facing text.");
assert(allState.values["number:amount"]?.value === 125, "Formatted Number text must never replace canonical numeric state.");
assert(textValue(materialized.workingPackage, "58:79") === "04/11/2026", "Date should materialize through its bounded formatter.");
assert(allState.values["date:launchDate"]?.value === "2026-11-04", "Formatted Date text must never replace the canonical calendar date.");

const originalPaint = packageValue.nodes[packageValue.rootNodeId].appearance.fills[0] as PackageSolidPaint;
const originalBoundPaint = packageValue.nodes[packageValue.rootNodeId].appearance.fills[1] as PackageSolidPaint;
const firstMaterializedPaint = materialized.workingPackage.nodes[packageValue.rootNodeId].appearance.fills[0] as PackageSolidPaint;
const boundMaterializedPaint = materialized.workingPackage.nodes[packageValue.rootNodeId].appearance.fills[1] as PackageSolidPaint;
assert(JSON.stringify(firstMaterializedPaint) === JSON.stringify(originalPaint), "Color materialization must not scan for or change the first SOLID paint.");
assert(boundMaterializedPaint.color.r === 1 && boundMaterializedPaint.color.a === originalBoundPaint.color.a && boundMaterializedPaint.opacity === originalBoundPaint.opacity, "Color must update exact RGB while preserving imported alpha and paint opacity.");

assert(materialized.workingPackage.nodes["58:61"].image?.assetId === replacementAssetId &&
  materialized.workingPackage.nodes["58:61"].image?.activePlacement?.state === "replacement-fill", "Image replacement should materialize asset plus canonical placement authority.");
assert(materialized.workingPackage.nodes["58:39"].appearance.visible === false, "Milestone 2 Boolean should materialize visibility without claiming structural reflow.");

const defaultMaterialized = materializeTemplateFieldContentV2(packageValue, initialState);
assert(defaultMaterialized.workingPackage?.nodes["58:61"].image?.assetId === importedImage.assetId &&
  JSON.stringify(defaultMaterialized.workingPackage?.nodes["58:61"].image?.imageTransform) === JSON.stringify(importedImage.imageTransform), "Missing Image override must retain complete imported placement authority.");

const preciseColorPackage = structuredClone(packageValue);
const preciseColorField = preciseColorPackage.editableFields.find((field) => field.id === "color:brandColor");
assert(preciseColorField?.type === "color", "Expected the indexed Color field.");
const preciseFills = preciseColorPackage.nodes[preciseColorPackage.rootNodeId].appearance.fills;
const precisePaint = preciseFills[1];
assert(precisePaint?.type === "SOLID", "Expected the exact indexed source SOLID fill.");
precisePaint.color = { r: 0.8999999761581421, g: 0.699999988079071, b: 1, a: 0.4 };
preciseColorField.defaultValue = "#e5b2ff";
const preciseState = createTemplateFieldContentStateV1(preciseColorPackage);
const preciseInitial = materializeTemplateFieldContentV2(preciseColorPackage, preciseState);
assert(preciseInitial.valid && preciseInitial.workingPackage, "Precise imported Color default should materialize.");
assert(JSON.stringify(preciseInitial.workingPackage.nodes[preciseColorPackage.rootNodeId].appearance.fills) === JSON.stringify(preciseFills), "Source-equivalent Color default must retain every indexed fill and its floating-point RGBA and opacity.");
const preciseEdit = setTemplateFieldValueV2(preciseColorPackage, preciseState, "color:brandColor", "#e5b2ff");
assert(preciseEdit.accepted, "An explicit Color edit equal to the displayed default must be accepted.");
const editedPrecise = materializeTemplateFieldContentV2(preciseColorPackage, preciseEdit.state);
const editedPaint = editedPrecise.workingPackage?.nodes[preciseColorPackage.rootNodeId].appearance.fills[1];
assert(editedPaint?.type === "SOLID" && editedPaint.color.r === 0xe5 / 255 && editedPaint.color.g === 0xb2 / 255 && editedPaint.color.b === 1 && editedPaint.color.a === 0.4 && editedPaint.opacity === precisePaint.opacity, "Explicit Color edits must apply canonical RGB only to the bound paint.");
const preciseReset = resetTemplateFieldValueV2(preciseColorPackage, preciseEdit.state, "color:brandColor");
assert(preciseReset.accepted, "Color reset must be accepted.");
const resetPrecise = materializeTemplateFieldContentV2(preciseColorPackage, preciseReset.state);
assert(JSON.stringify(resetPrecise.workingPackage?.nodes[preciseColorPackage.rootNodeId].appearance.fills) === JSON.stringify(preciseFills), "Reset must restore the exact imported source fill, not quantized control RGB.");
const configuredDefaultPackage = structuredClone(preciseColorPackage);
const configuredDefault = configuredDefaultPackage.editableFields.find((field) => field.id === "color:brandColor");
assert(configuredDefault?.type === "color", "Expected configured Color field.");
configuredDefault.defaultValue = "#123456";
const configuredMaterialized = materializeTemplateFieldContentV2(configuredDefaultPackage, createTemplateFieldContentStateV1(configuredDefaultPackage));
const configuredPaint = configuredMaterialized.workingPackage?.nodes[configuredDefaultPackage.rootNodeId].appearance.fills[1];
assert(configuredPaint?.type === "SOLID" && configuredPaint.color.r === 0x12 / 255 && configuredPaint.color.g === 0x34 / 255 && configuredPaint.color.b === 0x56 / 255 && configuredPaint.color.a === 0.4, "A deliberately different V2 default must still override only the bound RGB.");

const descriptors = getOrderedHostEditableFieldsV2(packageValue);
assert(descriptors.map((entry) => entry.field.id).join(",") === packageValue.editableFieldOrder.join(","), "Host descriptors should honor portable field order.");
assert(!("binding" in descriptors[0].field) && !("provenance" in descriptors[0].field), "Normal host descriptors should hide renderer binding internals.");

const materializedFalse = materializeTemplateFieldContentV2(packageValue, falseBoolean.state);
const materializedReset = materializeTemplateFieldContentV2(packageValue, resetBoolean.state);
assert(materializedFalse.workingPackage?.nodes["58:39"].appearance.visible === false &&
  materializedReset.workingPackage?.nodes["58:39"].appearance.visible === true, "False and reset should materialize as distinct canonical states.");

const resetAfterNoOverride = resetTemplateFieldValueV2(packageValue, initialState, "text:title");
assert(resetAfterNoOverride.accepted && resetAfterNoOverride.contentRevision === 1, "Reset should advance revision even when the sparse override was already absent.");

const invalidChoicePackage = structuredClone(packageValue);
const invalidChoiceField = invalidChoicePackage.editableFields.find((field) => field.id === "number:amount");
assert(invalidChoiceField?.type === "number", "Invalid choice test field should be Number.");
invalidChoiceField.configuration.choices = {
  mode: "suggested",
  options: [{ id: "offStep", value: 1.05 }],
};
assert(!validateTemplatePackageV2(invalidChoicePackage).valid, "Choice option values must satisfy their field's ordinary deterministic rules.");

const cropOnlyPackage = structuredClone(packageValue);
const cropOnlyField = cropOnlyPackage.editableFields.find((field) => field.id === "image:heroImage");
assert(cropOnlyField?.type === "image", "Crop-only test field should be Image.");
cropOnlyField.configuration = { replacementPlacement: "crop" };
assert(validateTemplatePackageV2(cropOnlyPackage).valid, "Crop Image replacement policy should be valid.");
assert(setTemplateImageReplacementV2(cropOnlyPackage, initialState, "image:heroImage", replacementAssetId).accepted, "Crop policy without host crop data should deterministically fall back to Fill.");

const badSelectedChoice = setTemplateFieldValueV2(packageValue, initialState, "text:title", "Hi", { selectedChoiceId: "other" });
assert(!badSelectedChoice.accepted, "Selected choice provenance must match the submitted canonical value.");

const directStateMutationProbe = structuredClone(initialState) as { revision: number };
directStateMutationProbe.revision = 99;
assert(initialState.revision === 0, "External object edits must not mutate immutable snapshots returned by Core.");

// Ensure the test package retained current-format text bindings used above.
assert((packageValue.nodes["58:57"] as TextTemplateNode).type === "TEXT", "Test source must retain a current text target.");
