import { createInMemoryTemplateRecoveryRepository } from "./templateRecovery";
import type { ManagedFontRecord } from "../fonts/fontRegistryTypes";
import {
  ASSET_REFERENCE_STORE as REFERENCES,
  ASSET_STORE as ASSETS,
  MANAGED_FONT_STORE as MANAGED_FONTS,
  RECOVERY_STORE,
  openTemplatePlatformDatabase,
  TEMPLATE_FAMILY_STORE as FAMILIES,
  TEMPLATE_STORE as TEMPLATES,
} from "../storage/indexedDb";
import { collectSavedAssets } from "./assetRepository";
import {
  normalizeSavedTemplateFieldFamilyV3Record,
  normalizeSavedTemplateSessionV2Record,
  validateCurrentSavedTemplateFieldFamilyV3Record,
} from "./savedRecordValidationV2";
import {
  SAVED_TEMPLATE_FIELD_FAMILY_V2_SCHEMA_VERSION,
  SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION,
  SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION,
  type SavedAssetRecord,
  type SavedAssetReference,
  type SavedTemplateFieldFamilyRecordV2,
  type SavedTemplateFieldFamilyRecordV3,
  type IncompatibleSavedWorkRecord,
  type SavedTemplateSessionRecordV2,
  type TemplateFieldFamilyRepositoryV3,
  type TemplateSessionRepositoryV2,
} from "./types";

export interface InMemoryTemplateSessionRepositoryV2Storage {
  recoverySlots: Map<string, import("./templateRecovery").RecoverySlot>;
  templateSessions: Map<string, SavedTemplateSessionRecordV2>;
  fieldFamilies: Map<string, SavedTemplateFieldFamilyRecordV2 | SavedTemplateFieldFamilyRecordV3>;
  assets: Map<string, SavedAssetRecord>;
  references: Map<string, Set<string>>;
}

export function createInMemoryTemplateSessionRepositoryV2Storage(): InMemoryTemplateSessionRepositoryV2Storage {
  return {
    recoverySlots: new Map(),
    templateSessions: new Map(),
    fieldFamilies: new Map(),
    assets: new Map(),
    references: new Map(),
  };
}

function incompatibleRecord(value: unknown, kind: "single" | "family"): IncompatibleSavedWorkRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string") return null;
  const schemaVersion = typeof record.schemaVersion === "string" ? record.schemaVersion : "unknown";
  return {
    kind,
    id: record.id,
    name: record.name,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
    schemaVersion,
    assetReferences: Array.isArray(record.assetReferences) ? record.assetReferences.filter((item): item is string => typeof item === "string") : [],
    reason: "reimport-required",
  };
}

function currentOrNull<T>(value: unknown, normalize: (input: unknown) => T): T | null {
  try { return normalize(value); } catch { return null; }
}

