import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  PackageAxisSizing,
  PackageLayoutMode,
  PackagePaint,
  PackageRect,
  TemplateNode,
  TemplatePackageV1,
} from "@sleinity/template-core";
import { resolvePackageAssetReference } from "@sleinity/template-core/renderer-internal";
import {
  backendDecisionOwns,
  createResolvedRenderTree,
  resolveImagePlacementGeometry,
  type ResolvedImagePlacementGeometryV1,
  type ResolvedRenderNode,
  type ResolvedRenderTreeV1,
} from "@sleinity/template-core";
import {
  canvasBackgroundToCss,
  getFirstVisibleSolidPaint,
  normalizedColorToCss,
  resolvePackageAxisLimits,
  resolvePackageAssetSource,
  resolvePackageLayoutGaps,
} from "./packageRenderUtils";
import { resolvePackageVectorRenderModel } from "./packageVectorRender";
import { resolvePackageStrokeModel } from "./packageStrokeLayout";
import { resolvePackageTextStyle } from "./packageTextLayout";
import {
  applyPackageTransformStyle,
  resolvePackageTransform,
  resolveTransformedConstraintStyle,
} from "./packageTransformLayout";
import {
  evaluatePackageMotion,
  getPackageMotionFinalFrameTimeMs,
  packageMotionTransformToCss,
  type PackageMotionNodeTransform,
} from "@sleinity/template-core/renderer-internal";
import {
  isEditorLiveResizableConstraintContainer,
  resolvePackageAbsoluteConstraints,
} from "./packageConstraintLayout";
import { resolvePackageClipping } from "./packageClipping";
import { resolvePackageMaskRelationships } from "@sleinity/template-core/renderer-internal";
import {
  collectPrimitiveAncestorClipChain,
  hasPrimitiveMaskRelationship,
  primitiveTreeRevision,
  resizePrimitiveAppearance,
  resolvePrimitiveAppearance,
  resolvePrimitiveCanvasAuthority,
  type PrimitiveAppearanceV1,
  type PrimitiveCornerValues,
} from "@sleinity/template-core/renderer-internal";
import { resolvePackageNodeLayoutRole } from "./packageLayoutModel";
import { runtimeFontFaceSignature } from "@sleinity/template-browser";
import {
  resolveCapToBaselineTextBox,
  resolveCapTrimGlyphOrigin,
  resolveVerticalTextPaintPlacement,
  resolveVerticalTextTrimMode,
  useCoreLayoutRuntime,
  type CoreLayoutRuntimeState,
  type IntrinsicTextMeasurementV1,
} from "../internal/runtime-routing";
import {
  createResolvedProductRenderIdentity,
  type ResolvedProductRenderIdentityV1,
} from "./productRenderIdentity";

interface TemplatePackageRendererProps {
  packageValue: TemplatePackageV1;
  mode?: TemplatePackageRenderMode;
  resolvedTree?: ResolvedRenderTreeV1 | null;
  debugOverlay?: boolean;
  highlightNodeId?: string | null;
  highlightNodeIds?: string[];
  motionTimeMs?: number;
  motionRenderMode?: TemplatePackageMotionRenderMode;
  onAssetLoadError?: (assetId: string, nodeId: string) => void;
  onRenderIdentity?: (identity: ResolvedProductRenderIdentityV1) => void;
}

export type TemplatePackageRenderMode = "static" | "editor";
export type TemplatePackageMotionRenderMode =
  | "playback"
  | "final-frame"
  | "disabled";

interface PackageNodeRendererProps {
  node: TemplateNode;
  packageValue: TemplatePackageV1;
  parentLayoutMode: PackageLayoutMode;
  mode?: TemplatePackageRenderMode;
  isRoot?: boolean;
  parentConstraintBounds?: PackageRect;
  resolvedTree?: ResolvedRenderTreeV1 | null;
  resolvedNode?: ResolvedRenderNode;
  debugOverlay?: boolean;
  highlightNodeId?: string | null;
  highlightNodeIds?: string[];
  motionTransforms?: Record<string, PackageMotionNodeTransform>;
  runtime?: CoreLayoutRuntimeState;
}

const justifyMap: Record<string, CSSProperties["justifyContent"]> = {
  MIN: "flex-start",
  CENTER: "center",
  MAX: "flex-end",
  SPACE_BETWEEN: "space-between",
};

const alignMap: Record<string, CSSProperties["alignItems"]> = {
  MIN: "flex-start",
  CENTER: "center",
  MAX: "flex-end",
  STRETCH: "stretch",
  BASELINE: "baseline",
};

function axisSize(
  axis: PackageAxisSizing,
  fallback: number,
  options: {
    isText: boolean;
    isParentFlex: boolean;
    isMainAxis: boolean;
    mode: TemplatePackageRenderMode;
    useSnapshotHugFallback: boolean;
  },
): CSSProperties["width"] {
  if (axis.mode === "FIXED") return axis.value ?? fallback;
  if (axis.mode === "HUG") {
    if (options.useSnapshotHugFallback) return fallback;
    return options.mode === "editor" || options.isText
      ? "fit-content"
      : fallback;
  }
  if (!options.isParentFlex) return fallback;
  return options.isMainAxis ? undefined : "100%";
}

function borderRadiusValue(node: TemplateNode): CSSProperties["borderRadius"] {
  const { cornerRadius, cornerRadii, borderRadius } = node.appearance;
  if (typeof cornerRadius === "number") return cornerRadius;
  if (Array.isArray(cornerRadii)) {
    return cornerRadii.map((value) => `${value}px`).join(" ");
  }
  if (cornerRadii && typeof cornerRadii === "object") {
    return `${cornerRadii.topLeft}px ${cornerRadii.topRight}px ${cornerRadii.bottomRight}px ${cornerRadii.bottomLeft}px`;
  }
  if (typeof borderRadius === "number") return borderRadius;
  if (borderRadius && typeof borderRadius === "object") {
    return `${borderRadius.topLeft}px ${borderRadius.topRight}px ${borderRadius.bottomRight}px ${borderRadius.bottomLeft}px`;
  }
  return undefined;
}

function localPrimitiveBounds(
  bounds: PackageRect,
  origin: PackageRect,
): PackageRect {
  return {
    x: bounds.x - origin.x,
    y: bounds.y - origin.y,
    width: bounds.width,
    height: bounds.height,
  };
}

function roundedRectanglePath(
  bounds: PackageRect,
  corners: PrimitiveCornerValues,
): string {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const left = bounds.x;
  const top = bounds.y;
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  const arc = (
    radius: number,
    x: number,
    y: number,
  ) => radius > 0 ? `A ${radius} ${radius} 0 0 1 ${x} ${y}` : `L ${x} ${y}`;
  return [
    `M ${left + topLeft} ${top}`,
    `H ${right - topRight}`,
    arc(topRight, right, top + topRight),
    `V ${bottom - bottomRight}`,
    arc(bottomRight, right - bottomRight, bottom),
    `H ${left + bottomLeft}`,
    arc(bottomLeft, left, bottom - bottomLeft),
    `V ${top + topLeft}`,
    arc(topLeft, left + topLeft, top),
    "Z",
  ].join(" ");
}

function renderPrimitiveSvgAppearance(
  appearance: PrimitiveAppearanceV1,
  idPrefix: string,
): ReactNode {
  if (appearance.backend !== "svg") return null;
  const fill = appearance.paints.routedLayerIndex === null
    ? null
    : appearance.paints.layers.find(
        (layer) => layer.sourceIndex === appearance.paints.routedLayerIndex,
      ) ?? null;
  const stroke = appearance.strokes.routedLayerIndex === null
    ? null
    : appearance.strokes.layers.find(
        (layer) => layer.sourceIndex === appearance.strokes.routedLayerIndex,
      ) ?? null;
  const linearGradient = fill?.linearGradient?.capability === "source-certified-linear-gradient"
    ? fill.linearGradient
    : null;
  const orderedSolidStack = appearance.paints.orderedSolidStack?.capability ===
    "source-certified-ordered-solid-stack"
    ? appearance.paints.orderedSolidStack
    : null;
  const orderedNormalPaintStack = appearance.paints.orderedNormalPaintStack?.capability ===
    "source-certified-solid-linear-normal-stack"
    ? appearance.paints.orderedNormalPaintStack
    : null;
  if (!fill && !orderedSolidStack && !orderedNormalPaintStack && (!stroke?.centerPathBounds || !stroke.cornerGeometry || !stroke.color)) return null;
  const origin = appearance.geometry.settledBounds;
  const fillBounds = localPrimitiveBounds(stroke?.fillBounds ?? origin, origin);
  const centerPathBounds = stroke?.centerPathBounds
    ? localPrimitiveBounds(stroke.centerPathBounds, origin)
    : null;
  const gradientId = linearGradient
    ? `${idPrefix}-gradient-${linearGradient.sourceRevision.replace(/[^a-zA-Z0-9_-]/g, "-")}`
    : null;
  const svgMatrix = linearGradient?.svgGradientTransform;
  const gradientTransform = svgMatrix
    ? `matrix(${svgMatrix[0][0]} ${svgMatrix[1][0]} ${svgMatrix[0][1]} ${svgMatrix[1][1]} ${svgMatrix[0][2]} ${svgMatrix[1][2]})`
    : undefined;
  const orderedSolidClipId = orderedSolidStack
    ? `${idPrefix}-ordered-solid-clip-${orderedSolidStack.resolvedStackRevision.replace(/[^a-zA-Z0-9_-]/g, "-")}`
    : null;
  const orderedNormalClipId = orderedNormalPaintStack
    ? `${idPrefix}-ordered-normal-clip-${orderedNormalPaintStack.resolvedStackRevision.replace(/[^a-zA-Z0-9_-]/g, "-")}`
    : null;
  const orderedNormalGradientLayer = orderedNormalPaintStack?.orderedLayers.find(
    (layer) => layer.type === "GRADIENT_LINEAR",
  ) ?? null;
  const orderedNormalGradient = orderedNormalGradientLayer?.linearGradient ?? null;
  const orderedNormalGradientId = orderedNormalGradient
    ? `${idPrefix}-ordered-normal-gradient-${orderedNormalGradient.sourceRevision.replace(/[^a-zA-Z0-9_-]/g, "-")}`
    : null;
  const orderedNormalSvgMatrix = orderedNormalGradient?.svgGradientTransform;
  const orderedNormalGradientTransform = orderedNormalSvgMatrix
    ? `matrix(${orderedNormalSvgMatrix[0][0]} ${orderedNormalSvgMatrix[1][0]} ${orderedNormalSvgMatrix[0][1]} ${orderedNormalSvgMatrix[1][1]} ${orderedNormalSvgMatrix[0][2]} ${orderedNormalSvgMatrix[1][2]})`
    : undefined;
  const rgb = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255);
  return (
    <svg
      aria-hidden="true"
      data-package-primitive-svg={orderedSolidStack || orderedNormalPaintStack
        ? appearance.paints.renderStrategy
        : appearance.strokes.renderStrategy}
      width="100%"
      height="100%"
      viewBox={`0 0 ${origin.width} ${origin.height}`}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      {(linearGradient && gradientId) || (orderedSolidStack && orderedSolidClipId) ||
        (orderedNormalPaintStack && orderedNormalClipId && orderedNormalGradientId) ? (
        <defs>
          {linearGradient && gradientId ? (
            <linearGradient
              id={gradientId}
              data-package-linear-gradient-definition={linearGradient.geometryRevision}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0.5}
              x2={1}
              y2={0.5}
              gradientTransform={gradientTransform}
              colorInterpolation="sRGB"
            >
              {linearGradient.stops.map((stop) => (
                <stop
                  key={`${stop.sourceIndex}:${stop.position}`}
                  data-package-linear-gradient-stop-index={stop.sourceIndex}
                  offset={stop.position}
                  stopColor={`rgb(${rgb(stop.color.r)}, ${rgb(stop.color.g)}, ${rgb(stop.color.b)})`}
                  stopOpacity={stop.color.a * linearGradient.paintOpacity}
                />
              ))}
            </linearGradient>
          ) : null}
          {orderedSolidStack && orderedSolidClipId ? (
            <clipPath
              id={orderedSolidClipId}
              data-package-ordered-solid-clip={orderedSolidStack.primitiveGeometryRevision}
              clipPathUnits="userSpaceOnUse"
            >
              <path
                data-package-ordered-solid-geometry-path="true"
                d={roundedRectanglePath(fillBounds, orderedSolidStack.cornerGeometry.effective)}
              />
            </clipPath>
          ) : null}
          {orderedNormalGradient && orderedNormalGradientId ? (
            <linearGradient
              id={orderedNormalGradientId}
              data-package-ordered-normal-gradient-definition={orderedNormalGradient.geometryRevision}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0.5}
              x2={1}
              y2={0.5}
              gradientTransform={orderedNormalGradientTransform}
              colorInterpolation="sRGB"
            >
              {orderedNormalGradient.stops.map((stop) => (
                <stop
                  key={`${stop.sourceIndex}:${stop.position}`}
                  data-package-ordered-normal-gradient-stop-index={stop.sourceIndex}
                  offset={stop.position}
                  stopColor={`rgb(${rgb(stop.color.r)}, ${rgb(stop.color.g)}, ${rgb(stop.color.b)})`}
                  stopOpacity={stop.color.a * orderedNormalGradient.paintOpacity}
                />
              ))}
            </linearGradient>
          ) : null}
          {orderedNormalPaintStack && orderedNormalClipId ? (
            <clipPath
              id={orderedNormalClipId}
              data-package-ordered-normal-paint-clip={orderedNormalPaintStack.primitiveGeometryRevision}
              clipPathUnits="userSpaceOnUse"
            >
              <path
                data-package-ordered-normal-paint-geometry-path="true"
                d={roundedRectanglePath(fillBounds, orderedNormalPaintStack.cornerGeometry.effective)}
              />
            </clipPath>
          ) : null}
        </defs>
      ) : null}
      {orderedNormalPaintStack && orderedNormalClipId && orderedNormalGradientId ? (
        <g
          data-package-ordered-normal-paint-stack={orderedNormalPaintStack.resolvedStackRevision}
          data-package-ordered-normal-visible-order={orderedNormalPaintStack.visiblePaintIndices.join(",")}
          clipPath={`url(#${orderedNormalClipId})`}
        >
          {orderedNormalPaintStack.orderedLayers
            .filter((layer) => layer.visible)
            .map((layer) => layer.type === "SOLID" && layer.solid ? (
              <rect
                key={layer.layerRevision}
                data-package-ordered-normal-paint-layer={layer.sourceIndex}
                data-package-ordered-normal-paint-type={layer.type}
                data-package-ordered-normal-paint-revision={layer.layerRevision}
                x={fillBounds.x}
                y={fillBounds.y}
                width={fillBounds.width}
                height={fillBounds.height}
                fill={`rgb(${rgb(layer.solid.rgb.r)}, ${rgb(layer.solid.rgb.g)}, ${rgb(layer.solid.rgb.b)})`}
                fillOpacity={layer.solid.effectiveSourceAlpha}
              />
            ) : layer.type === "GRADIENT_LINEAR" ? (
              <rect
                key={layer.layerRevision}
                data-package-ordered-normal-paint-layer={layer.sourceIndex}
                data-package-ordered-normal-paint-type={layer.type}
                data-package-ordered-normal-paint-revision={layer.layerRevision}
                x={fillBounds.x}
                y={fillBounds.y}
                width={fillBounds.width}
                height={fillBounds.height}
                fill={`url(#${orderedNormalGradientId})`}
              />
            ) : null)}
        </g>
      ) : orderedSolidStack && orderedSolidClipId ? (
        <g
          data-package-ordered-solid-stack={orderedSolidStack.resolvedStackRevision}
          data-package-ordered-solid-visible-order={orderedSolidStack.visiblePaintIndices.join(",")}
          clipPath={`url(#${orderedSolidClipId})`}
        >
          {orderedSolidStack.orderedPaints
            .filter((paint) => paint.visible)
            .map((paint) => (
              <rect
                key={paint.paintRevision}
                data-package-ordered-solid-layer={paint.sourceIndex}
                data-package-ordered-solid-paint-revision={paint.paintRevision}
                x={fillBounds.x}
                y={fillBounds.y}
                width={fillBounds.width}
                height={fillBounds.height}
                fill={`rgb(${rgb(paint.rgb.r)}, ${rgb(paint.rgb.g)}, ${rgb(paint.rgb.b)})`}
                fillOpacity={paint.effectiveSourceAlpha}
              />
            ))}
        </g>
      ) : (
        <path
          data-package-primitive-svg-fill="true"
          data-package-primitive-svg-gradient-fill={linearGradient?.geometryRevision}
          d={roundedRectanglePath(fillBounds, appearance.geometry.corner.effective)}
          fill={gradientId ? `url(#${gradientId})` : fill?.color ?? "none"}
        />
      )}
      {stroke?.cornerGeometry && stroke.color && centerPathBounds ? (
        <path
          data-package-primitive-svg-stroke={stroke.alignment ?? undefined}
          d={roundedRectanglePath(centerPathBounds, stroke.cornerGeometry.centerLine)}
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.weight}
        />
      ) : null}
    </svg>
  );
}

