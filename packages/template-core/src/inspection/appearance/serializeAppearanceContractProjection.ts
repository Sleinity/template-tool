import type { AppearanceContractProjectionV1 } from "./types";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stable(child)]));
}

export function serializeAppearanceContractProjection(value: AppearanceContractProjectionV1, space = 2): string {
  return `${JSON.stringify(stable(value), null, space)}\n`;
}
