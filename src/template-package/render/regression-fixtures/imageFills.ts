import { createRendererFixturePackage } from "./createFixturePackage";
import type { RendererRegressionFixture } from "./types";

function imageFixture(
  id: string,
  scaleMode: string,
  includes: string[],
  warningCodes: string[] = [],
  imageTransform?: number[][],
): RendererRegressionFixture {
  const packageValue = createRendererFixturePackage();
  packageValue.nodes.subject.image = {
    assetId: "asset:image:subject",
    scaleMode,
    imageTransform,
  };
  packageValue.assets["asset:image:subject"] = {
    id: "asset:image:subject",
    type: "image",
    source: "embedded",
    deferred: false,
    mimeType: "image/png",
    dataUrl: "data:image/png;base64,AA==",
    width: 200,
    height: 80,
  };
  return {
    id,
    group: "image-fills",
    description: id.replace(/-/g, " "),
    mode: "editor",
    packageValue,
    expect: {
      nodes: [{ nodeId: "subject", includes }],
      warningCodes,
    },
  };
}

function flowFillImageTransformFixture(): RendererRegressionFixture {
  const packageValue = createRendererFixturePackage();
  const root = packageValue.nodes.root;
  const subject = packageValue.nodes.subject;
  root.children = ["subject"];
  root.bounds.relative = { x: 0, y: 0, width: 1080, height: 1544 };
  root.bounds.absolute = { x: 0, y: 0, width: 1080, height: 1544 };
  root.layout.mode = "VERTICAL";
  root.layout.gap = 0;
  root.layout.padding = { top: 240, right: 160, bottom: 240, left: 160 };
  root.sizing.horizontal = { mode: "FIXED", value: 1080, min: null, max: null };
  root.sizing.vertical = { mode: "FIXED", value: 1544, min: null, max: null };

  subject.type = "RECTANGLE";
  subject.children = [];
  subject.bounds.relative = { x: 160, y: 240, width: 760, height: 1064 };
  subject.bounds.absolute = { x: 160, y: 240, width: 760, height: 1064 };
  subject.layout.mode = "NONE";
  subject.sizing.horizontal = { mode: "FILL", value: null, min: null, max: null };
  subject.sizing.vertical = { mode: "FILL", value: null, min: null, max: null };
  subject.image = {
    assetId: "asset:image:subject",
    scaleMode: "FILL",
    imageTransform: [
      [0.5, 0, 0.25],
      [0, 1, 0],
    ],
  };
  packageValue.assets["asset:image:subject"] = {
    id: "asset:image:subject",
    type: "image",
    source: "embedded",
    deferred: false,
    mimeType: "image/png",
    dataUrl: "data:image/png;base64,AA==",
    width: 1125,
    height: 750,
  };

  return {
    id: "flow-fill-image-preserves-node-geometry",
    group: "image-fills",
    description:
      "FLOW FILL image keeps exported node geometry and preserves its CROP-only transform as inapplicable provenance",
    mode: "editor",
    packageValue,
    expect: {
      nodes: [
        {
          nodeId: "subject",
          includes: [
            "width:100%",
            "flex-grow:1",
            "flex-shrink:1",
            "flex-basis:0",
            "background-size:cover",
          ],
        },
      ],
      markupIncludes: [
        'data-package-image-render-mode="object-fit-cover"',
        'data-package-image-crop-mode="objectFitOnly"',
        'data-package-image-transform-applicability="preserved-inapplicable"',
        'data-package-image-object-position="50% 50%"',
        "background-size:cover",
      ],
    },
  };
}

export const imageFillFixtures: RendererRegressionFixture[] = [
  imageFixture("image-fill", "FILL", [
    "background-size:cover",
    "background-repeat:no-repeat",
  ]),
  imageFixture("image-fit", "FIT", ["background-size:contain"]),
  imageFixture("image-crop", "CROP", ["background-size:cover"]),
  imageFixture("image-tile", "TILE", ["background-repeat:repeat"]),
  imageFixture(
    "image-transform",
    "CROP",
    [
      'data-package-image-render-mode="figma-image-transform"',
      'data-package-image-crop-mode="figmaImageTransform"',
      'data-package-image-transform-applicability="active-crop"',
    ],
    [],
    [
      [1, 0, 0],
      [0, 0.8, 0.1],
    ],
  ),
  flowFillImageTransformFixture(),
  imageFixture(
    "unsupported-image-scale-mode",
    "UNKNOWN",
    ["background-size:cover"],
    ["unsupported-image-scale-mode"],
  ),
];
