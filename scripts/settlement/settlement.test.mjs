import { existsSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compareSettlementDirectory, observationFromStructure, promoteSettlementDirectory, requireSettlementUpdateReason, settlementFiles, settlementSnapshotDirectory } from "./core.mjs";
import { selectScenarios } from "./scenarios.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let rejected = false;
try { requireSettlementUpdateReason(""); } catch { rejected = true; }
assert(rejected, "settlement reference updates must reject a missing reason");
assert(requireSettlementUpdateReason("reviewed settlement baseline") === "reviewed settlement baseline", "valid settlement reasons must be preserved");
const fixture = { id: "fixture", filename: "fixture.zip", byteSize: 1, zipSha256: "a".repeat(64), embeddedPreview: null, rootNodeId: "root", canvas: { width: 100, height: 100 }, packageVersion: "1.0" };
const structure = { fixtureId: "fixture", fixtureHashes: { zipSha256: "a".repeat(64) }, rootNodeId: "root", rootDimensions: { width: 100, height: 100 }, surface: "editor", route: "/drafts/random", rendererMode: "editor", captureTimestamp: "now", fontReadiness: { status: "loaded" }, assetReadiness: { images: [], backgrounds: [] }, nodes: [{ id: "root", bounds: { x: 0, y: 0, width: 100, height: 100 }, textMeasurement: null, imageIntrinsicDimensions: null }] };
const observation = observationFromStructure(fixture, structure, { profile: "chromium-headless", fidelityRun: "run" });
assert(observation.records[0].source === "dom-bounds", "browser structure must become an explicit DOM measurement record");
const bad = structuredClone(structure);
bad.fixtureHashes.zipSha256 = "b".repeat(64);
let identityRejected = false;
try { observationFromStructure(fixture, bad, { profile: "chromium-headless", fidelityRun: "run" }); } catch { identityRejected = true; }
assert(identityRejected, "similarly named or wrong-hash observations must be rejected");