function buildNodeStyle(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
  parentLayoutMode: PackageLayoutMode,
  isRoot: boolean,
  renderMode: TemplatePackageRenderMode,
  parentConstraintBounds?: PackageRect,
  resolvedNode?: ResolvedRenderNode,
  motionTransform?: PackageMotionNodeTransform,
): CSSProperties {
  const bounds = resolvedNode?.bounds.relative ?? node.bounds.relative;
  const resolvedPrimitive = resolvedNode?.primitiveAppearance;
  const primitiveAuthoritative =
    resolvedPrimitive?.ownership === "primitive-authoritative" &&
    Boolean(
      !resolvedNode ||
      backendDecisionOwns(resolvedNode.backendDecision, "primitive-dom-css") ||
      backendDecisionOwns(resolvedNode.backendDecision, "primitive-svg") ||
      backendDecisionOwns(resolvedNode.backendDecision, "linear-gradient-svg") ||
      backendDecisionOwns(resolvedNode.backendDecision, "ordered-solid-svg") ||
      backendDecisionOwns(resolvedNode.backendDecision, "ordered-normal-paint-svg"),
    );
  const rendererHint =
    resolvedNode?.renderHint ?? packageValue.rendererHints?.[node.id];
  const isBoundsFirstStatic = renderMode === "static" && Boolean(resolvedNode);
  const layoutRole = resolvePackageNodeLayoutRole(
    node,
    parentLayoutMode,
    isRoot,
  );
  const parentIsFlex = layoutRole.parentIsAutoLayout;
  const parentIsHorizontal = layoutRole.parentMainAxis === "horizontal";
  const parentIsVertical = layoutRole.parentMainAxis === "vertical";
  const isAbsolute = isBoundsFirstStatic
    ? !isRoot
    : resolvedNode
      ? resolvedNode.renderPositioning === "ABSOLUTE"
      : layoutRole.isAbsolute;
  const isText = node.type === "TEXT";
  const horizontalSizing =
    resolvedNode?.layout.horizontal ?? node.sizing.horizontal;
  const verticalSizing =
    resolvedNode?.layout.vertical ?? node.sizing.vertical;
  const usesLiveTrimmedTextHeight =
    isText &&
    verticalSizing.mode === "HUG" &&
    resolvedNode?.text?.leadingTrim === "cap-height";
  const mainAxisSizing = parentIsHorizontal
    ? horizontalSizing.mode
    : parentIsVertical
      ? verticalSizing.mode
      : null;
  const counterAxisSizing = parentIsHorizontal
    ? verticalSizing.mode
    : parentIsVertical
      ? horizontalSizing.mode
      : null;
  const resolvedLayout = resolvedNode?.layout;
  const layoutMode = resolvedLayout?.mode ?? node.layout.mode;
  const useSnapshotHugFallback =
    renderMode === "editor" &&
    node.layout.mode === "NONE" &&
    !isText &&
    node.children.length > 0;
  const rawHorizontalLimits = resolvePackageAxisLimits(node, "horizontal");
  const rawVerticalLimits = resolvePackageAxisLimits(node, "vertical");
  const horizontalLimits = {
    ...rawHorizontalLimits,
    min: resolvedLayout?.horizontal.min ?? rawHorizontalLimits.min,
    max: resolvedLayout?.horizontal.max ?? rawHorizontalLimits.max,
  };
  const verticalLimits = {
    ...rawVerticalLimits,
    min: resolvedLayout?.vertical.min ?? rawVerticalLimits.min,
    max: resolvedLayout?.vertical.max ?? rawVerticalLimits.max,
  };
  const applyLiveLimits = renderMode === "editor";
  const layoutGaps = resolvePackageLayoutGaps(node, renderMode);
  const transform = resolvedNode?.transform ?? resolvePackageTransform(node);
  const clipping = resolvePackageClipping(
    node,
    parentLayoutMode,
    isRoot,
    renderMode,
  );
  const style: CSSProperties = {
    boxSizing: "border-box",
    position: isRoot ? "relative" : isAbsolute ? "absolute" : "relative",
    left: isAbsolute ? bounds.x : undefined,
    top: isAbsolute ? bounds.y : undefined,
    width: isRoot
      ? "100%"
      : isBoundsFirstStatic
        ? bounds.width
        : axisSize(horizontalSizing, bounds.width, {
            isText,
            isParentFlex: parentIsFlex,
            isMainAxis: parentIsHorizontal,
            mode: renderMode,
            useSnapshotHugFallback,
          }),
    height: isRoot
      ? "100%"
      : isBoundsFirstStatic && !usesLiveTrimmedTextHeight
        ? bounds.height
        : axisSize(verticalSizing, bounds.height, {
            isText,
            isParentFlex: parentIsFlex,
            isMainAxis: parentIsVertical,
            mode: renderMode,
            useSnapshotHugFallback,
          }),
    minWidth: applyLiveLimits
      ? horizontalLimits.min ??
        (horizontalSizing.mode === "FILL" ||
          (renderMode === "editor" &&
            parentIsFlex &&
            horizontalSizing.mode === "HUG")
          ? 0
          : undefined)
      : undefined,
    minHeight: applyLiveLimits
      ? verticalLimits.min ??
        (verticalSizing.mode === "FILL" ||
          (renderMode === "editor" &&
            parentIsFlex &&
            verticalSizing.mode === "HUG")
          ? 0
          : undefined)
      : undefined,
    maxWidth: applyLiveLimits ? horizontalLimits.max : undefined,
    maxHeight: applyLiveLimits ? verticalLimits.max : undefined,
    opacity: resolvedNode?.appearance.opacity ?? node.appearance.opacity,
    overflow: clipping.clipsContent
      ? "hidden"
      : resolvedNode?.appearance.overflow ?? "visible",
    borderRadius: primitiveAuthoritative
      ? resolvedPrimitive.geometry.corner.css
      : resolvedNode?.appearance.borderRadius ?? borderRadiusValue(node),
  };

  if (rendererHint?.kind === "frame" && rendererHint.clipContent === true) {
    style.overflow = "hidden";
  }

  if (
    renderMode === "editor" &&
    isAbsolute &&
    parentConstraintBounds
  ) {
    const constraintResolution = resolvePackageAbsoluteConstraints(
      node,
      parentConstraintBounds,
      {
        parentLayoutMode,
      },
    );
    Object.assign(
      style,
      resolveTransformedConstraintStyle(
        transform,
        constraintResolution,
      ).style,
    );
  }

  if (!isBoundsFirstStatic && !isAbsolute && parentIsFlex) {
    if (mainAxisSizing === "FILL") {
      style.flexGrow = 1;
      style.flexShrink = 1;
      style.flexBasis = 0;
    } else if (renderMode === "editor") {
      style.flexGrow = 0;
      style.flexShrink = 0;
      style.flexBasis = "auto";
    }
    if (counterAxisSizing === "FILL") {
      style.alignSelf = "stretch";
    }
    if (
      renderMode === "editor" &&
      isText &&
      horizontalSizing.mode === "HUG" &&
      horizontalLimits.max === undefined
    ) {
      style.maxWidth = "100%";
    }
  }

  if (layoutMode !== "NONE" && !isBoundsFirstStatic) {
    style.display = "flex";
    style.flexDirection =
      resolvedLayout?.direction ??
      (layoutMode === "HORIZONTAL" ? "row" : "column");
    style.flexWrap =
      (resolvedLayout?.wrap ?? node.layout.wrap) ? "wrap" : "nowrap";
    style.gap = `${resolvedLayout?.gap ?? layoutGaps.gap}px`;
    const rowGap = resolvedLayout?.rowGap ?? layoutGaps.rowGap;
    const columnGap =
      resolvedLayout?.columnGap ?? layoutGaps.columnGap;
    if (rowGap !== null && rowGap !== undefined) {
      style.rowGap = `${rowGap}px`;
    }
    if (columnGap !== null && columnGap !== undefined) {
      style.columnGap = `${columnGap}px`;
    }
    const padding = resolvedLayout?.padding ?? node.layout.padding;
    style.paddingTop = padding.top;
    style.paddingRight = padding.right;
    style.paddingBottom = padding.bottom;
    style.paddingLeft = padding.left;
    style.justifyContent =
      resolvedLayout?.justifyContent ??
      justifyMap[node.layout.primaryAlignment];
    style.alignItems =
      resolvedLayout?.alignItems ??
      alignMap[node.layout.counterAlignment];
  }

  const solidFill = getFirstVisibleSolidPaint(node.appearance.fills);
  const usesSvgVisualSource =
    Boolean(node.vector) &&
    node.vector?.renderMode !== "SEMANTIC_SHAPE" &&
    node.vector?.renderMode !== "UNSUPPORTED";
  if (
    resolvedNode?.appearance.backgroundColor &&
    !usesSvgVisualSource &&
    !primitiveAuthoritative
  ) {
    if (isText) style.color = resolvedNode.appearance.backgroundColor;
    else style.backgroundColor = resolvedNode.appearance.backgroundColor;
  } else if (solidFill && !usesSvgVisualSource && !primitiveAuthoritative) {
    const color = normalizedColorToCss(
      solidFill.color,
      solidFill.opacity ?? 1,
    );
    if (isText) style.color = color;
    else style.backgroundColor = color;
  }
  if (!primitiveAuthoritative && node.shape?.type === "ELLIPSE") {
    style.borderRadius = "50%";
  } else if (
    !primitiveAuthoritative &&
    node.shape?.type === "RECTANGLE" &&
    typeof node.shape.cornerRadius === "number"
  ) {
    style.borderRadius = node.shape.cornerRadius;
  }

  const imageHint =
    rendererHint?.kind === "image" ? rendererHint : undefined;
  const imageAssetId =
    resolvedNode?.image?.assetId ?? node.image?.assetId ?? imageHint?.assetId;
  const imageAsset = imageAssetId
    ? resolvePackageAssetReference(packageValue, imageAssetId)?.asset
    : undefined;
  const imageSource =
    resolvedNode?.image?.source ??
    resolvePackageAssetSource(imageAsset);
  const resolvedImageMode = resolvedNode?.image?.renderMode;
  const mediaOwnerSelected = !resolvedNode ||
    backendDecisionOwns(resolvedNode.backendDecision, "media-dom");
  if (mediaOwnerSelected && imageSource && resolvedImageMode !== "figma-image-transform") {
    style.backgroundImage = `url(${JSON.stringify(imageSource)})`;
    const scaleMode =
      resolvedNode?.image?.scaleMode ??
      (imageHint?.objectFit === "contain"
        ? "FIT"
        : imageHint?.objectFit === "fill"
          ? "STRETCH"
          : node.image?.scaleMode ??
            imageHint?.figmaScaleMode ??
            imageAsset?.scaleMode);
    style.backgroundRepeat =
      resolvedImageMode === "tile" || scaleMode === "TILE"
        ? "repeat"
        : "no-repeat";
    style.backgroundPosition =
      resolvedNode?.image?.objectPosition ?? "center";
    const resolvedObjectFit = resolvedNode?.image?.objectFit;
    const compatibilityCropZoom = resolvedNode?.image?.placement.compatibilityCropZoom ?? 1;
    const compatibilityCropAxis = resolvedNode?.image?.placement.compatibilityCropAxis;
    const compatibilityCropSize =
      resolvedNode?.image?.placement.transformApplicability === "compatibility-legacy-fill-transform" &&
      compatibilityCropZoom > 1.0001 && compatibilityCropAxis
        ? compatibilityCropAxis === "height"
          ? `auto ${Number((compatibilityCropZoom * 100).toFixed(4))}%`
          : `${Number((compatibilityCropZoom * 100).toFixed(4))}% auto`
        : null;
    style.backgroundSize =
      resolvedImageMode === "tile"
        ? resolvedNode?.image?.assetWidth &&
          resolvedNode.image.assetHeight
          ? `${resolvedNode.image.assetWidth}px ${resolvedNode.image.assetHeight}px`
          : "auto"
        : compatibilityCropSize
          ? compatibilityCropSize
        : resolvedObjectFit === "contain" || scaleMode === "FIT"
        ? "contain"
        : resolvedObjectFit === "fill" || scaleMode === "STRETCH"
          ? "100% 100%"
          : "cover";
  }
  if (mediaOwnerSelected && resolvedImageMode === "figma-image-transform") {
    style.overflow = "hidden";
  }

  const resolvedEffects = resolvedNode?.appearance.effects ?? [];
  const effectShadows = resolvedEffects
    .map((effect) => effect.cssBoxShadow)
    .filter((value): value is string => Boolean(value));
  const effectFilters = resolvedEffects
    .map((effect) => effect.cssFilter)
    .filter((value): value is string => Boolean(value));
  const effectBackdropFilters = resolvedEffects
    .map((effect) => effect.cssBackdropFilter)
    .filter((value): value is string => Boolean(value));

  const stroke = resolvePackageStrokeModel(node, renderMode);
  if (!primitiveAuthoritative && stroke.paint && stroke.strategy !== "none") {
    const shadowLayers: string[] = [];
    stroke.layers.forEach((layer, index) => {
      const color = normalizedColorToCss(
        layer.paint.color,
        layer.paint.opacity ?? 1,
      );
      if (layer.strategy === "border" && index === 0) {
        style.border = `${layer.weight}px solid ${color}`;
      } else if (layer.strategy === "inset-shadow" || layer.strategy === "border") {
        shadowLayers.push(`inset 0 0 0 ${layer.weight}px ${color}`);
      } else if (layer.strategy === "centered-shadow") {
        const halfWeight = layer.weight / 2;
        shadowLayers.push(
          `inset 0 0 0 ${halfWeight}px ${color}`,
          `0 0 0 ${halfWeight}px ${color}`,
        );
      } else if (layer.strategy === "outer-shadow") {
        shadowLayers.push(`0 0 0 ${layer.weight}px ${color}`);
      }
    });
    if (
      renderMode === "editor" &&
      stroke.includedInLayout === true &&
      (stroke.alignment === "CENTER" || stroke.alignment === "OUTSIDE")
    ) {
      style.border = `${stroke.weight}px solid transparent`;
    }
    if (shadowLayers.length > 0) {
      effectShadows.push(...shadowLayers);
    }
  }

  if (effectShadows.length > 0) {
    style.boxShadow = effectShadows.join(", ");
  }
  if (effectFilters.length > 0) {
    style.filter = effectFilters.join(" ");
  }
  if (effectBackdropFilters.length > 0) {
    style.backdropFilter = effectBackdropFilters.join(" ");
  }
  if (
    resolvedNode
      ? !resolvedNode.appearance.visible
      : node.appearance.visible === false
  ) {
    style.display = "none";
  }
  applyPackageTransformStyle(style, transform);
  const motionTransformCss = packageMotionTransformToCss(motionTransform);
  if (motionTransform?.opacity !== undefined) {
    style.opacity = motionTransform.opacity;
  }
  if (motionTransformCss) {
    style.transformOrigin = style.transformOrigin ?? "50% 50%";
    style.transform = style.transform
      ? `${style.transform} ${motionTransformCss}`
      : motionTransformCss;
  }
  return style;
}

