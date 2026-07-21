import { runTemplatePackageImportPipeline } from "../../src/template-package/import/runTemplatePackageImportPipeline";
import { createCanonicalSceneGraph } from "../../src/template-package/scene/createCanonicalSceneGraph";
import { compareSettlementToMeasurements } from "../../src/template-package/settlement/compareSettlement";
import { createDependencyGraph } from "../../src/template-package/settlement/createDependencyGraph";
import { invalidateDependencyGraph } from "../../src/template-package/settlement/invalidateDependencyGraph";
import { createMeasurementSnapshot } from "../../src/template-package/settlement/measurement";
import { normalizeDependencyGraph, normalizeMeasurementSnapshot, normalizeSettledSceneGraph, settlementTrace } from "../../src/template-package/settlement/serializeSettlement";
import { settleSceneGraph } from "../../src/template-package/settlement/settleSceneGraph";

const clock = () => typeof performance !== "undefined" ? performance.now() : Date.now();

function textCharacters(node) {
  if (!node || node.type !== "TEXT") return null;
  return "characters" in node.text ? node.text.characters : node.text.content;
}

function setTextCharacters(node, value) {
  if (!node || node.type !== "TEXT") throw new Error("Scenario text target is not a TEXT node.");
  if ("characters" in node.text) node.text.characters = value;
  else node.text.content = value;
}

function applyScenario(packageValue, scenario) {
  if (!scenario || scenario.id === "baseline") return { event: null, revisionChanges: {} };
  if (scenario.type === "text-edit") {
    const field = scenario.fieldId ? packageValue.editableFields.find((item) => item.id === scenario.fieldId) : packageValue.editableFields.find((item) => item.property === "text.characters");
    const nodeId = scenario.nodeId || field?.nodeId;
    if (!nodeId || !packageValue.nodes[nodeId]) throw new Error(`Scenario ${scenario.id} has no exact text target.`);
    const current = textCharacters(packageValue.nodes[nodeId]);
    setTextCharacters(packageValue.nodes[nodeId], scenario.value === "<clear>" ? String(field?.defaultValue ?? "") : scenario.value);
    return { event: { type: "property-change", nodeId, property: "text.characters" }, revisionChanges: { package: 1, overrides: 1 }, before: current, after: textCharacters(packageValue.nodes[nodeId]) };
  }
  if (scenario.type === "container-resize") {
    const root = packageValue.nodes[packageValue.rootNodeId];
    const ratio = scenario.width / packageValue.canvas.width;
    packageValue.canvas.width = scenario.width;
    root.bounds.absolute.width = scenario.width;
    root.bounds.relative.width = scenario.width;
    return { event: { type: "container-resize", nodeId: root.id }, revisionChanges: { package: 1, container: 1 }, ratio };
  }
  if (scenario.type === "font-state") return { event: { type: "font-state-change", fontId: scenario.fontId }, revisionChanges: { fonts: 1 } };
  if (scenario.type === "asset-state") return { event: { type: "asset-state-change", assetId: scenario.assetId }, revisionChanges: { assets: 1 } };
  throw new Error(`Unknown settlement scenario type ${scenario.type}.`);
}

