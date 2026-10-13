import type {
  TemplateFamilyControlRefV1,
  TemplateFamilyV1,
} from "./types";

function controlKey(control: TemplateFamilyControlRefV1): string {
  if (control.kind === "direct-variant-selector") return control.kind;
  return control.kind === "selection-property"
    ? `${control.kind}:${control.groupId}`
    : `${control.kind}:${control.fieldId}`;
}

function expectedControls(family: TemplateFamilyV1): TemplateFamilyControlRefV1[] {
  const selectors: TemplateFamilyControlRefV1[] = family.variantGroups.length > 0
    ? family.variantGroups.map((group) => ({
        kind: "selection-property" as const,
        groupId: group.id,
      }))
    : family.variants.length > 1
      ? [{ kind: "direct-variant-selector" as const }]
      : [];
  return [
    ...selectors,
    ...family.fields.map((field) => ({ kind: "field" as const, fieldId: field.id })),
  ];
}

export function getTemplateFamilyControlOrder(
  family: TemplateFamilyV1,
): TemplateFamilyControlRefV1[] {
  const expected = expectedControls(family);
  if (!family.controlOrder) return expected;
  const expectedKeys = new Set(expected.map(controlKey));
  const seen = new Set<string>();
  const retained = family.controlOrder.filter((control) => {
    const key = controlKey(control);
    if (!expectedKeys.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [
    ...retained,
    ...expected.filter((control) => !seen.has(controlKey(control))),
  ];
}

export function setTemplateFamilyControlOrder(
  familyInput: TemplateFamilyV1,
  controlOrder: readonly TemplateFamilyControlRefV1[],
): TemplateFamilyV1 {
  const family = structuredClone(familyInput);
  const expectedKeys = expectedControls(family).map(controlKey).sort();
  const nextKeys = controlOrder.map(controlKey).sort();
  if (
    expectedKeys.length !== nextKeys.length ||
    expectedKeys.some((key, index) => key !== nextKeys[index])
  ) {
    throw new Error("The editor control order must contain every active selector and field exactly once.");
  }
  family.controlOrder = structuredClone([...controlOrder]);
  return family;
}
