import type { TemplatePackageBundleDiagnostic } from "./types";
import type { ZipBundleReader } from "./zipBundleReader";
import {
  BundleAssetRegistry,
  normalizeBundleAssetPath,
  type BundleAssetManifestEntry,
} from "./assetRegistry";

interface RawAssetManifest {
  version?: number;
  assets?: unknown;
}

interface RawAssetEntry {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  path?: unknown;
  mimeType?: unknown;
  byteSize?: unknown;
  sizeBytes?: unknown;
  hash?: unknown;
  sourceNodeId?: unknown;
  nodeId?: unknown;
  src?: unknown;
  aliases?: unknown;
  file?: unknown;
  usage?: unknown;
}

export interface BundleAssetRegistryResult {
  registry: BundleAssetRegistry;
  manifest: RawAssetManifest | null;
  diagnostics: TemplatePackageBundleDiagnostic[];
}

export interface LoadBundleAssetRegistryOptions {
  allowMissingEmpty?: boolean;
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

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
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

function entryFromRaw(raw: RawAssetEntry): BundleAssetManifestEntry | null {
  const id = asString(raw.id);
  const type = asString(raw.type);
  if (!id || !type) return null;
  const path = asString(raw.path);
  const aliases = asStringArray(raw.aliases);
  const sourceNodeId = asString(raw.sourceNodeId) ?? asString(raw.nodeId);
  const file = asRecord(raw.file);
  const usage = asRecord(raw.usage);
  return {
    id,
    name: asString(raw.name),
    type,
    path,
    normalizedPath: path ? normalizeBundleAssetPath(path) ?? undefined : undefined,
    mimeType: asString(raw.mimeType),
    byteSize: asNumber(raw.byteSize) ?? asNumber(raw.sizeBytes),
    hash: asString(raw.hash),
    sourceNodeId,
    src: asString(raw.src),
    aliases,
    file: file
      ? {
          width: asNumber(file.width),
          height: asNumber(file.height),
        }
      : undefined,
    usage: usage
      ? {
          nodeId: asString(usage.nodeId),
          width: asNumber(usage.width),
          height: asNumber(usage.height),
          scaleMode: typeof usage.scaleMode === "string" ? usage.scaleMode : null,
        }
      : undefined,
  };
}

function validateEntryFile(
  reader: ZipBundleReader,
  entry: BundleAssetManifestEntry,
): TemplatePackageBundleDiagnostic[] {
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  if (!entry.path || !entry.normalizedPath) {
    diagnostics.push(
      diagnostic(
        "ASSET_MANIFEST_INVALID",
        "warning",
        `Asset ${entry.id} does not include a safe ZIP path.`,
        { assetId: entry.id, path: entry.path, sourceNodeId: entry.sourceNodeId },
      ),
    );
    return diagnostics;
  }

  const zipFile = reader.bundle.index.files[entry.normalizedPath];
  if (!zipFile) {
    diagnostics.push(
      diagnostic(
        "ASSET_FILE_MISSING",
        "warning",
        `Asset file is missing from ZIP: ${entry.normalizedPath}`,
        { assetId: entry.id, path: entry.normalizedPath, sourceNodeId: entry.sourceNodeId },
      ),
    );
    return diagnostics;
  }

  entry.zipFile = zipFile;
  const read = reader.readArrayBuffer(entry.normalizedPath);
  if (!read.ok) {
    diagnostics.push(
      diagnostic(
        "ASSET_FILE_UNREADABLE",
        "error",
        `Asset file could not be read from ZIP: ${entry.normalizedPath}`,
        {
          assetId: entry.id,
          path: entry.normalizedPath,
          sourceNodeId: entry.sourceNodeId,
          details: { diagnostics: read.diagnostics },
        },
      ),
    );
  }

  if (
    typeof entry.byteSize === "number" &&
    zipFile.uncompressedSize !== entry.byteSize
  ) {
    diagnostics.push(
      diagnostic(
        "ASSET_BYTESIZE_MISMATCH",
        "info",
        `Asset ${entry.id} declares ${entry.byteSize} bytes but ZIP file is ${zipFile.uncompressedSize} bytes.`,
        {
          assetId: entry.id,
          path: entry.normalizedPath,
          sourceNodeId: entry.sourceNodeId,
          details: {
            declaredBytes: entry.byteSize,
            actualBytes: zipFile.uncompressedSize,
            differenceBytes: zipFile.uncompressedSize - entry.byteSize,
            repairApplied: true,
            validationStage: "asset-resolution",
            visualImpact: "none",
          },
        },
      ),
    );
  }

  const expectedMimeType = extensionMimeType(entry.normalizedPath);
  if (
    expectedMimeType &&
    entry.mimeType &&
    entry.mimeType.toLowerCase() !== expectedMimeType
  ) {
    diagnostics.push(
      diagnostic(
        "ASSET_MIME_MISMATCH",
        "warning",
        `Asset ${entry.id} declares MIME type ${entry.mimeType}, expected ${expectedMimeType} from file path.`,
        {
          assetId: entry.id,
          path: entry.normalizedPath,
          sourceNodeId: entry.sourceNodeId,
          details: {
            declaredMimeType: entry.mimeType,
            expectedMimeType,
          },
        },
      ),
    );
  }

  return diagnostics;
}

export function parseBundleAssetsManifest(
  value: unknown,
): {
  manifest: RawAssetManifest | null;
  entries: BundleAssetManifestEntry[];
  diagnostics: TemplatePackageBundleDiagnostic[];
} {
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  const manifest = asRecord(value) as RawAssetManifest | undefined;
  if (!manifest || !Array.isArray(manifest.assets)) {
    return {
      manifest: manifest ?? null,
      entries: [],
      diagnostics: [
        diagnostic(
          "ASSET_MANIFEST_INVALID",
          "error",
          "assets.json must contain an assets array.",
          { path: "assets.json" },
        ),
      ],
    };
  }

  const entries = manifest.assets.flatMap((item, index) => {
    const raw = asRecord(item) as RawAssetEntry | undefined;
    const entry = raw ? entryFromRaw(raw) : null;
    if (!entry) {
      diagnostics.push(
        diagnostic(
          "ASSET_MANIFEST_INVALID",
          "warning",
          `Asset manifest entry ${index} is missing a usable id or type.`,
          { path: "assets.json", details: { index } },
        ),
      );
      return [];
    }
    return [entry];
  });

  return { manifest, entries, diagnostics };
}

export function loadBundleAssetRegistry(
  reader: ZipBundleReader,
  options: LoadBundleAssetRegistryOptions = {},
): BundleAssetRegistryResult {
  const text = reader.readText("assets.json");
  if (!text.ok || text.value === undefined) {
    if (options.allowMissingEmpty) {
      const manifest: RawAssetManifest = { version: 1, assets: [] };
      const diagnostics = [
        diagnostic(
          "ASSETS_JSON_OMITTED_EMPTY",
          "info",
          "assets.json is omitted because template.json declares and references no assets; an empty import-time registry was synthesized.",
          {
            path: "assets.json",
            details: {
              normalizationApplied: true,
              validationStage: "source-normalization",
              visualImpact: "none",
            },
          },
        ),
      ];
      return {
        registry: new BundleAssetRegistry([], diagnostics),
        manifest,
        diagnostics,
      };
    }
    const diagnostics = [
      diagnostic(
        "ASSETS_JSON_MISSING",
        "error",
        "assets.json could not be read from the ZIP bundle.",
        { path: "assets.json", details: { diagnostics: text.diagnostics } },
      ),
    ];
    return {
      registry: new BundleAssetRegistry([], diagnostics),
      manifest: null,
      diagnostics,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.value);
  } catch {
    const diagnostics = [
      diagnostic(
        "ASSETS_JSON_PARSE_ERROR",
        "error",
        "assets.json is not valid JSON.",
        { path: "assets.json" },
      ),
    ];
    return {
      registry: new BundleAssetRegistry([], diagnostics),
      manifest: null,
      diagnostics,
    };
  }

  const parsedManifest = parseBundleAssetsManifest(parsed);
  const fileDiagnostics = parsedManifest.entries.flatMap((entry) =>
    validateEntryFile(reader, entry),
  );
  const registry = new BundleAssetRegistry(parsedManifest.entries, [
    ...text.diagnostics,
    ...parsedManifest.diagnostics,
    ...fileDiagnostics,
  ]);
  return {
    registry,
    manifest: parsedManifest.manifest,
    diagnostics: registry.diagnostics,
  };
}
