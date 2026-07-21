import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  EditableFieldBinding,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../types";
import { createResolvedRenderTree } from "../resolved";
import { TemplatePackageRenderer } from "../render";
import { validateTemplatePackage } from "../validateTemplatePackage";
import {
  clearTemplatePackageImageOverride,
  getEffectiveEditableFields,
  getPackageEditorFieldTargetStatuses,
  getPackageEditorFieldWarnings,
  replaceTemplatePackageImage,
  restoreImportedPackageForEditing,
  setTemplatePackageImageReplacementMode,
  updateTemplatePackageField,
} from "./packageFieldBindings";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function freshPackage(): TemplatePackageV1 {
  return structuredClone(
    figmaPluginV041 as unknown as TemplatePackageV1,
  );
}

function textCharacters(
  packageValue: TemplatePackageV1,
  nodeId: string,
): string | undefined {
  const node = packageValue.nodes[nodeId];
  if (node?.type !== "TEXT" || !("characters" in node.text)) return undefined;
  return node.text.characters;
}

const headlineField =
  (figmaPluginV041.editableFields[0] as EditableFieldBinding);

{
  const imported = freshPackage();
  const current = freshPackage();
  const assetId = Object.keys(current.assets)[0];
  if (!assetId) throw new Error("Fixture requires an asset.");
  delete imported.assets[assetId];
  const userAssetId = "asset:image:user:reset-test";
  current.assets[userAssetId] = {
    ...structuredClone(current.assets[assetId]),
    id: userAssetId,
  };
  const restored = restoreImportedPackageForEditing(imported, current);
  assert(
    restored.assets[assetId]?.id === assetId &&
      restored.assets[userAssetId] === undefined &&
      imported.assets[assetId] === undefined,
    "Resetting imported field rules should preserve normalized runtime assets without retaining user replacements or mutating the baseline.",
  );
}

{
  const original = freshPackage();
  const descriptors = getEffectiveEditableFields(original);
  assert(
    descriptors.length === original.editableFields.length &&
      descriptors[0]?.id === original.editableFields[0]?.id,
    "Exported editableFields descriptors should be preferred when present.",
  );
}

{
  const original = freshPackage();
  const requirement: TemplatePackageFontRequirement = {
    id: "font:linked:500:normal",
    family: "Linked Sans",
    style: "Medium",
    cssStyle: "normal" as const,
    weight: 500,
    postScriptName: "LinkedSans-Medium",
    usedBy: [headlineField.nodeId],
    characters: "Font-preserving edit",
    editable: true,
    mixedStyle: false,
    source: "test",
    availableInFigma: false,
  };
  original.fontRequirements = [requirement];
  requirement.assetId = "asset:font:linked";
  requirement.resolution = {
    managedFontId: "managed-font:linked:0",
    match: "exact",
    classification: "exact",
    confirmed: true,
    requestId: requirement.id,
    faceIndex: 0,
    binaryHash: "a".repeat(64),
    runtimeFamily: "__template_font_aaaaaaaaaaaaaaaa_0_static",
    effectiveFamily: requirement.family,
    effectiveWeight: requirement.weight,
    effectiveStyle: requirement.cssStyle,
  };
  const linkedIdentity = JSON.stringify(original.fontRequirements);
  const edited = updateTemplatePackageField(
    original,
    headlineField,
    "Font-preserving edit",
  ).packageValue;
  const reset = restoreImportedPackageForEditing(original, edited);
  assert(
    JSON.stringify(edited.fontRequirements) === linkedIdentity &&
      JSON.stringify(reset.fontRequirements) === linkedIdentity,
    "Text edits and reset must preserve the exact linked face, weight, style, runtime identity, and history.",
  );
}

