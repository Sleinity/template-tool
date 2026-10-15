import {type TemplateFamilyFieldScopeV1, type TemplateFamilyIssueV1, type TemplateFamilyValidationReportV1, type TemplateFamilyV1} from "@sleinity/template-core/family";
import {getTemplateFamilyFieldScope} from "../../../../packages/template-core/test/legacyEntry";
import type {TemplateFamilyVariantRenderValidationV1} from "../../../../packages/template-browser/test/legacyImporter";
import {
  createTemplatePackageQualityReport,
  type CreateTemplatePackageQualityReportOptions,
  type PackageQualityCategory,
  type PackageQualityLayer,
  type PackageQualityOrigin,
  type PackageQualityReport,
  type PackageQualitySupplementalDiagnostic,
} from "@sleinity/template-react/inspection";

export type FamilyDiagnosticOwnerStep =
  | "variants"
  | "fonts"
  | "fields"
  | "options"
  | "rules"
  | "validate";

export interface CreateTemplateFamilyVariantQualityReportOptions
  extends Omit<CreateTemplatePackageQualityReportOptions, "supplementalDiagnostics"> {
  family: TemplateFamilyV1;
  familyValidation: TemplateFamilyValidationReportV1;
  variantId: string;
  renderValidation?: TemplateFamilyVariantRenderValidationV1 | null;
}

function scopeLabel(
  family: TemplateFamilyV1,
  scope: TemplateFamilyFieldScopeV1,
): string {
  const titles = scope.variantIds.map((variantId) =>
    family.variants.find((variant) => variant.id === variantId)?.title ?? variantId,
  );
  if (scope.kind === "family-wide") {
    return family.variants.length === 1
      ? "Available in this template"
      : `Shared across all ${family.variants.length} variants`;
  }
  if (scope.kind === "variant-subset") return `Shared across ${titles.join(" and ")}`;
  if (scope.kind === "variant-specific") return `${titles[0] ?? "Variant"} only`;
  return "Unassigned";
}

function ownerStep(issue: TemplateFamilyIssueV1): FamilyDiagnosticOwnerStep {
  if (issue.code.startsWith("family.group")) return "options";
  if (
    issue.rulePath ||
    issue.code.startsWith("family.rule") ||
    issue.code.startsWith("field.") ||
    issue.code.startsWith("image.") ||
    issue.code.startsWith("family.content")
  ) return "rules";
  if (
    issue.code.startsWith("family.binding") ||
    issue.code === "family.field-unbound" ||
    issue.code === "family.variant-field-unbound"
  ) return "fields";
  return "variants";
}

function category(issue: TemplateFamilyIssueV1): PackageQualityCategory {
  const step = ownerStep(issue);
  return step === "fields" || step === "rules" || step === "options"
    ? "fields"
    : "package";
}

function layer(issue: TemplateFamilyIssueV1): PackageQualityLayer {
  const step = ownerStep(issue);
  return step === "fields" || step === "rules"
    ? "editable-fields"
    : "source-contract";
}

function origin(issue: TemplateFamilyIssueV1): PackageQualityOrigin {
  return category(issue) === "fields" ? "field" : "app";
}

function suggestion(step: FamilyDiagnosticOwnerStep): string {
  if (step === "fields") return "Open Fields and connect the affected package target.";
  if (step === "rules") return "Open Field rules and review the common rule or variant override.";
  if (step === "options") return "Open Variant options and complete the affected assignment.";
  return "Open Variants and review the affected family or package configuration.";
}

function applicableFamilyIssues(
  report: TemplateFamilyValidationReportV1,
  variantId: string,
): TemplateFamilyIssueV1[] {
  return report.issues.filter(
    (issue) => !issue.variantId || issue.variantId === variantId,
  );
}

