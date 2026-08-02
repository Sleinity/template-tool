import { autoLayoutFixtures } from "./autoLayout";
import { clippingFixtures } from "./clipping";
import { constraintFixtures } from "./constraints";
import { diagnosticFixtures } from "./diagnostics";
import { imageFillFixtures } from "./imageFills";
import { sizingFixtures } from "./sizing";
import { textFixtures } from "./text";
import { transformFixtures } from "./transforms";

export type * from "./types";

export const rendererRegressionFixtures = [
  ...sizingFixtures,
  ...constraintFixtures,
  ...autoLayoutFixtures,
  ...clippingFixtures,
  ...imageFillFixtures,
  ...textFixtures,
  ...transformFixtures,
  ...diagnosticFixtures,
];
