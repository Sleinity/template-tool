import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import simpleFixedPoster from "../fixtures/simple-fixed-poster.json";
import { TemplatePackageRenderer } from "../render/TemplatePackageRenderer";
import { createResolvedRenderTree } from "../resolved";
import type { PackageSolidPaint, PackageStroke, TemplateNode, TemplatePackageV1 } from "../types";
import {
  collectPrimitiveAncestorClipChain,
  primitiveTreeRevision,
  resizePrimitiveAppearance,
  resolvePrimitiveAppearance,
  resolvePrimitiveCanvasAuthority,
} from "./resolvePrimitiveAppearance";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function primitiveNode(): TemplateNode {
  return {
    id: "primitive",
    name: "Source rectangle",
    type: "RECTANGLE",
    parentId: "root",
    children: [],
    bounds: {
      absolute: { x: 10, y: 10, width: 96, height: 64 },
      relative: { x: 10, y: 10, width: 96, height: 64 },
    },
    positioning: { mode: "ABSOLUTE" },
    layout: {
      mode: "NONE",
      wrap: false,
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAlignment: "MIN",
      counterAlignment: "MIN",
      clipContent: true,
    },
    sizing: {
      horizontal: { mode: "FIXED", value: 96 },
      vertical: { mode: "FIXED", value: 64 },
    },
    appearance: {
      opacity: 1,
      fills: [{
        type: "SOLID",
        color: { r: 1, g: 1, b: 1, a: 1 },
        opacity: 1,
        visible: true,
        blendMode: "NORMAL",
      }],
      strokes: [{
        paint: {
          type: "SOLID",
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true,
          blendMode: "NORMAL",
        },
        weight: 2.4,
        align: "INSIDE",
      }],
      effects: [],
      cornerRadius: 999,
      strokeWeight: 2.4,
      strokeAlign: "INSIDE",
      clipContent: true,
    },
    shape: { type: "RECTANGLE", cornerRadius: 999 },
    extensions: {
      figma: {
        relativeTransform: [[1, 0, 10], [0, 1, 10]],
        strokesIncludedInLayout: false,
      },
    },
  };
}

function packageWithPrimitive(): TemplatePackageV1 {
  const packageValue = structuredClone(simpleFixedPoster) as unknown as TemplatePackageV1;
  const primitive = primitiveNode();
  packageValue.nodes.root.children = [primitive.id];
  packageValue.nodes[primitive.id] = primitive;
  packageValue.canvas.background = { r: 0.1, g: 0.2, b: 0.3, a: 1 };
  return packageValue;
}

function certifiedSolid(
  sourceIndex: number,
  rgb: { r: number; g: number; b: number },
  opacity: number,
  visible = true,
): PackageSolidPaint {
  return {
    type: "SOLID",
    color: { ...rgb, a: 1 },
    opacity,
    visible,
    blendMode: "NORMAL",
    solidPaintSource: {
      schemaVersion: "solid-paint-source-v1",
      sourceIndex,
      pairing: "source-index",
      canonicalPath: `nodes.primitive.appearance.fills.${sourceIndex}`,
      rawFigmaPath: null,
      sourceContract: "figma-plugin-api-solid-paint-rgb-opacity",
      exporterCompatibility: "plugin-0.6.0-mirrored-color-alpha",
      opacityDisposition: "mirrored-compatibility-alias",
      serializedColorAlpha: opacity,
      serializedPaintOpacity: opacity,
      sourcePaintOpacity: opacity,
      canonicalColorAlpha: 1,
      canonicalPaintOpacity: opacity,
      effectiveOpacity: opacity,
      effectiveOpacityRule: "paint-opacity-once",
      equalityTolerance: 1e-6,
      confidenceBasis: "figma-contract-plus-affected-exporter-equal-values",
      normalizationRevision: "solid-paint-opacity-normalization-v1",
      conflicts: [],
    },
  };
}

