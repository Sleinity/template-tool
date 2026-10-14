import type { PackageDiagnostic } from "./packageDiagnostics";
import {
  formatTemplateCalendarDateV1,
  formatTemplateNumberV1,
  validateTemplateFieldValueV2,
} from "./fieldSemanticKernelV2";
import type { FieldValidationIssueV2 } from "./fieldValidationV2";
import { sourceSolidColorHex } from "./sourceColorField";
import {
  resolveTemplateFieldContentV2,
  validateTemplateFieldContentForPackageV2,
} from "./templateFieldContentV2";
import type {
  EditableFieldDefinitionV2,
  FontStyleRange,
  TemplateFieldCanonicalValueV1,
  TemplateFieldContentStateV1,
  TemplateFieldType,
  TemplatePackageV2,
  TextTemplateNode,
} from "./types";

export interface MaterializedTemplateFieldProvenanceV2 {
  fieldId: string;
  fieldType: TemplateFieldType;
  valueSource: "content-override" | "imported-default";
  canonicalValue: TemplateFieldCanonicalValueV1 | EditableFieldDefinitionV2["defaultValue"];
  contentRevision: number;
  selectedChoiceId?: string;
  appliedBinding: {
    kind: EditableFieldDefinitionV2["binding"]["kind"];
    nodeId: string;
    sourceIndex?: number;
  };
}

export interface PendingTemplateFieldRenderValidationV2 {
  fieldId: string;
  contentRevision: number;
  rule: "max-lines" | "warning-at-lines";
  blocksExport: boolean;
}

export interface MaterializeTemplateFieldContentResultV2 {
  valid: boolean;
  exportReady: boolean;
  workingPackage: TemplatePackageV2 | null;
  contentRevision: number;
  materializationRevision: string | null;
  fields: MaterializedTemplateFieldProvenanceV2[];
  fieldIssues: FieldValidationIssueV2[];
  diagnostics: PackageDiagnostic[];
  pendingRenderValidation: PendingTemplateFieldRenderValidationV2[];
}

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)]),
  );
}

function stableHash(value: unknown): string {
  const input = JSON.stringify(stableValue(value));
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sameTextStyle(
  left: FontStyleRange,
  right: FontStyleRange,
): boolean {
  return left.family === right.family &&
    left.style === right.style &&
    left.cssStyle === right.cssStyle &&
    left.weight === right.weight &&
    left.postScriptName === right.postScriptName;
}

function reconcileTextStyleRanges(node: TextTemplateNode, nextCharacters: string): void {
  if (!("characters" in node.text) || !node.text.styleRanges?.length) return;
  const previousCharacters = node.text.characters;
  if (previousCharacters === nextCharacters) return;

  let prefix = 0;
  while (
    prefix < previousCharacters.length &&
    prefix < nextCharacters.length &&
    previousCharacters[prefix] === nextCharacters[prefix]
  ) prefix += 1;

  let suffix = 0;
  while (
    suffix < previousCharacters.length - prefix &&
    suffix < nextCharacters.length - prefix &&
    previousCharacters[previousCharacters.length - 1 - suffix] ===
      nextCharacters[nextCharacters.length - 1 - suffix]
  ) suffix += 1;

  const previousEditEnd = previousCharacters.length - suffix;
  const nextEditEnd = nextCharacters.length - suffix;
  const delta = nextCharacters.length - previousCharacters.length;
  const sourceRanges = [...node.text.styleRanges].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  const inherited = (
    prefix > 0
      ? sourceRanges.find((range) => range.start <= prefix - 1 && range.end > prefix - 1)
      : sourceRanges.find((range) => range.start <= previousEditEnd && range.end > previousEditEnd)
  ) ?? sourceRanges[0];
  const nextRanges: typeof sourceRanges = [];
  const append = (range: typeof sourceRanges[number], start: number, end: number) => {
    if (end <= start) return;
    const previous = nextRanges[nextRanges.length - 1];
    if (previous && previous.end === start && sameTextStyle(previous, range)) {
      previous.end = end;
      return;
    }
    nextRanges.push({ ...range, start, end });
  };

  for (const range of sourceRanges) {
    append(range, range.start, Math.min(range.end, prefix));
  }
  if (inherited) append(inherited, prefix, nextEditEnd);
  for (const range of sourceRanges) {
    const retainedStart = Math.max(range.start, previousEditEnd);
    append(range, retainedStart + delta, range.end + delta);
  }
  node.text.styleRanges = nextRanges;
}

function setTextCharacters(node: TextTemplateNode, value: string): void {
  if ("characters" in node.text) {
    reconcileTextStyleRanges(node, value);
    node.text.characters = value;
  }
  else node.text.content = value;
}

function colorChannels(value: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(value.slice(1, 3), 16) / 255,
    g: Number.parseInt(value.slice(3, 5), 16) / 255,
    b: Number.parseInt(value.slice(5, 7), 16) / 255,
  };
}

