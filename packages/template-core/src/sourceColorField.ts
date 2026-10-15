type JsonRecord = Record<string, unknown>;
import type { PackageSolidPaint } from "./types";

/** The editor's 8-bit RGB representation of an imported SOLID paint. */
export function sourceSolidColorHex(paint: PackageSolidPaint): string {
  const channel = (value: number) =>
    Math.round(Math.max(0, Math.min(1, value)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(paint.color.r)}${channel(paint.color.g)}${channel(paint.color.b)}`;
}

const COLOR_FILL_NODE_TYPES = new Set([
  "FRAME",
  "RECTANGLE",
  "TEXT",
  "VECTOR",
  "ELLIPSE",
  "LINE",
  "POLYGON",
  "STAR",
]);

export type SourceColorFillResolution =
  | { resolved: true; sourceIndex: number }
  | {
      resolved: false;
      reason:
        | "unsupported-node-type"
        | "mask-source"
        | "missing-solid-fill"
        | "ambiguous-solid-fill";
      candidateSourceIndices: number[];
    };

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Resolves loose exporter Color intent without weakening either canonical
 * package contract. A generic binding is portable only when it can be frozen
 * to one exact, non-mask SOLID paint source index.
 */
export function resolveSourceColorFill(
  packageValue: { maskRelationships?: unknown },
  node: unknown,
): SourceColorFillResolution {
  if (!isRecord(node) || !COLOR_FILL_NODE_TYPES.has(String(node.type))) {
    return {
      resolved: false,
      reason: "unsupported-node-type",
      candidateSourceIndices: [],
    };
  }

  const nodeId = typeof node.id === "string" ? node.id : null;
  const parentId = typeof node.parentId === "string" ? node.parentId : null;
  const mask = isRecord(node.mask) ? node.mask : null;
  const relationships = Array.isArray(packageValue.maskRelationships)
    ? packageValue.maskRelationships
    : [];
  const isCertifiedMaskSource =
    mask?.isMask === true &&
    nodeId !== null &&
    relationships.some((value) =>
      isRecord(value) &&
      value.maskSourceId === nodeId &&
      typeof value.parentId === "string" &&
      value.parentId === parentId
    );
  if (isCertifiedMaskSource) {
    return {
      resolved: false,
      reason: "mask-source",
      candidateSourceIndices: [],
    };
  }

  const appearance = isRecord(node.appearance) ? node.appearance : null;
  const fills = appearance && Array.isArray(appearance.fills)
    ? appearance.fills
    : [];
  const candidateSourceIndices = fills.flatMap((paint, sourceIndex) =>
    isRecord(paint) && paint.type === "SOLID" ? [sourceIndex] : []
  );
  if (candidateSourceIndices.length !== 1) {
    return {
      resolved: false,
      reason: candidateSourceIndices.length === 0
        ? "missing-solid-fill"
        : "ambiguous-solid-fill",
      candidateSourceIndices,
    };
  }
  return { resolved: true, sourceIndex: candidateSourceIndices[0] };
}
