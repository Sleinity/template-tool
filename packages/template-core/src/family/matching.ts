import { getEffectiveEditableFields } from "../editor/packageFieldBindings";
import type { EditableFieldBinding, TemplatePackageV1 } from "../types";
import type {
  TemplateFamilyFieldMatchCandidateV1,
  TemplateFamilyFieldMatchPlanV1,
  TemplateFamilyFieldRuleOverrideV1,
  TemplateFamilyFieldTargetV1,
  TemplateFamilyFieldV1,
} from "./types";

function normalized(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function target(field: EditableFieldBinding): TemplateFamilyFieldTargetV1 {
  return {
    fieldId: field.id,
    nodeId: field.nodeId,
    property: field.property,
  };
}

function compatible(
  familyField: TemplateFamilyFieldV1,
  packageField: EditableFieldBinding,
): boolean {
  return familyField.type === packageField.type &&
    (packageField.property === "text.characters"
      ? familyField.type !== "image"
      : packageField.property === "image.assetId"
        ? familyField.type === "image"
        : true);
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function ruleSuggestion(
  familyField: TemplateFamilyFieldV1,
  packageField: EditableFieldBinding,
  targetValue: TemplateFamilyFieldTargetV1,
): {
  differences: TemplateFamilyFieldMatchPlanV1["ruleDifferences"];
  override?: TemplateFamilyFieldRuleOverrideV1;
} {
  const differences: TemplateFamilyFieldMatchPlanV1["ruleDifferences"] = [];
  const override: TemplateFamilyFieldRuleOverrideV1 = {};
  for (const section of ["constraints", "behavior"] as const) {
    const common = familyField.rule[section] as Record<string, unknown> | undefined;
    const imported = packageField[section] as Record<string, unknown> | undefined;
    const patch: Record<string, unknown | null> = {};
    for (const property of new Set([
      ...Object.keys(common ?? {}),
      ...Object.keys(imported ?? {}),
    ])) {
      const familyValue = common?.[property];
      const importedValue = imported?.[property];
      if (sameValue(familyValue, importedValue)) continue;
      differences.push({
        familyFieldId: familyField.id,
        target: targetValue,
        rulePath: `${section}.${property}`,
        familyValue: structuredClone(familyValue),
        importedValue: structuredClone(importedValue),
      });
      patch[property] = importedValue === undefined
        ? null
        : structuredClone(importedValue);
    }
    if (Object.keys(patch).length > 0) {
      if (section === "constraints") {
        override.constraints = patch as NonNullable<TemplateFamilyFieldRuleOverrideV1["constraints"]>;
      } else {
        override.behavior = patch as NonNullable<TemplateFamilyFieldRuleOverrideV1["behavior"]>;
      }
    }
  }
  return {
    differences,
    override: differences.length > 0 ? override : undefined,
  };
}

export function planTemplateFamilyFieldMatches(
  familyFields: readonly TemplateFamilyFieldV1[],
  packageValue: TemplatePackageV1,
): TemplateFamilyFieldMatchPlanV1 {
  const packageFields = getEffectiveEditableFields(packageValue);
  const candidates: TemplateFamilyFieldMatchCandidateV1[] = [];
  for (const familyField of familyFields) {
    for (const packageField of packageFields) {
      const exactId = packageField.id === familyField.key;
      const suggested = normalized(packageField.label ?? packageField.id) ===
        normalized(familyField.title) ||
        normalized(packageField.id) === normalized(familyField.key);
      if (!exactId && !suggested) continue;
      const isCompatible = compatible(familyField, packageField);
      candidates.push({
        familyFieldId: familyField.id,
        target: target(packageField),
        confidence: isCompatible
          ? exactId
            ? "exact"
            : "suggested"
          : "incompatible",
        reason: isCompatible
          ? exactId
            ? "The package field ID exactly matches the family field key."
            : "The normalized package field label or ID matches the family field."
          : "The field type or editable property is incompatible.",
      });
    }
  }
  const automaticBindings = familyFields.flatMap((familyField) => {
    const exact = candidates.filter((candidate) =>
      candidate.familyFieldId === familyField.id && candidate.confidence === "exact"
    );
    return exact.length === 1
      ? [{ familyFieldId: familyField.id, targets: [exact[0].target] }]
      : [];
  });
  const automaticFamilyIds = new Set(
    automaticBindings.map((binding) => binding.familyFieldId),
  );
  const automaticTargets = new Set(
    automaticBindings.flatMap((binding) => binding.targets.map((item) =>
      `${item.fieldId}:${item.nodeId}:${item.property}`
    )),
  );
  const ruleDifferences: TemplateFamilyFieldMatchPlanV1["ruleDifferences"] = [];
  const suggestedRuleOverrides: Record<string, TemplateFamilyFieldRuleOverrideV1> = {};
  for (const binding of automaticBindings) {
    const familyField = familyFields.find((field) => field.id === binding.familyFieldId);
    const expectedTarget = binding.targets[0];
    const packageField = packageFields.find((field) =>
      field.id === expectedTarget.fieldId &&
      field.nodeId === expectedTarget.nodeId &&
      field.property === expectedTarget.property
    );
    if (!familyField || !packageField) continue;
    const suggestion = ruleSuggestion(familyField, packageField, binding.targets[0]);
    ruleDifferences.push(...suggestion.differences);
    if (suggestion.override) {
      suggestedRuleOverrides[familyField.id] = suggestion.override;
    }
  }
  return {
    candidates,
    automaticBindings,
    unmatchedFamilyFieldIds: familyFields
      .map((field) => field.id)
      .filter((fieldId) => !automaticFamilyIds.has(fieldId)),
    unmatchedTargets: packageFields
      .map(target)
      .filter((item) => !automaticTargets.has(
        `${item.fieldId}:${item.nodeId}:${item.property}`,
      )),
    ruleDifferences,
    suggestedRuleOverrides,
  };
}
