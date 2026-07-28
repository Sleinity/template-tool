import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import editorAutoLayoutReflow from "../fixtures/editor-auto-layout-reflow.json";
import editorParentReflow from "../fixtures/editor-parent-reflow.json";
import { createNowHiringResponsiveReflowFixture } from "../fixtures/nowHiringResponsiveReflow";
import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "../types";
import {
  getPackageMotionFinalFrameTimeMs,
  linkPackageMotionValue,
} from "../motion";
import {
  canvasBackgroundToCss,
  collectTemplatePackageRenderWarnings,
  normalizedColorToCss,
  resolvePackageAssetSource,
} from "./packageRenderUtils";
import { resolvePackageNodeLayoutRole } from "./packageLayoutModel";
import {
  resolveFigmaCapHeightTextHeight,
  TemplatePackageRenderer,
} from "./TemplatePackageRenderer";
import { TemplateInspectionPreview } from "./TemplateInspectionPreview";
import { TemplateInspectionViewport } from "./TemplateInspectionViewport";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue = figmaPluginV041 as unknown as TemplatePackageV1;
const markup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, { packageValue }),
);
const highlightedMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue,
    highlightNodeId: packageValue.rootNodeId,
  }),
);
const multiHighlightIds = Object.keys(packageValue.nodes)
  .filter((nodeId) => nodeId !== packageValue.rootNodeId)
  .slice(0, 2);
const multiHighlightedMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue,
    highlightNodeIds: multiHighlightIds,
  }),
);
const inspectionMarkup = renderToStaticMarkup(
  createElement(TemplateInspectionPreview, {
    packageValue,
    targetNodeIds: multiHighlightIds,
  }),
);
const missingInspectionMarkup = renderToStaticMarkup(
  createElement(TemplateInspectionPreview, {
    packageValue,
    targetNodeIds: ["missing-target"],
  }),
);
const viewportMarkup = renderToStaticMarkup(
  createElement(TemplateInspectionViewport, {
    packageValue,
    targetNodeIds: multiHighlightIds,
    className: "host-owned-stage",
    "data-host-stage": "true",
  }),
);

assert(markup.length > 0, "Package renderer should produce static markup.");
assert(
  markup.includes('data-package-runtime-routing="authoritative"') &&
    markup.includes("data-package-product-render-identity=") &&
    !markup.includes("data-package-renderer-rollout") &&
    !markup.includes("renderer-admin"),
  "The product renderer must expose one semantic-first identity without rollout selection metadata.",
);
assert(
  inspectionMarkup.includes("Fit template") &&
    inspectionMarkup.includes('aria-label="Zoom in"') &&
    inspectionMarkup.includes('aria-label="Zoom out"'),
  "The compatibility inspection preview should preserve accessible controls without a Studio UI dependency.",
);
assert(
  viewportMarkup.includes('class="host-owned-stage"') &&
    viewportMarkup.includes('data-host-stage="true"') &&
    viewportMarkup.includes('data-inspection-geometry-contract="settled-core-with-compatibility-fallback"') &&
    viewportMarkup.includes('data-inspection-isolation-overlay="true"'),
  "The composable inspection viewport should accept host stage attributes while preserving inspection geometry and overlays.",
);
assert(
  inspectionMarkup.includes('data-inspection-isolation-overlay="true"') &&
    inspectionMarkup.includes('data-inspection-geometry-contract="settled-core-with-compatibility-fallback"') &&
    inspectionMarkup.includes('data-package-runtime-routing="authoritative"') &&
    inspectionMarkup.includes('data-inspection-root-outline="true"') &&
    (inspectionMarkup.match(/data-inspection-target-outline="true"/g)?.length ?? 0) === 2 &&
    !inspectionMarkup.includes("data-package-quality-highlight-overlay"),
  "Inspection previews should dim once at the canvas layer, preserve every target cut-out, and draw a root outline outside exported renderer content.",
);
assert(
  !missingInspectionMarkup.includes('data-inspection-isolation-overlay="true"') &&
    !missingInspectionMarkup.includes('data-inspection-target-outline="true"') &&
    missingInspectionMarkup.includes('data-inspection-root-outline="true"'),
  "Missing inspection targets should clear isolation while retaining the non-exported template outline.",
);
assert(
  markup.includes('data-template-package-canvas="pkg_54_59_1782932033209"'),
  "Rendered markup should identify the package canvas.",
);
assert(
  multiHighlightIds.length === 2 &&
    multiHighlightIds.every((nodeId) =>
      multiHighlightedMarkup.includes(`data-package-quality-highlight-overlay="${nodeId}"`),
    ),
  "The renderer should highlight every node used by a multi-target inspection viewport.",
);
assert(
  markup.includes('data-package-node-id="54:59"'),
  "Rendering should begin at rootNodeId.",
);
assert(
  highlightedMarkup.includes(
    `data-package-quality-highlight="${"true"}"`,
  ) &&
    highlightedMarkup.includes(
      `data-package-quality-highlight-overlay="${packageValue.rootNodeId}"`,
    ) &&
    !markup.includes("data-package-quality-highlight-overlay"),
  "Quality highlighting should add a visual overlay only for the requested node.",
);
assert(
  markup.includes("Read our blog."),
  "TEXT nodes should render text.characters.",
);
assert(
  markup.includes("data:image/png;base64,iVBORw0KGgo"),
  "Image-bearing nodes should resolve embedded package assets.",
);
assert(
  normalizedColorToCss({ r: 0.09, g: 0.09, b: 0.09, a: 1 }) ===
    "rgba(23, 23, 23, 1)",
  "Normalized colors should convert to CSS rgba values.",
);
assert(
  canvasBackgroundToCss(packageValue.canvas.background) ===
    "rgba(23, 23, 23, 1)",
  "Canvas background conversion should support normalized colors.",
);
assert(
  resolvePackageAssetSource(packageValue.assets["asset:image:21b94426"])?.startsWith(
    "data:image/png",
  ),
  "Asset lookup should prefer embedded dataUrl values.",
);
const v041Warnings = collectTemplatePackageRenderWarnings(packageValue);
assert(
  !v041Warnings.some(
    (warning) => warning.code === "invalid-image-transform",
  ),
  "Valid Figma image transforms should no longer be treated as unsupported.",
);

const reflowPackage =
  editorAutoLayoutReflow as unknown as TemplatePackageV1;
const defaultStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: reflowPackage,
  }),
);
const explicitStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: reflowPackage,
    mode: "static",
  }),
);
const editorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: reflowPackage,
    mode: "editor",
  }),
);
const editedReflowPackage = structuredClone(reflowPackage);
const editedLabel = editedReflowPackage.nodes.label;
if (editedLabel.type === "TEXT" && "characters" in editedLabel.text) {
  editedLabel.text.characters =
    "A much longer discount value that should wrap safely";
}
const editedReflowMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: editedReflowPackage,
    mode: "editor",
  }),
);

function openingTag(markupValue: string, nodeId: string): string {
  const marker = `data-package-node-id="${nodeId}"`;
  const markerIndex = markupValue.indexOf(marker);
  assert(markerIndex >= 0, `Node "${nodeId}" should be rendered.`);
  const tagStart = markupValue.lastIndexOf("<div", markerIndex);
  const tagEnd = markupValue.indexOf(">", markerIndex);
  return markupValue.slice(tagStart, tagEnd + 1);
}

function hasStandaloneStyle(tag: string, property: string): boolean {
  return new RegExp(`(?:style="|;)${property}:`).test(tag);
}

const nowHiringPackage = createNowHiringResponsiveReflowFixture();
assert(
  resolveFigmaCapHeightTextHeight({
    capHeightPx: 116,
    lineHeightPx: 152,
    renderedLineCount: 1,
    verticalChromePx: 0,
  }) === 116 &&
    Math.abs(resolveFigmaCapHeightTextHeight({
      capHeightPx: 34.6,
      lineHeightPx: 52.8,
      renderedLineCount: 4,
      verticalChromePx: 0,
    }) - 193) < 0.001 &&
    Math.abs(resolveFigmaCapHeightTextHeight({
      capHeightPx: 34.6,
      lineHeightPx: 52.8,
      renderedLineCount: 5,
      verticalChromePx: 0,
    }) - 245.8) < 0.001,
  "Figma CAP_HEIGHT trim should use cap ascent plus line-height only between baselines.",
);
const nowHiringInitialMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: nowHiringPackage,
    mode: "editor",
  }),
);
const nowHiringStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: nowHiringPackage,
    mode: "static",
  }),
);
for (const markupValue of [nowHiringInitialMarkup, nowHiringStaticMarkup]) {
  const headlineTag = openingTag(markupValue, "headline");
  assert(
    headlineTag.includes('data-package-leading-trim="cap-height"') &&
      markupValue.includes('data-package-text-paint-box="true"') &&
      !headlineTag.includes("text-box-trim") &&
      !headlineTag.includes("height:193px"),
    "CAP_HEIGHT text should preserve a separate paint box and wait for exact runtime metrics without exported-height sizing.",
  );
}
const nowHiringExactEdit = structuredClone(nowHiringPackage);
if (
  nowHiringExactEdit.nodes.headline.type !== "TEXT" ||
  !("characters" in nowHiringExactEdit.nodes.headline.text)
) {
  throw new Error("Now-hiring fixture requires editable headline text.");
}
nowHiringExactEdit.nodes.headline.text.characters = String(
  nowHiringExactEdit.editableFields.find((field) => field.id === "text")
    ?.defaultValue,
);
const nowHiringExactEditMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: nowHiringExactEdit,
    mode: "editor",
  }),
);
assert(
  nowHiringInitialMarkup === nowHiringExactEditMarkup,
  "Imported defaults and an identical edit should use the same authoritative editor render path.",
);
assert(
  openingTag(nowHiringInitialMarkup, "root").includes("width:100%") &&
    openingTag(nowHiringInitialMarkup, "hero").includes("flex-grow:1") &&
    openingTag(nowHiringInitialMarkup, "footer").includes("height:fit-content"),
  "The responsive poster should keep a fixed root while HUG content and the FILL visual divide the available height.",
);
const nowHiringImageTag = openingTag(
  nowHiringInitialMarkup,
  "product-image",
);
assert(
  nowHiringImageTag.includes('data-package-image-render-mode="object-fit-cover"') &&
    nowHiringImageTag.includes('data-package-image-crop-mode="objectFitOnly"') &&
    nowHiringImageTag.includes('data-package-image-placement-strategy="cover"') &&
    nowHiringImageTag.includes('data-package-image-transform-applicability="preserved-inapplicable"') &&
    nowHiringImageTag.includes('data-package-image-intrinsic-size="1125x750"') &&
    nowHiringImageTag.includes("background-size:cover") &&
    !nowHiringInitialMarkup.includes("object-fit:fill"),
  "Responsive FILL images should preserve aspect ratio and use one slot-relative native cover operation.",
);

const motionRenderNodeId =
  Object.values(packageValue.nodes).find((node) => node.parentId !== null)?.id ??
  packageValue.rootNodeId;
const motionRenderPackage = linkPackageMotionValue(packageValue, {
  version: 1,
  playbackStyle: "once",
  nodes: [
    {
      node: motionRenderNodeId,
      timelineDurationMs: 1000,
      fields: [
        {
          field: "motionOpacity",
          keyframes: [
            { timeMs: 0, value: 0 },
            { timeMs: 1000, value: 1 },
          ],
        },
        {
          field: "motionRotation",
          keyframes: [
            { timeMs: 0, value: 0 },
            { timeMs: 1000, value: 90 },
          ],
        },
      ],
    },
  ],
}).packageValue;
const motionRenderMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: motionRenderPackage,
    motionTimeMs: 500,
  }),
);
const motionRenderTag = openingTag(motionRenderMarkup, motionRenderNodeId);
assert(
  motionRenderTag.includes("opacity:0.5") &&
    motionRenderTag.includes("rotate(45deg)"),
  "Motion opacity and rotation should be applied to rendered node styles.",
);

const diagnosticFinalFramePackage = linkPackageMotionValue(packageValue, {
  version: 1,
  playbackStyle: "loop",
  nodes: [
    {
      node: motionRenderNodeId,
      timelineDurationMs: 1000,
      fields: [
        {
          field: "motionOpacity",
          keyframes: [
            { timeMs: 0, value: 0 },
            { timeMs: 1000, value: 1 },
          ],
        },
        {
          field: "motionRotation",
          keyframes: [
            { timeMs: 0, value: 0 },
            { timeMs: 1000, value: 90 },
          ],
        },
      ],
    },
  ],
}).packageValue;
assert(
  getPackageMotionFinalFrameTimeMs(diagnosticFinalFramePackage) === 1000,
  "The diagnostic final frame should use timeline duration or the latest supported keyframe.",
);
const diagnosticFirstFrameMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: diagnosticFinalFramePackage,
  }),
);
const diagnosticFinalFrameMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: diagnosticFinalFramePackage,
    motionRenderMode: "final-frame",
    highlightNodeId: motionRenderNodeId,
  }),
);
const diagnosticFirstFrameTag = openingTag(
  diagnosticFirstFrameMarkup,
  motionRenderNodeId,
);
const diagnosticFinalFrameTag = openingTag(
  diagnosticFinalFrameMarkup,
  motionRenderNodeId,
);
assert(
  diagnosticFirstFrameTag.includes("opacity:0") &&
    diagnosticFinalFrameTag.includes("opacity:1") &&
    diagnosticFinalFrameTag.includes("rotate(90deg)"),
  "Final-frame rendering should clamp looping motion at its completed state instead of wrapping to frame zero.",
);
assert(
  diagnosticFinalFrameMarkup.includes(
    'data-package-motion-render-mode="final-frame"',
  ) &&
    diagnosticFinalFrameMarkup.includes(
      `data-package-quality-highlight-overlay="${motionRenderNodeId}"`,
    ),
  "Diagnostic final-frame rendering should remain deterministic while preserving affected-node highlighting.",
);

