import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Upload } from "lucide-react";
import { validateTemplatePackageV2, type TemplatePackageV2, type TemplatePackageV1 } from "@sleinity/template-core";
import type { TemplateReimportPlanV2 } from "@sleinity/template-browser/importer";
import { useTemplateFieldSessionV2Snapshot, type ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import { AppShell, Button, ConnectedList, ConnectedListItem, Input, PageContent, PageFooter, PageHeader, PageWorkspace, Select, SideDrawer } from "../components/ui";
import { FontPreparationStep } from "../components/template-package/fonts/FontPreparationStep";
import { FamilyFontPreparationPanel } from "../components/template-family/FamilyFontPreparationPanel";
import type { TemplateFamilyV1, TemplateFieldFamilyV2 } from "@sleinity/template-core/family";
import { appendSetupSources, mutateSetupFamily, readSource, studioVariantDisplayLabels, type SetupFamilyMutation, type SetupSource } from "./setupSources";
import { readSetupSourceBatch, SetupSourceOwnership } from "./setupSourceOwnership";
import { SetupFields, type SetupFieldCorrectionTarget } from "./SetupFields";
import { DesignThumbnail } from "./DesignThumbnail";
import { SetupPreview, SetupPreviewPanel } from "./SetupPreview";
import { SetupValidationWorkbench, type SetupIssue } from "./SetupValidationWorkbench";
import { createSetupQualityReport } from "./setupQualityReport";
import { createSetupInspection } from "./setupInspection";
import { FamilySelectionMatrixV2 } from "./FamilySelectionMatrixV2";
import "./studioSetup.css";
import { SetupEditGuard, useSetupEditGuard } from "./SetupEditGuard";
import { SetupActionGroup, SetupNotice, SetupOutcome, SetupSection } from "./SetupPagePrimitives";

export const STUDIO_SETUP_STEPS = ["Designs", "Fonts", "Checks", "Fields", "Review"] as const;
const STEP_GUIDANCE = [
  "Add the exported designs to include in this template.",
  "Prepare the fonts so text matches the intended design.",
  "Find out what needs fixing or reviewing before saving.",
  "Set how people edit the template. Field order becomes the editor order.",
  "Confirm the details and save your reusable template.",
];
const message = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);
const fieldTypeLabel = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const acceptedStateSignature = (session: ReactTemplateFieldSessionV2 | null, name: string, description: string) => {
  const snapshot = session?.getSnapshot();
  return JSON.stringify({ name, description, configuration: snapshot ? "family" in snapshot ? snapshot.family : snapshot.basePackage : null }, (key, value) => key === "stableUrl" ? undefined : value);
};

