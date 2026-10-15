import type { PackageAsset, TemplatePackageV1 } from "@sleinity/template-core";
import type { TemplateFamilyV1 } from "@sleinity/template-core/family";
import type { SavedAssetRecord } from "./types";


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

type AssetBearingPackage = { assets: Record<string, PackageAsset> };

export async function collectSavedAssets<PackageValue extends AssetBearingPackage>(
  packages: readonly PackageValue[],
): Promise<{
  assets: SavedAssetRecord[];
  hashes: string[];
  fontHashes: string[];
  packages: PackageValue[];
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

export async function collectSavedAssetMap(
  input: TemplatePackageV1["assets"],
): Promise<{
  assets: SavedAssetRecord[];
  hashes: string[];
  fontHashes: string[];
  assetMap: TemplatePackageV1["assets"];
}> {
  const assetMap = structuredClone(input);
  const records = new Map<string, SavedAssetRecord>();
  const hashes = new Set<string>();
  const fontHashes = new Set<string>();
  for (const asset of Object.values(assetMap)) {
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
  return {
    assets: Array.from(records.values()),
    hashes: Array.from(hashes),
    fontHashes: Array.from(fontHashes),
    assetMap,
  };
}

export function stripRuntimeAssetUrls(
  packageValue: TemplatePackageV1,
): TemplatePackageV1;
export function stripRuntimeAssetUrls<PackageValue extends AssetBearingPackage>(
  packageValue: PackageValue,
): PackageValue;
export function stripRuntimeAssetUrls<PackageValue extends AssetBearingPackage>(
  packageValue: PackageValue,
): PackageValue {
  const next = structuredClone(packageValue);
  Object.values(next.assets).forEach((asset) => {
    if (asset.stableUrl?.startsWith("blob:")) delete asset.stableUrl;
  });
  return next;
}

export async function collectSavedTemplateFamilyAssets(
  family: TemplateFamilyV1,
  sharedImageAssets: TemplatePackageV1["assets"],
): Promise<{
  assets: SavedAssetRecord[];
  hashes: string[];
  fontHashes: string[];
  family: TemplateFamilyV1;
  sharedImageAssets: TemplatePackageV1["assets"];
}> {
  const firstVariant = family.variants[0];
  if (!firstVariant) {
    throw new Error("A template family requires a variant before its assets can be saved.");
  }
  const sharedAssetPackage: TemplatePackageV1 = {
    ...structuredClone(firstVariant.packageValue),
    packageId: `${firstVariant.packageValue.packageId}:family-shared-assets`,
    assets: structuredClone(sharedImageAssets),
  };
  const collected = await collectSavedAssets([
    ...family.variants.map((variant) => variant.packageValue),
    sharedAssetPackage,
  ]);
  const nextFamily = structuredClone(family);
  nextFamily.variants.forEach((variant, index) => {
    variant.packageValue = collected.packages[index];
  });
  return {
    assets: collected.assets,
    hashes: collected.hashes,
    fontHashes: collected.fontHashes,
    family: nextFamily,
    sharedImageAssets: collected.packages[collected.packages.length - 1].assets,
  };
}