{
  const original = freshPackage();
  const markerOnlyPackage = structuredClone(original);
  markerOnlyPackage.editableFields = [];
  const fallbackFields = getEffectiveEditableFields(markerOnlyPackage);
  assert(
    fallbackFields.some(
      (field) =>
        field.id === "headline" &&
        field.type === "textarea" &&
        field.nodeId === headlineField.nodeId &&
        field.property === "text.characters",
    ),
    "Packages without descriptors should derive fallback controls from field:type:id node names.",
  );
  const update = updateTemplatePackageField(
    markerOnlyPackage,
    fallbackFields.find((field) => field.id === "headline")!,
    "Fallback marker update",
  );
  assert(
    textCharacters(update.packageValue, headlineField.nodeId) ===
      "Fallback marker update",
    "Field-marker fallback controls should update the intended text node.",
  );
}

{
  const original = freshPackage();
  const field: EditableFieldBinding = {
    id: "missing",
    type: "text",
    nodeId: "missing-node",
    property: "text.characters",
    defaultValue: "",
  };
  const withMissingField = {
    ...original,
    editableFields: [...original.editableFields, field],
  };
  const statuses = getPackageEditorFieldTargetStatuses(withMissingField);
  assert(
    statuses.some(
      (status) =>
        status.field.id === "missing" &&
        !status.targetExists &&
        !status.propertySupported,
    ),
    "Missing editable field targets should resolve to a non-crashing warning status.",
  );
  assert(
    getPackageEditorFieldWarnings(withMissingField).some(
      (item) => item.code === "missing-target-node",
    ),
    "Missing editable field targets should produce editor diagnostics.",
  );
}

{
  const original = freshPackage();
  const update = updateTemplatePackageField(
    original,
    { ...headlineField, type: "text" },
    "Updated text",
  );
  assert(!update.warning, "Text updates should be accepted.");
  assert(
    textCharacters(update.packageValue, headlineField.nodeId) === "Updated text",
    "Text fields should update text.characters.",
  );
  assert(
    textCharacters(original, headlineField.nodeId) === "Read our blog.",
    "Text updates must not mutate the imported package.",
  );
}

{
  const original = freshPackage();
  const update = updateTemplatePackageField(
    original,
    headlineField,
    "First line\nSecond line",
  );
  assert(!update.warning, "Textarea updates should be accepted.");
  assert(
    textCharacters(update.packageValue, headlineField.nodeId) ===
      "First line\nSecond line",
    "Textarea fields should preserve line breaks in text.characters.",
  );
  assert(
    textCharacters(original, headlineField.nodeId) === "Read our blog.",
    "Textarea updates must leave the imported package unchanged.",
  );
}

{
  const original = freshPackage();
  const field: EditableFieldBinding = {
    id: "showTemplate",
    label: "Show Template",
    type: "boolean",
    nodeId: original.rootNodeId,
    property: "visible",
    defaultValue: true,
  };
  const update = updateTemplatePackageField(original, field, false);
  assert(!update.warning, "Boolean updates should be accepted.");
  assert(
    update.packageValue.nodes[original.rootNodeId].appearance.visible === false,
    "Boolean fields should update node visibility.",
  );
  assert(
    original.nodes[original.rootNodeId].appearance.visible === true,
    "Boolean updates must leave the imported package unchanged.",
  );
}

{
  const original = freshPackage();
  const field: EditableFieldBinding = {
    id: "backgroundColor",
    label: "Background Color",
    type: "color",
    nodeId: original.rootNodeId,
    property: "appearance.fills",
    defaultValue: "#171717",
  };
  const update = updateTemplatePackageField(original, field, "#ff3366");
  const updatedFill =
    update.packageValue.nodes[original.rootNodeId].appearance.fills[0];
  const originalFill = original.nodes[original.rootNodeId].appearance.fills[0];
  assert(!update.warning, "Color updates should be accepted for SOLID fills.");
  assert(
    updatedFill.type === "SOLID" &&
      updatedFill.color.r === 1 &&
      updatedFill.color.g === 0.2 &&
      updatedFill.color.b === 0.4,
    "Color fields should update the first SOLID fill.",
  );
  assert(
    originalFill.type === "SOLID" && originalFill.color.r === 0.09,
    "Color updates must leave the imported package unchanged.",
  );
}

