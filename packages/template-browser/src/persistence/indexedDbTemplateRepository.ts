import type { TemplatePackageV1 } from "@sleinity/template-core";
import type { ManagedFontRecord } from "../fonts/fontRegistryTypes";
import {
  collectSavedAssetMap,
  collectSavedAssets,
  collectSavedTemplateFamilyAssets,
  hydrateAssetMap,
  hydratePackageAssets,
  hydrateTemplateFamilyAssets,
} from "./assetRepository";
import {
  validateCurrentSavedTemplateFamilyDraftRecord,
  validateCurrentSavedTemplateFamilyRecord,
  validateCurrentSavedOutputDraftRecord,
  validateCurrentSavedTemplateRecord,
} from "./savedRecordValidation";
import { filterReadableSavedTemplateFamilyRecords } from "./readableFamilyRecords";
import type {
  SavedAssetRecord,
  SavedAssetReference,
  SavedTemplateFamilyDraftRecord,
  SavedTemplateFamilyRecord,
  SavedOutputDraftRecord,
  SavedTemplateRecord,
  SavedTemplateWriteOptions,
  TemplateRepository,
  TemplateFamilyRepository,
} from "./types";
import {
  ASSET_REFERENCE_STORE as REFERENCES,
  ASSET_STORE as ASSETS,
  MANAGED_FONT_STORE as MANAGED_FONTS,
  openTemplatePlatformDatabase,
  OUTPUT_DRAFT_STORE as DRAFTS,
  TEMPLATE_FAMILY_DRAFT_STORE as FAMILY_DRAFTS,
  TEMPLATE_FAMILY_STORE as FAMILIES,
  TEMPLATE_STORE as TEMPLATES,
} from "../storage/indexedDb";

