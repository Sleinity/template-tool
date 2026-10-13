import { resolvePackageAssetReference } from "./assets/packageAssetResolution";
import {
  diagnostic,
  type PackageDiagnostic,
} from "./packageDiagnostics";
import type {
  ColorFieldDefinitionV2,
  DateDisplayFormatV1,
  DateFieldDefinitionV2,
  EditableFieldBinding,
  EditableFieldDefinitionV2,
  ImageFieldConfigurationV1,
  ImageFieldDefinitionV2,
  NumberFieldDefinitionV2,
  TemplateFieldType,
  TemplateNode,
  TemplatePackageV1,
  TemplatePackageV2,
  TextareaFieldDefinitionV2,
  TextFieldDefinitionV2,
  BooleanFieldDefinitionV2,
} from "./types";
import { createTemplateFieldIdV2, parseTemplateFieldIdV2 } from "./types";
import { validateTemplatePackage } from "./validateTemplatePackage";
import { resolveSourceColorFill, sourceSolidColorHex } from "./sourceColorField";
import { parseSourceDateDisplay } from "./sourceDateField";
import { parseSourceNumberDisplay } from "./sourceNumberField";

export interface NormalizeTemplatePackageV2Result {
  package: TemplatePackageV2 | null;
  diagnostics: PackageDiagnostic[];
}

export interface ReconcileEditableFieldOrderV2Result {
  order: string[];
  diagnostics: PackageDiagnostic[];
}

/**
 * Reimport-only repair. Strict canonical validation still requires the result
 * to be an exact permutation of the effective field IDs.
 */
export function reconcileEditableFieldOrderV2(
  previousOrder: readonly string[] | undefined,
  fields: readonly Pick<EditableFieldDefinitionV2, "id">[],
): ReconcileEditableFieldOrderV2Result {
  const currentIds = fields.map((field) => field.id);
  const current = new Set(currentIds);
  const seen = new Set<string>();
  const order: string[] = [];
  const diagnostics: PackageDiagnostic[] = [];

  for (const fieldId of previousOrder ?? []) {
    if (seen.has(fieldId)) {
      diagnostics.push(diagnostic(
        "field-order.duplicate-id-repaired",
        "warning",
        "field",
        `Duplicate field "${fieldId}" was removed from portable editor order during reimport.`,
        { path: "/editableFieldOrder", details: { fieldId } },
      ));
      continue;
    }
    seen.add(fieldId);
    if (current.has(fieldId)) {
      order.push(fieldId);
    } else {
      diagnostics.push(diagnostic(
        "field-order.removed-id",
        "info",
        "field",
        `Removed field "${fieldId}" was dropped from portable editor order during reimport.`,
        { path: "/editableFieldOrder", details: { fieldId } },
      ));
    }
  }
  for (const fieldId of currentIds) {
    if (order.includes(fieldId)) continue;
    order.push(fieldId);
    if (previousOrder) {
      diagnostics.push(diagnostic(
        "field-order.added-id",
        "info",
        "field",
        `New field "${fieldId}" was appended to portable editor order during reimport.`,
        { path: "/editableFieldOrder", details: { fieldId } },
      ));
    }
  }
  return { order, diagnostics };
}

type FieldSource = {
  field: EditableFieldBinding;
  source: "descriptor" | "field-marker";
  marker?: string;
  originalField?: EditableFieldBinding;
  normalization?: string[];
  additionalBooleanNodeIds?: string[];
};

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function fieldDiagnostic(
  field: EditableFieldBinding,
  code: string,
  severity: "info" | "warning" | "error",
  message: string,
  details: Record<string, unknown> = {},
): PackageDiagnostic {
  return diagnostic(code, severity, "field", message, {
    path: `/editableFields/${field.id}`,
    nodeId: field.nodeId,
    details: { fieldId: field.id, ...details },
  });
}

function textCharacters(node: TemplateNode): string | null {
  if (node.type !== "TEXT") return null;
  return "characters" in node.text ? node.text.characters : node.text.content;
}

