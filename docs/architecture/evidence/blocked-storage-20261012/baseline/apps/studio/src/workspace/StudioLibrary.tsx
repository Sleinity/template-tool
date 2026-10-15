import { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal, Settings, Trash2 } from "lucide-react";
import { resolvePackageAssetSource } from "@sleinity/template-core/assets";
import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import type { IncompatibleSavedWorkRecord, TemplateRecoveryLease } from "@sleinity/template-browser/persistence";
import { Alert, AppShell, Button, EmptyState, Menu, MenuItem, PageContent, PageHeader, PageWorkspace, Status, Surface, TemplateThumbnailStage } from "../components/ui";
import { StudioSetupWizard } from "../setup/StudioSetupWizard";
import { StudioFieldWorkspaceV2 } from "../field-rules/StudioFieldRulesV2";
import { parseStudioAppRoute, studioAppRoutePath, type StudioAppRoute } from "../routing/appRoutes";
import { DraftEditor } from "./DraftEditor";
import { isFamilyRecord, studioEntityKey, studioLocator, studioRecords, type StudioEntityLocator, type StudioRecord } from "./studioRecords";

type Destination = { generation: number; locator: StudioEntityLocator; record: StudioRecord; session: ReactTemplateFieldSessionV2; settings: boolean; lease?: TemplateRecoveryLease };
type TransitionState = "idle" | "flushing" | "loading";
const message = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const sortRecords = (records: StudioRecord[]) => [...records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt) || studioEntityKey(studioLocator(left)).localeCompare(studioEntityKey(studioLocator(right))));
const routeEntity = (route: StudioAppRoute): string | null => (route.kind === "template-settings" || route.kind === "output-workspace") ? route.templateId : route.kind === "draft-workspace" ? route.draftId : route.kind === "existing-work" ? route.workId : null;
const withEntity = (route: StudioAppRoute, entity: string): StudioAppRoute => (route.kind === "template-settings" || route.kind === "output-workspace") ? { ...route, templateId: entity } : route.kind === "draft-workspace" ? { ...route, draftId: entity } : route.kind === "existing-work" ? { ...route, workId: entity } : route;
const recordPackage = (record: StudioRecord) => isFamilyRecord(record) ? record.family.variants[0]?.packageValue : record.basePackage;
const previewAsset = (record: StudioRecord) => {
  const packageValue = recordPackage(record);
  const assetId = packageValue?.referencePreview?.assetId;
  return assetId ? packageValue.assets[assetId] : undefined;
};
const previewSource = (record: StudioRecord) => {
  const source = resolvePackageAssetSource(previewAsset(record)) ?? recordPackage(record)?.referencePreview?.url;
  return source && /^(?:data:image\/|blob:)/i.test(source) ? source : undefined;
};
const previewHash = (record: StudioRecord) => previewAsset(record)?.hash;


