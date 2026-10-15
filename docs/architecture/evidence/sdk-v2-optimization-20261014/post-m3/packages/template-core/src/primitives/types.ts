import type {
  PackageColor,
  PackagePaint,
  PackageRect,
  PackageSolidPaint,
  PackageStroke,
} from "../types";

export type PrimitiveAppearanceOwnership =
  | "primitive-authoritative"
  | "compatibility-authoritative";

export type PrimitiveCornerValues = [number, number, number, number];

export type LinearGradientMatrixV1 = [
  [number, number, number],
  [number, number, number],
];

export interface ResolvedLinearGradientStopV1 {
  sourceIndex: number;
  position: number;
  color: PackageColor;
}

export interface ResolvedLinearGradientGeometryV1 {
  schemaVersion: "resolved-linear-gradient-v1";
  coordinateSpace: "normalized-node-local-to-normalized-gradient";
  sourceIndex: number;
  sourceMatrix: LinearGradientMatrixV1 | null;
  determinant: number | null;
  inverseMatrix: LinearGradientMatrixV1 | null;
  inversionCount: 0 | 1;
  normalizedHandles: {
    start: { x: number; y: number } | null;
    end: { x: number; y: number } | null;
    third: { x: number; y: number } | null;
  };
  templateHandles: {
    start: { x: number; y: number } | null;
    end: { x: number; y: number } | null;
    third: { x: number; y: number } | null;
  };
  svgGradientTransform: LinearGradientMatrixV1 | null;
  stops: ResolvedLinearGradientStopV1[];
  paintOpacity: number;
  capability: "source-certified-linear-gradient" | "unsupported-linear-gradient";
  runtimeOwner: "svg" | "compatibility";
  fallbackReason: string | null;
  sourceRevision: string;
  geometryRevision: string;
  provenance: {
    canonicalPath: string | null;
    rawFigmaPath: string | null;
    normalizationRevision: string | null;
    conflicts: string[];
  };
}

export interface PrimitiveCornerGeometryV1 {
  order: ["top-left", "top-right", "bottom-right", "bottom-left"];
  raw: number | PrimitiveCornerValues | null;
  uniform: boolean;
  requested: PrimitiveCornerValues;
  effective: PrimitiveCornerValues;
  css: string;
  clamped: boolean;
  normalizationScale: number;
  normalizationScales: PrimitiveCornerValues;
  clampReason: "none" | "negative-radius-floor" | "opposing-radii-exceed-bounds";
}

export interface ResolvedOrderedSolidPaintV1 {
  sourceIndex: number;
  type: "SOLID";
  visible: boolean;
  visibilitySource: "explicit" | "default-visible";
  rgb: { r: number; g: number; b: number };
  canonicalColorAlpha: number;
  paintOpacity: number;
  effectiveSourceAlpha: number;
  blendMode: "NORMAL";
  role: "ordinary-visible" | "hidden-preserved";
  capability: "source-certified-ordered-solid-layer";
  paintRevision: string;
  provenance: {
    canonicalPath: string;
    rawFigmaPath: string | null;
    normalizationRevision: string;
    opacityDisposition: "raw-paint-opacity" | "mirrored-compatibility-alias";
    serializedColorAlpha: number;
    serializedPaintOpacity: number;
    conflicts: string[];
  };
  source: PackageSolidPaint;
}

export interface ResolvedOrderedSolidStackV1 {
  schemaVersion: "resolved-ordered-solid-stack-v1";
  nodeId: string;
  canonicalSourceRevision: string;
  resolvedStackRevision: string;
  primitiveGeometryRevision: string;
  currentBounds: PackageRect;
  cornerGeometry: PrimitiveCornerGeometryV1;
  orderedPaints: ResolvedOrderedSolidPaintV1[];
  visiblePaintIndices: number[];
  capability:
    | "source-certified-ordered-solid-stack"
    | "compatibility-ordered-solid-stack";
  runtimeOwner: "svg-ordered-solid-stack" | "compatibility";
  fallbackReasons: string[];
  provenance: {
    canonicalPath: string;
    rawFigmaPaths: string[];
    normalizationRevisions: string[];
  };
}

export interface ResolvedOrderedNormalPaintLayerV1 {
  sourceIndex: number;
  visible: boolean;
  blendMode: "NORMAL";
  type: "SOLID" | "GRADIENT_LINEAR";
  capability:
    | "source-certified-ordered-solid-layer"
    | "source-certified-linear-gradient";
  solid: ResolvedOrderedSolidPaintV1 | null;
  linearGradient: ResolvedLinearGradientGeometryV1 | null;
  layerRevision: string;
}

