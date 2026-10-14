import { createElement, createRef, StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { normalizeTemplatePackageV1ToV2, type TemplatePackageV1 } from "@sleinity/template-core";
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import { createTemplateFieldFamilyFromSourcesV2 } from "@sleinity/template-browser/importer";
import { TemplateFieldSessionV2Provider, TemplateFieldSessionRendererV2, useTemplateSessionV2, useTemplateFieldSessionV2Snapshot, useTemplateFieldControllersV2, type ReactTemplateFieldSessionV2, type TemplateFieldSessionRendererV2Handle } from "../src/fieldSessionV2";

/** Test-only live renderer lifecycle. No production import of the internal adapter. */
export function startLifecycleProbe(raw: TemplatePackageV1, withTextarea = false) {
  const normalized = normalizeTemplatePackageV1ToV2(raw);
  if (!normalized.package) throw new Error("Lifecycle fixture failed normalization.");
  const source = normalized.package;
  if (withTextarea) {
    const field = source.editableFields[0];
    if (field.type !== "text") throw new Error("Expected compact text fixture.");
    source.editableFields = [{ ...field, id: "textarea:headline", type: "textarea", configuration: { maxLines: 3, warningAtLines: 2 } }];
    source.editableFieldOrder = ["textarea:headline"];
  }
  source.fontRequirements = []; // Logical publication test, not exact-font/source certification.
  const host = document.createElement("div"); document.body.replaceChildren(host);
  const rendererRef = createRef<TemplateFieldSessionRendererV2Handle>();
  const linePublications: Array<{ session: string; accepted: boolean; evidence: Parameters<ReactTemplateFieldSessionV2["publishFieldLayoutEvidence"]>[0] }> = [];
  const root = createRoot(host), publications: Array<{ session: string; accepted: boolean; evidence: unknown }> = [];
  const nativeNotifications: Array<{ session: string; revision: number; operationRevision: number; status: string }> = [];
  const stopTracking: Array<() => void> = [];
  const subscriptions = { opened: 0, closed: 0, active: 0, delivered: 0 };
  let observerCommits = 0;
  const single = createTemplateSessionV2(), family = createTemplateFieldFamilySessionV2();
  const familyValue = createTemplateFieldFamilyFromSourcesV2([source, structuredClone(source)], "Lifecycle");
  familyValue.id = "family-lifecycle-probe"; // Controlled relationship for paired executions.
  single.load(source); family.load(familyValue);
  const track = (session: ReactTemplateFieldSessionV2, name: string) => {
    const subscribe = session.subscribe;
    stopTracking.push(subscribe(() => {
      const snapshot = session.getSnapshot();
      nativeNotifications.push({ session: name, revision: snapshot.revision, operationRevision: snapshot.operationRevision, status: snapshot.status });
    }));
    session.subscribe = listener => {
      subscriptions.opened++; subscriptions.active++;
      const stop = subscribe(() => { subscriptions.delivered++; listener(); });
      let stopped = false;
      return () => { if (!stopped) { stopped = true; subscriptions.closed++; subscriptions.active--; stop(); } };
    };
    const publishLines = session.publishFieldLayoutEvidence;
    session.publishFieldLayoutEvidence = evidence => {
      const accepted = publishLines(evidence); linePublications.push({ session: name, accepted, evidence }); return accepted;
    };
    const publish = session.publishRuntimeReadiness;
    session.publishRuntimeReadiness = evidence => {
      const accepted = publish(evidence); publications.push({ session: name, accepted, evidence }); return accepted;
    };
  };
  track(single, "single"); track(family, "family");
  let current: ReactTemplateFieldSessionV2 = single, key = 0, commits = 0, cleanups = 0;
  let useOverride = true;
  const owned: ReactTemplateFieldSessionV2[] = [];
  function OwnedProbe() {
    const session = useTemplateSessionV2();
    useEffect(() => { session.load(source); owned.push(session); return () => {}; }, [session]);
    return null;
  }
  function Renderer({ session }: { session: ReactTemplateFieldSessionV2 }) {
    useEffect(() => { commits++; return () => { cleanups++; }; }, []);
    return createElement(TemplateFieldSessionRendererV2, { ref: rendererRef, session: useOverride ? session : undefined, mode: "editor" });
  }
  function Observer({ session }: { session: ReactTemplateFieldSessionV2 }) {
    const snapshot = useTemplateFieldSessionV2Snapshot(useOverride ? session : undefined);
    const fields = useTemplateFieldControllersV2(useOverride ? session : undefined);
    if (snapshot !== session.getSnapshot()) throw new Error("Public hook changed native snapshot identity.");
    useEffect(() => { observerCommits++; });
    return createElement("output", { "data-observed-status": snapshot.status }, JSON.stringify(fields.map(field => ({ id: field.id, type: field.type, value: field.value }))));
  }
  const render = () => root.render(createElement(StrictMode, null,
    createElement(OwnedProbe), createElement(TemplateFieldSessionV2Provider, { session: useOverride ? family : current },
      createElement(Observer, { session: current }), createElement(Renderer, { session: current, key }))));
  render();
  const evidence = (session: ReactTemplateFieldSessionV2) => {
    const s = session.getSnapshot();
    const materializationRevision = "materialization" in s ? s.materialization!.materializationRevision! : s.familyMaterialization!.materialization!.materializationRevision!;
    // A publication from the previous publisher range, never synthetic readiness acceptance.
    return { contentRevision: s.contentState!.revision, materializationRevision, settlementRevision: "old", fontRevision: "old", publicationGeneration: 1, renderer: "ready" as const };
  };
  return {
    state: () => ({ commits, cleanups, observerCommits, subscriptions: { ...subscriptions }, publications: [...publications], nativeNotifications: [...nativeNotifications],
      single: { status: single.getSnapshot().status, revision: single.getSnapshot().revision },
      family: { status: family.getSnapshot().status, revision: family.getSnapshot().revision },
      ownedStatuses: owned.map(session => session.getSnapshot().status),
      linePublications: [...linePublications], exportReady: current.getSnapshot().readiness.exportReady,
      canvasMounted: !!host.querySelector("[data-template-package-canvas]"),
      observed: host.querySelector("output")?.textContent,
    }),
    checkpoint: () => ({ snapshot: current.getSnapshot(), output: host.querySelector("output")?.textContent,
      canvas: host.querySelector("[data-template-package-canvas]")?.outerHTML }),
    edit() {
      const text = current.getFieldControllers().find(field => field.type === "text");
      if (!text || text.type !== "text") throw new Error("Text controller missing.");
      return text.setValue("Snapshot bridge edit");
    },
    async rejectLateEvidenceAndExport() {
      const name = current === single ? "single" : "family";
      const runtime = [...publications].reverse().find(item => item.session === name && item.accepted)?.evidence as Parameters<ReactTemplateFieldSessionV2["publishRuntimeReadiness"]>[0] | undefined;
      const lines = [...linePublications].reverse().find(item => item.session === name && item.accepted)?.evidence;
      if (!runtime || !lines) throw new Error("Current runtime and line evidence required.");
      current.beginRuntimeEvidencePublication();
      const runtimeAccepted = await Promise.resolve().then(() => current.publishRuntimeReadiness(runtime));
      const lineAccepted = await Promise.resolve().then(() => current.publishFieldLayoutEvidence(lines));
      let exportError: string | null = null;
      try { await rendererRef.current!.exportPng({ download: false }); } catch (error) { exportError = (error as Error).message; }
      return { name, runtimeAccepted, lineAccepted, exportError, readiness: current.getSnapshot().readiness };
    },
    oldSingleEvidence: evidence(single),
    useProvider() { useOverride = false; render(); },
    remount() { key++; render(); },
    replace() { current = family; key++; render(); },
    rejectOldSingle(e: ReturnType<typeof evidence>) { return single.publishRuntimeReadiness(e); },
    rejectOldFamily() { return family.publishRuntimeReadiness(evidence(family)); },
    unmount() { root.unmount(); },
    dispose() { stopTracking.forEach(stop => stop()); single.dispose(); family.dispose(); host.remove(); },
  };
}
