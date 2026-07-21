import { deflateSync } from "fflate";
import {
  createZipBundleReader,
  comparePreviewReferenceDimensions,
  createLoadedSourceDiagnosticReport,
  indexTemplatePackageBundleFiles,
  ingestLoadedSourceBundleAssets,
  loadBundleAssetRegistry,
  loadTemplatePackageBundleSource,
  loadTemplatePackageZipBundle,
  normalizeTemplatePackageBundleTemplate,
  readZipCentralDirectory,
  validateTemplatePackageBundleSource,
  type ZipCentralDirectoryEntry,
} from "./index";
import simpleFixedPoster from "../fixtures/simple-fixed-poster.json";
import { analyzeAssetReliability } from "../assets";
import {
  createSavedTemplateRecord,
  InMemoryTemplateRepository,
} from "../persistence";
import { createResolvedRenderTree } from "../resolved";
import { validateTemplatePackage } from "../validateTemplatePackage";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function writeUint16(bytes: number[], value: number): void {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(bytes: number[], value: number): void {
  bytes.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function append(bytes: number[], chunk: Uint8Array): void {
  for (const value of chunk) bytes.push(value);
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

const packageWithoutDeclaredFonts = structuredClone(simpleFixedPoster) as any;
delete packageWithoutDeclaredFonts.fontRequirements;
const inferredFontSource = normalizeTemplatePackageBundleTemplate(
  packageWithoutDeclaredFonts,
);
const inferredFontPackage = inferredFontSource.normalizedTemplateJson as any;
assert(
  inferredFontPackage.fontRequirements?.length === 1 &&
    inferredFontPackage.fontRequirements[0].family === "Rethink Sans" &&
    inferredFontPackage.fontRequirements[0].weight === 600 &&
    inferredFontPackage.fontRequirements[0].cssStyle === "normal" &&
    inferredFontPackage.fontRequirements[0].usedBy.includes("headline") &&
    inferredFontPackage.fontRequirements[0].editable === true &&
    inferredFontSource.diagnostics.some(
      (item) => item.code === "FONT_REQUIREMENTS_INFERRED",
    ),
  "ZIP normalization should infer actionable font requirements from text nodes when exporter metadata is absent.",
);
const explicitFontPackage = structuredClone(simpleFixedPoster) as any;
explicitFontPackage.fontRequirements = [
  {
    id: "font:explicit",
    family: "Explicit Font",
    style: "Regular",
    cssStyle: "normal",
    weight: 400,
    postScriptName: null,
    usedBy: ["headline"],
    characters: "Explicit",
    editable: true,
    mixedStyle: false,
    source: "figma",
    availableInFigma: true,
  },
];
const preservedExplicitFontSource = normalizeTemplatePackageBundleTemplate(
  explicitFontPackage,
);
assert(
  (preservedExplicitFontSource.normalizedTemplateJson as any)
    .fontRequirements[0].id === "font:explicit" &&
    !preservedExplicitFontSource.diagnostics.some(
      (item) => item.code === "FONT_REQUIREMENTS_INFERRED",
    ),
  "Explicit exporter font requirements should remain authoritative.",
);

const videoSourcePackage = structuredClone(simpleFixedPoster) as any;
const videoNode = videoSourcePackage.nodes[videoSourcePackage.rootNodeId];
videoNode.image = { assetId: "asset:image:fallback", deferred: false };
videoNode.appearance.fills = [
  { type: "VIDEO", visible: true, opacity: 1, blendMode: "NORMAL" },
  { type: "IMAGE", assetId: "asset:image:fallback", visible: true, opacity: 1 },
];
videoSourcePackage.motion = {
  format: "figma-motion-v1",
  file: null,
  linking: {
    status: "none",
    matchedNodeIds: [],
    missingNodeIds: [],
    extraPackageNodeIds: [],
  },
};
videoSourcePackage.source = {
  ...videoSourcePackage.source,
  hasMotion: false,
};
const bundledMcp = {
  url: "https://www.figma.com/design/test-key/Test-file?node-id=root",
  nodeId: "root",
};
const normalizedVideoSource = normalizeTemplatePackageBundleTemplate(
  videoSourcePackage,
  { mcpData: bundledMcp },
);
const normalizedVideoPackage = normalizedVideoSource.normalizedTemplateJson as any;
const normalizedVideoNode = normalizedVideoPackage.nodes[normalizedVideoPackage.rootNodeId];
assert(
  normalizedVideoNode.appearance.fills.length === 1 &&
    normalizedVideoNode.appearance.fills[0].type === "IMAGE" &&
    normalizedVideoNode.extensions.figma.unsupportedPaints.length === 1 &&
    normalizedVideoNode.extensions.figma.unsupportedPaints[0].paint.type === "VIDEO",
  "VIDEO plus IMAGE source paints should normalize to one canonical IMAGE while preserving raw Figma paint provenance.",
);
assert(
  normalizedVideoPackage.motion === undefined &&
    normalizedVideoSource.diagnostics.some(
      (item) => item.code === "STATIC_MOTION_STATE_NORMALIZED",
    ),
  "Exporter-specific no-motion state should normalize to the canonical omitted motion representation.",
);
assert(
  normalizedVideoPackage.source.fileKey === "test-key" &&
    normalizedVideoPackage.source.url === bundledMcp.url &&
    normalizedVideoPackage.source.figmaMcp.nodeId === "root" &&
    normalizedVideoSource.compatibility.figmaSource?.rootMatch === true,
  "Bundled mcp.json should populate canonical Figma source metadata and detect a matching root node.",
);
const normalizedVideoAgain = normalizeTemplatePackageBundleTemplate(
  normalizedVideoPackage,
  { mcpData: bundledMcp },
).normalizedTemplateJson as any;
assert(
  normalizedVideoAgain.nodes[normalizedVideoAgain.rootNodeId].extensions.figma
    .unsupportedPaints.length === 1,
  "VIDEO paint normalization should be idempotent and must not duplicate preserved source metadata.",
);

const shaderSourcePackage = structuredClone(simpleFixedPoster) as any;
const shaderNode = shaderSourcePackage.nodes[shaderSourcePackage.rootNodeId];
shaderNode.appearance.fills = [
  { type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 }, visible: true },
  { type: "SHADER", opacity: 1, visible: true, blendMode: "NORMAL" },
];
const normalizedShaderSource = normalizeTemplatePackageBundleTemplate(
  shaderSourcePackage,
);
const normalizedShaderNode = (normalizedShaderSource.normalizedTemplateJson as any)
  .nodes[shaderSourcePackage.rootNodeId];
assert(
  normalizedShaderNode.appearance.fills.length === 1 &&
    normalizedShaderNode.appearance.fills[0].type === "SOLID" &&
    normalizedShaderNode.extensions.figma.unsupportedPaints[0].paint.type ===
      "SHADER" &&
    normalizedShaderSource.diagnostics.some(
      (item) => item.code === "UNSUPPORTED_PAINT_PRESERVED",
    ),
  "Non-canonical exporter paint types must be preserved at the source boundary without weakening strict canonical validation.",
);

const linearGradientSourcePackage = structuredClone(simpleFixedPoster) as any;
const linearGradientNode = linearGradientSourcePackage.nodes[linearGradientSourcePackage.rootNodeId];
const rawLinearGradient = {
  type: "GRADIENT_LINEAR",
  visible: true,
  opacity: 0.5,
  blendMode: "NORMAL",
  gradientStops: [
    { position: 0, color: { r: 0.1, g: 0.2, b: 0.3, a: 1 }, boundVariables: {} },
    { position: 0.4, color: { r: 0.4, g: 0.5, b: 0.6, a: 0.8 }, boundVariables: {} },
    { position: 1, color: { r: 0.9, g: 0.8, b: 0.7, a: 1 }, boundVariables: {} },
  ],
  gradientTransform: [[0.5, 0, 0.25], [0, 1, 0]],
};
linearGradientNode.appearance.fills = [{
  type: "GRADIENT_LINEAR",
  visible: true,
  opacity: 0.5,
  blendMode: "NORMAL",
}];
linearGradientNode.extensions = {
  ...(linearGradientNode.extensions ?? {}),
  figma: {
    ...(linearGradientNode.extensions?.figma ?? {}),
    rawFills: [structuredClone(rawLinearGradient)],
  },
};
const normalizedLinearGradientSource = normalizeTemplatePackageBundleTemplate(
  linearGradientSourcePackage,
);
const normalizedLinearGradientPackage = normalizedLinearGradientSource.normalizedTemplateJson as any;
const normalizedLinearGradient = normalizedLinearGradientPackage.nodes[linearGradientSourcePackage.rootNodeId].appearance.fills[0];
assert(
  normalizedLinearGradient.gradientStops.length === 3 &&
    normalizedLinearGradient.gradientStops[1].position === 0.4 &&
    normalizedLinearGradient.gradientStops[1].color.a === 0.8 &&
    normalizedLinearGradient.gradientStops[1].boundVariables === undefined &&
    JSON.stringify(normalizedLinearGradient.gradientTransform) === "[[0.5,0,0.25],[0,1,0]]",
  "Linear-gradient normalization must hydrate strict canonical stops and geometry from the same raw source index without importing exporter-only stop metadata.",
);
assert(
  normalizedLinearGradient.linearGradientSource.sourceIndex === 0 &&
    normalizedLinearGradient.linearGradientSource.pairing === "source-index" &&
    normalizedLinearGradient.linearGradientSource.stopsSource === "figma-raw-gradientStops" &&
    normalizedLinearGradient.linearGradientSource.transformSource === "figma-raw-gradientTransform" &&
    normalizedLinearGradient.linearGradientSource.conflicts.length === 0,
  "Canonical gradient source metadata must record exact index pairing and provenance.",
);
assert(
  JSON.stringify(normalizedLinearGradientPackage.nodes[linearGradientSourcePackage.rootNodeId].extensions.figma.rawFills[0]) === JSON.stringify(rawLinearGradient) &&
    normalizedLinearGradientSource.diagnostics.some((item) => item.code === "LINEAR_GRADIENT_CANONICALIZED") &&
    validateTemplatePackage(normalizedLinearGradientPackage).valid,
  "Raw Figma gradient evidence must remain byte-semantically preserved while the hydrated package still passes strict canonical validation.",
);
const conflictingLinearGradientPackage = structuredClone(linearGradientSourcePackage) as any;
conflictingLinearGradientPackage.nodes[conflictingLinearGradientPackage.rootNodeId].appearance.fills[0].gradientStops = [
  { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
  { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
];
const conflictingLinearGradientSource = normalizeTemplatePackageBundleTemplate(conflictingLinearGradientPackage);
const conflictingLinearGradient = (conflictingLinearGradientSource.normalizedTemplateJson as any)
  .nodes[conflictingLinearGradientPackage.rootNodeId].appearance.fills[0];
assert(
  conflictingLinearGradient.linearGradientSource.conflicts.includes("canonical-raw-stop-conflict") &&
    conflictingLinearGradientSource.diagnostics.some((item) => item.code === "LINEAR_GRADIENT_SOURCE_CONFLICT"),
  "Conflicting canonical and raw gradient evidence must remain explicit and block later runtime authority transfer.",
);

const mirroredSolidPackage = structuredClone(simpleFixedPoster) as any;
mirroredSolidPackage.source = {
  ...mirroredSolidPackage.source,
  type: "figma",
  pluginVersion: "0.6.0",
};
const mirroredSolidNode = mirroredSolidPackage.nodes[mirroredSolidPackage.rootNodeId];
mirroredSolidNode.appearance.fills = [{
  type: "SOLID",
  color: { r: 0.2, g: 0.3, b: 0.4, a: 0.6 },
  opacity: 0.6000000238418579,
  visible: true,
  blendMode: "NORMAL",
}];
const normalizedMirroredSolidSource = normalizeTemplatePackageBundleTemplate(mirroredSolidPackage);
const normalizedMirroredSolid = (normalizedMirroredSolidSource.normalizedTemplateJson as any)
  .nodes[mirroredSolidPackage.rootNodeId].appearance.fills[0];
assert(
  normalizedMirroredSolid.color.a === 1 &&
    normalizedMirroredSolid.opacity === 0.6000000238418579 &&
    normalizedMirroredSolid.solidPaintSource.opacityDisposition === "mirrored-compatibility-alias" &&
    normalizedMirroredSolid.solidPaintSource.serializedColorAlpha === 0.6 &&
    normalizedMirroredSolid.solidPaintSource.serializedPaintOpacity === 0.6000000238418579 &&
    normalizedMirroredSolid.solidPaintSource.effectiveOpacity === 0.6000000238418579 &&
    normalizedMirroredSolid.solidPaintSource.effectiveOpacityRule === "paint-opacity-once" &&
    normalizedMirroredSolid.solidPaintSource.effectiveOpacity !== 0.6 * 0.6000000238418579 &&
    normalizedMirroredSolidSource.diagnostics.some((item) => item.code === "SOLID_PAINT_OPACITY_ALIAS_NORMALIZED") &&
    validateTemplatePackage(normalizedMirroredSolidSource.normalizedTemplateJson as any).valid,
  "Exporter-0.6.0 mirrored SOLID alpha/opacity must normalize to one effective paint opacity while preserving both serialized values.",
);
const resolvedMirroredSolid = createResolvedRenderTree(
  normalizedMirroredSolidSource.normalizedTemplateJson as any,
).nodes[mirroredSolidPackage.rootNodeId].appearance.fills[0];
assert(
  resolvedMirroredSolid?.kind === "solid" &&
    resolvedMirroredSolid.source.type === "SOLID" &&
    resolvedMirroredSolid.source.solidPaintSource?.opacityDisposition ===
      "mirrored-compatibility-alias" &&
    resolvedMirroredSolid.source.solidPaintSource.serializedColorAlpha === 0.6 &&
    resolvedMirroredSolid.source.solidPaintSource.effectiveOpacity ===
      0.6000000238418579,
  "Resolved SOLID evidence must retain the canonical source-opacity provenance without recomputing or discarding the serialized alias.",
);
const normalizedMirroredSolidAgain = normalizeTemplatePackageBundleTemplate(
  normalizedMirroredSolidSource.normalizedTemplateJson,
).normalizedTemplateJson as any;
assert(
  JSON.stringify(normalizedMirroredSolidAgain) ===
    JSON.stringify(normalizedMirroredSolidSource.normalizedTemplateJson),
  "SOLID opacity alias normalization must be idempotent.",
);

const unaffectedExporterPackage = structuredClone(mirroredSolidPackage) as any;
unaffectedExporterPackage.source.pluginVersion = "0.5.0";
const unaffectedExporterSolid = (normalizeTemplatePackageBundleTemplate(unaffectedExporterPackage)
  .normalizedTemplateJson as any).nodes[unaffectedExporterPackage.rootNodeId]
  .appearance.fills[0];
assert(
  unaffectedExporterSolid.color.a === 0.6 &&
    unaffectedExporterSolid.opacity === 0.6000000238418579 &&
    unaffectedExporterSolid.solidPaintSource === undefined,
  "The mirrored-alias predicate must not apply to an exporter contract that is not identified as affected.",
);

const opaqueSolidPackage = structuredClone(mirroredSolidPackage) as any;
opaqueSolidPackage.nodes[opaqueSolidPackage.rootNodeId].appearance.fills[0].color.a = 1;
opaqueSolidPackage.nodes[opaqueSolidPackage.rootNodeId].appearance.fills[0].opacity = 1;
const normalizedOpaqueSolid = (normalizeTemplatePackageBundleTemplate(opaqueSolidPackage)
  .normalizedTemplateJson as any).nodes[opaqueSolidPackage.rootNodeId].appearance.fills[0];
assert(
  normalizedOpaqueSolid.color.a === 1 && normalizedOpaqueSolid.opacity === 1 &&
    normalizedOpaqueSolid.solidPaintSource.effectiveOpacity === 1,
  "Opaque exporter-0.6.0 SOLID paints must remain opaque under alias normalization.",
);

const differingSolidPackage = structuredClone(mirroredSolidPackage) as any;
differingSolidPackage.nodes[differingSolidPackage.rootNodeId].appearance.fills[0].color.a = 0.4;
differingSolidPackage.nodes[differingSolidPackage.rootNodeId].appearance.fills[0].opacity = 0.7;
const differingSolidSource = normalizeTemplatePackageBundleTemplate(differingSolidPackage);
const normalizedDifferingSolid = (differingSolidSource.normalizedTemplateJson as any)
  .nodes[differingSolidPackage.rootNodeId].appearance.fills[0];
assert(
  normalizedDifferingSolid.color.a === 0.4 &&
    normalizedDifferingSolid.opacity === 0.7 &&
    normalizedDifferingSolid.solidPaintSource.opacityDisposition === "ambiguous-independent-values" &&
    normalizedDifferingSolid.solidPaintSource.effectiveOpacity === null &&
    normalizedDifferingSolid.solidPaintSource.conflicts.includes("serialized-alpha-opacity-differ") &&
    differingSolidSource.diagnostics.some((item) => item.code === "SOLID_PAINT_OPACITY_AMBIGUOUS") &&
    validateTemplatePackage(differingSolidSource.normalizedTemplateJson as any).valid,
  "Differing serialized SOLID alpha/opacity must remain distinct and explicitly ambiguous.",
);

const rawSolidPackage = structuredClone(mirroredSolidPackage) as any;
const rawSolidNode = rawSolidPackage.nodes[rawSolidPackage.rootNodeId];
const rawSolidPaint = {
  type: "SOLID",
  color: { r: 0.2, g: 0.3, b: 0.4 },
  opacity: 0.45,
  visible: true,
  blendMode: "NORMAL",
};
rawSolidNode.extensions = {
  ...(rawSolidNode.extensions ?? {}),
  figma: {
    ...(rawSolidNode.extensions?.figma ?? {}),
    rawFills: [structuredClone(rawSolidPaint)],
  },
};
const rawSolidSource = normalizeTemplatePackageBundleTemplate(rawSolidPackage);
const normalizedRawSolidPackage = rawSolidSource.normalizedTemplateJson as any;
const normalizedRawSolid = normalizedRawSolidPackage.nodes[rawSolidPackage.rootNodeId]
  .appearance.fills[0];
assert(
  normalizedRawSolid.color.a === 1 && normalizedRawSolid.opacity === 0.45 &&
    normalizedRawSolid.solidPaintSource.opacityDisposition === "raw-paint-opacity" &&
    normalizedRawSolid.solidPaintSource.rawFigmaPath.endsWith("rawFills.0") &&
    JSON.stringify(normalizedRawSolidPackage.nodes[rawSolidPackage.rootNodeId]
      .extensions.figma.rawFills[0]) === JSON.stringify(rawSolidPaint) &&
    validateTemplatePackage(normalizedRawSolidPackage).valid,
  "Raw Figma SolidPaint opacity must remain preserved and authoritative without inventing color alpha.",
);
const videoWithoutFallback = structuredClone(videoSourcePackage) as any;
const videoOnlyNode = videoWithoutFallback.nodes[videoWithoutFallback.rootNodeId];
videoOnlyNode.appearance.fills = [
  { type: "VIDEO", visible: true, opacity: 1, blendMode: "NORMAL" },
];
delete videoOnlyNode.image;
const sourceContractWithoutFallback = validateTemplatePackageBundleSource(
  videoWithoutFallback,
);
const normalizedWithoutFallback = normalizeTemplatePackageBundleTemplate(
  videoWithoutFallback,
);
const normalizedVideoOnlyPackage = normalizedWithoutFallback.normalizedTemplateJson as any;
assert(
  sourceContractWithoutFallback.readable &&
    sourceContractWithoutFallback.diagnostics.filter(
      (item) => item.code === "SOURCE_VIDEO_PAINT_WITHOUT_FALLBACK",
    ).length === 1 &&
    normalizedWithoutFallback.diagnostics.filter(
      (item) => item.code === "VIDEO_PAINT_REMOVED_WITHOUT_FALLBACK",
    ).length === 1 &&
    normalizedVideoOnlyPackage.nodes[normalizedVideoOnlyPackage.rootNodeId]
      .appearance.fills.length === 0 &&
    normalizedVideoOnlyPackage.nodes[normalizedVideoOnlyPackage.rootNodeId]
      .extensions.figma.unsupportedPaints.length === 1,
  "VIDEO without a static fallback should preserve one raw paint and produce one actionable normalization warning instead of schema-branch blockers.",
);

function createStoredZip(
  entries: Array<{
    path: string;
    data?: string | Uint8Array;
    compressionMethod?: number;
  }>,
): Uint8Array {
  const bytes: number[] = [];
  const centralDirectory: number[] = [];

  for (const entry of entries) {
    const pathBytes = encode(entry.path);
    const dataBytes =
      typeof entry.data === "string"
        ? encode(entry.data)
        : entry.data ?? new Uint8Array();
    const compressionMethod = entry.compressionMethod ?? 0;
    const compressedBytes =
      compressionMethod === 8 ? deflateSync(dataBytes) : dataBytes;
    const localHeaderOffset = bytes.length;
    const isDirectory = entry.path.endsWith("/");

    writeUint32(bytes, 0x04034b50);
    writeUint16(bytes, 20);
    writeUint16(bytes, 0);
    writeUint16(bytes, compressionMethod);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint32(bytes, 0);
    writeUint32(bytes, compressedBytes.length);
    writeUint32(bytes, dataBytes.length);
    writeUint16(bytes, pathBytes.length);
    writeUint16(bytes, 0);
    append(bytes, pathBytes);
    append(bytes, compressedBytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, compressionMethod);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, compressedBytes.length);
    writeUint32(centralDirectory, dataBytes.length);
    writeUint16(centralDirectory, pathBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, isDirectory ? 0x10 : 0);
    writeUint32(centralDirectory, localHeaderOffset);
    append(centralDirectory, pathBytes);
  }

  const centralDirectoryOffset = bytes.length;
  bytes.push(...centralDirectory);
  writeUint32(bytes, 0x06054b50);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, entries.length);
  writeUint16(bytes, entries.length);
  writeUint32(bytes, centralDirectory.length);
  writeUint32(bytes, centralDirectoryOffset);
  writeUint16(bytes, 0);

  return new Uint8Array(bytes);
}

const validZip = createStoredZip([
  { path: "template.json", data: "{\"name\":\"stored-template\"}" },
  { path: "assets.json", data: "{\"assets\":[]}" },
  { path: "motion.json", data: "{}" },
  { path: "mcp.json", data: "{}" },
  { path: "preview.png", data: pngHeader(1080, 1920) },
  { path: "assets/hero.png", data: new Uint8Array([1, 2, 3]) },
  { path: "assets/logo.svg", data: "<svg />" },
]);

const loaded = loadTemplatePackageZipBundle(validZip, {
  sourceName: "fixture.zip",
});
assert(loaded.valid, "A ZIP with required files and external assets should load.");
assertEqual(loaded.sourceType, "package-zip", "ZIP bundles should use the package-zip source type.");
assertEqual(loaded.sourceName, "fixture.zip", "Bundle source names should be preserved.");
assertEqual(loaded.index.required["template.json"]?.role, "template", "template.json should be indexed as the template file.");
assertEqual(loaded.index.required["assets.json"]?.role, "asset-manifest", "assets.json should be indexed as the asset manifest.");
assertEqual(loaded.index.optional["motion.json"]?.role, "motion", "motion.json should be indexed as optional motion.");
assertEqual(loaded.index.optional["mcp.json"]?.role, "mcp", "mcp.json should be indexed as optional MCP metadata.");
assertEqual(loaded.index.optional["preview.png"]?.role, "preview", "preview.png should be indexed as optional preview.");
assertEqual(loaded.index.assets.length, 2, "Files below assets/ should be indexed as external asset files.");

const reader = createZipBundleReader(validZip, { sourceName: "fixture.zip" });
assert(reader.bundle.valid, "The content reader should expose the same metadata-only bundle validation.");
const templateText = reader.readText("template.json");
assertEqual(
  templateText.value,
  "{\"name\":\"stored-template\"}",
  "Stored template.json should be readable as UTF-8 text.",
);
const assetsText = reader.readText("assets.json");
assertEqual(
  assetsText.value,
  "{\"assets\":[]}",
  "Stored assets.json should be readable as UTF-8 text.",
);
const pngBytes = reader.readArrayBuffer("assets/hero.png");
assert(
  pngBytes.ok &&
    pngBytes.value &&
    new Uint8Array(pngBytes.value)[2] === 3,
  "Stored binary assets should be readable as ArrayBuffer without base64 conversion.",
);
const svgBlob = reader.readBlob("assets/logo.svg", "image/svg+xml");
assert(
  svgBlob.ok &&
    svgBlob.value?.size === 7 &&
    svgBlob.value.type === "image/svg+xml",
  "Stored SVG assets should be readable as typed Blob values.",
);
assert(
  !JSON.stringify(reader.bundle).includes("stored-template"),
  "The public normalized bundle object must not include raw ZIP file contents.",
);

const deflatedZip = createStoredZip([
  {
    path: "template.json",
    data: "{\"deflated\":true}",
    compressionMethod: 8,
  },
  { path: "assets.json", data: "{}", compressionMethod: 8 },
]);
const deflatedReader = createZipBundleReader(deflatedZip);
assertEqual(
  deflatedReader.readText("template.json").value,
  "{\"deflated\":true}",
  "Deflated template.json should be decompressed with browser-safe Deflate support.",
);

const missingRequired = loadTemplatePackageZipBundle(
  createStoredZip([{ path: "template.json", data: "{}" }]),
);
assert(
  !missingRequired.valid &&
    missingRequired.diagnostics.some(
      (item) =>
        item.code === "bundle.required-file-missing" &&
        item.path === "assets.json",
    ),
  "Missing required bundle files should invalidate the bundle.",
);

const unsafePath = loadTemplatePackageZipBundle(
  createStoredZip([
    { path: "template.json", data: "{}" },
    { path: "assets.json", data: "{}" },
    { path: "../escape.png", data: "" },
  ]),
);
assert(
  !unsafePath.valid &&
    unsafePath.diagnostics.some((item) => item.code === "bundle.path-unsafe"),
  "Unsafe ZIP paths should be rejected before later package parsing.",
);

const duplicatePath = loadTemplatePackageZipBundle(
  createStoredZip([
    { path: "template.json", data: "{}" },
    { path: "template.json", data: "{}" },
    { path: "assets.json", data: "{}" },
  ]),
);
assert(
  !duplicatePath.valid &&
    duplicatePath.diagnostics.some((item) => item.code === "bundle.duplicate-file"),
  "Duplicate normalized ZIP paths should invalidate the bundle.",
);

const unknownRootFile = loadTemplatePackageZipBundle(
  createStoredZip([
    { path: "template.json", data: "{}" },
    { path: "assets.json", data: "{}" },
    { path: "notes.txt", data: "hello" },
  ]),
);
assert(
  unknownRootFile.valid &&
    unknownRootFile.diagnostics.some((item) => item.code === "bundle.unknown-file"),
  "Unknown root files should be surfaced as non-blocking diagnostics.",
);

const unsupportedCompressionReader = createZipBundleReader(
  createStoredZip([
    { path: "template.json", data: "{}", compressionMethod: 99 },
    { path: "assets.json", data: "{}" },
  ]),
);
const unsupportedCompression = unsupportedCompressionReader.readArrayBuffer("template.json");
assert(
  !unsupportedCompression.ok &&
    unsupportedCompression.diagnostics.some(
      (item) => item.code === "zip.compression-read-unsupported",
    ),
  "Unsupported compression methods should be indexed but blocked when content is read.",
);

const partiallyUnsupportedReader = createZipBundleReader(
  createStoredZip([
    { path: "template.json", data: "{\"ok\":true}" },
    { path: "assets.json", data: "{}" },
    { path: "assets/unsupported-compression.bin", data: "unsupported", compressionMethod: 99 },
  ]),
);
assertEqual(
  partiallyUnsupportedReader.readText("template.json").value,
  "{\"ok\":true}",
  "Unsupported compression on one entry should not block unrelated safe entries.",
);

const missingRead = reader.readText("missing.json");
assert(
  !missingRead.ok &&
    missingRead.diagnostics.some((item) => item.code === "zip.entry-missing"),
  "Missing entry reads should fail with a clear diagnostic.",
);

const unsafeRead = reader.readText("../template.json");
assert(
  !unsafeRead.ok &&
    unsafeRead.diagnostics.some(
      (item) => item.code === "zip.entry-read-blocked",
    ),
  "Unsafe entry reads should be blocked before lookup.",
);

const archiveTooLarge = createZipBundleReader(validZip, {
  maxArchiveBytes: 1,
}).readText("template.json");
assert(
  !archiveTooLarge.ok &&
    archiveTooLarge.diagnostics.some(
      (item) => item.code === "zip.archive-size-exceeded",
    ),
  "Archive size limits should be checked before reading entry content.",
);

const compressedTooLarge = createZipBundleReader(validZip, {
  maxEntryCompressedBytes: 1,
}).readText("template.json");
assert(
  !compressedTooLarge.ok &&
    compressedTooLarge.diagnostics.some(
      (item) => item.code === "zip.compressed-size-exceeded",
    ),
  "Compressed entry size limits should be checked before reading entry content.",
);

const decompressedTooLarge = createZipBundleReader(validZip, {
  maxEntryUncompressedBytes: 1,
}).readText("template.json");
assert(
  !decompressedTooLarge.ok &&
    decompressedTooLarge.diagnostics.some(
      (item) => item.code === "zip.decompressed-size-exceeded",
    ),
  "Uncompressed entry size limits should be checked before reading entry content.",
);

const invalidZip = readZipCentralDirectory(encode("not a zip"));
assert(
  invalidZip.diagnostics.some((item) => item.code === "zip.eocd-missing"),
  "Invalid ZIP data should report a missing central directory.",
);

const manualIndex = indexTemplatePackageBundleFiles([
  {
    path: "assets/hero.png",
    compressedSize: 10,
    uncompressedSize: 10,
    compressionMethod: 99,
    generalPurposeBitFlag: 0,
    localHeaderOffset: 0,
    directory: false,
  } satisfies ZipCentralDirectoryEntry,
]);
assert(
  manualIndex.index.assets.length === 1 &&
    manualIndex.diagnostics.some(
      (item) => item.code === "bundle.required-file-missing",
    ),
  "Manual file indexing should classify asset files and still report missing required files.",
);

const manifestZip = createStoredZip([
  { path: "template.json", data: "{}" },
  {
    path: "assets.json",
    data: json({
      version: 1,
      assets: [
        {
          id: "asset_product_image_001",
          name: "field-image-product",
          type: "image",
          path: "assets/hero.png",
          mimeType: "image/png",
          byteSize: 3,
          sourceNodeId: "node:image",
          aliases: [
            "asset:image:abc123",
            "asset://asset_product_image_001",
            "abc123",
          ],
          file: { width: 10, height: 20 },
          usage: { nodeId: "node:image", width: 5, height: 6, scaleMode: "FILL" },
        },
        {
          id: "asset_logo_002",
          name: "logo",
          type: "vector",
          path: "assets/logo.svg",
          mimeType: "image/svg+xml",
          byteSize: 7,
          sourceNodeId: "node:logo",
          aliases: ["asset:svg:def456", "def456"],
        },
      ],
    }),
  },
  { path: "assets/hero.png", data: new Uint8Array([1, 2, 3]) },
  { path: "assets/logo.svg", data: "<svg />" },
]);
const assetRegistry = loadBundleAssetRegistry(createZipBundleReader(manifestZip));
assertEqual(
  assetRegistry.registry.entries.length,
  2,
  "assets.json should parse into import-time registry entries.",
);
assertEqual(
  assetRegistry.registry.resolve("asset_product_image_001").asset?.id,
  "asset_product_image_001",
  "Canonical asset IDs should resolve.",
);
assertEqual(
  assetRegistry.registry.resolve("asset:image:abc123").asset?.id,
  "asset_product_image_001",
  "Typed image refs should resolve through aliases.",
);
assertEqual(
  assetRegistry.registry.resolve("asset://asset_product_image_001").asset?.id,
  "asset_product_image_001",
  "asset:// references should resolve through alias or stripped ID lookup.",
);
assertEqual(
  assetRegistry.registry.resolve("assets/hero.png").asset?.id,
  "asset_product_image_001",
  "Normalized ZIP paths should resolve.",
);
assertEqual(
  assetRegistry.registry.resolve("abc123").asset?.id,
  "asset_product_image_001",
  "Bare hash aliases should resolve.",
);
assertEqual(
  assetRegistry.registry.resolve("asset:svg:def456").asset?.id,
  "asset_logo_002",
  "Typed SVG refs should resolve through aliases.",
);
assertEqual(
  assetRegistry.registry.resolve("asset:image:abc123", {
    "asset:image:abc123": {
      src: "asset://asset_product_image_001",
      path: "assets/hero.png",
      nodeId: "node:image",
    },
  }).asset?.id,
  "asset_product_image_001",
  "Template bridge refs should remain compatible with manifest resolution.",
);
assert(
  assetRegistry.diagnostics.length === 0,
  "A consistent manifest should not produce asset diagnostics.",
);

const bridgeOnlyZip = createStoredZip([
  { path: "template.json", data: "{}" },
  {
    path: "assets.json",
    data: json({
      version: 1,
      assets: [
        {
          id: "asset_product_image_001",
          type: "image",
          path: "assets/hero.png",
          mimeType: "image/png",
          byteSize: 3,
        },
      ],
    }),
  },
  { path: "assets/hero.png", data: new Uint8Array([1, 2, 3]) },
]);
const bridgeOnlyRegistry = loadBundleAssetRegistry(
  createZipBundleReader(bridgeOnlyZip),
);
assertEqual(
  bridgeOnlyRegistry.registry.resolve("asset:image:abc123", {
    "asset:image:abc123": {
      src: "asset://asset_product_image_001",
    },
  }).matchedBy,
  "bridge-src",
  "Template assets[ref].src bridge references should resolve when the manifest has no typed alias.",
);

const missingFileRegistry = loadBundleAssetRegistry(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: "{}" },
      {
        path: "assets.json",
        data: json({
          assets: [
            {
              id: "missing_asset",
              type: "image",
              path: "assets/missing.png",
              mimeType: "image/png",
            },
          ],
        }),
      },
    ]),
  ),
);
assert(
  missingFileRegistry.diagnostics.some(
    (item) => item.code === "ASSET_FILE_MISSING",
  ),
  "Missing external asset files should produce diagnostics without crashing.",
);

