import { axis, createRendererFixturePackage } from "./createFixturePackage";
import type { RendererRegressionFixture } from "./types";

function fixture(
  id: string,
  mutate: (packageValue: ReturnType<typeof createRendererFixturePackage>) => void,
  nodes: NonNullable<RendererRegressionFixture["expect"]["nodes"]>,
): RendererRegressionFixture {
  const packageValue = createRendererFixturePackage();
  mutate(packageValue);
  return {
    id,
    group: "sizing",
    description: id.replace(/-/g, " "),
    mode: "editor",
    packageValue,
    expect: { nodes },
  };
}

export const sizingFixtures: RendererRegressionFixture[] = [
  fixture(
    "fixed-child",
    (value) => {
      value.nodes.subject.sizing.horizontal = axis("FIXED", 180);
      value.nodes.subject.sizing.vertical = axis("FIXED", 72);
    },
    [{ nodeId: "subject", includes: ["width:180px", "height:72px"] }],
  ),
  fixture(
    "hug-child",
    () => {},
    [
      {
        nodeId: "subject",
        includes: ["width:fit-content", "height:fit-content", "flex-grow:0"],
      },
    ],
  ),
  fixture(
    "fill-child",
    (value) => {
      value.nodes.subject.sizing.vertical = axis("FILL");
    },
    [
      {
        nodeId: "subject",
        includes: ["flex-grow:1", "flex-shrink:1", "flex-basis:0"],
      },
    ],
  ),
  fixture(
    "hug-parent-propagation",
    (value) => {
      const text = value.nodes.text;
      if (text.type === "TEXT" && "characters" in text.text) {
        text.text.characters = "Longer content-driven text";
      }
    },
    [
      { nodeId: "subject", includes: ["width:fit-content", "height:fit-content"] },
      { nodeId: "text", includes: ["width:fit-content", "height:fit-content"] },
    ],
  ),
  fixture(
    "fill-sibling-shrinking",
    () => {},
    [
      {
        nodeId: "subject",
        includes: ["flex-grow:0", "flex-shrink:0"],
      },
      {
        nodeId: "sibling",
        includes: ["flex-grow:1", "flex-shrink:1", "min-height:0"],
      },
    ],
  ),
  fixture(
    "min-max-width",
    (value) => {
      value.nodes.subject.sizing.horizontal = axis("HUG", null, 100, 240);
    },
    [{ nodeId: "subject", includes: ["min-width:100px", "max-width:240px"] }],
  ),
  fixture(
    "min-max-height",
    (value) => {
      value.nodes.subject.sizing.vertical = axis("HUG", null, 60, 140);
    },
    [{ nodeId: "subject", includes: ["min-height:60px", "max-height:140px"] }],
  ),
];
