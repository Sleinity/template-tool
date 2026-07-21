import type { TemplatePackageFontRequirement } from "../types";
import {
  CANONICAL_FONT_FACE_VERSION,
  createCanonicalFontRequest,
  createRuntimeFontFamily,
  type CanonicalFontFaceV1,
} from "./fontIdentity";
import {
  findManagedFontCandidates,
  matchCanonicalFontFace,
} from "./fontMatching";
import type { ManagedFontRecord } from "./fontRegistryTypes";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function requirement(
  overrides: Partial<TemplatePackageFontRequirement> = {},
): TemplatePackageFontRequirement {
  return {
    id: "font:example-mono:500:normal",
    family: "Example Mono",
    style: "Medium",
    cssStyle: "normal",
    weight: 500,
    postScriptName: null,
    usedBy: ["text"],
    characters: "Example 123",
    editable: true,
    mixedStyle: false,
    source: "figma-inferred",
    availableInFigma: true,
    ...overrides,
  };
}

function face(overrides: Partial<CanonicalFontFaceV1> = {}): CanonicalFontFaceV1 {
  return {
    version: CANONICAL_FONT_FACE_VERSION,
    assetId: null,
    binaryHash: "a".repeat(64),
    collectionFaceIndex: 0,
    typographicFamily: "Example Mono",
    legacyFamily: "Example Mono Medium",
    typographicSubfamily: "Medium",
    legacySubfamily: "Regular",
    family: "Example Mono",
    subfamily: "Medium",
    fullName: "Example Mono Medium",
    postScriptName: "ExampleMono-Medium",
    weight: 500,
    style: "normal",
    stretch: "normal",
    variableAxes: [],
    unicodeCoverage: { ranges: [{ start: 0x20, end: 0x7e }], codePointCount: 95 },
    source: "test",
    license: { name: null, url: null, version: null, redistributionStatus: "unknown" },
    rawNameRecords: [],
    ...overrides,
  };
}

const request = createCanonicalFontRequest(requirement());
const exact = matchCanonicalFontFace(request, face());
assert(
  exact.classification === "exact" &&
    exact.familyBasis === "typographic-family" &&
    !exact.requiresConfirmation,
  "A typographic-family Medium face at weight 500 must be exact without flattening the full name into the family.",
);

const postScript = matchCanonicalFontFace(
  createCanonicalFontRequest(requirement({ postScriptName: "RenamedPS-Medium" })),
  face({
    typographicFamily: "Renamed Family",
    legacyFamily: "Renamed Family Medium",
    family: "Renamed Family",
    postScriptName: "RenamedPS-Medium",
  }),
);
assert(
  postScript.classification === "exact" && postScript.familyBasis === "postscript",
  "An exact PostScript identity with compatible descriptors should remain exact despite display-name differences.",
);

const variable = matchCanonicalFontFace(
  request,
  face({
    weight: 400,
    variableAxes: [{ tag: "wght", min: 100, default: 400, max: 900, name: "Weight" }],
  }),
);
assert(variable.classification === "exact", "A variable face whose weight axis contains 500 should satisfy the request.");

const italic = matchCanonicalFontFace(
  createCanonicalFontRequest(requirement({ style: "Italic", cssStyle: "italic" })),
  face({ style: "italic", typographicSubfamily: "Medium Italic", subfamily: "Medium Italic" }),
);
assert(italic.classification === "exact", "Italic must be a style descriptor rather than a family suffix.");

const condensed = matchCanonicalFontFace(
  createCanonicalFontRequest(requirement({ stretch: "condensed" })),
  face({ stretch: "condensed" }),
);
assert(condensed.classification === "exact", "Matching condensed stretch should be exact.");
assert(
  matchCanonicalFontFace(createCanonicalFontRequest(requirement({ stretch: "condensed" })), face()).classification === "compatible",
  "A same-family stretch conflict must not be exact.",
);

const fullName = matchCanonicalFontFace(
  request,
  face({ typographicFamily: null, legacyFamily: null, family: "Example Mono Medium" }),
);
assert(fullName.classification === "exact" && fullName.familyBasis === "full-name", "A decomposable full name may establish family plus style when semantic family records are absent.");

const replacement = matchCanonicalFontFace(request, face({ typographicFamily: "Other Sans", legacyFamily: "Other Sans", family: "Other Sans" }));
assert(replacement.classification === "replacement", "A different semantic family must be an explicit replacement.");

const compatibleAlias = matchCanonicalFontFace(
  request,
  face({ typographicFamily: "Approved Alias", legacyFamily: "Approved Alias", family: "Approved Alias" }),
  ["Example Mono"],
);
assert(compatibleAlias.classification === "compatible" && compatibleAlias.requiresConfirmation, "A trusted alias is compatible, not silently exact.");

const glyphGap = matchCanonicalFontFace(
  createCanonicalFontRequest(requirement({ characters: "Example Ω" })),
  face(),
);
assert(
  glyphGap.classification === "compatible" &&
    glyphGap.glyphCoverage === "incomplete" &&
    glyphGap.reasons.some((reason) => reason.includes("cover")),
  "Incomplete required glyph coverage must remain visible and require confirmation.",
);

const managed = (id: string, weight: number): ManagedFontRecord => ({
  id,
  schemaVersion: "2.0",
  family: "Example Mono",
  typographicFamily: "Example Mono",
  legacyFamily: `Example Mono ${weight}`,
  subfamily: String(weight),
  style: "normal",
  weight,
  stretch: "normal",
  source: "uploaded",
  assetId: `asset:${id}`,
  assetHash: id.padEnd(64, "0"),
  mimeType: "font/ttf",
  fileName: "misleading-name.ttf",
  runtimeFamily: createRuntimeFontFamily(id.padEnd(64, "0"), 0),
  unicodeCoverage: { ranges: [{ start: 0x20, end: 0x7e }], codePointCount: 95 },
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
  lastUsedAt: "2026-07-14T00:00:00.000Z",
  usageCount: 0,
  aliases: [],
  trustedForFamilies: [],
});

const weights = findManagedFontCandidates(requirement(), [managed("w400", 400), managed("w500", 500), managed("w700", 700)]);
assert(weights[0].font.weight === 500 && weights[0].classification === "exact", "Candidate scoring must select the exact 500 face rather than 400 or 700, independent of filename.");

const ambiguous = findManagedFontCandidates(requirement(), [managed("same1", 500), managed("same2", 500)]);
assert(ambiguous[0].ambiguous && ambiguous[1].ambiguous && ambiguous[0].requiresConfirmation, "Equivalent candidate scores must stop automatic linking.");

const unknownWeight = matchCanonicalFontFace(request, face({ weight: null }));
assert(unknownWeight.classification === "compatible" && unknownWeight.requiresConfirmation, "Unknown semantic weight must not auto-link as exact.");
