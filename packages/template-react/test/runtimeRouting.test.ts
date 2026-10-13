import { createNowHiringResponsiveReflowFixture } from "../../../src/template-package/fixtures/nowHiringResponsiveReflow";
import { createCircularFillInsideHugFixture } from "../../../src/template-package/fixtures/circularFillInsideHug";
import { createCanonicalSceneGraph, createResolvedRenderTree, serializeCanonicalSceneGraph } from "@sleinity/template-core";
import { createResolvedProductRenderIdentity } from "../src/render/productRenderIdentity";
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
  publicationGeneration: 0,
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
const compatibilityPackage = structuredClone(packageValue);
compatibilityPackage.nodes[compatibilityPackage.rootNodeId].layout.wrap = true;
const compatibilityScene = createCanonicalSceneGraph(compatibilityPackage).graph;
const compatibilityRoute = createCoreLayoutRoute(compatibilityScene);
const compatibilitySettlement = settleCoreLayout({
  scene: compatibilityScene,
  route: compatibilityRoute,
  revision: "compatibility-zero-route",
  textMeasurements: [],
});
assert(
  compatibilityRoute.routedNodeIds.length === 0 &&
    compatibilitySettlement.readiness === "unsupported",
  "The readiness regression fixture must exercise an expected zero-routed compatibility settlement.",
);
const compatibilityIdentity = createResolvedProductRenderIdentity({
  packageValue: compatibilityPackage,
  resolvedTree: createResolvedRenderTree(compatibilityPackage),
  runtime: {
    mode: "authoritative",
    canonicalRevision: "compatibility-canonical",
    revision: "compatibility-zero-route",
    publicationGeneration: 0,
    route: compatibilityRoute,
    preliminary: compatibilitySettlement,
    settled: compatibilitySettlement,
    textLineObservations: {},
    publishTextMeasurement() {},
    publishTextLineObservation() {},
  },
});
assert(
  compatibilityIdentity.readiness === "ready",
  "A zero-routed compatibility template must bypass inapplicable core-settlement readiness.",
);
const absolute = structuredClone(scene);
absolute.nodes["product-image"].layout.positioning.value = "ABSOLUTE";
const absoluteRoute = createCoreLayoutRoute(absolute);
assert(!absoluteRoute.nodes["product-image"].routed && absoluteRoute.nodes.hero.routed, "Absolute children must form a compatibility boundary without disabling their safe flow parent.");

function structuralLayoutPackage(
  direction: "VERTICAL" | "HORIZONTAL",
  options: { hugMain?: boolean; nestedMiddle?: boolean } = {},
) {
  const value = createNowHiringResponsiveReflowFixture();
  const root = value.nodes.root;
  const parent = value.nodes.footer;
  const sourceChild = value.nodes["product-image"];
  root.children = [parent.id];
  root.layout.mode = "NONE";
  parent.parentId = root.id;
  parent.children = ["a", "b", "c"];
  parent.layout.mode = direction;
  parent.layout.gap = 10;
  parent.layout.padding = { top: 5, right: 10, bottom: 5, left: 10 };
  parent.layout.primaryAlignment = "MIN";
  parent.layout.counterAlignment = "MIN";
  parent.sizing.horizontal = direction === "HORIZONTAL" && options.hugMain
    ? { mode: "HUG", value: null, min: null, max: null }
    : { mode: "FIXED", value: 300, min: null, max: null };
  parent.sizing.vertical = direction === "VERTICAL" && options.hugMain
    ? { mode: "HUG", value: null, min: null, max: null }
    : { mode: "FIXED", value: 200, min: null, max: null };
  parent.bounds.relative = { x: 0, y: 0, width: 300, height: 200 };
  parent.bounds.absolute = { ...parent.bounds.relative };
  const nodes = Object.fromEntries(["a", "b", "c"].map((id, index) => {
    const child = structuredClone(sourceChild);
    child.id = id;
    child.name = id.toUpperCase();
    child.parentId = parent.id;
    child.children = [];
    child.layout.mode = "NONE";
    child.layout.gap = 0;
    child.layout.padding = { top: 0, right: 0, bottom: 0, left: 0 };
    child.positioning = "FLOW";
    child.sizing.horizontal = { mode: "FIXED", value: 30 + index * 10, min: null, max: null };
    child.sizing.vertical = { mode: "FIXED", value: 20 + index * 10, min: null, max: null };
    child.bounds.relative = { x: 0, y: 0, width: 30 + index * 10, height: 20 + index * 10 };
    child.bounds.absolute = { ...child.bounds.relative };
    child.appearance.visible = true;
    delete child.image;
    return [id, child];
  }));
  if (options.nestedMiddle) {
    const nested = structuredClone(nodes.a);
    nested.id = "b-child";
    nested.name = "B child";
    nested.parentId = "b";
    nested.sizing.horizontal = { mode: "FIXED", value: 24, min: null, max: null };
    nested.sizing.vertical = { mode: "FIXED", value: 16, min: null, max: null };
    nested.bounds.relative = { x: 0, y: 0, width: 24, height: 16 };
    nested.bounds.absolute = { ...nested.bounds.relative };
    nodes.b.children = [nested.id];
    nodes.b.layout.mode = "VERTICAL";
    nodes.b.layout.padding = { top: 2, right: 2, bottom: 2, left: 2 };
    nodes.b.sizing.vertical = { mode: "HUG", value: null, min: null, max: null };
    nodes[nested.id] = nested;
  }
  value.nodes = { root, footer: parent, ...nodes };
  value.editableFields = [];
  return value;
}