function normalizedNumberDefault(
  field: EditableFieldBinding,
  node: TemplateNode,
): ReturnType<typeof parseSourceNumberDisplay> | null {
  if (node.type !== "TEXT" || !["text.characters", "text.content"].includes(field.property)) return null;
  if (typeof field.defaultValue === "number" && Number.isFinite(field.defaultValue)) {
    return { value: Object.is(field.defaultValue, -0) ? 0 : field.defaultValue, prefix: "", suffix: "" };
  }
  const nodeValue = textCharacters(node);
  return typeof field.defaultValue === "string" && field.defaultValue === nodeValue
    ? parseSourceNumberDisplay(field.defaultValue)
    : null;
}

function normalizedDateDefault(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding,
  node: TemplateNode,
): ReturnType<typeof parseSourceDateDisplay> | null {
  if (node.type !== "TEXT" || !["text.characters", "text.content"].includes(field.property) ||
      typeof field.defaultValue !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/u.test(field.defaultValue)) {
    return {
      value: field.defaultValue,
      prefix: "",
      suffix: "",
      preset: "iso",
    };
  }
  const nodeValue = textCharacters(node);
  return field.defaultValue === nodeValue
    ? parseSourceDateDisplay(field.defaultValue, {
        exportedAt: packageValue.source?.exportedAt,
        explicitFormat: field.format,
      })
    : null;
}

function markerFields(packageValue: TemplatePackageV1): FieldSource[] {
  const explicitTargets = new Set(
    packageValue.editableFields.flatMap((field) => {
      const parsed = parseTemplateFieldIdV2(field.id);
      const name = parsed?.type === field.type ? parsed.name : field.id;
      return [`${field.type}:${name}:${field.nodeId}`];
    }),
  );
  return Object.values(packageValue.nodes).flatMap((node) => {
    const match = node.name.match(
      /^field:(text|textarea|image|color|number|date|boolean):([A-Za-z][A-Za-z0-9_-]*)$/,
    );
    if (!match || explicitTargets.has(`${match[1]}:${match[2]}:${node.id}`)) return [];
    const type = match[1] as TemplateFieldType;
    const id = createTemplateFieldIdV2(type, match[2]);
    if (!id) return [];
    const defaultValue = type === "image"
      ? node.image?.assetId ?? null
      : type === "color"
        ? null
        : type === "boolean"
          ? node.appearance.visible ?? true
          : textCharacters(node);
    return [{
      source: "field-marker" as const,
      marker: node.name,
      field: {
        id,
        type,
        nodeId: node.id,
        property: type === "image"
          ? "image.assetId"
          : type === "color"
            ? "appearance.fills"
            : type === "boolean"
              ? "visible"
              : "text.characters",
        defaultValue,
      },
      originalField: {
        id: match[2],
        type,
        nodeId: node.id,
        property: type === "image"
          ? "image.assetId"
          : type === "color"
            ? "appearance.fills"
            : type === "boolean"
              ? "visible"
              : "text.characters",
        defaultValue,
      },
      normalization: ["source-field-id-to-type-qualified-id-v2.1"],
    }];
  });
}