function StudioSetupWizardContent({ onCancel, onSaved, initial, persist, navigationGuard, transitionBusy = false }: {
  onCancel(): void; onSaved(): void;
  navigationGuard?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  initial?: { session: ReactTemplateFieldSessionV2; sources: SetupSource[]; name: string; description?: string };
  persist?: (session: ReactTemplateFieldSessionV2, metadata: { name: string; description: string }) => Promise<unknown>;
  transitionBusy?: boolean;
}) {
  const fieldEdits = useSetupEditGuard()!;
  const [step, setStep] = useState(0);
  const restoreInspection = useRef<(() => void) | null>(null);
  const goStep = async (next: number) => { if (fieldEdits.dirty && !await fieldEdits.request()) return; if (step === 2 || step === 4) restoreInspection.current?.(); setStep(next); };
  const [sources, setSources] = useState<SetupSource[]>(initial?.sources ?? []);
  const [session, setSession] = useState<ReactTemplateFieldSessionV2 | null>(initial?.session ?? null);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fontBusy, setFontBusy] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [sourceDragActive, setSourceDragActive] = useState(false);
  const [pendingAdditions, setPendingAdditions] = useState<SetupSource[]>([]);
  const [pendingAdditionAssignments, setPendingAdditionAssignments] = useState<Record<string, Record<string, string>>>({});
  const [matrixDraftPending, setMatrixDraftPending] = useState(false);
  const [familyPreviewOpen, setFamilyPreviewOpen] = useState(false);
  const sessionRef = useRef(session);
  const sourceInput = useRef<HTMLInputElement>(null);
  sessionRef.current = session;
  const generation = useRef(0);
  const [importOwners] = useState(() => new SetupSourceOwnership());
  const readImportSource: typeof readSource = async (file, sourceId) => {
    const token = generation.current;
    const source = await readSource(file, sourceId);
    if (token !== generation.current) { source.dispose?.(); throw new Error("Import was cancelled."); }
    return importOwners.track(source);
  };
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null);
  const [checksComplete, setChecksComplete] = useState(false);
  const lifecycle = useRef(0);
  const baseline = useRef(acceptedStateSignature(initial?.session ?? null, initial?.name ?? "", initial?.description ?? ""));
  const dirty = acceptedStateSignature(session, name, description) !== baseline.current;
  const hasUnsavedSetup = dirty || matrixDraftPending;
  const pendingBusy = busy || fontBusy;
  useEffect(() => {
    const lease = ++lifecycle.current;
    return () => { generation.current += 1; const current = sessionRef.current; queueMicrotask(() => { if (lifecycle.current === lease) { try { current?.dispose(); } finally { importOwners.dispose(); } } }); };
  }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (hasUnsavedSetup || pendingBusy) event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [pendingBusy, hasUnsavedSetup]);
  useEffect(() => { content.current?.scrollTo(0, 0); heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (!navigationGuard) return;
    navigationGuard.current = async () => { if (fieldEdits.dirty && !await fieldEdits.request()) return false; const allowed = !pendingBusy && (!(hasUnsavedSetup || acceptedStateSignature(sessionRef.current, name, description) !== baseline.current) || window.confirm("Leave setup without saving these changes?")); if (allowed) restoreInspection.current?.(); return allowed; };
    return () => { navigationGuard.current = null; };
  }, [navigationGuard, hasUnsavedSetup, pendingBusy, fieldEdits.dirty, fieldEdits.request]);
  const saved = () => { if (navigationGuard) navigationGuard.current = null; onSaved(); };
  const leave = async () => {
    if (fieldEdits.dirty && !await fieldEdits.request()) return;
    restoreInspection.current?.();
    if (navigationGuard) { onCancel(); return; }
    if (!(hasUnsavedSetup || acceptedStateSignature(sessionRef.current, name, description) !== baseline.current) || window.confirm("Leave setup without saving these changes?")) onCancel();
  };
  const invalidate = () => setEpoch((current) => current + 1);
  const addFiles = async (files: File[]) => {
    if (!files.length || pendingBusy) return;
    const token = ++generation.current;
    setBusy(true); setError(null);
    let added: SetupSource[] = [];
    let retained = false;
    try {
      added = await readSetupSourceBatch(files, readImportSource, importOwners, () => generation.current === token);
      const currentSnapshot = sessionRef.current?.getSnapshot();
      const configuredFamily = currentSnapshot && "family" in currentSnapshot
        ? currentSnapshot.family
        : null;
      if (configuredFamily?.variantGroups?.length) {
        importOwners.release(pendingAdditions);
        setPendingAdditions(added);
        setPendingAdditionAssignments(Object.fromEntries(added.map((source) => [source.id, {}])));
        retained = true;
        return;
      }
      const next = appendSetupSources(sessionRef.current, sources, added, name || added[0].packageValue.name);
      const previous = sessionRef.current;
      sessionRef.current = next;
      setSession(next);
      setSources((current) => [...current, ...added]);
      retained = true;
      if (!name) setName(added[0].packageValue.name);
      invalidate();
      previous?.dispose();
    } catch (cause) { if (!retained) importOwners.release(added); if (generation.current === token) setError(message(cause)); }
    finally { if (generation.current === token) setBusy(false); }
  };
  const acceptPendingAdditions = () => {
    if (!pendingAdditions.length || pendingBusy) return;
    const active = sessionRef.current;
    setBusy(true); setError(null);
    try {
      const next = appendSetupSources(
        active,
        sources,
        pendingAdditions,
        name || pendingAdditions[0].packageValue.name,
        pendingAdditionAssignments,
      );
      sessionRef.current = next;
      setSession(next);
      setSources((current) => [...current, ...pendingAdditions]);
      setPendingAdditions([]);
      setPendingAdditionAssignments({});
      active?.dispose();
      invalidate();
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };
  const acceptFonts = (source: SetupSource, fonts: TemplatePackageV1) => {
    // Font helper output has no authority over V2 fields, bindings, or source nodes.
    const packageValue = { ...source.packageValue, assets: { ...source.packageValue.assets, ...Object.fromEntries(Object.entries(fonts.assets).filter(([, asset]) => asset.type === "font")) }, fontRequirements: fonts.fontRequirements };
    const active = sessionRef.current;
    if (!active) return;
    try {
      // Existing reimport owns field retention/order. A font panel never rebuilds a family.
      if ("selectVariant" in active) {
        const previous = active.getSnapshot().selectedVariantId;
        active.selectVariant(source.id);
        try {
          const plan = active.planVariantReimport(packageValue);
          if (!plan.canApply || plan.removedFieldIds.length) throw new Error("Font preparation requires a source review in Designs.");
          active.applyVariantReimport(plan);
        } finally { if (previous && previous !== source.id) active.selectVariant(previous); }
      } else {
        const plan = active.planReimport(packageValue);
        if (!plan.canApply || plan.removedFieldIds.length) throw new Error("Font preparation requires a source review in Designs.");
        active.applyReimport(plan);
      }
      setSources((current) => current.map((entry) => entry.id === source.id ? { ...entry, packageValue } : entry));
      invalidate(); setError(null);
    } catch (cause) { setError(message(cause)); }
  };
  const applyFamilyMutation = (mutation: SetupFamilyMutation) => {
    const active = sessionRef.current;
    if (!active || pendingBusy) return false;
    setBusy(true); setError(null);
    try {
      const result = mutateSetupFamily(active, sources, mutation);
      sessionRef.current = result.session; setSession(result.session); setSources(result.sources);
      try { active.dispose(); } finally { importOwners.releaseRemoved(sources, result.sources); }
      if (mutation.type === "remove" && replaceTargetId === mutation.variantId) setReplaceTargetId(null);
      invalidate();
      return true;
    } catch (cause) { setError(message(cause)); return false; }
    finally { setBusy(false); }
  };
  const activeSnapshot = session?.getSnapshot();
  const activeFamily = activeSnapshot && "family" in activeSnapshot ? activeSnapshot.family : null;
  const selectedVariantId = activeSnapshot && "selectedVariantId" in activeSnapshot ? activeSnapshot.selectedVariantId : null;
  const selectedFamilyVariant = activeFamily?.variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const acceptedStepReady = [
    Boolean(session && activeSnapshot?.status === "ready"),
    Boolean(activeSnapshot && (activeSnapshot.readiness.fonts === "ready" || activeSnapshot.readiness.fonts === "not-required")),
    checksComplete,
    Boolean(activeSnapshot && !fieldEdits.dirty && !activeSnapshot.fields.some((field) => field.blockingErrors.length)),
    false,
  ];
  const requestReplace = (variantId: string) => {
    if (session && "selectVariant" in session && selectedVariantId !== variantId) session.selectVariant(variantId);
    setReplaceTargetId(variantId);
  };
  const packagePanel = <section aria-label="Source packages" className="studio-setup-stack studio-designs-page">
    <input ref={sourceInput} className="ui-visually-hidden" aria-label="Import source packages" type="file"
      accept={import.meta.env.DEV ? ".zip,.json" : ".zip"} multiple disabled={pendingBusy || transitionBusy}
      onChange={(event) => { const files = [...event.target.files ?? []]; event.target.value = ""; void addFiles(files); }} />
    {sources.length === 0 ? <button type="button" className="setup-package-dropzone" data-active={sourceDragActive || undefined}
      disabled={pendingBusy || transitionBusy} onClick={() => sourceInput.current?.click()}
      onDragEnter={(event) => { event.preventDefault(); if (!pendingBusy && !transitionBusy) setSourceDragActive(true); }}
      onDragOver={(event) => { event.preventDefault(); if (!pendingBusy && !transitionBusy) { event.dataTransfer.dropEffect = "copy"; setSourceDragActive(true); } }}
      onDragLeave={(event) => { const next = event.relatedTarget; if (!(next instanceof Node) || !event.currentTarget.contains(next)) setSourceDragActive(false); }}
      onDrop={(event) => { event.preventDefault(); setSourceDragActive(false); if (!pendingBusy && !transitionBusy) void addFiles([...event.dataTransfer.files]); }}>
      <span className="setup-package-dropzone__icon"><Upload size={20} aria-hidden="true" /></span>
      <strong>Choose ZIP files</strong>
      <span>Or drop exported design ZIP files here</span>
    </button> : null}
    {pendingBusy && <SetupNotice role="status">Reading designs…</SetupNotice>}
    {sources.length === 1 && <SetupSection
      title="Included designs"
      meta={<span className="ui-metadata">1 design</span>}
      actions={<Button size="small" variant="secondary" onClick={() => sourceInput.current?.click()}>Add designs</Button>}
    >
      <ConnectedList label="Included designs" className="studio-single-source"><ConnectedListItem className="studio-single-source__row"><DesignThumbnail packageValue={sources[0].packageValue} /><div className="studio-single-source__identity"><strong>{sources[0].packageValue.name}</strong><span className="ui-metadata">{sources[0].packageValue.canvas.width} × {sources[0].packageValue.canvas.height} · {sources[0].packageValue.editableFields.length} editable fields</span></div><div className="studio-single-source__actions"><Button size="small" variant="quiet" onClick={() => setFamilyPreviewOpen(true)}>Preview</Button><Button size="small" variant="quiet" onClick={() => requestReplace(sources[0].id)}>Replace</Button></div></ConnectedListItem></ConnectedList>
    </SetupSection>}
    {sources.length > 1 && activeFamily ? <section className="studio-family-workspace">
      <FamilySelectionMatrixV2
        family={activeFamily}
        sources={sources}
        selectedVariantId={selectedVariantId}
        disabled={pendingBusy || transitionBusy}
        onChange={(family) => applyFamilyMutation({ type: "selection-metadata", family })}
        onSelectVariant={(variantId) => { if (session && "selectVariant" in session) session.selectVariant(variantId); }}
        onPreviewVariant={(variantId) => {
          if (session && "selectVariant" in session) session.selectVariant(variantId);
          setFamilyPreviewOpen(true);
        }}
        onRenameVariant={(variantId, label) => applyFamilyMutation({ type: "rename", variantId, label })}
        onMoveVariant={(variantId, targetIndex) => applyFamilyMutation({ type: "move", variantId, targetIndex })}
        onReplaceVariant={requestReplace}
        onRemoveVariant={(variantId) => applyFamilyMutation({ type: "remove", variantId })}
        onAddVariant={() => sourceInput.current?.click()}
        onDraftStateChange={setMatrixDraftPending}
        pendingSources={pendingAdditions}
        pendingAssignments={pendingAdditionAssignments}
        onPendingAssignment={(sourceId, groupId, optionId) => setPendingAdditionAssignments((current) => ({
          ...current,
          [sourceId]: { ...current[sourceId], [groupId]: optionId },
        }))}
        onAcceptPending={acceptPendingAdditions}
        onCancelPending={() => { importOwners.release(pendingAdditions); setPendingAdditions([]); setPendingAdditionAssignments({}); }}
      />
    </section> : null}
  </section>;
  return <div aria-busy={transitionBusy || pendingBusy} {...(transitionBusy ? { inert: true } : {})}><fieldset className="studio-transition-controls" disabled={transitionBusy || pendingBusy}><AppShell className="studio-setup" navigation={<div className="setup-navigation">
    <Button variant="quiet" leadingIcon={<ArrowLeft size={16} />} onClick={leave} disabled={pendingBusy}>Back to Library</Button>
    <ol className="setup-navigation__steps">{STUDIO_SETUP_STEPS.map((label, index) => <li key={label}>
      <button type="button" className="setup-navigation__step" aria-current={step === index ? "step" : undefined}
        aria-label={label}
        disabled={pendingBusy || transitionBusy || matrixDraftPending || (index > 0 && !session)} onClick={() => goStep(index)}>
        <span className="setup-navigation__number">{index < step && acceptedStepReady[index] ? <Check size={14} aria-label="Completed" /> : index + 1}</span>{label}
      </button>
    </li>)}</ol>
  </div>}>
    <PageWorkspace className="setup-flow"><PageHeader className="setup-header"><div>
      <h1 ref={heading} tabIndex={-1} className="setup-header__title">{STUDIO_SETUP_STEPS[step]}</h1><p className="ui-page-description">{STEP_GUIDANCE[step]}</p>
    </div></PageHeader>
    <PageContent className="setup-flow__content" ref={content}>
      {error && <p role="alert">{error}</p>}
      {session ? <AcceptedSetup footerHost={footerHost} editingExisting={Boolean(initial) && !(initial && !("selectVariant" in initial.session) && "selectVariant" in session)} onChecksComplete={setChecksComplete} session={session} sources={sources} step={step} navigate={goStep} restoreInspection={restoreInspection} epoch={epoch}
        name={name} description={description} onNameChange={setName} onDescriptionChange={setDescription} packagePanel={packagePanel} onFonts={acceptFonts} onAccepted={invalidate}
        onReplace={(source) => "selectVariant" in session && applyFamilyMutation({ type: "replace", variantId: source.id, source })}
        readImportSource={readImportSource} releaseSources={(sources) => importOwners.release(sources)} onSourcesChange={(next) => { setSources(next); importOwners.releaseRemoved(sources, next); }} replaceTargetId={replaceTargetId} onClearReplace={() => setReplaceTargetId(null)} onSaved={saved} persist={persist} promoted={Boolean(initial && !("selectVariant" in initial.session) && "selectVariant" in session)} busy={pendingBusy} setBusy={setBusy} fontBusyChange={setFontBusy} /> : <div className="studio-setup-workspace" data-layout="single"><div className="studio-setup-main">{packagePanel}</div></div>}
    </PageContent>
    <PageFooter ref={setFooterHost} id="studio-setup-footer" className="setup-flow__footer">{step < 4 && <>
      <Button variant="secondary" disabled={pendingBusy || step === 0} onClick={() => goStep(step - 1)}>Back</Button>
      <span className="studio-footer-guidance" role="status">{pendingBusy ? "Finish the current operation to continue." : matrixDraftPending ? "Apply or discard the design selection changes to continue." : !session ? "Add a design to continue." : ""}</span><Button disabled={!session || pendingBusy || matrixDraftPending} onClick={() => goStep(step + 1)}>{["Continue to fonts", "Continue to checks", "Continue to fields", "Continue to review"][step]}</Button>
    </>}</PageFooter>
    </PageWorkspace>
  </AppShell></fieldset>
    <SideDrawer
      open={familyPreviewOpen && Boolean(selectedFamilyVariant || sources[0])}
      title={selectedFamilyVariant?.label ?? selectedFamilyVariant?.packageValue.name ?? "Design details"}
      description="Inspect this design before continuing."
      onClose={() => setFamilyPreviewOpen(false)}
    >
      {session && (selectedFamilyVariant || sources[0]) ? <SetupPreview
        session={session}
        width={(selectedFamilyVariant?.packageValue ?? sources[0].packageValue).canvas.width}
        height={(selectedFamilyVariant?.packageValue ?? sources[0].packageValue).canvas.height}
      /> : null}
    </SideDrawer>
  </div>;
}

