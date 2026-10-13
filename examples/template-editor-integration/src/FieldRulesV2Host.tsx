import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ManagedFontRegistry } from "@sleinity/template-browser/fonts";
import type { TemplateFieldControllerV2, TemplateSessionV2MutationResult } from "@sleinity/template-browser/session";
import { TemplateFieldSessionRendererV2, useTemplateFieldSessionV2Snapshot, type TemplateFieldSessionRendererV2Handle } from "@sleinity/template-react";
import { FieldHostLifecycle, hostErrorMessage, type AcceptedSource } from "./fieldHostLifecycle";

type Controls = Record<string, (field: TemplateFieldControllerV2) => ReactNode>;

/** Public SDK composition. Candidates prepare separately from the active editor. */
export function FieldRulesV2Host({ controls = {}, fontRegistry }: {
  controls?: Controls;
  fontRegistry?: ManagedFontRegistry | null;
}) {
  // Construction is resource-free; StrictMode's discarded render owns nothing.
  const [host] = useState(() => new FieldHostLifecycle());
  const view = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getSnapshot);
  useLayoutEffect(() => { host.attach(fontRegistry); return () => host.detach(); }, [host, fontRegistry]);
  useEffect(() => {
    if (view.accepted) host.committed(view.accepted.session);
  }, [host, view.accepted?.session]);
  return <main style={{ padding: 24, fontFamily: "sans-serif" }}>
    <h1>Public SDK · V2 field host</h1>
    <label>Load V2 JSON or exporter ZIP <input aria-label="Load V2 JSON or exporter ZIP" type="file" accept=".json,.zip" onChange={(event) => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (file) void host.importFile(file);
    }} /></label>
    {view.importError !== null && <p role="alert">{hostErrorMessage(view.importError)}</p>}
    {view.pending && <section aria-label="Pending template" style={{ marginBlock: 16 }}>
      <h2>{view.pending.sourceName}</h2>
      <p role="status">{view.pending.phase === "reading" ? "Reading source…" : view.pending.busy ? "Preparing fonts…" : view.pending.canOpen ? "Ready to open" : "Exact fonts required"}</p>
      {view.pending.requirements.map(requirement => <div key={requirement.id} style={{ marginBlock: 8 }}>
        <span>{requirement.label} · {requirement.exact ? "Exact font linked" : "Upload exact font"}</span>{" "}
        <label>Font file <input aria-label={`Font for ${requirement.label}`} type="file" accept=".ttf,.otf,.woff,.woff2,.ttc" disabled={view.pending!.busy} onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = "";
          if (file) void host.uploadFont(requirement.id, file);
        }} /></label>
      </div>)}
      {view.pending.error !== null && <p role="alert">{hostErrorMessage(view.pending.error)}</p>}
      {view.pending.error !== null && <button type="button" disabled={view.pending.busy} onClick={() => host.retryFonts()}>{view.pending.retryAvailable ? "Retry font upload" : "Retry font preparation"}</button>}
      <button type="button" disabled={!view.pending.canOpen} onClick={() => host.open()}>Open template</button>{" "}
      <button type="button" onClick={() => host.cancelImport()}>Cancel import</button>
    </section>}
    {view.accepted && <AcceptedEditor key={view.accepted.id} source={view.accepted} host={host} controls={controls} />}
  </main>;
}

