import {
  axis,
  createRendererFixturePackage,
  makeLiveConstraintContainer,
  setFigmaMetadata,
} from "./createFixturePackage";
import type { RendererRegressionFixture } from "./types";

function diagnosticFixture(
  id: string,
  mutate: (value: ReturnType<typeof createRendererFixturePackage>) => void,
  warningCodes: string[],
): RendererRegressionFixture {
  const packageValue = createRendererFixturePackage();
  mutate(packageValue);
  return {
    id,
    group: "diagnostics",
    description: id.replace(/-/g, " "),
    mode: "editor",
    packageValue,
    expect: { warningCodes },
  };
}

export const diagnosticFixtures: RendererRegressionFixture[] = [
  diagnosticFixture(
    "raw-normalized-sizing-mismatch",
    (value) => {
      setFigmaMetadata(value, "subject", {
        layoutSizingHorizontal: "FIXED",
      });
    },
    ["figma-horizontal-sizing-mismatch"],
  ),
  diagnosticFixture(
    "fixed-with-layout-grow",
    (value) => {
      value.nodes.subject.sizing.vertical = axis("FIXED", 80);
      setFigmaMetadata(value, "subject", { layoutGrow: 1 });
    },
    ["figma-layout-grow-fixed-conflict"],
  ),
  diagnosticFixture(
    "fixed-with-layout-align-stretch",
    (value) => {
      value.nodes.subject.sizing.horizontal = axis("FIXED", 200);
      setFigmaMetadata(value, "subject", { layoutAlign: "STRETCH" });
    },
    ["figma-layout-align-fixed-conflict"],
  ),
  diagnosticFixture(
    "absolute-fill-missing-opposite-edge",
    (value) => {
      makeLiveConstraintContainer(value);
      value.nodes.absolute.sizing.horizontal = axis("FILL");
      setFigmaMetadata(value, "absolute", {
        constraints: { horizontal: "LEFT", vertical: "TOP" },
      });
    },
    ["absolute-fill-without-opposite-edge"],
  ),
  diagnosticFixture(
    "unsupported-mask",
    (value) => {
      setFigmaMetadata(value, "subject", {
        isMask: true,
        maskType: "ALPHA",
      });
    },
    ["unsupported-figma-mask"],
  ),
  diagnosticFixture(
    "unsupported-image-crop-mode",
    (value) => {
      value.nodes.subject.image = {
        assetId: "asset:image:diagnostic",
        scaleMode: "FOCUS",
      };
      value.assets["asset:image:diagnostic"] = {
        id: "asset:image:diagnostic",
        type: "image",
        source: "embedded",
        deferred: false,
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,AA==",
      };
    },
    ["unsupported-image-scale-mode"],
  ),
];
