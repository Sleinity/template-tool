import type {
  PackageFontCssStyle,
  TemplatePackageFontRequirement,
} from "../types";
import {
  CANONICAL_FONT_FACE_VERSION,
  coverageContains,
  createCanonicalFontRequest,
  normalizeFontIdentityName,
  normalizeFontStretch,
  type CanonicalFontFaceV1,
  type CanonicalFontRequestV1,
} from "./fontIdentity";
import type {
  FontRequirementKey,
  ManagedFontCandidate,
  ManagedFontRecord,
} from "./fontRegistryTypes";

export type FontMatchClassification =
  | "exact"
  | "compatible"
  | "replacement"
  | "missing";

export interface CanonicalFontMatchResult {
  classification: FontMatchClassification;
  score: number;
  requiresConfirmation: boolean;
  familyBasis:
    | "postscript"
    | "typographic-family"
    | "legacy-family"
    | "full-name"
    | "trusted-alias"
    | "different-family"
    | "missing";
  weightSupported: boolean;
  styleMatches: boolean;
  stretchMatches: boolean;
  axesSupported: boolean;
  glyphCoverage: "complete" | "incomplete" | "unknown";
  reasons: string[];
}

export function normalizeFontFamilyName(value: string): string {
  return normalizeFontIdentityName(value);
}

export function normalizeFontStyle(value: string): PackageFontCssStyle {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("italic")) return "italic";
  if (normalized.includes("oblique")) return "oblique";
  return "normal";
}

export function normalizeFontWeight(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 400;
  return Math.min(1000, Math.max(1, Math.round(parsed)));
}

export function createFontRequirementKey(
  requirement:
    | TemplatePackageFontRequirement
    | {
        family: string;
        style: string;
        weight: number;
        stretch?: string;
      },
): FontRequirementKey {
  return {
    family: normalizeFontFamilyName(requirement.family),
    style:
      "cssStyle" in requirement
        ? normalizeFontStyle(requirement.cssStyle)
        : normalizeFontStyle(requirement.style),
    weight: normalizeFontWeight(requirement.weight),
    stretch:
      "stretch" in requirement && typeof requirement.stretch === "string"
        ? normalizeFontStretch(requirement.stretch)
        : undefined,
  };
}

export function serializeFontRequirementKey(key: FontRequirementKey): string {
  return [
    normalizeFontFamilyName(key.family),
    normalizeFontStyle(key.style),
    normalizeFontWeight(key.weight),
    normalizeFontStretch(key.stretch),
  ].join(":");
}

function normalizedPostScript(value: string | null | undefined): string {
  return normalizeFontIdentityName(value).replace(/[^a-z0-9]/g, "");
}

function faceWeightSupported(
  request: CanonicalFontRequestV1,
  face: CanonicalFontFaceV1,
): boolean {
  const weightAxis = face.variableAxes.find((axis) => axis.tag.toLowerCase() === "wght");
  if (weightAxis) return request.weight >= weightAxis.min && request.weight <= weightAxis.max;
  return face.weight !== null && face.weight === request.weight;
}

function axesSupported(
  request: CanonicalFontRequestV1,
  face: CanonicalFontFaceV1,
): boolean {
  return request.axes.every((requested) => {
    const axis = face.variableAxes.find(
      (candidate) => candidate.tag.toLowerCase() === requested.tag.toLowerCase(),
    );
    return Boolean(axis && requested.value >= axis.min && requested.value <= axis.max);
  });
}

function fullNameRepresentsRequest(
  request: CanonicalFontRequestV1,
  face: CanonicalFontFaceV1,
): boolean {
  const full = normalizeFontIdentityName(face.fullName);
  if (!full.startsWith(`${request.normalizedFamily} `)) return false;
  const suffix = full.slice(request.normalizedFamily.length).trim();
  const styleLabel = normalizeFontIdentityName(request.rawSourceStyleLabel);
  return Boolean(suffix && styleLabel && (suffix === styleLabel || suffix.includes(styleLabel)));
}

