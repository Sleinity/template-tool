import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import schema from "./schema/template-package-v2.schema.json";
import { validateEditableFieldDefinitionSemanticsV2 } from "./fieldSemanticKernelV2";
import {
  diagnostic,
  type PackageDiagnostic,
  type TemplatePackageValidationResult,
} from "./packageDiagnostics";
import type {
  EditableFieldDefinitionV2,
  TemplatePackageV1,
  TemplatePackageV2,
} from "./types";
import { validateTemplatePackage } from "./validateTemplatePackage";

type SchemaValidator = ReturnType<Ajv2020["compile"]>;
let validateSchema: SchemaValidator | null = null;

function getSchemaValidator(): SchemaValidator {
  if (validateSchema) return validateSchema;
  validateSchema = new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: true,
  }).compile(schema);
  return validateSchema;
}

function schemaDiagnostics(errors: ErrorObject[] | null | undefined): PackageDiagnostic[] {
  return (errors ?? []).map((error) =>
    diagnostic(
      `schema.${error.keyword}`,
      "error",
      "schema",
      error.message ? `Schema validation failed: ${error.message}.` : "Schema validation failed.",
      { path: error.instancePath || "/" },
    )
  );
}

function fieldIssue(
  field: EditableFieldDefinitionV2,
  code: string,
  message: string,
  path = "",
): PackageDiagnostic {
  return diagnostic(code, "error", "field", message, {
    path: `/editableFields/${field.id}${path}`,
    nodeId: field.binding.nodeId,
    details: { fieldId: field.id },
  });
}

function v1ValidationProjection(packageValue: TemplatePackageV2): TemplatePackageV1 {
  const {
    editableFieldOrder: _editableFieldOrder,
    editableFields: _editableFields,
    schemaVersion: _schemaVersion,
    ...shared
  } = structuredClone(packageValue);
  return {
    ...shared,
    schemaVersion: "1.0",
    source: packageValue.source
      ? { ...structuredClone(packageValue.source), packageContract: "template-package-v1" }
      : undefined,
    editableFields: packageValue.editableFields.map((field) => ({
      id: field.id,
      type: field.type,
      nodeId: field.binding.nodeId,
      property: field.binding.kind === "text-characters"
        ? "text.characters"
        : field.binding.kind === "image-content"
          ? "image.assetId"
          : field.binding.kind === "solid-fill-color"
            ? `appearance.fills.${field.binding.sourceIndex}.color`
            : "visible",
      defaultValue: field.type === "image"
        ? field.defaultValue.assetId
        : field.defaultValue,
      ...(field.label !== undefined ? { label: field.label } : {}),
    })),
  };
}

