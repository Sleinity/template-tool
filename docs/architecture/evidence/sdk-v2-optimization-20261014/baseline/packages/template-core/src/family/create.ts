import {
  editableFieldRuleKey,
  getEffectiveEditableFields,
  getPackageFieldValue,
} from "../editor";
import type { EditableFieldBinding, TemplatePackageV1 } from "../types";
import type {
  CreateTemplateFamilyFromPackageOptionsV1,
  TemplateFamilyContentStateV1,
  TemplateFamilyFieldV1,
  TemplateFamilyContentValueV1,
  TemplateFamilyV1,
  TemplateFamilyVariantFieldBindingV1,
  WrapLegacyTemplatePackageOptionsV1,
} from "./types";
import {
  TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION,
  TEMPLATE_FAMILY_SCHEMA_VERSION,
} from "./types";

function uniqueKey(base: string, seen: Set<string>): string {
  const normalized = base.trim() || "field";
  if (!seen.has(normalized)) {
    seen.add(normalized);
    return normalized;
  }
  let suffix = 2;
  while (seen.has(`${normalized}_${suffix}`)) suffix += 1;
  const result = `${normalized}_${suffix}`;
  seen.add(result);
  return result;
}

function familyContentValue(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding,
): TemplateFamilyContentValueV1 {
  const value = getPackageFieldValue(packageValue, field);
  if (field.type !== "image" || typeof value !== "string") return value;
  const asset = packageValue.assets[value];
  const placementState = packageValue.nodes[field.nodeId]?.image?.activePlacement?.state;
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

export function createTemplateFamilyFromPackage(
  options: CreateTemplateFamilyFromPackageOptionsV1,
): { family: TemplateFamilyV1; content: TemplateFamilyContentStateV1 } {
  const packageFields = getEffectiveEditableFields(options.packageValue);
  const seenKeys = new Set<string>();
  const fields: TemplateFamilyFieldV1[] = [];
  const bindings: TemplateFamilyVariantFieldBindingV1[] = [];
  const values: TemplateFamilyContentStateV1["values"] = {};
  for (const packageField of packageFields) {
    const key = uniqueKey(packageField.id, seenKeys);
    const fieldId = options.idFactory("field", editableFieldRuleKey(packageField));
    const defaultValue = familyContentValue(options.packageValue, packageField);
    fields.push({
      id: fieldId,
      key,
      title: packageField.label?.trim() || packageField.id,
      type: packageField.type,
      defaultValue,
      rule: {
        constraints: structuredClone(packageField.constraints),
        behavior: structuredClone(packageField.behavior),
      },
    });
    bindings.push({
      familyFieldId: fieldId,
      targets: [{
        fieldId: packageField.id,
        nodeId: packageField.nodeId,
        property: packageField.property,
      }],
    });
    values[fieldId] = structuredClone(defaultValue);
  }
  const family: TemplateFamilyV1 = {
    schemaVersion: TEMPLATE_FAMILY_SCHEMA_VERSION,
    id: options.familyId,
    title: options.familyTitle.trim(),
    fields,
    variants: [{
      id: options.variantId,
      title: options.variantTitle.trim(),
      packageValue: structuredClone(options.packageValue),
      source: {
        type: "package-zip",
        ...structuredClone(options.source),
      },
      bindings,
      ruleOverrides: {},
      groupAssignments: {},
    }],
    variantGroups: [],
  };
  return {
    family,
    content: {
      schemaVersion: TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION,
      familyId: family.id,
      revision: 0,
      values,
    },
  };
}

function legacyToken(value: string): string {
  return encodeURIComponent(value).replace(/%/g, "_");
}

export function wrapLegacyTemplatePackageAsFamily(
  options: WrapLegacyTemplatePackageOptionsV1,
): { family: TemplateFamilyV1; content: TemplateFamilyContentStateV1 } {
  const workingPackage = options.workingPackage ?? options.sourcePackage;
  const created = createTemplateFamilyFromPackage({
    familyId: options.templateId,
    familyTitle: options.title,
    variantId: `variant:${legacyToken(options.templateId)}`,
    variantTitle: options.title,
    packageValue: options.sourcePackage,
    source: options.source,
    idFactory: (kind, seed) =>
      kind === "field"
        ? `field:${legacyToken(options.templateId)}:${legacyToken(seed)}`
        : `${kind}:${legacyToken(options.templateId)}:${legacyToken(seed)}`,
  });
  const workingFields = new Map<string, EditableFieldBinding>(
    getEffectiveEditableFields(workingPackage).map((field) => [
      editableFieldRuleKey(field),
      field,
    ]),
  );
  created.family.fields.forEach((field, index) => {
    const binding = created.family.variants[0].bindings[index];
    const target = binding.targets[0];
    const workingField = workingFields.get(`${target.fieldId}:${target.nodeId}`);
    if (!workingField) return;
    field.rule = {
      constraints: structuredClone(workingField.constraints),
      behavior: structuredClone(workingField.behavior),
    };
    created.content.values[field.id] = familyContentValue(workingPackage, workingField);
  });
  return created;
}
