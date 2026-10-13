/** Test-only compiler/public-facade evidence; never imported by a production entry point. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { loadManifest, verifyFixture, repoRoot, parseArguments, sha256 } from "../fidelity/core.mjs";
import { selectSdkGateFixtures } from "../fidelity/gate-profile.mjs";
import { loadExactFontManifest } from "../fidelity/fonts.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = args["run-id"] ?? `compiler-result-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`;
if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error("Run ID must be a safe local filename.");
const directory = join(repoRoot, "fidelity/evidence/compiler-result", runId);
if (existsSync(directory)) throw new Error(`Compiler evidence run already exists: ${runId}. Use a fresh identity.`);
const profile = JSON.parse(readFileSync(join(repoRoot, "fidelity/gates/sdk-061.json"), "utf8"));
const manifest = loadManifest();
const fixtures = selectSdkGateFixtures(manifest).map(fixture => verifyFixture(manifest, fixture));
const requirements = fixtures.flatMap(({ fixture }) => fixture.requiredFonts ?? []);
const fonts = loadExactFontManifest(requirements);
const output = mkdtempSync(join(tmpdir(), "compiler-result-"));
try {
  await build({ root: repoRoot, configFile: false, logLevel: "silent", ssr: { noExternal: true },
    build: { target: "esnext", ssr: join(repoRoot, "packages/template-browser/test/compilerResult.integration.ts"),
      outDir: output, emptyOutDir: true, rollupOptions: { output: { entryFileNames: "verify.mjs" } } } });
  const { verifyCompilerFixture, verifyCompilerFamily } = await import(pathToFileURL(join(output, "verify.mjs")).href);
  const measurements = [];
  // Three sequential paired trials expose cache/JIT variation without claiming
  // a latency target or changing cloning/validation based on a single timing.
  for (let trial = 1; trial <= 3; trial++) for (const { fixture, bytes, previewHash } of fixtures) {
    assert.equal(previewHash, profile.fixtures.find(item => item.id === fixture.id).embeddedPreviewSha256);
    const result = await verifyCompilerFixture(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), fixture.filename, fixture.id);
    measurements.push({ trial, zipSha256: fixture.zipSha256, templateJsonSha256: fixture.templateJsonSha256,
      embeddedPreviewSha256: previewHash, ...result });
    console.log(`${fixture.id} trial ${trial}: equivalent; overhead ${result.adapterOverheadMs.toFixed(3)} ms; calls ${JSON.stringify(result.delegateCalls)}`);
  }
  const family = await verifyCompilerFamily(fixtures.map(({ fixture, bytes }) => ({ id: fixture.id, filename: fixture.filename,
    buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })));
  const git = (...options) => execFileSync("git", options, { cwd: repoRoot, encoding: "utf8" });
  const evidence = { schemaVersion: "compiler-result-evidence-v1", runId,
    commit: git("rev-parse", "HEAD").trim(), worktree: git("status", "--porcelain"),
    worktreeDiffSha256: sha256(git("diff", "HEAD")),
    implementationSha256: Object.fromEntries(["compile.ts", "types.ts", "resources.ts", "index.ts"].map(file =>
      [file, sha256(readFileSync(join(repoRoot, "packages/template-browser/src/internal/compilerResult", file)))])),
    publicFacadeSha256: sha256(readFileSync(join(repoRoot, "packages/template-browser/src/import/runTemplatePackageImportPipelineV2.ts"))),
    nodeVersion: process.version, platform: process.platform, architecture: process.arch,
    packageVersions: Object.fromEntries(["core", "browser", "react"].map(name =>
      [name, JSON.parse(readFileSync(join(repoRoot, `packages/template-${name}/package.json`), "utf8")).version])),
    fonts: fonts.fonts.map(font => ({ id: font.id, sha256: font.verifiedSha256, byteSize: font.verifiedByteSize })),
    measurements, family, passed: true };
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "report.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Compiler-result exact-fixture equivalence passed: ${directory}/report.json`);
} finally { rmSync(output, { recursive: true, force: true }); }