function renderVectorContent(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
  resolvedNode?: ResolvedRenderNode,
): ReactNode {
  const resolvedVectorSource = resolvedNode?.vector?.source;
  if (
    resolvedNode?.vector &&
    resolvedVectorSource &&
    (backendDecisionOwns(resolvedNode.backendDecision, "vector-svg") ||
      backendDecisionOwns(resolvedNode.backendDecision, "legacy-dom-css"))
  ) {
    const { vector } = resolvedNode;
    const contentBounds = vector.contentBounds;
    return (
      <img
        alt=""
        src={resolvedVectorSource}
        data-package-vector-source={
          vector.flattened
            ? "flattened-asset"
            : vector.usesSvgString
              ? "svg-string"
              : "asset-source"
        }
        data-package-vector-fit={node.vector?.fit ?? undefined}
        data-package-vector-view-box={vector.viewBox ?? undefined}
        data-package-vector-preserve-aspect-ratio={
          vector.preserveAspectRatio
        }
        data-package-vector-content-bounds={
          contentBounds
            ? `${contentBounds.x},${contentBounds.y},${contentBounds.width},${contentBounds.height}`
            : undefined
        }
        style={{
          display: "block",
          position: contentBounds ? "absolute" : undefined,
          left: contentBounds?.x,
          top: contentBounds?.y,
          width: contentBounds?.width ?? "100%",
          height: contentBounds?.height ?? "100%",
          objectFit: node.vector?.fit === "FIGMA_BOUNDS" ? "fill" : "contain",
        }}
      />
    );
  }
  const vector = node.vector;
  if (!vector) return null;
  const model = resolvePackageVectorRenderModel(node, packageValue);
  if (model?.source) {
    return (
      <img
        alt=""
        src={model.source}
        data-package-vector-source={
          model.usesSvgString ? "svg-string" : "asset-source"
        }
        data-package-vector-fit={vector.fit ?? undefined}
        data-package-vector-view-box={model.viewBox ?? undefined}
        data-package-vector-preserve-aspect-ratio={
          model.preserveAspectRatio ?? undefined
        }
        data-package-vector-content-bounds={
          model.contentBounds
            ? `${model.contentBounds.x},${model.contentBounds.y},${model.contentBounds.width},${model.contentBounds.height}`
            : undefined
        }
        style={model.style}
      />
    );
  }
  if (vector.pathData) {
    const model = resolvePackageVectorRenderModel(node, packageValue);
    const viewBox =
      typeof vector.viewBox === "string"
        ? vector.viewBox
        : vector.viewBox
          ? `${vector.viewBox.x} ${vector.viewBox.y} ${vector.viewBox.width} ${vector.viewBox.height}`
          : "0 0 100 100";
    return (
      <svg
        aria-hidden="true"
        viewBox={viewBox}
        preserveAspectRatio={vector.preserveAspectRatio}
        data-package-vector-content-bounds={
          model?.contentBounds
            ? `${model.contentBounds.x},${model.contentBounds.y},${model.contentBounds.width},${model.contentBounds.height}`
            : undefined
        }
        style={
          model?.style ?? {
            display: "block",
            width: "100%",
            height: "100%",
          }
        }
      >
        <path d={vector.pathData} fill="currentColor" />
      </svg>
    );
  }
  return null;
}

function renderResolvedImageContent(
  resolvedNode: ResolvedRenderNode | undefined,
  geometry: ResolvedImagePlacementGeometryV1 | null,
): ReactNode {
  const image = resolvedNode?.image;
  if (
    !resolvedNode ||
    !backendDecisionOwns(resolvedNode.backendDecision, "media-dom") ||
    !image?.source ||
    image.renderMode !== "figma-image-transform" ||
    !image.transformMatrix ||
    !geometry?.cssTransform
  ) {
    return null;
  }
  return (
    <img
      alt=""
      src={image.source}
      data-package-image-render-mode={image.renderMode}
      data-package-image-transform={image.transformMatrix.join(",")}
      data-package-image-css-transform={geometry.cssTransform.join(",")}
      style={{
        display: "block",
        position: "absolute",
        left: 0,
        top: 0,
        width: geometry.intrinsic.width,
        height: geometry.intrinsic.height,
        maxWidth: "none",
        maxHeight: "none",
        objectFit: "fill",
        transform: `matrix(${geometry.cssTransform.join(",")})`,
        transformOrigin: "0 0",
        pointerEvents: "none",
      }}
    />
  );
}

function shouldRenderFallbackPlaceholder(
  node: TemplateNode,
  resolvedNode: ResolvedRenderNode | undefined,
  content: ReactNode,
  imageContent: ReactNode,
): boolean {
  return Boolean(
    resolvedNode &&
      backendDecisionOwns(resolvedNode.backendDecision, "fallback-placeholder") &&
      resolvedNode.appearance.visible &&
      resolvedNode.renderStrategy === "fallback" &&
      resolvedNode.fallbackReason &&
      !content &&
      !imageContent &&
      node.children.length === 0,
  );
}

function renderFallbackPlaceholder(
  node: TemplateNode,
  resolvedNode: ResolvedRenderNode,
): ReactNode {
  const missingKind = resolvedNode.image?.missingAsset
    ? "image"
    : resolvedNode.vector?.missingAsset
      ? "vector"
      : "node";
  const label =
    missingKind === "image"
      ? "Missing image"
      : missingKind === "vector"
        ? "Missing SVG"
        : node.type;
  return (
    <span
      data-package-fallback-placeholder={node.id}
      data-package-fallback-reason={resolvedNode.fallbackReason}
      data-package-missing-asset-placeholder={
        missingKind === "node" ? undefined : missingKind
      }
      aria-label={`${label} placeholder`}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        border: "1px dashed rgba(15, 23, 42, 0.35)",
        background:
          "repeating-linear-gradient(135deg, rgba(15,23,42,0.05), rgba(15,23,42,0.05) 6px, rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 12px)",
        color: "rgba(15, 23, 42, 0.65)",
        font: "12px/1.3 system-ui, sans-serif",
        textAlign: "center",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      {label}
    </span>
  );
}

