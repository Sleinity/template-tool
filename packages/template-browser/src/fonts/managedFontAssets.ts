import {
  bundledFontManifest,
  checkResolvedFontReadiness,
  collectTemplatePackageFontRequirements,
  type FontFaceSetLike,
  type FontManifestFace,
  type FontReadinessReport,
  type PackageAsset,
  type ResolvedRenderTreeV1,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import { textFaceCoverageCharacters } from "@sleinity/template-core/fonts";
import { getManagedFontRegistry } from "./fontRegistry";
import { matchManagedFont } from "./fontMatching";
import type { ManagedFontRegistry } from "./fontRegistryTypes";

interface MutableFontFaceSetLike extends FontFaceSetLike {
  add?(font: FontFace): FontFaceSet;
  has?(font: FontFace): boolean;
}

interface ManagedFaceActivation {
  face?: FontFace;
  styleNode?: HTMLStyleElement;
  document?: Document;
}

const loadedManagedFaces = new WeakMap<
  MutableFontFaceSetLike,
  Map<string, Promise<ManagedFaceActivation | null>>
>();
const managedFontUrls = new Map<string, string>();
const managedFontStyleNodes = new WeakMap<Document, Map<string, HTMLStyleElement>>();

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
  registry = getManagedFontRegistry(),
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
  registry: ManagedFontRegistry | null = getManagedFontRegistry(),
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
    const source = await exportFontSource(packageValue, requirement, registry);
    if (!source) {
      throw new Error(`Exact font "${requirement.family}" has no available binary for PNG embedding.`);
    }
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
  sample: string,
): Promise<boolean> {
  const faceKey = `${family.toLowerCase()}:${weight}:${style}:${source}`;
  // Glyph coverage is evaluated below for every current text revision.
  // Changing text must not register another copy of the same binary face.
  const key = faceKey;
  const documentCache = loadedManagedFaces.get(fontSet) ?? new Map();
  loadedManagedFaces.set(fontSet, documentCache);
  const activationIsCurrent = (activation: ManagedFaceActivation | null): boolean => {
    if (!activation) return false;
    if (activation.face) {
      return activation.face.status === "loaded" &&
        (typeof fontSet.has !== "function" || fontSet.has(activation.face));
    }
    return Boolean(
      activation.styleNode?.isConnected &&
      activation.document &&
      activation.styleNode.ownerDocument === activation.document &&
      activation.document === document,
    );
  };
  const existing = documentCache.get(key);
  if (existing) {
    const activation = await existing;
    if (activationIsCurrent(activation)) return true;
    documentCache.delete(key);
  }
  const pending = (async (): Promise<ManagedFaceActivation | null> => {
    if (typeof FontFace !== "undefined" && fontSet.add) {
      try {
        const face = new FontFace(family, `url("${source}")`, {
          weight: String(weight),
          style,
        });
        const loaded = await face.load();
        fontSet.add(loaded);
        if (typeof fontSet.has !== "function" || fontSet.has(loaded)) {
          return { face: loaded };
        }
      } catch {
        // Some embedded browsers can render @font-face rules but do not expose
        // a usable FontFaceSet.add(). Fall through to the exact CSS path.
      }
    }
    return activateManagedFaceWithCss(faceKey, family, weight, style, source, sample);
  })();
  documentCache.set(key, pending);
  const activation = await pending;
  if (!activationIsCurrent(activation)) {
    if (documentCache.get(key) === pending) documentCache.delete(key);
    return false;
  }
  return true;
}

function cssManagedFontActivationAvailable(): boolean {
  return typeof document !== "undefined" &&
    Boolean(document.head && document.body) &&
    typeof document.createElement === "function" &&
    typeof requestAnimationFrame === "function";
}

function measureProbeWidths(
  container: HTMLElement,
  family: string,
  weight: number,
  style: "normal" | "italic" | "oblique",
  sample: string,
): number[] {
  return ["serif", "sans-serif", "monospace"].map((fallback) => {
    const probe = document.createElement("span");
    probe.textContent = sample;
    probe.style.display = "inline-block";
    probe.style.fontFamily = `${JSON.stringify(family)}, ${fallback}`;
    probe.style.fontSize = "48px";
    probe.style.fontStyle = style;
    probe.style.fontWeight = String(weight);
    probe.style.fontVariant = "normal";
    probe.style.letterSpacing = "normal";
    probe.style.whiteSpace = "pre";
    container.append(probe);
    return probe.getBoundingClientRect().width;
  });
}

function widthSpread(widths: number[]): number {
  return Math.max(...widths) - Math.min(...widths);
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Activate an exact, hash-owned private face in runtimes that implement CSS
 * @font-face but omit the JavaScript FontFace registration API. Readiness is
 * published only after the private face produces stable, identical metrics
 * across deliberately different fallback stacks. The missing-family control
 * must continue to produce different widths, proving that fallback metrics are
 * observable in this runtime. document.fonts.check() is not used as authority.
 */
async function activateManagedFaceWithCss(
  faceKey: string,
  family: string,
  weight: number,
  style: "normal" | "italic" | "oblique",
  source: string,
  sample: string,
): Promise<ManagedFaceActivation | null> {
  if (!cssManagedFontActivationAvailable()) return null;
  const ownerDocument = document;
  const probeText = `${sample || "Template"} WWWWW iiiii 0123456789`;
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";
  container.style.contain = "layout style paint";
  document.body.append(container);

  const missingFamily = `__template_font_probe_missing_${faceKey.length}`;
  const baseline = measureProbeWidths(
    container,
    missingFamily,
    weight,
    style,
    probeText,
  );
  if (widthSpread(baseline) < 0.5) {
    container.remove();
    return null;
  }

  const styleNodes = managedFontStyleNodes.get(ownerDocument) ?? new Map();
  managedFontStyleNodes.set(ownerDocument, styleNodes);
  const existingStyleNode = styleNodes.get(faceKey);
  const createdStyleNode = !existingStyleNode?.isConnected ||
    existingStyleNode.ownerDocument !== ownerDocument;
  let styleNode: HTMLStyleElement;
  if (createdStyleNode) {
    styleNode = document.createElement("style");
    styleNode.dataset.templateManagedFont = family;
    styleNode.textContent = `@font-face{font-family:${JSON.stringify(family)};src:url(${JSON.stringify(source)});font-style:${style};font-weight:${weight};font-display:block;}`;
    ownerDocument.head.append(styleNode);
  } else {
    styleNode = existingStyleNode!;
  }

  let previousSignature = "";
  let stableFrames = 0;
  try {
    for (let frame = 0; frame < 90; frame += 1) {
      await nextAnimationFrame();
      container.replaceChildren();
      const widths = measureProbeWidths(
        container,
        family,
        weight,
        style,
        probeText,
      );
      const signature = widths.map((value) => value.toFixed(3)).join(":");
      const converged = widths.every((value) => value > 0) && widthSpread(widths) <= 0.05;
      stableFrames = converged && signature === previousSignature ? stableFrames + 1 : 0;
      previousSignature = signature;
      if (stableFrames >= 2) {
        styleNodes.set(faceKey, styleNode);
        return { styleNode, document: ownerDocument };
      }
    }
    if (createdStyleNode) styleNode.remove();
    return null;
  } finally {
    container.remove();
  }
}

export async function prepareTemplatePackageFonts(
  packageValue: TemplatePackageV1,
  tree: ResolvedRenderTreeV1,
  fontSet: MutableFontFaceSetLike | null | undefined,
  registry = getManagedFontRegistry(),
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
            textFaceCoverageCharacters(
              requirement.family,
              requirement.characters,
            ) || "Template",
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
