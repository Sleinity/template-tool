import type { CanonicalSceneGraphV1, CanonicalSceneNodeV1 } from "@sleinity/template-core";
import type { CoreLayoutRouteV1, CoreLayoutSettlementV1, IntrinsicTextMeasurementV1 } from "./types";

type Rect = { x: number; y: number; width: number; height: number };

const round = (value: number): number => Number(value.toFixed(6));
const clamp = (value: number, min: number | null, max: number | null): number => Math.max(min ?? -Infinity, Math.min(max ?? Infinity, value));
const axis = (rect: Rect, vertical: boolean, dimension: "main" | "cross"): number => vertical === (dimension === "main") ? rect.height : rect.width;
const setAxis = (rect: Rect, vertical: boolean, dimension: "main" | "cross", value: number): void => {
  if (vertical === (dimension === "main")) rect.height = value;
  else rect.width = value;
};

function stableHash(value: unknown): string {
  const source = JSON.stringify(value);
  let one = 2166136261;
  let two = 2246822519;
  for (let index = 0; index < source.length; index += 1) {
    one = Math.imul(one ^ source.charCodeAt(index), 16777619);
    two = Math.imul(two ^ source.charCodeAt(index), 3266489917);
  }
  return `${(one >>> 0).toString(16).padStart(8, "0")}${(two >>> 0).toString(16).padStart(8, "0")}`;
}

function applyAxisLimits(node: CanonicalSceneNodeV1, rect: Rect): void {
  rect.width = clamp(rect.width, node.layout.sizing.horizontal.min.value, node.layout.sizing.horizontal.max.value);
  rect.height = clamp(rect.height, node.layout.sizing.vertical.min.value, node.layout.sizing.vertical.max.value);
}

function initialBounds(scene: CanonicalSceneGraphV1, measurements: Map<string, IntrinsicTextMeasurementV1>): Map<string, Rect> {
  const bounds = new Map<string, Rect>();
  for (const nodeId of scene.nodeOrder) {
    const node = scene.nodes[nodeId];
    const canonical = node.geometry.relativeBounds.value;
    const next = { x: canonical.x, y: canonical.y, width: canonical.width, height: canonical.height };
    if (nodeId === scene.rootNodeId) Object.assign(next, { x: 0, y: 0, width: scene.canvas.width, height: scene.canvas.height });
    if (node.layout.sizing.horizontal.mode.value === "FIXED" && node.layout.sizing.horizontal.value.value !== null) next.width = node.layout.sizing.horizontal.value.value;
    if (node.layout.sizing.vertical.mode.value === "FIXED" && node.layout.sizing.vertical.value.value !== null) next.height = node.layout.sizing.vertical.value.value;
    const intrinsic = measurements.get(nodeId);
    if (node.text && intrinsic) {
      const parent = node.identity.parentId ? scene.nodes[node.identity.parentId] : null;
      const horizontalFeedsHugParent = node.layout.sizing.horizontal.mode.value === "FILL" && parent?.layout.sizing.horizontal.mode.value === "HUG";
      const verticalFeedsHugParent = node.layout.sizing.vertical.mode.value === "FILL" && parent?.layout.sizing.vertical.mode.value === "HUG";
      if (node.layout.sizing.horizontal.mode.value === "HUG" || horizontalFeedsHugParent) next.width = intrinsic.width;
      if (node.layout.sizing.vertical.mode.value === "HUG" || verticalFeedsHugParent) next.height = intrinsic.height;
    }
    applyAxisLimits(node, next);
    bounds.set(nodeId, next);
  }
  return bounds;
}

