import { materializeTemplateFieldContentV2 } from "../materializeTemplateFieldContentV2";
import type { MaterializeTemplateFieldContentResultV2 } from "../materializeTemplateFieldContentV2";
import { isCalendarDateValueV1, isColorValueV1 } from "../fieldValuesV2";
import {
  createTemplateFieldContentStateV1,
} from "../templateFieldContentV2";
import type {
  EditableFieldDefinitionV2,
  ImageReplacementPlacementV1,
  TemplateFieldContentEntryV1,
  TemplateFieldContentStateV1,
  TemplateFieldType,
  TemplatePackageV2,
} from "../types";
import { validateTemplatePackageV2 } from "../validateTemplatePackageV2";
import { validateTemplateFieldContentStateV1 } from "../validateTemplateFieldContentStateV1";
import {
  resolveTemplateFamilyConfigurationV2,
  type TemplateFamilyConfigurationOverrideV2,
} from "./configurationV2";
import type { TemplateFamilyControlRefV1, TemplateVariantGroupV1 } from "./types";

export const TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION =
  "template-field-family-v2" as const;
export const TEMPLATE_FIELD_FAMILY_CONTENT_V2_SCHEMA_VERSION =
  "template-field-family-content-v2" as const;
export const TEMPLATE_FIELD_FAMILY_CONTENT_SCHEMA_VERSION =
  "template-field-family-content-v3" as const;

type FamilyFieldFromEditable<Field extends EditableFieldDefinitionV2> =
  Field extends EditableFieldDefinitionV2
    ? Pick<Field, "id" | "type" | "label" | "controlRole" | "configuration">
    : never;

export type TemplateFieldFamilyFieldV2 = FamilyFieldFromEditable<
  EditableFieldDefinitionV2
>;

type VariantOverrideFromEditable<Field extends EditableFieldDefinitionV2> =
  Field extends EditableFieldDefinitionV2
    ? {
        type: Field["type"];
        label?: string | null;
        controlRole?: string | null;
        configuration?: Field extends { type: "image" }
          ? Omit<
              TemplateFamilyConfigurationOverrideV2<Field["configuration"]>,
              "replacementPlacement"
            > & {
              replacementPlacement?: Field["configuration"]["replacementPlacement"];
            }
          : TemplateFamilyConfigurationOverrideV2<Field["configuration"]>;
      }
    : never;

export type TemplateFieldFamilyVariantFieldOverrideV2 =
  VariantOverrideFromEditable<EditableFieldDefinitionV2>;

export interface TemplateFieldFamilyVariantV2 {
  id: string;
  label?: string;
  packageValue: TemplatePackageV2;
  /** Sparse field overrides. Collections replace common collections atomically. */
  fieldOverrides?: Readonly<
    Record<string, TemplateFieldFamilyVariantFieldOverrideV2>
  >;
  /** Atomic variant order override; omission uses the common filtered order. */
  editableFieldOrder?: readonly string[];
  /** Selection metadata only. It never participates in canonical content. */
  groupAssignments?: Readonly<Record<string, string>>;
}

export interface TemplateFieldFamilyV2 {
  schemaVersion: typeof TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION;
  id: string;
  title: string;
  fields: readonly TemplateFieldFamilyFieldV2[];
  editableFieldOrder: readonly string[];
  variants: readonly TemplateFieldFamilyVariantV2[];
  /** Optional navigation properties whose complete tuple resolves one variant. */
  variantGroups?: readonly TemplateVariantGroupV1[];
  /** Presentation order only; editableFieldOrder remains field-only authority. */
  editorControlOrder?: readonly TemplateFamilyControlRefV1[];
}

export interface TemplateFieldFamilyVariantSelectionV2 {
  variantId?: string;
  groupSelections: Readonly<Record<string, string>>;
}

export type TemplateFieldFamilyVariantResolutionV2 =
  | { status: "resolved"; variantId: string }
  | { status: "incomplete"; missingGroupIds: string[] }
  | { status: "no-match"; candidateVariantIds: string[] }
  | { status: "ambiguous"; candidateVariantIds: string[] };

export interface TemplateFieldFamilyOptionAvailabilityV2 {
  groupId: string;
  optionId: string;
  available: boolean;
  candidateVariantIds: string[];
}

export type TemplateFieldFamilySelectionMutationV2 =
  | { type: "add-property"; property: TemplateVariantGroupV1; assignments: Readonly<Record<string, string>> }
  | { type: "rename-property"; groupId: string; title: string }
  | { type: "move-property"; groupId: string; targetIndex: number }
  | { type: "remove-property"; groupId: string }
  | { type: "rename-option"; groupId: string; optionId: string; title: string }
  | { type: "assign-option"; variantId: string; groupId: string; optionId: string }
  | { type: "set-editor-control-order"; order: readonly TemplateFamilyControlRefV1[] };

