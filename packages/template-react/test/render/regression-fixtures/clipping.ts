import {
  createRendererFixturePackage,
  makeLiveConstraintContainer,
  setFigmaMetadata,
} from "./createFixturePackage";
import type { RendererRegressionFixture } from "./types";

function create(
  id: string,
  mutate: (value: ReturnType<typeof createRendererFixturePackage>) => void,
  nodes: NonNullable<RendererRegressionFixture["expect"]["nodes"]>,
  warningCodes: string[] = [],
): RendererRegressionFixture {
  const packageValue = createRendererFixturePackage();
  mutate(packageValue);
  return {
    id,
    group: "clipping",
    description: id.replace(/-/g, " "),
    mode: "editor",
    packageValue,
    expect: { nodes, warningCodes },
  };
}

export const clippingFixtures: RendererRegressionFixture[] = [
  create(
    "clips-content-true",
    (value) => {
      value.nodes.subject.layout.clipContent = true;
      value.nodes.subject.appearance.clipContent = true;
    },
    [{ nodeId: "subject", includes: ["overflow:hidden"] }],
  ),
  create(
    "rounded-image-frame",
    (value) => {
      value.nodes.subject.layout.clipContent = true;
      value.nodes.subject.appearance.clipContent = true;
      value.nodes.subject.appearance.cornerRadius = 24;
      value.nodes.text.image = {
        assetId: "asset:image:rounded",
        scaleMode: "FILL",
      };
      value.assets["asset:image:rounded"] = {
        id: "asset:image:rounded",
        type: "image",
        source: "embedded",
        deferred: false,
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,AA==",
      };
    },
    [
      {
        nodeId: "subject",
        includes: ["overflow:hidden", "border-radius:24px"],
      },
      { nodeId: "text", includes: ["background-image:"] },
    ],
  ),
  create(
    "nested-clipping",
    (value) => {
      value.nodes.root.layout.clipContent = true;
      value.nodes.root.appearance.clipContent = true;
      value.nodes.subject.layout.clipContent = true;
      value.nodes.subject.appearance.clipContent = true;
    },
    [
      { nodeId: "root", includes: ["overflow:hidden"] },
      { nodeId: "subject", includes: ["overflow:hidden"] },
    ],
  ),
  create(
    "absolute-child-live-parent-clipping",
    (value) => {
      makeLiveConstraintContainer(value);
      value.nodes.subject.layout.clipContent = false;
      value.nodes.subject.appearance.clipContent = false;
      setFigmaMetadata(value, "absolute", {
        constraints: { horizontal: "RIGHT", vertical: "BOTTOM" },
      });
    },
    [
      {
        nodeId: "subject",
        includes: [
          "overflow:hidden",
          'data-package-clip-source="live-containment"',
        ],
      },
      {
        nodeId: "absolute",
        includes: ["position:absolute", "right:280px", "bottom:210px"],
      },
    ],
    ["editor-live-resize-contained"],
  ),
];
