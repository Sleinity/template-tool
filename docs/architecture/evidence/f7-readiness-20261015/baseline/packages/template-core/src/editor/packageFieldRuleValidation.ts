import type {
  EditableFieldBinding,
  PackageFieldBehavior,
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
} from "../types";
import { editableFieldRuleKey } from "./packageFieldRules";

export interface PackageFieldRuleValidationIssueV1 {
  code: string;
  severity: "warning" | "error";
  fieldId: string;
  nodeId: string;
  property?: string;
  message: string;
}

export interface PackageFieldRuleValidationResultV1 {
  fieldKey: string;
  fieldId: string;
  nodeId: string;
  valid: boolean;
  blockers: PackageFieldRuleValidationIssueV1[];
  warnings: PackageFieldRuleValidationIssueV1[];
}

export interface PackageFieldRulesValidationReportV1 {
  schemaVersion: "package-field-rules-validation-v1";
  valid: boolean;
  fields: PackageFieldRuleValidationResultV1[];
  blockers: PackageFieldRuleValidationIssueV1[];
  warnings: PackageFieldRuleValidationIssueV1[];
}

const textFieldTypes = new Set(["text", "textarea", "number", "date"]);
const textConstraintKeys = new Set([
  "required",
  "minCharacters",
  "maxCharacters",
  "minWords",
  "maxWords",
  "maxLines",
  "allowLineBreaks",
  "pattern",
  "customPattern",
  "placeholder",
]);
const imageConstraintKeys = new Set([
  "required",
  "allowedMimeTypes",
  "maxFileSizeMb",
  "minWidth",
  "minHeight",
  "aspectRatio",
  "replacementMode",
  "scaleMode",
]);
const patterns = new Set([
  "free",
  "number",
  "currency",
  "percentage",
  "date",
  "email",
  "url",
  "custom",
]);
const overflowModes = new Set([
  "prevent-input",
  "trim",
  "warn-only",
  "clip-preview",
  "shrink-to-fit",
  "allow",
]);
const replacementModes = new Set([
  "cover",
  "contain",
  "preserve-original-crop",
  "user-crop",
]);
const imageMimePattern = /^image\/[a-z0-9][a-z0-9.+-]*$/iu;

function issue(
  field: EditableFieldBinding,
  code: string,
  property: string,
  message: string,
): PackageFieldRuleValidationIssueV1 {
  return {
    code,
    severity: "error",
    fieldId: field.id,
    nodeId: field.nodeId,
    property,
    message,
  };
}

function positiveIntegerIssue(
  field: EditableFieldBinding,
  value: unknown,
  property: string,
  label: string,
): PackageFieldRuleValidationIssueV1 | null {
  if (value === undefined) return null;
  return Number.isSafeInteger(value) && Number(value) > 0
    ? null
    : issue(
        field,
        "field-rule.constraint-positive-integer-required",
        property,
        `${label} must be a whole number greater than zero, or left empty.`,
      );
}

function positiveFiniteIssue(
  field: EditableFieldBinding,
  value: unknown,
  property: string,
  label: string,
): PackageFieldRuleValidationIssueV1 | null {
  if (value === undefined) return null;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? null
    : issue(
        field,
        "field-rule.constraint-positive-number-required",
        property,
        `${label} must be a number greater than zero, or left empty.`,
      );
}

function validateBehavior(
  field: EditableFieldBinding,
  behavior: PackageFieldBehavior | undefined,
): PackageFieldRuleValidationIssueV1[] {
  if (!behavior) return [];
  const issues: PackageFieldRuleValidationIssueV1[] = [];
  if (
    behavior.onOverflow !== undefined &&
    !overflowModes.has(behavior.onOverflow)
  ) {
    issues.push(issue(
      field,
      "field-rule.overflow-unsupported",
      "behavior.onOverflow",
      "Choose a supported overflow behavior.",
    ));
  }
  if (
    behavior.softLimitWarning !== undefined &&
    (!Number.isFinite(behavior.softLimitWarning) ||
      behavior.softLimitWarning <= 0 ||
      behavior.softLimitWarning > 1)
  ) {
    issues.push(issue(
      field,
      "field-rule.soft-limit-invalid",
      "behavior.softLimitWarning",
      "The soft-limit warning must be greater than 0 and no more than 1.",
    ));
  }
  return issues;
}

function validateTextConstraints(
  field: EditableFieldBinding,
  constraints: PackageTextFieldConstraints,
): PackageFieldRuleValidationIssueV1[] {
  const issues: PackageFieldRuleValidationIssueV1[] = [];
  for (const key of Object.keys(constraints)) {
    if (!textConstraintKeys.has(key)) {
      issues.push(issue(
        field,
        "field-rule.constraint-unsupported",
        `constraints.${key}`,
        `The ${key} constraint is not supported for ${field.type} fields.`,
      ));
    }
  }
  for (const [key, label] of [
    ["minCharacters", "Minimum characters"],
    ["maxCharacters", "Maximum characters"],
    ["minWords", "Minimum words"],
    ["maxWords", "Maximum words"],
    ["maxLines", "Maximum lines"],
  ] as const) {
    const next = positiveIntegerIssue(field, constraints[key], `constraints.${key}`, label);
    if (next) issues.push(next);
  }
  if (
    constraints.minCharacters !== undefined &&
    constraints.maxCharacters !== undefined &&
    Number.isFinite(constraints.minCharacters) &&
    Number.isFinite(constraints.maxCharacters) &&
    constraints.minCharacters > constraints.maxCharacters
  ) {
    issues.push(issue(
      field,
      "field-rule.character-range-invalid",
      "constraints.maxCharacters",
      "Maximum characters cannot be lower than minimum characters.",
    ));
  }
  if (constraints.pattern !== undefined && !patterns.has(constraints.pattern)) {
    issues.push(issue(
      field,
      "field-rule.pattern-unsupported",
      "constraints.pattern",
      "Choose a supported input pattern.",
    ));
  }
  if (constraints.pattern === "custom") {
    if (!constraints.customPattern?.trim()) {
      issues.push(issue(
        field,
        "field-rule.custom-pattern-required",
        "constraints.customPattern",
        "Enter a custom pattern or choose another input pattern.",
      ));
    } else {
      try {
        new RegExp(constraints.customPattern, "u");
      } catch {
        issues.push(issue(
          field,
          "field-rule.custom-pattern-invalid",
          "constraints.customPattern",
          "The custom input pattern is not valid.",
        ));
      }
    }
  }
  return issues;
}

