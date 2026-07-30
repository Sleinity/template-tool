import type {
  AssetStorageAdapter,
  AssetStorageReference,
} from "./assetReliability";

const databaseName = "template-package-assets";
const objectStoreName = "assets";
const objectUrlCache = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(objectStoreName)) {
        request.result.createObjectStore(objectStoreName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writeBlob(key: string, blob: Blob): Promise<void> {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(
          objectStoreName,
          "readwrite",
        );
        transaction.objectStore(objectStoreName).put(blob, key);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      }),
  );
}

export function createIndexedDbAssetStore(): AssetStorageAdapter | undefined {
  if (
    typeof indexedDB === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return undefined;
  }
  return {
    async put(
      hash: string,
      bytes: Uint8Array,
      mimeType: string,
    ): Promise<AssetStorageReference> {
      const storageKey = `sha256:${hash}`;
      const blob = new Blob([Uint8Array.from(bytes).buffer], {
        type: mimeType,
      });
      await writeBlob(storageKey, blob);
      let stableUrl = objectUrlCache.get(storageKey);
      if (!stableUrl) {
        stableUrl = URL.createObjectURL(blob);
        objectUrlCache.set(storageKey, stableUrl);
      }
      return { storageKey, stableUrl };
    },
  };
}
