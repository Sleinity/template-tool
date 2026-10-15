export type RendererBackendKind =
  | "dom-css"
  | "svg"
  | "dom-svg"
  | "compatibility"
  | "raster-fallback"
  | "unsupported";

export type RendererRuntimeOwner =
  | "core-layout"
  | "text-dom"
  | "legacy-dom-css"
  | "primitive-dom-css"
  | "primitive-svg"
  | "linear-gradient-svg"
  | "ordered-solid-svg"
  | "ordered-normal-paint-svg"
  | "media-dom"
  | "vector-svg"
  | "mask-css-clip"
  | "fallback-placeholder"
  | "unsupported-preservation";

export type ResolvedBackendDisposition =
  | "semantic-owner"
  | "established-compatibility-owner"
  | "degraded-fallback"
  | "preserved-only"
  | "unsupported";

export type BackendCapabilityFamily =
  | "layout"
  | "text"
  | "media"
  | "geometry"
  | "paint"
  | "stroke"
  | "mask"
  | "effects"
  | "compositing"
  | "vector"
  | "fallback";

export type BackendSupportLevel =
  | "native"
  | "emulated"
  | "approximated"
  | "raster-fallback"
  | "preserved-only"
  | "unsupported"
  | "unknown-pending-audit";

export interface ResolvedBackendOwnerV1 {
  family: BackendCapabilityFamily;
  capabilityId: string;
  backend: RendererBackendKind;
  runtimeOwner: RendererRuntimeOwner;
  supportLevel: BackendSupportLevel;
  reason: string;
}

export interface ResolvedBackendDecisionV1 {
  schemaVersion: "resolved-backend-decision-v1";
  decisionId: string;
  nodeId: string;
  scope: "node" | "subtree-boundary";
  selectedBackend: RendererBackendKind;
  runtimeOwner: RendererRuntimeOwner;
  disposition: ResolvedBackendDisposition;
  owners: ResolvedBackendOwnerV1[];
  requiredCapabilities: string[];
  supportLevel: BackendSupportLevel;
  fallback: {
    active: boolean;
    backend: RendererBackendKind | null;
    reasonCodes: string[];
    description: string | null;
  };
  reason: string;
  editability: "editable" | "indirect" | "read-only" | "unknown";
  exportSafety: "safe" | "warning" | "blocked" | "unknown";
  confidence: "high" | "medium" | "low" | "unresolved";
  revisions: {
    source: string;
    resolved: string;
    geometry: string | null;
    asset: string | null;
    placement: string | null;
    settlement: string | null;
  };
  unavailableBackendIds: Array<"canvas-offscreen" | "webgl">;
}

export interface ResolvedBackendAvailabilityV1 {
  schemaVersion: "resolved-backend-availability-v1";
  backends: Array<{
    backend: "canvas-offscreen" | "webgl";
    availability: "unavailable";
    capabilityBoundary: string[];
    reason: string;
  }>;
}

export type ResolvedDiagnosticClassification =
  | "source-exporter-issue"
  | "normalization-issue"
  | "unsupported-renderer-capability"
  | "layout-stabilization-issue"
  | "missing-font-or-asset"
  | "measurement-variance"
  | "visual-regression"
  | "user-actionable-issue";

export interface ResolvedBackendDiagnosticV1 {
  id: string;
  nodeId: string;
  regionId: string;
  capabilityId: string;
  classifications: ResolvedDiagnosticClassification[];
  supportLevel: BackendSupportLevel;
  selectedBackend: RendererBackendKind;
  runtimeOwner: RendererRuntimeOwner;
  disposition: ResolvedBackendDisposition;
  fallback: ResolvedBackendDecisionV1["fallback"];
  confidence: ResolvedBackendDecisionV1["confidence"];
  visualImpact: "none" | "low" | "medium" | "high" | "unknown";
  explanation: string;
  userRepairable: boolean;
  userAction: string | null;
  audience: "user" | "technical-trace";
  severity: "info" | "warning";
  sourceDiagnosticCodes: string[];
}

export interface ResolvedBackendDiagnosticGroupV1 {
  id: string;
  kind: "capability" | "region";
  key: string;
  diagnosticIds: string[];
  nodeIds: string[];
}

export interface ResolvedBackendDiagnosticProjectionV1 {
  schemaVersion: "resolved-backend-diagnostic-projection-v1";
  projectionId: string;
  sourceDecisionRevision: string;
  diagnostics: ResolvedBackendDiagnosticV1[];
  groups: ResolvedBackendDiagnosticGroupV1[];
}
