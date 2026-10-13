import assert from "node:assert/strict";
import fixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import type { TemplateNode, TemplatePackageV1 } from "../src";
import { createResolvedRenderTree } from "../src";
import { resolveSourceCompositing } from "../src/compositing/resolveSourceCompositing";

function packageWithBlendGroups(): TemplatePackageV1 {
  const packageValue = structuredClone(fixture) as unknown as TemplatePackageV1;
  packageValue.source!.pluginVersion = "0.6.1";
  packageValue.canvas.background = { r: 0, g: 0, b: 0, a: 1 };
  packageValue.editableFields = [];
  packageValue.assets = {};
  const root = packageValue.nodes[packageValue.rootNodeId];
  root.children = ["pass", "normal", "overlay"];
  root.appearance.clipContent = false;
  root.layout.clipContent = false;
  const source = structuredClone(root);
  const nodes: Record<string, TemplateNode> = { [root.id]: root };
  for (const [index, mode] of ["PASS_THROUGH", "NORMAL", "OVERLAY"].entries()) {
    const group = structuredClone(source);
    group.id = mode === "PASS_THROUGH" ? "pass" : mode.toLowerCase();
    group.type = "GROUP";
    group.parentId = root.id;
    group.children = [`row-${index}-0`, `row-${index}-1`];
    group.appearance.fills = [];
    group.appearance.blendMode = mode;
    group.appearance.opacity = 0.8;
    group.bounds.relative = { x: 0, y: index * 200, width: 100, height: 200 };
    nodes[group.id] = group;
    for (const rowIndex of [0, 1]) {
      const row = structuredClone(source);
      row.id = group.children[rowIndex];
      row.type = "RECTANGLE";
      row.parentId = group.id;
      row.children = [];
      row.bounds.relative = { x: 0, y: rowIndex * 100, width: 100, height: 100 };
      row.appearance.fills = [{
        type: "SOLID", color: { r: 0.9, g: 0.7, b: 1, a: 1 },
        opacity: 1, visible: true,
        blendMode: rowIndex === 0 ? "DARKEN" : "MULTIPLY",
      }];
      if (rowIndex === 0) row.appearance.fills.push({
        type: "SOLID", color: { r: 0.98, g: 1, b: 0.38, a: 1 },
        opacity: 0.4, visible: true, blendMode: "NORMAL",
      });
      nodes[row.id] = row;
    }
  }
  packageValue.nodes = nodes;
  return packageValue;
}

const source = packageWithBlendGroups();
const before = structuredClone(source);
const compositing = resolveSourceCompositing(source);
assert.equal(compositing.pass?.kind, "group");
assert.equal(compositing.normal?.kind, "group");
assert.equal(compositing.overlay?.kind, "group");
assert.equal(compositing["row-0-0"]?.kind, "paint-stack");
if (compositing["row-0-0"]?.kind !== "paint-stack") throw new Error("missing paint stack");
assert.deepEqual(compositing["row-0-0"].paints.map((paint) => paint.sourceIndex), [0, 1]);
assert.ok(Math.abs(compositing["row-0-0"].paints[0].renderedOpacity - 12 / 17) < 1e-12);
assert.ok(Math.abs(compositing["row-0-0"].paints[1].renderedOpacity - 0.32) < 1e-12);
assert.equal(compositing["row-1-0"]?.kind, "paint-stack");
if (compositing["row-1-0"]?.kind !== "paint-stack") throw new Error("missing isolated paint stack");
assert.deepEqual(compositing["row-1-0"].paints.map((paint) => paint.renderedOpacity), [1, 0.4]);
assert.deepEqual(source, before, "resolution cannot rewrite source paints or opacity");

const resolved = createResolvedRenderTree(source);
assert.ok(resolved.nodes.pass.backendDecision.requiredCapabilities.includes("CMP-OPAQUE-GROUP-BLEND"));
assert.ok(resolved.nodes["row-0-0"].backendDecision.requiredCapabilities.includes("CMP-OPAQUE-SOLID-PAINT-STACK"));
assert.deepEqual(resolved.nodes["row-0-0"].backendDecision.fallback.reasonCodes, []);
assert.equal(resolved.nodes["row-0-0"].fidelityDiagnostics.some(
  (item) => item.code === "resolved-source-compositing-supported"), true);

const changed = structuredClone(source);
const changedPaint = changed.nodes["row-0-0"].appearance.fills[0];
assert.equal(changedPaint.type, "SOLID");
if (changedPaint.type === "SOLID") changedPaint.color.r = 0.5;
assert.notEqual(resolveSourceCompositing(changed)["row-0-0"]?.revision,
  compositing["row-0-0"].revision, "a paint edit must invalidate the compositor");
const resized = structuredClone(source);
resized.nodes["row-0-0"].bounds.relative.width = 120;
assert.notEqual(resolveSourceCompositing(resized)["row-0-0"]?.revision,
  compositing["row-0-0"].revision, "resizing must invalidate the paint geometry");
const reordered = structuredClone(source);
reordered.nodes[reordered.rootNodeId].children.reverse();
assert.notEqual(resolveSourceCompositing(reordered)["row-0-0"]?.revision,
  compositing["row-0-0"].revision, "a changed backdrop order must invalidate the paint owner");
const transparent = structuredClone(source);
transparent.canvas.background = { r: 0, g: 0, b: 0, a: 0 };
assert.deepEqual(resolveSourceCompositing(transparent), {}, "transparent backdrop is not certified");
const overlapping = structuredClone(source);
overlapping.nodes["row-0-1"].bounds.relative.y = 50;
assert.equal(resolveSourceCompositing(overlapping).pass, undefined,
  "overlapping pass-through children need a separate isolation contract");
