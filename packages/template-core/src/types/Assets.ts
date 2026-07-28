export type PackageAssetType =
  | "image"
  | "svg"
  | "vector"
  | "font"
  | "video"
  | "unknown";
export type PackageAssetSource = "embedded" | "remote" | "stored";

interface PackageAssetBase {
  id: string;
  type: PackageAssetType;
  mimeType?: string;
  source: PackageAssetSource;
  width?: number;
  height?: number;
  hash?: string;
  data?: string;
  dataUrl?: string;
  url?: string;
  storageKey?: string;
  stableUrl?: string;
  sizeBytes?: number;
  sizeKb?: number;
  usedBy?: string[];
  nodeId?: string;
  deferred?: boolean;
  scaleMode?: string;
  imageTransform?: number[][];
  svgString?: string;
  viewBox?: string;
  extensions?: Record<string, unknown>;
}

export interface PackageImageAsset extends PackageAssetBase {
  type: "image";
  mimeType: string;
}

export interface PackageVectorAsset extends PackageAssetBase {
  type: "svg" | "vector";
}

export interface PackageFontAsset extends PackageAssetBase {
  type: "font";
  mimeType: string;
}

export interface PackageOtherAsset extends PackageAssetBase {
  type: "video" | "unknown";
}

export type PackageAsset =
  | PackageImageAsset
  | PackageVectorAsset
  | PackageFontAsset
  | PackageOtherAsset;
