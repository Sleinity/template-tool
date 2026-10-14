/** Test-only instrumentation; SDK bundles never contain measurement hooks. */
import { build } from "vite";
import { mkdtempSync, mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { loadManifest, verifyFixture, repoRoot, parseArguments, sha256 } from "../fidelity/core.mjs";
import { selectSdkGateFixtures } from "../fidelity/gate-profile.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = String(args["run-id"] || "");
if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error("Use --run-id with a fresh safe identity.");
const directory = join(repoRoot, "fidelity/evidence/family-preparation", runId);
if (existsSync(directory)) throw new Error("Evidence already exists; use a fresh run identity.");
const output = mkdtempSync(join(tmpdir(), "family-preparation-"));
const manifest = loadManifest();
const fixtures = selectSdkGateFixtures(manifest).map(fixture => verifyFixture(manifest, fixture));
try {
  const counters = {
    baselineCreateTemplateFieldFamilyFromSourcesV2: "familyConstructorCalls",
    createTemplateFieldFamilyFromSourcesV2: "familyConstructorCalls",
    prepareInitialFamilyV2: "initialPreparationCalls",
    prepareAppendedFamilyV2: "appendPreparationCalls",
    parseTemplatePackageV2: "sourceParseCalls",
    validateTemplatePackageV2: "canonicalValidationCalls",
    resolveTemplateFieldFamilyVariantV2: "variantResolutionCalls",
    materializeTemplateFieldContentV2: "materializationCalls",
  };
  await build({ root: repoRoot, configFile: false, logLevel: "silent",
    resolve: { alias: [
      { find: "@sleinity/template-core/family", replacement: join(repoRoot, "packages/template-core/src/family/index.ts") },
      { find: /^@sleinity\/template-core$/, replacement: join(repoRoot, "packages/template-core/src/index.ts") },
    ] }, plugins: [{ name: "family-preparation-counts", enforce: "pre", transform(code, id) {
      if (!id.includes("/packages/template-")) return;
      let changed = false;
      for (const [name, counter] of Object.entries(counters)) {
        const marker = `export function ${name}(`;
        if (!code.includes(marker)) continue;
        changed = true; code = code.replace(marker, `function counted_${name}(`);
        code += `\nexport function ${name}(...args) { const work = globalThis.__familyPreparationWork; if (work) work[${JSON.stringify(counter)}] = (work[${JSON.stringify(counter)}] || 0) + 1; return counted_${name}(...args); }\n`;
      }
      return changed ? { code, map: null } : null;
    } }], ssr: { noExternal: true },
    build: { target: "esnext", ssr: join(repoRoot, "packages/template-browser/test/familySourcePreparation.integration.ts"), outDir: output, emptyOutDir: true,
      rollupOptions: { output: { entryFileNames: "verify.mjs" } } } });
  const { verifyFamilyPreparationFixture } = await import(pathToFileURL(join(output, "verify.mjs")).href);
  const measurements = [];
  for (const { fixture, bytes } of fixtures) {
    measurements.push(...await verifyFamilyPreparationFixture(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), fixture.filename, fixture.id));
    console.log(`${fixture.id}: initial/fresh-batch/promotion/append, 1/5/20 repetitions, equivalent`);
  }
  const report = { runId, phase: args.phase ?? "after", commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    nodeVersion: process.version, platform: process.platform, architecture: process.arch,
    authoritySha256: sha256(readFileSync(join(repoRoot, "packages/template-browser/src/import/templateSourceAssemblyV2.ts"))),
    baselineSha256: sha256(readFileSync(join(repoRoot, "packages/template-browser/test/familyAuthoringBaseline.ts"))),
    fixtures: fixtures.map(({ fixture }) => ({ id: fixture.id, zipSha256: fixture.zipSha256, templateJsonSha256: fixture.templateJsonSha256, previewSha256: fixture.embeddedPreview.sha256 })),
    measurements, passed: true };
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`Family preparation evidence: ${directory}/report.json`);
} finally { rmSync(output, { recursive: true, force: true }); }
