import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { repoRoot, safeSegment, stableStringify } from "../fidelity/core.mjs";

export const settlementRoot = join(repoRoot, "fidelity", "settlement");
export const approvedSettlementRoot = join(settlementRoot, "snapshots", "approved");
export const settlementFiles = ["dependency.json", "measurements.json", "settled.json", "trace.json", "comparison.json"];

export function settlementSnapshotDirectory(root, fixtureId, surface) {
  return join(resolve(root), safeSegment(fixtureId), safeSegment(surface));
}

export function requireSettlementUpdateReason(reason) {
  if (!reason || String(reason).trim().length < 12) throw new Error("Settlement snapshot update requires a developer-supplied reason of at least 12 characters.");
  return String(reason).trim();
}

function assetReady(structure) {
  const images = structure.assetReadiness?.images ?? [];
  const backgrounds = structure.assetReadiness?.backgrounds ?? [];
  if (images.some((item) => !item.ready) || backgrounds.some((item) => !item.ready)) return "failed";
  return "ready";
}

export function observationFromStructure(fixture, structure, { profile, fidelityRun }) {
  if (structure.fixtureId !== fixture.id || structure.fixtureHashes?.zipSha256 !== fixture.zipSha256) throw new Error(`Structure report identity/hash mismatch for ${fixture.id}/${structure.surface}.`);
  if (structure.rootNodeId !== fixture.rootNodeId || structure.rootDimensions?.width !== fixture.canvas.width || structure.rootDimensions?.height !== fixture.canvas.height) throw new Error(`Structure report root identity/dimensions mismatch for ${fixture.id}/${structure.surface}.`);
  const records = [];
  for (const node of structure.nodes ?? []) {
    records.push({ id: `${node.id}:bounds`, nodeId: node.id, property: "bounds", value: node.bounds, unit: "scene-px", coordinateSpace: "scene", source: "dom-bounds", dependencies: [`node:${node.id}:semantic`, "graph:container"], readiness: "ready", valid: true, confidence: "high", approximation: null });
    if (node.textMeasurement) records.push({ id: `${node.id}:text-box`, nodeId: node.id, property: "text-box", value: node.textMeasurement, unit: "scene-px", coordinateSpace: "element", source: "dom-scroll", dependencies: [`node:${node.id}:text.characters`, `node:${node.id}:text.style`], readiness: node.fontReady === false ? "fallback" : "ready", valid: true, confidence: node.fontReady === false ? "medium" : "high", approximation: node.fontReady === false ? "browser reported requested face unavailable" : null });
    if (node.imageIntrinsicDimensions) records.push({ id: `${node.id}:intrinsic-image`, nodeId: node.id, property: "intrinsic-image", value: node.imageIntrinsicDimensions, unit: "pixels", coordinateSpace: "intrinsic", source: "image-decode", dependencies: node.imageAssetId ? [`asset:${node.imageAssetId}:state`] : [], readiness: "ready", valid: true, confidence: "high", approximation: null });
    if (node.textMeasurement) records.push({ id: `${node.id}:font-readiness`, nodeId: node.id, property: "font-readiness", value: { requestedReady: node.fontReady ?? null, documentStatus: structure.fontReadiness?.status ?? "unsupported", font: node.font ? JSON.parse(JSON.stringify(node.font)) : null }, unit: "boolean", coordinateSpace: "none", source: "font-face-set", dependencies: [`node:${node.id}:text.style`], readiness: node.fontReady === false ? "fallback" : "ready", valid: true, confidence: "high", approximation: node.fontReady === false ? "fallback font may be active" : null });
  }
  return {
    surface: structure.surface,
    environmentProfile: profile,
    records,
    readiness: { fonts: structure.fontReadiness?.status === "loaded" ? "ready" : structure.fontReadiness?.status === "loading" ? "pending" : "unsupported", assets: assetReady(structure), geometryStable: true, framesObserved: null },
    provenance: { route: structure.route ?? null, rendererMode: structure.rendererMode ?? null, captureRunId: fidelityRun },
    capturedAt: structure.captureTimestamp ?? null,
  };
}

