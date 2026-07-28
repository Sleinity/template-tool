import type {
  PackageFontResolutionMatch,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../types";
import {
  createFontRequirementKey,
  findManagedFontCandidates,
  findManagedFontForRequirement,
  matchManagedFont,
} from "./fontMatching";
import { IndexedDbManagedFontRegistry } from "./indexedDbFontRegistry";
import type {
  ManagedFontCandidate,
  ManagedFontRecord,
  ManagedFontRegistry,
} from "./fontRegistryTypes";

let registry: ManagedFontRegistry | null = null;

export function getManagedFontRegistry(): ManagedFontRegistry | null {
  if (registry) return registry;
  if (typeof indexedDB === "undefined") return null;
  registry ??= new IndexedDbManagedFontRegistry();
  return registry;
}

export function setManagedFontRegistryForTests(
  next: ManagedFontRegistry | null,
): void {
  registry = next;
}

export async function findManagedFontCandidatesForRequirement(
  requirement: TemplatePackageFontRequirement,
): Promise<ManagedFontCandidate[]> {
  const fonts = await getManagedFontRegistry()?.listManagedFonts();
  return findManagedFontCandidates(
    requirement,
    fonts ?? [],
  );
}

export interface LinkManagedFontOptions {
  allowReplacement?: boolean;
  confirmed?: boolean;
  reason?: string;
  registry?: ManagedFontRegistry | null;
}

export async function linkRequirementToManagedFont(
  packageValue: TemplatePackageV1,
  requirementId: string,
  font: ManagedFontRecord,
  options: LinkManagedFontOptions = {},
): Promise<TemplatePackageV1> {
  const nextPackage = structuredClone(packageValue);
  const requirement = nextPackage.fontRequirements?.find(
    (item) => item.id === requirementId,
  );
  if (!requirement) throw new Error("The font requirement no longer exists.");
  const semanticMatch = matchManagedFont(requirement, font);
  if (semanticMatch.classification === "missing") {
    throw new Error(semanticMatch.reasons.join(" ") || "The selected font has no usable identity.");
  }
  if (
    semanticMatch.classification === "replacement" &&
    !options.allowReplacement
  ) {
    throw new Error(
      semanticMatch.reasons.join(" ") ||
        `The selected face belongs to ${font.family}; the request is for ${requirement.family}.`,
    );
  }
  const match: PackageFontResolutionMatch = semanticMatch.classification;
  const previousResolution = requirement.resolution;
  const history = [...(previousResolution?.history ?? [])];
  if (previousResolution) {
    history.push({
      match: previousResolution.match,
      managedFontId: previousResolution.managedFontId,
      binaryHash: previousResolution.binaryHash,
      changedAt: new Date().toISOString(),
      reason: options.reason ?? "Font link changed after semantic face validation.",
    });
  }
  requirement.resolution = {
    managedFontId: font.id,
    match,
    classification: semanticMatch.classification,
    confirmed: options.confirmed ?? true,
    requestId: requirement.id,
    faceIndex: font.faceIndex ?? 0,
    binaryHash: font.assetHash,
    runtimeFamily: font.runtimeFamily,
    effectiveFamily: font.typographicFamily ?? font.family,
    effectiveWeight: requirement.weight,
    effectiveStyle: requirement.cssStyle,
    effectiveStretch: requirement.stretch ?? font.stretch ?? "normal",
    effectiveAxes: (requirement.axes ?? []).map((axis) => ({ ...axis })),
    history: history.length ? history : undefined,
  };
  requirement.assetId = font.assetId;
  nextPackage.assets[font.assetId] = {
    id: font.assetId,
    type: "font",
    source: "stored",
    mimeType: font.mimeType,
    hash: font.assetHash,
    storageKey: `sha256:${font.assetHash}`,
    usedBy: [...requirement.usedBy],
    extensions: {
      managedFontId: font.id,
      fileName: font.fileName,
      fontFaceIdentity: {
        binaryHash: font.assetHash,
        faceIndex: font.faceIndex ?? 0,
        runtimeFamily: font.runtimeFamily,
        typographicFamily: font.typographicFamily ?? font.family,
        legacyFamily: font.legacyFamily ?? font.family,
        typographicSubfamily: font.typographicSubfamily ?? font.subfamily,
        legacySubfamily: font.legacySubfamily ?? font.subfamily,
        fullName: font.fullName,
        postScriptName: font.postScriptName,
        weight: font.weight,
        style: font.style,
        stretch: font.stretch ?? "normal",
        classification: semanticMatch.classification,
      },
    },
  };
  const registryValue = Object.prototype.hasOwnProperty.call(options, "registry")
    ? options.registry
    : getManagedFontRegistry();
  await registryValue?.linkRequirementToManagedFont(
    createFontRequirementKey(requirement),
    font.id,
    {
      requestId: requirement.id,
      faceIndex: font.faceIndex ?? 0,
      binaryHash: font.assetHash,
      classification: semanticMatch.classification,
      runtimeFamily: font.runtimeFamily,
      effectiveFamily: font.typographicFamily ?? font.family,
      effectiveWeight: requirement.weight,
      effectiveStyle: requirement.cssStyle,
      effectiveStretch: requirement.stretch ?? font.stretch ?? "normal",
    },
  );
  return nextPackage;
}

export function useFallbackForRequirement(
  packageValue: TemplatePackageV1,
  requirementId: string,
  fallbackFamily = "sans-serif",
): TemplatePackageV1 {
  const nextPackage = structuredClone(packageValue);
  const requirement = nextPackage.fontRequirements?.find(
    (item) => item.id === requirementId,
  );
  if (!requirement) throw new Error("The font requirement no longer exists.");
  requirement.resolution = {
    match: "fallback",
    confirmed: true,
    fallbackFamily,
  };
  delete requirement.assetId;
  return nextPackage;
}

export async function unlinkManagedFontRequirement(
  packageValue: TemplatePackageV1,
  requirementId: string,
): Promise<TemplatePackageV1> {
  const nextPackage = structuredClone(packageValue);
  const requirement = nextPackage.fontRequirements?.find(
    (item) => item.id === requirementId,
  );
  if (!requirement) throw new Error("The font requirement no longer exists.");
  await getManagedFontRegistry()?.unlinkRequirement(
    createFontRequirementKey(requirement),
  );
  delete requirement.assetId;
  delete requirement.resolution;
  return nextPackage;
}

export async function autoLinkManagedFonts(
  packageValue: TemplatePackageV1,
  registryValue: ManagedFontRegistry | null = getManagedFontRegistry(),
): Promise<TemplatePackageV1> {
  if (!registryValue || !packageValue.fontRequirements?.length) {
    return packageValue;
  }
  let nextPackage = structuredClone(packageValue);
  const fonts = await registryValue.listManagedFonts();
  for (const requirement of nextPackage.fontRequirements ?? []) {
    if (requirement.resolution?.managedFontId) continue;
    const key = createFontRequirementKey(requirement);
    const mapping = await registryValue.getMapping(key);
    const mapped = mapping
      ? fonts.find((font) => font.id === mapping.managedFontId)
      : null;
    const candidate = mapped
      ? findManagedFontCandidates(requirement, [mapped])[0] ?? null
      : findManagedFontForRequirement(requirement, fonts);
    if (
      !candidate ||
      candidate.requiresConfirmation ||
      candidate.classification !== "exact"
    ) continue;
    nextPackage = await linkRequirementToManagedFont(
      nextPackage,
      requirement.id,
      candidate.font,
      {
        confirmed: true,
        reason: "Unambiguous exact managed-font match.",
        registry: registryValue,
      },
    );
  }
  return nextPackage;
}
