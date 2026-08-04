import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import figmaPluginV041 from "../../../../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { validatePackageJpgExportReadiness } from "@sleinity/template-browser/capture";
import { validateTemplatePackage, type EditableFieldBinding, type TemplatePackageV1 } from "@sleinity/template-core";
import { TemplatePackageFieldEditor } from "./TemplatePackageFieldEditor";
import {
  editableFieldSelectionKey,
  reorderEditableFields,
  TemplatePackageFieldRulesEditor,
} from "./TemplatePackageFieldRulesEditor";
import {
  constrainTextInput,
  countGraphemes,
  createTextFitResult,
  fieldCounter,
  matchesFieldPattern,
  truncateGraphemes,
  validatePackageFieldConstraints,
  validateTextFieldValue,
  withTextFieldConstraint,
} from "@sleinity/template-core/editor";
import {
  getEffectiveEditableFields,
  getPackageFieldOverrideValue,
  updateTemplatePackageField,
} from "@sleinity/template-core/editor";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const basePackage = figmaPluginV041 as unknown as TemplatePackageV1;
const textNode = Object.values(basePackage.nodes).find((node) => node.type === "TEXT");
if (!textNode || textNode.type !== "TEXT" || !("characters" in textNode.text)) {
  throw new Error("Fixture requires a current-format text node.");
}
const importedDefault = textNode.text.characters;
const textNodeId = textNode.id;

function textField(
  id: string,
  constraints: EditableFieldBinding["constraints"] = {},
  type: "text" | "textarea" = "textarea",
): EditableFieldBinding {
  return {
    id,
    type,
    nodeId: textNodeId,
    property: "text.characters",
    label: id,
    defaultValue: importedDefault,
    constraints,
    behavior: { onOverflow: "warn-only", showCounter: false, counterType: "words" },
  };
}

const canonicalField = textField("Headline", {
  maxCharacters: 5,
  maxLines: 2,
  allowLineBreaks: true,
});

assert(
  countGraphemes("A👩‍💻e\u0301") === 3,
  "Character limits should count grapheme clusters, including joined emoji and combining marks.",
);
assert(
  truncateGraphemes("👨‍👩‍👧‍👦ABC", 2) === "👨‍👩‍👧‍👦A",
  "Grapheme truncation should preserve complete user-perceived characters.",
);

const characterPaste = constrainTextInput(
  canonicalField,
  "",
  "A👩‍💻BCD-extra",
  { measureLines: () => 1 },
);
assert(
  characterPaste.value === "" &&
    characterPaste.prevented &&
    characterPaste.issues[0]?.message === "Maximum of 5 characters reached.",
  "Character overflow should preserve the last valid value and return character-specific feedback.",
);

const independentBase = textField("Independent", {
  maxCharacters: 10,
  maxLines: 4,
});
const oneLineIndependent = withTextFieldConstraint(
  independentBase,
  "maxLines",
  1,
);
const noCharacterLimit = withTextFieldConstraint(
  oneLineIndependent,
  "maxCharacters",
  undefined,
);
const restoredCharacterLimit = withTextFieldConstraint(
  noCharacterLimit,
  "maxCharacters",
  100,
);
assert(
  (oneLineIndependent.constraints as { maxCharacters?: number; maxLines?: number }).maxCharacters === 10 &&
    (oneLineIndependent.constraints as { maxCharacters?: number; maxLines?: number }).maxLines === 1 &&
    (noCharacterLimit.constraints as { maxCharacters?: number; maxLines?: number }).maxCharacters === undefined &&
    (noCharacterLimit.constraints as { maxCharacters?: number; maxLines?: number }).maxLines === 1 &&
    (restoredCharacterLimit.constraints as { maxCharacters?: number; maxLines?: number }).maxCharacters === 100 &&
    (restoredCharacterLimit.constraints as { maxCharacters?: number; maxLines?: number }).maxLines === 1,
  "Maximum characters and rendered lines should update and clear independently.",
);
const lineOnlyInput = constrainTextInput(
  noCharacterLimit,
  "A",
  "Many characters",
  { measureLines: () => 1 },
);
const combinedAccepted = constrainTextInput(
  oneLineIndependent,
  "",
  "1234567890",
  { measureLines: () => 1 },
);
const combinedWrapped = constrainTextInput(
  oneLineIndependent,
  "1234",
  "12345",
  { measureLines: () => 2 },
);
assert(
  lineOnlyInput.value === "Many characters" && !lineOnlyInput.prevented &&
    combinedAccepted.value === "1234567890" && !combinedAccepted.prevented &&
    combinedWrapped.value === "1234" &&
    combinedWrapped.issues[0]?.message === "Text does not fit within this field." &&
    fieldCounter(noCharacterLimit, "Many characters").limit === undefined,
  "Line-only and combined limits should evaluate independently without creating a character denominator from maxLines.",
);

