import fixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { normalizeTemplatePackageV1ToV2, type TemplatePackageV1 } from "@sleinity/template-core";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function choice(session: ReturnType<typeof createTemplateFieldFamilySessionV2>, id: string) {
  const field = session.getFieldControllers().find(f => f.id === id);
  assert(field && "selectChoice" in field, "Choice controller"); return field;
}
function open() {
  const a = normalizeTemplatePackageV1ToV2(structuredClone(fixture as unknown as TemplatePackageV1)).package!;
  a.fontRequirements = [];
  a.editableFields = [
    { id: "text:title", type: "text", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: "Alpha", configuration: { choices: { mode: "suggested", options: [{ id: "primary", value: "Alpha" }, { id: "other", value: "Other" }] } } },
    { id: "number:amount", type: "number", binding: { kind: "text-characters", nodeId: "58:76" }, defaultValue: 10, configuration: { choices: { mode: "suggested", options: [{ id: "price", value: 10 }] } } },
  ];
  a.editableFieldOrder = a.editableFields.map(f => f.id);
  const b = structuredClone(a); b.packageId += "-b";
  const title = b.editableFields[0]; assert(title.type === "text", "Text fixture");
  title.defaultValue = "Bravo"; title.configuration.choices!.options[0].value = "Bravo";
  const family = createTemplateFieldFamilyFromSourcesV2([a, b], "Choice reconciliation regression");
  const session = createTemplateFieldFamilySessionV2(); session.load(family);
  choice(session, "text:title").selectChoice("primary");
  session.selectVariant(family.variants[1].id);
  return session;
}
// The incompatible shared entry must survive unrelated configuration, not only
// already-valid content. Each case starts from the same independently loaded state.
for (const action of ["order", "inherit-order", "label", "rule", "choice-presentation", "choice-mode", "nonselected-order", "nonselected-choice"] as const) {
  const s = open();
  if (action === "inherit-order") {
    const snapshot = s.getSnapshot(), variant = snapshot.family!.variants[1];
    s.configure({ variants: [{ ...variant, editableFieldOrder: [...snapshot.effectivePackage!.editableFieldOrder].reverse() }] });
  }
  const before = s.getSnapshot();
  const selected = structuredClone(before.family!.variants[1]);
  const other = structuredClone(before.family!.variants[0]);
  const field = choice(s, "text:title");
  let publications = 0; const stop = s.subscribe(() => { publications++; });
  if (action === "order") selected.editableFieldOrder = [...before.effectivePackage!.editableFieldOrder].reverse();
  if (action === "inherit-order") selected.editableFieldOrder = undefined;
  if (action === "label") selected.fieldOverrides!["text:title"].label = "New label";
  if (action === "rule") {
    const override = selected.fieldOverrides!["text:title"]; assert(override.type === "text", "Text override"); override.configuration!.maxCharacters = 80;
  }
  if (action === "choice-presentation") {
    const override = selected.fieldOverrides!["text:title"]; assert(override.type === "text", "Text override");
    override.configuration!.choices!.options.reverse(); override.configuration!.choices!.options[0].label = "Renamed";
  }
  if (action === "choice-mode") {
    const override = selected.fieldOverrides!["text:title"]; assert(override.type === "text", "Text override"); override.configuration!.choices!.mode = "restricted";
  }
  if (action === "nonselected-order") other.editableFieldOrder = [...before.effectivePackage!.editableFieldOrder].reverse();
  if (action === "nonselected-choice") other.fieldOverrides = { "text:title": { type: "text", configuration: { choices: { mode: "suggested", options: [{ id: "primary", value: "Other design" }] } } } };
  s.configure({ variants: [action.startsWith("nonselected") ? other : selected] });
  stop();
  const after = s.getSnapshot();
  assert(after.contentState === before.contentState, `${action}: preserve incompatible shared value, provenance and revision`);
  assert(after.operationRevision === before.operationRevision + 1 && publications === 1, `${action}: retain one configuration publication and operation invalidation`);
  assert(after.fields.find(f => f.descriptor.id === "text:title")!.blockingErrors.some(i => i.code === "field-v2.choice-value-mismatch"), `${action}: keep the real validation error visible`);
  assert(field.selectChoice("primary").stale, `${action}: invalidate the old controller without a synthetic content revision`);
  s.dispose();
}
{
  const s = open();
  choice(s, "number:amount").selectChoice("price");
  const before = s.getSnapshot(), selected = structuredClone(before.family!.variants[1]);
  selected.fieldOverrides = { ...selected.fieldOverrides, "number:amount": { type: "number", configuration: { choices: { mode: "suggested", options: [{ id: "price", value: 20 }] } } } };
  s.configure({ variants: [selected] });
  const values = s.getSnapshot().contentState!.values;
  assert(values["text:title"].value === "Alpha" && values["text:title"].selectedChoiceId === "primary", "Another field's choice edit cannot reconcile the incompatible Title");
  assert(values["number:amount"].value === 20 && values["number:amount"].selectedChoiceId === "price" && s.getSnapshot().contentState!.revision === before.contentState!.revision + 1, "Actual option changes reconcile only their field in one revision");
  s.dispose();
}
for (const action of ["value", "remove", "clear", "inherit"] as const) {
  const s = open();
  choice(s, "text:title").selectChoice("primary");
  const before = s.getSnapshot(), selected = structuredClone(before.family!.variants[1]);
  const override = selected.fieldOverrides!["text:title"]; assert(override.type === "text", "Text override");
  if (action === "value") override.configuration!.choices!.options[0].value = "Changed";
  if (action === "remove") override.configuration!.choices!.options = [{ id: "other", value: "Other" }];
  if (action === "clear") override.configuration!.choices = null;
  if (action === "inherit") selected.fieldOverrides = {};
  s.configure({ variants: [selected] });
  const state = s.getSnapshot().contentState!, entry = state.values["text:title"];
  assert(state.revision === before.contentState!.revision + 1, `${action}: actual selected option changes advance normally`);
  assert(entry.value === (action === "value" ? "Changed" : action === "inherit" ? "Alpha" : "Bravo"), `${action}: Core owns the resulting canonical value`);
  assert(entry.selectedChoiceId === (action === "remove" || action === "clear" ? undefined : "primary"), `${action}: retain or clear provenance through Core`);
  s.dispose();
}
{
  const s = open(); choice(s, "text:title").selectChoice("primary");
  const before = s.getSnapshot(), common = structuredClone(before.family!.fields[0]);
  assert(common.type === "text", "Text common field");
  common.configuration.choices!.options.reverse(); common.configuration.choices!.options[0].label = "Renamed";
  s.configure({ fields: [common] });
  assert(s.getSnapshot().contentState === before.contentState, "Common option labels/order cannot rewrite a variant's different selected value");
  common.configuration.choices!.options.find(o => o.id === "primary")!.value = "Common edit";
  s.configure({ fields: [common] });
  assert(s.getSnapshot().contentState!.values["text:title"].value === "Common edit", "Actual Common option value edits still reconcile shared content under Common authority");
  s.dispose();
}
console.log("Family choice reconciliation: unrelated configuration preserves content; actual option changes remain scoped and revisioned.");
