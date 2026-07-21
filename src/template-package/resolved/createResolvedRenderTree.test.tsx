import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import figmaPluginV040 from "../fixtures/figma-plugin-v0.4.0.json";
import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import simpleFixedPoster from "../fixtures/simple-fixed-poster.json";
import { TemplatePackageRenderer } from "../render/TemplatePackageRenderer";
import type {
  PackageAsset,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import { createResolvedRenderTree } from "./createResolvedRenderTree";
import { checkResolvedFontReadiness } from "./fontReadiness";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const textPackage = structuredClone(
  simpleFixedPoster,
) as unknown as TemplatePackageV1;
const textNode = textPackage.nodes.headline;
if (textNode.type !== "TEXT") {
  throw new Error("Text fixture should contain a headline TEXT node.");
}
textNode.text = {
  characters: "Resolved text",
  fontFamily: "Rethink Sans",
  fontPostScriptName: "RethinkSans-SemiBold",
  fontStyle: "Regular",
  fontWeight: 600,
  fontSize: 40,
  lineHeight: { value: 150, unit: "PERCENT" },
  letterSpacing: { value: 5, unit: "PERCENT" },
  textAlignHorizontal: "CENTER",
  textAlignVertical: "BOTTOM",
  textAutoResize: "HEIGHT",
};
textNode.appearance.clipContent = true;
textPackage.editableFields = textPackage.editableFields.map((field) =>
  field.id === "headline"
    ? { ...field, property: "text.characters" }
    : field,
);
textPackage.fontRequirements = [
  {
    id: "font:rethink-sans:600:normal",
    family: "Rethink Sans",
    style: "SemiBold",
    cssStyle: "normal",
    weight: 600,
    postScriptName: "RethinkSans-SemiBold",
    usedBy: ["headline"],
    characters: "Resolved text",
    editable: true,
    mixedStyle: false,
    source: "figma",
    availableInFigma: true,
  },
];
const textTree = createResolvedRenderTree(textPackage);
assert(
  textTree.nodes.headline.text?.lineHeightPx === 60,
  "Percent line-height should resolve against font size in pixels.",
);
assert(
  textTree.nodes.headline.text?.letterSpacingPx === 2,
  "Percent letter-spacing should resolve against font size in pixels.",
);
assert(
  textTree.nodes.headline.text?.alignVertical === "bottom" &&
    textTree.nodes.headline.text.overflow === "hidden",
  "Bottom text alignment and explicit clipping should survive resolution.",
);
assert(
  textTree.nodes.headline.text?.fontPostScriptName === "RethinkSans-SemiBold" &&
    textTree.nodes.headline.text.cssFontFamily ===
      '"Rethink Sans", system-ui, sans-serif',
  "Resolved text should preserve PostScript metadata and deterministic font fallback CSS.",
);
assert(
  textTree.warnings.some(
    (warning) =>
      warning.code === "resolved-font-missing" &&
      warning.nodeId === "headline",
  ) &&
    textTree.nodes.headline.fidelityDiagnostics.some(
      (diagnostic) => diagnostic.code === "resolved-font-missing",
    ),
  "Missing managed font assets should be attached to the affected resolved text node.",
);

const flowPackage = structuredClone(
  simpleFixedPoster,
) as unknown as TemplatePackageV1;
flowPackage.editableFields = flowPackage.editableFields.map((field) =>
  field.id === "headline"
    ? { ...field, property: "text.characters" }
    : field,
);
flowPackage.nodes.root.layout.mode = "VERTICAL";
flowPackage.nodes.headline.positioning = "ABSOLUTE";
const flowTree = createResolvedRenderTree(flowPackage);
assert(
  flowTree.nodes.headline.renderPositioning === "ABSOLUTE" &&
    flowTree.nodes.root.children[0] === "headline",
  "Absolute children should remain absolute while preserving flow-parent child order.",
);
assert(
  flowTree.nodes.headline.fieldMarkers.includes("field:text:headline"),
  "Editable field markers should remain mapped to their source node.",
);
assert(
  flowTree.contract === "resolved-template-graph-v1" &&
    flowTree.nodeOrder.join(",") === "root,headline" &&
    flowTree.nodes.root.childOrder.join(",") ===
      flowPackage.nodes.root.children.join(",") &&
    flowTree.nodes.headline.stackingIndex === 0 &&
    flowTree.nodes.headline.fieldTargetIds.includes("headline") &&
    flowTree.editableFieldTargets.headline?.targetExists,
  "The resolved graph should preserve source hierarchy order, stacking order, and editable field targets.",
);
assert(
  flowTree.editableFieldTargets.headline?.targetNodeType === "TEXT" &&
    flowTree.editableFieldTargets.headline.propertySupported,
  "Editable field target records should expose node type and supported-property status.",
);
flowPackage.nodes.headline.extensions = {
  figma: {
    rotation: 15,
    transformOrigin: { x: 25, y: 75, unit: "PERCENT" },
  },
};
const transformedFlowTree = createResolvedRenderTree(flowPackage);
assert(
  transformedFlowTree.nodes.headline.transform.hasRotation &&
    transformedFlowTree.nodes.headline.transform.rotation === 15 &&
    transformedFlowTree.nodes.headline.transform.transformOrigin === "25% 75%",
  "The resolved graph should carry transform metadata needed for runtime rendering.",
);

const imagePackage =
  figmaPluginV041 as unknown as TemplatePackageV1;
const imageTree = createResolvedRenderTree(imagePackage);
const resolvedImage = Object.values(imageTree.nodes).find(
  (node) => node.image?.assetId,
);
assert(
    resolvedImage?.image?.source?.startsWith("data:image/") &&
    resolvedImage.image.objectFit === "cover" &&
    resolvedImage.image.renderMode === "object-fit-cover" &&
    resolvedImage.image.cropMode === "objectFitOnly" &&
    resolvedImage.image.placement.transformApplicability === "preserved-inapplicable",
  "Source-certified FILL should use one cover operation and preserve CROP-only transform data as inapplicable provenance.",
);

const imageNodeId = resolvedImage?.id;
if (!imageNodeId) throw new Error("Image fixture should resolve an image node.");
for (const [scaleMode, expectedMode] of [
  ["FILL", "object-fit-cover"],
  ["FIT", "object-fit-contain"],
  ["CROP", "object-fit-cover"],
  ["TILE", "tile"],
] as const) {
  const packageWithMode = structuredClone(imagePackage);
  const imageNode = packageWithMode.nodes[imageNodeId];
  if (!imageNode.image) throw new Error("Image fixture payload is missing.");
  imageNode.image.scaleMode = scaleMode;
  imageNode.image.imageTransform = undefined;
  const treeWithMode = createResolvedRenderTree(packageWithMode);
  assert(
    treeWithMode.nodes[imageNodeId].image?.renderMode === expectedMode,
    `${scaleMode} should resolve to ${expectedMode}.`,
  );
}

const imageTransformMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: imagePackage,
  }),
);
assert(
    imageTransformMarkup.includes(
    'data-package-image-render-mode="object-fit-cover"',
  ) &&
    imageTransformMarkup.includes('data-package-image-crop-mode="objectFitOnly"') &&
    imageTransformMarkup.includes('data-package-image-transform-applicability="preserved-inapplicable"') &&
    !imageTransformMarkup.includes("object-fit:fill"),
  "Imported fixed FILL should ignore imageTransform and preserve aspect ratio.",
);