const mismatchRegistry = loadBundleAssetRegistry(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: "{}" },
      {
        path: "assets.json",
        data: json({
          assets: [
            {
              id: "mismatch_asset",
              type: "image",
              path: "assets/mismatch.png",
              mimeType: "image/jpeg",
              byteSize: 99,
            },
          ],
        }),
      },
      { path: "assets/mismatch.png", data: new Uint8Array([1, 2, 3]) },
    ]),
  ),
);
assert(
  mismatchRegistry.diagnostics.some(
    (item) =>
      item.code === "ASSET_BYTESIZE_MISMATCH" &&
      item.severity === "info" &&
      item.details?.differenceBytes === -96,
  ) &&
    mismatchRegistry.diagnostics.some(
      (item) => item.code === "ASSET_MIME_MISMATCH",
    ),
  "Readable byte-size mismatches should be repaired metadata while MIME mismatches remain warnings.",
);

const collisionRegistry = loadBundleAssetRegistry(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: "{}" },
      {
        path: "assets.json",
        data: json({
          assets: [
            {
              id: "asset_a",
              type: "image",
              path: "assets/a.png",
              mimeType: "image/png",
              aliases: ["shared"],
            },
            {
              id: "asset_b",
              type: "image",
              path: "assets/b.png",
              mimeType: "image/png",
              aliases: ["shared"],
            },
          ],
        }),
      },
      { path: "assets/a.png", data: new Uint8Array([1]) },
      { path: "assets/b.png", data: new Uint8Array([2]) },
    ]),
  ),
);
assert(
  collisionRegistry.diagnostics.some(
    (item) => item.code === "ASSET_ALIAS_COLLISION",
  ),
  "Alias collisions should produce registry diagnostics.",
);

