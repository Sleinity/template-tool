import type {
  TemplateFamilyFieldScopeV1,
  TemplateFamilyFieldV1,
  TemplateFamilyV1,
} from "./types";

export function getTemplateFamilyFieldScope(
  family: TemplateFamilyV1,
  fieldId: string,
): TemplateFamilyFieldScopeV1 {
  const variantIds = family.variants
    .filter((variant) =>
      variant.bindings.some(
        (binding) =>
          binding.familyFieldId === fieldId && binding.targets.length > 0,
      ),
    )
    .map((variant) => variant.id);
  const kind = variantIds.length === 0
    ? "unbound"
    : variantIds.length === family.variants.length
      ? "family-wide"
      : variantIds.length === 1
        ? "variant-specific"
        : "variant-subset";
  return { kind, variantIds };
}

export function getTemplateFamilyFieldsForVariant(
  family: TemplateFamilyV1,
  variantId: string,
): TemplateFamilyFieldV1[] {
  if (!family.variants.some((variant) => variant.id === variantId)) return [];
  return family.fields.filter((field) =>
    getTemplateFamilyFieldScope(family, field.id).variantIds.includes(variantId),
  );
}
