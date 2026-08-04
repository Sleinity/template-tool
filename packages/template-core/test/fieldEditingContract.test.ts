import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  analyzeFieldConstraintReadiness,
  countGraphemes,
  createTextFitResult,
  fieldCounter,
  matchesFieldPattern,
  validateImageReplacement,
  validatePackageFieldConstraints,
  validateTextFieldValue,
  withTextFieldConstraint,
} from "../src/editor/fieldConstraints";
import {
  clearTemplatePackageImageOverride,
  getEffectiveEditableFields,
  getPackageEditorFieldTargetStatuses,
  getPackageEditorFieldWarnings,
  getPackageFieldOverrideValue,
  getPackageFieldValue,
  packageWithEffectiveEditableFields,
  replaceTemplatePackageImage,
  restoreImportedPackageForEditing,
  setTemplatePackageImageReplacementMode,
  updateTemplatePackageField,
} from "../src/editor/packageFieldBindings";
import {
  canOpenTemplatePackageEditor,
  type TemplatePackageEditorSession,
} from "../src/editor/packageEditorSession";
import {
  editableFieldRuleKey,
  reorderPackageEditableFieldRule,
  replacePackageEditableFieldRules,
  updatePackageEditableFieldRule,
} from "../src/editor/packageFieldRules";
import { validatePackageEditableFieldRules } from "../src/editor/packageFieldRuleValidation";
import { validateTemplatePackage } from "../src/validateTemplatePackage";
import type {
  EditableFieldBinding,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../src/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function freshPackage(): TemplatePackageV1 {
  return structuredClone(figmaPluginV041 as unknown as TemplatePackageV1);
}

function textValue(packageValue: TemplatePackageV1, nodeId: string): string | null {
  const node = packageValue.nodes[nodeId];
  if (node?.type !== "TEXT") return null;
  return "characters" in node.text ? node.text.characters : node.text.content;
}

const imported = freshPackage();
const validation = validateTemplatePackage(imported);
const headline = imported.editableFields[0];
assert(headline, "The field contract fixture requires a headline field.");

const editorSession: TemplatePackageEditorSession = {
  originalPackage: imported,
  workingPackage: structuredClone(imported),
  validation,
};
assert(
  canOpenTemplatePackageEditor(editorSession.workingPackage, validation),
  "A valid package must satisfy the portable editor-open contract.",
);

{
  const baseline = freshPackage();
  const current = freshPackage();
  const assetId = Object.keys(current.assets)[0];
  assert(assetId, "The field contract fixture requires an imported asset.");
  delete baseline.assets[assetId];
  current.assets["asset:image:user:restore-test"] = {
    ...structuredClone(current.assets[assetId]),
    id: "asset:image:user:restore-test",
  };
  const restored = restoreImportedPackageForEditing(baseline, current);
  assert(
    restored.assets[assetId]?.id === assetId &&
      restored.assets["asset:image:user:restore-test"] === undefined,
    "Full restore must retain normalized imported assets without retaining user replacements.",
  );
}

{
  const fontPackage = freshPackage();
  const requirement: TemplatePackageFontRequirement = {
    id: "font:linked:500:normal",
    family: "Linked Sans",
    style: "Medium",
    cssStyle: "normal",
    weight: 500,
    postScriptName: "LinkedSans-Medium",
    usedBy: [headline.nodeId],
    characters: "Font-preserving edit",
    editable: true,
    mixedStyle: false,
    source: "test",
    availableInFigma: false,
    assetId: "asset:font:linked",
    resolution: {
      managedFontId: "managed-font:linked:0",
      match: "exact",
      classification: "exact",
      confirmed: true,
      requestId: "font:linked:500:normal",
      faceIndex: 0,
      binaryHash: "a".repeat(64),
      runtimeFamily: "__template_font_aaaaaaaaaaaaaaaa_0_static",
      effectiveFamily: "Linked Sans",
      effectiveWeight: 500,
      effectiveStyle: "normal",
    },
  };
  fontPackage.fontRequirements = [requirement];
  const identity = JSON.stringify(fontPackage.fontRequirements);
  const edited = updateTemplatePackageField(
    fontPackage,
    headline,
    "Font-preserving edit",
  ).packageValue;
  const reset = restoreImportedPackageForEditing(fontPackage, edited);
  assert(
    JSON.stringify(edited.fontRequirements) === identity &&
      JSON.stringify(reset.fontRequirements) === identity,
    "Field edits and restore must preserve exact linked font identity.",
  );
}

const descriptors = getEffectiveEditableFields(imported);
assert(
  descriptors.length === imported.editableFields.length &&
    descriptors[0]?.id === headline.id,
  "Exported field descriptors must retain source order.",
);

{
  const fieldKey = editableFieldRuleKey(headline);
  const renamed = updatePackageEditableFieldRule(imported, fieldKey, {
    label: "Campaign headline",
    constraints: {
      maxCharacters: 42,
      maxLines: 2,
      pattern: "free",
    },
    behavior: {
      onOverflow: "prevent-input",
      showCounter: true,
      counterType: "characters",
    },
  });
  assert(
    renamed.applied &&
      renamed.packageValue !== imported &&
      renamed.fields[0]?.label === "Campaign headline" &&
      (renamed.fields[0]?.constraints as { maxCharacters?: number })
        .maxCharacters === 42 &&
      imported.editableFields[0]?.label !== "Campaign headline",
    "Field-rule updates must remain immutable and preserve typed constraints.",
  );

  const appended = structuredClone(headline);
  appended.id = "second-headline";
  const replaced = replacePackageEditableFieldRules(imported, [
    headline,
    appended,
  ]);
  const reordered = reorderPackageEditableFieldRule(
    replaced.packageValue,
    editableFieldRuleKey(appended),
    0,
  );
  assert(
    reordered.applied &&
      reordered.fields.map((field) => field.id).join(",") ===
        "second-headline,headline",
    "Field-rule replacement and reordering must preserve explicit host order.",
  );

  let duplicateRejected = false;
  try {
    replacePackageEditableFieldRules(imported, [headline, headline]);
  } catch {
    duplicateRejected = true;
  }
  assert(
    duplicateRejected,
    "Duplicate field-rule identities must be rejected before session publication.",
  );

  const validRules = validatePackageEditableFieldRules(renamed.fields);
  assert(
    validRules.valid && validRules.blockers.length === 0,
    "A supported field-rule configuration should produce a ready validation report.",
  );

  const invalidTextRule = structuredClone(headline);
  invalidTextRule.label = "";
  invalidTextRule.constraints = {
    minCharacters: 12,
    maxCharacters: 3.5,
    pattern: "custom",
    customPattern: "[",
  };
  const invalidTextReport = validatePackageEditableFieldRules([
    invalidTextRule,
  ]);
  assert(
    !invalidTextReport.valid &&
      invalidTextReport.blockers.some(
        (issue) => issue.code === "field-rule.label-required",
      ) &&
      invalidTextReport.blockers.some(
        (issue) =>
          issue.code === "field-rule.constraint-positive-integer-required",
      ) &&
      invalidTextReport.blockers.some(
        (issue) => issue.code === "field-rule.custom-pattern-invalid",
      ),
    "Empty labels, fractional integer limits, and malformed patterns should be explicit blockers.",
  );

  const invalidImageRule: EditableFieldBinding = {
    id: "validation-image",
    type: "image",
    nodeId: "58:61",
    property: "image.assetId",
    defaultValue: "asset:image:21b94426",
    constraints: {
      allowedMimeTypes: ["image/png", "image/png", "jpeg"],
      maxFileSizeMb: -1,
      minWidth: 2.5,
      replacementMode: "user-crop",
    },
  };
  const invalidImageReport = validatePackageEditableFieldRules([
    invalidImageRule,
    invalidImageRule,
  ]);
  assert(
    !invalidImageReport.valid &&
      invalidImageReport.blockers.some(
        (issue) => issue.code === "field-rule.duplicate",
      ) &&
      invalidImageReport.blockers.some(
        (issue) => issue.code === "field-rule.mime-type-invalid",
      ) &&
      invalidImageReport.blockers.some(
        (issue) => issue.code === "field-rule.mime-type-duplicate",
      ) &&
      invalidImageReport.blockers.some(
        (issue) => issue.code === "field-rule.constraint-positive-number-required",
      ),
    "Duplicate rules, malformed MIME values, negative sizes, and fractional dimensions should block publication.",
  );

  const clearedOptionalRule = structuredClone(headline);
  clearedOptionalRule.constraints = {};
  assert(
    validatePackageEditableFieldRules([clearedOptionalRule]).valid,
    "Clearing optional numeric constraints should remain valid.",
  );
}

const markerPackage = freshPackage();
markerPackage.editableFields = [];
const markerFields = getEffectiveEditableFields(markerPackage);
const markerHeadline = markerFields.find((field) => field.id === "headline");
assert(
  markerHeadline?.nodeId === headline.nodeId &&
    packageWithEffectiveEditableFields(markerPackage).editableFields.length === markerFields.length,
  "Field markers must synthesize the same effective editable contract.",
);

const missingField: EditableFieldBinding = {
  id: "missing",
  type: "text",
  nodeId: "missing-node",
  property: "text.characters",
  defaultValue: "",
};
const missingPackage = {
  ...freshPackage(),
  editableFields: [...imported.editableFields, missingField],
};
assert(
  getPackageEditorFieldTargetStatuses(missingPackage).some(
    (status) => status.field.id === "missing" && !status.targetExists,
  ) &&
    getPackageEditorFieldWarnings(missingPackage).some(
      (warning) => warning.code === "missing-target-node",
    ),
  "Missing field targets must remain diagnostic and non-throwing.",
);

const editedText = updateTemplatePackageField(
  imported,
  headline,
  "Portable field edit",
);
assert(
  editedText.applied !== false &&
    textValue(editedText.packageValue, headline.nodeId) === "Portable field edit" &&
    textValue(imported, headline.nodeId) !== "Portable field edit",
  "Text mutation must remain immutable and target the canonical node.",
);
assert(
  getPackageFieldValue(editedText.packageValue, headline) === "Portable field edit" &&
    getPackageFieldOverrideValue(imported, headline) === "",
  "Rendered and override field values must preserve default semantics.",
);

const booleanField: EditableFieldBinding = {
  id: "visible",
  type: "boolean",
  nodeId: imported.rootNodeId,
  property: "visible",
  defaultValue: true,
};
const hidden = updateTemplatePackageField(imported, booleanField, false);
assert(
  hidden.packageValue.nodes[imported.rootNodeId].appearance.visible === false,
  "Boolean fields must update visibility.",
);

const colorField: EditableFieldBinding = {
  id: "background",
  type: "color",
  nodeId: imported.rootNodeId,
  property: "appearance.fills",
  defaultValue: "#171717",
};
const recolored = updateTemplatePackageField(imported, colorField, "#ff3366");
const recoloredPaint = recolored.packageValue.nodes[imported.rootNodeId].appearance.fills[0];
assert(
  recoloredPaint?.type === "SOLID" &&
    recoloredPaint.color.r === 1 &&
    recoloredPaint.color.g === 0.2 &&
    recoloredPaint.color.b === 0.4,
  "Color fields must retain six-digit hexadecimal conversion.",
);

const constrainedText = withTextFieldConstraint(headline, "maxCharacters", 4);
assert(
  countGraphemes("A👨‍👩‍👧‍👦B") === 3 &&
    fieldCounter(constrainedText, "Test").state === "maximum" &&
    validateTextFieldValue(constrainedText, "Tests").some(
      (issue) => issue.code === "field-max-characters" && issue.blocksExport,
    ),
  "Grapheme-aware field limits must remain portable.",
);
assert(
  matchesFieldPattern("hello@example.com", "email") &&
    matchesFieldPattern("2026-07-23", "date") &&
    !matchesFieldPattern("not-an-email", "email"),
  "Portable field patterns must preserve accepted formats.",
);

const imageField: EditableFieldBinding = {
  id: "heroImage",
  type: "image",
  nodeId: "58:61",
  property: "image.assetId",
  defaultValue: "asset:image:21b94426",
  constraints: {
    allowedMimeTypes: ["image/png"],
    maxFileSizeMb: 1,
    minWidth: 8,
    minHeight: 8,
  },
};
assert(
  validateImageReplacement(imageField, {
    mimeType: "image/jpeg",
    sizeBytes: 2 * 1024 * 1024,
    width: 4,
    height: 4,
  }).map((issue) => issue.code).join(",") ===
    "image-type-not-allowed,image-file-too-large,image-width-too-small,image-height-too-small",
  "Image replacement diagnostics must retain deterministic ordering.",
);

const replacement = replaceTemplatePackageImage(
  imported,
  imageField,
  "data:image/png;base64,iVBORw0KGgo=",
  {
    assetId: "asset:image:user:portable",
    mimeType: "image/png",
    sizeBytes: 16,
    width: 10,
    height: 20,
  },
);
assert(
  replacement.packageValue.nodes[imageField.nodeId].image?.activePlacement?.state ===
    "replacement-fill",
  "Image replacement must establish replacement Fill authority.",
);
const fit = setTemplatePackageImageReplacementMode(
  replacement.packageValue,
  imageField,
  "replacement-fit",
);
assert(
  fit.packageValue.nodes[imageField.nodeId].image?.activePlacement?.state ===
    "replacement-fit" &&
    fit.packageValue.nodes[imageField.nodeId].image?.activePlacement?.revision === 2,
  "Image Fill/Fit switching must issue the next placement revision.",
);
const reset = clearTemplatePackageImageOverride(fit.packageValue, imageField);
assert(
  reset.packageValue.nodes[imageField.nodeId].image?.activePlacement?.state ===
    "imported-source" &&
    reset.packageValue.assets["asset:image:user:portable"] === undefined,
  "Image reset must restore imported authority and remove orphaned user assets.",
);

const fullyRestored = restoreImportedPackageForEditing(imported, replacement.packageValue);
assert(
  fullyRestored.assets["asset:image:user:portable"] === undefined &&
    textValue(fullyRestored, headline.nodeId) === textValue(imported, headline.nodeId),
  "Full restore must remove user replacements and restore imported field values.",
);

const fitResult = createTextFitResult(
  withTextFieldConstraint(headline, "maxLines", 1),
  {
    clientWidth: 100,
    clientHeight: 20,
    scrollWidth: 120,
    scrollHeight: 40,
    lineHeightPx: 20,
  },
  true,
);
assert(
  !fitResult.fits &&
    fitResult.measuredLines === 2 &&
    fitResult.overflowPx.x === 20 &&
    fitResult.reliable,
  "Text-fit projection must consume supplied measurements without DOM access.",
);

const readiness = analyzeFieldConstraintReadiness(imported, true);
assert(
  readiness.visualFitAvailable &&
    readiness.constrainedFieldCount + readiness.unconstrainedFieldCount > 0,
  "Constraint readiness must consume its browser capability as an explicit input.",
);
assert(
  validatePackageFieldConstraints(imported).exportReady,
  "The source fixture must remain export-ready under portable field validation.",
);

console.log("Portable field editing contract tests passed.");
