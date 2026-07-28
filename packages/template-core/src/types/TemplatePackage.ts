import type { PackageAsset } from "./Assets";
import type { PackageColor } from "./Appearance";
import type { EditableFieldBinding } from "./EditableFieldBinding";
import type { PackageMotion } from "./PackageMotion";
import type { TemplatePackageFontRequirement } from "./Fonts";
import type { TemplateNode } from "./TemplateNode";
import type {
  AssetStrategy,
  FigmaMcpSourceMetadata,
  RendererHint,
  VerificationReport,
} from "./Enrichment";

export interface TemplatePackageCanvas {
  width: number;
  height: number;
  background?: string | PackageColor | null;
  coordinateSpace?: "figma";
}

export interface TemplatePackageReferencePreview {
  assetId?: string;
  url?: string;
  width?: number;
  height?: number;
}

export interface TemplatePackageSource {
  type?: "figma";
  packageContract?: "template-package-v1";
  pluginVersion?: string;
  fileKey?: string;
  url?: string;
  figmaMcp?: FigmaMcpSourceMetadata;
  application?: string;
  documentId?: string;
  documentName?: string;
  pageId?: string;
  rootNodeId?: string;
  exportedAt?: string;
}

export interface TemplatePackageDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  nodeId?: string;
  nodeName?: string;
  assetId?: string;
  parentId?: string;
  parentName?: string;
  parentLayoutMode?: string;
  affectedAxis?: "horizontal" | "vertical";
  rawFigmaValue?: unknown;
  normalizedValue?: unknown;
  details?: Record<string, unknown>;
}

export interface PackageMaskRelationship {
  maskSourceId: string;
  affectedSiblingIds: string[];
  parentId: string;
  scopeTerminationReason: string;
}

export interface TemplatePackageV1 {
  schemaVersion: "1.0";
  packageId: string;
  name: string;
  canvas: TemplatePackageCanvas;
  rootNodeId: string;
  nodes: Record<string, TemplateNode>;
  editableFields: EditableFieldBinding[];
  assets: Record<string, PackageAsset>;
  fontRequirements?: TemplatePackageFontRequirement[];
  diagnostics?: TemplatePackageDiagnostic[];
  motion?: PackageMotion;
  referencePreview?: TemplatePackageReferencePreview;
  source?: TemplatePackageSource;
  rendererHints?: Record<string, RendererHint>;
  assetStrategy?: AssetStrategy;
  verification?: VerificationReport;
  /** Ordered exporter-authored mask scopes. Older packages may omit this. */
  maskRelationships?: PackageMaskRelationship[];
}

export type TemplatePackage = TemplatePackageV1;