const dynamicFillPackage = structuredClone(imagePackage);
const dynamicFillNode = dynamicFillPackage.nodes[imageNodeId];
dynamicFillNode.sizing.vertical = { mode: "FILL", value: null, min: null, max: null };
const dynamicFillTree = createResolvedRenderTree(dynamicFillPackage);
assert(
  dynamicFillTree.nodes[imageNodeId].image?.cropMode === "objectFitOnly" &&
    dynamicFillTree.nodes[imageNodeId].image?.placement.transformApplicability === "preserved-inapplicable",
  "A dynamic FILL slot should use native cover and preserve a CROP-only imageTransform as inapplicable provenance.",
);

const activeCropPackage = structuredClone(imagePackage);
const activeCropNode = activeCropPackage.nodes[imageNodeId];
if (!activeCropNode.image) throw new Error("Image fixture payload is missing.");
activeCropNode.image.scaleMode = "CROP";
activeCropNode.appearance.clipContent = true;
const activeCropMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, { packageValue: activeCropPackage }),
);
assert(
  activeCropMarkup.includes('data-package-image-render-mode="figma-image-transform"') &&
    activeCropMarkup.includes('data-package-image-transform-applicability="active-crop"') &&
    activeCropMarkup.includes('data-package-image-css-transform=') &&
    activeCropMarkup.includes('transform-origin:0 0') &&
    activeCropMarkup.includes('object-fit:fill'),
  "CROP should invert the normalized source transform once and render it inside the clipped slot.",
);

