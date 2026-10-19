import { countTemplateFieldGraphemesV1, type TemplateFieldConfigurationV2 } from "@sleinity/template-core";
import type { TemplateFieldFamilyV2, TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";

export const studioCharacterWarningAt = (maximum: number | undefined): number | undefined =>
  maximum === undefined ? undefined : Math.ceil(maximum * 0.8);

export function normalizeStudioTextField<Field extends TemplateFieldConfigurationV2>(field: Field): Field {
  if (field.type !== "text" && field.type !== "textarea") return structuredClone(field);
  const configuration = { ...field.configuration };
  const warningAtCharacters = studioCharacterWarningAt(configuration.maxCharacters);
  if (warningAtCharacters === undefined) delete configuration.warningAtCharacters;
  else configuration.warningAtCharacters = warningAtCharacters;
  return { ...structuredClone(field), configuration } as Field;
}

export function normalizeStudioFamilyTextLimits(family: TemplateFieldFamilyV2): TemplateFieldFamilyV2 {
  const next = structuredClone(family);
  next.fields = next.fields.map(normalizeStudioTextField);
  next.variants = next.variants.map((variant) => ({
    ...variant,
    packageValue: {
      ...variant.packageValue,
      editableFields: variant.packageValue.editableFields.map(normalizeStudioTextField),
    },
    ...(variant.fieldOverrides ? { fieldOverrides: Object.fromEntries(Object.entries(variant.fieldOverrides).map(([fieldId, override]) => [fieldId, normalizeStudioTextOverride(override)])) } : {}),
  }));
  return next;
}

export function normalizeStudioTextOverride(override: TemplateFieldFamilyVariantFieldOverrideV2): TemplateFieldFamilyVariantFieldOverrideV2 {
  if (override.type !== "text" && override.type !== "textarea") return structuredClone(override);
  const configuration = { ...override.configuration } as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(configuration, "maxCharacters")) {
    const maximum = typeof configuration.maxCharacters === "number" ? configuration.maxCharacters : undefined;
    configuration.warningAtCharacters = studioCharacterWarningAt(maximum) ?? null;
  } else {
    delete configuration.warningAtCharacters;
  }
  return { ...structuredClone(override), configuration } as TemplateFieldFamilyVariantFieldOverrideV2;
}

export function studioTextCounter(value: string, maximum?: number) {
  const count = countTemplateFieldGraphemesV1(value);
  const warningAt = studioCharacterWarningAt(maximum);
  return {
    count,
    maximum,
    state: maximum !== undefined && count >= maximum ? "maximum" as const
      : warningAt !== undefined && count >= warningAt ? "warning" as const
        : "normal" as const,
  };
}

export function acceptStudioTextInput(previous: string, next: string, maximum?: number): StudioTextInputResult {
  const previousCount = countTemplateFieldGraphemesV1(previous);
  const nextCount = countTemplateFieldGraphemesV1(next);
  const accepted = next === previous || maximum === undefined || nextCount <= maximum || nextCount < previousCount;
  return { accepted, value: accepted ? next : previous, count: accepted ? nextCount : previousCount, reason: accepted ? null : "characters" };
}

export interface StudioTextInputResult {
  accepted: boolean;
  value: string;
  count: number;
  reason?: "characters" | null;
}
