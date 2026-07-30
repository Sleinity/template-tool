import type { TemplatePackageFontRequirement } from "../../../src/template-package/types";
import {
  packageRuntimeFontSignature,
  runtimeFontTarget,
} from "../src/fonts/runtimeFontSignature";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function requirement(
  overrides: Partial<TemplatePackageFontRequirement> = {},
): TemplatePackageFontRequirement {
  return {
    id: "font:geist-mono:500:normal",
    family: "Geist Mono",
    style: "Medium",
    cssStyle: "normal",
    weight: 500,
    postScriptName: "GeistMono-Medium",
    usedBy: ["content-section"],
    characters: "Open positions",
    editable: true,
    mixedStyle: false,
    source: "figma",
    availableInFigma: true,
    ...overrides,
  };
}

const binaryHash = "9".repeat(64);
const privateFamily = "__template_font_9999999999999999_0";
const exact = requirement({
  resolution: {
    requestId: "font:geist-mono:500:normal",
    match: "exact",
    classification: "exact",
    confirmed: true,
    binaryHash,
    faceIndex: 0,
    runtimeFamily: privateFamily,
    effectiveFamily: "Geist Mono",
    effectiveWeight: 500,
    effectiveStyle: "normal",
  },
});

assert(
  runtimeFontTarget(exact).family === privateFamily,
  "A linked exact face must use its binary-scoped runtime family for readiness and revision identity.",
);
assert(
  runtimeFontTarget(requirement({
    resolution: {
      match: "fallback",
      classification: "replacement",
      confirmed: true,
      fallbackFamily: "monospace",
    },
  })).family === "Geist Mono",
  "A compatibility fallback must continue observing the requested primary family so delayed exact activation invalidates fallback geometry.",
);

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
try {
  const requiredFace = {
    family: privateFamily,
    style: "normal",
    weight: "500",
    status: "loaded",
  };
  const unrelatedFace = {
    family: "Rethink Sans",
    style: "normal",
    weight: "600",
    status: "loading",
  };
  const fontEntries = [requiredFace, unrelatedFace];
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { fonts: fontEntries },
  });
  const before = packageRuntimeFontSignature({ fontRequirements: [exact] });
  unrelatedFace.status = "loaded";
  const after = packageRuntimeFontSignature({ fontRequirements: [exact] });
  assert(
    before === after && before.includes(binaryHash) && !before.includes("Rethink Sans"),
    "Unrelated document fonts must not perturb a package font revision, while the linked binary identity remains present.",
  );
  fontEntries.push({ ...requiredFace });
  assert(
    packageRuntimeFontSignature({ fontRequirements: [exact] }) === after,
    "Registering the same binary-scoped face more than once must be revision-idempotent.",
  );
} finally {
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else delete (globalThis as { document?: unknown }).document;
}
