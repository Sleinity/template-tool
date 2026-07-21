import type { AssetStrategy, PackageAsset, TemplatePackageV1 } from "../types";

export const DEFAULT_ASSET_EXTERNALIZE_THRESHOLD = 2 * 1024 * 1024;

function approximateEmbeddedBytes(asset: PackageAsset): number {
  const value = asset.dataUrl ?? asset.data ?? asset.svgString ?? "";
  const payload = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  if (/;base64,/i.test(value)) return Math.floor((payload.length * 3) / 4);
  return new TextEncoder().encode(payload).byteLength;
}

export function analyzePackageAssets(
  packageValue: TemplatePackageV1,
  thresholdBytes = DEFAULT_ASSET_EXTERNALIZE_THRESHOLD,
): AssetStrategy {
  const assets = Object.values(packageValue.assets);
  const embedded = assets.filter((asset) => asset.source === "embedded");
  const diagnostics = embedded
    .map((asset) => ({
      asset,
      bytes: approximateEmbeddedBytes(asset),
    }))
    .filter(({ bytes }) => bytes >= thresholdBytes)
    .map(({ asset, bytes }) => ({
      assetId: asset.id,
      code: "large-embedded-asset",
      severity: "warning" as const,
      message: `Embedded asset ${asset.id} is large and should be stored externally when persistence is added.`,
      approximateBytes: bytes,
    }));
  const totalEmbeddedBytesApprox = embedded.reduce(
    (total, asset) => total + approximateEmbeddedBytes(asset),
    0,
  );

  return {
    mode:
      diagnostics.length > 0 ? "externalize-recommended" : "preserve",
    embeddedAssetCount: embedded.length,
    remoteAssetCount: assets.length - embedded.length,
    totalEmbeddedBytesApprox,
    externalizeThresholdBytes: thresholdBytes,
    diagnostics,
  };
}