const selectionGroups = (family: TemplateFieldFamilyV2) => family.variantGroups ?? [];
const assignments = (variant: TemplateFieldFamilyVariantV2) => variant.groupAssignments ?? {};

function candidatesForFieldFamilySelectionV2(
  family: TemplateFieldFamilyV2,
  selections: Readonly<Record<string, string>>,
): string[] {
  const groupIds = new Set(selectionGroups(family).map((group) => group.id));
  return family.variants.filter((variant) => Object.entries(selections).every(
    ([groupId, optionId]) => !groupIds.has(groupId) || assignments(variant)[groupId] === optionId,
  )).map((variant) => variant.id);
}

export function getTemplateFieldFamilyVariantSelectionV2(
  family: TemplateFieldFamilyV2,
  variantId: string,
): TemplateFieldFamilyVariantSelectionV2 {
  const variant = family.variants.find((candidate) => candidate.id === variantId);
  return { variantId, groupSelections: variant ? { ...assignments(variant) } : {} };
}

export function resolveTemplateFieldFamilySelectionV2(
  family: TemplateFieldFamilyV2,
  selection: TemplateFieldFamilyVariantSelectionV2,
): TemplateFieldFamilyVariantResolutionV2 {
  const groups = selectionGroups(family);
  if (!groups.length) {
    const selected = selection.variantId && family.variants.some((variant) => variant.id === selection.variantId);
    return selected ? { status: "resolved", variantId: selection.variantId! }
      : selection.variantId ? { status: "no-match", candidateVariantIds: [] }
      : { status: "incomplete", missingGroupIds: [] };
  }
  const missingGroupIds = groups.map((group) => group.id).filter((id) => !selection.groupSelections[id]);
  if (missingGroupIds.length) return { status: "incomplete", missingGroupIds };
  const candidates = candidatesForFieldFamilySelectionV2(family, selection.groupSelections);
  if (!candidates.length) return { status: "no-match", candidateVariantIds: [] };
  if (candidates.length > 1) return { status: "ambiguous", candidateVariantIds: candidates };
  return { status: "resolved", variantId: candidates[0] };
}

export function getTemplateFieldFamilyOptionAvailabilityV2(
  family: TemplateFieldFamilyV2,
  selection: TemplateFieldFamilyVariantSelectionV2,
): TemplateFieldFamilyOptionAvailabilityV2[] {
  return selectionGroups(family).flatMap((group) => group.options.map((option) => {
    const candidateVariantIds = candidatesForFieldFamilySelectionV2(family, {
      ...selection.groupSelections,
      [group.id]: option.id,
    });
    return { groupId: group.id, optionId: option.id, available: candidateVariantIds.length > 0, candidateVariantIds };
  }));
}

export function getTemplateFieldFamilyEditorControlOrderV2(
  family: TemplateFieldFamilyV2,
): TemplateFamilyControlRefV1[] {
  const expected: TemplateFamilyControlRefV1[] = [
    ...(selectionGroups(family).length
      ? selectionGroups(family).map((group) => ({ kind: "selection-property" as const, groupId: group.id }))
      : family.variants.length > 1 ? [{ kind: "direct-variant-selector" as const }] : []),
    ...family.editableFieldOrder.map((fieldId) => ({ kind: "field" as const, fieldId })),
  ];
  if (!family.editorControlOrder) return expected;
  const key = (control: TemplateFamilyControlRefV1) => control.kind === "direct-variant-selector" ? control.kind
    : control.kind === "selection-property" ? `${control.kind}:${control.groupId}` : `${control.kind}:${control.fieldId}`;
  const expectedKeys = new Set(expected.map(key));
  const seen = new Set<string>();
  const retained = family.editorControlOrder.filter((control) => expectedKeys.has(key(control)) && !seen.has(key(control)) && Boolean(seen.add(key(control))));
  return [...retained, ...expected.filter((control) => !seen.has(key(control)))];
}

/**
 * Resolve host controls without allowing presentation metadata to become the
 * semantic field-order authority. Selection controls retain their configured
 * positions; field slots are always filled from the effective editable order.
 */
