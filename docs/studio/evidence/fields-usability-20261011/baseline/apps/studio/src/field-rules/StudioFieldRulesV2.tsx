import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { type TemplateFieldConfigurationV2 } from "@sleinity/template-core";
import { type TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";
import { measureRenderedTextLines } from "@sleinity/template-browser";
import { type TemplateReimportPlanV2 } from "@sleinity/template-browser/importer";
import { TemplateFieldSessionRendererV2, useTemplateFieldSessionV2Snapshot, type ReactTemplateFieldSessionV2, type TemplateFieldSessionRendererV2Handle } from "@sleinity/template-react";
import { Button, Input, Select } from "../components/ui";
import { choiceAuthoringSources } from "./choiceAuthoring";
import { FieldConfigurationEditorV2 } from "./FieldConfigurationEditorV2";
import { FieldContentEditorV2 } from "./FieldContentEditorV2";
import { DeferredFieldDraftCoordinator, STUDIO_FIELD_DRAFT_DELAY_MS, waitForCanonicalExportReadiness } from "./deferredFieldDrafts";
import "./fieldRulesV2.css";

import { readSource, studioVariantDisplayLabels, type SetupSource } from "../setup/setupSources";
import { SetupSourceOwnership } from "../setup/setupSourceOwnership";

const message = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);

export { StudioLibrary as StudioFieldRulesV2 } from "../workspace/StudioLibrary";