export function StudioLibrary() {
  const [records, setRecords] = useState<StudioRecord[]>([]);
  const [incompatible, setIncompatible] = useState<IncompatibleSavedWorkRecord[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [setup, setSetup] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [operation, setOperation] = useState<string | null>(null);
  const [transition, setTransition] = useState<TransitionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryRoute, setRetryRoute] = useState<StudioAppRoute | null>(null);
  const [resumePrompt, setResumePrompt] = useState<{ route: StudioAppRoute; updatedAt: string } | null>(null);
  const resumeDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (resumePrompt) resumeDialog.current?.showModal(); else resumeDialog.current?.close(); }, [resumePrompt]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const generation = useRef(0);
  const active = useRef<ReactTemplateFieldSessionV2 | null>(null);
  const currentView = useRef({ destination, setup });
  currentView.current = { destination, setup };
  const guard = useRef<(() => Promise<boolean>) | null>(null);
  const acceptedPath = useRef("/templates");
  const feedback = useRef<HTMLDivElement>(null);
  const libraryHeading = useRef<HTMLHeadingElement>(null);

  const refresh = async (token?: number) => {
    const [next, unavailable] = await Promise.all([studioRecords.list(), studioRecords.listIncompatible()]);
    if (token === undefined || generation.current === token) {
      setRecords(sortRecords(next));
      setIncompatible(unavailable.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    }
  };
  const commitLibrary = (path = "/templates") => {
    active.current?.dispose(); active.current = null;
    setDestination(null); setSetup(false); acceptedPath.current = path;
  };
  const routeTo = async (requested: StudioAppRoute, historyMode: "push" | "replace" | "pop" = "push", recoveryMode?: "fresh" | "resume") => {
    const token = ++generation.current;
    setTransition("flushing"); setError(null); setNotice(null); setRetryRoute(null); setConfirmDelete(null);
    if (guard.current && !await guard.current()) {
      window.history.replaceState(null, "", acceptedPath.current);
      if (generation.current === token) setTransition("idle");
      return false;
    }
    if (generation.current !== token) return false;
    setTransition("loading");
    let candidate: ReactTemplateFieldSessionV2 | null = null;
    try {
      await studioRecords.migrateRecovery();
      if (requested.kind === "draft-workspace") {
        const old = requested.draftId.match(/^(single|family):(.*)$/);
        const matches = old ? [await studioRecords.recovery.resolveLegacy(old[1] as "single" | "family", old[2])] : await Promise.all([
          studioRecords.recovery.resolveLegacy("single", requested.draftId), studioRecords.recovery.resolveLegacy("family", requested.draftId),
        ]);
        const found = matches.filter(value => value !== null);
        const key = found.length === 1 ? found[0] : null;
        if (!key || !await studioRecords.recovery.inspect(key)) {
          commitLibrary(); window.history.replaceState(null, "", "/templates"); await refresh(token);
          setNotice("This draft is no longer available. Choose a template to create another output."); setTransition("idle"); return false;
        }
        requested = { kind: "output-workspace", templateId: studioEntityKey({ kind: key.kind, id: key.templateId }) };
      }
      let canonicalRoute: StudioAppRoute = requested;
      let next: Destination | null = null;
      const entity = routeEntity(requested);
      if (entity) {
        const resolution = await studioRecords.resolve(entity);
        if (generation.current !== token) return false;
        if (resolution.status === "ambiguous") {
          commitLibrary(); window.history.replaceState(null, "", "/templates");
          await refresh(token);
          if (generation.current !== token) return false;
          setError("This older link matches both a single design and a Family. Open the intended item from Library so Studio can create a canonical link.");
          setTransition("idle"); queueMicrotask(() => feedback.current?.focus()); return false;
        }
        if (resolution.status === "missing") throw new Error("Saved work was not found.");
        const expectedRole = (requested.kind === "template-settings" || requested.kind === "output-workspace") ? "template" : undefined;
        if (resolution.record.studio?.role !== expectedRole) throw new Error("This link does not match the saved product entity.");
        canonicalRoute = withEntity(requested, studioEntityKey(resolution.locator));
        let record = resolution.record;
        let lease: TemplateRecoveryLease | undefined;
        if (requested.kind === "output-workspace") {
          const saved = await studioRecords.recovery.inspect({ kind: resolution.locator.kind, templateId: record.id });
          if (generation.current !== token) return false;
          if (saved && !recoveryMode) {
            setResumePrompt({ route: canonicalRoute, updatedAt: saved.updatedAt });
            window.history.replaceState(null, "", acceptedPath.current); setTransition("idle"); return false;
          }
          ({ record, lease } = await studioRecords.beginOutput(record, recoveryMode ?? "fresh"));
        }
        candidate = studioRecords.openSession(record, lease);
        const snapshot = await candidate.loadSaved(record.id);
        const repairable = "basePackage" in snapshot && snapshot.basePackage && snapshot.contentState && snapshot.error?.code === "materialization-failed";
        if (snapshot.status !== "ready" && !repairable) throw new Error(snapshot.error?.message ?? "Could not open saved work.");
        next = { generation: token, locator: resolution.locator, record, lease, session: candidate, settings: requested.kind === "template-settings" };
      }
      if (generation.current !== token) { candidate?.dispose(); return false; }
      const canonicalPath = studioAppRoutePath(canonicalRoute);
      active.current?.dispose(); active.current = candidate;
      setDestination(next); setSetup(canonicalRoute.kind === "new-template");
      if (historyMode === "push") window.history.pushState(null, "", canonicalPath);
      else if (historyMode === "replace" || window.location.pathname !== canonicalPath) window.history.replaceState(null, "", canonicalPath);
      acceptedPath.current = canonicalPath;
      try { await refresh(token); }
      catch (cause) {
        setError(`Saved Studio work could not be refreshed: ${message(cause)}`);
        setRetryRoute(canonicalRoute);
        queueMicrotask(() => feedback.current?.focus());
      }
      setTransition("idle");
      return true;
    } catch (cause) {
      candidate?.dispose();
      if (generation.current !== token) return false;
      if (!currentView.current.destination && !currentView.current.setup) commitLibrary();
      window.history.replaceState(null, "", acceptedPath.current);
      setError(message(cause)); setRetryRoute(requested); setTransition("idle");
      queueMicrotask(() => feedback.current?.focus());
      return false;
    }
  };
  const navigatePath = (pathname: string, mode: "replace" | "pop") => {
    const parsed = parseStudioAppRoute(pathname);
    if (!parsed.recognized) {
      void routeTo({ kind: "templates" }, mode).then((success) => {
        if (!success) return;
        setError("That Studio page does not exist. Library is open instead.");
        setListLoading(false); queueMicrotask(() => feedback.current?.focus());
      });
      return;
    }
    void routeTo(parsed.route, mode);
  };
  useEffect(() => {
    navigatePath(window.location.pathname, "replace");
    const pop = () => navigatePath(window.location.pathname, "pop");
    window.addEventListener("popstate", pop);
    return () => { generation.current++; active.current?.dispose(); window.removeEventListener("popstate", pop); };
  }, []);
  useEffect(() => { if (transition === "idle") setListLoading(false); }, [transition]);
  useEffect(() => { if (!destination && !setup && transition === "idle") libraryHeading.current?.focus(); }, [destination, setup, transition]);
  useEffect(() => {
    let current = true; const objectUrls: string[] = [];
    void Promise.all(records.map(async (record) => {
      const hash = previewHash(record);
      if (!hash) return null;
      const saved = await studioRecords.getManagedAsset(studioLocator(record), hash);
      if (!saved || !current) return null;
      const url = URL.createObjectURL(saved.blob); objectUrls.push(url); return [studioEntityKey(studioLocator(record)), url] as const;
    })).then((entries) => { if (current) setPreviewUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)))); });
    return () => { current = false; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [records]);

  const runAction = async (key: string, action: () => Promise<void>, success?: string) => {
    setOperation(key); setError(null); setNotice(null);
    try { await action(); await refresh(); if (success) setNotice(success); }
    catch (cause) { setError(message(cause)); queueMicrotask(() => feedback.current?.focus()); }
    finally { setOperation(null); }
  };
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const createOutput = async (template: StudioRecord) => {
    await routeTo({ kind: "output-workspace", templateId: studioEntityKey(studioLocator(template)) });
  };
  const back = () => { void routeTo({ kind: "templates" }); };
  const transitionBusy = transition !== "idle";
  const feedbackPanel = <>
    {transitionBusy && <Status role="status" tone="info">{transition === "flushing" ? "Saving current work before navigation…" : "Loading Studio workspace…"}</Status>}
    {error && <div ref={feedback} tabIndex={-1}><Alert tone="blocked" title="Studio could not complete the action"><p>{error}</p>{retryRoute && <Button variant="secondary" size="small" onClick={() => void routeTo(retryRoute)}>Retry</Button>}</Alert></div>}
    <dialog className="studio-recovery-dialog" ref={resumeDialog} aria-labelledby="resume-title" onCancel={() => setResumePrompt(null)}>
      <h2 id="resume-title">Continue your draft?</h2>
      <p>Your unfinished changes were saved {resumePrompt ? formatDate(resumePrompt.updatedAt) : ""}.</p>
      <p>Starting from scratch replaces your unfinished draft.</p>
      <div className="ui-action-row"><Button onClick={() => { const prompt = resumePrompt; setResumePrompt(null); if (prompt) void routeTo(prompt.route, "push", "resume"); }}>Continue draft</Button>
      <Button variant="secondary" onClick={() => { const prompt = resumePrompt; setResumePrompt(null); if (prompt) void routeTo(prompt.route, "push", "fresh"); }}>Start from scratch</Button>
      <Button variant="quiet" onClick={() => setResumePrompt(null)}>Cancel</Button></div>
    </dialog>
    {notice && <Alert tone="repaired" title={notice} />}
  </>;

  if (setup || destination?.settings) {
    const record = destination?.record;
    const snapshot = destination?.session.getSnapshot();
    const sources = snapshot && "family" in snapshot && snapshot.family ? snapshot.family.variants.map((variant) => ({ id: variant.id, name: variant.label ?? variant.packageValue.name, packageValue: variant.packageValue })) : snapshot && "basePackage" in snapshot && snapshot.basePackage ? [{ id: "source", name: snapshot.basePackage.name, packageValue: snapshot.basePackage }] : [];
    return <>{feedbackPanel}<StudioSetupWizard key={destination?.generation ?? "new"} transitionBusy={transitionBusy} navigationGuard={guard} initial={destination ? { session: destination.session, sources, name: destination.record.name, description: destination.record.description } : undefined} onCancel={back} onSaved={() => { void routeTo({ kind: "templates" }).then(accepted => { if (accepted) setNotice(record ? "Changes saved." : "Template saved."); }); }} persist={(session, metadata) => studioRecords.saveTemplate(session, metadata, record)} /></>;
  }
  if (destination) return <>{feedbackPanel}{destination.lease ? <DraftEditor key={destination.generation} transitionBusy={transitionBusy} session={destination.session} record={destination.record} lease={destination.lease} onExported={() => { guard.current = null; commitLibrary(); window.history.replaceState(null, "", "/templates"); setNotice("Output exported."); void refresh(); }} onBack={back} guard={guard} /> : <StudioFieldWorkspaceV2 transitionBusy={transitionBusy} session={destination.session} onBack={back} navigationGuard={guard} />}</>;

  const templates = records.filter((record) => record.studio?.role === "template");
  const existing = records.filter((record) => !record.studio?.role);
  return <AppShell mainLabel="Studio Library"><PageWorkspace className="templates-page">
    <PageHeader className="templates-page__header"><div><h1 ref={libraryHeading} tabIndex={-1} className="ui-page-title">Library</h1><p className="ui-page-description">Choose a template to create an output. Unfinished changes are saved automatically.</p></div><Button disabled={Boolean(operation) || transitionBusy} onClick={() => void routeTo({ kind: "new-template" })}>Add template</Button></PageHeader>
    <PageContent className="templates-page__body">{feedbackPanel}{studioRecords.migrationDiagnostics.length > 0 && <Alert tone="attention" title="Some older work could not be linked"><p>Unlinked records were retained internally and have not been discarded.</p></Alert>}
      {listLoading ? <Status role="status" tone="info">Loading saved Studio work…</Status> : <>
        <section aria-labelledby="studio-template-title"><div className="templates-page__section-heading"><h2 id="studio-template-title" className="ui-section-title">Templates</h2><span className="templates-page__count-badge">{templates.length} saved</span></div>
          {templates.length ? <div className="template-grid">{templates.map((record) => { const key = studioEntityKey(studioLocator(record)); const unavailable = operation === key || Boolean(operation) || transitionBusy; return <article className="template-card" data-testid="template-card" key={key} aria-busy={operation === key}>
            <button type="button" className="template-card__open" disabled={unavailable} aria-label="Create output" onClick={() => void createOutput(record)}>
              <TemplateThumbnailStage name={record.name} src={previewUrls[key] ?? previewSource(record)} loading={Boolean(previewHash(record) && !previewUrls[key] && !previewSource(record))} /><span className="template-card__footer"><span className="template-card__name" role="heading" aria-level={3}>{record.name}</span><span className="template-card__metadata"><span>{isFamilyRecord(record) ? `${record.family.variants.length} designs` : "Single design"}</span></span></span>
            </button><div className="template-card__menu"><TemplateCardActions name={record.name} disabled={unavailable} onSettings={() => void routeTo({ kind: "template-settings", templateId: key })} onDelete={() => void runAction(key, () => studioRecords.remove(record), `${record.name} was deleted. Its unfinished draft was cleared.`)} /></div>
          </article>; })}</div> : <EmptyState title="No templates yet" description="Add a template to begin the Studio workflow." />}
        </section>
        {existing.length > 0 && <section aria-labelledby="studio-existing-title"><div className="templates-page__section-heading"><h2 id="studio-existing-title" className="ui-section-title">Existing work</h2><span className="templates-page__count-badge">{existing.length} saved</span></div>
          {existing.length ? <div className="studio-existing-grid">{existing.map((record) => { const locator = studioLocator(record); const key = studioEntityKey(locator); const unavailable = operation === key || Boolean(operation) || transitionBusy; const conversion = record.studio?.conversion; return <Surface as="article" tone="raised" key={key} className="studio-library-card"><h3>{record.name}</h3><p>{isFamilyRecord(record) ? `Family · ${record.family.variants.length} variants` : "Single design"} · {formatDate(record.updatedAt)}</p>{conversion ? <Status tone={conversion.complete ? "repaired" : "attention"}>{conversion.complete ? "Conversion complete — original retained" : "Conversion incomplete — retry available"}</Status> : null}<div className="ui-action-row"><Button disabled={unavailable} onClick={() => void routeTo({ kind: "existing-work", workId: key })}>Open</Button>{!conversion?.complete ? <Button disabled={unavailable} variant="secondary" onClick={() => void runAction(key, () => studioRecords.convert(record), "Conversion complete. The original remains available.")}>{conversion ? "Retry conversion" : "Create template and retain current output"}</Button> : <><Button disabled={unavailable} onClick={() => void routeTo({ kind: "template-settings", templateId: studioEntityKey({ kind: locator.kind, id: conversion.templateId }) })}>Open template</Button><Button disabled={unavailable} variant="secondary" onClick={() => void routeTo({ kind: "draft-workspace", draftId: studioEntityKey({ kind: locator.kind, id: conversion.draftId }) })}>Continue output</Button></>}<Button disabled={unavailable} variant={confirmDelete === key ? "destructive" : "quiet"} onClick={() => { if (confirmDelete !== key) setConfirmDelete(key); else void runAction(key, async () => { await studioRecords.remove(record); setConfirmDelete(null); }, `${record.name} was deleted.`); }}>{confirmDelete === key ? "Confirm delete" : "Delete"}</Button>{confirmDelete === key ? <Button variant="quiet" onClick={() => setConfirmDelete(null)}>Cancel</Button> : null}</div></Surface>; })}</div> : <p className="ui-supporting-copy">No existing work.</p>}
        </section>}
        {incompatible.length ? <section aria-labelledby="studio-reimport-title"><div className="templates-page__section-heading"><h2 id="studio-reimport-title" className="ui-section-title">Reimport required</h2><span className="templates-page__count-badge">{incompatible.length}</span></div><p className="ui-supporting-copy">These items use an older image-field contract. Reimport the source package to use them again.</p><div className="studio-existing-grid">{incompatible.map((record) => { const key = `incompatible:${record.kind}:${record.id}`; const unavailable = operation === key || Boolean(operation) || transitionBusy; return <Surface as="article" tone="raised" key={key} className="studio-library-card"><h3>{record.name}</h3><p>{record.kind === "family" ? "Family" : "Single design"} · {record.updatedAt ? formatDate(record.updatedAt) : "Date unavailable"}</p><Status tone="attention">Reimport required</Status><div className="ui-action-row"><Button disabled>Open</Button><Button disabled variant="secondary">Settings</Button><Button disabled={unavailable} variant={confirmDelete === key ? "destructive" : "quiet"} onClick={() => { if (confirmDelete !== key) setConfirmDelete(key); else void runAction(key, async () => { await studioRecords.removeIncompatible(record); setConfirmDelete(null); }, `${record.name} was deleted.`); }}>{confirmDelete === key ? "Confirm delete" : "Delete"}</Button>{confirmDelete === key ? <Button variant="quiet" onClick={() => setConfirmDelete(null)}>Cancel</Button> : null}</div></Surface>; })}</div></section> : null}
      </>}

    </PageContent>
  </PageWorkspace></AppShell>;
}

function TemplateCardActions({ name, disabled, onSettings, onDelete }: { name: string; disabled: boolean; onSettings(): void; onDelete(): void }) {
  const [confirming, setConfirming] = useState(false);
  const reset = useCallback(() => setConfirming(false), []);
  return <Menu label={<MoreHorizontal size={18} aria-hidden="true" />} accessibleLabel={`Actions for ${name}`} disabled={disabled} onClose={reset}>
    {confirming ? <>
      <div className="ui-menu__confirmation"><strong>Delete {name}?</strong><p>Also deletes its unfinished draft.</p></div>
      <MenuItem autoFocus onClick={reset}>Cancel</MenuItem>
      <MenuItem destructive disabled={disabled} onClick={onDelete}><Trash2 size={15} aria-hidden="true" /> Confirm delete</MenuItem>
    </> : <>
      <MenuItem disabled={disabled} onClick={onSettings}><Settings size={15} aria-hidden="true" /> Template Settings</MenuItem>
      <MenuItem destructive disabled={disabled} closeOnSelect={false} onClick={() => setConfirming(true)}><Trash2 size={15} aria-hidden="true" /> Delete</MenuItem>
    </>}
  </Menu>;
}
