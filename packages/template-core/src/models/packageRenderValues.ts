import type {
  PackageAsset,
  PackageColor,
  PackagePaint,
  TemplateNode,
  TemplatePackageV1,
} from "../types";

export interface PackageAxisLimits {
  min: number | undefined;
  max: number | undefined;
  minSource: "normalized" | "figma" | null;
  maxSource: "normalized" | "figma" | null;
  rawMin: unknown;
  rawMax: unknown;
  conflict: boolean;
}

const clampColorChannel = (value: number) => Math.min(1, Math.max(0, value));

export function normalizedColorToCss(
  color: PackageColor,
  opacityMultiplier = 1,
): string {
  const red = Math.round(clampColorChannel(color.r) * 255);
  const green = Math.round(clampColorChannel(color.g) * 255);
  const blue = Math.round(clampColorChannel(color.b) * 255);
  const alpha = clampColorChannel(color.a * opacityMultiplier);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function canvasBackgroundToCss(
  background: TemplatePackageV1["canvas"]["background"],
): string {
  if (typeof background === "string") return background;
  if (background) return normalizedColorToCss(background);
  return "transparent";
}

export function getFirstVisibleSolidPaint(
  paints: PackagePaint[],
): Extract<PackagePaint, { type: "SOLID" }> | undefined {
  return paints.find(
    (paint): paint is Extract<PackagePaint, { type: "SOLID" }> =>
      paint.type === "SOLID" && paint.visible !== false,
  );
}

function isSafeImageDataUrl(value: string): boolean {
  return /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml)(?:;[^,]*)?,/i.test(value);
}

function isSafeManagedAssetUrl(value: string): boolean {
  return (
    /^blob:/i.test(value) ||
    /^https?:\/\//i.test(value) ||
    isSafeImageDataUrl(value)
  );
}

export function resolvePackageAssetSource(
  asset: PackageAsset | undefined,
): string | null {
  if (!asset) return null;
  if (asset.stableUrl && isSafeManagedAssetUrl(asset.stableUrl)) {
    return asset.stableUrl;
  }
  if (asset.url && /^https?:\/\//i.test(asset.url)) return asset.url;
  if (asset.dataUrl && isSafeImageDataUrl(asset.dataUrl)) return asset.dataUrl;
  if (asset.data && isSafeImageDataUrl(asset.data)) return asset.data;
  if (asset.svgString) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svgString)}`;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function figmaMetadata(node: TemplateNode): Record<string, unknown> | null {
  return isRecord(node.extensions?.figma) ? node.extensions.figma : null;
}

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

export function resolvePackageAxisLimits(
  node: TemplateNode,
  axis: "horizontal" | "vertical",
): PackageAxisLimits {
  const figma = figmaMetadata(node);
  const minKey = axis === "horizontal" ? "minWidth" : "minHeight";
  const maxKey = axis === "horizontal" ? "maxWidth" : "maxHeight";
  const rawMin = figma?.[minKey];
  const rawMax = figma?.[maxKey];
  const normalizedMin = finiteNonNegative(node.sizing[axis].min);
  const normalizedMax = finiteNonNegative(node.sizing[axis].max);
  let min = normalizedMin ?? finiteNonNegative(rawMin);
  let max = normalizedMax ?? finiteNonNegative(rawMax);
  let minSource: PackageAxisLimits["minSource"] =
    normalizedMin !== undefined ? "normalized" : min !== undefined ? "figma" : null;
  let maxSource: PackageAxisLimits["maxSource"] =
    normalizedMax !== undefined ? "normalized" : max !== undefined ? "figma" : null;
  const conflict = min !== undefined && max !== undefined && min > max;

  if (conflict) {
    if (minSource === "figma") {
      min = undefined;
      minSource = null;
    }
    if (maxSource === "figma") {
      max = undefined;
      maxSource = null;
    }
  }

  return { min, max, minSource, maxSource, rawMin, rawMax, conflict };
}
