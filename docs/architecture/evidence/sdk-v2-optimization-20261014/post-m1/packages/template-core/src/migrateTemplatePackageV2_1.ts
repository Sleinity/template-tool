import { diagnostic, type PackageDiagnostic } from "./packageDiagnostics";
import {
  createTemplateFieldIdV2,
  parseTemplateFieldIdV2,
  type EditableFieldDefinitionV2,
  type TemplateFieldContentEntryV1,
  type TemplateFieldContentStateV1,
  type TemplatePackageV2,
} from "./types";

type LegacyTemplatePackageV2 = Omit<TemplatePackageV2, "schemaVersion"> & {
  schemaVersion: "2.0";
};

type LegacyTemplateFieldContentStateV1 = Omit<TemplateFieldContentStateV1, "packageSchemaVersion"> & {
  packageSchemaVersion: "2.0";
};

export interface TemplatePackageV2_1MigrationResult {
  package: TemplatePackageV2 | null;
  fieldIdMap: Readonly<Record<string, string>>;
  diagnostics: PackageDiagnostic[];
}

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function legacyFieldName(field: EditableFieldDefinitionV2): string {
  const parsed = parseTemplateFieldIdV2(field.id);
  if (parsed?.type === field.type) return parsed.name;
  if (field.type === "boolean" &&
      field.provenance?.normalization.includes("nested-boolean-container-id-to-visibility-id-v2")) {
    const sourceId = field.provenance.sourceField?.id;
    if (typeof sourceId === "string") return sourceId;
  }
  return field.id;
}

/** Historical explicit migration helper. The ordinary 2.2 parser does not invoke it. */
export function migrateTemplatePackageV2ToV2_1(
  input: LegacyTemplatePackageV2 | TemplatePackageV2,
): TemplatePackageV2_1MigrationResult {
  const source = cloneValue(input);
  const diagnostics: PackageDiagnostic[] = [];
  const fieldIdMap: Record<string, string> = {};
  const seen = new Set<string>();
  const fields: EditableFieldDefinitionV2[] = [];
  for (const field of source.editableFields as EditableFieldDefinitionV2[]) {
    const name = legacyFieldName(field);
    const id = createTemplateFieldIdV2(field.type, name);
    if (!id) {
      diagnostics.push(diagnostic(
        "field-v2.1.migration-invalid-id",
        "error",
        "field",
        `Legacy field "${field.id}" cannot be represented as a type-qualified field ID.`,
        { details: { fieldId: field.id, fieldType: field.type } },
      ));
      continue;
    }
    if (seen.has(id)) {
      diagnostics.push(diagnostic(
        "field-v2.1.migration-duplicate-id",
        "error",
        "field",
        `Legacy fields collide at canonical ID "${id}".`,
        { details: { fieldId: field.id, canonicalFieldId: id } },
      ));
      continue;
    }
    seen.add(id);
    fieldIdMap[field.id] = id;
    fields.push({
      ...field,
      id,
      ...(field.provenance ? {
        provenance: {
          ...field.provenance,
          normalization: [
            ...field.provenance.normalization,
            ...(!field.provenance.normalization.includes("legacy-field-id-to-type-qualified-v2.1")
              ? ["legacy-field-id-to-type-qualified-v2.1"]
              : []),
          ],
        },
      } : {}),
    } as EditableFieldDefinitionV2);
    if (field.id !== id) diagnostics.push(diagnostic(
      "FIELD_ID_TYPE_QUALIFIED",
      "info",
      "field",
      `Legacy field "${field.id}" was migrated to "${id}".`,
      { details: { sourceFieldId: field.id, canonicalFieldId: id, fieldType: field.type } },
    ));
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return { package: null, fieldIdMap, diagnostics };
  }
  return {
    package: {
      ...source,
      schemaVersion: "2.2",
      editableFields: fields,
      editableFieldOrder: source.editableFieldOrder.map((id) => fieldIdMap[id] ?? id),
    },
    fieldIdMap,
    diagnostics,
  };
}

export function migrateTemplateFieldContentStateV2ToV2_1(
  input: LegacyTemplateFieldContentStateV1 | TemplateFieldContentStateV1,
  fieldIdMap: Readonly<Record<string, string>>,
): TemplateFieldContentStateV1 {
  const values: Record<string, TemplateFieldContentEntryV1> = {};
  for (const [fieldId, entry] of Object.entries(input.values)) {
    values[fieldIdMap[fieldId] ?? fieldId] = cloneValue(entry);
  }
  return {
    ...cloneValue(input),
    packageSchemaVersion: "2.2",
    values,
  };
}
