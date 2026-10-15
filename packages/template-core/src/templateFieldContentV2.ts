import type { PackageDiagnostic } from "./packageDiagnostics";
import { diagnostic } from "./packageDiagnostics";
import {
  resolveDefaultImageReplacementPlacementV1,
  validateTemplateFieldValueV2,
} from "./fieldSemanticKernelV2";
import type {
  FieldRenderValidationStatusV1,
  FieldValidationIssueV2,
} from "./fieldValidationV2";
import type {
  EditableFieldDefinitionV2,
  ImageReplacementPlacementV1,
  StaticChoiceSet,
  TemplateFieldCanonicalValueV1,
  TemplateFieldContentEntryV1,
  TemplateFieldContentStateV1,
  TemplateFieldType,
  TemplatePackageV2,
} from "./types";
import { validateTemplateFieldContentStateV1 } from "./validateTemplateFieldContentStateV1";
import { validateTemplatePackageV2 } from "./validateTemplatePackageV2";

export type HostEditableFieldDescriptorV2 =
  EditableFieldDefinitionV2 extends infer Field
    ? Field extends EditableFieldDefinitionV2
      ? Omit<Field, "binding" | "provenance">
      : never
    : never;

export interface OrderedHostEditableFieldDescriptorV2 {
  index: number;
  field: HostEditableFieldDescriptorV2;
}

export type TemplateFieldContentMutationV2 =
  | {
      kind: "set-value";
      fieldId: string;
      value: unknown;
      selectedChoiceId?: string;
    }
  | {
      kind: "select-choice";
      fieldId: string;
      choiceId: string;
    }
  | {
      kind: "set-image-replacement";
      fieldId: string;
      assetId: string;
      placement?: ImageReplacementPlacementV1;
    }
  | {
      kind: "reset";
      fieldId: string;
    };

export interface TemplateFieldMutationProvenanceV2 {
  operation: TemplateFieldContentMutationV2["kind"];
  valueSource: "content-override" | "imported-default";
  selectedChoiceId?: string;
}

export interface TemplateFieldContentMutationResultV2 {
  accepted: boolean;
  changedFieldId: string;
  fieldType: TemplateFieldType | null;
  previousRevision: number;
  contentRevision: number;
  state: TemplateFieldContentStateV1;
  issues: FieldValidationIssueV2[];
  diagnostics: PackageDiagnostic[];
  renderValidation: FieldRenderValidationStatusV1;
  provenance?: TemplateFieldMutationProvenanceV2;
}

export interface TemplateFieldContentPackageValidationResultV2 {
  valid: boolean;
  diagnostics: PackageDiagnostic[];
  fieldIssues: FieldValidationIssueV2[];
}

export interface ResolvedTemplateFieldContentV2 {
  fieldId: string;
  fieldType: TemplateFieldType;
  value: TemplateFieldCanonicalValueV1 | EditableFieldDefinitionV2["defaultValue"];
  valueSource: "content-override" | "imported-default";
  contentRevision: number;
  selectedChoiceId?: string;
}

/**
 * Configuration is a reviewed transaction, not a renderer readback. Advance
 * currentness even when values are unchanged, so configuration A/B/A cannot
 * accept evidence from the first A. Existing invalid values remain correctable.
 */
export function reconcileTemplateFieldConfigurationV2(
  packageValue: TemplatePackageV2,
  state: TemplateFieldContentStateV1,
): TemplateFieldContentStateV1 {
  const compatibility = validateTemplateFieldContentForPackageV2(packageValue, state);
  const errors = compatibility.diagnostics.filter((item) => item.severity === "error");
  if (errors.length) throw new Error(errors.map((item) => item.message).join("\n"));
  if (!Number.isSafeInteger(state.revision + 1)) throw new Error("Content revision is exhausted.");
  const values = cloneValue(state.values) as Record<string, TemplateFieldContentEntryV1>;
  for (const field of packageValue.editableFields) {
    const entry = values[field.id];
    if (!entry?.selectedChoiceId) continue;
    const choices = "choices" in field.configuration ? field.configuration.choices : undefined;
    const option = choices?.options.find((candidate) => candidate.id === entry.selectedChoiceId);
    if (!option) {
      values[field.id] = { value: entry.value };
    } else if (option.value !== entry.value) {
      const result = validateTemplateFieldValueV2(field, option.value, { selectedChoiceId: option.id });
      if (!result.valid || result.canonicalValue === undefined) throw new Error(result.issues.map((issue) => issue.message).join("\n"));
      values[field.id] = { value: result.canonicalValue, selectedChoiceId: option.id };
    }
  }
  return deepFreeze({ ...state, revision: state.revision + 1, values });
}

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function mutationIssue(
  fieldId: string,
  code: string,
  message: string,
): FieldValidationIssueV2 {
  return { code, fieldId, severity: "error", message, blocksExport: true };
}

