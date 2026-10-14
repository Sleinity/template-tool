/** Test-only output editor workload; public import/font/Family authorities. */
import { StrictMode, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { runTemplatePackageImportPipelineV2, createTemplateFieldFamilyFromSourcesV2 } from "@sleinity/template-browser/importer";
import { uploadExactManagedFontForRequirement } from "@sleinity/template-browser/fonts";
import type { TemplatePackageV2 } from "@sleinity/template-core";
import { DraftEditor } from "../../apps/studio/src/workspace/DraftEditor";
import { studioRecords } from "../../apps/studio/src/workspace/studioRecords";
import { normalizeStudioTextField, normalizeStudioFamilyTextLimits } from "../../apps/studio/src/field-rules/studioTextLimits";
import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import "@sleinity/template-react/importer.css";
import "../../apps/studio/src/styles.css";
import "../../apps/studio/src/fonts.css";

declare global { interface Window { editorProbe: any; __editorWork: Record<string, number>; } }
window.__editorWork = {};
const root = createRoot(document.getElementById("root")!);
let session: ReactTemplateFieldSessionV2, stop: (() => void) | undefined;
let replace: (next: ReactTemplateFieldSessionV2) => void;
function Shell({ initial, record, lease }: any) {
  const [current, setCurrent] = useState(initial); replace = setCurrent;
  const guard = useRef<(() => Promise<boolean>) | null>(null);
  useLayoutEffect(() => { window.editorProbe.guard = () => guard.current?.(); });
  return <DraftEditor session={current} record={record} lease={lease} guard={guard} onBack={() => { window.editorProbe.left = true; }} onExported={() => { window.editorProbe.exported = true; }} />;
}
window.editorProbe = {
  async start(ids: string[], family = false) {
    const packages: TemplatePackageV2[] = [];
    for (const id of ids) {
      const descriptor = await (await fetch(`/inputs/${id}.json`)).json();
      const result = await runTemplatePackageImportPipelineV2({ format: "zip", sourceId: id, sourceName: descriptor.filename, buffer: await (await fetch(`/inputs/${id}.zip`)).arrayBuffer() });
      if (result.status !== "ready" || !result.package) throw new Error(`Import blocked: ${id}`);
      let pkg = result.package;
      for (const requirement of pkg.fontRequirements ?? []) {
        const font = descriptor.fonts.find((f: any) => f.family.toLowerCase() === requirement.family.toLowerCase() && f.weight === requirement.weight && f.style === requirement.cssStyle);
        if (!font) throw new Error(`Exact font missing: ${requirement.family}`);
        const uploaded = await uploadExactManagedFontForRequirement(pkg, requirement.id, await (await fetch(`/inputs/${font.id}.font`)).arrayBuffer(), { fileName: font.filename });
        pkg = uploaded.packageValue as TemplatePackageV2;
        if (pkg.fontRequirements?.find(r => r.id === requirement.id)?.resolution?.binaryHash !== font.sha256) throw new Error("Exact font hash mismatch");
      }
      pkg = { ...pkg, editableFields: pkg.editableFields.map(normalizeStudioTextField) };
      packages.push(pkg);
      // URL owners transfer at session load below; retain imports until then.
      window.editorProbe.imports ??= []; window.editorProbe.imports.push(result);
    }
    const first = packages[0];
    const seed: any = family ? { id: "probe-family", family: normalizeStudioFamilyTextLimits(createTemplateFieldFamilyFromSourcesV2(packages, "Performance Family")), name: "Performance Family" } : { id: "probe-single", name: first.name };
    session = studioRecords.openSession(seed);
    if (family) (session as any).load(seed.family); else (session as any).load(first);
    const record = studioRecords.capture(session, seed);
    const { lease } = await studioRecords.recovery.begin({ kind: family ? "family" : "single", templateId: record.id }, "fresh");
    window.editorProbe.imports.forEach((result: any) => result.dispose());
    window.editorProbe.rendererEvidence=[];
    if(!window.__editorLatencyOnly) for(const method of ['publishRuntimeReadiness','publishFieldLayoutEvidence'] as const) {
      const native=(session as any)[method].bind(session);
      (session as any)[method]=(evidence:any)=>{const accepted=native(evidence);window.editorProbe.rendererEvidence.push({method,at:performance.now(),accepted,evidence});return accepted;};
    }
    const nativeControllers = session.getFieldControllers.bind(session);
    session.getFieldControllers = (() => nativeControllers().map(field => field.type === "image" ? { ...field, replaceImage: (value: any) => {
      if (window.editorProbe.deferImage) { window.editorProbe.deferImage = false; return new Promise((resolve, reject) => { window.editorProbe.releaseImage = () => reject(new Error("Abandoned image read")); }); }
      return field.replaceImage(value);
    } } : "setValue" in field ? { ...field, setValue: (value: any) => {
      if (window.editorProbe.failCommit) { window.editorProbe.failCommit = false; throw new Error("Controlled commit failure"); }
      if (window.editorProbe.deferCommit) { window.editorProbe.deferCommit = false; return new Promise(resolve => { window.editorProbe.releaseCommit = () => resolve((field.setValue as any)(value)); }); }
      return (field.setValue as any)(value);
    } } : field)) as typeof session.getFieldControllers;
    const saveRecovery = studioRecords.recovery.save.bind(studioRecords.recovery);
    studioRecords.recovery.save = async (...args) => { if (window.editorProbe.failSave) { window.editorProbe.failSave = false; throw new Error("Controlled save failure"); } return saveRecovery(...args); };
    const fields = session.getFieldControllers();
    window.editorProbe.fields = fields.map(field => ({ id: field.id, type: field.type, label: field.label, value: field.value, nodeId: ("basePackage" in session.getSnapshot() ? (session.getSnapshot() as any).basePackage : (session.getSnapshot() as any).effectivePackage).editableFields.find((f: any) => f.id === field.id)?.binding.nodeId }));
    let revision = session.getSnapshot().contentState?.revision;
    stop = session.subscribe(() => { const next = session.getSnapshot().contentState?.revision; if (next !== revision) { revision = next; window.editorProbe.acceptances.push({ at: performance.now(), revision }); } });
    window.editorProbe.acceptances = [];
    root.render(<StrictMode><Shell initial={session} record={record} lease={lease} /></StrictMode>);
  },
  state() { const snapshot = session.getSnapshot(); return { readiness: snapshot.readiness, revision: snapshot.contentState?.revision, selectedVariantId: "selectedVariantId" in snapshot ? snapshot.selectedVariantId : null, fields: snapshot.fields.map(f => ({ id: f.descriptor.id, type: f.descriptor.type, value: f.value })), work: window.__editorWork, acceptances: window.editorProbe.acceptances }; },
  // Synthetic configuration only, separate from exact fixture certification.
  configureField(id: string, configuration: any) {
    const snapshot = session.getSnapshot();
    const fields = "family" in snapshot ? snapshot.family?.fields : snapshot.basePackage?.editableFields;
    if (!fields) throw new Error("Loaded session required");
    window.editorProbe.previousFieldConfiguration = structuredClone(fields.find(field => field.id === id)?.configuration);
    return (session as any).configure({ fields: fields.map(field => ({ id: field.id, type: field.type,
      ...(field.label !== undefined ? { label: field.label } : {}), ...(field.controlRole !== undefined ? { controlRole: field.controlRole } : {}),
      configuration: field.id === id ? configuration : field.configuration })) });
  },
  // Synthetic dependency mutations, never certified fixture inputs.
  reloadTextProbe(nodeId: string, changes: { width?: number; fontSize?: number; trim?: string }) {
    const snapshot = session.getSnapshot();
    if (!("basePackage" in snapshot) || !snapshot.basePackage) throw new Error("Single required");
    const pkg = structuredClone(snapshot.basePackage);
    const node = pkg.nodes[nodeId];
    if (node.type !== "TEXT" || !("characters" in node.text)) throw new Error("Text required");
    if (changes.width !== undefined) {
      node.sizing.horizontal = { ...node.sizing.horizontal, mode: "FIXED", value: changes.width };
      node.bounds.relative.width = changes.width;
    }
    if (changes.fontSize !== undefined) node.text.fontSize = changes.fontSize;
    if (changes.trim !== undefined) node.text.leadingTrim = changes.trim;
    (session as any).load(pkg);
  },
  replaceSession() {
    const before = session.getSnapshot();
    const seed: any = "family" in before ? { id: "replacement", name: "Replacement", family: before.family } : { id: "replacement", name: "Replacement" };
    const next = studioRecords.openSession(seed);
    if ("family" in before) (next as any).load(before.family, before.contentState, before.selectedVariantId); else (next as any).load(before.basePackage, before.contentState);
    const previous = session; stop?.(); session = next; replace(next); previous.dispose();
  },
  selectIndex(index: number) {
    if (!("selectVariant" in session)) throw new Error("Family required");
    const snapshot = session.getSnapshot();
    if (!("family" in snapshot) || !snapshot.family) throw new Error("Family required");
    const result = session.selectVariant(snapshot.family.variants[index].id);
    const selected = session.getSnapshot();
    const pkg = "effectivePackage" in selected ? selected.effectivePackage : null;
    window.editorProbe.fields = session.getFieldControllers().map(field => ({ id: field.id, type: field.type, label: field.label, value: field.value, nodeId: pkg?.editableFields.find(f => f.id === field.id)?.binding.nodeId }));
    return result;
  },
  selectNext() { if (!("selectVariant" in session)) throw new Error("Family required"); const s = session.getSnapshot(); if (!("family" in s) || !s.family) throw new Error("Family required"); return session.selectVariant(s.family.variants.find(v => v.id !== s.selectedVariantId)!.id); },
  dispose() { root.unmount(); stop?.(); session.dispose(); },
};
