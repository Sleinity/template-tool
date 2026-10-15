import type { PackageFontCssStyle } from "@sleinity/template-core";
import type {
  FontUnicodeCoverage,
  FontVariationAxis,
  OpenTypeNameRecordEvidence,
} from "./fontIdentity";
import type { FontMatchClassification } from "./fontMatching";

export const MANAGED_FONT_SCHEMA_VERSION = "2.0" as const;

export type ManagedFontSource =
  | "uploaded"
  | "trustedFetched"
  | "systemFallback";

export interface FontRequirementKey {
  family: string;
  style: PackageFontCssStyle;
  weight: number;
  stretch?: string;
}

export interface ManagedFontRecord {
  id: string;
  schemaVersion: typeof MANAGED_FONT_SCHEMA_VERSION | "1.0";
  family: string;
  typographicFamily?: string;
  legacyFamily?: string;
  subfamily?: string;
  typographicSubfamily?: string;
  legacySubfamily?: string;
  style: PackageFontCssStyle;
  weight: number;
  stretch?: string;
  postScriptName?: string;
  fullName?: string;
  source: ManagedFontSource;
  assetId: string;
  assetHash: string;
  mimeType: string;
  fileName: string;
  faceIndex?: number;
  runtimeFamily?: string;
  variableAxes?: FontVariationAxis[];
  unicodeCoverage?: FontUnicodeCoverage;
  rawNameRecords?: OpenTypeNameRecordEvidence[];
  license?: {
    name: string | null;
    url: string | null;
    version: string | null;
    redistributionStatus: "allowed" | "restricted" | "unknown";
  };
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
  usageCount: number;
  aliases: string[];
  trustedForFamilies: string[];
  notes?: string;
}

export interface ManagedFontMapping {
  id: string;
  managedFontId: string;
  requestId?: string;
  faceIndex?: number;
  binaryHash?: string;
  classification?: FontMatchClassification;
  runtimeFamily?: string;
  effectiveFamily?: string;
  effectiveWeight?: number;
  effectiveStyle?: PackageFontCssStyle;
  effectiveStretch?: string;
  createdAt: string;
  updatedAt: string;
}

export type ManagedFontMatchType = FontMatchClassification;

export interface ManagedFontCandidate {
  font: ManagedFontRecord;
  matchType: ManagedFontMatchType;
  classification: FontMatchClassification;
  score: number;
  requiresConfirmation: boolean;
  reasons: string[];
  ambiguous: boolean;
}

export interface ManagedFontDiagnostic {
  code:
    | "managed-font-missing"
    | "managed-font-asset-missing"
    | "managed-font-corrupt"
    | "managed-font-load-failed"
    | "managed-font-ambiguous"
    | "managed-font-unsupported-format"
    | "managed-font-upload-failed"
    | "managed-font-registry-failed"
    | "managed-font-fallback";
  severity: "info" | "warning" | "error";
  message: string;
  requirementId?: string;
  managedFontId?: string;
}

export interface ManagedFontRegistrationInput {
  bytes: ArrayBuffer;
  family: string;
  typographicFamily?: string;
  legacyFamily?: string;
  subfamily?: string;
  typographicSubfamily?: string;
  legacySubfamily?: string;
  style: PackageFontCssStyle;
  weight: number;
  stretch?: string;
  postScriptName?: string;
  fullName?: string;
  faceIndex?: number;
  runtimeFamily?: string;
  variableAxes?: FontVariationAxis[];
  unicodeCoverage?: FontUnicodeCoverage;
  rawNameRecords?: OpenTypeNameRecordEvidence[];
  license?: ManagedFontRecord["license"];
  source: ManagedFontSource;
  mimeType: string;
  fileName: string;
  aliases?: string[];
  trustedForFamilies?: string[];
  notes?: string;
}

export interface ManagedFontRegistry {
  listManagedFonts(): Promise<ManagedFontRecord[]>;
  getManagedFont(id: string): Promise<ManagedFontRecord | null>;
  registerUploadedFont(
    input: ManagedFontRegistrationInput,
  ): Promise<ManagedFontRecord>;
  getMapping(key: FontRequirementKey): Promise<ManagedFontMapping | null>;
  linkRequirementToManagedFont(
    key: FontRequirementKey,
    managedFontId: string,
    details?: Omit<ManagedFontMapping, "id" | "managedFontId" | "createdAt" | "updatedAt">,
  ): Promise<void>;
  unlinkRequirement(key: FontRequirementKey): Promise<void>;
  deleteManagedFont(id: string): Promise<void>;
  getFontBlob(assetHash: string): Promise<Blob | null>;
}