async function managedFontOwnsHash(
  transaction: IDBTransaction,
  hash: string,
): Promise<boolean> {
  const fonts = await requestValue<ManagedFontRecord[]>(
    transaction.objectStore(MANAGED_FONTS).getAll(),
  );
  return fonts.some((font) => font.assetHash === hash);
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function nextId(): string {
  return `template:${crypto.randomUUID()}`;
}

export class IndexedDbTemplateRepository implements TemplateRepository, TemplateFamilyRepository {
  private open(): Promise<IDBDatabase> {
    return openTemplatePlatformDatabase();
  }

  async getManagedAsset(hash: string): Promise<SavedAssetRecord | null> {
    const database = await this.open();
    const transaction = database.transaction(ASSETS, "readonly");
    return (
      (await requestValue(
        transaction.objectStore(ASSETS).get(hash),
      )) ?? null
    );
  }

  async listTemplates(): Promise<SavedTemplateRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(TEMPLATES, "readonly");
    const records = await requestValue<SavedTemplateRecord[]>(
      transaction.objectStore(TEMPLATES).getAll(),
    );
    return records
      .map(validateCurrentSavedTemplateRecord)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getTemplate(id: string): Promise<SavedTemplateRecord | null> {
    const database = await this.open();
    const transaction = database.transaction(TEMPLATES, "readonly");
    const stored = await requestValue<SavedTemplateRecord | undefined>(
      transaction.objectStore(TEMPLATES).get(id),
    );
    if (!stored) return null;
    const record = validateCurrentSavedTemplateRecord(stored);
    record.originalPackage = await hydratePackageAssets(
      record.originalPackage,
      (hash) => this.getManagedAsset(hash),
    );
    record.workingPackage = await hydratePackageAssets(
      record.workingPackage,
      (hash) => this.getManagedAsset(hash),
    );
    return record;
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
    const database = await this.open();
    const transaction = database.transaction(
      [TEMPLATES, ASSETS, REFERENCES],
      "readwrite",
    );
    const templateStore = transaction.objectStore(TEMPLATES);
    const assetStore = transaction.objectStore(ASSETS);
    const referenceStore = transaction.objectStore(REFERENCES);
    const existingReferences = await requestValue<SavedAssetReference[]>(
      referenceStore.index("templateId").getAll(currentRecord.id),
    );
    existingReferences.forEach((reference) => referenceStore.delete(reference.id));
    collected.assets.forEach((asset) => assetStore.put(asset));
    if (options.previewAsset) assetStore.put(options.previewAsset);
    const referencedHashes = new Set(collected.hashes);
    if (currentRecord.previewAssetHash) {
      referencedHashes.add(currentRecord.previewAssetHash);
    }
    referencedHashes.forEach((hash) =>
      referenceStore.put({
        id: `${currentRecord.id}:${hash}`,
        templateId: currentRecord.id,
        hash,
      } satisfies SavedAssetReference),
    );
    const stored: SavedTemplateRecord = {
      ...currentRecord,
      originalPackage: collected.packages[0],
      workingPackage: collected.packages[1],
      assetReferences: Array.from(referencedHashes),
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    templateStore.put(stored);
    await transactionDone(transaction);
    return (await this.getTemplate(stored.id))!;
  }

  async updateWorkingPackage(
    id: string,
    packageValue: TemplatePackageV1,
  ): Promise<SavedTemplateRecord> {
    const record = await this.getTemplate(id);
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
    const record = await this.getTemplate(id);
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
    const record = await this.getTemplate(id);
    if (!record) throw new Error("Saved template was not found.");
    return this.saveTemplate({ ...record, name: name.trim() || record.name });
  }

  async duplicateTemplate(id: string): Promise<SavedTemplateRecord> {
    const source = await this.getTemplate(id);
    if (!source) throw new Error("Saved template was not found.");
    const now = new Date().toISOString();
    return this.saveTemplate({
      ...source,
      id: nextId(),
      name: `${source.name} Copy`,
      createdAt: now,
      updatedAt: now,
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(
      [TEMPLATES, ASSETS, REFERENCES, MANAGED_FONTS],
      "readwrite",
    );
    const references = await requestValue<SavedAssetReference[]>(
      transaction.objectStore(REFERENCES).index("templateId").getAll(id),
    );
    transaction.objectStore(TEMPLATES).delete(id);
    references.forEach((reference) =>
      transaction.objectStore(REFERENCES).delete(reference.id),
    );
    for (const reference of references) {
      const remaining = await requestValue<IDBValidKey[]>(
        transaction.objectStore(REFERENCES).index("hash").getAllKeys(reference.hash),
      );
      if (
        remaining.length === 0 &&
        !(await managedFontOwnsHash(transaction, reference.hash))
      ) {
        transaction.objectStore(ASSETS).delete(reference.hash);
      }
    }
    await transactionDone(transaction);
  }

  async listDrafts(): Promise<SavedOutputDraftRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(DRAFTS, "readonly");
    const records = await requestValue<SavedOutputDraftRecord[]>(
      transaction.objectStore(DRAFTS).getAll(),
    );
    return records
      .map(validateCurrentSavedOutputDraftRecord)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getDraft(id: string): Promise<SavedOutputDraftRecord | null> {
    const database = await this.open();
    const transaction = database.transaction(DRAFTS, "readonly");
    const stored = await requestValue<SavedOutputDraftRecord | undefined>(
      transaction.objectStore(DRAFTS).get(id),
    );
    if (!stored) return null;
    const record = validateCurrentSavedOutputDraftRecord(stored);
    record.basePackage = await hydratePackageAssets(
      record.basePackage,
      (hash) => this.getManagedAsset(hash),
    );
    record.workingPackage = await hydratePackageAssets(
      record.workingPackage,
      (hash) => this.getManagedAsset(hash),
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
    const database = await this.open();
    const transaction = database.transaction(
      [DRAFTS, ASSETS, REFERENCES],
      "readwrite",
    );
    const draftStore = transaction.objectStore(DRAFTS);
    const assetStore = transaction.objectStore(ASSETS);
    const referenceStore = transaction.objectStore(REFERENCES);
    const existingReferences = await requestValue<SavedAssetReference[]>(
      referenceStore.index("templateId").getAll(currentRecord.id),
    );
    existingReferences.forEach((reference) =>
      referenceStore.delete(reference.id),
    );
    collected.assets.forEach((asset) => assetStore.put(asset));
    collected.hashes.forEach((hash) =>
      referenceStore.put({
        id: `${currentRecord.id}:${hash}`,
        templateId: currentRecord.id,
        hash,
      } satisfies SavedAssetReference),
    );
    const stored: SavedOutputDraftRecord = {
      ...currentRecord,
      basePackage: collected.packages[0],
      workingPackage: collected.packages[1],
      assetReferences: collected.hashes,
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    draftStore.put(stored);
    await transactionDone(transaction);
    return (await this.getDraft(stored.id))!;
  }

  async updateDraftPackage(
    id: string,
    packageValue: TemplatePackageV1,
  ): Promise<SavedOutputDraftRecord> {
    const record = await this.getDraft(id);
    if (!record) throw new Error("Saved output draft was not found.");
    return this.saveDraft({ ...record, workingPackage: packageValue });
  }

  async deleteDraft(id: string): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(
      [DRAFTS, ASSETS, REFERENCES, MANAGED_FONTS],
      "readwrite",
    );
    const references = await requestValue<SavedAssetReference[]>(
      transaction.objectStore(REFERENCES).index("templateId").getAll(id),
    );
    transaction.objectStore(DRAFTS).delete(id);
    references.forEach((reference) =>
      transaction.objectStore(REFERENCES).delete(reference.id),
    );
    for (const reference of references) {
      const remaining = await requestValue<IDBValidKey[]>(
        transaction
          .objectStore(REFERENCES)
          .index("hash")
          .getAllKeys(reference.hash),
      );
      if (
        remaining.length === 0 &&
        !(await managedFontOwnsHash(transaction, reference.hash))
      ) {
        transaction.objectStore(ASSETS).delete(reference.hash);
      }
    }
    await transactionDone(transaction);
  }

  async listFamilies(): Promise<SavedTemplateFamilyRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(FAMILIES, "readonly");
    const records = await requestValue<SavedTemplateFamilyRecord[]>(
      transaction.objectStore(FAMILIES).getAll(),
    );
    return filterReadableSavedTemplateFamilyRecords(records)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getFamily(id: string): Promise<SavedTemplateFamilyRecord | null> {
    const database = await this.open();
    const transaction = database.transaction(FAMILIES, "readonly");
    const stored = await requestValue<SavedTemplateFamilyRecord | undefined>(
      transaction.objectStore(FAMILIES).get(id),
    );
    if (!stored) return null;
    const record = validateCurrentSavedTemplateFamilyRecord(stored);
    const hydrated = await hydrateTemplateFamilyAssets(
      record.family,
      record.sharedImageAssets,
      (hash) => this.getManagedAsset(hash),
    );
    record.family = hydrated.family;
    record.sharedImageAssets = hydrated.sharedImageAssets;
    return record;
  }

  async saveFamily(
    record: SavedTemplateFamilyRecord,
  ): Promise<SavedTemplateFamilyRecord> {
    const current = validateCurrentSavedTemplateFamilyRecord(record);
    const collected = await collectSavedTemplateFamilyAssets(
      current.family,
      current.sharedImageAssets,
    );
    const ownerId = `family-record:${current.id}`;
    const database = await this.open();
    const transaction = database.transaction(
      [FAMILIES, ASSETS, REFERENCES],
      "readwrite",
    );
    const referenceStore = transaction.objectStore(REFERENCES);
    const existing = await requestValue<SavedAssetReference[]>(
      referenceStore.index("templateId").getAll(ownerId),
    );
    existing.forEach((reference) => referenceStore.delete(reference.id));
    collected.assets.forEach((asset) => transaction.objectStore(ASSETS).put(asset));
    collected.hashes.forEach((hash) => referenceStore.put({
      id: `${ownerId}:${hash}`,
      templateId: ownerId,
      hash,
    } satisfies SavedAssetReference));
    const stored: SavedTemplateFamilyRecord = {
      ...current,
      family: collected.family,
      sharedImageAssets: collected.sharedImageAssets,
      assetReferences: collected.hashes,
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    transaction.objectStore(FAMILIES).put(stored);
    await transactionDone(transaction);
    return (await this.getFamily(stored.id))!;
  }

  async deleteFamily(id: string): Promise<void> {
    await this.deleteFamilyOwner(FAMILIES, id, `family-record:${id}`);
  }

  async listFamilyDrafts(): Promise<SavedTemplateFamilyDraftRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(FAMILY_DRAFTS, "readonly");
    const records = await requestValue<SavedTemplateFamilyDraftRecord[]>(
      transaction.objectStore(FAMILY_DRAFTS).getAll(),
    );
    return records
      .map(validateCurrentSavedTemplateFamilyDraftRecord)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getFamilyDraft(id: string): Promise<SavedTemplateFamilyDraftRecord | null> {
    const database = await this.open();
    const transaction = database.transaction(FAMILY_DRAFTS, "readonly");
    const stored = await requestValue<SavedTemplateFamilyDraftRecord | undefined>(
      transaction.objectStore(FAMILY_DRAFTS).get(id),
    );
    if (!stored) return null;
    const record = validateCurrentSavedTemplateFamilyDraftRecord(stored);
    record.sharedImageAssets = await hydrateAssetMap(
      record.sharedImageAssets,
      (hash) => this.getManagedAsset(hash),
    );
    return record;
  }

  async saveFamilyDraft(
    record: SavedTemplateFamilyDraftRecord,
  ): Promise<SavedTemplateFamilyDraftRecord> {
    const current = validateCurrentSavedTemplateFamilyDraftRecord(record);
    const collected = await collectSavedAssetMap(current.sharedImageAssets);
    const ownerId = `family-draft:${current.id}`;
    const database = await this.open();
    const transaction = database.transaction(
      [FAMILY_DRAFTS, ASSETS, REFERENCES],
      "readwrite",
    );
    const referenceStore = transaction.objectStore(REFERENCES);
    const existing = await requestValue<SavedAssetReference[]>(
      referenceStore.index("templateId").getAll(ownerId),
    );
    existing.forEach((reference) => referenceStore.delete(reference.id));
    collected.assets.forEach((asset) => transaction.objectStore(ASSETS).put(asset));
    collected.hashes.forEach((hash) => referenceStore.put({
      id: `${ownerId}:${hash}`,
      templateId: ownerId,
      hash,
    } satisfies SavedAssetReference));
    const stored: SavedTemplateFamilyDraftRecord = {
      ...current,
      sharedImageAssets: collected.assetMap,
      assetReferences: collected.hashes,
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    transaction.objectStore(FAMILY_DRAFTS).put(stored);
    await transactionDone(transaction);
    return (await this.getFamilyDraft(stored.id))!;
  }

  async deleteFamilyDraft(id: string): Promise<void> {
    await this.deleteFamilyOwner(FAMILY_DRAFTS, id, `family-draft:${id}`);
  }

  private async deleteFamilyOwner(
    storeName: string,
    id: string,
    ownerId: string,
  ): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(
      [storeName, ASSETS, REFERENCES, MANAGED_FONTS],
      "readwrite",
    );
    const references = await requestValue<SavedAssetReference[]>(
      transaction.objectStore(REFERENCES).index("templateId").getAll(ownerId),
    );
    transaction.objectStore(storeName).delete(id);
    references.forEach((reference) =>
      transaction.objectStore(REFERENCES).delete(reference.id));
    for (const reference of references) {
      const remaining = await requestValue<IDBValidKey[]>(
        transaction.objectStore(REFERENCES).index("hash").getAllKeys(reference.hash),
      );
      if (
        remaining.length === 0 &&
        !(await managedFontOwnsHash(transaction, reference.hash))
      ) {
        transaction.objectStore(ASSETS).delete(reference.hash);
      }
    }
    await transactionDone(transaction);
  }
}
