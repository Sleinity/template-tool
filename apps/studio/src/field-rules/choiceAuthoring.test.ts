import { choiceAuthoringSources, choiceDraftFromConfiguration, nextChoiceRow, seedChoiceDefaults, validateChoiceDraft, type ChoiceAuthoringSource } from "./choiceAuthoring";
import type { EditableFieldDefinitionV2, TemplateFieldConfigurationV2 } from "@sleinity/template-core";
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const source = (type: string, value: string | number, configuration = {}): ChoiceAuthoringSource => ({ design: "Source", definition: { id: `${type}:value`, type, defaultValue: value, configuration, binding: { nodeId: "node" } } as EditableFieldDefinitionV2 });
for (const [type, value, second] of [["text", "Imported", "New"], ["textarea", "First\nsecond", "New\nlines"], ["number", 12, 24], ["date", "2026-04-16", "2026-05-20"], ["color", "#e5b2ff", "#000000"]] as const) {
  const context = source(type, value), field = context.definition as TemplateFieldConfigurationV2;
  const draft = seedChoiceDefaults({ mode: "restricted", rows: [] }, field, [context], new Set());
  assert(draft.rows[0].input === String(value), `${type}: seed the actual imported default`);
  assert(!validateChoiceDraft(draft, field, [context]).errors.length, `${type}: restricted default is valid`);
  const row = nextChoiceRow(draft.rows, new Set(draft.rows.map(row => row.id)));
  draft.rows.push({ ...row, input: String(second), label: "Alternative" });
  const result = validateChoiceDraft(draft, field, [context]);
  assert(result.choices?.options[1].value === second, `${type}: typed canonical values`);
  const configured = { ...field, configuration: { choices: result.choices } } as TemplateFieldConfigurationV2;
  assert(JSON.stringify(choiceDraftFromConfiguration(configured)) === JSON.stringify(choiceDraftFromConfiguration(structuredClone(configured))), `${type}: reopening preserves configuration`);
  assert(validateChoiceDraft({ ...draft, rows: [] }, field, [context]).errors.length, `${type}: removing the last row does not disable restrictions`);
  const duplicate = { ...draft, rows: [draft.rows[0], { ...draft.rows[0], key: "duplicate", id: "other" }] };
  assert(validateChoiceDraft(duplicate, field, [context]).rowErrors.duplicate, `${type}: duplicate values blocked`);
}
{
  const context = source("number", 5, { min: 3, max: 10, step: 1 }), field = context.definition;
  for (const input of ["", "-", "Infinity", "2", "5.5"]) {
    const result = validateChoiceDraft({ mode: "suggested", rows: [{ key: "row", id: "valid", input }] }, field, [context]);
    assert(result.rowErrors.row && !result.choices, `Invalid/incomplete numeric draft ${input} never becomes configuration`);
  }
}
for (const [type, value, input] of [["date", "2026-04-16", "2026-02-30"], ["color", "#e5b2ff", "#xyz"], ["text", "Imported", "multiple\nlines"]] as const) {
  const context = source(type, value);
  assert(validateChoiceDraft({ mode: "suggested", rows: [{ key: "row", id: "bad id", input }] }, context.definition, [context]).rowErrors.row, `${type}: IDs and values validated`);
}
{
  const sources = [source("text", "First"), { ...source("text", "Second"), design: "Second design" }, { ...source("text", "Excluded"), configurationOverride: { choices: null } }];
  const field = sources[0].definition;
  const seeded = seedChoiceDefaults({ mode: "restricted", rows: [] }, field, sources, new Set());
  assert(seeded.rows.map(row => row.input).join() === "First,Second", "Family defaults include inherited designs only, in order");
  assert(validateChoiceDraft(seeded, field, sources).choices, "Explicit variant clear does not require inclusion in common choices");
  const missing = validateChoiceDraft({ ...seeded, rows: [seeded.rows[0]] }, field, sources);
  assert(missing.errors.some(error => error.includes("Second design")), "Missing Family default identifies its design");
  assert(nextChoiceRow([], new Set(["option-1", "option-2"])).id === "option-3", "Removed identities are not reused in the authoring lifetime");
  const literal = choiceDraftFromConfiguration({ ...field, configuration: { choices: { mode: "suggested", options: [{ id: "old_id", label: "", value: "First" }] } } } as TemplateFieldConfigurationV2);
  assert(literal.rows[0].id === "old_id" && literal.rows[0].label === "", "Existing identities and optional-label presence preserved");
  assert(choiceAuthoringSources(field.id, [field]).length === 1, "Single context uses the complete definition");
}
console.log("Studio choice authoring: five types, typed drafts, stable identities, Family defaults and validation pass.");
{
  const context = source("color", "#aabbcc"), field = context.definition;
  const existing = { mode: "restricted" as const, rows: [{ key: "old", id: "original", input: "#ABC" }] };
  const seeded = seedChoiceDefaults(existing, field, [context], new Set(["original"]));
  assert(seeded.rows.length === 1 && seeded.rows[0].id === "original", "Short hex and case differences do not duplicate the imported canonical Color default");
  assert(validateChoiceDraft(seeded, field, [context]).choices?.options[0].value === "#aabbcc", "Color drafts use SDK canonicalization");
}