const packageValue = packageWithPrimitive();
const primitive = packageValue.nodes.primitive;
const resolved = resolvePrimitiveAppearance(primitive, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
});
assert(resolved.ownership === "primitive-authoritative", "A single opaque solid rectangle with one opaque INSIDE stroke must select primitive authority.");
assert(resolved.geometry.corner.clamped && resolved.geometry.corner.effective.every((value) => value === 32), "Figma corner radius must clamp to half the shortest live side.");
assert(resolved.paints.layers[0].sourceIndex === 0 && resolved.paints.layers[0].effectiveAlpha === 1, "Paint order and effective alpha must be explicit.");
assert(resolved.paints.layers[0].paintRevision.startsWith("primitive-paint-v1:") && resolved.paints.layers[0].capability === "opaque-solid", "Every source paint must retain an independent revision and capability decision.");
assert(resolved.strokes.renderStrategy === "css-inset-shadow" && resolved.strokes.layers[0].alignment === "INSIDE", "Rectangular INSIDE stroke must have one non-layout-affecting CSS owner.");
assert(resolved.strokes.layers[0].strokeRevision.startsWith("primitive-stroke-v1:") && resolved.strokes.layers[0].effectiveInnerBounds?.width === 91.2, "Stroke intent must preserve its own revision and exact INSIDE geometry.");
assert(
  resolvePrimitiveAppearance(primitive, {
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
    bounds: { x: 10, y: 10, width: 40, height: 20 },
  }).geometry.corner.effective.every((value) => value === 10),
  "Corner clamping must recompute from current settled geometry.",
);

const tree = createResolvedRenderTree(packageValue);
assert(tree.nodes.primitive.primitiveAppearance.sourceRevision === resolved.sourceRevision, "Resolved projection must publish the canonical primitive source revision.");
assert(tree.primitiveTreeRevision === primitiveTreeRevision(packageValue), "Resolved graph must bind all primitive semantics to one tree revision.");
assert(resolvePrimitiveCanvasAuthority(packageValue).cssBackground === "rgba(26, 51, 77, 1)", "Canvas background must remain a separate canonical authority.");
const markup = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue, resolvedTree: tree }));
assert(markup.includes('data-package-primitive-ownership="primitive-authoritative"'), "Renderer telemetry must expose primitive ownership.");
assert(markup.includes("box-shadow:inset 0 0 0 2.4px rgba(0, 0, 0, 1)"), "INSIDE stroke must render exactly once without changing layout geometry.");
assert(!markup.includes("border:2.4px solid"), "Source-certified INSIDE stroke must not also render as a CSS border.");
assert(markup.includes('data-package-primitive-corner-effective="[32,32,32,32]"'), "Renderer telemetry must expose effective clamped radii.");

const multiple = structuredClone(primitive);
multiple.appearance.fills = [
  certifiedSolid(0, { r: 0.75, g: 0.83, b: 1 }, 0.6),
  certifiedSolid(1, { r: 0.36, g: 0.15, b: 0.22 }, 0.6),
];
multiple.appearance.strokes = [];
const multipleResult = resolvePrimitiveAppearance(multiple, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
});
assert(
  multipleResult.ownership === "primitive-authoritative" &&
    multipleResult.backend === "svg" &&
    multipleResult.paints.renderStrategy === "svg-ordered-solid-stack" &&
    multipleResult.paints.orderedSolidStack?.runtimeOwner === "svg-ordered-solid-stack",
  "A source-certified multiple-SOLID stack must select one SVG primitive owner.",
);
assert(
  multipleResult.paints.orderedSolidStack?.orderedPaints.map((paint) => paint.sourceIndex).join(",") === "0,1" &&
    multipleResult.paints.orderedSolidStack.visiblePaintIndices.join(",") === "0,1" &&
    multipleResult.paints.orderedSolidStack.orderedPaints[0].effectiveSourceAlpha === 0.6,
  "Ordered stack resolution must preserve ascending source indices and apply canonical opacity once.",
);

const reversedMultiple = structuredClone(multiple);
reversedMultiple.appearance.fills = [
  certifiedSolid(0, { r: 0.36, g: 0.15, b: 0.22 }, 0.6),
  certifiedSolid(1, { r: 0.75, g: 0.83, b: 1 }, 0.6),
];
const reversedMultipleResult = resolvePrimitiveAppearance(reversedMultiple, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
});
assert(
  reversedMultipleResult.paints.orderedSolidStack?.resolvedStackRevision !==
    multipleResult.paints.orderedSolidStack?.resolvedStackRevision &&
    reversedMultipleResult.paints.orderedSolidStack?.orderedPaints[0].rgb.r === 0.36,
  "Reversing source paint order must issue a distinct stack revision without re-sorting by paint type or color.",
);