const invalidDiagnosticMotionPackage = structuredClone(
  diagnosticFinalFramePackage,
);
if (!invalidDiagnosticMotionPackage.motion) {
  throw new Error("Invalid motion fallback fixture requires package motion.");
}
invalidDiagnosticMotionPackage.motion.raw = {
  version: 1,
  playbackStyle: "loop",
  nodes: "invalid",
};
assert(
  getPackageMotionFinalFrameTimeMs(invalidDiagnosticMotionPackage) === null,
  "Invalid motion should not produce a diagnostic final-frame timestamp.",
);
const invalidFinalFrameTag = openingTag(
  renderToStaticMarkup(
    createElement(TemplatePackageRenderer, {
      packageValue: invalidDiagnosticMotionPackage,
      motionRenderMode: "final-frame",
    }),
  ),
  motionRenderNodeId,
);
const disabledMotionTag = openingTag(
  renderToStaticMarkup(
    createElement(TemplatePackageRenderer, {
      packageValue: invalidDiagnosticMotionPackage,
      motionRenderMode: "disabled",
    }),
  ),
  motionRenderNodeId,
);
assert(
  invalidFinalFrameTag === disabledMotionTag,
  "Invalid final-frame motion should fall back to the unchanged static node state.",
);

const boundsFirstPackage: TemplatePackageV1 = {
  schemaVersion: "1.0",
  packageId: "fixture.bounds-first-renderer",
  name: "Bounds First Renderer",
  canvas: { width: 400, height: 300, background: "#ffffff" },
  rootNodeId: "root",
  editableFields: [],
  assets: {},
  nodes: {
    root: {
      id: "root",
      name: "Root",
      type: "FRAME",
      parentId: null,
      children: ["first", "second", "clip", "unsupported"],
      bounds: {
        absolute: { x: 0, y: 0, width: 400, height: 300 },
        relative: { x: 0, y: 0, width: 400, height: 300 },
      },
      positioning: "ROOT",
      layout: {
        mode: "HORIZONTAL",
        wrap: false,
        gap: 80,
        rowGap: 80,
        columnGap: 80,
        padding: { top: 40, right: 40, bottom: 40, left: 40 },
        primaryAlignment: "MAX",
        counterAlignment: "MAX",
        clipContent: true,
      },
      sizing: {
        horizontal: { mode: "FIXED", value: 400, min: null, max: null },
        vertical: { mode: "FIXED", value: 300, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: null,
        cornerRadii: null,
        clipContent: true,
      },
    },
    first: {
      id: "first",
      name: "First",
      type: "RECTANGLE",
      parentId: "root",
      children: [],
      bounds: {
        absolute: { x: 100, y: 24, width: 80, height: 40 },
        relative: { x: 100, y: 24, width: 80, height: 40 },
      },
      positioning: "FLOW",
      layout: {
        mode: "NONE",
        wrap: false,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAlignment: "MIN",
        counterAlignment: "MIN",
        clipContent: false,
      },
      sizing: {
        horizontal: { mode: "HUG", value: null, min: null, max: null },
        vertical: { mode: "HUG", value: null, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }],
        strokes: [],
        effects: [],
        cornerRadius: null,
        cornerRadii: null,
        clipContent: false,
      },
      extensions: {
        tokens: {
          fill: "brand.primary",
          suggestedColor: { r: 0, g: 1, b: 0, a: 1 },
        },
      },
    },
    second: {
      id: "second",
      name: "Second",
      type: "RECTANGLE",
      parentId: "root",
      children: [],
      bounds: {
        absolute: { x: 120, y: 32, width: 80, height: 40 },
        relative: { x: 120, y: 32, width: 80, height: 40 },
      },
      positioning: "ABSOLUTE",
      layout: {
        mode: "NONE",
        wrap: false,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAlignment: "MIN",
        counterAlignment: "MIN",
        clipContent: false,
      },
      sizing: {
        horizontal: { mode: "FIXED", value: 80, min: null, max: null },
        vertical: { mode: "FIXED", value: 40, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 1, a: 1 } }],
        strokes: [],
        effects: [],
        cornerRadius: null,
        cornerRadii: null,
        clipContent: false,
      },
    },
    clip: {
      id: "clip",
      name: "Clip",
      type: "FRAME",
      parentId: "root",
      children: [],
      bounds: {
        absolute: { x: 20, y: 100, width: 100, height: 80 },
        relative: { x: 20, y: 100, width: 100, height: 80 },
      },
      positioning: "FLOW",
      layout: {
        mode: "NONE",
        wrap: false,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAlignment: "MIN",
        counterAlignment: "MIN",
        clipContent: true,
      },
      sizing: {
        horizontal: { mode: "FILL", value: null, min: null, max: null },
        vertical: { mode: "FILL", value: null, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: 12,
        cornerRadii: null,
        clipContent: true,
      },
    },
    unsupported: {
      id: "unsupported",
      name: "Unsupported",
      type: "VECTOR",
      parentId: "root",
      children: [],
      bounds: {
        absolute: { x: 240, y: 120, width: 60, height: 50 },
        relative: { x: 240, y: 120, width: 60, height: 50 },
      },
      positioning: "ABSOLUTE",
      layout: {
        mode: "NONE",
        wrap: false,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAlignment: "MIN",
        counterAlignment: "MIN",
        clipContent: false,
      },
      sizing: {
        horizontal: { mode: "FIXED", value: 60, min: null, max: null },
        vertical: { mode: "FIXED", value: 50, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: null,
        cornerRadii: null,
        clipContent: false,
      },
      vector: {
        assetId: null,
        renderMode: "UNSUPPORTED",
      },
    },
  },
};
const zipAssetPackage: TemplatePackageV1 = {
  schemaVersion: "1.0",
  packageId: "fixture.zip-asset-fidelity",
  name: "ZIP Asset Fidelity",
  canvas: { width: 320, height: 180, background: "#ffffff" },
  rootNodeId: "root",
  editableFields: [],
  assets: {
    "asset:image:zip-hero": {
      id: "asset:image:zip-hero",
      type: "image",
      source: "stored",
      mimeType: "image/png",
      storageKey: "sha256:zip-hero",
      stableUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lN7W2QAAAABJRU5ErkJggg==",
      width: 1,
      height: 1,
      hash: "zip-hero",
    },
    "asset:svg:zip-logo": {
      id: "asset:svg:zip-logo",
      type: "svg",
      source: "stored",
      mimeType: "image/svg+xml",
      storageKey: "sha256:zip-logo",
      stableUrl:
        "data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%2020%2010%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h20v10H0z%22%20fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E",
      viewBox: "0 0 20 10",
      hash: "zip-logo",
    },
  },
  nodes: {
    root: {
      id: "root",
      name: "Root",
      type: "FRAME",
      parentId: null,
      children: ["hero", "logo", "missing-image", "missing-svg"],
      bounds: {
        absolute: { x: 0, y: 0, width: 320, height: 180 },
        relative: { x: 0, y: 0, width: 320, height: 180 },
      },
      positioning: "ROOT",
      layout: {
        mode: "NONE",
        wrap: false,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAlignment: "MIN",
        counterAlignment: "MIN",
        clipContent: true,
      },
      sizing: {
        horizontal: { mode: "FIXED", value: 320, min: null, max: null },
        vertical: { mode: "FIXED", value: 180, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: null,
        cornerRadii: null,
        clipContent: true,
      },
    },
    hero: {
      id: "hero",
      name: "Hero image",
      type: "IMAGE",
      parentId: "root",
      children: [],
      bounds: {
        absolute: { x: 10, y: 10, width: 180, height: 100 },
        relative: { x: 10, y: 10, width: 180, height: 100 },
      },
      positioning: "ABSOLUTE",
      layout: {
        mode: "NONE",
        wrap: false,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAlignment: "MIN",
        counterAlignment: "MIN",
        clipContent: true,
      },
      sizing: {
        horizontal: { mode: "FIXED", value: 180, min: null, max: null },
        vertical: { mode: "FIXED", value: 100, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: null,
        cornerRadii: null,
        clipContent: true,
      },
      image: {
        assetId: "asset:image:zip-hero",
        deferred: false,
        scaleMode: "FILL",
        objectPosition: { x: 0.25, y: 0.75 },
      },
    },
    logo: {
      id: "logo",
      name: "Logo vector",
      type: "VECTOR",
      parentId: "root",
      children: [],
      bounds: {
        absolute: { x: 210, y: 10, width: 80, height: 40 },
        relative: { x: 210, y: 10, width: 80, height: 40 },
      },
      positioning: "ABSOLUTE",
      layout: {
        mode: "NONE",
        wrap: false,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAlignment: "MIN",
        counterAlignment: "MIN",
        clipContent: false,
      },
      sizing: {
        horizontal: { mode: "FIXED", value: 80, min: null, max: null },
        vertical: { mode: "FIXED", value: 40, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: null,
        cornerRadii: null,
        clipContent: false,
      },
      vector: {
        assetId: "asset:svg:zip-logo",
        renderMode: "SVG_ASSET",
        viewBox: "0 0 20 10",
        preserveAspectRatio: "xMidYMid meet",
      },
    },
    "missing-image": {
      id: "missing-image",
      name: "Missing image",
      type: "IMAGE",
      parentId: "root",
      children: [],
      bounds: {
        absolute: { x: 10, y: 120, width: 80, height: 40 },
        relative: { x: 10, y: 120, width: 80, height: 40 },
      },
      positioning: "ABSOLUTE",
      layout: {
        mode: "NONE",
        wrap: false,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAlignment: "MIN",
        counterAlignment: "MIN",
        clipContent: true,
      },
      sizing: {
        horizontal: { mode: "FIXED", value: 80, min: null, max: null },
        vertical: { mode: "FIXED", value: 40, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: null,
        cornerRadii: null,
        clipContent: true,
      },
      image: {
        assetId: "asset:image:missing",
        deferred: false,
        scaleMode: "FILL",
      },
    },
    "missing-svg": {
      id: "missing-svg",
      name: "Missing SVG",
      type: "VECTOR",
      parentId: "root",
      children: [],
      bounds: {
        absolute: { x: 110, y: 120, width: 80, height: 40 },
        relative: { x: 110, y: 120, width: 80, height: 40 },
      },
      positioning: "ABSOLUTE",
      layout: {
        mode: "NONE",
        wrap: false,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAlignment: "MIN",
        counterAlignment: "MIN",
        clipContent: false,
      },
      sizing: {
        horizontal: { mode: "FIXED", value: 80, min: null, max: null },
        vertical: { mode: "FIXED", value: 40, min: null, max: null },
      },
      appearance: {
        visible: true,
        opacity: 1,
        fills: [],
        strokes: [],
        effects: [],
        cornerRadius: null,
        cornerRadii: null,
        clipContent: false,
      },
      vector: {
        assetId: "asset:svg:missing",
        renderMode: "SVG_ASSET",
      },
    },
  },
};
const boundsFirstMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: boundsFirstPackage,
    mode: "static",
  }),
);
const boundsFirstRootTag = openingTag(boundsFirstMarkup, "root");
const boundsFirstFirstTag = openingTag(boundsFirstMarkup, "first");
const boundsFirstSecondTag = openingTag(boundsFirstMarkup, "second");
const boundsFirstClipTag = openingTag(boundsFirstMarkup, "clip");
assert(
  boundsFirstMarkup.includes("width:400px") &&
    boundsFirstMarkup.includes("height:300px"),
  "Resolved root canvas dimensions should be used for the render surface.",
);
assert(
  boundsFirstMarkup.indexOf('data-package-node-id="first"') <
    boundsFirstMarkup.indexOf('data-package-node-id="second"'),
  "Resolved child order should preserve stacking order in the rendered DOM.",
);
assert(
  boundsFirstFirstTag.includes("position:absolute") &&
    boundsFirstFirstTag.includes("left:100px") &&
    boundsFirstFirstTag.includes("top:24px") &&
    boundsFirstFirstTag.includes("width:80px") &&
    boundsFirstFirstTag.includes("height:40px") &&
    !boundsFirstRootTag.includes("gap:80px"),
  "Static graph rendering should use exported bounds instead of Auto Layout placement.",
);
assert(
  boundsFirstFirstTag.includes("background-color:rgba(255, 0, 0, 1)") &&
    !boundsFirstFirstTag.includes("rgba(0, 255, 0, 1)"),
  "Raw exported fills should remain the render source of truth instead of token metadata.",
);
assert(
  boundsFirstSecondTag.includes("position:absolute") &&
    boundsFirstSecondTag.includes("left:120px") &&
    boundsFirstSecondTag.includes("top:32px"),
  "Absolute nodes should remain overlays inside their parent.",
);
assert(
  boundsFirstClipTag.includes("overflow:hidden") &&
    boundsFirstClipTag.includes("border-radius:12px"),
  "Clipping and border radius should be preserved from the resolved graph.",
);
assert(
  boundsFirstMarkup.includes('data-package-fallback-placeholder="unsupported"') &&
    boundsFirstMarkup.includes('data-package-fallback-reason="unsupported vector render mode"'),
  "Unsupported visible nodes should render a placeholder instead of disappearing silently.",
);
const zipAssetMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: zipAssetPackage,
    mode: "static",
  }),
);
const zipHeroTag = openingTag(zipAssetMarkup, "hero");
assert(
  zipHeroTag.includes('data-package-image-asset="asset:image:zip-hero"') &&
    zipHeroTag.includes('data-package-asset-source="image"') &&
    zipHeroTag.includes("background-size:cover") &&
    zipHeroTag.includes("background-position:25% 75%") &&
    zipAssetMarkup.includes("data:image/png;base64"),
  "ZIP-backed image assets should resolve through the graph and FILL should render as cover/crop.",
);
assert(
  zipAssetMarkup.includes('data-package-vector-asset="asset:svg:zip-logo"') &&
    zipAssetMarkup.includes('data-package-asset-source="vector"') &&
    zipAssetMarkup.includes('data-package-vector-source="asset-source"') &&
    zipAssetMarkup.includes("data:image/svg+xml"),
  "ZIP-backed SVG/vector assets should resolve through the graph asset source.",
);
assert(
  zipAssetMarkup.includes('data-package-missing-asset-placeholder="image"') &&
    zipAssetMarkup.includes(">Missing image</span>") &&
    zipAssetMarkup.includes('data-package-missing-asset-placeholder="vector"') &&
    zipAssetMarkup.includes(">Missing SVG</span>"),
  "Missing image and SVG assets should render lightweight, non-crashing placeholders.",
);

assert(
  defaultStaticMarkup === explicitStaticMarkup,
  "Static mode should remain the renderer default.",
);

