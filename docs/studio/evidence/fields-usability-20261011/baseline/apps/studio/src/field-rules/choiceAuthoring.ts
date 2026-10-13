import {
  canonicalTemplateFieldValueKeyV1, TEMPLATE_FIELD_PORTABLE_ID_PATTERN,
  validateTemplateFieldValueV2, validateEditableFieldDefinitionSemanticsV2,
  formatTemplateNumberV1, formatTemplateCalendarDateV1,
  type EditableFieldDefinitionV2, type TemplateFieldConfigurationV2, type StaticChoiceSet,
} from "@sleinity/template-core";
import { resolveTemplateFamilyConfigurationV2, type TemplateFieldFamilyV2 } from "@sleinity/template-core/family";

export type ChoiceValue = string | number;
export type ChoiceMode = "none" | "suggested" | "restricted";
export type ChoiceRow = { key: string; id: string; label?: string; input: string };
export type ChoiceDraft = { mode: ChoiceMode; rows: ChoiceRow[] };
export type ChoiceAuthoringSource = {
  design: string; definition: EditableFieldDefinitionV2;
  configurationOverride?: Record<string, unknown>;
};

/** Defaults and override context are authoring inputs, never persisted configuration. */
export function choiceAuthoringSources(
  id: string, packageFields: readonly EditableFieldDefinitionV2[], family?: TemplateFieldFamilyV2 | null,
  variantId?: string,
): ChoiceAuthoringSource[] {
  if (!family || variantId) {
    const definition = packageFields.find(field => field.id === id);
    return definition ? [{ design: family?.variants.find(variant => variant.id === variantId)?.label ?? "This design", definition }] : [];
  }
  return family.variants.flatMap(variant => {
    const definition = variant.packageValue.editableFields.find(field => field.id === id);
    return definition ? [{ design: variant.label ?? variant.id, definition,
      configurationOverride: variant.fieldOverrides?.[id]?.configuration as Record<string, unknown> | undefined }] : [];
  });
}

export function choiceDraftFromConfiguration(field: TemplateFieldConfigurationV2): ChoiceDraft {
  const choices = (field.configuration as { choices?: StaticChoiceSet<ChoiceValue> }).choices;
  return { mode: choices?.mode ?? "none", rows: choices?.options.map((option, index) => ({
    key: `existing-${index}`, id: option.id, ...(option.label !== undefined ? { label: option.label } : {}), input: String(option.value),
  })) ?? [] };
}

export function nextChoiceRow(rows: readonly ChoiceRow[], usedIds: ReadonlySet<string>): ChoiceRow {
  let index = 1;
  while (usedIds.has(`option-${index}`) || rows.some(row => row.id === `option-${index}`)) index++;
  const id = `option-${index}`;
  return { key: id, id, input: "" };
}

function effectiveField(field: TemplateFieldConfigurationV2, source: ChoiceAuthoringSource): EditableFieldDefinitionV2 {
  return { ...source.definition,
    configuration: resolveTemplateFamilyConfigurationV2(field.configuration, source.configurationOverride).configuration,
  } as EditableFieldDefinitionV2;
}
function inheritsChoices(source: ChoiceAuthoringSource) {
  return source.configurationOverride?.choices === undefined;
}

export function seedChoiceDefaults(draft: ChoiceDraft, field: TemplateFieldConfigurationV2,
  sources: readonly ChoiceAuthoringSource[], usedIds: ReadonlySet<string>): ChoiceDraft {
  if (draft.mode === "none") return draft;
  const rows = [...draft.rows], values = new Set<string>();
  const source = sources[0];
  if (source) for (const row of rows) {
    const input = field.type === "number" ? (row.input.trim() ? Number(row.input) : NaN) : row.input;
    const result = validateTemplateFieldValueV2({ ...source.definition, configuration: field.configuration } as EditableFieldDefinitionV2,
      input, { enforceChoices: false, includeWarnings: false });
    if (typeof result.canonicalValue === "string" || typeof result.canonicalValue === "number")
      values.add(canonicalTemplateFieldValueKeyV1(result.canonicalValue));
  }
  for (const source of sources.filter(inheritsChoices)) {
    const value = source.definition.defaultValue;
    if (typeof value !== "string" && typeof value !== "number") continue;
    const key = canonicalTemplateFieldValueKeyV1(value);
    if (values.has(key)) continue;
    const row = nextChoiceRow(rows, usedIds);
    rows.push({ ...row, input: String(value) }); values.add(key);
  }
  return { ...draft, rows };
}

