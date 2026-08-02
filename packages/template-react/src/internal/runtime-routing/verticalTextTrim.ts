import type { CanonicalSceneGraphV1 } from "@sleinity/template-core";
import type {
  CoreLayoutRouteV1,
  IntrinsicTextMeasurementV1,
  VerticalTextTrimMode,
} from "./types";

export function resolveVerticalTextTrimMode(
  source: string | null | undefined,
): VerticalTextTrimMode {
  const normalized = source?.trim().toUpperCase();
  if (!normalized || normalized === "NONE") return "none";
  if (normalized === "CAP_HEIGHT") return "cap-height-to-baseline";
  return "unsupported";
}

export interface CapToBaselineTextBoxInput {
  capHeightPx: number;
  lineHeightPx: number;
  renderedLineCount: number;
  verticalChromePx?: number;
}

export interface CapTrimGlyphOriginInput {
  firstLineCapTopPx: number;
  baselinePx: number;
  lineHeightPx: number;
  renderedLineCount: number;
}

export interface CapTrimGlyphOrigin {
  browserLineBoxOriginY: number;
  capTopFromBrowserOrigin: number;
  baselineFromBrowserOrigin: number;
  translationY: number;
  resolvedFirstCapTopY: number;
  resolvedFinalBaselineY: number;
}

export type TextVerticalAlignment = "TOP" | "CENTER" | "BOTTOM" | string | null | undefined;

export interface VerticalTextPaintPlacementInput {
  authoritativeTrim: boolean;
  sizingMode: string | null | undefined;
  verticalAlignment: TextVerticalAlignment;
}

export interface VerticalTextPaintPlacement {
  justifyContent: "flex-start" | "center" | "flex-end";
  alignmentMode:
    | "hug-trim-origin"
    | "fixed-trim-top"
    | "fixed-trim-center"
    | "fixed-trim-bottom"
    | "normal-top"
    | "normal-center"
    | "normal-bottom";
}

/**
 * Figma CAP_HEIGHT excludes leading above the first cap boundary and descent
 * below the final baseline. Baseline-to-baseline distance remains line-height.
 */
export function resolveCapToBaselineTextBox({
  capHeightPx,
  lineHeightPx,
  renderedLineCount,
  verticalChromePx = 0,
}: CapToBaselineTextBoxInput): number {
  const lines = Math.max(1, Math.floor(renderedLineCount));
  const capHeight = Math.max(0, capHeightPx);
  const lineHeight = Math.max(0, lineHeightPx);
  return capHeight + (lines - 1) * lineHeight + Math.max(0, verticalChromePx);
}

/**
 * Resolve the glyph layer in browser line-box coordinates. The translation is
 * derived only from the measured cap boundary; container spare space never
 * participates. After translation the first cap top is zero and the final
 * baseline is separated from it by cap height plus baseline gaps.
 */
export function resolveCapTrimGlyphOrigin({
  firstLineCapTopPx,
  baselinePx,
  lineHeightPx,
  renderedLineCount,
}: CapTrimGlyphOriginInput): CapTrimGlyphOrigin {
  const lines = Math.max(1, Math.floor(renderedLineCount));
  const capTop = Number.isFinite(firstLineCapTopPx) ? firstLineCapTopPx : 0;
  const baseline = Number.isFinite(baselinePx) ? baselinePx : capTop;
  const lineHeight = Math.max(0, Number.isFinite(lineHeightPx) ? lineHeightPx : 0);
  const translationY = -capTop;
  return {
    browserLineBoxOriginY: 0,
    capTopFromBrowserOrigin: capTop,
    baselineFromBrowserOrigin: baseline,
    translationY,
    resolvedFirstCapTopY: capTop + translationY,
    resolvedFinalBaselineY:
      baseline + (lines - 1) * lineHeight + translationY,
  };
}

export function isCapTrimGlyphPlacementValid(
  origin: CapTrimGlyphOrigin,
  semanticHeightPx: number,
  tolerancePx = 0.01,
): boolean {
  return (
    Math.abs(origin.resolvedFirstCapTopY) <= tolerancePx &&
    Math.abs(origin.resolvedFinalBaselineY - semanticHeightPx) <= tolerancePx
  );
}