function pendingRenderValidation(
  field: EditableFieldDefinitionV2,
  revision: number,
): FieldRenderValidationStatusV1 {
  if (field.type !== "textarea" ||
      (field.configuration.maxLines === undefined &&
        field.configuration.warningAtLines === undefined)) {
    return { state: "not-required" };
  }
  return {
    state: "pending",
    contentRevision: revision,
    reason: field.configuration.maxLines !== undefined
      ? "Rendered visual-line evidence is required for maxLines."
      : "Rendered visual-line evidence is pending for warningAtLines.",
  };
}

function fieldChoices(
  field: EditableFieldDefinitionV2,
): StaticChoiceSet<unknown> | undefined {
  return field.type === "image" || field.type === "boolean"
    ? undefined
    : field.configuration.choices as StaticChoiceSet<unknown> | undefined;
}

export function createTemplateFieldContentStateV1(
  packageValue: Pick<TemplatePackageV2, "packageId">,
): TemplateFieldContentStateV1 {
  return deepFreeze({
    schemaVersion: "template-field-content-v1",
    packageId: packageValue.packageId,
    packageSchemaVersion: "2.2",
    revision: 0,
    values: {},
  });
}

/** Package-aware validation for persisted sparse canonical overrides. */
export function validateTemplateFieldContentForPackageV2(
  packageValue: TemplatePackageV2,
  input: unknown,
): TemplateFieldContentPackageValidationResultV2 {
  const packageValidation = validateTemplatePackageV2(packageValue);
  const structural = validateTemplateFieldContentStateV1(input);
  const diagnostics = [
    ...packageValidation.diagnostics,
    ...structural.diagnostics,
  ];
  const fieldIssues: FieldValidationIssueV2[] = [];
  if (!packageValidation.valid || !structural.valid) {
    return { valid: false, diagnostics, fieldIssues };
  }

  const state = input as TemplateFieldContentStateV1;
  if (state.packageId !== packageValue.packageId) {
    diagnostics.push(diagnostic(
      "field-content.package-id-mismatch",
      "error",
      "field",
      `Content state belongs to package "${state.packageId}", not "${packageValue.packageId}".`,
      { path: "/packageId" },
    ));
  }
  if (state.packageSchemaVersion !== packageValue.schemaVersion) {
    diagnostics.push(diagnostic(
      "field-content.package-version-mismatch",
      "error",
      "version",
      "Content state does not target the current TemplatePackageV2 contract.",
      { path: "/packageSchemaVersion" },
    ));
  }
  if (!Number.isSafeInteger(state.revision)) {
    diagnostics.push(diagnostic(
      "field-content.revision-unsafe",
      "error",
      "field",
      "Content revision must be a safe non-negative integer.",
      { path: "/revision" },
    ));
  }

  const fields = new Map(packageValue.editableFields.map((field) => [field.id, field]));
  for (const [fieldId, entry] of Object.entries(state.values)) {
    const field = fields.get(fieldId);
    if (!field) {
      diagnostics.push(diagnostic(
        "field-content.unknown-field",
        "error",
        "field",
        `Content state contains unknown field "${fieldId}".`,
        { path: `/values/${fieldId}`, details: { fieldId } },
      ));
      continue;
    }
    const validation = validateTemplateFieldValueV2(field, entry.value, {
      packageValue,
      canonicalInputOnly: true,
      selectedChoiceId: entry.selectedChoiceId,
    });
    fieldIssues.push(...validation.issues);
  }

  return {
    valid: !diagnostics.some((item) => item.severity === "error") &&
      !fieldIssues.some((item) => item.severity === "error"),
    diagnostics,
    fieldIssues,
  };
}

