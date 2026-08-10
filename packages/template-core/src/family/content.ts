import type {
  TemplateFamilyContentMutationResultV1,
  TemplateFamilyContentStateV1,
  TemplateFamilyContentValueV1,
  TemplateFamilyFieldV1,
  TemplateFamilyImageValueV1,
  TemplateFamilyV1,
} from "./types";

function isImageValue(value: unknown): value is TemplateFamilyImageValueV1 {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { kind?: unknown }).kind === "image" &&
      typeof (value as { assetRef?: unknown }).assetRef === "string",
  );
}

function valueMatchesField(
  field: TemplateFamilyFieldV1,
  value: TemplateFamilyContentValueV1,
): boolean {
  if (field.type === "image") return isImageValue(value);
  if (isImageValue(value)) return false;
  if (value === null) return true;
  if (field.type === "boolean") return typeof value === "boolean";
  if (field.type === "number") {
    return typeof value === "number" || typeof value === "string";
  }
  return typeof value === "string";
}

/**
 * Updates portable shared content without applying any variant constraint.
 * Variant-specific limits are reported later by family validation and never
 * trim or discard a valid shared value.
 */
export function updateTemplateFamilyContentField(
  family: TemplateFamilyV1,
  content: TemplateFamilyContentStateV1,
  fieldId: string,
  value: TemplateFamilyContentValueV1,
): TemplateFamilyContentMutationResultV1 {
  if (content.familyId !== family.id) {
    return {
      applied: false,
      content,
      issue: {
        code: "family.content-family-mismatch",
        message: "The content state belongs to a different Template Family.",
      },
    };
  }
  const field = family.fields.find((candidate) => candidate.id === fieldId);
  if (!field) {
    return {
      applied: false,
      content,
      issue: {
        code: "family.content-field-missing",
        message: `Shared field "${fieldId}" does not exist in this Template Family.`,
        fieldId,
      },
    };
  }
  if (!valueMatchesField(field, value)) {
    return {
      applied: false,
      content,
      issue: {
        code: "family.content-type-invalid",
        message: `Shared field "${field.title}" does not accept this value type.`,
        fieldId,
      },
    };
  }
  const next = structuredClone(content);
  next.revision += 1;
  next.values[fieldId] = structuredClone(value);
  return { applied: true, content: next };
}
