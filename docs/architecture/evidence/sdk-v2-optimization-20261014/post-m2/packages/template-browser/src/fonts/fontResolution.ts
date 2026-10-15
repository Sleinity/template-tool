import type {
  PackageFontAsset,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "@sleinity/template-core";
import {
  inspectOpenTypeFontBinary,
  type FontBinaryMetadata,
} from "./fontBinaryMetadata";
import {
  createCanonicalFontRequest,
  createRuntimeFontFamily,
} from "./fontIdentity";
import { matchCanonicalFontFace } from "./fontMatching";
import {
  fontMimeType,
  selectExactFontSetupFace,
} from "./exactFontSetup";
import {
  getManagedFontRegistry,
  linkRequirementToManagedFont,
} from "./fontRegistry";
import type {
  ManagedFontRecord,
  ManagedFontRegistry,
} from "./fontRegistryTypes";

function bytesToDataUrl(bytes: ArrayBuffer, mimeType: string): string {
  const values = new Uint8Array(bytes);
  let binary = "";
  for (let offset = 0; offset < values.length; offset += 0x8000) {
    binary += String.fromCharCode(...values.subarray(offset, offset + 0x8000));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

export async function attachFontBinary(
  packageValue: TemplatePackageV1,
  requirementId: string,
  source: ArrayBuffer,
  options: {
    mimeType: string;
    fileName?: string;
    provider?: string;
    license?: { name: string; url: string };
    requireExact?: boolean;
  },
): Promise<{
  packageValue: TemplatePackageV1;
  metadata: FontBinaryMetadata;
  assetId: string;
}> {
  const requirement = packageValue.fontRequirements?.find(
    (item) => item.id === requirementId,
  );
  if (!requirement) throw new Error("The font requirement no longer exists.");
  const inspection = await inspectOpenTypeFontBinary(source);
  if (!inspection.faces.length) throw new Error("The selected file is not a readable OpenType font.");
  const request = createCanonicalFontRequest(requirement);
  const selected = options.requireExact
    ? selectExactFontSetupFace(requirement, inspection.faces)
    : (() => {
        const candidates = inspection.faces
          .map((face) => ({ face, match: matchCanonicalFontFace(request, face) }))
          .filter(({ match }) =>
            match.classification === "exact" ||
            match.classification === "compatible")
          .sort((left, right) => right.match.score - left.match.score);
        const candidate = candidates[0];
        if (!candidate) {
          const mismatch = matchCanonicalFontFace(request, inspection.faces[0]);
          throw new Error(mismatch.reasons.join(" ") || "The font face does not match.");
        }
        if (candidates[1]?.match.score === candidate.match.score) {
          throw new Error("The font contains several equally compatible faces and cannot be linked automatically.");
        }
        return candidate;
      })();
  const metadata = selected.face;
  const classification = selected.match.classification as "exact" | "compatible";
  const hash = inspection.binaryHash;
  const assetId = `asset:font:${hash.slice(0, 12)}:${metadata.collectionFaceIndex}`;
  const runtimeFamily = createRuntimeFontFamily(
    hash,
    metadata.collectionFaceIndex,
    requirement.axes,
  );
  const nextPackage = structuredClone(packageValue);
  const nextRequirement = nextPackage.fontRequirements?.find(
    (item) => item.id === requirementId,
  );
  if (!nextRequirement) throw new Error("The font requirement no longer exists.");
  const asset: PackageFontAsset = {
    id: assetId,
    type: "font",
    source: "embedded",
    mimeType: options.mimeType,
    hash,
    dataUrl: bytesToDataUrl(source, options.mimeType),
    sizeBytes: source.byteLength,
    sizeKb: Math.round((source.byteLength / 1024) * 10) / 10,
    usedBy: [...requirement.usedBy],
    extensions: {
      fileName: options.fileName,
      provider: options.provider ?? "user-upload",
      license: options.license,
      fontMetadata: metadata,
      fontFaceIdentity: {
        binaryHash: hash,
        faceIndex: metadata.collectionFaceIndex,
        runtimeFamily,
        classification,
      },
    },
  };
  nextPackage.assets[assetId] = asset;
  nextRequirement.assetId = assetId;
  nextRequirement.resolution = {
    requestId: requirement.id,
    match: classification,
    classification,
    confirmed: true,
    faceIndex: metadata.collectionFaceIndex,
    binaryHash: hash,
    runtimeFamily,
    effectiveFamily: metadata.typographicFamily ?? metadata.family ?? requirement.family,
    effectiveWeight: requirement.weight,
    effectiveStyle: requirement.cssStyle,
    effectiveStretch: requirement.stretch ?? metadata.stretch,
    effectiveAxes: (requirement.axes ?? []).map((axis) => ({ ...axis })),
  };
  return { packageValue: nextPackage, metadata, assetId };
}

export async function attachUploadedFont(
  packageValue: TemplatePackageV1,
  requirement: TemplatePackageFontRequirement,
  file: File,
) {
  const mimeType =
    file.type ||
    (/\.woff2$/i.test(file.name)
      ? "font/woff2"
      : /\.woff$/i.test(file.name)
        ? "font/woff"
        : /\.otf$/i.test(file.name)
          ? "font/otf"
          : "font/ttf");
  return attachFontBinary(packageValue, requirement.id, await file.arrayBuffer(), {
    mimeType: fontMimeType(file.name, mimeType),
    fileName: file.name,
  });
}

export async function uploadExactManagedFontForRequirement(
  packageValue: TemplatePackageV1,
  requirementId: string,
  source: ArrayBuffer,
  options: {
    mimeType?: string;
    fileName?: string;
    provider?: string;
    registry?: ManagedFontRegistry | null;
    reason?: string;
  } = {},
): Promise<{
  packageValue: TemplatePackageV1;
  metadata: FontBinaryMetadata;
  assetId: string;
  managedFont: ManagedFontRecord | null;
}> {
  const mimeType = fontMimeType(options.fileName, options.mimeType);
  const prepared = await attachFontBinary(
    packageValue,
    requirementId,
    source,
    {
      mimeType,
      fileName: options.fileName,
      provider: options.provider ?? "user-upload",
      requireExact: true,
    },
  );
  const registry = Object.prototype.hasOwnProperty.call(options, "registry")
    ? options.registry ?? null
    : getManagedFontRegistry();
  if (!registry) {
    return {
      ...prepared,
      managedFont: null,
    };
  }
  const requirement = packageValue.fontRequirements?.find(
    (item) => item.id === requirementId,
  );
  if (!requirement) throw new Error("The font requirement no longer exists.");
  const metadata = prepared.metadata;
  const managedFont = await registry.registerUploadedFont({
    bytes: source,
    family:
      metadata.typographicFamily ??
      metadata.family ??
      requirement.family,
    typographicFamily: metadata.typographicFamily ?? undefined,
    legacyFamily: metadata.legacyFamily ?? undefined,
    subfamily: metadata.subfamily ?? undefined,
    typographicSubfamily: metadata.typographicSubfamily ?? undefined,
    legacySubfamily: metadata.legacySubfamily ?? undefined,
    style: metadata.style,
    weight: metadata.weight ?? requirement.weight,
    stretch: metadata.stretch ?? undefined,
    postScriptName: metadata.postScriptName ?? undefined,
    fullName: metadata.fullName ?? undefined,
    faceIndex: metadata.collectionFaceIndex,
    runtimeFamily:
      prepared.packageValue.fontRequirements?.find(
        (item) => item.id === requirementId,
      )?.resolution?.runtimeFamily,
    variableAxes: metadata.variableAxes,
    unicodeCoverage: metadata.unicodeCoverage,
    rawNameRecords: metadata.rawNameRecords,
    license: metadata.license,
    source: "uploaded",
    mimeType,
    fileName: options.fileName ?? "uploaded-font",
  });
  const nextPackage = await linkRequirementToManagedFont(
    packageValue,
    requirementId,
    managedFont,
    {
      confirmed: true,
      reason:
        options.reason ??
        "Uploaded face passed the exact template-setup font policy.",
      registry,
    },
  );
  return {
    packageValue: nextPackage,
    metadata,
    assetId: managedFont.assetId,
    managedFont,
  };
}
