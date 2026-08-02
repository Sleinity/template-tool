import { createNowHiringResponsiveReflowFixture } from "../../../src/template-package/fixtures/nowHiringResponsiveReflow";
import { createCircularFillInsideHugFixture } from "../../../src/template-package/fixtures/circularFillInsideHug";
import { createCanonicalSceneGraph, serializeCanonicalSceneGraph } from "@sleinity/template-core";
import { createCoreLayoutRoute } from "../src/internal/runtime-routing/createCoreLayoutRoute";
import { CORE_LAYOUT_PROPERTY_OWNERSHIP } from "../src/internal/runtime-routing/propertyOwnership";
import { settleCoreLayout } from "../src/internal/runtime-routing/settleCoreLayout";
import {
  applyVerticalTrimCompatibilityRoute,
  isCapTrimGlyphPlacementValid,
  resolveCapToBaselineTextBox,
  resolveCapTrimGlyphOrigin,
  resolveVerticalTextPaintPlacement,
  resolveVerticalTextTrimMode,
} from "../src/internal/runtime-routing/verticalTextTrim";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packageValue = createNowHiringResponsiveReflowFixture();
const scene = createCanonicalSceneGraph(packageValue, { basePackage: packageValue }).graph;
assert(scene.nodes.headline.text?.leadingTrim.value === "CAP_HEIGHT" && scene.nodes.headline.text.leadingTrim.authority === "canonical-package", "Canonical scene text must preserve CAP_HEIGHT source authority.");
assert(serializeCanonicalSceneGraph(scene).includes('"leadingTrim"') && serializeCanonicalSceneGraph(scene).includes('"CAP_HEIGHT"'), "Canonical scene serialization must retain vertical-trim semantics.");
const extensionOnlyPackage = structuredClone(packageValue);
const extensionOnlyHeadline = extensionOnlyPackage.nodes.headline;
if (extensionOnlyHeadline.type !== "TEXT" || !("characters" in extensionOnlyHeadline.text)) throw new Error("Trim fixture requires detailed text.");
delete extensionOnlyHeadline.text.leadingTrim;
extensionOnlyHeadline.extensions = { figma: { ...(extensionOnlyHeadline.extensions?.figma as Record<string, unknown> ?? {}), leadingTrim: "CAP_HEIGHT" } };
const extensionOnlyScene = createCanonicalSceneGraph(extensionOnlyPackage).graph;
assert(extensionOnlyScene.nodes.headline.text?.leadingTrim.value === "CAP_HEIGHT" && extensionOnlyScene.nodes.headline.text.leadingTrim.authority === "figma-extension", "Older packages must retain a provenance-marked raw Figma trim fallback.");
const route = createCoreLayoutRoute(scene);
assert(route.routedNodeIds.includes(scene.rootNodeId), `The supported non-wrapping Auto Layout root should route by capability: ${JSON.stringify(route.nodes[scene.rootNodeId])}`);
assert(CORE_LAYOUT_PROPERTY_OWNERSHIP.some((entry) => entry.property === "text.intrinsic" && entry.supportedRoute === "intrinsic-measurement-input"), "The browser boundary must be explicit.");
assert(resolveVerticalTextTrimMode("CAP_HEIGHT") === "cap-height-to-baseline", "Canonical CAP_HEIGHT must map explicitly to cap-to-baseline semantics.");
assert(resolveVerticalTextTrimMode("future-trim") === "unsupported", "Unknown trim modes must not be guessed.");
assert(resolveCapToBaselineTextBox({ capHeightPx: 28, lineHeightPx: 48, renderedLineCount: 3 }) === 124, "Multiline trim height must retain baseline spacing while excluding outer leading and descent.");
const glyphOrigin = resolveCapTrimGlyphOrigin({ firstLineCapTopPx: 10, baselinePx: 38, lineHeightPx: 48, renderedLineCount: 3 });
assert(glyphOrigin.translationY === -10 && glyphOrigin.resolvedFirstCapTopY === 0 && glyphOrigin.resolvedFinalBaselineY === 124, "Glyph origin must map first cap top to zero and final baseline to the semantic height.");
assert(resolveVerticalTextPaintPlacement({ authoritativeTrim: true, sizingMode: "HUG", verticalAlignment: "CENTER" }).alignmentMode === "hug-trim-origin", "HUG CAP_HEIGHT text must bypass vertical centring.");
assert(resolveVerticalTextPaintPlacement({ authoritativeTrim: true, sizingMode: "HUG", verticalAlignment: "BOTTOM" }).justifyContent === "flex-start", "HUG CAP_HEIGHT text must bypass bottom alignment.");
assert(resolveVerticalTextPaintPlacement({ authoritativeTrim: true, sizingMode: "FIXED", verticalAlignment: "CENTER" }).justifyContent === "center", "Fixed CAP_HEIGHT text must align its semantic content box inside the larger fixed box.");
assert(resolveVerticalTextPaintPlacement({ authoritativeTrim: false, sizingMode: "HUG", verticalAlignment: "CENTER" }).justifyContent === "center", "Non-trim text must preserve existing vertical alignment.");
assert(isCapTrimGlyphPlacementValid(glyphOrigin, 124), "The source-derived glyph origin must satisfy both semantic edges.");
assert(!isCapTrimGlyphPlacementValid({ ...glyphOrigin, resolvedFirstCapTopY: 14, resolvedFinalBaselineY: 138 }, 124), "A centred glyph layer must fail even when semantic height is correct.");

