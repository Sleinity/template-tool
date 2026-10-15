import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatTemplateCalendarDateV1, formatTemplateNumberV1, type TemplateFieldConfigurationV2 } from "@sleinity/template-core";
import type { TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";
import { Button, Input, Select, Status, Textarea, Toggle } from "../components/ui";
import { useSetupEditGuard } from "../setup/SetupEditGuard";
import { parseNumberDraft, validateFieldCandidate, type FieldAuthoringContext } from "./fieldAuthoring";
import { normalizeStudioTextField, normalizeStudioTextOverride } from "./studioTextLimits";

import { choiceDraftFromConfiguration, nextChoiceRow, seedChoiceDefaults, validateChoiceDraft, type ChoiceAuthoringSource, type ChoiceDraft, type ChoiceRow } from "./choiceAuthoring";
type Configuration = Record<string, unknown>;


/** Studio drafts only. Core remains the canonical validation and commit boundary. */
export function FieldConfigurationEditorV2({ field, inheritedField = field, variant = false, override, choiceSources = [], authoringContext, exampleSource, onSave, onCancel }: {
  field: TemplateFieldConfigurationV2;
  choiceSources?: readonly ChoiceAuthoringSource[];
  authoringContext?: FieldAuthoringContext;
  exampleSource?: ChoiceAuthoringSource;
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
  const [numericDrafts, setNumericDrafts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastChoiceMode = useRef<Exclude<ChoiceDraft["mode"], "none">>(initialChoices.current.mode === "none" ? "suggested" : initialChoices.current.mode);
  const guard = useSetupEditGuard();
  const form = useRef<HTMLFormElement>(null);
  const applied = useRef(false);
  const baseline = JSON.stringify(initial.current);
  const choiceState = (value: ChoiceDraft) => value.mode === "none" ? { mode: "none", rows: [] } : value;
  const numericInitial = (key: string) => { const configuration = initial.current.draft.configuration as Configuration; const value = key === "decimalPlaces" ? (configuration.format as Configuration | undefined)?.decimalPlaces : configuration[key]; return value === undefined ? "" : String(value); };
  const dirty = Object.entries(numericDrafts).some(([key, value]) => value !== numericInitial(key)) || JSON.stringify({ draft, sparse, metadata }) !== baseline || JSON.stringify(choiceState(choiceDraft)) !== JSON.stringify(choiceState(initialChoices.current));
  const configuration = draft.configuration as Configuration;
  const choiceValidation = useMemo(() => validateChoiceDraft(choiceDraft, normalizeStudioTextField(draft), choiceSources), [choiceDraft, draft, choiceSources]);
  const candidate = useMemo(() => {
    const configuration = { ...draft.configuration } as Configuration;
    if (choiceValidation.choices) configuration.choices = choiceValidation.choices; else delete configuration.choices;
    const field = normalizeStudioTextField({ ...draft, configuration } as TemplateFieldConfigurationV2);
    const finalSparse = { ...sparse };
    if (variant && "choices" in finalSparse) finalSparse.choices = choiceValidation.choices ?? null;
    const override = variant ? normalizeStudioTextOverride({ type: draft.type, ...metadata, configuration: finalSparse } as TemplateFieldFamilyVariantFieldOverrideV2) : undefined;
    return { field, override };
  }, [draft, sparse, metadata, choiceValidation.choices, variant]);
  // Labels and host hints are controlled strings; they cannot alter rule validity.
  // Revalidate the complete current candidate synchronously before every acceptance.
  const ruleIdentity = JSON.stringify([candidate.field.id, candidate.field.type, candidate.field.configuration, candidate.override?.type, candidate.override?.configuration]);
  const ruleValidation = useRef<{ context: FieldAuthoringContext | undefined; identity: string; issues: ReturnType<typeof validateFieldCandidate> } | null>(null);
  if (!ruleValidation.current || ruleValidation.current.context !== authoringContext || ruleValidation.current.identity !== ruleIdentity) {
    ruleValidation.current = { context: authoringContext, identity: ruleIdentity, issues: authoringContext ? validateFieldCandidate(authoringContext, candidate.field, candidate.override) : [] };
  }
  const candidateIssues = ruleValidation.current.issues;
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
  for (const [key, value] of Object.entries(numericDrafts)) if (!parseNumberDraft(value).complete) localErrors[key] = "Enter a complete number.";
  for (const issue of candidateIssues) localErrors[issue.property ?? "configuration"] ??= issue.property === "decimalPlaces" ? "Use a whole number from 0 to 100." : `${issue.design}: ${issue.message}`;
  const valid = Object.keys(localErrors).length === 0;
  const localErrorAnnouncement = Object.values(localErrors)[0] ?? "";

  const reset = () => {
    setDraft(structuredClone(initial.current.draft));
    setSparse(structuredClone(initial.current.sparse));
    setMetadata(structuredClone(initial.current.metadata));
    setChoiceDraft(initialChoices.current);
    lastChoiceMode.current = initialChoices.current.mode === "none" ? "suggested" : initialChoices.current.mode;
    setNumericDrafts({}); setError(null);
  };
  const focusError = () => requestAnimationFrame(() => (form.current?.querySelector<HTMLElement>("[aria-invalid='true']") ?? form.current?.querySelector<HTMLElement>(".studio-field-inspector__error") ?? form.current?.querySelector<HTMLElement>("input"))?.focus());
  useEffect(() => {
    if (!guard) return;
    guard.register(dirty ? {
      valid, focusError,
      apply: () => { applied.current = false; form.current?.requestSubmit(); return applied.current; },
      discard: reset,
    } : null);
    return () => guard.register(null);
  }, [dirty, valid, draft, sparse, metadata, choiceDraft, numericDrafts, guard?.register]);

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
  const clearLabel: Record<string, string> = { maxCharacters: "No character limit for this design", maxLines: "No line limit for this design", warningAtLines: "No line warning for this design", min: "No minimum for this design", max: "No maximum for this design", step: "No step for this design", format: "Use default format for this design" };
  const property = (key: string, label: string, control: ReactNode, required = false) => <div key={key} className="field-config-property">
    {control}
    {variant && <div className="studio-field-property-state"><Status tone="neutral">{key in sparse ? sparse[key] === null ? "Cleared for this design" : "Overridden" : "Uses shared settings"}</Status>{key in sparse && <Button size="small" variant="quiet" onClick={() => { inherit(key); setNumericDrafts(previous => { const next = { ...previous }; delete next[key]; if (key === "format") delete next.decimalPlaces; return next; }); }}>Restore shared</Button>}{!required && sparse[key] !== null && <Button size="small" variant="quiet" onClick={() => { update(key, undefined); setNumericDrafts(previous => { const next = { ...previous }; delete next[key]; if (key === "format") delete next.decimalPlaces; return next; }); }}>{clearLabel[key] ?? `Clear ${label.toLowerCase()} for this design`}</Button>}</div>}
  </div>;
  const numericInput = (key: string, label: string, value: unknown, commit: (value: number | undefined) => void) => <Input label={label} type="text" inputMode="decimal" error={localErrors[key]} value={numericDrafts[key] ?? (value === undefined ? "" : String(value))} onChange={event => { const input = event.target.value; setNumericDrafts(previous => ({ ...previous, [key]: input })); const parsed = parseNumberDraft(input); if (parsed.complete) commit(parsed.value); }} />;
  const numberRule = (key: string, label: string) => property(key, label, numericInput(key, label, configuration[key], value => update(key, value)));
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
  const displayExample = (() => { try {
return  draft.type === "number"
    ? formatTemplateNumberV1(typeof exampleSource?.definition.defaultValue === "number" ? exampleSource.definition.defaultValue : 1234.5, format as never)
    : draft.type === "date"
      ? formatTemplateCalendarDateV1((typeof exampleSource?.definition.defaultValue === "string" ? exampleSource.definition.defaultValue : "2026-04-16") as never, format as never)
      : null;
  } catch { return "—"; } })();
  const submit = () => {
    if (!valid) {
      setError("Correct the highlighted settings before applying.");
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    try {
      const acceptanceIssues = authoringContext ? validateFieldCandidate(authoringContext, candidate.field, candidate.override) : [];
      if (acceptanceIssues.length) { setError(acceptanceIssues[0].message); focusError(); return; }
      onSave(candidate.field, candidate.override); setNumericDrafts({}); applied.current = true; guard?.register(null); setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Configuration could not be applied.");
      focusError();
    }
  };

  return <form ref={form} className="field-config-editor studio-field-inspector" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <p className="ui-visually-hidden" aria-live="polite">{localErrorAnnouncement}</p>
    <section className="studio-field-inspector__section" aria-labelledby="field-details-heading"><h3 id="field-details-heading" className="ui-visually-hidden">Field details</h3>
      <Input label="Label" value={draft.label ?? ""} helpText="Shown when people create an output." onChange={(event) => { setDraft({ ...draft, label: event.target.value || undefined }); if (variant) setMetadata({ ...metadata, label: event.target.value || null }); }} />
      {variant && <div className="studio-field-property-state"><Status tone="neutral">{"label" in metadata ? metadata.label === null ? "Default label for this design" : "Overridden" : "Uses shared settings"}</Status>{"label" in metadata && <Button size="small" variant="quiet" onClick={() => { setMetadata((current) => { const next = { ...current }; delete next.label; return next; }); setDraft({ ...draft, label: inheritedField.label }); }}>Restore shared label</Button>}</div>}
    </section>

    {!["color", "boolean", "date"].includes(draft.type) && <section className="studio-field-inspector__section" aria-labelledby="field-rules-heading"><h3 id="field-rules-heading">Rules</h3>
      {(draft.type === "text" || draft.type === "textarea") && <div className="studio-field-control-group"><p>Empty means no limit; warnings start at 80%.</p>{numberRule("maxCharacters", "Maximum characters")}{draft.type === "textarea" && <><p>Line limits include wrapping.</p>{numberRule("maxLines", "Maximum rendered lines")}{numberRule("warningAtLines", "Warn at rendered lines")}</>}</div>}
      {draft.type === "image" && <div className="studio-field-control-group">{property("replacementPlacement", "image replacement behavior", <fieldset className="studio-field-choice-group"><legend>Image replacement behavior</legend>{(["fill", "fit", "crop"] as const).map((mode) => <label key={mode} className="ui-choice-line"><input type="radio" name={`replacement-placement-${draft.id}`} value={mode} checked={configuration.replacementPlacement === mode} onChange={() => update("replacementPlacement", mode)} /><span><strong>{mode === "fill" ? "Fill" : mode === "fit" ? "Fit" : "Crop — custom host"}</strong><small>{mode === "fill" ? "Cover the image area; edges may be trimmed." : mode === "fit" ? "Show the complete image inside the area." : "Studio uses Fill; framing requires a host crop tool."}</small></span></label>)}</fieldset>, true)}</div>}
      {draft.type === "number" && <div className="studio-field-control-group"><h4>Allowed values</h4><div className="field-rules-two-column">{numberRule("min", "Minimum")}{numberRule("max", "Maximum")}{numberRule("step", "Step")}</div></div>}
      {draft.type === "color" && <p>People can choose an opaque RGB color. Add choices below to suggest or restrict the available colors.</p>}
      {draft.type === "date" && <p>People choose a calendar date. The format below controls how it appears in the design.</p>}
      {draft.type === "boolean" && <p>When hidden, the connected group and its contents leave the layout. Surrounding Auto Layout content reflows automatically.</p>}
    </section>}

    {draft.type === "boolean" && <p className="studio-field-inspector__section">Hides this group and reflows the layout.</p>}
    {(draft.type === "number" || draft.type === "date") && <section className="studio-field-inspector__section" aria-labelledby="display-format-heading"><h3 id="display-format-heading">Display format</h3>
      {draft.type === "number" ? property("format", "number format", <div className="studio-field-control-group"><div className="field-rules-two-column"><Input label="Prefix" value={format?.prefix as string ?? ""} onChange={(event) => numberFormat("prefix", event.target.value)} /><Input label="Suffix" value={format?.suffix as string ?? ""} onChange={(event) => numberFormat("suffix", event.target.value)} />{numericInput("decimalPlaces", "Decimal places", format?.decimalPlaces, value => numberFormat("decimalPlaces", value))}<Select label="Decimal separator" value={format?.decimalSeparator as string ?? "."} onChange={(event) => numberFormat("decimalSeparator", event.target.value)}><option value=".">Dot</option><option value=",">Comma</option></Select><Select label="Thousands separator" value={format?.thousandSeparator as string ?? ""} onChange={(event) => numberFormat("thousandSeparator", event.target.value || undefined)}><option value="">None</option><option value=".">Dot</option><option value=",">Comma</option><option value=" ">Space</option></Select></div></div>) : property("format", "date format", <div className="studio-field-control-group"><div className="field-rules-two-column"><Input label="Prefix" value={format?.prefix as string ?? ""} onChange={(event) => dateFormat("prefix", event.target.value)} /><Input label="Suffix" value={format?.suffix as string ?? ""} onChange={(event) => dateFormat("suffix", event.target.value)} /><Select label="Date display format" value={datePreset} onChange={(event) => dateFormat("preset", event.target.value)}><option value="iso">YYYY-MM-DD</option><option value="numeric-year-first">YYYY/MM/DD</option><option value="numeric-day-first">DD/MM/YYYY</option><option value="numeric-month-first">MM/DD/YYYY</option><option value="numeric-day-month">DD/MM</option><option value="numeric-month-day">MM/DD</option></Select>{datePreset !== "iso" && <Select label="Date separator" value={format?.separator as string ?? "/"} onChange={(event) => dateFormat("separator", event.target.value)}><option value="/">Slash</option><option value="-">Hyphen</option><option value=".">Dot</option></Select>}</div></div>)}
      <div className="studio-field-format-example"><span>{exampleSource ? `Default · ${exampleSource.design}` : "Example"}</span><strong>{displayExample}</strong></div>
    </section>}

    {hasChoices && <section className="studio-field-inspector__section studio-field-choices" aria-label="Choices configuration">
      <Toggle label="Choices" checked={choiceDraft.mode !== "none"} onChange={enabled => changeChoices(enabled ? seedChoiceDefaults({ ...choiceDraft, mode: lastChoiceMode.current }, draft, choiceSources, usedChoiceIds.current) : { ...choiceDraft, mode: "none" })} />
      {variant && <div className="studio-field-property-state"><Status tone="neutral">{"choices" in sparse ? sparse.choices === null ? "Disabled for this design" : "Overridden" : "Uses shared settings"}</Status>{"choices" in sparse && <Button size="small" variant="quiet" onClick={inheritChoices}>Restore shared choices</Button>}</div>}
      {choiceDraft.mode !== "none" && <div className="studio-field-disclosure__content">
      <Select label="Choice behavior" value={choiceDraft.mode} onChange={event => {
        const mode = event.target.value as ChoiceDraft["mode"];
        const next = { ...choiceDraft, mode };
        changeChoices(mode !== "none" && (choiceDraft.mode === "none" || mode === "restricted") ? seedChoiceDefaults(next, draft, choiceSources, usedChoiceIds.current) : next);
      }}><option value="suggested">Suggested values</option><option value="restricted">Options only</option></Select>
      <p>{choiceDraft.mode === "restricted" ? "Only these options are allowed; include imported defaults for Reset." : choiceDraft.mode === "suggested" ? "Offer presets alongside normal input." : "People enter values using the ordinary field control."}</p>

      {localErrors.choices && <p className="ui-field__error">{localErrors.choices}</p>}
      {choiceDraft.rows.map((row, index) => <fieldset className={`studio-field-choice${draft.type === "textarea" ? " studio-field-choice--multiline" : ""}`} data-choice-row={row.key} key={row.key}><legend>Choice {index + 1}</legend><div className="field-rules-two-column">
        <Input label="Option label" value={row.label ?? ""} helpText="Optional; otherwise the value is shown." onChange={event => changeRow(row.key, { label: event.target.value || undefined })} />
        {draft.type === "textarea" ? <Textarea label="Option value" value={row.input} error={choiceValidation.valueErrors[row.key]} onChange={event => changeRow(row.key, { input: event.target.value })} /> : <Input label="Option value" type={draft.type === "date" ? "date" : "text"} inputMode={draft.type === "number" ? "decimal" : undefined} value={row.input} error={choiceValidation.valueErrors[row.key]} helpText={draft.type === "color" ? "Opaque RGB hex, for example #e5b2ff." : undefined} onChange={event => changeRow(row.key, { input: event.target.value })} />}
        {draft.type === "color" && <div className="studio-choice-color" data-invalid-color={!/^#[0-9a-f]{6}$/i.test(row.input) || undefined}><Input label="Choose option color" type="color" value={/^#[0-9a-f]{6}$/i.test(row.input) ? row.input : "#000000"} onChange={event => changeRow(row.key, { input: event.target.value })} />{!/^#[0-9a-f]{6}$/i.test(row.input) && <span className="studio-choice-color__invalid">Invalid color</span>}</div>}
      </div><details open={Boolean(choiceValidation.identityErrors[row.key]) || undefined}><summary>Advanced option identity</summary><p>Changing this ID disconnects existing selections. Editing the label, value or order preserves the selection.</p><Input label="Stable option ID" error={choiceValidation.identityErrors[row.key]} value={row.id} onChange={event => changeRow(row.key, { id: event.target.value })} /></details>
      <div className="studio-field-choice__actions"><Button size="small" variant="quiet" aria-label={`Move option ${index + 1} up`} disabled={index === 0} onClick={() => { const rows = [...choiceDraft.rows]; [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]]; changeChoices({ ...choiceDraft, rows }); }}>Move up</Button><Button size="small" variant="quiet" aria-label={`Move option ${index + 1} down`} disabled={index === choiceDraft.rows.length - 1} onClick={() => { const rows = [...choiceDraft.rows]; [rows[index], rows[index + 1]] = [rows[index + 1], rows[index]]; changeChoices({ ...choiceDraft, rows }); }}>Move down</Button><Button size="small" variant="quiet" aria-label={`Remove option ${index + 1}`} title="Keeps any selected content value; Options only may require correction." onClick={() => { const rows = choiceDraft.rows.filter(candidate => candidate.key !== row.key); changeChoices({ ...choiceDraft, rows }); const focus = rows[Math.min(index, rows.length - 1)]?.key; requestAnimationFrame(() => { const target = focus ? form.current?.querySelector<HTMLElement>(`[data-choice-row="${CSS.escape(focus)}"] input, [data-choice-row="${CSS.escape(focus)}"] textarea`) : form.current?.querySelector<HTMLElement>("[data-add-choice]"); target?.focus(); }); }}>Remove</Button></div></fieldset>)}
      <Button data-add-choice variant="secondary" onClick={() => changeChoices({ ...choiceDraft, rows: [...choiceDraft.rows, nextChoiceRow(choiceDraft.rows, usedChoiceIds.current)] })}>Add choice</Button>
    </div>}
    </section>}

    <details className="studio-field-inspector__section studio-field-disclosure studio-field-disclosure--compact"><summary><span>Technical details</span></summary><div className="studio-field-disclosure__content"><p>Field ID: <code>{draft.id}</code> <Button size="small" variant="quiet" onClick={() => { void navigator.clipboard.writeText(draft.id).then(() => setCopied(true)).catch(() => setError("Could not copy the field ID.")); }}>{copied ? "Copied" : "Copy ID"}</Button></p><details><summary>Host integration</summary><Input label="Control role (advanced)" value={draft.controlRole ?? ""} helpText="Optional presentation hint for custom editor hosts." onChange={(event) => { setDraft({ ...draft, controlRole: event.target.value || undefined }); if (variant) setMetadata({ ...metadata, controlRole: event.target.value || null }); }} />{variant && "controlRole" in metadata && <Button variant="quiet" onClick={() => { setMetadata((current) => { const next = { ...current }; delete next.controlRole; return next; }); setDraft({ ...draft, controlRole: inheritedField.controlRole }); }}>Restore shared control role</Button>}</details></div></details>
    {localErrors.configuration && <p tabIndex={-1} className="studio-field-inspector__error">{localErrors.configuration}</p>}
    {error && <p tabIndex={-1} role="alert" className="studio-field-inspector__error">{error}</p>}
    {guard ? <footer className="studio-field-inspector__actions"><span aria-live="polite">{dirty ? "Unapplied changes" : "No changes"}</span><div><Button variant="secondary" disabled={!dirty} onClick={() => { reset(); guard.register(null); onCancel?.(); }}>Discard</Button><Button type="submit" disabled={!dirty || !valid}>Apply changes</Button></div></footer> : <Button type="submit" disabled={!valid}>Apply field configuration</Button>}
  </form>;
}
