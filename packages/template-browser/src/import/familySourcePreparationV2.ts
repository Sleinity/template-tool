import type { TemplateFieldConfigurationV2, TemplatePackageV2 } from "@sleinity/template-core";
import { getTemplateFieldFamilyEditorControlOrderV2, resolveTemplateFieldFamilyVariantV2, type TemplateFieldFamilyV2, type TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";

// Private definition preparation. Identity allocation, source acceptance,
// sessions and resource ownership remain with the existing Browser operations.
function sharedFields(sources: readonly TemplatePackageV2[]): TemplateFieldConfigurationV2[] {
  const fields = new Map<string, TemplateFieldConfigurationV2>();
  for (const source of sources) for (const id of source.editableFieldOrder) {
    const field = source.editableFields.find(entry => entry.id === id)!;
    const previous = fields.get(id);
    if (previous && previous.type !== field.type) throw new Error(`Field ${id} has different types across variants.`);
    if (!previous) fields.set(id, {
      id, type: field.type, label: field.label, controlRole: field.controlRole, configuration: field.configuration,
    } as TemplateFieldConfigurationV2);
  }
  return [...fields.values()];
}

function configurationOverrides(
  packageValue: TemplatePackageV2,
  fields: readonly TemplateFieldConfigurationV2[],
  appending = false,
): Record<string, TemplateFieldFamilyVariantFieldOverrideV2> {
  return Object.fromEntries(packageValue.editableFields.flatMap(field => {
    const common = fields.find(entry => entry.id === field.id)!;
    if (common.type !== field.type) throw new Error(`Field ${field.id} has different types across variants.${appending ? " Existing setup is unchanged." : ""}`);
    // Preserve the established property comparison and atomic replacement rules.
    const keys = new Set([...Object.keys(common.configuration), ...Object.keys(field.configuration)]);
    const configuration = Object.fromEntries([...keys].filter(key =>
      JSON.stringify((common.configuration as Record<string, unknown>)[key]) !== JSON.stringify((field.configuration as Record<string, unknown>)[key]),
    ).map(key => [key, (field.configuration as Record<string, unknown>)[key] ?? null]));
    return Object.keys(configuration).length ? [[field.id, { type: field.type, configuration }]] : [];
  })) as Record<string, TemplateFieldFamilyVariantFieldOverrideV2>;
}

function resolvedFamily(family: TemplateFieldFamilyV2): TemplateFieldFamilyV2 {
  family.editorControlOrder = getTemplateFieldFamilyEditorControlOrderV2(family);
  for (const variant of family.variants) {
    const result = resolveTemplateFieldFamilyVariantV2(family, variant.id);
    if (!result.valid) throw new Error(result.issues.map(issue => issue.message).join("\n"));
  }
  return family;
}

export function prepareInitialFamilyV2(
  sources: readonly TemplatePackageV2[], title: string, familyId: string, variantIds: readonly string[],
): TemplateFieldFamilyV2 {
  const packages = structuredClone(sources);
  const fields = sharedFields(packages);
  return resolvedFamily({
    schemaVersion: "template-field-family-v2", id: familyId, title,
    fields, editableFieldOrder: fields.map(field => field.id), variantGroups: [],
    variants: packages.map((packageValue, index) => ({
      id: variantIds[index], label: packageValue.name, packageValue,
      fieldOverrides: configurationOverrides(packageValue, fields), groupAssignments: {},
    })),
  });
}

export function prepareAppendedFamilyV2(
  accepted: TemplateFieldFamilyV2,
  additions: readonly { id: string; packageValue: TemplatePackageV2 }[],
  selectionAssignments: Readonly<Record<string, Readonly<Record<string, string>>>>,
): TemplateFieldFamilyV2 {
  const family = structuredClone(accepted);
  const packages = structuredClone(additions);
  for (const { id, packageValue } of packages) {
    // The former temporary Family owned detached common configurations. Preserve
    // that separation with a small metadata copy, not a discarded visual package.
    const importedFields = structuredClone(sharedFields([packageValue]));
    const newFields = importedFields.filter(field => !family.fields.some(entry => entry.id === field.id));
    family.fields = [...family.fields, ...newFields];
    family.editableFieldOrder = [...family.editableFieldOrder, ...newFields.map(field => field.id)];
    const fieldOverrides = configurationOverrides(packageValue, family.fields, true);
    const groupAssignments = Object.fromEntries((family.variantGroups ?? []).map(group => {
      const assigned = selectionAssignments[id]?.[group.id];
      if (!assigned || !group.options.some(option => option.id === assigned)) {
        throw new Error(`Choose a ${group.title} value for ${packageValue.name} before adding it.`);
      }
      return [group.id, assigned];
    }));
    family.variants = [...family.variants, { id, label: packageValue.name, packageValue, fieldOverrides, groupAssignments }];
  }
  return resolvedFamily(family);
}
