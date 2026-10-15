import { validateTemplatePackageV2 } from "@sleinity/template-core";
import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import { createTemplatePackageQualityReport, type PackageQualityReport, type PackageQualitySupplementalDiagnostic } from "@sleinity/template-react/inspection";

export type SetupEvidenceStates = Partial<Record<keyof PackageQualityReport["health"], "Pending" | "Unavailable" | "Stale">>;

/** Presentation adapter only. No validation, materialization or readiness is produced here. */
export function createSetupQualityReport(snapshot: ReturnType<ReactTemplateFieldSessionV2["getSnapshot"]>, validation: ReturnType<typeof validateTemplatePackageV2> | null) {
  if (!snapshot.rendererPackage || !validation) return null;
  const packageValue = "effectivePackage" in snapshot ? snapshot.effectivePackage : snapshot.basePackage;
  const supplemental: PackageQualitySupplementalDiagnostic[] = [];
  // Retain exporter severity and provenance; do not turn exporter errors into warnings.
  for (const issue of validation.pluginDiagnostics) supplemental.push({ ...issue, category: /^FONT_/i.test(issue.code) ? "fonts" : /^(ASSET|IMAGE|SVG|LARGE_ASSET)/i.test(issue.code) ? "assets" : /^MOTION_/i.test(issue.code) ? "motion" : "source", origin: "plugin", blocks: [], details: { ...issue.details, sourceNodeName: issue.nodeName } });
  for (const field of snapshot.fields) {
    for (const issue of [...field.blockingErrors, ...field.warnings]) supplemental.push({ code: issue.code, severity: issue.severity, category: "fields", origin: "field-validation", message: issue.message, fieldId: field.descriptor.id, nodeId: packageValue?.editableFields.find(candidate => candidate.id === field.descriptor.id)?.binding.nodeId, blocks: field.blockingErrors.includes(issue) ? ["export"] : [], details: { configurationScope: "common" } });
    if (field.renderValidation.state === "invalid") supplemental.push({ code: "field.render-validation-invalid", severity: "error", category: "fields", origin: "field-validation", message: "Rendered content exceeds the accepted field rules.", fieldId: field.descriptor.id, nodeId: packageValue?.editableFields.find(candidate => candidate.id === field.descriptor.id)?.binding.nodeId, blocks: ["export"] });
  }
  if ("familyMaterialization" in snapshot) for (const issue of snapshot.familyMaterialization?.issues ?? []) supplemental.push({ code: issue.code, severity: issue.severity, category: "fields", origin: "field-validation", message: issue.message, fieldId: issue.fieldId, blocks: issue.severity === "error" ? ["export"] : [], details: { variantId: issue.variantId } });
  const readiness = snapshot.readiness;
  for (const area of ["assets", "fonts", "renderer", "renderValidation"] as const) {
    if (readiness[area] !== "blocked") continue;
    if (area === "renderValidation" && snapshot.fields.some(field => field.renderValidation.state === "invalid")) continue;
    if (area === "assets") {
      const missing = Object.values(snapshot.resolvedTree?.nodes ?? {}).filter(node => node.image?.missingAsset || node.vector?.missingAsset);
      if (missing.length) {
        for (const node of missing) supplemental.push({ code: "session.assets-blocked", category: "assets", origin: "asset-reliability", severity: "error", message: "Required source media is unavailable.", nodeId: node.id, assetId: node.image?.assetId ?? node.vector?.assetId ?? undefined, blocks: ["export"], details: { reasons: readiness.reasons } });
        continue;
      }
    }
    supplemental.push({ code: `session.${area}-blocked`, category: area === "renderer" ? "renderer" : area === "renderValidation" ? "fields" : area, origin: area === "assets" ? "asset-reliability" : area === "fonts" ? "font" : "renderer", severity: "error", message: `${area === "assets" ? "Required source media" : area === "fonts" ? "Required fonts" : area === "renderer" ? "Renderer" : "Rendered field validation"} is unavailable.`, blocks: ["export"], details: { reasons: readiness.reasons } });
  }
  if (snapshot.error) supplemental.push({ code: snapshot.error.code, category: "package", origin: "app", severity: "error", message: snapshot.error.message, blocks: ["export"] });
  const report = createTemplatePackageQualityReport({ packageValue: snapshot.rendererPackage, validation: { ...validation, pluginDiagnostics: [] }, supplementalDiagnostics: supplemental, resolvedTree: snapshot.resolvedTree });
  const variantId = "selectedVariantId" in snapshot ? snapshot.selectedVariantId : null;
  report.issues = report.issues.filter(issue => issue.code !== "field.none-exported" || snapshot.fields.length === 0).map(issue => ({ ...issue, id: `${variantId ?? "single"}:${issue.id}`, details: { ...issue.details, variantId: issue.details?.variantId ?? variantId } }));
  // Explicit SDK states override optimistic empty-list health. This never feeds a gate.
  if (readiness.assets === "blocked" || readiness.fonts === "blocked") report.health.assets = "blocked";
  if (readiness.renderer === "blocked") report.health.fidelity = "blocked";
  if (readiness.state === "blocked") { report.status = "blocked"; report.health.export = "blocked"; }
  const evidenceStates: SetupEvidenceStates = {};
  if (!snapshot.resolvedTree || readiness.renderer === "not-required" || readiness.renderer === "pending") evidenceStates.fidelity = snapshot.resolvedTree ? "Pending" : "Unavailable";
  if (readiness.assets === "pending" || readiness.fonts === "pending") evidenceStates.assets = "Pending";
  if (readiness.renderValidation === "pending") evidenceStates.editability = "Pending";
  if (readiness.state === "idle" || readiness.state === "pending" || !readiness.exportReady && readiness.state !== "blocked") evidenceStates.export = "Pending";
  return { report, evidenceStates };
}
