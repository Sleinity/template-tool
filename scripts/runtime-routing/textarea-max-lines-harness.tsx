import { createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { createTemplateSessionV2, type BooleanFieldControllerV2, type TextareaFieldControllerV2 } from "../../packages/template-browser/src/session";
import {
  TemplateFieldSessionRendererV2,
  type TemplateFieldSessionRendererV2Handle,
} from "../../packages/template-react/src/fieldSessionV2";

declare global {
  interface Window {
    __textareaMaxLines?: {
      ready: boolean;
      snapshot(): ReturnType<ReturnType<typeof createTemplateSessionV2>["getSnapshot"]>;
      setText(value: string): number;
      setVisible(value: boolean): number;
      exportPng(): Promise<{ width: number; height: number; byteLength: number }>;
    };
  }
}

const response = await fetch("/__textarea-max-lines-package.json");
if (!response.ok) throw new Error("Textarea maxLines fixture package is unavailable.");
const packageValue = await response.json();
const session = createTemplateSessionV2();
session.load(packageValue);
if (session.getSnapshot().status !== "ready") throw new Error(`Textarea harness load failed: ${JSON.stringify(session.getSnapshot().error)}`);
const rendererRef = createRef<TemplateFieldSessionRendererV2Handle>();
const root = createRoot(document.getElementById("root")!);
root.render(createElement(TemplateFieldSessionRendererV2, {
  ref: rendererRef,
  session,
  mode: new URLSearchParams(location.search).get("mode") === "editor" ? "editor" : "static",
}));
const textarea = () => session.getFieldControllers().find(
  (field): field is TextareaFieldControllerV2 => field.type === "textarea",
)!;
const visibility = () => session.getFieldControllers().find(
  (field): field is BooleanFieldControllerV2 => field.type === "boolean" && field.id === "boolean:showMaxLinesBody",
)!;
window.__textareaMaxLines = {
  ready: true,
  snapshot: () => session.getSnapshot(),
  setText: (value) => {
    const result = textarea().setValue(value);
    if (!result.accepted) throw new Error("Textarea mutation was rejected.");
    return result.contentRevision;
  },
  setVisible: (value) => {
    const result = visibility().setValue(value);
    if (!result.accepted) throw new Error("Visibility mutation was rejected.");
    return result.contentRevision;
  },
  async exportPng() {
    let result;
    try {
      result = await rendererRef.current!.exportPng();
    } catch (error) {
      const diagnostics = (error as { diagnostics?: unknown }).diagnostics;
      throw new Error(`${error instanceof Error ? error.message : String(error)} ${JSON.stringify(diagnostics ?? null)}`);
    }
    const bytes = Math.max(0, Math.floor((result.pngDataUrl.length - result.pngDataUrl.indexOf(",") - 1) * 0.75));
    return { width: result.width, height: result.height, byteLength: bytes };
  },
};
