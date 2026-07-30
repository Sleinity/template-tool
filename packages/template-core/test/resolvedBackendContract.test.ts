import type {
  PackageSolidPaint,
  TemplateNode,
  TemplatePackageV1,
} from "../src/types";
import {
  backendDecisionOwns,
  checkResolvedFontReadiness,
  collectTemplatePackageFontRequirements,
  createBackendDiagnosticProjection,
  createResolvedRenderTree,
} from "../src/resolved";
import { resolvePrimitiveAppearance } from "../src/primitives";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fixed(value: number) {
  return { mode: "FIXED" as const, value, min: null, max: null };
}

function solidPaint(
  nodeId: string,
  sourceIndex: number,
  color: { r: number; g: number; b: number; a: number },
): PackageSolidPaint {
  return {
    type: "SOLID",
    color,
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
    solidPaintSource: {
      schemaVersion: "solid-paint-source-v1",
      sourceIndex,
      pairing: "source-index",
      canonicalPath: `nodes.${nodeId}.appearance.fills.${sourceIndex}`,
      rawFigmaPath: `nodes.${nodeId}.extensions.figma.rawFills.${sourceIndex}`,
      sourceContract: "figma-plugin-api-solid-paint-rgb-opacity",
      exporterCompatibility: "raw-figma-solid-paint",
      opacityDisposition: "raw-paint-opacity",
      serializedColorAlpha: color.a,
      serializedPaintOpacity: 1,
      sourcePaintOpacity: 1,
      canonicalColorAlpha: color.a,
      canonicalPaintOpacity: 1,
      effectiveOpacity: color.a,
      effectiveOpacityRule: "paint-opacity-once",
      equalityTolerance: 1e-6,
      confidenceBasis: "raw-figma-solid-paint",
      normalizationRevision: "solid-paint-opacity-normalization-v1",
      conflicts: [],
    },
  };
}

function node(
  id: string,
  fills: PackageSolidPaint[],
  children: string[] = [],
): TemplateNode {
  return {
    id,
    name: id,
    type: "FRAME",
    parentId: null,
    children,
    bounds: {
      absolute: { x: 0, y: 0, width: 320, height: 180 },
      relative: { x: 0, y: 0, width: 320, height: 180 },
    },
    positioning: "ROOT",
    layout: {
      mode: "NONE",
      wrap: false,
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAlignment: "MIN",
      counterAlignment: "MIN",
      clipContent: false,
    },
    sizing: { horizontal: fixed(320), vertical: fixed(180) },
    appearance: {
      visible: true,
      opacity: 1,
      fills,
      strokes: [],
      effects: [],
      cornerRadii: [12, 8, 4, 0],
      clipContent: false,
    },
  } as TemplateNode;
}

const rootId = "root";
const orderedFills = [
  solidPaint(rootId, 0, { r: 0.1, g: 0.2, b: 0.3, a: 1 }),
  solidPaint(rootId, 1, { r: 0.8, g: 0.2, b: 0.1, a: 1 }),
];
const rootNode = node(rootId, orderedFills);
const packageValue = {
  schemaVersion: "1.0",
  packageId: "portable-resolved-contract",
  name: "Portable Resolved Contract",
  canvas: {
    width: 320,
    height: 180,
    background: { r: 1, g: 1, b: 1, a: 1 },
    coordinateSpace: "figma",
  },
  rootNodeId: rootId,
  nodes: { [rootId]: rootNode },
  editableFields: [{
    id: "root-color",
    name: "Root color",
    type: "color",
    nodeId: rootId,
    property: "appearance.fills.0.color",
    defaultValue: orderedFills[0].color,
  }],
  assets: {},
  fontRequirements: [{
    id: "font:rethink-sans:600:normal",
    family: "Rethink Sans",
    weight: 600,
    cssStyle: "normal",
    usedBy: [rootId],
    editable: false,
  }],
} as unknown as TemplatePackageV1;