function sourceFields(
  packageValue: TemplatePackageV1,
  diagnostics: PackageDiagnostic[],
): FieldSource[] {
  const sources: FieldSource[] = [
    ...packageValue.editableFields.map((field): FieldSource => {
      const parsed = parseTemplateFieldIdV2(field.id);
      if (parsed) return {
        field,
        source: "descriptor",
        originalField: { ...field, id: parsed.name },
      };
      const id = createTemplateFieldIdV2(field.type, field.id);
      if (!id) return { field, source: "descriptor" };
      diagnostics.push(fieldDiagnostic(
        field,
        "FIELD_ID_TYPE_QUALIFIED",
        "info",
        `Field "${field.id}" was normalized to canonical ID "${id}".`,
        { sourceFieldId: field.id, canonicalFieldId: id, fieldType: field.type },
      ));
      return {
        field: { ...field, id },
        originalField: field,
        source: "descriptor",
        normalization: ["source-field-id-to-type-qualified-id-v2.1"],
      };
    }),
    ...markerFields(packageValue),
  ];
  for (const source of sources) {
    if (source.source !== "field-marker" || !source.originalField) continue;
    diagnostics.push(fieldDiagnostic(
      source.originalField,
      "FIELD_ID_TYPE_QUALIFIED",
      "info",
      `Field "${source.originalField.id}" was normalized to canonical ID "${source.field.id}".`,
      {
        sourceFieldId: source.originalField.id,
        canonicalFieldId: source.field.id,
        fieldType: source.field.type,
      },
    ));
  }
  const byId = new Map<string, FieldSource[]>();
  for (const source of sources) {
    const matches = byId.get(source.field.id) ?? [];
    matches.push(source);
    byId.set(source.field.id, matches);
  }

  const mergedBooleanSources = new Set<FieldSource>();
  for (const [fieldId, matches] of byId) {
    if (matches.length > 1 && matches.every((source) =>
      source.field.type === "boolean" &&
      source.field.property === "visible" &&
      typeof source.field.defaultValue === "boolean"
    )) {
      const defaults = new Set(matches.map((source) => source.field.defaultValue));
      const nodeIds = matches.map((source) => source.field.nodeId);
      if (defaults.size === 1 && new Set(nodeIds).size === nodeIds.length) {
        const primary = matches[0];
        primary.additionalBooleanNodeIds = nodeIds.slice(1);
        primary.normalization = [
          ...(primary.normalization ?? []),
          "repeated-boolean-markers-to-multi-target-visibility-v2",
        ];
        matches.slice(1).forEach((source) => mergedBooleanSources.add(source));
        diagnostics.push(fieldDiagnostic(
          primary.field,
          "BOOLEAN_VISIBILITY_TARGETS_MERGED",
          "info",
          `Repeated Boolean field "${fieldId}" was normalized to one control for ${nodeIds.length} structural visibility targets.`,
          { fieldId, primaryNodeId: nodeIds[0], additionalNodeIds: nodeIds.slice(1) },
        ));
        continue;
      }
    }
  }

  const ordered: FieldSource[] = [];
  for (const source of sources) {
    if (mergedBooleanSources.has(source)) continue;
    ordered.push(source);
  }
  return ordered;
}

function baseField(
  source: FieldSource,
  normalization: string[],
): Pick<EditableFieldDefinitionV2, "id" | "label" | "controlRole" | "provenance"> {
  const label = source.field.label?.trim();
  return {
    id: source.field.id,
    ...(label ? { label } : {}),
    provenance: {
      sourceContract: "template-package-v1",
      source: source.source,
      ...(source.source === "descriptor"
        ? { sourceField: cloneValue(source.originalField ?? source.field) as unknown as Record<string, unknown> }
        : { marker: source.marker }),
      normalization,
    },
  };
}

function normalizeTextConfiguration(
  source: FieldSource,
  multiline: boolean,
  diagnostics: PackageDiagnostic[],
): TextFieldDefinitionV2["configuration"] | TextareaFieldDefinitionV2["configuration"] {
  const constraints = source.field.constraints as Record<string, unknown> | undefined;
  const configuration: TextareaFieldDefinitionV2["configuration"] = {};
  if (Number.isInteger(constraints?.maxCharacters) && Number(constraints?.maxCharacters) > 0) {
    configuration.maxCharacters = Number(constraints?.maxCharacters);
  }
  if (multiline && Number.isInteger(constraints?.maxLines) && Number(constraints?.maxLines) > 0) {
    configuration.maxLines = Number(constraints?.maxLines);
  }
  const unsupported = Object.keys(constraints ?? {}).filter((key) =>
    !["maxCharacters", ...(multiline ? ["maxLines"] : [])].includes(key)
  );
  if (unsupported.length > 0 || source.field.behavior || source.field.format) {
    diagnostics.push(fieldDiagnostic(
      source.field,
      "field-v2.legacy-rules-preserved",
      "warning",
      "Legacy field rules without a V2 semantic equivalent were preserved as provenance and are not runtime rules.",
      { unsupported },
    ));
  }
  return configuration;
}