const wrapField = textField("Wrapping headline", { maxLines: 2 });
const automaticWrap = constrainTextInput(
  wrapField,
  "short",
  "abcdefghijklmnop",
  { measureLines: (value) => Math.max(1, Math.ceil(countGraphemes(value) / 5)) },
);
assert(
  automaticWrap.value === "short" && automaticWrap.prevented,
  "Automatic wrapping should preserve the last valid value when the rendered-line limit is exceeded.",
);
const manualLines = constrainTextInput(
  wrapField,
  "one\ntwo",
  "one\ntwo\nthree",
  { measureLines: (value) => value.split("\n").length },
);
assert(
  manualLines.value === "one\ntwo" && manualLines.prevented,
  "Manual newlines should use the same maximum-line operation.",
);
const oneLineManualBreak = constrainTextInput(
  textField("One line", { maxLines: 1 }, "text"),
  "Short",
  "Short\nNext",
  { measureLines: (value) => value.split("\n").length },
);
assert(
  oneLineManualBreak.value === "Short" &&
    oneLineManualBreak.prevented &&
    oneLineManualBreak.issues[0]?.message === "Text does not fit within this field.",
  "A manual newline in a one-line field should preserve the last valid value and show contextual feedback.",
);

const counterBelow = fieldCounter(textField("Counter", { maxCharacters: 10 }), "1234567");
const counterWarning = fieldCounter(textField("Counter", { maxCharacters: 10 }), "12345678");
const counterMaximum = fieldCounter(textField("Counter", { maxCharacters: 10 }), "1234567890");
assert(
  counterBelow.state === "normal" && counterWarning.state === "warning" && counterMaximum.state === "maximum",
  "Character warning state should begin at ceil(80%) and distinguish the maximum.",
);

const overridePackage = structuredClone(basePackage);
overridePackage.editableFields = [canonicalField];
assert(
  getPackageFieldOverrideValue(overridePackage, canonicalField) === "",
  "An imported node value equal to the descriptor default should be represented as no override.",
);
const overrideUpdate = updateTemplatePackageField(
  overridePackage,
  canonicalField,
  "Hello",
  { measureLines: () => 1 },
);
assert(
  getPackageFieldOverrideValue(overrideUpdate.packageValue, canonicalField) === "Hello",
  "Typing should create an override without changing the imported descriptor default.",
);
const clearedUpdate = updateTemplatePackageField(
  overrideUpdate.packageValue,
  canonicalField,
  "",
  { measureLines: () => 1 },
);
const clearedNode = clearedUpdate.packageValue.nodes[canonicalField.nodeId];
assert(
  canonicalField.defaultValue === importedDefault &&
    clearedNode.type === "TEXT" &&
    "characters" in clearedNode.text &&
    clearedNode.text.characters === importedDefault &&
    getPackageFieldOverrideValue(clearedUpdate.packageValue, canonicalField) === "",
  "Clearing an override should restore the immutable imported default.",
);

