import {
  axis,
  createRendererFixturePackage,
  setFigmaMetadata,
} from "../../../packages/template-react/test/render/regression-fixtures/createFixturePackage";
import { analyzeRendererFeatureCoverage } from "./featureCoverage";
import { analyzeFidelityRisk } from "./fidelityRisk";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function item(
  report: ReturnType<typeof analyzeRendererFeatureCoverage>,
  key: string,
) {
  return report.items.find((candidate) => candidate.key === key);
}

const simplePackage = createRendererFixturePackage();
const simpleReport = analyzeRendererFeatureCoverage(simplePackage);

assert(simpleReport.blocking === false, "Coverage must remain diagnostic-only.");
assert(
  item(simpleReport, "auto-layout-vertical")?.status === "supported",
  "Vertical Auto Layout should be reported as supported.",
);
assert(
  item(simpleReport, "sizing-hug")?.affectedNodes.some(
    (node) => node.id === "subject",
  ),
  "Detected features should include affected node identities.",
);
assert(
  item(simpleReport, "solid-fills")?.affectedNodes.length === 5,
  "Feature counts should be derived from affected nodes.",
);

const complexPackage = createRendererFixturePackage();
complexPackage.nodes.root.layout.wrap = true;
complexPackage.nodes.subject.sizing.horizontal = axis("FILL", null, 80, 260);
complexPackage.nodes.subject.appearance.strokes = [
  {
    type: "SOLID",
    color: { r: 0, g: 0, b: 0, a: 1 },
  },
];
complexPackage.nodes.subject.appearance.strokeAlign = "OUTSIDE";
complexPackage.nodes.subject.appearance.effects = [
  {
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: 0.4 },
    offset: { x: 0, y: 4 },
    radius: 8,
  },
];
complexPackage.nodes.subject.appearance.fills.push({
  type: "GRADIENT_LINEAR",
  stops: [
    {
      position: 0,
      color: { r: 1, g: 0, b: 0, a: 1 },
    },
    {
      position: 1,
      color: { r: 0, g: 0, b: 1, a: 1 },
    },
  ],
});
setFigmaMetadata(complexPackage, "subject", {
  constraints: { horizontal: "SCALE", vertical: "TOP" },
  isMask: true,
  maskType: "ALPHA",
});
setFigmaMetadata(complexPackage, "text", {
  mixedTextStyles: true,
});
const complexTextNode = complexPackage.nodes.text;
assert(
  complexTextNode.type === "TEXT",
  "The generic fixture text node should remain a TEXT node.",
);
if (complexTextNode.type !== "TEXT") {
  throw new Error("Expected fixture text node.");
}
complexTextNode.text = {
  ...complexTextNode.text,
  fontFamily: null,
};

const complexReport = analyzeRendererFeatureCoverage(complexPackage);
assert(
  item(complexReport, "wrapping-auto-layout")?.status === "partial",
  "Wrapping should be detected as partial support.",
);
assert(
  item(complexReport, "scale-constraints")?.status === "partial",
  "SCALE constraints should be detected.",
);
assert(
  item(complexReport, "true-figma-masks")?.status === "unsupported",
  "True masks should be reported as unsupported.",
);
assert(
  item(complexReport, "gradients")?.status === "unsupported",
  "Gradient paints should be reported as unsupported.",
);
assert(
  item(complexReport, "mixed-text-styles")?.status === "unsupported",
  "Mixed text styles should be reported as unsupported.",
);
assert(
  item(complexReport, "missing-font-metadata")?.status === "unknown",
  "Missing font metadata should be reported as unknown fidelity.",
);

const riskReport = analyzeFidelityRisk(complexReport);
assert(riskReport.blocking === false, "Risk analysis must be non-blocking.");
assert(
  riskReport.items.find((risk) => risk.featureKey === "true-figma-masks")
    ?.level === "high",
  "Unsupported masks should be high fidelity risk.",
);
assert(
  riskReport.items.find((risk) => risk.featureKey === "scale-constraints")
    ?.level === "medium",
  "SCALE constraints should be medium fidelity risk.",
);
assert(
  riskReport.items.find((risk) => risk.featureKey === "solid-fills")?.level ===
    "low",
  "Established solid fill rendering should be low risk.",
);

const missingAssetPackage = createRendererFixturePackage();
missingAssetPackage.nodes.subject.image = {
  assetId: "asset:image:missing",
};
const missingAssetReport = analyzeRendererFeatureCoverage(missingAssetPackage);
assert(
  item(missingAssetReport, "missing-image-assets")?.status === "unsupported",
  "Missing image references should be surfaced.",
);

const mediaPackage = createRendererFixturePackage();
mediaPackage.nodes.subject.image = {
  assetId: "asset:image:crop",
  scaleMode: "CROP",
  imageTransform: [
    [1, 0, 0.1],
    [0, 1, 0.2],
  ],
};
mediaPackage.assets["asset:image:crop"] = {
  id: "asset:image:crop",
  type: "image",
  source: "embedded",
  deferred: false,
  mimeType: "image/png",
  dataUrl: "data:image/png;base64,AA==",
};
mediaPackage.nodes.absolute.type = "VECTOR";
mediaPackage.nodes.absolute.vector = {
  assetId: "asset:svg:test",
  viewBox: "0 0 80 60",
  preserveAspectRatio: "xMidYMid meet",
  contentBounds: { x: 0, y: 0, width: 80, height: 60 },
};
mediaPackage.assets["asset:svg:test"] = {
  id: "asset:svg:test",
  type: "svg",
  source: "embedded",
  deferred: false,
  mimeType: "image/svg+xml",
  svgString:
    '<svg viewBox="0 0 80 60"><rect width="80" height="60"/></svg>',
  viewBox: "0 0 80 60",
};
setFigmaMetadata(mediaPackage, "absolute", {
  relativeTransform: [
    [-1, 0, 0],
    [0, 1, 0],
  ],
  relativeBoundsInconsistent: true,
  hasVectorNetwork: true,
});
const mediaReport = analyzeRendererFeatureCoverage(mediaPackage);
assert(
  item(mediaReport, "image-mode-crop")?.status === "partial" &&
    item(mediaReport, "image-transform")?.status === "partial",
  "Image crop mode and transform metadata should be detected.",
);
assert(
  item(mediaReport, "svg-vector-assets")?.status === "supported" &&
    item(mediaReport, "svg-assets")?.status === "supported",
  "SVG node rendering and SVG asset presence should be reported separately.",
);
assert(
  item(mediaReport, "mirrored-transform")?.status === "supported" &&
    item(mediaReport, "transformed-bounds")?.status === "partial",
  "Reflections and transformed-bound inconsistencies should be detected.",
);
assert(
  item(mediaReport, "vector-content-bounds")?.status === "supported" &&
    item(mediaReport, "vector-path-editing")?.status === "unsupported",
  "Visual vector bounds support should remain distinct from structural path editing support.",
);
assert(
  analyzeFidelityRisk(mediaReport).items.find(
    (risk) => risk.featureKey === "vector-path-editing",
  )?.level === "low",
  "Unavailable structural path editing should remain low visual fidelity risk when SVG rendering is available.",
);
