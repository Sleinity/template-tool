import type {
  PackageAsset,
  PackageAssetSource,
  PackageAssetType,
  TemplatePackageV1,
} from "../types";
import { canonicalPackageAssetId } from "./packageAssetResolution";

export const LARGE_EMBEDDED_ASSET_BYTES = 2 * 1024 * 1024;

export type AssetReliabilityStatus =
  | "ready"
  | "missing"
  | "unsupported"
  | "remote-only";

export interface AssetStorageReference {
  storageKey: string;
  stableUrl: string;
}

export interface AssetStorageAdapter {
  put(
    hash: string,
    bytes: Uint8Array,
    mimeType: string,
  ): Promise<AssetStorageReference>;
}

export interface AssetReliabilityEntry {
  id: string;
  type: PackageAssetType;
  originalSource: PackageAssetSource;
  sourceUsed: "stored" | "remote" | "embedded" | "missing";
  storageKey?: string;
  stableUrl?: string;
  hash?: string;
  mimeType?: string;
  sizeBytes: number;
  sizeKb: number;
  usedBy: string[];
  duplicateOf?: string;
  status: AssetReliabilityStatus;
}

export interface AssetReliabilityDiagnostic {
  code:
    | "asset-missing"
    | "asset-unsupported"
    | "asset-large-embedded-summary"
    | "asset-duplicate"
    | "asset-remote-only"
    | "asset-storage-failed";
  severity: "info" | "warning" | "error";
  message: string;
  assetId?: string;
}

export interface AssetReliabilityReport {
  totalAssets: number;
  storedAssets: number;
  embeddedAssets: number;
  remoteAssets: number;
  missingAssets: number;
  duplicateAssets: number;
  totalWeightBytes: number;
  totalWeightKb: number;
  largestAssets: AssetReliabilityEntry[];
  entries: AssetReliabilityEntry[];
  diagnostics: AssetReliabilityDiagnostic[];
}

export interface AssetIngestionResult {
  packageValue: TemplatePackageV1;
  report: AssetReliabilityReport;
}

interface EmbeddedPayload {
  bytes: Uint8Array;
  mimeType: string;
}

const supportedAssetTypes = new Set<PackageAssetType>([
  "image",
  "svg",
  "vector",
  "font",
]);

