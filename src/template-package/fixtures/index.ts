import editableMultilineHeadline from "./editable-multiline-headline-hug.json";
import figmaPluginV040 from "./figma-plugin-v0.4.0.json";
import figmaPluginV041 from "./figma-plugin-v0.4.1.json";
import horizontalFooterRow from "./horizontal-footer-row.json";
import imageOverlayBadges from "./image-overlay-badges.json";
import invalidParentChild from "./invalid-parent-child.invalid.json";
import missingAsset from "./missing-asset.invalid.json";
import simpleFixedPoster from "./simple-fixed-poster.json";
import verticalAutoLayout from "./vertical-auto-layout.json";

export interface TemplatePackageFixture {
  name: string;
  input: unknown;
  expectedValid: boolean;
}

export const templatePackageFixtures: TemplatePackageFixture[] = [
  { name: "simple fixed poster", input: simpleFixedPoster, expectedValid: true },
  { name: "vertical Auto Layout", input: verticalAutoLayout, expectedValid: true },
  { name: "editable multiline headline with Hug height", input: editableMultilineHeadline, expectedValid: true },
  { name: "image with overlay badges", input: imageOverlayBadges, expectedValid: true },
  { name: "horizontal footer row", input: horizontalFooterRow, expectedValid: true },
  { name: "Figma plugin v0.4.0 export", input: figmaPluginV040, expectedValid: true },
  { name: "Figma plugin v0.4.1 export", input: figmaPluginV041, expectedValid: true },
  { name: "missing asset", input: missingAsset, expectedValid: false },
  { name: "invalid parent/child reference", input: invalidParentChild, expectedValid: false }
];