const staticBadgeTag = openingTag(defaultStaticMarkup, "badge");
assert(
  staticBadgeTag.includes("width:140px") &&
    staticBadgeTag.includes("height:80px"),
  "Static HUG frames should retain their exported bounds.",
);

const editorBadgeTag = openingTag(editorMarkup, "badge");
assert(
  editorBadgeTag.includes("width:fit-content") &&
    editorBadgeTag.includes("height:fit-content"),
  "Editor HUG frames should size to their live content.",
);
assert(
  editorBadgeTag.includes("max-width:300px"),
  "Editor HUG frames should preserve max-width constraints.",
);

const editorLabelTag = openingTag(editorMarkup, "label");
assert(
  editorLabelTag.includes("width:fit-content") &&
    editorLabelTag.includes("height:fit-content"),
  "HUG text should grow with text.characters in editor mode.",
);
assert(
  editorLabelTag.includes("min-width:0") &&
    editorLabelTag.includes("max-width:100%"),
  "HUG text should be able to shrink or wrap inside a capped flex parent.",
);
assert(
  editedReflowMarkup.includes(
    "A much longer discount value that should wrap safely",
  ) &&
    openingTag(editedReflowMarkup, "badge").includes("width:fit-content"),
  "Edited text should render through the live HUG parent layout.",
);

const editorFixedTag = openingTag(editorMarkup, "fixed");
assert(
  editorFixedTag.includes("width:180px") &&
    editorFixedTag.includes("height:80px") &&
    editorFixedTag.includes("flex-grow:0") &&
    editorFixedTag.includes("flex-shrink:0"),
  "FIXED nodes should remain fixed in editor mode.",
);

const editorOverlayTag = openingTag(editorMarkup, "overlay");
assert(
  editorOverlayTag.includes("position:absolute") &&
    editorOverlayTag.includes("left:420px") &&
    editorOverlayTag.includes("top:600px"),
  "ABSOLUTE children should continue using bounds.relative.",
);

assert(
  renderToStaticMarkup(
    createElement(TemplatePackageRenderer, {
      packageValue,
      mode: "static",
    }),
  ).includes("Read our blog."),
  "The existing v0.4.1 fixture should still render in static mode.",
);

const parentReflowPackage =
  editorParentReflow as unknown as TemplatePackageV1;
const groupFlowRole = resolvePackageNodeLayoutRole(
  parentReflowPackage.nodes.hero,
  "VERTICAL",
);
assert(
  groupFlowRole.positioning === "FLOW" &&
    groupFlowRole.parentMainAxis === "vertical" &&
    groupFlowRole.mainAxisSizing === "FILL" &&
    groupFlowRole.counterAxisSizing === "FILL" &&
    !groupFlowRole.isAbsolute,
  "GROUP/layout NONE should derive its flex role from the Auto Layout parent.",
);
const overlayRole = resolvePackageNodeLayoutRole(
  parentReflowPackage.nodes.overlay,
  "VERTICAL",
);
assert(
  overlayRole.positioning === "ABSOLUTE" && overlayRole.isAbsolute,
  "Explicit ABSOLUTE positioning should leave the parent flow.",
);
const noneParentRole = resolvePackageNodeLayoutRole(
  parentReflowPackage.nodes.headline,
  "NONE",
);
assert(
  noneParentRole.isAbsolute,
  "Children of layout.mode NONE should use bounds-based placement.",
);
const parentStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: parentReflowPackage,
    mode: "static",
  }),
);
const parentEditorPackage = structuredClone(parentReflowPackage);
const parentEditorHeadline = parentEditorPackage.nodes.headline;
if (
  parentEditorHeadline.type === "TEXT" &&
  "characters" in parentEditorHeadline.text
) {
  parentEditorHeadline.text.characters =
    "A longer headline\nthat uses three\nresponsive lines.";
}
const parentEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: parentEditorPackage,
    mode: "editor",
  }),
);

const staticFooterTag = openingTag(parentStaticMarkup, "footer");
assert(
  staticFooterTag.includes("height:120px"),
  "Static mode should preserve the exported footer height.",
);

const editorHeroTag = openingTag(parentEditorMarkup, "hero");
assert(
  editorHeroTag.includes("position:relative") &&
    editorHeroTag.includes("flex-grow:1") &&
    editorHeroTag.includes("flex-shrink:1") &&
    editorHeroTag.includes("flex-basis:0"),
  "The FILL hero should remain in flow and absorb remaining vertical space.",
);
assert(
  editorHeroTag.includes('data-package-node-type="GROUP"'),
  "A GROUP with layout.mode NONE should still participate as a FLOW flex child.",
);
assert(
  !hasStandaloneStyle(editorHeroTag, "left") &&
    !hasStandaloneStyle(editorHeroTag, "top"),
  "FLOW children in Auto Layout must not retain exported offsets.",
);

const editorFooterTag = openingTag(parentEditorMarkup, "footer");
assert(
  editorFooterTag.includes("position:relative") &&
    editorFooterTag.includes("height:fit-content") &&
    editorFooterTag.includes("flex-grow:0") &&
    editorFooterTag.includes("flex-shrink:0"),
  "The HUG footer should grow without being compressed by the root flex layout.",
);
assert(
  !hasStandaloneStyle(editorFooterTag, "left") &&
    !hasStandaloneStyle(editorFooterTag, "top"),
  "The HUG footer should be positioned by parent Auto Layout.",
);

const editorHeadlineAreaTag = openingTag(
  parentEditorMarkup,
  "headline-area",
);
assert(
  editorHeadlineAreaTag.includes("height:fit-content") &&
    editorHeadlineAreaTag.includes("flex-shrink:0"),
  "Nested HUG parents should propagate edited text height upward.",
);
assert(
  parentEditorMarkup.includes(
    "A longer headline\nthat uses three\nresponsive lines.",
  ),
  "The parent reflow fixture should render edited multiline text.",
);

const parentOverlayTag = openingTag(parentEditorMarkup, "overlay");
assert(
  parentOverlayTag.includes("position:absolute") &&
    parentOverlayTag.includes("left:420px") &&
    parentOverlayTag.includes("top:80px"),
  "Absolute overlays should remain anchored to bounds.relative.",
);

const constraintPackage = structuredClone(parentReflowPackage);
const constraintContainer = constraintPackage.nodes.hero;
constraintContainer.layout.clipContent = false;
constraintContainer.appearance.clipContent = false;
constraintContainer.children = [
  "stretch-child",
  "top-fixed-child",
  "top-fill-child",
  "stretch-hug-child",
  "center-hug-child",
  "center-both-child",
  "right-hug-child",
  "bottom-hug-child",
  "bottom-child",
  "scale-child",
  "horizontal-scale-child",
  "vertical-scale-child",
  "scale-fill-child",
  "missing-child",
  "unsupported-child",
];

function addConstraintChild(
  id: string,
  bounds: { x: number; y: number; width: number; height: number },
  constraints?: { horizontal: string; vertical: string },
): void {
  const child = structuredClone(constraintPackage.nodes.overlay);
  child.id = id;
  child.name = id;
  child.parentId = "hero";
  child.bounds.relative = bounds;
  child.bounds.absolute = bounds;
  child.sizing.horizontal.value = bounds.width;
  child.sizing.vertical.value = bounds.height;
  child.extensions = constraints
    ? { figma: { constraints } }
    : undefined;
  constraintPackage.nodes[id] = child;
}

addConstraintChild(
  "stretch-child",
  { x: 20, y: 40, width: 560, height: 200 },
  { horizontal: "STRETCH", vertical: "STRETCH" },
);
addConstraintChild(
  "top-fixed-child",
  { x: 20, y: 40, width: 200, height: 200 },
  { horizontal: "MIN", vertical: "MIN" },
);
addConstraintChild(
  "top-fill-child",
  { x: 240, y: 40, width: 200, height: 600 },
  { horizontal: "LEFT", vertical: "TOP" },
);
constraintPackage.nodes["top-fill-child"].sizing.vertical = {
  mode: "FILL",
  value: null,
  min: 120,
  max: 620,
};
addConstraintChild(
  "stretch-hug-child",
  { x: 30, y: 260, width: 180, height: 90 },
  { horizontal: "STRETCH", vertical: "STRETCH" },
);
constraintPackage.nodes["stretch-hug-child"].sizing.horizontal = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
constraintPackage.nodes["stretch-hug-child"].sizing.vertical = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
addConstraintChild(
  "center-hug-child",
  { x: 180, y: 120, width: 220, height: 125 },
  { horizontal: "CENTER", vertical: "TOP" },
);
constraintPackage.nodes["center-hug-child"].sizing.horizontal = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
constraintPackage.nodes["center-hug-child"].sizing.vertical = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
addConstraintChild(
  "center-both-child",
  { x: 250, y: 310, width: 120, height: 80 },
  { horizontal: "CENTER", vertical: "CENTER" },
);
addConstraintChild(
  "right-hug-child",
  { x: 430, y: 260, width: 130, height: 70 },
  { horizontal: "RIGHT", vertical: "TOP" },
);
constraintPackage.nodes["right-hug-child"].sizing.horizontal = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
addConstraintChild(
  "bottom-hug-child",
  { x: 40, y: 570, width: 150, height: 70 },
  { horizontal: "LEFT", vertical: "BOTTOM" },
);
constraintPackage.nodes["bottom-hug-child"].sizing.vertical = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
addConstraintChild(
  "bottom-child",
  { x: 40, y: 560, width: 120, height: 80 },
  { horizontal: "MAX", vertical: "MAX" },
);
addConstraintChild(
  "scale-child",
  { x: 60, y: 68, width: 300, height: 136 },
  { horizontal: "SCALE", vertical: "SCALE" },
);
addConstraintChild(
  "horizontal-scale-child",
  { x: 60, y: 200, width: 300, height: 80 },
  { horizontal: "SCALE", vertical: "CENTER" },
);
addConstraintChild(
  "vertical-scale-child",
  { x: 240, y: 68, width: 120, height: 136 },
  { horizontal: "CENTER", vertical: "SCALE" },
);
addConstraintChild(
  "scale-fill-child",
  { x: 20, y: 40, width: 560, height: 600 },
  { horizontal: "SCALE", vertical: "SCALE" },
);
constraintPackage.nodes["scale-fill-child"].sizing.horizontal = {
  mode: "FILL",
  value: null,
  min: null,
  max: null,
};
constraintPackage.nodes["scale-fill-child"].sizing.vertical = {
  mode: "FILL",
  value: null,
  min: null,
  max: null,
};
addConstraintChild(
  "missing-child",
  { x: 80, y: 300, width: 100, height: 100 },
);
addConstraintChild(
  "unsupported-child",
  { x: 100, y: 420, width: 100, height: 100 },
  { horizontal: "LEFT", vertical: "MAGIC" },
);

const constraintStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: constraintPackage,
    mode: "static",
  }),
);
const constraintEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: constraintPackage,
    mode: "editor",
  }),
);

const staticStretchTag = openingTag(
  constraintStaticMarkup,
  "stretch-child",
);
assert(
  staticStretchTag.includes("top:40px") &&
    staticStretchTag.includes("height:200px") &&
    !hasStandaloneStyle(staticStretchTag, "bottom"),
  "Static mode should preserve exported absolute child snapshot bounds.",
);

const editorConstraintContainerTag = openingTag(
  constraintEditorMarkup,
  "hero",
);
assert(
  constraintContainer.layout.mode === "NONE" &&
    editorConstraintContainerTag.includes("flex-grow:1") &&
    editorConstraintContainerTag.includes("flex-shrink:1") &&
    editorConstraintContainerTag.includes("overflow:hidden") &&
    !editorConstraintContainerTag.includes("height:680px") &&
    editorConstraintContainerTag.includes(
      'data-package-live-resize-containment="clip"',
    ),
  "An absolute child inside a live FILL layout.mode NONE parent should receive constraint context and containment.",
);

const editorStretchTag = openingTag(
  constraintEditorMarkup,
  "stretch-child",
);
assert(
  editorStretchTag.includes("top:40px") &&
    editorStretchTag.includes("left:20px") &&
    editorStretchTag.includes("right:20px") &&
    editorStretchTag.includes("bottom:440px") &&
    !hasStandaloneStyle(editorStretchTag, "width") &&
    !hasStandaloneStyle(editorStretchTag, "height") &&
    editorStretchTag.includes(
      'data-package-constraint-horizontal="LEFT_RIGHT"',
    ) &&
    editorStretchTag.includes(
      'data-package-constraint-vertical="TOP_BOTTOM"',
    ) &&
    editorStretchTag.includes(
      'data-package-constraint-horizontal-raw="STRETCH"',
    ) &&
    editorStretchTag.includes(
      'data-package-constraint-vertical-raw="STRETCH"',
    ),
  "ABSOLUTE + FIXED + STRETCH should preserve edge offsets and use live parent dimensions.",
);

const directStretchPackage = structuredClone(constraintPackage);
const directStretchNode = directStretchPackage.nodes["stretch-child"];
directStretchNode.parentId = "root";
directStretchNode.bounds.relative = {
  x: 20,
  y: 30,
  width: 560,
  height: 740,
};
directStretchNode.bounds.absolute = {
  x: 20,
  y: 30,
  width: 560,
  height: 740,
};
directStretchNode.sizing.horizontal = {
  mode: "FIXED",
  value: 560,
  min: null,
  max: null,
};
directStretchNode.sizing.vertical = {
  mode: "FIXED",
  value: 740,
  min: null,
  max: null,
};
directStretchPackage.nodes.root.children.push("stretch-child");
directStretchPackage.nodes.hero.children =
  directStretchPackage.nodes.hero.children.filter(
    (childId) => childId !== "stretch-child",
  );

