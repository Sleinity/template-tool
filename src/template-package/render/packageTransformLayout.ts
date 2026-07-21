import type { CSSProperties } from "react";
import type { TemplateNode } from "../types";
import type { PackageAbsoluteConstraintResolution } from "./packageConstraintLayout";

type TransformMatrix = [
  [number, number, number],
  [number, number, number],
];

export interface PackageTransformModel {
  hasTransform: boolean;
  hasRotation: boolean;
  hasScale: boolean;
  isMirrored: boolean;
  rotation: number;
  scaleX: number;
  scaleY: number;
  transformOrigin: string;
  usesMatrix: boolean;
  rawMatrixPresent: boolean;
  matrixValid: boolean;
  hasUnsupportedSkew: boolean;
  linearMatrix: [number, number, number, number] | null;
  matrixTranslation: { x: number; y: number } | null;
  hasLocalGeometry: boolean;
  relativeBoundsInconsistent: boolean;
}

export interface SafeTransformedConstraintStyle {
  style: CSSProperties;
  fallbackAxes: Array<"horizontal" | "vertical">;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function figmaMetadata(node: TemplateNode): Record<string, unknown> | null {
  return isRecord(node.extensions?.figma)
    ? node.extensions.figma
    : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function parseMatrix(value: unknown): TransformMatrix | null {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 3 &&
        row.every((entry) => finite(entry) !== null),
    )
  ) {
    return value as TransformMatrix;
  }
  if (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every((entry) => finite(entry) !== null)
  ) {
    const [a, b, c, d, tx, ty] = value as number[];
    return [
      [a, c, tx],
      [b, d, ty],
    ];
  }
  return null;
}

function transformOriginValue(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (isRecord(value)) {
    const x = finite(value.x);
    const y = finite(value.y);
    if (x !== null && y !== null) {
      const unit =
        typeof value.unit === "string" ? value.unit.toUpperCase() : "PIXELS";
      if (unit === "PERCENT" || unit === "PERCENTAGE") {
        return `${x}% ${y}%`;
      }
      return `${x}px ${y}px`;
    }
  }
  return "50% 50%";
}

export function resolvePackageTransform(
  node: TemplateNode,
): PackageTransformModel {
  const figma = figmaMetadata(node);
  const rawMatrix =
    figma?.relativeTransform ??
    figma?.transform ??
    null;
  const matrix = parseMatrix(rawMatrix);
  const rawMatrixPresent = rawMatrix !== null && rawMatrix !== undefined;
  let rotation = finite(figma?.rotation) ?? 0;
  let scaleX =
    finite(figma?.scaleX) ??
    finite(figma?.transformScaleX) ??
    1;
  let scaleY =
    finite(figma?.scaleY) ??
    finite(figma?.transformScaleY) ??
    1;
  let hasUnsupportedSkew = false;
  let linearMatrix: PackageTransformModel["linearMatrix"] = null;
  let matrixTranslation: PackageTransformModel["matrixTranslation"] = null;

  if (matrix) {
    const [[a, c, tx], [b, d, ty]] = matrix;
    linearMatrix = [a, b, c, d];
    const matrixScaleX = Math.hypot(a, b);
    const determinant = a * d - b * c;
    const matrixScaleY =
      matrixScaleX === 0 ? Math.hypot(c, d) : determinant / matrixScaleX;
    rotation = Math.atan2(b, a) * (180 / Math.PI);
    scaleX = matrixScaleX;
    scaleY = matrixScaleY;
    const normalizedDot =
      matrixScaleX === 0 || matrixScaleY === 0
        ? 0
        : (a * c + b * d) / (matrixScaleX * Math.abs(matrixScaleY));
    hasUnsupportedSkew = Math.abs(normalizedDot) > 0.0001;
    matrixTranslation = { x: tx, y: ty };
  }

  if (figma?.flipHorizontal === true) scaleX *= -1;
  if (figma?.flipVertical === true) scaleY *= -1;

  const hasRotation = Math.abs(rotation) > 0.0001;
  const hasScale =
    Math.abs(scaleX - 1) > 0.0001 ||
    Math.abs(scaleY - 1) > 0.0001;
  const unrotatedBounds = figma?.unrotatedBounds;
  const hasLocalGeometry =
    (finite(figma?.width) !== null && finite(figma?.height) !== null) ||
    (isRecord(unrotatedBounds) &&
      finite(unrotatedBounds.width) !== null &&
      finite(unrotatedBounds.height) !== null);

  return {
    hasTransform: hasRotation || hasScale || hasUnsupportedSkew,
    hasRotation,
    hasScale,
    isMirrored: scaleX < 0 || scaleY < 0,
    rotation,
    scaleX,
    scaleY,
    transformOrigin: transformOriginValue(figma?.transformOrigin),
    usesMatrix: matrix !== null,
    rawMatrixPresent,
    matrixValid: !rawMatrixPresent || matrix !== null,
    hasUnsupportedSkew,
    linearMatrix,
    matrixTranslation,
    hasLocalGeometry,
    relativeBoundsInconsistent:
      figma?.relativeBoundsInconsistent === true ||
      figma?.relativeBoundsConsistent === false,
  };
}

