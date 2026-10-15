import type { TemplateFieldType } from "./types";

export interface FieldValidationIssueV2 {
  code: string;
  fieldId: string;
  severity: "warning" | "error";
  message: string;
  blocksExport: boolean;
}

/** Immediate result: canonical mutation acceptance is not render validity. */
export interface FieldMutationAcceptanceV2 {
  accepted: boolean;
  fieldId: string;
  fieldType: TemplateFieldType;
  contentRevision: number;
  deterministicIssues: FieldValidationIssueV2[];
  renderValidation: "not-required" | "pending";
}

/** Revision-bound browser/settlement evidence for rendered Textarea lines. */
export interface FieldLayoutEvidenceV1 {
  schemaVersion: "field-layout-evidence-v1";
  fieldId: string;
  packageIdentity: string;
  contentRevision: number;
  materializationRevision: string;
  settlementRevision: string;
  fontRevision: string;
  publicationGeneration: number;
  participation: "active" | "structurally-excluded";
  measuredVisualLines?: number;
  reliability: "reliable" | "pending" | "unsupported";
}

export type FieldRenderValidationStatusV1 =
  | { state: "not-required" }
  | { state: "pending"; contentRevision: number; reason: string }
  | { state: "inactive"; contentRevision: number; reason: string }
  | {
      state: "valid";
      contentRevision: number;
      visualLines: number;
      warnings: FieldValidationIssueV2[];
    }
  | {
      state: "invalid";
      contentRevision: number;
      visualLines: number;
      errors: FieldValidationIssueV2[];
    };
