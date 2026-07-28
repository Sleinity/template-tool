import type { PackageGradientPaint, PackageRect } from "../types";
import type {
  LinearGradientMatrixV1,
  ResolvedLinearGradientGeometryV1,
  ResolvedLinearGradientStopV1,
} from "./types";

function stableHash(value: unknown): string {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function matrix(value: unknown): LinearGradientMatrixV1 | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  if (!value.every((row) => Array.isArray(row) && row.length === 3 && row.every(
    (entry) => typeof entry === "number" && Number.isFinite(entry),
  ))) return null;
  return value.map((row) => [...row]) as LinearGradientMatrixV1;
}

function inverse(
  source: LinearGradientMatrixV1,
): { determinant: number; matrix: LinearGradientMatrixV1 } | null {
  const [[a, c, e], [b, d, f]] = source;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) <= 1e-12) return null;
  return {
    determinant,
    matrix: [
      [d / determinant, -c / determinant, (c * f - d * e) / determinant],
      [-b / determinant, a / determinant, (b * e - a * f) / determinant],
    ],
  };
}

function transformPoint(
  source: LinearGradientMatrixV1,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: source[0][0] * x + source[0][1] * y + source[0][2],
    y: source[1][0] * x + source[1][1] * y + source[1][2],
  };
}

function project(point: { x: number; y: number }, bounds: PackageRect): { x: number; y: number } {
  return { x: bounds.x + point.x * bounds.width, y: bounds.y + point.y * bounds.height };
}

function validChannel(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function resolvedStops(
  paint: PackageGradientPaint,
): { stops: ResolvedLinearGradientStopV1[]; reason: string | null } {
  const source = paint.gradientStops ?? paint.stops;
  if (!Array.isArray(source) || source.length < 2 || source.length > 3) {
    return { stops: [], reason: "linear-gradient-stop-count-unsupported" };
  }
  const stops: ResolvedLinearGradientStopV1[] = [];
  for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
    const stop = source[sourceIndex];
    if (!Number.isFinite(stop.position) || stop.position < 0 || stop.position > 1) {
      return { stops: [], reason: "linear-gradient-stop-position-invalid" };
    }
    if (sourceIndex > 0 && stop.position <= source[sourceIndex - 1].position) {
      return { stops: [], reason: "linear-gradient-stop-order-unsupported" };
    }
    if (![stop.color.r, stop.color.g, stop.color.b, stop.color.a].every(validChannel)) {
      return { stops: [], reason: "linear-gradient-stop-color-invalid" };
    }
    stops.push({ sourceIndex, position: stop.position, color: { ...stop.color } });
  }
  return { stops, reason: null };
}

function unsupported(
  paint: PackageGradientPaint,
  sourceIndex: number,
  bounds: PackageRect,
  reason: string,
): ResolvedLinearGradientGeometryV1 {
  const sourceMatrix = matrix(paint.gradientTransform ?? paint.transform);
  const sourceRevision = `linear-gradient-source-v1:${stableHash({ sourceIndex, paint })}`;
  return {
    schemaVersion: "resolved-linear-gradient-v1",
    coordinateSpace: "normalized-node-local-to-normalized-gradient",
    sourceIndex,
    sourceMatrix,
    determinant: sourceMatrix ? sourceMatrix[0][0] * sourceMatrix[1][1] - sourceMatrix[1][0] * sourceMatrix[0][1] : null,
    inverseMatrix: null,
    inversionCount: 0,
    normalizedHandles: { start: null, end: null, third: null },
    templateHandles: { start: null, end: null, third: null },
    svgGradientTransform: null,
    stops: [],
    paintOpacity: typeof paint.opacity === "number" ? paint.opacity : 1,
    capability: "unsupported-linear-gradient",
    runtimeOwner: "compatibility",
    fallbackReason: reason,
    sourceRevision,
    geometryRevision: `linear-gradient-geometry-v1:${stableHash({ sourceRevision, bounds, reason })}`,
    provenance: {
      canonicalPath: paint.linearGradientSource?.canonicalPath ?? null,
      rawFigmaPath: paint.linearGradientSource?.rawFigmaPath ?? null,
      normalizationRevision: paint.linearGradientSource?.normalizationRevision ?? null,
      conflicts: [...(paint.linearGradientSource?.conflicts ?? [])],
    },
  };
}

