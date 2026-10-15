import {
  parseTemplatePackageV2,
  reconcileEditableFieldOrderV2,
  validateTemplateFieldContentForPackageV2,
  type EditableFieldDefinitionV2,
  type PackageDiagnostic,
  type TemplateFieldContentEntryV1,
  type TemplateFieldContentStateV1,
  type TemplatePackageV2,
} from "@sleinity/template-core";
import { createTemplatePackageFingerprint } from "./templateImportIntegrity";

export const TEMPLATE_REIMPORT_PLAN_V2_SCHEMA_VERSION =
  "template-reimport-plan-v2" as const;

export interface TemplateReimportFieldChangeV2 {
  fieldId: string;
  status: "retained" | "added" | "removed" | "incompatible";
  previousType?: EditableFieldDefinitionV2["type"];
  nextType?: EditableFieldDefinitionV2["type"];
  previousBindingKind?: EditableFieldDefinitionV2["binding"]["kind"];
  nextBindingKind?: EditableFieldDefinitionV2["binding"]["kind"];
  targetChanged: boolean;
  message: string;
}

export interface TemplateReimportPlanV2 {
  schemaVersion: typeof TEMPLATE_REIMPORT_PLAN_V2_SCHEMA_VERSION;
  previousPackageId: string;
  previousPackageFingerprint: string;
  expectedContentRevision: number;
  nextPackage: TemplatePackageV2 | null;
  diagnostics: PackageDiagnostic[];
  fieldChanges: TemplateReimportFieldChangeV2[];
  retainedFieldIds: string[];
  addedFieldIds: string[];
  removedFieldIds: string[];
  incompatibleFieldIds: string[];
  proposedFieldOrder: string[];
  canApply: boolean;
}

export type TemplateReimportRemovedFieldDispositionV2 = "archive" | "discard";

export interface ApplyTemplateReimportV2Options {
  /** Required whenever the reviewed plan removes canonical field content. */
  removedFieldDisposition?: TemplateReimportRemovedFieldDispositionV2;
  /** Browser-owned assets referenced by retained canonical Image content. */
  sessionAssets?: TemplatePackageV2["assets"];
}

export interface ApplyTemplateReimportV2Result {
  packageValue: TemplatePackageV2;
  contentState: TemplateFieldContentStateV1;
  archivedContent: Readonly<Record<string, TemplateFieldContentEntryV1>>;
}

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function bindingTargetKey(field: EditableFieldDefinitionV2): string {
  return field.binding.kind === "solid-fill-color"
    ? `${field.binding.kind}:${field.binding.nodeId}:${field.binding.sourceIndex}`
    : field.binding.kind === "structural-visibility"
      ? `${field.binding.kind}:${[field.binding.nodeId, ...(field.binding.additionalNodeIds ?? [])].join(",")}`
    : `${field.binding.kind}:${field.binding.nodeId}`;
}

function compatible(
  previous: EditableFieldDefinitionV2,
  next: EditableFieldDefinitionV2,
): boolean {
  return previous.type === next.type && previous.binding.kind === next.binding.kind;
}

export function planTemplateReimportV2(
  previousPackage: TemplatePackageV2,
  contentState: TemplateFieldContentStateV1,
  nextSource: unknown,
): TemplateReimportPlanV2 {
  const parsed = parseTemplatePackageV2(nextSource);
  const nextPackage = parsed.package;
  const fieldChanges: TemplateReimportFieldChangeV2[] = [];
  if (!nextPackage) {
    return {
      schemaVersion: TEMPLATE_REIMPORT_PLAN_V2_SCHEMA_VERSION,
      previousPackageId: previousPackage.packageId,
      previousPackageFingerprint: createTemplatePackageFingerprint(previousPackage),
      expectedContentRevision: contentState.revision,
      nextPackage: null,
      diagnostics: parsed.diagnostics,
      fieldChanges,
      retainedFieldIds: [],
      addedFieldIds: [],
      removedFieldIds: [],
      incompatibleFieldIds: [],
      proposedFieldOrder: [],
      canApply: false,
    };
  }
  const previousById = new Map(previousPackage.editableFields.map((field) => [field.id, field]));
  const nextById = new Map(nextPackage.editableFields.map((field) => [field.id, field]));
  for (const previous of previousPackage.editableFields) {
    const next = nextById.get(previous.id);
    if (!next) {
      fieldChanges.push({
        fieldId: previous.id,
        status: "removed",
        previousType: previous.type,
        previousBindingKind: previous.binding.kind,
        targetChanged: true,
        message: "The logical field is absent from the reimported package and requires reviewed removal.",
      });
      continue;
    }
    if (!compatible(previous, next)) {
      fieldChanges.push({
        fieldId: previous.id,
        status: "incompatible",
        previousType: previous.type,
        nextType: next.type,
        previousBindingKind: previous.binding.kind,
        nextBindingKind: next.binding.kind,
        targetChanged: bindingTargetKey(previous) !== bindingTargetKey(next),
        message: "The stable field ID now has incompatible semantic type or property binding.",
      });
      continue;
    }
    const targetChanged = bindingTargetKey(previous) !== bindingTargetKey(next);
    fieldChanges.push({
      fieldId: previous.id,
      status: "retained",
      previousType: previous.type,
      nextType: next.type,
      previousBindingKind: previous.binding.kind,
      nextBindingKind: next.binding.kind,
      targetChanged,
      message: targetChanged
        ? "The stable field retains its semantics and will use the newly imported explicit target."
        : "The stable field and explicit target are unchanged.",
    });
  }
  for (const next of nextPackage.editableFields) {
    if (previousById.has(next.id)) continue;
    fieldChanges.push({
      fieldId: next.id,
      status: "added",
      nextType: next.type,
      nextBindingKind: next.binding.kind,
      targetChanged: true,
      message: "The imported field is new and will use its imported default without a content override.",
    });
  }
  const order = reconcileEditableFieldOrderV2(
    previousPackage.editableFieldOrder,
    nextPackage.editableFields,
  );
  const retainedFieldIds = fieldChanges.filter((item) => item.status === "retained").map((item) => item.fieldId);
  const addedFieldIds = fieldChanges.filter((item) => item.status === "added").map((item) => item.fieldId);
  const removedFieldIds = fieldChanges.filter((item) => item.status === "removed").map((item) => item.fieldId);
  const incompatibleFieldIds = fieldChanges.filter((item) => item.status === "incompatible").map((item) => item.fieldId);
  return {
    schemaVersion: TEMPLATE_REIMPORT_PLAN_V2_SCHEMA_VERSION,
    previousPackageId: previousPackage.packageId,
    previousPackageFingerprint: createTemplatePackageFingerprint(previousPackage),
    expectedContentRevision: contentState.revision,
    nextPackage,
    diagnostics: [...parsed.diagnostics, ...order.diagnostics],
    fieldChanges,
    retainedFieldIds,
    addedFieldIds,
    removedFieldIds,
    incompatibleFieldIds,
    proposedFieldOrder: order.order,
    canApply: incompatibleFieldIds.length === 0,
  };
}

