import type {
  LoadedSourceDiagnosticLayerId,
  LoadedSourceLayeredDiagnostic,
} from "../bundle";
import type {
  PackageQualityCategory,
  PackageQualityIssue,
  PackageQualityLayer,
  PackageQualityOrigin,
} from "./types";

export interface LoadedSourceQualityIssueInput
  extends Omit<
    PackageQualityIssue,
    | "id"
    | "fingerprint"
    | "origins"
    | "nodeName"
    | "layerPath"
  > {
  origin: PackageQualityOrigin;
  nodeName?: string;
  layerPath?: string;
}

const categoryByLayer: Record<
  LoadedSourceDiagnosticLayerId,
  PackageQualityCategory
> = {
  "package-structure": "package",
  "json-parsing": "package",
  "source-contract": "source",
  "canvas-root": "package",
  "node-graph": "node-graph",
  "geometry-bounds": "node-graph",
  "asset-references": "assets",
  "editable-fields": "fields",
  "font-requirements": "fonts",
  "motion-links": "motion",
  "mcp-links": "source",
  "preview-reference": "preview",
  "render-readiness": "renderer",
};

function whyItMatters(category: PackageQualityCategory): string {
  if (category === "package" || category === "node-graph") {
    return "The template may not open or display correctly.";
  }
  if (category === "source") {
    return "The template may not match the design it was exported from.";
  }
  if (category === "assets") {
    return "Images or graphics may be missing from the preview and export.";
  }
  if (category === "fonts") {
    return "Text may wrap, resize, or look different from the original design.";
  }
  if (category === "fields") {
    return "The affected content may not be editable.";
  }
  if (category === "motion") {
    return "The animated preview may look different or skip part of the motion.";
  }
  if (category === "preview") {
    return "Visual comparison is unavailable, but the template can still be used.";
  }
  return "The template can continue, but the preview may differ from the original design.";
}

function fileFromPath(path: string | undefined): string | undefined {
  if (!path || path.startsWith("/")) return undefined;
  const firstSegment = path.split("/")[0];
  return firstSegment.includes(".") ? firstSegment : undefined;
}

export function qualityCategoryForLoadedSourceLayer(
  layer: LoadedSourceDiagnosticLayerId,
): PackageQualityCategory {
  return categoryByLayer[layer];
}

export function adaptLoadedSourceDiagnostic(
  diagnostic: LoadedSourceLayeredDiagnostic,
): LoadedSourceQualityIssueInput {
  const defaultCategory = qualityCategoryForLoadedSourceLayer(diagnostic.layer);
  const category: PackageQualityCategory = /^(ASSET_|IMAGE_|SVG_|LARGE_ASSET)/i.test(
    diagnostic.code,
  )
    ? "assets"
    : /^FONT_/i.test(diagnostic.code)
      ? "fonts"
      : /^MOTION_/i.test(diagnostic.code)
        ? "motion"
        : /^PREVIEW_/i.test(diagnostic.code)
          ? "preview"
          : defaultCategory;
  return {
    origin: diagnostic.origin,
    code: diagnostic.code,
    severity: diagnostic.severity,
    category,
    layer: diagnostic.layer as PackageQualityLayer,
    message: diagnostic.message,
    whyItMatters: whyItMatters(category),
    suggestedFix: diagnostic.suggestion,
    blocks: diagnostic.blocksImport ? ["import"] : [],
    blocksImport: diagnostic.blocksImport,
    path: diagnostic.path,
    file: fileFromPath(diagnostic.path),
    nodeId: diagnostic.nodeId,
    sourceNodeId: diagnostic.sourceNodeId,
    fieldId: diagnostic.fieldId,
    assetId: diagnostic.assetId,
    ref: diagnostic.ref,
    relatedIds: diagnostic.relatedIds,
    details: diagnostic.details,
  };
}

export function adaptLoadedSourceDiagnostics(
  diagnostics: LoadedSourceLayeredDiagnostic[],
): LoadedSourceQualityIssueInput[] {
  return diagnostics.map(adaptLoadedSourceDiagnostic);
}
