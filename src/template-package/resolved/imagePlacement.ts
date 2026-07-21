import type {
  ResolvedImagePlacementGeometryV1,
  ResolvedImagePlacementIntentV1,
} from "./types";

const EPSILON = 1e-8;

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function boundsOf(points: Array<{ x: number; y: number }>) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function normalizedTransform(
  value: number[][] | null,
): [number, number, number, number, number, number] | null {
  if (
    !value ||
    value.length < 2 ||
    !Array.isArray(value[0]) ||
    !Array.isArray(value[1]) ||
    value[0].length < 3 ||
    value[1].length < 3
  ) {
    return null;
  }
  const matrix: [number, number, number, number, number, number] = [
    value[0][0],
    value[1][0],
    value[0][1],
    value[1][1],
    value[0][2],
    value[1][2],
  ];
  return matrix.every(Number.isFinite) ? matrix : null;
}

export function invertNormalizedImageTransform(
  value: number[][] | null,
): [number, number, number, number, number, number] | null {
  const matrix = normalizedTransform(value);
  if (!matrix) return null;
  const [a, b, c, d, translateX, translateY] = matrix;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < EPSILON) {
    return null;
  }
  return [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * translateY - d * translateX) / determinant,
    (b * translateX - a * translateY) / determinant,
  ];
}

