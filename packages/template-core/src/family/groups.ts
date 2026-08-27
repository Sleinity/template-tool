import type {
  TemplateFamilyOptionAvailabilityV1,
  TemplateFamilyV1,
  TemplateFamilyVariantResolutionV1,
  TemplateFamilyVariantSelectionV1,
  TemplateVariantGroupOptionV1,
  TemplateVariantGroupV1,
} from "./types";
import { getTemplateFamilyControlOrder } from "./controls";

function candidatesForSelections(
  family: TemplateFamilyV1,
  selections: Record<string, string>,
): string[] {
  const configuredGroupIds = new Set(family.variantGroups.map((group) => group.id));
  return family.variants
    .filter((variant) => Object.entries(selections).every(
      ([groupId, optionId]) =>
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
  if (missingGroupIds.length > 0) return { status: "incomplete", missingGroupIds };

  const candidateVariantIds = candidatesForSelections(family, selection.groupSelections);
  if (candidateVariantIds.length === 0) return { status: "no-match", candidateVariantIds: [] };
  if (candidateVariantIds.length > 1) return { status: "ambiguous", candidateVariantIds };
  return { status: "resolved", variantId: candidateVariantIds[0] };
}

export function getTemplateFamilyOptionAvailability(
  family: TemplateFamilyV1,
  selection: TemplateFamilyVariantSelectionV1,
): TemplateFamilyOptionAvailabilityV1[] {
  return family.variantGroups.flatMap((group) => group.options.map((option) => {
    const candidateVariantIds = candidatesForSelections(family, {
      ...selection.groupSelections,
      [group.id]: option.id,
    });
    return {
      groupId: group.id,
      optionId: option.id,
      available: candidateVariantIds.length > 0,
      candidateVariantIds,
    };
  }));
}

export function upsertTemplateFamilyVariantGroup(
  familyInput: TemplateFamilyV1,
  groupInput: TemplateVariantGroupV1,
): TemplateFamilyV1 {
  const family = structuredClone(familyInput);
  const optionsById = new Map<string, TemplateVariantGroupOptionV1>();
  for (const option of groupInput.options) {
    if (!optionsById.has(option.id)) {
      optionsById.set(option.id, { id: option.id, title: option.title.trim() });
    }
  }
  const group: TemplateVariantGroupV1 = {
    id: groupInput.id,
    title: groupInput.title.trim(),
    options: [...optionsById.values()],
  };
  const index = family.variantGroups.findIndex((candidate) => candidate.id === group.id);
  if (index >= 0) family.variantGroups[index] = group;
  else {
    const previousControlOrder = getTemplateFamilyControlOrder(family);
    family.variantGroups.push(group);
    if (family.controlOrder) {
      const insertionIndex = previousControlOrder.findIndex(
        (control) => control.kind === "direct-variant-selector",
      );
      const retained = previousControlOrder.filter(
        (control) => control.kind !== "direct-variant-selector",
      );
      retained.splice(
        insertionIndex < 0
          ? retained.findIndex((control) => control.kind === "field") < 0
            ? retained.length
            : retained.findIndex((control) => control.kind === "field")
          : Math.min(insertionIndex, retained.length),
        0,
        { kind: "selection-property", groupId: group.id },
      );
      family.controlOrder = retained;
    }
  }

  const knownOptionIds = new Set(group.options.map((option) => option.id));
  for (const variant of family.variants) {
    const optionId = variant.groupAssignments[group.id];
    if (optionId && !knownOptionIds.has(optionId)) delete variant.groupAssignments[group.id];
  }
  return family;
}

export function removeTemplateFamilyVariantGroup(
  familyInput: TemplateFamilyV1,
  groupId: string,
): TemplateFamilyV1 {
  const family = structuredClone(familyInput);
  const previousControlOrder = getTemplateFamilyControlOrder(family);
  const removedIndex = previousControlOrder.findIndex(
    (control) => control.kind === "selection-property" && control.groupId === groupId,
  );
  family.variantGroups = family.variantGroups.filter((group) => group.id !== groupId);
  for (const variant of family.variants) delete variant.groupAssignments[groupId];
  if (family.controlOrder) {
    const retained = family.controlOrder.filter(
      (control) => control.kind !== "selection-property" || control.groupId !== groupId,
    );
    if (family.variantGroups.length === 0 && family.variants.length > 1) {
      retained.splice(
        removedIndex < 0 ? 0 : Math.min(removedIndex, retained.length),
        0,
        { kind: "direct-variant-selector" },
      );
    }
    family.controlOrder = retained;
  }
  return family;
}

export function assignTemplateFamilyVariantOption(
  familyInput: TemplateFamilyV1,
  variantId: string,
  groupId: string,
  optionId: string | null,
): TemplateFamilyV1 {
  const family = structuredClone(familyInput);
  const variant = family.variants.find((candidate) => candidate.id === variantId);
  const group = family.variantGroups.find((candidate) => candidate.id === groupId);
  if (!variant) throw new Error(`Variant "${variantId}" was not found.`);
  if (!group) throw new Error(`Selection property "${groupId}" was not found.`);
  if (optionId !== null && !group.options.some((option) => option.id === optionId)) {
    throw new Error(`Option "${optionId}" was not found in selection property "${groupId}".`);
  }
  if (optionId === null) delete variant.groupAssignments[groupId];
  else variant.groupAssignments[groupId] = optionId;
  return family;
}