/** V2-only in-memory persistence keeps the legacy repository bundle isolated. */
export class InMemoryTemplateSessionRepositoryV2 implements
  TemplateSessionRepositoryV2,
  TemplateFieldFamilyRepositoryV3 {
  constructor(
    private readonly storage: InMemoryTemplateSessionRepositoryV2Storage =
      createInMemoryTemplateSessionRepositoryV2Storage(),
  ) {}

  async getManagedAsset(hash: string): Promise<SavedAssetRecord | null> {
    return this.storage.assets.get(hash) ?? null;
  }

  async listTemplateSessionsV2(): Promise<SavedTemplateSessionRecordV2[]> {
    return [...this.storage.templateSessions.values()]
      .map((value) => currentOrNull(value, normalizeSavedTemplateSessionV2Record))
      .filter((value): value is SavedTemplateSessionRecordV2 => Boolean(value))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async listIncompatibleTemplateSessionsV2(): Promise<IncompatibleSavedWorkRecord[]> {
    return [...this.storage.templateSessions.values()].flatMap((value) =>
      currentOrNull(value, normalizeSavedTemplateSessionV2Record) ? [] : incompatibleRecord(value, "single") ?? []
    );
  }

  async getTemplateSessionV2(id: string): Promise<SavedTemplateSessionRecordV2 | null> {
    const stored = this.storage.templateSessions.get(id);
    return stored ? normalizeSavedTemplateSessionV2Record(stored) : null;
  }

  async saveTemplateSessionV2(
    record: SavedTemplateSessionRecordV2,
  ): Promise<SavedTemplateSessionRecordV2> {
    const current = normalizeSavedTemplateSessionV2Record(record);
    const assetCarrier = {
      ...structuredClone(current.basePackage),
      assets: structuredClone(current.sessionAssets),
    };
    const collected = await collectSavedAssets([current.basePackage, assetCarrier]);
    collected.assets.forEach((asset) => this.storage.assets.set(asset.hash, asset));
    const hashes = [...new Set(collected.hashes)];
    this.replaceOwnerReferences(`template-session-v2:${current.id}`, hashes);
    const stored: SavedTemplateSessionRecordV2 = {
      ...current,
      basePackage: collected.packages[0],
      sessionAssets: collected.packages[1].assets,
      assetReferences: hashes,
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    this.storage.templateSessions.set(stored.id, stored);
    return normalizeSavedTemplateSessionV2Record(stored);
  }

  async deleteTemplateSessionV2(id: string): Promise<void> {
    await createInMemoryTemplateRecoveryRepository(this.storage).removeTemplate({ kind: "single", templateId: id });
    this.storage.templateSessions.delete(id);
    this.deleteOwnerReferences(`template-session-v2:${id}`);
  }

  async deleteIncompatibleTemplateSessionV2(id: string): Promise<void> { return this.deleteTemplateSessionV2(id); }

  async listTemplateFieldFamiliesV3(): Promise<SavedTemplateFieldFamilyRecordV3[]> {
    return [...this.storage.fieldFamilies.values()]
      .map((value) => currentOrNull(value, normalizeSavedTemplateFieldFamilyV3Record))
      .filter((value): value is SavedTemplateFieldFamilyRecordV3 => Boolean(value))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async listIncompatibleTemplateFieldFamiliesV3(): Promise<IncompatibleSavedWorkRecord[]> {
    return [...this.storage.fieldFamilies.values()].flatMap((value) =>
      currentOrNull(value, normalizeSavedTemplateFieldFamilyV3Record) ? [] : incompatibleRecord(value, "family") ?? []
    );
  }

  async getTemplateFieldFamilyV3(id: string): Promise<SavedTemplateFieldFamilyRecordV3 | null> {
    const stored = this.storage.fieldFamilies.get(id);
    if (!stored) return null;
    return normalizeSavedTemplateFieldFamilyV3Record(stored);
  }

  async saveTemplateFieldFamilyV3(
    record: SavedTemplateFieldFamilyRecordV3,
  ): Promise<SavedTemplateFieldFamilyRecordV3> {
    const current = validateCurrentSavedTemplateFieldFamilyV3Record(record);
    const carriers = [
      ...current.family.variants.map((variant) => variant.packageValue),
      {
        ...structuredClone(current.family.variants[0]!.packageValue),
        assets: structuredClone(current.sessionAssets),
      },
    ];
    const collected = await collectSavedAssets(carriers);
    collected.assets.forEach((asset) => this.storage.assets.set(asset.hash, asset));
    const family = structuredClone(current.family);
    family.variants.forEach((variant, index) => {
      variant.packageValue = collected.packages[index];
    });
    const hashes = [...new Set(collected.hashes)];
    this.replaceOwnerReferences(`template-field-family-v2:${current.id}`, hashes);
    const stored: SavedTemplateFieldFamilyRecordV3 = {
      ...current,
      family,
      sessionAssets: collected.packages[collected.packages.length - 1].assets,
      assetReferences: hashes,
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    this.storage.fieldFamilies.set(stored.id, stored);
    return validateCurrentSavedTemplateFieldFamilyV3Record(stored);
  }

  async deleteTemplateFieldFamilyV3(id: string): Promise<void> {
    await createInMemoryTemplateRecoveryRepository(this.storage).removeTemplate({ kind: "family", templateId: id });
    this.storage.fieldFamilies.delete(id);
    this.deleteOwnerReferences(`template-field-family-v2:${id}`);
  }

  async deleteIncompatibleTemplateFieldFamilyV3(id: string): Promise<void> { return this.deleteTemplateFieldFamilyV3(id); }

  getAssetCountForTests(): number {
    return this.storage.assets.size;
  }

  private replaceOwnerReferences(ownerId: string, hashes: readonly string[]): void {
    const previousHashes = [...this.storage.references.entries()]
      .filter(([, owners]) => owners.has(ownerId))
      .map(([hash]) => hash);
    this.storage.references.forEach((owners) => owners.delete(ownerId));
    hashes.forEach((hash) => {
      const owners = this.storage.references.get(hash) ?? new Set<string>();
      owners.add(ownerId);
      this.storage.references.set(hash, owners);
    });
    previousHashes.forEach((hash) => {
      const owners = this.storage.references.get(hash);
      if (owners && owners.size > 0) return;
      this.storage.references.delete(hash);
      this.storage.assets.delete(hash);
    });
  }

  private deleteOwnerReferences(ownerId: string): void {
    for (const [hash, owners] of this.storage.references) {
      owners.delete(ownerId);
      if (owners.size === 0) {
        this.storage.references.delete(hash);
        this.storage.assets.delete(hash);
      }
    }
  }
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

async function managedFontOwnsHash(
  transaction: IDBTransaction,
  hash: string,
): Promise<boolean> {
  const fonts = await requestValue<ManagedFontRecord[]>(
    transaction.objectStore(MANAGED_FONTS).getAll(),
  );
  return fonts.some((font) => font.assetHash === hash);
}

/** V2-only IndexedDB persistence shares stores, never record semantics. */
export class IndexedDbTemplateSessionRepositoryV2 implements
  TemplateSessionRepositoryV2,
  TemplateFieldFamilyRepositoryV3 {
  private open(): Promise<IDBDatabase> {
    return openTemplatePlatformDatabase();
  }

  async getManagedAsset(hash: string): Promise<SavedAssetRecord | null> {
    const database = await this.open();
    const transaction = database.transaction(ASSETS, "readonly");
    return (await requestValue<SavedAssetRecord | undefined>(
      transaction.objectStore(ASSETS).get(hash),
    )) ?? null;
  }

  async listTemplateSessionsV2(): Promise<SavedTemplateSessionRecordV2[]> {
    const database = await this.open();
    const transaction = database.transaction(TEMPLATES, "readonly");
    const records = await requestValue<Array<{ schemaVersion: string }>>(
      transaction.objectStore(TEMPLATES).getAll(),
    );
    return records
      .filter((record): record is SavedTemplateSessionRecordV2 =>
        record.schemaVersion === SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION)
      .map((record) => currentOrNull(record, normalizeSavedTemplateSessionV2Record))
      .filter((record): record is SavedTemplateSessionRecordV2 => Boolean(record))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async listIncompatibleTemplateSessionsV2(): Promise<IncompatibleSavedWorkRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(TEMPLATES, "readonly");
    const records = await requestValue<unknown[]>(transaction.objectStore(TEMPLATES).getAll());
    return records.flatMap((record) => {
      const version = (record as { schemaVersion?: string }).schemaVersion;
      if (version !== "saved-template-session-v2" && version !== "saved-template-session-v3") return [];
      if (currentOrNull(record, normalizeSavedTemplateSessionV2Record)) return [];
      return incompatibleRecord(record, "single") ?? [];
    });
  }

  async getTemplateSessionV2(id: string): Promise<SavedTemplateSessionRecordV2 | null> {
    const database = await this.open();
    const transaction = database.transaction(TEMPLATES, "readonly");
    const stored = await requestValue<{ schemaVersion: string } | undefined>(
      transaction.objectStore(TEMPLATES).get(id),
    );
    return stored?.schemaVersion === SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION
      ? normalizeSavedTemplateSessionV2Record(stored)
      : null;
  }

  async saveTemplateSessionV2(
    record: SavedTemplateSessionRecordV2,
  ): Promise<SavedTemplateSessionRecordV2> {
    const current = normalizeSavedTemplateSessionV2Record(record);
    const assetCarrier = {
      ...structuredClone(current.basePackage),
      assets: structuredClone(current.sessionAssets),
    };
    const collected = await collectSavedAssets([current.basePackage, assetCarrier]);
    const stored: SavedTemplateSessionRecordV2 = {
      ...current,
      basePackage: collected.packages[0],
      sessionAssets: collected.packages[1].assets,
      assetReferences: [...new Set(collected.hashes)],
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    await this.writeRecord(TEMPLATES, `template-session-v2:${stored.id}`, stored, collected.assets);
    return normalizeSavedTemplateSessionV2Record(stored);
  }

  async deleteTemplateSessionV2(id: string): Promise<void> {
    if (await this.getTemplateSessionV2(id)) {
      await this.deleteRecord(TEMPLATES, id, `template-session-v2:${id}`);
    }
  }

  async deleteIncompatibleTemplateSessionV2(id: string): Promise<void> {
    await this.deleteRecord(TEMPLATES, id, `template-session-v2:${id}`);
  }

  async listTemplateFieldFamiliesV3(): Promise<SavedTemplateFieldFamilyRecordV3[]> {
    const database = await this.open();
    const transaction = database.transaction(FAMILIES, "readonly");
    const records = await requestValue<Array<{ schemaVersion: string }>>(
      transaction.objectStore(FAMILIES).getAll(),
    );
    return records
      .filter((record): record is SavedTemplateFieldFamilyRecordV3 =>
        record.schemaVersion === SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION)
      .map((record) => currentOrNull(record, normalizeSavedTemplateFieldFamilyV3Record))
      .filter((record): record is SavedTemplateFieldFamilyRecordV3 => Boolean(record))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async listIncompatibleTemplateFieldFamiliesV3(): Promise<IncompatibleSavedWorkRecord[]> {
    const database = await this.open();
    const transaction = database.transaction(FAMILIES, "readonly");
    const records = await requestValue<unknown[]>(transaction.objectStore(FAMILIES).getAll());
    return records.flatMap((record) => {
      const version = (record as { schemaVersion?: string }).schemaVersion;
      if (version !== SAVED_TEMPLATE_FIELD_FAMILY_V2_SCHEMA_VERSION &&
          version !== "saved-template-field-family-v3" &&
          version !== SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION) return [];
      if (currentOrNull(record, normalizeSavedTemplateFieldFamilyV3Record)) return [];
      return incompatibleRecord(record, "family") ?? [];
    });
  }

  async getTemplateFieldFamilyV3(id: string): Promise<SavedTemplateFieldFamilyRecordV3 | null> {
    const database = await this.open();
    const transaction = database.transaction(FAMILIES, "readonly");
    const stored = await requestValue<{ schemaVersion: string } | undefined>(
      transaction.objectStore(FAMILIES).get(id),
    );
    return stored?.schemaVersion === SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION
      ? validateCurrentSavedTemplateFieldFamilyV3Record(stored)
      : null;
  }

  async saveTemplateFieldFamilyV3(
    record: SavedTemplateFieldFamilyRecordV3,
  ): Promise<SavedTemplateFieldFamilyRecordV3> {
    const current = validateCurrentSavedTemplateFieldFamilyV3Record(record);
    const carriers = [
      ...current.family.variants.map((variant) => variant.packageValue),
      {
        ...structuredClone(current.family.variants[0]!.packageValue),
        assets: structuredClone(current.sessionAssets),
      },
    ];
    const collected = await collectSavedAssets(carriers);
    const family = structuredClone(current.family);
    family.variants.forEach((variant, index) => {
      variant.packageValue = collected.packages[index];
    });
    const stored: SavedTemplateFieldFamilyRecordV3 = {
      ...current,
      family,
      sessionAssets: collected.packages[collected.packages.length - 1].assets,
      assetReferences: [...new Set(collected.hashes)],
      fontReferences: collected.fontHashes,
      updatedAt: new Date().toISOString(),
    };
    await this.writeRecord(FAMILIES, `template-field-family-v2:${stored.id}`, stored, collected.assets);
    return validateCurrentSavedTemplateFieldFamilyV3Record(stored);
  }

  async deleteTemplateFieldFamilyV3(id: string): Promise<void> {
    if (await this.getTemplateFieldFamilyV3(id)) {
      await this.deleteRecord(FAMILIES, id, `template-field-family-v2:${id}`);
    }
  }

  async deleteIncompatibleTemplateFieldFamilyV3(id: string): Promise<void> {
    await this.deleteRecord(FAMILIES, id, `template-field-family-v2:${id}`);
  }

  private async writeRecord(
    storeName: string,
    ownerId: string,
    record: SavedTemplateSessionRecordV2 | SavedTemplateFieldFamilyRecordV3,
    assets: readonly SavedAssetRecord[],
  ): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(
      [storeName, ASSETS, REFERENCES, MANAGED_FONTS],
      "readwrite",
    );
    const referenceStore = transaction.objectStore(REFERENCES);
    const existing = await requestValue<SavedAssetReference[]>(
      referenceStore.index("templateId").getAll(ownerId),
    );
    existing.forEach((reference) => referenceStore.delete(reference.id));
    assets.forEach((asset) => transaction.objectStore(ASSETS).put(asset));
    record.assetReferences.forEach((hash) => referenceStore.put({
      id: `${ownerId}:${hash}`,
      templateId: ownerId,
      hash,
    } satisfies SavedAssetReference));
    for (const reference of existing) {
      if (record.assetReferences.includes(reference.hash)) continue;
      const remaining = await requestValue<IDBValidKey[]>(
        referenceStore.index("hash").getAllKeys(reference.hash),
      );
      if (remaining.length === 0 && !(await managedFontOwnsHash(transaction, reference.hash))) {
        transaction.objectStore(ASSETS).delete(reference.hash);
      }
    }
    transaction.objectStore(storeName).put(record);
    await transactionDone(transaction);
  }

  private async deleteRecord(
    storeName: string,
    id: string,
    ownerId: string,
  ): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(
      [storeName, ASSETS, REFERENCES, MANAGED_FONTS, RECOVERY_STORE],
      "readwrite",
    );
    const referenceStore = transaction.objectStore(REFERENCES);
    const recoveryId = JSON.stringify([storeName === FAMILIES ? "family" : "single", id]);
    const recoveryStore = transaction.objectStore(RECOVERY_STORE);
    const recovery = await requestValue<import("./templateRecovery").RecoverySlot | undefined>(recoveryStore.get(recoveryId));
    if (recovery) recoveryStore.put({ ...recovery, token: null, payload: null });
    const recoveryReferences = await requestValue<SavedAssetReference[]>(referenceStore.index("templateId").getAll(`recovery:${recoveryId}`));
    const references = await requestValue<SavedAssetReference[]>(
      referenceStore.index("templateId").getAll(ownerId),
    );
    references.push(...recoveryReferences);
    transaction.objectStore(storeName).delete(id);
    references.forEach((reference) => referenceStore.delete(reference.id));
    for (const reference of references) {
      const remaining = await requestValue<IDBValidKey[]>(
        referenceStore.index("hash").getAllKeys(reference.hash),
      );
      if (remaining.length === 0 && !(await managedFontOwnsHash(transaction, reference.hash))) {
        transaction.objectStore(ASSETS).delete(reference.hash);
      }
    }
    await transactionDone(transaction);
  }
}
