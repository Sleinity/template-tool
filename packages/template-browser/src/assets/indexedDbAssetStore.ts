import { sessionAssetUrlLeases } from "../session/sessionAssetUrlLeases";
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
        transaction.onabort = transaction.onerror = () => {
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
  const owned = new Set<string>();
  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const url of owned) {
        const lease = sessionAssetUrlLeases.get(url)!;
        if (--lease.count === 0) { sessionAssetUrlLeases.delete(url); lease.revoke(); }
      }
      owned.clear();
    },
    async put(
      hash: string,
      bytes: Uint8Array,
      mimeType: string,
    ): Promise<AssetStorageReference> {
      if (disposed) throw new Error("Asset store is disposed.");
      const storageKey = `sha256:${hash}`;
      const blob = new Blob([Uint8Array.from(bytes).buffer], {
        type: mimeType,
      });
      await writeBlob(storageKey, blob);
      if (disposed) throw new Error("Asset store was disposed during storage.");
      let stableUrl = objectUrlCache.get(storageKey);
      if (!stableUrl) {
        stableUrl = URL.createObjectURL(blob);
        objectUrlCache.set(storageKey, stableUrl);
        const created = stableUrl;
        sessionAssetUrlLeases.set(created, { count: 0, revoke() {
          if (objectUrlCache.get(storageKey) === created) objectUrlCache.delete(storageKey);
          URL.revokeObjectURL(created);
        } });
      }
      if (!owned.has(stableUrl)) { owned.add(stableUrl); sessionAssetUrlLeases.get(stableUrl)!.count += 1; }
      return { storageKey, stableUrl };
    },
  };
}