export function StudioFieldWorkspaceV2({ session, onBack, transitionBusy = false, navigationGuard }: { session: ReactTemplateFieldSessionV2; onBack(): void; transitionBusy?: boolean; navigationGuard?: React.MutableRefObject<(() => Promise<boolean>) | null> }) {
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
  const [tab, setTab] = useState<"edit" | "configure">("configure");
  const [scope, setScope] = useState<"common" | "variant">("common");
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<TemplateReimportPlanV2 | null>(null);
  const [reviewRemoval, setReviewRemoval] = useState(false);
  const [previewMode, setPreviewMode] = useState<"static" | "editor">("editor");
  const [draftCoordinator] = useState(() => new DeferredFieldDraftCoordinator(STUDIO_FIELD_DRAFT_DELAY_MS));
  useSyncExternalStore(draftCoordinator.subscribe, draftCoordinator.getSnapshot, draftCoordinator.getSnapshot);
  const initialConfiguration = "family" in snapshot ? snapshot.family : snapshot.basePackage;
  const initialSignature = JSON.stringify({ configuration: initialConfiguration, contentRevision: snapshot.contentState?.revision, selectedVariantId: "selectedVariantId" in snapshot ? snapshot.selectedVariantId : null });
  const [savedSignature, setSavedSignature] = useState<string | null>(() => ("savedSessionId" in snapshot ? snapshot.savedSessionId : snapshot.savedFamilyId) ? initialSignature : null);
  const renderer = useRef<TemplateFieldSessionRendererV2Handle>(null);
  const measurementRoot = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const operation = useRef(0);
  const [importOwners] = useState(() => new SetupSourceOwnership());
  const reviewSource = useRef<SetupSource | null>(null);
  const clearReview = () => {
    if (reviewSource.current) importOwners.release([reviewSource.current]);
    reviewSource.current = null; setReview(null);
  };
  useEffect(() => () => { operation.current++; importOwners.dispose(); reviewSource.current = null; }, [importOwners]);
  const family = "family" in snapshot ? snapshot.family : null;
  const variant = family?.variants.find((entry) => "selectedVariantId" in snapshot && entry.id === snapshot.selectedVariantId);
  useEffect(() => { operation.current++; clearReview(); }, [session, variant?.id]);
  const variantDisplayLabels = useMemo(() => family ? studioVariantDisplayLabels(family.variants) : {}, [family]);
  const packageValue = "basePackage" in snapshot ? snapshot.basePackage : snapshot.effectivePackage;
  const signature = JSON.stringify({ configuration: family ?? packageValue, contentRevision: snapshot.contentState?.revision, selectedVariantId: "selectedVariantId" in snapshot ? snapshot.selectedVariantId : null });
  const dirty = signature !== savedSignature;
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  useEffect(() => {
    if (!navigationGuard) return;
    navigationGuard.current = async () => {
      const flushed = await draftCoordinator.flush();
      if (!flushed.accepted) { setError("Correct the highlighted input before continuing."); return false; }
      return !dirty || window.confirm("Leave without saving the current changes?");
    };
    return () => { navigationGuard.current = null; };
  }, [dirty, draftCoordinator, navigationGuard]);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => () => draftCoordinator.dispose(), [draftCoordinator]);
  const run = async (action: () => void | Promise<void>) => { try { setError(null); await action(); } catch (cause) { setError(message(cause)); } };
  const flushDrafts = async () => { const result = await draftCoordinator.flush(); if (!result.accepted) { setError("Correct the highlighted input before continuing."); return false; } return true; };
  if (!packageValue) return <main className="v2-studio"><p role="alert">{snapshot.error?.message ?? "No configured package."}</p><Button onClick={onBack}>Back</Button></main>;
  const authorFields: readonly TemplateFieldConfigurationV2[] = family && scope === "common" ? family.fields : packageValue.editableFields;
  const order = family && scope === "common" ? family.editableFieldOrder : packageValue.editableFieldOrder;
  const currentField = authorFields.find((field) => field.id === selected) ?? authorFields.find((field) => field.id === order[0]);
  const configureField = (field: TemplateFieldConfigurationV2, override?: TemplateFieldFamilyVariantFieldOverrideV2) => {
    if ("selectVariant" in session && family && variant) {
      if (scope === "common") session.configure({ fields: [field] });
      else session.configure({ variants: [{ id: variant.id, editableFieldOrder: variant.editableFieldOrder, fieldOverrides: { ...variant.fieldOverrides, [field.id]: override! } }] });
    } else if (!("selectVariant" in session)) session.configure({ fields: [field] });
    setNotice("Configuration applied. Save to retain it after reload.");
  };
  const reorder = (id: string, direction: number) => {
    const next = [...order]; const index = next.indexOf(id); const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    if ("selectVariant" in session && variant && scope === "variant") session.configure({ variants: [{ id: variant.id, fieldOverrides: variant.fieldOverrides, editableFieldOrder: next }] });
    else session.configure({ editableFieldOrder: next });
  };
  return <main className="v2-studio" data-testid="studio-field-rules-v2" aria-busy={transitionBusy} {...(transitionBusy ? { inert: true } : {})}>
    <header className="v2-header"><div><h1 ref={heading} tabIndex={-1}>{family?.title ?? packageValue.name}</h1><p>{dirty ? "Unsaved changes" : "Saved"} · {snapshot.readiness.exportReady ? "Ready to export" : `Export ${snapshot.readiness.state}`}</p></div><div className="v2-inline">
      <Button variant="quiet" onClick={() => void run(async () => { if (await flushDrafts()) onBack(); })}>Back to templates</Button>
      <Button onClick={() => void run(async () => { if (!await flushDrafts()) return; await session.save(); setSavedSignature(signature); setNotice("Saved portable configuration and canonical content."); })}>Save</Button>
      <Button variant="secondary" disabled={draftCoordinator.invalidCount > 0 || (!draftCoordinator.dirty && !snapshot.readiness.exportReady)} onClick={() => void run(async () => { if (!await flushDrafts()) return; await waitForCanonicalExportReadiness(session); await renderer.current!.exportPng(); setNotice("PNG exported."); })}>Export PNG</Button>
    </div></header>
    {family && variant && "selectVariant" in session && <Select label="Selected variant" value={variant.id} onChange={(event) => { const next = event.target.value; void run(async () => { if (!await flushDrafts()) return; operation.current += 1; session.selectVariant(next); setReview(null); }); }}>
      {family.variants.map((entry) => <option key={entry.id} value={entry.id}>{variantDisplayLabels[entry.id] ?? entry.label ?? entry.id}</option>)}
    </Select>}
    <div className="v2-inline v2-workspace-tabs"><Button aria-pressed={tab === "configure"} variant={tab === "configure" ? "primary" : "secondary"} onClick={() => setTab("configure")}>Configure fields</Button><Button aria-pressed={tab === "edit"} variant={tab === "edit" ? "primary" : "secondary"} onClick={() => setTab("edit")}>Edit content</Button></div>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    <div className="v2-workspace"><aside className="v2-card">
      {tab === "configure" ? <>
        {family && <Select label="Configuration scope" value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="common">Common to Family</option><option value="variant">Selected variant overrides</option></Select>}
        <h2>Editor order</h2><ol className="v2-order">{order.map((id, index) => {
          const display = authorFields.find((field) => field.id === id)?.label ?? id.replace(/^[^:]+:/u, "");
          return <li key={id}><button type="button" aria-current={currentField?.id === id ? "true" : undefined} onClick={() => setSelected(id)}>{display}</button><div className="v2-inline"><Button size="small" variant="quiet" disabled={index === 0} aria-label={`Move ${display} up`} onClick={() => void run(() => reorder(id, -1))}>↑</Button><Button size="small" variant="quiet" disabled={index === order.length - 1} aria-label={`Move ${display} down`} onClick={() => void run(() => reorder(id, 1))}>↓</Button></div></li>;
        })}</ol>
        {variant && scope === "variant" && "selectVariant" in session && <Button variant="quiet" onClick={() => session.configure({ variants: [{ id: variant.id, fieldOverrides: variant.fieldOverrides }] })}>Inherit common order</Button>}
        {currentField && <FieldConfigurationEditorV2 key={`${scope}:${variant?.id}:${currentField.id}:${JSON.stringify(currentField)}:${JSON.stringify(variant?.fieldOverrides?.[currentField.id])}`} field={currentField} choiceSources={choiceAuthoringSources(currentField.id, packageValue.editableFields, family, scope === "variant" ? variant?.id : undefined)} inheritedField={family?.fields.find((field) => field.id === currentField.id)} variant={Boolean(family && scope === "variant")} override={variant?.fieldOverrides?.[currentField.id]} onSave={configureField} />}
      </> : <><h2>Canonical content</h2>{session.getFieldControllers().map((field) => {
        const definition = packageValue.editableFields.find((candidate) => candidate.id === field.id);
        const measureLines = field.type === "textarea" && definition ? (value: string) => measureRenderedTextLines(
          measurementRoot.current,
          { nodeId: definition.binding.nodeId } as Parameters<typeof measureRenderedTextLines>[1],
          value,
        ) : undefined;
        return <FieldContentEditorV2 sessionIdentity={session} key={`${variant?.id}:${field.id}`} draftCoordinator={draftCoordinator} draftContext={variant?.id ?? "single"} controller={field} measureLines={measureLines} variantPlacement={"variantImagePlacements" in (snapshot.contentState ?? {}) && variant ? (snapshot.contentState as import("@sleinity/template-core/family").TemplateFieldFamilyContentStateV3).variantImagePlacements[variant.id]?.[field.id] : undefined} />;
      })}</>}
    </aside><section className="v2-card v2-preview"><h2>Live preview</h2>
      <Select label="Preview surface" value={previewMode} onChange={(event) => setPreviewMode(event.target.value as typeof previewMode)}><option value="editor">Editor</option><option value="static">Validate / Fields</option></Select>
      <div ref={measurementRoot} className="v2-canvas-scroll"><TemplateFieldSessionRendererV2 key={previewMode} ref={renderer} session={session} mode={previewMode} motionRenderMode="final-frame" fallback={<p role="status">Preview unavailable. Correct the field errors or reset the affected field. Export remains blocked.</p>} /></div>
      <details><summary>Validation and export readiness</summary><ul>{snapshot.readiness.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></details>
    </section></div>
    <section className="v2-card"><h2>Review-first reimport</h2><p>Retained IDs keep configuration and canonical content. Source geometry/bindings come from the new package.</p>
      <Input label="Reimport selected template source" type="file" accept=".zip,.json" onChange={(event) => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        const generation = ++operation.current;
        void run(async () => { if (!await flushDrafts()) return; clearReview(); const revision = session.getSnapshot().operationRevision;
          const source = await readSource(file, variant?.id);
          if (generation !== operation.current || revision !== session.getSnapshot().operationRevision) { source.dispose?.(); return; }
          importOwners.track(source); reviewSource.current = source;
          try {
          setReview("selectVariant" in session ? session.planVariantReimport(source.packageValue) : session.planReimport(source.packageValue)); setReviewRemoval(false);
          } catch (cause) { clearReview(); throw cause; }
        });
      }} />
      {review && <><ul>{review.fieldChanges.map((change) => <li key={change.fieldId}>{change.fieldId}: {change.status} — {change.message}</li>)}{review.diagnostics.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>
        {review.removedFieldIds.length > 0 && <label className="v2-check"><input type="checkbox" checked={reviewRemoval} onChange={(event) => setReviewRemoval(event.target.checked)} />I reviewed removed fields and authorize discarding their content.</label>}
        <Button disabled={!review.canApply || (review.removedFieldIds.length > 0 && !reviewRemoval)} onClick={() => void run(() => {
          if ("selectVariant" in session) session.applyVariantReimport(review, { removedFieldDisposition: "discard" }); else session.applyReimport(review, { removedFieldDisposition: "discard" });
          clearReview(); setNotice("Reimport applied. Save to retain the reviewed changes.");
        })}>Apply reviewed reimport</Button><Button variant="quiet" onClick={() => { operation.current++; clearReview(); }}>Cancel reimport</Button>
      </>}
    </section>
  </main>;
}