export function matchCanonicalFontFace(
  request: CanonicalFontRequestV1,
  face: CanonicalFontFaceV1,
  aliases: readonly string[] = [],
): CanonicalFontMatchResult {
  const reasons: string[] = [];
  const requestedFamily = request.normalizedFamily;
  const typographicFamily = normalizeFontIdentityName(face.typographicFamily);
  const legacyFamily = normalizeFontIdentityName(face.legacyFamily);
  const postScriptMatch = Boolean(
    request.postScriptName && face.postScriptName &&
      normalizedPostScript(request.postScriptName) === normalizedPostScript(face.postScriptName),
  );
  const typographicMatch = Boolean(typographicFamily && typographicFamily === requestedFamily);
  const legacyMatch = Boolean(legacyFamily && legacyFamily === requestedFamily);
  const fullNameMatch = !face.typographicFamily && fullNameRepresentsRequest(request, face);
  const aliasMatch = aliases.map(normalizeFontIdentityName).includes(requestedFamily);
  const familyBasis: CanonicalFontMatchResult["familyBasis"] = postScriptMatch
    ? "postscript"
    : typographicMatch
      ? "typographic-family"
      : legacyMatch
        ? "legacy-family"
        : fullNameMatch
          ? "full-name"
          : aliasMatch
            ? "trusted-alias"
            : face.family
              ? "different-family"
              : "missing";
  const familyMatches = familyBasis !== "different-family" && familyBasis !== "missing";
  const weightSupported = faceWeightSupported(request, face);
  const styleMatches = face.style === request.style ||
    (request.style === "oblique" && face.style === "italic");
  const stretchMatches = normalizeFontStretch(face.stretch) === request.stretch;
  const requestedAxesSupported = axesSupported(request, face);
  const glyphCoverage = face.unicodeCoverage.ranges.length === 0
    ? "unknown"
    : coverageContains(face.unicodeCoverage, request.characters)
      ? "complete"
      : "incomplete";

  if (!familyMatches) {
    reasons.push(
      face.family
        ? `The selected face belongs to ${face.family}; the request is for ${request.rawFamily}.`
        : "The selected face has no usable semantic family metadata.",
    );
  }
  if (!weightSupported) reasons.push(`The selected face does not provide weight ${request.weight}.`);
  if (!styleMatches) reasons.push(`The selected face is ${face.style}; the request is ${request.style}.`);
  if (!stretchMatches) reasons.push(`The selected face is ${face.stretch}; the request is ${request.stretch}.`);
  if (!requestedAxesSupported) reasons.push("The selected variable face cannot produce the requested axis instance.");
  if (glyphCoverage === "incomplete") reasons.push("The selected face does not cover every required character.");

  const exactSemantics = familyMatches && weightSupported && styleMatches && stretchMatches &&
    requestedAxesSupported && glyphCoverage !== "incomplete";
  const classification: FontMatchClassification = exactSemantics && familyBasis !== "trusted-alias"
    ? "exact"
    : familyMatches
      ? "compatible"
      : face.family
        ? "replacement"
        : "missing";
  const basisScore: Record<CanonicalFontMatchResult["familyBasis"], number> = {
    postscript: 1500,
    "typographic-family": 1400,
    "legacy-family": 1300,
    "full-name": 1200,
    "trusted-alias": 900,
    "different-family": 100,
    missing: 0,
  };
  const score = basisScore[familyBasis] +
    (weightSupported ? 200 : -Math.abs((face.weight ?? 400) - request.weight)) +
    (styleMatches ? 100 : -100) +
    (stretchMatches ? 50 : -50) +
    (requestedAxesSupported ? 50 : -100) +
    (glyphCoverage === "complete" ? 25 : glyphCoverage === "incomplete" ? -200 : 0);
  return {
    classification,
    score,
    requiresConfirmation: classification !== "exact" || glyphCoverage !== "complete",
    familyBasis,
    weightSupported,
    styleMatches,
    stretchMatches,
    axesSupported: requestedAxesSupported,
    glyphCoverage,
    reasons,
  };
}

