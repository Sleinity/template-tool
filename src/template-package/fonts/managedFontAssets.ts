import type { PackageAsset, TemplatePackageV1 } from "../types";
import {
  bundledFontManifest,
  checkResolvedFontReadiness,
  collectTemplatePackageFontRequirements,
  type FontFaceSetLike,
  type FontManifestFace,
  type FontReadinessReport,
  type ResolvedRenderTreeV1,
} from "../resolved";
import { getManagedFontRegistry } from "./fontRegistry";
import { matchManagedFont } from "./fontMatching";

interface MutableFontFaceSetLike extends FontFaceSetLike {
  add?(font: FontFace): FontFaceSet;
}

const loadedManagedFaces = new Map<string, Promise<boolean>>();
const managedFontUrls = new Map<string, string>();

function arrayBufferToDataUrl(source: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(source);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function fontFormat(mimeType: string): string {
  if (mimeType.includes("woff2")) return "woff2";
  if (mimeType.includes("woff")) return "woff";
  if (mimeType.includes("otf")) return "opentype";
  return "truetype";
}

async function exportFontSource(
  packageValue: TemplatePackageV1,
  requirement: NonNullable<TemplatePackageV1["fontRequirements"]>[number],
): Promise<{ dataUrl: string; mimeType: string } | null> {
  const asset = requirement.assetId
    ? packageValue.assets[requirement.assetId]
    : undefined;
  if (
    asset?.type === "font" &&
    (!requirement.resolution?.binaryHash ||
      !asset.hash ||
      asset.hash === requirement.resolution.binaryHash)
  ) {
    const inline = asset.dataUrl ?? asset.data;
    if (inline?.startsWith("data:")) {
      return { dataUrl: inline, mimeType: asset.mimeType };
    }
  }
  const managedFontId = requirement.resolution?.managedFontId;
  const binaryHash = requirement.resolution?.binaryHash;
  const registry = getManagedFontRegistry();
  if (!managedFontId || !binaryHash || !registry) return null;
  const managedFont = await registry.getManagedFont(managedFontId);
  if (!managedFont || managedFont.assetHash !== binaryHash) return null;
  const blob = await registry.getFontBlob(binaryHash);
  if (!blob) return null;
  return {
    dataUrl: arrayBufferToDataUrl(await blob.arrayBuffer(), managedFont.mimeType),
    mimeType: managedFont.mimeType,
  };
}

/**
 * html-to-image clones the renderer into an SVG image document. Dynamically
 * registered FontFace objects do not cross that document boundary, so exact
 * linked binaries must be embedded explicitly for PNG capture.
 */
export async function createTemplatePackageFontEmbedCss(
  packageValue: TemplatePackageV1,
): Promise<string> {
  const rules = new Map<string, string>();
  for (const requirement of packageValue.fontRequirements ?? []) {
    const resolution = requirement.resolution;
    if (
      !resolution?.runtimeFamily ||
      !resolution.binaryHash ||
      resolution.classification !== "exact"
    ) {
      continue;
    }
    const source = await exportFontSource(packageValue, requirement);
    if (!source) continue;
    const weight = resolution.effectiveWeight ?? requirement.weight;
    const style = resolution.effectiveStyle ?? requirement.cssStyle;
    const stretch = resolution.effectiveStretch ?? requirement.stretch ?? "normal";
    const key = `${resolution.runtimeFamily}|${weight}|${style}|${stretch}|${resolution.binaryHash}`;
    rules.set(
      key,
      `@font-face{font-family:${JSON.stringify(resolution.runtimeFamily)};src:url(${JSON.stringify(source.dataUrl)}) format(${JSON.stringify(fontFormat(source.mimeType))});font-style:${style};font-weight:${weight};font-stretch:${stretch};font-display:block;}`,
    );
  }
  return [...rules.values()].join("\n");
}

function safeFontSource(asset: PackageAsset | undefined): string | null {
  if (!asset || asset.type !== "font") return null;
  const source = asset.stableUrl ?? asset.url ?? asset.dataUrl ?? asset.data;
  if (!source) return null;
  return /^(?:blob:|https?:\/\/|data:(?:font\/(?:ttf|otf|woff2?)|application\/font-woff)(?:;[^,]*)?,)/i.test(
    source,
  )
    ? source
    : null;
}

async function loadManagedFace(
  fontSet: MutableFontFaceSetLike,
  family: string,
  weight: number,
  style: "normal" | "italic" | "oblique",
  source: string,
): Promise<boolean> {
  if (typeof FontFace === "undefined" || !fontSet.add) return false;
  const key = `${family.toLowerCase()}:${weight}:${style}:${source}`;
  const existing = loadedManagedFaces.get(key);
  if (existing) return existing;
  const pending = (async () => {
    try {
      const face = new FontFace(family, `url("${source}")`, {
        weight: String(weight),
        style,
      });
      const loaded = await face.load();
      fontSet.add?.(loaded);
      return true;
    } catch {
      return false;
    }
  })();
  loadedManagedFaces.set(key, pending);
  return pending;
}

export async function prepareTemplatePackageFonts(
  packageValue: TemplatePackageV1,
  tree: ResolvedRenderTreeV1,
  fontSet: MutableFontFaceSetLike | null | undefined,
): Promise<FontReadinessReport> {
  const requirements = collectTemplatePackageFontRequirements(
    packageValue,
    tree,
  );
  const loadedManifest: FontManifestFace[] = [...bundledFontManifest];

  if (fontSet) {
    await Promise.all(
      requirements.map(async (requirement) => {
        let source = requirement.assetId
          ? safeFontSource(packageValue.assets[requirement.assetId])
          : null;
        if (!source && requirement.resolution?.managedFontId) {
          const registry = getManagedFontRegistry();
          const managedFont = await registry?.getManagedFont(
            requirement.resolution.managedFontId,
          );
          if (managedFont && registry) {
            if (
              requirement.binaryHash &&
              managedFont.assetHash !== requirement.binaryHash
            ) {
              return;
            }
            const canonicalRequirement = packageValue.fontRequirements?.find(
              (candidate) => candidate.id === requirement.id,
            );
            if (canonicalRequirement) {
              const semanticMatch = matchManagedFont(
                canonicalRequirement,
                managedFont,
              );
              if (
                semanticMatch.classification === "missing" ||
                (requirement.resolution?.classification === "exact" &&
                  semanticMatch.classification !== "exact")
              ) {
                return;
              }
            }
            source = managedFontUrls.get(managedFont.assetHash) ?? null;
            if (!source) {
              const blob = await registry.getFontBlob(managedFont.assetHash);
              if (blob) {
                source = URL.createObjectURL(blob);
                managedFontUrls.set(managedFont.assetHash, source);
              }
            }
          }
        }
        if (!source) return;
        const runtimeFamily = requirement.runtimeFamily ?? requirement.family;
        if (
          await loadManagedFace(
            fontSet,
            runtimeFamily,
            requirement.weight,
            requirement.style,
            source,
          )
        ) {
          loadedManifest.push({
            family: runtimeFamily,
            weight: requirement.weight,
            style: requirement.style,
          });
        }
      }),
    );
  }

  return checkResolvedFontReadiness(
    tree,
    fontSet,
    loadedManifest,
    requirements,
  );
}
