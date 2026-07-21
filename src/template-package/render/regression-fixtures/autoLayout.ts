import {
  axis,
  createRendererFixturePackage,
  layout,
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
    group: "auto-layout",
    description: id.replace(/-/g, " "),
    mode: "editor",
    packageValue,
    expect: { nodes, warningCodes },
  };
}

export const autoLayoutFixtures: RendererRegressionFixture[] = [
  create("vertical-auto-layout", () => {}, [
    { nodeId: "root", includes: ["flex-direction:column", "gap:16px"] },
  ]),
  create(
    "horizontal-auto-layout",
    (value) => {
      value.nodes.root.layout.mode = "HORIZONTAL";
    },
    [{ nodeId: "root", includes: ["flex-direction:row", "gap:16px"] }],
  ),
  create(
    "nested-auto-layout",
    (value) => {
      value.nodes.root.layout.mode = "HORIZONTAL";
      value.nodes.subject.layout.mode = "VERTICAL";
      value.nodes.subject.layout.gap = 12;
    },
    [
      { nodeId: "root", includes: ["flex-direction:row"] },
      { nodeId: "subject", includes: ["flex-direction:column", "gap:12px"] },
    ],
  ),
  create(
    "none-child-as-flow-item",
    (value) => {
      value.nodes.subject.layout = layout();
      value.nodes.subject.sizing.horizontal = axis("FILL");
      value.nodes.subject.sizing.vertical = axis("FILL");
    },
    [
      {
        nodeId: "subject",
        includes: ["position:relative", "flex-grow:1", "flex-shrink:1"],
        excludes: ["position:absolute"],
      },
    ],
  ),
  create(
    "absolute-child-inside-auto-layout",
    () => {},
    [
      {
        nodeId: "absolute",
        includes: ["position:absolute", "left:260px", "top:260px"],
      },
    ],
  ),
  create(
    "wrapping-auto-layout",
    (value) => {
      value.nodes.root.layout.mode = "HORIZONTAL";
      value.nodes.root.layout.wrap = true;
      value.nodes.root.layout.rowGap = 24;
      value.nodes.root.layout.columnGap = 12;
    },
    [
      {
        nodeId: "root",
        includes: ["flex-wrap:wrap", "row-gap:24px", "column-gap:12px"],
      },
    ],
    ["wrap-fill-child-approximation"],
  ),
  create(
    "gap-padding-alignment",
    (value) => {
      value.nodes.root.layout.gap = 28;
      value.nodes.root.layout.padding = {
        top: 10,
        right: 20,
        bottom: 30,
        left: 40,
      };
      value.nodes.root.layout.primaryAlignment = "CENTER";
      value.nodes.root.layout.counterAlignment = "MAX";
    },
    [
      {
        nodeId: "root",
        includes: [
          "gap:28px",
          "padding-top:10px",
          "padding-right:20px",
          "padding-bottom:30px",
          "padding-left:40px",
          "justify-content:center",
          "align-items:flex-end",
        ],
      },
    ],
  ),
];