const pathCollisionRegistry = loadBundleAssetRegistry(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: "{}" },
      {
        path: "assets.json",
        data: json({
          assets: [
            {
              id: "asset_a",
              type: "image",
              path: "assets/shared.png",
              mimeType: "image/png",
            },
            {
              id: "asset_b",
              type: "image",
              path: "assets/shared.png",
              mimeType: "image/png",
            },
          ],
        }),
      },
      { path: "assets/shared.png", data: new Uint8Array([1]) },
    ]),
  ),
);
assert(
  pathCollisionRegistry.diagnostics.some(
    (item) => item.code === "ASSET_PATH_COLLISION",
  ),
  "Path collisions should produce registry diagnostics.",
);

const unresolved = assetRegistry.registry.resolve("asset:image:not-found");
assert(
  !unresolved.asset &&
    unresolved.diagnostics.some((item) => item.code === "ASSET_REF_UNRESOLVED"),
  "Unresolved references should return null with an actionable diagnostic.",
);

function packageZipFixture(
  templateOverrides: Record<string, unknown> = {},
  extraEntries: Array<{ path: string; data?: string | Uint8Array; compressionMethod?: number }> = [],
  motionData: Record<string, unknown> = {
    version: 1,
    playbackStyle: "loop",
    nodes: [
      {
        node: "root",
        timelineDurationMs: 4000,
        fields: [
          {
            field: "motionTranslationX@-1:-1",
            keyframes: [
              { timeMs: 0, value: 0 },
              { timeMs: 4000, value: 120 },
            ],
          },
        ],
      },
    ],
  },
): Uint8Array {
  const templateDocument: Record<string, unknown> = {
    ...(structuredClone(simpleFixedPoster) as Record<string, unknown>),
    source: {
      type: "figma",
      rootNodeId: "root",
      exportedAt: "2026-07-09T00:00:00.000Z",
      pluginVersion: "0.6.0",
      packageContract: "template-package-v1",
      exportMode: "zip-external-assets",
      hasMotion: true,
      motionFile: "motion.json",
    },
    assets: {
      "asset:image:abc123": {
        id: "asset:image:abc123",
        type: "image",
        source: "external",
        deferred: false,
        mimeType: "image/png",
        hash: "abc123",
        width: 1,
        height: 1,
        byteSize: 3,
        aliases: ["asset://asset_product_image_001", "abc123"],
        src: "asset://asset_product_image_001",
        path: "assets/asset_product_image_001.png",
      },
    },
    renderHints: {
      preferredMode: "bounds-first",
      assetBehavior: "render-from-assets-manifest",
    },
    tokens: {
      colors: {
        blue: { value: "#94d0ff" },
      },
    },
    motion: {
      format: "figma-motion-v1",
      file: "motion.json",
      linking: {
        status: "matched",
        matchedNodeIds: [],
        missingNodeIds: [],
        extraPackageNodeIds: [],
      },
    },
    ...templateOverrides,
  };
  const nodes = templateDocument.nodes as Record<string, Record<string, unknown>>;
  nodes.root = {
    ...nodes.root,
    children: [...((nodes.root.children as string[]) ?? []), "hero-image", "logo-vector"],
  };
  nodes["hero-image"] = {
    id: "hero-image",
    name: "field:image:productImage",
    type: "IMAGE",
    parentId: "root",
    children: [],
    bounds: {
      absolute: { x: 10, y: 10, width: 100, height: 80 },
      relative: { x: 10, y: 10, width: 100, height: 80 },
    },
    positioning: { mode: "ABSOLUTE" },
    layout: {
      mode: "NONE",
      wrap: false,
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAlignment: "MIN",
      counterAlignment: "MIN",
      clipContent: true,
    },
    sizing: {
      horizontal: { mode: "FIXED", value: 100 },
      vertical: { mode: "FIXED", value: 80 },
    },
    appearance: {
      opacity: 1,
      fills: [],
      strokes: [],
      effects: [],
      borderRadius: null,
    },
    image: {
      assetId: "asset:image:abc123",
      deferred: false,
      scaleMode: "FILL",
    },
  };
  nodes["logo-vector"] = {
    id: "logo-vector",
    name: "logo",
    type: "VECTOR",
    parentId: "root",
    children: [],
    bounds: {
      absolute: { x: 10, y: 100, width: 20, height: 20 },
      relative: { x: 10, y: 100, width: 20, height: 20 },
    },
    positioning: { mode: "ABSOLUTE" },
    layout: {
      mode: "NONE",
      wrap: false,
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAlignment: "MIN",
      counterAlignment: "MIN",
      clipContent: true,
    },
    sizing: {
      horizontal: { mode: "FIXED", value: 20 },
      vertical: { mode: "FIXED", value: 20 },
    },
    appearance: {
      opacity: 1,
      fills: [],
      strokes: [],
      effects: [],
      borderRadius: null,
    },
    vector: {
      assetId: "asset:svg:def456",
      renderMode: "SVG_ASSET",
    },
  };
  templateDocument.editableFields = [
    ...((templateDocument.editableFields as unknown[]) ?? []),
    {
      id: "productImage",
      type: "image",
      nodeId: "hero-image",
      property: "image.assetId",
      label: "Product Image",
      defaultValue: "asset:image:abc123",
    },
  ];
  (templateDocument.assets as Record<string, unknown>)["asset:svg:def456"] = {
    id: "asset:svg:def456",
    type: "svg",
    source: "external",
    deferred: false,
    mimeType: "image/svg+xml",
    hash: "def456",
    width: 20,
    height: 20,
    byteSize: 7,
    aliases: ["asset://asset_logo_002", "def456"],
    src: "asset://asset_logo_002",
    path: "assets/asset_logo_002.svg",
  };

  return createStoredZip([
    { path: "template.json", data: json(templateDocument) },
    {
      path: "assets.json",
      data: json({
        version: 1,
        assets: [
          {
            id: "asset_product_image_001",
            type: "image",
            path: "assets/asset_product_image_001.png",
            mimeType: "image/png",
            byteSize: 3,
            hash: "abc123",
            aliases: [
              "asset:image:abc123",
              "asset://asset_product_image_001",
              "abc123",
            ],
          },
          {
            id: "asset_logo_002",
            type: "vector",
            path: "assets/asset_logo_002.svg",
            mimeType: "image/svg+xml",
            byteSize: 7,
            hash: "def456",
            aliases: ["asset:svg:def456", "asset://asset_logo_002", "def456"],
          },
        ],
      }),
    },
    {
      path: "motion.json",
      data: json(motionData),
    },
    {
      path: "mcp.json",
      data: json({
        provider: "figma-mcp",
        fileKey: "abc",
        nodeId: "root",
      }),
    },
    { path: "preview.png", data: pngHeader(1080, 1920) },
    { path: "assets/asset_product_image_001.png", data: new Uint8Array([1, 2, 3]) },
    { path: "assets/asset_logo_002.svg", data: "<svg />" },
    ...extraEntries,
  ]);
}

