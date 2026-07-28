import type { PackageAsset, TemplateNode, TemplatePackageV1 } from "../src/types";
import {
  canvasBackgroundToCss,
  getFirstVisibleSolidPaint,
  normalizedColorToCss,
  resolvePackageAssetSource,
  resolvePackageAxisLimits,
} from "../src/models/packageRenderValues";
import {
  getPackageNodePositioning,
  resolvePackageNodeLayoutRole,
} from "../src/models/packageLayoutModel";
import { resolvePackageStrokeModel } from "../src/models/packageStrokeModel";
import { resolvePackageTransform } from "../src/models/packageTransformModel";
import { resolvePackageVectorModel } from "../src/models/packageVectorModel";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function node(overrides: Record<string, unknown> = {}): TemplateNode {
  return {
    id: "node",
    name: "Node",
    type: "RECTANGLE",
    parentId: null,
    children: [],
    bounds: { x: 0, y: 0, width: 100, height: 50 },
    positioning: "AUTO",
    layout: {
      mode: "NONE",
      wrap: false,
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    sizing: {
      horizontal: { mode: "FIXED", value: 100 },
      vertical: { mode: "FIXED", value: 50 },
    },
    appearance: {
      visible: true,
      opacity: 1,
      fills: [],
      strokes: [],
      effects: [],
    },
    ...overrides,
  } as unknown as TemplateNode;
}

assert(
  normalizedColorToCss({ r: 1, g: 0.5, b: -1, a: 0.5 }, 0.5) ===
    "rgba(255, 128, 0, 0.25)",
  "Portable color conversion must retain clamping and apply-once opacity.",
);
assert(canvasBackgroundToCss(null) === "transparent", "Null canvas backgrounds must remain transparent.");
assert(canvasBackgroundToCss("#123456") === "#123456", "CSS canvas strings must pass through unchanged.");

const solid = { type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 }, visible: true } as const;
const hiddenSolid = { ...solid, visible: false } as const;
assert(
  getFirstVisibleSolidPaint([hiddenSolid, solid] as any[]) === solid,
  "Visible SOLID selection must retain source order and ignore hidden paints.",
);

const embeddedSvg: PackageAsset = {
  id: "vector",
  type: "svg",
  source: "embedded",
  svgString: '<svg width="10" height="10"></svg>',
};
assert(
  resolvePackageAssetSource({ ...embeddedSvg, stableUrl: "javascript:alert(1)" })?.startsWith(
    "data:image/svg+xml",
  ),
  "Unsafe managed URLs must not override a safe embedded SVG source.",
);
assert(
  resolvePackageAssetSource({ ...embeddedSvg, stableUrl: "blob:managed" }) === "blob:managed",
  "Safe managed asset identity must retain precedence.",
);

const limitNode = node({
  extensions: { figma: { minWidth: 120, maxWidth: 80 } },
});
const limits = resolvePackageAxisLimits(limitNode, "horizontal");
assert(
  limits.conflict && limits.min === undefined && limits.max === undefined,
  "Conflicting raw Figma limits must remain diagnosed and non-authoritative.",
);

const autoNode = node({ positioning: { mode: "ABSOLUTE" } });
assert(getPackageNodePositioning(autoNode) === "ABSOLUTE", "Object positioning must normalize to its mode.");
const role = resolvePackageNodeLayoutRole(autoNode, "HORIZONTAL");
assert(
  role.isAbsolute && role.parentMainAxis === "horizontal",
  "Portable layout roles must retain absolute positioning inside Auto Layout.",
);

const strokeNode = node({
  appearance: {
    visible: true,
    opacity: 1,
    fills: [],
    effects: [],
    strokeWeight: 2,
    strokes: [{ paint: solid, weight: 4, align: "OUTSIDE" }],
  },
  extensions: { figma: { strokesIncludedInLayout: false } },
});
const stroke = resolvePackageStrokeModel(strokeNode, "editor");
assert(
  stroke.strategy === "outer-shadow" && stroke.layers[0]?.weight === 4,
  "Editor stroke resolution must retain alignment, explicit weight, and non-layout strategy.",
);

const transform = resolvePackageTransform(
  node({
    extensions: {
      figma: {
        relativeTransform: [0, 1, -1, 0, 12, 24],
        width: 100,
        height: 50,
        flipHorizontal: true,
      },
    },
  }),
);
assert(
  transform.usesMatrix && transform.hasRotation && transform.isMirrored &&
    transform.matrixTranslation?.x === 12,
  "Portable transform resolution must retain matrix rotation, mirroring, and translation evidence.",
);
assert(
  !resolvePackageTransform(node({ extensions: { figma: { relativeTransform: [1, 2] } } })).matrixValid,
  "Malformed source matrices must remain explicitly invalid.",
);

const vectorNode = node({
  type: "VECTOR",
  vector: {
    renderMode: "SVG_ASSET",
    assetId: "vector",
    viewBox: { x: 0, y: 0, width: 10, height: 20 },
    preserveAspectRatio: "xMinYMin meet",
    contentBounds: { x: 1, y: 2, width: 30, height: 40 },
    fit: "FIGMA_BOUNDS",
  },
});
const vectorPackage = {
  packageId: "portable-model-test",
  rootNodeId: vectorNode.id,
  nodes: { [vectorNode.id]: vectorNode },
  assets: { vector: embeddedSvg },
  editableFields: [],
} as unknown as TemplatePackageV1;
const vector = resolvePackageVectorModel(vectorNode, vectorPackage);
assert(
  vector?.usesSvgString === true && vector.viewBox === "0 0 10 20" &&
    vector.preserveAspectRatio === "xMinYMin meet" && vector.fit === "fill" &&
    vector.contentBounds?.width === 30,
  "Portable vector resolution must retain source, viewport, aspect ratio, fit, and content bounds.",
);
