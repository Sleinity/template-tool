export const TEMPLATE_PACKAGE_BUNDLE_CONTRACT = "template-package-bundle-v1" as const;

export const REQUIRED_BUNDLE_FILES = ["template.json", "assets.json"] as const;
export const OPTIONAL_BUNDLE_FILES = [
  "motion.json",
  "mcp.json",
  "preview.png",
] as const;

export type TemplatePackageBundleFileRole =
  | "template"
  | "asset-manifest"
  | "motion"
  | "mcp"
  | "preview"
  | "asset"
  | "unknown";

export type TemplatePackageBundleDiagnosticSeverity =
  | "info"
  | "warning"
  | "error";

export type TemplatePackageBundleDiagnosticCategory =
  | "zip"
  | "manifest"
  | "asset"
  | "source"
  | "package"
  | "motion"
  | "mcp"
  | "preview"
  | "field"
  | "font"
  | "render"
  | "export";

export interface TemplatePackageBundleDiagnostic {
  code: string;
  severity: TemplatePackageBundleDiagnosticSeverity;
  category: TemplatePackageBundleDiagnosticCategory;
  message: string;
  path?: string;
  nodeId?: string;
  fieldId?: string;
  assetId?: string;
  ref?: string;
  sourceNodeId?: string;
  suggestion?: string;
  relatedIds?: string[];
  details?: Record<string, unknown>;
}

export interface TemplatePackageBundleFile {
  path: string;
  normalizedPath: string;
  role: TemplatePackageBundleFileRole;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  localHeaderOffset: number;
  encrypted: boolean;
  directory: boolean;
}

export interface TemplatePackageBundleFileIndex {
  files: Record<string, TemplatePackageBundleFile>;
  orderedFiles: TemplatePackageBundleFile[];
  required: Record<(typeof REQUIRED_BUNDLE_FILES)[number], TemplatePackageBundleFile | null>;
  optional: Record<(typeof OPTIONAL_BUNDLE_FILES)[number], TemplatePackageBundleFile | null>;
  assets: TemplatePackageBundleFile[];
}

export interface TemplatePackageBundleLoadOptions {
  sourceName?: string;
  maxEntries?: number;
  maxUncompressedBytes?: number;
}

export interface TemplatePackageBundle {
  contract: typeof TEMPLATE_PACKAGE_BUNDLE_CONTRACT;
  sourceType: "package-zip";
  sourceName?: string;
  index: TemplatePackageBundleFileIndex;
  diagnostics: TemplatePackageBundleDiagnostic[];
  valid: boolean;
}

export interface ZipCentralDirectoryEntry {
  path: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  generalPurposeBitFlag: number;
  localHeaderOffset: number;
  directory: boolean;
}
