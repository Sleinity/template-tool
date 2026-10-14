/** Public-entry host fixture. Instrumentation and deferred work are test-only. */
import { createElement, createRef, Profiler, StrictMode, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { normalizeTemplatePackageV1ToV2, type TemplatePackageV1 } from "@sleinity/template-core";
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import { createTemplateFieldFamilyFromSourcesV2 } from "@sleinity/template-browser/importer";
import { InMemoryTemplateSessionRepositoryV2 } from "@sleinity/template-browser/persistence";
import {
  getManagedFontRegistry, InMemoryManagedFontRegistry, uploadExactManagedFontForRequirement,
  prepareTemplatePackageFonts, createTemplatePackageFontEmbedCss,
  type ManagedFontRegistry,
} from "@sleinity/template-browser/fonts";
import {
  TemplateFieldSessionRendererV2, type TemplateFieldSessionRendererV2Handle,
} from "@sleinity/template-react/editor";

export async function startHostFontProbe(raw: TemplatePackageV1, bytes: number[], kind = "single", mode = "custom", equalFamily = false, compatibility = false, deferMount = false) {
  (globalThis as typeof globalThis & { __hostFontCommitHook?: typeof useLayoutEffect }).__hostFontCommitHook = useLayoutEffect;
  const source = structuredClone(raw);
  const headline = source.nodes.headline;
  if (headline.type !== "TEXT") throw new Error("Expected compact text node.");
  if (!("characters" in headline.text)) throw new Error("Expected modern text payload.");
  headline.text.characters = "Host font authority";
  if (!compatibility) {
    source.nodes.root.layout.mode = "VERTICAL";
    headline.positioning = "FLOW";
  }
  source.editableFields[0].defaultValue = "Host font authority";
  source.editableFields[0].id = "text:headline";
  source.fontRequirements = [{ id: "rethink-600", family: "Rethink Sans", postScriptName: "RethinkSans-SemiBold", style: "SemiBold", cssStyle: "normal", weight: 600,
    usedBy: ["headline"], characters: "Host font authority", editable: true, mixedStyle: false, source: "figma", availableInFigma: true }];
  const stats = { records: 0, blobs: 0, notifications: 0, identities: 0, commits: 0, readsCompleted: 0 };
  const usesDefault = mode === "default" || mode === "default-corrupt";
  const a = usesDefault ? getManagedFontRegistry()! : new InMemoryManagedFontRegistry();
  const b = new InMemoryManagedFontRegistry();
  const binary = new Uint8Array(bytes).buffer;
  const linked = await uploadExactManagedFontForRequirement(source, "rethink-600", binary,
    { registry: mode === "embedded" ? null : a, fileName: "rethink-sans-600.ttf" });
  if (mode !== "embedded") await uploadExactManagedFontForRequirement(source, "rethink-600", binary,
    { registry: b, fileName: "rethink-sans-600.ttf" });
  if (mode === "corrupt" || mode === "default-corrupt") a.getFontBlob = async () => new Blob([new Uint8Array([0, 1, 2])], { type: "font/ttf" });
  if (mode === "missing-binary") a.getFontBlob = async () => null;
  if (mode === "rejection") a.getManagedFont = async () => { throw new Error("Host font registry unavailable"); };
  if (mode === "mismatch") {
    const read = a.getManagedFont.bind(a);
    a.getManagedFont = async id => { const font = await read(id); return font ? { ...font, assetHash: "not-the-linked-binary" } : null; };
  }
  if (mode === "face-mismatch") {
    const read = a.getManagedFont.bind(a);
    a.getManagedFont = async id => { const font = await read(id); return font ? { ...font, style: "italic", weight: 400, postScriptName: "RethinkSans-Italic" } : null; };
  }
  const parsed = normalizeTemplatePackageV1ToV2(linked.packageValue);
  if (!parsed.package) throw new Error(`Font host fixture must normalize: ${JSON.stringify(parsed)}`);
  const base = parsed.package;
  const field = base.editableFields[0];
  if (field.type !== "text") throw new Error("Expected compact Text field.");
  base.editableFields = [{ ...field, id: "textarea:headline", type: "textarea", configuration: { maxLines: 5 } }];
  base.editableFieldOrder = ["textarea:headline"];
  const repository = new InMemoryTemplateSessionRepositoryV2();
  const createSession = () => kind === "family"
    ? createTemplateFieldFamilySessionV2({ repository }) : createTemplateSessionV2({ repository });
  let session = createSession();
  const retired: typeof session[] = [];
  const second = structuredClone(base);
  second.packageId = `${base.packageId}-second`;
  if (!equalFamily) {
    second.canvas.width = 600;
    second.nodes.root.bounds.absolute.width = 600;
    second.nodes.root.bounds.relative.width = 600;
    second.nodes.root.sizing.horizontal = { mode: "FIXED", value: 600, min: null, max: null };
  }
  const load = (current: typeof session) => "selectVariant" in current
    ? current.load(createTemplateFieldFamilyFromSourcesV2([base, second], "Font host")) : current.load(base);
  load(session);
  let stop = session.subscribe(() => { stats.notifications++; });
  const holders: Array<{ stage: string; release(): void }> = [];
  let hold: "record" | "blob" | null = null;
  const wrapped = (registry: ManagedFontRegistry): ManagedFontRegistry => new Proxy(registry, { get(target, key) {
    const value = Reflect.get(target, key);
    if (typeof value !== "function") return value;
    if (key !== "getManagedFont" && key !== "getFontBlob") return value.bind(target);
    return async (...args: unknown[]) => {
      const stage = key === "getManagedFont" ? "record" : "blob";
      if (stage === "record") stats.records++; else stats.blobs++;
      if (hold === stage) {
        hold = null;
        await new Promise<void>(resolve => holders.push({ stage, release: resolve }));
      }
      try { return await value.apply(target, args); } finally { stats.readsCompleted++; }
    };
  } });
  const registries = [wrapped(a), wrapped(b), new InMemoryManagedFontRegistry()];
  if (usesDefault) {
    a.getManagedFont = registries[0].getManagedFont;
    a.getFontBlob = registries[0].getFontBlob;
  }
  let registryIndex = mode === "missing" ? 2 : 0, key = 0, mounted = true;
  const node = document.createElement("div"); document.body.append(node);
  const root = createRoot(node), ref = createRef<TemplateFieldSessionRendererV2Handle>();
  const identity = () => { stats.identities++; };
  const render = () => flushSync(() => root.render(createElement(StrictMode, null,
    createElement(Profiler, { id: "host", onRender: () => { stats.commits++; } },
      createElement(TemplateFieldSessionRendererV2, { key, ref, session, mode: "editor", onRenderIdentity: identity,
        ...(usesDefault ? {} : { fontRegistry: mode === "embedded" || mode === "null-managed" ? null : registries[registryIndex] }) })))));
  if (!deferMount) render();
  const view = () => {
    const snapshot = session.getSnapshot();
    const content = snapshot.contentState;
    return { status: snapshot.status, revision: snapshot.revision, operationRevision: snapshot.operationRevision,
      readiness: snapshot.readiness, contentRevision: content?.revision,
      field: session.getFieldControllers().map(field => ({ id: field.id, value: field.value, validation: field.renderValidation.state })),
      selected: "selectedVariantId" in snapshot ? snapshot.selectedVariantId : null,
      canvas: snapshot.rendererPackage?.canvas,
      routedNodes: node.querySelector<HTMLElement>("[data-template-package-canvas]")?.dataset.packageRoutedNodeCount,
      publicationGeneration: Number(node.querySelector<HTMLElement>("[data-template-package-canvas]")?.dataset.packageSettlementGeneration ?? 0),
      identity: ref.current?.getRenderIdentity(), stats: { ...stats }, held: holders.length, mounted };
  };
  return {
    state: view,
    setRegistry(index: number) { registryIndex = index; render(); return view(); },
    holdRead(stage: "record" | "blob") { hold = stage; },
    release() { holders.splice(0).forEach(holder => holder.release()); },
    edit(value: string) {
      const field = session.getFieldControllers()[0];
      if (field.type !== "textarea") throw new Error("Expected Textarea.");
      return field.setValue(value);
    },
    reset() { return session.getFieldControllers()[0].reset(); },
    select() {
      const current = session;
      if (!("selectVariant" in current)) throw new Error("Family required.");
      const snapshot = current.getSnapshot();
      const ids = snapshot.family!.variants.map(variant => variant.id);
      return current.selectVariant(ids.find(id => id !== snapshot.selectedVariantId)!);
    },
    export(download = false, conflictingRegistry = false) {
      return ref.current!.exportPng(Object.assign({ download }, conflictingRegistry ? { fontRegistry: registries[2] } : {}));
    },
    beginExport(download = true) {
      const promise = ref.current!.exportPng({ download }).then(result => ({ ok: true, width: result.width, height: result.height }),
        error => ({ ok: false, message: (error as Error).message }));
      return promise;
    },
    remount() { key++; render(); },
    replaceSession() { const previous = session; retired.push(previous); stop(); session = createSession(); load(session); stop = session.subscribe(() => { stats.notifications++; }); render(); return previous.getSnapshot().status; },
    async preparation() { const s = session.getSnapshot(); return prepareTemplatePackageFonts(s.rendererPackage!, s.resolvedTree!, document.fonts, registries[0]); },
    embedding(registry: "current" | "missing" | "null" = "current") {
      return createTemplatePackageFontEmbedCss(session.getSnapshot().rendererPackage!, registry === "missing" ? registries[2] : registry === "null" ? null : registries[registryIndex]);
    },
    async save() { return (await session.save()).id; },
    async reopen(id: string) {
      const previous = session; stop(); session = createSession();
      await session.loadSaved(id); stop = session.subscribe(() => { stats.notifications++; });
      render(); previous.dispose();
    },
    async reopenInPlace(id: string) { session.reset(); await session.loadSaved(id); render(); },
    async transport() {
      const record = await session.save();
      return { record, fonts: await a.listManagedFonts(), bytes };
    },
    async restoreTransport(transport: { record: Awaited<ReturnType<typeof session.save>>; fonts: Awaited<ReturnType<typeof a.listManagedFonts>>; bytes: number[] }) {
      const next = new InMemoryManagedFontRegistry();
      for (const record of transport.fonts) await next.registerUploadedFont({ ...record, bytes: new Uint8Array(transport.bytes).buffer });
      if ("basePackage" in transport.record) await repository.saveTemplateSessionV2(transport.record);
      else await repository.saveTemplateFieldFamilyV3(transport.record);
      registries[0] = wrapped(next); registryIndex = 0;
      const previous = session; stop(); session = createSession(); await session.loadSaved(transport.record.id);
      stop = session.subscribe(() => { stats.notifications++; }); render(); previous.dispose();
    },
    async corruptUpload() {
      try { await uploadExactManagedFontForRequirement(source, "rethink-600", new Uint8Array([0, 1, 2]).buffer, { registry: a, fileName: "corrupt.ttf" }); return false; }
      catch { return true; }
    },
    async borrowedOwnership() {
      const fonts = await a.listManagedFonts();
      return { fonts: fonts.length, bytes: fonts[0] ? (await a.getFontBlob(fonts[0].assetHash))?.size : 0 };
    },
    async recreatedRegistry() {
      const next = new InMemoryManagedFontRegistry();
      await uploadExactManagedFontForRequirement(source, "rethink-600", binary, { registry: next, fileName: "rethink-sans-600.ttf" });
      registries[0] = wrapped(next); registryIndex = 0; render();
    },
    unmount() { flushSync(() => root.unmount()); mounted = false; },
    dispose() { if (mounted) { flushSync(() => root.unmount()); mounted = false; } stop(); session.dispose(); retired.forEach(old => old.dispose()); node.remove(); },
  };
}
