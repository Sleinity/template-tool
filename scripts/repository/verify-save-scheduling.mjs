/** Native before/after save evidence. Source substitution/instrumentation is test-only. */
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

const args = parseArguments(process.argv.slice(2)), runId = args["run-id"];
if (!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error("Provide a fresh --run-id.");
const root = join(repoRoot, "fidelity/evidence/save-scheduling"), output = join(root, runId);
if (existsSync(output)) throw new Error("Evidence run already exists.");
const nativePaths = ["packages/template-browser/src/session/templateSessionV2.ts", "packages/template-browser/src/session/templateFieldFamilySessionV2.ts"];
const beforeDirectory = args["before-run"] ? join(root, args["before-run"]) : null;
if (args["before-run"] && !/^[A-Za-z0-9_-]+$/.test(args["before-run"])) throw new Error("Invalid --before-run identity.");
const beforeSourceDirectory = args["before-source-directory"];
if (beforeSourceDirectory && (beforeDirectory || !args["baseline-record"])) throw new Error("Use --before-source-directory with --baseline-record, without --before-run.");
const originals = Object.fromEntries(nativePaths.map(file => [file, readFileSync(beforeSourceDirectory ? join(beforeSourceDirectory, file.split("/").at(-1)) : beforeDirectory ? join(beforeDirectory, file.split("/").at(-1)) : join(repoRoot, file), "utf8")]));
if (beforeSourceDirectory) {
  const baseline = JSON.parse(readFileSync(args["baseline-record"]));
  for (const [file, source] of Object.entries(originals)) assert.equal(sha256(source), baseline.beforeSourceSha256[file], `Reconstructed native baseline source changed: ${file}`);
}
if (beforeDirectory) {
  const baseline = JSON.parse(readFileSync(join(beforeDirectory, "report.json")));
  for (const [file, source] of Object.entries(originals)) assert.equal(sha256(source), baseline.sourceHashes[file].before, `Retained native baseline source changed: ${file}`);
}
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
if (beforeDirectory) for (const [file, hash] of Object.entries(JSON.parse(readFileSync(join(beforeDirectory, "report.json"))).protectedArtifacts))
  assert.equal(protectedArtifacts[file], hash, `Protected baseline artifact changed: ${file}`);

async function execute(label, replacement) {
  const directory = mkdtempSync(join(tmpdir(), "save-scheduling-"));
  try {
    await build({ root: repoRoot, configFile: false, logLevel: "silent", ssr: { noExternal: true },
      plugins: [{ name: "test-only-native-save-baseline", enforce: "pre", transform(source, id) {
        const native = nativePaths.find(file => id.split("?")[0] === join(repoRoot, file));
        if (!native) return;
        if (replacement) source = replacement[native];
        source = source.replace(/\b(createSavedTemplate(?:SessionV2|FieldFamilyV3)Record)\(/g, "(globalThis.__saveMeasurements.captures++, $1)(");
        source = source.replace("const releaseSaveUrls = retainSessionAssetUrls(leasedUrls);", "const releaseSaveUrls = (() => { const release = retainSessionAssetUrls(leasedUrls); return () => { const start = performance.now(); try { release(); } finally { globalThis.__saveMeasurements.finalizations++; globalThis.__saveMeasurements.finalizeMs += performance.now() - start; } }; })();");
        return { code: source, map: null };
      } }], build: { target: "esnext", ssr: join(repoRoot, "packages/template-browser/test/saveScheduling.integration.ts"), outDir: directory,
        rollupOptions: { output: { entryFileNames: "verify.mjs" } } } });
    const module = await import(pathToFileURL(join(directory, "verify.mjs")));
    globalThis.__saveMeasurements = { captures: 0, finalizations: 0, finalizeMs: 0 };
    const originalDate = globalThis.Date, originalUuid = crypto.randomUUID;
    let uuid = 0;
    // Exact controlled inputs establish relationships without stripping revisions,
    // optional properties, generated IDs, record timestamps or diagnostics.
    globalThis.Date = class extends originalDate { constructor(...args) { super(...(args.length ? args : [1791453600000])); } static now() { return 1791453600000; } };
    crypto.randomUUID = () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}`;
    let transcript, supplementalTranscript;
    try { transcript = await module.verifySaveScheduling(); supplementalTranscript = await module.verifySaveSchedulingExtras(); }
    finally { globalThis.Date = originalDate; crypto.randomUUID = originalUuid; }
    const measurements = [];
    for (let trial = 1; trial <= 3; trial++) for (const { fixture, bytes } of fixtures) measurements.push({ trial, fixtureId: fixture.id,
      rows: await module.measureSaveScheduling(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), fixture.filename, fixture.id) });
    return { label, transcript, supplementalTranscript, measurements };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
const before = await execute("native-before", originals);
if (beforeDirectory) assert.deepEqual(before.transcript, deserialize(readFileSync(join(beforeDirectory, "before-transcript.v8"))), "Retained baseline sources reproduce the original complete transcript.");
const after = beforeDirectory || beforeSourceDirectory ? await execute("queue-after", null) : null;
if (after) assert.deepEqual(after.transcript, before.transcript, "Complete native snapshots, notifications, repository payloads, save outcomes and URL events remain equivalent.");
if (after) assert.deepEqual(after.supplementalTranscript, before.supplementalTranscript, "Failed restore reads and successive replacement/save pin generations retain native behavior.");
mkdirSync(output, { recursive: true });
for (const [file, source] of Object.entries(originals)) writeFileSync(join(output, file.split("/").at(-1)), source);
writeFileSync(join(output, "before-transcript.v8"), serialize(before.transcript));
if (after) writeFileSync(join(output, "after-transcript.v8"), serialize(after.transcript));
writeFileSync(join(output, "supplemental-before-transcript.v8"), serialize(before.supplementalTranscript));
if (after) writeFileSync(join(output, "supplemental-after-transcript.v8"), serialize(after.supplementalTranscript));
const report = { schemaVersion: "save-scheduling-evidence-v1", runId, beforeRun: args["before-run"] ?? null,
  beforeSourceDirectory: beforeSourceDirectory ?? null, baselineRecord: args["baseline-record"] ?? null,
  commit: git("rev-parse", "HEAD").trim(), worktree: git("status", "--porcelain"), worktreeDiffSha256: sha256(git("diff", "HEAD")),
  node: process.version, platform: process.platform, architecture: process.arch,
  sourceHashes: Object.fromEntries(Object.entries(originals).map(([file, source]) => [file, { before: sha256(source), after: sha256(readFileSync(join(repoRoot, file))) }])),
  fixtures: fixtures.map(({ fixture, previewHash }) => ({ id: fixture.id, zipSha256: fixture.zipSha256, templateJsonSha256: fixture.templateJsonSha256, previewSha256: previewHash })),
  fonts: fonts.fonts.map(font => ({ id: font.id, sha256: font.verifiedSha256, byteSize: font.verifiedByteSize })),
  protectedArtifacts, syntheticScenarioCount: before.transcript.length, completeTranscriptsEqual: after ? true : null,
  baselineTranscriptSha256: sha256(serialize(before.transcript)), integratedTranscriptSha256: after ? sha256(serialize(after.transcript)) : null,
  supplementalScenarioCount: before.supplementalTranscript.length, supplementalTranscriptsEqual: after ? true : null,
  supplementalBaselineSha256: sha256(serialize(before.supplementalTranscript)), supplementalIntegratedSha256: after ? sha256(serialize(after.supplementalTranscript)) : null,
  measurementPolicy: "Three sequential paired trials; exact ZIPs, synthetic burst depths; capture includes native validation/pinning/enqueue. Repository time is controlled waiting, not storage throughput. Finalization includes existing release. No performance target.",
  beforeMeasurements: before.measurements, afterMeasurements: after?.measurements ?? null, passed: true, manualBrowserReview: false };
writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Save scheduling ${after ? "before/after equivalence" : "pre-extraction baseline"} passed: ${output}/report.json`);
