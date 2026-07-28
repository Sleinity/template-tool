import type { CSSProperties } from "react";
import type {
  PackageAsset,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import { resolvePackageAssetReference } from "../assets/packageAssetResolution";
import {
  fallbackAssetSource,
  formatViewBox,
  isVectorAsset,
  resolvePackageVectorModel,
  svgStringSource,
  type PackageVectorModel,
  validContentBounds,
} from "../../../packages/template-core/src/models/packageVectorModel";

export interface PackageVectorRenderModel
  extends Omit<PackageVectorModel, "fit"> {
  style: CSSProperties;
}

export interface PackageVectorCompatibilityIssue {
  code: string;
  message: string;
}

export function resolvePackageVectorRenderModel(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
): PackageVectorRenderModel | null {
  const model = resolvePackageVectorModel(node, packageValue);
  if (!model) return null;
  const { fit, ...portable } = model;
  const { contentBounds } = portable;

  return {
    ...portable,
    style: {
      display: "block",
      position: contentBounds ? "absolute" : undefined,
      left: contentBounds?.x,
      top: contentBounds?.y,
      width: contentBounds?.width ?? "100%",
      height: contentBounds?.height ?? "100%",
      // The replaced SVG viewport fills the package node. Its own viewBox and
      // preserveAspectRatio remain responsible for internal geometry fitting.
      objectFit: fit,
    },
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
