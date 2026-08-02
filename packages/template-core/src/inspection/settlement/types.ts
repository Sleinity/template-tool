import type { CanonicalSceneGraphV1, SceneConfidence } from "../../scene/types";

export const MEASUREMENT_SNAPSHOT_VERSION = "measurement-snapshot-v1" as const;
export const DEPENDENCY_GRAPH_VERSION = "dependency-graph-v1" as const;
export const SETTLEMENT_INPUT_VERSION = "settlement-input-v1" as const;
export const SETTLED_SCENE_GRAPH_VERSION = "settled-scene-graph-v1" as const;

export type SettlementEnvironmentProfile = "chromium-headless" | "chromium-visible" | "synthetic-test" | "unknown";
export type ReadinessState = "ready" | "pending-fonts" | "pending-assets" | "pending-measurements" | "unstable" | "unsupported";
export type DependencyEdgeKind =
  | "semantic-input"
  | "measurement-input"
  | "ancestor-layout"
  | "sibling-layout"
  | "constraint"
  | "media-placement"
  | "clip-mask-effect"
  | "diagnostic"
  | "export-readiness";

export interface RevisionVectorV1 {
  package: number;
  scene: number;
  overrides: number;
  fonts: number;
  assets: number;
  container: number;
  epoch: number;
}

export interface MeasurementRecordV1 {
  id: string;
  nodeId: string;
  property: "bounds" | "text-box" | "text-range" | "intrinsic-image" | "container" | "font-readiness" | "asset-readiness";
  value: unknown;
  unit: "scene-px" | "css-px" | "boolean" | "pixels" | "unitless";
  coordinateSpace: "scene" | "viewport" | "element" | "intrinsic" | "none";
  source: "dom-bounds" | "dom-range" | "dom-scroll" | "font-face-set" | "image-decode" | "fixture-metadata" | "synthetic-test";
  dependencies: string[];
  readiness: "ready" | "pending" | "failed" | "fallback";
  valid: boolean;
  confidence: SceneConfidence;
  approximation: string | null;
}

export interface MeasurementSnapshotV1 {
  schemaVersion: typeof MEASUREMENT_SNAPSHOT_VERSION;
  fixture: { id: string; zipSha256: string };
  surface: string;
  environmentProfile: SettlementEnvironmentProfile;
  revision: RevisionVectorV1;
  records: MeasurementRecordV1[];
  readiness: {
    fonts: "ready" | "pending" | "unsupported";
    assets: "ready" | "pending" | "failed";
    geometryStable: boolean;
    framesObserved: number | null;
  };
  provenance: { route: string | null; rendererMode: string | null; captureRunId: string | null };
  capturedAt: string | null;
}

export interface DependencyVertexV1 {
  key: string;
  nodeId: string | null;
  property: string;
  kind: "semantic" | "measurement" | "derived" | "readiness" | "diagnostic" | "export";
}

export interface DependencyEdgeV1 {
  from: string;
  to: string;
  kind: DependencyEdgeKind;
  reason: string;
}

export interface DependencyGraphV1 {
  schemaVersion: typeof DEPENDENCY_GRAPH_VERSION;
  fixture: { id: string; zipSha256: string };
  sceneVersion: CanonicalSceneGraphV1["schemaVersion"];
  vertices: DependencyVertexV1[];
  edges: DependencyEdgeV1[];
  nodeOrder: string[];
  fullTreeFallbacks: Array<{ source: string; reason: string }>;
}

export type InvalidationEventV1 =
  | { type: "property-change"; nodeId: string; property: string }
  | { type: "font-state-change"; fontId: string }
  | { type: "asset-state-change"; assetId: string }
  | { type: "container-resize"; nodeId?: string }
  | { type: "scene-revision" }
  | { type: "unknown"; source: string };

export interface InvalidationTraceStepV1 {
  key: string;
  via: string | null;
  kind: DependencyEdgeKind | "direct" | "full-tree-fallback";
  reason: string;
}

