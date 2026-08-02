import { measurementMap, publishMeasurementSnapshot } from "./measurement";
import type {
  MeasurementRecordV1,
  ReadinessState,
  SettledMediaPlacementV1,
  SettledNodeV1,
  SettledSceneGraphV1,
  SettlementInputV1,
  SettlementIterationV1,
} from "./types";

type Rect = { x: number; y: number; width: number; height: number };

const finite = (value: unknown, fallback = 0): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const round = (value: number): number => Number(value.toFixed(6));
const rect = (value: unknown): Rect | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Rect>;
  return [candidate.x, candidate.y, candidate.width, candidate.height].every((item) => typeof item === "number" && Number.isFinite(item))
    ? { x: candidate.x!, y: candidate.y!, width: Math.max(0, candidate.width!), height: Math.max(0, candidate.height!) }
    : null;
};
const delta = (left: Rect, right: Rect): number => Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y), Math.abs(left.width - right.width), Math.abs(left.height - right.height));
const clamp = (value: number, min: number | null, max: number | null): number => Math.max(min ?? -Infinity, Math.min(max ?? Infinity, value));

function record(records: MeasurementRecordV1[] | undefined, property: MeasurementRecordV1["property"]): MeasurementRecordV1 | null {
  return records?.find((item) => item.property === property && item.valid && item.readiness !== "failed") ?? null;
}

function textMeasurement(records: MeasurementRecordV1[] | undefined): SettledNodeV1["textMeasurement"] {
  const measured = record(records, "text-box");
  if (!measured || !measured.value || typeof measured.value !== "object") return null;
  const value = measured.value as Record<string, unknown>;
  const width = finite(value.width, Number.NaN);
  const height = finite(value.height, Number.NaN);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height, scrollWidth: typeof value.scrollWidth === "number" ? value.scrollWidth : null, scrollHeight: typeof value.scrollHeight === "number" ? value.scrollHeight : null };
}

function imagePlacement(node: SettlementInputV1["scene"]["nodes"][string], bounds: Rect, records: MeasurementRecordV1[] | undefined): SettledMediaPlacementV1 | null {
  if (!node.media) return null;
  const intrinsicRecord = record(records, "intrinsic-image");
  const intrinsicValue = intrinsicRecord?.value && typeof intrinsicRecord.value === "object" ? intrinsicRecord.value as Record<string, unknown> : null;
  const intrinsic = {
    width: typeof intrinsicValue?.width === "number" ? intrinsicValue.width : node.media.intrinsicSize.width,
    height: typeof intrinsicValue?.height === "number" ? intrinsicValue.height : node.media.intrinsicSize.height,
  };
  const mode = node.media.scaleMode.value.toUpperCase();
  const focal = node.media.focalPosition.value;
  const slot = { ...bounds };
  if (!intrinsic.width || !intrinsic.height || !bounds.width || !bounds.height) {
    return { slot, intrinsic, mode, destination: null, sourceCrop: null, focalPosition: focal, preserveAspectRatio: node.media.preserveAspectRatio };
  }
  if (mode === "STRETCH") {
    return { slot, intrinsic, mode, destination: { ...bounds }, sourceCrop: { x: 0, y: 0, width: intrinsic.width, height: intrinsic.height }, focalPosition: focal, preserveAspectRatio: false };
  }
  const contain = mode === "FIT";
  const scale = contain ? Math.min(bounds.width / intrinsic.width, bounds.height / intrinsic.height) : Math.max(bounds.width / intrinsic.width, bounds.height / intrinsic.height);
  const width = intrinsic.width * scale;
  const height = intrinsic.height * scale;
  const destination = { x: bounds.x + (bounds.width - width) * focal.x, y: bounds.y + (bounds.height - height) * focal.y, width, height };
  const sourceCrop = contain ? { x: 0, y: 0, width: intrinsic.width, height: intrinsic.height } : {
    x: Math.max(0, (intrinsic.width - bounds.width / scale) * focal.x),
    y: Math.max(0, (intrinsic.height - bounds.height / scale) * focal.y),
    width: Math.min(intrinsic.width, bounds.width / scale),
    height: Math.min(intrinsic.height, bounds.height / scale),
  };
  return { slot, intrinsic, mode, destination, sourceCrop, focalPosition: focal, preserveAspectRatio: true };
}