export function resolveTemplateFieldFamilyEditorControlsV2(
  family: TemplateFieldFamilyV2,
  editableFieldOrder: readonly string[] = family.editableFieldOrder,
): TemplateFamilyControlRefV1[] {
  const configured = getTemplateFieldFamilyEditorControlOrderV2(family);
  let fieldIndex = 0;
  const resolved = configured.flatMap((control): TemplateFamilyControlRefV1[] => {
    if (control.kind !== "field") return [control];
    const fieldId = editableFieldOrder[fieldIndex++];
    return fieldId ? [{ kind: "field", fieldId }] : [];
  });
  return [
    ...resolved,
    ...editableFieldOrder.slice(fieldIndex).map((fieldId) => ({ kind: "field" as const, fieldId })),
  ];
}

/** Pure configuration mutation. Callers publish its result through their
 * existing candidate-session transaction so invalid edits remain atomic. */
export function applyTemplateFieldFamilySelectionMutationV2(
  family: TemplateFieldFamilyV2,
  mutation: TemplateFieldFamilySelectionMutationV2,
): TemplateFieldFamilyV2 {
  const next = cloneValue(family);
  const groups = [...(next.variantGroups ?? [])];
  if (mutation.type === "add-property") {
    if (!mutation.property.id.trim() || groups.some((group) => group.id === mutation.property.id)) throw new Error("Selection property ID must be unique.");
    next.variantGroups = [...groups, cloneValue(mutation.property)];
    next.variants = next.variants.map((variant) => ({
      ...variant,
      groupAssignments: { ...(variant.groupAssignments ?? {}), [mutation.property.id]: mutation.assignments[variant.id] },
    }));
    const order = getTemplateFieldFamilyEditorControlOrderV2(family).filter((control) => control.kind !== "direct-variant-selector");
    const firstField = order.findIndex((control) => control.kind === "field");
    order.splice(firstField < 0 ? order.length : firstField, 0, { kind: "selection-property", groupId: mutation.property.id });
    next.editorControlOrder = order;
    return next;
  }
  if (mutation.type === "rename-property") {
    if (!groups.some((group) => group.id === mutation.groupId)) throw new Error("Selection property does not exist.");
    next.variantGroups = groups.map((group) => group.id === mutation.groupId ? { ...group, title: mutation.title } : group);
    return next;
  }
  if (mutation.type === "move-property") {
    const index = groups.findIndex((group) => group.id === mutation.groupId);
    if (index < 0) throw new Error("Selection property does not exist.");
    const targetIndex = Math.max(0, Math.min(groups.length - 1, mutation.targetIndex));
    const [property] = groups.splice(index, 1);
    groups.splice(targetIndex, 0, property);
    next.variantGroups = groups;
    let selectionIndex = 0;
    next.editorControlOrder = getTemplateFieldFamilyEditorControlOrderV2(next).map((control) => control.kind === "selection-property" ? { kind: "selection-property", groupId: groups[selectionIndex++].id } : control);
    return next;
  }
  if (mutation.type === "remove-property") {
    if (!groups.some((group) => group.id === mutation.groupId)) throw new Error("Selection property does not exist.");
    next.variantGroups = groups.filter((group) => group.id !== mutation.groupId);
    next.variants = next.variants.map((variant) => {
      const groupAssignments = { ...(variant.groupAssignments ?? {}) };
      delete groupAssignments[mutation.groupId];
      return { ...variant, groupAssignments };
    });
    next.editorControlOrder = (next.editorControlOrder ?? []).filter((control) => control.kind !== "selection-property" || control.groupId !== mutation.groupId);
    if (!next.variantGroups.length && next.variants.length > 1) next.editorControlOrder = [{ kind: "direct-variant-selector" }, ...(next.editorControlOrder ?? [])];
    return next;
  }
  if (mutation.type === "rename-option") {
    if (!groups.some((group) => group.id === mutation.groupId && group.options.some((option) => option.id === mutation.optionId))) throw new Error("Selection option does not exist.");
    next.variantGroups = groups.map((group) => group.id === mutation.groupId ? { ...group, options: group.options.map((option) => option.id === mutation.optionId ? { ...option, title: mutation.title } : option) } : group);
    return next;
  }
  if (mutation.type === "assign-option") {
    const group = groups.find((candidate) => candidate.id === mutation.groupId);
    if (!group?.options.some((option) => option.id === mutation.optionId)) throw new Error("Selection option does not exist.");
    if (!next.variants.some((variant) => variant.id === mutation.variantId)) throw new Error("Family variant does not exist.");
    next.variants = next.variants.map((variant) => variant.id === mutation.variantId ? { ...variant, groupAssignments: { ...(variant.groupAssignments ?? {}), [mutation.groupId]: mutation.optionId } } : variant);
    return next;
  }
  next.editorControlOrder = cloneValue(mutation.order);
  return next;
}