const hidden = structuredClone(multiple);
hidden.appearance.fills = [
  certifiedSolid(0, { r: 0, g: 1, b: 1 }, 0.35),
  certifiedSolid(1, { r: 1, g: 0, b: 0.62 }, 0.55, false),
  certifiedSolid(2, { r: 0.98, g: 1, b: 0.38 }, 0.75),
];
const hiddenResult = resolvePrimitiveAppearance(hidden, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
});
assert(
  hiddenResult.ownership === "primitive-authoritative" &&
    hiddenResult.paints.orderedSolidStack?.orderedPaints[1].role === "hidden-preserved" &&
    hiddenResult.paints.orderedSolidStack.visiblePaintIndices.join(",") === "0,2",
  "Hidden SOLIDs must remain in resolved provenance while contributing no pixels or reordering visible layers.",
);

const ambiguous = structuredClone(multiple);
const ambiguousPaint = ambiguous.appearance.fills[1];
if (ambiguousPaint.type === "SOLID" && ambiguousPaint.solidPaintSource) {
  ambiguousPaint.solidPaintSource.opacityDisposition = "ambiguous-independent-values";
  ambiguousPaint.solidPaintSource.effectiveOpacity = null;
  ambiguousPaint.solidPaintSource.conflicts = ["serialized-alpha-opacity-differ"];
}
assert(
  resolvePrimitiveAppearance(ambiguous, {
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
  }).fallbackReasons.includes("ordered-solid-stack-ambiguous-opacity-provenance"),
  "Ambiguous opacity provenance must keep the complete stack compatibility-owned.",
);

const multiplePackage = packageWithPrimitive();
multiplePackage.nodes.primitive = multiple;
const multipleTree = createResolvedRenderTree(multiplePackage);
assert(
  multipleTree.nodes.primitive.fidelityDiagnostics.some((diagnostic) =>
    diagnostic.code === "resolved-ordered-solid-stack-supported" &&
    diagnostic.severity === "info"
  ) && !multipleTree.nodes.primitive.fidelityDiagnostics.some((diagnostic) =>
    diagnostic.code === "resolved-multiple-paint-compatibility"
  ),
  "Supported stacks must replace generic multi-fill warnings with calm capability evidence.",
);
const multipleMarkup = renderToStaticMarkup(createElement(TemplatePackageRenderer, {
  packageValue: multiplePackage,
  resolvedTree: multipleTree,
}));
assert(
  multipleMarkup.includes('data-package-primitive-svg="svg-ordered-solid-stack"') &&
    multipleMarkup.includes('data-package-ordered-solid-layer="0"') &&
    multipleMarkup.includes('data-package-ordered-solid-layer="1"'),
  "The renderer must publish both visible SOLIDs inside one ordered SVG subtree.",
);
assert(
  (multipleMarkup.match(/data-package-ordered-solid-geometry-path=/g) ?? []).length === 1 &&
    (multipleMarkup.match(/data-package-ordered-solid-clip=/g) ?? []).length === 1 &&
    !multipleMarkup.includes("background-color:rgba(191, 212, 255"),
  "An authoritative ordered stack must use one shared geometry/clip and disable duplicate CSS fill ownership.",
);
const resizedMultiple = resizePrimitiveAppearance(multipleResult, {
  x: 10,
  y: 10,
  width: 72,
  height: 40,
});
assert(
  resizedMultiple.paints.orderedSolidStack?.resolvedStackRevision !==
    multipleResult.paints.orderedSolidStack?.resolvedStackRevision &&
    resizedMultiple.paints.orderedSolidStack?.primitiveGeometryRevision ===
      resizedMultiple.geometryRevision &&
    resizedMultiple.paints.orderedSolidStack?.currentBounds.width === 72,
  "Bounds changes must recompute the stack and primitive geometry revisions together.",
);

const mixedPaints = structuredClone(multiple);
mixedPaints.appearance.fills[1] = {
  type: "IMAGE",
  assetId: "asset:image:unsupported-stack",
  opacity: 1,
  visible: true,
  blendMode: "NORMAL",
};
assert(
  resolvePrimitiveAppearance(mixedPaints, {
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
  }).fallbackReasons.includes("ordered-normal-paint-stack-unsupported-layer-pattern"),
  "Mixed paint types must select coherent whole-node compatibility.",
);

