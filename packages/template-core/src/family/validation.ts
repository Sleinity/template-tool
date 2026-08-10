import {
  getEffectiveEditableFields,
} from "../editor/packageFieldBindings";
import {
  validateImageReplacement,
  validateTextFieldValue,
} from "../editor/fieldConstraints";
import { validatePackageEditableFieldRules } from "../editor/packageFieldRuleValidation";
import type { EditableFieldBinding } from "../types";
import { resolveTemplateFamilyFieldRule } from "./rules";
import type {
  TemplateFamilyContentStateV1,
  TemplateFamilyFieldTargetV1,
  TemplateFamilyImageValueV1,
  TemplateFamilyIssueV1,
  TemplateFamilyV1,
  TemplateFamilyValidationReportV1,
} from "./types";
import { TEMPLATE_FAMILY_VALIDATION_SCHEMA_VERSION } from "./types";

function targetKey(target: TemplateFamilyFieldTargetV1): string {
  return `${target.fieldId}:${target.nodeId}:${target.property}`;
}

function status(issues: readonly TemplateFamilyIssueV1[]): "ready" | "warning" | "blocked" {
  return issues.some((item) => item.severity === "error")
    ? "blocked"
    : issues.some((item) => item.severity === "warning")
      ? "warning"
      : "ready";
}

function issue(
  family: TemplateFamilyV1,
  input: Omit<TemplateFamilyIssueV1, "familyId">,
): TemplateFamilyIssueV1 {
  return { familyId: family.id, ...input };
}

function compatibleTarget(
  familyType: string,
  field: EditableFieldBinding,
): boolean {
  if (field.type !== familyType) return false;
  if (familyType === "image") return field.property === "image.assetId";
  return field.property !== "image.assetId";
}

