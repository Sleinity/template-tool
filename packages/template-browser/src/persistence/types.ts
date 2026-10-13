import type {
  TemplatePackageValidationResult,
  TemplatePackageV1,
  TemplatePackageV2,
  TemplateFieldContentStateV1,
} from "@sleinity/template-core";
import type {
  TemplateFieldFamilyContentStateV2,
  TemplateFieldFamilyContentStateV3,
  TemplateFieldFamilyV2,
  TemplateFamilyContentStateV1,
  TemplateFamilyValidationReportV1,
  TemplateFamilyV1,
} from "@sleinity/template-core/family";
import type { SavedAssetRecord } from "../storage/contentAddressedBinary";
export type { SavedAssetRecord } from "../storage/contentAddressedBinary";

export const SAVED_TEMPLATE_SCHEMA_VERSION = "1.0" as const;
export const SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION =
  "saved-template-session-v3" as const;
export const SAVED_OUTPUT_DRAFT_SCHEMA_VERSION = "1.0" as const;
export const SAVED_TEMPLATE_FAMILY_SCHEMA_VERSION =
  "saved-template-family-v1" as const;
export const SAVED_TEMPLATE_FAMILY_DRAFT_SCHEMA_VERSION =
  "saved-template-family-draft-v1" as const;
export const SAVED_TEMPLATE_FIELD_FAMILY_V2_SCHEMA_VERSION =
  "saved-template-field-family-v2" as const;
export const SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION =
  "saved-template-field-family-v4" as const;

export interface SavedTemplateSourceMetadata {
  type: "package-zip";
  figmaUrl?: string;
  sourceName?: string;
  packageFiles?: {
    templateJson: boolean;
    assetsJson: boolean;
    motionJson: boolean;
    mcpJson: boolean;
    previewPng: boolean;
    assetCount: number;
  };
}

export interface SavedTemplateRecord {
  schemaVersion: typeof SAVED_TEMPLATE_SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  originalPackage: TemplatePackageV1;
  workingPackage: TemplatePackageV1;
  createdAt: string;
  updatedAt: string;
  source: SavedTemplateSourceMetadata;
  validation: TemplatePackageValidationResult;
  assetReferences: string[];
  fontReferences: string[];
  previewAssetHash?: string;
}

/**
 * Canonical V2 browser state. `workingPackage` is deliberately absent: it is
 * always rematerialized from `basePackage + contentState + sessionAssets`.
 */
export interface SavedTemplateSessionRecordV2 {
  schemaVersion: typeof SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  basePackage: TemplatePackageV2;
  contentState: TemplateFieldContentStateV1;
  /** Browser-owned replacement asset metadata; binary bytes live by hash. */
  sessionAssets: TemplatePackageV2["assets"];
  createdAt: string;
  updatedAt: string;
  source: SavedTemplateSourceMetadata;
  validation: TemplatePackageValidationResult;
  assetReferences: string[];
  fontReferences: string[];
}

export interface SavedOutputDraftRecord {
  schemaVersion: typeof SAVED_OUTPUT_DRAFT_SCHEMA_VERSION;
  id: string;
  templateId: string;
  templateName: string;
  name: string;
  basePackage: TemplatePackageV1;
  workingPackage: TemplatePackageV1;
  validation: TemplatePackageValidationResult;
  createdAt: string;
  updatedAt: string;
  assetReferences: string[];
  fontReferences: string[];
}

export interface SavedTemplateFamilyRecord {
  schemaVersion: typeof SAVED_TEMPLATE_FAMILY_SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  family: TemplateFamilyV1;
  validation: TemplateFamilyValidationReportV1;
  sharedImageAssets: TemplatePackageV1["assets"];
  createdAt: string;
  updatedAt: string;
  assetReferences: string[];
  fontReferences: string[];
  /** Managed preview.png assets keyed by their family variant ID. */
  variantPreviewAssetHashes?: Record<string, string>;
  migratedFromTemplateId?: string;
}

export interface SavedTemplateFamilyDraftRecord {
  schemaVersion: typeof SAVED_TEMPLATE_FAMILY_DRAFT_SCHEMA_VERSION;
  id: string;
  familyId: string;
  familyName: string;
  name: string;
  content: TemplateFamilyContentStateV1;
  validation: TemplateFamilyValidationReportV1;
  selectedVariantId: string;
  sharedImageAssets: TemplatePackageV1["assets"];
  createdAt: string;
  updatedAt: string;
  assetReferences: string[];
  fontReferences: string[];
  /** Present only for an in-memory projection of a legacy 0.7 output draft. */
  migratedFromDraftId?: string;
}

/** One persisted shared-content authority for a V2 Template Field Family. */
export interface SavedTemplateFieldFamilyRecordV2 {
  schemaVersion: typeof SAVED_TEMPLATE_FIELD_FAMILY_V2_SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  family: TemplateFieldFamilyV2;
  contentState: TemplateFieldFamilyContentStateV2;
  selectedVariantId: string;
  sessionAssets: TemplatePackageV2["assets"];
  createdAt: string;
  updatedAt: string;
  assetReferences: string[];
  fontReferences: string[];
}