function normalizeImageConfiguration(
  source: FieldSource,
  diagnostics: PackageDiagnostic[],
): ImageFieldConfigurationV1 | null {
  const constraints = source.field.constraints as Record<string, unknown> | undefined;
  const mode = constraints?.replacementMode;
  const configuration: ImageFieldConfigurationV1 = { replacementPlacement: "fill" };
  if (mode === "cover") {
    configuration.replacementPlacement = "fill";
  } else if (mode === "contain") {
    configuration.replacementPlacement = "fit";
  } else if (mode === "user-crop") {
    configuration.replacementPlacement = "crop";
  } else if (mode === "preserve-original-crop") {
    diagnostics.push(fieldDiagnostic(
      source.field,
      "field-v2.preserve-imported-crop-unsupported",
      "error",
      "V2 replacement media never reuses imported crop data. Configure Fill, Fit, or a new canonical Crop result.",
    ));
    return null;
  }
  const unsupported = Object.keys(constraints ?? {}).filter((key) =>
    !["replacementMode", "scaleMode"].includes(key)
  );
  if (unsupported.length > 0 || source.field.behavior || source.field.format) {
    diagnostics.push(fieldDiagnostic(
      source.field,
      "field-v2.host-image-rules-preserved",
      "warning",
      "Host/workflow image restrictions were preserved as provenance and are not portable V2 Field Rules.",
      { unsupported },
    ));
  }
  return configuration;
}

function exactColorIndex(
  packageValue: TemplatePackageV1,
  source: FieldSource,
  node: TemplateNode,
  diagnostics: PackageDiagnostic[],
): number | null {
  const exact = source.field.property.match(/^appearance\.fills\.(\d+)\.color$/);
  if (exact) {
    const sourceIndex = Number(exact[1]);
    if (node.appearance.fills[sourceIndex]?.type === "SOLID") return sourceIndex;
    diagnostics.push(fieldDiagnostic(
      source.field,
      "field-v2.color-binding-invalid",
      "error",
      "The exported Color binding does not identify a current SOLID fill.",
      { sourceIndex },
    ));
    return null;
  }
  if (source.field.property !== "appearance.fills") {
    diagnostics.push(fieldDiagnostic(
      source.field,
      "field-v2.color-binding-unsupported",
      "error",
      "V2 Color fields initially support only exact SOLID fill-color bindings.",
      { property: source.field.property },
    ));
    return null;
  }
  const resolution = resolveSourceColorFill(packageValue, node);
  if (resolution.resolved) {
    diagnostics.push(fieldDiagnostic(
      source.field,
      "field-v2.color-binding-resolved",
      "info",
      "A generic Color field was resolved to its single eligible SOLID fill during normalization.",
      { sourceIndex: resolution.sourceIndex },
    ));
    return resolution.sourceIndex;
  }
  const candidates = resolution.candidateSourceIndices;
  diagnostics.push(fieldDiagnostic(
    source.field,
    resolution.reason === "mask-source"
      ? "field-v2.color-binding-mask-source"
      : resolution.reason === "unsupported-node-type"
        ? "field-v2.color-binding-unsupported-node"
        : resolution.reason === "missing-solid-fill"
          ? "field-v2.color-binding-missing"
          : "field-v2.color-binding-ambiguous",
    "error",
    resolution.reason === "mask-source"
      ? "The Color field targets a declared mask source whose RGB is not visible content."
      : resolution.reason === "unsupported-node-type"
        ? `Color fields cannot target ${node.type} nodes.`
        : resolution.reason === "missing-solid-fill"
          ? "The Color field has no eligible SOLID fill target."
          : "The Color field has multiple eligible SOLID fills and requires an exact source binding or Studio setup resolution.",
    { candidateSourceIndices: candidates },
  ));
  return null;
}