const root = mkdtempSync(join(tmpdir(), "settlement-guard-test-"));
const candidate = settlementSnapshotDirectory(join(root, "candidates"), "fixture", "editor");
const approved = join(root, "approved");
const evidence = join(root, "evidence");
await import("node:fs").then(({ mkdirSync }) => mkdirSync(candidate, { recursive: true }));
for (const file of settlementFiles) writeFileSync(join(candidate, file), JSON.stringify({ file, value: 1,
  metadata: { fixture: { id: "fixture" }, surface: "editor" },
  ...(file === "settled.json" ? { graph: { stable: true, readiness: "ready", unresolvedDependencies: [] } } : {}),
  ...(file === "comparison.json" ? { comparison: { equivalentWithinTolerance: true } } : {}),
}) + "\n");
promoteSettlementDirectory({ fixtureId: "fixture", surface: "editor", candidateDirectory: candidate, reason: "reviewed temporary settlement", approvedRoot: approved, evidenceRoot: evidence, timestamp: "2026-07-13T00:00:00.000Z" });
const approvedDirectory = settlementSnapshotDirectory(approved, "fixture", "editor");
assert(compareSettlementDirectory(approvedDirectory, candidate).equal, "promoted settlement bundle must compare exactly");
const before = readFileSync(join(approvedDirectory, "settled.json"), "utf8");
const changedCandidate = JSON.parse(readFileSync(join(candidate, "settled.json"), "utf8"));
changedCandidate.value = 2;
writeFileSync(join(candidate, "settled.json"), JSON.stringify(changedCandidate) + "\n");
assert(!compareSettlementDirectory(approvedDirectory, candidate).equal, "settlement structural changes must be visible");
assert(readFileSync(join(approvedDirectory, "settled.json"), "utf8") === before, "normal candidate writes must not mutate approved references");
promoteSettlementDirectory({ fixtureId: "fixture", surface: "editor", candidateDirectory: candidate, reason: "reviewed changed settlement", approvedRoot: approved, evidenceRoot: evidence, timestamp: "2026-07-13T00:01:00.000Z" });
const updateEvidence = join(evidence, "2026-07-13T00-01-00-000Z", "fixture", "editor");
assert(existsSync(join(updateEvidence, "before-settled.json")) && existsSync(join(updateEvidence, "after-settled.json")) && existsSync(join(updateEvidence, "difference-settled.json")), "settlement updates must retain before, after and difference evidence");
const lastApproved = readFileSync(join(approvedDirectory, "settled.json"), "utf8");
changedCandidate.graph.readiness = "pending-measurements";
changedCandidate.graph.unresolvedDependencies = ["node:source:mask-range"];
writeFileSync(join(candidate, "settled.json"), JSON.stringify(changedCandidate) + "\n");
let pendingRejected = false;
try { promoteSettlementDirectory({ fixtureId: "fixture", surface: "editor", candidateDirectory: candidate, reason: "reviewed pending mask evidence", approvedRoot: approved, evidenceRoot: evidence }); } catch { pendingRejected = true; }
assert(pendingRejected && readFileSync(join(approvedDirectory, "settled.json"), "utf8") === lastApproved, "pending mask evidence must be rejected before approved references change");
const approvedBundle = Object.fromEntries(settlementFiles.map(file => [file, readFileSync(join(approvedDirectory, file), "utf8")]));
for (const failure of ["missing-file", "wrong-surface", "unstable", "unresolved", "not-equivalent"]) {
  for (const file of settlementFiles) writeFileSync(join(candidate, file), approvedBundle[file]);
  if (failure === "missing-file") unlinkSync(join(candidate, "trace.json"));
  else {
    const file = failure === "not-equivalent" ? "comparison.json" : "settled.json";
    const value = JSON.parse(readFileSync(join(candidate, file), "utf8"));
    if (failure === "wrong-surface") value.metadata.surface = "fields";
    if (failure === "unstable") value.graph.stable = false;
    if (failure === "unresolved") value.graph.unresolvedDependencies = ["node:source:mask-range"];
    if (failure === "not-equivalent") value.comparison.equivalentWithinTolerance = false;
    writeFileSync(join(candidate, file), JSON.stringify(value));
  }
  let rejected = false;
  try { promoteSettlementDirectory({ fixtureId: "fixture", surface: "editor", candidateDirectory: candidate, reason: "source-reviewed guard regression", approvedRoot: approved, evidenceRoot: evidence }); } catch { rejected = true; }
  assert(rejected && settlementFiles.every(file => readFileSync(join(approvedDirectory, file), "utf8") === approvedBundle[file]), `${failure} must leave the complete approved bundle unchanged`);
}
assert(selectScenarios("text-short", "now-hiring-post").length === 1, "single-scenario filtering must be stable");
const unboundUpdate = spawnSync(process.execPath, [fileURLToPath(new URL("./cli.mjs", import.meta.url)),
  "update", "--fixture", "exporter-061-cover", "--surface", "editor",
  "--run-id", "reviewed-capture", "--reason", "reviewed source-specific settlement"],
  { encoding: "utf8" });
assert(unboundUpdate.status !== 0 && unboundUpdate.stderr.includes("requires --source-run"),
  "an identified reference update must never regenerate from a different fidelity run");
const mismatchedRun = "mismatched-capture";
const mismatchedRoot = join(root, "mismatched-candidates", mismatchedRun);
await import("node:fs").then(({ mkdirSync }) => mkdirSync(mismatchedRoot, { recursive: true }));
writeFileSync(join(mismatchedRoot, "run.json"), JSON.stringify({
  runId: mismatchedRun, gate: null, sourceFidelityRun: "another-capture", fixtures: [],
}));
const mismatchedUpdate = spawnSync(process.execPath, [fileURLToPath(new URL("./cli.mjs", import.meta.url)),
  "update", "--gate", "sdk-061", "--output", join(root, "mismatched-candidates"),
  "--run-id", mismatchedRun, "--source-run", mismatchedRun,
  "--reason", "reviewed source-specific settlement"],
  { encoding: "utf8" });
assert(mismatchedUpdate.status !== 0 && mismatchedUpdate.stderr.includes("not bound to the same fidelity capture"),
  "a gate update must reject a candidate created for another gate or fidelity capture");

console.log("Settlement harness guard tests passed.");
