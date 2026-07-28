import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  EditableFieldBinding,
  TemplatePackageV1,
} from "../types";
import { createResolvedRenderTree } from "../resolved";
import { TemplatePackageRenderer } from "../render";
import { validateTemplatePackage } from "../validateTemplatePackage";
import {
  clearTemplatePackageImageOverride,
  replaceTemplatePackageImage,
  setTemplatePackageImageReplacementMode,
} from "./packageFieldBindings";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const original = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
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
  {
    assetId: "asset:image:user:crop-contract",
    mimeType: "image/png",
    width: 20,
    height: 10,
  },
).packageValue;
const fill = createResolvedRenderTree(replacement).nodes[field.nodeId].image;
const fillStatic = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: replacement,
    mode: "static",
  }),
);
const fillEditor = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: replacement,
    mode: "editor",
  }),
);
assert(
  fill?.activePlacementState === "replacement-fill" &&
    fill.scaleMode === "FILL" &&
    fill.placement.transformApplicability === "preserved-inapplicable" &&
    fill.transformMatrix === null &&
    [fillStatic, fillEditor].every(
      (markup) =>
        markup.includes(
          'data-package-image-active-state="replacement-fill"',
        ) &&
        markup.includes('data-package-image-scale-mode="FILL"') &&
        markup.includes(
          'data-package-image-transform-applicability="preserved-inapplicable"',
        ),
    ),
  "Replacement Fill must ignore imported CROP across shared static and editor render surfaces.",
);

const fitPackage = setTemplatePackageImageReplacementMode(
  replacement,
  field,
  "replacement-fit",
).packageValue;
const fit = createResolvedRenderTree(fitPackage).nodes[field.nodeId].image;
const fitStatic = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: fitPackage,
    mode: "static",
  }),
);
const fitEditor = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: fitPackage,
    mode: "editor",
  }),
);
assert(
  fit?.activePlacementState === "replacement-fit" &&
    fit.scaleMode === "FIT" &&
    fit.placement.transformApplicability === "preserved-inapplicable" &&
    fitPackage.nodes[field.nodeId].image?.activePlacement?.revision === 2 &&
    [fitStatic, fitEditor].every(
      (markup) =>
        markup.includes(
          'data-package-image-active-state="replacement-fit"',
        ) &&
        markup.includes('data-package-image-scale-mode="FIT"') &&
        markup.includes(
          'data-package-image-transform-applicability="preserved-inapplicable"',
        ),
    ),
  "Fill to Fit switching must be revisioned and identical across shared static/editor renderers.",
);

const fillAgain = setTemplatePackageImageReplacementMode(
  fitPackage,
  field,
  "replacement-fill",
).packageValue;
assert(
  fillAgain.nodes[field.nodeId].image?.activePlacement?.revision === 3 &&
    createResolvedRenderTree(fillAgain).nodes[field.nodeId].image?.scaleMode ===
      "FILL",
  "Fit to Fill switching must deterministically issue the next placement revision.",
);

const reset = clearTemplatePackageImageOverride(fillAgain, field).packageValue;
const restored = createResolvedRenderTree(reset).nodes[field.nodeId].image;
assert(
  reset.nodes[field.nodeId].image?.activePlacement?.state ===
    "imported-source" &&
    reset.nodes[field.nodeId].image?.activePlacement?.revision === 4 &&
    restored?.scaleMode === "CROP" &&
    restored.placement.transformApplicability === "active-crop",
  "Reset must restore imported CROP intent across the renderer integration.",
);
assert(
  createResolvedRenderTree(structuredClone(fitPackage)).nodes[field.nodeId]
    .image?.activePlacementState === "replacement-fit" &&
    validateTemplatePackage(structuredClone(fitPackage)).schemaValid,
  "Strict validation and structured-clone persistence must retain replacement Fit authority.",
);