export interface TemplateFieldFamilyContentStateV2 {
  readonly schemaVersion: typeof TEMPLATE_FIELD_FAMILY_CONTENT_V2_SCHEMA_VERSION;
  readonly familyId: string;
  readonly revision: number;
  readonly values: Readonly<Record<string, TemplateFieldContentEntryV1>>;
}

/**
 * Current canonical Family content. Image assets/default placement stay shared;
 * sparse variant entries override placement only and can never replace assets.
 */
export interface TemplateFieldFamilyContentStateV3 {
  readonly schemaVersion: typeof TEMPLATE_FIELD_FAMILY_CONTENT_SCHEMA_VERSION;
  readonly familyId: string;
  readonly revision: number;
  readonly values: Readonly<Record<string, TemplateFieldContentEntryV1>>;
  readonly variantImagePlacements: Readonly<
    Record<string, Readonly<Record<string, ImageReplacementPlacementV1>>>
  >;
}

export interface TemplateFieldFamilyIssueV2 {
  code: string;
  severity: "warning" | "error";
  message: string;
  fieldId?: string;
  variantId?: string;
}

export interface TemplateFieldFamilyConfigurationAuthorityV2 {
  label: "common" | "variant" | "cleared" | "imported";
  controlRole: "common" | "variant" | "cleared" | "imported";
  configuration: Record<string, "common" | "variant" | "cleared">;
}

export interface ResolveTemplateFieldFamilyVariantResultV2 {
  valid: boolean;
  packageValue: TemplatePackageV2 | null;
  issues: TemplateFieldFamilyIssueV2[];
  configurationAuthority: Record<
    string,
    TemplateFieldFamilyConfigurationAuthorityV2
  >;
}

export interface MaterializeTemplateFieldFamilyVariantResultV2 {
  valid: boolean;
  familyId: string;
  variantId: string;
  familyContentRevision: number;
  packageContentState: TemplateFieldContentStateV1 | null;
  effectivePackage: TemplatePackageV2 | null;
  materialization: MaterializeTemplateFieldContentResultV2 | null;
  issues: TemplateFieldFamilyIssueV2[];
  configurationAuthority: Record<
    string,
    TemplateFieldFamilyConfigurationAuthorityV2
  >;
}

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  return Object.freeze(value);
}

function issue(
  code: string,
  message: string,
  details: Pick<TemplateFieldFamilyIssueV2, "fieldId" | "variantId"> = {},
): TemplateFieldFamilyIssueV2 {
  return { code, severity: "error", message, ...details };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isCanonicalFamilyValue(
  type: TemplateFieldType,
  value: unknown,
): boolean {
  if (type === "text" || type === "textarea") return typeof value === "string";
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "date") return isCalendarDateValueV1(value);
  if (type === "color") return isColorValueV1(value);
  if (type === "boolean") return typeof value === "boolean";
  if (!isRecord(value) || typeof value.assetId !== "string" || !isRecord(value.placement)) {
    return false;
  }
  if (value.placement.mode === "fill" || value.placement.mode === "fit") return true;
  if (value.placement.mode !== "crop" || !isRecord(value.placement.crop)) return false;
  const crop = value.placement.crop;
  const transform = crop.transform;
  if (
    crop.schemaVersion !== "normalized-image-crop-v1" ||
    crop.coordinateSpace !== "normalized-slot-to-normalized-source" ||
    !Array.isArray(transform) ||
    transform.length !== 2 ||
    !transform.every((row) =>
      Array.isArray(row) && row.length === 3 &&
      row.every((entry) => typeof entry === "number" && Number.isFinite(entry))
    )
  ) return false;
  return true;
}

function exactPermutation(values: readonly string[], expected: readonly string[]): boolean {
  return values.length === expected.length &&
    new Set(values).size === values.length &&
    values.every((value) => expected.includes(value));
}

export function createTemplateFieldFamilyContentStateV3(
  family: Pick<TemplateFieldFamilyV2, "id">,
): TemplateFieldFamilyContentStateV3 {
  return deepFreeze({
    schemaVersion: TEMPLATE_FIELD_FAMILY_CONTENT_SCHEMA_VERSION,
    familyId: family.id,
    revision: 0,
    values: {},
    variantImagePlacements: {},
  });
}

/** One-time source/persistence-boundary migration; runtime uses V3 only. */
export function migrateTemplateFieldFamilyContentStateV2(
  input: TemplateFieldFamilyContentStateV2,
): TemplateFieldFamilyContentStateV3 {
  if (input.schemaVersion !== TEMPLATE_FIELD_FAMILY_CONTENT_V2_SCHEMA_VERSION) {
    throw new Error("The legacy Template Field Family content contract is unsupported.");
  }
  return deepFreeze({
    schemaVersion: TEMPLATE_FIELD_FAMILY_CONTENT_SCHEMA_VERSION,
    familyId: input.familyId,
    revision: input.revision,
    values: cloneValue(input.values),
    variantImagePlacements: {},
  });
}

