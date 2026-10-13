#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "./core.mjs";
import { readSdkGateCaptureRun, selectSdkGateFixtures } from "./gate-profile.mjs";
import { loadExactFontManifest } from "./fonts.mjs";
import { readSdkGateDisposition, sdkGateSourceReviewComplete } from "./gate-disposition.mjs";
import { validateSdkGateComparisons, validateSdkGateEnvironments } from "./gate-evidence.mjs";

const options = parseArguments(process.argv.slice(2));
const runId = String(options["run-id"] || `sdk-061-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const assessExisting = Boolean(options["assess-existing"]);
const fixtureRecords = selectSdkGateFixtures(loadManifest());
for (const fixture of fixtureRecords) verifyFixture(loadManifest(), fixture);
loadExactFontManifest(fixtureRecords.flatMap(item => item.requiredFonts ?? []));
const fidelityRoot = join(repoRoot, "fidelity", "candidates");
const results = [];
function execute(label, file, args) {
  const result = spawnSync(process.execPath, [join(repoRoot, file), ...args], { cwd: repoRoot, stdio: "inherit", env: process.env });
  const exitCode = result.status ?? 1;
  results.push({ label, exitCode, error: result.error?.message ?? null });
  return exitCode;
}

execute("public-single", "scripts/repository/verify-sdk-061-single-host.mjs", []);
execute("public-family", "scripts/repository/verify-sdk-061-family-host.mjs", []);
execute("color-browser", "scripts/repository/verify-sdk-061-color-browser.mjs", []);
if (!assessExisting) execute("renderer", "scripts/fidelity/cli.mjs", ["compare", "--gate", "sdk-061", "--run-id", runId, "--font-profile", "source-authoritative", "--repeat", "2", "--capture-camera", "studio-reference-20261012"]);
let capture = null;
try {
  capture = readSdkGateCaptureRun(fidelityRoot, runId, fixtureRecords);
} catch (error) {
  results.push({ label: "capture-integrity", exitCode: 1, error: String(error.message ?? error) });
}
if (capture && !assessExisting) {
  execute("scene", "scripts/scene-graph/cli.mjs", ["compare", "--gate", "sdk-061", "--run-id", runId, "--fidelity-run", runId]);
  execute("settlement", "scripts/settlement/cli.mjs", ["compare", "--gate", "sdk-061", "--run-id", runId, "--fidelity-run", runId]);
}

const root = join(fidelityRoot, runId);
const comparison = existsSync(join(root, "comparison.json")) ? JSON.parse(readFileSync(join(root, "comparison.json"), "utf8")) : null;
const scenePath = join(repoRoot, "fidelity", "scene-graph", "candidates", runId, "comparison.json");
const settlementPath = join(repoRoot, "fidelity", "settlement", "candidates", runId, "reference-comparison.json");
const sceneComparison = existsSync(scenePath) ? JSON.parse(readFileSync(scenePath, "utf8")) : null;
const settlementComparison = existsSync(settlementPath) ? JSON.parse(readFileSync(settlementPath, "utf8")) : null;
if (assessExisting) {
  results.push({ label: "renderer-existing", exitCode: comparison?.comparisons?.every(item => item.status === "pass") ? 0 : 1, error: comparison ? null : "Comparison record missing" });
  results.push({ label: "scene-existing", exitCode: sceneComparison?.comparisons?.every(item => item.status === "pass") ? 0 : 1, error: sceneComparison ? null : "Scene comparison record missing" });
  results.push({ label: "settlement-existing", exitCode: settlementComparison?.comparisons?.every(item => item.equal) ? 0 : 1, error: settlementComparison ? null : "Settlement comparison record missing" });
}
const gate = {
  schemaVersion: "sdk-061-gate-run-v1", gate: "sdk-061", runId,
  fixtureIds: fixtureRecords.map(item => item.id),
  environment: capture?.environment ?? null,
  capturesComplete: Boolean(capture),
  comparisons: {
    renderer: comparison?.comparisons ?? null,
    scene: sceneComparison?.comparisons ?? null,
    settlement: settlementComparison?.comparisons ?? null,
  },
  results,
};
try {
  if (capture) {
    validateSdkGateComparisons({ runId, fixtures: fixtureRecords, renderer: comparison, scene: sceneComparison, settlement: settlementComparison });
    const sceneEnvironment = JSON.parse(readFileSync(join(repoRoot, "fidelity", "scene-graph", "candidates", runId, "environment.json"), "utf8"));
    const settlementEnvironment = JSON.parse(readFileSync(join(repoRoot, "fidelity", "settlement", "candidates", runId, "environment.json"), "utf8"));
    validateSdkGateEnvironments({ fidelity: capture.environment, scene: sceneEnvironment, settlement: settlementEnvironment });
  }
} catch (error) {
  results.push({ label: "comparison-integrity", exitCode: 1, error: String(error.message ?? error) });
}
try {
  gate.sourceReview = capture ? readSdkGateDisposition(fixtureRecords, runId, capture.environment) : null;
} catch (error) {
  results.push({ label: "source-review", exitCode: 1, error: String(error.message ?? error) });
  gate.sourceReview = null;
}
const surfaceCount = fixtureRecords.length * capture?.run?.selectedSurfaces?.length;
gate.go = Boolean(capture && results.every(item => item.exitCode === 0) &&
  gate.comparisons.renderer?.length === surfaceCount && gate.comparisons.renderer.every(item => item.status === "pass") &&
  gate.comparisons.scene?.length === fixtureRecords.length && gate.comparisons.scene.every(item => item.status === "pass") &&
  gate.comparisons.settlement?.length === surfaceCount && gate.comparisons.settlement.every(item => item.equal) &&
  gate.sourceReview && sdkGateSourceReviewComplete(gate.sourceReview));
if (existsSync(root)) writeFileSync(join(root, "sdk-gate.json"), stableStringify(gate));
console.log(`[sdk-061] run=${runId} capture=${gate.capturesComplete ? "complete" : "incomplete"} comparisons=${results.map(item => `${item.label}:${item.exitCode}`).join(",")} decision=${gate.go ? "GO" : "NO-GO"}`);
if (!gate.go) process.exitCode = 1;
