import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatTemplateCalendarDateV1, formatTemplateNumberV1, type TemplateFieldConfigurationV2 } from "@sleinity/template-core";
import type { TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";
import { Button, Input, Select, Status, Textarea, Toggle } from "../components/ui";
import { useSetupEditGuard } from "../setup/SetupEditGuard";
import { normalizeStudioTextField, normalizeStudioTextOverride } from "./studioTextLimits";

import { choiceDraftFromConfiguration, nextChoiceRow, seedChoiceDefaults, validateChoiceDraft, type ChoiceAuthoringSource, type ChoiceDraft, type ChoiceRow } from "./choiceAuthoring";
type Configuration = Record<string, unknown>;


/** Studio drafts only. Core remains the canonical validation and commit boundary. */
export function FieldConfigurationEditorV2({ field, inheritedField = field, variant = false, override, choiceSources = [], onSave, onCancel }: {
  field: TemplateFieldConfigurationV2;
  choiceSources?: readonly ChoiceAuthoringSource[];
  inheritedField?: TemplateFieldConfigurationV2;
  variant?: boolean;
  override?: TemplateFieldFamilyVariantFieldOverrideV2;
  onSave(field: TemplateFieldConfigurationV2, override?: TemplateFieldFamilyVariantFieldOverrideV2): void;
  onCancel?(): void;
}) {
  const initial = useRef({
    draft: structuredClone(field),
    sparse: structuredClone(override?.configuration ?? {}) as Configuration,
    metadata: {
      ...(override && "label" in override ? { label: override.label } : {}),
      ...(override && "controlRole" in override ? { controlRole: override.controlRole } : {}),
    } as { label?: string | null; controlRole?: string | null },
  });
  const initialChoices = useRef(choiceDraftFromConfiguration(field));
  const [choiceDraft, setChoiceDraft] = useState(() => initialChoices.current);
  const usedChoiceIds = useRef(new Set(initialChoices.current.rows.map(row => row.id)));
  const [draft, setDraft] = useState(() => structuredClone(initial.current.draft));
  const [sparse, setSparse] = useState<Configuration>(() => structuredClone(initial.current.sparse));
  const [metadata, setMetadata] = useState(() => structuredClone(initial.current.metadata));
  const [error, setError] = useState<string | null>(null);
  const lastChoiceMode = useRef<Exclude<ChoiceDraft["mode"], "none">>(initialChoices.current.mode === "none" ? "suggested" : initialChoices.current.mode);
  const guard = useSetupEditGuard();
  const form = useRef<HTMLFormElement>(null);
  const applied = useRef(false);
  const baseline = JSON.stringify(initial.current);
  const choiceState = (value: ChoiceDraft) => value.mode === "none" ? { mode: "none", rows: [] } : value;
  const dirty = JSON.stringify({ draft, sparse, metadata }) !== baseline || JSON.stringify(choiceState(choiceDraft)) !== JSON.stringify(choiceState(initialChoices.current));
  const configuration = draft.configuration as Configuration;
  const choiceValidation = validateChoiceDraft(choiceDraft, normalizeStudioTextField(draft), choiceSources);
  const format = configuration.format as Configuration | undefined;
  const hasChoices = draft.type !== "image" && draft.type !== "boolean";

  const localErrors: Record<string, string> = {};
  const positiveInteger = (key: string, label: string) => {
    const value = configuration[key];
    if (value !== undefined && (!Number.isInteger(value) || (value as number) < 1)) localErrors[key] = `${label} must be a whole number of at least 1.`;
  };
  positiveInteger("maxCharacters", "Maximum characters");
  positiveInteger("maxLines", "Maximum rendered lines");
  positiveInteger("warningAtLines", "Warning line");
  if (typeof configuration.warningAtLines === "number" && typeof configuration.maxLines === "number" && configuration.warningAtLines > configuration.maxLines) localErrors.warningAtLines = "Warning line cannot exceed the maximum rendered lines.";
  if (typeof configuration.min === "number" && typeof configuration.max === "number" && configuration.min > configuration.max) localErrors.max = "Maximum must be greater than or equal to minimum.";
  if (configuration.step !== undefined && (typeof configuration.step !== "number" || !Number.isFinite(configuration.step) || configuration.step <= 0)) localErrors.step = "Step must be greater than 0.";
  if (Object.keys(choiceValidation.rowErrors).length || choiceValidation.errors.length) localErrors.choices = choiceValidation.errors[0] ?? "Correct the highlighted choices.";
  const valid = Object.keys(localErrors).length === 0;
  const localErrorAnnouncement = Object.values(localErrors)[0] ?? "";

  const reset = () => {
    setDraft(structuredClone(initial.current.draft));
    setSparse(structuredClone(initial.current.sparse));
    setMetadata(structuredClone(initial.current.metadata));
    setChoiceDraft(initialChoices.current);
    lastChoiceMode.current = initialChoices.current.mode === "none" ? "suggested" : initialChoices.current.mode;
    setError(null);
  };
  useEffect(() => {
    if (!guard) return;
    guard.register(dirty ? {
      apply: () => { applied.current = false; form.current?.requestSubmit(); return applied.current; },
      discard: reset,
    } : null);
    return () => guard.register(null);
  }, [dirty, draft, sparse, metadata, choiceDraft, guard?.register]);

  const update = (key: string, value: unknown) => {
    const next = { ...configuration };
    if (value === undefined) delete next[key]; else next[key] = value;
    setDraft({ ...draft, configuration: next } as TemplateFieldConfigurationV2);
    if (variant) setSparse((previous) => ({ ...previous, [key]: value ?? null }));
    setError(null);
  };
  const inherit = (key: string) => {
    setSparse((previous) => { const next = { ...previous }; delete next[key]; return next; });
    setDraft((previous) => ({ ...previous, configuration: { ...previous.configuration, [key]: (inheritedField.configuration as Configuration)[key] } }) as TemplateFieldConfigurationV2);
  };
  const property = (key: string, label: string, control: ReactNode, required = false) => <div key={key} className="field-config-property">
    {control}
    {variant && <div className="studio-field-property-state"><Status tone="neutral">{key in sparse ? sparse[key] === null ? "Cleared" : "Overridden" : "Inherited"}</Status><Button size="small" variant="quiet" onClick={() => inherit(key)}>Use shared value</Button>{!required && <Button size="small" variant="quiet" onClick={() => update(key, undefined)}>Clear for this design</Button>}</div>}
  </div>;
  const numberRule = (key: string, label: string) => property(key, label, <Input label={label} type="number" step="any" error={localErrors[key]} value={typeof configuration[key] === "number" ? configuration[key] as number : ""} onChange={(event) => update(key, event.target.value === "" ? undefined : event.target.valueAsNumber)} />);
  const changeChoices = (next: ChoiceDraft) => {
    if (next.mode !== "none") lastChoiceMode.current = next.mode;
    next.rows.forEach(row => usedChoiceIds.current.add(row.id));
    setChoiceDraft(next);
    if (variant) setSparse(previous => ({ ...previous, choices: next.mode === "none" ? null : {} }));
    setError(null);
  };
  const changeRow = (key: string, update: Partial<ChoiceRow>) => changeChoices({ ...choiceDraft, rows: choiceDraft.rows.map(row => row.key === key ? { ...row, ...update } : row) });
  const inheritChoices = () => { const next = choiceDraftFromConfiguration(inheritedField); if (next.mode !== "none") lastChoiceMode.current = next.mode; inherit("choices"); setChoiceDraft(next); };

  const numberFormat = (key: string, value: unknown) => update("format", { ...format, schemaVersion: "number-display-v1", [key]: value });
  const dateFormat = (key: string, value: unknown) => {
    const next: Configuration = { ...format, schemaVersion: "date-display-v1", preset: format?.preset ?? "iso", [key]: value };
    if (key === "preset" && value === "iso") delete next.separator;
    update("format", next);
  };
  const datePreset = format?.preset as string ?? "iso";
  const displayExample = draft.type === "number"
    ? formatTemplateNumberV1(1234.5, format as never)
    : draft.type === "date"
      ? formatTemplateCalendarDateV1("2026-04-16" as never, format as never)
      : null;
  const submit = () => {
    if (!valid) {
      setError("Correct the highlighted settings before applying.");
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    try {
      const configuration = { ...draft.configuration } as Configuration;
      if (choiceValidation.choices) configuration.choices = choiceValidation.choices; else delete configuration.choices;
      const normalizedField = normalizeStudioTextField({ ...draft, configuration } as TemplateFieldConfigurationV2);
      const finalSparse = { ...sparse };
      if (variant && "choices" in finalSparse) finalSparse.choices = choiceValidation.choices ?? null;
      const normalizedOverride = variant ? normalizeStudioTextOverride({ type: draft.type, ...metadata, configuration: finalSparse } as TemplateFieldFamilyVariantFieldOverrideV2) : undefined;
      onSave(normalizedField, normalizedOverride); applied.current = true; guard?.register(null); setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Configuration could not be applied.");
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid='true'], input, select, textarea")?.focus());
    }
  };

  return <form ref={form} className="field-config-editor studio-field-inspector" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <p className="ui-visually-hidden" aria-live="assertive">{localErrorAnnouncement}</p>
    <section className="studio-field-inspector__section" aria-labelledby="field-details-heading"><h3 id="field-details-heading" className="ui-visually-hidden">Field details</h3>
      <Input label="Label" value={draft.label ?? ""} helpText="Shown when people create an output." onChange={(event) => { setDraft({ ...draft, label: event.target.value || undefined }); if (variant) setMetadata({ ...metadata, label: event.target.value || null }); }} />
      {variant && <div className="studio-field-property-state"><Status tone="neutral">{"label" in metadata ? metadata.label === null ? "Cleared" : "Overridden" : "Inherited"}</Status><Button size="small" variant="quiet" onClick={() => { setMetadata((current) => { const next = { ...current }; delete next.label; return next; }); setDraft({ ...draft, label: inheritedField.label }); }}>Use shared label</Button></div>}
    </section>

    {!["color", "boolean", "date"].includes(draft.type) && <section className="studio-field-inspector__section" aria-labelledby="field-rules-heading"><h3 id="field-rules-heading">Rules</h3>
      {(draft.type === "text" || draft.type === "textarea") && <div className="studio-field-control-group"><h4>Length limits</h4><p>Character warnings begin automatically at 80% of the maximum.</p>{numberRule("maxCharacters", "Maximum characters")}{draft.type === "textarea" && <><p>Rendered lines include automatic wrapping in the final design.</p>{numberRule("maxLines", "Maximum rendered lines")}{numberRule("warningAtLines", "Warn at rendered lines")}</>}</div>}
      {draft.type === "image" && <div className="studio-field-control-group"><h4>Image replacement behavior</h4>{property("replacementPlacement", "image replacement behavior", <fieldset className="studio-field-choice-group"><legend>Image replacement behavior</legend>{(["fill", "fit", "crop"] as const).map((mode) => <label key={mode} className="ui-choice-line"><input type="radio" name={`replacement-placement-${draft.id}`} value={mode} checked={configuration.replacementPlacement === mode} onChange={() => update("replacementPlacement", mode)} /><span><strong>{mode === "fill" ? "Fill" : mode === "fit" ? "Fit" : "Crop"}</strong><small>{mode === "fill" ? "Cover the image area; edges may be trimmed." : mode === "fit" ? "Show the complete image inside the area." : "Let a host crop tool provide framing. Hosts without one use Fill."}</small></span></label>)}</fieldset>, true)}</div>}
      {draft.type === "number" && <div className="studio-field-control-group"><h4>Allowed values</h4><div className="field-rules-two-column">{numberRule("min", "Minimum")}{numberRule("max", "Maximum")}{numberRule("step", "Step")}</div></div>}
      {draft.type === "color" && <p>People can choose an opaque RGB color. Add choices below to suggest or restrict the available colors.</p>}
      {draft.type === "date" && <p>People choose a calendar date. The format below controls how it appears in the design.</p>}
      {draft.type === "boolean" && <p>When hidden, the connected group and its contents leave the layout. Surrounding Auto Layout content reflows automatically.</p>}
    </section>}

    {(draft.type === "number" || draft.type === "date") && <section className="studio-field-inspector__section" aria-labelledby="display-format-heading"><h3 id="display-format-heading">Display format</h3>
      {draft.type === "number" ? property("format", "number format", <div className="studio-field-control-group"><div className="field-rules-two-column"><Input label="Prefix" value={format?.prefix as string ?? ""} onChange={(event) => numberFormat("prefix", event.target.value)} /><Input label="Suffix" value={format?.suffix as string ?? ""} onChange={(event) => numberFormat("suffix", event.target.value)} /><Input label="Decimal places" type="number" min={0} max={100} value={format?.decimalPlaces as number ?? ""} onChange={(event) => numberFormat("decimalPlaces", event.target.value === "" ? undefined : event.target.valueAsNumber)} /><Select label="Decimal separator" value={format?.decimalSeparator as string ?? "."} onChange={(event) => numberFormat("decimalSeparator", event.target.value)}><option value=".">Dot</option><option value=",">Comma</option></Select><Select label="Thousands separator" value={format?.thousandSeparator as string ?? ""} onChange={(event) => numberFormat("thousandSeparator", event.target.value || undefined)}><option value="">None</option><option value=".">Dot</option><option value=",">Comma</option><option value=" ">Space</option></Select></div></div>) : property("format", "date format", <div className="studio-field-control-group"><div className="field-rules-two-column"><Input label="Prefix" value={format?.prefix as string ?? ""} onChange={(event) => dateFormat("prefix", event.target.value)} /><Input label="Suffix" value={format?.suffix as string ?? ""} onChange={(event) => dateFormat("suffix", event.target.value)} /><Select label="Date display format" value={datePreset} onChange={(event) => dateFormat("preset", event.target.value)}><option value="iso">YYYY-MM-DD</option><option value="numeric-year-first">YYYY/MM/DD</option><option value="numeric-day-first">DD/MM/YYYY</option><option value="numeric-month-first">MM/DD/YYYY</option><option value="numeric-day-month">DD/MM</option><option value="numeric-month-day">MM/DD</option></Select>{datePreset !== "iso" && <Select label="Date separator" value={format?.separator as string ?? "/"} onChange={(event) => dateFormat("separator", event.target.value)}><option value="/">Slash</option><option value="-">Hyphen</option><option value=".">Dot</option></Select>}</div></div>)}
      <div className="studio-field-format-example"><span>Example</span><strong>{displayExample}</strong></div>
    </section>}

    {hasChoices && <section className="studio-field-inspector__section studio-field-choices" aria-label="Choices configuration">
      <Toggle label="Choices" checked={choiceDraft.mode !== "none"} onChange={enabled => changeChoices(enabled ? seedChoiceDefaults({ ...choiceDraft, mode: lastChoiceMode.current }, draft, choiceSources, usedChoiceIds.current) : { ...choiceDraft, mode: "none" })} />
      {variant && <div className="studio-field-property-state"><Status tone="neutral">{"choices" in sparse ? sparse.choices === null ? "Disabled for this design" : "Overridden" : "Inherited"}</Status><Button size="small" variant="quiet" onClick={inheritChoices}>Use shared value</Button></div>}
      {choiceDraft.mode !== "none" && <div className="studio-field-disclosure__content">
      <Select label="Choice behavior" value={choiceDraft.mode} onChange={event => {
        const mode = event.target.value as ChoiceDraft["mode"];
        const next = { ...choiceDraft, mode };
        changeChoices(mode !== "none" && (choiceDraft.mode === "none" || mode === "restricted") ? seedChoiceDefaults(next, draft, choiceSources, usedChoiceIds.current) : next);
      }}><option value="suggested">Suggested values</option><option value="restricted">Options only</option></Select>
      <p>{choiceDraft.mode === "restricted" ? "People select from this list. Each affected design’s imported default must be included so Reset remains valid." : choiceDraft.mode === "suggested" ? "Offer reusable values alongside normal input. Other valid values remain allowed." : "People enter values using the ordinary field control."}</p>
      <p>Editing a selected option’s value updates that selection. Removing an option keeps its current value; Options only may then require a new selection.</p>
      {localErrors.choices && <p role="alert" className="ui-field__error">{localErrors.choices}</p>}
      {choiceDraft.rows.map((row, index) => <fieldset className="studio-field-choice" key={row.key}><legend>Choice {index + 1}</legend><div className="field-rules-two-column">
        <Input label="Option label" value={row.label ?? ""} helpText="Optional; otherwise the value is shown." onChange={event => changeRow(row.key, { label: event.target.value || undefined })} />
        {draft.type === "textarea" ? <Textarea label="Option value" value={row.input} error={choiceValidation.valueErrors[row.key]} onChange={event => changeRow(row.key, { input: event.target.value })} /> : <Input label="Option value" type={draft.type === "date" ? "date" : "text"} inputMode={draft.type === "number" ? "decimal" : undefined} value={row.input} error={choiceValidation.valueErrors[row.key]} helpText={draft.type === "color" ? "Opaque RGB hex, for example #e5b2ff." : undefined} onChange={event => changeRow(row.key, { input: event.target.value })} />}
        {draft.type === "color" && <Input label="Choose option color" type="color" value={/^#[0-9a-f]{6}$/i.test(row.input) ? row.input : "#000000"} onChange={event => changeRow(row.key, { input: event.target.value })} />}
      </div><details open={Boolean(choiceValidation.identityErrors[row.key]) || undefined}><summary>Advanced option identity</summary><p>Changing this ID disconnects existing selections. Editing the label, value or order preserves the selection.</p><Input label="Stable option ID" error={choiceValidation.identityErrors[row.key]} value={row.id} onChange={event => changeRow(row.key, { id: event.target.value })} /></details>
      <div className="studio-field-choice__actions"><Button size="small" variant="quiet" aria-label="Move option up" disabled={index === 0} onClick={() => { const rows = [...choiceDraft.rows]; [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]]; changeChoices({ ...choiceDraft, rows }); }}>Move up</Button><Button size="small" variant="quiet" aria-label="Move option down" disabled={index === choiceDraft.rows.length - 1} onClick={() => { const rows = [...choiceDraft.rows]; [rows[index], rows[index + 1]] = [rows[index + 1], rows[index]]; changeChoices({ ...choiceDraft, rows }); }}>Move down</Button><Button size="small" variant="quiet" onClick={() => changeChoices({ ...choiceDraft, rows: choiceDraft.rows.filter(candidate => candidate.key !== row.key) })}>Remove</Button></div></fieldset>)}
      <Button variant="secondary" onClick={() => changeChoices({ ...choiceDraft, rows: [...choiceDraft.rows, nextChoiceRow(choiceDraft.rows, usedChoiceIds.current)] })}>Add choice</Button>
    </div>}
    </section>}

    <details className="studio-field-inspector__section studio-field-disclosure studio-field-disclosure--compact"><summary><span>Advanced</span></summary><div className="studio-field-disclosure__content"><p>Field ID: <code>{draft.id}</code></p><Input label="Control role (advanced)" value={draft.controlRole ?? ""} helpText="Optional presentation hint for custom editor hosts." onChange={(event) => { setDraft({ ...draft, controlRole: event.target.value || undefined }); if (variant) setMetadata({ ...metadata, controlRole: event.target.value || null }); }} />{variant && <Button variant="quiet" onClick={() => { setMetadata((current) => { const next = { ...current }; delete next.controlRole; return next; }); setDraft({ ...draft, controlRole: inheritedField.controlRole }); }}>Use shared control role</Button>}</div></details>
    {error && <p role="alert" className="studio-field-inspector__error">{error}</p>}
    {guard ? <footer className="studio-field-inspector__actions"><span aria-live="polite">{dirty ? "Unapplied changes" : "No changes"}</span><div><Button variant="secondary" disabled={!dirty} onClick={() => { reset(); guard.register(null); onCancel?.(); }}>Discard</Button><Button type="submit" disabled={!dirty || !valid}>Apply changes</Button></div></footer> : <Button type="submit" disabled={!valid}>Apply field configuration</Button>}
  </form>;
}