function normalizeField(
  packageValue: TemplatePackageV1,
  source: FieldSource,
  diagnostics: PackageDiagnostic[],
): EditableFieldDefinitionV2 | null {
  const field = source.field;
  const parsedId = parseTemplateFieldIdV2(field.id);
  if (!parsedId || parsedId.type !== field.type) {
    diagnostics.push(fieldDiagnostic(
      field,
      "field-v2.invalid-id",
      "error",
      "Field IDs must use a matching <type>:<name> prefix and a portable field name.",
    ));
    return null;
  }
  const node = packageValue.nodes[field.nodeId];
  if (!node) {
    diagnostics.push(fieldDiagnostic(
      field,
      "field-v2.missing-node",
      "error",
      "The editable field target node does not exist.",
    ));
    return null;
  }
  const normalization: string[] = [...(source.normalization ?? [])];
  const base = baseField(source, normalization);

  if (field.type === "text" || field.type === "textarea") {
    const value = textCharacters(node);
    if (value === null || !["text.characters", "text.content"].includes(field.property)) {
      diagnostics.push(fieldDiagnostic(field, "field-v2.text-binding-invalid", "error", "Text and Textarea fields require a TEXT characters binding."));
      return null;
    }
    normalization.push("legacy-text-binding-to-text-characters-v2");
    return {
      ...base,
      type: field.type,
      binding: { kind: "text-characters", nodeId: node.id },
      defaultValue: typeof field.defaultValue === "string" ? field.defaultValue : value,
      configuration: normalizeTextConfiguration(source, field.type === "textarea", diagnostics),
    } as TextFieldDefinitionV2 | TextareaFieldDefinitionV2;
  }

  if (field.type === "number") {
    const parsedDefault = normalizedNumberDefault(field, node);
    if (!parsedDefault) {
      diagnostics.push(fieldDiagnostic(field, "field-v2.number-binding-invalid", "error", "Number fields require a finite numeric default and a TEXT characters binding."));
      return null;
    }
    const legacyFormat = field.format && typeof field.format === "object"
      ? field.format as Record<string, unknown>
      : undefined;
    const configuration: NumberFieldDefinitionV2["configuration"] = {};
    const inferredFormat = {
      ...(parsedDefault.prefix ? { prefix: parsedDefault.prefix } : {}),
      ...(parsedDefault.suffix ? { suffix: parsedDefault.suffix } : {}),
      ...(parsedDefault.decimalPlaces !== undefined ? { decimalPlaces: parsedDefault.decimalPlaces } : {}),
    };
    if (legacyFormat || Object.keys(inferredFormat).length > 0) {
      configuration.format = {
        schemaVersion: "number-display-v1",
        ...inferredFormat,
        ...(typeof legacyFormat?.prefix === "string" ? { prefix: legacyFormat.prefix } : {}),
        ...(typeof legacyFormat?.suffix === "string" ? { suffix: legacyFormat.suffix } : {}),
        ...(legacyFormat?.decimalSeparator === "." || legacyFormat?.decimalSeparator === "," ? { decimalSeparator: legacyFormat.decimalSeparator } : {}),
        ...(legacyFormat?.thousandSeparator === "." || legacyFormat?.thousandSeparator === "," || legacyFormat?.thousandSeparator === " " ? { thousandSeparator: legacyFormat.thousandSeparator } : {}),
        ...(Number.isInteger(legacyFormat?.decimalPlaces) && Number(legacyFormat?.decimalPlaces) >= 0 ? { decimalPlaces: Number(legacyFormat?.decimalPlaces) } : {}),
      };
    }
    if (typeof field.defaultValue === "string") {
      normalization.push("displayed-number-default-to-canonical-number-v2");
      diagnostics.push(fieldDiagnostic(
        field,
        "field-v2.number-default-normalized",
        "info",
        "A displayed Number default was normalized to canonical numeric content and editable formatting.",
        { originalValue: field.defaultValue, canonicalValue: parsedDefault.value, inferredFormat },
      ));
    }
    normalization.push("legacy-number-binding-to-text-characters-v2");
    return {
      ...base,
      type: "number",
      binding: { kind: "text-characters", nodeId: node.id },
      defaultValue: parsedDefault.value,
      configuration,
    } satisfies NumberFieldDefinitionV2;
  }

  if (field.type === "date") {
    const parsedDefault = normalizedDateDefault(packageValue, field, node);
    if (!parsedDefault) {
      diagnostics.push(fieldDiagnostic(field, "field-v2.date-binding-invalid", "error", "Date fields require a canonical YYYY-MM-DD value or one unambiguous supported numeric display date on a TEXT characters binding."));
      return null;
    }
    const legacyFormat = field.format && typeof field.format === "object"
      ? field.format as Record<string, unknown>
      : undefined;
    const validPresets: ReadonlySet<DateDisplayFormatV1["preset"]> = new Set([
      "iso",
      "numeric-year-first",
      "numeric-day-first",
      "numeric-month-first",
      "numeric-day-month",
      "numeric-month-day",
    ]);
    const inferredFormat = {
      preset: parsedDefault.preset,
      ...(parsedDefault.prefix ? { prefix: parsedDefault.prefix } : {}),
      ...(parsedDefault.suffix ? { suffix: parsedDefault.suffix } : {}),
      ...(parsedDefault.separator ? { separator: parsedDefault.separator } : {}),
    };
    const hasDisplayFormat = Boolean(legacyFormat) ||
      parsedDefault.prefix.length > 0 || parsedDefault.suffix.length > 0 ||
      parsedDefault.preset !== "iso";
    const configuration: DateFieldDefinitionV2["configuration"] = hasDisplayFormat
      ? {
          format: {
            schemaVersion: "date-display-v1",
            ...inferredFormat,
            ...(validPresets.has(legacyFormat?.preset as DateDisplayFormatV1["preset"])
              ? { preset: legacyFormat?.preset as DateDisplayFormatV1["preset"] }
              : {}),
            ...(typeof legacyFormat?.prefix === "string" ? { prefix: legacyFormat.prefix } : {}),
            ...(typeof legacyFormat?.suffix === "string" ? { suffix: legacyFormat.suffix } : {}),
            ...(legacyFormat?.separator === "-" || legacyFormat?.separator === "/" || legacyFormat?.separator === "."
              ? { separator: legacyFormat.separator }
              : {}),
          },
        }
      : {};
    if (field.defaultValue !== parsedDefault.value) {
      normalization.push("displayed-date-default-to-canonical-calendar-date-v2");
      diagnostics.push(fieldDiagnostic(
        field,
        "field-v2.date-default-normalized",
        "info",
        "A displayed Date default was normalized to canonical calendar content and editable formatting.",
        {
          originalValue: field.defaultValue,
          canonicalValue: parsedDefault.value,
          inferredFormat,
          ...(parsedDefault.inferredYear ? {
            inferredYear: parsedDefault.inferredYear,
            inferredYearSource: "package.source.exportedAt",
          } : {}),
        },
      ));
    }
    normalization.push("legacy-date-binding-to-text-characters-v2");
    return {
      ...base,
      type: "date",
      binding: { kind: "text-characters", nodeId: node.id },
      defaultValue: parsedDefault.value,
      configuration,
    } satisfies DateFieldDefinitionV2;
  }

  if (field.type === "image") {
    if (field.property !== "image.assetId") {
      diagnostics.push(fieldDiagnostic(field, "field-v2.image-binding-invalid", "error", "Image fields require an image-content binding."));
      return null;
    }
    const reference = typeof field.defaultValue === "string"
      ? field.defaultValue
      : node.image?.assetId ?? null;
    const asset = resolvePackageAssetReference(packageValue, reference);
    if (reference && (!asset || asset.asset.type !== "image")) {
      diagnostics.push(fieldDiagnostic(field, "field-v2.image-default-invalid", "error", "The imported Image default does not resolve to an image asset."));
      return null;
    }
    const configuration = normalizeImageConfiguration(source, diagnostics);
    if (!configuration) return null;
    normalization.push("legacy-image-binding-to-image-content-v2");
    return {
      ...base,
      type: "image",
      binding: { kind: "image-content", nodeId: node.id },
      defaultValue: {
        assetId: asset?.canonicalId ?? null,
        placement: { mode: "imported" },
      },
      configuration,
    } satisfies ImageFieldDefinitionV2;
  }

  if (field.type === "color") {
    const sourceIndex = exactColorIndex(packageValue, source, node, diagnostics);
    if (sourceIndex === null) return null;
    const paint = node.appearance.fills[sourceIndex];
    if (paint.type !== "SOLID") return null;
    normalization.push("legacy-color-binding-resolved-at-import-v2");
    return {
      ...base,
      type: "color",
      binding: { kind: "solid-fill-color", nodeId: node.id, sourceIndex },
      defaultValue: sourceSolidColorHex(paint),
      configuration: {},
    } satisfies ColorFieldDefinitionV2;
  }

  if (field.type === "boolean") {
    if (field.property !== "visible" || typeof field.defaultValue !== "boolean") {
      diagnostics.push(fieldDiagnostic(field, "field-v2.boolean-binding-invalid", "error", "Boolean V2 fields require a structural-visibility binding and boolean default."));
      return null;
    }
    normalization.push("legacy-visible-binding-to-structural-visibility-v2");
    return {
      ...base,
      type: "boolean",
      binding: {
        kind: "structural-visibility",
        nodeId: node.id,
        ...(source.additionalBooleanNodeIds?.length
          ? { additionalNodeIds: source.additionalBooleanNodeIds as [string, ...string[]] }
          : {}),
      },
      defaultValue: field.defaultValue,
      configuration: {},
    } satisfies BooleanFieldDefinitionV2;
  }

  return null;
}

