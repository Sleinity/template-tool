import assert from "node:assert/strict";
import type { TemplatePackageV1, TemplateNode } from "../src/types";
import { createResolvedRenderTree } from "../src/resolved";

const solid = {type: "SOLID", color: {r: .17, g: .17, b: .14, a: 1}, opacity: 1, visible: true, blendMode: "NORMAL"} as const;
const imagePaint = {type: "IMAGE", opacity: 1, visible: true, blendMode: "NORMAL"} as const;
const node = {
  id: "media", name: "Unrelated image name", type: "RECTANGLE", parentId: null, children: [], positioning: "ROOT",
  bounds: {absolute: {x: 0, y: 0, width: 100, height: 100}, relative: {x: 0, y: 0, width: 100, height: 100}},
  layout: {mode: "NONE", wrap: false, gap: 0, padding: {top: 0, right: 0, bottom: 0, left: 0}, primaryAlignment: "MIN", counterAlignment: "MIN", clipContent: false},
  sizing: {horizontal: {mode: "FIXED", value: 100, min: null, max: null}, vertical: {mode: "FIXED", value: 100, min: null, max: null}},
  appearance: {visible: true, opacity: 1, blendMode: "PASS_THROUGH", fills: [solid, imagePaint], strokes: [], effects: [], cornerRadius: 0, cornerRadii: null, clipContent: false},
  image: {assetId: "bitmap", scaleMode: "FILL", deferred: false},
} as TemplateNode;
const packageValue = {
  schemaVersion: "1.0", packageId: "generic-media-test", name: "No fixture identity", rootNodeId: "media",
  canvas: {width: 100, height: 100, background: {r: 1, g: 1, b: 1, a: 1}, coordinateSpace: "figma"},
  nodes: {media: node}, editableFields: [], fontRequirements: [],
  assets: {bitmap: {id: "bitmap", type: "image", mimeType: "image/png", source: "embedded", data: "data:image/png;base64,AA==", width: 2, height: 2}},
} as unknown as TemplatePackageV1;
function resolve(mutate?: (pkg: TemplatePackageV1) => void) {
  const pkg = structuredClone(packageValue); mutate?.(pkg);
  return {pkg, tree: createResolvedRenderTree(pkg)};
}
const healthy = resolve();
const result = healthy.tree.nodes.media;
assert.equal(result.backendDecision.disposition, "established-compatibility-owner");
assert.equal(result.backendDecision.fallback.active, false);
assert.equal(result.backendDecision.runtimeOwner, "media-dom");
assert.equal(result.backendDecision.selectedBackend, "compatibility");
assert.equal(result.primitiveAppearance.ownership, "compatibility-authoritative");
assert(result.primitiveAppearance.fallbackReasons.includes("ordered-solid-stack-unsupported-geometry-owner"), "Keep primitive ineligibility as technical evidence");
assert.deepEqual(result.appearance.fills.map(fill => fill.source), healthy.pkg.nodes.media.appearance.fills);
assert.equal(healthy.tree.backendDiagnostics.diagnostics.filter(item => item.nodeId === "media" && item.severity === "warning").length, 0);
assert(result.fidelityDiagnostics.some(item => item.code === "resolved-media-solid-underlay-supported" && item.severity === "info"));
const fit = resolve(pkg => {pkg.nodes.media.image!.scaleMode = "FIT";});
assert.equal(fit.tree.nodes.media.backendDecision.fallback.active, false, "The existing Fit image stays above its solid underlay");

// These are contract mutations, not newly source-certified stacks.
const unsupported: Array<[string, (pkg: TemplatePackageV1) => void]> = [
  ["reversed", pkg => pkg.nodes.media.appearance.fills.reverse()],
  ["extra layer", pkg => pkg.nodes.media.appearance.fills.push(structuredClone(solid))],
  ["hidden solid", pkg => pkg.nodes.media.appearance.fills[0].visible = false],
  ["hidden image", pkg => pkg.nodes.media.appearance.fills[1].visible = false],
  ["image opacity", pkg => pkg.nodes.media.appearance.fills[1].opacity = .5],
  ["solid opacity", pkg => pkg.nodes.media.appearance.fills[0].opacity = .5],
  ["solid alpha", pkg => {if (pkg.nodes.media.appearance.fills[0].type === "SOLID") pkg.nodes.media.appearance.fills[0].color.a = .5;}],
  ["blend", pkg => pkg.nodes.media.appearance.fills[1].blendMode = "DARKEN"],
  ["node opacity", pkg => pkg.nodes.media.appearance.opacity = .5],
  ["missing binary", pkg => delete pkg.assets.bitmap],
  ["unsupported crop", pkg => {pkg.nodes.media.image!.scaleMode = "CROP"; pkg.nodes.media.image!.imageTransform = [[0, 0, 0], [0, 0, 0]];}],
  ["stroke", pkg => pkg.nodes.media.appearance.strokes.push({...structuredClone(solid), weight: 1})],
  ["unknown paint", pkg => {pkg.nodes.media.extensions = {figma: {unsupportedPaints: [{type: "SHADER"}]}};}],
  ["rotated", pkg => {pkg.nodes.media.extensions = {figma: {rotation: 45}};}],
  ["rounded", pkg => pkg.nodes.media.appearance.cornerRadius = 8],
];
for (const [name, mutate] of unsupported) {
  const rejected = resolve(mutate).tree.nodes.media;
  assert.equal(rejected.backendDecision.fallback.active, true, name);
  assert(!rejected.fidelityDiagnostics.some(item => item.code === "resolved-media-solid-underlay-supported"), name);
}
const maskInput = resolve(pkg => {pkg.nodes.media.mask = {isMask: true, maskType: "ALPHA"};}).tree.nodes.media;
assert(!maskInput.fidelityDiagnostics.some(item => item.code === "resolved-media-solid-underlay-supported"));
assert(maskInput.fidelityDiagnostics.some(item => item.code === "ordered-solid-stack-mask-dependency"), "Mask authority keeps its own existing diagnostics; do not invent a new mask warning policy");
const renamed = resolve(pkg => {pkg.name = "Completely different"; pkg.nodes.media.name = "No special marker";});
assert.equal(renamed.tree.nodes.media.backendDecision.fallback.active, false);
console.log("Media solid underlay classification preserves ownership, source order and genuine fallbacks.");