function validateSemanticPackageV2(packageValue: TemplatePackageV2): PackageDiagnostic[] {
  const diagnostics = validateTemplatePackage(v1ValidationProjection(packageValue)).diagnostics;
  const fieldsById = new Map(packageValue.editableFields.map((field) => [field.id, field]));

  const seenOrder = new Set<string>();
  packageValue.editableFieldOrder.forEach((fieldId, index) => {
    if (seenOrder.has(fieldId)) {
      diagnostics.push(diagnostic(
        "field-order.duplicate-id",
        "error",
        "field",
        `Field order contains duplicate ID "${fieldId}".`,
        { path: `/editableFieldOrder/${index}`, details: { fieldId } },
      ));
    } else if (!fieldsById.has(fieldId)) {
      diagnostics.push(diagnostic(
        "field-order.unknown-id",
        "error",
        "field",
        `Field order references unknown ID "${fieldId}".`,
        { path: `/editableFieldOrder/${index}`, details: { fieldId } },
      ));
    }
    seenOrder.add(fieldId);
  });
  for (const field of packageValue.editableFields) {
    if (!seenOrder.has(field.id)) {
      diagnostics.push(fieldIssue(
        field,
        "field-order.omitted-id",
        `Field order omits editable field "${field.id}".`,
      ));
    }
  }

  const boundTargets = new Set<string>();
  for (const field of packageValue.editableFields) {
    const targets = field.binding.kind === "solid-fill-color"
      ? [`${field.binding.kind}:${field.binding.nodeId}:${field.binding.sourceIndex}`]
      : field.binding.kind === "structural-visibility"
        ? [field.binding.nodeId, ...(field.binding.additionalNodeIds ?? [])]
            .map((nodeId) => `${field.binding.kind}:${nodeId}`)
        : [`${field.binding.kind}:${field.binding.nodeId}`];
    for (const target of targets) {
      if (boundTargets.has(target)) {
        diagnostics.push(fieldIssue(
          field,
          "field-v2.binding-duplicate",
          "An imported editable target cannot be bound to more than one field.",
          "/binding",
        ));
      }
      boundTargets.add(target);
    }

    const node = packageValue.nodes[field.binding.nodeId];
    if (["text", "textarea", "number", "date"].includes(field.type) && node?.type !== "TEXT") {
      diagnostics.push(fieldIssue(
        field,
        "field-v2.text-binding-invalid",
        "This field requires an exact current TEXT characters binding.",
        "/binding/nodeId",
      ));
    }
    if (field.type === "image" && !node?.image) {
      diagnostics.push(fieldIssue(
        field,
        "field-v2.image-binding-invalid",
        "The Image binding must identify a node with canonical image content.",
        "/binding/nodeId",
      ));
    }
    if (field.binding.kind === "solid-fill-color" &&
        node?.appearance.fills[field.binding.sourceIndex]?.type !== "SOLID") {
      diagnostics.push(fieldIssue(
        field,
        "field-v2.color-binding-invalid",
        "The Color binding must identify an exact current SOLID fill.",
        "/binding/sourceIndex",
      ));
    }
    if (field.binding.kind === "structural-visibility") {
      for (const [index, nodeId] of (field.binding.additionalNodeIds ?? []).entries()) {
        if (nodeId === field.binding.nodeId || !packageValue.nodes[nodeId]) {
          diagnostics.push(fieldIssue(
            field,
            "field-v2.boolean-binding-invalid",
            nodeId === field.binding.nodeId
              ? "A Boolean visibility target cannot repeat its primary node."
              : `Boolean visibility target "${nodeId}" does not exist.`,
            `/binding/additionalNodeIds/${index}`,
          ));
        }
      }
    }
    if (field.type === "image" && field.defaultValue.assetId !== null &&
        packageValue.assets[field.defaultValue.assetId]?.type !== "image") {
      diagnostics.push(fieldIssue(
        field,
        "field-v2.image-default-invalid",
        "The imported Image default must identify a canonical image asset.",
        "/defaultValue/assetId",
      ));
    }
    for (const semanticIssue of validateEditableFieldDefinitionSemanticsV2(field)) {
      diagnostics.push(fieldIssue(
        field,
        semanticIssue.code,
        semanticIssue.message,
        "/configuration",
      ));
    }
  }
  return diagnostics;
}

function validateUncachedTemplatePackageV2(input: unknown): TemplatePackageValidationResult {
  const schemaValidator = getSchemaValidator();
  const schemaValid = schemaValidator(input);
  if (!schemaValid) {
    return {
      valid: false,
      schemaValid: false,
      semanticValid: false,
      diagnostics: schemaDiagnostics(schemaValidator.errors),
      pluginDiagnostics: [],
      motionLinking: null,
    };
  }
  const packageValue = input as TemplatePackageV2;
  const diagnostics = validateSemanticPackageV2(packageValue);
  return {
    valid: !diagnostics.some((item) => item.severity === "error"),
    schemaValid: true,
    semanticValid: !diagnostics.some((item) => item.severity === "error"),
    diagnostics,
    pluginDiagnostics: packageValue.diagnostics ?? [],
    motionLinking: null,
  };
}

// Session bases are deeply frozen plain data. Mutable public inputs always take
// the full validator; neither object identity nor a shallow freeze proves safety.
const immutableValues = new WeakSet<object>();
const immutableValidation = new WeakMap<object, TemplatePackageValidationResult>();
function isImmutableData(value: unknown, visiting = new WeakSet<object>()): boolean {
  if (!value || typeof value !== "object") return typeof value !== "function";
  if (immutableValues.has(value)) return true;
  if (!Object.isFrozen(value) || visiting.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) return false;
  visiting.add(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor) || !isImmutableData(descriptor.value, visiting)) {
      visiting.delete(value);
      return false;
    }
  }
  visiting.delete(value);
  immutableValues.add(value);
  return true;
}

export function validateTemplatePackageV2(input: unknown): TemplatePackageValidationResult {
  const cacheable = input !== null && typeof input === "object" && isImmutableData(input);
  if (cacheable) {
    const cached = immutableValidation.get(input);
    if (cached) return structuredClone(cached);
  }
  const result = validateUncachedTemplatePackageV2(input);
  // Never expose the stored result to a caller that can mutate diagnostics.
  if (cacheable) immutableValidation.set(input, structuredClone(result));
  return result;
}
