import type {
  PackageMotionLinkingDiagnostics,
  TemplatePackageDiagnostic,
} from "./types";

export type PackageDiagnosticSeverity = "info" | "warning" | "error";
export type PackageDiagnosticCategory =
  | "parse"
  | "version"
  | "schema"
  | "graph"
  | "layout"
  | "field"
  | "font"
  | "asset"
  | "motion";

export interface PackageDiagnostic {
  code: string;
  severity: PackageDiagnosticSeverity;
  category: PackageDiagnosticCategory;
  message: string;
  path?: string;
  nodeId?: string;
  details?: Record<string, unknown>;
}

export interface TemplatePackageValidationResult {
  valid: boolean;
  schemaValid: boolean;
  semanticValid: boolean;
  diagnostics: PackageDiagnostic[];
  pluginDiagnostics: TemplatePackageDiagnostic[];
  motionLinking: PackageMotionLinkingDiagnostics | null;
}

export function diagnostic(
  code: string,
  severity: PackageDiagnosticSeverity,
  category: PackageDiagnosticCategory,
  message: string,
  details: Pick<PackageDiagnostic, "path" | "nodeId" | "details"> = {},
): PackageDiagnostic {
  return { code, severity, category, message, ...details };
}
