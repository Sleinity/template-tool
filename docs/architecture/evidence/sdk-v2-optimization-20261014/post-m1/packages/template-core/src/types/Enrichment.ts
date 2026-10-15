import type { PackagePaint } from "./Appearance";
import type { PackageRect } from "./Layout";

export type FigmaMcpStatus =
  | "not_checked"
  | "matched"
  | "changed"
  | "inaccessible"
  | "error";

export interface FigmaMcpSourceMetadata {
  metadataFetchedAt?: string;
  designContextFetchedAt?: string;
  screenshotFetchedAt?: string;
  nodeId?: string;
  status?: FigmaMcpStatus;
}

export type RendererHint =
  | {
      kind: "frame";
      display: "absolute" | "flow";
      layoutMode?: "none" | "horizontal" | "vertical";
      clipContent?: boolean;
      background?: PackagePaint;
    }
  | {
      kind: "text";
      valueSource: "editableField" | "static";
      fieldId?: string;
      fontFamily: string;
      fontWeight: number;
      fontSize: number;
      lineHeightPx: number;
      letterSpacingPx: number;
      alignHorizontal: "left" | "center" | "right";
      alignVertical: "top" | "center" | "bottom";
      autoResize: "none" | "width" | "height" | "widthAndHeight";
      overflow?: "visible" | "clip" | "ellipsis";
    }
  | {
      kind: "image";
      assetId: string;
      objectFit: "cover" | "contain" | "fill";
      figmaScaleMode?: string;
      imageTransform?: number[][];
      cropMode: "figmaImageTransform" | "objectFitOnly" | "unknown";
    }
  | {
      kind: "svg";
      assetId: string;
      viewBox?: PackageRect;
      preserveAspectRatio?: string;
    };

export interface AssetStrategyDiagnostic {
  assetId: string;
  code: string;
  severity: "info" | "warning";
  message: string;
  approximateBytes?: number;
}

export interface AssetStrategy {
  mode: "preserve" | "externalize-recommended";
  embeddedAssetCount: number;
  remoteAssetCount: number;
  totalEmbeddedBytesApprox: number;
  externalizeThresholdBytes: number;
  diagnostics: AssetStrategyDiagnostic[];
}

export interface PackageMetadataDifference {
  code:
    | "missing-in-figma"
    | "missing-in-package"
    | "root-changed"
    | "canvas-changed"
    | "node-count-changed"
    | "name-changed"
    | "parent-changed"
    | "children-changed"
    | "bounds-changed"
    | "field-marker-changed"
    | "font-changed";
  nodeId?: string;
  packageValue?: unknown;
  figmaValue?: unknown;
  message: string;
}

export interface PackageMetadataComparison {
  status: "not_checked" | "matched" | "changed";
  matchedNodeCount: number;
  packageNodeCount: number;
  figmaNodeCount: number;
  differences: PackageMetadataDifference[];
}

export interface McpDesignHint {
  kind:
    | "object-fit"
    | "absolute-center"
    | "space-between"
    | "text-size";
  value: string;
  sourceExcerpt: string;
}

export interface VisualDiffResult {
  score: number;
  mismatchedPixels: number;
  totalPixels: number;
  threshold: number;
  severity: "excellent" | "good" | "review" | "broken";
  diffImageDataUrl?: string;
  issues: string[];
}

export interface VerificationReport {
  metadata?: PackageMetadataComparison;
  designHints?: McpDesignHint[];
  figmaScreenshot?: {
    url?: string;
    dataUrl?: string;
    assetId?: string;
    width?: number;
    height?: number;
  };
  visualDiff?: VisualDiffResult;
  rendererHintCoverage?: {
    hintedNodes: number;
    totalNodes: number;
    percentage: number;
  };
}
