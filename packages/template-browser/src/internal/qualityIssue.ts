export type PackageQualitySeverity = "error" | "warning" | "info";

export type PackageQualityOrigin =
  | "app"
  | "plugin"
  | "loader"
  | "raw-source"
  | "normalization"
  | "package-validation"
  | "asset-registry"
  | "asset-reliability"
  | "field-validation"
  | "font-requirements"
  | "motion"
  | "mcp"
  | "preview"
  | "renderer"
  | "resolved-tree"
  | "asset"
  | "font"
  | "field"
  | "export"
  | "figma"
  | "visual-diff"
  | "backend-decision";

export type PackageQualityCategory =
  | "import"
  | "package"
  | "node-graph"
  | "renderer"
  | "assets"
  | "fonts"
  | "fields"
  | "export"
  | "source"
  | "motion"
  | "preview";

export type PackageQualityLayer =
  | "package-structure"
  | "json-parsing"
  | "source-contract"
  | "canvas-root"
  | "node-graph"
  | "geometry-bounds"
  | "asset-references"
  | "editable-fields"
  | "font-requirements"
  | "motion-links"
  | "mcp-links"
  | "preview-reference"
  | "render-readiness"
  | "runtime";

export type PackageQualityGate = "import" | "create" | "export";
export type PackageQualityHealth = "ready" | "review" | "blocked";
export type PackageQualityOriginBoundary =
  | "source-exporter"
  | "normalization"
  | "canonical"
  | "resolved"
  | "settlement"
  | "dependency"
  | "browser-measurement"
  | "regression-evidence";
export type PackageQualityImpact = "visual" | "editing" | "persistence" | "export";
export type DiagnosticSeverity = "blocked" | "review" | "repaired" | "information";
export type DiagnosticAudience = "user" | "validation-history" | "technical-trace";
export type DiagnosticResolution =
  | "none"
  | "auto-repaired"
  | "repair-available"
  | "user-action-required";
export type DiagnosticContext =
  | { type: "visual-target"; nodeIds: string[] }
  | { type: "asset"; assetId: string }
  | { type: "font"; fontKey: string }
  | { type: "field"; fieldId: string }
  | { type: "package"; sourcePath?: string }
  | { type: "none" };
export type DiagnosticUserAction = {
  kind: "configure-field" | "load-font" | "retry-validation" | "inspect-layer";
  label: string;
};

export interface DiagnosticPresentation {
  userTitle: string;
  userSummary: string;
  userImpact?: string;
  userAction?: DiagnosticUserAction;
  developerNote?: string;
  technicalMessage?: string;
}

export interface PackageQualityIssue {
  id: string;
  fingerprint: string;
  code: string;
  severity: PackageQualitySeverity;
  category: PackageQualityCategory;
  origins: PackageQualityOrigin[];
  message: string;
  whyItMatters: string;
  suggestedFix?: string;
  blocks: PackageQualityGate[];
  blocksImport: boolean;
  layer?: PackageQualityLayer;
  modes?: Array<"static" | "editor">;
  path?: string;
  file?: string;
  nodeId?: string;
  sourceNodeId?: string;
  nodeName?: string;
  layerPath?: string;
  assetId?: string;
  fieldId?: string;
  ref?: string;
  relatedIds?: string[];
  details?: Record<string, unknown>;
  audience?: DiagnosticAudience;
  resolution?: DiagnosticResolution;
  context?: DiagnosticContext;
  presentation?: DiagnosticPresentation;
  capabilityId?: string;
  regionId?: string;
  backendOwner?: string;
  supportLevel?: string;
  confidence?: string;
  visualImpact?: string;
  userRepairable?: boolean;
  rootCauseId?: string;
  originBoundary?: PackageQualityOriginBoundary;
  affectedSurfaces?: Array<"validate" | "fields" | "editor" | "preview" | "png-export">;
  impacts?: PackageQualityImpact[];
  recommendedAction?: string;
}
