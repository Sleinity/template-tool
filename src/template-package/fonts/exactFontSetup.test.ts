import type {
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../types";
import {
  CANONICAL_FONT_FACE_VERSION,
  createRuntimeFontFamily,
  type CanonicalFontFaceV1,
} from "./fontIdentity";
import {
  areExactFontRequirementsResolved,
  ExactFontSetupError,
  formatRequiredFontFace,
  isExactFontRequirementResolved,
  selectExactFontSetupFace,
} from "./exactFontSetup";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function requirement(
  overrides: Partial<TemplatePackageFontRequirement> = {},
): TemplatePackageFontRequirement {
  return {
    id: "font:rethink-sans:600:normal",
    family: "Rethink Sans",
    style: "SemiBold",
    cssStyle: "normal",
    weight: 600,
    postScriptName: "RethinkSans-SemiBold",
    usedBy: ["headline"],
    characters: "Exact font",
    editable: true,
    mixedStyle: false,
    source: "exact-font-setup-test",
    availableInFigma: true,
    ...overrides,
  };
}

function face(
  overrides: Partial<CanonicalFontFaceV1> = {},
): CanonicalFontFaceV1 {
  return {
    version: CANONICAL_FONT_FACE_VERSION,
    assetId: null,
    binaryHash: "a".repeat(64),
    collectionFaceIndex: 0,
    typographicFamily: "Rethink Sans",
    legacyFamily: "Rethink Sans",
    typographicSubfamily: "SemiBold",
    legacySubfamily: "SemiBold",
    family: "Rethink Sans",
    subfamily: "SemiBold",
    fullName: "Rethink Sans SemiBold",
    postScriptName: "RethinkSans-SemiBold",
    weight: 600,
    style: "normal",
    stretch: "normal",
    variableAxes: [],
    unicodeCoverage: {
      ranges: [{ start: 0x20, end: 0x7e }],
      codePointCount: 95,
    },
    source: "test",
    license: {
      name: null,
      url: null,
      version: null,
      redistributionStatus: "unknown",
    },
    rawNameRecords: [],
    ...overrides,
  };
}

assert(
  selectExactFontSetupFace(requirement(), [face()]).match.classification ===
    "exact",
  "The setup policy should accept one exact face with complete required glyph coverage.",
);
assert(
  selectExactFontSetupFace(
    requirement({ characters: "Summer Sale ☀️" }),
    [face()],
  ).match.classification === "exact",
  "An exact text face should remain exact when only explicit emoji presentation falls back to the device emoji font.",
);
for (const characters of [
  "Hello 👨‍👩‍👧‍👦",
  "Hello 👍🏽",
  "Hello 🇳🇱",
  "Press 1️⃣",
]) {
  assert(
    selectExactFontSetupFace(
      requirement({ characters }),
      [face()],
    ).match.classification === "exact",
    `Exact setup should accept platform emoji fallback for ${characters}.`,
  );
}
assert(
  selectExactFontSetupFace(
    requirement({ weight: 650 }),
    [face({
      weight: 400,
      variableAxes: [{
        tag: "wght",
        min: 100,
        default: 400,
        max: 900,
        name: "Weight",
      }],
    })],
  ).match.classification === "exact",
  "A variable face should be exact when its axis supplies the requested weight.",
);

for (const { candidate, code, request } of [
  { candidate: face({
    typographicFamily: "Other Sans",
    legacyFamily: "Other Sans",
    family: "Other Sans",
    postScriptName: "OtherSans-SemiBold",
  }), code: "font-family-mismatch", request: requirement() },
  {
    candidate: face({ weight: 400 }),
    code: "font-weight-mismatch",
    request: requirement(),
  },
  {
    candidate: face({ style: "italic" }),
    code: "font-posture-mismatch",
    request: requirement(),
  },
  {
    candidate: face({ stretch: "condensed" }),
    code: "font-stretch-mismatch",
    request: requirement(),
  },
  {
    candidate: face(),
    code: "font-axis-mismatch",
    request: requirement({ axes: [{ tag: "wdth", value: 80 }] }),
  },
  {
    candidate: face({
      unicodeCoverage: {
        ranges: [{ start: 0x20, end: 0x40 }],
        codePointCount: 33,
      },
    }),
    code: "font-glyph-coverage-incomplete",
    request: requirement(),
  },
  {
    candidate: face({
      unicodeCoverage: { ranges: [], codePointCount: 0 },
    }),
    code: "font-glyph-coverage-unverified",
    request: requirement(),
  },
] as const) {
  let failure: unknown = null;
  try {
    selectExactFontSetupFace(request, [candidate]);
  } catch (error) {
    failure = error;
  }
  assert(
    failure instanceof ExactFontSetupError && failure.code === code,
    `The exact setup policy should reject ${code}.`,
  );
}

for (const characters of ["é", "€", "Ω", "☀", "™"]) {
  let failure: unknown = null;
  try {
    selectExactFontSetupFace(
      requirement({ characters }),
      [face()],
    );
  } catch (error) {
    failure = error;
  }
  assert(
    failure instanceof ExactFontSetupError &&
      failure.code === "font-glyph-coverage-incomplete" &&
      failure.message.includes(characters),
    `Missing strict text character ${characters} should block setup and be identified.`,
  );
}

for (const { characters, coveredCodePoint } of [
  { characters: "A", coveredCodePoint: "B".codePointAt(0)! },
  { characters: "7", coveredCodePoint: "6".codePointAt(0)! },
  { characters: "!", coveredCodePoint: "\"".codePointAt(0)! },
]) {
  let failure: unknown = null;
  try {
    selectExactFontSetupFace(
      requirement({ characters }),
      [face({
        unicodeCoverage: {
          ranges: [{
            start: coveredCodePoint,
            end: coveredCodePoint,
          }],
          codePointCount: 1,
        },
      })],
    );
  } catch (error) {
    failure = error;
  }
  assert(
    failure instanceof ExactFontSetupError &&
      failure.code === "font-glyph-coverage-incomplete" &&
      failure.message.includes(characters),
    `Missing letter, number, or punctuation ${characters} should remain blocking.`,
  );
}

let ambiguous: unknown = null;
try {
  selectExactFontSetupFace(requirement(), [
    face(),
    face({ binaryHash: "b".repeat(64), collectionFaceIndex: 1 }),
  ]);
} catch (error) {
  ambiguous = error;
}
assert(
  ambiguous instanceof ExactFontSetupError &&
    ambiguous.code === "font-face-ambiguous",
  "A collection with multiple exact faces should require an unambiguous file.",
);

assert(
  formatRequiredFontFace(requirement()) ===
    "Rethink Sans — SemiBold (600)" &&
    formatRequiredFontFace(
      requirement({ style: "SemiBold Italic", cssStyle: "italic" }),
    ) === "Rethink Sans — SemiBold Italic (600)",
  "Normal posture should stay implicit while italic posture remains visible.",
);

const resolvedRequirement = requirement();
const runtimeFamily = createRuntimeFontFamily("a".repeat(64), 0);
resolvedRequirement.assetId = "asset:font:exact";
resolvedRequirement.resolution = {
  managedFontId: "managed:exact",
  match: "exact",
  classification: "exact",
  confirmed: true,
  faceIndex: 0,
  binaryHash: "a".repeat(64),
  runtimeFamily,
};
const packageValue = {
  fontRequirements: [resolvedRequirement],
  assets: {
    "asset:font:exact": {
      id: "asset:font:exact",
      type: "font",
      source: "stored",
      mimeType: "font/ttf",
      hash: "a".repeat(64),
      extensions: {
        fileName: "RethinkSans-SemiBold.ttf",
        fontFaceIdentity: {
          binaryHash: "a".repeat(64),
          faceIndex: 0,
          runtimeFamily,
          classification: "exact",
        },
      },
    },
  },
} as TemplatePackageV1;
assert(
  isExactFontRequirementResolved(packageValue, resolvedRequirement) &&
    areExactFontRequirementsResolved(packageValue),
  "Readiness should require matching package asset, binary, face, runtime family, and exact classification.",
);
packageValue.assets["asset:font:exact"].hash = "b".repeat(64);
assert(
  !isExactFontRequirementResolved(packageValue, resolvedRequirement),
  "A stale or mismatched linked binary must not remain setup-ready.",
);
