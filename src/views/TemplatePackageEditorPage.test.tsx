import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import figmaPluginV041 from "../template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  canOpenTemplatePackageEditor,
  type TemplatePackageEditorSession,
} from "../template-package/editor";
import type { TemplatePackageV1 } from "../template-package/types";
import { linkPackageMotionValue } from "../template-package/motion";
import { validateTemplatePackage } from "../template-package/validateTemplatePackage";
import {
  getLivePreviewMotionRenderMode,
  getPngExportMotionRenderMode,
  TemplatePackageEditorPage,
} from "./TemplatePackageEditorPage";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const originalPackage = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
const originalSnapshot = JSON.stringify(originalPackage);
const validation = validateTemplatePackage(originalPackage);

assert(validation.valid, "The v0.4.1 fixture should be valid.");
assert(
  canOpenTemplatePackageEditor(originalPackage, validation),
  "A valid package should be allowed to open in the editor.",
);
assert(
  !canOpenTemplatePackageEditor(originalPackage, {
    ...validation,
    valid: false,
    semanticValid: false,
  }),
  "An invalid package must not be allowed to open in the editor.",
);
assert(
  !canOpenTemplatePackageEditor(null, validation),
  "A missing package must not be allowed to open in the editor.",
);

const session: TemplatePackageEditorSession = {
  originalPackage,
  workingPackage: structuredClone(originalPackage),
  validation,
};
const markup = renderToStaticMarkup(
  createElement(TemplatePackageEditorPage, {
    session,
    onOpenTemplateSettings: () => undefined,
    onBackToTemplates: () => undefined,
  }),
);

assert(
  markup.includes('data-testid="package-editor-panel"'),
  "The package editor should render its dedicated control panel.",
);
assert(
  !markup.includes('class="ui-control-group-title mb-3"'),
  "The Render editor should preserve the canonical mixed field order without regrouping controls.",
);
assert(
  markup.includes("workspace-side-panel__header") &&
    markup.includes('data-scroll-owner="panel"') &&
    markup.includes("workspace-side-panel__footer") &&
    markup.includes("preview-workspace__stage"),
  "The editor should use the shared stable panel and continuous preview workspace contracts.",
);
assert(
  markup.includes('data-testid="package-working-preview"'),
  "The package editor should render a live semantic preview.",
);
assert(
  markup.indexOf('data-testid="package-working-preview"') <
    markup.indexOf('data-testid="package-editor-panel"'),
  "The live preview should precede the right-side settings panel.",
);
assert(
  markup.includes("Headline") && markup.includes("Read our blog."),
  "The package editor should render controls from editableFields.",
);
assert(
  markup.includes("Edit content"),
  "Package fields should appear in the shared edit-content panel.",
);
assert(
  !markup.includes("text.characters"),
  "Technical property paths should be hidden from the normal settings view.",
);
assert(
  markup.includes("Template check") &&
    markup.includes("Source notes") &&
    markup.includes("Preview issues") &&
    markup.includes("Field issues") &&
    markup.includes("Preview feature support") &&
    markup.includes("Fidelity risks"),
  "Diagnostics should remain visibly separated by source.",
);
assert(
  markup.includes('data-testid="renderer-feature-coverage-report"') &&
    markup.includes('data-testid="fidelity-risk-report"'),
  "The package editor should expose collapsed non-blocking stress-test reports.",
);
assert(
  markup.includes('data-testid="package-editor-diagnostics"') &&
    markup.includes('data-testid="package-editor-diagnostics-button"'),
  "Diagnostics should remain accessible from the preview toolbar.",
);
assert(
  !markup.includes("Semantic package renderer") &&
    !markup.includes("Snapshot Layout") &&
    !markup.includes("Static Motion"),
  "The preview toolbar should not repeat technical renderer status.",
);
assert(
  JSON.stringify(originalPackage) === originalSnapshot,
  "Rendering the editor must not mutate the original package.",
);
assert(
  markup.includes("Live preview") && markup.includes("Open diagnostics"),
  "The preview toolbar should retain only the preview label and diagnostics action.",
);
assert(
  !markup.includes("No changes") &&
    !markup.includes('data-testid="package-autosave-status"'),
  "A clean editor should not show a redundant autosave status label.",
);

const failedSaveMarkup = renderToStaticMarkup(
  createElement(TemplatePackageEditorPage, {
    session,
    saveState: {
      status: "failed",
      revision: 2,
      savedRevision: 1,
      message: "Automatic save failed: storage unavailable",
    },
    onRetrySave: async () => undefined,
    onOpenTemplateSettings: () => undefined,
    onBackToTemplates: () => undefined,
  }),
);
assert(
  failedSaveMarkup.includes('data-testid="package-autosave-status"') &&
    failedSaveMarkup.includes("Save failed") &&
    failedSaveMarkup.includes('data-testid="package-autosave-error"') &&
    failedSaveMarkup.includes("Retry save") &&
    failedSaveMarkup.includes("storage unavailable"),
  "The editor should surface autosave failures locally and offer a retry without discarding edits.",
);