function materializationIssue(
  field: EditableFieldDefinitionV2,
  code: string,
  message: string,
): FieldValidationIssueV2 {
  return {
    code,
    fieldId: field.id,
    severity: "error",
    message,
    blocksExport: true,
  };
}

function applyField(
  workingPackage: TemplatePackageV2,
  field: EditableFieldDefinitionV2,
  resolvedValue: ReturnType<typeof resolveTemplateFieldContentV2>,
  fieldIssues: FieldValidationIssueV2[],
): void {
  const node = workingPackage.nodes[field.binding.nodeId];
  if (!node) {
    fieldIssues.push(materializationIssue(field, "field-v2.materialization-node-missing", "The exact imported field binding no longer has a target node."));
    return;
  }

  if (field.type === "text" || field.type === "textarea") {
    if (node.type !== "TEXT" || typeof resolvedValue.value !== "string") {
      fieldIssues.push(materializationIssue(field, "field-v2.materialization-text-binding-invalid", "Text materialization requires its exact TEXT characters binding."));
      return;
    }
    setTextCharacters(node, resolvedValue.value);
    return;
  }
  if (field.type === "number") {
    if (node.type !== "TEXT" || typeof resolvedValue.value !== "number") {
      fieldIssues.push(materializationIssue(field, "field-v2.materialization-number-binding-invalid", "Number materialization requires its exact TEXT characters binding."));
      return;
    }
    setTextCharacters(node, formatTemplateNumberV1(resolvedValue.value, field.configuration.format));
    return;
  }
  if (field.type === "date") {
    if (node.type !== "TEXT" || typeof resolvedValue.value !== "string") {
      fieldIssues.push(materializationIssue(field, "field-v2.materialization-date-binding-invalid", "Date materialization requires its exact TEXT characters binding."));
      return;
    }
    setTextCharacters(node, formatTemplateCalendarDateV1(resolvedValue.value, field.configuration.format));
    return;
  }
  if (field.type === "color") {
    if (typeof resolvedValue.value !== "string") {
      fieldIssues.push(materializationIssue(field, "field-v2.materialization-color-invalid", "Color materialization requires canonical opaque RGB."));
      return;
    }
    const paint = node.appearance.fills[field.binding.sourceIndex];
    if (paint?.type !== "SOLID") {
      fieldIssues.push(materializationIssue(field, "field-v2.materialization-color-binding-invalid", "The exact imported Color binding is no longer a SOLID fill."));
      return;
    }
    // An imported default is a control representation of this paint, not an
    // instruction to quantize its source RGB. A host-configured different
    // default remains an intentional materialization override.
    if (resolvedValue.valueSource === "imported-default" &&
      resolvedValue.value === sourceSolidColorHex(paint)) return;
    const channels = colorChannels(resolvedValue.value);
    paint.color = { ...paint.color, ...channels };
    return;
  }
  if (field.type === "boolean") {
    if (typeof resolvedValue.value !== "boolean") {
      fieldIssues.push(materializationIssue(field, "field-v2.materialization-boolean-invalid", "Boolean materialization requires a canonical boolean."));
      return;
    }
    for (const nodeId of [field.binding.nodeId, ...(field.binding.additionalNodeIds ?? [])]) {
      const target = workingPackage.nodes[nodeId];
      if (!target) {
        fieldIssues.push(materializationIssue(field, "field-v2.materialization-boolean-binding-invalid", `Boolean visibility target "${nodeId}" is unavailable.`));
        continue;
      }
      target.appearance.visible = resolvedValue.value;
    }
    return;
  }
  if (resolvedValue.valueSource === "imported-default") {
    // The cloned base node already contains the full imported asset, placement,
    // transform, and appearance authority. Reset/default never reconstruct it.
    return;
  }
  if (!node.image || typeof resolvedValue.value !== "object" ||
      !("assetId" in resolvedValue.value) || !("placement" in resolvedValue.value) ||
      typeof resolvedValue.value.assetId !== "string" ||
      resolvedValue.value.placement.mode === "imported") {
    fieldIssues.push(materializationIssue(field, "field-v2.materialization-image-binding-invalid", "Image materialization requires its exact imported image-content binding."));
    return;
  }
  const replacement = resolvedValue.value;
  const assetId = replacement.assetId as string;
  node.image.assetId = assetId;
  node.image.deferred = workingPackage.assets[assetId]?.deferred ?? false;
  node.image.activePlacement = {
    state: replacement.placement.mode === "fill"
      ? "replacement-fill"
      : replacement.placement.mode === "fit"
        ? "replacement-fit"
        : "editor-crop",
    revision: resolvedValue.contentRevision,
  };
  node.image.scaleMode = replacement.placement.mode.toUpperCase();
  if (replacement.placement.mode === "crop") {
    node.image.imageTransform = cloneValue(replacement.placement.crop.transform);
  }
}