export function resolveLinearGradientGeometry(
  paint: PackageGradientPaint,
  sourceIndex: number,
  bounds: PackageRect,
): ResolvedLinearGradientGeometryV1 {
  const source = paint.linearGradientSource;
  if (!source || source.schemaVersion !== "linear-gradient-source-v1" || source.pairing !== "source-index" || source.sourceIndex !== sourceIndex) {
    return unsupported(paint, sourceIndex, bounds, "linear-gradient-canonical-source-missing");
  }
  if (source.conflicts.length > 0) return unsupported(paint, sourceIndex, bounds, "linear-gradient-source-conflict");
  if ((paint.blendMode?.toUpperCase() ?? "NORMAL") !== "NORMAL") {
    return unsupported(paint, sourceIndex, bounds, "linear-gradient-blend-mode-unsupported");
  }
  const paintOpacity = paint.opacity ?? 1;
  if (!validChannel(paintOpacity)) return unsupported(paint, sourceIndex, bounds, "linear-gradient-paint-opacity-invalid");
  const stopResult = resolvedStops(paint);
  if (stopResult.reason) return unsupported(paint, sourceIndex, bounds, stopResult.reason);
  const sourceMatrix = matrix(paint.gradientTransform ?? paint.transform);
  if (!sourceMatrix) return unsupported(paint, sourceIndex, bounds, "linear-gradient-transform-invalid");
  const inverted = inverse(sourceMatrix);
  if (!inverted) return unsupported(paint, sourceIndex, bounds, "linear-gradient-transform-non-invertible");
  const start = transformPoint(inverted.matrix, 0, 0.5);
  const end = transformPoint(inverted.matrix, 1, 0.5);
  const third = transformPoint(inverted.matrix, 0, 1);
  const svgGradientTransform: LinearGradientMatrixV1 = [
    [bounds.width * inverted.matrix[0][0], bounds.width * inverted.matrix[0][1], bounds.width * inverted.matrix[0][2]],
    [bounds.height * inverted.matrix[1][0], bounds.height * inverted.matrix[1][1], bounds.height * inverted.matrix[1][2]],
  ];
  const sourceRevision = `linear-gradient-source-v1:${stableHash({ sourceIndex, paint })}`;
  return {
    schemaVersion: "resolved-linear-gradient-v1",
    coordinateSpace: "normalized-node-local-to-normalized-gradient",
    sourceIndex,
    sourceMatrix,
    determinant: inverted.determinant,
    inverseMatrix: inverted.matrix,
    inversionCount: 1,
    normalizedHandles: { start, end, third },
    templateHandles: { start: project(start, bounds), end: project(end, bounds), third: project(third, bounds) },
    svgGradientTransform,
    stops: stopResult.stops,
    paintOpacity,
    capability: "source-certified-linear-gradient",
    runtimeOwner: "svg",
    fallbackReason: null,
    sourceRevision,
    geometryRevision: `linear-gradient-geometry-v1:${stableHash({ sourceRevision, bounds, sourceMatrix, inverse: inverted.matrix, stops: stopResult.stops, paintOpacity })}`,
    provenance: {
      canonicalPath: source.canonicalPath,
      rawFigmaPath: source.rawFigmaPath,
      normalizationRevision: source.normalizationRevision,
      conflicts: [...source.conflicts],
    },
  };
}

export function resizeLinearGradientGeometry(
  source: ResolvedLinearGradientGeometryV1,
  paint: PackageGradientPaint,
  bounds: PackageRect,
): ResolvedLinearGradientGeometryV1 {
  return resolveLinearGradientGeometry(paint, source.sourceIndex, bounds);
}
