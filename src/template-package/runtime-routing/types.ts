import type { CanonicalSceneGraphV1 } from "../scene";

export type RuntimePropertyOwnershipState =
  | "settled-authoritative"
  | "compatibility-authoritative"
  | "intrinsic-measurement-input"
  | "static-canonical"
  | "unsupported"
  | "unresolved";

export interface CoreLayoutRouteNodeV1 {
  nodeId: string;
  ownership: RuntimePropertyOwnershipState;
  routed: boolean;
  boundaryRootId: string | null;
  reasonCodes: string[];
}

export interface CoreLayoutRouteV1 {
  schemaVersion: "core-layout-route-v1";
  sceneVersion: CanonicalSceneGraphV1["schemaVersion"];
  rootNodeId: string;
  nodes: Record<string, CoreLayoutRouteNodeV1>;
  routedNodeIds: string[];
  compatibilityNodeIds: string[];
  fallbackBoundaries: Array<{ nodeId: string; reasonCodes: string[] }>;
  circularDependencies: Array<{
    nodeId: string;
    parentId: string;
    axis: "horizontal" | "vertical";
    classification: "fill-inside-hug-main-axis" | "fill-inside-hug-cross-axis";
    reasonCode: "circular-fill-inside-hug-axis";
    fallbackChain: string[];
  }>;
}

export interface IntrinsicTextMeasurementV1 {
  nodeId: string;
  width: number;
  height: number;
  lineCount: number;
  capHeight: number | null;
  verticalTrim: VerticalTextTrimMode;
  trimAuthority: "authoritative" | "compatibility" | "not-requested";
  fontState: "exact" | "approved-replacement" | "fallback" | "unavailable";
  fontIdentity: {
    family: string | null;
    weight: number;
    style: string;
  };
  fontMetrics: {
    ascent: number | null;
    descent: number | null;
    capHeight: number | null;
    baseline: number | null;
    lineHeight: number;
    firstLineCapTop: number | null;
    finalLineBaseline: number | null;
  };
  glyphOrigin: {
    browserLineBoxOriginY: number;
    capTopFromBrowserOrigin: number;
    baselineFromBrowserOrigin: number;
    translationY: number;
    resolvedFirstCapTopY: number;
    resolvedFinalBaselineY: number;
  } | null;
  boxes: {
    layout: { width: number; height: number };
    browserLine: { width: number; height: number };
    figmaTrimmed: { width: number; height: number } | null;
    glyphPaint: { top: number; bottom: number } | null;
    clipping: { width: number; height: number; active: boolean };
  };
  metricSource: "canvas-and-dom-calibration" | "range-line-box";
  revision: string;
}

export type VerticalTextTrimMode =
  | "none"
  | "cap-height-to-baseline"
  | "unsupported";

export interface CoreLayoutSettledNodeV1 {
  nodeId: string;
  bounds: { x: number; y: number; width: number; height: number };
  ownership: RuntimePropertyOwnershipState;
  textMeasurement: IntrinsicTextMeasurementV1 | null;
  imageSlot: { x: number; y: number; width: number; height: number } | null;
  clipBounds: { x: number; y: number; width: number; height: number } | null;
}

export interface CoreLayoutSettlementV1 {
  schemaVersion: "core-layout-settlement-v1";
  settlementId: string;
  revision: string;
  rootNodeId: string;
  nodeOrder: string[];
  nodes: Record<string, CoreLayoutSettledNodeV1>;
  readiness: "ready" | "pending-measurements" | "unsupported";
  stable: boolean;
  iterationCount: number;
  settlementMs: number;
  measurementCount: number;
  recomputedNodeIds: string[];
  routedNodeCount: number;
  compatibilityNodeCount: number;
  fallbackBoundaries: CoreLayoutRouteV1["fallbackBoundaries"];
  diagnostics: Array<{ code: string; nodeId?: string; message: string }>;
}
