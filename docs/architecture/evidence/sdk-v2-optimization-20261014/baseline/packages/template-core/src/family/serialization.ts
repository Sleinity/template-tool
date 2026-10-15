import type {
  TemplateFamilyContentStateV1,
  TemplateFamilyContentValueV1,
  TemplateFamilyV1,
} from "./types";
import {
  TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION,
  TEMPLATE_FAMILY_SCHEMA_VERSION,
} from "./types";

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function strings(value: unknown, keys: readonly string[]): boolean {
  return record(value) && keys.every((key) => typeof value[key] === "string");
}

function contentValue(value: unknown): value is TemplateFamilyContentValueV1 {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    return true;
  }
  if (!record(value)) return false;
  return strings(value, ["kind", "assetRef"]) && value.kind === "image";
}

function jsonClone(input: unknown, label: string): unknown {
  try {
    const serialized = JSON.stringify(input);
    if (serialized === undefined) throw new Error("missing JSON value");
    return JSON.parse(serialized) as unknown;
  } catch {
    throw new Error(`${label} must be a serializable JSON value.`);
  }
}

export function parseTemplateFamilyV1(input: unknown): TemplateFamilyV1 {
  const cloned = jsonClone(input, "TemplateFamilyV1");
  if (!record(cloned)) {
    throw new Error("TemplateFamilyV1 has an unsupported or incomplete structure.");
  }
  const value = cloned;
  if (
    !strings(value, ["schemaVersion", "id", "title"]) ||
    value.schemaVersion !== TEMPLATE_FAMILY_SCHEMA_VERSION ||
    !Array.isArray(value.fields) ||
    !Array.isArray(value.variants) ||
    !Array.isArray(value.variantGroups)
  ) {
    throw new Error("TemplateFamilyV1 has an unsupported or incomplete structure.");
  }
  const fieldTypes = new Set([
    "text", "textarea", "image", "color", "number", "date", "boolean",
  ]);
  for (const field of value.fields) {
    if (
      !strings(field, ["id", "key", "title", "type"]) ||
      !fieldTypes.has(field.type) ||
      !record(field.rule) ||
      !contentValue(field.defaultValue)
    ) throw new Error("TemplateFamilyV1 contains an invalid shared field.");
  }
  for (const variant of value.variants) {
    if (
      !strings(variant, ["id", "title"]) ||
      !record(variant.source) ||
      variant.source.type !== "package-zip" ||
      !record(variant.packageValue) ||
      !strings(variant.packageValue, ["packageId", "name", "rootNodeId"]) ||
      variant.packageValue.schemaVersion !== "1.0" ||
      !record(variant.packageValue.nodes) ||
      !Array.isArray(variant.packageValue.editableFields) ||
      !record(variant.packageValue.assets) ||
      !Array.isArray(variant.bindings) ||
      !record(variant.ruleOverrides) ||
      !record(variant.groupAssignments)
    ) throw new Error("TemplateFamilyV1 contains an invalid variant.");
    for (const binding of variant.bindings) {
      if (
        !strings(binding, ["familyFieldId"]) ||
        !Array.isArray(binding.targets) ||
        !binding.targets.every((target: unknown) => strings(target, ["fieldId", "nodeId", "property"]))
      ) throw new Error(`TemplateFamilyV1 variant "${variant.id}" contains an invalid binding.`);
    }
  }
  for (const group of value.variantGroups) {
    if (
      !strings(group, ["id", "title"]) ||
      !Array.isArray(group.options) ||
      !group.options.every((option: unknown) => strings(option, ["id", "title"]))
    ) throw new Error("TemplateFamilyV1 contains an invalid variant group.");
  }
  if (value.controlOrder !== undefined) {
    if (!Array.isArray(value.controlOrder) || !value.controlOrder.every((control: unknown) => {
      if (!record(control) || typeof control.kind !== "string") return false;
      if (control.kind === "direct-variant-selector") return true;
      if (control.kind === "selection-property") return typeof control.groupId === "string";
      return control.kind === "field" && typeof control.fieldId === "string";
    })) throw new Error("TemplateFamilyV1 contains an invalid editor control order.");
  }
  return value as unknown as TemplateFamilyV1;
}

export function parseTemplateFamilyContentStateV1(
  input: unknown,
): TemplateFamilyContentStateV1 {
  const cloned = jsonClone(input, "TemplateFamilyContentStateV1");
  if (!record(cloned)) {
    throw new Error("TemplateFamilyContentStateV1 has an unsupported or incomplete structure.");
  }
  const value = cloned;
  if (
    !strings(value, ["schemaVersion", "familyId"]) ||
    value.schemaVersion !== TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    !record(value.values) ||
    !Object.values(value.values).every(contentValue)
  ) {
    throw new Error("TemplateFamilyContentStateV1 has an unsupported or incomplete structure.");
  }
  return value as unknown as TemplateFamilyContentStateV1;
}