export function writeSettlementCandidate(directory, model, metadata) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "dependency.json"), stableStringify({ schemaVersion: "dependency-snapshot-v1", metadata, graph: model.dependencies }));
  writeFileSync(join(directory, "measurements.json"), stableStringify({ schemaVersion: "measurement-snapshot-envelope-v1", metadata, snapshot: model.measurements }));
  writeFileSync(join(directory, "settled.json"), stableStringify({ schemaVersion: "settled-scene-snapshot-v1", metadata, graph: model.settled }));
  writeFileSync(join(directory, "trace.json"), stableStringify({ schemaVersion: "settlement-trace-snapshot-v1", metadata, trace: model.trace }));
  writeFileSync(join(directory, "comparison.json"), stableStringify({ schemaVersion: "settlement-comparison-snapshot-v1", metadata, comparison: model.comparison }));
  writeFileSync(join(directory, "performance.json"), stableStringify({ schemaVersion: "settlement-performance-v1", metadata, performance: model.performance }));
  if (model.scenario) writeFileSync(join(directory, "scenario.json"), stableStringify(model.scenario));
}

export function compareSettlementDirectory(expectedDirectory, actualDirectory) {
  const files = settlementFiles.map((file) => {
    const expectedPath = join(expectedDirectory, file);
    const actualPath = join(actualDirectory, file);
    if (!existsSync(expectedPath)) return { file, status: "unapproved", firstDifference: null };
    if (!existsSync(actualPath)) return { file, status: "missing-candidate", firstDifference: null };
    const expected = readFileSync(expectedPath, "utf8");
    const actual = readFileSync(actualPath, "utf8");
    if (expected === actual) return { file, status: "pass", firstDifference: null };
    const left = expected.split("\n");
    const right = actual.split("\n");
    const index = Array.from({ length: Math.max(left.length, right.length) }, (_, item) => item).find((item) => left[item] !== right[item]) ?? 0;
    return { file, status: "fail", firstDifference: { line: index + 1, expected: left[index] ?? null, actual: right[index] ?? null } };
  });
  return { equal: files.every((item) => item.status === "pass"), files };
}

export function promoteSettlementDirectory({ fixtureId, surface, candidateDirectory, reason, approvedRoot = approvedSettlementRoot, evidenceRoot = join(settlementRoot, "update-evidence"), timestamp = new Date().toISOString() }) {
  const updateReason = requireSettlementUpdateReason(reason);
  const approvedDirectory = settlementSnapshotDirectory(approvedRoot, fixtureId, surface);
  const evidenceDirectory = join(resolve(evidenceRoot), safeSegment(timestamp.replace(/[:.]/g, "-")), safeSegment(fixtureId), safeSegment(surface));
  mkdirSync(approvedDirectory, { recursive: true });
  mkdirSync(evidenceDirectory, { recursive: true });
  for (const file of settlementFiles) {
    const candidate = join(candidateDirectory, file);
    if (!existsSync(candidate)) throw new Error(`Missing settlement candidate ${candidate}`);
    const approved = join(approvedDirectory, file);
    if (existsSync(approved)) cpSync(approved, join(evidenceDirectory, `before-${file}`));
    cpSync(candidate, join(evidenceDirectory, `after-${file}`));
    const comparison = existsSync(approved) ? compareSettlementDirectory(approvedDirectory, candidateDirectory).files.find((item) => item.file === file) : { file, status: "initial-approval" };
    writeFileSync(join(evidenceDirectory, `difference-${file}`), stableStringify(comparison));
    const pending = `${approved}.pending`;
    cpSync(candidate, pending);
    renameSync(pending, approved);
  }
  writeFileSync(join(evidenceDirectory, "update.json"), stableStringify({ fixtureId, surface, reason: updateReason, updateTimestamp: timestamp }));
  return { approvedDirectory, evidenceDirectory };
}
