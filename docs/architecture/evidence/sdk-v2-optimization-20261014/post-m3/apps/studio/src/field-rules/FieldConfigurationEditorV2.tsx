import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatTemplateCalendarDateV1, formatTemplateNumberV1, type TemplateFieldConfigurationV2 } from "@sleinity/template-core";
import type { TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";
import { MoreHorizontal } from "lucide-react";
import { Button, Input, Select, Status, Textarea, Toggle, Menu, MenuItem, SideDrawer } from "../components/ui";
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
  const [technical, setTechnical] = useState<{ kind: "field" } | { kind: "option"; key: string } | null>(null);
  const [labelRows, setLabelRows] = useState<Set<string>>(() => new Set());
  const [formatOpen, setFormatOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const detailsBody = useRef<HTMLDivElement>(null);
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

  const formatInvalid = ["decimalPlaces", "format", "prefix", "suffix", "decimalSeparator", "thousandSeparator", "preset", "separator"].some(key => Boolean(localErrors[key]));
  useEffect(() => { if (formatInvalid) setFormatOpen(true); }, [formatInvalid]);
  useEffect(() => { if (localErrors.warningAtLines) setWarningOpen(true); }, [localErrors.warningAtLines]);
  const reset = () => {
    setDraft(structuredClone(initial.current.draft));
    setSparse(structuredClone(initial.current.sparse));
    setMetadata(structuredClone(initial.current.metadata));
    setChoiceDraft(initialChoices.current);
    lastChoiceMode.current = initialChoices.current.mode === "none" ? "suggested" : initialChoices.current.mode;
    setNumericDrafts({}); setError(null); setTechnical(null);
  };
  const focusError = () => {
    const invalidIdentity = choiceDraft.rows.find(row => choiceValidation.identityErrors[row.key]);
    if (invalidIdentity && Object.keys(localErrors).every(key => key === "choices") && !Object.keys(choiceValidation.valueErrors).length) {
      setTechnical({ kind: "option", key: invalidIdentity.key });
      requestAnimationFrame(() => detailsBody.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    if (localErrors.warningAtLines) setWarningOpen(true);
    if (["decimalPlaces", "prefix", "suffix", "decimalSeparator", "thousandSeparator", "preset", "separator", "format"].some(key => localErrors[key])) setFormatOpen(true);
    requestAnimationFrame(() => (form.current?.querySelector<HTMLElement>("[aria-invalid='true']") ?? form.current?.querySelector<HTMLElement>(".studio-field-inspector__error") ?? form.current?.querySelector<HTMLElement>("input"))?.focus());
  };
  const ensureFocusedControlVisible = () => requestAnimationFrame(() => {
    const target = document.activeElement as HTMLElement | null;
    if (!target || !form.current?.contains(target)) return;
    const footers = [form.current.querySelector<HTMLElement>(".studio-field-inspector__actions"), document.querySelector<HTMLElement>(".studio-setup-footer")].filter((footer): footer is HTMLElement => Boolean(footer));
    const bottom = Math.min(window.innerHeight, ...footers.filter(footer => !footer.contains(target)).map(footer => footer.getBoundingClientRect().top));
    if (target.getBoundingClientRect().bottom > bottom - 8) target.scrollIntoView({ block: "center" });
  });
  useEffect(() => { if (dirty) ensureFocusedControlVisible(); }, [dirty]);
  const focusCard = () => requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field-id="${CSS.escape(field.id)}"] .field-rule-card__select`)?.focus());
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
  const propertyState = (key: string) => key in sparse ? sparse[key] === null ? "Cleared for this design" : "Overridden" : "Uses shared settings";
  const restoreProperty = (key: string) => {
    inherit(key); setNumericDrafts(previous => { const next = { ...previous }; delete next[key]; if (key === "format") delete next.decimalPlaces; return next; });
  };
  const property = (key: string, label: string, control: ReactNode, required = false) => <div key={key} className="field-config-property">
    {control}
    {variant && <div className="studio-field-property-state"><span>{propertyState(key)}</span>
      <Menu label={<MoreHorizontal size={16} />} accessibleLabel={`Settings actions for ${label}`}>
        <MenuItem disabled={!(key in sparse)} onClick={() => restoreProperty(key)}>Restore shared</MenuItem>
        {!required && <MenuItem disabled={sparse[key] === null} onClick={() => { update(key, undefined); setNumericDrafts(previous => { const next = { ...previous }; delete next[key]; if (key === "format") delete next.decimalPlaces; return next; }); }}>{clearLabel[key] ?? `Clear ${label.toLowerCase()} for this design`}</MenuItem>}
      </Menu>
    </div>}
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
  const focusRow = (key: string | undefined, menu = false) => requestAnimationFrame(() => {
    const row = key && form.current?.querySelector<HTMLElement>(`[data-choice-row="${CSS.escape(key)}"]`);
    (row ? row.querySelector<HTMLElement>(menu ? ".ui-menu__trigger" : "input:not([type='color']), textarea") : form.current?.querySelector<HTMLElement>("[data-add-choice]"))?.focus();
  });
  const moveChoice = (key: string, direction: number) => {
    const rows = [...choiceDraft.rows], index = rows.findIndex(row => row.key === key), target = index + direction;
    if (index < 0 || target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    changeChoices({ ...choiceDraft, rows }); focusRow(key, true);
  };
  const removeChoice = (key: string) => {
    const index = choiceDraft.rows.findIndex(row => row.key === key), rows = choiceDraft.rows.filter(row => row.key !== key);
    changeChoices({ ...choiceDraft, rows }); focusRow(rows[Math.min(index, rows.length - 1)]?.key);
  };
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
      focusError();
      return;
    }
    try {
      const acceptanceIssues = authoringContext ? validateFieldCandidate(authoringContext, candidate.field, candidate.override) : [];
      if (acceptanceIssues.length) { setError(acceptanceIssues[0].message); focusError(); return; }
      onSave(candidate.field, candidate.override); setNumericDrafts({}); applied.current = true; guard?.register(null); setError(null); setTechnical(null); focusCard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Configuration could not be applied.");
      focusError();
    }
  };

  return <form ref={form} onFocusCapture={ensureFocusedControlVisible} className="field-config-editor studio-field-inspector" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <p className="ui-visually-hidden" aria-live="polite">{localErrorAnnouncement}</p>
    <section className="studio-field-inspector__section" aria-labelledby="field-details-heading"><h3 id="field-details-heading" className="ui-visually-hidden">Field details</h3>
      <Input label="Label" value={draft.label ?? ""} onChange={(event) => { setDraft({ ...draft, label: event.target.value || undefined }); if (variant) setMetadata({ ...metadata, label: event.target.value || null }); }} />
      {variant && <div className="studio-field-property-state"><Status tone="neutral">{"label" in metadata ? metadata.label === null ? "Default label for this design" : "Overridden" : "Uses shared settings"}</Status><Menu label={<MoreHorizontal size={16} />} accessibleLabel="Label settings actions"><MenuItem disabled={!("label" in metadata)} onClick={() => { setMetadata((current) => { const next = { ...current }; delete next.label; return next; }); setDraft({ ...draft, label: inheritedField.label }); }}>Restore shared label</MenuItem></Menu></div>}
    </section>

    {!["color", "boolean", "date"].includes(draft.type) && <section className="studio-field-inspector__section" aria-labelledby="field-rules-heading"><h3 id="field-rules-heading">Rules</h3>
      {(draft.type === "text" || draft.type === "textarea") && <div className="studio-field-control-group"><div className="field-rules-two-column">{numberRule("maxCharacters", "Maximum characters")}{draft.type === "textarea" && numberRule("maxLines", "Maximum rendered lines")}</div>{draft.type === "textarea" && <details className="studio-field-secondary" open={warningOpen} onToggle={event => setWarningOpen(event.currentTarget.open)}><summary>Line warning{localErrors.warningAtLines && <span className="ui-field__error">Check setting</span>}</summary>{numberRule("warningAtLines", "Warn at rendered lines")}</details>}</div>}
      {draft.type === "image" && <div className="studio-field-control-group">{property("replacementPlacement", "image replacement behavior", <fieldset className="studio-field-choice-group"><legend>Image replacement behavior</legend><div className="studio-image-policies">{(["fill", "fit", "crop"] as const).map(mode => <label key={mode} className="ui-choice-line"><input type="radio" name={`replacement-placement-${draft.id}`} value={mode} checked={configuration.replacementPlacement === mode} onChange={() => update("replacementPlacement", mode)} /><span>{mode === "fill" ? "Fill" : mode === "fit" ? "Fit" : "Crop — custom host"}</span></label>)}</div><p className="ui-help-text">{configuration.replacementPlacement === "crop" ? "Studio uses Fill; framing requires a host crop tool." : configuration.replacementPlacement === "fit" ? "Show the complete image inside the area." : "Cover the image area; edges may be trimmed."}</p></fieldset>, true)}</div>}
      {draft.type === "number" && <div className="studio-field-control-group"><h4>Allowed values</h4><div className="field-rules-two-column">{numberRule("min", "Minimum")}{numberRule("max", "Maximum")}{numberRule("step", "Step")}</div></div>}
      {draft.type === "color" && <p>People can choose an opaque RGB color. Add choices below to suggest or restrict the available colors.</p>}
      {draft.type === "date" && <p>People choose a calendar date. The format below controls how it appears in the design.</p>}
      {draft.type === "boolean" && <p>When hidden, the connected group and its contents leave the layout. Surrounding Auto Layout content reflows automatically.</p>}
    </section>}

    {draft.type === "boolean" && <p className="studio-field-inspector__section">Hides this group and reflows the layout.</p>}
    {(draft.type === "number" || draft.type === "date") && <details className="studio-field-inspector__section studio-field-secondary" open={formatOpen} onToggle={event => setFormatOpen(event.currentTarget.open)}><summary><span>Display format</span><span className={Object.keys(localErrors).some(key => ["decimalPlaces", "format", "separator", "prefix", "suffix"].includes(key)) ? "ui-field__error" : "studio-field-summary-value"}>{Object.keys(localErrors).some(key => ["decimalPlaces", "format", "separator", "prefix", "suffix"].includes(key)) ? "Check settings" : displayExample}</span></summary>
      {draft.type === "number" ? property("format", "number format", <div className="studio-field-control-group"><div className="field-rules-two-column"><Input label="Prefix" value={format?.prefix as string ?? ""} onChange={(event) => numberFormat("prefix", event.target.value)} /><Input label="Suffix" value={format?.suffix as string ?? ""} onChange={(event) => numberFormat("suffix", event.target.value)} />{numericInput("decimalPlaces", "Decimal places", format?.decimalPlaces, value => numberFormat("decimalPlaces", value))}<Select label="Decimal separator" value={format?.decimalSeparator as string ?? "."} onChange={(event) => numberFormat("decimalSeparator", event.target.value)}><option value=".">Dot</option><option value=",">Comma</option></Select><Select label="Thousands separator" value={format?.thousandSeparator as string ?? ""} onChange={(event) => numberFormat("thousandSeparator", event.target.value || undefined)}><option value="">None</option><option value=".">Dot</option><option value=",">Comma</option><option value=" ">Space</option></Select></div></div>) : property("format", "date format", <div className="studio-field-control-group"><div className="field-rules-two-column"><Input label="Prefix" value={format?.prefix as string ?? ""} onChange={(event) => dateFormat("prefix", event.target.value)} /><Input label="Suffix" value={format?.suffix as string ?? ""} onChange={(event) => dateFormat("suffix", event.target.value)} /><Select label="Date display format" value={datePreset} onChange={(event) => dateFormat("preset", event.target.value)}><option value="iso">YYYY-MM-DD</option><option value="numeric-year-first">YYYY/MM/DD</option><option value="numeric-day-first">DD/MM/YYYY</option><option value="numeric-month-first">MM/DD/YYYY</option><option value="numeric-day-month">DD/MM</option><option value="numeric-month-day">MM/DD</option></Select>{datePreset !== "iso" && <Select label="Date separator" value={format?.separator as string ?? "/"} onChange={(event) => dateFormat("separator", event.target.value)}><option value="/">Slash</option><option value="-">Hyphen</option><option value=".">Dot</option></Select>}</div></div>)}
      <div className="studio-field-format-example"><span>{exampleSource ? `Default · ${exampleSource.design}` : "Example"}</span><strong>{displayExample}</strong></div>
    </details>}

    {hasChoices && <section className="studio-field-inspector__section studio-field-choices" aria-label="Choices configuration">
      <Toggle label="Choices" checked={choiceDraft.mode !== "none"} onChange={enabled => changeChoices(enabled ? seedChoiceDefaults({ ...choiceDraft, mode: lastChoiceMode.current }, draft, choiceSources, usedChoiceIds.current) : { ...choiceDraft, mode: "none" })} />
      {variant && <div className="studio-field-property-state"><Status tone="neutral">{"choices" in sparse ? sparse.choices === null ? "Disabled for this design" : "Overridden" : "Uses shared settings"}</Status><Menu label={<MoreHorizontal size={16} />} accessibleLabel="Choices settings actions"><MenuItem disabled={!("choices" in sparse)} onClick={inheritChoices}>Restore shared choices</MenuItem></Menu></div>}
      {choiceDraft.mode !== "none" && <div className="studio-field-disclosure__content">
      <Select label="Choice behavior" value={choiceDraft.mode} onChange={event => {
        const mode = event.target.value as ChoiceDraft["mode"];
        const next = { ...choiceDraft, mode };
        changeChoices(mode !== "none" && (choiceDraft.mode === "none" || mode === "restricted") ? seedChoiceDefaults(next, draft, choiceSources, usedChoiceIds.current) : next);
      }}><option value="suggested">Suggested values</option><option value="restricted">Options only</option></Select>
      <p>{choiceDraft.mode === "restricted" ? "Only these options are allowed; include imported defaults for Reset." : choiceDraft.mode === "suggested" ? "Offer presets alongside normal input." : "People enter values using the ordinary field control."}</p>

      {localErrors.choices && <p className="ui-field__error">{localErrors.choices}</p>}
      <div className="studio-choice-list">{choiceDraft.rows.map((row, index) => <fieldset className={`studio-field-choice${draft.type === "textarea" ? " studio-field-choice--multiline" : ""}`} data-choice-row={row.key} data-choice-id={row.id} key={row.key}><legend className="ui-visually-hidden">Choice {index + 1}</legend>
        <div className="studio-choice-value-row">
          {draft.type === "color" && <div className="studio-choice-color" data-invalid-color={!/^#[0-9a-f]{6}$/i.test(row.input) || undefined}><Input label="Choose option color" type="color" value={/^#[0-9a-f]{6}$/i.test(row.input) ? row.input : "#000000"} onChange={event => changeRow(row.key, { input: event.target.value })} />{!/^#[0-9a-f]{6}$/i.test(row.input) && <span className="studio-choice-color__invalid" aria-label="Invalid color">?</span>}</div>}
          {draft.type === "textarea" ? <Textarea label="Option value" value={row.input} error={choiceValidation.valueErrors[row.key]} onChange={event => changeRow(row.key, { input: event.target.value })} /> : <Input label="Option value" type={draft.type === "date" ? "date" : "text"} inputMode={draft.type === "number" ? "decimal" : undefined} value={row.input} error={choiceValidation.valueErrors[row.key]} onChange={event => changeRow(row.key, { input: event.target.value })} />}
          <Menu label={<MoreHorizontal size={18} />} accessibleLabel={`Actions for option ${index + 1}`}>
            <MenuItem disabled={index === 0} onClick={() => moveChoice(row.key, -1)}>Move up</MenuItem>
            <MenuItem disabled={index === choiceDraft.rows.length - 1} onClick={() => moveChoice(row.key, 1)}>Move down</MenuItem>
            <MenuItem onClick={() => setTechnical({ kind: "option", key: row.key })}>Edit option ID</MenuItem>
            <MenuItem destructive onClick={() => removeChoice(row.key)}>Remove</MenuItem>
          </Menu>
        </div>
        {row.label !== undefined || labelRows.has(row.key) ? <div className="studio-option-label"><Input label="Option label" placeholder="Optional label" value={row.label ?? ""} onChange={event => changeRow(row.key, { label: event.target.value || undefined })} /></div> : <Button size="small" variant="quiet" onClick={() => { setLabelRows(previous => new Set([...previous, row.key])); requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-choice-row="${CSS.escape(row.key)}"] .studio-option-label input`)?.focus()); }}><span className="studio-option-label-action">Add label</span></Button>}
        {choiceValidation.identityErrors[row.key] && <Button size="small" variant="quiet" className="studio-field-inspector__error" onClick={() => { setTechnical({ kind: "option", key: row.key }); requestAnimationFrame(() => detailsBody.current?.querySelector<HTMLElement>("input")?.focus()); }}>{choiceValidation.identityErrors[row.key]}</Button>}
      </fieldset>)}</div>
      <Button data-add-choice size="small" variant="secondary" onClick={() => changeChoices({ ...choiceDraft, rows: [...choiceDraft.rows, nextChoiceRow(choiceDraft.rows, usedChoiceIds.current)] })}>Add choice</Button>
    </div>}
    </section>}

    <div className="studio-field-technical-link"><Button size="small" variant="quiet" onClick={() => setTechnical({ kind: "field" })}>Technical details</Button></div>
    <SideDrawer initialFocusSelector={technical?.kind === "option" ? "input" : undefined} open={Boolean(technical) && !guard?.prompting} title={technical?.kind === "option" ? "Option identity" : "Technical details"} onClose={() => setTechnical(null)}>
      <div ref={detailsBody} className="studio-technical-content">
        {technical?.kind === "option" ? (() => { const row = choiceDraft.rows.find(row => row.key === technical.key); return row && <><p>Changing this ID disconnects existing selections.</p><Input label="Stable option ID" value={row.id} error={choiceValidation.identityErrors[row.key]} onChange={event => changeRow(row.key, { id: event.target.value })} /></>; })() : <>
          <div className="studio-field-id"><span>Field ID</span><code>{draft.id}</code><Button size="small" variant="quiet" onClick={() => { void navigator.clipboard.writeText(draft.id).then(() => setCopied(true)).catch(() => setError("Could not copy the field ID.")); }}>{copied ? "Copied" : "Copy ID"}</Button></div>
          <details className="studio-field-secondary"><summary>Host integration</summary><Input label="Control role (advanced)" value={draft.controlRole ?? ""} helpText="Optional presentation hint for custom editor hosts." onChange={event => { setDraft({ ...draft, controlRole: event.target.value || undefined }); if (variant) setMetadata({ ...metadata, controlRole: event.target.value || null }); }} />{variant && "controlRole" in metadata && <Button size="small" variant="quiet" onClick={() => { setMetadata(current => { const next = { ...current }; delete next.controlRole; return next; }); setDraft({ ...draft, controlRole: inheritedField.controlRole }); }}>Restore shared control role</Button>}</details>
        </>}
      </div>
    </SideDrawer>
    {localErrors.configuration && <p tabIndex={-1} className="studio-field-inspector__error">{localErrors.configuration}</p>}
    {error && <p tabIndex={-1} role="alert" className="studio-field-inspector__error">{error}</p>}
    {guard ? dirty && <footer className="studio-field-inspector__actions"><span aria-live="polite">{dirty ? "Unapplied changes" : "No changes"}</span><div><Button size="small" variant="secondary" disabled={!dirty} onClick={() => { reset(); guard.register(null); onCancel?.(); focusCard(); }}>Discard</Button><Button size="small" type="submit" disabled={!dirty || !valid}>Apply changes</Button></div></footer> : <Button type="submit" disabled={!valid}>Apply field configuration</Button>}
  </form>;
}
