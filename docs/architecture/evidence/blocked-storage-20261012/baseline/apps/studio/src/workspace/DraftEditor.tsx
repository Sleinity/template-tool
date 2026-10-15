import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft } from "lucide-react";
import { getTemplateFieldFamilyVariantSelectionV2, resolveTemplateFieldFamilyEditorControlsV2, resolveTemplateFieldFamilySelectionV2 } from "@sleinity/template-core/family";
import { TemplateRecoveryCleanupError, SupersededTemplateRecoveryError, type TemplateRecoveryLease } from "@sleinity/template-browser/persistence";
import { resolvePackageAssetSource } from "@sleinity/template-core/assets";
import { measureRenderedTextLines } from "@sleinity/template-browser";
import { useTemplateFieldSessionV2Snapshot, type ReactTemplateFieldSessionV2, type TemplateFieldSessionRendererV2Handle } from "@sleinity/template-react";
import { EditorLayout } from "../components/EditorLayout";
import { AppShell, PageWorkspace, PageHeader, PageContent, Alert, Button, PreviewWorkspace, Select, Status, WorkspaceSidePanel } from "../components/ui";
import { FieldContentEditorV2 } from "../field-rules/FieldContentEditorV2";
import { DeferredFieldDraftCoordinator, STUDIO_FIELD_DRAFT_DELAY_MS, waitForCanonicalExportReadiness } from "../field-rules/deferredFieldDrafts";
import { studioVariantDisplayLabels } from "../setup/setupSources";
import { SetupPreview, previewTargetState } from "../setup/SetupPreview";
import "../setup/studioSetup.css";
import "./outputEditor.css";
import { createStudioAutosave } from "./draftAutosave";
import { studioRecords, type StudioRecord } from "./studioRecords";

