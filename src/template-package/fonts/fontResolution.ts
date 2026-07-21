import type {
  PackageFontAsset,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../types";
import {
  inspectOpenTypeFontBinary,
  type FontBinaryMetadata,
} from "./fontBinaryMetadata";
import {
  createCanonicalFontRequest,
  createRuntimeFontFamily,
} from "./fontIdentity";
import { matchCanonicalFontFace } from "./fontMatching";

export interface TrustedOpenFontResponse {
  ok: boolean;
  code?: string;
  message?: string;
  dataUrl?: string;
  mimeType?: string;
  fileName?: string;
  provider?: string;
  license?: {
    name: string;
    url: string;
  };
}

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
  const candidates = inspection.faces
    .map((face) => ({ face, match: matchCanonicalFontFace(request, face) }))
    .filter(({ match }) => match.classification === "exact" || match.classification === "compatible")
    .sort((left, right) => right.match.score - left.match.score);
  const selected = candidates[0];
  if (!selected) {
    const mismatch = matchCanonicalFontFace(request, inspection.faces[0]);
    throw new Error(mismatch.reasons.join(" ") || "The font face does not match.");
  }
  if (candidates[1]?.match.score === selected.match.score) {
    throw new Error("The font contains several equally compatible faces and cannot be linked automatically.");
  }
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
    mimeType,
    fileName: file.name,
  });
}

export async function requestTrustedOpenFont(
  requirement: TemplatePackageFontRequirement,
): Promise<TrustedOpenFontResponse> {
  const response = await fetch("/api/template-package/resolve-open-font", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      family: requirement.family,
      weight: requirement.weight,
      style: requirement.cssStyle,
      postScriptName: requirement.postScriptName,
    }),
  });
  return (await response.json()) as TrustedOpenFontResponse;
}

export function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}
