import { createNowHiringResponsiveReflowFixture } from "../fixtures/nowHiringResponsiveReflow";
import { createCanonicalSceneGraph } from "../scene/createCanonicalSceneGraph";
import { compareSettlementToMeasurements } from "./compareSettlement";
import { createDependencyGraph } from "./createDependencyGraph";
import { invalidateDependencyGraph } from "./invalidateDependencyGraph";
import { createMeasurementSnapshot, publishMeasurementSnapshot } from "./measurement";
import { normalizeDependencyGraph, normalizeMeasurementSnapshot, normalizeSettledSceneGraph, serializeSettlementValue, settlementTrace } from "./serializeSettlement";
import { settleSceneGraph } from "./settleSceneGraph";
import type { MeasurementRecordV1, RevisionVectorV1 } from "./types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packageValue = createNowHiringResponsiveReflowFixture();
const scene = createCanonicalSceneGraph(packageValue, { basePackage: packageValue }).graph;
const fixture = { id: "now-hiring-contract-test", zipSha256: "a".repeat(64) };
const revision: RevisionVectorV1 = { package: 1, scene: 1, overrides: 0, fonts: 1, assets: 1, container: 1, epoch: 1 };
const dependencies = createDependencyGraph(scene, fixture);
assert(dependencies.vertices.length > scene.nodeOrder.length, "dependency graph must represent property-level vertices");
assert(dependencies.edges.some((edge) => edge.kind === "sibling-layout"), "Auto Layout siblings must have explicit dependencies");
assert(dependencies.edges.some((edge) => edge.kind === "media-placement"), "image placement must depend on slot and asset state");
assert(serializeSettlementValue(normalizeDependencyGraph(dependencies)) === serializeSettlementValue(normalizeDependencyGraph(createDependencyGraph(scene, fixture))), "dependency graph must serialize deterministically");

const invalidation = invalidateDependencyGraph(dependencies, [{ type: "property-change", nodeId: "headline", property: "text.characters" }]);
assert(invalidation.affectedKeys.includes("node:headline:measure.text"), "text edits must invalidate text measurement");
assert(invalidation.affectedNodeIds.includes("footer"), "HUG ancestors must invalidate after text geometry changes");
assert(invalidation.affectedNodeIds.includes("subtext"), "Auto Layout siblings must invalidate after text geometry changes");
assert(invalidation.exportReadinessInvalidated, "geometry/diagnostic changes must invalidate export readiness");
assert(!invalidation.usedFullTreeFallback, "known text edits must remain dependency-scoped");
const unknownInvalidation = invalidateDependencyGraph(dependencies, [{ type: "unknown", source: "future-variable-kind" }]);
assert(unknownInvalidation.usedFullTreeFallback && unknownInvalidation.affectedNodeIds.length === scene.nodeOrder.length, "unknown inputs must fail safe with full-tree invalidation");

const records: MeasurementRecordV1[] = scene.nodeOrder.flatMap((nodeId) => {
  const node = scene.nodes[nodeId];
  const values: MeasurementRecordV1[] = [{
    id: `${nodeId}:bounds`, nodeId, property: "bounds", value: node.geometry.relativeBounds.value, unit: "scene-px", coordinateSpace: "scene", source: "synthetic-test", dependencies: [`node:${nodeId}:semantic`], readiness: "ready", valid: true, confidence: "high", approximation: null,
  }];
  if (node.text) values.push({
    id: `${nodeId}:text-box`, nodeId, property: "text-box", value: { width: node.geometry.relativeBounds.value.width, height: node.geometry.relativeBounds.value.height, scrollWidth: node.geometry.relativeBounds.value.width, scrollHeight: node.geometry.relativeBounds.value.height }, unit: "scene-px", coordinateSpace: "element", source: "synthetic-test", dependencies: [`node:${nodeId}:text.characters`, `node:${nodeId}:text.style`], readiness: "ready", valid: true, confidence: "medium", approximation: "synthetic fixture measurement",
  });
  if (node.media) values.push({
    id: `${nodeId}:intrinsic`, nodeId, property: "intrinsic-image", value: { width: node.media.intrinsicSize.width, height: node.media.intrinsicSize.height }, unit: "pixels", coordinateSpace: "intrinsic", source: "fixture-metadata", dependencies: node.media.assetId.value ? [`asset:${node.media.assetId.value}:state`] : [], readiness: "ready", valid: true, confidence: "high", approximation: null,
  });
  return values;
});
const measurements = createMeasurementSnapshot({
  fixture, surface: "synthetic", environmentProfile: "synthetic-test", revision, records,
  readiness: { fonts: "ready", assets: "ready", geometryStable: true, framesObserved: 3 },
  provenance: { route: null, rendererMode: null, captureRunId: "volatile-run" }, capturedAt: "2026-07-13T00:00:00.000Z",
});
assert(publishMeasurementSnapshot(measurements, revision).accepted, "current measurement revisions must publish");
const stale = structuredClone(measurements);
stale.revision.overrides = 0;
assert(!publishMeasurementSnapshot(stale, { ...revision, overrides: 1 }).accepted, "stale override measurements must be rejected");
const staleFallbackFont = structuredClone(measurements);
staleFallbackFont.revision.fonts = revision.fonts;
assert(!publishMeasurementSnapshot(staleFallbackFont, { ...revision, fonts: revision.fonts + 1 }).accepted, "fallback measurements from before exact-font activation must be rejected");
const future = structuredClone(measurements);
future.revision.assets = 2;
assert(!publishMeasurementSnapshot(future, revision).accepted, "future asset measurements must be rejected until the input revision advances");

const settled = settleSceneGraph({ schemaVersion: "settlement-input-v1", fixture, surface: "synthetic", environmentProfile: "synthetic-test", scene, dependencies, measurements, revision });
assert(settled.compatibility.runtimeUse === "disabled-observational", "settlement must remain observational in Milestone 3");
assert(settled.stable, "observed geometry must settle deterministically");
assert(settled.nodes["product-image"].mediaPlacement?.preserveAspectRatio === true, "FILL placement must preserve aspect ratio");
assert(settled.nodes["product-image"].mediaPlacement?.sourceCrop !== null, "FILL placement must retain an explicit crop model");
assert(settled.nodes.headline.textMeasurement?.height === scene.nodes.headline.geometry.relativeBounds.value.height, "text measurements must flow into settled evidence");
assert(compareSettlementToMeasurements(settled, measurements).equivalentWithinTolerance, "settled observed bounds must compare to measurements independently");

const normalizedMeasurements = normalizeMeasurementSnapshot(measurements);
assert(normalizedMeasurements.capturedAt === null && normalizedMeasurements.provenance.captureRunId === null, "comparison-critical measurement snapshots must remove run IDs and timestamps");
const normalizedSettled = normalizeSettledSceneGraph(settled);
assert(normalizedSettled.performance.settlementMs === 0, "comparison-critical settled snapshots must normalize wall time");
assert(serializeSettlementValue(normalizedSettled) === serializeSettlementValue(normalizeSettledSceneGraph(settleSceneGraph({ schemaVersion: "settlement-input-v1", fixture, surface: "synthetic", environmentProfile: "synthetic-test", scene, dependencies, measurements, revision }))), "settlement must be deterministic after performance normalization");
assert(JSON.stringify(settlementTrace(settled)).includes("settlement-trace-v1"), "settlement trace must be machine-readable");

console.log("Dependency, measurement and settlement contract tests passed.");
