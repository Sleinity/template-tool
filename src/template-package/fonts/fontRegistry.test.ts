import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "../types";
import {
  autoLinkManagedFonts,
  createTemplatePackageFontEmbedCss,
  createFontRequirementKey,
  findManagedFontCandidates,
  InMemoryManagedFontRegistry,
  linkRequirementToManagedFont,
  normalizeManagedFontRecord,
  setManagedFontRegistryForTests,
  useFallbackForRequirement,
} from "./index";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const registry = new InMemoryManagedFontRegistry();
setManagedFontRegistryForTests(registry);
const bytes = new Uint8Array([0, 1, 2, 3, 4]).buffer;
const migratedLegacy = normalizeManagedFontRecord({
  id: "legacy",
  schemaVersion: "1.0",
  family: "Legacy Sans",
  style: "normal",
  weight: 400,
  source: "uploaded",
  assetId: "asset:legacy",
  assetHash: "f".repeat(64),
  mimeType: "font/ttf",
  fileName: "LegacySans.ttf",
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
  lastUsedAt: "2026-07-13T00:00:00.000Z",
  usageCount: 0,
  aliases: [],
  trustedForFamilies: [],
});
assert(
  migratedLegacy.schemaVersion === "2.0" &&
    migratedLegacy.typographicFamily === "Legacy Sans" &&
    migratedLegacy.legacyFamily === "Legacy Sans" &&
    migratedLegacy.runtimeFamily?.includes("ffffffffffffffff"),
  "Legacy family-string records should gain canonical and private identity without discarding the original family.",
);
const registered = await registry.registerUploadedFont({
  bytes,
  family: "Registry Sans",
  style: "normal",
  weight: 400,
  source: "uploaded",
  mimeType: "font/ttf",
  fileName: "RegistrySans-Regular.ttf",
});
const duplicate = await registry.registerUploadedFont({
  bytes,
  family: "Registry Sans",
  style: "normal",
  weight: 400,
  source: "uploaded",
  mimeType: "font/ttf",
  fileName: "RegistrySans-Regular.ttf",
});
assert(
  registered.id === duplicate.id && registry.getBlobCountForTests() === 1,
  "Uploading the same face should reuse one managed font and one binary blob.",
);
assert(
  registered.runtimeFamily?.startsWith("__template_font_") &&
    registered.runtimeFamily.includes(registered.assetHash.slice(0, 16)),
  "Managed faces should receive a deterministic binary-hash runtime family.",
);

const exactCandidates = findManagedFontCandidates(
  createFontRequirementKey({
    family: "Registry Sans",
    style: "normal",
    weight: 400,
  }),
  [registered],
);
assert(
  exactCandidates[0]?.matchType === "exact" &&
    exactCandidates[0].requiresConfirmation === true,
  "Exact semantic identity without parsed glyph coverage should remain explicit rather than silently auto-linking.",
);

const nearCandidates = findManagedFontCandidates(
  createFontRequirementKey({
    family: "Registry Sans",
    style: "normal",
    weight: 500,
  }),
  [registered],
);
assert(
  nearCandidates[0]?.matchType === "compatible" &&
    nearCandidates[0].requiresConfirmation,
  "Nearest-weight matches should remain candidates until confirmed.",
);

const packageValue = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
packageValue.fontRequirements = [
  {
    id: "font:registry-sans:400:normal",
    family: "Registry Sans",
    style: "Regular",
    cssStyle: "normal",
    weight: 400,
    postScriptName: "RegistrySans-Regular",
    usedBy: [packageValue.rootNodeId],
    characters: "Test",
    editable: true,
    mixedStyle: false,
    source: "figma",
    availableInFigma: true,
  },
];
const originalSnapshot = JSON.stringify(packageValue);
const fallbackPackage = useFallbackForRequirement(
  packageValue,
  packageValue.fontRequirements[0].id,
);
const linkedPackage = await linkRequirementToManagedFont(
  fallbackPackage,
  packageValue.fontRequirements[0].id,
  registered,
  { confirmed: true },
);
assert(
  JSON.stringify(packageValue) === originalSnapshot &&
    linkedPackage.fontRequirements?.[0].resolution?.managedFontId ===
      registered.id &&
    linkedPackage.fontRequirements?.[0].assetId === registered.assetId &&
    linkedPackage.fontRequirements?.[0].resolution?.classification === "exact" &&
    linkedPackage.fontRequirements?.[0].resolution?.binaryHash === registered.assetHash &&
    linkedPackage.fontRequirements?.[0].resolution?.runtimeFamily === registered.runtimeFamily &&
    linkedPackage.fontRequirements?.[0].resolution?.history?.[0]?.match === "fallback",
  "Managed font links should preserve source requests, replace fallback decisions with exact identity, and retain resolution history on a working-package clone.",
);

const persistedMapping = await registry.getMapping(
  createFontRequirementKey(linkedPackage.fontRequirements?.[0] ?? packageValue.fontRequirements[0]),
);
assert(
  persistedMapping?.managedFontId === registered.id &&
    persistedMapping.binaryHash === registered.assetHash &&
    persistedMapping.runtimeFamily === registered.runtimeFamily &&
    persistedMapping.classification === "exact",
  "Managed-font mappings should persist request, face, binary and runtime identity together.",
);

const exactRegistered = await registry.registerUploadedFont({
  bytes: new Uint8Array([5, 6, 7, 8, 9]).buffer,
  family: "Registry Sans",
  typographicFamily: "Registry Sans",
  legacyFamily: "Registry Sans",
  subfamily: "Regular",
  postScriptName: "RegistrySans-Regular",
  style: "normal",
  weight: 400,
  unicodeCoverage: {
    ranges: [{ start: 0x20, end: 0x7e }],
    codePointCount: 95,
  },
  source: "uploaded",
  mimeType: "font/ttf",
  fileName: "RegistrySans-Exact.ttf",
});
const linkedExact = await linkRequirementToManagedFont(
  packageValue,
  packageValue.fontRequirements[0].id,
  exactRegistered,
  { confirmed: true },
);
const importedReplacement = structuredClone(linkedExact);
if (!importedReplacement.fontRequirements?.[0].resolution) {
  throw new Error("Auto-link replacement test requires a resolution.");
}
importedReplacement.fontRequirements[0].resolution.match = "replacement";
importedReplacement.fontRequirements[0].resolution.classification =
  "replacement";
const relinkedExact = await autoLinkManagedFonts(
  importedReplacement,
  registry,
);
assert(
  relinkedExact.fontRequirements?.[0].resolution?.classification === "exact" &&
    relinkedExact.fontRequirements[0].resolution.binaryHash ===
      exactRegistered.assetHash,
  "Setup auto-linking should treat imported replacement state as unresolved and reuse an unambiguous stored exact face.",
);

const exportFontCss = await createTemplatePackageFontEmbedCss(linkedPackage);
assert(
  exportFontCss.includes(registered.runtimeFamily ?? "missing-runtime-family") &&
    exportFontCss.includes("data:font/ttf;base64,") &&
    exportFontCss.includes("font-weight:400"),
  "PNG capture should embed an exact linked private runtime face from managed binary bytes.",
);

const replacementPackage = structuredClone(linkedPackage);
if (!replacementPackage.fontRequirements?.[0].resolution) {
  throw new Error("Replacement export test requires a linked font resolution.");
}
replacementPackage.fontRequirements[0].resolution.classification = "replacement";
assert(
  (await createTemplatePackageFontEmbedCss(replacementPackage)) === "",
  "PNG capture must not promote compatibility replacement binaries to source-authoritative export faces.",
);

setManagedFontRegistryForTests(null);