const loadedSource = loadTemplatePackageBundleSource(
  createZipBundleReader(packageZipFixture(), { sourceName: "package.zip" }),
);
assert(
  loadedSource.valid &&
    loadedSource.sourceKind === "package-zip" &&
    loadedSource.packageValue?.name === "Simple Fixed Poster",
  "A valid package ZIP should load into one normalized source result.",
);
assertEqual(
  loadedSource.sourceName,
  "package.zip",
  "Loaded package sources should preserve the upload/source name.",
);
assert(
  loadedSource.assetRegistry.entries.length === 2 &&
    loadedSource.assetManifest?.assets !== undefined,
  "assets.json should be parsed and attached through the import-time AssetRegistry.",
);
assert(
  loadedSource.motionData !== undefined &&
    loadedSource.mcp !== undefined &&
    loadedSource.preview?.normalizedPath === "preview.png",
  "Optional motion.json, mcp.json, and preview.png metadata should be attached when valid.",
);
const loadedPreview = loadedSource.preview;
if (!loadedPreview) {
  throw new Error("ZIP preview should be attached to the loaded source.");
}
assert(
  loadedPreview.width === 1080 &&
    loadedPreview.height === 1920 &&
    loadedPreview.dimensionsAvailable,
  "preview.png dimensions should be read from the ZIP PNG header without retaining image bytes.",
);
const previewQaReady = comparePreviewReferenceDimensions(loadedPreview, {
  width: loadedSource.packageValue?.canvas.width ?? 0,
  height: loadedSource.packageValue?.canvas.height ?? 0,
});
assert(
  previewQaReady.status === "ready" &&
    previewQaReady.code === "PREVIEW_DIMENSIONS_MATCH",
  "Preview QA hook should report ready when preview dimensions match the render target.",
);
const previewQaMismatch = comparePreviewReferenceDimensions(loadedPreview, {
  width: 1,
  height: 1,
});
assert(
  previewQaMismatch.status === "warning" &&
    previewQaMismatch.diagnostics.some(
      (item) => item.code === "PREVIEW_DIMENSION_MISMATCH",
    ),
  "Preview QA hook should warn when reference and render target dimensions differ.",
);
const loadedMotion = loadedSource.packageValue?.motion;
if (!loadedMotion) {
  throw new Error("ZIP motion should be attached to the loaded package.");
}
assert(
  JSON.stringify(loadedMotion.raw) ===
    JSON.stringify(loadedSource.motionData) &&
    loadedMotion.linking.matchedNodeIds.includes("root") &&
    loadedMotion.sourceName === "motion.json",
  "ZIP motion.json should hydrate the existing package motion shape and link by node ID.",
);
assert(
  loadedSource.originalPackageValue?.motion?.linking.matchedNodeIds.includes("root") &&
    (loadedSource.rawTemplateJson as { motion?: { raw?: unknown } }).motion?.raw === undefined,
  "ZIP motion hydration should update cloned package values without mutating raw template JSON.",
);
assert(
  loadedSource.compatibility.renderHints !== undefined &&
    loadedSource.compatibility.tokens !== undefined &&
    loadedSource.compatibility.sourceExtras?.exportMode === "zip-external-assets",
  "ZIP-only renderHints, tokens, and source extras should be preserved on the loaded source result.",
);
assert(
  loadedSource.diagnostics.some(
    (item) => item.code === "RENDER_HINTS_COMPAT_NORMALIZED",
  ) &&
    loadedSource.diagnostics.some((item) => item.code === "TOKENS_ATTACHED") &&
    loadedSource.diagnostics.some(
      (item) => item.code === "EXTERNAL_ASSET_COMPAT_NORMALIZED",
    ),
  "ZIP-specific compatibility normalizations should be diagnosed without blocking.",
);
assert(
  loadedSource.assetResolutions.some(
    (resolution) =>
      resolution.ref === "asset:image:abc123" &&
      resolution.asset?.id === "asset_product_image_001",
  ),
  "Image node refs and editable image field refs should resolve through the bundle AssetRegistry without mutating template assets.",
);