export function normalizeTemplatePackageV1ToV2(
  input: TemplatePackageV1,
): NormalizeTemplatePackageV2Result {
  const sourceValidation = validateTemplatePackage(input);
  const toleratedGenericColorPaths = new Set(
    input.editableFields.flatMap((field, index) =>
      field.type === "color" && field.property === "appearance.fills"
        ? [`/editableFields/${index}/property`]
        : []
    ),
  );
  const toleratedNumberDefaultPaths = new Set(
    input.editableFields.flatMap((field, index) => {
      const node = input.nodes[field.nodeId];
      return field.type === "number" && node && normalizedNumberDefault(field, node)
        ? [`/editableFields/${index}/defaultValue`]
        : [];
    }),
  );
  const sourceBlockers = sourceValidation.diagnostics.filter((item) =>
    item.severity === "error" && !(
      item.code === "field.invalid-property" &&
      item.path !== undefined &&
      toleratedGenericColorPaths.has(item.path)
    ) && !(
      item.code === "field.invalid-default-value" &&
      item.path !== undefined &&
      toleratedNumberDefaultPaths.has(item.path)
    ) && item.code !== "field.duplicate-id"
  );
  if (!sourceValidation.schemaValid || sourceBlockers.length > 0) {
    return { package: null, diagnostics: sourceValidation.diagnostics };
  }

  const diagnostics: PackageDiagnostic[] = sourceValidation.diagnostics.filter((item) =>
    item.severity !== "error"
  );
  const seenIds = new Set<string>();
  const fields: EditableFieldDefinitionV2[] = [];
  for (const source of sourceFields(input, diagnostics)) {
    if (seenIds.has(source.field.id)) {
      diagnostics.push(fieldDiagnostic(
        source.field,
        "field-v2.duplicate-id",
        "error",
        `Editable field ID "${source.field.id}" is duplicated after descriptor/marker normalization.`,
      ));
      continue;
    }
    seenIds.add(source.field.id);
    const field = normalizeField(input, source, diagnostics);
    if (field) fields.push(field);
  }

  if (diagnostics.some((item) => item.severity === "error")) {
    return { package: null, diagnostics };
  }

  const { schemaVersion: _version, editableFields: _fields, ...shared } = cloneValue(input);
  const fieldOrder = reconcileEditableFieldOrderV2(undefined, fields);
  return {
    package: {
      ...shared,
      schemaVersion: "2.2",
      editableFields: fields,
      editableFieldOrder: fieldOrder.order,
    },
    diagnostics: [
      ...diagnostics,
      diagnostic(
        "version.template-package-v1-normalized-to-v2",
        "info",
        "version",
        "TemplatePackageV1 source was normalized once into the strict TemplatePackageV2 field contract.",
        { path: "/schemaVersion" },
      ),
    ],
  };
}
