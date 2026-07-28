import type { PackageAsset, TemplatePackageV1 } from "../types";

export type ResolvedPackageAssetStatus =
  | "declared"
  | "read"
  | "ingested"
  | "hydrated"
  | "renderable"
  | "failed";

export interface ResolvedPackageAsset {
  canonicalId: string;
  sourceReference: string;
  matchedAlias?: string;
  manifestPath?: string;
  mimeType?: string;
  actualByteSize?: number;
  declaredByteSize?: number;
  managedStorageKey?: string;
  status: ResolvedPackageAssetStatus;
  asset: PackageAsset;
}

type BundleSource = {
  manifestId?: unknown;
  aliases?: unknown;
  packagePath?: unknown;
  originalEntryName?: unknown;
  src?: unknown;
  byteSize?: unknown;
  declaredByteSize?: unknown;
  actualByteSize?: unknown;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function bundleSource(asset: PackageAsset): BundleSource {
  const value = asset.extensions?.bundleSource;
  return value && typeof value === "object" ? (value as BundleSource) : {};
}

function stripAssetScheme(value: string): string | undefined {
  return value.startsWith("asset://") ? value.slice("asset://".length) : undefined;
}

function typedAssetHash(value: string): string | undefined {
  return value.match(/^asset:(?:image|svg|vector|font):(.+)$/)?.[1];
}

function candidates(asset: PackageAsset): string[] {
  const source = bundleSource(asset);
  const values = new Set<string>();
  const add = (value: unknown) => {
    const string = stringValue(value);
    if (!string) return;
    values.add(string);
    const stripped = stripAssetScheme(string);
    if (stripped) values.add(stripped);
    const hash = typedAssetHash(string);
    if (hash) values.add(hash);
  };
  add(asset.id);
  add(asset.hash);
  add(source.manifestId);
  add(source.packagePath);
  add(source.originalEntryName);
  add(source.src);
  if (Array.isArray(source.aliases)) source.aliases.forEach(add);
  const manifestId = stringValue(source.manifestId);
  if (manifestId) add(`asset://${manifestId}`);
  return Array.from(values);
}

function statusFor(asset: PackageAsset): ResolvedPackageAssetStatus {
  if (asset.stableUrl || asset.url || asset.dataUrl || asset.data || asset.svgString) {
    return "renderable";
  }
  if (
    asset.source === "stored" &&
    asset.storageKey?.startsWith("sha256:")
  ) return "ingested";
  if (
    numberValue(bundleSource(asset).actualByteSize) !== undefined ||
    asset.sizeBytes !== undefined
  ) return "read";
  return "declared";
}

export function resolvePackageAssetReference(
  packageValue: Pick<TemplatePackageV1, "assets">,
  reference: string | null | undefined,
): ResolvedPackageAsset | null {
  if (!reference) return null;
  const direct = packageValue.assets[reference];
  const asset =
    direct ??
    Object.values(packageValue.assets).find((candidate) =>
      candidates(candidate).includes(reference),
    ) ??
    Object.values(packageValue.assets).find((candidate) => {
      const stripped = stripAssetScheme(reference);
      const hash = typedAssetHash(reference);
      return candidates(candidate).some(
        (candidateValue) =>
          candidateValue === stripped || candidateValue === hash,
      );
    });
  if (!asset) return null;
  const source = bundleSource(asset);
  return {
    canonicalId: asset.id,
    sourceReference: reference,
    matchedAlias: reference === asset.id ? undefined : reference,
    manifestPath:
      stringValue(source.packagePath) ?? stringValue(source.originalEntryName),
    mimeType: asset.mimeType,
    actualByteSize:
      numberValue(source.actualByteSize) ?? asset.sizeBytes,
    declaredByteSize:
      numberValue(source.declaredByteSize) ?? numberValue(source.byteSize),
    managedStorageKey: asset.storageKey,
    status: statusFor(asset),
    asset,
  };
}

export function canonicalPackageAssetId(
  packageValue: Pick<TemplatePackageV1, "assets">,
  reference: string | null | undefined,
): string | null {
  return resolvePackageAssetReference(packageValue, reference)?.canonicalId ?? null;
}
