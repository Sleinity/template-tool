import type { DependencyGraphV1, MeasurementSnapshotV1, SettledSceneGraphV1 } from "./types";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(4)) : value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stable(child)]));
}

export function normalizeMeasurementSnapshot(snapshot: MeasurementSnapshotV1): MeasurementSnapshotV1 {
  const normalized = structuredClone(snapshot);
  normalized.capturedAt = null;
  normalized.provenance.captureRunId = null;
  if (normalized.provenance.route?.startsWith("/drafts/")) normalized.provenance.route = "/drafts/:draftId";
  normalized.records.sort((left, right) => left.id.localeCompare(right.id));
  return stable(normalized) as MeasurementSnapshotV1;
}

export function normalizeDependencyGraph(graph: DependencyGraphV1): DependencyGraphV1 {
  const normalized = structuredClone(graph);
  normalized.vertices.sort((left, right) => left.key.localeCompare(right.key));
  normalized.edges.sort((left, right) => `${left.from}|${left.to}|${left.kind}`.localeCompare(`${right.from}|${right.to}|${right.kind}`));
  return stable(normalized) as DependencyGraphV1;
}

export function normalizeSettledSceneGraph(graph: SettledSceneGraphV1): SettledSceneGraphV1 {
  const normalized = structuredClone(graph);
  normalized.performance.settlementMs = 0;
  return stable(normalized) as SettledSceneGraphV1;
}

export function settlementTrace(graph: SettledSceneGraphV1): unknown {
  return stable({
    schemaVersion: "settlement-trace-v1",
    fixture: graph.fixture,
    surface: graph.surface,
    revision: graph.revision,
    stable: graph.stable,
    readiness: graph.readiness,
    iterations: graph.iterations,
    unresolvedDependencies: graph.unresolvedDependencies,
    nodes: graph.nodeOrder.map((id) => ({ id, changedProperties: graph.nodes[id].changedProperties, unresolved: graph.nodes[id].unresolved, approximations: graph.nodes[id].approximations })),
  });
}

export function serializeSettlementValue(value: unknown, space = 2): string {
  return `${JSON.stringify(stable(value), null, space)}\n`;
}