/**
 * Leading trim owns the content box. Figma vertical alignment can position
 * that content box only when a larger fixed node box exists. A HUG trim box
 * has no spare vertical space and must start at its semantic origin.
 */
export function resolveVerticalTextPaintPlacement({
  authoritativeTrim,
  sizingMode,
  verticalAlignment,
}: VerticalTextPaintPlacementInput): VerticalTextPaintPlacement {
  const normalizedAlignment = verticalAlignment?.toUpperCase();
  if (authoritativeTrim && sizingMode === "HUG") {
    return { justifyContent: "flex-start", alignmentMode: "hug-trim-origin" };
  }
  const prefix = authoritativeTrim && sizingMode === "FIXED" ? "fixed-trim" : "normal";
  if (normalizedAlignment === "CENTER") {
    return { justifyContent: "center", alignmentMode: `${prefix}-center` as VerticalTextPaintPlacement["alignmentMode"] };
  }
  if (normalizedAlignment === "BOTTOM") {
    return { justifyContent: "flex-end", alignmentMode: `${prefix}-bottom` as VerticalTextPaintPlacement["alignmentMode"] };
  }
  return { justifyContent: "flex-start", alignmentMode: `${prefix}-top` as VerticalTextPaintPlacement["alignmentMode"] };
}

export function isAuthoritativeVerticalTrimMeasurement(
  measurement: IntrinsicTextMeasurementV1 | undefined,
): boolean {
  return Boolean(
    measurement &&
      measurement.verticalTrim === "cap-height-to-baseline" &&
      measurement.trimAuthority === "authoritative" &&
      (measurement.fontState === "exact" ||
        measurement.fontState === "approved-replacement"),
  );
}

/**
 * A trim metric failure cannot leave a child compatibility-owned while its
 * ancestors consume that child's height as settled input. Until an eligible
 * measurement is current, the existing compatibility renderer owns the whole
 * routed graph coherently.
 */
export function applyVerticalTrimCompatibilityRoute(
  scene: CanonicalSceneGraphV1,
  baseRoute: CoreLayoutRouteV1,
  measurements: Record<string, IntrinsicTextMeasurementV1>,
): CoreLayoutRouteV1 {
  const required = baseRoute.routedNodeIds.filter((nodeId) => {
    const node = scene.nodes[nodeId];
    return Boolean(
      node?.text &&
        resolveVerticalTextTrimMode(node.text.leadingTrim.value) ===
          "cap-height-to-baseline" &&
        (node.layout.sizing.horizontal.mode.value === "HUG" ||
          node.layout.sizing.vertical.mode.value === "HUG"),
    );
  });
  const blocked = required.filter(
    (nodeId) => !isAuthoritativeVerticalTrimMeasurement(measurements[nodeId]),
  );
  if (!blocked.length) return baseRoute;

  const reasonCodes = blocked.map((nodeId) => {
    const measurement = measurements[nodeId];
    if (!measurement) return `text-trim-measurement-pending:${nodeId}`;
    if (measurement.fontState === "fallback")
      return `text-trim-exact-font-unavailable:${nodeId}`;
    if (measurement.fontState === "unavailable")
      return `text-trim-font-unavailable:${nodeId}`;
    return `text-trim-metrics-unavailable:${nodeId}`;
  });
  const rootReasons = [...new Set(reasonCodes)].sort();
  return {
    ...baseRoute,
    nodes: Object.fromEntries(
      scene.nodeOrder.map((nodeId) => [
        nodeId,
        {
          ...baseRoute.nodes[nodeId],
          ownership: "compatibility-authoritative" as const,
          routed: false,
          boundaryRootId: nodeId === scene.rootNodeId ? nodeId : null,
          reasonCodes:
            nodeId === scene.rootNodeId
              ? [...baseRoute.nodes[nodeId].reasonCodes, ...rootReasons]
              : baseRoute.nodes[nodeId].reasonCodes,
        },
      ]),
    ),
    routedNodeIds: [],
    compatibilityNodeIds: [...scene.nodeOrder],
    fallbackBoundaries: [
      ...baseRoute.fallbackBoundaries.filter(
        (boundary) => boundary.nodeId !== scene.rootNodeId,
      ),
      { nodeId: scene.rootNodeId, reasonCodes: rootReasons },
    ].sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
  };
}