assert.equal(resolveSourceCompositing(overlapping)["row-0-0"], undefined);
const unsupported = structuredClone(source);
unsupported.nodes["row-0-0"].appearance.fills[1].blendMode = "SCREEN";
assert.equal(resolveSourceCompositing(unsupported).pass, undefined,
  "a mixed second-layer blend cannot partially route the group");
const older = structuredClone(source);
older.source!.pluginVersion = "0.6.0";
assert.deepEqual(resolveSourceCompositing(older), {}, "older exporter opacity contracts remain separate");
const animated = structuredClone(source);
animated.motion = {
  format: "figma-motion-v1",
  raw: { tracks: [{ nodeId: "normal" }] },
  linking: { status: "pass", matchedNodeIds: ["normal"], missingNodeIds: [] },
};
assert.deepEqual(resolveSourceCompositing(animated), {},
  "animated group opacity must keep its existing motion authority");
const detachedGroup = structuredClone(source);
detachedGroup.nodes.pass.parentId = "different-parent";
assert.equal(resolveSourceCompositing(detachedGroup).pass, undefined,
  "a group must belong to the root whose backdrop certifies it");

function packageWithMixedImageGradient(): TemplatePackageV1 {
  const value = structuredClone(fixture) as unknown as TemplatePackageV1;
  value.source!.pluginVersion = "0.6.1";
  value.canvas.background = { r: 0, g: 0, b: 0, a: 1 };
  value.editableFields = [];
  const frame = structuredClone(value.nodes[value.rootNodeId]);
  const imageNode = Object.values(value.nodes).find((node) => node.image);
  assert.ok(imageNode?.image);
  frame.id = "mixed-frame";
  frame.type = "FRAME";
  frame.parentId = value.rootNodeId;
  frame.children = [];
  frame.image = structuredClone(imageNode.image);
  frame.appearance = {
    ...frame.appearance, opacity: 1, blendMode: "PASS_THROUGH",
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
  frame.layout.clipContent = false;
  value.nodes[value.rootNodeId].children = [frame.id];
  value.nodes[value.rootNodeId].appearance.fills = [];
  value.nodes[frame.id] = frame;
  return value;
}

const mixed = packageWithMixedImageGradient();
const mixedBefore = structuredClone(mixed);
const mixedOwner = resolveSourceCompositing(mixed)["mixed-frame"];
assert.equal(mixedOwner?.kind, "mixed-image-gradient");
if (mixedOwner?.kind !== "mixed-image-gradient") throw new Error("missing mixed-paint owner");
assert.equal(mixedOwner.gradient.capability, "source-certified-linear-gradient");
assert.deepEqual([mixedOwner.solidSourceIndex, mixedOwner.imageSourceIndex, mixedOwner.gradientSourceIndex], [0, 1, 2]);
assert.deepEqual(mixed, mixedBefore, "mixed-paint resolution must preserve source paints");
const mixedResolved = createResolvedRenderTree(mixed);
assert.ok(mixedResolved.nodes["mixed-frame"].backendDecision.requiredCapabilities.includes("CMP-MIXED-IMAGE-DARKEN-GRADIENT"));
assert.ok(mixedResolved.nodes["mixed-frame"].fidelityDiagnostics.some(
  (item) => item.code === "resolved-mixed-image-gradient-supported"));
const mixedEdited = structuredClone(mixed);
const editedGradient = mixedEdited.nodes["mixed-frame"].appearance.fills[2];
if (editedGradient.type === "GRADIENT_LINEAR") editedGradient.gradientStops![0].color.r = 0.2;
assert.notEqual(resolveSourceCompositing(mixedEdited)["mixed-frame"]?.revision, mixedOwner.revision);
const mixedResized = structuredClone(mixed);
mixedResized.nodes["mixed-frame"].bounds.relative.height += 100;
assert.notEqual(resolveSourceCompositing(mixedResized)["mixed-frame"]?.revision, mixedOwner.revision);
const mixedUnsupported = structuredClone(mixed);
mixedUnsupported.nodes["mixed-frame"].appearance.fills[2].blendMode = "SCREEN";
assert.equal(resolveSourceCompositing(mixedUnsupported)["mixed-frame"], undefined);
const mixedConflict = structuredClone(mixed);
const conflictingGradient = mixedConflict.nodes["mixed-frame"].appearance.fills[2];
if (conflictingGradient.type === "GRADIENT_LINEAR") conflictingGradient.linearGradientSource!.conflicts.push("canonical-raw-stop-conflict");
assert.equal(resolveSourceCompositing(mixedConflict)["mixed-frame"], undefined);
const mixedAnimated = structuredClone(mixed);
mixedAnimated.motion = {
  format: "figma-motion-v1",
  raw: { tracks: [{ nodeId: "mixed-frame" }] },
  linking: { status: "pass", matchedNodeIds: ["mixed-frame"], missingNodeIds: [] },
};
assert.equal(resolveSourceCompositing(mixedAnimated)["mixed-frame"], undefined,
  "a motion-owned ancestor must retain the coherent compatibility boundary");
const mixedTranslucentRoot = structuredClone(mixed);
mixedTranslucentRoot.nodes[mixedTranslucentRoot.rootNodeId].appearance.opacity = 0.8;
assert.equal(resolveSourceCompositing(mixedTranslucentRoot)["mixed-frame"], undefined,
  "the mixed paint owner requires a source-certified opaque backdrop");
console.log("Source compositing contract passed");