function validatePlacementShape(
  input: unknown,
): { structural: boolean; semantic: boolean } {
  if (!isRecord(input) || typeof input.mode !== "string") {
    return { structural: false, semantic: false };
  }
  if (input.mode === "fill" || input.mode === "fit") {
    return {
      structural: Object.keys(input).every((key) => key === "mode"),
      semantic: true,
    };
  }
  if (input.mode !== "crop" || !isRecord(input.crop)) {
    return { structural: false, semantic: false };
  }
  const crop = input.crop;
  const transform = crop.transform;
  const structural =
    Object.keys(input).every((key) => key === "mode" || key === "crop") &&
    Object.keys(crop).every((key) =>
      key === "schemaVersion" || key === "coordinateSpace" || key === "transform"
    ) &&
    crop.schemaVersion === "normalized-image-crop-v1" &&
    crop.coordinateSpace === "normalized-slot-to-normalized-source" &&
    Array.isArray(transform) &&
    transform.length === 2 &&
    transform.every((row) =>
      Array.isArray(row) && row.length === 3 &&
      row.every((entry) => typeof entry === "number" && Number.isFinite(entry))
    );
  if (!structural) return { structural: false, semantic: false };
  const rows = transform as [[number, number, number], [number, number, number]];
  const determinant = rows[0][0] * rows[1][1] - rows[1][0] * rows[0][1];
  return {
    structural: true,
    semantic: Number.isFinite(determinant) && Math.abs(determinant) > 1e-12,
  };
}

/**
 * Validates only the shared canonical envelope and logical value types. A
 * selected variant may still reject the value under its effective rules; that
 * is a materialization/readiness result and never permission to drop content.
 */
