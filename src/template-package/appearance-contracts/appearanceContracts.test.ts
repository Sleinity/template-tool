import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import { createAppearanceContractProbe } from "../fixtures/appearanceContractProbe";
import type { TemplatePackageV1 } from "../types";
import { createCanonicalSceneGraph } from "../scene";
import { createAppearanceContractProjection } from "./createAppearanceContractProjection";
import { serializeAppearanceContractProjection } from "./serializeAppearanceContractProjection";
import { validateAppearanceContractProjection } from "./validateAppearanceContractProjection";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packageValue = figmaPluginV041 as unknown as TemplatePackageV1;
const scene = createCanonicalSceneGraph(packageValue).graph;
const first = createAppearanceContractProjection(scene);
const second = createAppearanceContractProjection(scene);
assert(serializeAppearanceContractProjection(first) === serializeAppearanceContractProjection(second), "Appearance projection must be deterministic for the same canonical scene.");
assert(validateAppearanceContractProjection(first).valid, "The registered source fixture must produce a valid appearance projection.");
assert(first.compatibility.runtimeUse === "disabled-observational" && first.compatibility.rendererAuthority === "unchanged" && !first.compatibility.pixelEquivalenceClaimed, "Appearance contracts must remain observational in Milestone 5.");
assert(first.media.some((item) => item.fitMode === "FILL" && item.preserveAspectRatio), "Media placement must preserve current FILL intent without choosing a new renderer backend.");
assert(first.paints.every((stack) => stack.paints.every((paint, index) => paint.sourceIndex === index)), "Paint stack source order must be explicit.");
assert(first.backendRequirements.some((item) => item.capability === "mask-graph" && item.currentBackend === "unresolved"), "Backend requirements must not silently select Canvas or WebGL for unresolved masks.");
assert(first.sourceSufficiency.some((item) => item.family === "effects"), "Source sufficiency must report absent families rather than omit them.");

const ordered = structuredClone(first);
if (ordered.paints[0]?.paints[0]) ordered.paints[0].paints[0].sourceIndex = 9;
assert(!validateAppearanceContractProjection(ordered).valid, "Paint reordering must fail validation even when pixels are not compared.");

const probe = createAppearanceContractProjection(createCanonicalSceneGraph(createAppearanceContractProbe()).graph);
assert(probe.paints.some((stack) => stack.paints.length === 3), "Exploratory source evidence must prove ordered multiple-paint preservation.");
assert(probe.strokes.some((stack) => stack.strokes.length === 2), "Exploratory source evidence must prove ordered multiple-stroke preservation.");
assert(probe.effects.some((stack) => stack.effects.map((effect) => effect.type).join(",") === "DROP_SHADOW,INNER_SHADOW,LAYER_BLUR"), "Exploratory source evidence must preserve effect order.");
assert(probe.masks.some((mask) => mask.isMask && mask.maskedSiblingRange === "unresolved"), "Mask contracts must expose unresolved sibling ranges rather than invent them.");
assert(probe.compositing.some((group) => group.blendMode === "MULTIPLY" && group.requiresOffscreenCompositing === "unresolved"), "Compositing contracts must defer backend authority.");

console.log("Appearance contract projection tests passed.");
