import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "../types";
import { analyzePackageAssets } from "./analyzePackageAssets";
import {
  comparePackageToFigmaMetadata,
  type FigmaMcpNodeMetadata,
} from "./comparePackageToFigmaMetadata";
import { enrichTemplatePackage } from "./enrichTemplatePackage";
import { parseFigmaUrl } from "./parseFigmaUrl";
import {
  createPngRasterReadinessTracker,
  createTemplatePackageCaptureOptions,
} from "./captureTemplatePackagePreview";
import { describeVisualDiffError } from "../../../apps/studio/src/fidelity/visualDiff";
import {
  compareRgbaImages,
  compareRgbaPixels,
  getFigmaReferencePng,
} from "../../../apps/studio/src/fidelity/visualDiff";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const parsedUrl = parseFigmaUrl(
  "https://www.figma.com/design/Tb4DXmBGjBDkJ9eoBQwFYO/Niels-s-AI-Playground?node-id=211-79&m=dev",
);
assert(
  parsedUrl.valid &&
    parsedUrl.value.fileKey === "Tb4DXmBGjBDkJ9eoBQwFYO" &&
    parsedUrl.value.nodeId === "211:79",
  "Figma design URLs should yield fileKey and normalized colon nodeId.",
);
assert(
  !parseFigmaUrl("https://example.com/design/file").valid,
  "Non-Figma URLs should be rejected.",
);

const packageValue =
  figmaPluginV041 as unknown as TemplatePackageV1;
const originalJson = JSON.stringify(packageValue);
const metadataNodes: Record<string, FigmaMcpNodeMetadata> = Object.fromEntries(
  Object.values(packageValue.nodes).map((node) => {
    const field = packageValue.editableFields.find(
      (candidate) => candidate.nodeId === node.id,
    );
    return [
      node.id,
      {
        id: node.id,
        name: node.name,
        dataName: field
          ? `field:${field.type}:${field.id}`
          : node.name,
        parentId: node.parentId,
        children: node.children,
        bounds: node.bounds.absolute,
      },
    ];
  }),
);
const comparison = comparePackageToFigmaMetadata(packageValue, {
  rootNodeId: packageValue.rootNodeId,
  nodes: metadataNodes,
});
assert(
  comparison.status === "matched" &&
    comparison.matchedNodeCount === Object.keys(packageValue.nodes).length,
  "Equivalent MCP metadata should match the package node graph.",
);

const packageWithFonts = structuredClone(packageValue);
const liveTextNode = Object.values(packageWithFonts.nodes).find(
  (node) => node.type === "TEXT",
);
if (!liveTextNode) throw new Error("Font comparison fixture needs text.");
packageWithFonts.fontRequirements = [
  {
    id: "font:rethink-sans:700:normal",
    family: "Rethink Sans",
    style: "Bold",
    cssStyle: "normal",
    weight: 700,
    postScriptName: "RethinkSans-Bold",
    usedBy: [liveTextNode.id],
    characters: "Test",
    editable: true,
    mixedStyle: false,
    source: "figma",
    availableInFigma: true,
  },
];
metadataNodes[liveTextNode.id].fontFaces = [
  {
    family: "Rethink Sans",
    postScriptName: "RethinkSans-SemiBold",
    weight: 600,
    style: "normal",
  },
];
assert(
  comparePackageToFigmaMetadata(packageWithFonts, {
    nodes: metadataNodes,
  }).differences.some((item) => item.code === "font-changed"),
  "Live Figma enrichment should report stale font face metadata.",
);

const enriched = enrichTemplatePackage(packageValue, {
  figmaUrl:
    "https://www.figma.com/design/Tb4DXmBGjBDkJ9eoBQwFYO/Example?node-id=211-79",
  evidence: {
    metadata: {
      rootNodeId: packageValue.rootNodeId,
      nodes: metadataNodes,
    },
    designContext:
      '<img className="object-cover" /><div className="justify-between" />',
  },
});
assert(
  JSON.stringify(packageValue) === originalJson,
  "Enrichment must not mutate the imported package.",
);
assert(
  enriched.package.source?.fileKey === "Tb4DXmBGjBDkJ9eoBQwFYO" &&
    enriched.package.source?.figmaMcp?.nodeId === "211:79" &&
    enriched.package.source?.figmaMcp?.status === "matched",
  "Enrichment should attach parsed Figma provenance and match status.",
);
assert(
  Object.keys(enriched.package.rendererHints ?? {}).length > 0 &&
    (enriched.package.verification?.designHints?.length ?? 0) === 2,
  "Enrichment should create renderer hints and safe design-context notes.",
);

const assetStrategy = analyzePackageAssets(packageValue, 1);
const uniqueAssetDiagnostics = new Set(
  assetStrategy.diagnostics.map((item) => item.assetId),
);
assert(
  uniqueAssetDiagnostics.size === assetStrategy.diagnostics.length,
  "Large embedded asset diagnostics should be deduplicated by assetId.",
);

const visualDiff = compareRgbaPixels(
  new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]),
  new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]),
);
assert(
  visualDiff.totalPixels === 2 &&
    visualDiff.mismatchedPixels === 1 &&
    visualDiff.score === 50 &&
    visualDiff.severity === "broken",
  "Visual diff should return a deterministic pixel match score.",
);

const perfectVisualDiff = compareRgbaImages(
  {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([20, 40, 60, 255]),
  },
  {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([20, 40, 60, 255]),
  },
);
assert(
  perfectVisualDiff.score === 100 &&
    perfectVisualDiff.mismatchedPixels === 0 &&
    perfectVisualDiff.severity === "excellent",
  "Identical images should produce a 100% excellent score.",
);

const normalizedVisualDiff = compareRgbaImages(
  {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255]),
  },
  {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
    ]),
  },
);
assert(
  normalizedVisualDiff.score === 100 &&
    normalizedVisualDiff.totalPixels === 4,
  "Different input dimensions should be normalized before comparison.",
);

assert(
  getFigmaReferencePng(packageValue) === null,
  "A package without a Figma screenshot should gracefully skip visual diff.",
);

const captureOptions = createTemplatePackageCaptureOptions(
  packageValue,
  '@font-face{font-family:"__template_font_test";src:url("data:font/ttf;base64,AA==")}',
);
assert(
  captureOptions.cacheBust === false &&
    captureOptions.fontEmbedCSS?.includes("__template_font_test"),
  "Preview capture must preserve managed blob URLs and explicitly embed private runtime faces.",
);
assert(
  !("fontEmbedCSS" in createTemplatePackageCaptureOptions(packageValue)),
  "Preview capture must preserve html-to-image font discovery when no exact private face needs embedding.",
);
const rasterReadiness = createPngRasterReadinessTracker();
const rasterNode = {};
assert(
  rasterReadiness.needsWarmup(rasterNode, "revision-a", true),
  "A media capture must warm its first browser raster for a new revision.",
);
rasterReadiness.markReady(rasterNode, "revision-a");
assert(
  !rasterReadiness.needsWarmup(rasterNode, "revision-a", true) &&
    rasterReadiness.needsWarmup(rasterNode, "revision-b", true) &&
    !rasterReadiness.needsWarmup({}, "revision-a", false),
  "Raster readiness must be node- and revision-bound without warming captures that have no CSS media owner.",
);
assert(
  describeVisualDiffError({ message: "Stored image failed." }) ===
    "Stored image failed.",
  "Visual diff should preserve useful non-Error rejection messages.",
);
