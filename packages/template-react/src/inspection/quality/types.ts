import type {
  DiagnosticAudience,
  DiagnosticContext,
  DiagnosticPresentation,
  DiagnosticResolution,
  PackageQualityCategory,
  PackageQualityHealth,
  PackageQualityIssue,
  PackageQualityLayer,
  PackageQualityOrigin,
  PackageQualitySeverity,
} from "@sleinity/template-core/inspection";
import type { ResolvedProductRenderIdentityV1 } from "../../render/productRenderIdentity";
export type * from "@sleinity/template-core/inspection";

export interface PackageQualitySupplementalDiagnostic {
  code: string;
  severity: PackageQualitySeverity;
  category: PackageQualityCategory;
  message: string;
  origin?: PackageQualityOrigin;
  layer?: PackageQualityLayer;
  path?: string;
  file?: string;
  nodeId?: string;
  sourceNodeId?: string;
  fieldId?: string;
  assetId?: string;
  ref?: string;
  relatedIds?: string[];
  suggestion?: string;
  details?: Record<string, unknown>;
}

export interface PackageQualityReport {
  status: PackageQualityHealth;
  health: {
    import: PackageQualityHealth;
    fidelity: PackageQualityHealth;
    assets: PackageQualityHealth;
    editability: PackageQualityHealth;
    export: PackageQualityHealth;
  };
  summary: {
    errors: number;
    warnings: number;
    info: number;
    importBlockers: number;
    exportBlockers: number;
  };
  renderingHealth: {
    schemaVersion: "rendering-health-projection-v1";
    readiness: {
      import: PackageQualityHealth;
      dependencies: PackageQualityHealth;
      editing: PackageQualityHealth;
      preview: PackageQualityHealth;
      export: PackageQualityHealth;
    };
    semanticCapabilityFamilies: string[];
    compatibilityRegionCount: number;
    reviewFallbackRegionCount: number;
    preservedOnlyRegionCount: number;
    unsupportedCapabilities: string[];
    sourceReference: {
      availability: "available" | "missing";
      comparison: "not-run-in-product";
    };
    productRenderIdentity: ResolvedProductRenderIdentityV1 | null;
  };
  issues: PackageQualityIssue[];
}