export function applyPackageTransformStyle(
  style: CSSProperties,
  transform: PackageTransformModel,
): void {
  if (!transform.hasTransform) return;
  style.transformOrigin = transform.transformOrigin;
  if (transform.hasUnsupportedSkew && transform.linearMatrix) {
    const [a, b, c, d] = transform.linearMatrix;
    style.transform = `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
    return;
  }
  if (transform.hasRotation) {
    style.rotate = `${transform.rotation}deg`;
  }
  if (transform.hasScale) {
    style.scale = `${transform.scaleX} ${transform.scaleY}`;
  }
}

function isUnsafeTransformedConstraint(value: string | null): boolean {
  return (
    value === "LEFT_RIGHT" ||
    value === "TOP_BOTTOM" ||
    value === "SCALE"
  );
}

function safeTranslate(
  value: CSSProperties["translate"],
  fallbackHorizontal: boolean,
  fallbackVertical: boolean,
): CSSProperties["translate"] {
  if (typeof value !== "string") return value;
  const parts = value.trim().split(/\s+/);
  const horizontal = fallbackHorizontal ? "0" : parts[0] ?? "0";
  const vertical = fallbackVertical ? "0" : parts[1] ?? "0";
  return horizontal === "0" && vertical === "0"
    ? undefined
    : `${horizontal} ${vertical}`;
}

export function resolveTransformedConstraintStyle(
  transform: PackageTransformModel,
  resolution: PackageAbsoluteConstraintResolution,
): SafeTransformedConstraintStyle {
  if (!transform.hasTransform) {
    return { style: resolution.style, fallbackAxes: [] };
  }

  // Figma resolves constraints against the untransformed local box, then
  // applies the node transform. When local geometry is available, CSS can do
  // the same: layout/constraint properties size the box and transform it
  // afterwards. Snapshot fallback is only needed when that local box is
  // missing or the exporter reports inconsistent parent-space bounds.
  if (
    transform.matrixValid &&
    transform.hasLocalGeometry &&
    !transform.relativeBoundsInconsistent
  ) {
    return { style: resolution.style, fallbackAxes: [] };
  }

  const style = { ...resolution.style };
  const fallbackHorizontal = isUnsafeTransformedConstraint(
    resolution.horizontal.effective,
  );
  const fallbackVertical = isUnsafeTransformedConstraint(
    resolution.vertical.effective,
  );

  if (fallbackHorizontal) {
    delete style.left;
    delete style.right;
    delete style.width;
  }
  if (fallbackVertical) {
    delete style.top;
    delete style.bottom;
    delete style.height;
  }
  style.translate = safeTranslate(
    style.translate,
    fallbackHorizontal,
    fallbackVertical,
  );

  return {
    style,
    fallbackAxes: [
      ...(fallbackHorizontal ? ["horizontal" as const] : []),
      ...(fallbackVertical ? ["vertical" as const] : []),
    ],
  };
}