export function DraftEditor({ session, record, lease, onExported, onBack, guard, transitionBusy = false }: { session: ReactTemplateFieldSessionV2; record: StudioRecord; lease: TemplateRecoveryLease; onExported(): void; onBack(): void; guard: React.MutableRefObject<(() => Promise<boolean>) | null>; transitionBusy?: boolean }) {
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
  const [exporting, setExporting] = useState(false);
  const [cleanupRequired, setCleanupRequired] = useState(false);
  const [superseded, setSuperseded] = useState(false);
  const locked = useRef(false);
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<"content" | "preview">("content");
  const [tablet, setTablet] = useState(() => window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const changed = () => setTablet(media.matches);
    media.addEventListener("change", changed); return () => media.removeEventListener("change", changed);
  }, []);
  const [pendingSelections, setPendingSelections] = useState<Record<string, string> | null>(null);
  const selectionPending = useRef(false);
  selectionPending.current = Boolean(pendingSelections);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const draftCoordinator = useMemo(() => new DeferredFieldDraftCoordinator(STUDIO_FIELD_DRAFT_DELAY_MS), [session]);
  useEffect(() => () => draftCoordinator.dispose(), [session, draftCoordinator]);
  const pending = useRef(new Set<string>());
  const pendingChanged = useCallback((id: string, value: boolean) => { if (value) pending.current.add(id); else pending.current.delete(id); setPendingCount(pending.current.size); }, []);
  const renderer = useRef<TemplateFieldSessionRendererV2Handle>(null);
  const measurementRoot = useRef<HTMLDivElement | null>(null);
  const setMeasurementRoot = useCallback((root: HTMLDivElement | null) => { measurementRoot.current = root; }, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const [autosave] = useState(() => createStudioAutosave<StudioRecord>((value) => studioRecords.recovery.save(lease, value), setStatus));
  const signature = `${snapshot.contentState?.revision}:${"selectedVariantId" in snapshot ? snapshot.selectedVariantId : ""}`;
  const previous = useRef(signature);
  useEffect(() => {
    if (previous.current === signature) return;
    previous.current = signature;
    try { autosave.schedule(studioRecords.capture(session, record, record)); }
    catch (cause) { setError(String(cause)); }
  }, [signature, session, record, autosave]);
  useEffect(() => {
    autosave.activate();
    guard.current = async () => {
      if (locked.current) return false;
      try {
        if (!await studioRecords.recovery.isCurrent(lease)) { setSuperseded(true); autosave.dispose(); return true; }
        if (selectionPending.current) { setWorkspaceView("content"); setSelectionMessage("Choose an available design or restore the current design before leaving."); return false; }
        const flushed = await draftCoordinator.flush();
        if (!flushed.accepted || pending.current.size) { setWorkspaceView("content"); draftCoordinator.focusFirstInvalid(); return false; }
        const current = session.getSnapshot();
        const accepted = `${current.contentState?.revision}:${"selectedVariantId" in current ? current.selectedVariantId : ""}`;
        if (previous.current !== accepted) { previous.current = accepted; autosave.schedule(studioRecords.capture(session, record, record)); }
        await autosave.flush(); return true;
      } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); return false; }
    };
    const unload = (event: BeforeUnloadEvent) => { if (autosave.dirty() || draftCoordinator.dirty || pending.current.size) event.preventDefault(); };
    window.addEventListener("beforeunload", unload);
    return () => { guard.current = null; autosave.dispose(); draftCoordinator.dispose(); window.removeEventListener("beforeunload", unload); };
  }, [autosave, draftCoordinator, guard]);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    let alive = true;
    const check = () => { void studioRecords.recovery.isCurrent(lease).then(current => {
      if (alive && !current && !locked.current) { setSuperseded(true); autosave.dispose(); draftCoordinator.dispose(); }
    }).catch(() => {}); };
    window.addEventListener("focus", check);
    const timer = window.setInterval(check, 2000);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", check); };
  }, [lease, autosave, draftCoordinator]);
  const packageValue = "basePackage" in snapshot ? snapshot.basePackage : snapshot.effectivePackage;
  const family = "family" in snapshot ? snapshot.family : null;
  const variantDisplayLabels = useMemo(() => family ? studioVariantDisplayLabels(family.variants) : {}, [family]);
  const variantId = "selectedVariantId" in snapshot ? snapshot.selectedVariantId : null;
  const familySelection = family && variantId ? getTemplateFieldFamilyVariantSelectionV2(family, variantId) : null;
  const displayedSelections = pendingSelections ?? familySelection?.groupSelections ?? {};
  useEffect(() => {
    setPendingSelections(null);
    setSelectionMessage(null);
  }, [family?.id, variantId]);
  const controllers = session.getFieldControllers();
  const activeDefinition = packageValue?.editableFields.find(field => field.id === activeFieldId);
  useEffect(() => { if (activeFieldId && !activeDefinition) setActiveFieldId(null); }, [activeFieldId, activeDefinition]);
  const focusField = (id?: string) => {
    setWorkspaceView("content");
    if (id) setActiveFieldId(id);
    requestAnimationFrame(() => {
      const field = [...document.querySelectorAll<HTMLElement>("[data-output-field]")].find(el => el.dataset.outputField === id);
      const input = field?.querySelector<HTMLElement>('textarea,input:not([type="color"]):not([type="date"]):not([type="file"]),select') ?? field?.querySelector<HTMLElement>('input[type="file"],button');
      field?.scrollIntoView({ block: "nearest" }); input?.focus();
    });
  };
  const controlOrder = family ? resolveTemplateFieldFamilyEditorControlsV2(family, packageValue?.editableFieldOrder) : controllers.map((controller) => ({ kind: "field" as const, fieldId: controller.id }));
  const blockedField = snapshot.fields.find(field => field.blockingErrors.length || field.renderValidation.state === "invalid");
  const readinessReasons = snapshot.readiness.reasons;
  const run = async (action: () => Promise<unknown>) => { try { if (locked.current) return; if (!await studioRecords.recovery.isCurrent(lease)) { setSuperseded(true); throw new SupersededTemplateRecoveryError(); } setError(null); await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } };
  const flushDrafts = async () => {
    const hadDrafts = draftCoordinator.dirty;
    const result = await draftCoordinator.flush();
    if (!result.accepted) { setWorkspaceView("content"); draftCoordinator.focusFirstInvalid(); return false; }
    if (hadDrafts) {
      const current = session.getSnapshot();
      previous.current = `${current.contentState?.revision}:${"selectedVariantId" in current ? current.selectedVariantId : ""}`;
      autosave.schedule(studioRecords.capture(session, record, record));
    }
    return true;
  };
  const exportOutput = async () => {
    if (locked.current) return;
    locked.current = true; setExporting(true); setError(null);
    try {
      if (!await flushDrafts() || pending.current.size) { locked.current = false; return; }
      // Explicit capture: React effects are not a persistence boundary.
      autosave.schedule(studioRecords.capture(session, record, record));
      await autosave.flush();
      await studioRecords.recovery.exportAndComplete(lease, async () => {
        await waitForCanonicalExportReadiness(session);
        if (!renderer.current) throw new Error("Preview is unavailable.");
        return renderer.current.exportPng();
      });
      autosave.dispose(); onExported();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      if (cause instanceof TemplateRecoveryCleanupError) { autosave.dispose(); setCleanupRequired(true); return; }
    } finally {
      // Successful export with failed cleanup must never restart autosave or export again.
      setExporting(false);
    }
    locked.current = false;
  };
  const toolbar = <div className="studio-output-header">
    <div className="workspace-toolbar studio-draft-toolbar">
      <Button variant="quiet" leadingIcon={<ArrowLeft size={16} />} onClick={() => void run(async () => { if (!await flushDrafts()) return; await autosave.flush(); onBack(); })}>Back to Library</Button>
      <div className="studio-draft-toolbar__identity"><h1 ref={heading} tabIndex={-1} className="ui-section-title">{record.name}</h1></div>
      <DraftSaveStatus coordinator={draftCoordinator} status={status} pendingCount={pendingCount} acceptedPending={previous.current !== signature || autosave.dirty() || Boolean(pendingSelections)} onCheckInput={() => { setWorkspaceView("content"); requestAnimationFrame(() => draftCoordinator.focusFirstInvalid()); }} />
      {status.startsWith("Save failed") && <DraftSaveRetry coordinator={draftCoordinator} pendingCount={pendingCount} onRetry={() => void run(async () => { if (await flushDrafts()) await autosave.flush(); })} />}
      <div className="studio-draft-toolbar__actions"><DraftExportControl coordinator={draftCoordinator} pendingCount={pendingCount} pendingSelection={Boolean(pendingSelections)} ready={snapshot.readiness.exportReady} reasons={readinessReasons} exporting={exporting} onCheckInput={() => { setWorkspaceView("content"); requestAnimationFrame(() => draftCoordinator.focusFirstInvalid()); }} onInspect={blockedField ? () => focusField(blockedField.descriptor.id) : undefined} onExport={() => void exportOutput()} /></div>
    </div>
    <div className="studio-output-tabs" role="tablist" aria-label="Workspace view">
      {(["content", "preview"] as const).map(view => <Button key={view} role="tab" aria-selected={workspaceView === view} variant={workspaceView === view ? "primary" : "secondary"} size="small" onClick={() => setWorkspaceView(view)} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "content" : event.key === "End" ? "preview" : workspaceView === "content" ? "preview" : "content"; setWorkspaceView(next); (event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next === "content" ? 0 : 1])?.focus(); } }} tabIndex={workspaceView === view ? 0 : -1}>{view === "content" ? "Content" : "Preview"}</Button>)}
    </div>
  </div>;
  const panel = <WorkspaceSidePanel className="workspace-panel" header={<div><h2 className="ui-section-title">Content</h2>{record.description ? <p className="ui-supporting-copy">{record.description}</p> : null}</div>}>
    {error || snapshot.error ? <Alert tone="blocked" title="Draft needs attention">{error ?? snapshot.error?.message}</Alert> : null}
    {pendingSelections ? <Alert tone="attention" title="Choose an available design"><p>{selectionMessage}</p><Button size="small" variant="secondary" onClick={() => { setPendingSelections(null); setSelectionMessage(null); }}>Restore current design</Button></Alert> : null}
    <div className="studio-draft-fields">{controlOrder.map((control) => {
      if (control.kind === "direct-variant-selector" && family && "selectVariant" in session) return <Select key="variant-selector" label="Design" value={variantId ?? ""} onChange={(event) => { const next = event.target.value; void run(async () => { if (!await flushDrafts() || pending.current.size) return; session.selectVariant(next); }); }}>{family.variants.map((variant) => <option key={variant.id} value={variant.id}>{variantDisplayLabels[variant.id] ?? variant.label ?? variant.id}</option>)}</Select>;
      if (control.kind === "selection-property" && family && familySelection && "selectOption" in session) {
        const group = family.variantGroups?.find((candidate) => candidate.id === control.groupId);
        if (!group) return null;
        return <Select key={`group:${group.id}`} label={group.title} value={displayedSelections[group.id] ?? ""} onChange={(event) => { const nextOption = event.target.value; void run(async () => {
          if (!await flushDrafts() || pending.current.size) { setError("Correct or reset invalid input before changing variants."); return; }
          const nextSelections = { ...displayedSelections, [group.id]: nextOption };
          const resolution = resolveTemplateFieldFamilySelectionV2(family, { groupSelections: nextSelections });
          if (resolution.status === "resolved") {
            session.selectVariant(resolution.variantId);
            setPendingSelections(null);
            setSelectionMessage(null);
            setError(null);
            return;
          }
          setPendingSelections(nextSelections);
          setSelectionMessage(resolution.status === "ambiguous"
            ? `This combination matches ${resolution.candidateVariantIds.map((id) => variantDisplayLabels[id] ?? id).join(", ")}. Change another value.`
            : resolution.status === "incomplete"
              ? "Choose a value for each selection property."
              : "Change another selection value to reach an available design.");
        }); }}>{group.options.map((option) => <option key={option.id} value={option.id} disabled={!family.variants.some((variant) => variant.groupAssignments?.[group.id] === option.id)}>{option.title}</option>)}</Select>;
      }
      if (control.kind !== "field") return null;
      const controller = controllers.find((candidate) => candidate.id === control.fieldId);
      const definition = packageValue?.editableFields.find((candidate) => candidate.id === control.fieldId);
      const imageAsset = controller?.type === "image" && controller.value.assetId ? snapshot.sessionAssets[controller.value.assetId] ?? packageValue?.assets[controller.value.assetId] : undefined;
      const measureLines = controller?.type === "textarea" && definition ? (value: string) => measureRenderedTextLines(
        measurementRoot.current,
        { nodeId: definition.binding.nodeId } as Parameters<typeof measureRenderedTextLines>[1],
        value,
      ) : undefined;
      return controller ? <fieldset className="studio-draft-field-control" data-output-field={controller.id} data-active={activeFieldId === controller.id || undefined} onFocusCapture={() => setActiveFieldId(controller.id)} disabled={Boolean(pendingSelections)} key={`${variantId}:${controller.id}`}><FieldContentEditorV2 sessionIdentity={session} compact draftCoordinator={draftCoordinator} draftContext={variantId ?? "single"} imageUrl={resolvePackageAssetSource(imageAsset) ?? undefined} controller={definition?.label?.trim() ? controller : { ...controller, label: controller.id.replace(/^[^:]+:/u, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, value => value.toUpperCase()) }} getCurrentController={() => session.getFieldControllers().find(field => field.id === controller.id)} measureLines={measureLines} onPendingChange={pendingChanged} variantPlacement={snapshot.contentState && "variantImagePlacements" in snapshot.contentState && variantId ? snapshot.contentState.variantImagePlacements[variantId]?.[controller.id] : undefined} />{activeFieldId === controller.id && previewTargetState(snapshot.resolvedTree, definition?.binding.nodeId) !== "visible" && snapshot.fields.find(field => field.descriptor.id === controller.id)?.renderValidation.state !== "inactive" && <p className="ui-supporting-copy">{previewTargetState(snapshot.resolvedTree, definition?.binding.nodeId) === "hidden" ? "Hidden in this design." : "Preview location unavailable."}</p>}</fieldset> : null;
    })}</div>
  </WorkspaceSidePanel>;
  const preview = <PreviewWorkspace className="studio-draft-preview">
    {packageValue ? <OutputPreview session={session} rendererRef={renderer} width={packageValue.canvas.width} height={packageValue.canvas.height} onMeasurementRootChange={setMeasurementRoot} highlightNodeId={activeDefinition?.binding.nodeId} viewIdentity={variantId ?? "single"} designLabel={family && variantId ? `${variantDisplayLabels[variantId] ?? variantId}${pendingSelections ? " · Preview unchanged" : ""}` : undefined} /> : <Status tone="blocked">Preview unavailable</Status>}
  </PreviewWorkspace>;
  if (superseded || cleanupRequired) return <AppShell mainLabel="Output status"><PageWorkspace><PageHeader><h1 className="ui-page-title">{cleanupRequired ? "Output exported" : "This editing session is no longer active"}</h1></PageHeader><PageContent>
    {superseded ? <><p>Another session opened this template. Your older session cannot overwrite its draft.</p><Button onClick={onBack}>Back to templates</Button></> : <><Alert tone="attention" title="Output exported, but the saved draft could not be cleared." /><Button onClick={() => { void studioRecords.recovery.complete(lease).then(onExported).catch(cause => setError(String(cause))); }}>Retry cleanup</Button>{error && <p>{error}</p>}</>}
  </PageContent></PageWorkspace></AppShell>;
  return <div>
    <fieldset className="studio-transition-controls studio-editor-fieldset" disabled={transitionBusy || exporting || cleanupRequired || superseded}><EditorLayout shellClassName="studio-output-shell" panelPosition="left" contentInactive={tablet && workspaceView !== "content"} previewInactive={tablet && workspaceView !== "preview"} toolbar={toolbar} panel={panel} preview={preview} workspaceProps={{ "data-testid": "studio-draft-editor", "aria-busy": transitionBusy, ...(transitionBusy ? { inert: true } : {}) }} /></fieldset>
  </div>;
}

