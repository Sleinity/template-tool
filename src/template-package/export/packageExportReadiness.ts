import { validateTemplatePackage } from "../validateTemplatePackage";
import type { TemplatePackageV1 } from "../types";
import {
  inspectPackageAssetSafety,
  type PackageAssetSafetyIssue,
} from "../packageAssetSafety";
import {
  analyzeAssetReliability,
  type AssetReliabilityReport,
} from "../assets";
import {
  createResolvedRenderTree,
  type FontFaceSetLike,
  type FontReadinessReport,
} from "../resolved";
import { prepareTemplatePackageFonts } from "../fonts";
import { validatePackageFieldConstraints } from "../editor/fieldConstraints";

export interface PackageImageExportRequest {
  format: "jpg" | "png";
  packageValue: TemplatePackageV1;
  renderMode: "static" | "editor";
}

export type PackageJpgExportRequest = PackageImageExportRequest;

export interface CapabilityReadiness {
  status: "ready" | "warning" | "blocked";
  blockerCodes: string[];
  warningCodes: string[];
}

export interface PackageExportReadinessResult {
  ready: boolean;
  status: "ready" | "warning" | "blocked";
  issues: PackageAssetSafetyIssue[];
  assetReliability: AssetReliabilityReport;
  fontReadiness?: FontReadinessReport;
  assets: CapabilityReadiness;
  fonts: CapabilityReadiness;
  fields: CapabilityReadiness;
  renderer: CapabilityReadiness;
  blockers: PackageAssetSafetyIssue[];
  warnings: PackageAssetSafetyIssue[];
}

function capability(
  issues: PackageAssetSafetyIssue[],
  codes: Set<string>,
): CapabilityReadiness {
  const matching = issues.filter((issue) => codes.has(issue.code));
  const blockers = matching.filter((issue) => issue.severity === "error");
  const warnings = matching.filter((issue) => issue.severity === "warning");
  return {
    status: blockers.length ? "blocked" : warnings.length ? "warning" : "ready",
    blockerCodes: blockers.map((issue) => issue.code),
    warningCodes: warnings.map((issue) => issue.code),
  };
}

export function validatePackageJpgExportReadiness(
  request: PackageJpgExportRequest,
  fontReadiness?: FontReadinessReport,
  strict = false,
): PackageExportReadinessResult {
  const validation = validateTemplatePackage(request.packageValue);
  const issues = Object.values(request.packageValue.assets).flatMap(
    inspectPackageAssetSafety,
  );
  const assetReliability = analyzeAssetReliability(request.packageValue);
  const fieldValidation = validatePackageFieldConstraints(
    request.packageValue,
  );

  validation.diagnostics
    .filter((item) => item.severity === "error")
    .forEach((item) => {
      issues.push({
        code: item.code,
        severity: "error",
        message: item.message,
        assetId: item.nodeId ?? "package",
      });
    });

  assetReliability.diagnostics.forEach((item) => {
    if (item.code === "asset-large-embedded-summary") {
      issues.push({
        code: item.code,
        severity: "warning",
        message: item.message,
        assetId: item.assetId ?? "package",
      });
      return;
    }
    if (item.code === "asset-duplicate") return;
    issues.push({
      code: item.code,
      severity: item.severity === "error" ? "error" : "warning",
      message: item.message,
      assetId: item.assetId ?? "package",
    });
  });

  const fontExportReady = fontReadiness
    ? fontReadiness.exportReady ??
      fontReadiness.required.every((font) => font.status === "loaded")
    : true;
  if (fontReadiness && !fontExportReady) {
    issues.push({
      code: "font.export-unresolved",
      severity: "error",
      message:
        "A required font face is unresolved or could not be verified for deterministic export.",
      assetId: "fonts",
    });
  } else if (fontReadiness && !fontReadiness.reliable) {
    issues.push({
      code: "font.export-approved-fallback",
      severity: "warning",
      message:
        "A verified, approved fallback font will be used for export.",
      assetId: "fonts",
    });
  }
  fieldValidation.issues.forEach((item) => {
    issues.push({
      code: item.code,
      severity: item.blocksExport ? "error" : "warning",
      message: item.message,
      assetId: item.fieldId,
    });
  });

  const hasErrors = issues.some((item) => item.severity === "error");
  const hasWarnings = issues.some((item) => item.severity === "warning");
  const assetCodes = new Set(
    issues
      .filter((issue) =>
        issue.code.startsWith("asset") || issue.assetId in request.packageValue.assets,
      )
      .map((issue) => issue.code),
  );
  const fontCodes = new Set(
    issues.filter((issue) => issue.code.startsWith("font.")).map((issue) => issue.code),
  );
  const fieldCodes = new Set(fieldValidation.issues.map((issue) => issue.code));
  const rendererCodes = new Set(
    validation.diagnostics
      .filter((item) => item.severity === "error")
      .map((item) => item.code),
  );
  const blockers = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");

  return {
    ready: !hasErrors,
    status: hasErrors ? "blocked" : hasWarnings ? "warning" : "ready",
    issues,
    assetReliability,
    fontReadiness,
    assets: capability(issues, assetCodes),
    fonts: capability(issues, fontCodes),
    fields: capability(issues, fieldCodes),
    renderer: capability(issues, rendererCodes),
    blockers,
    warnings,
  };
}

export async function checkPackageJpgExportReadiness(
  request: PackageJpgExportRequest,
  fontSet: FontFaceSetLike | null | undefined,
  strict = false,
): Promise<PackageExportReadinessResult> {
  const tree = createResolvedRenderTree(request.packageValue);
  const fontReadiness = await prepareTemplatePackageFonts(
    request.packageValue,
    tree,
    fontSet,
  );
  return validatePackageJpgExportReadiness(
    request,
    fontReadiness,
    strict,
  );
}