/** Resolve only from imported definitions plus canonical state; never from nodes. */
export function resolveTemplateFieldContentV2(
  field: EditableFieldDefinitionV2,
  state: TemplateFieldContentStateV1,
): ResolvedTemplateFieldContentV2 {
  const entry = state.values[field.id];
  return entry
    ? {
        fieldId: field.id,
        fieldType: field.type,
        value: cloneValue(entry.value),
        valueSource: "content-override",
        contentRevision: state.revision,
        ...(entry.selectedChoiceId !== undefined
          ? { selectedChoiceId: entry.selectedChoiceId }
          : {}),
      }
    : {
        fieldId: field.id,
        fieldType: field.type,
        value: cloneValue(field.defaultValue),
        valueSource: "imported-default",
        contentRevision: state.revision,
      };
}

/** Safe ordered host projection. Import-resolved bindings and source internals stay hidden. */
export function getOrderedHostEditableFieldsV2(
  packageValue: TemplatePackageV2,
): OrderedHostEditableFieldDescriptorV2[] {
  const fields = new Map(packageValue.editableFields.map((field) => [field.id, field]));
  return packageValue.editableFieldOrder.flatMap((fieldId, index) => {
    const field = fields.get(fieldId);
    if (!field) return [];
    const { binding: _binding, provenance: _provenance, ...descriptor } = cloneValue(field);
    return [{ index, field: descriptor as HostEditableFieldDescriptorV2 }];
  });
}

function rejectedMutation(
  state: TemplateFieldContentStateV1,
  command: TemplateFieldContentMutationV2,
  field: EditableFieldDefinitionV2 | undefined,
  issues: FieldValidationIssueV2[],
  diagnostics: PackageDiagnostic[] = [],
): TemplateFieldContentMutationResultV2 {
  return {
    accepted: false,
    changedFieldId: command.fieldId,
    fieldType: field?.type ?? null,
    previousRevision: state.revision,
    contentRevision: state.revision,
    state,
    issues,
    diagnostics,
    renderValidation: { state: "not-required" },
  };
}