export interface InvalidationResultV1 {
  schemaVersion: "invalidation-result-v1";
  events: InvalidationEventV1[];
  directKeys: string[];
  affectedKeys: string[];
  affectedNodeIds: string[];
  measurementsToRefresh: string[];
  diagnosticsToRefresh: string[];
  exportReadinessInvalidated: boolean;
  usedFullTreeFallback: boolean;
  trace: InvalidationTraceStepV1[];
}

export interface SettlementInputV1 {
  schemaVersion: typeof SETTLEMENT_INPUT_VERSION;
  fixture: { id: string; zipSha256: string };
  surface: string;
  environmentProfile: SettlementEnvironmentProfile;
  scene: CanonicalSceneGraphV1;
  dependencies: DependencyGraphV1;
  measurements: MeasurementSnapshotV1;
  revision: RevisionVectorV1;
  previous?: SettledSceneGraphV1 | null;
  options?: { maxIterations?: number; geometryTolerance?: number };
}

export interface SettledMediaPlacementV1 {
  slot: { x: number; y: number; width: number; height: number };
  intrinsic: { width: number | null; height: number | null };
  mode: string;
  destination: { x: number; y: number; width: number; height: number } | null;
  sourceCrop: { x: number; y: number; width: number; height: number } | null;
  focalPosition: { x: number; y: number };
  preserveAspectRatio: boolean;
}

export interface SettledNodeV1 {
  id: string;
  parentId: string | null;
  bounds: { x: number; y: number; width: number; height: number };
  boundsAuthority: "measurement" | "settlement" | "canonical-fallback";
  textMeasurement: { width: number; height: number; scrollWidth: number | null; scrollHeight: number | null } | null;
  mediaPlacement: SettledMediaPlacementV1 | null;
  clip: { strategy: string; bounds: { x: number; y: number; width: number; height: number } } | null;
  mask: { status: "not-applicable" | "unresolved"; dependencyKeys: string[] };
  effects: { status: "not-applicable" | "unresolved"; dependencyKeys: string[] };
  readiness: ReadinessState;
  unresolved: string[];
  approximations: string[];
  changedProperties: string[];
}

export interface SettlementIterationV1 {
  iteration: number;
  changedNodeIds: string[];
  maxGeometryDelta: number;
  measurementCount: number;
  unresolvedCount: number;
}

export interface SettledSceneGraphV1 {
  schemaVersion: typeof SETTLED_SCENE_GRAPH_VERSION;
  fixture: { id: string; zipSha256: string };
  surface: string;
  environmentProfile: SettlementEnvironmentProfile;
  sourceSceneVersion: CanonicalSceneGraphV1["schemaVersion"];
  revision: RevisionVectorV1;
  rootNodeId: string;
  nodeOrder: string[];
  nodes: Record<string, SettledNodeV1>;
  readiness: ReadinessState;
  stable: boolean;
  iterations: SettlementIterationV1[];
  invalidation: InvalidationResultV1 | null;
  unresolvedDependencies: string[];
  performance: { settlementMs: number; iterationCount: number; reusedNodeCount: number; recomputedNodeCount: number };
  compatibility: { runtimeUse: "disabled-observational"; rendererAuthority: "unchanged"; productionPixelsChanged: false };
}

export interface MeasurementPublicationResultV1 {
  accepted: boolean;
  reason: string;
  snapshot: MeasurementSnapshotV1 | null;
}

export type SettlementDifferenceCategory =
  | "exact"
  | "within-tolerance"
  | "contract-gap"
  | "dependency-gap"
  | "measurement-gap"
  | "current-runtime-compatibility"
  | "environment-variance"
  | "unsupported-preserved"
  | "likely-future-renderer-bug";

export interface SettlementComparisonV1 {
  schemaVersion: "settlement-comparison-v1";
  fixture: { id: string; zipSha256: string };
  surface: string;
  tolerances: { geometry: number; text: number };
  nodeResults: Array<{ nodeId: string; category: SettlementDifferenceCategory; properties: string[]; maximumDelta: number; note: string }>;
  summary: Record<SettlementDifferenceCategory, number>;
  equivalentWithinTolerance: boolean;
}