const vectorPackage = structuredClone(
  simpleFixedPoster,
) as unknown as TemplatePackageV1;
const vectorAsset: PackageAsset = {
  id: "asset:svg:resolved",
  type: "svg",
  source: "embedded",
  mimeType: "image/svg+xml",
  svgString:
    '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>',
  viewBox: "0 0 10 10",
};
vectorPackage.assets[vectorAsset.id] = vectorAsset;
vectorPackage.nodes.vector = {
  ...structuredClone(vectorPackage.nodes.headline),
  id: "vector",
  name: "Resolved vector",
  type: "VECTOR",
  parentId: "root",
  children: [],
  vector: {
    assetId: vectorAsset.id,
    renderMode: "SVG_ASSET",
    viewBox: "0 0 10 10",
    preserveAspectRatio: "xMidYMid meet",
  },
} as TemplateNode;
vectorPackage.nodes.root.children.push("vector");
const vectorTree = createResolvedRenderTree(vectorPackage);
assert(
  vectorTree.nodes.vector.vector?.source?.startsWith(
    "data:image/svg+xml",
  ) &&
    vectorTree.nodes.vector.vector?.viewBox === "0 0 10 10" &&
    vectorTree.nodes.vector.vector.source.includes(
      "preserveAspectRatio%3D%22xMidYMid%20meet%22",
    ) &&
    !vectorTree.nodes.vector.vector.source.includes(
      "width%3D%2210%22",
    ),
  "SVG assets should resolve their source, viewBox, and aspect behavior.",
);
const inferredVectorPackage = structuredClone(vectorPackage);
if (!inferredVectorPackage.nodes.vector.vector) throw new Error("Vector fixture must retain vector source semantics.");
delete inferredVectorPackage.nodes.vector.vector.renderMode;
const inferredVectorTree = createResolvedRenderTree(inferredVectorPackage);
assert(
  inferredVectorTree.nodes.vector.vector?.renderMode === "SVG_ASSET" &&
    inferredVectorTree.nodes.vector.vector.renderModeSource === "asset-evidence" &&
    inferredVectorTree.nodes.vector.backendDecision.runtimeOwner === "vector-svg" &&
    !inferredVectorTree.nodes.vector.backendDecision.fallback.active,
  "An omitted vector render mode must infer SVG ownership only from a successfully resolved SVG asset and retain provenance.",
);
const explicitlyUnsupportedVectorPackage = structuredClone(vectorPackage);
if (!explicitlyUnsupportedVectorPackage.nodes.vector.vector) throw new Error("Vector fixture must retain vector source semantics.");
explicitlyUnsupportedVectorPackage.nodes.vector.vector.renderMode = "UNSUPPORTED";
const explicitlyUnsupportedVectorTree = createResolvedRenderTree(explicitlyUnsupportedVectorPackage);
assert(
  explicitlyUnsupportedVectorTree.nodes.vector.vector?.renderMode === "UNSUPPORTED" &&
    explicitlyUnsupportedVectorTree.nodes.vector.vector.renderModeSource === "explicit" &&
    explicitlyUnsupportedVectorTree.nodes.vector.backendDecision.disposition === "unsupported" &&
    explicitlyUnsupportedVectorTree.nodes.vector.backendDecision.fallback.active,
  "An explicit unsupported vector mode must never be replaced by asset inference.",
);

const flattenPackage = structuredClone(
  simpleFixedPoster,
) as unknown as TemplatePackageV1;
flattenPackage.nodes.headline.name = "flatten:headline";
const flattenTree = createResolvedRenderTree(flattenPackage);
assert(
  flattenTree.nodes.headline.renderStrategy === "fallback" &&
    flattenTree.warnings.some(
      (warning) => warning.code === "resolved-flatten-asset-missing",
    ),
  "flatten:* markers should prefer an asset and warn when none exists.",
);