{
  const original = freshPackage();
  const field: EditableFieldBinding = {
    id: "heroImage",
    label: "Hero Image",
    type: "image",
    nodeId: "58:61",
    property: "image.assetId",
    defaultValue: "asset:image:21b94426",
  };
  const update = replaceTemplatePackageImage(
    original,
    field,
    "data:image/png;base64,iVBORw0KGgo=",
    {
      assetId: "asset:image:user:test",
      mimeType: "image/png",
      width: 10,
      height: 20,
    },
  );
  assert(!update.warning, "Embedded PNG replacements should be accepted.");
  assert(
    update.packageValue.assets["asset:image:user:test"]?.dataUrl ===
      "data:image/png;base64,iVBORw0KGgo=",
    "Image replacement should add an embedded asset.",
  );
  assert(
    update.packageValue.nodes["58:61"].image?.assetId ===
      "asset:image:user:test",
    "Image replacement should update the target node asset ID.",
  );
  assert(
    update.packageValue.nodes["58:61"].image?.scaleMode === "FILL",
    "Image replacement should preserve immutable imported source mode metadata.",
  );
  assert(
    update.packageValue.nodes["58:61"].image?.activePlacement?.state === "replacement-fill" &&
      update.packageValue.nodes["58:61"].image?.activePlacement?.revision === 1 &&
      createResolvedRenderTree(update.packageValue).nodes["58:61"].image?.scaleMode === "FILL",
    "A new replacement should transfer active placement authority to revisioned replacement Fill.",
  );
  assert(
    original.nodes["58:61"].image?.assetId === "asset:image:21b94426",
    "Image replacement must leave the imported package unchanged.",
  );
  assert(
    original.assets["asset:image:user:test"] === undefined,
    "Image replacement must not add assets to the imported package.",
  );
  const cleared = clearTemplatePackageImageOverride(update.packageValue, field);
  assert(
    !cleared.warning &&
      cleared.packageValue.nodes["58:61"].image?.assetId === "asset:image:21b94426" &&
      cleared.packageValue.assets["asset:image:user:test"] === undefined &&
      cleared.packageValue.nodes["58:61"].image?.activePlacement?.state === "imported-source" &&
      cleared.packageValue.nodes["58:61"].image?.activePlacement?.revision === 2,
    "Clearing an image override should restore imported authority and issue a new placement revision.",
  );
}

{
  const original = freshPackage();
  const field: EditableFieldBinding = {
    id: "heroImage",
    label: "Hero Image",
    type: "image",
    nodeId: "58:61",
    property: "image.assetId",
    defaultValue: "asset:image:21b94426",
    constraints: {
      replacementMode: "contain",
      aspectRatio: "preserve-frame",
    },
  };
  original.editableFields = [field];
  const update = replaceTemplatePackageImage(
    original,
    field,
    "data:image/png;base64,iVBORw0KGgo=",
    {
      assetId: "asset:image:user:contain",
      mimeType: "image/png",
      width: 10,
      height: 20,
      placementState: "replacement-fit",
    },
  );
  assert(
    update.packageValue.nodes["58:61"].image?.scaleMode ===
      original.nodes["58:61"].image?.scaleMode &&
      createResolvedRenderTree(update.packageValue).nodes["58:61"].image
        ?.scaleMode === "FIT",
    "Explicit replacement Fit should resolve contain without overwriting imported source mode.",
  );
  assert(
    getPackageEditorFieldTargetStatuses(update.packageValue).some(
      (status) =>
        status.field.id === "heroImage" &&
        status.constraints.aspectRatio === "preserve-frame" &&
        status.constraints.scaleMode === original.nodes["58:61"].image?.scaleMode,
    ),
    "Image field target status should expose imported geometry while resolved rendering applies the replacement policy.",
  );
}