const richDescriptorZip = packageZipFixture({
  editableFields: [
    {
      id: "product",
      type: "image",
      nodeId: "hero-image",
      property: "image.assetId",
      label: "Product",
      defaultValue: "asset_product_image_001",
      constraints: { aspectRatio: 0.714, scaleMode: "FILL" },
      assetRef: "asset_product_image_001",
      typedRef: "asset:image:abc123",
      refType: "asset",
    },
  ],
  diagnostics: [
    {
      severity: "warning",
      code: "LARGE_ASSET",
      message: "Asset is larger than the recommended threshold.",
      nodeId: "hero-image",
      assetId: "asset:image:abc123",
    },
  ],
});
const richDescriptorReader = createZipBundleReader(richDescriptorZip, {
  sourceName: "rich-descriptor.zip",
});
const rawRichTemplateBefore = richDescriptorReader.readText("template.json").value;
const richDescriptorSource = loadTemplatePackageBundleSource(
  richDescriptorReader,
);
const rawRichTemplateAfter = richDescriptorReader.readText("template.json").value;
const richDescriptorReport = createLoadedSourceDiagnosticReport(
  richDescriptorSource,
);
assert(
  richDescriptorSource.validation?.schemaValid === true &&
    richDescriptorSource.valid &&
    richDescriptorReport.canImport &&
    richDescriptorSource.packageValue?.editableFields.some(
      (field) =>
        field.id === "product" &&
        field.assetRef === "asset_product_image_001" &&
        field.typedRef === "asset:image:abc123" &&
        field.constraints &&
        "scaleMode" in field.constraints &&
        field.constraints.scaleMode === "FILL",
    ),
  `Known rich ZIP editable-field metadata should load without schema blockers. ${JSON.stringify(richDescriptorSource.packageDiagnostics)}`,
);
assert(
  richDescriptorSource.validation?.pluginDiagnostics.some(
    (item) =>
      item.code === "LARGE_ASSET" &&
      item.assetId === "asset:image:abc123",
  ),
  "Source/export diagnostics should be preserved as non-blocking plugin diagnostics.",
);
assert(
  rawRichTemplateBefore === rawRichTemplateAfter &&
    (richDescriptorSource.rawTemplateJson as any).assets["asset:image:abc123"]
      .source === "external" &&
    richDescriptorSource.packageValue?.assets["asset:image:abc123"].source ===
      "stored",
  "Bundle compatibility normalization should modify only the validation-ready clone, not raw template.json.",
);