export function validateTemplateFieldFamilyContentStateV3(
  family: TemplateFieldFamilyV2,
  input: unknown,
): { valid: boolean; structurallyValid: boolean; issues: TemplateFieldFamilyIssueV2[] } {
  const issues: TemplateFieldFamilyIssueV2[] = [];
  if (!isRecord(input) || input.schemaVersion !== TEMPLATE_FIELD_FAMILY_CONTENT_SCHEMA_VERSION) {
    return {
      valid: false,
      structurallyValid: false,
      issues: [issue("field-family.content-version-invalid", "The shared family content contract is unsupported.")],
    };
  }
  const structural = validateTemplateFieldContentStateV1({
    schemaVersion: "template-field-content-v1",
    packageId: "family-validation",
    packageSchemaVersion: "2.2",
    revision: input.revision,
    values: input.values,
  });
  if (!structural.valid) {
    issues.push(issue(
      "field-family.content-structure-invalid",
      structural.diagnostics[0]?.message ?? "Shared family content is structurally invalid.",
    ));
  }
  if (input.familyId !== family.id) {
    issues.push(issue("field-family.content-family-mismatch", "Shared canonical content belongs to another Template Family."));
  }
  if (isRecord(input.values)) {
    const fields = new Map(family.fields.map((field) => [field.id, field]));
    for (const [fieldId, rawEntry] of Object.entries(input.values)) {
      const field = fields.get(fieldId);
      if (!field) {
        issues.push(issue("field-family.content-field-unknown", `Shared content references unknown field "${fieldId}".`, { fieldId }));
        continue;
      }
      const value = isRecord(rawEntry) ? rawEntry.value : undefined;
      if (!isCanonicalFamilyValue(field.type, value)) {
        issues.push(issue("field-family.content-value-invalid", `Shared content for "${fieldId}" is not a canonical ${field.type} value.`, { fieldId }));
      } else if (field.type === "image" && isRecord(value)) {
        const placementValidation = validatePlacementShape(value.placement);
        if (!placementValidation.semantic) {
          issues.push(issue(
            "field-family.shared-image-crop-noninvertible",
            `Shared Crop for "${fieldId}" must use an invertible transform.`,
            { fieldId },
          ));
        }
      }
    }
  }
  if (!isRecord(input.variantImagePlacements)) {
    issues.push(issue(
      "field-family.variant-image-placements-structure-invalid",
      "Variant Image placements must be a variant-keyed object.",
    ));
  } else {
    const variants = new Map(family.variants.map((variant) => [variant.id, variant]));
    const fields = new Map(family.fields.map((field) => [field.id, field]));
    const sharedValues = isRecord(input.values) ? input.values : {};
    for (const [variantId, rawPlacements] of Object.entries(input.variantImagePlacements)) {
      const variant = variants.get(variantId);
      if (!variant) {
        issues.push(issue(
          "field-family.variant-image-placement-variant-unknown",
          `Variant Image placements reference unknown variant "${variantId}".`,
          { variantId },
        ));
        continue;
      }
      if (!isRecord(rawPlacements)) {
        issues.push(issue(
          "field-family.variant-image-placements-structure-invalid",
          `Variant "${variantId}" Image placements must be a field-keyed object.`,
          { variantId },
        ));
        continue;
      }
      for (const [fieldId, placement] of Object.entries(rawPlacements)) {
        const field = fields.get(fieldId);
        if (!field) {
          issues.push(issue(
            "field-family.variant-image-placement-field-unknown",
            `Variant Image placement references unknown field "${fieldId}".`,
            { fieldId, variantId },
          ));
          continue;
        }
        if (field.type !== "image") {
          issues.push(issue(
            "field-family.variant-image-placement-field-type-invalid",
            `Variant placement field "${fieldId}" is not an Image field.`,
            { fieldId, variantId },
          ));
          continue;
        }
        const variantField = variant.packageValue.editableFields.find(
          (candidate) => candidate.id === fieldId,
        );
        if (!variantField) {
          issues.push(issue(
            "field-family.variant-image-placement-field-unavailable",
            `Variant "${variantId}" does not contain Image field "${fieldId}".`,
            { fieldId, variantId },
          ));
          continue;
        }
        const sharedEntry = sharedValues[fieldId];
        const sharedValue = isRecord(sharedEntry) ? sharedEntry.value : undefined;
        if (!isRecord(sharedValue) || typeof sharedValue.assetId !== "string") {
          issues.push(issue(
            "field-family.variant-image-placement-shared-asset-missing",
            `Variant placement for "${fieldId}" requires one shared replacement image asset.`,
            { fieldId, variantId },
          ));
        }
        const placementValidation = validatePlacementShape(placement);
        if (!placementValidation.structural) {
          issues.push(issue(
            "field-family.variant-image-placement-structure-invalid",
            `Variant placement for "${fieldId}" is not a canonical Fill, Fit, or Crop value.`,
            { fieldId, variantId },
          ));
        } else if (!placementValidation.semantic) {
          issues.push(issue(
            "field-family.variant-image-crop-noninvertible",
            `Variant Crop for "${fieldId}" must use an invertible transform.`,
            { fieldId, variantId },
          ));
        }
      }
    }
  }
  const structuralCodes = new Set([
    "field-family.content-version-invalid",
    "field-family.content-structure-invalid",
    "field-family.content-family-mismatch",
    "field-family.content-field-unknown",
    "field-family.content-value-invalid",
    "field-family.variant-image-placements-structure-invalid",
    "field-family.variant-image-placement-variant-unknown",
    "field-family.variant-image-placement-field-unknown",
    "field-family.variant-image-placement-field-type-invalid",
    "field-family.variant-image-placement-field-unavailable",
    "field-family.variant-image-placement-shared-asset-missing",
    "field-family.variant-image-placement-structure-invalid",
  ]);
  return {
    valid: !issues.some((item) => item.severity === "error"),
    structurallyValid: !issues.some((item) => structuralCodes.has(item.code)),
    issues,
  };
}

/**
 * Resolves common semantic configuration onto one ordinary V2 package.
 * Bindings and imported defaults always come from that variant package.
 */