function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decodeBase64(value: string): Uint8Array {
  const decoded = atob(value);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

function embeddedPayload(asset: PackageAsset): EmbeddedPayload | null {
  const dataUrl = asset.dataUrl ?? asset.data;
  if (dataUrl) {
    const match = dataUrl.match(/^data:([^;,]+)(?:;[^,]*)?,(.*)$/is);
    if (!match) return null;
    const mimeType = match[1].toLowerCase();
    const payload = match[2];
    try {
      return {
        bytes: /;base64,/i.test(dataUrl)
          ? decodeBase64(payload)
          : utf8Bytes(decodeURIComponent(payload)),
        mimeType,
      };
    } catch {
      return null;
    }
  }
  if (asset.svgString) {
    return {
      bytes: utf8Bytes(asset.svgString),
      mimeType: asset.mimeType ?? "image/svg+xml",
    };
  }
  return null;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const buffer = Uint8Array.from(bytes).buffer;
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      buffer,
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

export function collectAssetUsage(
  packageValue: TemplatePackageV1,
): Map<string, string[]> {
  const usage = new Map<string, Set<string>>();
  const add = (assetId: string | null | undefined, nodeId: string) => {
    if (!assetId) return;
    const canonicalId = canonicalPackageAssetId(packageValue, assetId) ?? assetId;
    const nodes = usage.get(canonicalId) ?? new Set<string>();
    nodes.add(nodeId);
    usage.set(canonicalId, nodes);
  };
  Object.values(packageValue.nodes).forEach((node) => {
    add(node.image?.assetId, node.id);
    add(node.vector?.assetId, node.id);
    node.appearance.fills.forEach((paint) => {
      if (paint.type === "IMAGE") add(paint.assetId, node.id);
    });
  });
  packageValue.fontRequirements?.forEach((font) => {
    if (!font.assetId) return;
    font.usedBy.forEach((nodeId) => add(font.assetId, nodeId));
  });
  add(packageValue.referencePreview?.assetId, "referencePreview");
  return new Map(
    Array.from(usage.entries()).map(([assetId, nodes]) => [
      assetId,
      Array.from(nodes),
    ]),
  );
}

function sourceUsed(
  asset: PackageAsset,
): AssetReliabilityEntry["sourceUsed"] {
  if (asset.stableUrl) return "stored";
  if (
    asset.type === "font" &&
    asset.source === "stored" &&
    asset.storageKey &&
    typeof asset.extensions?.managedFontId === "string"
  ) return "stored";
  if (asset.url) return "remote";
  if (asset.dataUrl || asset.data || asset.svgString) return "embedded";
  return "missing";
}

export function analyzeAssetReliability(
  packageValue: TemplatePackageV1,
): AssetReliabilityReport {
  const usage = collectAssetUsage(packageValue);
  const firstByHash = new Map<string, string>();
  const entries = Object.values(packageValue.assets).map(
    (asset): AssetReliabilityEntry => {
      const payload = embeddedPayload(asset);
      const sizeBytes = asset.sizeBytes ?? payload?.bytes.byteLength ?? 0;
      const duplicateOf =
        asset.hash && firstByHash.has(asset.hash)
          ? firstByHash.get(asset.hash)
          : undefined;
      if (asset.hash && !firstByHash.has(asset.hash)) {
        firstByHash.set(asset.hash, asset.id);
      }
      const resolvedSource = sourceUsed(asset);
      const supported = supportedAssetTypes.has(asset.type);
      return {
        id: asset.id,
        type: asset.type,
        originalSource: asset.source,
        sourceUsed: resolvedSource,
        storageKey: asset.storageKey,
        stableUrl: asset.stableUrl,
        hash: asset.hash,
        mimeType: asset.mimeType,
        sizeBytes,
        sizeKb: Math.round((sizeBytes / 1024) * 10) / 10,
        usedBy: asset.usedBy ?? usage.get(asset.id) ?? [],
        duplicateOf,
        status: !supported
          ? "unsupported"
          : resolvedSource === "missing"
            ? "missing"
            : resolvedSource === "remote"
              ? "remote-only"
              : "ready",
      };
    },
  );
  const diagnostics: AssetReliabilityDiagnostic[] = [];
  const largeEmbedded = entries.filter(
    (entry) =>
      entry.sourceUsed === "embedded" &&
      entry.sizeBytes >= LARGE_EMBEDDED_ASSET_BYTES,
  );
  if (largeEmbedded.length > 0) {
    diagnostics.push({
      code: "asset-large-embedded-summary",
      severity: "warning",
      message: `${largeEmbedded.length} large embedded asset${largeEmbedded.length === 1 ? "" : "s"} should be stored for faster loading and export.`,
    });
  }
  entries.forEach((entry) => {
    const sourceAsset = packageValue.assets[entry.id];
    if (entry.status === "missing") {
      diagnostics.push({
        code: "asset-missing",
        severity: "error",
        assetId: entry.id,
        message: `Asset ${entry.id} has no usable stored, remote, or embedded source.`,
      });
    } else if (entry.status === "unsupported") {
      diagnostics.push({
        code: "asset-unsupported",
        severity: "warning",
        assetId: entry.id,
        message: `Asset ${entry.id} uses unsupported type ${entry.type}.`,
      });
    } else if (entry.status === "remote-only") {
      diagnostics.push({
        code: "asset-remote-only",
        severity: "warning",
        assetId: entry.id,
        message: `Asset ${entry.id} is remote-only and must be fetched before deterministic export.`,
      });
    }
    if (entry.duplicateOf) {
      diagnostics.push({
        code: "asset-duplicate",
        severity: "info",
        assetId: entry.id,
        message: `Asset ${entry.id} duplicates ${entry.duplicateOf} and shares its stored content.`,
      });
    }
    if (sourceAsset.extensions?.assetStorageFailed === true) {
      diagnostics.push({
        code: "asset-storage-failed",
        severity: "warning",
        assetId: entry.id,
        message: `Asset ${entry.id} could not be copied to managed storage; its embedded fallback remains available.`,
      });
    }
  });
  const totalWeightBytes = entries.reduce(
    (total, entry) => total + entry.sizeBytes,
    0,
  );
  return {
    totalAssets: entries.length,
    storedAssets: entries.filter((entry) => entry.sourceUsed === "stored")
      .length,
    embeddedAssets: entries.filter(
      (entry) => entry.sourceUsed === "embedded",
    ).length,
    remoteAssets: entries.filter((entry) => entry.sourceUsed === "remote")
      .length,
    missingAssets: entries.filter((entry) => entry.status === "missing")
      .length,
    duplicateAssets: entries.filter((entry) => entry.duplicateOf).length,
    totalWeightBytes,
    totalWeightKb: Math.round((totalWeightBytes / 1024) * 10) / 10,
    largestAssets: [...entries]
      .sort((left, right) => right.sizeBytes - left.sizeBytes)
      .slice(0, 5),
    entries,
    diagnostics,
  };
}

export async function ingestTemplatePackageAssets(
  packageValue: TemplatePackageV1,
  storage?: AssetStorageAdapter,
): Promise<AssetIngestionResult> {
  const nextPackage = structuredClone(packageValue);
  const usage = collectAssetUsage(nextPackage);
  const storedByHash = new Map<string, AssetStorageReference>();
  const storageFailures: AssetReliabilityDiagnostic[] = [];

  for (const asset of Object.values(nextPackage.assets)) {
    const payload = embeddedPayload(asset);
    asset.usedBy = usage.get(asset.id) ?? [];
    if (!payload) continue;
    asset.sizeBytes = payload.bytes.byteLength;
    asset.sizeKb = Math.round((asset.sizeBytes / 1024) * 10) / 10;
    const hash = asset.hash || (await sha256(payload.bytes));
    asset.hash = hash;
    if (!storage) continue;
    try {
      let stored = storedByHash.get(hash);
      if (!stored) {
        stored = await storage.put(hash, payload.bytes, payload.mimeType);
        storedByHash.set(hash, stored);
      }
      asset.source = "stored";
      asset.storageKey = stored.storageKey;
      asset.stableUrl = stored.stableUrl;
    } catch {
      // The embedded fallback remains intact when managed storage is unavailable.
      asset.extensions = {
        ...asset.extensions,
        assetStorageFailed: true,
      };
      storageFailures.push({
        code: "asset-storage-failed",
        severity: "warning",
        assetId: asset.id,
        message: `Asset ${asset.id} could not be copied to managed storage; its embedded fallback remains available.`,
      });
    }
  }

  const report = analyzeAssetReliability(nextPackage);
  if (storageFailures.length > 0) {
    report.diagnostics = report.diagnostics.filter(
      (item) => item.code !== "asset-storage-failed",
    );
    report.diagnostics.push(...storageFailures);
  }
  return {
    packageValue: nextPackage,
    report,
  };
}
