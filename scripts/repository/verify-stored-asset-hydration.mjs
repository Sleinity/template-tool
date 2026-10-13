/** Three-stage native hydration evidence; all substitutions are test-only. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { serialize, deserialize } from "node:v8";
import { build } from "vite";
import { loadManifest, verifyFixture, repoRoot, parseArguments, sha256 } from "../fidelity/core.mjs";
import { selectSdkGateFixtures } from "../fidelity/gate-profile.mjs";
import { loadExactFontManifest } from "../fidelity/fonts.mjs";
const args = parseArguments(process.argv.slice(2)), runId = args["run-id"], stage = args.stage;
assert(runId && /^[A-Za-z0-9_-]+$/.test(runId), "Provide a fresh --run-id.");
assert(["original", "repaired", "extracted"].includes(stage), "Select --stage original, repaired or extracted.");
const root = join(repoRoot, "fidelity/evidence/stored-asset-hydration"), output = join(root, runId);
assert(!existsSync(output), "Evidence run already exists.");
const nativePaths = ["packages/template-browser/src/session/templateSessionV2.ts", "packages/template-browser/src/session/templateFieldFamilySessionV2.ts"];
const sources = Object.fromEntries(nativePaths.map(file => [file, readFileSync(args["source-directory"] ? join(args["source-directory"], file.split("/").at(-1)) : join(repoRoot, file), "utf8")]));
const fixtures = selectSdkGateFixtures(loadManifest()).map(fixture => verifyFixture(loadManifest(), fixture));
const fonts = loadExactFontManifest(fixtures.flatMap(({ fixture }) => fixture.requiredFonts ?? []));
const git = (...args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });
function protectedHashes() {
  const files = ["fidelity/fixtures.json", "fidelity/fonts.json", "fidelity/gates/sdk-061.json", "config/sdk-entry-points.json", "config/sdk-public-api.json", "config/sdk-bundle-baselines.json"];
  const walk = dir => { if (!existsSync(join(repoRoot, dir))) return; for (const e of readdirSync(join(repoRoot, dir), { withFileTypes: true })) {
    const file = `${dir}/${e.name}`; if (e.isDirectory()) walk(file); else files.push(file);
  } };
  for (const dir of ["fidelity/references/approved", "fidelity/scene-graph/snapshots/approved", "fidelity/settlement/snapshots/approved"]) walk(dir);
  for (const p of ["core", "browser", "react"]) for (const name of readdirSync(join(repoRoot, `packages/template-${p}/dist`))) {
    if (name.endsWith(".d.ts")) files.push(`packages/template-${p}/dist/${name}`);
  }
  for (const file of git("ls-files").trim().split("\n")) if (/api.*baseline|bundle.*budget|curated-entry.*baseline/.test(file)) files.push(file);
  const inventory = JSON.parse(readFileSync(join(repoRoot, "config/sdk-entry-points.json")));
  for (const p of inventory.packages) for (const entry of p.entries.filter(e => e.classification !== "sdk-internal" && !e.path.endsWith(".css"))) {
    const stem = entry.path === "." ? "index" : entry.path.slice(2), file = `packages/${p.directory}/dist/${stem}.d.ts`;
    assert(existsSync(join(repoRoot, file)), `Build prerequisite missing: ${file}`); files.push(file);
  }
  return Object.fromEntries([...new Set(files)].sort().map(file => [file, sha256(readFileSync(join(repoRoot, file)))]));
}
const protectedArtifacts = protectedHashes();

async function execute(replacement, repairs) {
  const dir = mkdtempSync(join(tmpdir(), "hydration-evidence-"));
  try {
    await build({ root: repoRoot, configFile: false, logLevel: "silent", ssr: { noExternal: true },
      plugins: [{ name: "native-hydration-baseline", enforce: "pre", transform(source, id) {
        const file = nativePaths.find(file => id.split("?")[0] === join(repoRoot, file));
        if (!file) {
          if (id.split("?")[0] === join(repoRoot, "packages/template-browser/src/session/storedAssetHydration.ts")) {
            source = source.replace('    state = "released";', '    const __cleanupStart = performance.now();\n    state = "released";');
            source = source.replace('    if (failed) throw failure;', '    globalThis.__hydrationTransferMeasure.temporaryCleanupMs += performance.now() - __cleanupStart; globalThis.__hydrationTransferMeasure.temporaryCleanupCount++;\n    if (failed) throw failure;');
            return { code: source, map: null };
          }
          return;
        }
        if (replacement) source = replacement[file];
        if (file.endsWith("/templateSessionV2.ts")) {
          source = source.replace("        const incoming = new Set(", "        const __transferStart = performance.now();\n        const incoming = new Set(");
          source = source.replace("        revokeOwned();\n        controllerGeneration += 1;\n        hydrated.temporaryUrls", "        const __transferStart = performance.now();\n        revokeOwned();\n        controllerGeneration += 1;\n        hydrated.temporaryUrls");
          source = source.replace("        releaseHydrated = undefined;", "        globalThis.__hydrationTransferMeasure.ms += performance.now() - __transferStart; globalThis.__hydrationTransferMeasure.count++;\n        releaseHydrated = undefined;");
        } else {
          source = source.replace(/(      revokeOwned\(\);\n      revokeSources\(\);\n      (?:temporaryUrls|hydration)\.)/, "      const __transferStart = performance.now();\n$1");
          source = source.replace("      controllerGeneration += 1;\n      invalidateRuntime(family.variants.find((variant) => variant.id === record.selectedVariantId)", "      globalThis.__hydrationTransferMeasure.ms += performance.now() - __transferStart; globalThis.__hydrationTransferMeasure.count++;\n      controllerGeneration += 1;\n      invalidateRuntime(family.variants.find((variant) => variant.id === record.selectedVariantId)");
        }
        source = source.replace('      byHash.forEach(url => objectUrls.revoke(url));\n      byHash.clear();', '      const __cleanupStart = performance.now();\n      byHash.forEach(url => objectUrls.revoke(url));\n      byHash.clear();\n      globalThis.__hydrationTransferMeasure.temporaryCleanupMs += performance.now() - __cleanupStart; globalThis.__hydrationTransferMeasure.temporaryCleanupCount++;');
        source = source.replaceAll('temporaryUrls.forEach((value) => objectUrls.revoke(value))', '(() => { const start = performance.now(); try { temporaryUrls.forEach((value) => objectUrls.revoke(value)); } finally { globalThis.__hydrationTransferMeasure.temporaryCleanupMs += performance.now() - start; globalThis.__hydrationTransferMeasure.temporaryCleanupCount++; } })()');
        return { code: source, map: null };
      } }], build: { target: "esnext", ssr: join(repoRoot, "packages/template-browser/test/storedAssetHydration.integration.ts"), outDir: dir,
        rollupOptions: { output: { entryFileNames: "verify.mjs" } } } });
    const module = await import(pathToFileURL(join(dir, "verify.mjs")));
    const originalDate = Date, originalUuid = crypto.randomUUID; let uuid = 0;
    globalThis.Date = class extends originalDate { constructor(...a) { super(...(a.length ? a : [1791536400000])); } static now() { return 1791536400000; } };
    crypto.randomUUID = () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}`;
    globalThis.__hydrationTransferMeasure = { ms: 0, count: 0, temporaryCleanupMs: 0, temporaryCleanupCount: 0 };
    let transcript, acceptedOwnership;
    try { transcript = await module.verifyStoredAssetHydration(repairs); acceptedOwnership = await module.verifyHydrationAcceptedOwnership(); }
    finally { globalThis.Date = originalDate; crypto.randomUUID = originalUuid; }
    const measurements = [];
    for (let trial = 1; trial <= 3; trial++) for (const { fixture, bytes } of fixtures) measurements.push({ trial, fixtureId: fixture.id,
      rows: await module.measureStoredAssetHydration(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), fixture.filename, fixture.id) });
    return { transcript, acceptedOwnership, measurements };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const current = await execute(args["source-directory"] ? sources : null, stage !== "original");
let comparison = null, baselineMeasurements = null;
if (args["baseline-run"] || args["baseline-source-directory"]) {
  let directory, report;
  if (args["baseline-source-directory"]) {
    assert(!args["baseline-run"] && args["baseline-record"] && ["original", "repaired"].includes(args["baseline-stage"]), "Reconstruction needs --baseline-record and --baseline-stage.");
    directory = args["baseline-source-directory"];
    const record = JSON.parse(readFileSync(args["baseline-record"]));
    report = { stage: args["baseline-stage"], sourceHashes: record.stages[args["baseline-stage"]].sourceHashes, protectedArtifacts: record.protectedArtifacts };
  } else {
    assert(/^[A-Za-z0-9_-]+$/.test(args["baseline-run"]));
    directory = join(root, args["baseline-run"]);
    report = JSON.parse(readFileSync(join(directory, "report.json")));
  }
  const baselineSources = Object.fromEntries(nativePaths.map(file => [file, readFileSync(join(directory, file.split("/").at(-1)), "utf8")]));
  for (const file of nativePaths) assert.equal(sha256(baselineSources[file]), report.sourceHashes[file]);
  for (const [file, hash] of Object.entries(report.protectedArtifacts)) assert.equal(protectedArtifacts[file], hash, `Protected artifact changed: ${file}`);
  const previous = await execute(baselineSources, report.stage !== "original");
  if (!args["baseline-source-directory"]) assert.deepEqual(previous.transcript, deserialize(readFileSync(join(directory, "transcript.v8"))), "Native baseline reproduces.");
  assert.deepEqual(current.acceptedOwnership, previous.acceptedOwnership, "Live accepted ownership survives failed and stale hydration equivalently.");
  baselineMeasurements = previous.measurements;
  const intentional = row => report.stage === "original" && row.kind === "single" && ["collision", "missing-blob", "field-reset"].includes(row.scenario);
  assert.deepEqual(current.transcript.filter(row => !intentional(row)), previous.transcript.filter(row => !intentional(row)), "All unaffected native transcripts remain equal.");
  const counts = rows => rows.flatMap(group => group.rows.map(({ kind, repetitions, mode, reads, allocations, releases, transferCount, temporaryCleanupCount }) => ({ fixtureId: group.fixtureId, trial: group.trial, kind, repetitions, mode, reads, allocations, releases, transferCount, temporaryCleanupCount })));
  assert.deepEqual(counts(current.measurements), counts(previous.measurements), "Hydration read/allocation/finalization counts remain equal.");
  comparison = { baselineRun: args["baseline-run"], baselineStage: report.stage, fullTranscriptEquality: report.stage === "repaired", intentionalDifferences: current.transcript.filter(intentional).map(({ kind, scenario }) => ({ kind, scenario })), measurementCountsEqual: true };
}
mkdirSync(output, { recursive: true });
for (const [file, source] of Object.entries(sources)) writeFileSync(join(output, file.split("/").at(-1)), source);
writeFileSync(join(output, "transcript.v8"), serialize(current.transcript));
writeFileSync(join(output, "accepted-ownership.v8"), serialize(current.acceptedOwnership));
const report = { schemaVersion: "stored-asset-hydration-evidence-v1", runId, stage, commit: git("rev-parse", "HEAD").trim(), worktree: git("status", "--porcelain"),
  worktreeDiffSha256: sha256(git("diff", "HEAD")), sourceDirectory: args["source-directory"] ?? null, baselineSourceDirectory: args["baseline-source-directory"] ?? null, harnessHashes: Object.fromEntries(["scripts/repository/verify-stored-asset-hydration.mjs", "packages/template-browser/test/storedAssetHydration.integration.ts"].map(file => [file, sha256(readFileSync(join(repoRoot, file)))])), sourceHashes: Object.fromEntries(Object.entries(sources).map(([file, source]) => [file, sha256(source)])),
  transcriptSha256: sha256(serialize(current.transcript)), scenarioCount: current.transcript.length, acceptedOwnershipScenarioCount: current.acceptedOwnership.length, comparison, protectedArtifacts,
  fixtures: fixtures.map(({ fixture, previewHash }) => ({ id: fixture.id, zipSha256: fixture.zipSha256, templateJsonSha256: fixture.templateJsonSha256, previewSha256: previewHash })),
  fonts: fonts.fonts.map(font => ({ id: font.id, sha256: font.verifiedSha256, byteSize: font.verifiedByteSize })), measurements: current.measurements, baselineMeasurements,
  node: process.version, platform: process.platform, architecture: process.arch };
writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ runId, stage, scenarioCount: report.scenarioCount, comparison, output }));
