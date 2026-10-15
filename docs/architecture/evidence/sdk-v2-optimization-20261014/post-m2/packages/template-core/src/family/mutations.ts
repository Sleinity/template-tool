import {
  getEffectiveEditableFields,
  getPackageFieldValue,
} from "../editor/packageFieldBindings";
import type { EditableFieldBinding } from "../types";
import type {
  TemplateFamilyContentStateV1,
  TemplateFamilyContentValueV1,
  TemplateFamilyFieldTargetV1,
  TemplateFamilyV1,
} from "./types";

function targetKey(target: TemplateFamilyFieldTargetV1): string {
  return `${target.fieldId}:${target.nodeId}:${target.property}`;
}

function findPackageField(
  family: TemplateFamilyV1,
  variantId: string,
  target: TemplateFamilyFieldTargetV1,
): EditableFieldBinding | null {
  const variant = family.variants.find((candidate) => candidate.id === variantId);
  if (!variant) return null;
  return getEffectiveEditableFields(variant.packageValue).find(
    (field) =>
      field.id === target.fieldId &&
      field.nodeId === target.nodeId &&
      field.property === target.property,
  ) ?? null;
}

function uniqueFieldKey(family: TemplateFamilyV1, preferred: string): string {
  const base = preferred.trim() || "field";
  const keys = new Set(family.fields.map((field) => field.key));
  if (!keys.has(base)) return base;
  let suffix = 2;
  while (keys.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

function contentValue(
  family: TemplateFamilyV1,
  variantId: string,
  field: EditableFieldBinding,
): TemplateFamilyContentValueV1 {
  const variant = family.variants.find((candidate) => candidate.id === variantId)!;
  const value = getPackageFieldValue(variant.packageValue, field);
  if (field.type !== "image" || typeof value !== "string") return value;
  const asset = variant.packageValue.assets[value];
  const placementState = variant.packageValue.nodes[field.nodeId]
    ?.image?.activePlacement?.state;
  return {
    kind: "image",
    assetRef: value,
    mimeType: asset?.type === "image" ? asset.mimeType : undefined,
    width: asset?.type === "image" ? asset.width : undefined,
    height: asset?.type === "image" ? asset.height : undefined,
    placementState:
      placementState === "replacement-fill" || placementState === "replacement-fit"
        ? placementState
        : undefined,
  };
}

export function bindTemplateFamilyFieldTarget(
  family: TemplateFamilyV1,
  variantId: string,
  familyFieldId: string,
  target: TemplateFamilyFieldTargetV1,
): TemplateFamilyV1 {
  const next = structuredClone(family);
  const variant = next.variants.find((candidate) => candidate.id === variantId);
  const field = next.fields.find((candidate) => candidate.id === familyFieldId);
  const packageField = findPackageField(next, variantId, target);
  if (
    !variant ||
    !field ||
    !packageField ||
    field.type !== packageField.type ||
    (field.type === "image") !== (packageField.property === "image.assetId")
  ) return next;
  for (const binding of variant.bindings) {
    binding.targets = binding.targets.filter(
      (candidate) => targetKey(candidate) !== targetKey(target),
    );
  }
  variant.bindings = variant.bindings.filter((binding) => binding.targets.length > 0);
  const binding = variant.bindings.find(
    (candidate) => candidate.familyFieldId === familyFieldId,
  );
  if (binding) binding.targets.push(structuredClone(target));
  else variant.bindings.push({ familyFieldId, targets: [structuredClone(target)] });
  return next;
}

export function unbindTemplateFamilyFieldTarget(
  family: TemplateFamilyV1,
  variantId: string,
  familyFieldId: string,
  target?: TemplateFamilyFieldTargetV1,
): TemplateFamilyV1 {
  const next = structuredClone(family);
  const variant = next.variants.find((candidate) => candidate.id === variantId);
  if (!variant) return next;
  const binding = variant.bindings.find(
    (candidate) => candidate.familyFieldId === familyFieldId,
  );
  if (!binding) return next;
  binding.targets = target
    ? binding.targets.filter((candidate) => targetKey(candidate) !== targetKey(target))
    : [];
  variant.bindings = variant.bindings.filter((candidate) => candidate.targets.length > 0);
  if (!variant.bindings.some((candidate) => candidate.familyFieldId === familyFieldId)) {
    delete variant.ruleOverrides[familyFieldId];
  }
  return next;
}

export function createTemplateFamilyFieldForTarget(input: {
  family: TemplateFamilyV1;
  content: TemplateFamilyContentStateV1;
  variantId: string;
  target: TemplateFamilyFieldTargetV1;
  fieldId: string;
  key?: string;
  title?: string;
}): {
  family: TemplateFamilyV1;
  content: TemplateFamilyContentStateV1;
  fieldId: string;
} {
  const family = structuredClone(input.family);
  const content = structuredClone(input.content);
  const packageField = findPackageField(family, input.variantId, input.target);
  if (!packageField) throw new Error("The package field target was not found.");
  if (family.fields.some((field) => field.id === input.fieldId)) {
    throw new Error(`Template family field "${input.fieldId}" already exists.`);
  }
  const value = contentValue(family, input.variantId, packageField);
  family.fields.push({
    id: input.fieldId,
    key: uniqueFieldKey(family, input.key ?? packageField.id),
    title: input.title?.trim() || packageField.label?.trim() || packageField.id,
    type: packageField.type,
    defaultValue: structuredClone(value),
    rule: {
      constraints: structuredClone(packageField.constraints),
      behavior: structuredClone(packageField.behavior),
    },
  });
  if (family.controlOrder) {
    family.controlOrder.push({ kind: "field", fieldId: input.fieldId });
  }
  content.values[input.fieldId] = structuredClone(value);
  content.revision += 1;
  return {
    family: bindTemplateFamilyFieldTarget(
      family,
      input.variantId,
      input.fieldId,
      input.target,
    ),
    content,
    fieldId: input.fieldId,
  };
}

export function removeTemplateFamilyField(
  familyInput: TemplateFamilyV1,
  contentInput: TemplateFamilyContentStateV1,
  fieldId: string,
): { family: TemplateFamilyV1; content: TemplateFamilyContentStateV1 } {
  const family = structuredClone(familyInput);
  const content = structuredClone(contentInput);
  family.fields = family.fields.filter((field) => field.id !== fieldId);
  if (family.controlOrder) {
    family.controlOrder = family.controlOrder.filter(
      (control) => control.kind !== "field" || control.fieldId !== fieldId,
    );
  }
  for (const variant of family.variants) {
    variant.bindings = variant.bindings.filter(
      (binding) => binding.familyFieldId !== fieldId,
    );
    delete variant.ruleOverrides[fieldId];
  }
  if (Object.prototype.hasOwnProperty.call(content.values, fieldId)) {
    delete content.values[fieldId];
    content.revision += 1;
  }
  return { family, content };
}