const zipMotionWarningSource = loadTemplatePackageBundleSource(
  createZipBundleReader(
    packageZipFixture(
      {},
      [],
      {
        version: 1,
        playbackStyle: "loop",
        nodes: [
          {
            node: "missing-motion-node",
            timelineDurationMs: 1000,
            fields: [
              {
                field: "motionBlurRadius",
                keyframes: [{ timeMs: 0, value: 1 }],
              },
            ],
          },
        ],
      },
    ),
    { sourceName: "package-with-motion-warnings.zip" },
  ),
);
const zipMotionWarningReport =
  createLoadedSourceDiagnosticReport(zipMotionWarningSource);
assert(
  zipMotionWarningReport.canImport &&
    zipMotionWarningReport.warningDiagnostics.some(
      (item) =>
        item.code === "MOTION_NODE_MISSING" &&
        item.nodeId === "missing-motion-node",
    ) &&
    zipMotionWarningReport.warningDiagnostics.some(
      (item) =>
        item.code === "MOTION_FIELD_UNSUPPORTED" &&
        item.ref === "motionBlurRadius",
    ),
  "ZIP motion mismatches and unsupported channels should warn without blocking import.",
);
assert(
  loadedSource.assetResolutions.some(
    (resolution) =>
      resolution.ref === "asset:svg:def456" &&
      resolution.asset?.id === "asset_logo_002",
  ),
  "Vector node refs should resolve through the bundle AssetRegistry.",
);
assert(
  (loadedSource.rawTemplateJson as { assets: Record<string, { source: string }> })
    .assets["asset:image:abc123"].source === "external" &&
    loadedSource.packageValue?.assets["asset:image:abc123"].source === "stored" &&
    loadedSource.originalPackageValue?.assets["asset:image:abc123"].source === "stored",
  "The original parsed ZIP JSON should remain unchanged while the normalized package clone becomes validation-ready.",
);
assert(
  !JSON.stringify(loadedSource.bundle).includes("Simple Fixed Poster"),
  "The metadata-only bundle must not expose raw template.json contents.",
);
assert(
  loadedSource.packageFileIndex?.required["template.json"] !== undefined &&
    loadedSource.sourceFiles.template.exists &&
    loadedSource.sourceFiles.assetManifest?.normalizedPath === "assets.json" &&
    loadedSource.sourceFiles.motion?.normalizedPath === "motion.json" &&
    loadedSource.sourceFiles.mcp?.normalizedPath === "mcp.json" &&
    loadedSource.sourceFiles.preview?.normalizedPath === "preview.png" &&
    loadedSource.sourceFiles.assets.length === 2,
  "Loaded ZIP sources should expose package file indexes and normalized source file references.",
);
assert(
  loadedSource.rootNode?.id === "root" &&
    loadedSource.nodes["hero-image"] !== undefined &&
    loadedSource.editableFields.some((field) => field.id === "productImage"),
  "Loaded ZIP sources should expose root node, node registry, and editable fields as first-class accessors.",
);
assert(
  Array.isArray(loadedSource.fonts) &&
    loadedSource.tokens !== undefined &&
    loadedSource.renderHints !== undefined,
  "Loaded ZIP sources should expose font requirements, tokens, and render hints for later phases.",
);
const loadedSourceGraph = createResolvedRenderTree(loadedSource.packageValue!);
assert(
  loadedSourceGraph.contract === "resolved-template-graph-v1" &&
    loadedSourceGraph.sourcePackageId === loadedSource.packageValue?.packageId &&
    loadedSourceGraph.nodeOrder.includes("hero-image") &&
    loadedSourceGraph.assetRefs["asset:image:abc123"]?.nodeIds.includes(
      "hero-image",
    ),
  "ZIP loaded sources should resolve into the shared runtime graph contract.",
);

