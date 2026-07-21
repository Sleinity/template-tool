import type { ResolvedRenderTreeV1 } from "../resolved";

export interface PreviewViewportSize {
  width: number;
  height: number;
}

export interface PreviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewViewportTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export type PreviewFocusMode = "template" | "target" | "manual";

export const PREVIEW_MIN_SCALE = 0.02;
export const PREVIEW_MAX_SCALE = 4;

export function resolveInspectionTargetBounds(
  targetRect: { left: number; top: number; width: number; height: number },
  canvasRect: { left: number; top: number },
  scale: { x: number; y: number },
  textGeometry?: { trimAuthority?: string; trimmedBox?: string },
): PreviewBounds {
  const trimmed = textGeometry?.trimAuthority === "authoritative"
    ? textGeometry.trimmedBox?.split(",").map(Number)
    : null;
  const semanticHeight = trimmed?.length === 2 && Number.isFinite(trimmed[1])
    ? trimmed[1]
    : null;
  return {
    x: (targetRect.left - canvasRect.left) / scale.x,
    y: (targetRect.top - canvasRect.top) / scale.y,
    width: targetRect.width / scale.x,
    height: semanticHeight ?? targetRect.height / scale.y,
  };
}

export function validPreviewBounds(
  bounds: PreviewBounds | null | undefined,
): bounds is PreviewBounds {
  return Boolean(
    bounds &&
      Number.isFinite(bounds.x) &&
      Number.isFinite(bounds.y) &&
      Number.isFinite(bounds.width) &&
      Number.isFinite(bounds.height) &&
      bounds.width > 0 &&
      bounds.height > 0,
  );
}

export function unionPreviewBounds(
  bounds: Array<PreviewBounds | null | undefined>,
): PreviewBounds | null {
  const valid = bounds.filter(validPreviewBounds);
  if (valid.length === 0) return null;
  const left = Math.min(...valid.map((item) => item.x));
  const top = Math.min(...valid.map((item) => item.y));
  const right = Math.max(...valid.map((item) => item.x + item.width));
  const bottom = Math.max(...valid.map((item) => item.y + item.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function expandPreviewBounds(
  bounds: PreviewBounds,
  ratio = 0.18,
  minimumTemplatePadding = 24,
): PreviewBounds {
  const horizontal = Math.max(minimumTemplatePadding, bounds.width * ratio);
  const vertical = Math.max(minimumTemplatePadding, bounds.height * ratio);
  return {
    x: bounds.x - horizontal,
    y: bounds.y - vertical,
    width: bounds.width + horizontal * 2,
    height: bounds.height + vertical * 2,
  };
}

export function clampPreviewScale(
  scale: number,
  minimum = PREVIEW_MIN_SCALE,
  maximum = PREVIEW_MAX_SCALE,
): number {
  return Math.min(maximum, Math.max(minimum, scale));
}

export function fitPreviewBounds(
  viewport: PreviewViewportSize,
  bounds: PreviewBounds,
  options: {
    safePadding?: number;
    minimumScale?: number;
    maximumScale?: number;
  } = {},
): PreviewViewportTransform {
  const safePadding = options.safePadding ?? 24;
  const availableWidth = Math.max(1, viewport.width - safePadding * 2);
  const availableHeight = Math.max(1, viewport.height - safePadding * 2);
  const scale = clampPreviewScale(
    Math.min(availableWidth / bounds.width, availableHeight / bounds.height),
    options.minimumScale,
    options.maximumScale,
  );
  return {
    scale,
    translateX: viewport.width / 2 - (bounds.x + bounds.width / 2) * scale,
    translateY: viewport.height / 2 - (bounds.y + bounds.height / 2) * scale,
  };
}

export function previewVisibleCenter(
  viewport: PreviewViewportSize,
  transform: PreviewViewportTransform,
): { x: number; y: number } {
  return {
    x: (viewport.width / 2 - transform.translateX) / transform.scale,
    y: (viewport.height / 2 - transform.translateY) / transform.scale,
  };
}

export function zoomPreviewAtPoint(
  viewport: PreviewViewportSize,
  transform: PreviewViewportTransform,
  focalPoint: { x: number; y: number },
  factor: number,
  options: { minimumScale?: number; maximumScale?: number } = {},
): PreviewViewportTransform {
  const scale = clampPreviewScale(
    transform.scale * factor,
    options.minimumScale,
    options.maximumScale,
  );
  return {
    scale,
    translateX: viewport.width / 2 - focalPoint.x * scale,
    translateY: viewport.height / 2 - focalPoint.y * scale,
  };
}

export function preservePreviewCenterOnResize(
  previousViewport: PreviewViewportSize,
  nextViewport: PreviewViewportSize,
  transform: PreviewViewportTransform,
): PreviewViewportTransform {
  const centre = previewVisibleCenter(previousViewport, transform);
  return {
    ...transform,
    translateX: nextViewport.width / 2 - centre.x * transform.scale,
    translateY: nextViewport.height / 2 - centre.y * transform.scale,
  };
}

export function resolvePreviewTargetBounds(
  tree: ResolvedRenderTreeV1,
  targetNodeIds: string[],
): PreviewBounds | null {
  return unionPreviewBounds(resolvePreviewTargetBoundsList(tree, targetNodeIds));
}

export function resolvePreviewTargetBoundsList(
  tree: ResolvedRenderTreeV1,
  targetNodeIds: string[],
): PreviewBounds[] {
  const root = tree.nodes[tree.rootNodeId];
  const rootOrigin = root?.bounds.absolute ?? { x: 0, y: 0 };
  return targetNodeIds
    .map((nodeId) => {
      const node = tree.nodes[nodeId];
      if (!node) return null;
      return {
        x: node.bounds.absolute.x - rootOrigin.x,
        y: node.bounds.absolute.y - rootOrigin.y,
        width: node.bounds.absolute.width,
        height: node.bounds.absolute.height,
      };
    })
    .filter(validPreviewBounds);
}
