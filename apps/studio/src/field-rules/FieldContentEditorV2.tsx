import { useEffect, useLayoutEffect, useRef, useState, type CompositionEvent } from "react";
import { canonicalTemplateFieldValueKeyV1, normalizeColorInputV1, isCalendarDateValueV1, formatTemplateNumberV1, formatTemplateCalendarDateV1, type ImageReplacementPlacementV1 } from "@sleinity/template-core";
import type { TemplateFieldControllerV2, TemplateFieldFamilyImageControllerV3, TemplateSessionV2MutationResult } from "@sleinity/template-browser/session";
import { Button, CheckboxField, Input, Select, Textarea, MediaInput } from "../components/ui";
import { acceptStudioTextInput, studioTextCounter } from "./studioTextLimits";
import { choiceValueLabel } from "./choiceAuthoring";
import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import { commitRenderedTextareaDraft, type RenderedTextareaOutcome } from "./renderedTextareaDrafts";
import { DeferredFieldDraftCoordinator } from "./deferredFieldDrafts";

export function FieldContentEditorV2({ controller, sessionIdentity, draftCoordinator, draftContext, variantPlacement, onPendingChange, compact = false, imageUrl, session, getCurrentController }: {
  imageUrl?: string;
  compact?: boolean;
  controller: TemplateFieldControllerV2;
  getCurrentController?: () => TemplateFieldControllerV2 | undefined;
  sessionIdentity?: object;
  draftCoordinator: DeferredFieldDraftCoordinator;
  draftContext: string;
  session: ReactTemplateFieldSessionV2;
  onPendingChange?: (id: string, pending: boolean) => void;
  variantPlacement?: ImageReplacementPlacementV1;
}) {
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const composing = useRef(false);
  const [isComposing, setIsComposing] = useState(false);
  const currentController = useRef(controller);
  currentController.current = controller;
  const compositionStart = useRef<{ input: string | null; value: string } | null>(null);
  const inputId = `field-content-${encodeURIComponent(draftContext)}-${encodeURIComponent(controller.id)}`;
  const draftKey = `${draftContext}:${controller.id}`;
  const context = useRef({ sessionIdentity, draftCoordinator, draftKey });
  if (context.current.sessionIdentity !== sessionIdentity || context.current.draftCoordinator !== draftCoordinator || context.current.draftKey !== draftKey) context.current = { sessionIdentity, draftCoordinator, draftKey };
  const mounted = useRef(false);
  const validationAbort = useRef(new AbortController());
  useLayoutEffect(() => {
    mounted.current = true;
    validationAbort.current = new AbortController();
    return () => { mounted.current = false; validationAbort.current.abort(); draftCoordinator.cancel(draftKey); };
  }, [sessionIdentity, draftCoordinator, draftKey]);
  const focus = () => document.getElementById(inputId)?.focus();
  const report = (result: TemplateSessionV2MutationResult) => {
    const accepted = result.accepted && !result.stale;
    setError(accepted ? null : result.stale ? "This control is no longer current. Try again." : result.blockingErrors.filter((issue) => issue.code !== "field-v2.max-characters").map((issue) => issue.message).join("\n") || null);
    if (accepted) setInput(null);
  };
  useEffect(() => { setInput(null); setError(null); composing.current = false; setIsComposing(false); compositionStart.current = null; return () => draftCoordinator.cancel(draftKey); }, [draftCoordinator, draftKey, sessionIdentity]);
  const field = controller;
  const rejectionMessage = (reason: "characters" | "lines" | "measurement-pending" | undefined) => reason === "lines"
    ? `Maximum of ${field.type === "textarea" ? field.configuration.maxLines : "the configured"} rendered lines reached.`
    : reason === "measurement-pending"
      ? "Wait for the preview to finish measuring before adding more text."
      : `Maximum of ${field.type === "text" || field.type === "textarea" ? field.configuration.maxCharacters : "the configured"} characters reached.`;
  const settle = (result: TemplateSessionV2MutationResult | RenderedTextareaOutcome) => {
    if (!("disposition" in result)) { report(result); return; }
    if (result.disposition === "canceled" && result.accepted) return;
    if (result.accepted) {
      setInput(null); setError(null); setLimitNotice(result.notice ?? null);
      if (result.disposition === "restored") focus();
    } else setError(result.blockingErrors?.map(issue => issue.message).join("\n") || "This text could not be applied.");
  };
  const mutate = (action: () => TemplateSessionV2MutationResult) => {
    void draftCoordinator.runMutation(action).then(report).catch(cause => { if (mounted.current) setError(String(cause)); });
  };
  const edit = (value: string, previousValue?: string, previousInput?: string | null, beforeComposition?: string) => {
    if (field.type === "text" || field.type === "textarea") {
      const previous = previousValue ?? input ?? field.value;
      const constrained = acceptStudioTextInput(previous, value, field.configuration.maxCharacters);
      if (!constrained.accepted) {
        setInput(previousInput === undefined ? input : previousInput);
        setLimitNotice(rejectionMessage("characters"));
        return "characters" as const;
      }
      setLimitNotice(null);
    }
    setInput(value);
    if (field.type === "text" || field.type === "textarea" || field.type === "date" || field.type === "number" || field.type === "color") {
      const parsed = Number(value);
      const valid = field.type === "number" ? value.trim() !== "" && Number.isFinite(parsed) : field.type === "date" ? isCalendarDateValueV1(value) : field.type === "color" ? normalizeColorInputV1(value) !== null : true;
      if (!valid) setError(field.type === "number" ? "Enter a complete number." : field.type === "color" ? "Enter a color such as #E5B2FF." : "Enter a complete date.");
      else setError(null);
      let committed: TemplateSessionV2MutationResult | RenderedTextareaOutcome | undefined;
      const captured = context.current;
      const signal = validationAbort.current.signal;
      draftCoordinator.schedule(draftKey, {
        valid,
        focus,
        commit: async () => {
          if (!mounted.current || context.current !== captured) return { accepted: false, stale: true };
          if (field.type === "textarea" && field.configuration.maxLines !== undefined) {
            committed = await draftCoordinator.withProvisional(() => commitRenderedTextareaDraft({ session, fieldId: field.id, value, beforeComposition, signal, isCurrent: () => mounted.current && context.current === captured }));
            return committed;
          }
          const result = field.type === "number" ? field.setValue(parsed) : field.type === "color" ? field.setValue(normalizeColorInputV1(value)!) : field.setValue(value);
          committed = result;
          return result;
        },
        onSettled: () => { if (committed) settle(committed); },
        onFailure: setError,
      });
    }
    return true;
  };
  const choices = "choices" in field.configuration ? field.configuration.choices : undefined;
  const restricted = choices?.mode === "restricted";
  const selectedChoice = choices?.options.find(option =>
    (field.selectedChoiceId === undefined || option.id === field.selectedChoiceId) &&
    canonicalTemplateFieldValueKeyV1(option.value) === canonicalTemplateFieldValueKeyV1(field.value as string | number));
  const validation = field.renderValidation;
  const renderedLineMaximumReached = field.type === "textarea" &&
    field.configuration.maxLines !== undefined &&
    validation.state === "valid" &&
    validation.visualLines >= field.configuration.maxLines;
  const maximumLineMessage = renderedLineMaximumReached
    ? `Maximum of ${field.configuration.maxLines} rendered lines reached.`
    : null;
  const displayedLimitNotice = limitNotice ?? maximumLineMessage;
  const textValue = field.type === "text" || field.type === "textarea" ? input ?? field.value : "";
  const counter = field.type === "text" || field.type === "textarea" ? studioTextCounter(textValue, field.configuration.maxCharacters) : null;
  const counterAdornment = counter ? <span
    className={`field-editor-input__counter ${counter.state === "warning" ? "field-editor-input__counter--warning" : counter.state === "maximum" ? "field-editor-input__counter--maximum" : ""}`}
    data-multiline={field.type === "textarea" || undefined}
    data-state={counter.state}
    role="status"
    aria-label={`${counter.count}${counter.maximum === undefined ? " characters" : ` of ${counter.maximum} characters`}${counter.state === "maximum" ? ", maximum reached" : counter.state === "warning" ? ", approaching maximum" : ""}`}
  >{counter.count}{counter.maximum === undefined ? "" : ` / ${counter.maximum}`}</span> : undefined;
  const compositionProps = field.type === "text" || field.type === "textarea" ? {
    onCompositionStart: () => {
      composing.current = true; setIsComposing(true);
      draftCoordinator.schedule(draftKey, { valid: false, composing: true, focus, commit: () => ({ accepted: false }) });
      compositionStart.current = { input, value: input ?? field.value };
    },
    onCompositionEnd: (event: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      composing.current = false; setIsComposing(false);
      const start = compositionStart.current ?? { input, value: input ?? field.value };
      compositionStart.current = null;
      const result = edit(event.currentTarget.value, start.value, start.input, start.value);
      if (result !== true) {
        if (start.value === field.value) draftCoordinator.cancel(draftKey);
        else edit(start.value, start.value, start.input);
        setInput(start.input);
        setLimitNotice(rejectionMessage(result));
      }
    },
  } : {};
  const onTextChange = (value: string) => {
    if (composing.current) {
      setInput(value);
      setLimitNotice(null);
      return;
    }
    edit(value);
  };
  const reset = () => {
    const captured = context.current;
    let result: TemplateSessionV2MutationResult | undefined;
    draftCoordinator.schedule(draftKey, { valid: true, focus,
      commit: () => {
        if (!mounted.current || context.current !== captured) return { accepted: false, stale: true };
        const current = getCurrentController ? getCurrentController() : currentController.current;
        if (!current) return { accepted: false, stale: true };
        result = current.reset(); return result;
      },
      onSettled: () => {
        if (!result || !mounted.current || context.current !== captured) return;
        report(result);
        if (result.accepted && !result.stale) { setLimitNotice(null); onPendingChange?.(`${field.id}:crop`, false); setResetCount(value => value + 1); focus(); }
      }, onFailure: setError,
    });
    void draftCoordinator.flushKey(draftKey);
  };
  const fieldMessages = [...new Set([
    ...field.blockingErrors.filter(issue => issue.code !== "field-v2.max-characters").map(issue => issue.message),
    ...(validation.state === "invalid" ? validation.errors.map(issue => issue.message) : []),
  ])];
  return <section className="v2-content" aria-label={`Edit ${field.label}`}>
    {compact ? <div className="studio-output-field-heading">{field.type === "boolean" ? <CheckboxField id={inputId} label={field.label} checked={field.value} onChange={value => mutate(() => field.setValue(value))} /> : <span>{field.label}</span>}<Button size="small" variant="quiet" aria-label={`Reset ${field.label}`} onClick={reset}>Reset</Button></div> : <h3>{field.label}</h3>}
    {!restricted && field.type === "text" && <Input id={inputId} label={field.label} value={textValue} className="field-editor-input__control" controlAdornment={counterAdornment} {...compositionProps} onChange={(event) => onTextChange(event.target.value)} />}
    {!restricted && field.type === "textarea" && <Textarea id={inputId} label={field.label} value={textValue} className="field-editor-input__control" controlAdornment={counterAdornment} {...compositionProps} onChange={(event) => onTextChange(event.target.value)} />}
    {!restricted && field.type === "number" && <Input id={inputId} label={field.label} type="text" inputMode="decimal" value={input ?? String(field.value)} helpText={field.configuration.format ? `Preview: ${formatTemplateNumberV1(field.value, field.configuration.format)}` : undefined} onChange={(event) => edit(event.target.value)} />}
    {!restricted && field.type === "date" && <div className="studio-output-date"><Input id={inputId} label={field.label} type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={input ?? field.value} helpText={field.configuration.format ? `Preview: ${formatTemplateCalendarDateV1(field.value, field.configuration.format)}` : undefined} onChange={event => edit(event.target.value)} /><Input label={`Choose ${field.label}`} aria-label={`Choose ${field.label}`} type="date" value={isCalendarDateValueV1(input ?? field.value) ? input ?? field.value : ""} onChange={event => { if (event.target.value) edit(event.target.value); }} /></div>}
    {!restricted && field.type === "color" && <div className="studio-output-color" data-invalid={!normalizeColorInputV1(input ?? field.value) || undefined}><Input label={`Choose ${field.label}`} aria-label={`Choose ${field.label}`} type="color" value={normalizeColorInputV1(input ?? field.value) ?? field.value} onChange={event => edit(event.target.value)} /><Input id={inputId} label={field.label} value={input ?? field.value} spellCheck={false} onChange={event => edit(event.target.value)} /></div>}
    {field.type === "boolean" && !compact && <label className="v2-check"><input type="checkbox" checked={field.value} onChange={(event) => { const value = event.target.checked; mutate(() => field.setValue(value)); }} />{field.label} visible</label>}
    {field.type === "image" && <ImageContentEditorV2 key={resetCount} sessionIdentity={sessionIdentity} compact={compact} inputId={inputId} imageUrl={imageUrl} field={field} report={report} runMutation={action => draftCoordinator.runMutation(action)} variantPlacement={variantPlacement} onFailure={setError} onPending={(pending) => onPendingChange?.(`${field.id}:replacement`, pending)} onCropPending={(pending) => onPendingChange?.(`${field.id}:crop`, pending)} />}
    {choices && "selectChoice" in field && <>
      <Select id={restricted ? inputId : `${inputId}-choices`} label={`${field.label} choices`} disabled={isComposing} value={selectedChoice?.id ?? ""} helpText={restricted ? "Select one of the configured values." : "Choose a suggestion or enter your own value above."} onChange={event => {
        const choiceId = event.target.value;
        if (!choiceId || composing.current) return;
        const option = choices.options.find(candidate => candidate.id === choiceId);
        if (option && (field.type === "text" || field.type === "textarea")) {
          const previous = input ?? field.value;
          const constrained = acceptStudioTextInput(previous, String(option.value), field.configuration.maxCharacters);
          if (!constrained.accepted) { setLimitNotice(rejectionMessage(constrained.reason ?? "characters")); return; }
        }
        setLimitNotice(null);
        let result: TemplateSessionV2MutationResult | RenderedTextareaOutcome | undefined;
        const signal = validationAbort.current.signal;
        const selectionContext = context.current;
        // Supersede this field’s draft, including invalid input, while serializing
        // behind any running commit. The coordinator rejects abandoned generations.
        draftCoordinator.schedule(draftKey, {
          valid: true, focus,
          commit: async () => {
            if (!mounted.current || context.current !== selectionContext) return { accepted: false, stale: true };
            const current = getCurrentController ? getCurrentController() : currentController.current;
            if (!current || !("selectChoice" in current)) return { accepted: false, stale: true };
            result = current.type === "textarea" && current.configuration.maxLines !== undefined
              ? await draftCoordinator.withProvisional(() => commitRenderedTextareaDraft({ session, fieldId: field.id, choiceId, signal, isCurrent: () => mounted.current && context.current === selectionContext }))
              : current.selectChoice(choiceId);
            return result;
          },
          onSettled: () => { if (result && mounted.current && context.current === selectionContext) settle(result); }, onFailure: message => { if (mounted.current && context.current === selectionContext) setError(message); },
        });
        void draftCoordinator.flushKey(draftKey);
      }}><option value="" disabled>{restricted ? "Choose a value" : "Custom value"}</option>{choices.options.map(option => <option key={option.id} value={option.id}>{option.label || choiceValueLabel(field, option.value)}</option>)}</Select>
      {restricted && !selectedChoice && <p role="alert">Current value: {choiceValueLabel(field, field.value as string | number)}. Select a configured value to continue.</p>}
      {field.type === "color" && <p className="studio-choice-color-value"><span aria-hidden="true" style={{ display: "inline-block", width: 16, height: 16, backgroundColor: field.value, border: "1px solid currentColor", marginRight: 8 }} />{field.value}</p>}
    </>}
    <div role="status" aria-live="polite">
      {validation.state === "inactive" && <p>{compact ? "Hidden in this design." : "Inactive — excluded from layout"}</p>}
      {!compact && (validation.state === "valid" || validation.state === "invalid") && <p>{validation.visualLines}{field.type === "textarea" && field.configuration.maxLines !== undefined ? ` / ${field.configuration.maxLines}` : ""} rendered lines · {validation.state}</p>}
      {!error && fieldMessages.length > 0 && <p className="ui-field__error">{fieldMessages[0]}</p>}
      {!error && !fieldMessages.length && [...new Set([...field.warnings, ...(validation.state === "valid" ? validation.warnings : [])].filter(issue => !["field-v2.warning-characters", "field-v2.warning-lines"].includes(issue.code)).map(issue => issue.message))].map(message => <p key={message} className="ui-field__warning">{message}</p>)}
    </div>
    {counter?.maximum !== undefined && counter.count > counter.maximum && <p role="alert">This value exceeds the {counter.maximum}-character maximum. Shorten it to continue.</p>}
    {displayedLimitNotice && <p className="field-editor-input__limit--maximum" role="status">{displayedLimitNotice}</p>}
    {error && <p role="alert">{error}</p>}
    {!compact && <Button variant="secondary" onClick={reset}>Reset {field.label}</Button>}
  </section>;
}

