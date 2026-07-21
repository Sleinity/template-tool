import type { ResolvedImagePlacementIntentV1 } from "./types";
import { resolveImagePlacementGeometry } from "./imagePlacement";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function near(actual: number, expected: number, message: string, tolerance = 1e-6) {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, received ${actual}`);
}

function intent(
  fitMode: ResolvedImagePlacementIntentV1["fitMode"],
  options: Partial<ResolvedImagePlacementIntentV1> = {},
): ResolvedImagePlacementIntentV1 {
  return {
    schemaVersion: "resolved-image-placement-v1",
    fitMode,
    focalPoint: { x: 0.5, y: 0.5 },
    coordinateSpace: "normalized-node-to-normalized-source",
    transformOrigin: "source-top-left",
    sourceTransform: null,
    activeCropTransform: null,
    transformApplicability: "missing",
    clipping: "slot",
    sampling: { backend: "browser-native", interpolation: "browser-default" },
    compatibilityCropZoom: 1,
    compatibilityCropAxis: null,
    ...options,
  };
}

const nowHiringCover = resolveImagePlacementGeometry(intent("FILL"), 960, 950, 1125, 750);
assert(nowHiringCover?.strategy === "cover", "FILL should resolve to native cover geometry.");
near(nowHiringCover.destinationBounds.x, -232.5, "Centered cover should place the wide asset symmetrically.");
near(nowHiringCover.destinationBounds.width, 1425, "Centered cover should scale to the slot height.");
near(nowHiringCover.visibleSourceRect.normalized.x, 0.1631578947368421, "Visible source left edge should be explainable.");
near(nowHiringCover.visibleSourceRect.normalized.width, 0.6736842105263158, "Visible source width should be explainable.");
assert(nowHiringCover.preservesAspectRatio, "FILL must preserve intrinsic aspect ratio.");

const leftFocal = resolveImagePlacementGeometry(
  intent("FILL", { focalPoint: { x: 0, y: 0.5 } }),
  300,
  300,
  600,
  300,
);
const rightFocal = resolveImagePlacementGeometry(
  intent("FILL", { focalPoint: { x: 1, y: 0.5 } }),
  300,
  300,
  600,
  300,
);
near(leftFocal?.visibleSourceRect.normalized.x ?? -1, 0, "Left focal alignment should retain the source left edge.");
near(rightFocal?.visibleSourceRect.normalized.x ?? -1, 0.5, "Right focal alignment should retain the source right edge.");

const portraitCover = resolveImagePlacementGeometry(intent("FILL"), 1200, 600, 800, 1200);
near(portraitCover?.destinationBounds.y ?? 0, -600, "Portrait cover should crop symmetrically on the vertical axis.");
near(portraitCover?.visibleSourceRect.normalized.y ?? 0, 1 / 3, "Portrait cover should report its visible source top.");
near(portraitCover?.visibleSourceRect.normalized.height ?? 0, 1 / 3, "Portrait cover should report its visible source height.");

const contained = resolveImagePlacementGeometry(intent("FIT"), 400, 400, 800, 400);
assert(contained?.strategy === "contain", "FIT should resolve to contain geometry.");
near(contained.destinationBounds.y, 100, "FIT should letterbox around the complete source.");
near(contained.visibleSourceRect.normalized.width, 1, "FIT must retain the complete source.");

const stretched = resolveImagePlacementGeometry(intent("STRETCH"), 300, 400, 800, 400);
assert(stretched?.strategy === "stretch" && !stretched.preservesAspectRatio, "Only explicit STRETCH may distort aspect ratio.");

const cropTransform = [
  [0.5, 0, 0.25],
  [0, 1, 0],
];
const cropped = resolveImagePlacementGeometry(
  intent("CROP", {
    sourceTransform: cropTransform,
    activeCropTransform: cropTransform,
    transformApplicability: "active-crop",
  }),
  300,
  400,
  1500,
  1000,
);
assert(cropped?.strategy === "crop-transform", "An invertible CROP matrix should own placement.");
near(cropped.visibleSourceRect.normalized.x, 0.25, "CROP should retain the source-space translation.");
near(cropped.visibleSourceRect.normalized.width, 0.5, "CROP should retain the source-space crop width.");
near(cropped.destinationBounds.x, -150, "CROP should invert source translation into destination placement.");
near(cropped.destinationBounds.width, 600, "CROP should invert source scale into destination size.");
assert(cropped.preservesAspectRatio, "A source-faithful crop with matching physical scales should preserve aspect ratio.");

const resizedCrop = resolveImagePlacementGeometry(
  intent("CROP", {
    sourceTransform: cropTransform,
    activeCropTransform: cropTransform,
    transformApplicability: "active-crop",
  }),
  450,
  600,
  1500,
  1000,
);
near(resizedCrop?.visibleSourceRect.normalized.x ?? 0, 0.25, "Slot resize must not alter the source crop rectangle.");
near(resizedCrop?.destinationBounds.width ?? 0, 900, "Slot resize should recompute destination placement.");

const invalidCrop = resolveImagePlacementGeometry(
  intent("CROP", {
    sourceTransform: [[0, 0, 0], [0, 0, 0]],
    activeCropTransform: [[0, 0, 0], [0, 0, 0]],
    transformApplicability: "invalid",
  }),
  300,
  400,
  1500,
  1000,
);
assert(
  invalidCrop?.strategy === "fallback-cover" && Boolean(invalidCrop.fallbackReason),
  "An invalid CROP transform should use an explicit deterministic fallback.",
);

const legacyCompatibility = resolveImagePlacementGeometry(
  intent("FILL", {
    sourceTransform: [[0.5, 0, 0.25], [0, 1, 0]],
    transformApplicability: "compatibility-legacy-fill-transform",
    compatibilityCropZoom: 1.4,
    compatibilityCropAxis: "height",
  }),
  600,
  400,
  1200,
  800,
);
assert(
  legacyCompatibility?.strategy === "compatibility-legacy-fill-transform" &&
    Boolean(legacyCompatibility.fallbackReason),
  "Compatibility-owned fixed FILL should remain explicit and geometrically reportable.",
);
near(legacyCompatibility?.destinationBounds.height ?? 0, 560, "Compatibility crop geometry should reproduce the legacy CSS background size.");

const fractional = resolveImagePlacementGeometry(intent("FILL"), 333.25, 197.5, 1024, 683);
assert(
  fractional?.destinationBounds.width !== Math.round(fractional?.destinationBounds.width ?? 0),
  "Fractional slot geometry should remain fractional rather than being rounded early.",
);

console.log("Resolved image placement tests passed.");
