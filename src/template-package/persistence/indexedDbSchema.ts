export const TEMPLATE_PLATFORM_DB_NAME = "template-package-platform";
export const TEMPLATE_PLATFORM_DB_VERSION = 3;
export const TEMPLATE_STORE = "templates";
export const OUTPUT_DRAFT_STORE = "outputDrafts";
export const ASSET_STORE = "assets";
export const ASSET_REFERENCE_STORE = "assetReferences";
export const METADATA_STORE = "metadata";
export const MANAGED_FONT_STORE = "managedFonts";
export const FONT_MAPPING_STORE = "fontMappings";

let databasePromise: Promise<IDBDatabase> | null = null;

export function openTemplatePlatformDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(
      TEMPLATE_PLATFORM_DB_NAME,
      TEMPLATE_PLATFORM_DB_VERSION,
    );
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(TEMPLATE_STORE)) {
        database.createObjectStore(TEMPLATE_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(OUTPUT_DRAFT_STORE)) {
        database.createObjectStore(OUTPUT_DRAFT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        database.createObjectStore(ASSET_STORE, { keyPath: "hash" });
      }
      if (!database.objectStoreNames.contains(ASSET_REFERENCE_STORE)) {
        const store = database.createObjectStore(ASSET_REFERENCE_STORE, {
          keyPath: "id",
        });
        store.createIndex("templateId", "templateId");
        store.createIndex("hash", "hash");
      }
      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        database.createObjectStore(METADATA_STORE);
      }
      if (!database.objectStoreNames.contains(MANAGED_FONT_STORE)) {
        database.createObjectStore(MANAGED_FONT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(FONT_MAPPING_STORE)) {
        database.createObjectStore(FONT_MAPPING_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error);
    };
  });
  return databasePromise;
}
