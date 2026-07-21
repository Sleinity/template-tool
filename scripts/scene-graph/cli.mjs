import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  loadManifest,
  parseArguments,
  repoRoot,
  selectFixtures,
  stableStringify,
  verifyFixture,
} from "../fidelity/core.mjs";
import {
  approvedSceneRoot,
  compareSceneSnapshot,
  createSceneSnapshot,
  promoteSceneSnapshot,
  sceneRoot,
  sceneSnapshotPath,
} from "./core.mjs";
import { resolveSceneModel } from "./model.mjs";

const [command = "compare", ...rest] = process.argv.slice(2);
const args = parseArguments(rest);
const manifest = loadManifest();
const selected = selectFixtures(manifest, args.fixture);
const runId = String(args["run-id"] || `scene-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const candidateRoot = resolve(String(args.output || join(sceneRoot, "candidates")), runId);

async function generate() {
  const results = [];
  for (const fixture of selected) {
    const verified = verifyFixture(manifest, fixture);
    const model = await resolveSceneModel(verified);
    const snapshot = createSceneSnapshot(fixture, model);
    const directory = join(candidateRoot, fixture.id);
    mkdirSync(directory, { recursive: true });
    const candidatePath = join(directory, "scene.json");
    writeFileSync(candidatePath, stableStringify(snapshot));
    writeFileSync(join(directory, "equivalence.json"), stableStringify(model.equivalence));
    writeFileSync(join(directory, "validation.json"), stableStringify(model.validation));
    writeFileSync(join(directory, "performance.json"), stableStringify(model.performance));
    writeFileSync(join(directory, "inspection.json"), stableStringify({ fixture: snapshot.fixture, package: model.packageSummary, graphSummary: { nodeCount: model.graph.nodeOrder.length, assetCount: Object.keys(model.graph.assets).length, fieldCount: model.graph.editableFields.length, fontCount: model.graph.fonts.length, capabilityCount: model.graph.capabilities.length, unmappedPropertyCount: model.graph.unmappedProperties.length }, authority: model.registries.propertyAuthority, mappings: model.registries.sourceToSceneMapping, migration: model.registries.migrationMap, diagnostics: model.graph.transformationDiagnostics, equivalenceSummary: model.equivalence.summary }));
    results.push({ fixture, candidatePath, model, snapshot });
    console.log(`[scene] fixture=${fixture.id} valid=${model.validation.valid} nodes=${model.graph.nodeOrder.length} transform=${model.performance.transformMs.toFixed(2)}ms bytes=${model.performance.serializedSceneBytes}`);
  }
  return results;
}

async function baseline() {
  const results = await generate();
  writeFileSync(join(candidateRoot, "run.json"), stableStringify({ schemaVersion: "scene-run-v1", runId, command: "baseline", fixtures: results.map(({ fixture, model }) => ({ fixtureId: fixture.id, zipSha256: fixture.zipSha256, valid: model.validation.valid, performance: model.performance, equivalenceSummary: model.equivalence.summary })) }));
  if (results.some(({ model }) => !model.validation.valid)) process.exitCode = 1;
}

async function compare() {
  const results = await generate();
  const comparisons = results.map(({ fixture, snapshot }) => {
    const approvedPath = sceneSnapshotPath(approvedSceneRoot, fixture.id);
    if (!existsSync(approvedPath)) return { fixtureId: fixture.id, status: "unapproved", approvedPath };
    const approved = JSON.parse(readFileSync(approvedPath, "utf8"));
    const comparison = compareSceneSnapshot(approved, snapshot);
    return { fixtureId: fixture.id, status: comparison.equal ? "pass" : "fail", approvedPath, comparison };
  });
  writeFileSync(join(candidateRoot, "comparison.json"), stableStringify({ schemaVersion: "scene-comparison-v1", runId, comparisons }));
  comparisons.forEach((item) => console.log(`[scene] fixture=${item.fixtureId} comparison=${item.status}`));
  if (comparisons.some((item) => item.status !== "pass")) process.exitCode = 1;
}

async function update() {
  const reason = args.reason;
  let sourceRun = args["run-id"] ? resolve(String(args.output || join(sceneRoot, "candidates")), String(args["run-id"])) : null;
  if (!sourceRun || !existsSync(sourceRun)) {
    await generate();
    sourceRun = candidateRoot;
  }
  for (const fixture of selected) {
    const candidatePath = join(sourceRun, fixture.id, "scene.json");
    const result = promoteSceneSnapshot({ fixtureId: fixture.id, candidatePath, reason });
    console.log(`[scene] fixture=${fixture.id} approved=${result.approvedPath} evidence=${result.evidenceDir}`);
  }
}

async function report() {
  const root = args["run-id"] ? resolve(String(args.output || join(sceneRoot, "candidates")), String(args["run-id"])) : candidateRoot;
  if (!existsSync(root)) throw new Error(`Scene run not found: ${root}`);
  const fixtureIds = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const lines = ["# Canonical Scene Graph Report", "", `Run: \`${root}\``, "", "| Fixture | Valid | Nodes | Scene bytes | Migration blockers |", "| --- | --- | ---: | ---: | ---: |"]; 
  for (const fixtureId of fixtureIds) {
    const validation = JSON.parse(readFileSync(join(root, fixtureId, "validation.json"), "utf8"));
    const equivalence = JSON.parse(readFileSync(join(root, fixtureId, "equivalence.json"), "utf8"));
    const performance = JSON.parse(readFileSync(join(root, fixtureId, "performance.json"), "utf8"));
    const scene = JSON.parse(readFileSync(join(root, fixtureId, "scene.json"), "utf8"));
    lines.push(`| ${fixtureId} | ${validation.valid ? "yes" : "no"} | ${scene.graph.nodeOrder.length} | ${performance.serializedSceneBytes} | ${equivalence.migrationBlockers.length} |`);
  }
  const output = `${lines.join("\n")}\n`;
  if (args.outputFile) writeFileSync(resolve(String(args.outputFile)), output);
  else process.stdout.write(output);
}

try {
  if (command === "baseline" || command === "inspect" || command === "equivalence") await baseline();
  else if (command === "compare") await compare();
  else if (command === "update") await update();
  else if (command === "report") await report();
  else throw new Error(`Unknown scene command ${command}. Expected baseline, compare, update, inspect, equivalence, or report.`);
} catch (error) {
  console.error(`[scene] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
