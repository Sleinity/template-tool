import type { CanonicalSceneGraphV1 } from "./types";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stable(child)]));
}

export function stableSceneValue(graph: CanonicalSceneGraphV1): CanonicalSceneGraphV1 {
  return stable(graph) as CanonicalSceneGraphV1;
}

export function serializeCanonicalSceneGraph(graph: CanonicalSceneGraphV1, space = 2): string {
  return `${JSON.stringify(stableSceneValue(graph), null, space)}\n`;
}