function sourceGeometry(
  rect: { x: number; y: number; width: number; height: number },
  intrinsicWidth: number,
  intrinsicHeight: number,
) {
  const left = clampUnit(rect.x);
  const top = clampUnit(rect.y);
  const right = clampUnit(rect.x + rect.width);
  const bottom = clampUnit(rect.y + rect.height);
  const normalized = {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
  return {
    normalized,
    pixels: {
      x: normalized.x * intrinsicWidth,
      y: normalized.y * intrinsicHeight,
      width: normalized.width * intrinsicWidth,
      height: normalized.height * intrinsicHeight,
    },
    cropPercent: {
      top: normalized.y * 100,
      right: (1 - normalized.x - normalized.width) * 100,
      bottom: (1 - normalized.y - normalized.height) * 100,
      left: normalized.x * 100,
    },
  };
}

function invalidGeometry(
  slotWidth: number,
  slotHeight: number,
  intrinsicWidth: number,
  intrinsicHeight: number,
  reason: string,
): ResolvedImagePlacementGeometryV1 {
  return coverGeometry(
    slotWidth,
    slotHeight,
    intrinsicWidth,
    intrinsicHeight,
    { x: 0.5, y: 0.5 },
    "fallback-cover",
    reason,
  );
}

function coverGeometry(
  slotWidth: number,
  slotHeight: number,
  intrinsicWidth: number,
  intrinsicHeight: number,
  focalPoint: { x: number; y: number },
  strategy: "cover" | "fallback-cover" = "cover",
  fallbackReason: string | null = null,
): ResolvedImagePlacementGeometryV1 {
  const scale = Math.max(slotWidth / intrinsicWidth, slotHeight / intrinsicHeight);
  const width = intrinsicWidth * scale;
  const height = intrinsicHeight * scale;
  const x = (slotWidth - width) * clampUnit(focalPoint.x);
  const y = (slotHeight - height) * clampUnit(focalPoint.y);
  const source = sourceGeometry(
    {
      x: Math.max(0, -x) / scale / intrinsicWidth,
      y: Math.max(0, -y) / scale / intrinsicHeight,
      width: Math.min(slotWidth, width) / scale / intrinsicWidth,
      height: Math.min(slotHeight, height) / scale / intrinsicHeight,
    },
    intrinsicWidth,
    intrinsicHeight,
  );
  return {
    schemaVersion: "resolved-image-placement-geometry-v1",
    strategy,
    slot: { x: 0, y: 0, width: slotWidth, height: slotHeight },
    intrinsic: { width: intrinsicWidth, height: intrinsicHeight },
    destinationBounds: { x, y, width, height },
    visibleSourceRect: {
      normalized: source.normalized,
      pixels: source.pixels,
    },
    visibleSourcePolygon: [
      { x: source.normalized.x, y: source.normalized.y },
      { x: source.normalized.x + source.normalized.width, y: source.normalized.y },
      { x: source.normalized.x + source.normalized.width, y: source.normalized.y + source.normalized.height },
      { x: source.normalized.x, y: source.normalized.y + source.normalized.height },
    ],
    cropPercent: source.cropPercent,
    scale: { x: scale, y: scale },
    rotationDegrees: 0,
    preservesAspectRatio: true,
    cssTransform: null,
    fallbackReason,
  };
}

export function resolveImagePlacementGeometry(
  intent: ResolvedImagePlacementIntentV1,
  slotWidth: number,
  slotHeight: number,
  intrinsicWidth: number,
  intrinsicHeight: number,
): ResolvedImagePlacementGeometryV1 | null {
  if (
    !finitePositive(slotWidth) ||
    !finitePositive(slotHeight) ||
    !finitePositive(intrinsicWidth) ||
    !finitePositive(intrinsicHeight)
  ) {
    return null;
  }

  if (
    intent.transformApplicability === "compatibility-legacy-fill-transform" &&
    intent.compatibilityCropAxis &&
    intent.compatibilityCropZoom > 1
  ) {
    const width = intent.compatibilityCropAxis === "width"
      ? slotWidth * intent.compatibilityCropZoom
      : slotHeight * intent.compatibilityCropZoom * intrinsicWidth / intrinsicHeight;
    const height = intent.compatibilityCropAxis === "height"
      ? slotHeight * intent.compatibilityCropZoom
      : slotWidth * intent.compatibilityCropZoom * intrinsicHeight / intrinsicWidth;
    const x = (slotWidth - width) * clampUnit(intent.focalPoint.x);
    const y = (slotHeight - height) * clampUnit(intent.focalPoint.y);
    const scaleX = width / intrinsicWidth;
    const scaleY = height / intrinsicHeight;
    const source = sourceGeometry(
      {
        x: Math.max(0, -x) / scaleX / intrinsicWidth,
        y: Math.max(0, -y) / scaleY / intrinsicHeight,
        width: Math.min(slotWidth, width) / scaleX / intrinsicWidth,
        height: Math.min(slotHeight, height) / scaleY / intrinsicHeight,
      },
      intrinsicWidth,
      intrinsicHeight,
    );
    return {
      schemaVersion: "resolved-image-placement-geometry-v1",
      strategy: "compatibility-legacy-fill-transform",
      slot: { x: 0, y: 0, width: slotWidth, height: slotHeight },
      intrinsic: { width: intrinsicWidth, height: intrinsicHeight },
      destinationBounds: { x, y, width, height },
      visibleSourceRect: { normalized: source.normalized, pixels: source.pixels },
      visibleSourcePolygon: [
        { x: source.normalized.x, y: source.normalized.y },
        { x: source.normalized.x + source.normalized.width, y: source.normalized.y },
        { x: source.normalized.x + source.normalized.width, y: source.normalized.y + source.normalized.height },
        { x: source.normalized.x, y: source.normalized.y + source.normalized.height },
      ],
      cropPercent: source.cropPercent,
      scale: { x: scaleX, y: scaleY },
      rotationDegrees: 0,
      preservesAspectRatio: Math.abs(scaleX - scaleY) <= Math.max(scaleX, scaleY) * 1e-4,
      cssTransform: null,
      fallbackReason: "Fixed-size FILL plus CROP-only transform remains compatibility-owned pending source-reference review.",
    };
  }

  if (intent.fitMode === "FIT") {
    const scale = Math.min(slotWidth / intrinsicWidth, slotHeight / intrinsicHeight);
    const width = intrinsicWidth * scale;
    const height = intrinsicHeight * scale;
    const x = (slotWidth - width) * clampUnit(intent.focalPoint.x);
    const y = (slotHeight - height) * clampUnit(intent.focalPoint.y);
    const source = sourceGeometry({ x: 0, y: 0, width: 1, height: 1 }, intrinsicWidth, intrinsicHeight);
    return {
      schemaVersion: "resolved-image-placement-geometry-v1",
      strategy: "contain",
      slot: { x: 0, y: 0, width: slotWidth, height: slotHeight },
      intrinsic: { width: intrinsicWidth, height: intrinsicHeight },
      destinationBounds: { x, y, width, height },
      visibleSourceRect: { normalized: source.normalized, pixels: source.pixels },
      visibleSourcePolygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      cropPercent: source.cropPercent,
      scale: { x: scale, y: scale },
      rotationDegrees: 0,
      preservesAspectRatio: true,
      cssTransform: null,
      fallbackReason: null,
    };
  }

  if (intent.fitMode === "STRETCH") {
    const source = sourceGeometry({ x: 0, y: 0, width: 1, height: 1 }, intrinsicWidth, intrinsicHeight);
    return {
      schemaVersion: "resolved-image-placement-geometry-v1",
      strategy: "stretch",
      slot: { x: 0, y: 0, width: slotWidth, height: slotHeight },
      intrinsic: { width: intrinsicWidth, height: intrinsicHeight },
      destinationBounds: { x: 0, y: 0, width: slotWidth, height: slotHeight },
      visibleSourceRect: { normalized: source.normalized, pixels: source.pixels },
      visibleSourcePolygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      cropPercent: source.cropPercent,
      scale: { x: slotWidth / intrinsicWidth, y: slotHeight / intrinsicHeight },
      rotationDegrees: 0,
      preservesAspectRatio: Math.abs(slotWidth / intrinsicWidth - slotHeight / intrinsicHeight) < EPSILON,
      cssTransform: null,
      fallbackReason: null,
    };
  }

  if (intent.fitMode === "CROP") {
    const raw = normalizedTransform(intent.activeCropTransform);
    const inverse = invertNormalizedImageTransform(intent.activeCropTransform);
    if (!raw || !inverse) {
      return invalidGeometry(slotWidth, slotHeight, intrinsicWidth, intrinsicHeight, "CROP has no invertible imageTransform.");
    }
    const [a, b, c, d, tx, ty] = raw;
    const sourcePolygon = [
      { x: tx, y: ty },
      { x: a + tx, y: b + ty },
      { x: a + c + tx, y: b + d + ty },
      { x: c + tx, y: d + ty },
    ];
    const sourceBounds = boundsOf(sourcePolygon);
    const source = sourceGeometry(sourceBounds, intrinsicWidth, intrinsicHeight);
    const [ia, ib, ic, id, ie, iff] = inverse;
    const cssTransform: [number, number, number, number, number, number] = [
      (slotWidth / intrinsicWidth) * ia,
      (slotHeight / intrinsicWidth) * ib,
      (slotWidth / intrinsicHeight) * ic,
      (slotHeight / intrinsicHeight) * id,
      slotWidth * ie,
      slotHeight * iff,
    ];
    const destinationPolygon = [
      { x: cssTransform[4], y: cssTransform[5] },
      { x: cssTransform[0] * intrinsicWidth + cssTransform[4], y: cssTransform[1] * intrinsicWidth + cssTransform[5] },
      { x: cssTransform[0] * intrinsicWidth + cssTransform[2] * intrinsicHeight + cssTransform[4], y: cssTransform[1] * intrinsicWidth + cssTransform[3] * intrinsicHeight + cssTransform[5] },
      { x: cssTransform[2] * intrinsicHeight + cssTransform[4], y: cssTransform[3] * intrinsicHeight + cssTransform[5] },
    ];
    const destinationBounds = boundsOf(destinationPolygon);
    const scaleX = Math.hypot(cssTransform[0], cssTransform[1]);
    const scaleY = Math.hypot(cssTransform[2], cssTransform[3]);
    return {
      schemaVersion: "resolved-image-placement-geometry-v1",
      strategy: "crop-transform",
      slot: { x: 0, y: 0, width: slotWidth, height: slotHeight },
      intrinsic: { width: intrinsicWidth, height: intrinsicHeight },
      destinationBounds,
      visibleSourceRect: { normalized: source.normalized, pixels: source.pixels },
      visibleSourcePolygon: sourcePolygon,
      cropPercent: source.cropPercent,
      scale: { x: scaleX, y: scaleY },
      rotationDegrees: Math.atan2(cssTransform[1], cssTransform[0]) * 180 / Math.PI,
      preservesAspectRatio: Math.abs(scaleX - scaleY) <= Math.max(scaleX, scaleY) * 1e-4,
      cssTransform,
      fallbackReason: null,
    };
  }

  if (intent.fitMode === "TILE") {
    const source = sourceGeometry({ x: 0, y: 0, width: 1, height: 1 }, intrinsicWidth, intrinsicHeight);
    return {
      schemaVersion: "resolved-image-placement-geometry-v1",
      strategy: "tile",
      slot: { x: 0, y: 0, width: slotWidth, height: slotHeight },
      intrinsic: { width: intrinsicWidth, height: intrinsicHeight },
      destinationBounds: { x: 0, y: 0, width: intrinsicWidth, height: intrinsicHeight },
      visibleSourceRect: { normalized: source.normalized, pixels: source.pixels },
      visibleSourcePolygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      cropPercent: source.cropPercent,
      scale: { x: 1, y: 1 },
      rotationDegrees: 0,
      preservesAspectRatio: true,
      cssTransform: null,
      fallbackReason: null,
    };
  }

  return coverGeometry(
    slotWidth,
    slotHeight,
    intrinsicWidth,
    intrinsicHeight,
    intent.focalPoint,
    intent.fitMode === "FILL" ? "cover" : "fallback-cover",
    intent.fitMode === "FILL" ? null : `Unsupported scale mode ${intent.fitMode}.`,
  );
}