/**
 * Pure one-way materializer. Canonical values are resolved only from field
 * definitions and content state; renderer-facing properties are write-only.
 */
export function materializeTemplateFieldContentV2(
  packageValue: TemplatePackageV2,
  contentState: TemplateFieldContentStateV1,
): MaterializeTemplateFieldContentResultV2 {
  const compatibility = validateTemplateFieldContentForPackageV2(packageValue, contentState);
  if (!compatibility.valid) {
    return {
      valid: false,
      exportReady: false,
      workingPackage: null,
      contentRevision: contentState.revision,
      materializationRevision: null,
      fields: [],
      fieldIssues: compatibility.fieldIssues,
      diagnostics: compatibility.diagnostics,
      pendingRenderValidation: [],
    };
  }

  const workingPackage = cloneValue(packageValue);
  const fieldsById = new Map(workingPackage.editableFields.map((field) => [field.id, field]));
  const fieldIssues: FieldValidationIssueV2[] = [];
  const fields: MaterializedTemplateFieldProvenanceV2[] = [];
  const pendingRenderValidation: PendingTemplateFieldRenderValidationV2[] = [];

  for (const fieldId of workingPackage.editableFieldOrder) {
    const field = fieldsById.get(fieldId);
    if (!field) continue;
    const resolved = resolveTemplateFieldContentV2(field, contentState);
    if (field.type !== "image" || resolved.valueSource === "content-override") {
      const validation = validateTemplateFieldValueV2(field, resolved.value, {
        packageValue,
        canonicalInputOnly: true,
        selectedChoiceId: resolved.selectedChoiceId,
      });
      fieldIssues.push(...validation.issues);
    }
    applyField(workingPackage, field, resolved, fieldIssues);
    fields.push({
      fieldId: field.id,
      fieldType: field.type,
      valueSource: resolved.valueSource,
      canonicalValue: cloneValue(resolved.value),
      contentRevision: contentState.revision,
      ...(resolved.selectedChoiceId !== undefined
        ? { selectedChoiceId: resolved.selectedChoiceId }
        : {}),
      appliedBinding: {
        kind: field.binding.kind,
        nodeId: field.binding.nodeId,
        ...(field.binding.kind === "solid-fill-color"
          ? { sourceIndex: field.binding.sourceIndex }
          : {}),
      },
    });
    if (field.type === "textarea" && field.configuration.maxLines !== undefined) {
      pendingRenderValidation.push({
        fieldId: field.id,
        contentRevision: contentState.revision,
        rule: "max-lines",
        blocksExport: true,
      });
    } else if (field.type === "textarea" && field.configuration.warningAtLines !== undefined) {
      pendingRenderValidation.push({
        fieldId: field.id,
        contentRevision: contentState.revision,
        rule: "warning-at-lines",
        blocksExport: false,
      });
    }
  }

  const hasErrors = fieldIssues.some((item) => item.severity === "error");
  const materializationRevision = hasErrors
    ? null
    : `field-materialization-v1:${stableHash({
        basePackage: packageValue,
        contentState,
      })}`;
  return {
    valid: !hasErrors,
    exportReady: !hasErrors &&
      !pendingRenderValidation.some((item) => item.blocksExport),
    workingPackage: hasErrors ? null : workingPackage,
    contentRevision: contentState.revision,
    materializationRevision,
    fields,
    fieldIssues,
    diagnostics: compatibility.diagnostics,
    pendingRenderValidation,
  };
}