type Check = { ready: boolean; reasons: readonly string[]; quality: ReturnType<typeof createSetupQualityReport> };
function AcceptedSetup({ readImportSource, releaseSources, footerHost, editingExisting, onChecksComplete, restoreInspection, session, sources, step, navigate, epoch, name, description, onNameChange, onDescriptionChange, packagePanel, onFonts, onAccepted, onReplace, onSourcesChange, replaceTargetId, onClearReplace, onSaved, busy, setBusy, fontBusyChange, persist, promoted }: {
  footerHost: HTMLElement | null; editingExisting: boolean; onChecksComplete(value: boolean): void;
  session: ReactTemplateFieldSessionV2; sources: SetupSource[]; step: number; navigate(step: number): void; epoch: number;
  name: string; description: string; packagePanel: React.ReactNode; onFonts(source: SetupSource, value: TemplatePackageV1): void;
  onNameChange(value: string): void; onDescriptionChange(value: string): void;
  persist?: (session: ReactTemplateFieldSessionV2, metadata: { name: string; description: string }) => Promise<unknown>; promoted: boolean;
  readImportSource: typeof readSource;
  releaseSources(sources: readonly SetupSource[]): void;
  onAccepted(): void; onReplace(source: SetupSource): boolean; onSourcesChange(sources: SetupSource[]): void; onSaved(): void; busy: boolean; setBusy(value: boolean): void; fontBusyChange(value: boolean): void;
  replaceTargetId: string | null; onClearReplace(): void;
  restoreInspection: React.MutableRefObject<(() => void) | null>;
}) {
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checks, setChecks] = useState<{ epoch: string; values: Record<string, Check> }>({ epoch: "", values: {} });
  const [queue, setQueue] = useState<string[]>([]);
  const [review, setReview] = useState<{ source: SetupSource; plan: TemplateReimportPlanV2; revision: number; targetId: string; epoch: number } | null>(null);
  const [removeReviewed, setRemoveReviewed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<SetupFieldCorrectionTarget | null>(null);
  const [fieldMobileView, setFieldMobileView] = useState<"fields" | "preview">("fields");
  const correctionKey = useRef(0);
  const operation = useRef(0);
  const reviewSource = useRef<SetupSource | null>(null);
  const releaseReviewSources = useRef(releaseSources);
  releaseReviewSources.current = releaseSources;
  const clearReview = useCallback(() => {
    const source = reviewSource.current;
    reviewSource.current = null;
    if (source) releaseReviewSources.current([source]);
    setReview(null);
  }, []);
  const inspection = useMemo(() => createSetupInspection(session), [session]);
  const checkGeneration = useRef(inspection.generation());
  const cancelCheck = useCallback(() => { setQueue([]); inspection.restore(); }, [inspection]);
  const inspectVariant = useCallback((id: string) => { if (!queue.length) inspection.inspect(id); }, [inspection, queue.length]);
  useLayoutEffect(() => { restoreInspection.current = cancelCheck; return () => { restoreInspection.current = null; inspection.restore(); }; }, [restoreInspection, cancelCheck, inspection]);
  const family = "family" in snapshot ? snapshot.family : null;
  const selectedId = "selectedVariantId" in snapshot ? snapshot.selectedVariantId! : sources[0].id;
  const variantDisplayLabels = useMemo(() => family ? studioVariantDisplayLabels(family.variants, sources) : {}, [family, sources]);
  const packageValue = "basePackage" in snapshot ? snapshot.basePackage : snapshot.effectivePackage;
  const resolvedField = (family?.fields ?? packageValue?.editableFields ?? []).some((field) => field.id === selectedField)
    ? selectedField : (family?.editableFieldOrder ?? packageValue?.editableFieldOrder)?.[0] ?? null;
  const sourceValidation = useMemo(() => packageValue ? validateTemplatePackageV2(packageValue) : null, [packageValue]);
  const checkEpoch = `${epoch}:${snapshot.contentState?.revision ?? 0}`;
  const checked = String(checks.epoch) === checkEpoch ? checks.values : {};
  const allReady = sources.every((source) => checked[source.id]?.ready) && snapshot.readiness.exportReady && Boolean(sourceValidation?.valid);
  useEffect(() => { onChecksComplete(sources.every(source => Boolean(checked[source.id])) && allReady); }, [allReady, checks, checkEpoch, sources, onChecksComplete]);
  const fieldEdits = useSetupEditGuard()!;
  const selectVariant = async (id: string) => {
    if (fieldEdits.dirty && !await fieldEdits.request()) return false;
    operation.current += 1; clearReview(); setRemoveReviewed(false);
    setQueue([]); inspection.select(id);
    return true;
  };
  useEffect(() => { cancelCheck(); clearReview(); operation.current += 1; }, [epoch, session, cancelCheck, clearReview]);
  useLayoutEffect(() => { if (step !== 2 && step !== 4 && !queue.length && selectedId) inspection.select(selectedId); }, [step, selectedId, inspection, queue.length]);
  useEffect(() => {
    operation.current += 1; clearReview();
    setRemoveReviewed(false);
  }, [replaceTargetId, epoch, step, clearReview]);
  useEffect(() => () => { operation.current += 1; const source = reviewSource.current; reviewSource.current = null; if (source) releaseReviewSources.current([source]); }, []);
  useEffect(() => {
    if (session.getSnapshot() !== snapshot) return;
    const readiness = snapshot.readiness;
    // Preserve per-variant checks only within this accepted configuration epoch.
    // Pending evidence is never treated as a successful check.
    const next: Check = { ready: readiness.exportReady && Boolean(sourceValidation?.valid), reasons: readiness.reasons, quality: createSetupQualityReport(snapshot, sourceValidation) };
    setChecks((previous) => {
      const values = previous.epoch === checkEpoch ? previous.values : {};
      if (JSON.stringify(values[selectedId]) === JSON.stringify(next)) return previous.epoch === checkEpoch ? previous : { epoch: checkEpoch, values };
      return { epoch: checkEpoch, values: { ...values, [selectedId]: next } };
    });
    if (queue[0] === selectedId && checkGeneration.current === inspection.generation() && readiness.state !== "pending" && readiness.state !== "idle") {
      const remaining = queue.slice(1);
      setQueue(remaining);
      if (remaining[0]) inspection.inspect(remaining[0]);
      else inspection.restore();
    }
  }, [snapshot.readiness, sourceValidation?.valid, selectedId, epoch, queue, session]);
  useEffect(() => {
    if (!queue.length) return;
    // Timeout ends the UI operation; it never manufactures renderer readiness.
    const timer = window.setTimeout(() => { cancelCheck(); setNotice("This design is still being prepared. Review its issues and check again."); }, 30000);
    return () => window.clearTimeout(timer);
  }, [queue]);
  const checkVariants = (ids: string[]) => {
    setNotice(null);
    inspection.restore();
    checkGeneration.current = inspection.generation();
    setQueue(ids);
    if (ids[0]) inspection.inspect(ids[0]);
  };
  const checkAll = () => checkVariants(sources.map(source => source.id));
  useEffect(() => {
    if (step !== 4 || busy || queue.length) return;
    const unchecked = sources.filter((source) => checked[source.id] === undefined).map((source) => source.id);
    if (!unchecked.length) return;
    checkVariants(unchecked);
  }, [step, busy, queue.length, sources, checked, selectedId, session]);
  const quality = useMemo(() => createSetupQualityReport(snapshot, sourceValidation), [snapshot, sourceValidation]);
  const save = async () => {
    if (!allReady || !name.trim() || busy || queue.length) return;
    inspection.restore();
    if (!session.getSnapshot().readiness.exportReady) return;
    setBusy(true); setError(null);
    try { await (persist ? persist(session, { name, description }) : session.save({ name, description })); setSaveFailed(false); onSaved(); }
    catch (cause) { setSaveFailed(true); setError(message(cause)); }
    finally { setBusy(false); }
  };
  useEffect(() => { setNotice(null); }, [step]);
  const layoutMode = step === 2 ? "investigation" : step === 3 ? "configuration" : step === 4 ? "summary" : "single";
  return <div className="studio-setup-workspace" data-layout={layoutMode} data-fields-mobile-view={step === 3 ? fieldMobileView : undefined}>
    {step === 4 && <SetupOutcome role="status" title={queue.length ? "Checking designs…" : notice ? "Checks could not finish" : allReady ? "Ready to save" : "Checks need attention"} tone={queue.length ? "neutral" : allReady ? "ready" : "attention"}
      actions={!allReady && !queue.length ? <SetupActionGroup><Button variant="secondary" onClick={checkAll} disabled={busy}>Check again</Button><Button variant="quiet" onClick={() => navigate(2)}>Review issues</Button></SetupActionGroup> : undefined}>{notice && <p>{notice}</p>}</SetupOutcome>}
    {step === 3 && <div className="studio-fields-mobile-switch" aria-label="Fields page view"><Button size="small" variant={fieldMobileView === "fields" ? "primary" : "secondary"} aria-pressed={fieldMobileView === "fields"} onClick={() => setFieldMobileView("fields")}>Settings</Button><Button size="small" variant={fieldMobileView === "preview" ? "primary" : "secondary"} aria-pressed={fieldMobileView === "preview"} onClick={() => setFieldMobileView("preview")}>Preview</Button></div>}
    <div className="studio-setup-main" data-fields-region="configuration">
      {error && <SetupNotice tone="blocked">{error}</SetupNotice>}
      <div hidden={step !== 0}>{packagePanel}
        {replaceTargetId ? <section className="studio-setup-stack"><h2 className="ui-subsection-title">Replace {sources.find((source) => source.id === replaceTargetId)?.packageValue.name ?? "design"}</h2>
          <Input label="Replace source package" type="file" accept={import.meta.env.DEV ? ".zip,.json" : ".zip"} disabled={busy || Boolean(queue.length)} onChange={(event) => {
            const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
            clearReview();
            const token = ++operation.current; const revision = session.getSnapshot().operationRevision; const sourceId = replaceTargetId;
            void readImportSource(file, sourceId).then((source) => {
              if (operation.current !== token || session.getSnapshot().operationRevision !== revision) { releaseSources([source]); return; }
              reviewSource.current = source;
              if ("selectVariant" in session && session.getSnapshot().selectedVariantId !== sourceId) session.selectVariant(sourceId);
              const plan = "selectVariant" in session ? session.planVariantReimport(source.packageValue) : session.planReimport(source.packageValue);
              setReview({ source: { ...source, id: sourceId }, plan, revision, targetId: sourceId, epoch }); setRemoveReviewed(false); setError(null);
            }).catch((cause) => { if (operation.current === token) { clearReview(); setError(message(cause)); } });
          }} />
          {review?.targetId === replaceTargetId && review.epoch === epoch && <><p>Review source changes before applying. Retained fields keep their accepted configuration.</p>
            <ul>{review.plan.fieldChanges.map((change) => <li key={change.fieldId}>{change.fieldId}: {change.status}</li>)}</ul>
            {review.plan.diagnostics.map((issue, index) => <p key={index}>{issue.message}</p>)}
            {review.plan.removedFieldIds.length > 0 && <label className="ui-choice-line"><input type="checkbox" checked={removeReviewed} onChange={(event) => setRemoveReviewed(event.target.checked)} />I reviewed removal of these fields and their content.</label>}
            <Button disabled={!review.plan.canApply || (review.plan.removedFieldIds.length > 0 && !removeReviewed)} onClick={() => {
              try {
                if (review.targetId !== replaceTargetId || review.epoch !== epoch || session.getSnapshot().operationRevision !== review.revision) throw new Error("Setup changed. Review this replacement again.");
                if ("selectVariant" in session) { if (!onReplace(review.source)) return; }
                else { session.applyReimport(review.plan, { removedFieldDisposition: "discard" }); onSourcesChange(sources.map((source) => source.id === review.source.id ? review.source : source)); onAccepted(); }
                reviewSource.current = null; // Accepted source remains owned by the parent editor.
                setReview(null); onClearReplace();
              } catch (cause) { setError(message(cause)); }
            }}>Apply reviewed replacement</Button><Button variant="quiet" onClick={() => { operation.current += 1; clearReview(); onClearReplace(); }}>Cancel replacement</Button>
          </>}
          {(!review || review.targetId !== replaceTargetId || review.epoch !== epoch) ? <Button variant="quiet" onClick={() => { operation.current += 1; clearReview(); onClearReplace(); }}>Cancel replacement</Button> : null}
        </section> : null}
      </div>
      <section hidden={step !== 1} aria-label="Font preparation" className="studio-setup-stack studio-fonts-page">
        {step === 1 && packageValue && <div className="studio-font-evidence" aria-hidden="true" inert>
          <SetupPreview session={session} width={packageValue.canvas.width} height={packageValue.canvas.height} showControls={false} />
        </div>}
        <SetupOutcome
          title={snapshot.readiness.fonts === "not-required" ? "No fonts required" : snapshot.readiness.fonts === "ready" ? "All required fonts are available" : "Fonts need attention"}
          tone={snapshot.readiness.fonts === "ready" || snapshot.readiness.fonts === "not-required" ? "ready" : "attention"}
        />
        {family ? <SavedFamilyFonts family={family} sources={sources} onFonts={onFonts} /> : sources.map((source) => <div key={source.id}>
          {sources.length > 1 && <h2 className="ui-subsection-title">{source.packageValue.name}</h2>}
          <SavedSourceFonts source={source} onFonts={onFonts} onBusy={fontBusyChange} />
        </div>)}
      </section>
      {step === 2 && <SetupValidationWorkbench session={session} quality={quality} selectedVariantId={selectedId} checked={checked} checking={queue[0]}
        family={family?.variants.map((variant) => ({ id: variant.id, label: variantDisplayLabels[variant.id] ?? variant.label ?? variant.packageValue.name }))} onSelectVariant={selectVariant} onInspectVariant={inspectVariant} checkFailure={notice} onCheckAll={checkAll} onCheckCurrent={() => checkVariants([selectedId])} onCancelCheck={cancelCheck}
        onOpenOwner={(issue) => {
          cancelCheck();
          if (issue.variantId) inspection.select(issue.variantId);
          if (issue.owner === "fields" && issue.fieldId) {
            setSelectedField(issue.fieldId);
            setCorrectionTarget({ key: ++correctionKey.current, fieldId: issue.fieldId, variantId: issue.variantId, scope: issue.configurationScope ?? "common" });
          }
          navigate(issue.owner === "fields" ? 3 : issue.owner === "fonts" ? 1 : 0);
        }} />}
      <div hidden={step !== 3}><SetupFields session={session} active={step === 3} onSelectVariant={selectVariant} selected={resolvedField} correctionTarget={correctionTarget} onCorrectionHandled={() => setCorrectionTarget(null)} onSelect={setSelectedField} onAccepted={onAccepted} /></div>
      {step === 4 && <section aria-label="Template summary" className="studio-setup-stack studio-review-page">
        <SetupSection>
          <Input label="Template name" value={name} required autoFocus={!name} error={name.trim() ? undefined : "Enter a template name."} disabled={busy} onChange={(event) => onNameChange(event.target.value)} />

        </SetupSection>
        <SetupSection title="Readiness summary">
          <ConnectedList className="studio-review-summary" label="Template readiness summary">
          <ConnectedListItem className="studio-review-summary__row"><div><h3>Designs</h3><p>{sources.length} {sources.length === 1 ? "design included" : "designs included"}{family?.variantGroups?.length ? ` · ${family.variantGroups.length} ${family.variantGroups.length === 1 ? "selector" : "selectors"}` : ""}</p></div><Button variant="quiet" size="small" onClick={() => navigate(0)}>Edit designs</Button></ConnectedListItem>
          <ConnectedListItem className="studio-review-summary__row"><div><h3>Fields</h3><p>{family?.fields.length ?? packageValue?.editableFields.length ?? 0} editable fields</p></div><Button variant="quiet" size="small" onClick={() => navigate(3)}>Edit field settings</Button></ConnectedListItem>
          <ConnectedListItem className="studio-review-summary__row" tone={snapshot.readiness.fonts === "ready" || snapshot.readiness.fonts === "not-required" ? "neutral" : "attention"}><div><h3>Fonts</h3><p>{snapshot.readiness.fonts === "ready" ? "All required fonts are available" : snapshot.readiness.fonts === "not-required" ? "No font files required" : "Fonts require attention"}</p></div><Button variant="quiet" size="small" onClick={() => navigate(1)}>Review fonts</Button></ConnectedListItem>
          <ConnectedListItem className="studio-review-summary__row" tone={allReady ? "neutral" : "attention"}><div><h3>Checks</h3><p>{sources.filter(source => Boolean(checked[source.id])).length} of {sources.length} designs checked{allReady ? " · Current" : ""}</p></div><Button variant="quiet" size="small" onClick={() => navigate(2)}>Review checks</Button></ConnectedListItem>
          </ConnectedList>

        </SetupSection>

        {Object.values(checked).some(check => check.quality?.report.issues.some(issue => issue.severity === "warning")) && <SetupNotice title="Warnings remain" tone="attention" actions={<Button variant="quiet" size="small" onClick={() => navigate(2)}>Review warnings</Button>}><p>{allReady ? "They do not prevent saving." : "Review their impact before saving."}</p></SetupNotice>}
        {footerHost && createPortal(<><Button variant="secondary" disabled={busy} onClick={() => navigate(3)}>Back</Button><span className="studio-footer-guidance" role="status">{!name.trim() ? "Enter a template name to save." : queue.length ? "Checking designs…" : !allReady ? "Resolve outstanding issues before saving." : "Ready to save"}</span><Button disabled={!allReady || !name.trim() || busy || Boolean(queue.length)} onClick={() => void save()}>{busy ? "Saving…" : saveFailed ? "Retry save" : promoted ? "Save as new template" : editingExisting ? "Save changes" : "Save template"}</Button></>, footerHost)}
      </section>}
    </div>
    {(step === 3 || step === 4) && <SetupPreviewPanel mode={step === 3 ? "workspace" : "summary"}
      selector={step === 4 && family ? <Select label="Preview design" value={selectedId} disabled={busy || Boolean(queue.length)} onChange={event => void selectVariant(event.target.value)}>
        {family.variants.map(variant => <option key={variant.id} value={variant.id}>{variantDisplayLabels[variant.id] ?? variant.label ?? variant.id}</option>)}
      </Select> : family ? <p className="ui-metadata">{variantDisplayLabels[selectedId] ?? family.variants.find(variant => variant.id === selectedId)?.label}</p> : undefined}>
      {packageValue && <SetupPreview session={session} width={packageValue.canvas.width} height={packageValue.canvas.height}
        highlightNodeId={step === 3 ? packageValue.editableFields.find(field => field.id === resolvedField)?.binding.nodeId : undefined} />}
    </SetupPreviewPanel>}

  </div>;
}

