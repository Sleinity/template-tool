import {
  ASSET_STORE,
  FONT_MAPPING_STORE,
  MANAGED_FONT_STORE,
  openTemplatePlatformDatabase,
} from "../storage/indexedDb";
import type { SavedAssetRecord } from "../storage/contentAddressedBinary";
import { serializeFontRequirementKey } from "./fontMatching";
import { createManagedFontRecord, normalizeManagedFontRecord } from "./managedFontRecord";
import {
  type FontRequirementKey,
  type ManagedFontMapping,
  type ManagedFontRecord,
  type ManagedFontRegistrationInput,
  type ManagedFontRegistry,
} from "./fontRegistryTypes";

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

async function hashBytes(source: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function recordId(
  input: Pick<ManagedFontRegistrationInput, "faceIndex">,
  hash: string,
): string {
  return `managed-font:${hash.slice(0, 12)}:${input.faceIndex ?? 0}`;
}

export class IndexedDbManagedFontRegistry implements ManagedFontRegistry {
  async listManagedFonts(): Promise<ManagedFontRecord[]> {
    const database = await openTemplatePlatformDatabase();
    const transaction = database.transaction(MANAGED_FONT_STORE, "readonly");
    const records = await requestValue<ManagedFontRecord[]>(
      transaction.objectStore(MANAGED_FONT_STORE).getAll(),
    );
    return records.map(normalizeManagedFontRecord).sort((left, right) =>
      left.family.localeCompare(right.family),
    );
  }

  async getManagedFont(id: string): Promise<ManagedFontRecord | null> {
    const database = await openTemplatePlatformDatabase();
    const transaction = database.transaction(MANAGED_FONT_STORE, "readonly");
    const record = await requestValue<ManagedFontRecord | undefined>(
      transaction.objectStore(MANAGED_FONT_STORE).get(id),
    );
    return record ? normalizeManagedFontRecord(record) : null;
  }

  async registerUploadedFont(
    input: ManagedFontRegistrationInput,
  ): Promise<ManagedFontRecord> {
    const hash = await hashBytes(input.bytes);
    const id = recordId(input, hash);
    const database = await openTemplatePlatformDatabase();
    const transaction = database.transaction(
      [MANAGED_FONT_STORE, ASSET_STORE],
      "readwrite",
    );
    const fontStore = transaction.objectStore(MANAGED_FONT_STORE);
    const existing = await requestValue<ManagedFontRecord | undefined>(
      fontStore.get(id),
    );
    const now = new Date().toISOString();
    const record: ManagedFontRecord = existing
      ? {
          ...normalizeManagedFontRecord(existing),
          updatedAt: now,
          lastUsedAt: now,
          aliases: Array.from(
            new Set([...existing.aliases, ...(input.aliases ?? [])]),
          ),
          trustedForFamilies: Array.from(
            new Set([
              ...existing.trustedForFamilies,
              ...(input.trustedForFamilies ?? []),
            ]),
          ),
        }
      : createManagedFontRecord(id, hash, input, now);
    const asset: SavedAssetRecord = {
      hash,
      blob: new Blob([input.bytes], { type: input.mimeType }),
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
      createdAt: existing?.createdAt ?? now,
    };
    transaction.objectStore(ASSET_STORE).put(asset);
    fontStore.put(record);
    await transactionDone(transaction);
    return structuredClone(record);
  }

  async getMapping(
    key: FontRequirementKey,
  ): Promise<ManagedFontMapping | null> {
    const database = await openTemplatePlatformDatabase();
    const transaction = database.transaction(FONT_MAPPING_STORE, "readonly");
    return (
      (await requestValue<ManagedFontMapping | undefined>(
        transaction
          .objectStore(FONT_MAPPING_STORE)
          .get(serializeFontRequirementKey(key)),
      )) ?? null
    );
  }

  async linkRequirementToManagedFont(
    key: FontRequirementKey,
    managedFontId: string,
    details?: Omit<ManagedFontMapping, "id" | "managedFontId" | "createdAt" | "updatedAt">,
  ): Promise<void> {
    const database = await openTemplatePlatformDatabase();
    const transaction = database.transaction(
      [FONT_MAPPING_STORE, MANAGED_FONT_STORE],
      "readwrite",
    );
    const id = serializeFontRequirementKey(key);
    const mappingStore = transaction.objectStore(FONT_MAPPING_STORE);
    const previous = await requestValue<ManagedFontMapping | undefined>(
      mappingStore.get(id),
    );
    const now = new Date().toISOString();
    mappingStore.put({
      id,
      managedFontId,
      ...details,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    } satisfies ManagedFontMapping);
    const fontStore = transaction.objectStore(MANAGED_FONT_STORE);
    const font = await requestValue<ManagedFontRecord | undefined>(
      fontStore.get(managedFontId),
    );
    if (font) {
      fontStore.put({
        ...font,
        lastUsedAt: now,
        updatedAt: now,
        usageCount: font.usageCount + 1,
      });
    }
    await transactionDone(transaction);
  }

  async unlinkRequirement(key: FontRequirementKey): Promise<void> {
    const database = await openTemplatePlatformDatabase();
    const transaction = database.transaction(
      FONT_MAPPING_STORE,
      "readwrite",
    );
    transaction
      .objectStore(FONT_MAPPING_STORE)
      .delete(serializeFontRequirementKey(key));
    await transactionDone(transaction);
  }

  async deleteManagedFont(id: string): Promise<void> {
    const database = await openTemplatePlatformDatabase();
    const transaction = database.transaction(
      [MANAGED_FONT_STORE, FONT_MAPPING_STORE],
      "readwrite",
    );
    transaction.objectStore(MANAGED_FONT_STORE).delete(id);
    const mappings = await requestValue<ManagedFontMapping[]>(
      transaction.objectStore(FONT_MAPPING_STORE).getAll(),
    );
    mappings
      .filter((mapping) => mapping.managedFontId === id)
      .forEach((mapping) =>
        transaction.objectStore(FONT_MAPPING_STORE).delete(mapping.id),
      );
    await transactionDone(transaction);
  }

  async getFontBlob(assetHash: string): Promise<Blob | null> {
    const database = await openTemplatePlatformDatabase();
    const transaction = database.transaction(ASSET_STORE, "readonly");
    const record = await requestValue<SavedAssetRecord | undefined>(
      transaction.objectStore(ASSET_STORE).get(assetHash),
    );
    return record?.blob ?? null;
  }
}
