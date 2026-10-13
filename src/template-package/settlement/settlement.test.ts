import { createNowHiringResponsiveReflowFixture } from "../fixtures/nowHiringResponsiveReflow";
import { createCanonicalSceneGraph } from "../scene/createCanonicalSceneGraph";
import { compareSettlementToMeasurements } from "./compareSettlement";
import { createDependencyGraph } from "./createDependencyGraph";
import { invalidateDependencyGraph } from "./invalidateDependencyGraph";
import { createMeasurementSnapshot, publishMeasurementSnapshot } from "./measurement";
import { normalizeDependencyGraph, normalizeMeasurementSnapshot, normalizeSettledSceneGraph, serializeSettlementValue, settlementTrace } from "./serializeSettlement";
import { settleSceneGraph } from "./settleSceneGraph";
import type { MeasurementRecordV1, RevisionVectorV1 } from "./types";
import simpleFixedPoster from "../fixtures/simple-fixed-poster.json";
import type { TemplateNode, TemplatePackageV1 } from "../types";
import { resolvePackageMaskRelationships } from "../masks/packageMaskRelationships";
import type { PackageMaskResolution } from "../../../packages/template-core/src/masks/packageMaskRelationships";

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
for (const kind of ["single", "family"]) {
  const firstRoute = { ...measurements, provenance: { ...measurements.provenance, route: `/templates/${kind}%3Astudio-first/output` } };
  const secondRoute = { ...measurements, provenance: { ...measurements.provenance, route: `/templates/${kind}:studio-second/output` } };
  assert(serializeSettlementValue(normalizeMeasurementSnapshot(firstRoute)) === serializeSettlementValue(normalizeMeasurementSnapshot(secondRoute)), "volatile output-route template IDs must not create cross-run settlement differences");
  assert(normalizeMeasurementSnapshot(firstRoute).provenance.route === `/templates/${kind}:templateId/output`, "route normalization must retain template kind and output surface");
}
const normalizedSettled = normalizeSettledSceneGraph(settled);
assert(normalizedSettled.performance.settlementMs === 0, "comparison-critical settled snapshots must normalize wall time");
assert(serializeSettlementValue(normalizedSettled) === serializeSettlementValue(normalizeSettledSceneGraph(settleSceneGraph({ schemaVersion: "settlement-input-v1", fixture, surface: "synthetic", environmentProfile: "synthetic-test", scene, dependencies, measurements, revision }))), "settlement must be deterministic after performance normalization");
assert(JSON.stringify(settlementTrace(settled)).includes("settlement-trace-v1"), "settlement trace must be machine-readable");

function maskFixture(): TemplatePackageV1 {
  const value = structuredClone(simpleFixedPoster) as unknown as TemplatePackageV1;
  const root = value.nodes.root;
  const source = structuredClone(root) as TemplateNode;
  source.id = "source:mask";
  source.type = "RECTANGLE";
  source.parentId = "root";
  source.children = [];
  source.positioning.mode = "ABSOLUTE";
  source.bounds = { absolute: { x: 0, y: 0, width: 100, height: 100 }, relative: { x: 0, y: 0, width: 100, height: 100 } };
  source.sizing = { horizontal: { mode: "FIXED", value: 100 }, vertical: { mode: "FIXED", value: 100 } };
  source.mask = { isMask: true, maskType: "ALPHA" };
  source.appearance.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1 }];
  const affected = structuredClone(source);
  affected.id = "affected:content";
  affected.mask = { isMask: false, maskType: "ALPHA" };
  affected.bounds = { absolute: { x: -10, y: -20, width: 150, height: 140 }, relative: { x: -10, y: -20, width: 150, height: 140 } };
  const unrelated = structuredClone(affected);
  unrelated.id = "unrelated:content";
  root.children = [unrelated.id, source.id, affected.id];
  value.nodes = { root, [source.id]: source, [affected.id]: affected, [unrelated.id]: unrelated };
  value.editableFields = [];
  value.editableFieldOrder = [];
  value.maskRelationships = [{ maskSourceId: source.id, parentId: "root", affectedSiblingIds: [affected.id], scopeTerminationReason: "end_of_siblings" }];
  return value;
}