const legacyField = textField("Legacy", {
  required: true,
  maxWords: 1,
});
const legacyPackage = structuredClone(basePackage);
legacyPackage.editableFields = [legacyField];
assert(
  validateTemplatePackage(legacyPackage).schemaValid &&
    validateTextFieldValue(legacyField, "many legacy words").every(
      (issue) => issue.code !== "field-max-words" && issue.code !== "field-required",
    ) &&
    validatePackageFieldConstraints(legacyPackage).exportReady,
  "Legacy required and maximumWords data should remain readable without enforcing or blocking.",
);

assert(
  matchesFieldPattern("€45,-", "currency") &&
    matchesFieldPattern("45%", "percentage") &&
    matchesFieldPattern("45.5", "number") &&
    !matchesFieldPattern("45,5", "number") &&
    matchesFieldPattern("Ends 04/16", "date") &&
    matchesFieldPattern("2026-07-12", "date"),
  "Exposed input formats should retain their implemented validation behavior.",
);

const fit = createTextFitResult(
  wrapField,
  {
    clientWidth: 200,
    clientHeight: 40,
    scrollWidth: 200,
    scrollHeight: 60,
    lineHeightPx: 20,
  },
  true,
);
assert(
  !fit.fits && fit.measuredLines === 3 && fit.maxLines === 2,
  "Renderer fit reporting should retain rendered line and overflow measurements.",
);

const liveHugFit = createTextFitResult(
  wrapField,
  {
    clientWidth: 200,
    clientHeight: 40,
    scrollWidth: 200,
    scrollHeight: 44,
    lineHeightPx: 20,
    measuredLines: 2,
    visualOverflowPx: { x: 0, y: 0 },
  },
  true,
);
assert(
  liveHugFit.fits && liveHugFit.measuredLines === 2,
  "Role-aware HUG measurements should not turn glyph overhang into field clipping.",
);

const imageField: EditableFieldBinding = {
  id: "Product",
  type: "image",
  nodeId: textNodeId,
  property: "image.assetId",
  defaultValue: null,
  constraints: {
    required: true,
    allowedMimeTypes: ["image/png", "image/webp"],
    replacementMode: "preserve-original-crop",
  },
};
const orderedFields = [canonicalField, imageField, textField("Price", { maxCharacters: 20 }, "text")];
const reordered = reorderEditableFields(
  orderedFields,
  editableFieldSelectionKey(imageField),
  0,
);
assert(
  reordered.map((field) => field.id).join(",") === "Product,Headline,Price" &&
    orderedFields.map((field) => field.id).join(",") === "Headline,Product,Price",
  "Field reordering should preserve descriptor identity and leave the imported array unchanged.",
);

const builderPackage = structuredClone(basePackage);
builderPackage.editableFields = orderedFields;
const markerNode = structuredClone(textNode);
markerNode.id = "image-marker-node";
markerNode.name = "field:image:Supplemental";
builderPackage.nodes[markerNode.id] = markerNode;
const completeFieldOrder = getEffectiveEditableFields(builderPackage).map((field) => field.id);
assert(
  completeFieldOrder.slice(0, 3).join(",") === "Headline,Product,Price" &&
    completeFieldOrder.includes("Supplemental"),
  "Canonical field ordering should preserve stored order and append missing marker fields across types.",
);
const builderMarkup = renderToStaticMarkup(
  createElement(TemplatePackageFieldRulesEditor, {
    packageValue: builderPackage,
    onPackageChange: () => undefined,
    selectedFieldKey: editableFieldSelectionKey(canonicalField),
  }),
);
assert(
  builderMarkup.includes("Maximum characters") &&
    builderMarkup.includes("Maximum lines") &&
    builderMarkup.includes("Template default") &&
    !builderMarkup.includes("Maximum words") &&
    !builderMarkup.includes(">Required<") &&
    !builderMarkup.includes("Field filters") &&
    !builderMarkup.includes("Preview linked") &&
    !builderMarkup.includes("Input pattern") &&
    !builderMarkup.includes("Overflow behavior") &&
    !builderMarkup.includes(">Enabled<") &&
    !builderMarkup.includes("Help text") &&
    !builderMarkup.includes("Node path"),
  "Fields should expose only meaningful host-input rules without mutable metadata or node paths.",
);
const imageBuilderMarkup = renderToStaticMarkup(
  createElement(TemplatePackageFieldRulesEditor, {
    packageValue: builderPackage,
    onPackageChange: () => undefined,
    selectedFieldKey: editableFieldSelectionKey(imageField),
  }),
);
assert(
  imageBuilderMarkup.includes("Allowed formats") &&
    imageBuilderMarkup.includes("Default placement") &&
    imageBuilderMarkup.includes("Host-provided crop") &&
    !imageBuilderMarkup.includes("Preserve imported crop") &&
    !imageBuilderMarkup.includes(">Required<"),
  "Image rules should expose portable format and placement policies without content editing.",
);

