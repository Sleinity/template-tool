import type {
  TemplatePackageBundleDiagnostic,
  TemplatePackageBundleFile,
} from "./types";

export interface BundleAssetManifestEntry {
  id: string;
  name?: string;
  type: string;
  path?: string;
  normalizedPath?: string;
  mimeType?: string;
  byteSize?: number;
  hash?: string;
  sourceNodeId?: string;
  src?: string;
  aliases: string[];
  file?: {
    width?: number;
    height?: number;
  };
  usage?: {
    nodeId?: string;
    width?: number;
    height?: number;
    scaleMode?: string | null;
  };
  zipFile?: TemplatePackageBundleFile;
}

export interface TemplateAssetBridgeEntry {
  id?: string;
  src?: string;
  path?: string;
  aliases?: string[];
  hash?: string;
  nodeId?: string;
  sourceNodeId?: string;
  mimeType?: string;
  byteSize?: number;
  sizeBytes?: number;
}

export type TemplateAssetBridge = Record<string, TemplateAssetBridgeEntry>;

export interface BundleAssetResolution {
  ref: string;
  asset: BundleAssetManifestEntry | null;
  matchedBy?: "id" | "alias" | "path" | "src" | "hash" | "bridge-src";
  diagnostics: TemplatePackageBundleDiagnostic[];
}

type IndexKind = "id" | "alias" | "path" | "src" | "hash";

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

function addUnique(values: string[], next: unknown): void {
  if (typeof next !== "string" || next.trim().length === 0) return;
  if (!values.includes(next)) values.push(next);
}

export function normalizeBundleAssetPath(path: string): string | null {
  if (!path || path.includes("\0") || path.includes("\\")) return null;
  if (path.startsWith("/") || /^[a-z]:/i.test(path)) return null;
  const parts = path.split("/");
  if (parts.some((part) => part === "..")) return null;
  return parts.filter((part) => part !== "." && part.length > 0).join("/");
}

function stripAssetScheme(value: string): string | null {
  if (!value.startsWith("asset://")) return null;
  const stripped = value.slice("asset://".length);
  return stripped.length > 0 ? stripped : null;
}

function typedAssetHash(value: string): string | null {
  const match = value.match(/^asset:(?:image|svg|vector|font):(.+)$/);
  return match?.[1] ?? null;
}

function assetHashCandidates(value: string): string[] {
  const candidates: string[] = [];
  addUnique(candidates, value);
  addUnique(candidates, stripAssetScheme(value));
  addUnique(candidates, typedAssetHash(value));
  return candidates;
}

function bridgeSource(bridge: TemplateAssetBridge | undefined, ref: string): string | null {
  const bridgeEntry = bridge?.[ref];
  if (!bridgeEntry) return null;
  return bridgeEntry.src ?? bridgeEntry.path ?? null;
}

export class BundleAssetRegistry {
  readonly entries: BundleAssetManifestEntry[];
  readonly diagnostics: TemplatePackageBundleDiagnostic[];

  private readonly byId = new Map<string, BundleAssetManifestEntry>();
  private readonly byAlias = new Map<string, BundleAssetManifestEntry>();
  private readonly byPath = new Map<string, BundleAssetManifestEntry>();
  private readonly bySrc = new Map<string, BundleAssetManifestEntry>();
  private readonly byHash = new Map<string, BundleAssetManifestEntry>();

  constructor(
    entries: BundleAssetManifestEntry[],
    diagnostics: TemplatePackageBundleDiagnostic[] = [],
  ) {
    this.entries = entries;
    this.diagnostics = [...diagnostics];
    entries.forEach((entry) => this.indexEntry(entry));
  }

