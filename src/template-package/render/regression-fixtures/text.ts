import {
  axis,
  createRendererFixturePackage,
} from "./createFixturePackage";
import type { RendererRegressionFixture } from "./types";

function textFixture(
  id: string,
  mutate: (
    value: ReturnType<typeof createRendererFixturePackage>,
    text: Extract<
      ReturnType<typeof createRendererFixturePackage>["nodes"][string],
      { type: "TEXT" }
    >,
  ) => void,
  includes: string[],
  markupIncludes: string[] = [],
): RendererRegressionFixture {
  const packageValue = createRendererFixturePackage();
  const text = packageValue.nodes.text;
  if (text.type !== "TEXT") throw new Error("Fixture text node is invalid.");
  mutate(packageValue, text);
  return {
    id,
    group: "text",
    description: id.replace(/-/g, " "),
    mode: "editor",
    packageValue,
    expect: {
      nodes: [{ nodeId: "text", includes }],
      markupIncludes,
    },
  };
}

export const textFixtures: RendererRegressionFixture[] = [
  textFixture(
    "fixed-text-box",
    (_value, text) => {
      text.sizing.horizontal = axis("FIXED", 140);
      text.sizing.vertical = axis("FIXED", 72);
      if ("characters" in text.text) {
        text.text.characters = "Fixed text wraps without shrinking";
        text.text.textAutoResize = "NONE";
      }
    },
    ["width:140px", "height:72px", "white-space:pre-wrap"],
  ),
  textFixture(
    "hug-text",
    (_value, text) => {
      if ("characters" in text.text) {
        text.text.characters = "Growing HUG text";
      }
    },
    ["width:fit-content", "height:fit-content"],
  ),
  textFixture(
    "text-line-height",
    (_value, text) => {
      if ("characters" in text.text) {
        text.text.lineHeight = { value: 135, unit: "PERCENT" };
      }
    },
    ["line-height:32.4px"],
  ),
  textFixture(
    "text-letter-spacing",
    (_value, text) => {
      if ("characters" in text.text) {
        text.text.letterSpacing = { value: -2, unit: "PERCENT" };
      }
    },
    ["letter-spacing:-0.48px"],
  ),
  textFixture(
    "text-alignment",
    (_value, text) => {
      if ("characters" in text.text) {
        text.text.textAlignHorizontal = "RIGHT";
        text.text.textAlignVertical = "BOTTOM";
      }
    },
    ["text-align:right", "justify-content:flex-end"],
  ),
  textFixture(
    "text-paragraph-spacing",
    (_value, text) => {
      if ("characters" in text.text) {
        text.text.characters = "Paragraph one\nParagraph two";
        text.text.paragraphSpacing = 16;
      }
    },
    ["display:flex"],
    ["margin-bottom:16px", "Paragraph one", "Paragraph two"],
  ),
];
