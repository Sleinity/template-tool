import type { TemplatePackageV1 } from "../types";
import { createNowHiringResponsiveReflowFixture } from "./nowHiringResponsiveReflow";

/** Exploratory source-level evidence only. It is not an exporter or pixel-fidelity fixture. */
export function createAppearanceContractProbe(): TemplatePackageV1 {
  const packageValue = createNowHiringResponsiveReflowFixture();
  packageValue.packageId = "fixture.appearance-contract-probe";
  packageValue.name = "Appearance contract source probe";
  const hero = packageValue.nodes.hero;
  hero.appearance.clipContent = true;
  const node = packageValue.nodes["product-image"];
  node.appearance = {
    ...node.appearance,
    opacity: 0.85,
    blendMode: "MULTIPLY",
    cornerRadii: [8, 16, 24, 32],
    fills: [
      { type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 0.7 },
      { type: "GRADIENT_LINEAR", gradientStops: [{ position: 0, color: { r: 0, g: 0, b: 0, a: 1 } }, { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } }], gradientTransform: [[1, 0, 0], [0, 1, 0]] },
      { type: "GRADIENT_RADIAL", stops: [{ position: 0, color: { r: 1, g: 1, b: 1, a: 1 } }, { position: 1, color: { r: 0, g: 0, b: 0, a: 0 } }] },
    ],
    strokes: [
      { paint: { type: "SOLID", color: { r: 0, g: 0.5, b: 1, a: 1 } }, weight: 4, align: "INSIDE" },
      { type: "GRADIENT_ANGULAR", stops: [{ position: 0, color: { r: 1, g: 0, b: 0, a: 1 } }, { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }] },
    ],
    strokeWeight: 4,
    strokeAlign: "INSIDE",
    effects: [
      { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.5 }, offset: { x: 4, y: 8 }, radius: 16, spread: 2 },
      { type: "INNER_SHADOW", color: { r: 1, g: 1, b: 1, a: 0.35 }, offset: { x: 0, y: 2 }, radius: 4 },
      { type: "LAYER_BLUR", radius: 2 },
    ],
  };
  node.extensions = {
    figma: {
      ...(node.extensions?.figma && typeof node.extensions.figma === "object" ? node.extensions.figma : {}),
      isMask: true,
      maskType: "ALPHA",
      shouldBreakMaskChain: false,
      strokeDashes: [8, 4],
      strokeCap: "ROUND",
      strokeJoin: "BEVEL",
      cornerSmoothing: 0.6,
      componentId: "component:probe",
      mainComponentId: "component:main",
      variantProperties: { State: "Active" },
      boundVariables: { opacity: "variable:opacity" },
      styles: { fill: "style:fill" },
    },
  };
  return packageValue;
}
