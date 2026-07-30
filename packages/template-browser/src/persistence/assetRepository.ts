import type { PackageAsset, TemplatePackageV1 } from "@sleinity/template-core";
import type { SavedAssetRecord } from "./types";

const runtimeUrls = new Map<string, string>();

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function assetPayload(
  asset: PackageAsset,
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const dataUrl = asset.dataUrl ?? asset.data;
  if (dataUrl) {
    const match = dataUrl.match(/^data:([^;,]+)(?:;[^,]*)?,(.*)$/is);
    if (!match) return null;
    try {
      return {
        bytes: /;base64,/i.test(dataUrl)
          ? decodeBase64(match[2])
          : new TextEncoder().encode(decodeURIComponent(match[2])),
        mimeType: match[1].toLowerCase(),
      };
    } catch {
      return null;
    }
  }
  if (asset.svgString) {
    return {
      bytes: new TextEncoder().encode(asset.svgString),
      mimeType: asset.mimeType ?? "image/svg+xml",
    };
  }
  if (asset.stableUrl?.startsWith("blob:") && typeof fetch === "function") {
    try {
      const response = await fetch(asset.stableUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mimeType: blob.type || asset.mimeType || "application/octet-stream",
      };
    } catch {
      return null;
    }
  }
  return null;
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    Uint8Array.from(bytes).buffer,
  );
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSavedAssetRecord(
  blob: Blob,
): Promise<SavedAssetRecord> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    hash: await hashBytes(bytes),
    blob,
    mimeType: blob.type || "application/octet-stream",
    sizeBytes: bytes.byteLength,
    createdAt: new Date().toISOString(),
  };
}

export async function collectSavedAssets(
  packages: TemplatePackageV1[],
): Promise<{
  assets: SavedAssetRecord[];
  hashes: string[];
  fontHashes: string[];
  packages: TemplatePackageV1[];
}> {
  const nextPackages = packages.map((item) => structuredClone(item));
  const records = new Map<string, SavedAssetRecord>();
  const hashes = new Set<string>();
  const fontHashes = new Set<string>();
  for (const packageValue of nextPackages) {
    for (const asset of Object.values(packageValue.assets)) {
      const payload = await assetPayload(asset);
      if (!payload) {
        if (asset.hash) {
          hashes.add(asset.hash);
          if (asset.type === "font") fontHashes.add(asset.hash);
        }
        continue;
      }
      const hash = asset.hash ?? (await hashBytes(payload.bytes));
      asset.hash = hash;
      asset.storageKey = `sha256:${hash}`;
      if (asset.stableUrl?.startsWith("blob:")) delete asset.stableUrl;
      hashes.add(hash);
      if (asset.type === "font") fontHashes.add(hash);
      if (!records.has(hash)) {
        records.set(hash, {
          hash,
          blob: new Blob([Uint8Array.from(payload.bytes).buffer], {
            type: payload.mimeType,
          }),
          mimeType: payload.mimeType,
          sizeBytes: payload.bytes.byteLength,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }
  return {
    assets: Array.from(records.values()),
    hashes: Array.from(hashes),
    fontHashes: Array.from(fontHashes),
    packages: nextPackages,
  };
}

export async function hydratePackageAssets(
  packageValue: TemplatePackageV1,
  getAsset: (hash: string) => Promise<SavedAssetRecord | null>,
): Promise<TemplatePackageV1> {
  const hydrated = structuredClone(packageValue);
  for (const asset of Object.values(hydrated.assets)) {
    if (!asset.hash) continue;
    const record = await getAsset(asset.hash);
    if (!record) continue;
    let url = runtimeUrls.get(record.hash);
    if (!url) {
      url = URL.createObjectURL(record.blob);
      runtimeUrls.set(record.hash, url);
    }
    asset.source = "stored";
    asset.storageKey = `sha256:${record.hash}`;
    asset.stableUrl = url;
  }
  return hydrated;
}

export function stripRuntimeAssetUrls(
  packageValue: TemplatePackageV1,
): TemplatePackageV1 {
  const next = structuredClone(packageValue);
  Object.values(next.assets).forEach((asset) => {
    if (asset.stableUrl?.startsWith("blob:")) delete asset.stableUrl;
  });
  return next;
}
