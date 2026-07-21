#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadManifest, parseArguments, repoRoot, selectFixtures, selectSurfaces, stableStringify, verifyFixture } from "../fidelity/core.mjs";
import { approvedSettlementRoot, compareSettlementDirectory, observationFromStructure, promoteSettlementDirectory, settlementRoot, settlementSnapshotDirectory, writeSettlementCandidate } from "./core.mjs";
import { resolveSettlementModel } from "./model.mjs";
import { selectScenarios } from "./scenarios.mjs";

const [command = "compare", ...rest] = process.argv.slice(2);
const args = parseArguments(rest);
const manifest = loadManifest();
const fixtures = selectFixtures(manifest, args.fixture);
const selectedSurfaces = selectSurfaces(args.surface);
const candidatesBase = resolve(String(args.output || join(settlementRoot, "candidates")));
const runId = String(args["run-id"] || `settlement-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const candidateRoot = join(candidatesBase, runId);
const fidelityRoot = resolve(String(args["fidelity-output"] || join(repoRoot, "fidelity", "candidates")));
const profile = String(args.profile || "chromium-headless");

function hasCompleteRun(run) {
  return fixtures.every((fixture) => selectedSurfaces.every((surface) => existsSync(join(fidelityRoot, run, fixture.id, surface, "structure-1.json"))));
}

function fidelityRun() {
  if (args["fidelity-run"]) {
    const selected = String(args["fidelity-run"]);
    if (!hasCompleteRun(selected)) throw new Error(`Fidelity run ${selected} is missing one or more selected fixture/surface structure reports.`);
    return selected;
  }
  if (!existsSync(fidelityRoot)) throw new Error(`Fidelity candidates do not exist: ${fidelityRoot}`);
  const selected = readdirSync(fidelityRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse().find(hasCompleteRun);
  if (!selected) throw new Error("No complete fidelity run was found. Run fidelity:baseline first or pass --fidelity-run.");
  return selected;
}

function metadata(fixture, surface, scenarioId = null) {
  return { fixture: { id: fixture.id, filename: fixture.filename, byteSize: fixture.byteSize, zipSha256: fixture.zipSha256, embeddedPreviewSha256: fixture.embeddedPreview?.sha256 ?? null, rootNodeId: fixture.rootNodeId, canvas: fixture.canvas, packageVersion: fixture.packageVersion }, surface, environmentProfile: scenarioId ? "synthetic-test" : profile, scenarioId };
}

async function generateObserved() {
  const sourceRun = fidelityRun();
  const results = [];
  for (const fixture of fixtures) {
    const verified = verifyFixture(manifest, fixture);
    for (const surface of selectedSurfaces) {
      const structurePath = join(fidelityRoot, sourceRun, fixture.id, surface, "structure-1.json");
      const structure = JSON.parse(readFileSync(structurePath, "utf8"));
      const observation = observationFromStructure(fixture, structure, { profile, fidelityRun: sourceRun });
      const model = await resolveSettlementModel(verified, observation);
      const directory = settlementSnapshotDirectory(candidateRoot, fixture.id, surface);
      writeSettlementCandidate(directory, model, metadata(fixture, surface));
      results.push({ fixture, surface, directory, model });
      console.log(`[settlement] fixture=${fixture.id} surface=${surface} stable=${model.settled.stable} ready=${model.settled.readiness} exact=${model.comparison.summary.exact}/${model.settled.nodeOrder.length}`);
    }
  }
  const environmentPath = join(fidelityRoot, sourceRun, "environment.json");
  const environment = existsSync(environmentPath) ? JSON.parse(readFileSync(environmentPath, "utf8")) : null;
  writeFileSync(join(candidateRoot, "run.json"), stableStringify({ schemaVersion: "settlement-run-v1", runId, command, sourceFidelityRun: sourceRun, environmentProfile: profile, fixtures: results.map(({ fixture, surface, model }) => ({ fixtureId: fixture.id, zipSha256: fixture.zipSha256, surface, stable: model.settled.stable, readiness: model.settled.readiness, comparison: model.comparison.summary, performance: model.performance })) }));
  writeFileSync(join(candidateRoot, "environment.json"), stableStringify({ schemaVersion: "settlement-environment-v1", profile, source: environment, policy: "Headed and headless raster evidence are separate; geometry tolerances are fixed and references are never shared across profiles." }));
  return results;
}

async function baseline() {
  const results = await generateObserved();
  if (results.some(({ model }) => !model.settled.stable || !model.comparison.equivalentWithinTolerance)) process.exitCode = 1;
}

async function compare() {
  const results = await generateObserved();
  const comparisons = results.map(({ fixture, surface, directory }) => ({ fixtureId: fixture.id, surface, ...compareSettlementDirectory(settlementSnapshotDirectory(approvedSettlementRoot, fixture.id, surface), directory) }));
  writeFileSync(join(candidateRoot, "reference-comparison.json"), stableStringify({ schemaVersion: "settlement-reference-comparison-v1", runId, comparisons }));
  comparisons.forEach((item) => console.log(`[settlement] fixture=${item.fixtureId} surface=${item.surface} reference=${item.equal ? "pass" : "fail"}`));
  if (comparisons.some((item) => !item.equal)) process.exitCode = 1;
}

async function update() {
  const sourceRunId = args["source-run"] ? String(args["source-run"]) : null;
  let root = sourceRunId ? join(candidatesBase, sourceRunId) : null;
  if (!root || !existsSync(root)) { await generateObserved(); root = candidateRoot; }
  for (const fixture of fixtures) for (const surface of selectedSurfaces) {
    const candidateDirectory = settlementSnapshotDirectory(root, fixture.id, surface);
    const promoted = promoteSettlementDirectory({ fixtureId: fixture.id, surface, candidateDirectory, reason: args.reason });
    console.log(`[settlement] fixture=${fixture.id} surface=${surface} approved=${promoted.approvedDirectory} evidence=${promoted.evidenceDirectory}`);
  }
}

async function scenarios() {
  const results = [];
  for (const fixture of fixtures) {
    const verified = verifyFixture(manifest, fixture);
    for (const scenario of selectScenarios(args.scenario, fixture.id)) {
      const model = await resolveSettlementModel(verified, null, scenario);
      const surface = `scenario-${scenario.id}`;
      const directory = settlementSnapshotDirectory(candidateRoot, fixture.id, surface);
      writeSettlementCandidate(directory, model, metadata(fixture, surface, scenario.id));
      results.push({ fixtureId: fixture.id, scenario: scenario.id, invalidation: model.settled.invalidation, readiness: model.settled.readiness, stable: model.settled.stable, performance: model.performance });
      console.log(`[settlement] fixture=${fixture.id} scenario=${scenario.id} affected=${model.settled.invalidation?.affectedNodeIds.length ?? 0} full=${model.settled.invalidation?.usedFullTreeFallback ?? false}`);
    }
  }
  mkdirSync(candidateRoot, { recursive: true });
  writeFileSync(join(candidateRoot, "scenario-run.json"), stableStringify({ schemaVersion: "settlement-scenario-run-v1", runId, results }));
}

function report() {
  const root = args["source-run"] ? join(candidatesBase, String(args["source-run"])) : candidateRoot;
  const runPath = join(root, "run.json");
  if (!existsSync(runPath)) throw new Error(`Settlement run not found: ${root}`);
  const run = JSON.parse(readFileSync(runPath, "utf8"));
  const lines = ["# Settlement Observation Report", "", `Run: \`${run.runId}\``, `Environment profile: \`${run.environmentProfile}\``, "", "| Fixture | Surface | Stable | Readiness | Exact nodes | Settlement ms |", "| --- | --- | --- | --- | ---: | ---: |"];
  for (const item of run.fixtures) lines.push(`| ${item.fixtureId} | ${item.surface} | ${item.stable ? "yes" : "no"} | ${item.readiness} | ${item.comparison.exact} | ${item.performance.settlementMs.toFixed(2)} |`);
  const output = `${lines.join("\n")}\n`;
  if (args["output-file"]) writeFileSync(resolve(String(args["output-file"])), output);
  else process.stdout.write(output);
}

try {
  if (command === "baseline" || command === "observe") await baseline();
  else if (command === "compare") await compare();
  else if (command === "update") await update();
  else if (command === "scenario") await scenarios();
  else if (command === "report") report();
  else throw new Error(`Unknown settlement command ${command}. Expected baseline, observe, compare, update, scenario, or report.`);
} catch (error) {
  console.error(`[settlement] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