function AcceptedEditor({ source, host, controls }: { source: AcceptedSource; host: FieldHostLifecycle; controls: Controls }) {
  const { session } = source;
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
  const renderer = useRef<TemplateFieldSessionRendererV2Handle>(null);
  const actionScope = useRef({ live: false, lifetime: 0, generation: 0 });
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  useLayoutEffect(() => {
    const scope = actionScope.current; scope.live = true; scope.lifetime++; scope.generation++;
    setWorking(false); setError(null);
    return () => { scope.live = false; scope.lifetime++; scope.generation++; };
  }, [source]);
  const current = (lifetime: number, generation: number) => actionScope.current.live &&
    actionScope.current.lifetime === lifetime && actionScope.current.generation === generation && host.isAccepted(source);
  const report = (result: TemplateSessionV2MutationResult) => setError(result.accepted ? null : result.blockingErrors.map(issue => issue.message).join("\n"));
  const mutate = (action: () => TemplateSessionV2MutationResult) => {
    if (!host.isAccepted(source)) return;
    // Any newer action supersedes obsolete feedback, including an image read.
    actionScope.current.generation++; setWorking(false);
    try { report(action()); } catch (cause) { setError(hostErrorMessage(cause)); }
  };
  const perform = async (action: () => Promise<unknown>) => {
    if (!host.isAccepted(source)) return;
    const lifetime = actionScope.current.lifetime, generation = ++actionScope.current.generation;
    setError(null); setWorking(true);
    try {
      const result = await action();
      if (current(lifetime, generation) && result && typeof result === "object" && "accepted" in result) report(result as TemplateSessionV2MutationResult);
    } catch (cause) { if (current(lifetime, generation)) setError(hostErrorMessage(cause)); }
    finally { if (current(lifetime, generation)) setWorking(false); }
  };
  return <section aria-label="Accepted template">
    <h2>{session.getSnapshot().basePackage?.name ?? source.sourceName}</h2>
    {error !== null && <p role="alert">{error}</p>}
    <p role="status">{snapshot.readiness.exportReady ? "Ready to export" : snapshot.readiness.state}</p>
    {/* Native controllers preserve portable order, validation and resource ownership. */}
    {session.getFieldControllers().map(field => <section key={field.id} style={{ margin: "16px 0" }} data-host-field={field.id}>
      <h3>{field.label}</h3>
      {controls[field.id] ? controls[field.id](field) : field.type === "color" && field.controlRole === "brand-color" ? <div aria-label="Custom brand palette">
        {["#ff6644", "#123456", "#00aa88"].map(color => <button key={color} type="button" onClick={() => mutate(() => field.setValue(color))} style={{ background: color, color: "white", padding: 10 }}>{color}</button>)}
      </div> : field.type === "text" ? <input aria-label={field.label} value={field.value} onChange={event => mutate(() => field.setValue(event.target.value))} /> :
        field.type === "textarea" ? <textarea aria-label={field.label} rows={4} value={field.value} onChange={event => mutate(() => field.setValue(event.target.value))} /> :
        field.type === "number" ? <input aria-label={field.label} type="number" step="any" value={field.value} onChange={event => mutate(() => field.setValue(event.target.valueAsNumber))} /> :
        field.type === "date" ? <input aria-label={field.label} type="date" value={field.value} onChange={event => mutate(() => field.setValue(event.target.value))} /> :
        field.type === "color" ? <input aria-label={field.label} type="color" value={field.value} onChange={event => mutate(() => field.setValue(event.target.value))} /> :
        field.type === "boolean" ? <input aria-label={field.label} type="checkbox" checked={field.value} onChange={event => mutate(() => field.setValue(event.target.checked))} /> :
        <div><input aria-label={`Replace ${field.label}`} type="file" accept="image/*" onChange={event => {
          const blob = event.target.files?.[0]; event.target.value = "";
          if (blob) void perform(() => field.replaceImage({ blob }));
        }} />
          {field.configuration.replacementPlacement === "crop" && <button type="button" onClick={() => mutate(() => field.setPlacement({ mode: "crop", crop: { schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source", transform: [[0.5, 0, 0.25], [0, 0.5, 0.25]] } }))}>Host center Crop</button>}
        </div>}
      {"choices" in field.configuration && field.configuration.choices && "selectChoice" in field && <select aria-label={`${field.label} choices`} value={field.selectedChoiceId ?? ""} onChange={event => { if (event.target.value) mutate(() => field.selectChoice(event.target.value)); }}>
        <option value="">Choose a shortcut</option>{field.configuration.choices.options.map(option => <option key={option.id} value={option.id}>{option.label ?? String(option.value)}</option>)}
      </select>}
      <p>{field.renderValidation.state}{"visualLines" in field.renderValidation ? `: ${field.renderValidation.visualLines} rendered lines` : ""}</p>
      {[...field.warnings, ...field.blockingErrors, ...(field.renderValidation.state === "invalid" ? field.renderValidation.errors : field.renderValidation.state === "valid" ? field.renderValidation.warnings : [])].map((issue, index) => <p key={index}>{issue.severity}: {issue.message}</p>)}
      <button type="button" onClick={() => mutate(() => field.reset())}>Reset {field.label}</button>
    </section>)}
    <button type="button" disabled={working || !snapshot.readiness.exportReady} onClick={() => void perform(() => {
      if (!renderer.current) throw new Error("The renderer is not ready.");
      return renderer.current.exportPng();
    })}>Export PNG</button>
    <TemplateFieldSessionRendererV2 ref={renderer} session={session} fontRegistry={source.fontRegistry} mode="editor" />
  </section>;
}
