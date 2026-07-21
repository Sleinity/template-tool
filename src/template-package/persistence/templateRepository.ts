import type { TemplatePackageValidationResult } from "../packageDiagnostics";
import type { TemplatePackageV1 } from "../types";
import { IndexedDbTemplateRepository } from "./indexedDbTemplateRepository";
import { InMemoryTemplateRepository } from "./inMemoryTemplateRepository";
import {
  SAVED_OUTPUT_DRAFT_SCHEMA_VERSION,
  SAVED_TEMPLATE_SCHEMA_VERSION,
  type SavedTemplateRecord,
  type SavedOutputDraftRecord,
  type TemplateRepository,
} from "./types";

let repository: TemplateRepository | null = null;

export function getTemplateRepository(): TemplateRepository {
  if (!repository) {
    repository =
      typeof indexedDB === "undefined"
        ? new InMemoryTemplateRepository()
        : new IndexedDbTemplateRepository();
  }
  return repository;
}

export function createSavedOutputDraftRecord(
  template: SavedTemplateRecord,
): SavedOutputDraftRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: SAVED_OUTPUT_DRAFT_SCHEMA_VERSION,
    id: `draft:${crypto.randomUUID()}`,
    templateId: template.id,
    templateName: template.name,
    name: `${template.name} Draft`,
    basePackage: structuredClone(template.workingPackage),
    workingPackage: structuredClone(template.workingPackage),
    validation: structuredClone(template.validation),
    createdAt: now,
    updatedAt: now,
    assetReferences: [],
    fontReferences: [],
  };
}

export function createSavedTemplateRecord(input: {
  name: string;
  description?: string;
  packageValue: TemplatePackageV1;
  workingPackageValue?: TemplatePackageV1;
  validation: TemplatePackageValidationResult;
  figmaUrl?: string;
  source?: SavedTemplateRecord["source"];
  previewAssetHash?: string;
}): SavedTemplateRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: SAVED_TEMPLATE_SCHEMA_VERSION,
    id: `template:${crypto.randomUUID()}`,
    name: input.name.trim() || input.packageValue.name,
    description: input.description,
    originalPackage: structuredClone(input.packageValue),
    workingPackage: structuredClone(
      input.workingPackageValue ?? input.packageValue,
    ),
    createdAt: now,
    updatedAt: now,
    source: {
      type: "package-zip",
      figmaUrl: input.figmaUrl ?? input.source?.figmaUrl,
      sourceName: input.source?.sourceName,
      packageFiles: input.source?.packageFiles,
    },
    validation: structuredClone(input.validation),
    assetReferences: [],
    fontReferences: [],
    previewAssetHash: input.previewAssetHash,
  };
}

export function setTemplateRepositoryForTests(
  next: TemplateRepository | null,
): void {
  repository = next;
}