const verticalPackage = structuralLayoutPackage("VERTICAL", { hugMain: true, nestedMiddle: true });
const verticalScene = createCanonicalSceneGraph(verticalPackage).graph;
const verticalRoute = createCoreLayoutRoute(verticalScene);
const verticalShown = settleCoreLayout({ scene: verticalScene, route: verticalRoute, revision: "vertical-shown" });
assert(verticalShown.nodes.footer.bounds.height === 110 && verticalShown.nodes.c.bounds.y === 65, "Visible vertical children must contribute their sizes and two gaps to HUG layout.");
verticalPackage.nodes.b.appearance.visible = false;
const verticalHiddenScene = createCanonicalSceneGraph(verticalPackage).graph;
const verticalHiddenRoute = createCoreLayoutRoute(verticalHiddenScene);
const verticalHidden = settleCoreLayout({ scene: verticalHiddenScene, route: verticalHiddenRoute, revision: "vertical-hidden" });
assert(
  verticalHiddenRoute.nodes.b.participation === "excluded-self" &&
    verticalHiddenRoute.nodes["b-child"].participation === "excluded-ancestor" &&
    verticalHidden.nodes.footer.bounds.height === 80 &&
    verticalHidden.nodes.c.bounds.y === 35 &&
    verticalHidden.nodes.b.textMeasurement === null &&
    verticalHidden.nodes.b.imageSlot === null,
  "A hidden middle subtree must close one vertical gap, shrink HUG, move following siblings, and publish no active geometry evidence.",
);
const hiddenExportTree = createResolvedRenderTree(verticalPackage);
hiddenExportTree.nodes.b.backendDecision.exportSafety = "blocked";
const hiddenExportIdentity = createResolvedProductRenderIdentity({
  packageValue: verticalPackage,
  resolvedTree: hiddenExportTree,
  runtime: {
    mode: "authoritative",
    canonicalRevision: "vertical-hidden",
    revision: "vertical-hidden",
    publicationGeneration: 1,
    route: verticalHiddenRoute,
    preliminary: verticalHidden,
    settled: verticalHidden,
    textLineObservations: {},
    publishTextMeasurement() {},
    publishTextLineObservation() {},
  },
});
assert(hiddenExportIdentity.exportSafety !== "blocked", "Dormant subtree backend diagnostics must not block active export safety.");
verticalPackage.nodes.a.appearance.visible = false;
verticalPackage.nodes.c.appearance.visible = false;
const emptyVerticalScene = createCanonicalSceneGraph(verticalPackage).graph;
const emptyVertical = settleCoreLayout({ scene: emptyVerticalScene, route: createCoreLayoutRoute(emptyVerticalScene), revision: "vertical-empty" });
assert(emptyVertical.nodes.footer.bounds.height === 10, "An empty HUG axis must resolve to padding-only size without phantom gaps.");

const horizontalPackage = structuralLayoutPackage("HORIZONTAL", { hugMain: true });
horizontalPackage.nodes.b.appearance.visible = false;
const horizontalScene = createCanonicalSceneGraph(horizontalPackage).graph;
const horizontalHidden = settleCoreLayout({ scene: horizontalScene, route: createCoreLayoutRoute(horizontalScene), revision: "horizontal-hidden" });
assert(horizontalHidden.nodes.footer.bounds.width === 110 && horizontalHidden.nodes.c.bounds.x === 50, "Horizontal structural exclusion must close the gap and recompute HUG width and sibling position.");