const pendingSaveMarkup = renderToStaticMarkup(
  createElement(TemplatePackageEditorPage, {
    session,
    saveState: {
      status: "pending",
      revision: 2,
      savedRevision: 1,
      message: "Changes waiting to save.",
    },
    onOpenTemplateSettings: () => undefined,
    onBackToTemplates: () => undefined,
  }),
);
assert(
  pendingSaveMarkup.includes("Pending") &&
    !pendingSaveMarkup.includes("Retry save"),
  "The editor should distinguish pending autosave work from a failed save.",
);

const motionNodeId =
  Object.values(originalPackage.nodes).find((node) => node.parentId !== null)?.id ??
  originalPackage.rootNodeId;
const motionPackage = linkPackageMotionValue(structuredClone(originalPackage), {
  version: 1,
  playbackStyle: "loop",
  nodes: [
    {
      node: motionNodeId,
      timelineDurationMs: 1000,
      fields: [
        {
          field: "motionOpacity",
          keyframes: [
            { timeMs: 0, value: 0 },
            { timeMs: 1000, value: 1 },
          ],
        },
      ],
    },
  ],
}).packageValue;
const motionMarkup = renderToStaticMarkup(
  createElement(TemplatePackageEditorPage, {
    session: {
      originalPackage: motionPackage,
      workingPackage: structuredClone(motionPackage),
      validation: validateTemplatePackage(motionPackage),
    },
    onOpenTemplateSettings: () => undefined,
    onBackToTemplates: () => undefined,
  }),
);
assert(
  motionMarkup.includes('data-testid="package-motion-toggle"') &&
    motionMarkup.includes('role="switch"') &&
  motionMarkup.includes('aria-label="Play template motion"') &&
    motionMarkup.includes('aria-checked="false"') &&
    motionMarkup.includes("Showing final frame") &&
    motionMarkup.includes('data-package-motion-render-mode="final-frame"') &&
    !motionMarkup.includes('data-testid="package-motion-controls"'),
  "Live Preview should expose an off-by-default Motion toggle and render the deterministic final frame.",
);
assert(
  getLivePreviewMotionRenderMode(true, true) === "playback" &&
    getLivePreviewMotionRenderMode(false, true) === "final-frame" &&
    getLivePreviewMotionRenderMode(true, false) === "final-frame",
  "The Live Preview Motion toggle should select playback only for enabled, playable motion.",
);
assert(
  getPngExportMotionRenderMode(false) === "final-frame" &&
    getPngExportMotionRenderMode(true) === "final-frame",
  "PNG export should use the deterministic final frame whether Live Preview motion is off or actively playing.",
);
assert(
  motionMarkup.includes('data-package-png-frame-policy="final-frame"') &&
    (motionMarkup.match(
      /data-package-motion-render-mode="final-frame"/g,
    )?.length ?? 0) >= 2,
  "Motion-off Live Preview and the native PNG capture target should render the same final-frame policy.",
);
assert(
  !markup.includes('data-testid="package-motion-toggle"'),
  "Packages without usable motion should not expose a misleading Motion toggle.",
);
assert(
  markup.includes("Reset") &&
    markup.includes("Export PNG") &&
    markup.includes("Export MP4") &&
    markup.includes('data-testid="package-export-png-button"') &&
    markup.includes('data-testid="package-png-export-target"') &&
    markup.includes('data-package-png-frame-policy="final-frame"') &&
    !markup.includes(">Save<") &&
    !markup.includes("Saving") &&
    !markup.includes("Saved"),
  "The editor should focus on output controls without template-saving language.",
);

const emptyPackage = structuredClone(originalPackage);
emptyPackage.editableFields = [];
const markerFallbackMarkup = renderToStaticMarkup(
  createElement(TemplatePackageEditorPage, {
    session: {
      originalPackage: emptyPackage,
      workingPackage: structuredClone(emptyPackage),
      validation: validateTemplatePackage(emptyPackage),
    },
    onOpenTemplateSettings: () => undefined,
    onBackToTemplates: () => undefined,
  }),
);
assert(
  markerFallbackMarkup.includes("Headline") &&
    markerFallbackMarkup.includes('data-package-field-source="field-marker"') &&
    !markerFallbackMarkup.includes("No editable fields found."),
  "Packages without descriptors should fall back to field markers in node names.",
);

const trulyEmptyPackage = structuredClone(originalPackage);
trulyEmptyPackage.editableFields = [];
Object.values(trulyEmptyPackage.nodes).forEach((node) => {
  node.name = node.name.replace(/^field:/, "layer:");
});
const emptyMarkup = renderToStaticMarkup(
  createElement(TemplatePackageEditorPage, {
    session: {
      originalPackage: trulyEmptyPackage,
      workingPackage: structuredClone(trulyEmptyPackage),
      validation: validateTemplatePackage(trulyEmptyPackage),
    },
    onOpenTemplateSettings: () => undefined,
    onBackToTemplates: () => undefined,
  }),
);
assert(
  emptyMarkup.includes("No editable fields found.") &&
    emptyMarkup.includes("field:text:headline") &&
    emptyMarkup.includes("field:image:productImage"),
  "Packages without descriptors or marker fallbacks should show a helpful non-error empty state.",
);