const flattenedAssetPackage = structuredClone(
  flattenPackage,
) as TemplatePackageV1;
flattenedAssetPackage.assets[vectorAsset.id] = {
  ...vectorAsset,
  nodeId: "headline",
};
const flattenedAssetTree = createResolvedRenderTree(
  flattenedAssetPackage,
);
assert(
  flattenedAssetTree.nodes.headline.renderStrategy === "asset" &&
    flattenedAssetTree.nodes.headline.vector?.flattened === true &&
    flattenedAssetTree.nodes.headline.vector.source?.startsWith(
      "data:image/svg+xml",
    ),
  "flatten:* markers should prefer a matching flattened asset.",
);

const oldPackage =
  figmaPluginV040 as unknown as TemplatePackageV1;
const oldTree = createResolvedRenderTree(oldPackage);
assert(
  oldTree.rootNodeId === oldPackage.rootNodeId &&
    oldTree.summary.nodeCount === Object.keys(oldPackage.nodes).length,
  "Existing v1 package variants should resolve without migration-only assumptions.",
);

const resolvedMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: textPackage,
    resolvedTree: textTree,
    debugOverlay: true,
  }),
);
assert(
  resolvedMarkup.includes(
    'data-resolved-render-tree="resolved-render-tree-v1"',
  ) &&
    resolvedMarkup.includes('data-package-debug-overlay="headline"') &&
    resolvedMarkup.includes("field:text:headline"),
  "The renderer should consume resolved nodes and expose developer debug metadata.",
);
assert(
  resolvedMarkup.includes("line-height:60px") &&
    resolvedMarkup.includes("letter-spacing:2px") &&
    resolvedMarkup.includes('data-package-font-postscript="RethinkSans-SemiBold"') &&
    resolvedMarkup.includes('data-package-font-status="missing"'),
  "The renderer should apply resolved text metrics and expose missing-font metadata.",
);

const inferredWeightPackage = structuredClone(textPackage);
const inferredWeightNode = inferredWeightPackage.nodes.headline;
if (inferredWeightNode.type === "TEXT" && "characters" in inferredWeightNode.text) {
  inferredWeightNode.text.fontWeight = null;
  inferredWeightNode.text.fontStyle = "Semi Bold";
}
delete inferredWeightPackage.fontRequirements;
const inferredWeightTree = createResolvedRenderTree(inferredWeightPackage);
assert(
  inferredWeightTree.nodes.headline.text?.fontWeight === 600,
  "Semibold style names should infer 600 instead of being swallowed by the generic bold match.",
);

const fallbackMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: oldPackage,
    resolvedTree: null,
  }),
);
assert(
  fallbackMarkup.includes('data-resolved-render-tree="package-fallback"') &&
    fallbackMarkup.includes(
      `data-package-node-id="${oldPackage.rootNodeId}"`,
    ),
  "The package fallback renderer should remain available.",
);

const loadedFonts = await checkResolvedFontReadiness(textTree, {
  ready: Promise.resolve(),
  check: () => true,
  load: async () => [{}],
});
assert(
  loadedFonts.reliable &&
    loadedFonts.exportReady &&
    loadedFonts.missing.length === 0 &&
    loadedFonts.groups.some(
      (group) =>
        group.family === "Rethink Sans" &&
        group.faces.some(
          (font) =>
            font.weight === 600 &&
            font.status === "loaded" &&
            font.source === "application" &&
            font.verified &&
            font.deterministicForExport &&
            font.usedBy.includes("headline"),
        ),
    ),
  "Loaded manifest fonts should keep visual diff reliability true.",
);

const missingFonts = await checkResolvedFontReadiness(textTree, {
  ready: Promise.resolve(),
  check: () => false,
  load: async () => [],
});
assert(
  !missingFonts.reliable &&
    missingFonts.missing.some(
      (font) => font.family === "Rethink Sans" && font.weight === 600,
    ),
  "Missing required fonts should mark visual diff reliability false.",
);

const wrongWeightFonts = await checkResolvedFontReadiness(textTree, {
  ready: Promise.resolve(),
  check: () => true,
  load: async () => [{}],
}, [
  { family: "Rethink Sans", weight: 400, style: "normal" },
]);
assert(
  !wrongWeightFonts.reliable &&
    wrongWeightFonts.missing.some(
      (font) => font.family === "Rethink Sans" && font.weight === 600,
    ),
  "A loaded family with the wrong manifest weight should remain unreliable.",
);
assert(
  wrongWeightFonts.fallback.some(
    (font) =>
      font.family === "Rethink Sans" &&
      font.fallbackFamily === "system-ui, sans-serif",
  ),
  "Known families with unavailable weights should be reported as explicit fallbacks.",
);