function ShrinkToFitText({
  children,
  contentKey,
  baseFontSize,
  lineHeightPx,
}: {
  children: ReactNode;
  contentKey: string;
  baseFontSize: number;
  lineHeightPx: number;
}) {
  const contentRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(1);
    const frame = requestAnimationFrame(() => {
      const content = contentRef.current;
      const parent = content?.parentElement;
      if (!content || !parent) return;
      const widthScale =
        content.scrollWidth > 0
          ? parent.clientWidth / content.scrollWidth
          : 1;
      const heightScale =
        content.scrollHeight > 0
          ? parent.clientHeight / content.scrollHeight
          : 1;
      setScale(Math.max(0.25, Math.min(1, widthScale, heightScale)));
    });
    return () => cancelAnimationFrame(frame);
  }, [contentKey, baseFontSize, lineHeightPx]);

  return (
    <span
      ref={contentRef}
      data-package-shrink-to-fit="true"
      style={{
        display: "block",
        maxWidth: "100%",
        fontSize: `${baseFontSize * scale}px`,
        lineHeight: `${lineHeightPx / baseFontSize}em`,
      }}
    >
      {children}
    </span>
  );
}

export interface FigmaCapHeightTextHeightInput {
  capHeightPx: number;
  lineHeightPx: number;
  renderedLineCount: number;
  verticalChromePx: number;
}

export function resolveFigmaCapHeightTextHeight({
  capHeightPx,
  lineHeightPx,
  renderedLineCount,
  verticalChromePx,
}: FigmaCapHeightTextHeightInput): number {
  return resolveCapToBaselineTextBox({
    capHeightPx,
    lineHeightPx,
    renderedLineCount,
    verticalChromePx,
  });
}

type TextGeometryMeasurement = Omit<
  IntrinsicTextMeasurementV1,
  "nodeId" | "revision"
> & { paintOffsetY: number };

function normalizedFontFamily(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
}

function fontWeightMatches(value: string, requested: number): boolean {
  const values = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (values.length === 1) return Math.abs(values[0] - requested) < 1;
  if (values.length >= 2) return requested >= values[0] && requested <= values[1];
  return requested === 400 && value === "normal";
}

function exactFontFaceLoaded(
  family: string | null,
  weight: number,
  style: string,
): boolean {
  if (!family || typeof document === "undefined" || !document.fonts) return false;
  const requestedFamily = normalizedFontFamily(family);
  const requestedStyle = style.toLowerCase();
  return [...document.fonts].some(
    (face) =>
      face.status === "loaded" &&
      normalizedFontFamily(face.family) === requestedFamily &&
      face.style.toLowerCase() === requestedStyle &&
      fontWeightMatches(face.weight, weight),
  );
}

function resolvedTextRunFontFamily(
  packageValue: TemplatePackageV1,
  nodeId: string,
  family: string,
  weight: number,
  style: string,
): string {
  const normalizedFamily = normalizedFontFamily(family);
  const normalizedStyle = style.toLowerCase();
  const requirement = packageValue.fontRequirements?.find(
    (candidate) =>
      candidate.usedBy.includes(nodeId) &&
      normalizedFontFamily(candidate.family) === normalizedFamily &&
      candidate.weight === weight &&
      candidate.cssStyle === normalizedStyle,
  ) ?? packageValue.fontRequirements?.find(
    (candidate) =>
      candidate.usedBy.includes(nodeId) &&
      normalizedFontFamily(candidate.family) === normalizedFamily,
  );
  return requirement?.resolution?.runtimeFamily ?? family;
}

function calibratedBaseline(
  computed: CSSStyleDeclaration,
): number | null {
  const calibration = document.createElement("span");
  const marker = document.createElement("span");
  Object.assign(calibration.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    visibility: "hidden",
    pointerEvents: "none",
    display: "inline-block",
    whiteSpace: "nowrap",
    fontFamily: computed.fontFamily,
    fontStyle: computed.fontStyle,
    fontWeight: computed.fontWeight,
    fontSize: computed.fontSize,
    lineHeight: computed.lineHeight,
    letterSpacing: computed.letterSpacing,
  });
  Object.assign(marker.style, {
    display: "inline-block",
    width: "0",
    height: "0",
    padding: "0",
    margin: "0",
    verticalAlign: "baseline",
  });
  calibration.append(document.createTextNode("H"), marker);
  document.body.appendChild(calibration);
  const baseline = marker.getBoundingClientRect().top - calibration.getBoundingClientRect().top;
  calibration.remove();
  return Number.isFinite(baseline) && baseline > 0 ? baseline : null;
}

function useIntrinsicTextGeometry(
  boxRef: RefObject<HTMLDivElement | null>,
  paintRef: RefObject<HTMLSpanElement | null>,
  enabled: boolean,
  measurementKey: string,
  lineHeightPx: number,
  verticalTrimSource: string | null | undefined,
  fontIdentity: { family: string | null; weight: number; style: string },
  approvedReplacement: boolean,
): TextGeometryMeasurement | null {
  const [measurement, setMeasurement] = useState<TextGeometryMeasurement | null>(null);

  useLayoutEffect(() => {
    if (!enabled || !boxRef.current || !paintRef.current) {
      setMeasurement(null);
      return;
    }
    const element = boxRef.current;
    const paint = paintRef.current;
    let disposed = false;
    let frame = 0;
    const measure = () => {
      if (disposed || !element.isConnected || !paint.isConnected) return;
      const range = document.createRange();
      range.selectNodeContents(paint);
      const rects = Array.from(range.getClientRects()).filter(
        (rect) => rect.width > 0 || rect.height > 0,
      );
      const computed = getComputedStyle(element);
      const verticalChrome =
        (Number.parseFloat(computed.paddingTop) || 0) +
        (Number.parseFloat(computed.paddingBottom) || 0) +
        (Number.parseFloat(computed.borderTopWidth) || 0) +
        (Number.parseFloat(computed.borderBottomWidth) || 0);
      const horizontalChrome =
        (Number.parseFloat(computed.paddingLeft) || 0) +
        (Number.parseFloat(computed.paddingRight) || 0) +
        (Number.parseFloat(computed.borderLeftWidth) || 0) +
        (Number.parseFloat(computed.borderRightWidth) || 0);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        range.detach();
        return;
      }
      context.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
      const capMetrics = context.measureText("H");
      const capHeight = capMetrics.actualBoundingBoxAscent;
      const fontAscent = "fontBoundingBoxAscent" in capMetrics
        ? Number(capMetrics.fontBoundingBoxAscent)
        : null;
      const fontDescent = "fontBoundingBoxDescent" in capMetrics
        ? Number(capMetrics.fontBoundingBoxDescent)
        : null;
      const letterSpacing = Number.parseFloat(computed.letterSpacing) || 0;
      const textContent = paint.textContent ?? "";
      const textLines = textContent.split(/\r?\n/);
      const canvasElement = element.closest<HTMLElement>("[data-template-package-canvas]");
      const canvasRect = canvasElement?.getBoundingClientRect();
      const canvasLogicalWidth = canvasElement ? Number.parseFloat(getComputedStyle(canvasElement).width) : 0;
      const canvasLogicalHeight = canvasElement ? Number.parseFloat(getComputedStyle(canvasElement).height) : 0;
      const scaleX = canvasRect && canvasLogicalWidth > 0 ? canvasRect.width / canvasLogicalWidth : 1;
      const scaleY = canvasRect && canvasLogicalHeight > 0 ? canvasRect.height / canvasLogicalHeight : 1;
      const lineTopTolerance = Math.max(1, lineHeightPx * (scaleY || 1) * 0.2);
      const clusteredLineTops: number[] = [];
      for (const top of rects.map((rect) => rect.top).sort((left, right) => left - right)) {
        if (!clusteredLineTops.some((candidate) => Math.abs(candidate - top) <= lineTopTolerance)) clusteredLineTops.push(top);
      }
      const lineCount = Math.max(1, clusteredLineTops.length);
      const rangeLineWidths = new Map<number, number>();
      for (const item of rects) {
        const line = clusteredLineTops.findIndex((top) => Math.abs(top - item.top) <= lineTopTolerance);
        rangeLineWidths.set(line, (rangeLineWidths.get(line) ?? 0) + item.width / (scaleX || 1));
      }
      const canvasIntrinsicWidth = Math.max(0, ...textLines.map((line) => context.measureText(line).width + Math.max(0, line.length - 1) * letterSpacing));
      const probe = document.createElement("span");
      Object.assign(probe.style, {
        position: "fixed",
        left: "-100000px",
        top: "0",
        visibility: "hidden",
        pointerEvents: "none",
        display: "inline-block",
        width: "max-content",
        maxWidth: "none",
        whiteSpace: computed.whiteSpace,
        fontFamily: computed.fontFamily,
        fontStyle: computed.fontStyle,
        fontWeight: computed.fontWeight,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        textTransform: computed.textTransform,
      });
      probe.textContent = textContent;
      document.body.appendChild(probe);
      const probeWidth = probe.getBoundingClientRect().width;
      probe.remove();
      const intrinsicWidth = (probeWidth > 0 ? probeWidth : rangeLineWidths.size ? Math.max(...rangeLineWidths.values()) : canvasIntrinsicWidth) + horizontalChrome;
      const rangeTop = rects.length ? Math.min(...rects.map((item) => item.top)) : 0;
      const rangeBottom = rects.length ? Math.max(...rects.map((item) => item.bottom)) : lineHeightPx;
      const verticalTrim = resolveVerticalTextTrimMode(verticalTrimSource);
      const exact = exactFontFaceLoaded(
        fontIdentity.family,
        fontIdentity.weight,
        fontIdentity.style,
      );
      const fontState: IntrinsicTextMeasurementV1["fontState"] = exact
        ? "exact"
        : approvedReplacement
          ? "approved-replacement"
          : document.fonts?.check(
                `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`,
                textContent.slice(0, 128),
              )
            ? "fallback"
            : "unavailable";
      const canTrim =
        verticalTrim === "cap-height-to-baseline" &&
        (fontState === "exact" || fontState === "approved-replacement") &&
        Number.isFinite(capHeight) &&
        capHeight > 0;
      const baseline = calibratedBaseline(computed);
      const firstLineCapTop =
        canTrim && baseline !== null ? baseline - capHeight : null;
      const finalLineBaseline = canTrim
        ? capHeight + (lineCount - 1) * lineHeightPx
        : null;
      const browserLineHeight = lineCount * lineHeightPx + verticalChrome;
      const trimmedHeight = canTrim
        ? resolveFigmaCapHeightTextHeight({
            capHeightPx: capHeight,
            lineHeightPx,
            renderedLineCount: lineCount,
            verticalChromePx: verticalChrome,
          })
        : null;
      const glyphOrigin =
        canTrim && baseline !== null && firstLineCapTop !== null
          ? resolveCapTrimGlyphOrigin({
              firstLineCapTopPx: firstLineCapTop,
              baselinePx: baseline,
              lineHeightPx,
              renderedLineCount: lineCount,
            })
          : null;
      const nextHeight = trimmedHeight ??
        Math.max(lineHeightPx, rangeBottom - rangeTop) + verticalChrome;
      const glyphMetrics = context.measureText(textContent.replace(/\s/g, "") || "H");
      const glyphTop = baseline !== null && Number.isFinite(glyphMetrics.actualBoundingBoxAscent)
        ? baseline - glyphMetrics.actualBoundingBoxAscent
        : null;
      const glyphBottom = baseline !== null && Number.isFinite(glyphMetrics.actualBoundingBoxDescent)
        ? baseline + (lineCount - 1) * lineHeightPx + glyphMetrics.actualBoundingBoxDescent
        : null;
      const semanticBoxWidth = element.clientWidth || intrinsicWidth;
      const next: TextGeometryMeasurement = {
        width: intrinsicWidth,
        height: nextHeight,
        lineCount,
        capHeight: Number.isFinite(capHeight) && capHeight > 0 ? capHeight : null,
        verticalTrim,
        trimAuthority: verticalTrim === "none"
          ? "not-requested"
          : canTrim
            ? "authoritative"
            : "compatibility",
        fontState,
        fontIdentity,
        fontMetrics: {
          ascent: fontAscent !== null && Number.isFinite(fontAscent) ? fontAscent : null,
          descent: fontDescent !== null && Number.isFinite(fontDescent) ? fontDescent : null,
          capHeight: Number.isFinite(capHeight) && capHeight > 0 ? capHeight : null,
          baseline,
          lineHeight: lineHeightPx,
          firstLineCapTop,
          finalLineBaseline,
        },
        glyphOrigin,
        boxes: {
          layout: { width: semanticBoxWidth, height: nextHeight },
          browserLine: { width: semanticBoxWidth, height: browserLineHeight },
          figmaTrimmed: trimmedHeight === null
            ? null
            : { width: semanticBoxWidth, height: trimmedHeight },
          glyphPaint: glyphTop === null || glyphBottom === null
            ? null
            : { top: glyphTop, bottom: glyphBottom },
          clipping: {
            width: semanticBoxWidth,
            height: element.clientHeight,
            active: computed.overflow === "hidden" || computed.overflow === "clip",
          },
        },
        metricSource: verticalTrim === "cap-height-to-baseline"
          ? "canvas-and-dom-calibration"
          : "range-line-box",
        paintOffsetY: glyphOrigin?.translationY ?? 0,
      };
      setMeasurement((current) =>
        current &&
        Math.abs(current.width - next.width) < 0.01 &&
        Math.abs(current.height - next.height) < 0.01 &&
        current.lineCount === next.lineCount &&
        Math.abs((current.capHeight ?? 0) - (next.capHeight ?? 0)) < 0.01 &&
        current.fontState === next.fontState &&
        current.trimAuthority === next.trimAuthority &&
        Math.abs(current.paintOffsetY - next.paintOffsetY) < 0.01 &&
        Math.abs(current.boxes.clipping.height - next.boxes.clipping.height) < 0.01 &&
        Math.abs(current.boxes.clipping.width - next.boxes.clipping.width) < 0.01
          ? current
          : next,
      );
      range.detach();
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    scheduleMeasure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMeasure);
    observer?.observe(element);
    observer?.observe(paint);
    void document.fonts?.ready.then(scheduleMeasure);
    document.fonts?.addEventListener?.("loadingdone", scheduleMeasure);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", scheduleMeasure);
    };
  }, [
    approvedReplacement,
    boxRef,
    enabled,
    fontIdentity.family,
    fontIdentity.style,
    fontIdentity.weight,
    lineHeightPx,
    measurementKey,
    paintRef,
    verticalTrimSource,
  ]);

  return measurement;
}