/**
 * Applies only a reviewed ID-based plan. Configuration remains host-authored;
 * bindings, imported defaults, and source provenance come from the new import.
 */
export function applyTemplateReimportV2(
  previousPackage: TemplatePackageV2,
  contentState: TemplateFieldContentStateV1,
  plan: TemplateReimportPlanV2,
  options: ApplyTemplateReimportV2Options = {},
): ApplyTemplateReimportV2Result {
  if (
    plan.previousPackageId !== previousPackage.packageId ||
    plan.previousPackageFingerprint !== createTemplatePackageFingerprint(previousPackage) ||
    plan.expectedContentRevision !== contentState.revision
  ) {
    throw new Error("The template changed after this reimport plan was created.");
  }
  if (!plan.canApply || !plan.nextPackage) {
    throw new Error("The reimport plan contains unresolved or incompatible field changes.");
  }
  const removedWithContent = plan.removedFieldIds.filter((fieldId) => contentState.values[fieldId]);
  if (removedWithContent.length > 0 && !options.removedFieldDisposition) {
    throw new Error("Review whether removed canonical field content should be archived or discarded before applying reimport.");
  }
  const nextPackage = cloneValue(plan.nextPackage);
  const previousById = new Map(previousPackage.editableFields.map((field) => [field.id, field]));
  nextPackage.editableFields = nextPackage.editableFields.map((imported) => {
    const previous = previousById.get(imported.id);
    if (!previous || !compatible(previous, imported)) return imported;
    return {
      ...imported,
      ...(previous.label !== undefined ? { label: previous.label } : {}),
      ...(previous.controlRole !== undefined ? { controlRole: previous.controlRole } : {}),
      configuration: cloneValue(previous.configuration),
    } as EditableFieldDefinitionV2;
  });
  nextPackage.editableFieldOrder = [...plan.proposedFieldOrder];
  const retained = new Set(plan.retainedFieldIds);
  const archivedContent: Record<string, TemplateFieldContentEntryV1> = {};
  const values: Record<string, TemplateFieldContentEntryV1> = {};
  for (const [fieldId, entry] of Object.entries(contentState.values)) {
    if (retained.has(fieldId)) values[fieldId] = cloneValue(entry);
    else if (plan.removedFieldIds.includes(fieldId) && options.removedFieldDisposition === "archive") {
      archivedContent[fieldId] = cloneValue(entry);
    }
  }
  const nextState: TemplateFieldContentStateV1 = Object.freeze({
    schemaVersion: "template-field-content-v1",
    packageId: nextPackage.packageId,
    packageSchemaVersion: "2.2",
    revision: contentState.revision + 1,
    values: Object.freeze(values),
  });
  const validation = validateTemplateFieldContentForPackageV2({
    ...nextPackage,
    assets: { ...nextPackage.assets, ...cloneValue(options.sessionAssets ?? {}) },
  }, nextState);
  if (!validation.valid) {
    throw new Error(`Reimport produced invalid canonical content: ${validation.fieldIssues[0]?.message ?? validation.diagnostics[0]?.message ?? "unknown error"}`);
  }
  return { packageValue: nextPackage, contentState: nextState, archivedContent };
}