const sourceWithoutOptionalFiles = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(simpleFixedPoster) },
      { path: "assets.json", data: json({ assets: [] }) },
    ]),
  ),
);
assert(
  sourceWithoutOptionalFiles.valid &&
    sourceWithoutOptionalFiles.motionData === undefined &&
    sourceWithoutOptionalFiles.mcp === undefined &&
    sourceWithoutOptionalFiles.preview === undefined,
  "Missing optional motion, MCP, and preview files should not block source loading.",
);

const emptyAssetPackage = structuredClone(simpleFixedPoster) as any;
emptyAssetPackage.assets = {};
emptyAssetPackage.referencePreview = undefined;
const sourceWithoutEmptyAssetManifest = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(emptyAssetPackage) },
    ]),
  ),
);
assert(
  sourceWithoutEmptyAssetManifest.valid &&
    Array.isArray(sourceWithoutEmptyAssetManifest.assetManifest?.assets) &&
    sourceWithoutEmptyAssetManifest.assetManifest.assets.length === 0 &&
    sourceWithoutEmptyAssetManifest.diagnostics.some(
      (item) => item.code === "ASSETS_JSON_OMITTED_EMPTY" && item.severity === "info",
    ) &&
    sourceWithoutEmptyAssetManifest.diagnostics.some(
      (item) => item.code === "bundle.asset-manifest-omitted-empty" && item.severity === "info",
    ),
  "A source package with explicit empty asset authority may omit assets.json through a provenance-bearing normalization.",
);

const referencedAssetWithoutManifestPackage = structuredClone(emptyAssetPackage);
referencedAssetWithoutManifestPackage.assets = {
  "asset:image:required": {
    id: "asset:image:required",
    type: "image",
    path: "assets/required.png",
  },
};
const referencedAssetWithoutManifest = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(referencedAssetWithoutManifestPackage) },
    ]),
  ),
);
assert(
  !referencedAssetWithoutManifest.valid &&
    referencedAssetWithoutManifest.diagnostics.some(
      (item) => item.code === "ASSETS_JSON_MISSING" && item.severity === "error",
    ) &&
    !referencedAssetWithoutManifest.diagnostics.some(
      (item) => item.code === "ASSETS_JSON_OMITTED_EMPTY",
    ),
  "Missing assets.json must remain blocking whenever template.json declares an asset.",
);

const nodeAssetDependencyWithoutManifestPackage = structuredClone(emptyAssetPackage) as any;
nodeAssetDependencyWithoutManifestPackage.nodes.root.image = {
  assetId: "asset:image:node-required",
  deferred: false,
  scaleMode: "FILL",
};
const nodeAssetDependencyWithoutManifest = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(nodeAssetDependencyWithoutManifestPackage) },
    ]),
  ),
);
assert(
  !nodeAssetDependencyWithoutManifest.valid &&
    nodeAssetDependencyWithoutManifest.diagnostics.some(
      (item) => item.code === "ASSETS_JSON_MISSING" && item.severity === "error",
    ) &&
    !nodeAssetDependencyWithoutManifest.diagnostics.some(
      (item) => item.code === "ASSETS_JSON_OMITTED_EMPTY",
    ),
  "The zero-dependency normalization must not apply when a node references an image asset.",
);

const mediaFieldDependencyWithoutManifestPackage = structuredClone(emptyAssetPackage) as any;
mediaFieldDependencyWithoutManifestPackage.editableFields.push({
  id: "asset-free-negative-image-field",
  type: "image",
  nodeId: "root",
  property: "image.assetId",
  defaultValue: null,
  assetRef: "asset:image:field-required",
  typedRef: "asset:image:field-required",
});
const mediaFieldDependencyWithoutManifest = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(mediaFieldDependencyWithoutManifestPackage) },
    ]),
  ),
);
assert(
  !mediaFieldDependencyWithoutManifest.valid &&
    mediaFieldDependencyWithoutManifest.diagnostics.some(
      (item) => item.code === "ASSETS_JSON_MISSING" && item.severity === "error",
    ) &&
    !mediaFieldDependencyWithoutManifest.diagnostics.some(
      (item) => item.code === "ASSETS_JSON_OMITTED_EMPTY",
    ),
  "The zero-dependency normalization must not apply when a media field carries an asset reference.",
);

const mediaFieldDependencyWithEmptyManifest = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(mediaFieldDependencyWithoutManifestPackage) },
      { path: "assets.json", data: json({ version: 1, assets: [] }) },
    ]),
  ),
);
assert(
  !mediaFieldDependencyWithEmptyManifest.valid &&
    mediaFieldDependencyWithEmptyManifest.validation?.diagnostics.some(
      (item) => item.code === "field.missing-default-asset",
    ),
  "An explicit empty asset manifest must not make an unresolved media-field asset dependency valid.",
);
const missingPreviewQa = comparePreviewReferenceDimensions(
  sourceWithoutOptionalFiles.preview,
  { width: 1080, height: 1920 },
);
assert(
  missingPreviewQa.status === "skipped" &&
    missingPreviewQa.diagnostics.some(
      (item) => item.code === "PREVIEW_COMPARISON_SKIPPED",
    ),
  "Missing preview references should skip QA comparison without blocking import.",
);

const malformedPreviewSource = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(simpleFixedPoster) },
      { path: "assets.json", data: json({ assets: [] }) },
      { path: "preview.png", data: new Uint8Array([137, 80, 78, 71]) },
    ]),
  ),
);
assert(
  malformedPreviewSource.valid &&
    malformedPreviewSource.preview?.dimensionsAvailable === false &&
    malformedPreviewSource.diagnostics.some(
      (item) => item.code === "PREVIEW_DIMENSIONS_UNAVAILABLE",
    ),
  "Malformed or truncated preview.png should warn without blocking import.",
);

const invalidOptionalSource = loadTemplatePackageBundleSource(
  createZipBundleReader(
    packageZipFixture(
      {},
      [
        // Later duplicate entries are ignored by ZIP indexing, so use a fresh ZIP below for invalid optional JSON.
      ],
    ),
  ),
);
assert(
  invalidOptionalSource.valid,
  "The baseline loaded source should remain valid before invalid optional JSON cases.",
);

const invalidOptionalZip = createStoredZip([
  { path: "template.json", data: json(simpleFixedPoster) },
  { path: "assets.json", data: json({ assets: [] }) },
  { path: "motion.json", data: "{" },
  { path: "mcp.json", data: "{" },
]);
const invalidOptional = loadTemplatePackageBundleSource(
  createZipBundleReader(invalidOptionalZip),
);
assert(
  invalidOptional.valid &&
    invalidOptional.diagnostics.some((item) => item.code === "MOTION_JSON_PARSE_ERROR") &&
    invalidOptional.diagnostics.some((item) => item.code === "MCP_JSON_PARSE_ERROR"),
  "Invalid optional motion.json and mcp.json should produce warnings without blocking loading.",
);

const invalidRequired = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: "{" },
      { path: "assets.json", data: json({ assets: [] }) },
    ]),
  ),
);
assert(
  !invalidRequired.valid &&
    invalidRequired.diagnostics.some((item) => item.code === "TEMPLATE_JSON_PARSE_ERROR"),
  "Invalid required template.json should block source loading.",
);
const invalidRequiredReport = createLoadedSourceDiagnosticReport(invalidRequired);
assert(
  !invalidRequiredReport.canImport &&
    invalidRequiredReport.blockingDiagnostics.some(
      (item) => item.code === "TEMPLATE_JSON_PARSE_ERROR",
    ) &&
    invalidRequiredReport.layers.some(
      (layer) => layer.id === "json-parsing" && layer.status === "blocked",
    ),
  "Layered diagnostics should block import for invalid required template JSON.",
);

const missingReferencedMotion = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      {
        path: "template.json",
        data: json({
          ...(structuredClone(simpleFixedPoster) as Record<string, unknown>),
          motion: {
            format: "figma-motion-v1",
            file: "motion.json",
            linking: {
              status: "unchecked",
              matchedNodeIds: [],
              missingNodeIds: [],
              extraPackageNodeIds: [],
            },
          },
        }),
      },
      { path: "assets.json", data: json({ assets: [] }) },
    ]),
  ),
);
assert(
  missingReferencedMotion.valid &&
    missingReferencedMotion.diagnostics.some(
      (item) => item.code === "MOTION_FILE_REFERENCED_BUT_MISSING",
    ),
  "A missing motion file referenced by template.json should be diagnosed as a non-blocking source warning.",
);
const missingReferencedMotionReport =
  createLoadedSourceDiagnosticReport(missingReferencedMotion);
assert(
  missingReferencedMotionReport.canImport &&
    missingReferencedMotionReport.warningDiagnostics.some(
      (item) =>
        item.code === "MOTION_FILE_REFERENCED_BUT_MISSING" &&
        item.layer === "motion-links" &&
        item.path === "motion.json",
    ),
  "Missing optional motion files should remain layered warnings, not import blockers.",
);