export function resolveTemplateFieldFamilyVariantV2(
  family: TemplateFieldFamilyV2,
  variantId: string,
): ResolveTemplateFieldFamilyVariantResultV2 {
  const issues: TemplateFieldFamilyIssueV2[] = [];
  if (family.schemaVersion !== TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION) {
    issues.push(issue("field-family.version-unsupported", "The Template Family schema version is unsupported."));
  }
  const groups = selectionGroups(family);
  const duplicate = (values: readonly string[]) => values.find((value, index) => !value || values.indexOf(value) !== index);
  if (duplicate(groups.map((group) => group.id))) {
    issues.push(issue("field-family.selection-group-id-invalid", "Selection property IDs must be non-empty and unique."));
  }
  if (groups.some((group) => !group.title.trim())) {
    issues.push(issue("field-family.selection-group-title-missing", "Every selection property needs a label."));
  }
  for (const group of groups) {
    if (duplicate(group.options.map((option) => option.id)) || group.options.some((option) => !option.title.trim())) {
      issues.push(issue("field-family.selection-option-invalid", `Selection property "${group.title || group.id}" has missing or duplicate option data.`));
    }
  }
  const tupleOwners = new Map<string, string>();
  for (const candidate of family.variants) {
    const candidateAssignments = assignments(candidate);
    for (const groupId of Object.keys(candidateAssignments)) {
      if (!groups.some((group) => group.id === groupId)) {
        issues.push(issue("field-family.selection-assignment-group-unknown", `Variant "${candidate.id}" assigns an unknown selection property.`, { variantId: candidate.id }));
      }
    }
    const tuple = groups.map((group) => candidateAssignments[group.id]);
    if (tuple.some((optionId) => !optionId)) {
      if (groups.length) issues.push(issue("field-family.selection-assignment-incomplete", `Variant "${candidate.id}" needs one value for every selection property.`, { variantId: candidate.id }));
      continue;
    }
    const invalid = groups.some((group, index) => !group.options.some((option) => option.id === tuple[index]));
    if (invalid) {
      issues.push(issue("field-family.selection-option-unknown", `Variant "${candidate.id}" assigns an unknown selection value.`, { variantId: candidate.id }));
      continue;
    }
    if (groups.length) {
      const tupleKey = tuple.join("|");
      const previous = tupleOwners.get(tupleKey);
      if (previous) issues.push(issue("field-family.selection-tuple-duplicate", `Variants "${previous}" and "${candidate.id}" use the same selection values.`, { variantId: candidate.id }));
      else tupleOwners.set(tupleKey, candidate.id);
    }
  }
  if (family.editorControlOrder) {
    const expected = getTemplateFieldFamilyEditorControlOrderV2({ ...family, editorControlOrder: undefined });
    const actual = family.editorControlOrder;
    const key = (control: TemplateFamilyControlRefV1) => control.kind === "direct-variant-selector" ? control.kind
      : control.kind === "selection-property" ? `${control.kind}:${control.groupId}` : `${control.kind}:${control.fieldId}`;
    const expectedKeys = expected.map(key).sort();
    const actualKeys = actual.map(key).sort();
    if (expectedKeys.length !== actualKeys.length || expectedKeys.some((value, index) => value !== actualKeys[index])) {
      issues.push(issue("field-family.editor-control-order-invalid", "Family editor control order must contain every active selector and field exactly once."));
    }
  }
  const variant = family.variants.find((candidate) => candidate.id === variantId);
  if (!variant) {
    issues.push(issue("field-family.variant-missing", `Variant "${variantId}" does not exist.`, { variantId }));
    return { valid: false, packageValue: null, issues, configurationAuthority: {} };
  }
  const packageValidation = validateTemplatePackageV2(variant.packageValue);
  if (!packageValidation.valid) {
    issues.push(issue("field-family.variant-package-invalid", `Variant "${variantId}" does not contain a valid TemplatePackageV2.`, { variantId }));
  }
  const commonById = new Map(family.fields.map((field) => [field.id, field]));
  if (commonById.size !== family.fields.length) {
    issues.push(issue("field-family.field-id-duplicate", "Logical family field IDs must be unique."));
  }
  const commonFieldIds = family.fields.map((field) => field.id);
  if (!exactPermutation(family.editableFieldOrder, commonFieldIds)) {
    issues.push(issue(
      "field-family.common-field-order-invalid",
      "The common family field order must be an exact permutation of its logical field IDs.",
    ));
  }
  const packageValue = cloneValue(variant.packageValue);
  const authority: ResolveTemplateFieldFamilyVariantResultV2["configurationAuthority"] = {};
  for (const field of packageValue.editableFields) {
    const common = commonById.get(field.id);
    if (!common) {
      issues.push(issue("field-family.field-common-missing", `Variant field "${field.id}" has no common family configuration.`, { fieldId: field.id, variantId }));
      continue;
    }
    if (common.type !== field.type) {
      issues.push(issue("field-family.field-type-incompatible", `Field "${field.id}" is ${field.type} in variant "${variantId}" but ${common.type} in the family.`, { fieldId: field.id, variantId }));
      continue;
    }
    const override = variant.fieldOverrides?.[field.id];
    if (override && override.type !== field.type) {
      issues.push(issue("field-family.override-type-incompatible", `Field override "${field.id}" targets the wrong semantic type.`, { fieldId: field.id, variantId }));
      continue;
    }
    const resolved = resolveTemplateFamilyConfigurationV2(
      cloneValue(common.configuration),
      override?.configuration as TemplateFamilyConfigurationOverrideV2<
        typeof common.configuration
      > | undefined,
    );
    field.configuration = resolved.configuration as typeof field.configuration;
    const commonLabel = common.label?.trim();
    const commonRole = common.controlRole?.trim();
    const overrideLabel = override?.label;
    const overrideRole = override?.controlRole;
    if (overrideLabel === null) delete field.label;
    else if (typeof overrideLabel === "string") field.label = overrideLabel;
    else if (commonLabel) field.label = commonLabel;
    if (overrideRole === null) delete field.controlRole;
    else if (typeof overrideRole === "string") field.controlRole = overrideRole;
    else if (commonRole) field.controlRole = commonRole;
    authority[field.id] = {
      label: overrideLabel === null
        ? "cleared"
        : typeof overrideLabel === "string"
          ? "variant"
          : commonLabel
            ? "common"
            : "imported",
      controlRole: overrideRole === null
        ? "cleared"
        : typeof overrideRole === "string"
          ? "variant"
          : commonRole
            ? "common"
            : "imported",
      configuration: Object.fromEntries(
        Object.entries(resolved.authority).map(([property, source]) => [
          property,
          source === "family" ? "common" : source,
        ]),
      ) as Record<string, "common" | "variant" | "cleared">,
    };
  }
  for (const fieldId of Object.keys(variant.fieldOverrides ?? {})) {
    if (!packageValue.editableFields.some((field) => field.id === fieldId)) {
      issues.push(issue("field-family.override-field-missing", `Variant override references missing field "${fieldId}".`, { fieldId, variantId }));
    }
  }
  const packageIds = packageValue.editableFields.map((field) => field.id);
  const inheritedOrder = family.editableFieldOrder.filter((fieldId) => packageIds.includes(fieldId));
  const order = variant.editableFieldOrder
    ? [...variant.editableFieldOrder]
    : inheritedOrder;
  if (!exactPermutation(order, packageIds)) {
    issues.push(issue("field-family.field-order-invalid", `Variant "${variantId}" field order must be an exact permutation of its fields.`, { variantId }));
  } else {
    packageValue.editableFieldOrder = order;
  }
  const effectiveValidation = validateTemplatePackageV2(packageValue);
  if (!effectiveValidation.valid) {
    issues.push(issue(
      "field-family.effective-package-invalid",
      effectiveValidation.diagnostics[0]?.message ??
        `Variant "${variantId}" has invalid effective field configuration.`,
      { variantId },
    ));
  }
  const hasErrors = issues.some((item) => item.severity === "error");
  return {
    valid: !hasErrors,
    packageValue: hasErrors ? null : packageValue,
    issues,
    configurationAuthority: authority,
  };
}

