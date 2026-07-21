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
  mode: RendererRegressionFixture["mode"] = "editor",
): RendererRegressionFixture {
  const packageValue = createRendererFixturePackage();
  mutate(packageValue);
  return {
    id,
    group: "transforms",
    description: id.replace(/-/g, " "),
    mode,
    packageValue,
    expect: { nodes, warningCodes },
  };
}

export const transformFixtures: RendererRegressionFixture[] = [
  create(
    "rotated-node",
    (value) => {
      setFigmaMetadata(value, "absolute", {
        rotation: 30,
        width: 80,
        height: 60,
      });
    },
    [{ nodeId: "absolute", includes: ["rotate:30deg"] }],
    [],
    "static",
  ),
  create(
    "nested-transform",
    (value) => {
      setFigmaMetadata(value, "subject", {
        rotation: 10,
        width: 200,
        height: 80,
      });
      setFigmaMetadata(value, "text", {
        rotation: -5,
        width: 120,
        height: 32,
      });
    },
    [
      { nodeId: "subject", includes: ["rotate:10deg"] },
      { nodeId: "text", includes: ["rotate:-5deg"] },
    ],
  ),
  create(
    "transformed-child-with-center-constraint",
    (value) => {
      makeLiveConstraintContainer(value);
      setFigmaMetadata(value, "absolute", {
        rotation: 20,
        width: 80,
        height: 60,
        constraints: { horizontal: "CENTER", vertical: "BOTTOM" },
      });
    },
    [
      {
        nodeId: "absolute",
        includes: ["rotate:20deg", "left:calc(50% + -120px)", "bottom:210px"],
      },
    ],
  ),
  create(
    "relative-bounds-inconsistency-warning",
    (value) => {
      setFigmaMetadata(value, "absolute", {
        rotation: 12,
        relativeBoundsInconsistent: true,
      });
    },
    [{ nodeId: "absolute", includes: ["rotate:12deg"] }],
    [
      "transformed-bounds-approximation",
      "transformed-relative-bounds-inconsistent",
    ],
  ),
];
