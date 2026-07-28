import type {
  PackageColor,
  PackagePaint,
  PackageRect,
  PackageStroke,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import type {
  PrimitiveAppearanceV1,
  PrimitiveCanvasAuthorityV1,
  PrimitiveCornerGeometryV1,
  PrimitiveCornerValues,
  PrimitivePaintLayerV1,
  ResolvedOrderedNormalPaintStackV1,
  ResolvedOrderedSolidPaintV1,
  ResolvedOrderedSolidStackV1,
  PrimitiveStrokeCornerGeometryV1,
  PrimitiveStrokeLayerV1,
} from "./types";
import {
  resizeLinearGradientGeometry,
  resolveLinearGradientGeometry,
} from "./linearGradient";

function stableHash(value: unknown): string {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function clamp01(value: unknown, fallback = 1): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function isUnitNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validRgb(color: PackageColor): boolean {
  return isUnitNumber(color.r) && isUnitNumber(color.g) && isUnitNumber(color.b);
}

function cssColor(color: PackageColor, opacity = 1): string {
  const channel = (value: number) => Math.round(clamp01(value, 0) * 255);
  const alpha = clamp01(color.a) * clamp01(opacity);
  return `rgba(${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}, ${alpha})`;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function rawCorner(node: TemplateNode): number | PrimitiveCornerValues | null {
  const value =
    node.appearance.cornerRadii ??
    node.appearance.cornerRadius ??
    node.appearance.borderRadius ??
    node.shape?.cornerRadius ??
    null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value) && value.length === 4 && value.every(Number.isFinite)) {
    return [...value] as PrimitiveCornerValues;
  }
  const object = record(value);
  if (object) {
    const values = [
      object.topLeft,
      object.topRight,
      object.bottomRight,
      object.bottomLeft,
    ];
    if (values.every((entry) => typeof entry === "number" && Number.isFinite(entry))) {
      return values as PrimitiveCornerValues;
    }
  }
  return null;
}

function normalizeCornerValues(
  requestedInput: PrimitiveCornerValues,
  bounds: PackageRect,
): {
  effective: PrimitiveCornerValues;
  normalizationScale: number;
  normalizationScales: PrimitiveCornerValues;
  clampReason: PrimitiveCornerGeometryV1["clampReason"];
} {
  const requested = requestedInput.map((value) => Math.max(0, value)) as PrimitiveCornerValues;
  const [topLeft, topRight, bottomRight, bottomLeft] = requested;
  const topScale = topLeft + topRight > 0
    ? Math.max(0, Math.min(1, bounds.width / (topLeft + topRight)))
    : 1;
  const rightScale = topRight + bottomRight > 0
    ? Math.max(0, Math.min(1, bounds.height / (topRight + bottomRight)))
    : 1;
  const bottomScale = bottomLeft + bottomRight > 0
    ? Math.max(0, Math.min(1, bounds.width / (bottomLeft + bottomRight)))
    : 1;
  const leftScale = topLeft + bottomLeft > 0
    ? Math.max(0, Math.min(1, bounds.height / (topLeft + bottomLeft)))
    : 1;
  const normalizationScales = [
    Math.min(topScale, leftScale),
    Math.min(topScale, rightScale),
    Math.min(bottomScale, rightScale),
    Math.min(bottomScale, leftScale),
  ] as PrimitiveCornerValues;
  const normalizationScale = Math.min(...normalizationScales);
  const effective = requested.map(
    (value, index) => value * normalizationScales[index],
  ) as PrimitiveCornerValues;
  return {
    effective,
    normalizationScale,
    normalizationScales,
    clampReason: requestedInput.some((value) => value < 0)
      ? "negative-radius-floor"
      : normalizationScales.some((scale) => scale < 1)
        ? "opposing-radii-exceed-bounds"
        : "none",
  };
}

function corners(node: TemplateNode, bounds: PackageRect): PrimitiveCornerGeometryV1 {
  const raw = rawCorner(node);
  const requested = typeof raw === "number"
    ? [raw, raw, raw, raw] as PrimitiveCornerValues
    : raw ?? [0, 0, 0, 0];
  const uniform = requested.every((value) => value === requested[0]);
  const normalized = normalizeCornerValues(requested, bounds);
  return {
    order: ["top-left", "top-right", "bottom-right", "bottom-left"],
    raw,
    uniform,
    requested,
    effective: normalized.effective,
    css: normalized.effective.map((value) => `${value}px`).join(" "),
    clamped: normalized.effective.some((value, index) => value !== requested[index]),
    normalizationScale: normalized.normalizationScale,
    normalizationScales: normalized.normalizationScales,
    clampReason: normalized.clampReason,
  };
}

function insetBounds(bounds: PackageRect, amount: number): PackageRect {
  return {
    x: bounds.x + amount,
    y: bounds.y + amount,
    width: Math.max(0, bounds.width - amount * 2),
    height: Math.max(0, bounds.height - amount * 2),
  };
}

function addCornerOffset(
  values: PrimitiveCornerValues,
  amount: number,
): PrimitiveCornerValues {
  return values.map((value) => Math.max(0, value + amount)) as PrimitiveCornerValues;
}

function resolveStrokeGeometry(
  bounds: PackageRect,
  weight: number,
  alignment: PrimitiveStrokeLayerV1["alignment"],
  fillCorners: PrimitiveCornerValues,
): {
  centerPathBounds: PackageRect | null;
  innerStrokeBounds: PackageRect | null;
  outerStrokeBounds: PackageRect | null;
  visualStrokeBounds: PackageRect | null;
  cornerGeometry: PrimitiveStrokeCornerGeometryV1 | null;
} {
  if (!alignment || weight <= 0) {
    return {
      centerPathBounds: null,
      innerStrokeBounds: null,
      outerStrokeBounds: null,
      visualStrokeBounds: null,
      cornerGeometry: null,
    };
  }
  const innerInset = alignment === "INSIDE" ? weight : alignment === "CENTER" ? weight / 2 : 0;
  const centerInset = alignment === "INSIDE" ? weight / 2 : alignment === "CENTER" ? 0 : -weight / 2;
  const outerInset = alignment === "INSIDE" ? 0 : alignment === "CENTER" ? -weight / 2 : -weight;
  const innerStrokeBounds = insetBounds(bounds, innerInset);
  const centerPathBounds = insetBounds(bounds, centerInset);
  const outerStrokeBounds = insetBounds(bounds, outerInset);
  const innerOffset = alignment === "INSIDE" ? -weight : alignment === "CENTER" ? -weight / 2 : 0;
  const centerOffset = alignment === "INSIDE" ? -weight / 2 : alignment === "CENTER" ? 0 : weight / 2;
  const outerOffset = alignment === "INSIDE" ? 0 : alignment === "CENTER" ? weight / 2 : weight;
  const inner = normalizeCornerValues(addCornerOffset(fillCorners, innerOffset), innerStrokeBounds).effective;
  const centerLine = normalizeCornerValues(addCornerOffset(fillCorners, centerOffset), centerPathBounds).effective;
  const outer = normalizeCornerValues(addCornerOffset(fillCorners, outerOffset), outerStrokeBounds).effective;
  return {
    centerPathBounds,
    innerStrokeBounds,
    outerStrokeBounds,
    visualStrokeBounds: outerStrokeBounds,
    cornerGeometry: {
      fill: [...fillCorners],
      inner,
      centerLine,
      outer,
    },
  };
}

function paintLayer(
  paint: PackagePaint,
  sourceIndex: number,
  maskInput: boolean,
  packageId: string,
  nodeId: string,
  bounds: PackageRect,
): PrimitivePaintLayerV1 {
  const visible = paint.visible !== false;
  const opacity = clamp01(paint.opacity);
  const blendMode = paint.blendMode?.toUpperCase() ?? "NORMAL";
  const role = maskInput
    ? "mask-input"
    : !visible
      ? "hidden-preserved"
      : blendMode !== "NORMAL" && blendMode !== "PASS_THROUGH"
        ? "unsupported-compositing-input"
        : "ordinary-visible";
  const exact = visible && !maskInput && paint.type === "SOLID" &&
    blendMode === "NORMAL" && clamp01(paint.color?.a) * opacity === 1;
  const linearGradient = paint.type === "GRADIENT_LINEAR"
    ? resolveLinearGradientGeometry(paint, sourceIndex, bounds)
    : null;
  const exactGradient = visible && !maskInput &&
    linearGradient?.capability === "source-certified-linear-gradient";
  return {
    sourceIndex,
    type: paint.type,
    visible,
    opacity,
    blendMode,
    role,
    color: paint.type === "SOLID" ? cssColor(paint.color, opacity) : null,
    effectiveAlpha:
      paint.type === "SOLID" ? clamp01(paint.color.a) * opacity : null,
    capability: exact
      ? "opaque-solid"
      : exactGradient
        ? "source-certified-linear-gradient"
        : "preserved-unrouted",
    linearGradient,
    owner: exact || exactGradient ? "primitive-authoritative" : "compatibility-authoritative",
    paintRevision: `primitive-paint-v1:${stableHash({ packageId, nodeId, sourceIndex, paint })}`,
    fallbackReason: exact || exactGradient
      ? null
      : role === "mask-input"
        ? "mask-input-owned-by-mask-route"
        : linearGradient?.fallbackReason ?? (paint.type === "SOLID"
          ? "paint-outside-opaque-solid-subset"
          : "paint-outside-source-certified-subset"),
    source: structuredClone(paint),
  };
}

function resolveOrderedSolidPaint(
  paint: PackagePaint,
  sourceIndex: number,
  packageId: string,
  nodeId: string,
): { paint: ResolvedOrderedSolidPaintV1 | null; reason: string | null } {
  if (paint.type !== "SOLID") {
    return { paint: null, reason: "ordered-solid-stack-mixed-paint-types" };
  }
  const blendMode = paint.blendMode?.toUpperCase() ?? "NORMAL";
  if (blendMode !== "NORMAL") {
    return { paint: null, reason: "ordered-solid-stack-unsupported-blend-mode" };
  }
  const paintOpacity = paint.opacity ?? 1;
  if (!validRgb(paint.color) || !isUnitNumber(paint.color.a) || !isUnitNumber(paintOpacity)) {
    return { paint: null, reason: "ordered-solid-stack-invalid-paint-data" };
  }
  const provenance = paint.solidPaintSource;
  const provenanceCurrent = provenance &&
    provenance.sourceIndex === sourceIndex &&
    provenance.canonicalPath === `nodes.${nodeId}.appearance.fills.${sourceIndex}` &&
    (provenance.opacityDisposition === "raw-paint-opacity" ||
      provenance.opacityDisposition === "mirrored-compatibility-alias") &&
    provenance.conflicts.length === 0 &&
    provenance.effectiveOpacity !== null &&
    provenance.canonicalColorAlpha === paint.color.a &&
    provenance.canonicalPaintOpacity === paintOpacity &&
    Math.abs(provenance.effectiveOpacity - paint.color.a * paintOpacity) <=
      provenance.equalityTolerance;
  if (!provenanceCurrent) {
    return { paint: null, reason: "ordered-solid-stack-ambiguous-opacity-provenance" };
  }
  const visible = paint.visible !== false;
  return {
    paint: {
      sourceIndex,
      type: "SOLID",
      visible,
      visibilitySource: typeof paint.visible === "boolean" ? "explicit" : "default-visible",
      rgb: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
      canonicalColorAlpha: paint.color.a,
      paintOpacity,
      effectiveSourceAlpha: paint.color.a * paintOpacity,
      blendMode: "NORMAL",
      role: visible ? "ordinary-visible" : "hidden-preserved",
      capability: "source-certified-ordered-solid-layer",
      paintRevision: `ordered-solid-paint-v1:${stableHash({ packageId, nodeId, sourceIndex, paint })}`,
      provenance: {
        canonicalPath: provenance.canonicalPath,
        rawFigmaPath: provenance.rawFigmaPath,
        normalizationRevision: provenance.normalizationRevision,
        opacityDisposition: provenance.opacityDisposition as
          | "raw-paint-opacity"
          | "mirrored-compatibility-alias",
        serializedColorAlpha: provenance.serializedColorAlpha,
        serializedPaintOpacity: provenance.serializedPaintOpacity,
        conflicts: [...provenance.conflicts],
      },
      source: structuredClone(paint),
    },
    reason: null,
  };
}

function orderedSolidStackContract(
  node: TemplateNode,
  packageId: string,
  sourceRevision: string,
  geometryRevision: string,
  bounds: PackageRect,
  corner: PrimitiveCornerGeometryV1,
  routed: boolean,
  fallbackReasons: string[],
): ResolvedOrderedSolidStackV1 | null {
  if (
    node.appearance.fills.length < 2 ||
    node.appearance.fills.some((paint) => paint.type !== "SOLID")
  ) return null;
  const resolved = node.appearance.fills.map((paint, sourceIndex) =>
    resolveOrderedSolidPaint(paint, sourceIndex, packageId, node.id),
  );
  const orderedPaints = resolved
    .map((entry) => entry.paint)
    .filter((paint): paint is ResolvedOrderedSolidPaintV1 => paint !== null);
  const rawFigmaPaths = orderedPaints
    .map((paint) => paint.provenance.rawFigmaPath)
    .filter((path): path is string => path !== null);
  const normalizationRevisions = [...new Set(
    orderedPaints.map((paint) => paint.provenance.normalizationRevision),
  )];
  const stackInput = {
    nodeId: node.id,
    canonicalSourceRevision: sourceRevision,
    primitiveGeometryRevision: geometryRevision,
    currentBounds: bounds,
    corner: corner.effective,
    orderedPaints,
    fallbackReasons,
  };
  return {
    schemaVersion: "resolved-ordered-solid-stack-v1",
    nodeId: node.id,
    canonicalSourceRevision: sourceRevision,
    resolvedStackRevision: `ordered-solid-stack-v1:${stableHash(stackInput)}`,
    primitiveGeometryRevision: geometryRevision,
    currentBounds: { ...bounds },
    cornerGeometry: structuredClone(corner),
    orderedPaints,
    visiblePaintIndices: orderedPaints
      .filter((paint) => paint.visible)
      .map((paint) => paint.sourceIndex),
    capability: routed
      ? "source-certified-ordered-solid-stack"
      : "compatibility-ordered-solid-stack",
    runtimeOwner: routed ? "svg-ordered-solid-stack" : "compatibility",
    fallbackReasons: [...fallbackReasons],
    provenance: {
      canonicalPath: `nodes.${node.id}.appearance.fills`,
      rawFigmaPaths,
      normalizationRevisions,
    },
  };
}

function orderedNormalPaintStackContract(
  node: TemplateNode,
  packageId: string,
  sourceRevision: string,
  geometryRevision: string,
  bounds: PackageRect,
  corner: PrimitiveCornerGeometryV1,
  paintLayers: PrimitivePaintLayerV1[],
  routed: boolean,
  fallbackReasons: string[],
): ResolvedOrderedNormalPaintStackV1 | null {
  const [solidSource, gradientSource] = node.appearance.fills;
  if (
    node.appearance.fills.length !== 2 ||
    solidSource?.type !== "SOLID" ||
    gradientSource?.type !== "GRADIENT_LINEAR"
  ) return null;
  const solid = resolveOrderedSolidPaint(solidSource, 0, packageId, node.id).paint;
  const gradient = paintLayers[1]?.linearGradient ?? null;
  if (!solid || !gradient) return null;
  const orderedLayers = [
    {
      sourceIndex: 0,
      visible: solid.visible,
      blendMode: "NORMAL" as const,
      type: "SOLID" as const,
      capability: "source-certified-ordered-solid-layer" as const,
      solid,
      linearGradient: null,
      layerRevision: solid.paintRevision,
    },
    {
      sourceIndex: 1,
      visible: gradientSource.visible !== false,
      blendMode: "NORMAL" as const,
      type: "GRADIENT_LINEAR" as const,
      capability: "source-certified-linear-gradient" as const,
      solid: null,
      linearGradient: gradient,
      layerRevision: gradient.geometryRevision,
    },
  ];
  const rawFigmaPaths = [
    solid.provenance.rawFigmaPath,
    gradient.provenance.rawFigmaPath,
  ].filter((path): path is string => path !== null);
  const normalizationRevisions = [...new Set([
    solid.provenance.normalizationRevision,
    gradient.provenance.normalizationRevision,
  ].filter((revision): revision is string => revision !== null))];
  const stackInput = {
    nodeId: node.id,
    canonicalSourceRevision: sourceRevision,
    primitiveGeometryRevision: geometryRevision,
    currentBounds: bounds,
    corner: corner.effective,
    orderedLayers,
    fallbackReasons,
  };
  return {
    schemaVersion: "resolved-ordered-normal-paint-stack-v1",
    nodeId: node.id,
    canonicalSourceRevision: sourceRevision,
    resolvedStackRevision: `ordered-normal-paint-stack-v1:${stableHash(stackInput)}`,
    primitiveGeometryRevision: geometryRevision,
    currentBounds: { ...bounds },
    cornerGeometry: structuredClone(corner),
    orderedLayers,
    visiblePaintIndices: orderedLayers.filter((layer) => layer.visible).map((layer) => layer.sourceIndex),
    capability: routed
      ? "source-certified-solid-linear-normal-stack"
      : "compatibility-ordered-normal-paint-stack",
    runtimeOwner: routed ? "svg-ordered-normal-paint-stack" : "compatibility",
    fallbackReasons: [...fallbackReasons],
    provenance: {
      canonicalPath: `nodes.${node.id}.appearance.fills`,
      rawFigmaPaths,
      normalizationRevisions,
    },
  };
}

function strokePaint(stroke: PackagePaint | PackageStroke): PackagePaint {
  return "paint" in stroke ? stroke.paint : stroke;
}

function strokeLayer(
  stroke: PackagePaint | PackageStroke,
  sourceIndex: number,
  node: TemplateNode,
  packageId: string,
  bounds: PackageRect,
  corner: PrimitiveCornerGeometryV1,
): PrimitiveStrokeLayerV1 {
  const paint = strokePaint(stroke);
  const opacity = clamp01(paint.opacity);
  const rawAlignment =
    ("paint" in stroke ? stroke.align : null) ?? node.appearance.strokeAlign;
  const normalizedAlignment = rawAlignment?.toUpperCase();
  const alignment = normalizedAlignment === "INSIDE" ||
      normalizedAlignment === "CENTER" || normalizedAlignment === "OUTSIDE"
    ? normalizedAlignment
    : null;
  const rawWeight = "paint" in stroke
    ? stroke.weight
    : node.appearance.strokeWeight ?? 1;
  const weight = typeof rawWeight === "number" && Number.isFinite(rawWeight)
    ? Math.max(0, rawWeight)
    : 0;
  const effectiveAlpha = paint.type === "SOLID"
    ? clamp01(paint.color.a) * opacity
    : null;
  const exact = paint.visible !== false && paint.type === "SOLID" &&
    alignment !== null && (paint.blendMode?.toUpperCase() ?? "NORMAL") === "NORMAL" &&
    effectiveAlpha === 1 && weight > 0;
  const geometry = resolveStrokeGeometry(bounds, weight, alignment, corner.effective);
  const capability = exact
    ? alignment === "INSIDE"
      ? "rectangular-inside-opaque-solid"
      : alignment === "CENTER"
        ? "rectangular-center-opaque-solid"
        : "rectangular-outside-opaque-solid"
    : "preserved-unrouted";
  return {
    sourceIndex,
    type: paint.type,
    visible: paint.visible !== false,
    opacity,
    blendMode: paint.blendMode?.toUpperCase() ?? "NORMAL",
    color: paint.type === "SOLID" ? cssColor(paint.color, opacity) : null,
    effectiveAlpha,
    weight,
    alignment,
    capability,
    owner: exact ? "primitive-authoritative" : "compatibility-authoritative",
    strokeRevision: `primitive-stroke-v1:${stableHash({ packageId, nodeId: node.id, sourceIndex, stroke })}`,
    sourceBounds: { ...node.bounds.relative },
    sourcePathBounds: { ...bounds },
    fillBounds: { ...bounds },
    centerPathBounds: geometry.centerPathBounds,
    innerStrokeBounds: geometry.innerStrokeBounds,
    outerStrokeBounds: geometry.outerStrokeBounds,
    visualStrokeBounds: geometry.visualStrokeBounds,
    cornerGeometry: geometry.cornerGeometry,
    effectiveOuterBounds: geometry.outerStrokeBounds ?? { ...bounds },
    effectiveInnerBounds: geometry.innerStrokeBounds,
    fallbackReason: exact ? null : "stroke-outside-source-certified-solid-alignment-subset",
    source: structuredClone(stroke),
  };
}

function isAxisAligned(node: TemplateNode): boolean {
  const figma = record(node.extensions?.figma);
  const rotation = typeof figma?.rotation === "number" ? figma.rotation : 0;
  if (Math.abs(rotation) > 1e-7) return false;
  const matrix = figma?.relativeTransform;
  if (!Array.isArray(matrix) || matrix.length !== 2) return true;
  const first = matrix[0];
  const second = matrix[1];
  if (!Array.isArray(first) || !Array.isArray(second)) return false;
  const [a, c] = first;
  const [b, d] = second;
  return [a, b, c, d].every((value) => typeof value === "number" && Number.isFinite(value)) &&
    Math.abs(Number(a) - 1) < 1e-7 && Math.abs(Number(d) - 1) < 1e-7 &&
    Math.abs(Number(b)) < 1e-7 && Math.abs(Number(c)) < 1e-7;
}

function isPureRotationTransform(node: TemplateNode): boolean {
  const figma = record(node.extensions?.figma);
  const matrix = figma?.relativeTransform;
  if (!Array.isArray(matrix) || matrix.length !== 2) return false;
  const first = matrix[0];
  const second = matrix[1];
  if (!Array.isArray(first) || !Array.isArray(second)) return false;
  const [a, c] = first;
  const [b, d] = second;
  if (![a, b, c, d].every((value) => typeof value === "number" && Number.isFinite(value))) return false;
  const aa = Number(a);
  const bb = Number(b);
  const cc = Number(c);
  const dd = Number(d);
  return Math.abs(aa * aa + bb * bb - 1) < 1e-5 &&
    Math.abs(cc * cc + dd * dd - 1) < 1e-5 &&
    Math.abs(aa * cc + bb * dd) < 1e-5 &&
    Math.abs(aa * dd - bb * cc - 1) < 1e-5;
}

function rootRelativeBounds(
  packageValue: TemplatePackageV1,
  node: TemplateNode,
): PackageRect {
  let x = node.bounds.relative.x;
  let y = node.bounds.relative.y;
  let parentId = node.parentId;
  while (parentId) {
    const parent = packageValue.nodes[parentId];
    if (!parent) break;
    if (parent.id !== packageValue.rootNodeId) {
      x += parent.bounds.relative.x;
      y += parent.bounds.relative.y;
    }
    parentId = parent.parentId;
  }
  return { x, y, width: node.bounds.relative.width, height: node.bounds.relative.height };
}

export function collectPrimitiveAncestorClipChain(
  packageValue: TemplatePackageV1,
  node: TemplateNode,
): Array<{ nodeId: string; bounds: PackageRect }> {
  const result: Array<{ nodeId: string; bounds: PackageRect }> = [];
  let parentId = node.parentId;
  while (parentId) {
    const parent = packageValue.nodes[parentId];
    if (!parent) break;
    if (parent.layout.clipContent || parent.appearance.clipContent === true) {
      result.push({ nodeId: parent.id, bounds: rootRelativeBounds(packageValue, parent) });
    }
    parentId = parent.parentId;
  }
  return result;
}

export function hasPrimitiveMaskRelationship(
  packageValue: TemplatePackageV1,
  nodeId: string,
): boolean {
  return (packageValue.maskRelationships ?? []).some(
    (relationship) =>
      relationship.maskSourceId === nodeId ||
      relationship.affectedSiblingIds.includes(nodeId),
  );
}

export function resolvePrimitiveAppearance(
  node: TemplateNode,
  options: {
    packageId: string;
    rootNodeId: string;
    bounds?: PackageRect;
    maskInput?: boolean;
    hasMaskRelationship?: boolean;
    ancestorClipChain?: Array<{ nodeId: string; bounds: PackageRect }>;
  },
): PrimitiveAppearanceV1 {
  const bounds = { ...(options.bounds ?? node.bounds.relative) };
  const maskInput = options.maskInput ?? node.mask?.isMask === true;
  const corner = corners(node, bounds);
  const paintLayers = node.appearance.fills.map((paint, index) =>
    paintLayer(paint, index, maskInput, options.packageId, node.id, bounds),
  );
  const strokeLayers = node.appearance.strokes.map((stroke, index) =>
    strokeLayer(stroke, index, node, options.packageId, bounds, corner),
  );
  const figma = record(node.extensions?.figma);
  const localTransform = structuredClone(figma?.relativeTransform ?? null);
  const axisAligned = isAxisAligned(node);
  const visiblePaints = paintLayers.filter((paint) => paint.visible);
  const orderedStackCandidate = node.appearance.fills.length >= 2;
  const orderedSolidStackCandidate = orderedStackCandidate &&
    node.appearance.fills.every((paint) => paint.type === "SOLID");
  const orderedNormalPaintStackCandidate = node.appearance.fills.length === 2 &&
    node.appearance.fills[0]?.type === "SOLID" &&
    node.appearance.fills[1]?.type === "GRADIENT_LINEAR";
  const orderedSolidPaintResults = orderedSolidStackCandidate
    ? node.appearance.fills.map((paint, sourceIndex) =>
        resolveOrderedSolidPaint(paint, sourceIndex, options.packageId, node.id),
      )
    : [];
  const orderedPaintReasons = [...new Set(
    orderedSolidPaintResults
      .map((entry) => entry.reason)
      .filter((reason): reason is string => reason !== null),
  )];
  if (orderedNormalPaintStackCandidate) {
    const solidResult = resolveOrderedSolidPaint(
      node.appearance.fills[0], 0, options.packageId, node.id,
    );
    if (solidResult.reason) orderedPaintReasons.push(solidResult.reason);
    const gradient = paintLayers[1]?.linearGradient;
    if (gradient?.capability !== "source-certified-linear-gradient") {
      orderedPaintReasons.push(
        gradient?.fallbackReason ?? "ordered-normal-paint-stack-unsupported-linear-gradient",
      );
    }
    if (node.appearance.fills.some((paint) => paint.visible === false)) {
      orderedPaintReasons.push("ordered-normal-paint-stack-hidden-layer-not-certified");
    }
    if (node.appearance.fills.some(
      (paint) => (paint.blendMode?.toUpperCase() ?? "NORMAL") !== "NORMAL",
    )) orderedPaintReasons.push("ordered-normal-paint-stack-unsupported-blend-mode");
  } else if (orderedStackCandidate && !orderedSolidStackCandidate) {
    orderedPaintReasons.push("ordered-normal-paint-stack-unsupported-layer-pattern");
  }
  const routedGradient = visiblePaints.length === 1 &&
    visiblePaints[0].capability === "source-certified-linear-gradient";
  const supportedGeometryTransform = axisAligned ||
    (routedGradient && isPureRotationTransform(node));
  const kind = node.type === "FRAME"
    ? "rectangular-frame"
    : node.type === "RECTANGLE" && (!node.shape || node.shape.type === "RECTANGLE")
      ? "rectangle"
      : "unsupported";
  const fallbackReasons: string[] = [];
  const visibleStrokes = strokeLayers.filter((stroke) => stroke.visible && stroke.weight > 0);
  if (orderedStackCandidate) {
    if (kind === "unsupported" || !axisAligned) {
      fallbackReasons.push("ordered-solid-stack-unsupported-primitive-geometry");
    }
    if (maskInput || options.hasMaskRelationship) {
      fallbackReasons.push("ordered-solid-stack-mask-dependency");
    }
    if (node.appearance.opacity !== 1) {
      fallbackReasons.push("ordered-solid-stack-unsupported-node-opacity");
    }
    if (node.appearance.blendMode && !["NORMAL", "PASS_THROUGH"].includes(node.appearance.blendMode.toUpperCase())) {
      fallbackReasons.push("ordered-solid-stack-unsupported-compositing-dependency");
    }
    if (node.appearance.effects.some((effect) => effect.visible !== false)) {
      fallbackReasons.push("ordered-solid-stack-effect-dependency");
    }
    if (node.image || node.vector) {
      fallbackReasons.push("ordered-solid-stack-unsupported-geometry-owner");
    }
    if (node.appearance.strokes.length > 0) {
      fallbackReasons.push("ordered-solid-stack-stroke-dependency");
    }
    fallbackReasons.push(...orderedPaintReasons);
  } else {
    if (kind === "unsupported") fallbackReasons.push("unsupported-primitive-kind");
    if (!supportedGeometryTransform) fallbackReasons.push("non-axis-aligned-geometry");
    if (maskInput) fallbackReasons.push("mask-input-owned-by-mask-route");
    if (node.appearance.opacity !== 1) fallbackReasons.push("node-opacity-not-source-certified");
    if (node.appearance.blendMode && !["NORMAL", "PASS_THROUGH"].includes(node.appearance.blendMode.toUpperCase())) {
      fallbackReasons.push("node-blend-mode-unsupported");
    }
    if (node.appearance.effects.some((effect) => effect.visible !== false)) {
      fallbackReasons.push("effect-stack-owned-by-compatibility");
    }
    if (node.image || node.vector) fallbackReasons.push("media-or-vector-visual-owner");
    if (paintLayers.some((paint) => !paint.visible)) fallbackReasons.push("hidden-paint-runtime-not-implemented");
    if (visiblePaints.length > 1) fallbackReasons.push("multiple-visible-paints-runtime-not-implemented");
    if (visiblePaints.some((paint) =>
      paint.blendMode !== "NORMAL" ||
      (paint.capability !== "opaque-solid" && paint.capability !== "source-certified-linear-gradient")
    )) fallbackReasons.push(
      visiblePaints.find((paint) => paint.linearGradient?.fallbackReason)?.linearGradient?.fallbackReason ??
      (visiblePaints.some((paint) => paint.type === "SOLID")
        ? "paint-outside-opaque-solid-subset"
        : "paint-outside-source-certified-subset"),
    );
    if (routedGradient && visibleStrokes.length > 0) {
      fallbackReasons.push("linear-gradient-with-stroke-unsupported");
    }
    if (visibleStrokes.length > 1) fallbackReasons.push("multiple-visible-strokes-not-source-certified");
    if (visibleStrokes.some((stroke) =>
      stroke.type !== "SOLID" || stroke.alignment === null ||
      stroke.blendMode !== "NORMAL" || stroke.effectiveAlpha !== 1
    )) fallbackReasons.push("stroke-outside-source-certified-solid-alignment-subset");
  }
  if (figma?.strokeDashes && Array.isArray(figma.strokeDashes) && figma.strokeDashes.length > 0) {
    fallbackReasons.push("stroke-dashes-unsupported");
  }
  if (figma?.strokesIncludedInLayout === true && visibleStrokes.length > 0) {
    fallbackReasons.push("stroke-included-in-layout-not-source-certified");
  }
  if (
    (node.layout.clipContent || node.appearance.clipContent === true) &&
    visibleStrokes.some((stroke) => stroke.alignment === "CENTER" || stroke.alignment === "OUTSIDE")
  ) {
    fallbackReasons.push("self-clipping-expanded-stroke-not-source-certified");
  }
  if (figma?.strokeCap && figma.strokeCap !== "NONE") fallbackReasons.push("stroke-cap-unsupported");
  if (figma?.strokeJoin && !["MITER", "NONE"].includes(String(figma.strokeJoin))) {
    fallbackReasons.push("stroke-join-unsupported");
  }
  const uniqueFallbackReasons = [...new Set(fallbackReasons)];
  const routed = uniqueFallbackReasons.length === 0;
  const routedOrderedSolidStack = routed && orderedSolidStackCandidate;
  const routedOrderedNormalPaintStack = routed && orderedNormalPaintStackCandidate;
  const sourceInput = {
    packageId: options.packageId,
    nodeId: node.id,
    nodeType: node.type,
    rootNodeId: options.rootNodeId,
    appearance: node.appearance,
    shape: node.shape ?? null,
    image: node.image ?? null,
    vector: node.vector ?? null,
    mask: node.mask ?? null,
    hasMaskRelationship: options.hasMaskRelationship ?? false,
    transform: figma?.relativeTransform ?? null,
    rotation: figma?.rotation ?? null,
  };
  const sourceRevision = `primitive-source-v1:${stableHash(sourceInput)}`;
  const geometryRevision = `primitive-geometry-v1:${stableHash({
    sourceRevision,
    bounds,
    corner: corner.effective,
    ancestorClipChain: options.ancestorClipChain ?? [],
    strokeGeometry: strokeLayers.map((stroke) => ({
      alignment: stroke.alignment,
      centerPathBounds: stroke.centerPathBounds,
      innerStrokeBounds: stroke.innerStrokeBounds,
      outerStrokeBounds: stroke.outerStrokeBounds,
      cornerGeometry: stroke.cornerGeometry,
    })),
    gradientGeometry: paintLayers.map((paint) => paint.linearGradient?.geometryRevision ?? null),
  })}`;
  const orderedSolidStack = orderedSolidStackContract(
    node,
    options.packageId,
    sourceRevision,
    geometryRevision,
    bounds,
    corner,
    routedOrderedSolidStack,
    uniqueFallbackReasons,
  );
  const orderedNormalPaintStack = orderedNormalPaintStackContract(
    node,
    options.packageId,
    sourceRevision,
    geometryRevision,
    bounds,
    corner,
    paintLayers,
    routedOrderedNormalPaintStack,
    uniqueFallbackReasons,
  );
  return {
    schemaVersion: "primitive-appearance-v1",
    nodeId: node.id,
    nodeType: node.type,
    bounds,
    geometry: {
      kind,
      axisAligned,
      corner,
      sourceBounds: { ...node.bounds.relative },
      settledBounds: { ...bounds },
      localTransform,
      effectiveTransform: localTransform,
      clippingBounds: node.layout.clipContent || node.appearance.clipContent === true
        ? { ...bounds }
        : null,
      ancestorClipChain: structuredClone(options.ancestorClipChain ?? []),
      capability: routed
        ? !axisAligned && routedGradient
          ? "rotated-source-certified-linear-gradient"
          : corner.uniform ? "axis-aligned-rectangular" : "axis-aligned-independent-corners"
        : "compatibility",
    },
    paints: {
      orderIsAuthoritative: true,
      orderConvention: "source-array-order",
      layers: paintLayers.map((layer) => ({
        ...layer,
        capability: (routedOrderedSolidStack || routedOrderedNormalPaintStack) && layer.type === "SOLID"
          ? "source-certified-ordered-solid-layer" as const
          : layer.capability,
        owner: routed && (routedOrderedSolidStack || routedOrderedNormalPaintStack || layer.capability === "opaque-solid" || layer.capability === "source-certified-linear-gradient")
          ? "primitive-authoritative"
          : "compatibility-authoritative",
        fallbackReason: routed && (routedOrderedSolidStack || routedOrderedNormalPaintStack || layer.capability === "opaque-solid" || layer.capability === "source-certified-linear-gradient")
          ? null
          : layer.fallbackReason ?? uniqueFallbackReasons[0] ?? "primitive-boundary-compatibility",
      })),
      routedLayerIndex: routed && !routedOrderedSolidStack && visiblePaints.length === 1
        ? visiblePaints[0].sourceIndex
        : null,
      orderedSolidStack,
      orderedNormalPaintStack,
      renderStrategy: routedOrderedSolidStack
        ? "svg-ordered-solid-stack"
        : routedOrderedNormalPaintStack
          ? "svg-ordered-normal-paint-stack"
        : routedGradient && routed
          ? "svg-linear-gradient"
          : routed && visiblePaints.length === 1
            ? "dom-css-single-solid"
            : routed
              ? "none"
              : "compatibility",
    },
    strokes: {
      orderIsAuthoritative: true,
      orderConvention: "source-array-order",
      layers: strokeLayers.map((layer) => ({
        ...layer,
        owner: routed && layer.capability !== "preserved-unrouted"
          ? "primitive-authoritative"
          : "compatibility-authoritative",
        fallbackReason: routed && layer.capability !== "preserved-unrouted"
          ? null
          : layer.fallbackReason ?? uniqueFallbackReasons[0] ?? "primitive-boundary-compatibility",
      })),
      routedLayerIndex: routed && visibleStrokes.length === 1
        ? visibleStrokes[0].sourceIndex
        : null,
      renderStrategy: routed
        ? visibleStrokes.length === 1
          ? visibleStrokes[0].alignment === "INSIDE"
            ? corner.uniform
              ? "css-inset-shadow"
              : "svg-inside-stroke"
            : visibleStrokes[0].alignment === "CENTER"
              ? "svg-center-stroke"
              : "svg-outside-stroke"
          : routedGradient
            ? "svg-linear-gradient"
            : "none"
        : "compatibility",
    },
    opacity: {
      node: clamp01(node.appearance.opacity),
      compositing: node.appearance.opacity === 1
        ? "opaque-source-certified"
        : "compatibility",
    },
    ownership: routed ? "primitive-authoritative" : "compatibility-authoritative",
    backend: routed
      ? routedOrderedSolidStack || routedOrderedNormalPaintStack || routedGradient || visibleStrokes.some((stroke) =>
          stroke.alignment === "CENTER" || stroke.alignment === "OUTSIDE" ||
          (stroke.alignment === "INSIDE" && !corner.uniform)
        )
        ? "svg"
        : "dom-css"
      : "compatibility",
    fallbackReasons: uniqueFallbackReasons,
    sourceRevision,
    geometryRevision,
    provenance: {
      packageId: options.packageId,
      sourcePaths: [
        `nodes.${node.id}.bounds`,
        `nodes.${node.id}.appearance.fills`,
        `nodes.${node.id}.appearance.strokes`,
        `nodes.${node.id}.appearance.cornerRadius`,
        `nodes.${node.id}.appearance.cornerRadii`,
      ],
      rawFigmaKeys: Object.keys(figma ?? {}).sort(),
    },
  };
}

export function resizePrimitiveAppearance(
  source: PrimitiveAppearanceV1,
  bounds: PackageRect,
): PrimitiveAppearanceV1 {
  const normalized = normalizeCornerValues(source.geometry.corner.requested, bounds);
  const effective = normalized.effective;
  const corner = {
    ...source.geometry.corner,
    effective,
    css: effective.map((value) => `${value}px`).join(" "),
    clamped: effective.some((value, index) => value !== source.geometry.corner.requested[index]),
    normalizationScale: normalized.normalizationScale,
    normalizationScales: normalized.normalizationScales,
    clampReason: normalized.clampReason,
  };
  const strokeLayers = source.strokes.layers.map((stroke) => {
    const geometry = resolveStrokeGeometry(bounds, stroke.weight, stroke.alignment, effective);
    return {
      ...stroke,
      sourcePathBounds: { ...bounds },
      fillBounds: { ...bounds },
      centerPathBounds: geometry.centerPathBounds,
      innerStrokeBounds: geometry.innerStrokeBounds,
      outerStrokeBounds: geometry.outerStrokeBounds,
      visualStrokeBounds: geometry.visualStrokeBounds,
      cornerGeometry: geometry.cornerGeometry,
      effectiveOuterBounds: geometry.outerStrokeBounds ?? { ...bounds },
      effectiveInnerBounds: geometry.innerStrokeBounds,
    };
  });
  const paintLayers = source.paints.layers.map((paint) => ({
    ...paint,
    linearGradient: paint.linearGradient && paint.source.type === "GRADIENT_LINEAR"
      ? resizeLinearGradientGeometry(paint.linearGradient, paint.source, bounds)
      : paint.linearGradient,
  }));
  const geometryRevision = `primitive-geometry-v1:${stableHash({
    sourceRevision: source.sourceRevision,
    bounds,
    corner: effective,
    ancestorClipChain: source.geometry.ancestorClipChain,
    strokeGeometry: strokeLayers.map((stroke) => ({
      alignment: stroke.alignment,
      centerPathBounds: stroke.centerPathBounds,
      innerStrokeBounds: stroke.innerStrokeBounds,
      outerStrokeBounds: stroke.outerStrokeBounds,
      cornerGeometry: stroke.cornerGeometry,
    })),
    gradientGeometry: paintLayers.map((paint) => paint.linearGradient?.geometryRevision ?? null),
  })}`;
  const orderedSolidStack = source.paints.orderedSolidStack
    ? {
        ...source.paints.orderedSolidStack,
        primitiveGeometryRevision: geometryRevision,
        currentBounds: { ...bounds },
        cornerGeometry: structuredClone(corner),
        resolvedStackRevision: `ordered-solid-stack-v1:${stableHash({
          nodeId: source.paints.orderedSolidStack.nodeId,
          canonicalSourceRevision: source.paints.orderedSolidStack.canonicalSourceRevision,
          primitiveGeometryRevision: geometryRevision,
          currentBounds: bounds,
          corner: corner.effective,
          orderedPaints: source.paints.orderedSolidStack.orderedPaints,
          fallbackReasons: source.paints.orderedSolidStack.fallbackReasons,
        })}`,
      }
    : null;
  const orderedNormalPaintStack = source.paints.orderedNormalPaintStack
    ? (() => {
        const orderedLayers = source.paints.orderedNormalPaintStack.orderedLayers.map((layer) => {
          const resizedGradient = layer.linearGradient && layer.type === "GRADIENT_LINEAR"
            ? paintLayers.find((paint) => paint.sourceIndex === layer.sourceIndex)?.linearGradient ?? null
            : layer.linearGradient;
          return {
            ...layer,
            linearGradient: resizedGradient,
            layerRevision: resizedGradient?.geometryRevision ?? layer.layerRevision,
          };
        });
        return {
          ...source.paints.orderedNormalPaintStack,
          primitiveGeometryRevision: geometryRevision,
          currentBounds: { ...bounds },
          cornerGeometry: structuredClone(corner),
          orderedLayers,
          resolvedStackRevision: `ordered-normal-paint-stack-v1:${stableHash({
            nodeId: source.paints.orderedNormalPaintStack.nodeId,
            canonicalSourceRevision: source.paints.orderedNormalPaintStack.canonicalSourceRevision,
            primitiveGeometryRevision: geometryRevision,
            currentBounds: bounds,
            corner: corner.effective,
            orderedLayers,
            fallbackReasons: source.paints.orderedNormalPaintStack.fallbackReasons,
          })}`,
        };
      })()
    : null;
  return {
    ...source,
    bounds: { ...bounds },
    geometry: {
      ...source.geometry,
      corner,
      settledBounds: { ...bounds },
      clippingBounds: source.geometry.clippingBounds ? { ...bounds } : null,
    },
    paints: {
      ...source.paints,
      layers: paintLayers,
      orderedSolidStack,
      orderedNormalPaintStack,
    },
    strokes: { ...source.strokes, layers: strokeLayers },
    geometryRevision,
  };
}

export function resolvePrimitiveCanvasAuthority(
  packageValue: TemplatePackageV1,
): PrimitiveCanvasAuthorityV1 {
  const background = packageValue.canvas.background;
  const cssBackground = typeof background === "string"
    ? background
    : background
      ? cssColor(background)
      : "transparent";
  return {
    schemaVersion: "primitive-canvas-authority-v1",
    cssBackground,
    sourceKind: typeof background === "string"
      ? "css-string"
      : background
        ? "color"
        : "transparent-fallback",
    ownership: "canonical-canvas-authoritative",
    revision: `primitive-canvas-v1:${stableHash({ packageId: packageValue.packageId, background })}`,
  };
}

export function primitiveTreeRevision(packageValue: TemplatePackageV1): string {
  const nodeRevisions = Object.values(packageValue.nodes).map((node) =>
    resolvePrimitiveAppearance(node, {
      packageId: packageValue.packageId,
      rootNodeId: packageValue.rootNodeId,
      hasMaskRelationship: hasPrimitiveMaskRelationship(packageValue, node.id),
      ancestorClipChain: collectPrimitiveAncestorClipChain(packageValue, node),
    }).sourceRevision,
  );
  return `primitive-tree-v1:${stableHash({
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
    canvas: resolvePrimitiveCanvasAuthority(packageValue).revision,
    nodeRevisions,
  })}`;
}
