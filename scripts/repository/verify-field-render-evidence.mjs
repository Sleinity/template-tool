/** Before/after evidence evaluation: retained native sources, complete structural transcripts. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { serialize, deserialize } from "node:v8";
import { build } from "vite";
import { repoRoot, parseArguments, sha256 } from "../fidelity/core.mjs";
const args = parseArguments(process.argv.slice(2)), runId = args["run-id"];
assert(runId && /^[a-zA-Z0-9_-]+$/.test(runId), "Provide a unique --run-id");
const root = join(repoRoot, "fidelity/evidence/field-render-evidence"), output = join(root, runId);
const beforeDir = args["before-directory"] ?? join(root, "before-20261009a");
const baseline = JSON.parse(readFileSync(join(beforeDir, "baseline.json")));
const natives = Object.keys(baseline.sourceHashes), sources = Object.fromEntries(natives.map(file => [file, readFileSync(join(beforeDir, file.split('/').at(-1)), 'utf8')]));
for (const file of natives) assert.equal(sha256(sources[file]), baseline.sourceHashes[file], file);
for (const [file, hash] of Object.entries(baseline.protectedArtifacts)) assert.equal(sha256(readFileSync(join(repoRoot, file))), hash, file);
const authorityNames = ["parseTemplatePackageV2", "validateTemplatePackageV2", "materializeTemplateFieldContentV2", "materializeTemplateFieldFamilyVariantV2", "createResolvedRenderTree", "projectTemplatePackageV2ToRendererV1", "createSavedTemplateSessionV2Record", "createSavedTemplateFieldFamilyV3Record"];
async function execute(original) {
  const dir = mkdtempSync(join(tmpdir(), "field-render-evidence-")); let substitutions = 0;
  try {
    await build({ root: repoRoot, configFile: false, logLevel: "silent", ssr: { noExternal: true }, plugins: [{ name: "native-evidence-baseline", enforce: "pre", transform(source, id) {
      const file = natives.find(file => join(repoRoot, file) === id.split('?')[0]); if (!file) return;
      if (original) { source = sources[file]; substitutions++; }
      for (const name of authorityNames) source = source.replace(new RegExp(`(?<!function )\\b${name}\\(`, 'g'), `(globalThis.__fieldEvidenceCounts['${name}']++, ${name})(`);
      // Test-only measurement includes map update; native publication is measured separately.
      source = source.replace('const previousValidation = fieldRenderValidation.get(field.id);', 'const previousValidation = fieldRenderValidation.get(field.id); const __evalStart = performance.now();');
      source = source.replace('if (JSON.stringify(previousValidation)', 'globalThis.__fieldEvidenceTiming.evaluationMs += performance.now() - __evalStart; globalThis.__fieldEvidenceTiming.evaluations++; if (JSON.stringify(previousValidation)');
      source = source.replace(/for \(const \[fieldId, validation\] of fieldRenderValidation\) \{[\s\S]*?if \(validation.state !== "inactive"\) fieldRenderValidation.delete\(fieldId\);\s*\}/g,
        match => `{ const __invalidateStart = performance.now(); ${match} globalThis.__fieldEvidenceTiming.invalidationMs += performance.now() - __invalidateStart; globalThis.__fieldEvidenceTiming.invalidations++; }`);
      source = source.replace(/invalidateRuntimeFieldEvidence\(fieldRenderValidation\);/g, match => `{ const __invalidateStart = performance.now(); ${match} globalThis.__fieldEvidenceTiming.invalidationMs += performance.now() - __invalidateStart; globalThis.__fieldEvidenceTiming.invalidations++; }`);
      return { code: source, map: null };
    } }], build: { target: "esnext", ssr: join(repoRoot, "packages/template-browser/test/fieldRenderEvidence.integration.ts"), outDir: dir, rollupOptions: { output: { entryFileNames: "verify.mjs" } } } });
    if (original) assert.equal(substitutions, 2);
    globalThis.__fieldEvidenceCounts = Object.fromEntries(authorityNames.map(name => [name, 0]));
    globalThis.__fieldEvidenceTiming = { evaluations: 0, invalidations: 0, evaluationMs: 0, invalidationMs: 0 };
    const module = await import(pathToFileURL(join(dir, 'verify.mjs')));
    const OriginalDate = Date, originalUuid = crypto.randomUUID; let serial = 0;
    globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [1791536400000])); } static now() { return 1791536400000; } };
    crypto.randomUUID = () => `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`;
    try {
      const transcript = module.verifyFieldRenderEvidence();
      const calls = { ...globalThis.__fieldEvidenceCounts }, timing = { ...globalThis.__fieldEvidenceTiming };
      const measurements = Array.from({ length: 3 }, (_, i) => ({ trial: i + 1, rows: module.measureFieldRenderEvidence() }));
      return { transcript, calls, timing, measurements };
    } finally { globalThis.Date = OriginalDate; crypto.randomUUID = originalUuid; }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
if (args.baseline) {
  assert(!existsSync(join(beforeDir, 'transcript.v8')));
  const before = await execute(true);
  writeFileSync(join(beforeDir, 'transcript.v8'), serialize(before.transcript));
  writeFileSync(join(beforeDir, 'report.json'), JSON.stringify({ ...before, transcript: undefined }, null, 2));
  console.log(`Baseline: ${before.transcript.length} complete native checkpoints; configuration return and publisher replacement rejected old evidence.`);
} else {
  assert(!existsSync(output));
  const before = await execute(true); assert.deepEqual(before.transcript, deserialize(readFileSync(join(beforeDir, 'transcript.v8'))), 'Original baseline regenerates exactly');
  const after = await execute(false); assert.deepEqual(after.transcript, before.transcript, 'Complete structural transcript equality'); assert.deepEqual(after.calls, before.calls, 'Authority counts unchanged');
  assert.equal(after.timing.evaluations, before.timing.evaluations); assert.equal(after.timing.invalidations, before.timing.invalidations);
  const counts = value => value.flatMap(trial => trial.rows.map(({ kind, count, accepted, rejected, notifications }) => ({ kind, count, accepted, rejected, notifications })));
  assert.deepEqual(counts(before.measurements), counts(after.measurements));
  mkdirSync(output, { recursive: true }); writeFileSync(join(output, 'transcript.v8'), serialize(after.transcript));
  const report = { runId, commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(), baselineHashes: baseline.sourceHashes, sourceHashes: Object.fromEntries(natives.map(file => [file, sha256(readFileSync(join(repoRoot, file)))])), checkpoints: after.transcript.length, structuralEquality: true, authorityCalls: after.calls, protectedArtifactsUnchanged: Object.keys(baseline.protectedArtifacts).length, transcriptSha256: sha256(serialize(after.transcript)), timing: { before: before.timing, after: after.timing }, measurements: { before: before.measurements, after: after.measurements } };
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ ...report, measurements: undefined }));
}