const editorPackage = structuredClone(basePackage);
editorPackage.editableFields = reordered;
const editorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageFieldEditor, {
    packageValue: editorPackage,
    onPackageChange: () => undefined,
    variant: "plain",
    grouped: true,
    showTechnicalDetails: false,
    showWarnings: false,
  }),
);
assert(
  editorMarkup.indexOf("Product") < editorMarkup.indexOf("Headline") &&
    editorMarkup.indexOf("Headline") < editorMarkup.indexOf("Price") &&
    !editorMarkup.includes("Leave empty to use the template default") &&
    editorMarkup.includes(">0 / 5<") &&
    editorMarkup.indexOf(">Product</label>") < editorMarkup.indexOf('class="ui-media-input') &&
    !editorMarkup.includes("ui-media-input__label") &&
    editorMarkup.includes("ui-field__control") &&
    !editorMarkup.includes("rendered lines"),
  "The template editor should preserve order, place image labels outside cards, and keep character counters in the control wrapper.",
);

const formattedEditorPackage = structuredClone(basePackage);
formattedEditorPackage.editableFields = [
  textField("Amount", { pattern: "number" }),
  textField("Publish date", { pattern: "date" }),
];
const formattedEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageFieldEditor, {
    packageValue: formattedEditorPackage,
    onPackageChange: () => undefined,
    variant: "plain",
    showTechnicalDetails: false,
    showWarnings: false,
  }),
);
assert(
  formattedEditorMarkup.includes('type="number"') &&
    formattedEditorMarkup.includes('step="any"') &&
    formattedEditorMarkup.includes('type="date"'),
  "Persisted Number and Date formats should become functional native Render controls.",
);
assert(
  validateTemplatePackage(formattedEditorPackage).schemaValid,
  "Free text, Number, and Date authoring formats should remain valid under the canonical strict package schema.",
);

const lineOnlyEditorPackage = structuredClone(basePackage);
lineOnlyEditorPackage.editableFields = [textField("Line only", { maxLines: 1 }, "text")];
const lineOnlyEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageFieldEditor, {
    packageValue: lineOnlyEditorPackage,
    onPackageChange: () => undefined,
    variant: "plain",
    showTechnicalDetails: false,
    showWarnings: false,
  }),
);
assert(
  !lineOnlyEditorMarkup.includes("field-editor-input__counter"),
  "A rendered-line limit without maxCharacters should not expose a character counter.",
);

const requiredOnlyPackage = structuredClone(basePackage);
requiredOnlyPackage.editableFields = [legacyField];
const exportReadiness = validatePackageJpgExportReadiness({
  format: "jpg",
  packageValue: requiredOnlyPackage,
  renderMode: "editor",
});
assert(
  exportReadiness.status !== "blocked",
  "Legacy required metadata must not remain a hidden export blocker.",
);

const serialized = JSON.parse(JSON.stringify(builderPackage)) as TemplatePackageV1;
assert(
  serialized.editableFields.map((field) => field.id).join(",") === "Headline,Product,Price" &&
    (serialized.editableFields[0].constraints as { maxCharacters?: number }).maxCharacters === 5,
  "Field order and character constraints should survive package persistence.",
);