const blendedStack = structuredClone(multiple);
blendedStack.appearance.fills[1].blendMode = "MULTIPLY";
assert(
  resolvePrimitiveAppearance(blendedStack, {
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
  }).fallbackReasons.includes("ordered-solid-stack-unsupported-blend-mode"),
  "Non-NORMAL paint blending must remain outside ordered-SOLID authority.",
);

const opacityStack = structuredClone(multiple);
opacityStack.appearance.opacity = 0.5;
assert(
  resolvePrimitiveAppearance(opacityStack, {
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
  }).fallbackReasons.includes("ordered-solid-stack-unsupported-node-opacity"),
  "Node opacity below one must remain a separate compatibility-owned compositing operation.",
);

const relatedMaskStack = resolvePrimitiveAppearance(multiple, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
  hasMaskRelationship: true,
});
assert(
  relatedMaskStack.fallbackReasons.includes("ordered-solid-stack-mask-dependency"),
  "Any declared mask relationship must exclude the complete stack from primitive routing.",
);

const effectStack = structuredClone(multiple);
effectStack.appearance.effects = [{ type: "LAYER_BLUR", radius: 4, visible: true }];
assert(
  resolvePrimitiveAppearance(effectStack, {
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
  }).fallbackReasons.includes("ordered-solid-stack-effect-dependency"),
  "Effects must keep the ordered stack on coherent compatibility ownership.",
);

const independent = structuredClone(primitive);
independent.appearance.cornerRadius = null;
independent.appearance.cornerRadii = [2, 4, 6, 8];
const independentResult = resolvePrimitiveAppearance(independent, { packageId: packageValue.packageId, rootNodeId: packageValue.rootNodeId });
assert(independentResult.ownership === "primitive-authoritative" && independentResult.geometry.capability === "axis-aligned-independent-corners" && independentResult.backend === "svg" && independentResult.strokes.renderStrategy === "svg-inside-stroke", "Source-certified independent corners with an INSIDE stroke must select the singular SVG path owner without collapsing to a uniform radius.");
assert(JSON.stringify(independentResult.geometry.corner.requested) === "[2,4,6,8]", "Independent corner ordering must remain top-left, top-right, bottom-right, bottom-left.");

const independentStack = structuredClone(multiple);
independentStack.appearance.cornerRadius = null;
independentStack.appearance.cornerRadii = [120, 48, 84, 24];
const independentStackResult = resolvePrimitiveAppearance(independentStack, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
  bounds: { x: 10, y: 10, width: 710, height: 880 },
});
assert(
  independentStackResult.ownership === "primitive-authoritative" &&
    independentStackResult.paints.orderedSolidStack?.cornerGeometry.effective.join(",") === "120,48,84,24" &&
    independentStackResult.paints.orderedSolidStack.primitiveGeometryRevision ===
      independentStackResult.geometryRevision,
  "Ordered SOLIDs must share the accepted edge-local independent-corner geometry and revision.",
);

const horizontallyClamped = structuredClone(independent);
horizontallyClamped.appearance.cornerRadii = [80, 40, 10, 70];
const horizontalResult = resolvePrimitiveAppearance(horizontallyClamped, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
  bounds: { x: 10, y: 10, width: 96, height: 200 },
});
assert(horizontalResult.geometry.corner.normalizationScale === 0.8, "Opposing horizontal radii must use the pairwise normalization scale.");
assert(JSON.stringify(horizontalResult.geometry.corner.effective) === "[64,32,10,70]", "Edge-local horizontal normalization must affect only corners touching the constrained edge.");

const verticallyClamped = structuredClone(independent);
verticallyClamped.appearance.cornerRadii = [40, 10, 20, 80];
const verticalResult = resolvePrimitiveAppearance(verticallyClamped, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
  bounds: { x: 0, y: 0, width: 200, height: 60 },
});
assert(verticalResult.geometry.corner.normalizationScale === 0.5, "Opposing vertical radii must use the pairwise normalization scale.");
assert(JSON.stringify(verticalResult.geometry.corner.effective) === "[20,10,20,40]", "Edge-local vertical normalization must affect only corners touching the constrained edge.");