const directStretchStaticTag = openingTag(
  renderToStaticMarkup(
    createElement(TemplatePackageRenderer, {
      packageValue: directStretchPackage,
      mode: "static",
    }),
  ),
  "stretch-child",
);
const directStretchEditorTag = openingTag(
  renderToStaticMarkup(
    createElement(TemplatePackageRenderer, {
      packageValue: directStretchPackage,
      mode: "editor",
    }),
  ),
  "stretch-child",
);
assert(
  directStretchStaticTag.includes("left:20px") &&
    directStretchStaticTag.includes("width:560px") &&
    directStretchStaticTag.includes("height:740px") &&
    !hasStandaloneStyle(directStretchStaticTag, "right"),
  "Static mode should keep a direct absolute STRETCH child snapshot-authoritative.",
);
assert(
  directStretchEditorTag.includes("left:20px") &&
    directStretchEditorTag.includes("right:20px") &&
    directStretchEditorTag.includes("top:30px") &&
    directStretchEditorTag.includes("bottom:30px") &&
    !hasStandaloneStyle(directStretchEditorTag, "width") &&
    !hasStandaloneStyle(directStretchEditorTag, "height") &&
    directStretchEditorTag.includes(
      'data-package-constraint-horizontal-normalized="LEFT_RIGHT"',
    ) &&
    directStretchEditorTag.includes(
      'data-package-constraint-vertical-normalized="TOP_BOTTOM"',
    ) &&
    directStretchEditorTag.includes(
      'data-package-constraint-stretch-active="horizontal,vertical"',
    ),
  "A direct ABSOLUTE + FIXED + STRETCH child should resolve against a fixed Auto Layout parent in editor mode.",
);

const editorTopFixedTag = openingTag(
  constraintEditorMarkup,
  "top-fixed-child",
);
assert(
  editorTopFixedTag.includes("top:40px") &&
    editorTopFixedTag.includes("height:200px") &&
    !hasStandaloneStyle(editorTopFixedTag, "bottom") &&
    !editorTopFixedTag.includes("constraint-sizing-override"),
  "TOP + FIXED absolute children should preserve exported height in editor mode.",
);

const editorTopFillTag = openingTag(
  constraintEditorMarkup,
  "top-fill-child",
);
assert(
  editorTopFillTag.includes("top:40px") &&
    editorTopFillTag.includes("bottom:40px") &&
    !hasStandaloneStyle(editorTopFillTag, "height") &&
    editorTopFillTag.includes(
      'data-package-constraint-sizing-override="vertical"',
    ) &&
    editorTopFillTag.includes(
      'data-package-constraint-vertical-offsets="40,40"',
    ) &&
    editorTopFillTag.includes("min-height:120px") &&
    editorTopFillTag.includes("max-height:620px"),
  "TOP + FILL absolute children should preserve exported edge offsets and resize with the live parent.",
);

const staticTopFillTag = openingTag(
  constraintStaticMarkup,
  "top-fill-child",
);
assert(
  staticTopFillTag.includes("top:40px") &&
    staticTopFillTag.includes("height:600px") &&
    !hasStandaloneStyle(staticTopFillTag, "bottom"),
  "Static mode should keep TOP + FILL children on snapshot geometry.",
);

const editorStretchHugTag = openingTag(
  constraintEditorMarkup,
  "stretch-hug-child",
);
assert(
  editorStretchHugTag.includes("left:30px") &&
    editorStretchHugTag.includes("top:260px") &&
    editorStretchHugTag.includes("width:fit-content") &&
    editorStretchHugTag.includes("height:fit-content") &&
    !hasStandaloneStyle(editorStretchHugTag, "right") &&
    !hasStandaloneStyle(editorStretchHugTag, "bottom") &&
    editorStretchHugTag.includes(
      'data-package-constraint-horizontal="LEFT"',
    ) &&
    editorStretchHugTag.includes(
      'data-package-constraint-vertical="TOP"',
    ),
  "HUG combined with explicit STRETCH should preserve live content size and use the exported start-edge anchor.",
);

const editorCenterHugTag = openingTag(
  constraintEditorMarkup,
  "center-hug-child",
);
const staticCenterHugTag = openingTag(
  constraintStaticMarkup,
  "center-hug-child",
);
assert(
  staticCenterHugTag.includes("left:180px") &&
    staticCenterHugTag.includes("width:220px") &&
    !staticCenterHugTag.includes("translate:"),
  "Static mode should preserve the centered badge snapshot geometry.",
);
assert(
  editorCenterHugTag.includes("left:calc(50% + -10px)") &&
    editorCenterHugTag.includes("translate:-50% 0") &&
    editorCenterHugTag.includes("width:fit-content") &&
    editorCenterHugTag.includes("height:fit-content"),
  "CENTER constraints should align the live center of a HUG badge without freezing its content size.",
);

const editorCenterBothTag = openingTag(
  constraintEditorMarkup,
  "center-both-child",
);
assert(
  editorCenterBothTag.includes("left:calc(50% + 10px)") &&
    editorCenterBothTag.includes("top:calc(50% + 10px)") &&
    editorCenterBothTag.includes("translate:-50% -50%") &&
    editorCenterBothTag.includes("width:120px") &&
    editorCenterBothTag.includes("height:80px"),
  "CENTER + FIXED should compose center translations while retaining fixed dimensions.",
);

const editorRightHugTag = openingTag(
  constraintEditorMarkup,
  "right-hug-child",
);
assert(
  editorRightHugTag.includes("right:40px") &&
    editorRightHugTag.includes("width:fit-content") &&
    !hasStandaloneStyle(editorRightHugTag, "left"),
  "RIGHT + HUG should preserve the exported right edge while using live content width.",
);

const editorBottomHugTag = openingTag(
  constraintEditorMarkup,
  "bottom-hug-child",
);
assert(
  editorBottomHugTag.includes("bottom:40px") &&
    editorBottomHugTag.includes("height:fit-content") &&
    !hasStandaloneStyle(editorBottomHugTag, "top"),
  "BOTTOM + HUG should preserve the exported bottom edge while using live content height.",
);

const editorBottomTag = openingTag(
  constraintEditorMarkup,
  "bottom-child",
);
assert(
  editorBottomTag.includes("right:440px") &&
  editorBottomTag.includes("bottom:40px") &&
    editorBottomTag.includes("height:80px") &&
    !hasStandaloneStyle(editorBottomTag, "left") &&
    !hasStandaloneStyle(editorBottomTag, "top"),
  "MAX/BOTTOM constraints should preserve exported opposite-edge offsets.",
);

const editorScaleTag = openingTag(
  constraintEditorMarkup,
  "scale-child",
);
assert(
  editorScaleTag.includes("left:10%") &&
    editorScaleTag.includes("width:50%") &&
    editorScaleTag.includes("top:10%") &&
    editorScaleTag.includes("height:20%"),
  "SCALE constraints should convert exported geometry to parent-relative percentages.",
);
const staticScaleTag = openingTag(
  constraintStaticMarkup,
  "scale-child",
);
assert(
  staticScaleTag.includes("left:60px") &&
    staticScaleTag.includes("top:68px") &&
    staticScaleTag.includes("width:300px") &&
    staticScaleTag.includes("height:136px"),
  "Static mode should preserve SCALE child snapshot bounds.",
);

const horizontalScaleTag = openingTag(
  constraintEditorMarkup,
  "horizontal-scale-child",
);
assert(
  horizontalScaleTag.includes("left:10%") &&
    horizontalScaleTag.includes("width:50%") &&
    horizontalScaleTag.includes("top:calc(50% + -100px)") &&
    horizontalScaleTag.includes("translate:0 -50%"),
  "Horizontal SCALE + vertical CENTER should scale only x/width and preserve the opposite-axis center anchor.",
);

const verticalScaleTag = openingTag(
  constraintEditorMarkup,
  "vertical-scale-child",
);
assert(
  verticalScaleTag.includes("left:calc(50% + 0px)") &&
    verticalScaleTag.includes("translate:-50% 0") &&
    verticalScaleTag.includes("top:10%") &&
    verticalScaleTag.includes("height:20%"),
  "Vertical SCALE + horizontal CENTER should scale only y/height and preserve the opposite-axis center anchor.",
);

const scaleFillTag = openingTag(
  constraintEditorMarkup,
  "scale-fill-child",
);
assert(
  scaleFillTag.includes("left:20px") &&
    scaleFillTag.includes("right:20px") &&
    scaleFillTag.includes("top:40px") &&
    scaleFillTag.includes("bottom:40px") &&
    !hasStandaloneStyle(scaleFillTag, "width") &&
    !hasStandaloneStyle(scaleFillTag, "height"),
  "Normalized FILL should take priority over SCALE and use exported edge offsets.",
);

const editorMissingTag = openingTag(
  constraintEditorMarkup,
  "missing-child",
);
assert(
  editorMissingTag.includes("left:80px") &&
    editorMissingTag.includes("top:300px") &&
    editorMissingTag.includes(
      'data-package-constraint-fallback="snapshot-and-clip"',
    ),
  "Missing constraints should retain snapshot geometry without crashing.",
);

const constraintWarnings = collectTemplatePackageRenderWarnings(
  constraintPackage,
  "editor",
);
assert(
  constraintWarnings.some(
    (warning) => warning.code === "editor-live-resize-contained",
  ) &&
    constraintWarnings.some(
      (warning) => warning.code === "missing-absolute-constraints",
    ) &&
    constraintWarnings.some(
      (warning) => warning.code === "unsupported-figma-constraint",
    ),
  "Editor warnings should explain containment and missing or unsupported constraints.",
);
assert(
  constraintWarnings.some(
    (warning) =>
      warning.code === "constraint-sizing-conflict" &&
      warning.nodeId === "top-fill-child",
  ),
  "TOP + FILL conflicts should emit one non-blocking renderer warning.",
);
assert(
  constraintWarnings.filter(
    (warning) =>
      warning.code === "hug-stretch-constraint-conflict" &&
      warning.nodeId === "stretch-hug-child",
  ).length === 2,
  "HUG plus horizontal and vertical STRETCH should emit focused compatibility warnings for both axes.",
);
assert(
  constraintWarnings.filter(
    (warning) =>
      warning.code === "scale-fill-constraint-conflict" &&
      warning.nodeId === "scale-fill-child",
  ).length === 2,
  "SCALE plus FILL should emit focused compatibility warnings for both axes.",
);
assert(
  !constraintWarnings.some(
    (warning) =>
      warning.code === "constraint-sizing-conflict" &&
      warning.nodeId === "stretch-child",
  ),
  "Normal explicit STRETCH constraints should not emit a sizing conflict warning.",
);
assert(
  !collectTemplatePackageRenderWarnings(
    constraintPackage,
    "static",
  ).some((warning) => warning.code.startsWith("editor-")),
  "Constraint containment warnings should not affect static mode.",
);

const nestedOverlayPackage = structuredClone(parentReflowPackage);
const nestedVisual = nestedOverlayPackage.nodes.hero;
nestedVisual.layout.mode = "VERTICAL";
nestedVisual.layout.clipContent = false;
nestedVisual.appearance.clipContent = false;
nestedVisual.children = [
  "overlay-section",
  "direct-bottom-badge",
  "auto-layout-scale-child",
];

const overlaySection = structuredClone(nestedOverlayPackage.nodes.overlay);
overlaySection.id = "overlay-section";
overlaySection.name = "Overlay Section";
overlaySection.parentId = "hero";
overlaySection.children = ["overlay-frame"];
overlaySection.bounds.relative = {
  x: 0,
  y: 0,
  width: 600,
  height: 680,
};
overlaySection.bounds.absolute = overlaySection.bounds.relative;
overlaySection.sizing.horizontal.value = 600;
overlaySection.sizing.vertical.value = 680;
overlaySection.extensions = {
  figma: {
    constraints: {
      horizontal: "LEFT_RIGHT",
      vertical: "TOP_BOTTOM",
    },
  },
};
nestedOverlayPackage.nodes[overlaySection.id] = overlaySection;

const directBottomBadge = structuredClone(
  nestedOverlayPackage.nodes.overlay,
);
directBottomBadge.id = "direct-bottom-badge";
directBottomBadge.name = "Direct Bottom Badge";
directBottomBadge.parentId = "hero";
directBottomBadge.bounds.relative = {
  x: 220,
  y: 560,
  width: 160,
  height: 80,
};
directBottomBadge.bounds.absolute = directBottomBadge.bounds.relative;
directBottomBadge.sizing.horizontal = {
  mode: "FIXED",
  value: 160,
  min: null,
  max: null,
};
directBottomBadge.sizing.vertical = {
  mode: "FIXED",
  value: 80,
  min: null,
  max: null,
};
directBottomBadge.extensions = {
  figma: {
    constraints: {
      horizontal: "CENTER",
      vertical: "BOTTOM",
    },
  },
};
nestedOverlayPackage.nodes[directBottomBadge.id] = directBottomBadge;

const autoLayoutScaleChild = structuredClone(directBottomBadge);
autoLayoutScaleChild.id = "auto-layout-scale-child";
autoLayoutScaleChild.name = "Auto Layout Scale Child";
autoLayoutScaleChild.bounds.relative = {
  x: 60,
  y: 68,
  width: 300,
  height: 136,
};
autoLayoutScaleChild.bounds.absolute =
  autoLayoutScaleChild.bounds.relative;
autoLayoutScaleChild.sizing.horizontal = {
  mode: "FIXED",
  value: 300,
  min: null,
  max: null,
};
autoLayoutScaleChild.sizing.vertical = {
  mode: "FIXED",
  value: 136,
  min: null,
  max: null,
};
autoLayoutScaleChild.extensions = {
  figma: {
    constraints: {
      horizontal: "SCALE",
      vertical: "SCALE",
    },
  },
};
nestedOverlayPackage.nodes[autoLayoutScaleChild.id] =
  autoLayoutScaleChild;

const overlayFrame = structuredClone(nestedOverlayPackage.nodes.footer);
overlayFrame.id = "overlay-frame";
overlayFrame.name = "Overlay Frame";
overlayFrame.parentId = "overlay-section";
overlayFrame.positioning = "ABSOLUTE";
overlayFrame.children = ["badge", "bottom-marker"];
overlayFrame.bounds.relative = {
  x: 40,
  y: 40,
  width: 520,
  height: 600,
};
overlayFrame.bounds.absolute = overlayFrame.bounds.relative;
overlayFrame.sizing.horizontal = {
  mode: "FIXED",
  value: 520,
  min: null,
  max: null,
};
overlayFrame.sizing.vertical = {
  mode: "FILL",
  value: null,
  min: null,
  max: null,
};
overlayFrame.layout.mode = "VERTICAL";
overlayFrame.layout.padding = {
  top: 32,
  right: 24,
  bottom: 48,
  left: 24,
};
overlayFrame.layout.gap = 20;
overlayFrame.layout.primaryAlignment = "SPACE_BETWEEN";
overlayFrame.extensions = {
  figma: {
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FILL",
    constraints: {
      horizontal: "LEFT_RIGHT",
      vertical: "TOP",
    },
  },
};
nestedOverlayPackage.nodes[overlayFrame.id] = overlayFrame;

