import type { TemplatePackageValidationResult } from "../packageDiagnostics";
import type { TemplatePackageV1 } from "../types";

export const SAVED_TEMPLATE_SCHEMA_VERSION = "1.0" as const;
export const SAVED_OUTPUT_DRAFT_SCHEMA_VERSION = "1.0" as const;

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

export interface SavedAssetRecord {
  hash: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
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
