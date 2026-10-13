import {
  validateTemplateFieldContentForPackageV2,
  validateTemplatePackageV2,
} from "@sleinity/template-core";
import {
  TEMPLATE_FIELD_FAMILY_CONTENT_SCHEMA_VERSION,
  TEMPLATE_FIELD_FAMILY_CONTENT_V2_SCHEMA_VERSION,
  TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION,
  migrateTemplateFieldFamilyContentStateV2,
  resolveTemplateFieldFamilyVariantV2,
  validateTemplateFieldFamilyContentStateV3,
} from "@sleinity/template-core/family";
import {
  SAVED_TEMPLATE_FIELD_FAMILY_V2_SCHEMA_VERSION,
  SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION,
  SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION,
  type SavedTemplateFieldFamilyRecordV2,
  type SavedTemplateFieldFamilyRecordV3,
  type SavedTemplateSessionRecordV2,
} from "./types";

function migrateSavedFamilyFieldIds(input: SavedTemplateFieldFamilyRecordV3): SavedTemplateFieldFamilyRecordV3 {
  const incompatible = input.family.variants.find((variant) =>
    (variant.packageValue as { schemaVersion: string }).schemaVersion !== "2.2"
  );
  if (incompatible) {
    throw new Error(`Template Family requires reimport: schema ${String((incompatible.packageValue as { schemaVersion: string }).schemaVersion)} is unsupported.`);
  }
  return input;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateRecordMetadata(input: Record<string, unknown>, kind: string): void {
  if (
    typeof input.id !== "string" ||
    typeof input.name !== "string" ||
    typeof input.createdAt !== "string" ||
    typeof input.updatedAt !== "string"
  ) {
    throw new Error(`${kind} record is incomplete.`);
  }
}

export function validateCurrentSavedTemplateSessionV2Record(
  input: unknown,
): SavedTemplateSessionRecordV2 {
  if (!isRecord(input)) throw new Error("Saved V2 template session record is not an object.");
  if (input.schemaVersion !== SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION) {
    throw new Error(`Unsupported saved V2 template session version: ${String(input.schemaVersion)}.`);
  }
  validateRecordMetadata(input, "Saved V2 template session");
  if (!isRecord(input.basePackage) || !isRecord(input.contentState) || !isRecord(input.sessionAssets)) {
    throw new Error("Saved V2 template session record is missing canonical authorities.");
  }
  const packageValidation = validateTemplatePackageV2(input.basePackage);
  if (!packageValidation.valid) {
    throw new Error("Saved V2 template session contains an invalid base TemplatePackageV2.");
  }
  const basePackage = input.basePackage as unknown as SavedTemplateSessionRecordV2["basePackage"];
  const contentValidation = validateTemplateFieldContentForPackageV2(
    {
      ...basePackage,
      assets: {
        ...basePackage.assets,
        ...(input.sessionAssets as SavedTemplateSessionRecordV2["sessionAssets"]),
      },
    },
    input.contentState,
  );
  if (!contentValidation.valid) {
    // The envelope validator already requires a finite canonical 2x3 Crop.
    // Preserve only representable Crop semantic errors for controller repair;
    // unrelated type/content errors and all structural diagnostics still fail.
    const repairableCropOnly = !contentValidation.diagnostics.some((item) => item.severity === "error") &&
      contentValidation.fieldIssues.filter((item) => item.severity === "error").every((item) => {
        const field = basePackage.editableFields.find((field) => field.id === item.fieldId);
        const value = (input.contentState as SavedTemplateSessionRecordV2["contentState"]).values[item.fieldId]?.value;
        return field?.type === "image" && typeof value === "object" && value.placement.mode === "crop" &&
          (item.code === "field-v2.image-crop-noninvertible" || item.code === "field-v2.image-placement-unauthorized");
      });
    if (!repairableCropOnly) {
      const first = contentValidation.diagnostics[0]?.message ??
        contentValidation.fieldIssues[0]?.message ??
        "unknown canonical content error";
      throw new Error(`Saved V2 template session content is invalid: ${first}`);
    }
  }
  if (!isRecord(input.source) || input.source.type !== "package-zip") {
    throw new Error("Saved V2 template session source must be package-zip.");
  }
  return {
    ...(structuredClone(input) as unknown as SavedTemplateSessionRecordV2),
    validation: packageValidation,
  };
}

/** Validate the current record only. Older canonical packages require reimport. */
export function normalizeSavedTemplateSessionV2Record(
  input: unknown,
): SavedTemplateSessionRecordV2 {
  return validateCurrentSavedTemplateSessionV2Record(input);
}

export function validateCurrentSavedTemplateFieldFamilyV2Record(
  input: unknown,
): SavedTemplateFieldFamilyRecordV2 {
  if (!isRecord(input)) throw new Error("Saved V2 Template Field Family record is not an object.");
  if (input.schemaVersion !== SAVED_TEMPLATE_FIELD_FAMILY_V2_SCHEMA_VERSION) {
    throw new Error(`Unsupported saved V2 Template Field Family version: ${String(input.schemaVersion)}.`);
  }
  validateRecordMetadata(input, "Saved V2 Template Field Family");
  if (!isRecord(input.family) || !isRecord(input.contentState) || !isRecord(input.sessionAssets)) {
    throw new Error("Saved V2 Template Field Family record is missing canonical authorities.");
  }
  if (input.family.schemaVersion !== TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION) {
    throw new Error("Saved V2 Template Field Family uses an unsupported family contract.");
  }
  if (input.contentState.schemaVersion !== TEMPLATE_FIELD_FAMILY_CONTENT_V2_SCHEMA_VERSION) {
    throw new Error("Saved V2 Template Field Family content uses an unsupported contract.");
  }
  const family = input.family as unknown as SavedTemplateFieldFamilyRecordV2["family"];
  const contentValidation = validateTemplateFieldFamilyContentStateV3(
    family,
    migrateTemplateFieldFamilyContentStateV2(
      input.contentState as unknown as SavedTemplateFieldFamilyRecordV2["contentState"],
    ),
  );
  if (!contentValidation.structurallyValid) {
    throw new Error(`Saved V2 Template Field Family content is invalid: ${contentValidation.issues[0]?.message ?? "unknown error"}`);
  }
  if (!family.variants.some((variant) => variant.id === input.selectedVariantId)) {
    throw new Error("Saved V2 Template Field Family selected variant is missing.");
  }
  for (const variant of family.variants) {
    const resolved = resolveTemplateFieldFamilyVariantV2(family, variant.id);
    if (!resolved.valid) {
      throw new Error(`Saved V2 Template Field Family variant "${variant.id}" is invalid: ${resolved.issues[0]?.message ?? "unknown error"}`);
    }
  }
  return structuredClone(input) as unknown as SavedTemplateFieldFamilyRecordV2;
}

export function validateCurrentSavedTemplateFieldFamilyV3Record(
  input: unknown,
): SavedTemplateFieldFamilyRecordV3 {
  if (!isRecord(input)) throw new Error("Saved V3 Template Field Family record is not an object.");
  if (input.schemaVersion !== SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION) {
    throw new Error(`Unsupported saved V3 Template Field Family version: ${String(input.schemaVersion)}.`);
  }
  validateRecordMetadata(input, "Saved V3 Template Field Family");
  if (!isRecord(input.family) || !isRecord(input.contentState) || !isRecord(input.sessionAssets)) {
    throw new Error("Saved V3 Template Field Family record is missing canonical authorities.");
  }
  if (input.family.schemaVersion !== TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION) {
    throw new Error("Saved V3 Template Field Family uses an unsupported family contract.");
  }
  if (input.contentState.schemaVersion !== TEMPLATE_FIELD_FAMILY_CONTENT_SCHEMA_VERSION) {
    throw new Error("Saved V3 Template Field Family content uses an unsupported contract.");
  }
  const family = input.family as unknown as SavedTemplateFieldFamilyRecordV3["family"];
  const contentValidation = validateTemplateFieldFamilyContentStateV3(
    family,
    input.contentState,
  );
  // Non-invertible but structurally canonical crops remain persisted for
  // correction. They stay semantically invalid and export-blocking.
  if (!contentValidation.structurallyValid) {
    throw new Error(`Saved V3 Template Field Family content is malformed: ${contentValidation.issues[0]?.message ?? "unknown error"}`);
  }
  if (!family.variants.some((variant) => variant.id === input.selectedVariantId)) {
    throw new Error("Saved V3 Template Field Family selected variant is missing.");
  }
  for (const variant of family.variants) {
    const resolved = resolveTemplateFieldFamilyVariantV2(family, variant.id);
    if (!resolved.valid) {
      throw new Error(`Saved V3 Template Field Family variant "${variant.id}" is invalid: ${resolved.issues[0]?.message ?? "unknown error"}`);
    }
  }
  return structuredClone(input) as unknown as SavedTemplateFieldFamilyRecordV3;
}

/** Validate the current Family record only. Older envelopes require reimport. */
export function normalizeSavedTemplateFieldFamilyV3Record(
  input: unknown,
): SavedTemplateFieldFamilyRecordV3 {
  if (isRecord(input) && input.schemaVersion === SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION) {
    return validateCurrentSavedTemplateFieldFamilyV3Record(
      migrateSavedFamilyFieldIds(structuredClone(input) as unknown as SavedTemplateFieldFamilyRecordV3),
    );
  }
  return validateCurrentSavedTemplateFieldFamilyV3Record(input);
}