const badge = structuredClone(nestedOverlayPackage.nodes.footer);
badge.id = "badge";
badge.name = "Badge";
badge.parentId = "overlay-frame";
badge.positioning = "FLOW";
badge.children = [];
badge.bounds.relative = { x: 24, y: 32, width: 160, height: 72 };
badge.bounds.absolute = badge.bounds.relative;
badge.sizing.horizontal = {
  mode: "HUG",
  value: null,
  min: 160,
  max: null,
};
badge.sizing.vertical = {
  mode: "HUG",
  value: null,
  min: 72,
  max: null,
};
badge.layout.padding = {
  top: 12,
  right: 20,
  bottom: 12,
  left: 20,
};
nestedOverlayPackage.nodes[badge.id] = badge;

const bottomMarker = structuredClone(nestedOverlayPackage.nodes.overlay);
bottomMarker.id = "bottom-marker";
bottomMarker.name = "Bottom Marker";
bottomMarker.parentId = "overlay-frame";
bottomMarker.bounds.relative = {
  x: 360,
  y: 500,
  width: 120,
  height: 60,
};
bottomMarker.bounds.absolute = bottomMarker.bounds.relative;
bottomMarker.sizing.horizontal.value = 120;
bottomMarker.sizing.vertical.value = 60;
bottomMarker.extensions = {
  figma: {
    constraints: {
      horizontal: "RIGHT",
      vertical: "BOTTOM",
    },
  },
};
nestedOverlayPackage.nodes[bottomMarker.id] = bottomMarker;

const nestedStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: nestedOverlayPackage,
    mode: "static",
  }),
);
const nestedEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: nestedOverlayPackage,
    mode: "editor",
  }),
);
const horizontalParentPackage = structuredClone(nestedOverlayPackage);
horizontalParentPackage.nodes.hero.layout.mode = "HORIZONTAL";
const horizontalParentMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: horizontalParentPackage,
    mode: "editor",
  }),
);

const nestedStaticFrameTag = openingTag(
  nestedStaticMarkup,
  "overlay-frame",
);
assert(
  nestedStaticFrameTag.includes("top:40px") &&
    nestedStaticFrameTag.includes("height:600px") &&
    !hasStandaloneStyle(nestedStaticFrameTag, "bottom"),
  "Static mode should retain nested overlay snapshot placement.",
);

const nestedOverlaySectionTag = openingTag(
  nestedEditorMarkup,
  "overlay-section",
);
assert(
  nestedOverlaySectionTag.includes("top:0") &&
    nestedOverlaySectionTag.includes("bottom:0") &&
    !hasStandaloneStyle(nestedOverlaySectionTag, "height"),
  "A STRETCH overlay section should resolve against the live visual container height.",
);

const nestedOverlayFrameTag = openingTag(
  nestedEditorMarkup,
  "overlay-frame",
);
assert(
  nestedOverlayFrameTag.includes("top:40px") &&
    nestedOverlayFrameTag.includes("bottom:40px") &&
    !hasStandaloneStyle(nestedOverlayFrameTag, "height") &&
    nestedOverlayFrameTag.includes("display:flex") &&
    nestedOverlayFrameTag.includes("flex-direction:column") &&
    nestedOverlayFrameTag.includes("padding-top:32px") &&
    nestedOverlayFrameTag.includes("padding-right:24px") &&
    nestedOverlayFrameTag.includes("padding-bottom:48px") &&
    nestedOverlayFrameTag.includes("padding-left:24px") &&
    nestedOverlayFrameTag.includes("gap:20px") &&
    nestedOverlayFrameTag.includes("justify-content:space-between") &&
    nestedOverlayFrameTag.includes(
      'data-package-constraint-sizing-override="vertical"',
    ),
  "A nested TOP + FILL overlay frame should use its live parent height while retaining Auto Layout padding and gap.",
);

const directBottomBadgeTag = openingTag(
  nestedEditorMarkup,
  "direct-bottom-badge",
);
assert(
  directBottomBadgeTag.includes("bottom:40px") &&
    directBottomBadgeTag.includes("height:80px") &&
    !hasStandaloneStyle(directBottomBadgeTag, "top"),
  "An absolute badge directly inside a live FILL Auto Layout section should resolve against the live parent bounds.",
);
const autoLayoutScaleTag = openingTag(
  nestedEditorMarkup,
  "auto-layout-scale-child",
);
assert(
  autoLayoutScaleTag.includes("left:10%") &&
    autoLayoutScaleTag.includes("width:50%") &&
    autoLayoutScaleTag.includes("top:10%") &&
    autoLayoutScaleTag.includes("height:20%"),
  "SCALE should resolve for a direct absolute child inside a resized Auto Layout parent.",
);
assert(
  openingTag(horizontalParentMarkup, "direct-bottom-badge").includes(
    "bottom:40px",
  ),
  "A direct absolute child inside a HORIZONTAL Auto Layout parent should also receive live constraint context.",
);

const nestedBadgeTag = openingTag(nestedEditorMarkup, "badge");
assert(
  nestedBadgeTag.includes("position:relative") &&
    nestedBadgeTag.includes("height:fit-content") &&
    !nestedBadgeTag.includes("transform:"),
  "Badge-like HUG children should remain normal flex items without transform scaling.",
);
assert(
  nestedEditorMarkup.indexOf('data-package-node-id="badge"') <
    nestedEditorMarkup.indexOf('data-package-node-id="bottom-marker"'),
  "Auto Layout children should retain package children order.",
);

const nestedBottomMarkerTag = openingTag(
  nestedEditorMarkup,
  "bottom-marker",
);
assert(
  nestedBottomMarkerTag.includes("right:40px") &&
    nestedBottomMarkerTag.includes("bottom:40px") &&
    !hasStandaloneStyle(nestedBottomMarkerTag, "top"),
  "Nested BOTTOM constraints should attach descendants to the resolved live overlay frame.",
);

assert(
  openingTag(nestedEditorMarkup, "hero").includes("overflow:hidden"),
  "A live FILL Auto Layout section should provide constraint context and contain nested overlay fallbacks.",
);

const compatibilityPackage = structuredClone(nestedOverlayPackage);
compatibilityPackage.nodes["direct-bottom-badge"].extensions = {
  figma: {
    layoutSizingHorizontal: "FILL",
    layoutSizingVertical: "FILL",
    layoutGrow: 1,
    layoutAlign: "STRETCH",
    constraints: {
      horizontal: "CENTER",
      vertical: "BOTTOM",
    },
  },
};
compatibilityPackage.nodes.badge.sizing.horizontal.mode = "FIXED";
compatibilityPackage.nodes.badge.sizing.vertical.mode = "FIXED";
compatibilityPackage.nodes.badge.extensions = {
  figma: {
    layoutSizingHorizontal: "FILL",
    layoutSizingVertical: "FILL",
    layoutGrow: 1,
    layoutAlign: "STRETCH",
  },
};
const compatibilityWarnings = collectTemplatePackageRenderWarnings(
  compatibilityPackage,
  "editor",
);
for (const code of [
  "figma-horizontal-sizing-mismatch",
  "figma-vertical-sizing-mismatch",
  "figma-layout-grow-fixed-conflict",
  "figma-layout-align-fixed-conflict",
  "absolute-raw-fill-normalized-fixed",
  "absolute-fill-without-opposite-edge",
]) {
  assert(
    compatibilityWarnings.some((warning) => warning.code === code),
    `Renderer compatibility warnings should include ${code}.`,
  );
}
assert(
  !compatibilityWarnings.some(
    (warning) =>
      warning.nodeId === "direct-bottom-badge" &&
      (warning.code === "figma-layout-grow-fixed-conflict" ||
        warning.code === "figma-layout-align-fixed-conflict"),
  ),
  "Flow-only grow and alignment warnings should not be emitted for ABSOLUTE + FIXED nodes.",
);

const hugAlignmentPackage = structuredClone(nestedOverlayPackage);
hugAlignmentPackage.nodes.badge.extensions = {
  figma: {
    layoutAlign: "STRETCH",
    layoutGrow: 1,
  },
};
const hugAlignmentWarnings = collectTemplatePackageRenderWarnings(
  hugAlignmentPackage,
  "editor",
);
assert(
  hugAlignmentWarnings.some(
    (warning) =>
      warning.code === "figma-layout-align-hug-conflict" &&
      warning.nodeId === "badge",
  ) &&
    hugAlignmentWarnings.some(
      (warning) =>
        warning.code === "figma-layout-grow-hug-conflict" &&
        warning.nodeId === "badge",
    ),
  "Raw STRETCH/grow metadata should warn instead of overriding normalized HUG sizing.",
);

assert(
  openingTag(nestedEditorMarkup, "hero").includes("flex-grow:1") &&
    openingTag(nestedEditorMarkup, "badge").includes(
      "width:fit-content",
    ),
  "A FILL parent should consume available space while a HUG descendant remains content-driven.",
);

const scaleHugPackage = structuredClone(constraintPackage);
scaleHugPackage.nodes["scale-child"].sizing.horizontal.mode = "HUG";
scaleHugPackage.nodes["scale-child"].sizing.horizontal.value = null;
const scaleHugMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: scaleHugPackage,
    mode: "editor",
  }),
);
assert(
  collectTemplatePackageRenderWarnings(scaleHugPackage, "editor").some(
    (warning) =>
      warning.code === "absolute-scale-hug-ambiguous" &&
      warning.nodeId === "scale-child",
  ),
  "SCALE combined with content-driven HUG sizing should emit a focused ambiguity warning.",
);
assert(
  openingTag(scaleHugMarkup, "scale-child").includes("width:50%"),
  "Ambiguous SCALE + HUG should consistently use proportional snapshot width rather than silently switching geometry models.",
);

const nestedAutoLayoutPackage = structuredClone(parentReflowPackage);
const nestedRoot = nestedAutoLayoutPackage.nodes.root;
const nestedFooter = nestedAutoLayoutPackage.nodes.footer;
const nestedHeadlineArea =
  nestedAutoLayoutPackage.nodes["headline-area"];
nestedRoot.layout.gap = 16;
nestedRoot.layout.padding = {
  top: 12,
  right: 18,
  bottom: 20,
  left: 24,
};
nestedRoot.layout.primaryAlignment = "SPACE_BETWEEN";
nestedRoot.layout.counterAlignment = "STRETCH";
nestedFooter.layout.mode = "HORIZONTAL";
nestedFooter.layout.gap = 14;
nestedFooter.layout.rowGap = 8;
nestedFooter.layout.columnGap = 14;
nestedFooter.layout.primaryAlignment = "CENTER";
nestedFooter.layout.counterAlignment = "MAX";
nestedHeadlineArea.layout.mode = "VERTICAL";

const nestedAutoLayoutMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: nestedAutoLayoutPackage,
    mode: "editor",
  }),
);
const nestedRootTag = openingTag(nestedAutoLayoutMarkup, "root");
assert(
  nestedRootTag.includes("flex-direction:column") &&
    nestedRootTag.includes("gap:16px") &&
    nestedRootTag.includes("padding-top:12px") &&
    nestedRootTag.includes("padding-right:18px") &&
    nestedRootTag.includes("padding-bottom:20px") &&
    nestedRootTag.includes("padding-left:24px") &&
    nestedRootTag.includes("justify-content:space-between") &&
    nestedRootTag.includes("align-items:stretch"),
  "Nested VERTICAL Auto Layout should preserve padding, gap, and axis alignment.",
);
const nestedHorizontalTag = openingTag(
  nestedAutoLayoutMarkup,
  "footer",
);
assert(
  nestedHorizontalTag.includes("flex-direction:row") &&
    nestedHorizontalTag.includes("gap:14px") &&
    nestedHorizontalTag.includes("row-gap:8px") &&
    nestedHorizontalTag.includes("column-gap:14px") &&
    nestedHorizontalTag.includes("justify-content:center") &&
    nestedHorizontalTag.includes("align-items:flex-end"),
  "Nested HORIZONTAL Auto Layout should preserve gap variants and alignment.",
);
assert(
  openingTag(nestedAutoLayoutMarkup, "headline-area").includes(
    "height:fit-content",
  ) &&
    openingTag(nestedAutoLayoutMarkup, "footer").includes(
      "height:fit-content",
    ),
  "Nested HUG containers should remain content-driven through multiple Auto Layout levels.",
);

const noneHugPackage = structuredClone(parentReflowPackage);
const noneHugNode = noneHugPackage.nodes.hero;
noneHugNode.children = ["overlay"];
noneHugNode.sizing.horizontal = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
noneHugNode.sizing.vertical = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
noneHugPackage.nodes.overlay.parentId = "hero";
noneHugPackage.nodes.root.children = ["hero", "footer"];
const noneHugEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: noneHugPackage,
    mode: "editor",
  }),
);
const noneHugTag = openingTag(noneHugEditorMarkup, "hero");
assert(
  noneHugTag.includes("position:relative") &&
    noneHugTag.includes("width:600px") &&
    noneHugTag.includes("height:680px") &&
    noneHugTag.includes("flex-grow:0") &&
    noneHugTag.includes("flex-shrink:0") &&
    !hasStandaloneStyle(noneHugTag, "left") &&
    !hasStandaloneStyle(noneHugTag, "top"),
  "A layout.mode NONE HUG node should remain a FLOW item and use stable snapshot HUG bounds when absolute children cannot provide intrinsic size.",
);
assert(
  collectTemplatePackageRenderWarnings(noneHugPackage, "editor").some(
    (warning) =>
      warning.code === "editor-hug-none-snapshot-fallback" &&
      warning.nodeId === "hero",
  ),
  "The renderer should explain the layout.mode NONE HUG snapshot fallback.",
);

const unsupportedAutoLayoutPackage =
  structuredClone(parentReflowPackage);
unsupportedAutoLayoutPackage.nodes.footer.extensions = {
  figma: {
    layoutMode: "GRID",
    primaryAxisAlignItems: "SPACE_AROUND",
    counterAxisAlignItems: "SPACE_EVENLY",
    counterAxisAlignContent: "MAX",
    itemReverseZIndex: true,
    strokesIncludedInLayout: true,
  },
};
const unsupportedAutoLayoutWarnings =
  collectTemplatePackageRenderWarnings(
    unsupportedAutoLayoutPackage,
    "editor",
  );