export function managedFontRecordToFace(font: ManagedFontRecord): CanonicalFontFaceV1 {
  return {
    version: CANONICAL_FONT_FACE_VERSION,
    assetId: font.assetId,
    binaryHash: font.assetHash,
    collectionFaceIndex: font.faceIndex ?? 0,
    typographicFamily: font.typographicFamily ?? font.family,
    legacyFamily: font.legacyFamily ?? font.family,
    typographicSubfamily: font.typographicSubfamily ?? font.subfamily ?? null,
    legacySubfamily: font.legacySubfamily ?? font.subfamily ?? null,
    family: font.typographicFamily ?? font.family,
    subfamily: font.typographicSubfamily ?? font.subfamily ?? null,
    fullName: font.fullName ?? null,
    postScriptName: font.postScriptName ?? null,
    weight: font.weight,
    style: font.style,
    stretch: font.stretch ?? "normal",
    variableAxes: font.variableAxes ?? [],
    unicodeCoverage: font.unicodeCoverage ?? { ranges: [], codePointCount: 0 },
    source: font.source,
    license: font.license ?? {
      name: null,
      url: null,
      version: null,
      redistributionStatus: "unknown",
    },
    rawNameRecords: font.rawNameRecords ?? [],
  };
}

export function matchManagedFont(
  requirement: TemplatePackageFontRequirement,
  font: ManagedFontRecord,
): CanonicalFontMatchResult {
  return matchCanonicalFontFace(
    createCanonicalFontRequest(requirement),
    managedFontRecordToFace(font),
    [...font.aliases, ...font.trustedForFamilies],
  );
}

export function findManagedFontCandidates(
  requirement: FontRequirementKey | TemplatePackageFontRequirement,
  fonts: readonly ManagedFontRecord[],
): ManagedFontCandidate[] {
  const request = "id" in requirement
    ? createCanonicalFontRequest(requirement)
    : {
        version: "canonical-font-request-v1" as const,
        requestId: serializeFontRequirementKey(requirement),
        rawFamily: requirement.family,
        normalizedFamily: normalizeFontFamilyName(requirement.family),
        rawSourceStyleLabel: requirement.style,
        weight: requirement.weight,
        style: requirement.style,
        stretch: normalizeFontStretch(requirement.stretch),
        axes: [],
        postScriptName: null,
        sourceNodeIds: [],
        characters: "",
        provenance: { source: "managed-key", availableInFigma: false, inferred: false },
      } satisfies CanonicalFontRequestV1;
  return fonts
    .map((font): ManagedFontCandidate => {
      const result = matchCanonicalFontFace(
        request,
        managedFontRecordToFace(font),
        [...font.aliases, ...font.trustedForFamilies],
      );
      return {
        font,
        matchType: result.classification,
        classification: result.classification,
        score: result.score,
        requiresConfirmation: result.requiresConfirmation,
        reasons: result.reasons,
        ambiguous: false,
      };
    })
    .sort((left, right) => right.score - left.score)
    .map((candidate, _index, candidates) => ({
      ...candidate,
      ambiguous: candidates.filter((other) => other.score === candidate.score).length > 1,
      requiresConfirmation:
        candidate.requiresConfirmation ||
        candidates.filter((other) => other.score === candidate.score).length > 1,
    }));
}

export function findManagedFontForRequirement(
  requirement: FontRequirementKey | TemplatePackageFontRequirement,
  fonts: readonly ManagedFontRecord[],
): ManagedFontCandidate | null {
  const candidates = findManagedFontCandidates(requirement, fonts);
  const best = candidates[0];
  if (!best || best.ambiguous) return null;
  return best;
}