const normalizedCapsule = structuredClone(independent);
normalizedCapsule.appearance.cornerRadii = [999, 999, 0, 999];
const normalizedCapsuleResult = resolvePrimitiveAppearance(normalizedCapsule, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
  bounds: { x: 0, y: 0, width: 181, height: 209 },
});
assert(Math.abs(normalizedCapsuleResult.geometry.corner.normalizationScale - (181 / 1998)) < 1e-12, "Extreme independent radii must normalize from the limiting opposing pair.");
assert(normalizedCapsuleResult.geometry.corner.effective[2] === 0, "A zero source corner must remain zero after normalization.");
assert(normalizedCapsuleResult.geometry.corner.effective[0] === 90.5 && normalizedCapsuleResult.geometry.corner.effective[1] === 90.5 && normalizedCapsuleResult.geometry.corner.effective[3] === 104.5, "Each corner must use the most restrictive of its two adjacent edge scales.");

const negativeCorner = structuredClone(independent);
negativeCorner.appearance.cornerRadii = [-5, 0, 0, 0];
const negativeResult = resolvePrimitiveAppearance(negativeCorner, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
});
assert(negativeResult.geometry.corner.effective[0] === 0 && negativeResult.geometry.corner.clampReason === "negative-radius-floor", "Negative source radii must floor deterministically without producing invalid geometry.");

const centerStroke = structuredClone(primitive);
(centerStroke.appearance.strokes[0] as PackageStroke).align = "CENTER";
centerStroke.appearance.clipContent = false;
centerStroke.layout.clipContent = false;
const centerResult = resolvePrimitiveAppearance(centerStroke, { packageId: packageValue.packageId, rootNodeId: packageValue.rootNodeId });
assert(centerResult.ownership === "primitive-authoritative" && centerResult.backend === "svg" && centerResult.strokes.renderStrategy === "svg-center-stroke", "Opaque CENTER strokes must select the singular SVG path owner.");
assert(centerResult.strokes.layers[0].outerStrokeBounds?.x === 8.8 && centerResult.strokes.layers[0].innerStrokeBounds?.x === 11.2, "CENTER stroke geometry must expand and contract by exactly half the stroke width.");

const outsideStroke = structuredClone(primitive);
(outsideStroke.appearance.strokes[0] as PackageStroke).align = "OUTSIDE";
outsideStroke.appearance.clipContent = false;
outsideStroke.layout.clipContent = false;
const outsideResult = resolvePrimitiveAppearance(outsideStroke, { packageId: packageValue.packageId, rootNodeId: packageValue.rootNodeId });
assert(outsideResult.ownership === "primitive-authoritative" && outsideResult.backend === "svg" && outsideResult.strokes.renderStrategy === "svg-outside-stroke", "Opaque OUTSIDE strokes must select the singular SVG path owner.");
assert(outsideResult.strokes.layers[0].innerStrokeBounds?.x === 10 && outsideResult.strokes.layers[0].outerStrokeBounds?.x === 7.6, "OUTSIDE stroke geometry must leave the fill path unchanged and expand by the full stroke width.");

const thickOutside = structuredClone(outsideStroke);
(thickOutside.appearance.strokes[0] as PackageStroke).weight = 80;
const thickOutsideResult = resolvePrimitiveAppearance(thickOutside, { packageId: packageValue.packageId, rootNodeId: packageValue.rootNodeId });
assert(thickOutsideResult.strokes.layers[0].cornerGeometry?.inner.every((radius) => radius >= 0), "Thick strokes must never publish negative inner radii.");

const centerPackage = packageWithPrimitive();
(centerPackage.nodes.primitive.appearance.strokes[0] as PackageStroke).align = "CENTER";
centerPackage.nodes.primitive.appearance.clipContent = false;
centerPackage.nodes.primitive.layout.clipContent = false;
const centerTree = createResolvedRenderTree(centerPackage);
const centerMarkup = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue: centerPackage, resolvedTree: centerTree }));
assert(centerMarkup.includes('data-package-primitive-svg="svg-center-stroke"'), "CENTER output must publish the selected SVG strategy.");
assert(centerMarkup.includes("data-package-primitive-svg-fill") && centerMarkup.includes("data-package-primitive-svg-stroke"), "The SVG backend must render one fill path and one stroke path.");
assert(!centerMarkup.includes("box-shadow:inset") && !centerMarkup.includes("border:2.4px solid"), "The SVG path owner must not duplicate the stroke through CSS.");

