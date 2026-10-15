export const TEMPLATE_PLATFORM_DB_NAME = "template-package-platform";
export const TEMPLATE_PLATFORM_DB_VERSION = 5;
export const RECOVERY_STORE = "templateRecovery";
export const TEMPLATE_STORE = "templates";
export const OUTPUT_DRAFT_STORE = "outputDrafts";
export const TEMPLATE_FAMILY_STORE = "templateFamilies";
export const TEMPLATE_FAMILY_DRAFT_STORE = "templateFamilyDrafts";
export const ASSET_STORE = "assets";
export const ASSET_REFERENCE_STORE = "assetReferences";
export const METADATA_STORE = "metadata";
export const MANAGED_FONT_STORE = "managedFonts";
export const FONT_MAPPING_STORE = "fontMappings";

let databasePromise: Promise<IDBDatabase> | null = null;
let blockedAttempt: { error: TemplateStorageBlockedError } | null = null;

export class TemplateStorageBlockedError extends Error {
  readonly code = "template-storage-blocked";
  readonly retryable = true;
  constructor(readonly databaseName: string, readonly requestedVersion: number) {
    super("Local storage is blocked. Close other tabs or windows of this app, then retry.");
    this.name = "TemplateStorageBlockedError";
  }
}

export function openTemplatePlatformDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  // A rejected request still occupies the native open queue until success/error.
  if (blockedAttempt) return Promise.reject(blockedAttempt.error);
  let resolve!: (database: IDBDatabase) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<IDBDatabase>((accept, fail) => { resolve = accept; reject = fail; });
  const attempt = { error: new TemplateStorageBlockedError(TEMPLATE_PLATFORM_DB_NAME, TEMPLATE_PLATFORM_DB_VERSION) };
  let settled = false;
  let nativeFinished = false;
  let closed = false;
  let acceptedConnection: IDBDatabase | null = null;
  const clearOwnedCache = () => { if (databasePromise === promise) databasePromise = null; };
  const fail = (cause: unknown) => {
    if (settled) return;
    settled = true; clearOwnedCache(); reject(cause);
  };
  const finishNative = () => {
    if (nativeFinished) return false;
    nativeFinished = true;
    if (blockedAttempt === attempt) blockedAttempt = null;
    return true;
  };
  // Publish before invoking native code: indexedDB.open can throw synchronously.
  databasePromise = promise;
  try {
    const request = indexedDB.open(
      TEMPLATE_PLATFORM_DB_NAME,
      TEMPLATE_PLATFORM_DB_VERSION,
    );
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECOVERY_STORE)) {
        const recovery = database.createObjectStore(RECOVERY_STORE, { keyPath: "id" });
        recovery.createIndex("legacyKeys", "legacyKeys", { multiEntry: true });
      }
      if (!database.objectStoreNames.contains(TEMPLATE_STORE)) {
        database.createObjectStore(TEMPLATE_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(OUTPUT_DRAFT_STORE)) {
        database.createObjectStore(OUTPUT_DRAFT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(TEMPLATE_FAMILY_STORE)) {
        database.createObjectStore(TEMPLATE_FAMILY_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(TEMPLATE_FAMILY_DRAFT_STORE)) {
        database.createObjectStore(TEMPLATE_FAMILY_DRAFT_STORE, { keyPath: "id" });
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
    request.onblocked = () => {
      if (settled || nativeFinished) return;
      blockedAttempt = attempt;
      fail(attempt.error);
    };
    request.onsuccess = () => {
      const database = request.result;
      const close = () => { if (!closed) { closed = true; database.close(); } };
      if (!finishNative()) {
        if (!acceptedConnection) close();
        return;
      }
      if (settled) { close(); return; }
      settled = true;
      acceptedConnection = database;
      database.onversionchange = () => { close(); clearOwnedCache(); };
      resolve(database);
    };
    request.onerror = () => {
      if (finishNative()) fail(request.error);
    };
  } catch (cause) { finishNative(); fail(cause); }
  return promise;
}
