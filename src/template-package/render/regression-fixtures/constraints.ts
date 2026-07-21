import {
  axis,
  createRendererFixturePackage,
  makeLiveConstraintContainer,
  setFigmaMetadata,
} from "./createFixturePackage";
import type { RendererRegressionFixture } from "./types";

function constraintFixture(
  id: string,
  horizontal: string,
  vertical: string,
  configure: (packageValue: ReturnType<typeof createRendererFixturePackage>) => void,
  includes: string[],
  warningCodes: string[] = [],
): RendererRegressionFixture {
  const packageValue = createRendererFixturePackage();
  makeLiveConstraintContainer(packageValue);
  setFigmaMetadata(packageValue, "absolute", {
    constraints: { horizontal, vertical },
  });
  configure(packageValue);
  return {
    id,
    group: "constraints",
    description: id.replace(/-/g, " "),
    mode: "editor",
    packageValue,
    expect: {
      nodes: [{ nodeId: "absolute", includes }],
      warningCodes,
    },
  };
}

export const constraintFixtures: RendererRegressionFixture[] = [
  constraintFixture(
    "left-fixed",
    "LEFT",
    "TOP",
    () => {},
    ["left:40px", "top:30px", "width:80px", "height:60px"],
  ),
  constraintFixture(
    "right-hug",
    "RIGHT",
    "TOP",
    (value) => {
      value.nodes.absolute.sizing.horizontal = axis("HUG");
    },
    ["right:280px", "width:fit-content"],
  ),
  constraintFixture(
    "center-hug",
    "CENTER",
    "TOP",
    (value) => {
      value.nodes.absolute.sizing.horizontal = axis("HUG");
    },
    ["left:calc(50% + -120px)", "translate:-50% 0", "width:fit-content"],
  ),
  constraintFixture(
    "left-right-fill",
    "LEFT_RIGHT",
    "TOP",
    (value) => {
      value.nodes.absolute.sizing.horizontal = axis("FILL");
    },
    ["left:40px", "right:280px"],
  ),
  constraintFixture(
    "top-bottom-fill",
    "LEFT",
    "TOP_BOTTOM",
    (value) => {
      value.nodes.absolute.sizing.vertical = axis("FILL");
    },
    ["top:30px", "bottom:210px"],
  ),
  constraintFixture(
    "scale-fixed",
    "SCALE",
    "SCALE",
    () => {},
    ["left:10%", "top:10%", "width:20%", "height:20%"],
  ),
  constraintFixture(
    "scale-hug-warning",
    "SCALE",
    "TOP",
    (value) => {
      value.nodes.absolute.sizing.horizontal = axis("HUG");
    },
    ["left:10%", "width:20%"],
    ["absolute-scale-hug-ambiguous"],
  ),
];
