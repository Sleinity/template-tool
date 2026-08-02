import type { DependencyGraphV1, InvalidationEventV1, InvalidationResultV1, InvalidationTraceStepV1 } from "./types";

function eventKeys(event: InvalidationEventV1, graph: DependencyGraphV1): { keys: string[]; full: boolean } {
  if (event.type === "property-change") return { keys: [`node:${event.nodeId}:${event.property}`], full: false };
  if (event.type === "font-state-change") return { keys: [`font:${event.fontId}:state`], full: false };
  if (event.type === "asset-state-change") return { keys: [`asset:${event.assetId}:state`], full: false };
  if (event.type === "container-resize") return { keys: event.nodeId ? [`node:${event.nodeId}:measure.bounds`] : ["graph:container"], full: false };
  if (event.type === "scene-revision") return { keys: ["graph:scene-revision"], full: true };
  return { keys: graph.vertices.map((vertex) => vertex.key), full: true };
}

export function invalidateDependencyGraph(graph: DependencyGraphV1, events: InvalidationEventV1[]): InvalidationResultV1 {
  const direct = new Set<string>();
  let usedFullTreeFallback = false;
  for (const event of events) {
    const mapped = eventKeys(event, graph);
    mapped.keys.forEach((key) => direct.add(key));
    usedFullTreeFallback ||= mapped.full;
  }
  if (usedFullTreeFallback) graph.vertices.forEach((vertex) => direct.add(vertex.key));
  const outgoing = new Map<string, DependencyGraphV1["edges"]>();
  graph.edges.forEach((edge) => outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]));
  const visited = new Set<string>();
  const queue = [...direct];
  const trace: InvalidationTraceStepV1[] = queue.map((key) => ({ key, via: null, kind: usedFullTreeFallback ? "full-tree-fallback" : "direct", reason: usedFullTreeFallback ? "Safe full-tree invalidation" : "Direct invalidation event" }));
  while (queue.length) {
    const key = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const edge of outgoing.get(key) ?? []) {
      if (!visited.has(edge.to)) {
        queue.push(edge.to);
        trace.push({ key: edge.to, via: edge.from, kind: edge.kind, reason: edge.reason });
      }
    }
  }
  const affected = [...visited].sort();
  const nodeIds = [...new Set(affected.filter((key) => key.startsWith("node:")).map((key) => key.split(":")[1]))].sort();
  return {
    schemaVersion: "invalidation-result-v1",
    events: structuredClone(events),
    directKeys: [...direct].sort(),
    affectedKeys: affected,
    affectedNodeIds: nodeIds,
    measurementsToRefresh: affected.filter((key) => key.includes(":measure.")).sort(),
    diagnosticsToRefresh: affected.filter((key) => key.endsWith(":diagnostic")).sort(),
    exportReadinessInvalidated: affected.includes("graph:export-readiness"),
    usedFullTreeFallback,
    trace,
  };
}