function autoLayout(input: SettlementInputV1, bounds: Map<string, Rect>): void {
  for (const parentId of [...input.scene.nodeOrder].reverse()) {
    const parent = input.scene.nodes[parentId];
    if (!parent || parent.layout.autoLayout.mode.value === "NONE") continue;
    const participants = parent.identity.children.map((id) => input.scene.nodes[id]).filter((node) => node && node.layout.positioning.value !== "ABSOLUTE");
    if (!participants.length) continue;
    const parentRect = bounds.get(parentId)!;
    const { top, right, bottom, left } = parent.layout.autoLayout.padding.value;
    const gap = parent.layout.autoLayout.gap.value;
    const vertical = parent.layout.autoLayout.mode.value === "VERTICAL";
    const mainSize = vertical ? parentRect.height - top - bottom : parentRect.width - left - right;
    const fixed = participants.reduce((sum, child) => {
      const childRect = bounds.get(child.identity.id)!;
      const fill = vertical ? child.layout.sizing.vertical.mode.value === "FILL" : child.layout.sizing.horizontal.mode.value === "FILL";
      return sum + (fill ? 0 : vertical ? childRect.height : childRect.width);
    }, 0);
    const fillChildren = participants.filter((child) => vertical ? child.layout.sizing.vertical.mode.value === "FILL" : child.layout.sizing.horizontal.mode.value === "FILL");
    const remaining = Math.max(0, mainSize - fixed - gap * Math.max(0, participants.length - 1));
    const fillSize = fillChildren.length ? remaining / fillChildren.length : 0;
    let cursor = vertical ? top : left;
    for (const child of participants) {
      const current = bounds.get(child.identity.id)!;
      const next = { ...current };
      const mainFill = vertical ? child.layout.sizing.vertical.mode.value === "FILL" : child.layout.sizing.horizontal.mode.value === "FILL";
      const crossFill = vertical ? child.layout.sizing.horizontal.mode.value === "FILL" : child.layout.sizing.vertical.mode.value === "FILL";
      if (vertical) {
        next.y = cursor;
        if (mainFill) next.height = fillSize;
        if (crossFill) { next.x = left; next.width = Math.max(0, parentRect.width - left - right); }
        cursor += next.height + gap;
      } else {
        next.x = cursor;
        if (mainFill) next.width = fillSize;
        if (crossFill) { next.y = top; next.height = Math.max(0, parentRect.height - top - bottom); }
        cursor += next.width + gap;
      }
      bounds.set(child.identity.id, next);
    }
    const horizontalHug = parent.layout.sizing.horizontal.mode.value === "HUG";
    const verticalHug = parent.layout.sizing.vertical.mode.value === "HUG";
    if (horizontalHug) parentRect.width = left + right + (vertical ? Math.max(...participants.map((child) => bounds.get(child.identity.id)!.width)) : participants.reduce((sum, child) => sum + bounds.get(child.identity.id)!.width, 0) + gap * Math.max(0, participants.length - 1));
    if (verticalHug) parentRect.height = top + bottom + (vertical ? participants.reduce((sum, child) => sum + bounds.get(child.identity.id)!.height, 0) + gap * Math.max(0, participants.length - 1) : Math.max(...participants.map((child) => bounds.get(child.identity.id)!.height)));
  }
}

