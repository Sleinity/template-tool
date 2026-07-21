import type { PackageEffect, PackagePaint, PackageRect, PackageStroke } from "../types";

export type AppearanceEvidenceLevel = "sufficient" | "partial" | "preserved-only" | "absent";
export type AppearanceBackend = "dom-svg-css" | "canvas-2d" | "webgl" | "raster-fallback" | "unresolved";

export interface AppearanceContractSourceV1 {
  nodeId: string;
  sourcePaths: string[];
  rawFigmaKeys: string[];
  confidence: "high" | "medium" | "low" | "unresolved";
}

export interface MediaPlacementV1 extends AppearanceContractSourceV1 {
  schemaVersion: "media-placement-v1";
  assetId: string | null;
  slotBounds: PackageRect;
  intrinsicSize: { width: number | null; height: number | null };
  fitMode: string;
  imageTransform: number[][] | null;
  focalPosition: { x: number; y: number };
  activePlacementState: string;
  placementRevision: number;
  replacementMode: string | null;
  preserveAspectRatio: boolean;
  adjustments: unknown;
}

export interface GeometryShapeV1 extends AppearanceContractSourceV1 {
  schemaVersion: "geometry-shape-v1";
  nodeType: string;
  bounds: PackageRect;
  shapeKind: string | null;
  vector: unknown;
  cornerRadius: number | null;
  cornerRadii: unknown;
  cornerSmoothing: unknown;
  arcData: unknown;
  polygonPointCount: unknown;
  starInnerRadius: unknown;
}

export interface PaintStackV1 extends AppearanceContractSourceV1 {
  schemaVersion: "paint-stack-v1";
  paints: Array<PackagePaint & { sourceIndex: number }>;
  orderIsAuthoritative: true;
}

export interface StrokeStackV1 extends AppearanceContractSourceV1 {
  schemaVersion: "stroke-stack-v1";
  strokes: Array<(PackagePaint | PackageStroke) & { sourceIndex: number }>;
  defaultWeight: number | null;
  defaultAlignment: string | null;
  rawDashCapJoinEvidence: unknown;
  orderIsAuthoritative: true;
}

export interface MaskGraphV1 extends AppearanceContractSourceV1 {
  schemaVersion: "mask-graph-v1";
  parentId: string | null;
  childOrder: string[];
  isMask: boolean;
  maskType: string | null;
  shouldBreakMaskChain: boolean;
  maskedSiblingRange: "source-declared" | "unresolved" | null;
  clipContent: boolean;
  nestedMaskAncestorIds: string[];
}

export interface EffectStackV1 extends AppearanceContractSourceV1 {
  schemaVersion: "effect-stack-v1";
  effects: Array<PackageEffect & { sourceIndex: number }>;
  orderIsAuthoritative: true;
}

export interface CompositingGroupV1 extends AppearanceContractSourceV1 {
  schemaVersion: "compositing-group-v1";
  opacity: number;
  blendMode: string | null;
  visible: boolean;
  childOrder: string[];
  isolation: "pass-through" | "isolated" | "unresolved";
  requiresOffscreenCompositing: boolean | "unresolved";
}

export interface AppearanceSourceSufficiencyRecordV1 {
  family: "media" | "geometry" | "paints" | "strokes" | "masks" | "effects" | "compositing" | "design-systems";
  level: AppearanceEvidenceLevel;
  evidenceNodeIds: string[];
  canonicalPaths: string[];
  rawExtensionKeys: string[];
  gaps: string[];
}

export interface AppearanceBackendRequirementV1 {
  capability: string;
  preferredBackend: AppearanceBackend;
  viableBackends: AppearanceBackend[];
  currentBackend: AppearanceBackend;
  sourceSufficiency: AppearanceEvidenceLevel;
  reason: string;
  fallback: string;
}

export interface AppearanceContractProjectionV1 {
  schemaVersion: "appearance-contract-projection-v1";
  sourceSceneVersion: "canonical-scene-graph-v1";
  packageId: string;
  rootNodeId: string;
  nodeOrder: string[];
  media: MediaPlacementV1[];
  geometry: GeometryShapeV1[];
  paints: PaintStackV1[];
  strokes: StrokeStackV1[];
  masks: MaskGraphV1[];
  effects: EffectStackV1[];
  compositing: CompositingGroupV1[];
  sourceSufficiency: AppearanceSourceSufficiencyRecordV1[];
  backendRequirements: AppearanceBackendRequirementV1[];
  compatibility: {
    runtimeUse: "disabled-observational";
    rendererAuthority: "unchanged";
    pixelEquivalenceClaimed: false;
  };
}

export interface AppearanceContractValidationIssue {
  code: string;
  path: string;
  message: string;
}