function layoutParent(scene: CanonicalSceneGraphV1, route: CoreLayoutRouteV1, parentId: string, bounds: Map<string, Rect>): void {
  const parent = scene.nodes[parentId];
  if (!parent || !route.nodes[parentId]?.routed || parent.layout.autoLayout.mode.value === "NONE") return;
  const participants = parent.identity.children.map((id) => scene.nodes[id]).filter((child): child is CanonicalSceneNodeV1 => Boolean(child && route.nodes[child.identity.id]?.routed && child.layout.positioning.value !== "ABSOLUTE"));
  if (!participants.length) return;
  const parentRect = bounds.get(parentId)!;
  const vertical = parent.layout.autoLayout.mode.value === "VERTICAL";
  const padding = parent.layout.autoLayout.padding.value;
  const mainBefore = vertical ? padding.top : padding.left;
  const mainAfter = vertical ? padding.bottom : padding.right;
  const crossBefore = vertical ? padding.left : padding.top;
  const crossAfter = vertical ? padding.right : padding.bottom;
  const gap = parent.layout.autoLayout.gap.value;

  if (parent.layout.sizing.horizontal.mode.value === "HUG") {
    parentRect.width = padding.left + padding.right + (vertical ? Math.max(...participants.map((child) => bounds.get(child.identity.id)!.width)) : participants.reduce((sum, child) => sum + bounds.get(child.identity.id)!.width, 0) + gap * Math.max(0, participants.length - 1));
  }
  if (parent.layout.sizing.vertical.mode.value === "HUG") {
    parentRect.height = padding.top + padding.bottom + (vertical ? participants.reduce((sum, child) => sum + bounds.get(child.identity.id)!.height, 0) + gap * Math.max(0, participants.length - 1) : Math.max(...participants.map((child) => bounds.get(child.identity.id)!.height)));
  }
  applyAxisLimits(parent, parentRect);

  const availableMain = Math.max(0, axis(parentRect, vertical, "main") - mainBefore - mainAfter);
  const fixedMain = participants.reduce((sum, child) => {
    const fill = vertical ? child.layout.sizing.vertical.mode.value === "FILL" : child.layout.sizing.horizontal.mode.value === "FILL";
    return sum + (fill ? 0 : axis(bounds.get(child.identity.id)!, vertical, "main"));
  }, 0);
  const fillChildren = participants.filter((child) => vertical ? child.layout.sizing.vertical.mode.value === "FILL" : child.layout.sizing.horizontal.mode.value === "FILL");
  const gaps = gap * Math.max(0, participants.length - 1);
  const remaining = Math.max(0, availableMain - fixedMain - gaps);
  const fillSize = fillChildren.length ? remaining / fillChildren.length : 0;
  const occupied = fixedMain + gaps + fillSize * fillChildren.length;
  const free = Math.max(0, availableMain - occupied);
  const primary = parent.layout.autoLayout.primaryAlignment.value;
  let cursor = mainBefore + (primary === "CENTER" ? free / 2 : primary === "MAX" ? free : 0);
  const availableCross = Math.max(0, axis(parentRect, vertical, "cross") - crossBefore - crossAfter);
  const counter = parent.layout.autoLayout.counterAlignment.value;

  for (const child of participants) {
    const current = bounds.get(child.identity.id)!;
    const mainFill = vertical ? child.layout.sizing.vertical.mode.value === "FILL" : child.layout.sizing.horizontal.mode.value === "FILL";
    const crossFill = vertical ? child.layout.sizing.horizontal.mode.value === "FILL" : child.layout.sizing.vertical.mode.value === "FILL";
    if (mainFill) setAxis(current, vertical, "main", fillSize);
    if (crossFill || counter === "STRETCH") setAxis(current, vertical, "cross", availableCross);
    const crossFree = Math.max(0, availableCross - axis(current, vertical, "cross"));
    const crossPosition = crossBefore + (counter === "CENTER" ? crossFree / 2 : counter === "MAX" ? crossFree : 0);
    if (vertical) { current.x = crossPosition; current.y = cursor; }
    else { current.x = cursor; current.y = crossPosition; }
    applyAxisLimits(child, current);
    cursor += axis(current, vertical, "main") + gap;
  }
}