function validateImageConstraints(
  field: EditableFieldBinding,
  constraints: PackageImageFieldConstraints,
): PackageFieldRuleValidationIssueV1[] {
  const issues: PackageFieldRuleValidationIssueV1[] = [];
  for (const key of Object.keys(constraints)) {
    if (!imageConstraintKeys.has(key)) {
      issues.push(issue(
        field,
        "field-rule.constraint-unsupported",
        `constraints.${key}`,
        `The ${key} constraint is not supported for image fields.`,
      ));
    }
  }
  const size = positiveFiniteIssue(
    field,
    constraints.maxFileSizeMb,
    "constraints.maxFileSizeMb",
    "Maximum file size",
  );
  if (size) issues.push(size);
  for (const [key, label] of [
    ["minWidth", "Minimum width"],
    ["minHeight", "Minimum height"],
  ] as const) {
    const next = positiveIntegerIssue(field, constraints[key], `constraints.${key}`, label);
    if (next) issues.push(next);
  }
  if (
    typeof constraints.aspectRatio === "number" &&
    (!Number.isFinite(constraints.aspectRatio) || constraints.aspectRatio <= 0)
  ) {
    issues.push(issue(
      field,
      "field-rule.aspect-ratio-invalid",
      "constraints.aspectRatio",
      "The aspect ratio must be greater than zero.",
    ));
  }
  if (
    constraints.replacementMode !== undefined &&
    !replacementModes.has(constraints.replacementMode)
  ) {
    issues.push(issue(
      field,
      "field-rule.image-policy-unsupported",
      "constraints.replacementMode",
      "Choose Fill, Fit, preserve imported crop, or host-provided crop.",
    ));
  }
  const seenMimeTypes = new Set<string>();
  for (const mimeType of constraints.allowedMimeTypes ?? []) {
    const normalized = mimeType.trim().toLowerCase();
    if (!imageMimePattern.test(normalized)) {
      issues.push(issue(
        field,
        "field-rule.mime-type-invalid",
        "constraints.allowedMimeTypes",
        `“${mimeType}” is not a valid image MIME type. Use values such as image/jpeg.`,
      ));
    } else if (seenMimeTypes.has(normalized)) {
      issues.push(issue(
        field,
        "field-rule.mime-type-duplicate",
        "constraints.allowedMimeTypes",
        `“${mimeType}” is listed more than once.`,
      ));
    }
    seenMimeTypes.add(normalized);
  }
  return issues;
}

export function validatePackageEditableFieldRules(
  fields: readonly EditableFieldBinding[],
): PackageFieldRulesValidationReportV1 {
  const duplicateKeys = new Set<string>();
  const seen = new Set<string>();
  for (const field of fields) {
    const key = editableFieldRuleKey(field);
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  }
  const results = fields.map((field): PackageFieldRuleValidationResultV1 => {
    const blockers: PackageFieldRuleValidationIssueV1[] = [];
    const key = editableFieldRuleKey(field);
    if (duplicateKeys.has(key)) {
      blockers.push(issue(
        field,
        "field-rule.duplicate",
        "fieldId",
        "This editable field occurs more than once.",
      ));
    }
    if (field.label !== undefined && !field.label.trim()) {
      blockers.push(issue(
        field,
        "field-rule.label-required",
        "label",
        "Enter a field label.",
      ));
    }
    if (textFieldTypes.has(field.type)) {
      blockers.push(...validateTextConstraints(
        field,
        (field.constraints ?? {}) as PackageTextFieldConstraints,
      ));
    } else if (field.type === "image") {
      blockers.push(...validateImageConstraints(
        field,
        (field.constraints ?? {}) as PackageImageFieldConstraints,
      ));
    } else if (field.constraints && Object.keys(field.constraints).length > 0) {
      blockers.push(issue(
        field,
        "field-rule.constraints-unsupported-for-type",
        "constraints",
        `${field.type} fields do not support setup constraints.`,
      ));
    }
    blockers.push(...validateBehavior(field, field.behavior));
    return {
      fieldKey: key,
      fieldId: field.id,
      nodeId: field.nodeId,
      valid: blockers.length === 0,
      blockers,
      warnings: [],
    };
  });
  const blockers = results.flatMap((result) => result.blockers);
  const warnings = results.flatMap((result) => result.warnings);
  return {
    schemaVersion: "package-field-rules-validation-v1",
    valid: blockers.length === 0,
    fields: results,
    blockers,
    warnings,
  };
}