function SavedSourceFonts({ source, onFonts, onBusy }: { source: SetupSource; onFonts(source: SetupSource, value: TemplatePackageV1): void; onBusy(busy: boolean): void }) {
  const projection = useMemo(() => {
    if (source.packageValue.schemaVersion === "1.0") return source.packageValue;
    const { editableFields: _fields, editableFieldOrder: _order, ...sourceOnly } = source.packageValue as TemplatePackageV2;
    return { ...sourceOnly, schemaVersion: "1.0" } as TemplatePackageV1;
  }, [source.packageValue]);
  return <FontPreparationStep packageValue={projection} onPackageChange={(value) => onFonts(source, value)} onBusyChange={onBusy} />;
}

function SavedFamilyFonts({ family, sources, onFonts }: { family: TemplateFieldFamilyV2; sources: SetupSource[]; onFonts(source: SetupSource, value: TemplatePackageV1): void }) {
  const projection = useMemo(() => ({
    schemaVersion: "template-family-v1",
    id: family.id,
    title: family.title,
    fields: [],
    variantGroups: [],
    variants: family.variants.map((variant) => {
      const { editableFields: _fields, editableFieldOrder: _order, ...sourceOnly } = variant.packageValue;
      return { id: variant.id, title: variant.label ?? variant.packageValue.name, packageValue: { ...sourceOnly, schemaVersion: "1.0", editableFields: [] }, source: { type: "package-zip", sourceName: sources.find((source) => source.id === variant.id)?.name }, bindings: [], ruleOverrides: {}, groupAssignments: {} };
    }),
  }) as unknown as TemplateFamilyV1, [family, sources]);
  return <FamilyFontPreparationPanel compact family={projection} onFamilyChange={(next) => {
    for (const variant of next.variants) {
      const source = sources.find((candidate) => candidate.id === variant.id);
      if (source) onFonts(source, variant.packageValue);
    }
  }} />;
}

export function StudioSetupWizard(props: Parameters<typeof StudioSetupWizardContent>[0]) {
  return <SetupEditGuard><StudioSetupWizardContent {...props} /></SetupEditGuard>;
}
