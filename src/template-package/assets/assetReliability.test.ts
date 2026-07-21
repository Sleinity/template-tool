import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import { validatePackageJpgExportReadiness } from "../export";
import { resolvePackageAssetSource } from "../render/packageRenderUtils";
import type {
  PackageAsset,
  TemplatePackageV1,
} from "../types";
import {
  analyzeAssetReliability,
  ingestTemplatePackageAssets,
  type AssetStorageAdapter,
} from "./assetReliability";
import { resolvePackageAssetReference } from "./packageAssetResolution";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const basePackage =
  figmaPluginV041 as unknown as TemplatePackageV1;
const packageValue = structuredClone(basePackage);
const assetIds = Object.keys(packageValue.assets).slice(0, 2);
if (assetIds.length < 2) throw new Error("Asset fixture requires two assets.");
const sharedDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
assetIds.forEach((assetId) => {
  const asset = packageValue.assets[assetId];
  asset.source = "embedded";
  asset.dataUrl = sharedDataUrl;
  delete asset.hash;
  delete asset.stableUrl;
  delete asset.storageKey;
});

const storedHashes: string[] = [];
const storage: AssetStorageAdapter = {
  async put(hash) {
    storedHashes.push(hash);
    return {
      storageKey: `test:${hash}`,
      stableUrl: `blob:test-${hash}`,
    };
  },
};
const ingested = await ingestTemplatePackageAssets(packageValue, storage);
const first = ingested.packageValue.assets[assetIds[0]];
const second = ingested.packageValue.assets[assetIds[1]];
assert(
  first.id === assetIds[0] &&
    second.id === assetIds[1] &&
    first.source === "stored" &&
    second.source === "stored",
  "Managed ingestion should preserve original asset IDs and mark stored copies.",
);
assert(
  storedHashes.length === 1 &&
    first.hash === second.hash &&
    first.storageKey === second.storageKey &&
    first.stableUrl === second.stableUrl,
  "Identical embedded assets should be hashed once and share managed storage.",
);
assert(
  Boolean(first.dataUrl) && Boolean(second.dataUrl),
  "Managed ingestion must retain embedded compatibility fallbacks.",
);
assert(
  ingested.report.duplicateAssets === 1,
  "Reliability reporting should identify duplicate asset hashes.",
);

const priorityAsset = {
  ...first,
  stableUrl: "blob:stored",
  url: "https://example.com/remote.png",
  dataUrl: sharedDataUrl,
} as PackageAsset;
assert(
  resolvePackageAssetSource(priorityAsset) === "blob:stored",
  "Renderer asset resolution should prefer managed storage.",
);
delete priorityAsset.stableUrl;
assert(
  resolvePackageAssetSource(priorityAsset) ===
    "https://example.com/remote.png",
  "Renderer asset resolution should prefer remote URLs over embedded fallbacks.",
);
delete priorityAsset.url;
assert(
  resolvePackageAssetSource(priorityAsset) === sharedDataUrl,
  "Renderer asset resolution should retain embedded data URL fallback.",
);

const missingPackage = structuredClone(basePackage);
const missingAsset = Object.values(missingPackage.assets)[0];
delete missingAsset.dataUrl;
delete missingAsset.data;
delete missingAsset.svgString;
delete missingAsset.url;
delete missingAsset.stableUrl;
missingAsset.source = "embedded";
missingAsset.deferred = true;
const missingReport = analyzeAssetReliability(missingPackage);
assert(
  missingReport.diagnostics.some(
    (item) =>
      item.code === "asset-missing" &&
      item.assetId === missingAsset.id,
  ),
  "Missing package assets should produce one inspectable reliability warning.",
);
const blockedExport = validatePackageJpgExportReadiness({
  format: "jpg",
  packageValue: missingPackage,
  renderMode: "static",
});
assert(
  blockedExport.status === "blocked" && !blockedExport.ready,
  "Missing assets should block deterministic package export readiness.",
);

const largeDuplicatePackage = structuredClone(packageValue);
assetIds.forEach((assetId) => {
  largeDuplicatePackage.assets[assetId].sizeBytes = 3 * 1024 * 1024;
  largeDuplicatePackage.assets[assetId].hash = "same-large-hash";
});
const largeDuplicateReport = analyzeAssetReliability(
  largeDuplicatePackage,
);
assert(
  largeDuplicateReport.diagnostics.filter(
    (item) => item.code === "asset-large-embedded-summary",
  ).length === 1 &&
    largeDuplicateReport.diagnostics.filter(
      (item) => item.code === "asset-duplicate",
    ).length === 1,
  "Large duplicate assets should produce one summary warning and one duplicate detail.",
);

const backwardCompatible = analyzeAssetReliability(basePackage);
assert(
  backwardCompatible.totalAssets ===
    Object.keys(basePackage.assets).length,
  "Existing template-package-v1 assets should remain analyzable.",
);

const canonicalPackage = structuredClone(basePackage);
const canonicalAsset = Object.values(canonicalPackage.assets).find(
  (asset) => asset.type === "image",
);
if (!canonicalAsset) throw new Error("Canonical resolver fixture needs an image.");
canonicalAsset.extensions = {
  ...canonicalAsset.extensions,
  bundleSource: {
    manifestId: "asset_product_image_001",
    aliases: ["asset://asset_product_image_001", "ceab5479"],
    packagePath: "assets/asset_product_image_001.png",
    declaredByteSize: 1_441_383,
    actualByteSize: 1_441_382,
  },
};
for (const reference of [
  canonicalAsset.id,
  "asset_product_image_001",
  "asset://asset_product_image_001",
  "ceab5479",
]) {
  const resolution = resolvePackageAssetReference(canonicalPackage, reference);
  assert(
    resolution?.canonicalId === canonicalAsset.id &&
      resolution.actualByteSize === 1_441_382 &&
      resolution.declaredByteSize === 1_441_383,
    `Supported asset reference ${reference} should converge with separate actual and declared sizes.`,
  );
}

const managedFontPackage = structuredClone(basePackage);
managedFontPackage.assets["asset:font:managed"] = {
  id: "asset:font:managed",
  type: "font",
  source: "stored",
  mimeType: "font/ttf",
  hash: "managed-font-hash",
  storageKey: "sha256:managed-font-hash",
  extensions: { managedFontId: "managed-font:fixture" },
};
assert(
  !analyzeAssetReliability(managedFontPackage).diagnostics.some(
    (diagnostic) =>
      diagnostic.code === "asset-missing" &&
      diagnostic.assetId === "asset:font:managed",
  ),
  "Managed font pointers should be verified by font readiness instead of generic image/SVG URL rules.",
);