function syntheticMeasurement(scene, fixture, surface, profile, revision) {
  const records = scene.nodeOrder.flatMap((nodeId) => {
    const node = scene.nodes[nodeId];
    const result = [{ id: `${nodeId}:bounds`, nodeId, property: "bounds", value: node.geometry.relativeBounds.value, unit: "scene-px", coordinateSpace: "scene", source: "synthetic-test", dependencies: [`node:${nodeId}:semantic`], readiness: "ready", valid: true, confidence: "medium", approximation: "canonical snapshot used because no browser observation was supplied" }];
    if (node.text) result.push({ id: `${nodeId}:text-box`, nodeId, property: "text-box", value: { width: node.geometry.relativeBounds.value.width, height: node.geometry.relativeBounds.value.height, scrollWidth: null, scrollHeight: null }, unit: "scene-px", coordinateSpace: "element", source: "synthetic-test", dependencies: [`node:${nodeId}:text.characters`, `node:${nodeId}:text.style`], readiness: "fallback", valid: true, confidence: "low", approximation: "canonical text bounds; not DOM measurement" });
    if (node.media) result.push({ id: `${nodeId}:intrinsic`, nodeId, property: "intrinsic-image", value: node.media.intrinsicSize, unit: "pixels", coordinateSpace: "intrinsic", source: "fixture-metadata", dependencies: node.media.assetId.value ? [`asset:${node.media.assetId.value}:state`] : [], readiness: node.media.intrinsicSize.width ? "ready" : "fallback", valid: true, confidence: node.media.intrinsicSize.width ? "high" : "low", approximation: node.media.intrinsicSize.width ? null : "intrinsic size unavailable" });
    return result;
  });
  return createMeasurementSnapshot({ fixture, surface, environmentProfile: profile, revision, records, readiness: { fonts: "pending", assets: "pending", geometryStable: true, framesObserved: null }, provenance: { route: null, rendererMode: null, captureRunId: null }, capturedAt: null });
}

export async function resolveFixtureSettlement(bytes, sourceName, fixture, observation, scenario = null) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const buffer = array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
  const importStart = clock();
  const imported = await runTemplatePackageImportPipeline({ format: "zip", buffer, sourceName });
  const importMs = clock() - importStart;
  if (!imported.package || !imported.validation?.valid) throw new Error(`Settlement fixture import failed: ${imported.validation?.diagnostics?.map((item) => item.message).join("; ") || "no canonical package"}`);
  const basePackage = structuredClone(imported.package);
  const scenarioResult = applyScenario(imported.package, scenario);
  const revision = { package: 1 + (scenarioResult.revisionChanges.package || 0), scene: 1, overrides: scenarioResult.revisionChanges.overrides || 0, fonts: 1 + (scenarioResult.revisionChanges.fonts || 0), assets: 1 + (scenarioResult.revisionChanges.assets || 0), container: 1 + (scenarioResult.revisionChanges.container || 0), epoch: 1 };
  const sceneStart = clock();
  const scene = createCanonicalSceneGraph(imported.package, { basePackage }).graph;
  const sceneMs = clock() - sceneStart;
  const dependencyStart = clock();
  const dependencies = createDependencyGraph(scene, fixture);
  const dependencyMs = clock() - dependencyStart;
  const profile = observation?.environmentProfile || "synthetic-test";
  const measurements = observation ? createMeasurementSnapshot({ ...observation, fixture, revision }) : syntheticMeasurement(scene, fixture, scenario?.id || "synthetic", profile, revision);
  const settlementStart = clock();
  const settled = settleSceneGraph({ schemaVersion: "settlement-input-v1", fixture, surface: measurements.surface, environmentProfile: profile, scene, dependencies, measurements, revision });
  const settlementMs = clock() - settlementStart;
  if (scenarioResult.event) settled.invalidation = invalidateDependencyGraph(dependencies, [scenarioResult.event]);
  const comparison = compareSettlementToMeasurements(settled, measurements);
  return {
    scene,
    dependencies: normalizeDependencyGraph(dependencies),
    measurements: normalizeMeasurementSnapshot(measurements),
    settled: normalizeSettledSceneGraph(settled),
    trace: settlementTrace(settled),
    comparison,
    scenario: scenario ? { definition: scenario, result: scenarioResult } : null,
    performance: { importMs, sceneMs, dependencyMs, settlementMs, inputZipBytes: array.byteLength, sceneBytes: new TextEncoder().encode(JSON.stringify(scene)).byteLength, dependencyBytes: new TextEncoder().encode(JSON.stringify(dependencies)).byteLength, settledBytes: new TextEncoder().encode(JSON.stringify(settled)).byteLength, approximateHeapUsedBytes: typeof process !== "undefined" ? process.memoryUsage().heapUsed : null },
  };
}