/** The single authoritative reducer for all seven V2 field semantics. */
export function mutateTemplateFieldContentV2(
  packageValue: TemplatePackageV2,
  state: TemplateFieldContentStateV1,
  command: TemplateFieldContentMutationV2,
): TemplateFieldContentMutationResultV2 {
  const compatibility = validateTemplateFieldContentForPackageV2(packageValue, state);
  const field = packageValue.editableFields.find((candidate) => candidate.id === command.fieldId);
  // Structural/package errors block mutation. Existing semantic field errors
  // do not: configuration changes or persisted invalid values must be editable
  // through the same reducer so the user can correct them.
  if (compatibility.diagnostics.some((item) => item.severity === "error")) {
    return rejectedMutation(
      state,
      command,
      field,
      [mutationIssue(command.fieldId, "field-v2.content-state-invalid", "Canonical content state is not valid for this package.")],
      compatibility.diagnostics,
    );
  }
  if (!field) {
    return rejectedMutation(
      state,
      command,
      undefined,
      [mutationIssue(command.fieldId, "field-v2.field-unknown", `Editable field "${command.fieldId}" does not exist.`)],
    );
  }
  if (!Number.isSafeInteger(state.revision + 1)) {
    return rejectedMutation(
      state,
      command,
      field,
      [mutationIssue(command.fieldId, "field-v2.revision-exhausted", "Content revision cannot advance safely.")],
    );
  }

  const nextRevision = state.revision + 1;
  if (command.kind === "reset") {
    const values = cloneValue(state.values) as Record<string, TemplateFieldContentEntryV1>;
    delete values[field.id];
    const nextState = deepFreeze({
      ...cloneValue(state),
      revision: nextRevision,
      values,
    });
    return {
      accepted: true,
      changedFieldId: field.id,
      fieldType: field.type,
      previousRevision: state.revision,
      contentRevision: nextRevision,
      state: nextState,
      issues: [],
      diagnostics: [],
      renderValidation: pendingRenderValidation(field, nextRevision),
      provenance: { operation: "reset", valueSource: "imported-default" },
    };
  }

  let input: unknown;
  let selectedChoiceId: string | undefined;
  if (command.kind === "select-choice") {
    const option = fieldChoices(field)?.options.find((candidate) => candidate.id === command.choiceId);
    if (!option) {
      return rejectedMutation(
        state,
        command,
        field,
        [mutationIssue(field.id, "field-v2.choice-id-unknown", `Choice "${command.choiceId}" is not configured for ${fieldLabelForMutation(field)}.`)],
      );
    }
    input = option.value;
    selectedChoiceId = option.id;
  } else if (command.kind === "set-image-replacement") {
    if (field.type !== "image") {
      return rejectedMutation(
        state,
        command,
        field,
        [mutationIssue(field.id, "field-v2.image-field-required", "Image replacement requires an Image field.")],
      );
    }
    let placement = command.placement;
    if (!placement) {
      const mode = resolveDefaultImageReplacementPlacementV1(field.configuration);
      placement = { mode };
    }
    input = { assetId: command.assetId, placement };
  } else {
    input = command.value;
    selectedChoiceId = command.selectedChoiceId;
  }

  const validation = validateTemplateFieldValueV2(field, input, {
    packageValue,
    selectedChoiceId,
  });
  if (!validation.valid || validation.canonicalValue === undefined) {
    return rejectedMutation(state, command, field, validation.issues);
  }
  const values = cloneValue(state.values) as Record<string, TemplateFieldContentEntryV1>;
  values[field.id] = {
    value: cloneValue(validation.canonicalValue),
    ...(selectedChoiceId !== undefined ? { selectedChoiceId } : {}),
  };
  const nextState = deepFreeze({
    ...cloneValue(state),
    revision: nextRevision,
    values,
  });
  return {
    accepted: true,
    changedFieldId: field.id,
    fieldType: field.type,
    previousRevision: state.revision,
    contentRevision: nextRevision,
    state: nextState,
    issues: validation.issues,
    diagnostics: [],
    renderValidation: pendingRenderValidation(field, nextRevision),
    provenance: {
      operation: command.kind,
      valueSource: "content-override",
      ...(selectedChoiceId !== undefined ? { selectedChoiceId } : {}),
    },
  };
}

function fieldLabelForMutation(field: EditableFieldDefinitionV2): string {
  return field.label?.trim() || field.id;
}

export function setTemplateFieldValueV2(
  packageValue: TemplatePackageV2,
  state: TemplateFieldContentStateV1,
  fieldId: string,
  value: unknown,
  options: { selectedChoiceId?: string } = {},
): TemplateFieldContentMutationResultV2 {
  return mutateTemplateFieldContentV2(packageValue, state, {
    kind: "set-value",
    fieldId,
    value,
    ...options,
  });
}

export function selectTemplateFieldChoiceV2(
  packageValue: TemplatePackageV2,
  state: TemplateFieldContentStateV1,
  fieldId: string,
  choiceId: string,
): TemplateFieldContentMutationResultV2 {
  return mutateTemplateFieldContentV2(packageValue, state, {
    kind: "select-choice",
    fieldId,
    choiceId,
  });
}

export function setTemplateImageReplacementV2(
  packageValue: TemplatePackageV2,
  state: TemplateFieldContentStateV1,
  fieldId: string,
  assetId: string,
  placement?: ImageReplacementPlacementV1,
): TemplateFieldContentMutationResultV2 {
  return mutateTemplateFieldContentV2(packageValue, state, {
    kind: "set-image-replacement",
    fieldId,
    assetId,
    ...(placement ? { placement } : {}),
  });
}

export function resetTemplateFieldValueV2(
  packageValue: TemplatePackageV2,
  state: TemplateFieldContentStateV1,
  fieldId: string,
): TemplateFieldContentMutationResultV2 {
  return mutateTemplateFieldContentV2(packageValue, state, {
    kind: "reset",
    fieldId,
  });
}