/** Typed draft parsing delegates canonical semantics to Core. Invalid drafts never escape. */
export function validateChoiceDraft(draft: ChoiceDraft, field: TemplateFieldConfigurationV2,
  sources: readonly ChoiceAuthoringSource[]) {
  const rowErrors: Record<string, string> = {}, identityErrors: Record<string, string> = {}, valueErrors: Record<string, string> = {}, errors: string[] = [];
  if (draft.mode === "none") return { rowErrors, identityErrors, valueErrors, errors, choices: undefined };
  if (!sources.length) errors.push("The imported field default is unavailable. Reopen this field before configuring choices.");
  if (!draft.rows.length) errors.push("Add at least one choice or select No choices.");
  const ids = new Set<string>(), values = new Set<string>();
  const options = draft.rows.map(row => {
    const messages: string[] = [];
    if (!TEMPLATE_FIELD_PORTABLE_ID_PATTERN.test(row.id)) messages.push("Use an ID starting with a letter, followed by letters, digits, - or _.");
    if (ids.has(row.id)) messages.push("Each option needs a unique ID.");
    if (messages.length) identityErrors[row.key] = messages.join(" ");
    const identityMessageCount = messages.length;
    ids.add(row.id);
    const input = field.type === "number" ? (row.input.trim() ? Number(row.input) : NaN) : row.input;
    let value: ChoiceValue = input;
    // A blank text value is a valid SDK value; blank number/date/color values are not.
    for (const source of sources.filter(inheritsChoices)) {
      const result = validateTemplateFieldValueV2(effectiveField(field, source), input, { enforceChoices: false, includeWarnings: false });
      if (!result.valid) messages.push(`${source.design}: ${result.issues.filter(issue => issue.severity === "error").map(issue => issue.message).join(" ")}`);
      if (typeof result.canonicalValue === "string" || typeof result.canonicalValue === "number") value = result.canonicalValue;
    }
    // An override editor has a source; a common field whose choices are overridden everywhere still needs type validation.
    if (sources.length && !sources.some(inheritsChoices)) {
      const result = validateTemplateFieldValueV2({ ...sources[0].definition, configuration: field.configuration } as EditableFieldDefinitionV2, input, { enforceChoices: false, includeWarnings: false });
      if (!result.valid) messages.push(result.issues.filter(issue => issue.severity === "error").map(issue => issue.message).join(" "));
      if (typeof result.canonicalValue === "string" || typeof result.canonicalValue === "number") value = result.canonicalValue;
    }
    const key = canonicalTemplateFieldValueKeyV1(value);
    if (values.has(key)) messages.push("This value duplicates another choice.");
    values.add(key);
    if (messages.length > identityMessageCount) valueErrors[row.key] = messages.slice(identityMessageCount).join(" ");
    if (messages.length) rowErrors[row.key] = messages.join(" ");
    return { id: row.id, ...(row.label !== undefined ? { label: row.label } : {}), value };
  });
  const choices = { mode: draft.mode, options } as StaticChoiceSet<ChoiceValue>;
  if (!Object.keys(rowErrors).length && options.length) {
    for (const source of sources) {
      const definition = effectiveField({ ...field, configuration: { ...field.configuration, choices } } as TemplateFieldConfigurationV2, source);
      const issues = validateEditableFieldDefinitionSemanticsV2(definition);
      errors.push(...issues.filter(issue => issue.severity === "error").map(issue => `${source.design}: ${issue.message}`));
    }
  }
  return { rowErrors, identityErrors, valueErrors, errors, choices: Object.keys(rowErrors).length || errors.length ? undefined : choices };
}

export function choiceValueLabel(field: TemplateFieldConfigurationV2, value: ChoiceValue): string {
  if (field.type === "number") return formatTemplateNumberV1(value as number, field.configuration.format);
  if (field.type === "date") return formatTemplateCalendarDateV1(value as string, field.configuration.format);
  return value === "" ? "Empty text" : String(value);
}
