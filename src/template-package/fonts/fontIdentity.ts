import type {
  PackageFontAxisValue,
  PackageFontCssStyle,
  TemplatePackageFontRequirement,
} from "../types";

export const CANONICAL_FONT_REQUEST_VERSION = "canonical-font-request-v1" as const;
export const CANONICAL_FONT_FACE_VERSION = "canonical-font-face-v1" as const;

export interface CanonicalFontRequestV1 {
  version: typeof CANONICAL_FONT_REQUEST_VERSION;
  requestId: string;
  rawFamily: string;
  normalizedFamily: string;
  rawSourceStyleLabel: string;
  weight: number;
  style: PackageFontCssStyle;
  stretch: string;
  axes: PackageFontAxisValue[];
  postScriptName: string | null;
  sourceNodeIds: string[];
  characters: string;
  provenance: {
    source: string;
    availableInFigma: boolean;
    inferred: boolean;
  };
}

export interface OpenTypeNameRecordEvidence {
  platformId: number;
  encodingId: number;
  languageId: number;
  nameId: number;
  value: string;
}

export interface FontVariationAxis {
  tag: string;
  min: number;
  default: number;
  max: number;
  name: string | null;
}

export interface FontUnicodeCoverage {
  ranges: Array<{ start: number; end: number }>;
  codePointCount: number;
}

export interface CanonicalFontFaceV1 {
  version: typeof CANONICAL_FONT_FACE_VERSION;
  assetId: string | null;
  binaryHash: string;
  collectionFaceIndex: number;
  typographicFamily: string | null;
  legacyFamily: string | null;
  typographicSubfamily: string | null;
  legacySubfamily: string | null;
  family: string | null;
  subfamily: string | null;
  fullName: string | null;
  postScriptName: string | null;
  weight: number | null;
  style: PackageFontCssStyle;
  stretch: string;
  variableAxes: FontVariationAxis[];
  unicodeCoverage: FontUnicodeCoverage;
  source: string;
  license: {
    name: string | null;
    url: string | null;
    version: string | null;
    redistributionStatus: "allowed" | "restricted" | "unknown";
  };
  rawNameRecords: OpenTypeNameRecordEvidence[];
}

export function normalizeFontIdentityName(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/^["']|["']$/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeFontStretch(value: string | null | undefined): string {
  return normalizeFontIdentityName(value) || "normal";
}

export function createCanonicalFontRequest(
  requirement: TemplatePackageFontRequirement,
): CanonicalFontRequestV1 {
  return {
    version: CANONICAL_FONT_REQUEST_VERSION,
    requestId: requirement.id,
    rawFamily: requirement.family,
    normalizedFamily: normalizeFontIdentityName(requirement.family),
    rawSourceStyleLabel: requirement.style,
    weight: requirement.weight,
    style: requirement.cssStyle,
    stretch: normalizeFontStretch(requirement.stretch),
    axes: (requirement.axes ?? []).map((axis) => ({ ...axis })),
    postScriptName: requirement.postScriptName,
    sourceNodeIds: [...requirement.usedBy],
    characters: requirement.characters,
    provenance: {
      source: requirement.source,
      availableInFigma: requirement.availableInFigma,
      inferred: requirement.source.includes("inferred"),
    },
  };
}

export function createRuntimeFontFamily(
  binaryHash: string,
  faceIndex: number,
  axes: readonly PackageFontAxisValue[] = [],
): string {
  const axisIdentity = axes
    .map((axis) => `${axis.tag.toLowerCase()}_${axis.value}`)
    .sort()
    .join("_") || "static";
  const safeAxisIdentity = axisIdentity.replace(/[^a-z0-9_.-]+/gi, "_");
  return `__template_font_${binaryHash.slice(0, 16)}_${faceIndex}_${safeAxisIdentity}`;
}

export function coverageContains(
  coverage: FontUnicodeCoverage,
  characters: string,
): boolean {
  for (const character of characters) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || /\s/u.test(character)) continue;
    if (!coverage.ranges.some((range) => codePoint >= range.start && codePoint <= range.end)) {
      return false;
    }
  }
  return true;
}