const multiTargetPackage = structuralLayoutPackage("VERTICAL", { hugMain: true });
multiTargetPackage.nodes.a.appearance.visible = false;
multiTargetPackage.nodes.c.appearance.visible = false;
const multiTargetScene = createCanonicalSceneGraph(multiTargetPackage).graph;
const multiTargetRoute = createCoreLayoutRoute(multiTargetScene);
const multiTargetHidden = settleCoreLayout({ scene: multiTargetScene, route: multiTargetRoute, revision: "multi-target-hidden" });
assert(
  multiTargetRoute.nodes.a.participation === "excluded-self" &&
    multiTargetRoute.nodes.c.participation === "excluded-self" &&
    multiTargetRoute.nodes.b.participation === "active" &&
    multiTargetHidden.nodes.footer.bounds.height === 40 &&
    multiTargetHidden.nodes.b.bounds.y === 5,
  "Multiple hidden target roots must exclude only their own subtrees while preserving an intervening sibling and its Auto Layout participation.",
);

const fillPackage = structuralLayoutPackage("HORIZONTAL");
fillPackage.nodes.a.sizing.horizontal = { mode: "FILL", value: null, min: null, max: null };
fillPackage.nodes.c.sizing.horizontal = { mode: "FILL", value: null, min: null, max: null };
const fillScene = createCanonicalSceneGraph(fillPackage).graph;
const fillShown = settleCoreLayout({ scene: fillScene, route: createCoreLayoutRoute(fillScene), revision: "fill-shown" });
assert(fillShown.nodes.a.bounds.width === 110 && fillShown.nodes.c.bounds.width === 110, "Visible fixed middle content must be removed from FILL distributable width.");
fillPackage.nodes.b.appearance.visible = false;
const fillHiddenScene = createCanonicalSceneGraph(fillPackage).graph;
const fillHidden = settleCoreLayout({ scene: fillHiddenScene, route: createCoreLayoutRoute(fillHiddenScene), revision: "fill-hidden" });
assert(fillHidden.nodes.a.bounds.width === 135 && fillHidden.nodes.c.bounds.width === 135 && fillHidden.nodes.c.bounds.x === 155, "Hiding the fixed middle child must redistribute current FILL space without stale widths.");

for (const alignment of ["MIN", "CENTER", "MAX", "STRETCH"] as const) {
  const alignedPackage = structuralLayoutPackage("VERTICAL");
  alignedPackage.nodes.footer.layout.counterAlignment = alignment;
  alignedPackage.nodes.b.appearance.visible = false;
  const alignedScene = createCanonicalSceneGraph(alignedPackage).graph;
  const aligned = settleCoreLayout({ scene: alignedScene, route: createCoreLayoutRoute(alignedScene), revision: `align-${alignment}` });
  const a = aligned.nodes.a.bounds;
  if (alignment === "MIN") assert(a.x === 10, "MIN alignment must survive exclusion.");
  if (alignment === "CENTER") assert(a.x === 135, "CENTER alignment must survive exclusion.");
  if (alignment === "MAX") assert(a.x === 260, "MAX alignment must survive exclusion.");
  if (alignment === "STRETCH") assert(a.x === 10 && a.width === 280, "STRETCH alignment must recompute the active child cross axis.");
}

const abaOldMeasurements = measurements.map((item) => ({ ...item, publicationGeneration: 7 }));
const abaRejected = settleCoreLayout({ scene, route, revision, publicationGeneration: 9, textMeasurements: abaOldMeasurements });
assert(
  abaRejected.readiness === "pending-measurements" &&
    abaRejected.measurementCount === 0 &&
    abaRejected.diagnostics.every((item) => item.code !== "runtime-routing.excluded-measurement-rejected") &&
    abaRejected.diagnostics.some((item) => item.code === "runtime-routing.stale-measurement-rejected"),
  "Delayed generation-N measurements must be rejected after true/false/true returns to the same semantic revision at generation N+2.",
);
const abaCurrent = settleCoreLayout({ scene, route, revision, publicationGeneration: 9, textMeasurements: measurements.map((item) => ({ ...item, publicationGeneration: 9 })) });
assert(abaCurrent.readiness === "ready" && abaCurrent.measurementCount === 2, "Readiness must wait for evidence from the current publication generation.");

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