/** Pending keystrokes subscribe only in the small controls that need them. */
function DraftSaveStatus({ coordinator, status, pendingCount, acceptedPending, onCheckInput }: { coordinator: DeferredFieldDraftCoordinator; status: string; pendingCount: number; acceptedPending: boolean; onCheckInput(): void }) {
  const summary = useSyncExternalStore(coordinator.subscribe, coordinator.getSummarySnapshot, coordinator.getSummarySnapshot);
  const label = status.startsWith("Save failed") ? status : summary.invalidCount ? "Check input" : summary.pendingCount || pendingCount || acceptedPending && status === "Saved" ? "Unsaved changes" : status;
  return <Status role="status" tone={status.startsWith("Save failed") || summary.invalidCount ? "blocked" : label === "Saved" ? "repaired" : "attention"}>{label === "Check input" ? <button className="studio-status-link" onClick={onCheckInput}>Check input</button> : label}</Status>;
}
function DraftSaveRetry({ coordinator, pendingCount, onRetry }: { coordinator: DeferredFieldDraftCoordinator; pendingCount: number; onRetry(): void }) {
  const summary = useSyncExternalStore(coordinator.subscribe, coordinator.getSummarySnapshot, coordinator.getSummarySnapshot);
  return <Button size="small" variant="secondary" disabled={pendingCount > 0 || summary.invalidCount > 0 || summary.composingCount > 0} onClick={onRetry}>Retry save</Button>;
}
function DraftExportControl({ coordinator, pendingCount, pendingSelection, ready, reasons, exporting, onCheckInput, onInspect, onExport }: { coordinator: DeferredFieldDraftCoordinator; pendingCount: number; pendingSelection: boolean; ready: boolean; reasons: readonly string[]; exporting: boolean; onCheckInput(): void; onInspect?: () => void; onExport(): void }) {
  const summary = useSyncExternalStore(coordinator.subscribe, coordinator.getSummarySnapshot, coordinator.getSummarySnapshot);
  const blocked = pendingCount > 0 || summary.invalidCount > 0 || summary.composingCount > 0 || pendingSelection || (!summary.pendingCount && !ready);
  const reason = summary.composingCount ? "Finish composing text." : summary.invalidCount ? "Check input" : pendingCount ? "Finish image preparation." : pendingSelection ? "Choose an available design." : !ready && !summary.pendingCount ? reasons[0] ?? "Preparing preview…" : null;
  const correction = summary.invalidCount ? onCheckInput : onInspect;
  return <div className="studio-draft-export"><Button disabled={blocked || exporting} aria-describedby={reason ? "output-export-reason" : undefined} onClick={onExport}>{exporting ? "Exporting…" : "Export PNG"}</Button>{reason && (correction ? <Button id="output-export-reason" variant="quiet" size="small" onClick={correction}>{reason}</Button> : <span id="output-export-reason" className="ui-supporting-copy" role="status">{reason}</span>)}</div>;
}
/** Presentation only; native renderer subscriptions continue delivering evidence. */
const OutputPreview = memo(function OutputPreview({ session, rendererRef, width, height, onMeasurementRootChange, highlightNodeId, viewIdentity, designLabel }: {
  session: ReactTemplateFieldSessionV2; rendererRef: React.Ref<TemplateFieldSessionRendererV2Handle>; width: number; height: number; onMeasurementRootChange(root: HTMLDivElement | null): void; highlightNodeId?: string; viewIdentity: string; designLabel?: string;
}) {
  return <SetupPreview initialZoom={0.4} session={session} rendererRef={rendererRef} mode="editor" width={width} height={height} onMeasurementRootChange={onMeasurementRootChange} highlightNodeId={highlightNodeId} viewIdentity={viewIdentity} designLabel={designLabel} />;
});