for (const code of [
  "unsupported-auto-layout-mode",
  "unsupported-auto-layout-primary-alignment",
  "unsupported-auto-layout-counter-alignment",
  "unsupported-auto-layout-counter-content-alignment",
  "unsupported-auto-layout-reverse-z-index",
]) {
  assert(
    unsupportedAutoLayoutWarnings.some(
      (warning) => warning.code === code,
    ),
    `Unsupported Auto Layout metadata should emit ${code}.`,
  );
}
assert(
  !unsupportedAutoLayoutWarnings.some(
    (warning) =>
      warning.code === "unsupported-auto-layout-strokes-in-layout",
  ),
  "strokesIncludedInLayout should no longer be reported as wholly unsupported.",
);

const minMaxPackage = structuredClone(parentReflowPackage);
minMaxPackage.nodes.hero.sizing.horizontal.min = 180;
minMaxPackage.nodes.hero.sizing.horizontal.max = 520;
minMaxPackage.nodes.footer.sizing.vertical.min = 100;
minMaxPackage.nodes.footer.sizing.vertical.max = 280;
minMaxPackage.nodes["headline-area"].sizing.vertical.max = 220;
const minMaxEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: minMaxPackage,
    mode: "editor",
  }),
);
const minMaxStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: minMaxPackage,
    mode: "static",
  }),
);
const minMaxHeroTag = openingTag(minMaxEditorMarkup, "hero");
assert(
  minMaxHeroTag.includes("min-width:180px") &&
    minMaxHeroTag.includes("max-width:520px") &&
    minMaxHeroTag.includes("flex-grow:1"),
  "A layout.mode NONE FILL child should respect normalized min/max width while participating in parent Auto Layout.",
);
const minMaxFooterTag = openingTag(minMaxEditorMarkup, "footer");
assert(
  minMaxFooterTag.includes("min-height:100px") &&
    minMaxFooterTag.includes("max-height:280px") &&
    minMaxFooterTag.includes("height:fit-content"),
  "A HUG Auto Layout container should respect normalized min/max height.",
);
assert(
  openingTag(minMaxEditorMarkup, "headline-area").includes(
    "max-height:220px",
  ),
  "Nested HUG propagation should stop at an exported maxHeight constraint.",
);
assert(
  !openingTag(minMaxStaticMarkup, "hero").includes("min-width:") &&
    !openingTag(minMaxStaticMarkup, "hero").includes("max-width:") &&
    !openingTag(minMaxStaticMarkup, "footer").includes("min-height:") &&
    !openingTag(minMaxStaticMarkup, "footer").includes("max-height:"),
  "Static mode should preserve snapshot sizing without live min/max constraints.",
);

const hugTextLimitsPackage = structuredClone(reflowPackage);
hugTextLimitsPackage.nodes.label.sizing.horizontal.max = 150;
hugTextLimitsPackage.nodes.badge.sizing.vertical.max = 96;
const hugTextLimitsMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: hugTextLimitsPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(hugTextLimitsMarkup, "label").includes("max-width:150px"),
  "HUG text should respect normalized maxWidth.",
);
assert(
  openingTag(hugTextLimitsMarkup, "badge").includes("max-height:96px"),
  "HUG containers should respect normalized maxHeight.",
);

const rawLimitsPackage = structuredClone(reflowPackage);
rawLimitsPackage.nodes.label.extensions = {
  figma: {
    minWidth: 72,
    maxWidth: 140,
  },
};
const rawLimitsMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: rawLimitsPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(rawLimitsMarkup, "label").includes("min-width:72px") &&
    openingTag(rawLimitsMarkup, "label").includes("max-width:140px"),
  "Editor mode should safely fall back to finite raw Figma min/max dimensions when normalized limits are absent.",
);

const ambiguousStretchLimitsPackage = structuredClone(constraintPackage);
ambiguousStretchLimitsPackage.nodes["stretch-child"].sizing.horizontal.max =
  480;
assert(
  collectTemplatePackageRenderWarnings(
    ambiguousStretchLimitsPackage,
    "editor",
  ).some(
    (warning) =>
      warning.code === "absolute-stretch-max-ambiguous" &&
      warning.nodeId === "stretch-child",
  ),
  "Absolute stretch with a maximum dimension should emit a compatibility warning.",
);

const horizontalWrapPackage = structuredClone(reflowPackage);
horizontalWrapPackage.nodes.root.layout.mode = "HORIZONTAL";
horizontalWrapPackage.nodes.root.layout.wrap = true;
horizontalWrapPackage.nodes.root.layout.gap = 12;
horizontalWrapPackage.nodes.root.layout.rowGap = 24;
horizontalWrapPackage.nodes.root.layout.columnGap = 12;
const horizontalWrapMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: horizontalWrapPackage,
    mode: "editor",
  }),
);
const horizontalWrapTag = openingTag(horizontalWrapMarkup, "root");
assert(
  horizontalWrapTag.includes("flex-direction:row") &&
    horizontalWrapTag.includes("flex-wrap:wrap") &&
    horizontalWrapTag.includes("row-gap:24px") &&
    horizontalWrapTag.includes("column-gap:12px"),
  "Horizontal Auto Layout wrapping should preserve normalized row and column gaps.",
);
assert(
  horizontalWrapMarkup.indexOf('data-package-node-id="badge"') <
    horizontalWrapMarkup.indexOf('data-package-node-id="fixed"') &&
    openingTag(horizontalWrapMarkup, "badge").includes(
      "width:fit-content",
    ),
  "Wrapped HUG children should retain package order and content-driven sizing.",
);

const verticalWrapPackage = structuredClone(parentReflowPackage);
verticalWrapPackage.nodes.root.layout.wrap = true;
verticalWrapPackage.nodes.root.layout.gap = 14;
verticalWrapPackage.nodes.root.layout.rowGap = 14;
verticalWrapPackage.nodes.root.layout.columnGap = 28;
const verticalWrapMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: verticalWrapPackage,
    mode: "editor",
  }),
);
const verticalWrapTag = openingTag(verticalWrapMarkup, "root");
assert(
  verticalWrapTag.includes("flex-direction:column") &&
    verticalWrapTag.includes("flex-wrap:wrap") &&
    verticalWrapTag.includes("row-gap:14px") &&
    verticalWrapTag.includes("column-gap:28px"),
  "Vertical Auto Layout wrapping should preserve primary and counter-axis gaps when its height is constrained.",
);

const rawWrapGapPackage = structuredClone(horizontalWrapPackage);
rawWrapGapPackage.nodes.root.layout.rowGap = undefined;
rawWrapGapPackage.nodes.root.layout.columnGap = undefined;
rawWrapGapPackage.nodes.root.extensions = {
  figma: {
    counterAxisSpacing: 30,
  },
};
const rawWrapGapEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: rawWrapGapPackage,
    mode: "editor",
  }),
);
const rawWrapGapStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: rawWrapGapPackage,
    mode: "static",
  }),
);
assert(
  openingTag(rawWrapGapEditorMarkup, "root").includes("row-gap:30px") &&
    openingTag(rawWrapGapEditorMarkup, "root").includes(
      "column-gap:12px",
    ),
  "Editor mode should use raw counterAxisSpacing when normalized wrap gaps are absent.",
);
assert(
  !openingTag(rawWrapGapStaticMarkup, "root").includes("row-gap:30px"),
  "Static mode should not introduce raw editor-only gap fallbacks.",
);

const fillWrapPackage = structuredClone(horizontalWrapPackage);
fillWrapPackage.nodes.fixed.sizing.horizontal = {
  mode: "FILL",
  value: null,
  min: 120,
  max: 260,
};
assert(
  collectTemplatePackageRenderWarnings(fillWrapPackage, "editor").some(
    (warning) =>
      warning.code === "wrap-fill-child-approximation" &&
      warning.nodeId === "root",
  ),
  "Main-axis FILL children in a wrapped container should emit a compatibility warning.",
);

const unboundedWrapPackage = structuredClone(reflowPackage);
unboundedWrapPackage.nodes.badge.layout.wrap = true;
unboundedWrapPackage.nodes.badge.sizing.horizontal.max = null;
unboundedWrapPackage.nodes.badge.layout.rowGap = undefined;
unboundedWrapPackage.nodes.badge.layout.columnGap = undefined;
const unboundedWrapWarnings = collectTemplatePackageRenderWarnings(
  unboundedWrapPackage,
  "editor",
);
assert(
  unboundedWrapWarnings.some(
    (warning) =>
      warning.code === "wrap-unbounded-main-axis" &&
      warning.nodeId === "badge",
  ) &&
    unboundedWrapWarnings.some(
      (warning) =>
        warning.code === "wrap-counter-gap-fallback" &&
        warning.nodeId === "badge",
    ),
  "An unbounded HUG wrapping axis and missing counter gap should produce clear warnings.",
);

const unsupportedNoneWrapPackage = structuredClone(parentReflowPackage);
unsupportedNoneWrapPackage.nodes.hero.layout.wrap = true;
assert(
  collectTemplatePackageRenderWarnings(
    unsupportedNoneWrapPackage,
    "editor",
  ).some(
    (warning) =>
      warning.code === "wrap-without-auto-layout" &&
      warning.nodeId === "hero",
  ),
  "Wrapping on layout.mode NONE should be reported as unsupported.",
);

assert(
  openingTag(editorMarkup, "root").includes("flex-wrap:nowrap"),
  "Wrapping-disabled Auto Layout behavior should remain unchanged.",
);

function packageWithBadgeStroke(
  alignment: "INSIDE" | "CENTER" | "OUTSIDE",
  includedInLayout?: boolean,
): TemplatePackageV1 {
  const result = structuredClone(reflowPackage);
  const badge = result.nodes.badge;
  badge.appearance.strokes = [
    {
      paint: {
        type: "SOLID",
        color: { r: 1, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
      },
      weight: 4,
      align: alignment,
    },
  ];
  badge.appearance.strokeWeight = 4;
  badge.appearance.strokeAlign = alignment;
  const existingFigma = badge.extensions?.figma;
  badge.extensions = {
    ...badge.extensions,
    figma: {
      ...(existingFigma &&
      typeof existingFigma === "object" &&
      !Array.isArray(existingFigma)
        ? existingFigma
        : {}),
      ...(includedInLayout === undefined
        ? {}
        : { strokesIncludedInLayout: includedInLayout }),
    },
  };
  return result;
}

const includedInsideStrokePackage = packageWithBadgeStroke("INSIDE", true);
const includedInsideStrokeMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: includedInsideStrokePackage,
    mode: "editor",
  }),
);
assert(
  openingTag(includedInsideStrokeMarkup, "badge").includes(
    "border:4px solid rgba(255, 0, 0, 1)",
  ),
  "An included INSIDE stroke should use a layout-participating CSS border in editor mode.",
);
assert(
  !collectTemplatePackageRenderWarnings(
    includedInsideStrokePackage,
    "editor",
  ).some((warning) => warning.code.includes("stroke")),
  "A supported included INSIDE stroke should not emit compatibility warnings.",
);

const excludedInsideStrokePackage = packageWithBadgeStroke("INSIDE", false);
const excludedInsideStrokeMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: excludedInsideStrokePackage,
    mode: "editor",
  }),
);
assert(
  openingTag(excludedInsideStrokeMarkup, "badge").includes(
    "box-shadow:inset 0 0 0 4px rgba(255, 0, 0, 1)",
  ) &&
    !openingTag(excludedInsideStrokeMarkup, "badge").includes("border:"),
  "An excluded INSIDE stroke should render visually without contributing to layout.",
);

const excludedCenterStrokePackage = packageWithBadgeStroke("CENTER", false);
const excludedCenterStrokeMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: excludedCenterStrokePackage,
    mode: "editor",
  }),
);
assert(
  openingTag(excludedCenterStrokeMarkup, "badge").includes(
    'data-package-primitive-backend="svg"',
  ) &&
    excludedCenterStrokeMarkup.includes('data-package-primitive-svg="svg-center-stroke"') &&
    !openingTag(excludedCenterStrokeMarkup, "badge").includes("box-shadow:"),
  "A source-certified excluded CENTER stroke should use one SVG path owner without a CSS duplicate.",
);

const excludedOutsideStrokePackage = packageWithBadgeStroke("OUTSIDE", false);
const excludedOutsideStrokeMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: excludedOutsideStrokePackage,
    mode: "editor",
  }),
);
assert(
  openingTag(excludedOutsideStrokeMarkup, "badge").includes(
    'data-package-primitive-backend="svg"',
  ) &&
    excludedOutsideStrokeMarkup.includes('data-package-primitive-svg="svg-outside-stroke"') &&
    !openingTag(excludedOutsideStrokeMarkup, "badge").includes("box-shadow:") &&
    !openingTag(excludedOutsideStrokeMarkup, "badge").includes("border:"),
  "A source-certified excluded OUTSIDE stroke should use one SVG path owner without changing layout size.",
);

const includedCenterStrokePackage = packageWithBadgeStroke("CENTER", true);
const includedCenterStrokeMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: includedCenterStrokePackage,
    mode: "editor",
  }),
);
assert(
  openingTag(includedCenterStrokeMarkup, "badge").includes(
    "border:4px solid transparent",
  ) &&
    openingTag(includedCenterStrokeMarkup, "badge").includes(
      "box-shadow:inset 0 0 0 2px rgba(255, 0, 0, 1), 0 0 0 2px rgba(255, 0, 0, 1)",
    ) &&
    !collectTemplatePackageRenderWarnings(
      includedCenterStrokePackage,
      "editor",
    ).some((warning) => warning.code === "included-stroke-alignment-approximated"),
  "Included CENTER strokes should contribute layout with a transparent border while retaining centered visual alignment.",
);

const includedOutsideStrokePackage = packageWithBadgeStroke("OUTSIDE", true);
const includedOutsideStrokeMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: includedOutsideStrokePackage,
    mode: "editor",
  }),
);
assert(
  openingTag(includedOutsideStrokeMarkup, "badge").includes(
    "border:4px solid transparent",
  ) &&
    openingTag(includedOutsideStrokeMarkup, "badge").includes(
      "box-shadow:0 0 0 4px rgba(255, 0, 0, 1)",
    ) &&
    !collectTemplatePackageRenderWarnings(
      includedOutsideStrokePackage,
      "editor",
    ).some((warning) => warning.code === "included-stroke-alignment-approximated"),
  "Included OUTSIDE strokes should contribute layout separately from their outside visual stroke.",
);

