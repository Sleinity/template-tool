import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import schema from "./schema/template-field-content-v1.schema.json";
import { diagnostic, type PackageDiagnostic } from "./packageDiagnostics";

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
      `field-content.schema.${error.keyword}`,
      "error",
      "schema",
      error.message
        ? `Field content-state schema validation failed: ${error.message}.`
        : "Field content-state schema validation failed.",
      { path: error.instancePath || "/" },
    )
  );
}

/**
 * Result of validating the standalone, serializable content-state envelope.
 * Field-specific semantics are evaluated against TemplatePackageV2 by the
 * Milestone 2 mutation/session authority, not by this structural validator.
 */
export interface TemplateFieldContentStateValidationResultV1 {
  valid: boolean;
  diagnostics: PackageDiagnostic[];
}

/**
 * Validates the separately versioned canonical content-state envelope.
 * This function never reads or reconstructs values from renderer properties.
 */
export function validateTemplateFieldContentStateV1(
  input: unknown,
): TemplateFieldContentStateValidationResultV1 {
  const validator = getSchemaValidator();
  const valid = validator(input) === true;
  return {
    valid,
    diagnostics: valid ? [] : schemaDiagnostics(validator.errors),
  };
}
