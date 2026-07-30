import type {
  EditableFieldBinding,
  PackageFieldBehavior,
  PackageFieldConstraints,
  TemplatePackageV1,
} from "../types";
import {
  getPackageEditorFieldTargetStatuses,
  getPackageEditorFieldWarnings,
  packageWithEffectiveEditableFields,
  type PackageEditorFieldTargetStatus,
  type PackageEditorFieldWarning,
} from "./packageFieldBindings";

export interface PackageEditableFieldRulePatch {
  label?: string;
  constraints?: PackageFieldConstraints;
  behavior?: PackageFieldBehavior;
}

export interface PackageEditableFieldRulesResult {
  applied: boolean;
  packageValue: TemplatePackageV1;
  fields: EditableFieldBinding[];
  targetStatuses: PackageEditorFieldTargetStatus[];
  warnings: PackageEditorFieldWarning[];
}

export function editableFieldRuleKey(
  field: Pick<EditableFieldBinding, "id" | "nodeId">,
): string {
  return `${field.id}:${field.nodeId}`;
}

function publishRules(
  packageValue: TemplatePackageV1,
  fields: EditableFieldBinding[],
  applied: boolean,
): PackageEditableFieldRulesResult {
  const nextPackage = applied
    ? { ...packageValue, editableFields: fields }
    : packageValue;
  return {
    applied,
    packageValue: nextPackage,
    fields: nextPackage.editableFields,
    targetStatuses: getPackageEditorFieldTargetStatuses(nextPackage),
    warnings: getPackageEditorFieldWarnings(nextPackage),
  };
}

function explicitPackage(packageValue: TemplatePackageV1): TemplatePackageV1 {
  return structuredClone(packageWithEffectiveEditableFields(packageValue));
}

export function replacePackageEditableFieldRules(
  packageValue: TemplatePackageV1,
  fields: readonly EditableFieldBinding[],
): PackageEditableFieldRulesResult {
  const seen = new Set<string>();
  for (const field of fields) {
    const key = editableFieldRuleKey(field);
    if (seen.has(key)) {
      throw new Error(`Editable field rule "${key}" occurs more than once.`);
    }
    seen.add(key);
  }
  const nextPackage = explicitPackage(packageValue);
  const nextFields = fields.map((field) => structuredClone(field));
  return publishRules(nextPackage, nextFields, true);
}

export function updatePackageEditableFieldRule(
  packageValue: TemplatePackageV1,
  fieldKey: string,
  patch: PackageEditableFieldRulePatch,
): PackageEditableFieldRulesResult {
  const nextPackage = explicitPackage(packageValue);
  const field = nextPackage.editableFields.find(
    (candidate) => editableFieldRuleKey(candidate) === fieldKey,
  );
  if (!field) {
    throw new Error(`Editable field rule "${fieldKey}" was not found.`);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "label")) {
    field.label = patch.label?.trim() || undefined;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "constraints")) {
    field.constraints = patch.constraints
      ? structuredClone(patch.constraints)
      : undefined;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "behavior")) {
    field.behavior = patch.behavior
      ? structuredClone(patch.behavior)
      : undefined;
  }
  return publishRules(nextPackage, nextPackage.editableFields, true);
}

export function reorderPackageEditableFieldRule(
  packageValue: TemplatePackageV1,
  fieldKey: string,
  nextIndex: number,
): PackageEditableFieldRulesResult {
  const nextPackage = explicitPackage(packageValue);
  const currentIndex = nextPackage.editableFields.findIndex(
    (field) => editableFieldRuleKey(field) === fieldKey,
  );
  if (currentIndex < 0) {
    throw new Error(`Editable field rule "${fieldKey}" was not found.`);
  }
  const boundedIndex = Math.max(
    0,
    Math.min(nextPackage.editableFields.length - 1, Math.trunc(nextIndex)),
  );
  if (currentIndex === boundedIndex) {
    return publishRules(nextPackage, nextPackage.editableFields, false);
  }
  const [field] = nextPackage.editableFields.splice(currentIndex, 1);
  nextPackage.editableFields.splice(boundedIndex, 0, field);
  return publishRules(nextPackage, nextPackage.editableFields, true);
}