const revision = "package-a|fonts-1|assets-1";
const measurement = (
  nodeId: string,
  width: number,
  height: number,
  lineCount: number,
  capHeight: number,
) => ({
  nodeId,
  width,
  height,
  lineCount,
  capHeight,
  verticalTrim: "cap-height-to-baseline" as const,
  trimAuthority: "authoritative" as const,
  fontState: "exact" as const,
  fontIdentity: { family: "Fixture Sans", weight: 500, style: "normal" },
  fontMetrics: {
    ascent: 80,
    descent: 20,
    capHeight,
    baseline: capHeight,
    lineHeight: 48,
    firstLineCapTop: 0,
    finalLineBaseline: height,
  },
  glyphOrigin: {
    browserLineBoxOriginY: 0,
    capTopFromBrowserOrigin: 0,
    baselineFromBrowserOrigin: capHeight,
    translationY: 0,
    resolvedFirstCapTopY: 0,
    resolvedFinalBaselineY: height,
  },
  boxes: {
    layout: { width, height },
    browserLine: { width, height: lineCount * 48 },
    figmaTrimmed: { width, height },
    glyphPaint: { top: 0, bottom: height + 8 },
    clipping: { width, height, active: false },
  },
  metricSource: "canvas-and-dom-calibration" as const,
  revision,
});
const measurements = [
  measurement("headline", 920, 144, 2, 70),
  measurement("subtext", 920, 96, 2, 30),
];
const pendingTrimRoute = applyVerticalTrimCompatibilityRoute(scene, route, {});
assert(pendingTrimRoute.routedNodeIds.length === 0 && pendingTrimRoute.fallbackBoundaries.some((boundary) => boundary.reasonCodes.some((reason) => reason.startsWith("text-trim-measurement-pending"))), "A missing trim measurement must select a coherent compatibility route.");
const exactTrimRoute = applyVerticalTrimCompatibilityRoute(scene, route, Object.fromEntries(measurements.map((item) => [item.nodeId, item])));
assert(exactTrimRoute.routedNodeIds.length === route.routedNodeIds.length, "Current exact trim measurements must restore the capability route.");
const fallbackMeasurement = { ...measurements[0], fontState: "fallback" as const, trimAuthority: "compatibility" as const, boxes: { ...measurements[0].boxes, figmaTrimmed: null } };
const fallbackTrimRoute = applyVerticalTrimCompatibilityRoute(scene, route, { headline: fallbackMeasurement, subtext: measurements[1] });
assert(fallbackTrimRoute.routedNodeIds.length === 0 && fallbackTrimRoute.fallbackBoundaries.some((boundary) => boundary.reasonCodes.some((reason) => reason.startsWith("text-trim-exact-font-unavailable"))), "Fallback-font trim measurements must not own routed geometry.");
const settled = settleCoreLayout({ scene, route, revision, textMeasurements: measurements });
assert(settled.readiness === "ready" && settled.stable, "Current intrinsic measurements should produce a stable ready settlement.");
assert(settled.nodes.footer.bounds.height > 0 && settled.nodes["product-image"].imageSlot !== null, "Text must propagate through HUG/FILL into the image slot.");
const stale = settleCoreLayout({ scene, route, revision: `${revision}|next`, textMeasurements: measurements });
assert(stale.readiness === "pending-measurements" && stale.diagnostics.some((item) => item.code === "runtime-routing.stale-measurement-rejected"), "Stale font measurements must be rejected.");
const wrapped = structuredClone(scene);
wrapped.nodes[wrapped.rootNodeId].layout.autoLayout.wrap.value = true;
const wrappedRoute = createCoreLayoutRoute(wrapped);
assert(!wrappedRoute.nodes[wrapped.rootNodeId].routed && wrappedRoute.nodes[wrapped.rootNodeId].reasonCodes.includes("layout-wrap-unsupported"), "Unsupported wrapping must select coherent compatibility routing.");
const absolute = structuredClone(scene);
absolute.nodes["product-image"].layout.positioning.value = "ABSOLUTE";
const absoluteRoute = createCoreLayoutRoute(absolute);
assert(!absoluteRoute.nodes["product-image"].routed && absoluteRoute.nodes.hero.routed, "Absolute children must form a compatibility boundary without disabling their safe flow parent.");

const circularPackage = createCircularFillInsideHugFixture();
const circular = createCanonicalSceneGraph(circularPackage, { basePackage: circularPackage }).graph;
const circularRoute = createCoreLayoutRoute(circular);
assert(
  circularRoute.circularDependencies.length === 1 &&
    circularRoute.circularDependencies[0].nodeId === "headline" &&
    circularRoute.circularDependencies[0].parentId === "footer" &&
    circularRoute.circularDependencies[0].axis === "vertical" &&
    circularRoute.circularDependencies[0].classification === "fill-inside-hug-main-axis",
  `FILL-inside-HUG cycles must be classified without inspecting fixture identity: ${JSON.stringify(circularRoute.circularDependencies)}`,
);
assert(
  !circularRoute.nodes.footer.routed &&
    circularRoute.nodes.headline.reasonCodes.includes("circular-fill-inside-hug-axis") &&
    circularRoute.circularDependencies[0].fallbackChain.join(",") === "headline,footer" &&
    circularRoute.fallbackBoundaries.length > 0,
  "A circular dependency must retain the compatibility subtree fallback rather than attempting settlement.",
);

console.log("Core layout authority and capability routing tests passed.");
