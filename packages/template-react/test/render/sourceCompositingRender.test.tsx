import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "../../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import { resolveSourceCompositing } from "@sleinity/template-core/renderer-internal";
import { TemplatePackageRenderer } from "../../src/render/TemplatePackageRenderer";

const packageValue = structuredClone(fixture) as unknown as TemplatePackageV1;
packageValue.source!.pluginVersion = "0.6.1";
packageValue.canvas.background = { r: 0, g: 0, b: 0, a: 1 };
packageValue.editableFields = [];
packageValue.assets = {};
const root = packageValue.nodes[packageValue.rootNodeId];
root.children = ["blend-group"];
root.appearance.clipContent = false;
root.layout.clipContent = false;
const group = structuredClone(root);
group.id = "blend-group";
group.type = "GROUP";
group.parentId = root.id;
group.children = ["blend-row"];
group.appearance.fills = [];
group.appearance.blendMode = "OVERLAY";
group.appearance.opacity = 0.8;
group.bounds.relative = { x: 0, y: 0, width: 100, height: 100 };
const row = structuredClone(root);
row.id = "blend-row";
row.type = "RECTANGLE";
row.parentId = group.id;
row.children = [];
row.bounds.relative = { x: 0, y: 0, width: 100, height: 100 };
row.appearance.fills = [
  { type: "SOLID", color: { r: 0.9, g: 0.7, b: 1, a: 1 }, opacity: 1, visible: true, blendMode: "DARKEN" },
  { type: "SOLID", color: { r: 0.98, g: 1, b: 0.38, a: 1 }, opacity: 0.4, visible: true, blendMode: "NORMAL" },
];
packageValue.nodes = { [root.id]: root, [group.id]: group, [row.id]: row };

const render = (value: TemplatePackageV1) => renderToStaticMarkup(
  createElement(TemplatePackageRenderer, { packageValue: value }),
);
const initial = render(packageValue);
assert.match(initial, /data-package-compositing-owner="group-dom"/);
assert.match(initial, /data-package-compositing-owner="ordered-paint-dom"/);
assert.match(initial, /data-package-compositing-paint="0"/);
assert.match(initial, /data-package-compositing-paint="1"/);
assert.match(initial, /mix-blend-mode:darken/);
assert.match(initial, /mix-blend-mode:overlay/);
assert.match(initial, /isolation:isolate/);
assert.equal((initial.match(/data-package-compositing-paint=/g) ?? []).length, 2,
  "ordered source paints must have exactly one painter each");

const edited = structuredClone(packageValue);
const editedPaint = edited.nodes["blend-row"].appearance.fills[0];
assert.equal(editedPaint.type, "SOLID");
if (editedPaint.type === "SOLID") editedPaint.color.r = 0.5;
const editedMarkup = render(edited);
assert.notEqual(editedMarkup, initial, "a paint edit must reach the renderer");
assert.match(editedMarkup, /rgb\(127\.5 178\.5 255\)/);

const resized = structuredClone(packageValue);
resized.nodes["blend-row"].bounds.relative.width = 120;
const resizedMarkup = render(resized);
assert.notEqual(resizedMarkup, initial, "a row resize must reach the renderer");
assert.equal((resizedMarkup.match(/data-package-compositing-paint=/g) ?? []).length, 2);

const unsupported = structuredClone(packageValue);
unsupported.canvas.background = { r: 0, g: 0, b: 0, a: 0 };
assert.ok(!render(unsupported).includes("data-package-compositing-owner=\"ordered-paint-dom\""),
  "unsupported transparency must retain the compatibility boundary");

const mixed = structuredClone(fixture) as unknown as TemplatePackageV1;
mixed.source!.pluginVersion = "0.6.1";
mixed.canvas.background = { r: 0, g: 0, b: 0, a: 1 };
mixed.editableFields = [];
const mixedRoot = mixed.nodes[mixed.rootNodeId];
const imageNode = Object.values(mixed.nodes).find((node) => node.image);
assert.ok(imageNode?.image);
const mixedFrame = structuredClone(mixedRoot);
mixedFrame.id = "mixed-frame";
mixedFrame.type = "FRAME";
mixedFrame.parentId = mixedRoot.id;
mixedFrame.children = [];
mixedFrame.image = structuredClone(imageNode.image);
mixedFrame.appearance = {
  ...mixedFrame.appearance, opacity: 1, blendMode: "PASS_THROUGH",
  cornerRadius: 0, cornerRadii: null, clipContent: false,
  strokes: [], effects: [],
  fills: [
    { type: "SOLID", color: { r: 0.09, g: 0.09, b: 0.09, a: 1 }, opacity: 1, visible: true, blendMode: "NORMAL" },
    { type: "IMAGE", opacity: 1, visible: true, blendMode: "NORMAL" },
    {
      type: "GRADIENT_LINEAR", opacity: 1, visible: true, blendMode: "DARKEN",
      gradientStops: [
        { position: 0.07, color: { r: 0.09, g: 0.09, b: 0.09, a: 1 } },
        { position: 0.27, color: { r: 0.09, g: 0.09, b: 0.09, a: 0 } },
      ],
      gradientTransform: [[0, -1, 1], [1, 0, 0]],
      linearGradientSource: {
        schemaVersion: "linear-gradient-source-v1", sourceIndex: 2, pairing: "source-index",
        canonicalPath: "nodes.mixed-frame.appearance.fills.2",
        rawFigmaPath: "nodes.mixed-frame.extensions.figma.rawFills.2",
        stopsSource: "figma-raw-gradientStops", transformSource: "figma-raw-gradientTransform",
        normalizationRevision: "linear-gradient-normalization-v1", conflicts: [],
      },
    },
  ],
};
mixedFrame.layout.clipContent = false;
mixedRoot.children = [mixedFrame.id];
mixedRoot.appearance.fills = [];
mixed.nodes = { [mixedRoot.id]: mixedRoot, [mixedFrame.id]: mixedFrame };
assert.equal(resolveSourceCompositing(mixed)["mixed-frame"]?.kind, "mixed-image-gradient");
const mixedMarkup = render(mixed);
assert.match(mixedMarkup, /data-package-compositing-owner="mixed-image-gradient-dom"/);
assert.match(mixedMarkup, /data-package-mixed-image-gradient=/);
assert.match(mixedMarkup, /mix-blend-mode:darken/);
assert.match(mixedMarkup, /background-image:url/);
assert.equal((mixedMarkup.match(/data-package-mixed-image-gradient=/g) ?? []).length, 1,
  "the gradient must have a single visual owner");
const mixedResize = structuredClone(mixed);
mixedResize.nodes["mixed-frame"].bounds.relative.height += 100;
assert.notEqual(render(mixedResize), mixedMarkup, "the gradient geometry must follow resize");
const mixedFallback = structuredClone(mixed);
mixedFallback.nodes["mixed-frame"].appearance.fills[2].blendMode = "SCREEN";
assert.ok(!render(mixedFallback).includes("data-package-compositing-owner=\"mixed-image-gradient-dom\""),
  "unsupported mixed stacks must keep compatibility ownership");
