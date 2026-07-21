import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import simpleFixedPoster from "../fixtures/simple-fixed-poster.json";
import { TemplatePackageRenderer } from "../render/TemplatePackageRenderer";
import { createResolvedRenderTree } from "../resolved";
import type {
  PackageGradientPaint,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import {
  resizePrimitiveAppearance,
  resolveLinearGradientGeometry,
  resolvePrimitiveAppearance,
} from "./index";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function gradientPaint(
  overrides: Partial<PackageGradientPaint> = {},
): PackageGradientPaint {
  return {
    type: "GRADIENT_LINEAR",
    gradientStops: [
      { position: 0, color: { r: 0.1, g: 0.2, b: 0.3, a: 0.8 } },
      { position: 0.35, color: { r: 0.4, g: 0.5, b: 0.6, a: 0.6 } },
      { position: 1, color: { r: 0.9, g: 0.8, b: 0.7, a: 1 } },
    ],
    gradientTransform: [[0.5, 0, 0.25], [0, 1, 0]],
    opacity: 0.5,
    visible: true,
    blendMode: "NORMAL",
    linearGradientSource: {
      schemaVersion: "linear-gradient-source-v1",
      sourceIndex: 0,
      pairing: "source-index",
      canonicalPath: "nodes.gradient.appearance.fills.0",
      rawFigmaPath: "nodes.gradient.extensions.figma.rawFills.0",
      stopsSource: "figma-raw-gradientStops",
      transformSource: "figma-raw-gradientTransform",
      normalizationRevision: "linear-gradient-normalization-v1",
      conflicts: [],
    },
    ...overrides,
  };
}

function gradientNode(): TemplateNode {
  const packageValue = structuredClone(simpleFixedPoster) as unknown as TemplatePackageV1;
  const source = structuredClone(packageValue.nodes[packageValue.rootNodeId]);
  return {
    ...source,
    id: "gradient",
    name: "Gradient source",
    type: "RECTANGLE",
    parentId: packageValue.rootNodeId,
    children: [],
    bounds: {
      absolute: { x: 20, y: 30, width: 200, height: 100 },
      relative: { x: 20, y: 30, width: 200, height: 100 },
    },
    layout: { ...source.layout, mode: "NONE", clipContent: false },
    sizing: {
      horizontal: { mode: "FIXED", value: 200 },
      vertical: { mode: "FIXED", value: 100 },
    },
    appearance: {
      opacity: 1,
      fills: [gradientPaint()],
      strokes: [],
      effects: [],
      cornerRadius: null,
      cornerRadii: [12, 24, 36, 48],
      clipContent: false,
    },
    shape: { type: "RECTANGLE", cornerRadius: null },
    image: undefined,
    vector: undefined,
    mask: undefined,
    extensions: {
      figma: {
        relativeTransform: [[1, 0, 20], [0, 1, 30]],
        rotation: 0,
      },
    },
  };
}

function packageWithGradient(): TemplatePackageV1 {
  const packageValue = structuredClone(simpleFixedPoster) as unknown as TemplatePackageV1;
  const node = gradientNode();
  packageValue.nodes[packageValue.rootNodeId].children = [node.id];
  packageValue.nodes[node.id] = node;
  return packageValue;
}

const bounds = { x: 20, y: 30, width: 200, height: 100 };
const paint = gradientPaint();
const geometry = resolveLinearGradientGeometry(paint, 0, bounds);
assert(geometry.capability === "source-certified-linear-gradient", "A source-indexed isolated linear gradient must resolve through the certified route.");
assert(geometry.coordinateSpace === "normalized-node-local-to-normalized-gradient", "The gradient coordinate-space contract must be explicit.");
assert(geometry.inversionCount === 1, "The source transform must be inverted exactly once.");
assert(geometry.determinant === 0.5, "The source matrix determinant must be retained.");
assert(JSON.stringify(geometry.inverseMatrix) === "[[2,0,-0.5],[0,1,0]]", "The normalized source matrix direction must produce the proven inverse.");
assert(JSON.stringify(geometry.normalizedHandles.start) === '{"x":-0.5,"y":0.5}', "The start handle must derive from inverse(0, 0.5).");
assert(JSON.stringify(geometry.normalizedHandles.end) === '{"x":1.5,"y":0.5}', "The end handle must derive from inverse(1, 0.5).");
assert(JSON.stringify(geometry.normalizedHandles.third) === '{"x":-0.5,"y":1}', "The third handle must derive from inverse(0, 1).");
assert(geometry.stops.map((stop) => stop.position).join(",") === "0,0.35,1", "Nonuniform source stop order and positions must remain exact.");
assert(geometry.stops[0].color.a === 0.8 && geometry.paintOpacity === 0.5, "Stop alpha and paint opacity must remain distinct inputs.");
assert(JSON.stringify(geometry.svgGradientTransform) === "[[400,0,-100],[0,100,0]]", "SVG user-space geometry must project the normalized inverse through live node bounds.");

const node = gradientNode();
const appearance = resolvePrimitiveAppearance(node, {
  packageId: "linear-gradient-test",
  rootNodeId: "root",
});
assert(appearance.ownership === "primitive-authoritative" && appearance.backend === "svg", "An eligible isolated gradient must transfer singular ownership to SVG.");
assert(appearance.strokes.renderStrategy === "svg-linear-gradient", "The runtime strategy must identify the singular SVG gradient owner.");
assert(appearance.geometry.corner.effective.join(",") === "12,24,36,48", "The gradient must reuse source-certified independent corner geometry.");

const resized = resizePrimitiveAppearance(appearance, { x: 20, y: 30, width: 400, height: 80 });
const resizedGradient = resized.paints.layers[0].linearGradient;
assert(resizedGradient?.sourceRevision === geometry.sourceRevision, "Resize must preserve immutable gradient source identity.");
assert(resizedGradient?.geometryRevision !== geometry.geometryRevision, "Resize must publish a new bounds-derived gradient geometry revision.");
assert(JSON.stringify(resizedGradient?.normalizedHandles) === JSON.stringify(geometry.normalizedHandles), "Resize must preserve normalized semantic handles.");
assert(JSON.stringify(resizedGradient?.templateHandles) !== JSON.stringify(geometry.templateHandles), "Resize must recompute template-space handles from live bounds.");

const singular = resolveLinearGradientGeometry(gradientPaint({ gradientTransform: [[1, 2, 0], [2, 4, 0]] }), 0, bounds);
assert(singular.capability === "unsupported-linear-gradient" && singular.fallbackReason === "linear-gradient-transform-non-invertible" && singular.inversionCount === 0, "A singular matrix must remain compatibility-owned without an attempted inverse.");
const conflicting = resolveLinearGradientGeometry(gradientPaint({
  linearGradientSource: { ...paint.linearGradientSource!, conflicts: ["canonical-raw-stop-conflict"] },
}), 0, bounds);
assert(conflicting.fallbackReason === "linear-gradient-source-conflict", "Conflicting source evidence must block authority transfer.");
const reordered = resolveLinearGradientGeometry(gradientPaint({
  gradientStops: [
    { position: 0.5, color: { r: 0, g: 0, b: 0, a: 1 } },
    { position: 0.25, color: { r: 1, g: 1, b: 1, a: 1 } },
  ],
}), 0, bounds);
assert(reordered.fallbackReason === "linear-gradient-stop-order-unsupported", "Invalid source stop order must remain explicit compatibility evidence.");

const rotated = gradientNode();
rotated.extensions = { figma: { relativeTransform: [[0, 1, 20], [-1, 0, 30]], rotation: -90 } };
const rotatedAppearance = resolvePrimitiveAppearance(rotated, { packageId: "linear-gradient-test", rootNodeId: "root" });
assert(rotatedAppearance.ownership === "primitive-authoritative" && rotatedAppearance.geometry.capability === "rotated-source-certified-linear-gradient", "The fixture-certified pure node rotation must retain node-local gradient authority.");

const mixed = gradientNode();
mixed.appearance.fills.push({ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true });
assert(resolvePrimitiveAppearance(mixed, { packageId: "linear-gradient-test", rootNodeId: "root" }).fallbackReasons.includes("ordered-normal-paint-stack-unsupported-layer-pattern"), "A gradient below a SOLID remains outside the source-certified ordered layer pattern.");

const solidThenGradient = gradientNode();
solidThenGradient.appearance.fills = [{
  type: "SOLID",
  color: { r: 0.975, g: 1, b: 0.383, a: 1 },
  opacity: 1,
  visible: true,
  blendMode: "NORMAL",
  solidPaintSource: {
    schemaVersion: "solid-paint-source-v1",
    sourceIndex: 0,
    pairing: "source-index",
    canonicalPath: "nodes.gradient.appearance.fills.0",
    rawFigmaPath: "nodes.gradient.extensions.figma.rawFills.0",
    sourceContract: "figma-plugin-api-solid-paint-rgb-opacity",
    exporterCompatibility: "raw-figma-solid-paint",
    opacityDisposition: "raw-paint-opacity",
    serializedColorAlpha: 1,
    serializedPaintOpacity: 1,
    sourcePaintOpacity: 1,
    canonicalColorAlpha: 1,
    canonicalPaintOpacity: 1,
    effectiveOpacity: 1,
    effectiveOpacityRule: "paint-opacity-once",
    equalityTolerance: 1e-6,
    confidenceBasis: "raw-figma-solid-paint",
    normalizationRevision: "solid-paint-opacity-normalization-v1",
    conflicts: [],
  },
}, gradientPaint({
  linearGradientSource: {
    ...gradientPaint().linearGradientSource!,
    sourceIndex: 1,
    canonicalPath: "nodes.gradient.appearance.fills.1",
    rawFigmaPath: "nodes.gradient.extensions.figma.rawFills.1",
  },
})];
const solidThenGradientAppearance = resolvePrimitiveAppearance(solidThenGradient, {
  packageId: "linear-gradient-test",
  rootNodeId: "root",
});
assert(
  solidThenGradientAppearance.ownership === "primitive-authoritative" &&
    solidThenGradientAppearance.paints.renderStrategy === "svg-ordered-normal-paint-stack" &&
    solidThenGradientAppearance.paints.orderedNormalPaintStack?.capability ===
      "source-certified-solid-linear-normal-stack" &&
    solidThenGradientAppearance.paints.orderedNormalPaintStack.visiblePaintIndices.join(",") === "0,1",
  "The certified SOLID-below-linear-gradient NORMAL pattern must select one ordered SVG owner.",
);
const solidThenGradientPackage = packageWithGradient();
solidThenGradientPackage.nodes.gradient = solidThenGradient;
const solidThenGradientTree = createResolvedRenderTree(solidThenGradientPackage);
const solidThenGradientMarkup = renderToStaticMarkup(createElement(TemplatePackageRenderer, {
  packageValue: solidThenGradientPackage,
  resolvedTree: solidThenGradientTree,
}));
assert(
  solidThenGradientTree.nodes.gradient.backendDecision.runtimeOwner === "ordered-normal-paint-svg" &&
    solidThenGradientMarkup.includes('data-package-primitive-svg="svg-ordered-normal-paint-stack"') &&
    solidThenGradientMarkup.includes('data-package-ordered-normal-paint-layer="0"') &&
    solidThenGradientMarkup.includes('data-package-ordered-normal-paint-layer="1"') &&
    (solidThenGradientMarkup.match(/data-package-ordered-normal-paint-geometry-path=/g) ?? []).length === 1,
  "Backend orchestration and the renderer must publish one shared clip with both source-indexed layers.",
);
const resizedSolidThenGradient = resizePrimitiveAppearance(
  solidThenGradientAppearance,
  { x: 20, y: 30, width: 400, height: 80 },
);
assert(
  resizedSolidThenGradient.paints.orderedNormalPaintStack?.resolvedStackRevision !==
    solidThenGradientAppearance.paints.orderedNormalPaintStack?.resolvedStackRevision &&
    resizedSolidThenGradient.paints.orderedNormalPaintStack?.orderedLayers[1].linearGradient?.sourceRevision ===
      solidThenGradientAppearance.paints.orderedNormalPaintStack?.orderedLayers[1].linearGradient?.sourceRevision,
  "Resize must issue new stack geometry while preserving immutable gradient source intent.",
);
const withStroke = gradientNode();
withStroke.appearance.strokes = [{
  paint: { type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true },
  weight: 1,
  align: "INSIDE",
}];
assert(resolvePrimitiveAppearance(withStroke, { packageId: "linear-gradient-test", rootNodeId: "root" }).fallbackReasons.includes("linear-gradient-with-stroke-unsupported"), "Gradient plus stroke must remain outside the isolated certified subset.");
const nodeOpacity = gradientNode();
nodeOpacity.appearance.opacity = 0.5;
assert(resolvePrimitiveAppearance(nodeOpacity, { packageId: "linear-gradient-test", rootNodeId: "root" }).fallbackReasons.includes("node-opacity-not-source-certified"), "Node opacity must not be conflated with certified paint opacity.");

const packageValue = packageWithGradient();
const tree = createResolvedRenderTree(packageValue);
assert(tree.nodes.gradient.appearance.fills[0].kind === "linear-gradient", "The resolved tree must publish supported linear-gradient geometry instead of an unsupported placeholder.");
assert(!tree.fidelityDiagnostics.some((item) => item.nodeId === "gradient" && item.code === "unsupported-paint-gradient-linear"), "The supported route must not emit the generic unsupported-gradient diagnostic.");
const markupA = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue, resolvedTree: tree }));
const markupB = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue, resolvedTree: tree }));
assert(markupA === markupB, "Repeated server renders must produce deterministic SVG IDs and markup.");
assert((markupA.match(/<linearGradient/g) ?? []).length === 1, "The renderer must emit exactly one linear-gradient definition.");
assert(markupA.includes('data-package-primitive-svg="svg-linear-gradient"'), "Renderer telemetry must expose the singular SVG owner.");
assert(markupA.includes('gradientUnits="userSpaceOnUse"') && markupA.includes('color-interpolation="sRGB"'), "The SVG owner must declare its coordinate and interpolation contracts.");
assert(markupA.includes('stop-opacity="0.4"'), "Paint opacity must be applied once after stop-alpha preservation.");
assert(!markupA.includes("linear-gradient("), "The supported gradient must not also render through a CSS gradient owner.");

const changedPackage = structuredClone(packageValue);
const changedPaint = changedPackage.nodes.gradient.appearance.fills[0];
if (changedPaint.type === "GRADIENT_LINEAR") {
  changedPaint.gradientTransform = [[1, 2, 0], [2, 4, 0]];
}
const staleTreeMarkup = renderToStaticMarkup(createElement(TemplatePackageRenderer, {
  packageValue: changedPackage,
  resolvedTree: tree,
}));
assert(!staleTreeMarkup.includes('data-package-primitive-svg="svg-linear-gradient"'), "A stale resolved gradient revision must never override newer canonical source semantics.");