function settleMask(value: TemplatePackageV1, maskResolution: PackageMaskResolution | undefined = resolvePackageMaskRelationships(value)) {
  const graph = createCanonicalSceneGraph(value).graph;
  const graphDependencies = createDependencyGraph(graph, fixture);
  const snapshot = createMeasurementSnapshot({
    ...measurements, records: graph.nodeOrder.map((id) => ({
      id: `${id}:bounds`, nodeId: id, property: "bounds", value: graph.nodes[id].geometry.relativeBounds.value,
      unit: "scene-px", coordinateSpace: "scene", source: "synthetic-test", dependencies: [`node:${id}:semantic`],
      readiness: "ready", valid: true, confidence: "high", approximation: null,
    })),
  });
  const input = { schemaVersion: "settlement-input-v1" as const, fixture, surface: "synthetic", environmentProfile: "synthetic-test" as const, scene: graph, dependencies: graphDependencies, measurements: snapshot, revision, maskResolution };
  return { graph, graphDependencies, input, result: settleSceneGraph(input) };
}
const masked = maskFixture();
const exact = settleMask(masked);
assert(exact.result.readiness === "ready" && exact.result.unresolvedDependencies.length === 0, "existing exact mask authority must resolve observational range readiness");
assert(exact.result.nodes["source:mask"].mask.status === "resolved" && exact.result.nodes["affected:content"].mask.status === "resolved", "source and affected nodes must share exact range evidence");
assert(exact.result.nodes["unrelated:content"].mask.status === "not-applicable", "maskType alone cannot classify an active mask");
const maskEvidence = exact.result.nodes["source:mask"].mask.relationships![0];
assert(JSON.stringify(maskEvidence.affected[0].clipInsets) === JSON.stringify({ top: 20, right: 40, bottom: 20, left: 10 }), "observational evidence must retain authoritative canonical clip insets");
assert(maskEvidence.maskRevision === exact.graph.maskRelationships![0].maskRevision && maskEvidence.provenance.sourcePath === "maskRelationships.0", "mask revision and source provenance must survive projection");
const sourceBefore = JSON.stringify(masked);
const repeated = settleMask(masked);
assert(JSON.stringify(masked) === sourceBefore && serializeSettlementValue(normalizeSettledSceneGraph(repeated.result)) === serializeSettlementValue(normalizeSettledSceneGraph(exact.result)), "mask settlement must be immutable and repeatable");
assert(JSON.stringify(exact.result.compatibility) === JSON.stringify(settled.compatibility), "resolved observation must not promote production authority");
for (const [nodeId, property] of [["source:mask", "appearance.fills"], ["source:mask", "transform"], ["root", "children"], ["affected:content", "bounds"]]) {
  const trace = invalidateDependencyGraph(exact.graphDependencies, [{ type: "property-change", nodeId, property }]);
  assert(trace.affectedKeys.includes("node:source:mask:mask-range") && trace.affectedKeys.includes("node:affected:content:clip-mask-effect") && trace.exportReadinessInvalidated, "mask input, order and affected geometry must invalidate range, clip and export evidence");
  assert(trace.affectedNodeIds.includes("source:mask") && trace.affectedNodeIds.includes("affected:content") && !trace.affectedNodeIds.includes("source"), "dependency metadata must preserve full colon-containing IDs");
  if (nodeId !== "root") assert(!trace.affectedNodeIds.includes("unrelated:content") && !trace.usedFullTreeFallback, "supported mask inputs must remain scoped to the declared range");
}
assert(invalidateDependencyGraph(exact.graphDependencies, [{ type: "property-change", nodeId: "source:mask", property: "unknown.future.paint" }]).usedFullTreeFallback, "an unmapped property cannot silently retain stale mask evidence");
const missingEvidence = settleSceneGraph({ ...exact.input, maskResolution: undefined });
assert(missingEvidence.readiness === "pending-measurements" && missingEvidence.nodes["source:mask"].mask.status === "unresolved", "absent source resolution must retain conservative unresolved behavior");
for (const change of ["partial-alpha", "luminance", "skew", "orphan", "termination", "overlap"] as const) {
  const value = maskFixture();
  if (change === "partial-alpha") value.nodes["source:mask"].appearance.fills[0].opacity = 0.5;
  if (change === "luminance") value.nodes["source:mask"].mask!.maskType = "LUMINANCE";
  if (change === "skew") value.nodes["source:mask"].extensions = { figma: { relativeTransform: [[1, 0.1, 0], [0, 1, 0]] } };
  if (change === "orphan") delete value.maskRelationships;
  if (change === "termination") value.maskRelationships![0].scopeTerminationReason = "next_mask";
  if (change === "overlap") value.maskRelationships!.push(structuredClone(value.maskRelationships![0]));
  const outcome = settleMask(value).result;
  assert(outcome.readiness === "pending-measurements" && outcome.nodes["source:mask"].mask.status === "unresolved", `${change} masks must remain explicit unresolved evidence`);
}
const edited = maskFixture();
edited.nodes["source:mask"].bounds.relative.width = 80;
const resized = settleMask(edited);
assert(resized.result.nodes["source:mask"].mask.relationships![0].affected[0].clipInsets.right === 60 && resized.result.nodes["source:mask"].mask.relationships![0].maskRevision !== maskEvidence.maskRevision, "source resize must rederive clip and revision through existing authority");
assert(settleMask(edited, resolvePackageMaskRelationships(masked)).result.readiness === "pending-measurements", "an old source resolution cannot settle a newer scene mask revision");
const affectedResize = maskFixture();
affectedResize.nodes["affected:content"].bounds.relative.height = 160;
assert(settleMask(affectedResize, resolvePackageMaskRelationships(masked)).result.readiness === "pending-measurements", "stale affected insets must be rejected even when source mask revision did not change");
const badScene = structuredClone(exact.input);
badScene.scene.maskRelationships![0].parentId = "affected:content";
assert(settleSceneGraph(badScene).readiness === "pending-measurements", "cross-parent scene/resolution mismatches must not resolve");
const staleMaskMeasurement = structuredClone(exact.input);
staleMaskMeasurement.revision.package++;
let rejectedMaskMeasurement = false;
try { settleSceneGraph(staleMaskMeasurement); } catch { rejectedMaskMeasurement = true; }
assert(rejectedMaskMeasurement, "mask settlement must retain exact measurement revision rejection");

console.log("Dependency, measurement and settlement contract tests passed.");