{
  const original = freshPackage();
  const field: EditableFieldBinding = {
    id: "cropImage",
    label: "Crop Image",
    type: "image",
    nodeId: "58:61",
    property: "image.assetId",
    defaultValue: "asset:image:21b94426",
  };
  original.editableFields = [field];
  const sourceNode = original.nodes[field.nodeId];
  if (!sourceNode.image) throw new Error("Image fixture payload is missing.");
  sourceNode.image.scaleMode = "CROP";
  sourceNode.image.imageTransform = [[0.5, 0, 0.25], [0, 0.5, 0.1]];
  const replacement = replaceTemplatePackageImage(
    original,
    field,
    "data:image/png;base64,iVBORw0KGgo=",
    { assetId: "asset:image:user:crop-contract", mimeType: "image/png", width: 20, height: 10 },
  ).packageValue;
  const fill = createResolvedRenderTree(replacement).nodes[field.nodeId].image;
  const fillStatic = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue: replacement, mode: "static" }));
  const fillEditor = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue: replacement, mode: "editor" }));
  assert(
    fill?.activePlacementState === "replacement-fill" &&
      fill.scaleMode === "FILL" &&
      fill.placement.transformApplicability === "preserved-inapplicable" &&
      fill.transformMatrix === null &&
      [fillStatic, fillEditor].every((markup) =>
        markup.includes('data-package-image-active-state="replacement-fill"') &&
        markup.includes('data-package-image-scale-mode="FILL"') &&
        markup.includes('data-package-image-transform-applicability="preserved-inapplicable"'),
      ),
    "Replacement Fill must ignore imported CROP across shared static and editor render surfaces.",
  );
  const fitPackage = setTemplatePackageImageReplacementMode(
    replacement,
    field,
    "replacement-fit",
  ).packageValue;
  const fit = createResolvedRenderTree(fitPackage).nodes[field.nodeId].image;
  const fitStatic = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue: fitPackage, mode: "static" }));
  const fitEditor = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue: fitPackage, mode: "editor" }));
  assert(
    fit?.activePlacementState === "replacement-fit" &&
      fit.scaleMode === "FIT" &&
      fit.placement.transformApplicability === "preserved-inapplicable" &&
      fitPackage.nodes[field.nodeId].image?.activePlacement?.revision === 2 &&
      [fitStatic, fitEditor].every((markup) =>
        markup.includes('data-package-image-active-state="replacement-fit"') &&
        markup.includes('data-package-image-scale-mode="FIT"') &&
        markup.includes('data-package-image-transform-applicability="preserved-inapplicable"'),
      ),
    "Fill to Fit switching must be revisioned and identical across shared static/editor renderers.",
  );
  const fillAgainPackage = setTemplatePackageImageReplacementMode(
    fitPackage,
    field,
    "replacement-fill",
  ).packageValue;
  assert(
    fillAgainPackage.nodes[field.nodeId].image?.activePlacement?.revision === 3 &&
      createResolvedRenderTree(fillAgainPackage).nodes[field.nodeId].image?.scaleMode === "FILL",
    "Fit to Fill switching must deterministically issue the next placement revision.",
  );
  const reset = clearTemplatePackageImageOverride(fillAgainPackage, field).packageValue;
  const restored = createResolvedRenderTree(reset).nodes[field.nodeId].image;
  assert(
    reset.nodes[field.nodeId].image?.activePlacement?.state === "imported-source" &&
      reset.nodes[field.nodeId].image?.activePlacement?.revision === 4 &&
      restored?.scaleMode === "CROP" &&
      restored.placement.transformApplicability === "active-crop",
    "Reset must restore the exact imported CROP intent and transform under a new revision.",
  );
  const reloaded = structuredClone(fitPackage);
  assert(
    createResolvedRenderTree(reloaded).nodes[field.nodeId].image?.activePlacementState === "replacement-fit" &&
      validateTemplatePackage(reloaded).schemaValid,
    "Strict schema validation and structured-clone persistence must retain replacement Fit authority.",
  );
}

{
  const original = freshPackage();
  const field: EditableFieldBinding = {
    id: "unsafe",
    type: "text",
    nodeId: headlineField.nodeId,
    property: "extensions.figma.rotation",
    defaultValue: "",
  };
  const update = updateTemplatePackageField(original, field, "90");
  assert(
    update.warning?.code === "unsupported-property-path",
    "Unsupported property paths should return a non-blocking warning.",
  );
  assert(
    update.packageValue === original,
    "Unsupported property paths should not clone or mutate the package.",
  );
}