function validateDefinition(family: TemplateFamilyV1): TemplateFamilyIssueV1[] {
  const issues: TemplateFamilyIssueV1[] = [];
  if (!family.id.trim()) {
    issues.push(issue(family, {
      code: "family.id-missing",
      severity: "error",
      message: "The family requires a stable ID.",
    }));
  }
  if (!family.title.trim()) {
    issues.push(issue(family, {
      code: "family.title-missing",
      severity: "error",
      message: "The family requires a title.",
    }));
  }
  if (family.variants.length === 0) {
    issues.push(issue(family, {
      code: "family.variant-missing",
      severity: "error",
      message: "A family requires at least one variant.",
    }));
  }
  const duplicate = (values: readonly string[]) => values.find(
    (value, index) => values.indexOf(value) !== index,
  );
  const duplicateFieldId = duplicate(family.fields.map((field) => field.id));
  const duplicateFieldKey = duplicate(family.fields.map((field) => field.key));
  const duplicateVariantId = duplicate(family.variants.map((variant) => variant.id));
  const duplicateGroupId = duplicate(family.variantGroups.map((group) => group.id));
  for (const [code, value, message] of [
    ["family.field-id-duplicate", duplicateFieldId, "Family field IDs must be unique."],
    ["family.field-key-duplicate", duplicateFieldKey, "Family field keys must be unique."],
    ["family.variant-id-duplicate", duplicateVariantId, "Variant IDs must be unique."],
    ["family.group-id-duplicate", duplicateGroupId, "Variant group IDs must be unique."],
  ] as const) {
    if (value) issues.push(issue(family, { code, severity: "error", message, details: { value } }));
  }
  const seenTitles = new Set<string>();
  for (const variant of family.variants) {
    if (!variant.title.trim()) {
      issues.push(issue(family, {
        code: "family.variant-title-missing",
        severity: "error",
        message: `Variant "${variant.id}" requires a title.`,
        variantId: variant.id,
      }));
    } else if (seenTitles.has(variant.title.trim().toLowerCase())) {
      issues.push(issue(family, {
        code: "family.variant-title-duplicate",
        severity: "warning",
        message: `Variant title "${variant.title}" is used more than once.`,
        variantId: variant.id,
      }));
    }
    seenTitles.add(variant.title.trim().toLowerCase());
    const packageFields = new Map(
      getEffectiveEditableFields(variant.packageValue).map((field) => [
        targetKey({ fieldId: field.id, nodeId: field.nodeId, property: field.property }),
        field,
      ]),
    );
    const boundTargets = new Set<string>();
    for (const familyField of family.fields) {
      const binding = variant.bindings.find(
        (candidate) => candidate.familyFieldId === familyField.id,
      );
      if (!binding || binding.targets.length === 0) {
        issues.push(issue(family, {
          code: "family.binding-missing",
          severity: "error",
          message: `Field "${familyField.title}" is not bound in variant "${variant.title}".`,
          fieldId: familyField.id,
          variantId: variant.id,
        }));
        continue;
      }
      const resolved = resolveTemplateFamilyFieldRule(
        familyField.rule,
        variant.ruleOverrides[familyField.id],
      );
      for (const target of binding.targets) {
        const key = targetKey(target);
        const field = packageFields.get(key);
        if (!field) {
          issues.push(issue(family, {
            code: "family.binding-target-missing",
            severity: "error",
            message: `Bound target "${key}" is missing from variant "${variant.title}".`,
            fieldId: familyField.id,
            variantId: variant.id,
            target,
          }));
        } else if (!compatibleTarget(familyField.type, field)) {
          issues.push(issue(family, {
            code: "family.binding-target-incompatible",
            severity: "error",
            message: `Bound target "${key}" is incompatible with field "${familyField.title}".`,
            fieldId: familyField.id,
            variantId: variant.id,
            target,
          }));
        } else {
          const ruleReport = validatePackageEditableFieldRules([{
            ...structuredClone(field),
            label: familyField.title,
            defaultValue: isImageValue(familyField.defaultValue)
              ? field.defaultValue
              : familyField.defaultValue,
            constraints: resolved.rule.constraints,
            behavior: resolved.rule.behavior,
          }]);
          for (const blocker of ruleReport.blockers) {
            const rulePath = blocker.property;
            const [section, property] = rulePath?.split(".") ?? [];
            const authority = property && section === "constraints"
              ? resolved.provenance.constraints[property]
              : property && section === "behavior"
                ? resolved.provenance.behavior[property]
                : undefined;
            issues.push(issue(family, {
              code: blocker.code,
              severity: "error",
              message: blocker.message,
              fieldId: familyField.id,
              variantId: variant.id,
              target,
              rulePath,
              authority,
            }));
          }
        }
        if (boundTargets.has(key)) {
          issues.push(issue(family, {
            code: "family.binding-target-duplicate",
            severity: "error",
            message: `Package target "${key}" is bound more than once.`,
            fieldId: familyField.id,
            variantId: variant.id,
            target,
          }));
        }
        boundTargets.add(key);
      }
    }
    for (const key of packageFields.keys()) {
      if (!boundTargets.has(key)) {
        issues.push(issue(family, {
          code: "family.variant-field-unbound",
          severity: "error",
          message: `Editable target "${key}" is not mapped to a shared family field.`,
          variantId: variant.id,
        }));
      }
    }
  }
  for (const group of family.variantGroups) {
    if (!group.title.trim() || group.options.length === 0) {
      issues.push(issue(family, {
        code: "family.group-invalid",
        severity: "error",
        message: `Group "${group.id}" requires a title and at least one option.`,
        groupId: group.id,
      }));
    }
    const duplicateOption = duplicate(group.options.map((option) => option.id));
    if (duplicateOption) {
      issues.push(issue(family, {
        code: "family.group-option-duplicate",
        severity: "error",
        message: `Group "${group.title}" contains a duplicate option ID.`,
        groupId: group.id,
        optionId: duplicateOption,
      }));
    }
  }
  const tuples = new Map<string, string>();
  for (const variant of family.variants) {
    const tuple: string[] = [];
    for (const group of family.variantGroups) {
      const optionId = variant.groupAssignments[group.id];
      if (!optionId) {
        issues.push(issue(family, {
          code: "family.group-assignment-missing",
          severity: "error",
          message: `Variant "${variant.title}" needs an option for group "${group.title}".`,
          variantId: variant.id,
          groupId: group.id,
        }));
        continue;
      }
      if (!group.options.some((option) => option.id === optionId)) {
        issues.push(issue(family, {
          code: "family.group-assignment-invalid",
          severity: "error",
          message: `Variant "${variant.title}" uses an unknown option in group "${group.title}".`,
          variantId: variant.id,
          groupId: group.id,
          optionId,
        }));
      }
      tuple.push(`${group.id}:${optionId}`);
    }
    if (tuple.length === family.variantGroups.length && tuple.length > 0) {
      const key = tuple.join("|");
      const previous = tuples.get(key);
      if (previous) {
        issues.push(issue(family, {
          code: "family.group-tuple-duplicate",
          severity: "error",
          message: `Variants "${previous}" and "${variant.id}" use the same group options.`,
          variantId: variant.id,
        }));
      } else tuples.set(key, variant.id);
    }
  }
  return issues;
}