const multipleSolidStrokePackage = packageWithBadgeStroke("INSIDE", false);
multipleSolidStrokePackage.nodes.badge.appearance.strokes.push({
  paint: {
    type: "SOLID",
    color: { r: 0, g: 0, b: 1, a: 1 },
    opacity: 1,
    visible: true,
  },
  weight: 2,
  align: "OUTSIDE",
});
const multipleSolidStrokeMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: multipleSolidStrokePackage,
    mode: "editor",
  }),
);
assert(
  openingTag(multipleSolidStrokeMarkup, "badge").includes(
    "box-shadow:inset 0 0 0 4px rgba(255, 0, 0, 1), 0 0 0 2px rgba(0, 0, 255, 1)",
  ) &&
    !collectTemplatePackageRenderWarnings(
      multipleSolidStrokePackage,
      "editor",
    ).some((warning) => warning.code === "multiple-strokes-approximated"),
  "Multiple visible solid strokes should render as ordered visual layers without an approximation warning.",
);

const clippedRoundedStrokePackage = packageWithBadgeStroke("OUTSIDE", false);
clippedRoundedStrokePackage.nodes.badge.appearance.clipContent = true;
clippedRoundedStrokePackage.nodes.badge.layout.clipContent = true;
const clippedRoundedStrokeMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: clippedRoundedStrokePackage,
    mode: "editor",
  }),
);
const clippedRoundedStrokeTag = openingTag(
  clippedRoundedStrokeMarkup,
  "badge",
);
assert(
  clippedRoundedStrokeTag.includes("overflow:hidden") &&
    clippedRoundedStrokeTag.includes("border-radius:32px") &&
    clippedRoundedStrokeTag.includes(
      "box-shadow:0 0 0 4px rgba(255, 0, 0, 1)",
    ),
  "A clipped rounded frame should preserve clipping, radius, and visual stroke strategy.",
);

const missingStrokeMetadataPackage = packageWithBadgeStroke("INSIDE");
assert(
  collectTemplatePackageRenderWarnings(
    missingStrokeMetadataPackage,
    "editor",
  ).some(
    (warning) =>
      warning.code === "stroke-inclusion-metadata-missing" &&
      warning.nodeId === "badge",
  ),
  "A missing strokesIncludedInLayout value should produce a non-fatal editor warning.",
);

const staticOutsideStrokeMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: excludedOutsideStrokePackage,
    mode: "static",
  }),
);
const staticOutsideStrokeTag = openingTag(
  staticOutsideStrokeMarkup,
  "badge",
);
assert(
  staticOutsideStrokeTag.includes("width:140px") &&
    staticOutsideStrokeTag.includes('data-package-primitive-backend="svg"') &&
    staticOutsideStrokeMarkup.includes('data-package-primitive-svg="svg-outside-stroke"') &&
    !staticOutsideStrokeTag.includes("border:") &&
    !staticOutsideStrokeTag.includes("box-shadow:"),
  "Static mode should retain snapshot dimensions while sharing the singular source-certified OUTSIDE stroke owner.",
);
const staticOutsideStrokeWarnings =
  collectTemplatePackageRenderWarnings(
    excludedOutsideStrokePackage,
    "static",
  );
assert(
  staticOutsideStrokeWarnings.some(
    (warning) =>
      warning.code === "static-stroke-alignment-approximated" &&
      warning.nodeId === "badge",
  ) &&
    staticOutsideStrokeWarnings.some(
      (warning) =>
        warning.code === "static-stroke-inclusion-approximated" &&
        warning.nodeId === "badge",
    ),
  "Static center/outside and excluded-layout stroke approximations should be explicit.",
);

const clippedFramePackage = structuredClone(reflowPackage);
clippedFramePackage.nodes.badge.appearance.clipContent = true;
clippedFramePackage.nodes.badge.layout.clipContent = true;
const clippedFrameMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: clippedFramePackage,
    mode: "editor",
  }),
);
assert(
  openingTag(clippedFrameMarkup, "badge").includes("overflow:hidden") &&
    openingTag(clippedFrameMarkup, "badge").includes(
      'data-package-clips-content="true"',
    ),
  "A frame with normalized clipsContent should clip its descendants.",
);

const roundedImageClipPackage = structuredClone(reflowPackage);
roundedImageClipPackage.nodes.root.children =
  roundedImageClipPackage.nodes.root.children.filter(
    (childId) => childId !== "fixed",
  );
roundedImageClipPackage.nodes.badge.children = ["fixed"];
roundedImageClipPackage.nodes.badge.appearance.clipContent = true;
roundedImageClipPackage.nodes.badge.layout.clipContent = true;
roundedImageClipPackage.nodes.badge.appearance.cornerRadius = 32;
roundedImageClipPackage.nodes.fixed.parentId = "badge";
roundedImageClipPackage.nodes.fixed.positioning = "FLOW";
roundedImageClipPackage.nodes.fixed.image = {
  assetId: "asset:image:clip-test",
  deferred: false,
  scaleMode: "FILL",
};
roundedImageClipPackage.assets["asset:image:clip-test"] = {
  id: "asset:image:clip-test",
  type: "image",
  source: "embedded",
  deferred: false,
  mimeType: "image/png",
  dataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
  width: 1,
  height: 1,
};
const roundedImageClipMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: roundedImageClipPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(roundedImageClipMarkup, "badge").includes(
    "overflow:hidden",
  ) &&
    openingTag(roundedImageClipMarkup, "badge").includes(
      "border-radius:32px",
    ) &&
    openingTag(roundedImageClipMarkup, "fixed").includes(
      "background-image:",
    ),
  "A rounded clipped frame should clip image-bearing descendants through its radius.",
);

const nestedClipPackage = structuredClone(roundedImageClipPackage);
nestedClipPackage.nodes.root.appearance.clipContent = true;
nestedClipPackage.nodes.root.layout.clipContent = true;
const nestedClipMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: nestedClipPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(nestedClipMarkup, "root").includes("overflow:hidden") &&
    openingTag(nestedClipMarkup, "badge").includes("overflow:hidden"),
  "Nested clipped frames should each retain an independent clipping boundary.",
);

const rawClipFallbackPackage = structuredClone(reflowPackage);
rawClipFallbackPackage.nodes.badge.appearance.clipContent = false;
rawClipFallbackPackage.nodes.badge.layout.clipContent = false;
rawClipFallbackPackage.nodes.badge.extensions = {
  figma: {
    clipsContent: true,
  },
};
const rawClipStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: rawClipFallbackPackage,
    mode: "static",
  }),
);
const rawClipEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: rawClipFallbackPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(rawClipStaticMarkup, "badge").includes(
    "overflow:visible",
  ) &&
    openingTag(rawClipEditorMarkup, "badge").includes(
      "overflow:hidden",
    ) &&
    openingTag(rawClipEditorMarkup, "badge").includes(
      'data-package-clip-source="figma-raw"',
    ),
  "Static mode should preserve normalized snapshot clipping while editor mode may recover raw Figma clipsContent.",
);
assert(
  collectTemplatePackageRenderWarnings(
    rawClipFallbackPackage,
    "editor",
  ).some(
    (warning) =>
      warning.code === "figma-clipping-normalization-mismatch" &&
      warning.nodeId === "badge",
  ),
  "Raw and normalized clipping disagreement should produce a compatibility warning.",
);

const liveClipTag = openingTag(nestedEditorMarkup, "hero");
assert(
  liveClipTag.includes("overflow:hidden") &&
    liveClipTag.includes(
      'data-package-clip-source="live-containment"',
    ) &&
    openingTag(nestedEditorMarkup, "overlay-section").includes(
      "position:absolute",
    ),
  "A live-resized FILL parent should clip absolute overlay content against its editor-mode box.",
);
assert(
  openingTag(nestedStaticMarkup, "hero").includes(
    "overflow:visible",
  ),
  "Static mode should not introduce editor-only live containment.",
);

const maskPackage = structuredClone(reflowPackage);
maskPackage.nodes.badge.appearance.clipContent = false;
maskPackage.nodes.badge.layout.clipContent = false;
maskPackage.nodes.badge.extensions = {
  figma: {
    isMask: true,
    maskType: "ALPHA",
    shouldBreakMaskChain: true,
  },
};
const maskMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: maskPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(maskMarkup, "badge").includes("overflow:visible") &&
    openingTag(maskMarkup, "badge").includes(
      'data-package-mask-fallback="unsupported"',
    ),
  "A true Figma mask should not silently become ordinary overflow clipping.",
);
const maskWarnings = collectTemplatePackageRenderWarnings(
  maskPackage,
  "editor",
);
assert(
  maskWarnings.some(
    (warning) =>
      warning.code === "unsupported-figma-mask" &&
      warning.nodeId === "badge",
  ) &&
    maskWarnings.some(
      (warning) =>
        warning.code === "unsupported-mask-chain-break" &&
        warning.nodeId === "badge",
    ),
  "True masks and mask-chain breaks should produce explicit non-fatal warnings.",
);

const fixedTextPackage = structuredClone(reflowPackage);
const fixedTextNode = fixedTextPackage.nodes.label;
if (fixedTextNode.type !== "TEXT" || !("characters" in fixedTextNode.text)) {
  throw new Error("Text fidelity fixture requires a modern TEXT node.");
}
fixedTextNode.text.characters =
  "A fixed text box should wrap without shrinking its font.";
fixedTextNode.text.textAutoResize = "NONE";
fixedTextNode.sizing.horizontal = {
  mode: "FIXED",
  value: 120,
  min: null,
  max: null,
};
fixedTextNode.sizing.vertical = {
  mode: "FIXED",
  value: 72,
  min: null,
  max: null,
};
fixedTextNode.bounds.relative.width = 120;
fixedTextNode.bounds.relative.height = 72;
const fixedTextEditorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: fixedTextPackage,
    mode: "editor",
  }),
);
const fixedTextStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: fixedTextPackage,
    mode: "static",
  }),
);
for (const textMarkup of [
  fixedTextEditorMarkup,
  fixedTextStaticMarkup,
]) {
  const fixedTextTag = openingTag(textMarkup, "label");
  assert(
    fixedTextTag.includes("width:120px") &&
      fixedTextTag.includes("height:72px") &&
      fixedTextTag.includes("white-space:pre-wrap") &&
      fixedTextTag.includes("overflow-wrap:break-word"),
    "Fixed text boxes should preserve exported dimensions and wrapping behavior without shrink-to-fit.",
  );
}

const hugTextPackage = structuredClone(reflowPackage);
const hugTextNode = hugTextPackage.nodes.label;
if (hugTextNode.type !== "TEXT" || !("characters" in hugTextNode.text)) {
  throw new Error("HUG text fixture requires a modern TEXT node.");
}
hugTextNode.text.characters = "Content-driven HUG text can grow";
hugTextNode.text.textAutoResize = "WIDTH_AND_HEIGHT";
const hugTextMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: hugTextPackage,
    mode: "editor",
  }),
);
const hugTextTag = openingTag(hugTextMarkup, "label");
assert(
  hugTextTag.includes("width:fit-content") &&
    hugTextTag.includes("height:fit-content") &&
    hugTextTag.includes("position:relative") &&
    !hasStandaloneStyle(hugTextTag, "left") &&
    !hasStandaloneStyle(hugTextTag, "top"),
  "HUG text inside Auto Layout should grow from content while remaining a normal FLOW child.",
);

const typographyPackage = structuredClone(reflowPackage);
const typographyNode = typographyPackage.nodes.label;
if (typographyNode.type !== "TEXT" || !("characters" in typographyNode.text)) {
  throw new Error("Typography fixture requires a modern TEXT node.");
}
typographyNode.text.characters = "First paragraph\nSecond paragraph";
typographyNode.text.fontFamily = "Rethink Sans";
typographyNode.text.fontStyle = "SemiBold Italic";
typographyNode.text.fontWeight = 600;
typographyNode.text.fontSize = 40;
typographyNode.text.lineHeight = { value: 125, unit: "PERCENT" };
typographyNode.text.letterSpacing = { value: -2, unit: "PERCENT" };
typographyNode.text.textAlignHorizontal = "RIGHT";
typographyNode.text.textAlignVertical = "BOTTOM";
typographyNode.text.paragraphSpacing = 18;
typographyNode.text.textCase = "UPPER";
typographyNode.text.textDecoration = "UNDERLINE";
typographyNode.appearance.opacity = 0.8;
typographyNode.appearance.fills = [
  {
    type: "SOLID",
    color: { r: 0.2, g: 0.4, b: 0.6, a: 1 },
    opacity: 0.5,
    visible: true,
  },
];
const typographyMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: typographyPackage,
    mode: "editor",
  }),
);
const typographyTag = openingTag(typographyMarkup, "label");
assert(
  typographyTag.includes(
    "font-family:&quot;Rethink Sans&quot;, system-ui, sans-serif",
  ) &&
    typographyTag.includes("font-style:italic") &&
    typographyTag.includes("font-weight:600") &&
    typographyTag.includes("font-size:40px") &&
    typographyTag.includes("line-height:50px") &&
    typographyTag.includes("letter-spacing:-0.8px"),
  "Font face, weight, size, line height, and percentage letter spacing should map to stable CSS typography.",
);
assert(
  typographyTag.includes("text-align:right") &&
    typographyTag.includes("justify-content:flex-end") &&
    typographyTag.includes("text-transform:uppercase") &&
    typographyTag.includes("text-decoration-line:underline"),
  "Horizontal/vertical alignment, text case, and decoration should follow the package text payload.",
);
assert(
  typographyTag.includes("color:rgba(51, 102, 153, 0.5)") &&
    typographyTag.includes("opacity:0.8"),
  "Text fills and node opacity should both be preserved.",
);
assert(
  typographyMarkup.includes("margin-bottom:18px") &&
    typographyMarkup.includes("First paragraph") &&
    typographyMarkup.includes("Second paragraph"),
  "Explicit paragraph breaks should render exported paragraph spacing.",
);

