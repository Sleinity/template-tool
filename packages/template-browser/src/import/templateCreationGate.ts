import {
  getPackageFieldValue,
  type EditableFieldBinding,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import type {
  FieldConstraintIssue,
  FieldConstraintValidation,
} from "../internal/core";
import type { PackageQualityIssue } from "../internal/qualityIssue";

export interface TemplateCreationBlocker {
  code: string;
  message: string;
  suggestion: string;
  fieldId?: string;
  nodeId?: string;
}

export interface TemplateCreationGate {
  canCreate: boolean;
  blockers: TemplateCreationBlocker[];
}

export interface TemplateCreationGateInput {
  canImport: boolean;
  hasOriginalPackage: boolean;
  templateName: string;
  isRebuildingDiagnostics: boolean;
  isSaving: boolean;
  qualityIssues?: PackageQualityIssue[];
}

export interface FieldConstraintSummary {
  code: string;
  fieldId: string;
  fieldLabel: string;
  nodeId: string;
  nodeName: string;
  severity: FieldConstraintIssue["severity"];
  blocksExport: boolean;
  message: string;
  currentValue: string;
  requirement: string;
  repair: string;
}

export function createTemplateCreationGate({
  canImport,
  hasOriginalPackage,
  templateName,
  isRebuildingDiagnostics,
  isSaving,
  qualityIssues = [],
}: TemplateCreationGateInput): TemplateCreationGate {
  const qualityBlockers = qualityIssues
    .filter(
      (issue) =>
        issue.blocksImport ||
        issue.blocks.includes("import") ||
        issue.blocks.includes("create"),
    )
    .map<TemplateCreationBlocker>((issue) => ({
      code: issue.code,
      message: issue.message,
      suggestion:
        issue.suggestedFix ?? "Open Diagnostics, fix this issue, then check the template again.",
      fieldId: issue.fieldId,
      nodeId: issue.nodeId,
    }));
  const blockers: TemplateCreationBlocker[] = [...qualityBlockers];

  if (!canImport && qualityBlockers.length === 0) {
    blockers.push({
      code: "import-blocked",
      message: "This template still has a blocking issue.",
      suggestion: "Return to Validate and fix the blocked issue.",
    });
  }
  if (!hasOriginalPackage) {
    blockers.push({
      code: "original-package-missing",
      message: "The original imported template is no longer available.",
      suggestion: "Return to Package and import the template again.",
    });
  }
  if (!templateName.trim()) {
    blockers.push({
      code: "template-name-required",
      message: "Template name is required.",
      suggestion: "Enter a name for this reusable template.",
    });
  }
  if (isRebuildingDiagnostics) {
    blockers.push({
      code: "diagnostics-refreshing",
      message: "The template check is still running.",
      suggestion: "Wait for the check to finish before adding the template.",
    });
  }
  if (isSaving) {
    blockers.push({
      code: "template-save-in-progress",
      message: "The template is still being saved.",
      suggestion: "Wait for saving to finish.",
    });
  }

  const uniqueBlockers = blockers.filter(
    (blocker, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.code === blocker.code &&
          candidate.fieldId === blocker.fieldId &&
          candidate.nodeId === blocker.nodeId,
      ) === index,
  );
  return {
    canCreate: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
  };
}

function fieldConstraints(field: EditableFieldBinding): Record<string, unknown> {
  return (field.constraints ?? {}) as Record<string, unknown>;
}

function formatCurrentValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Empty";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function requirementForIssue(
  issue: FieldConstraintIssue,
  field: EditableFieldBinding,
): string {
  const constraints = fieldConstraints(field);
  switch (issue.code) {
    case "field-min-characters":
      return `At least ${String(constraints.minCharacters)} characters.`;
    case "field-max-characters":
      return `At most ${String(constraints.maxCharacters)} characters.`;
    case "field-max-lines":
      return `At most ${String(constraints.maxLines)} lines.`;
    case "field-line-breaks-disallowed":
      return "Line breaks are not allowed.";
    case "field-pattern-invalid":
      return `Value must match the ${String(constraints.pattern ?? "configured")} pattern.`;
    default:
      return issue.message;
  }
}

function repairForIssue(issue: FieldConstraintIssue): string {
  if (issue.code === "field-pattern-invalid") {
    return "Change the field value to match the selected input pattern.";
  }
  if (issue.code.includes("max") || issue.code === "field-line-breaks-disallowed") {
    return "Shorten the value or adjust this field's editing rule before export.";
  }
  return "Check the field value and its editing rule before export.";
}

export function createFieldConstraintSummaries(
  packageValue: TemplatePackageV1,
  validation: FieldConstraintValidation,
): FieldConstraintSummary[] {
  return validation.issues.map((issue) => {
    const field = packageValue.editableFields.find(
      (candidate) =>
        candidate.id === issue.fieldId && candidate.nodeId === issue.nodeId,
    );
    const node = packageValue.nodes[issue.nodeId];
    return {
      code: issue.code,
      fieldId: issue.fieldId,
      fieldLabel: field?.label?.trim() || field?.id || issue.fieldId,
      nodeId: issue.nodeId,
      nodeName: node?.name ?? issue.nodeId,
      severity: issue.severity,
      blocksExport: issue.blocksExport,
      message: issue.message,
      currentValue: formatCurrentValue(
        field ? getPackageFieldValue(packageValue, field) : undefined,
      ),
      requirement: field ? requirementForIssue(issue, field) : issue.message,
      repair: repairForIssue(issue),
    };
  });
}