function isImageValue(value: unknown): value is TemplateFamilyImageValueV1 {
  return Boolean(value && typeof value === "object" &&
    (value as { kind?: unknown }).kind === "image");
}

export function validateTemplateFamily(
  family: TemplateFamilyV1,
  content?: TemplateFamilyContentStateV1,
): TemplateFamilyValidationReportV1 {
  const issues = validateDefinition(family);
  const effectiveRules = Object.fromEntries(
    family.variants.map((variant) => [
      variant.id,
      Object.fromEntries(
        family.fields.map((field) => [
          field.id,
          resolveTemplateFamilyFieldRule(
            field.rule,
            variant.ruleOverrides[field.id],
          ),
        ]),
      ),
    ]),
  );
  if (content && content.familyId !== family.id) {
    issues.push(issue(family, {
      code: "family.content-family-mismatch",
      severity: "error",
      message: "The content state belongs to a different family.",
    }));
  }
  if (content?.familyId === family.id) {
    for (const familyField of family.fields) {
      const value = Object.prototype.hasOwnProperty.call(content.values, familyField.id)
        ? content.values[familyField.id]
        : familyField.defaultValue;
      for (const variant of family.variants) {
        const binding = variant.bindings.find(
          (candidate) => candidate.familyFieldId === familyField.id,
        );
        if (!binding?.targets.length) continue;
        const resolved = resolveTemplateFamilyFieldRule(
          familyField.rule,
          variant.ruleOverrides[familyField.id],
        );
        for (const target of binding.targets) {
          const field: EditableFieldBinding = {
            id: familyField.key,
            type: familyField.type,
            nodeId: target.nodeId,
            property: target.property,
            defaultValue: isImageValue(familyField.defaultValue)
              ? null
              : familyField.defaultValue,
            label: familyField.title,
            constraints: resolved.rule.constraints,
            behavior: resolved.rule.behavior,
          };
          if (isImageValue(value)) {
            if (familyField.type !== "image") {
              issues.push(issue(family, {
                code: "family.content-type-invalid",
                severity: "error",
                message: `Field "${familyField.title}" does not accept image values.`,
                fieldId: familyField.id,
                variantId: variant.id,
                target,
              }));
              continue;
            }
            if (value.mimeType) {
              for (const item of validateImageReplacement(field, {
                mimeType: value.mimeType,
                sizeBytes: value.sizeBytes ?? 0,
                width: value.width,
                height: value.height,
              })) {
                issues.push(issue(family, {
                  code: item.code,
                  severity: item.severity,
                  message: item.message,
                  fieldId: familyField.id,
                  variantId: variant.id,
                  target,
                }));
              }
            }
          } else if (
            familyField.type === "text" ||
            familyField.type === "textarea" ||
            familyField.type === "number" ||
            familyField.type === "date"
          ) {
            if (typeof value !== "string") {
              issues.push(issue(family, {
                code: "family.content-type-invalid",
                severity: "error",
                message: `Field "${familyField.title}" requires a string value.`,
                fieldId: familyField.id,
                variantId: variant.id,
                target,
              }));
            } else {
              for (const item of validateTextFieldValue(field, value)) {
                issues.push(issue(family, {
                  code: item.code,
                  severity: item.severity,
                  message: item.message,
                  fieldId: familyField.id,
                  variantId: variant.id,
                  target,
                  rulePath: item.code.includes("character")
                    ? "constraints.maxCharacters"
                    : undefined,
                  authority: item.code.includes("character")
                    ? resolved.provenance.constraints.maxCharacters
                    : undefined,
                }));
              }
            }
          }
        }
      }
    }
  }
  const fields = family.fields.map((field) => {
    const fieldIssues = issues.filter((item) => item.fieldId === field.id);
    return { fieldId: field.id, status: status(fieldIssues), issues: fieldIssues };
  });
  const variants = family.variants.map((variant) => {
    const variantIssues = issues.filter((item) => item.variantId === variant.id);
    return { variantId: variant.id, status: status(variantIssues), issues: variantIssues };
  });
  const definitionIssues = issues.filter((item) =>
    !item.code.startsWith("field.") && !item.code.startsWith("image.") &&
    item.code !== "family.content-type-invalid"
  );
  const contentIssues = issues.filter((item) => !definitionIssues.includes(item));
  return {
    schemaVersion: TEMPLATE_FAMILY_VALIDATION_SCHEMA_VERSION,
    familyId: family.id,
    status: status(issues),
    definitionValid: !definitionIssues.some((item) => item.severity === "error"),
    contentValid: !contentIssues.some((item) => item.severity === "error"),
    issues,
    fields,
    variants,
    effectiveRules,
  };
}