export function settleSceneGraph(input: SettlementInputV1): SettledSceneGraphV1 {
  const started = performance.now();
  if (input.fixture.id !== input.dependencies.fixture.id || input.fixture.zipSha256 !== input.dependencies.fixture.zipSha256 || input.fixture.id !== input.measurements.fixture.id || input.fixture.zipSha256 !== input.measurements.fixture.zipSha256) throw new Error("Settlement fixture identity/hash mismatch.");
  if (input.scene.schemaVersion !== input.dependencies.sceneVersion) throw new Error("Settlement dependency graph targets a different scene version.");
  const publication = publishMeasurementSnapshot(input.measurements, input.revision);
  if (!publication.accepted || !publication.snapshot) throw new Error(`Measurement publication rejected: ${publication.reason}`);
  const measurements = measurementMap(publication.snapshot);
  const maxIterations = input.options?.maxIterations ?? 12;
  const tolerance = input.options?.geometryTolerance ?? 0.001;
  const bounds = new Map<string, Rect>();
  const authority = new Map<string, SettledNodeV1["boundsAuthority"]>();
  for (const nodeId of input.scene.nodeOrder) {
    const node = input.scene.nodes[nodeId];
    const observed = rect(record(measurements.get(nodeId), "bounds")?.value);
    const canonical = node.geometry.relativeBounds.value;
    bounds.set(nodeId, observed ?? { x: finite(canonical.x), y: finite(canonical.y), width: Math.max(0, finite(canonical.width)), height: Math.max(0, finite(canonical.height)) });
    authority.set(nodeId, observed ? "measurement" : "canonical-fallback");
    const text = textMeasurement(measurements.get(nodeId));
    if (!observed && text && node.text) {
      const current = bounds.get(nodeId)!;
      if (node.layout.sizing.horizontal.mode.value === "HUG") current.width = text.width;
      if (node.layout.sizing.vertical.mode.value === "HUG") current.height = text.height;
      authority.set(nodeId, "settlement");
    }
  }
  const iterations: SettlementIterationV1[] = [];
  let stable = false;
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const before = new Map([...bounds].map(([id, value]) => [id, { ...value }]));
    autoLayout(input, bounds);
    for (const nodeId of input.scene.nodeOrder) {
      const observed = rect(record(measurements.get(nodeId), "bounds")?.value);
      if (observed) bounds.set(nodeId, observed);
    }
    const changed = input.scene.nodeOrder.filter((id) => delta(before.get(id)!, bounds.get(id)!) > tolerance);
    const maxGeometryDelta = changed.reduce((maximum, id) => Math.max(maximum, delta(before.get(id)!, bounds.get(id)!)), 0);
    iterations.push({ iteration, changedNodeIds: changed, maxGeometryDelta: round(maxGeometryDelta), measurementCount: input.measurements.records.length, unresolvedCount: 0 });
    if (!changed.length || maxGeometryDelta <= tolerance) { stable = true; break; }
  }
  const nodes: Record<string, SettledNodeV1> = {};
  const unresolvedDependencies: string[] = [];
  for (const nodeId of input.scene.nodeOrder) {
    const node = input.scene.nodes[nodeId];
    const current = bounds.get(nodeId)!;
    const records = measurements.get(nodeId);
    const text = textMeasurement(records);
    const unresolved: string[] = [];
    const approximations: string[] = [];
    if (node.text?.browserMeasurementRequired && !text) unresolved.push(`node:${nodeId}:measure.text`);
    if (node.media && (!node.media.intrinsicSize.width || !node.media.intrinsicSize.height) && !record(records, "intrinsic-image")) unresolved.push(`node:${nodeId}:measure.intrinsic-image`);
    if (node.relationships.maskRelationship.isMask || node.relationships.maskRelationship.maskedSiblingRange) unresolved.push(`node:${nodeId}:mask-range`);
    if (node.appearance.effects.length) approximations.push(`node:${nodeId}:effects-current-runtime-approximation`);
    unresolvedDependencies.push(...unresolved);
    const fontsPending = node.text && input.measurements.readiness.fonts !== "ready";
    const assetsPending = node.media && input.measurements.readiness.assets !== "ready";
    const readiness: ReadinessState = unresolved.length ? "pending-measurements" : fontsPending ? "pending-fonts" : assetsPending ? "pending-assets" : stable ? "ready" : "unstable";
    nodes[nodeId] = {
      id: nodeId,
      parentId: node.identity.parentId,
      bounds: Object.fromEntries(Object.entries(current).map(([key, value]) => [key, round(value)])) as Rect,
      boundsAuthority: authority.get(nodeId)!,
      textMeasurement: text,
      mediaPlacement: imagePlacement(node, current, records),
      clip: node.appearance.clipping.clipsContent.value ? { strategy: "rectangular-clip-placeholder", bounds: { ...current } } : null,
      mask: node.relationships.maskRelationship.isMask || node.relationships.maskRelationship.maskedSiblingRange ? { status: "unresolved", dependencyKeys: [`node:${nodeId}:bounds`, `node:${nodeId}:mask-range`] } : { status: "not-applicable", dependencyKeys: [] },
      effects: node.appearance.effects.length ? { status: "unresolved", dependencyKeys: [`node:${nodeId}:bounds`, `node:${nodeId}:effects`] } : { status: "not-applicable", dependencyKeys: [] },
      readiness,
      unresolved,
      approximations,
      changedProperties: iterations.flatMap((entry) => entry.changedNodeIds.includes(nodeId) ? ["bounds"] : []).filter((value, index, values) => values.indexOf(value) === index),
    };
  }
  const globalReadiness: ReadinessState = unresolvedDependencies.length ? "pending-measurements" : input.measurements.readiness.fonts !== "ready" ? "pending-fonts" : input.measurements.readiness.assets !== "ready" ? "pending-assets" : stable && input.measurements.readiness.geometryStable ? "ready" : "unstable";
  const reusedNodeCount = input.previous ? input.scene.nodeOrder.filter((id) => JSON.stringify(input.previous?.nodes[id]?.bounds) === JSON.stringify(nodes[id].bounds)).length : 0;
  return {
    schemaVersion: "settled-scene-graph-v1",
    fixture: { ...input.fixture },
    surface: input.surface,
    environmentProfile: input.environmentProfile,
    sourceSceneVersion: input.scene.schemaVersion,
    revision: { ...input.revision },
    rootNodeId: input.scene.rootNodeId,
    nodeOrder: [...input.scene.nodeOrder],
    nodes,
    readiness: globalReadiness,
    stable,
    iterations,
    invalidation: null,
    unresolvedDependencies: [...new Set(unresolvedDependencies)].sort(),
    performance: { settlementMs: performance.now() - started, iterationCount: iterations.length, reusedNodeCount, recomputedNodeCount: input.scene.nodeOrder.length - reusedNodeCount },
    compatibility: { runtimeUse: "disabled-observational", rendererAuthority: "unchanged", productionPixelsChanged: false },
  };
}
