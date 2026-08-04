import type {
  LoadedTemplatePackageSource,
  PackageDiagnostic,
  TemplatePackageValidationResult,
} from "@sleinity/template-core";
import type { LoadedSourceDiagnosticReport } from "./layeredSourceDiagnostics";

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

export interface TemplateImportValidationFindingV1 {
  code: string;
  severity: PackageDiagnostic["severity"];
  phase: TemplateImportValidationPhaseId;
  target?: {
    kind: "field" | "asset" | "node" | "path" | "package";
    id?: string;
  };
  impact: string;
  repairGuidance: string;
  diagnostic: PackageDiagnostic;
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
  findings: TemplateImportValidationFindingV1[];
  counts: {
    blockers: number;
    warnings: number;
    repairs: number;
    notes: number;
  };
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

function defaultRepairGuidance(
  phase: TemplateImportValidationPhaseId,
): string {
  return ({
    zip: "Choose an intact TemplatePackage ZIP and try again.",
    manifest: "Re-export the package with all required files and manifest entries.",
    schema: "Export the template with a supported TemplatePackage version.",
    semantics: "Correct the invalid template values and export the package again.",
    bindings: "Repair the editable-field declaration or its target in the source template.",
    assets: "Include the referenced asset with valid metadata and bytes.",
    features: "Review the affected feature and use a supported template alternative where necessary.",
  } satisfies Record<TemplateImportValidationPhaseId, string>)[phase];
}

function findingTarget(diagnostic: PackageDiagnostic): TemplateImportValidationFindingV1["target"] {
  const fieldId = diagnostic.details?.fieldId;
  const assetId = diagnostic.details?.assetId;
  if (typeof fieldId === "string") return { kind: "field", id: fieldId };
  if (typeof assetId === "string") return { kind: "asset", id: assetId };
  if (diagnostic.nodeId) return { kind: "node", id: diagnostic.nodeId };
  if (diagnostic.path) return { kind: "path", id: diagnostic.path };
  return { kind: "package" };
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
  const findings = diagnostics.map((diagnostic): TemplateImportValidationFindingV1 => {
    const phase = phaseForDiagnostic(diagnostic);
    const suggestion = diagnostic.details?.suggestion;
    return {
      code: diagnostic.code,
      severity: diagnostic.severity,
      phase,
      target: findingTarget(diagnostic),
      impact: diagnostic.severity === "error"
        ? "This prevents the template from being imported."
        : diagnostic.severity === "warning"
          ? "The template can continue, but this may affect editing or preview quality."
          : "This is recorded for review and does not block import.",
      repairGuidance: typeof suggestion === "string" && suggestion.trim()
        ? suggestion
        : defaultRepairGuidance(phase),
      diagnostic: { ...diagnostic },
    };
  });

  return {
    schemaVersion: TEMPLATE_IMPORT_VALIDATION_SCHEMA_VERSION,
    status,
    importable,
    phases,
    diagnostics,
    findings,
    counts: {
      blockers: diagnostics.filter((item) => item.severity === "error").length,
      warnings: diagnostics.filter((item) => item.severity === "warning").length,
      repairs: diagnostics.filter((item) => item.details?.repairApplied === true).length,
      notes: diagnostics.filter((item) => item.severity === "info").length,
    },
  };
}
