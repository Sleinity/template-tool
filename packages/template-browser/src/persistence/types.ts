import type {
  TemplatePackageValidationResult,
  TemplatePackageV1,
} from "@sleinity/template-core";
import type {
  TemplateFamilyContentStateV1,
  TemplateFamilyValidationReportV1,
  TemplateFamilyV1,
} from "@sleinity/template-core/family";
import type { SavedAssetRecord } from "../storage/contentAddressedBinary";
export type { SavedAssetRecord } from "../storage/contentAddressedBinary";

export const SAVED_TEMPLATE_SCHEMA_VERSION = "1.0" as const;
export const SAVED_OUTPUT_DRAFT_SCHEMA_VERSION = "1.0" as const;
export const SAVED_TEMPLATE_FAMILY_SCHEMA_VERSION =
  "saved-template-family-v1" as const;
export const SAVED_TEMPLATE_FAMILY_DRAFT_SCHEMA_VERSION =
  "saved-template-family-draft-v1" as const;

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

export interface SavedAssetReference {
  id: string;
  templateId: string;
  hash: string;
}

export interface SavedTemplateWriteOptions {
  previewAsset?: SavedAssetRecord;
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

export interface TemplateFamilyRepository {
  listFamilies(): Promise<SavedTemplateFamilyRecord[]>;
  getFamily(id: string): Promise<SavedTemplateFamilyRecord | null>;
  saveFamily(record: SavedTemplateFamilyRecord): Promise<SavedTemplateFamilyRecord>;
  deleteFamily(id: string): Promise<void>;
  listFamilyDrafts(): Promise<SavedTemplateFamilyDraftRecord[]>;
  getFamilyDraft(id: string): Promise<SavedTemplateFamilyDraftRecord | null>;
  saveFamilyDraft(
    record: SavedTemplateFamilyDraftRecord,
  ): Promise<SavedTemplateFamilyDraftRecord>;
  deleteFamilyDraft(id: string): Promise<void>;
  getManagedAsset(hash: string): Promise<SavedAssetRecord | null>;
}
