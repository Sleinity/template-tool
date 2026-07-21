import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
for (const file of settlementFiles) writeFileSync(join(candidate, file), JSON.stringify({ file, value: 1 }) + "\n");
promoteSettlementDirectory({ fixtureId: "fixture", surface: "editor", candidateDirectory: candidate, reason: "reviewed temporary settlement", approvedRoot: approved, evidenceRoot: evidence, timestamp: "2026-07-13T00:00:00.000Z" });
const approvedDirectory = settlementSnapshotDirectory(approved, "fixture", "editor");
assert(compareSettlementDirectory(approvedDirectory, candidate).equal, "promoted settlement bundle must compare exactly");
const before = readFileSync(join(approvedDirectory, "settled.json"), "utf8");
writeFileSync(join(candidate, "settled.json"), JSON.stringify({ file: "settled.json", value: 2 }) + "\n");
assert(!compareSettlementDirectory(approvedDirectory, candidate).equal, "settlement structural changes must be visible");
assert(readFileSync(join(approvedDirectory, "settled.json"), "utf8") === before, "normal candidate writes must not mutate approved references");
promoteSettlementDirectory({ fixtureId: "fixture", surface: "editor", candidateDirectory: candidate, reason: "reviewed changed settlement", approvedRoot: approved, evidenceRoot: evidence, timestamp: "2026-07-13T00:01:00.000Z" });
const updateEvidence = join(evidence, "2026-07-13T00-01-00-000Z", "fixture", "editor");
assert(existsSync(join(updateEvidence, "before-settled.json")) && existsSync(join(updateEvidence, "after-settled.json")) && existsSync(join(updateEvidence, "difference-settled.json")), "settlement updates must retain before, after and difference evidence");
assert(selectScenarios("text-short", "now-hiring-post").length === 1, "single-scenario filtering must be stable");

console.log("Settlement harness guard tests passed.");
