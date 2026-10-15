import type {
  PackageAsset,
  PackageRect,
  PackageVectorPayload,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import { resolvePackageAssetReference } from "../assets/packageAssetResolution";

export interface PackageVectorModel {
  asset: PackageAsset | undefined;
  source: string | null;
  viewBox: string | null;
  preserveAspectRatio: string | null;
  usesSvgString: boolean;
  contentBounds: PackageRect | null;
  fit: "fill" | "contain";
}

const SVG_DATA_URL = /^data:image\/svg\+xml(?:;[^,]*)?,/i;
const REMOTE_URL = /^https?:\/\//i;
const MANAGED_URL = /^(?:blob:|https?:\/\/|data:image\/svg\+xml)/i;

function isSvgMarkup(value: string): boolean {
  return /^\s*<svg(?:\s|>)/i.test(value);
}

export function isVectorAsset(asset: PackageAsset | undefined): boolean {
  return Boolean(
    asset &&
      (asset.type === "svg" ||
        asset.type === "vector" ||
        asset.mimeType?.toLowerCase() === "image/svg+xml"),
  );
}

export function svgStringSource(
  asset: PackageAsset | undefined,
  viewBox?: string | null,
  preserveAspectRatio?: string | null,
): string | null {
  if (!asset?.svgString || !isSvgMarkup(asset.svgString)) return null;
  const normalized = asset.svgString.replace(
    /<svg\b([^>]*)>/i,
    (_match, attributes: string) => {
      let next = attributes
        .replace(/\swidth=(?:"[^"]*"|'[^']*')/i, "")
        .replace(/\sheight=(?:"[^"]*"|'[^']*')/i, "");
      if (viewBox && !/\sviewBox=/i.test(next)) next += ` viewBox="${viewBox}"`;
      if (preserveAspectRatio) {
        if (/\spreserveAspectRatio=/i.test(next)) {
          next = next.replace(
            /\spreserveAspectRatio=(?:"[^"]*"|'[^']*')/i,
            ` preserveAspectRatio="${preserveAspectRatio}"`,
          );
        } else {
          next += ` preserveAspectRatio="${preserveAspectRatio}"`;
        }
      }
      return `<svg${next}>`;
    },
  );
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalized)}`;
}

export function fallbackAssetSource(asset: PackageAsset | undefined): string | null {
  if (!asset) return null;
  if (asset.stableUrl && MANAGED_URL.test(asset.stableUrl)) return asset.stableUrl;
  if (asset.url && REMOTE_URL.test(asset.url)) return asset.url;
  if (asset.dataUrl && SVG_DATA_URL.test(asset.dataUrl)) return asset.dataUrl;
  if (asset.data && SVG_DATA_URL.test(asset.data)) return asset.data;
  return null;
}

export function formatViewBox(
  viewBox: PackageVectorPayload["viewBox"],
  assetViewBox: string | undefined,
): string | null {
  if (typeof viewBox === "string") return viewBox;
  if (viewBox) return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
  return assetViewBox ?? null;
}

export function validContentBounds(bounds: PackageRect | null | undefined): PackageRect | null {
  if (
    !bounds ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return null;
  }
  return bounds;
}

export function resolvePackageVectorModel(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
): PackageVectorModel | null {
  const vector = node.vector;
  if (!vector || vector.renderMode === "SEMANTIC_SHAPE" || vector.renderMode === "UNSUPPORTED") {
    return null;
  }

  const asset = resolvePackageAssetReference(packageValue, vector.assetId)?.asset;
  const viewBox = formatViewBox(vector.viewBox, asset?.viewBox);
  const preserveAspectRatio = vector.preserveAspectRatio ?? "xMidYMid meet";
  const managedSource =
    asset?.stableUrl && MANAGED_URL.test(asset.stableUrl) ? asset.stableUrl : null;
  const svgSource =
    isVectorAsset(asset) && !managedSource
      ? svgStringSource(asset, viewBox, preserveAspectRatio)
      : null;
  const source =
    managedSource ?? svgSource ?? (isVectorAsset(asset) ? fallbackAssetSource(asset) : null);
  const contentBounds = validContentBounds(vector.contentBounds);

  return {
    asset,
    source,
    viewBox,
    preserveAspectRatio,
    usesSvgString: svgSource !== null,
    contentBounds,
    fit: vector.fit === "FIGMA_BOUNDS" ? "fill" : "contain",
  };
}