const primitive = resolvePrimitiveAppearance(rootNode, {
  packageId: packageValue.packageId,
  rootNodeId: rootId,
});
assert(
  primitive.ownership === "primitive-authoritative" &&
    primitive.paints.orderedSolidStack?.capability ===
      "source-certified-ordered-solid-stack" &&
    primitive.paints.orderedSolidStack.orderedPaints.map((paint) => paint.sourceIndex).join(",") === "0,1",
  "Core primitive resolution must retain certified ordered-paint ownership and source order.",
);
assert(
  primitive.geometry.corner.effective.join(",") === "12,8,4,0",
  "Core primitive resolution must retain independent corner geometry.",
);

const tree = createResolvedRenderTree(packageValue);
const repeated = createResolvedRenderTree(structuredClone(packageValue));
const resolvedRoot = tree.nodes[rootId];
assert(
  tree.backendDecisionRevision === repeated.backendDecisionRevision &&
    tree.primitiveTreeRevision === repeated.primitiveTreeRevision,
  "Resolved and backend identities must be deterministic across restored package values.",
);
assert(
  resolvedRoot.primitiveAppearance.paints.renderStrategy === "svg-ordered-solid-stack" &&
    backendDecisionOwns(resolvedRoot.backendDecision, "ordered-solid-svg"),
  "Resolved nodes and backend decisions must share the certified ordered-paint owner.",
);
assert(
  tree.editableFieldTargets["root-color"]?.propertySupported === true,
  "Resolved field targets must retain portable property support.",
);
assert(
  tree.backendDiagnostics.sourceDecisionRevision === tree.backendDecisionRevision,
  "Backend diagnostics must remain revision-bound to the resolved decision set.",
);

const fallbackNode = structuredClone(resolvedRoot);
fallbackNode.backendDecision = {
  ...fallbackNode.backendDecision,
  selectedBackend: "compatibility",
  runtimeOwner: "legacy-dom-css",
  disposition: "degraded-fallback",
  supportLevel: "approximated",
  fallback: {
    active: true,
    backend: "compatibility",
    reasonCodes: ["portable-contract-fallback"],
    description: "Portable contract fallback",
  },
};
const projection = createBackendDiagnosticProjection(
  { [rootId]: fallbackNode },
  [],
  "portable-contract-diagnostics",
);
assert(
  projection.diagnostics.length === 1 &&
    projection.groups.some((group) => group.kind === "capability") &&
    projection.groups.some((group) => group.kind === "region"),
  "Portable backend diagnostics must retain deterministic capability and region grouping.",
);

const fontReadiness = await checkResolvedFontReadiness(
  tree,
  {
    ready: Promise.resolve(),
    check: () => true,
  },
  [{ family: "Rethink Sans", weight: 600, style: "normal" }],
  collectTemplatePackageFontRequirements(packageValue, tree),
);
assert(
  fontReadiness.reliable && fontReadiness.exportReady &&
    fontReadiness.required[0]?.status === "loaded",
  "Injected font readiness must remain portable and deterministic.",
);

let emojiReadinessSample = "";
const emojiReadiness = await checkResolvedFontReadiness(
  tree,
  {
    ready: Promise.resolve(),
    check: (_font, sample) => {
      emojiReadinessSample = sample ?? "";
      return true;
    },
  },
  [{ family: "Rethink Sans", weight: 600, style: "normal" }],
  [{
    family: "Rethink Sans",
    weight: 600,
    style: "normal",
    usedBy: ["headline"],
    characters: "Summer Sale ☀️",
  }],
);
assert(
  emojiReadiness.required[0]?.glyphCoverage === "fallback-likely" &&
    emojiReadinessSample === "Summer Sale ",
  "Readiness should preserve the existing non-blocking emoji fallback while checking only text-face characters.",
);

console.log("Portable resolved/backend ownership tests passed.");
