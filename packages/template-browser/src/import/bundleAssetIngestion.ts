import {
  collectAssetUsage,
  type AssetStorageAdapter,
  type AssetStorageReference,
} from "../assets/assetReliability";
import {
  type LoadedTemplatePackageSource,
  type PackageAsset,
  type TemplatePackageBundleDiagnostic,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {
  resolvePackageAssetReference,
  type BundleAssetManifestEntry,
  type ResolvedPackageAsset,
  type TemplateAssetBridge,
} from "../internal/core";

export interface BundleAssetIngestionResult {
  packageValue: TemplatePackageV1 | null;
  diagnostics: TemplatePackageBundleDiagnostic[];
  resolvedAssetCount: number;
  persistedAssetCount: number;
  unresolvedAssetCount: number;
  storedAssetHashes: string[];
  resolvedAssets: ResolvedPackageAsset[];
}

function diagnostic(
  code: string,
  severity: TemplatePackageBundleDiagnostic["severity"],
  message: string,
  input: {
    path?: string;
    assetId?: string;
    ref?: string;
    sourceNodeId?: string;
    details?: Record<string, unknown>;
  } = {},
): TemplatePackageBundleDiagnostic {
  return {
    code,
    severity,
    category: "asset",
    message,
    ...input,
  };
}

function bytesFromBuffer(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      Uint8Array.from(bytes).buffer,
    );
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  let hash = 2166136261;
  for (const value of bytes) {
    hash ^= value;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function extensionMimeType(path: string | undefined): string | undefined {
  if (!path) return undefined;
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.endsWith(".otf")) return "font/otf";
  return undefined;
}

function sourceId(asset: PackageAsset): string | undefined {
  const bundleSource = asset.extensions?.bundleSource;
  if (!bundleSource || typeof bundleSource !== "object") return undefined;
  const src = (bundleSource as { src?: unknown }).src;
  return typeof src === "string" && src.length > 0 ? src : undefined;
}

function updatePackageAssetFromBundle(
  asset: PackageAsset,
  manifestEntry: BundleAssetManifestEntry,
  bytes: Uint8Array,
  hash: string,
  stored: AssetStorageReference | null,
  usedBy: string[],
): void {
  asset.hash = hash;
  asset.sizeBytes = bytes.byteLength;
  asset.sizeKb = Math.round((bytes.byteLength / 1024) * 10) / 10;
  asset.usedBy = usedBy;
  asset.mimeType =
    manifestEntry.mimeType ??
    asset.mimeType ??
    extensionMimeType(manifestEntry.normalizedPath);
  if (manifestEntry.file?.width) asset.width = manifestEntry.file.width;
  if (manifestEntry.file?.height) asset.height = manifestEntry.file.height;
  if (manifestEntry.usage?.scaleMode) asset.scaleMode = manifestEntry.usage.scaleMode;

  asset.extensions = {
    ...asset.extensions,
    bundleSource: {
      ...(asset.extensions?.bundleSource &&
      typeof asset.extensions.bundleSource === "object"
        ? asset.extensions.bundleSource
        : {}),
      manifestId: manifestEntry.id,
      aliases: manifestEntry.aliases,
      packagePath: manifestEntry.normalizedPath,
      originalEntryName: manifestEntry.path,
      sourceNodeId: manifestEntry.sourceNodeId,
      byteSize: manifestEntry.byteSize,
      declaredByteSize: manifestEntry.byteSize,
      actualByteSize: bytes.byteLength,
      zipCompressedSize: manifestEntry.zipFile?.compressedSize,
      zipUncompressedSize: manifestEntry.zipFile?.uncompressedSize,
    },
  };

  if (stored) {
    asset.source = "stored";
    asset.storageKey = stored.storageKey;
    asset.stableUrl = stored.stableUrl;
    delete asset.data;
    delete asset.dataUrl;
  }
}

export async function ingestLoadedSourceBundleAssets(
  source: LoadedTemplatePackageSource,
  storage?: AssetStorageAdapter,
): Promise<BundleAssetIngestionResult> {
  if (!source.packageValue) {
    return {
      packageValue: null,
      diagnostics: [
        diagnostic(
          "ASSET_INGESTION_SKIPPED",
          "warning",
          "ZIP assets could not be ingested because the package did not parse successfully.",
        ),
      ],
      resolvedAssetCount: 0,
      persistedAssetCount: 0,
      unresolvedAssetCount: 0,
      storedAssetHashes: [],
      resolvedAssets: [],
    };
  }

  if (!source.reader) {
    return {
      packageValue: structuredClone(source.packageValue),
      diagnostics: [
        diagnostic(
          "ASSET_INGESTION_SKIPPED",
          "info",
          "No ZIP reader is attached to this loaded source, so ZIP asset ingestion was skipped.",
        ),
      ],
      resolvedAssetCount: 0,
      persistedAssetCount: 0,
      unresolvedAssetCount: 0,
      storedAssetHashes: [],
      resolvedAssets: [],
    };
  }

  const packageValue = structuredClone(source.packageValue);
  const usage = collectAssetUsage(packageValue);
  const bridge = packageValue.assets as unknown as TemplateAssetBridge;
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  const storedByHash = new Map<string, AssetStorageReference>();
  const storedAssetHashes = new Set<string>();
  let resolvedAssetCount = 0;
  let persistedAssetCount = 0;
  let unresolvedAssetCount = 0;

  for (const asset of Object.values(packageValue.assets)) {
    const ref = sourceId(asset) ?? asset.id;
    const resolution = source.assetRegistry.resolve(ref, bridge);
    diagnostics.push(...resolution.diagnostics);

    if (!resolution.asset) {
      unresolvedAssetCount += 1;
      continue;
    }

    resolvedAssetCount += 1;
    const manifestEntry = resolution.asset;
    const path = manifestEntry.normalizedPath;
    if (!path) {
      diagnostics.push(
        diagnostic(
          "ASSET_FILE_MISSING",
          "warning",
          `Resolved asset ${manifestEntry.id} does not include a safe ZIP path.`,
          { assetId: asset.id, ref, sourceNodeId: manifestEntry.sourceNodeId },
        ),
      );
      continue;
    }

    const read = source.reader.readArrayBuffer(path);
    if (!read.ok || !read.value) {
      diagnostics.push(
        diagnostic(
          "ASSET_FILE_UNREADABLE",
          "error",
          `Resolved ZIP asset could not be read: ${path}`,
          {
            assetId: asset.id,
            ref,
            path,
            sourceNodeId: manifestEntry.sourceNodeId,
            details: { diagnostics: read.diagnostics },
          },
        ),
      );
      continue;
    }

    const bytes = bytesFromBuffer(read.value);
    const hash = manifestEntry.hash ?? asset.hash ?? (await sha256(bytes));
    const mimeType =
      manifestEntry.mimeType ??
      asset.mimeType ??
      extensionMimeType(path) ??
      "application/octet-stream";
    let stored: AssetStorageReference | null = null;

    if (storage) {
      try {
        stored = storedByHash.get(hash) ?? null;
        if (!stored) {
          stored = await storage.put(hash, bytes, mimeType);
          storedByHash.set(hash, stored);
        }
        persistedAssetCount += 1;
        storedAssetHashes.add(hash);
      } catch {
        diagnostics.push(
          diagnostic(
            "ASSET_STORAGE_FAILED",
            "warning",
            `Resolved ZIP asset ${asset.id} could not be persisted; ZIP provenance remains available for retry.`,
            { assetId: asset.id, ref, path, sourceNodeId: manifestEntry.sourceNodeId },
          ),
        );
      }
    }

    updatePackageAssetFromBundle(
      asset,
      manifestEntry,
      bytes,
      hash,
      stored,
      usage.get(asset.id) ?? [],
    );
  }

  return {
    packageValue,
    diagnostics,
    resolvedAssetCount,
    persistedAssetCount,
    unresolvedAssetCount,
    storedAssetHashes: Array.from(storedAssetHashes),
    resolvedAssets: Object.values(packageValue.assets).flatMap((asset) => {
      const resolution = resolvePackageAssetReference(packageValue, asset.id);
      return resolution ? [resolution] : [];
    }),
  };
}
