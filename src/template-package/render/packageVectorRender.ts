import type { CSSProperties } from "react";
import type {
  PackageAsset,
  PackageRect,
  PackageVectorPayload,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import { resolvePackageAssetReference } from "../assets/packageAssetResolution";

export interface PackageVectorRenderModel {
  asset: PackageAsset | undefined;
  source: string | null;
  style: CSSProperties;
  viewBox: string | null;
  preserveAspectRatio: string | null;
  usesSvgString: boolean;
  contentBounds: PackageRect | null;
}

export interface PackageVectorCompatibilityIssue {
  code: string;
  message: string;
}

const SVG_DATA_URL = /^data:image\/svg\+xml(?:;[^,]*)?,/i;
const REMOTE_URL = /^https?:\/\//i;
const MANAGED_URL = /^(?:blob:|https?:\/\/|data:image\/svg\+xml)/i;

function isSvgMarkup(value: string): boolean {
  return /^\s*<svg(?:\s|>)/i.test(value);
}

function isVectorAsset(asset: PackageAsset | undefined): boolean {
  return Boolean(
    asset &&
      (asset.type === "svg" ||
        asset.type === "vector" ||
        asset.mimeType?.toLowerCase() === "image/svg+xml"),
  );
}

function svgStringSource(
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
      if (viewBox && !/\sviewBox=/i.test(next)) {
        next += ` viewBox="${viewBox}"`;
      }
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

function fallbackAssetSource(asset: PackageAsset | undefined): string | null {
  if (!asset) return null;
  if (asset.stableUrl && MANAGED_URL.test(asset.stableUrl)) {
    return asset.stableUrl;
  }
  if (asset.url && REMOTE_URL.test(asset.url)) return asset.url;
  if (asset.dataUrl && SVG_DATA_URL.test(asset.dataUrl)) return asset.dataUrl;
  if (asset.data && SVG_DATA_URL.test(asset.data)) return asset.data;
  return null;
}

function formatViewBox(
  viewBox: PackageVectorPayload["viewBox"],
  assetViewBox: string | undefined,
): string | null {
  if (typeof viewBox === "string") return viewBox;
  if (viewBox) {
    return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
  }
  return assetViewBox ?? null;
}

function validContentBounds(bounds: PackageRect | null | undefined): PackageRect | null {
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

export function resolvePackageVectorRenderModel(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
): PackageVectorRenderModel | null {
  const vector = node.vector;
  if (!vector || vector.renderMode === "SEMANTIC_SHAPE") return null;
  if (vector.renderMode === "UNSUPPORTED") return null;

  const asset = resolvePackageAssetReference(
    packageValue,
    vector.assetId,
  )?.asset;
  const viewBox = formatViewBox(vector.viewBox, asset?.viewBox);
  const preserveAspectRatio =
    vector.preserveAspectRatio ?? "xMidYMid meet";
  const managedSource =
    asset?.stableUrl && MANAGED_URL.test(asset.stableUrl)
      ? asset.stableUrl
      : null;
  const svgSource = isVectorAsset(asset) && !managedSource
    ? svgStringSource(asset, viewBox, preserveAspectRatio)
    : null;
  const source =
    managedSource ??
    svgSource ??
    (isVectorAsset(asset) ? fallbackAssetSource(asset) : null);
  const contentBounds = validContentBounds(vector.contentBounds);

  return {
    asset,
    source,
    style: {
      display: "block",
      position: contentBounds ? "absolute" : undefined,
      left: contentBounds?.x,
      top: contentBounds?.y,
      width: contentBounds?.width ?? "100%",
      height: contentBounds?.height ?? "100%",
      // The replaced SVG viewport fills the package node. Its own viewBox and
      // preserveAspectRatio remain responsible for internal geometry fitting.
      objectFit: vector.fit === "FIGMA_BOUNDS" ? "fill" : "contain",
    },
    viewBox,
    preserveAspectRatio,
    usesSvgString: svgSource !== null,
    contentBounds,
  };
}

export function collectPackageVectorCompatibilityIssues(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
): PackageVectorCompatibilityIssue[] {
  const vector = node.vector;
  if (!vector) return [];

  const issues: PackageVectorCompatibilityIssue[] = [];
  const isSvgMode =
    vector.renderMode === "SVG_ASSET" ||
    vector.renderMode === "FLATTENED_SVG" ||
    (node.type === "VECTOR" && !vector.renderMode);
  if (!isSvgMode) {
    if (
      vector.renderMode === "SEMANTIC_SHAPE" &&
      node.shape &&
      !["RECTANGLE", "ELLIPSE"].includes(node.shape.type)
    ) {
      issues.push({
        code: "unsupported-semantic-shape",
        message: `Semantic shape "${node.shape.type}" is preserved but not rendered geometrically yet.`,
      });
    }
    if (vector.renderMode === "UNSUPPORTED") {
      issues.push({
        code: "unsupported-vector-render-mode",
        message: "This vector is explicitly marked as unsupported.",
      });
    }
    return issues;
  }

  if (!vector.assetId) {
    issues.push({
      code: "vector-missing-asset-id",
      message: "This SVG vector has no vector.assetId.",
    });
    return issues;
  }

  const asset = resolvePackageAssetReference(
    packageValue,
    vector.assetId,
  )?.asset;
  if (!asset) {
    issues.push({
      code: "vector-asset-not-found",
      message: `Vector asset "${vector.assetId}" does not exist.`,
    });
    return issues;
  }
  if (!isVectorAsset(asset)) {
    issues.push({
      code: "vector-asset-not-svg",
      message: `Asset "${vector.assetId}" is not marked as SVG/vector.`,
    });
    return issues;
  }
  if (
    !svgStringSource(
      asset,
      formatViewBox(vector.viewBox, asset.viewBox),
      vector.preserveAspectRatio,
    ) &&
    !fallbackAssetSource(asset)
  ) {
    issues.push({
      code: "vector-asset-source-missing",
      message: `Vector asset "${vector.assetId}" has no renderable SVG source.`,
    });
  }
  if (!formatViewBox(vector.viewBox, asset.viewBox)) {
    issues.push({
      code: "vector-viewbox-missing",
      message: "The SVG has no package viewBox metadata; intrinsic SVG sizing is used.",
    });
  }
  if (vector.fit && vector.fit !== "FIGMA_BOUNDS") {
    issues.push({
      code: "unsupported-vector-fit",
      message: `Vector fit "${vector.fit}" is unsupported; the renderer falls back to contain.`,
    });
  }
  if (vector.contentBounds && !validContentBounds(vector.contentBounds)) {
    issues.push({
      code: "vector-content-bounds-invalid",
      message:
        "Vector content bounds are non-finite or empty, so the SVG falls back to the package node bounds.",
    });
  }
  if (vector.features?.hasBlendModes) {
    issues.push({
      code: "vector-blend-mode-fidelity",
      message:
        "The SVG contains blend-mode features whose browser output may differ from Figma.",
    });
  }
  return issues;
}
