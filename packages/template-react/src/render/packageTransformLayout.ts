import type { CSSProperties } from "react";
import type { PackageAbsoluteConstraintResolution } from "./packageConstraintLayout";
import type { PackageTransformModel } from "@sleinity/template-core/renderer-internal";

export {
  resolvePackageTransform,
  type PackageTransformModel,
} from "@sleinity/template-core/renderer-internal";

export interface SafeTransformedConstraintStyle {
  style: CSSProperties;
  fallbackAxes: Array<"horizontal" | "vertical">;
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