export function PackageNodeRenderer({
  node,
  packageValue,
  parentLayoutMode,
  mode = "static",
  isRoot = false,
  parentConstraintBounds,
  resolvedTree,
  resolvedNode,
  debugOverlay = false,
  highlightNodeId,
  highlightNodeIds = [],
  motionTransforms,
  runtime,
}: PackageNodeRendererProps) {
  const nodeElementRef = useRef<HTMLDivElement>(null);
  const textPaintRef = useRef<HTMLSpanElement>(null);
  const primitiveSvgIdPrefix = `package-${useId().replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const style = buildNodeStyle(
    node,
    packageValue,
    parentLayoutMode,
    isRoot,
    mode,
    parentConstraintBounds,
    resolvedNode,
    motionTransforms?.[node.id],
  );
  const parentMaskRelationships = (resolvedTree?.maskRelationships ?? []).filter(
    (relationship) => relationship.parentId === node.id,
  );
  const affectedMask = (resolvedTree?.maskRelationships ?? [])
    .map((relationship) => ({
      relationship,
      affected: relationship.affected.find((entry) => entry.nodeId === node.id),
    }))
    .find((entry) => Boolean(entry.affected));
  const exactMaskApplication = affectedMask?.relationship.status === "valid" &&
    affectedMask.relationship.renderStrategy === "css-clip-path" &&
    backendDecisionOwns(resolvedNode?.backendDecision, "mask-css-clip") &&
    affectedMask.affected?.clipInsets
      ? affectedMask
      : null;
  if (exactMaskApplication?.affected?.clipInsets) {
    const { top, right, bottom, left } = exactMaskApplication.affected.clipInsets;
    style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
  }
  const resolvedText = resolvedNode?.text;
  const verticalTrimSource = node.type === "TEXT" && "characters" in node.text
    ? node.text.leadingTrim ?? null
    : resolvedText?.leadingTrim === "cap-height"
      ? "CAP_HEIGHT"
      : null;
  const requestedVerticalTrim = resolveVerticalTextTrimMode(verticalTrimSource);
  const eligibleTextMeasurement = Boolean(
    node.type === "TEXT" &&
    (node.sizing.horizontal.mode === "HUG" || node.sizing.vertical.mode === "HUG"),
  );
  const measuresIntrinsicText =
    node.type === "TEXT" &&
    (node.sizing.vertical.mode === "HUG" ||
      requestedVerticalTrim === "cap-height-to-baseline");
  const trimFontRequirement = packageValue.fontRequirements?.find((requirement) =>
    requirement.usedBy.includes(node.id) &&
    requirement.family.trim().toLowerCase() === resolvedText?.fontFamily?.trim().toLowerCase() &&
    requirement.weight === resolvedText?.fontWeight &&
    requirement.cssStyle === resolvedText?.fontStyle,
  ) ?? packageValue.fontRequirements?.find((requirement) =>
    requirement.usedBy.includes(node.id) &&
    requirement.family.trim().toLowerCase() === resolvedText?.fontFamily?.trim().toLowerCase(),
  );
  const approvedReplacement = Boolean(
    trimFontRequirement?.resolution?.confirmed &&
    (trimFontRequirement.resolution.classification === "replacement" ||
      trimFontRequirement.resolution.match === "alias" ||
      trimFontRequirement.resolution.match === "manual" ||
      trimFontRequirement.resolution.match === "replacement" ||
      trimFontRequirement.resolution.match === "fallback"),
  );
  const intrinsicTextGeometry = useIntrinsicTextGeometry(
    nodeElementRef,
    textPaintRef,
    measuresIntrinsicText,
    resolvedText
      ? [
          resolvedText.characters,
          resolvedText.cssFontFamily,
          resolvedText.fontWeight,
          resolvedText.fontStyle,
          resolvedText.fontSizePx,
          resolvedText.lineHeightPx,
          resolvedText.letterSpacingPx,
          resolvedText.paragraphSpacingPx,
          runtimeFontFaceSignature(
            resolvedText.runtimeFontFamily ?? resolvedText.fontFamily,
            resolvedText.fontWeight,
            resolvedText.fontStyle,
          ),
          resolvedNode?.layout.horizontal.mode,
          resolvedNode?.layout.horizontal.max,
        ].join("|")
      : node.type === "TEXT"
        ? JSON.stringify(node.text)
        : node.id,
    resolvedText?.lineHeightPx ?? 16,
    verticalTrimSource,
    {
      family:
        resolvedText?.runtimeFontFamily ?? resolvedText?.fontFamily ?? null,
      weight: resolvedText?.fontWeight ?? 400,
      style: resolvedText?.fontStyle ?? "normal",
    },
    approvedReplacement,
  );
  const preliminaryRuntimeNode = runtime?.preliminary.nodes[node.id];
  const settledRuntimeNode = runtime?.settled.nodes[node.id];
  const runtimeAuthoritative = Boolean(
    typeof document !== "undefined" &&
    runtime?.mode === "authoritative" &&
    runtime.settled.readiness === "ready" &&
    runtime.settled.stable &&
    runtime.route.nodes[node.id]?.routed,
  );
  useEffect(() => {
    if (!runtime || !eligibleTextMeasurement || !intrinsicTextGeometry || !preliminaryRuntimeNode || !resolvedText) return;
    const { paintOffsetY: _paintOffsetY, ...measurement } = intrinsicTextGeometry;
    runtime.publishTextMeasurement({
      nodeId: node.id,
      ...measurement,
    });
  }, [eligibleTextMeasurement, intrinsicTextGeometry, node.id, preliminaryRuntimeNode, resolvedText, runtime]);
  if (typeof document !== "undefined" && runtime?.route.nodes[node.id]?.routed && preliminaryRuntimeNode && !runtimeAuthoritative) {
    style.width = preliminaryRuntimeNode.bounds.width;
  }
  if (
    intrinsicTextGeometry?.trimAuthority === "authoritative" &&
    !runtimeAuthoritative &&
    node.sizing.vertical.mode === "HUG"
  ) {
    const existingMinHeight =
      typeof style.minHeight === "number"
        ? style.minHeight
        : typeof style.minHeight === "string"
          ? Number.parseFloat(style.minHeight)
          : 0;
    const resolvedHugHeight = Math.max(
      Number.isFinite(existingMinHeight) ? existingMinHeight : 0,
      intrinsicTextGeometry.height,
    );
    style.height = resolvedHugHeight;
    style.minHeight = resolvedHugHeight;
  }
  const childIds = resolvedNode?.children ?? node.children;
  const childNodes = childIds
    .map((childId) => {
      const sourceNode = packageValue.nodes[childId];
      return sourceNode
        ? {
            sourceNode,
            resolvedNode: resolvedTree?.nodes[childId],
          }
        : null;
    })
    .filter(
      (
        child,
      ): child is {
        sourceNode: TemplateNode;
        resolvedNode: ResolvedRenderNode | undefined;
      } => Boolean(child),
    )
    // An explicit mask source is semantic mask input, never ordinary RGB
    // content. The relationship owner applies one clip to affected siblings.
    .filter((child) => child.sourceNode.mask?.isMask !== true);
  const nodeLayoutRole = resolvePackageNodeLayoutRole(
    node,
    parentLayoutMode,
    isRoot,
  );
  const isLiveResizeConstraintContainer =
    mode === "editor" &&
    isEditorLiveResizableConstraintContainer(
      node,
      parentLayoutMode,
      isRoot,
    );
  const clipping = resolvePackageClipping(
    node,
    parentLayoutMode,
    isRoot,
    mode,
  );
  const constraintResolution =
    mode === "editor" &&
    parentConstraintBounds &&
    nodeLayoutRole.isAbsolute
      ? resolvePackageAbsoluteConstraints(node, parentConstraintBounds, {
          parentLayoutMode,
        })
      : null;
  // Every editor-mode container provides the snapshot coordinate system needed
  // to resolve direct absolute children against its live CSS box. The exported
  // bounds derive edge offsets; CSS left/right/top/bottom then follow live size.
  const providesLiveConstraintContext =
    mode === "editor" && childNodes.length > 0;
  let imageContent: ReactNode = null;
  const isHighlighted = node.id === highlightNodeId || highlightNodeIds.includes(node.id);
  let content: ReactNode = null;
  let textPaintContent = false;

  if (resolvedNode?.vector?.flattened && resolvedNode.vector.source) {
    content = renderVectorContent(node, packageValue, resolvedNode);
  } else if (node.type === "TEXT") {
    const renderedText = resolvePackageTextStyle(node.text);
    if (resolvedNode?.text) {
      Object.assign(style, {
        fontFamily: resolvedNode.text.cssFontFamily,
        fontStyle: resolvedNode.text.fontStyle,
        fontWeight: resolvedNode.text.fontWeight,
        fontSize: resolvedNode.text.fontSizePx,
        lineHeight: `${resolvedNode.text.lineHeightPx}px`,
        letterSpacing: `${resolvedNode.text.letterSpacingPx}px`,
        textAlign: resolvedNode.text.alignHorizontal,
        textTransform: resolvedNode.text.textTransform,
        textDecorationLine: resolvedNode.text.textDecoration,
        whiteSpace: resolvedNode.text.whiteSpace,
        overflowWrap: "break-word",
        wordWrap: "break-word",
        overflow: resolvedNode.text.overflow,
      });
    } else {
      Object.assign(style, renderedText.style);
    }
    const textHint =
      packageValue.rendererHints?.[node.id]?.kind === "text"
        ? packageValue.rendererHints[node.id]
        : null;
    if (!resolvedNode?.text && textHint?.kind === "text") {
      Object.assign(style, {
        fontFamily: textHint.fontFamily,
        fontWeight: textHint.fontWeight,
        fontSize: textHint.fontSize,
        lineHeight: `${textHint.lineHeightPx}px`,
        letterSpacing: `${textHint.letterSpacingPx}px`,
        textAlign: textHint.alignHorizontal,
      });
    }
    if (node.layout.mode === "NONE") {
      style.display = "flex";
      style.flexDirection = "column";
      const verticalAlign =
        resolvedNode?.text?.alignVertical ??
        ("characters" in node.text
          ? node.text.textAlignVertical
          : node.text.style.textAlignVertical);
      style.justifyContent = resolveVerticalTextPaintPlacement({
        authoritativeTrim:
          intrinsicTextGeometry?.trimAuthority === "authoritative",
        sizingMode: node.sizing.vertical.mode,
        verticalAlignment: verticalAlign,
      }).justifyContent;
    }
    const editableTextField = (
      resolvedNode?.editableFields ??
      packageValue.editableFields.filter(
        (field) => field.nodeId === node.id,
      )
    ).find((field) => field.property === "text.characters");
    if (
      editableTextField?.behavior?.onOverflow === "clip-preview" ||
      editableTextField?.behavior?.preserveBox
    ) {
      style.overflow = "hidden";
    }
    if (editableTextField?.behavior?.preserveBox) {
      style.width = node.bounds.relative.width;
      style.height = node.bounds.relative.height;
    }
    const resolvedContent =
      resolvedNode?.text?.characters ?? renderedText.content;
    const paragraphSpacing =
      resolvedNode?.text?.paragraphSpacingPx ??
      renderedText.paragraphSpacing;
    content =
      paragraphSpacing > 0 &&
      /[\r\n]/.test(resolvedContent)
        ? resolvedContent
            .split(/\r?\n/)
            .map((paragraph, index, paragraphs) => (
              <span
                key={index}
                style={{
                  display: "block",
                  marginBottom:
                    index < paragraphs.length - 1
                      ? paragraphSpacing
                      : 0,
                }}
              >
                {paragraph || "\u00a0"}
              </span>
            ))
        : resolvedContent;
    textPaintContent = true;
    if (
      "characters" in node.text &&
      node.text.styleRanges?.length
    ) {
      content = [...node.text.styleRanges]
        .sort((left, right) => left.start - right.start)
        .map((range, index) => (
          <span
            key={`${range.start}:${range.end}:${index}`}
            style={{
              fontFamily: resolvedTextRunFontFamily(
                packageValue,
                node.id,
                range.family,
                range.weight,
                range.cssStyle,
              ),
              fontStyle: range.cssStyle,
              fontWeight: range.weight,
            }}
          >
            {resolvedContent.slice(range.start, range.end)}
          </span>
        ));
    }
    if (
      editableTextField?.behavior?.onOverflow === "shrink-to-fit" &&
      resolvedNode?.text
    ) {
      content = (
        <ShrinkToFitText
          contentKey={resolvedContent}
          baseFontSize={resolvedNode.text.fontSizePx}
          lineHeightPx={resolvedNode.text.lineHeightPx}
        >
          {content}
        </ShrinkToFitText>
      );
    }
    if (!editableTextField && node.textFallback) {
      const fallbackSource = resolvePackageAssetSource(
        resolvePackageAssetReference(
          packageValue,
          node.textFallback.assetId,
        )?.asset,
      );
      if (fallbackSource) {
        textPaintContent = false;
        content = (
          <img
            src={fallbackSource}
            alt=""
            aria-hidden="true"
            data-package-text-outline={node.id}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "fill",
            }}
          />
        );
      }
    }
  } else if (
    (resolvedNode?.vector && resolvedNode.vector.renderMode !== "SEMANTIC_SHAPE" && (
      backendDecisionOwns(resolvedNode.backendDecision, "vector-svg") ||
      backendDecisionOwns(resolvedNode.backendDecision, "legacy-dom-css")
    )) ||
    (!resolvedNode && node.vector &&
      node.vector.renderMode !== "SEMANTIC_SHAPE")
  ) {
    content = renderVectorContent(node, packageValue, resolvedNode);
  }
  if (
    node.type === "TEXT" &&
    textPaintContent &&
    (!resolvedNode || backendDecisionOwns(resolvedNode.backendDecision, "text-dom"))
  ) {
    const paintContent = (
      <span
        ref={textPaintRef}
        data-package-text-paint-box="true"
        style={{
          display: "block",
          minWidth: 0,
          transform:
            intrinsicTextGeometry?.trimAuthority === "authoritative" &&
            Math.abs(intrinsicTextGeometry.paintOffsetY) > 0.001
              ? `translateY(${intrinsicTextGeometry.paintOffsetY}px)`
              : undefined,
          transformOrigin: "top left",
        }}
      >
        {content}
      </span>
    );
    content =
      intrinsicTextGeometry?.trimAuthority === "authoritative" &&
      intrinsicTextGeometry.boxes.figmaTrimmed
        ? (
            <span
              data-package-text-semantic-content-box="true"
              style={{
                display: "block",
                position: "relative",
                flex: "0 0 auto",
                width: node.sizing.horizontal.mode === "HUG" ? "max-content" : "100%",
                maxWidth: node.sizing.horizontal.mode === "HUG" ? "none" : "100%",
                height: intrinsicTextGeometry.boxes.figmaTrimmed.height,
                overflow: "visible",
              }}
            >
              {paintContent}
            </span>
          )
        : paintContent;
  }
  if (runtimeAuthoritative && settledRuntimeNode) {
    const settledBounds = settledRuntimeNode.bounds;
    delete style.flex;
    delete style.flexGrow;
    delete style.flexShrink;
    delete style.flexBasis;
    delete style.alignSelf;
    Object.assign(style, isRoot ? {
      position: "relative",
      width: "100%",
      height: "100%",
    } : {
      position: "absolute",
      left: settledBounds.x,
      top: settledBounds.y,
      width: settledBounds.width,
      height: settledBounds.height,
      minWidth: 0,
      minHeight: 0,
      maxWidth: undefined,
      maxHeight: undefined,
    });
    if ((resolvedNode?.layout.mode ?? node.layout.mode) !== "NONE") {
      Object.assign(style, {
        display: "block",
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        gap: 0,
        rowGap: 0,
        columnGap: 0,
      });
    }
  }

  const primitiveBounds = runtimeAuthoritative && settledRuntimeNode
    ? settledRuntimeNode.bounds
    : resolvedNode?.bounds.relative ?? node.bounds.relative;
  const hasCurrentOrResolvedDynamicPaintContract = node.appearance.fills.length >= 2 ||
    Boolean(resolvedNode?.primitiveAppearance.paints.orderedSolidStack) || node.appearance.fills.some(
    (paint) => paint.type === "GRADIENT_LINEAR",
  ) || resolvedNode?.primitiveAppearance.paints.layers.some(
    (paint) => paint.type === "GRADIENT_LINEAR",
  );
  const currentPrimitiveAppearance = hasCurrentOrResolvedDynamicPaintContract
    ? resolvePrimitiveAppearance(node, {
        packageId: packageValue.packageId,
        rootNodeId: packageValue.rootNodeId,
        bounds: primitiveBounds,
        maskInput: node.mask?.isMask === true,
        hasMaskRelationship: hasPrimitiveMaskRelationship(packageValue, node.id),
        ancestorClipChain: collectPrimitiveAncestorClipChain(packageValue, node),
      })
    : null;
  const resolvedPrimitiveIsCurrent = resolvedNode?.primitiveAppearance &&
    (!currentPrimitiveAppearance ||
      resolvedNode.primitiveAppearance.sourceRevision === currentPrimitiveAppearance.sourceRevision);
  const primitiveAppearance = resolvedPrimitiveIsCurrent
    ? resizePrimitiveAppearance(resolvedNode.primitiveAppearance, primitiveBounds)
    : currentPrimitiveAppearance ?? resolvePrimitiveAppearance(node, {
        packageId: packageValue.packageId,
        rootNodeId: packageValue.rootNodeId,
        bounds: primitiveBounds,
        maskInput: node.mask?.isMask === true,
        hasMaskRelationship: hasPrimitiveMaskRelationship(packageValue, node.id),
        ancestorClipChain: collectPrimitiveAncestorClipChain(packageValue, node),
      });
  let primitiveSvgContent: ReactNode = null;
  const centralPrimitiveOwner = Boolean(
    resolvedNode && (
      backendDecisionOwns(resolvedNode.backendDecision, "primitive-dom-css") ||
      backendDecisionOwns(resolvedNode.backendDecision, "primitive-svg") ||
      backendDecisionOwns(resolvedNode.backendDecision, "linear-gradient-svg") ||
      backendDecisionOwns(resolvedNode.backendDecision, "ordered-solid-svg") ||
      backendDecisionOwns(resolvedNode.backendDecision, "ordered-normal-paint-svg")
    ),
  );
  if (primitiveAppearance.ownership === "primitive-authoritative" && centralPrimitiveOwner) {
    const fillLayer = primitiveAppearance.paints.routedLayerIndex === null
      ? null
      : primitiveAppearance.paints.layers.find(
          (layer) => layer.sourceIndex === primitiveAppearance.paints.routedLayerIndex,
        ) ?? null;
    const strokeLayer = primitiveAppearance.strokes.routedLayerIndex === null
      ? null
      : primitiveAppearance.strokes.layers.find(
          (layer) => layer.sourceIndex === primitiveAppearance.strokes.routedLayerIndex,
        ) ?? null;
    style.borderRadius = primitiveAppearance.geometry.clippingBounds
      ? primitiveAppearance.geometry.corner.css
      : primitiveAppearance.backend === "dom-css"
        ? primitiveAppearance.geometry.corner.css
        : undefined;
    style.backgroundColor = primitiveAppearance.backend === "dom-css"
      ? fillLayer?.color ?? undefined
      : undefined;
    style.border = undefined;
    style.boxShadow = primitiveAppearance.backend === "dom-css" && strokeLayer?.color
      ? `inset 0 0 0 ${strokeLayer.weight}px ${strokeLayer.color}`
      : undefined;
    primitiveSvgContent = renderPrimitiveSvgAppearance(primitiveAppearance, primitiveSvgIdPrefix);
  }

  const imageSlotBounds = runtimeAuthoritative && settledRuntimeNode
    ? settledRuntimeNode.bounds
    : resolvedNode?.bounds.relative ?? node.bounds.relative;
  const imageGeometry = resolvedNode?.image?.assetWidth && resolvedNode.image.assetHeight
    ? resolveImagePlacementGeometry(
        resolvedNode.image.placement,
        imageSlotBounds.width,
        imageSlotBounds.height,
        resolvedNode.image.assetWidth,
        resolvedNode.image.assetHeight,
      )
    : null;
  imageContent = renderResolvedImageContent(resolvedNode, imageGeometry);
  const fallbackPlaceholder =
    resolvedNode &&
    shouldRenderFallbackPlaceholder(
      node,
      resolvedNode,
      content,
      imageContent,
    )
      ? renderFallbackPlaceholder(node, resolvedNode)
      : null;

  return (
    <div
      ref={nodeElementRef}
      data-package-node-id={node.id}
      data-package-node-name={resolvedNode?.name ?? node.name}
      data-package-node-type={node.type}
      data-package-resolved-node={
        resolvedNode ? "true" : undefined
      }
      data-package-render-strategy={
        resolvedNode?.renderStrategy
      }
      data-package-primitive-schema={primitiveAppearance.schemaVersion}
      data-package-primitive-ownership={primitiveAppearance.ownership}
      data-package-primitive-backend={primitiveAppearance.backend}
      data-package-primitive-source-revision={primitiveAppearance.sourceRevision}
      data-package-primitive-geometry-revision={primitiveAppearance.geometryRevision}
      data-package-primitive-source-bounds={JSON.stringify(primitiveAppearance.geometry.sourceBounds)}
      data-package-primitive-settled-bounds={JSON.stringify(primitiveAppearance.geometry.settledBounds)}
      data-package-primitive-clipping-bounds={primitiveAppearance.geometry.clippingBounds ? JSON.stringify(primitiveAppearance.geometry.clippingBounds) : undefined}
      data-package-primitive-paint-revisions={primitiveAppearance.paints.layers.map((layer) => layer.paintRevision).join(",") || undefined}
      data-package-primitive-stroke-revisions={primitiveAppearance.strokes.layers.map((layer) => layer.strokeRevision).join(",") || undefined}
      data-package-primitive-kind={primitiveAppearance.geometry.kind}
      data-package-primitive-axis-aligned={String(primitiveAppearance.geometry.axisAligned)}
      data-package-primitive-corner-requested={JSON.stringify(primitiveAppearance.geometry.corner.requested)}
      data-package-primitive-corner-effective={JSON.stringify(primitiveAppearance.geometry.corner.effective)}
      data-package-primitive-corner-clamped={String(primitiveAppearance.geometry.corner.clamped)}
      data-package-primitive-corner-normalization-scale={primitiveAppearance.geometry.corner.normalizationScale}
      data-package-primitive-corner-normalization-scales={JSON.stringify(primitiveAppearance.geometry.corner.normalizationScales)}
      data-package-primitive-corner-clamp-reason={primitiveAppearance.geometry.corner.clampReason}
      data-package-primitive-ancestor-clip-chain={primitiveAppearance.geometry.ancestorClipChain.length
        ? JSON.stringify(primitiveAppearance.geometry.ancestorClipChain)
        : undefined}
      data-package-primitive-paint-order={primitiveAppearance.paints.layers.map((layer) => `${layer.sourceIndex}:${layer.type}:${layer.role}`).join(",") || undefined}
      data-package-primitive-paint-strategy={primitiveAppearance.paints.renderStrategy}
      data-package-ordered-solid-stack={primitiveAppearance.paints.orderedSolidStack
        ? JSON.stringify({
            schemaVersion: primitiveAppearance.paints.orderedSolidStack.schemaVersion,
            nodeId: primitiveAppearance.paints.orderedSolidStack.nodeId,
            canonicalSourceRevision: primitiveAppearance.paints.orderedSolidStack.canonicalSourceRevision,
            resolvedStackRevision: primitiveAppearance.paints.orderedSolidStack.resolvedStackRevision,
            primitiveGeometryRevision: primitiveAppearance.paints.orderedSolidStack.primitiveGeometryRevision,
            currentBounds: primitiveAppearance.paints.orderedSolidStack.currentBounds,
            cornerGeometry: primitiveAppearance.paints.orderedSolidStack.cornerGeometry,
            orderedPaints: primitiveAppearance.paints.orderedSolidStack.orderedPaints,
            visiblePaintIndices: primitiveAppearance.paints.orderedSolidStack.visiblePaintIndices,
            capability: primitiveAppearance.paints.orderedSolidStack.capability,
            runtimeOwner: primitiveAppearance.paints.orderedSolidStack.runtimeOwner,
            fallbackReasons: primitiveAppearance.paints.orderedSolidStack.fallbackReasons,
            provenance: primitiveAppearance.paints.orderedSolidStack.provenance,
          })
        : undefined}
      data-package-ordered-normal-paint-stack={primitiveAppearance.paints.orderedNormalPaintStack
        ? JSON.stringify(primitiveAppearance.paints.orderedNormalPaintStack)
        : undefined}
      data-package-linear-gradient={primitiveAppearance.paints.routedLayerIndex === null
        ? undefined
        : (() => {
            const gradient = primitiveAppearance.paints.layers.find(
              (layer) => layer.sourceIndex === primitiveAppearance.paints.routedLayerIndex,
            )?.linearGradient;
            return gradient ? JSON.stringify({
              schemaVersion: gradient.schemaVersion,
              sourceIndex: gradient.sourceIndex,
              coordinateSpace: gradient.coordinateSpace,
              sourceMatrix: gradient.sourceMatrix,
              determinant: gradient.determinant,
              inverseMatrix: gradient.inverseMatrix,
              inversionCount: gradient.inversionCount,
              normalizedHandles: gradient.normalizedHandles,
              templateHandles: gradient.templateHandles,
              svgGradientTransform: gradient.svgGradientTransform,
              stops: gradient.stops,
              paintOpacity: gradient.paintOpacity,
              capability: gradient.capability,
              runtimeOwner: gradient.runtimeOwner,
              fallbackReason: gradient.fallbackReason,
              sourceRevision: gradient.sourceRevision,
              geometryRevision: gradient.geometryRevision,
              provenance: gradient.provenance,
            }) : undefined;
          })()}
      data-package-primitive-stroke-order={primitiveAppearance.strokes.layers.map((layer) => `${layer.sourceIndex}:${layer.type}:${layer.alignment ?? "UNKNOWN"}`).join(",") || undefined}
      data-package-primitive-stroke-strategy={primitiveAppearance.strokes.renderStrategy}
      data-package-primitive-stroke-geometry={primitiveAppearance.strokes.routedLayerIndex === null
        ? undefined
        : (() => {
            const stroke = primitiveAppearance.strokes.layers.find(
              (layer) => layer.sourceIndex === primitiveAppearance.strokes.routedLayerIndex,
            );
            return stroke ? JSON.stringify({
              alignment: stroke.alignment,
              weight: stroke.weight,
              sourcePathBounds: stroke.sourcePathBounds,
              fillBounds: stroke.fillBounds,
              centerPathBounds: stroke.centerPathBounds,
              innerStrokeBounds: stroke.innerStrokeBounds,
              outerStrokeBounds: stroke.outerStrokeBounds,
              visualStrokeBounds: stroke.visualStrokeBounds,
              cornerGeometry: stroke.cornerGeometry,
            }) : undefined;
          })()}
      data-package-primitive-fallbacks={primitiveAppearance.fallbackReasons.join(",") || undefined}
      data-package-image-render-mode={
        resolvedNode?.image?.renderMode
      }
      data-package-image-scale-mode={resolvedNode?.image?.scaleMode}
      data-package-image-active-state={resolvedNode?.image?.activePlacementState}
      data-package-image-placement-revision={resolvedNode?.image?.placementRevision}
      data-package-image-crop-mode={resolvedNode?.image?.cropMode}
      data-package-image-object-position={resolvedNode?.image?.objectPosition}
      data-package-image-placement-schema={resolvedNode?.image?.placement.schemaVersion}
      data-package-image-placement-strategy={imageGeometry?.strategy}
      data-package-image-coordinate-space={resolvedNode?.image?.placement.coordinateSpace}
      data-package-image-source-transform={resolvedNode?.image?.placement.sourceTransform
        ? JSON.stringify(resolvedNode.image.placement.sourceTransform)
        : undefined}
      data-package-image-transform-origin={resolvedNode?.image?.placement.transformOrigin}
      data-package-image-transform-applicability={resolvedNode?.image?.placement.transformApplicability}
      data-package-image-compatibility-crop-zoom={resolvedNode?.image?.placement.compatibilityCropZoom}
      data-package-image-compatibility-crop-axis={resolvedNode?.image?.placement.compatibilityCropAxis ?? undefined}
      data-package-image-sampling={resolvedNode?.image?.placement.sampling.backend}
      data-package-image-placement-fallback={imageGeometry?.fallbackReason ?? undefined}
      data-package-image-visible-source-rect={imageGeometry
        ? JSON.stringify(imageGeometry.visibleSourceRect)
        : undefined}
      data-package-image-visible-source-polygon={imageGeometry
        ? JSON.stringify(imageGeometry.visibleSourcePolygon)
        : undefined}
      data-package-image-destination-bounds={imageGeometry
        ? JSON.stringify(imageGeometry.destinationBounds)
        : undefined}
      data-package-image-crop-percent={imageGeometry
        ? JSON.stringify(imageGeometry.cropPercent)
        : undefined}
      data-package-image-preserves-aspect-ratio={imageGeometry
        ? String(imageGeometry.preservesAspectRatio)
        : undefined}
      data-package-image-intrinsic-size={
        resolvedNode?.image?.assetWidth && resolvedNode.image.assetHeight
          ? `${resolvedNode.image.assetWidth}x${resolvedNode.image.assetHeight}`
          : undefined
      }
      data-package-leading-trim={resolvedText?.leadingTrim ?? undefined}
      data-package-hug-text-measured={
        resolvedText?.leadingTrim === "cap-height"
          ? String(intrinsicTextGeometry?.height ?? "pending")
          : undefined
      }
      data-package-text-trim-mode={intrinsicTextGeometry?.verticalTrim}
      data-package-text-trim-authority={intrinsicTextGeometry?.trimAuthority}
      data-package-text-font-state={intrinsicTextGeometry?.fontState}
      data-package-text-requested-font-family={resolvedText?.runtimeFontFamily ? resolvedText.fontFamily ?? undefined : undefined}
      data-package-text-runtime-font-family={resolvedText?.runtimeFontFamily ?? undefined}
      data-package-text-font-binary-hash={resolvedText?.fontBinaryHash ?? undefined}
      data-package-text-font-face-index={resolvedText?.fontFaceIndex ?? undefined}
      data-package-text-font-classification={resolvedText?.fontClassification ?? undefined}
      data-package-text-metric-source={intrinsicTextGeometry?.metricSource}
      data-package-text-layout-box={intrinsicTextGeometry
        ? `${intrinsicTextGeometry.boxes.layout.width},${intrinsicTextGeometry.boxes.layout.height}`
        : undefined}
      data-package-text-browser-line-box={intrinsicTextGeometry
        ? `${intrinsicTextGeometry.boxes.browserLine.width},${intrinsicTextGeometry.boxes.browserLine.height}`
        : undefined}
      data-package-text-trimmed-box={intrinsicTextGeometry?.boxes.figmaTrimmed
        ? `${intrinsicTextGeometry.boxes.figmaTrimmed.width},${intrinsicTextGeometry.boxes.figmaTrimmed.height}`
        : undefined}
      data-package-text-glyph-paint-bounds={intrinsicTextGeometry?.boxes.glyphPaint
        ? `${intrinsicTextGeometry.boxes.glyphPaint.top},${intrinsicTextGeometry.boxes.glyphPaint.bottom}`
        : undefined}
      data-package-text-clipping-box={intrinsicTextGeometry
        ? `${intrinsicTextGeometry.boxes.clipping.width},${intrinsicTextGeometry.boxes.clipping.height}`
        : undefined}
      data-package-text-clipping-active={intrinsicTextGeometry?.boxes.clipping.active ? "true" : "false"}
      data-package-text-font-metrics={intrinsicTextGeometry
        ? JSON.stringify(intrinsicTextGeometry.fontMetrics)
        : undefined}
      data-package-text-glyph-origin={intrinsicTextGeometry?.glyphOrigin
        ? JSON.stringify(intrinsicTextGeometry.glyphOrigin)
        : undefined}
      data-package-text-paint-offset-y={intrinsicTextGeometry
        ? intrinsicTextGeometry.paintOffsetY
        : undefined}
      data-package-text-vertical-alignment-mode={node.type === "TEXT"
        ? resolveVerticalTextPaintPlacement({
            authoritativeTrim:
              intrinsicTextGeometry?.trimAuthority === "authoritative",
            sizingMode: node.sizing.vertical.mode,
            verticalAlignment: resolvedText?.alignVertical ??
              ("characters" in node.text
                ? node.text.textAlignVertical
                : node.text.style.textAlignVertical),
          }).alignmentMode
        : undefined}
      data-package-runtime-ownership={runtime?.mode === "authoritative" ? runtime.route.nodes[node.id]?.ownership : "compatibility-authoritative"}
      data-package-runtime-settlement={runtime?.settled.settlementId}
      data-package-image-asset={resolvedNode?.image?.assetId ?? undefined}
      data-package-vector-asset={resolvedNode?.vector?.assetId ?? undefined}
      data-package-asset-source={
        resolvedNode?.image?.source
          ? "image"
          : resolvedNode?.vector?.source
            ? "vector"
            : undefined
      }
      data-package-field-marker={
        resolvedNode?.fieldMarkers.join(",") || undefined
      }
      data-package-font-family={
        resolvedNode?.text?.fontFamily ?? undefined
      }
      data-package-font-postscript={
        resolvedNode?.text?.fontPostScriptName ?? undefined
      }
      data-package-font-status={
        resolvedNode?.text?.fontStatus !== "specified"
          ? resolvedNode?.text?.fontStatus
          : undefined
      }
      data-package-font-fallback={
        resolvedNode?.text?.fontStatus !== "specified"
          ? resolvedNode?.text?.fallbackFamily
          : undefined
      }
      data-package-overflow-behavior={
        packageValue.editableFields.find(
          (field) =>
            field.nodeId === node.id &&
            field.property === "text.characters",
        )?.behavior?.onOverflow
      }
      data-package-live-resize-containment={
        isLiveResizeConstraintContainer ? "clip" : undefined
      }
      data-package-clips-content={
        clipping.clipsContent ? "true" : undefined
      }
      data-package-clip-source={
        clipping.usesLiveContainment
          ? "live-containment"
          : clipping.usesRawEditorFallback
            ? "figma-raw"
            : clipping.normalizedClip
              ? "normalized"
              : undefined
      }
      data-package-mask-fallback={
        affectedMask
          ? exactMaskApplication
            ? undefined
            : affectedMask.relationship.capability
          : clipping.isMask
            ? "unsupported"
            : undefined
      }
      data-package-mask-relationship={affectedMask?.relationship.relationshipId}
      data-package-mask-revision={affectedMask?.relationship.maskRevision}
      data-package-mask-source-id={affectedMask?.relationship.maskSourceId}
      data-package-mask-type={affectedMask?.relationship.maskType}
      data-package-mask-capability={affectedMask?.relationship.capability}
      data-package-mask-render-strategy={affectedMask?.relationship.renderStrategy}
      data-package-mask-clip-insets={exactMaskApplication?.affected?.clipInsets
        ? JSON.stringify(exactMaskApplication.affected.clipInsets)
        : undefined}
      data-package-mask-parent-relationships={parentMaskRelationships.length
        ? parentMaskRelationships.map((relationship) => relationship.relationshipId).join(",")
        : undefined}
      data-package-mask-input-node-ids={parentMaskRelationships.length
        ? parentMaskRelationships.map((relationship) => relationship.maskSourceId).join(",")
        : undefined}
      data-package-mask-paint-role={parentMaskRelationships.length ? "mask-input" : undefined}
      data-package-constraint-horizontal={
        constraintResolution?.horizontal.effective ??
        constraintResolution?.horizontal.normalized ??
        constraintResolution?.horizontal.raw ??
        undefined
      }
      data-package-constraint-vertical={
        constraintResolution?.vertical.effective ??
        constraintResolution?.vertical.normalized ??
        constraintResolution?.vertical.raw ??
        undefined
      }
      data-package-constraint-horizontal-raw={
        constraintResolution?.horizontal.raw ?? undefined
      }
      data-package-constraint-vertical-raw={
        constraintResolution?.vertical.raw ?? undefined
      }
      data-package-constraint-horizontal-normalized={
        constraintResolution?.horizontal.normalized ?? undefined
      }
      data-package-constraint-vertical-normalized={
        constraintResolution?.vertical.normalized ?? undefined
      }
      data-package-constraint-stretch-active={
        constraintResolution
          ? [
              constraintResolution.horizontal.effective === "LEFT_RIGHT"
                ? "horizontal"
                : null,
              constraintResolution.vertical.effective === "TOP_BOTTOM"
                ? "vertical"
                : null,
            ]
              .filter(Boolean)
              .join(",") || undefined
          : undefined
      }
      data-package-constraint-sizing-override={
        constraintResolution
          ? [
              constraintResolution.horizontal.overriddenBySizingIntent
                ? "horizontal"
                : null,
              constraintResolution.vertical.overriddenBySizingIntent
                ? "vertical"
                : null,
            ]
              .filter(Boolean)
              .join(",") || undefined
          : undefined
      }
      data-package-constraint-horizontal-offsets={
        constraintResolution &&
        constraintResolution.horizontal.exportedStartOffset !== null &&
        constraintResolution.horizontal.exportedEndOffset !== null
          ? `${constraintResolution.horizontal.exportedStartOffset},${constraintResolution.horizontal.exportedEndOffset}`
          : undefined
      }
      data-package-constraint-vertical-offsets={
        constraintResolution &&
        constraintResolution.vertical.exportedStartOffset !== null &&
        constraintResolution.vertical.exportedEndOffset !== null
          ? `${constraintResolution.vertical.exportedStartOffset},${constraintResolution.vertical.exportedEndOffset}`
          : undefined
      }
      data-package-constraint-fallback={
        constraintResolution?.usedFallback ? "snapshot-and-clip" : undefined
      }
      data-package-constraint-resolution={
        constraintResolution
          ? constraintResolution.usedFallback
            ? "partial-or-fallback"
            : "constraints"
          : undefined
      }
      data-package-auto-layout-container={
        (resolvedNode?.layout.mode ?? node.layout.mode) !== "NONE"
          ? resolvedNode?.layout.mode ?? node.layout.mode
          : undefined
      }
      data-package-quality-highlight={
        isHighlighted ? "true" : undefined
      }
      style={style}
    >
      {primitiveSvgContent}
      {imageContent}
      {content}
      {fallbackPlaceholder}
      {debugOverlay ? (
        <span
          data-package-debug-overlay={node.id}
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            zIndex: 2147483647,
            maxWidth: "calc(100% - 4px)",
            padding: "2px 4px",
            borderRadius: 2,
            background: "rgba(0, 0, 0, 0.72)",
            color: "#fff",
            font: "10px/1.25 monospace",
            whiteSpace: "normal",
            pointerEvents: "none",
          }}
        >
          {`${node.id} · ${resolvedNode?.name ?? node.name} · ${node.type} · ${resolvedNode?.bounds.relative.width ?? node.bounds.relative.width}×${resolvedNode?.bounds.relative.height ?? node.bounds.relative.height} · ${resolvedNode?.layout.mode ?? node.layout.mode}${resolvedNode?.fieldMarkers.length ? ` · ${resolvedNode.fieldMarkers.join(", ")}` : ""}`}
        </span>
      ) : null}
      {isHighlighted ? (
        <span
          aria-hidden="true"
          data-package-quality-highlight-overlay={node.id}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2147483646,
            border:
              "calc(3px * var(--preview-inverse-scale, 1)) solid rgba(217, 79, 23, 1)",
            boxShadow:
              "0 0 0 calc(9999px * var(--preview-inverse-scale, 1)) rgb(23 23 23 / var(--preview-dim-opacity, 0)), inset 0 0 0 calc(2px * var(--preview-inverse-scale, 1)) rgba(255,255,255,0.96), 0 0 0 calc(2px * var(--preview-inverse-scale, 1)) rgba(23,23,23,0.9), 0 0 0 calc(6px * var(--preview-inverse-scale, 1)) rgba(217,79,23,0.55)",
            pointerEvents: "none",
            boxSizing: "border-box",
          }}
        />
      ) : null}
      {childNodes.map(({ sourceNode: child, resolvedNode: resolvedChild }) => (
        <PackageNodeRenderer
          key={child.id}
          node={child}
          packageValue={packageValue}
          parentLayoutMode={
            resolvedNode?.layout.mode ?? node.layout.mode
          }
          mode={mode}
          parentConstraintBounds={
            providesLiveConstraintContext
              ? resolvedNode?.bounds.relative ?? node.bounds.relative
              : undefined
          }
          resolvedTree={resolvedTree}
          resolvedNode={resolvedChild}
          debugOverlay={debugOverlay}
          highlightNodeId={highlightNodeId}
          highlightNodeIds={highlightNodeIds}
          motionTransforms={motionTransforms}
          runtime={runtime}
        />
      ))}
    </div>
  );
}

export function TemplatePackageRenderer({
  packageValue,
  mode = "static",
  resolvedTree: suppliedResolvedTree,
  debugOverlay = false,
  highlightNodeId,
  highlightNodeIds = [],
  motionTimeMs = 0,
  motionRenderMode = "playback",
  onAssetLoadError,
  onRenderIdentity,
}: TemplatePackageRendererProps) {
  let resolvedTree = suppliedResolvedTree;
  let primitiveTreeStatus: "current" | "recomputed-stale" = "current";
  let maskTreeStatus: "not-applicable" | "current" | "recomputed-stale" = packageValue.maskRelationships
    ? "current"
    : "not-applicable";
  const primitiveTreeStale = Boolean(
    suppliedResolvedTree &&
    suppliedResolvedTree.primitiveTreeRevision !== primitiveTreeRevision(packageValue),
  );
  if (primitiveTreeStale) primitiveTreeStatus = "recomputed-stale";
  let maskTreeStale = false;
  if (suppliedResolvedTree && packageValue.maskRelationships) {
    const currentMaskRevisions = resolvePackageMaskRelationships(packageValue).relationships
      .map((relationship) => relationship.maskRevision);
    const resolvedMaskRevisions = (suppliedResolvedTree.maskRelationships ?? [])
      .map((relationship) => relationship.maskRevision);
    if (JSON.stringify(currentMaskRevisions) !== JSON.stringify(resolvedMaskRevisions)) {
      maskTreeStale = true;
      maskTreeStatus = "recomputed-stale";
    }
  }
  if (primitiveTreeStale || maskTreeStale) {
    resolvedTree = createResolvedRenderTree(packageValue);
  }
  if (resolvedTree === undefined) {
    try {
      resolvedTree = createResolvedRenderTree(packageValue);
    } catch {
      resolvedTree = null;
    }
  }
  const rootId = resolvedTree?.rootNodeId ?? packageValue.rootNodeId;
  const root = packageValue.nodes[rootId];
  const resolvedRoot = resolvedTree?.nodes[rootId];
  const runtime = useCoreLayoutRuntime(packageValue);
  const productRenderIdentity = useMemo(
    () => resolvedTree
      ? createResolvedProductRenderIdentity({ packageValue, resolvedTree, runtime })
      : null,
    [
      packageValue,
      resolvedTree,
      runtime.revision,
      runtime.canonicalRevision,
      runtime.settled.settlementId,
      runtime.settled.revision,
      runtime.settled.readiness,
    ],
  );
  useEffect(() => {
    if (productRenderIdentity) onRenderIdentity?.(productRenderIdentity);
  }, [onRenderIdentity, productRenderIdentity]);
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    Object.defineProperty(canvas, "__packageRuntimeTelemetry", {
      configurable: true,
      value: {
        settlementMs: runtime.settled.settlementMs,
        iterationCount: runtime.settled.iterationCount,
        measurementCount: runtime.settled.measurementCount,
        recomputedNodeIds: runtime.settled.recomputedNodeIds,
        fallbackBoundaries: runtime.settled.fallbackBoundaries,
        backendDecisionRevision: resolvedTree?.backendDecisionRevision ?? null,
        backendAvailability: resolvedTree?.backendAvailability ?? null,
        backendDecisions: resolvedTree?.nodeOrder.map(
          (nodeId) => resolvedTree.nodes[nodeId].backendDecision,
        ) ?? [],
        productRenderIdentity,
      },
    });
    return () => {
      delete (canvas as HTMLDivElement & { __packageRuntimeTelemetry?: unknown }).__packageRuntimeTelemetry;
    };
  }, [productRenderIdentity, resolvedTree, runtime.settled]);
  const finalMotionTimeMs =
    motionRenderMode === "final-frame"
      ? getPackageMotionFinalFrameTimeMs(packageValue)
      : null;
  const motionTransforms =
    !packageValue.motion || motionRenderMode === "disabled"
      ? {}
      : motionRenderMode === "final-frame"
        ? finalMotionTimeMs === null
          ? {}
          : evaluatePackageMotion(packageValue, finalMotionTimeMs, {
              mode: "clamped",
            })
        : evaluatePackageMotion(packageValue, motionTimeMs);
  const imagePreloads = resolvedTree
    ? Object.values(resolvedTree.nodes).filter(
        (
          node,
        ): node is ResolvedRenderNode & {
          image: NonNullable<ResolvedRenderNode["image"]>;
        } => Boolean(node.image?.assetId && node.image.source),
      )
    : [];
  return (
    <div
      ref={canvasRef}
      data-template-package-canvas={packageValue.packageId}
      data-package-motion-render-mode={motionRenderMode}
      data-resolved-render-tree={
        resolvedTree?.schemaVersion ?? "package-fallback"
      }
      data-package-runtime-routing="authoritative"
      data-package-product-render-identity={productRenderIdentity?.identityId}
      data-package-product-package-revision={productRenderIdentity?.packageRevision}
      data-package-product-canonical-revision={productRenderIdentity?.canonicalRevision}
      data-package-product-resolved-revision={productRenderIdentity?.resolvedRevision}
      data-package-product-backend-revision={productRenderIdentity?.backendDecisionRevision}
      data-package-product-settlement-revision={productRenderIdentity?.settlementRevision}
      data-package-product-font-revision={productRenderIdentity?.fontRevision}
      data-package-product-asset-revision={productRenderIdentity?.assetRevision}
      data-package-product-placement-revision={productRenderIdentity?.placementRevision}
      data-package-product-export-safety={productRenderIdentity?.exportSafety}
      data-package-settlement-id={runtime.settled.settlementId}
      data-package-settlement-revision={runtime.revision}
      data-package-settlement-readiness={runtime.settled.readiness}
      data-package-routed-node-count={runtime.settled.routedNodeCount}
      data-package-compatibility-node-count={runtime.settled.compatibilityNodeCount}
      data-package-settlement-iterations={runtime.settled.iterationCount}
      data-package-settlement-measurements={runtime.settled.measurementCount}
      data-package-settlement-recomputed={runtime.settled.recomputedNodeIds.join(",")}
      data-package-settlement-fallbacks={runtime.settled.fallbackBoundaries.map((boundary) => `${boundary.nodeId}:${boundary.reasonCodes.join("+")}`).join(",") || undefined}
      data-package-mask-tree-status={maskTreeStatus}
      data-package-primitive-tree-status={primitiveTreeStatus}
      data-package-primitive-tree-revision={resolvedTree?.primitiveTreeRevision}
      data-package-primitive-canvas-revision={resolvedTree?.primitiveCanvas.revision}
      data-package-primitive-canvas-source={resolvedTree?.primitiveCanvas.sourceKind}
      style={{
        width: resolvedTree?.canvas.width ?? packageValue.canvas.width,
        height: resolvedTree?.canvas.height ?? packageValue.canvas.height,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        background:
          resolvedTree?.primitiveCanvas.cssBackground ??
          resolvePrimitiveCanvasAuthority(packageValue).cssBackground ??
          canvasBackgroundToCss(packageValue.canvas.background),
        fontSynthesis: "none",
      }}
    >
      {root ? (
        <PackageNodeRenderer
          node={root}
          packageValue={packageValue}
          parentLayoutMode="NONE"
          mode={mode}
          isRoot
          resolvedTree={resolvedTree}
          resolvedNode={resolvedRoot}
          debugOverlay={debugOverlay}
          highlightNodeId={highlightNodeId}
          highlightNodeIds={highlightNodeIds}
          motionTransforms={motionTransforms}
          runtime={runtime}
        />
      ) : null}
      {onAssetLoadError
        ? imagePreloads.map((node) => (
            <img
              key={`asset-preload:${node.id}:${node.image.assetId}`}
              src={node.image.source ?? undefined}
              alt=""
              aria-hidden="true"
              data-package-asset-preload={node.image.assetId ?? undefined}
              onError={() =>
                onAssetLoadError(node.image.assetId!, node.id)
              }
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
              }}
            />
          ))
        : null}
    </div>
  );
}