const autoLineHeightPackage = structuredClone(reflowPackage);
const autoLineHeightNode = autoLineHeightPackage.nodes.label;
if (
  autoLineHeightNode.type !== "TEXT" ||
  !("characters" in autoLineHeightNode.text)
) {
  throw new Error("AUTO line-height fixture requires a modern TEXT node.");
}
autoLineHeightNode.text.lineHeight = {
  value: null,
  unit: "AUTO",
};
const autoLineHeightMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: autoLineHeightPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(autoLineHeightMarkup, "label").includes(
    "line-height:48px",
  ),
  "AUTO line height should resolve to the renderer's stable pixel fallback.",
);

const unsupportedTextPackage = structuredClone(reflowPackage);
const unsupportedTextNode = unsupportedTextPackage.nodes.label;
if (
  unsupportedTextNode.type !== "TEXT" ||
  !("characters" in unsupportedTextNode.text)
) {
  throw new Error("Unsupported text fixture requires a modern TEXT node.");
}
unsupportedTextNode.text.textCase = "SMALL_CAPS";
unsupportedTextNode.extensions = {
  figma: {
    hasMixedTextStyles: true,
    textStyleRanges: [{ start: 0 }, { start: 4 }],
  },
};
const unsupportedTextWarnings =
  collectTemplatePackageRenderWarnings(
    unsupportedTextPackage,
    "editor",
  );
assert(
  unsupportedTextWarnings.some(
    (warning) =>
      warning.code === "unsupported-text-case" &&
      warning.nodeId === "label",
  ) &&
    unsupportedTextWarnings.some(
      (warning) =>
        warning.code === "unsupported-mixed-text-styles" &&
        warning.nodeId === "label",
    ),
  "Unsupported text case and mixed style ranges should produce explicit compatibility warnings.",
);

function mergeFigmaExtension(
  packageValue: TemplatePackageV1,
  nodeId: string,
  values: Record<string, unknown>,
): void {
  const node = packageValue.nodes[nodeId];
  const existingFigma = node.extensions?.figma;
  node.extensions = {
    ...node.extensions,
    figma: {
      ...(existingFigma &&
      typeof existingFigma === "object" &&
      !Array.isArray(existingFigma)
        ? existingFigma
        : {}),
      ...values,
    },
  };
}

const rotatedStaticPackage = structuredClone(reflowPackage);
mergeFigmaExtension(rotatedStaticPackage, "overlay", {
  rotation: 30,
  transformOrigin: { x: 50, y: 25, unit: "PERCENT" },
});
const rotatedStaticMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: rotatedStaticPackage,
    mode: "static",
  }),
);
assert(
  openingTag(rotatedStaticMarkup, "overlay").includes("rotate:30deg") &&
    openingTag(rotatedStaticMarkup, "overlay").includes(
      "transform-origin:50% 25%",
    ),
  "Static mode should render exported rotation and transform origin without changing snapshot placement.",
);

const rotatedCenterPackage = structuredClone(nestedOverlayPackage);
mergeFigmaExtension(rotatedCenterPackage, "direct-bottom-badge", {
  rotation: 18,
  width: 160,
  height: 80,
});
const rotatedCenterMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: rotatedCenterPackage,
    mode: "editor",
  }),
);
const rotatedCenterTag = openingTag(
  rotatedCenterMarkup,
  "direct-bottom-badge",
);
assert(
  rotatedCenterTag.includes("rotate:18deg") &&
    rotatedCenterTag.includes("left:calc(50% + 0px)") &&
    rotatedCenterTag.includes("translate:-50% 0") &&
    rotatedCenterTag.includes("bottom:40px"),
  "A rotated absolute child should retain CENTER and BOTTOM anchors inside a resized parent.",
);

const scaledPackage = structuredClone(reflowPackage);
mergeFigmaExtension(scaledPackage, "overlay", {
  scaleX: 1.5,
  scaleY: 0.75,
  width: 120,
  height: 72,
});
const scaledMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: scaledPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(scaledMarkup, "overlay").includes("scale:1.5 0.75"),
  "Explicit exported scale metadata should render through CSS scale.",
);

const mirroredPackage = structuredClone(reflowPackage);
mergeFigmaExtension(mirroredPackage, "overlay", {
  flipHorizontal: true,
  width: 120,
  height: 72,
});
const mirroredMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: mirroredPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(mirroredMarkup, "overlay").includes("scale:-1 1"),
  "Exported horizontal mirroring should render as a signed CSS scale.",
);

const matrixPackage = structuredClone(reflowPackage);
mergeFigmaExtension(matrixPackage, "overlay", {
  relativeTransform: [
    [0, -2, 420],
    [2, 0, 600],
  ],
  width: 120,
  height: 72,
});
const matrixMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: matrixPackage,
    mode: "static",
  }),
);
const matrixTag = openingTag(matrixMarkup, "overlay");
assert(
  matrixTag.includes("rotate:90deg") &&
    matrixTag.includes("scale:2 2"),
  "A Figma relative transform matrix should decompose into rotation and scale.",
);

const nestedTransformPackage = structuredClone(reflowPackage);
mergeFigmaExtension(nestedTransformPackage, "badge", {
  rotation: 10,
  width: 140,
  height: 80,
});
mergeFigmaExtension(nestedTransformPackage, "label", {
  rotation: -5,
  width: 100,
  height: 48,
});
const nestedTransformMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: nestedTransformPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(nestedTransformMarkup, "badge").includes("rotate:10deg") &&
    openingTag(nestedTransformMarkup, "label").includes("rotate:-5deg"),
  "Nested parent and child transforms should remain independently composable.",
);

const clippedTransformPackage = structuredClone(nestedTransformPackage);
clippedTransformPackage.nodes.badge.appearance.clipContent = true;
clippedTransformPackage.nodes.badge.layout.clipContent = true;
const clippedTransformMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: clippedTransformPackage,
    mode: "editor",
  }),
);
assert(
  openingTag(clippedTransformMarkup, "badge").includes(
    "overflow:hidden",
  ) &&
    openingTag(clippedTransformMarkup, "label").includes(
      "rotate:-5deg",
    ),
  "A transformed descendant should remain clipped by its transformed or rounded parent boundary.",
);

const rotatedStretchPackage = structuredClone(nestedOverlayPackage);
mergeFigmaExtension(rotatedStretchPackage, "overlay-section", {
  rotation: 12,
  width: 600,
  height: 680,
});
const rotatedStretchMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: rotatedStretchPackage,
    mode: "editor",
  }),
);
const rotatedStretchTag = openingTag(
  rotatedStretchMarkup,
  "overlay-section",
);
assert(
  rotatedStretchTag.includes("left:0") &&
    rotatedStretchTag.includes("top:0") &&
    rotatedStretchTag.includes("right:0") &&
    rotatedStretchTag.includes("bottom:0") &&
    !hasStandaloneStyle(rotatedStretchTag, "width") &&
    !hasStandaloneStyle(rotatedStretchTag, "height") &&
    rotatedStretchTag.includes("rotate:12deg"),
  "Transformed nodes with local geometry should resolve constraints on the live local box before applying their transform.",
);
assert(
  !collectTemplatePackageRenderWarnings(
    rotatedStretchPackage,
    "editor",
  ).some(
    (warning) =>
      warning.code === "transformed-constraint-snapshot-fallback" &&
      warning.nodeId === "overlay-section",
  ),
  "Valid local transformed geometry should not produce snapshot fallback warnings.",
);

const unsupportedTransformPackage = structuredClone(reflowPackage);
mergeFigmaExtension(unsupportedTransformPackage, "overlay", {
  relativeTransform: [
    [1, 0.5, 420],
    [0, 1, 600],
  ],
  relativeBoundsInconsistent: true,
});
const unsupportedTransformWarnings =
  collectTemplatePackageRenderWarnings(
    unsupportedTransformPackage,
    "editor",
  );
assert(
  !unsupportedTransformWarnings.some(
    (warning) =>
      warning.code === "unsupported-transform-skew" &&
      warning.nodeId === "overlay",
  ) &&
    openingTag(
      renderToStaticMarkup(
        createElement(TemplatePackageRenderer, {
          packageValue: unsupportedTransformPackage,
          mode: "editor",
        }),
      ),
      "overlay",
    ).includes("transform:matrix(1, 0, 0.5, 1, 0, 0)") &&
    unsupportedTransformWarnings.some(
      (warning) =>
        warning.code === "transformed-bounds-approximation" &&
        warning.nodeId === "overlay",
    ) &&
    unsupportedTransformWarnings.some(
      (warning) =>
        warning.code ===
          "transformed-relative-bounds-inconsistent" &&
        warning.nodeId === "overlay",
    ),
  "Affine skew should render exactly while missing local geometry and inconsistent transformed bounds remain explicit.",
);

const malformedTransformPackage = structuredClone(reflowPackage);
mergeFigmaExtension(malformedTransformPackage, "overlay", {
  relativeTransform: [[1, 0]],
});
assert(
  collectTemplatePackageRenderWarnings(
    malformedTransformPackage,
    "editor",
  ).some(
    (warning) =>
      warning.code === "unsupported-transform-matrix" &&
      warning.nodeId === "overlay",
  ),
  "Malformed transform matrices should warn instead of being silently ignored.",
);

assert(
  !openingTag(editorMarkup, "overlay").includes("rotate:") &&
    !openingTag(editorMarkup, "overlay").includes("scale:"),
  "Nodes without transform metadata should retain the previous rendering contract.",
);

const vectorPackage = structuredClone(reflowPackage);
const vectorNode = vectorPackage.nodes.overlay;
vectorNode.type = "VECTOR";
vectorNode.name = "generic-vector";
vectorNode.appearance.opacity = 0.4;
vectorNode.appearance.fills = [
  {
    type: "SOLID",
    color: { r: 1, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
  },
];
vectorNode.vector = {
  assetId: "asset:svg:generic",
  deferred: false,
  format: "svg",
  renderMode: "SVG_ASSET",
  assetKind: "DIRECT_SVG",
  fit: "FIGMA_BOUNDS",
  viewBox: { x: 0, y: 0, width: 40, height: 20 },
  preserveAspectRatio: "xMidYMid meet",
  contentBounds: { x: 0, y: 0, width: 120, height: 80 },
  paints: { fills: [], strokes: [] },
  features: {
    hasBooleanOperation: false,
    hasGradients: false,
    hasImages: false,
    hasEffects: false,
    hasBlendModes: false,
    hasMasks: false,
    hasMultipleFills: false,
    hasMultipleStrokes: false,
  },
};
vectorPackage.assets["asset:svg:generic"] = {
  id: "asset:svg:generic",
  type: "vector",
  source: "embedded",
  mimeType: "image/svg+xml",
  width: 40,
  height: 20,
  dataUrl:
    "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%201%201%22%3E%3C/svg%3E",
  svgString:
    '<svg viewBox="0 0 40 20" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h40v20H0z" fill="#123456"/></svg>',
  viewBox: "0 0 40 20",
};
const vectorMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: vectorPackage,
    mode: "static",
  }),
);
const vectorTag = openingTag(vectorMarkup, "overlay");
assert(
  vectorMarkup.includes('data-package-vector-source="svg-string"') &&
    vectorMarkup.includes('data-package-vector-fit="FIGMA_BOUNDS"') &&
    vectorMarkup.includes('data-package-vector-view-box="0 0 40 20"') &&
    vectorMarkup.includes(
      'data-package-vector-preserve-aspect-ratio="xMidYMid meet"',
    ) &&
    vectorMarkup.includes(
      'data-package-vector-content-bounds="0,0,120,80"',
    ) &&
    vectorMarkup.includes(
      "position:absolute;left:0;top:0;width:120px;height:80px",
    ) &&
    vectorMarkup.includes("object-fit:fill") &&
    vectorMarkup.includes("data:image/svg+xml;charset=utf-8"),
  "SVG_ASSET vectors should prefer svgString and map FIGMA_BOUNDS to the node viewport.",
);

const invalidVectorContentBoundsPackage = structuredClone(vectorPackage);
invalidVectorContentBoundsPackage.nodes.overlay.vector!.contentBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 80,
};
assert(
  collectTemplatePackageRenderWarnings(
    invalidVectorContentBoundsPackage,
  ).some(
    (warning) =>
      warning.code === "vector-content-bounds-invalid" &&
      warning.nodeId === "overlay",
  ),
  "Invalid vector content bounds should fall back safely with a focused warning.",
);
assert(
  vectorTag.includes("opacity:0.4") &&
    !vectorTag.includes("background-color"),
  "Vector wrappers should preserve node opacity without painting the aggregate vector fill as a box background.",
);

const vectorDataUrlPackage = structuredClone(vectorPackage);
delete vectorDataUrlPackage.assets["asset:svg:generic"].svgString;
const vectorDataUrlMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: vectorDataUrlPackage,
    mode: "editor",
  }),
);
assert(
  vectorDataUrlMarkup.includes(
    'data-package-vector-source="asset-source"',
  ) &&
    vectorDataUrlMarkup.includes("data:image/svg+xml"),
  "Vector assets should fall back to a safe SVG dataUrl.",
);

const missingVectorAssetPackage = structuredClone(vectorPackage);
delete missingVectorAssetPackage.assets["asset:svg:generic"];
assert(
  collectTemplatePackageRenderWarnings(missingVectorAssetPackage).some(
    (warning) =>
      warning.code === "vector-asset-not-found" &&
      warning.nodeId === "overlay",
  ),
  "Missing vector assets should produce a focused non-blocking warning.",
);

const unsupportedVectorFeaturePackage = structuredClone(vectorPackage);
unsupportedVectorFeaturePackage.nodes.overlay.vector!.features!.hasBlendModes =
  true;
assert(
  collectTemplatePackageRenderWarnings(
    unsupportedVectorFeaturePackage,
  ).some(
    (warning) =>
      warning.code === "vector-blend-mode-fidelity" &&
      warning.nodeId === "overlay",
  ),
  "Potentially divergent SVG blend modes should produce a compatibility warning.",
);

const hiddenVectorPackage = structuredClone(vectorPackage);
hiddenVectorPackage.nodes.overlay.appearance.visible = false;
assert(
  openingTag(
    renderToStaticMarkup(
      createElement(TemplatePackageRenderer, {
        packageValue: hiddenVectorPackage,
      }),
    ),
    "overlay",
  ).includes("display:none"),
  "Vector nodes should inherit normal package visibility behavior.",
);
