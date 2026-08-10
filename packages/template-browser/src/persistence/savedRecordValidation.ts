import {
  SAVED_OUTPUT_DRAFT_SCHEMA_VERSION,
  SAVED_TEMPLATE_FAMILY_DRAFT_SCHEMA_VERSION,
  SAVED_TEMPLATE_FAMILY_SCHEMA_VERSION,
  SAVED_TEMPLATE_SCHEMA_VERSION,
  type SavedTemplateFamilyDraftRecord,
  type SavedTemplateFamilyRecord,
  type SavedOutputDraftRecord,
  type SavedTemplateRecord,
} from "./types";
import {
  parseTemplateFamilyContentStateV1,
  parseTemplateFamilyV1,
} from "@sleinity/template-core/family";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateCurrentSavedTemplateFamilyRecord(
  input: unknown,
): SavedTemplateFamilyRecord {
  if (!isRecord(input)) {
    throw new Error("Saved template family record is not an object.");
  }
  if (input.schemaVersion !== SAVED_TEMPLATE_FAMILY_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported saved template family version: ${String(input.schemaVersion)}.`,
    );
  }
  if (
    typeof input.id !== "string" ||
    typeof input.name !== "string" ||
    !isRecord(input.family) ||
    !isRecord(input.validation)
  ) {
    throw new Error("Saved template family record is incomplete.");
  }
  const family = parseTemplateFamilyV1(input.family);
  return {
    ...(structuredClone(input) as unknown as SavedTemplateFamilyRecord),
    family,
  };
}

export function validateCurrentSavedTemplateFamilyDraftRecord(
  input: unknown,
): SavedTemplateFamilyDraftRecord {
  if (!isRecord(input)) {
    throw new Error("Saved template family draft record is not an object.");
  }
  if (input.schemaVersion !== SAVED_TEMPLATE_FAMILY_DRAFT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported saved template family draft version: ${String(input.schemaVersion)}.`,
    );
  }
  if (
    typeof input.id !== "string" ||
    typeof input.familyId !== "string" ||
    typeof input.name !== "string" ||
    !isRecord(input.content) ||
    !isRecord(input.validation)
  ) {
    throw new Error("Saved template family draft record is incomplete.");
  }
  const content = parseTemplateFamilyContentStateV1(input.content);
  if (content.familyId !== input.familyId) {
    throw new Error("Saved template family draft content belongs to another family.");
  }
  return {
    ...(structuredClone(input) as unknown as SavedTemplateFamilyDraftRecord),
    content,
  };
}

export function validateCurrentSavedTemplateRecord(
  input: unknown,
): SavedTemplateRecord {
  if (!isRecord(input)) {
    throw new Error("Saved template record is not an object.");
  }
  if (input.schemaVersion !== SAVED_TEMPLATE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported saved template version: ${String(input.schemaVersion)}. Clear unsupported local data and re-import the ZIP package.`,
    );
  }
  if (
    typeof input.id !== "string" ||
    typeof input.name !== "string" ||
    !input.originalPackage ||
    !input.workingPackage ||
    !input.validation
  ) {
    throw new Error(
      "Saved template record is incomplete. Clear unsupported local data and re-import the ZIP package.",
    );
  }
  if (!isRecord(input.source) || input.source.type !== "package-zip") {
    throw new Error(
      `Unsupported saved template source: ${String(isRecord(input.source) ? input.source.type : "missing")}. Only package-zip records are supported. Clear unsupported local data and re-import the ZIP package.`,
    );
  }
  return structuredClone(input as unknown as SavedTemplateRecord);
}

export function validateCurrentSavedOutputDraftRecord(
  input: unknown,
): SavedOutputDraftRecord {
  if (!isRecord(input)) {
    throw new Error("Saved output draft record is not an object.");
  }
  if (input.schemaVersion !== SAVED_OUTPUT_DRAFT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported saved output draft version: ${String(input.schemaVersion)}. Clear unsupported local data and create a new draft.`,
    );
  }
  if (
    typeof input.id !== "string" ||
    typeof input.templateId !== "string" ||
    typeof input.name !== "string" ||
    !input.basePackage ||
    !input.workingPackage ||
    !input.validation
  ) {
    throw new Error(
      "Saved output draft record is incomplete. Clear unsupported local data and create a new draft.",
    );
  }
  return structuredClone(input as unknown as SavedOutputDraftRecord);
}