const packageRequirements = [
  {
    id: "font:rethink-sans:700:normal",
    family: "Rethink Sans",
    weight: 700,
    style: "normal" as const,
    usedBy: ["headline"],
    characters: "Resolved text",
    postScriptName: "RethinkSans-Bold",
  },
];
const exactPackageFonts = await checkResolvedFontReadiness(
  textTree,
  {
    ready: Promise.resolve(),
    check: () => true,
    load: async () => [{}],
  },
  [
    { family: "Rethink Sans", weight: 600, style: "normal" },
    { family: "Rethink Sans", weight: 700, style: "normal" },
  ],
  packageRequirements,
);
assert(
  exactPackageFonts.reliable &&
    exactPackageFonts.required[0]?.weight === 700 &&
    exactPackageFonts.required[0]?.postScriptName ===
      "RethinkSans-Bold",
  "Exporter font requirements should drive exact face readiness checks.",
);

const approvedFallbackFonts = await checkResolvedFontReadiness(
  textTree,
  {
    ready: Promise.resolve(),
    check: () => true,
    load: async () => [{}],
  },
  [],
  [
    {
      ...packageRequirements[0],
      resolution: {
        match: "fallback",
        confirmed: true,
        fallbackFamily: "Arial",
      },
    },
  ],
);
assert(
  !approvedFallbackFonts.reliable &&
    approvedFallbackFonts.exportReady &&
    approvedFallbackFonts.required[0]?.source === "fallback" &&
    approvedFallbackFonts.required[0]?.verified &&
    approvedFallbackFonts.required[0]?.deterministicForExport,
  "A confirmed fallback should remain a fidelity warning while becoming deterministic for export.",
);

const outlinedPackage = structuredClone(
  textPackage,
) as TemplatePackageV1;
outlinedPackage.assets["asset:svg:text-outline"] = {
  id: "asset:svg:text-outline",
  type: "svg",
  source: "embedded",
  mimeType: "image/svg+xml",
  svgString:
    '<svg viewBox="0 0 100 20"><path d="M0 0h100v20H0z"/></svg>',
};
if (outlinedPackage.nodes.headline.type !== "TEXT") {
  throw new Error("Outlined fallback fixture requires a text node.");
}
outlinedPackage.nodes.headline.textFallback = {
  type: "outlined-svg",
  assetId: "asset:svg:text-outline",
};
outlinedPackage.editableFields = [];
const outlinedMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: outlinedPackage,
  }),
);
assert(
  outlinedMarkup.includes('data-package-text-outline="headline"'),
  "Non-editable text should use a supplied outlined SVG fallback.",
);

const unresolvedAssetPackage = structuredClone(
  simpleFixedPoster,
) as unknown as TemplatePackageV1;
unresolvedAssetPackage.nodes.image = {
  ...structuredClone(unresolvedAssetPackage.nodes.headline),
  id: "image",
  name: "Missing image",
  type: "IMAGE",
  parentId: "root",
  children: [],
  image: {
    assetId: "asset:image:missing",
    deferred: false,
    scaleMode: "FILL",
  },
} as TemplateNode;
unresolvedAssetPackage.nodes.root.children.push("image");
const unresolvedAssetTree = createResolvedRenderTree(unresolvedAssetPackage);
assert(
  unresolvedAssetTree.assetRefs["asset:image:missing"]?.source === "missing" &&
    !unresolvedAssetTree.assetRefs["asset:image:missing"].renderable &&
    unresolvedAssetTree.nodes.image.assetRefs.includes("asset:image:missing") &&
    unresolvedAssetTree.warnings.some(
      (warning) => warning.code === "resolved-asset-ref-missing",
    ),
  "Unresolved asset references should be represented in the graph without crashing.",
);

const missingChildPackage = structuredClone(
  simpleFixedPoster,
) as unknown as TemplatePackageV1;
missingChildPackage.nodes.root.children.push("missing-child");
const missingChildTree = createResolvedRenderTree(missingChildPackage);
assert(
  missingChildTree.nodeOrder.join(",") === "root,headline" &&
    missingChildTree.nodes.root.childOrder.includes("missing-child") &&
    missingChildTree.warnings.some(
      (warning) => warning.code === "resolved-child-node-missing",
    ),
  "Missing child references should remain visible as graph warnings while resolvable nodes render.",
);
