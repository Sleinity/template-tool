import type {
  EditableFieldDefinitionV2,
  FieldLayoutEvidenceV1,
  FieldRenderValidationStatusV1,
  FieldValidationIssueV2,
} from "@sleinity/template-core";

/** Evaluate only evidence already accepted by the native session's identity guards. */
export function evaluateFieldRenderEvidence(
  field: Extract<EditableFieldDefinitionV2, { type: "textarea" }>,
  evidence: FieldLayoutEvidenceV1,
): FieldRenderValidationStatusV1 {
  if (evidence.participation === "structurally-excluded") {
    return {
      state: "inactive",
      contentRevision: evidence.contentRevision,
      reason: "The Textarea is structurally excluded from the active render tree.",
    };
  }
  if (
    evidence.reliability !== "reliable" ||
    evidence.measuredVisualLines === undefined ||
    !Number.isInteger(evidence.measuredVisualLines) ||
    evidence.measuredVisualLines < 1
  ) {
    return {
      state: "pending",
      contentRevision: evidence.contentRevision,
      reason: "Reliable visual-line evidence is unavailable.",
    };
  }
  if (field.configuration.maxLines !== undefined && evidence.measuredVisualLines > field.configuration.maxLines) {
    return {
      state: "invalid",
      contentRevision: evidence.contentRevision,
      visualLines: evidence.measuredVisualLines,
      errors: [{
        code: "field-v2.max-lines",
        fieldId: field.id,
        severity: "error",
        message: `Rendered content exceeds ${field.configuration.maxLines} visual lines.`,
        blocksExport: true,
      }],
    };
  }
  const warnings: FieldValidationIssueV2[] = [];
  if (field.configuration.warningAtLines !== undefined && evidence.measuredVisualLines >= field.configuration.warningAtLines) {
    warnings.push({
      code: "field-v2.warning-lines",
      fieldId: field.id,
      severity: "warning",
      message: `Rendered content uses ${evidence.measuredVisualLines} visual lines.`,
      blocksExport: false,
    });
  }
  return { state: "valid", contentRevision: evidence.contentRevision, visualLines: evidence.measuredVisualLines, warnings };
}

/** Runtime-only changes preserve exclusion in the same materialization; canonical changes clear all entries natively. */
export function invalidateRuntimeFieldEvidence(validationByField: Map<string, FieldRenderValidationStatusV1>): void {
  for (const [fieldId, validation] of validationByField) {
    if (validation.state !== "inactive") validationByField.delete(fieldId);
  }
}