export interface ResolvedOrderedNormalPaintStackV1 {
  schemaVersion: "resolved-ordered-normal-paint-stack-v1";
  nodeId: string;
  canonicalSourceRevision: string;
  resolvedStackRevision: string;
  primitiveGeometryRevision: string;
  currentBounds: PackageRect;
  cornerGeometry: PrimitiveCornerGeometryV1;
  orderedLayers: ResolvedOrderedNormalPaintLayerV1[];
  visiblePaintIndices: number[];
  capability:
    | "source-certified-solid-linear-normal-stack"
    | "compatibility-ordered-normal-paint-stack";
  runtimeOwner: "svg-ordered-normal-paint-stack" | "compatibility";
  fallbackReasons: string[];
  provenance: {
    canonicalPath: string;
    rawFigmaPaths: string[];
    normalizationRevisions: string[];
  };
}

export interface PrimitiveStrokeCornerGeometryV1 {
  fill: PrimitiveCornerValues;
  inner: PrimitiveCornerValues;
  centerLine: PrimitiveCornerValues;
  outer: PrimitiveCornerValues;
}

export interface PrimitivePaintLayerV1 {
  sourceIndex: number;
  type: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  role:
    | "ordinary-visible"
    | "hidden-preserved"
    | "mask-input"
    | "unsupported-compositing-input";
  color: string | null;
  effectiveAlpha: number | null;
  capability:
    | "opaque-solid"
    | "source-certified-ordered-solid-layer"
    | "source-certified-linear-gradient"
    | "preserved-unrouted";
  linearGradient: ResolvedLinearGradientGeometryV1 | null;
  owner: PrimitiveAppearanceOwnership;
  paintRevision: string;
  fallbackReason: string | null;
  source: PackagePaint;
}

export interface PrimitiveStrokeLayerV1 {
  sourceIndex: number;
  type: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  color: string | null;
  effectiveAlpha: number | null;
  weight: number;
  alignment: "INSIDE" | "CENTER" | "OUTSIDE" | null;
  capability:
    | "rectangular-inside-opaque-solid"
    | "rectangular-center-opaque-solid"
    | "rectangular-outside-opaque-solid"
    | "preserved-unrouted";
  owner: PrimitiveAppearanceOwnership;
  strokeRevision: string;
  sourceBounds: PackageRect;
  sourcePathBounds: PackageRect;
  fillBounds: PackageRect;
  centerPathBounds: PackageRect | null;
  innerStrokeBounds: PackageRect | null;
  outerStrokeBounds: PackageRect | null;
  visualStrokeBounds: PackageRect | null;
  cornerGeometry: PrimitiveStrokeCornerGeometryV1 | null;
  effectiveOuterBounds: PackageRect;
  effectiveInnerBounds: PackageRect | null;
  fallbackReason: string | null;
  source: PackagePaint | PackageStroke;
}

export interface PrimitiveAppearanceV1 {
  schemaVersion: "primitive-appearance-v1";
  nodeId: string;
  nodeType: string;
  bounds: PackageRect;
  geometry: {
    kind: "rectangular-frame" | "rectangle" | "unsupported";
    axisAligned: boolean;
    corner: PrimitiveCornerGeometryV1;
    sourceBounds: PackageRect;
    settledBounds: PackageRect;
    localTransform: unknown;
    effectiveTransform: unknown;
    clippingBounds: PackageRect | null;
    ancestorClipChain: Array<{ nodeId: string; bounds: PackageRect }>;
    capability:
      | "axis-aligned-rectangular"
      | "axis-aligned-independent-corners"
      | "rotated-source-certified-linear-gradient"
      | "compatibility";
  };
  paints: {
    orderIsAuthoritative: true;
    orderConvention: "source-array-order";
    layers: PrimitivePaintLayerV1[];
    routedLayerIndex: number | null;
    orderedSolidStack: ResolvedOrderedSolidStackV1 | null;
    orderedNormalPaintStack: ResolvedOrderedNormalPaintStackV1 | null;
    renderStrategy:
      | "dom-css-single-solid"
      | "svg-linear-gradient"
      | "svg-ordered-solid-stack"
      | "svg-ordered-normal-paint-stack"
      | "compatibility"
      | "none";
  };
  strokes: {
    orderIsAuthoritative: true;
    orderConvention: "source-array-order";
    layers: PrimitiveStrokeLayerV1[];
    routedLayerIndex: number | null;
    renderStrategy:
      | "css-inset-shadow"
      | "svg-inside-stroke"
      | "svg-center-stroke"
      | "svg-outside-stroke"
      | "svg-linear-gradient"
      | "compatibility"
      | "none";
  };
  opacity: {
    node: number;
    compositing: "opaque-source-certified" | "compatibility";
  };
  ownership: PrimitiveAppearanceOwnership;
  backend: "dom-css" | "svg" | "compatibility";
  fallbackReasons: string[];
  sourceRevision: string;
  geometryRevision: string;
  provenance: {
    packageId: string;
    sourcePaths: string[];
    rawFigmaKeys: string[];
  };
}

export interface PrimitiveCanvasAuthorityV1 {
  schemaVersion: "primitive-canvas-authority-v1";
  cssBackground: string;
  sourceKind: "color" | "css-string" | "transparent-fallback";
  ownership: "canonical-canvas-authoritative";
  revision: string;
}
