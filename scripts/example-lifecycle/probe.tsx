/** Test-only entry. Production hosts expose none of these checkpoints. */
import { StrictMode, Profiler } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { InMemoryManagedFontRegistry, getManagedFontRegistry } from "@sleinity/template-browser/fonts";
import { createTemplateSessionV2 } from "@sleinity/template-browser/session";
import { InMemoryTemplateSessionRepositoryV2, TemplateStorageBlockedError } from "@sleinity/template-browser/persistence";
import { FieldRulesV2Host } from "./FieldRulesV2Host";
const w = window as any;
const repository = new InMemoryTemplateSessionRepositoryV2();
let root = createRoot(document.getElementById("root")!), registry: any;
const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? "custom";
registry = mode === "embedded" ? null : mode === "default" ? undefined : new InMemoryManagedFontRegistry();
const initialRegistry = registry;
const borrowed = registry ?? (mode === "default" ? getManagedFontRegistry() : null);
w.__operationOverrides = { createSession: () => createTemplateSessionV2({ repository }) };
if (borrowed) {
  for (const name of ["getFontBlob", "getManagedFont", "listManagedFonts", "getMapping"]) {
    const read = borrowed[name].bind(borrowed);
    borrowed[name] = (...args: any[]) => {
      w.__stats.registryReads++;
      if (name === "getFontBlob" && w.__missingBlob) return Promise.resolve(null);
      return read(...args);
    };
  }
  const register = borrowed.registerUploadedFont.bind(borrowed);
  borrowed.registerUploadedFont = (...args: any[]) => {
    if (w.__blockUpload) return Promise.reject(new TemplateStorageBlockedError("template-package-platform", 5));
    return register(...args);
  };
}
function render() { flushSync(() => root.render(<StrictMode><Profiler id="host" onRender={() => w.__stats.commits++}><FieldRulesV2Host fontRegistry={registry} /></Profiler></StrictMode>)); }
w.__test = {
  render,
  unmount() { flushSync(() => root.unmount()); },
  replaceRegistry() { registry = new InMemoryManagedFontRegistry(); render(); },
  restoreRegistry() { registry = initialRegistry; render(); },
  repository,
  createPeer(source: any) { const peer = createTemplateSessionV2({ repository }); peer.load(source); return peer; },
  async reopen(id: string) { const peer = createTemplateSessionV2({ repository }); await peer.loadSaved(id); return peer; },
};
render();