const storedAssets = new Map<string, { bytes: Uint8Array; mimeType: string }>();
const storedAssetUrls = new Map<string, string>();
const ingestedAssets = await ingestLoadedSourceBundleAssets(loadedSource, {
  async put(hash, bytes, mimeType) {
    storedAssets.set(hash, { bytes, mimeType });
    const stableUrl = URL.createObjectURL(
      new Blob([Uint8Array.from(bytes).buffer], { type: mimeType }),
    );
    storedAssetUrls.set(hash, stableUrl);
    return {
      storageKey: `sha256:${hash}`,
      stableUrl,
    };
  },
});
assert(
  ingestedAssets.packageValue !== null &&
    ingestedAssets.resolvedAssetCount === 2 &&
    ingestedAssets.persistedAssetCount === 2 &&
    ingestedAssets.unresolvedAssetCount === 0,
  "Resolved ZIP assets should be ingested through the shared asset storage adapter.",
);
assert(
  storedAssets.has("abc123") &&
    storedAssets.has("def456") &&
    ingestedAssets.storedAssetHashes.includes("abc123") &&
    ingestedAssets.storedAssetHashes.includes("def456"),
  "ZIP asset hashes should be preserved and used for deduplicated storage keys.",
);
assert(
  ingestedAssets.packageValue?.assets["asset:image:abc123"].source === "stored" &&
    ingestedAssets.packageValue.assets["asset:image:abc123"].storageKey === "sha256:abc123" &&
    ingestedAssets.packageValue.assets["asset:image:abc123"].stableUrl === storedAssetUrls.get("abc123") &&
    ingestedAssets.packageValue.assets["asset:image:abc123"].extensions?.bundleSource !== undefined,
  "Ingested package assets should become stored assets with stable references and ZIP provenance.",
);
if (!ingestedAssets.packageValue) {
  throw new Error("ZIP asset ingestion should return a package value.");
}
const ingestedValidation = validateTemplatePackage(ingestedAssets.packageValue);
const postIngestionReport = createLoadedSourceDiagnosticReport(loadedSource, {
  packageValue: ingestedAssets.packageValue,
  packageDiagnostics: ingestedValidation.diagnostics,
  supplementalDiagnostics: ingestedAssets.diagnostics,
});
const ingestedReliability = analyzeAssetReliability(
  ingestedAssets.packageValue,
);
assert(
  ingestedReliability.missingAssets === 0 &&
    !postIngestionReport.diagnostics.some(
      (item) => item.code === "asset-missing",
    ),
  "Successfully ingested ZIP images and SVGs should not be reported missing by final diagnostics.",
);
const ingestedGraph = createResolvedRenderTree(ingestedAssets.packageValue);
assert(
  ingestedGraph.assetRefs["asset:image:abc123"]?.renderable &&
    ingestedGraph.assetRefs["asset:image:abc123"].source === "stored" &&
    ingestedGraph.assetRefs["asset:svg:def456"]?.renderable &&
    ingestedGraph.assetRefs["asset:svg:def456"].source === "stored" &&
    ingestedGraph.nodes["hero-image"]?.image?.source?.startsWith("blob:") &&
    ingestedGraph.nodes["logo-vector"]?.vector?.source?.startsWith("blob:"),
  "Managed ZIP image and SVG references should reach the resolved graph and renderer source fields.",
);
const ingestedRepository = new InMemoryTemplateRepository();
const ingestedRecord = createSavedTemplateRecord({
  name: "ZIP managed assets",
  packageValue: ingestedAssets.packageValue,
  validation: ingestedValidation,
  source: { type: "package-zip", sourceName: "package.zip" },
});
await ingestedRepository.saveTemplate(ingestedRecord);
const reloadedIngestedRecord = await ingestedRepository.getTemplate(
  ingestedRecord.id,
);
assert(
  reloadedIngestedRecord?.workingPackage.assets[
    "asset:image:abc123"
  ].storageKey === "sha256:abc123" &&
    reloadedIngestedRecord.workingPackage.assets[
      "asset:image:abc123"
    ].stableUrl?.startsWith("blob:") &&
    reloadedIngestedRecord.workingPackage.assets[
      "asset:svg:def456"
    ].stableUrl?.startsWith("blob:") &&
    analyzeAssetReliability(reloadedIngestedRecord.workingPackage)
      .missingAssets === 0,
  "Managed ZIP asset references and blobs should survive saved-template recreation.",
);
assert(
  loadedSource.packageValue?.assets["asset:image:abc123"].stableUrl === undefined,
  "Bundle asset ingestion must not mutate the loaded source package value.",
);

const ingestionWithoutStorage = await ingestLoadedSourceBundleAssets(loadedSource);
assert(
  ingestionWithoutStorage.packageValue?.assets["asset:image:abc123"].stableUrl === undefined &&
    ingestionWithoutStorage.packageValue?.assets["asset:image:abc123"].hash === "abc123",
  "Without a storage adapter, ZIP asset ingestion should add metadata without creating Blob URLs or base64 payloads.",
);

const missingZipAssetSource = loadTemplatePackageBundleSource(
  createZipBundleReader(
    packageZipFixture(
      {},
      [
        // Keep this as a non-conflicting extra; the actual missing file case is covered by a fresh ZIP below.
      ],
    ),
  ),
);
assert(missingZipAssetSource.valid, "The baseline ZIP asset source should stay valid.");

const missingZipAsset = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(simpleFixedPoster) },
      {
        path: "assets.json",
        data: json({
          assets: [
            {
              id: "missing",
              type: "image",
              path: "assets/missing.png",
              mimeType: "image/png",
              aliases: ["asset:image:missing"],
            },
          ],
        }),
      },
    ]),
  ),
);
assert(
  missingZipAsset.diagnostics.some((item) => item.code === "ASSET_FILE_MISSING"),
  "Missing asset files should remain source diagnostics and not crash ZIP source loading.",
);
const missingZipAssetReport = createLoadedSourceDiagnosticReport(missingZipAsset);
assert(
  missingZipAssetReport.canImport &&
    missingZipAssetReport.warningDiagnostics.some(
      (item) =>
        item.code === "ASSET_FILE_MISSING" &&
        item.layer === "asset-references" &&
        item.assetId === "missing",
    ),
  "Missing ZIP asset files should be placeholder-ready warnings with useful asset location data.",
);

const packageWithFontRequirement = structuredClone(simpleFixedPoster);
(packageWithFontRequirement as { fontRequirements?: unknown }).fontRequirements = [
  {
    id: "font:test-serif:400:normal",
    family: "Test Serif",
    style: "Regular",
    cssStyle: "normal",
    weight: 400,
    postScriptName: "TestSerif-Regular",
    usedBy: ["headline"],
    characters: "Headline",
    editable: true,
    mixedStyle: false,
    source: "figma",
    availableInFigma: true,
  },
];
const fontSource = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(packageWithFontRequirement) },
      { path: "assets.json", data: json({ assets: [] }) },
    ]),
    { sourceName: "font-package.zip" },
  ),
);
const fontReport = createLoadedSourceDiagnosticReport(fontSource);
assert(
  fontReport.canImport &&
    fontReport.infoDiagnostics.some(
      (item) =>
        item.code === "FONT_FACE_REQUIRED" &&
        item.layer === "font-requirements" &&
        item.relatedIds?.includes("headline"),
    ) &&
    fontReport.infoDiagnostics.some(
      (item) =>
        item.code === "FONT_SOURCE_REQUIRES_RESOLUTION" &&
        item.category === "font",
    ),
  "Font metadata should remain actionable provenance without pre-judging runtime resolution.",
);

const packageWithMissingMotionNode = structuredClone(simpleFixedPoster);
(packageWithMissingMotionNode as { motion?: unknown }).motion = {
  format: "figma-motion-v1",
  raw: {
    version: 1,
    playbackStyle: "loop",
    nodes: [
      {
        node: "missing-motion-node",
        timelineDurationMs: 1000,
        fields: [
          {
            field: "opacity",
            keyframes: [
              { timeMs: 0, value: 0 },
              { timeMs: 1000, value: 1 },
            ],
          },
        ],
      },
    ],
  },
  linking: {
    status: "warning",
    matchedNodeIds: [],
    missingNodeIds: ["missing-motion-node"],
    extraPackageNodeIds: [],
  },
};
const motionSource = loadTemplatePackageBundleSource(
  createZipBundleReader(
    createStoredZip([
      { path: "template.json", data: json(packageWithMissingMotionNode) },
      { path: "assets.json", data: json({ assets: [] }) },
    ]),
    { sourceName: "motion-package.zip" },
  ),
);
const motionReport = createLoadedSourceDiagnosticReport(motionSource);
assert(
  motionReport.canImport &&
    motionReport.warningDiagnostics.some(
      (item) =>
        item.code === "MOTION_NODE_MISSING" &&
        item.nodeId === "missing-motion-node" &&
        item.layer === "motion-links",
    ),
  "Unmatched motion nodes should be layered warnings rather than import blockers.",
);
