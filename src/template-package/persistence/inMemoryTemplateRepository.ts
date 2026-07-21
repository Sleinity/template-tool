import type { TemplatePackageV1 } from "../types";
import { collectSavedAssets, hydratePackageAssets } from "./assetRepository";
import {
  validateCurrentSavedOutputDraftRecord,
  validateCurrentSavedTemplateRecord,
} from "./savedRecordValidation";
import type {
  SavedAssetRecord,
  SavedOutputDraftRecord,
  SavedTemplateRecord,
  SavedTemplateWriteOptions,
  TemplateRepository,
} from "./types";

function nextId(): string {
  return `template:${crypto.randomUUID()}`;
}

export interface InMemoryTemplateRepositoryStorage {
  templates: Map<string, SavedTemplateRecord>;
  drafts: Map<string, SavedOutputDraftRecord>;
  assets: Map<string, SavedAssetRecord>;
  references: Map<string, Set<string>>;
}

export function createInMemoryTemplateRepositoryStorage(): InMemoryTemplateRepositoryStorage {
  return {
    templates: new Map(),
    drafts: new Map(),
    assets: new Map(),
    references: new Map(),
  };
}

export class InMemoryTemplateRepository implements TemplateRepository {
  private templates: Map<string, SavedTemplateRecord>;
  private drafts: Map<string, SavedOutputDraftRecord>;
  private assets: Map<string, SavedAssetRecord>;
  private references: Map<string, Set<string>>;

  constructor(
    storage: InMemoryTemplateRepositoryStorage =
      createInMemoryTemplateRepositoryStorage(),
  ) {
    this.templates = storage.templates;
    this.drafts = storage.drafts;
    this.assets = storage.assets;
    this.references = storage.references;
  }

