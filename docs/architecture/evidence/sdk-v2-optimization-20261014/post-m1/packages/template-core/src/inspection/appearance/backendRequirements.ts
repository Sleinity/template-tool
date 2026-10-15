import type { AppearanceBackendRequirementV1, AppearanceSourceSufficiencyRecordV1 } from "./types";

export function createAppearanceBackendRequirements(
  sufficiency: AppearanceSourceSufficiencyRecordV1[],
): AppearanceBackendRequirementV1[] {
  const level = (family: AppearanceSourceSufficiencyRecordV1["family"]) => sufficiency.find((item) => item.family === family)?.level ?? "absent";
  return [
    { capability: "image-fit-crop-focal", preferredBackend: "dom-svg-css", viableBackends: ["dom-svg-css", "canvas-2d", "webgl"], currentBackend: "dom-svg-css", sourceSufficiency: level("media"), reason: "Existing object-fit and clip semantics are adequate for current image evidence.", fallback: "Preserve source placement and diagnose unsupported TILE or adjustment semantics." },
    { capability: "semantic-shapes-and-vector-paths", preferredBackend: "dom-svg-css", viableBackends: ["dom-svg-css", "canvas-2d", "webgl", "raster-fallback"], currentBackend: "dom-svg-css", sourceSufficiency: level("geometry"), reason: "SVG preserves path geometry and stacking without committing to an offscreen backend.", fallback: "Use an explicit raster fallback only when retained source evidence cannot be expressed safely." },
    { capability: "ordered-paint-and-stroke-stacks", preferredBackend: "dom-svg-css", viableBackends: ["dom-svg-css", "canvas-2d", "webgl", "raster-fallback"], currentBackend: "dom-svg-css", sourceSufficiency: level("paints"), reason: "The contract preserves paint order independently of the eventual implementation.", fallback: "Preserve unsupported paints and report the first unrendered source index." },
    { capability: "mask-graph", preferredBackend: "dom-svg-css", viableBackends: ["dom-svg-css", "canvas-2d", "webgl", "raster-fallback"], currentBackend: "unresolved", sourceSufficiency: level("masks"), reason: "Backend selection is blocked until sibling ranges and nested semantics are sourced.", fallback: "Retain mask evidence and keep the compatibility subtree or reviewed raster fallback." },
    { capability: "ordered-effects-and-compositing", preferredBackend: "unresolved", viableBackends: ["dom-svg-css", "canvas-2d", "webgl", "raster-fallback"], currentBackend: "unresolved", sourceSufficiency: level("effects"), reason: "Blur and blend fidelity must be fixture-led; no Canvas or WebGL commitment is justified yet.", fallback: "Preserve effect order, diagnose unsupported semantics, and retain compatibility rendering." },
  ];
}
