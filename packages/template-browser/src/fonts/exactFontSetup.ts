import type {
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "@sleinity/template-core";
import {
  createCanonicalFontRequest,
  type CanonicalFontFaceV1,
} from "./fontIdentity";
import {
  matchCanonicalFontFace,
  matchManagedFont,
  type CanonicalFontMatchResult,
} from "./fontMatching";
import type { ManagedFontRecord } from "./fontRegistryTypes";

export type ExactFontSetupErrorCode =
  | "font-file-unreadable"
  | "font-face-ambiguous"
  | "font-family-mismatch"
  | "font-weight-mismatch"
  | "font-posture-mismatch"
  | "font-stretch-mismatch"
  | "font-axis-mismatch"
  | "font-glyph-coverage-incomplete"
  | "font-glyph-coverage-unverified"
  | "font-face-not-exact";

export class ExactFontSetupError extends Error {
  readonly code: ExactFontSetupErrorCode;

  constructor(code: ExactFontSetupErrorCode, message: string) {
    super(message);
    this.name = "ExactFontSetupError";
    this.code = code;
  }
}

export interface ExactFontFaceSelection {
  face: CanonicalFontFaceV1;
  match: CanonicalFontMatchResult;
}

export function isExactFontSetupMatch(
  match: CanonicalFontMatchResult,
): boolean {
  return (
    match.classification === "exact" &&
    !match.requiresConfirmation &&
    match.glyphCoverage === "complete"
  );
}

function mismatchError(
  match: CanonicalFontMatchResult,
): ExactFontSetupError {
  if (match.familyBasis === "different-family" || match.familyBasis === "missing") {
    return new ExactFontSetupError(
      "font-family-mismatch",
      match.reasons[0] ??
        "The uploaded file does not contain the required font family.",
    );
  }
  if (!match.weightSupported) {
    return new ExactFontSetupError(
      "font-weight-mismatch",
      match.reasons.find((reason) => reason.includes("weight")) ??
        "The uploaded file does not provide the required weight.",
    );
  }
  if (!match.styleMatches) {
    return new ExactFontSetupError(
      "font-posture-mismatch",
      match.reasons.find((reason) => reason.includes("request is")) ??
        "The uploaded file does not provide the required italic or oblique posture.",
    );
  }
  if (!match.stretchMatches) {
    return new ExactFontSetupError(
      "font-stretch-mismatch",
      match.reasons.find((reason) => reason.includes("stretch")) ??
        "The uploaded file does not provide the required font width.",
    );
  }
  if (!match.axesSupported) {
    return new ExactFontSetupError(
      "font-axis-mismatch",
      match.reasons.find((reason) => reason.includes("axis")) ??
        "The uploaded variable font cannot produce the required axis values.",
    );
  }
  if (match.glyphCoverage === "incomplete") {
    return new ExactFontSetupError(
      "font-glyph-coverage-incomplete",
      match.reasons.find((reason) => reason.includes("required character")) ??
        "The uploaded file does not contain every character used by this template.",
    );
  }
  if (match.glyphCoverage === "unknown") {
    return new ExactFontSetupError(
      "font-glyph-coverage-unverified",
      "The uploaded file’s character coverage could not be verified.",
    );
  }
  return new ExactFontSetupError(
    "font-face-not-exact",
    match.reasons.join(" ") ||
      "The uploaded file could not be verified as the exact required face.",
  );
}

export function selectExactFontSetupFace(
  requirement: TemplatePackageFontRequirement,
  faces: readonly CanonicalFontFaceV1[],
): ExactFontFaceSelection {
  if (!faces.length) {
    throw new ExactFontSetupError(
      "font-file-unreadable",
      "The selected file is not a readable OpenType font.",
    );
  }
  const request = createCanonicalFontRequest(requirement);
  const candidates = faces
    .map((face) => ({
      face,
      match: matchCanonicalFontFace(request, face),
    }))
    .sort((left, right) => right.match.score - left.match.score);
  const exact = candidates.filter(({ match }) => isExactFontSetupMatch(match));
  if (exact.length > 1) {
    throw new ExactFontSetupError(
      "font-face-ambiguous",
      "The font file contains more than one exact matching face. Upload a file with one unambiguous face.",
    );
  }
  if (exact.length === 1) return exact[0];
  throw mismatchError(candidates[0].match);
}

function fontFaceIdentity(
  packageValue: TemplatePackageV1,
  requirement: TemplatePackageFontRequirement,
): Record<string, unknown> | null {
  const asset = requirement.assetId
    ? packageValue.assets[requirement.assetId]
    : undefined;
  if (!asset || asset.type !== "font") return null;
  const identity = asset.extensions?.fontFaceIdentity;
  return identity && typeof identity === "object"
    ? (identity as Record<string, unknown>)
    : null;
}

export function isExactFontRequirementResolved(
  packageValue: TemplatePackageV1,
  requirement: TemplatePackageFontRequirement,
): boolean {
  const resolution = requirement.resolution;
  const asset = requirement.assetId
    ? packageValue.assets[requirement.assetId]
    : undefined;
  const identity = fontFaceIdentity(packageValue, requirement);
  if (
    !resolution?.confirmed ||
    resolution.match !== "exact" ||
    resolution.classification !== "exact" ||
    !resolution.binaryHash ||
    !resolution.runtimeFamily ||
    !asset ||
    asset.type !== "font" ||
    asset.hash !== resolution.binaryHash ||
    !identity
  ) {
    return false;
  }
  return (
    identity.classification === "exact" &&
    identity.binaryHash === resolution.binaryHash &&
    identity.runtimeFamily === resolution.runtimeFamily &&
    Number(identity.faceIndex ?? 0) === Number(resolution.faceIndex ?? 0)
  );
}

export function managedFontExactlyMatchesRequirement(
  requirement: TemplatePackageFontRequirement,
  font: ManagedFontRecord | null | undefined,
): boolean {
  if (!font) return false;
  return isExactFontSetupMatch(matchManagedFont(requirement, font));
}

export function areExactFontRequirementsResolved(
  packageValue: TemplatePackageV1 | null | undefined,
): boolean {
  if (!packageValue) return false;
  return (packageValue.fontRequirements ?? []).every((requirement) =>
    isExactFontRequirementResolved(packageValue, requirement),
  );
}

const weightNames = new Map<number, string>([
  [100, "Thin"],
  [200, "ExtraLight"],
  [300, "Light"],
  [400, "Regular"],
  [500, "Medium"],
  [600, "SemiBold"],
  [700, "Bold"],
  [800, "ExtraBold"],
  [900, "Black"],
]);

export function formatRequiredFontFace(
  requirement: TemplatePackageFontRequirement,
): string {
  const rawStyle = requirement.style.trim();
  const posture = requirement.cssStyle === "normal"
    ? ""
    : requirement.cssStyle === "italic"
      ? "Italic"
      : "Oblique";
  const rawIncludesPosture = posture
    ? rawStyle.toLowerCase().includes(posture.toLowerCase())
    : false;
  const styleIsOnlyPosture = ["normal", "italic", "oblique"].includes(
    rawStyle.toLowerCase(),
  );
  const namedWeight = styleIsOnlyPosture || !rawStyle
    ? weightNames.get(requirement.weight) ?? `Weight ${requirement.weight}`
    : rawStyle;
  const displayStyle = [
    namedWeight,
    posture && !rawIncludesPosture ? posture : "",
  ].filter(Boolean).join(" ");
  return `${requirement.family} — ${displayStyle} (${requirement.weight})`;
}

export function fontMimeType(
  fileName: string | undefined,
  suppliedMimeType?: string,
): string {
  if (suppliedMimeType?.trim()) return suppliedMimeType;
  if (/\.woff2$/i.test(fileName ?? "")) return "font/woff2";
  if (/\.woff$/i.test(fileName ?? "")) return "font/woff";
  if (/\.otf$/i.test(fileName ?? "")) return "font/otf";
  return "font/ttf";
}