  async listTemplates(): Promise<SavedTemplateRecord[]> {
    return Array.from(this.templates.values())
      .map(validateCurrentSavedTemplateRecord)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getTemplate(id: string): Promise<SavedTemplateRecord | null> {
    const stored = this.templates.get(id);
    if (!stored) return null;
    const record = validateCurrentSavedTemplateRecord(stored);
    record.originalPackage = await hydratePackageAssets(
      record.originalPackage,
      async (hash) => this.assets.get(hash) ?? null,
    );
    record.workingPackage = await hydratePackageAssets(
      record.workingPackage,
      async (hash) => this.assets.get(hash) ?? null,
    );
    return record;
  }

  async getManagedAsset(hash: string): Promise<SavedAssetRecord | null> {
    return this.assets.get(hash) ?? null;
  }

  async saveTemplate(
    record: SavedTemplateRecord,
    options: SavedTemplateWriteOptions = {},
  ): Promise<SavedTemplateRecord> {
    const currentRecord = validateCurrentSavedTemplateRecord(record);
    const collected = await collectSavedAssets([
      currentRecord.originalPackage,
      currentRecord.workingPackage,
    ]);
    collected.assets.forEach((asset) => this.assets.set(asset.hash, asset));
    if (options.previewAsset) {
      this.assets.set(options.previewAsset.hash, options.previewAsset);
    }
    this.references.forEach((templates) => templates.delete(currentRecord.id));
    const referencedHashes = new Set(collected.hashes);
    if (currentRecord.previewAssetHash) {
      referencedHashes.add(currentRecord.previewAssetHash);
    }
    referencedHashes.forEach((hash) => {
      const templates = this.references.get(hash) ?? new Set<string>();
      templates.add(currentRecord.id);
      this.references.set(hash, templates);
    });
    const stored: SavedTemplateRecord = {
      ...currentRecord,
      originalPackage: collected.packages[0],
      workingPackage: collected.packages[1],
      assetReferences: Array.from(referencedHashes),
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    this.templates.set(stored.id, stored);
    return (await this.getTemplate(stored.id))!;
  }

  async updateWorkingPackage(
    id: string,
    packageValue: TemplatePackageV1,
  ): Promise<SavedTemplateRecord> {
    const record = this.templates.get(id);
    if (!record) throw new Error("Saved template was not found.");
    return this.saveTemplate({ ...record, workingPackage: packageValue });
  }

  async updateTemplateSettings(
    id: string,
    settings: {
      name: string;
      description?: string;
      workingPackage: TemplatePackageV1;
      validation: SavedTemplateRecord["validation"];
    },
  ): Promise<SavedTemplateRecord> {
    const record = this.templates.get(id);
    if (!record) throw new Error("Saved template was not found.");
    return this.saveTemplate({
      ...record,
      name: settings.name.trim() || record.name,
      description: settings.description?.trim(),
      workingPackage: settings.workingPackage,
      validation: settings.validation,
    });
  }

  async renameTemplate(id: string, name: string): Promise<SavedTemplateRecord> {
    const record = this.templates.get(id);
    if (!record) throw new Error("Saved template was not found.");
    return this.saveTemplate({ ...record, name: name.trim() || record.name });
  }

  async duplicateTemplate(id: string): Promise<SavedTemplateRecord> {
    const source = this.templates.get(id);
    if (!source) throw new Error("Saved template was not found.");
    const now = new Date().toISOString();
    return this.saveTemplate({
      ...structuredClone(source),
      id: nextId(),
      name: `${source.name} Copy`,
      createdAt: now,
      updatedAt: now,
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    this.templates.delete(id);
    this.deleteOwnerReferences(id);
  }

  async listDrafts(): Promise<SavedOutputDraftRecord[]> {
    return Array.from(this.drafts.values())
      .map(validateCurrentSavedOutputDraftRecord)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getDraft(id: string): Promise<SavedOutputDraftRecord | null> {
    const stored = this.drafts.get(id);
    if (!stored) return null;
    const record = validateCurrentSavedOutputDraftRecord(stored);
    record.basePackage = await hydratePackageAssets(
      record.basePackage,
      async (hash) => this.assets.get(hash) ?? null,
    );
    record.workingPackage = await hydratePackageAssets(
      record.workingPackage,
      async (hash) => this.assets.get(hash) ?? null,
    );
    return record;
  }

  async saveDraft(
    record: SavedOutputDraftRecord,
  ): Promise<SavedOutputDraftRecord> {
    const currentRecord = validateCurrentSavedOutputDraftRecord(record);
    const collected = await collectSavedAssets([
      currentRecord.basePackage,
      currentRecord.workingPackage,
    ]);
    collected.assets.forEach((asset) => this.assets.set(asset.hash, asset));
    this.references.forEach((owners) => owners.delete(currentRecord.id));
    collected.hashes.forEach((hash) => {
      const owners = this.references.get(hash) ?? new Set<string>();
      owners.add(currentRecord.id);
      this.references.set(hash, owners);
    });
    const stored: SavedOutputDraftRecord = {
      ...currentRecord,
      basePackage: collected.packages[0],
      workingPackage: collected.packages[1],
      assetReferences: collected.hashes,
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    this.drafts.set(stored.id, stored);
    return (await this.getDraft(stored.id))!;
  }

  async updateDraftPackage(
    id: string,
    packageValue: TemplatePackageV1,
  ): Promise<SavedOutputDraftRecord> {
    const record = this.drafts.get(id);
    if (!record) throw new Error("Saved output draft was not found.");
    return this.saveDraft({ ...record, workingPackage: packageValue });
  }

  async deleteDraft(id: string): Promise<void> {
    this.drafts.delete(id);
    this.deleteOwnerReferences(id);
  }

  private deleteOwnerReferences(id: string): void {
    for (const [hash, templates] of this.references) {
      templates.delete(id);
      if (templates.size === 0) {
        this.references.delete(hash);
        this.assets.delete(hash);
      }
    }
  }

  getAssetCountForTests(): number {
    return this.assets.size;
  }
}
