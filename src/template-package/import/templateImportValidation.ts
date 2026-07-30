import type {
  LoadedSourceDiagnosticReport,
  LoadedTemplatePackageSource,
} from "../bundle";
import type {
  PackageDiagnostic,
  TemplatePackageValidationResult,
} from "../packageDiagnostics";

export const TEMPLATE_IMPORT_VALIDATION_SCHEMA_VERSION =
  "template-import-validation-v1" as const;

export type TemplateImportValidationPhaseId =
  | "zip"
  | "manifest"
  | "schema"
  | "semantics"
  | "bindings"
  | "assets"
  | "features";

export type TemplateImportValidationPhaseStatus =
  | "not-run"
  | "ready"
  | "warning"
  | "blocked";

export interface TemplateImportValidationPhaseV1 {
  id: TemplateImportValidationPhaseId;
  status: TemplateImportValidationPhaseStatus;
  diagnostics: PackageDiagnostic[];
}

export interface TemplateImportValidationReportV1 {
  schemaVersion: typeof TEMPLATE_IMPORT_VALIDATION_SCHEMA_VERSION;
  status: "ready" | "warning" | "blocked";
  importable: boolean;
  phases: Record<
    TemplateImportValidationPhaseId,
    TemplateImportValidationPhaseV1
  >;
  diagnostics: PackageDiagnostic[];
}

const phaseIds: TemplateImportValidationPhaseId[] = [
  "zip",
  "manifest",
  "schema",
  "semantics",
  "bindings",
  "assets",
  "features",
];

function phaseForDiagnostic(
  diagnostic: PackageDiagnostic,
): TemplateImportValidationPhaseId {
  const sourceCategory = diagnostic.details?.sourceCategory;
  if (
    diagnostic.category === "parse" &&
    (sourceCategory === "zip" || diagnostic.code.includes("zip"))
  ) {
    return "zip";
  }
  if (
    diagnostic.category === "parse" ||
    diagnostic.code.includes("manifest") ||
    diagnostic.code.includes("required-file")
  ) {
    return "manifest";
  }
  if (
    diagnostic.category === "schema" ||
    diagnostic.category === "version"
  ) {
    return "schema";
  }
  if (diagnostic.category === "field") return "bindings";
  if (diagnostic.category === "asset") return "assets";
  if (
    diagnostic.category === "layout" ||
    diagnostic.category === "font" ||
    diagnostic.category === "motion"
  ) {
    return "features";
  }
  return "semantics";
}

function phaseStatus(
  diagnostics: readonly PackageDiagnostic[],
  ran: boolean,
): TemplateImportValidationPhaseStatus {
  if (!ran) return "not-run";
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return "blocked";
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === "warning")) {
    return "warning";
  }
  return "ready";
}

export function createFailedTemplatePackageValidation(
  diagnostics: readonly PackageDiagnostic[],
): TemplatePackageValidationResult {
  return {
    valid: false,
    schemaValid: false,
    semanticValid: false,
    diagnostics: diagnostics.map((diagnostic) => ({ ...diagnostic })),
    pluginDiagnostics: [],
    motionLinking: null,
  };
}

export function createTemplateImportValidationReport(input: {
  diagnostics: readonly PackageDiagnostic[];
  validation?: TemplatePackageValidationResult | null;
  loadedSource?: LoadedTemplatePackageSource | null;
  layeredDiagnostics?: LoadedSourceDiagnosticReport | null;
}): TemplateImportValidationReportV1 {
  const diagnostics = input.diagnostics.map((diagnostic) => ({
    ...diagnostic,
  }));
  const grouped = new Map<
    TemplateImportValidationPhaseId,
    PackageDiagnostic[]
  >(phaseIds.map((id) => [id, []]));
  diagnostics.forEach((diagnostic) => {
    grouped.get(phaseForDiagnostic(diagnostic))?.push(diagnostic);
  });

  const sourceAvailable = Boolean(input.loadedSource);
  const packageAvailable = Boolean(input.loadedSource?.packageValue);
  const schemaRan = Boolean(input.validation || input.loadedSource?.validation);
  const semanticRan = Boolean(input.validation);
  const ranByPhase: Record<TemplateImportValidationPhaseId, boolean> = {
    zip: true,
    manifest: sourceAvailable,
    schema: schemaRan,
    semantics: semanticRan,
    bindings: semanticRan,
    assets: packageAvailable,
    features: packageAvailable,
  };

  const phases = Object.fromEntries(
    phaseIds.map((id) => {
      const phaseDiagnostics = grouped.get(id) ?? [];
      return [
        id,
        {
          id,
          status: phaseStatus(phaseDiagnostics, ranByPhase[id]),
          diagnostics: phaseDiagnostics,
        } satisfies TemplateImportValidationPhaseV1,
      ];
    }),
  ) as TemplateImportValidationReportV1["phases"];

  const importable =
    Boolean(input.validation?.valid) &&
    input.layeredDiagnostics?.canImport !== false &&
    !diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const status = importable
    ? diagnostics.some((diagnostic) => diagnostic.severity === "warning")
      ? "warning"
      : "ready"
    : "blocked";

  return {
    schemaVersion: TEMPLATE_IMPORT_VALIDATION_SCHEMA_VERSION,
    status,
    importable,
    phases,
    diagnostics,
  };
}