function familySupplementalDiagnostics(
  family: TemplateFamilyV1,
  report: TemplateFamilyValidationReportV1,
  variantId: string,
): PackageQualitySupplementalDiagnostic[] {
  const variant = family.variants.find((candidate) => candidate.id === variantId);
  if (!variant) return [];
  return applicableFamilyIssues(report, variantId).map((issue) => {
    const familyField = issue.fieldId
      ? family.fields.find((candidate) => candidate.id === issue.fieldId)
      : undefined;
    const binding = familyField
      ? variant.bindings.find((candidate) => candidate.familyFieldId === familyField.id)
      : undefined;
    const target = issue.target ?? binding?.targets[0];
    const scope = familyField
      ? getTemplateFamilyFieldScope(family, familyField.id)
      : undefined;
    const step = ownerStep(issue);
    const applicableVariantTitles = scope?.variantIds.map((candidateId) =>
      family.variants.find((candidate) => candidate.id === candidateId)?.title ?? candidateId,
    ) ?? [];
    const searchable = [
      family.id,
      family.title,
      variant.id,
      variant.title,
      familyField?.id,
      familyField?.key,
      familyField?.title,
      scope ? scopeLabel(family, scope) : undefined,
      ...applicableVariantTitles,
      target?.fieldId,
      target?.nodeId,
      target?.property,
      issue.rulePath,
      issue.authority,
    ].filter((value): value is string => typeof value === "string" && value.length > 0);
    return {
      code: issue.code,
      severity: issue.severity,
      category: category(issue),
      origin: origin(issue),
      layer: layer(issue),
      message: issue.message,
      nodeId: target?.nodeId,
      fieldId: target?.fieldId,
      relatedIds: searchable,
      suggestion: suggestion(step),
      blocks: issue.severity === "error" ? ["create"] : [],
      details: {
        diagnosticOwner: report.schemaVersion,
        ownerStep: step,
        familyId: family.id,
        familyTitle: family.title,
        familyFieldId: familyField?.id,
        familyFieldKey: familyField?.key,
        familyFieldTitle: familyField?.title,
        fieldScope: scope?.kind,
        fieldScopeLabel: scope ? scopeLabel(family, scope) : undefined,
        applicableVariantIds: scope?.variantIds,
        applicableVariantTitles,
        variantId: variant.id,
        variantTitle: variant.title,
        target,
        rulePath: issue.rulePath,
        authority: issue.authority,
        familyDetails: issue.details,
      },
    };
  });
}

function renderSupplementalDiagnostics(
  family: TemplateFamilyV1,
  variantId: string,
  report?: TemplateFamilyVariantRenderValidationV1 | null,
): PackageQualitySupplementalDiagnostic[] {
  if (!report || report.variantId !== variantId) return [];
  const variant = family.variants.find((candidate) => candidate.id === variantId);
  return report.issues.map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    category: "renderer",
    origin: "renderer",
    layer: "render-readiness",
    message: issue.message,
    relatedIds: [variantId, variant?.title].filter(
      (value): value is string => Boolean(value),
    ),
    suggestion: "Check the selected variant again after resolving the reported render dependency.",
    blocks: issue.severity === "error" ? ["create"] : [],
    details: {
      diagnosticOwner: "template-family-variant-render-validation-v1",
      ownerStep: "validate" satisfies FamilyDiagnosticOwnerStep,
      variantId,
      variantTitle: variant?.title,
      sessionRevision: report.sessionRevision,
    },
  }));
}

export function createTemplateFamilyVariantQualityReport(
  options: CreateTemplateFamilyVariantQualityReportOptions,
): PackageQualityReport {
  const {
    family,
    familyValidation,
    variantId,
    renderValidation,
    ...packageOptions
  } = options;
  return createTemplatePackageQualityReport({
    ...packageOptions,
    supplementalDiagnostics: [
      ...familySupplementalDiagnostics(family, familyValidation, variantId),
      ...renderSupplementalDiagnostics(family, variantId, renderValidation),
    ],
  });
}