export function materializeTemplateFieldFamilyVariantV2(
  family: TemplateFieldFamilyV2,
  variantId: string,
  content: TemplateFieldFamilyContentStateV3,
): MaterializeTemplateFieldFamilyVariantResultV2 {
  const resolved = resolveTemplateFieldFamilyVariantV2(family, variantId);
  const familyContentValidation = validateTemplateFieldFamilyContentStateV3(family, content);
  const issues = [...resolved.issues, ...familyContentValidation.issues];
  if (!resolved.packageValue) {
    return {
      valid: false,
      familyId: family.id,
      variantId,
      familyContentRevision: content.revision,
      packageContentState: null,
      effectivePackage: resolved.packageValue,
      materialization: null,
      issues,
      configurationAuthority: resolved.configurationAuthority,
    };
  }
  const packageFieldIds = new Set(resolved.packageValue.editableFields.map((field) => field.id));
  const selectedPlacements = content.variantImagePlacements[variantId] ?? {};
  const packageContentState = deepFreeze({
    ...createTemplateFieldContentStateV1(resolved.packageValue),
    revision: content.revision,
    values: Object.fromEntries(
      Object.entries(content.values)
        .filter(([fieldId]) => packageFieldIds.has(fieldId))
        .map(([fieldId, entry]) => {
          const placement = selectedPlacements[fieldId];
          if (!placement || !isRecord(entry.value) || typeof entry.value.assetId !== "string") {
            return [fieldId, cloneValue(entry)];
          }
          return [fieldId, {
            ...cloneValue(entry),
            value: {
              assetId: entry.value.assetId,
              placement: cloneValue(placement),
            },
          }];
        }),
    ),
  });
  const materialization = materializeTemplateFieldContentV2(
    resolved.packageValue,
    packageContentState,
  );
  return {
    valid: familyContentValidation.valid && materialization.valid,
    familyId: family.id,
    variantId,
    familyContentRevision: content.revision,
    packageContentState,
    effectivePackage: resolved.packageValue,
    materialization,
    issues,
    configurationAuthority: resolved.configurationAuthority,
  };
}

export function templateFieldFamilyFieldTypeV2(
  family: TemplateFieldFamilyV2,
  fieldId: string,
): TemplateFieldType | null {
  return family.fields.find((field) => field.id === fieldId)?.type ?? null;
}
