import { validateTemplatePackageV2, validateTemplateFieldValueV2, type TemplatePackageV2, type TemplateFieldConfigurationV2 } from "@sleinity/template-core";
import { resolveTemplateFamilyConfigurationV2, resolveTemplateFieldFamilyVariantV2, type TemplateFieldFamilyV2, type TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";

export type FieldAuthoringContext = { packageValue: TemplatePackageV2; family?: TemplateFieldFamilyV2 | null; variantId?: string };
export type AuthoringIssue = { code: string; message: string; fieldId?: string; property?: string; design: string; variantId?: string };
const propertyFor = (code: string, path = "") => code.includes("precision") ? "decimalPlaces" : code.includes("range") ? "max" : code.includes("line-warning") ? "warningAtLines" : path.split("/").reverse().find(part => ["maxCharacters", "maxLines", "warningAtLines", "min", "max", "step", "decimalPlaces", "prefix", "suffix", "decimalSeparator", "thousandSeparator", "preset", "separator"].includes(part));

/** Isolated candidates only. Native sessions still own acceptance and reconciliation. */
export function validateFieldCandidate(context: FieldAuthoringContext, field: TemplateFieldConfigurationV2, override?: TemplateFieldFamilyVariantFieldOverrideV2): AuthoringIssue[] {
  if (!context.family) {
    const packageValue = { ...context.packageValue, editableFields: context.packageValue.editableFields.map(source => source.id === field.id ? { ...source, ...field } : source) } as TemplatePackageV2;
    return validateTemplatePackageV2(packageValue).diagnostics.filter(issue => issue.severity === "error").map(issue => ({ code: issue.code, message: issue.message, fieldId: field.id, property: propertyFor(issue.code, issue.path), design: packageValue.name }));
  }
  const family: TemplateFieldFamilyV2 = context.variantId ? { ...context.family, variants: context.family.variants.map(variant => variant.id === context.variantId ? { ...variant, fieldOverrides: { ...variant.fieldOverrides, [field.id]: override! } } : variant) } : { ...context.family, fields: context.family.fields.map(source => source.id === field.id ? field : source) };
  return family.variants.flatMap(variant => {
    const resolved = resolveTemplateFieldFamilyVariantV2(family, variant.id);
    if (resolved.valid) return [];
    // Family resolution deliberately collapses package diagnostics. Recover control paths
    // through the same public configuration resolver and package validator, only on failure.
    const packageValue = { ...variant.packageValue, editableFields: variant.packageValue.editableFields.map(source => {
      const common = family.fields.find(common => common.id === source.id);
      return common ? { ...source, configuration: resolveTemplateFamilyConfigurationV2(common.configuration, variant.fieldOverrides?.[source.id]?.configuration).configuration } : source;
    }) } as TemplatePackageV2;
    const diagnostics = validateTemplatePackageV2(packageValue).diagnostics.filter(issue => issue.severity === "error");
    const base = { design: variant.label ?? variant.packageValue.name, variantId: variant.id };
    return diagnostics.length ? diagnostics.map(issue => ({ ...base, code: issue.code, message: issue.message, fieldId: typeof issue.details?.fieldId === "string" ? issue.details.fieldId : field.id, property: propertyFor(issue.code, issue.path) })) : resolved.issues.filter(issue => issue.severity === "error").map(issue => ({ ...base, code: issue.code, message: issue.message, fieldId: issue.fieldId ?? field.id }));
  });
}

/** Canonical configuration/content findings for every design; never renderer readiness. */
export function familyFieldIssues(family: TemplateFieldFamilyV2, values: Readonly<Record<string, { value: unknown }>>): AuthoringIssue[] {
  return family.variants.flatMap(variant => {
    const resolved = resolveTemplateFieldFamilyVariantV2(family, variant.id);
    const base = { design: variant.label ?? variant.packageValue.name, variantId: variant.id };
    const configuration = resolved.issues.filter(issue => issue.severity === "error").map(issue => ({ ...base, code: issue.code, message: issue.message, fieldId: issue.fieldId, property: propertyFor(issue.code) }));
    const content = resolved.packageValue?.editableFields.flatMap(field => validateTemplateFieldValueV2(field, values[field.id] ? values[field.id].value : field.defaultValue).issues.map(issue => ({ ...base, code: issue.code, message: issue.message, fieldId: field.id }))) ?? [];
    return [...configuration, ...content];
  });
}

export function readableFieldLabel(field: Pick<TemplateFieldConfigurationV2, "id" | "label">): string {
  if (field.label?.trim()) return field.label;
  const value = field.id.replace(/^[^:]+:/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return value ? value[0].toUpperCase() + value.slice(1) : field.id;
}

export function parseNumberDraft(value: string): { complete: boolean; value?: number } {
  if (!value.trim()) return { complete: true };
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return { complete: false };
  const parsed = Number(value); return Number.isFinite(parsed) ? { complete: true, value: parsed } : { complete: false };
}