export function settleCoreLayout(input: {
  scene: CanonicalSceneGraphV1;
  route: CoreLayoutRouteV1;
  revision: string;
  textMeasurements?: IntrinsicTextMeasurementV1[];
  maxIterations?: number;
  tolerance?: number;
}): CoreLayoutSettlementV1 {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const textMeasurements = new Map((input.textMeasurements ?? []).filter((measurement) => measurement.revision === input.revision).map((measurement) => [measurement.nodeId, measurement]));
  const staleMeasurements = (input.textMeasurements ?? []).filter((measurement) => measurement.revision !== input.revision);
  const bounds = initialBounds(input.scene, textMeasurements);
  const maximum = input.maxIterations ?? 12;
  const tolerance = input.tolerance ?? 0.001;
  let stable = false;
  let iterationCount = 0;
  const convergenceSignature = () => JSON.stringify([...bounds].map(([id, value]) => [
    id,
    Object.fromEntries(Object.entries(value).map(([key, number]) => [
      key,
      round(number / tolerance) * tolerance,
    ])),
  ]));
  for (let iteration = 1; iteration <= maximum; iteration += 1) {
    const before = convergenceSignature();
    for (const nodeId of [...input.scene.nodeOrder].reverse()) layoutParent(input.scene, input.route, nodeId, bounds);
    for (const nodeId of input.scene.nodeOrder) layoutParent(input.scene, input.route, nodeId, bounds);
    const after = convergenceSignature();
    iterationCount = iteration;
    if (before === after) { stable = true; break; }
  }
  const missingMeasurements = input.route.routedNodeIds.filter((nodeId) => {
    const node = input.scene.nodes[nodeId];
    return Boolean(node.text?.browserMeasurementRequired && (node.layout.sizing.horizontal.mode.value === "HUG" || node.layout.sizing.vertical.mode.value === "HUG") && !textMeasurements.has(nodeId));
  });
  const nodes = Object.fromEntries(input.scene.nodeOrder.map((nodeId) => {
    const node = input.scene.nodes[nodeId];
    const current = bounds.get(nodeId)!;
    const normalized = Object.fromEntries(Object.entries(current).map(([key, value]) => [key, round(value)])) as Rect;
    return [nodeId, {
      nodeId,
      bounds: normalized,
      ownership: input.route.nodes[nodeId].ownership,
      textMeasurement: textMeasurements.get(nodeId) ?? null,
      imageSlot: node.media && input.route.nodes[nodeId].routed ? { ...normalized } : null,
      clipBounds: node.appearance.clipping.clipsContent.value && input.route.nodes[nodeId].routed ? { ...normalized } : null,
    }];
  }));
  const readiness = missingMeasurements.length ? "pending-measurements" : input.route.routedNodeIds.length ? "ready" : "unsupported";
  const identityInput = {
    revision: input.revision,
    route: input.route.routedNodeIds,
    bounds: input.route.routedNodeIds.map((id) => [id, nodes[id].bounds]),
    text: [...textMeasurements.values()].map(({
      nodeId,
      width,
      height,
      lineCount,
      capHeight,
      fontState,
      verticalTrim,
      trimAuthority,
      fontMetrics,
      glyphOrigin,
    }) => ({
      nodeId,
      width,
      height,
      lineCount,
      capHeight,
      fontState,
      verticalTrim,
      trimAuthority,
      fontMetrics,
      glyphOrigin,
    })),
  };
  return {
    schemaVersion: "core-layout-settlement-v1",
    settlementId: `core-${stableHash(identityInput)}`,
    revision: input.revision,
    rootNodeId: input.scene.rootNodeId,
    nodeOrder: [...input.scene.nodeOrder],
    nodes,
    readiness,
    stable,
    iterationCount,
    settlementMs: (typeof performance !== "undefined" ? performance.now() : Date.now()) - started,
    measurementCount: textMeasurements.size,
    recomputedNodeIds: [...input.route.routedNodeIds],
    routedNodeCount: input.route.routedNodeIds.length,
    compatibilityNodeCount: input.route.compatibilityNodeIds.length,
    fallbackBoundaries: input.route.fallbackBoundaries,
    diagnostics: [
      ...missingMeasurements.map((nodeId) => ({ code: "runtime-routing.measurement-pending", nodeId, message: "A current intrinsic text measurement is required before this route is ready." })),
      ...staleMeasurements.map((measurement) => ({ code: "runtime-routing.stale-measurement-rejected", nodeId: measurement.nodeId, message: `Measurement revision ${measurement.revision} does not match ${input.revision}.` })),
      ...input.route.fallbackBoundaries.map((boundary) => ({ code: "runtime-routing.compatibility-boundary", nodeId: boundary.nodeId, message: boundary.reasonCodes.join(", ") })),
    ],
  };
}