/** Current persisted Family authority with shared Image assets and sparse framing. */
export interface SavedTemplateFieldFamilyRecordV3 {
  schemaVersion: typeof SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION;
  id: string;
  name: string;
  description?: string;
  family: TemplateFieldFamilyV2;
  contentState: TemplateFieldFamilyContentStateV3;
  selectedVariantId: string;
  sessionAssets: TemplatePackageV2["assets"];
  createdAt: string;
  updatedAt: string;
  assetReferences: string[];
  fontReferences: string[];
}

export interface IncompatibleSavedWorkRecord {
  kind: "single" | "family";
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
  assetReferences: string[];
  reason: "reimport-required";
}

export interface SavedAssetReference {
  id: string;
  templateId: string;
  hash: string;
}

export interface SavedTemplateWriteOptions {
  previewAsset?: SavedAssetRecord;
}

export interface SavedTemplateFamilyWriteOptions {
  /** Transient preview.png assets to persist for the hashes recorded on the family. */
  variantPreviewAssets?: Readonly<Record<string, SavedAssetRecord>>;
}

export type TemplateSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error";

export interface TemplatePersistenceDiagnostic {
  code:
    | "persistence-unavailable"
    | "template-save-failed"
    | "template-load-failed"
    | "asset-missing"
    | "asset-corrupt"
    | "migration-failed";
  severity: "info" | "warning" | "error";
  message: string;
  templateId?: string;
  assetHash?: string;
}

export interface TemplateRepository {
  listTemplates(): Promise<SavedTemplateRecord[]>;
  getTemplate(id: string): Promise<SavedTemplateRecord | null>;
  getManagedAsset(hash: string): Promise<SavedAssetRecord | null>;
  saveTemplate(
    record: SavedTemplateRecord,
    options?: SavedTemplateWriteOptions,
  ): Promise<SavedTemplateRecord>;
  updateWorkingPackage(
    id: string,
    packageValue: TemplatePackageV1,
  ): Promise<SavedTemplateRecord>;
  updateTemplateSettings(
    id: string,
    settings: {
      name: string;
      description?: string;
      workingPackage: TemplatePackageV1;
      validation: TemplatePackageValidationResult;
    },
  ): Promise<SavedTemplateRecord>;
  renameTemplate(id: string, name: string): Promise<SavedTemplateRecord>;
  duplicateTemplate(id: string): Promise<SavedTemplateRecord>;
  deleteTemplate(id: string): Promise<void>;
  listDrafts(): Promise<SavedOutputDraftRecord[]>;
  getDraft(id: string): Promise<SavedOutputDraftRecord | null>;
  saveDraft(record: SavedOutputDraftRecord): Promise<SavedOutputDraftRecord>;
  updateDraftPackage(
    id: string,
    packageValue: TemplatePackageV1,
  ): Promise<SavedOutputDraftRecord>;
  deleteDraft(id: string): Promise<void>;
}

export interface TemplateSessionRepositoryV2 {
  listTemplateSessionsV2(): Promise<SavedTemplateSessionRecordV2[]>;
  listIncompatibleTemplateSessionsV2(): Promise<IncompatibleSavedWorkRecord[]>;
  getTemplateSessionV2(id: string): Promise<SavedTemplateSessionRecordV2 | null>;
  saveTemplateSessionV2(
    record: SavedTemplateSessionRecordV2,
  ): Promise<SavedTemplateSessionRecordV2>;
  deleteTemplateSessionV2(id: string): Promise<void>;
  deleteIncompatibleTemplateSessionV2(id: string): Promise<void>;
  getManagedAsset(hash: string): Promise<SavedAssetRecord | null>;
}

export interface TemplateFamilyRepository {
  listFamilies(): Promise<SavedTemplateFamilyRecord[]>;
  getFamily(id: string): Promise<SavedTemplateFamilyRecord | null>;
  saveFamily(
    record: SavedTemplateFamilyRecord,
    options?: SavedTemplateFamilyWriteOptions,
  ): Promise<SavedTemplateFamilyRecord>;
  deleteFamily(id: string): Promise<void>;
  listFamilyDrafts(): Promise<SavedTemplateFamilyDraftRecord[]>;
  getFamilyDraft(id: string): Promise<SavedTemplateFamilyDraftRecord | null>;
  saveFamilyDraft(
    record: SavedTemplateFamilyDraftRecord,
  ): Promise<SavedTemplateFamilyDraftRecord>;
  deleteFamilyDraft(id: string): Promise<void>;
  getManagedAsset(hash: string): Promise<SavedAssetRecord | null>;
}

export interface TemplateFieldFamilyRepositoryV3 {
  listTemplateFieldFamiliesV3(): Promise<SavedTemplateFieldFamilyRecordV3[]>;
  listIncompatibleTemplateFieldFamiliesV3(): Promise<IncompatibleSavedWorkRecord[]>;
  /** Reads V2 records through one boundary migration and returns V3 only. */
  getTemplateFieldFamilyV3(id: string): Promise<SavedTemplateFieldFamilyRecordV3 | null>;
  saveTemplateFieldFamilyV3(
    record: SavedTemplateFieldFamilyRecordV3,
  ): Promise<SavedTemplateFieldFamilyRecordV3>;
  deleteTemplateFieldFamilyV3(id: string): Promise<void>;
  deleteIncompatibleTemplateFieldFamilyV3(id: string): Promise<void>;
  getManagedAsset(hash: string): Promise<SavedAssetRecord | null>;
}
