import { useRef, useState, type ReactNode } from "react";
import { buildZipPackageImportResult } from "@sleinity/template-browser/importer";
import type { TemplateFieldControllerV2, TemplateSessionV2MutationResult } from "@sleinity/template-browser/session";
import { TemplateFieldSessionRendererV2, useTemplateSessionV2, useTemplateFieldSessionV2Snapshot, type TemplateFieldSessionRendererV2Handle } from "@sleinity/template-react";

/** Complete host composition: public SDK only; no Studio or renderer internals. */
export function FieldRulesV2Host({ controls = {} }: {
  controls?: Record<string, (field: TemplateFieldControllerV2) => ReactNode>;
}) {
  const session = useTemplateSessionV2();
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
  const renderer = useRef<TemplateFieldSessionRendererV2Handle>(null);
  const loadGeneration = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const report = (result: TemplateSessionV2MutationResult) => setError(result.accepted ? null : result.blockingErrors.map((issue) => issue.message).join("\n"));
  const perform = async (action: () => Promise<unknown>) => { try { setError(null); await action(); } catch (cause) { setError(String(cause)); } };
  return <main style={{ padding: 24, fontFamily: "sans-serif" }}>
    <h1>Public SDK · custom field host</h1>
    <label>Load V2 JSON or exporter ZIP <input aria-label="Load V2 JSON or exporter ZIP" type="file" accept=".json,.zip" onChange={(event) => {
      const file = event.target.files?.[0]; if (!file) return;
      const generation = ++loadGeneration.current;
      void perform(async () => {
        const source = file.name.endsWith(".json") ? JSON.parse(await file.text()) : (await buildZipPackageImportResult(await file.arrayBuffer(), file.name)).package;
        if (generation !== loadGeneration.current) return;
        const loaded = session.load(source);
        if (loaded.status !== "ready") throw new Error(loaded.error?.message ?? "Source could not load.");
      });
    }} /></label>
    {error && <p role="alert">{error}</p>}
    <p role="status">{snapshot.readiness.exportReady ? "Ready to export" : snapshot.readiness.state}</p>
    {/* Controllers are already ordered by the portable editableFieldOrder. */}
    {session.getFieldControllers().map((field) => <section key={field.id} style={{ margin: "16px 0" }} data-host-field={field.id}>
      <h2>{field.label}</h2>
      {/* Host field override → recognized role → ordinary type control. */}
      {controls[field.id] ? controls[field.id](field) : field.type === "color" && field.controlRole === "brand-color" ? <div aria-label="Custom brand palette">
        {["#ff6644", "#123456", "#00aa88"].map((color) => <button key={color} type="button" onClick={() => report(field.setValue(color))} style={{ background: color, color: "white", padding: 10 }}>{color}</button>)}
      </div> : field.type === "text" ? <input aria-label={field.label} value={field.value} onChange={(event) => report(field.setValue(event.target.value))} /> :
        field.type === "textarea" ? <textarea aria-label={field.label} rows={4} value={field.value} onChange={(event) => report(field.setValue(event.target.value))} /> :
        field.type === "number" ? <input aria-label={field.label} type="number" step="any" value={field.value} onChange={(event) => report(field.setValue(event.target.valueAsNumber))} /> :
        field.type === "date" ? <input aria-label={field.label} type="date" value={field.value} onChange={(event) => report(field.setValue(event.target.value))} /> :
        field.type === "color" ? <input aria-label={field.label} type="color" value={field.value} onChange={(event) => report(field.setValue(event.target.value))} /> :
        field.type === "boolean" ? <input aria-label={field.label} type="checkbox" checked={field.value} onChange={(event) => report(field.setValue(event.target.checked))} /> :
        <div><input aria-label={`Replace ${field.label}`} type="file" accept="image/*" onChange={(event) => {
          const blob = event.target.files?.[0]; if (blob) void perform(async () => { report(await field.replaceImage({ blob })); });
        }} />
          {field.configuration.replacementPlacement === "crop" ? <button type="button" onClick={() => report(field.setPlacement({ mode: "crop", crop: { schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source", transform: [[0.5, 0, 0.25], [0, 0.5, 0.25]] } }))}>Host center Crop</button> : null}
        </div>}
      {"choices" in field.configuration && field.configuration.choices && "selectChoice" in field && <select aria-label={`${field.label} choices`} value={field.selectedChoiceId ?? ""} onChange={(event) => { if (event.target.value) report(field.selectChoice(event.target.value)); }}>
        <option value="">Choose a shortcut</option>{field.configuration.choices.options.map((option) => <option key={option.id} value={option.id}>{option.label ?? String(option.value)}</option>)}
      </select>}
      <p>{field.renderValidation.state}{"visualLines" in field.renderValidation ? `: ${field.renderValidation.visualLines} rendered lines` : ""}</p>
      {[...field.warnings, ...field.blockingErrors, ...(field.renderValidation.state === "invalid" ? field.renderValidation.errors : field.renderValidation.state === "valid" ? field.renderValidation.warnings : [])].map((issue, index) => <p key={index}>{issue.severity}: {issue.message}</p>)}
      <button type="button" onClick={() => report(field.reset())}>Reset {field.label}</button>
    </section>)}
    <button type="button" disabled={!snapshot.readiness.exportReady} onClick={() => void perform(() => renderer.current!.exportPng())}>Export PNG</button>
    <TemplateFieldSessionRendererV2 ref={renderer} session={session} mode="editor" />
  </main>;
}