function ImageContentEditorV2({ field, report, variantPlacement, onPending, onFailure, onCropPending, compact, imageUrl, inputId, sessionIdentity, runMutation }: {
  compact: boolean; imageUrl?: string; inputId?: string; onCropPending(value: boolean): void;
  sessionIdentity?: object;
  runMutation<T>(action: () => T | Promise<T>): Promise<T>;
  onPending(value: boolean): void; onFailure(message: string): void;
  field: Extract<TemplateFieldControllerV2, { type: "image" }>;
  report(result: TemplateSessionV2MutationResult): void;
  variantPlacement?: ImageReplacementPlacementV1;
}) {
  const [scope, setScope] = useState<"shared" | "variant">("shared");
  const [region, setRegion] = useState(() => {
    const transform = field.value.placement.mode === "crop" ? field.value.placement.crop.transform : null;
    return transform ? { x: transform[0][2], y: transform[1][2], width: transform[0][0], height: transform[1][1] } : { x: 0, y: 0, width: 1, height: 1 };
  });
  const acceptedRegion = useRef(region);
  const [cropDirty, setCropDirty] = useState(false);
  const [reading, setReading] = useState(false);
  const work = useRef(0);
  useLayoutEffect(() => {
    work.current += 1;
    setReading(false);
    return () => { work.current += 1; onPending(false); onCropPending(false); };
  }, [sessionIdentity]);
  const familyField = "setVariantPlacement" in field ? field as TemplateFieldFamilyImageControllerV3 : null;
  const replacementPolicy = field.configuration.replacementPlacement;
  const placement = (): ImageReplacementPlacementV1 => ({ mode: "crop", crop: {
    schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source",
    transform: [[region.width, 0, region.x], [0, region.height, region.y]],
  } });
  const apply = (value: ImageReplacementPlacementV1) => {
    void runMutation(() => scope === "variant" && familyField ? familyField.setVariantPlacement(value) : field.setPlacement(value)).then(result => {
      report(result);
      if (result.accepted) { acceptedRegion.current = region; setCropDirty(false); onCropPending(false); }
    }).catch(cause => onFailure(String(cause)));
  };
  const replace = (file: File | undefined) => {
    if (!file) return;
    const token = ++work.current;
    onPending(true); setReading(true);
    void runMutation(() => field.replaceImage({ blob: file })).then(result => { if (work.current === token) report(result); }).catch(cause => { if (work.current === token) onFailure(String(cause)); }).finally(() => { if (work.current === token) { onPending(false); setReading(false); } });
  };
  return <>
    {compact ? <MediaInput id={inputId} label={null} inputAriaLabel={`Replace ${field.label}`} previewSrc={imageUrl} actionLabel="Replace image" accept="image/*" loading={reading} disabled={cropDirty} onSelect={replace} /> : <Input label={`Replace ${field.label}`} type="file" accept="image/*" onChange={(event) => {
      const file = event.target.files?.[0]; if (!file) return;
      replace(file);
      event.target.value = "";
    }} />}
    {!compact && <p>{`Current placement: ${field.value.placement.mode}. Replacement changes the shared image and clears variant framing.`}</p>}
    {familyField && !compact && <>
      <Select label="Framing scope" disabled={cropDirty} value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="shared">Shared/default framing</option><option value="variant">This variant only</option></Select>
      <p>{variantPlacement ? `Variant override: ${variantPlacement.mode}` : "Inheriting shared/default placement"}</p>
      <Button variant="quiet" onClick={() => { void runMutation(() => familyField.resetVariantPlacement()).then(report).catch(cause => onFailure(String(cause))); }}>Reset variant placement</Button>
    </>}
    {!compact && replacementPolicy === "crop" && <details open><summary>Adjust crop</summary><fieldset><legend>Crop source region</legend>
      <p>Normalized source coordinates (0–1). The live preview uses the ordinary SDK crop renderer. Adjust framing, then apply.</p>
      <div className="v2-grid">{(["x", "y", "width", "height"] as const).map((key) => <Input key={key} label={`Crop ${key}`} type="number" step="0.01" value={region[key]}
        onChange={(event) => { setRegion({ ...region, [key]: event.target.valueAsNumber }); setCropDirty(true); onCropPending(true); }} />)}</div>
      <Button variant="secondary" disabled={field.value.placement.mode === "imported"} onClick={() => apply(placement())}>Apply Crop</Button>
      {cropDirty && <><p role="status">Unapplied crop changes</p><Button variant="quiet" onClick={() => { setRegion(acceptedRegion.current); setCropDirty(false); onCropPending(false); }}>Cancel crop changes</Button></>}
    </fieldset></details>}
  </>;
}
