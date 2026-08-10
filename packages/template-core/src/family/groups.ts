import type {
  TemplateFamilyOptionAvailabilityV1,
  TemplateFamilyV1,
  TemplateFamilyVariantResolutionV1,
  TemplateFamilyVariantSelectionV1,
} from "./types";

function candidatesForSelections(
  family: TemplateFamilyV1,
  selections: Record<string, string>,
  ignoredGroupId?: string,
): string[] {
  const configuredGroupIds = new Set(
    family.variantGroups.map((group) => group.id),
  );
  return family.variants
    .filter((variant) => Object.entries(selections).every(
      ([groupId, optionId]) =>
        groupId === ignoredGroupId ||
        !configuredGroupIds.has(groupId) ||
        variant.groupAssignments[groupId] === optionId,
    ))
    .map((variant) => variant.id);
}

export function resolveTemplateFamilyVariant(
  family: TemplateFamilyV1,
  selection: TemplateFamilyVariantSelectionV1,
): TemplateFamilyVariantResolutionV1 {
  if (family.variantGroups.length === 0) {
    const selected = selection.variantId
      ? family.variants.find((variant) => variant.id === selection.variantId)
      : family.variants.length === 1
        ? family.variants[0]
        : undefined;
    if (selected) return { status: "resolved", variantId: selected.id };
    return selection.variantId
      ? { status: "no-match", candidateVariantIds: [] }
      : { status: "incomplete", missingGroupIds: [] };
  }
  const missingGroupIds = family.variantGroups
    .map((group) => group.id)
    .filter((groupId) => !selection.groupSelections[groupId]);
  if (missingGroupIds.length > 0) {
    return { status: "incomplete", missingGroupIds };
  }
  const candidateVariantIds = candidatesForSelections(
    family,
    selection.groupSelections,
  );
  if (candidateVariantIds.length === 0) {
    return { status: "no-match", candidateVariantIds: [] };
  }
  if (candidateVariantIds.length > 1) {
    return { status: "ambiguous", candidateVariantIds };
  }
  return { status: "resolved", variantId: candidateVariantIds[0] };
}

export function getTemplateFamilyOptionAvailability(
  family: TemplateFamilyV1,
  selection: TemplateFamilyVariantSelectionV1,
): TemplateFamilyOptionAvailabilityV1[] {
  return family.variantGroups.flatMap((group) => group.options.map((option) => {
    const candidateVariantIds = candidatesForSelections(
      family,
      {
        ...selection.groupSelections,
        [group.id]: option.id,
      },
      undefined,
    );
    return {
      groupId: group.id,
      optionId: option.id,
      available: candidateVariantIds.length > 0,
      candidateVariantIds,
    };
  }));
}
