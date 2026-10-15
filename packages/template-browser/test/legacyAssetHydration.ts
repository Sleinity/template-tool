import { collectSavedAssets } from "../src/persistence/assetRepository";
/** V1 repository hydration is historical/test-only. */
import type {PackageAsset,TemplatePackageV1} from "@sleinity/template-core";
import type {TemplateFamilyV1} from "@sleinity/template-core/family";
import type {SavedAssetRecord} from "../src/persistence/types";
type AssetBearingPackage={assets:Record<string,PackageAsset>};
const runtimeUrls=new Map<string,string>();
export async function hydratePackageAssets<PackageValue extends AssetBearingPackage>(
  packageValue: PackageValue,
  getAsset: (hash: string) => Promise<SavedAssetRecord | null>,
): Promise<PackageValue> {
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

export async function hydrateAssetMap(
  input: TemplatePackageV1["assets"],
  getAsset: (hash: string) => Promise<SavedAssetRecord | null>,
): Promise<TemplatePackageV1["assets"]> {
  const hydrated = structuredClone(input);
  for (const asset of Object.values(hydrated)) {
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

export async function hydrateTemplateFamilyAssets(
  family: TemplateFamilyV1,
  sharedImageAssets: TemplatePackageV1["assets"],
  getAsset: (hash: string) => Promise<SavedAssetRecord | null>,
): Promise<{
  family: TemplateFamilyV1;
  sharedImageAssets: TemplatePackageV1["assets"];
}> {
  const nextFamily = structuredClone(family);
  for (const variant of nextFamily.variants) {
    variant.packageValue = await hydratePackageAssets(
      variant.packageValue,
      getAsset,
    );
  }
  const firstVariant = nextFamily.variants[0];
  if (!firstVariant) return { family: nextFamily, sharedImageAssets: {} };
  const sharedPackage = await hydratePackageAssets(
    {
      ...structuredClone(firstVariant.packageValue),
      assets: structuredClone(sharedImageAssets),
    },
    getAsset,
  );
  return { family: nextFamily, sharedImageAssets: sharedPackage.assets };
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