  resolve(
    ref: string | null | undefined,
    bridge?: TemplateAssetBridge,
  ): BundleAssetResolution {
    if (!ref) {
      return {
        ref: "",
        asset: null,
        diagnostics: [
          diagnostic(
            "ASSET_REF_UNRESOLVED",
            "warning",
            "Asset reference is empty.",
          ),
        ],
      };
    }

    const exact = this.lookup(ref);
    if (exact.asset) return { ref, ...exact, diagnostics: [] };

    const stripped = stripAssetScheme(ref);
    if (stripped) {
      const strippedMatch = this.lookup(stripped);
      if (strippedMatch.asset) return { ref, ...strippedMatch, diagnostics: [] };
    }

    if (/^asset:(?:image|svg|vector|font):/.test(ref)) {
      const aliasMatch = this.byAlias.get(ref);
      if (aliasMatch) {
        return {
          ref,
          asset: aliasMatch,
          matchedBy: "alias",
          diagnostics: [],
        };
      }
      const hash = typedAssetHash(ref);
      if (hash) {
        const hashMatch = this.byHash.get(hash) ?? this.byAlias.get(hash);
        if (hashMatch) {
          return {
            ref,
            asset: hashMatch,
            matchedBy: this.byHash.has(hash) ? "hash" : "alias",
            diagnostics: [],
          };
        }
      }
    }

    const source = bridgeSource(bridge, ref);
    if (source) {
      const sourceResolution = this.resolve(source, bridge);
      if (sourceResolution.asset) {
        return {
          ref,
          asset: sourceResolution.asset,
          matchedBy: "bridge-src",
          diagnostics: sourceResolution.diagnostics,
        };
      }
    }

    const hashMatch = assetHashCandidates(ref)
      .map((candidate) => this.byHash.get(candidate) ?? this.byAlias.get(candidate))
      .find(Boolean);
    if (hashMatch) {
      return { ref, asset: hashMatch, matchedBy: "hash", diagnostics: [] };
    }

    return {
      ref,
      asset: null,
      diagnostics: [
        diagnostic(
          "ASSET_REF_UNRESOLVED",
          "warning",
          `Asset reference could not be resolved: ${ref}`,
          { ref },
        ),
      ],
    };
  }

  private lookup(ref: string): {
    asset: BundleAssetManifestEntry | null;
    matchedBy?: BundleAssetResolution["matchedBy"];
  } {
    const normalizedPath = normalizeBundleAssetPath(ref);
    if (this.byId.has(ref)) return { asset: this.byId.get(ref) ?? null, matchedBy: "id" };
    if (this.byAlias.has(ref)) {
      return { asset: this.byAlias.get(ref) ?? null, matchedBy: "alias" };
    }
    if (normalizedPath && this.byPath.has(normalizedPath)) {
      return { asset: this.byPath.get(normalizedPath) ?? null, matchedBy: "path" };
    }
    if (this.bySrc.has(ref)) return { asset: this.bySrc.get(ref) ?? null, matchedBy: "src" };
    if (this.byHash.has(ref)) return { asset: this.byHash.get(ref) ?? null, matchedBy: "hash" };
    return { asset: null };
  }

  private indexEntry(entry: BundleAssetManifestEntry): void {
    this.setUnique(this.byId, entry.id, entry, "id");
    entry.aliases.forEach((alias) => this.setUnique(this.byAlias, alias, entry, "alias"));
    if (entry.normalizedPath) {
      this.setUnique(this.byPath, entry.normalizedPath, entry, "path");
    }
    if (entry.src) this.setUnique(this.bySrc, entry.src, entry, "src");
    if (entry.hash) this.setUnique(this.byHash, entry.hash, entry, "hash");
    entry.aliases.forEach((alias) => {
      const hash = typedAssetHash(alias) ?? stripAssetScheme(alias);
      if (hash) this.setUnique(this.byHash, hash, entry, "hash");
    });
  }

  private setUnique(
    map: Map<string, BundleAssetManifestEntry>,
    key: string | undefined,
    entry: BundleAssetManifestEntry,
    kind: IndexKind,
  ): void {
    if (!key) return;
    const existing = map.get(key);
    if (existing && existing.id !== entry.id) {
      const code =
        kind === "alias"
          ? "ASSET_ALIAS_COLLISION"
          : kind === "path"
            ? "ASSET_PATH_COLLISION"
            : "ASSET_REF_AMBIGUOUS";
      this.diagnostics.push(
        diagnostic(
          code,
          "warning",
          `Asset ${kind} "${key}" is used by both ${existing.id} and ${entry.id}.`,
          {
            assetId: entry.id,
            ref: key,
            path: kind === "path" ? key : undefined,
            sourceNodeId: entry.sourceNodeId,
            details: { existingAssetId: existing.id, indexKind: kind },
          },
        ),
      );
      return;
    }
    map.set(key, entry);
  }
}
