import type { TemplatePackageV1 } from "../types";
import { createNowHiringResponsiveReflowFixture } from "./nowHiringResponsiveReflow";

/** Contract-only source fixture. It is not a renderer golden or a Figma export. */
export function createCircularFillInsideHugFixture(): TemplatePackageV1 {
  const packageValue = createNowHiringResponsiveReflowFixture();
  packageValue.packageId = "fixture.circular-fill-inside-hug";
  packageValue.name = "Circular FILL inside HUG contract probe";
  const footer = packageValue.nodes.footer;
  const headline = packageValue.nodes.headline;
  footer.sizing.vertical = { ...footer.sizing.vertical, mode: "HUG", value: null };
  headline.sizing.vertical = { ...headline.sizing.vertical, mode: "FILL", value: null };
  if (headline.extensions?.figma && typeof headline.extensions.figma === "object") {
    headline.extensions.figma = { ...headline.extensions.figma, layoutSizingVertical: "FILL" };
  }
  return packageValue;
}