const resizedCenter = resizePrimitiveAppearance(centerResult, { x: 10, y: 10, width: 48, height: 32 });
assert(resizedCenter.geometryRevision !== centerResult.geometryRevision, "Live bounds changes must issue a new primitive geometry revision.");
assert(resizedCenter.strokes.layers[0].outerStrokeBounds?.width === 50.4, "Stroke geometry must recompute from live bounds rather than preserving source pixel offsets.");

const clippedPackage = packageWithPrimitive();
const clipParent = structuredClone(primitiveNode());
clipParent.id = "clip-parent";
clipParent.parentId = "root";
clipParent.children = ["primitive"];
clipParent.bounds.relative = { x: 30, y: 40, width: 80, height: 50 };
clipParent.layout.clipContent = true;
clippedPackage.nodes.root.children = [clipParent.id];
clippedPackage.nodes[clipParent.id] = clipParent;
clippedPackage.nodes.primitive.parentId = clipParent.id;
const clipChain = collectPrimitiveAncestorClipChain(clippedPackage, clippedPackage.nodes.primitive);
assert(
  clipChain[0]?.nodeId === "clip-parent" &&
    JSON.stringify(clipChain[0].bounds) === '{"x":30,"y":40,"width":80,"height":50}' &&
    clipChain.some((clip) => clip.nodeId === clippedPackage.rootNodeId),
  "Ancestor clip evidence must preserve nearest-first ordering and root-relative canonical bounds.",
);

const maskInput = structuredClone(primitive);
maskInput.mask = { isMask: true, maskType: "ALPHA" };
const maskInputResult = resolvePrimitiveAppearance(maskInput, { packageId: packageValue.packageId, rootNodeId: packageValue.rootNodeId, maskInput: true });
assert(maskInputResult.ownership === "compatibility-authoritative" && maskInputResult.paints.layers[0].role === "mask-input", "Mask input paint must remain excluded from ordinary primitive output.");

const changed = packageWithPrimitive();
const changedFill = changed.nodes.primitive.appearance.fills[0];
if (changedFill.type === "SOLID") changedFill.color.r = 0.5;
const staleMarkup = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue: changed, resolvedTree: tree }));
assert(staleMarkup.includes('data-package-primitive-tree-status="recomputed-stale"'), "A stale primitive tree revision must be rejected before publication.");

const changedMultiplePackage = structuredClone(multiplePackage);
const changedMultiplePaint = changedMultiplePackage.nodes.primitive.appearance.fills[1];
if (changedMultiplePaint.type === "SOLID") changedMultiplePaint.color.g = 0.25;
const changedMultipleCurrent = resolvePrimitiveAppearance(
  changedMultiplePackage.nodes.primitive,
  {
    packageId: changedMultiplePackage.packageId,
    rootNodeId: changedMultiplePackage.rootNodeId,
  },
);
const staleMultipleMarkup = renderToStaticMarkup(createElement(TemplatePackageRenderer, {
  packageValue: changedMultiplePackage,
  resolvedTree: multipleTree,
}));
const changedMultipleTree = createResolvedRenderTree(changedMultiplePackage);
assert(
  staleMultipleMarkup.includes('data-package-primitive-tree-status="recomputed-stale"') &&
    changedMultipleTree.nodes.primitive.primitiveAppearance.ownership === "primitive-authoritative" &&
    changedMultipleCurrent.ownership === "primitive-authoritative" &&
    changedMultipleTree.nodes.primitive.primitiveAppearance.paints.orderedSolidStack
      ?.resolvedStackRevision !== multipleTree.nodes.primitive.primitiveAppearance.paints
      .orderedSolidStack?.resolvedStackRevision &&
    changedMultipleCurrent.paints.orderedSolidStack?.resolvedStackRevision !==
      multipleResult.paints.orderedSolidStack?.resolvedStackRevision,
  "Stale ordered-stack results must be recomputed from current canonical paint inputs before publication.",
);

const repeat = resolvePrimitiveAppearance(primitive, {
  packageId: packageValue.packageId,
  rootNodeId: packageValue.rootNodeId,
});
assert(JSON.stringify(repeat) === JSON.stringify(resolved), "Primitive resolution and serialization must be deterministic.");

console.log("Source-certified primitive appearance tests passed.");
