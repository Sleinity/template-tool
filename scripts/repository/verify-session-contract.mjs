/** Test-only instrumentation at the existing Browser session authority calls. */
import { build } from "vite";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { loadManifest, verifyFixture, repoRoot, parseArguments, sha256 } from "../fidelity/core.mjs";
import { selectSdkGateFixtures } from "../fidelity/gate-profile.mjs";
import { loadExactFontManifest } from "../fidelity/fonts.mjs";

const args = parseArguments(process.argv.slice(2)), runId = args["run-id"] ?? "session-contract-20261008a";
if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error("Invalid evidence run identity.");
const output = join(repoRoot, "fidelity/evidence/session-contract", runId);
if (existsSync(output)) throw new Error("Evidence run already exists; select a fresh --run-id.");
const fixtures = selectSdkGateFixtures(loadManifest()).map(fixture => verifyFixture(loadManifest(), fixture));
const fonts = loadExactFontManifest(fixtures.flatMap(({ fixture }) => fixture.requiredFonts ?? []));
const directory = mkdtempSync(join(tmpdir(), "session-contract-"));
const calls = { parseTemplatePackageV2: "parse", validateTemplatePackageV2: "validate", mutateTemplateFieldContentV2: "mutation", materializeTemplateFieldContentV2: "materializeSingle", materializeTemplateFieldFamilyVariantV2: "materializeFamily", projectTemplatePackageV2ToRendererV1: "rendererProjection", createResolvedRenderTree: "resolvedTree", createSavedTemplateSessionV2Record: "captureSingle", createSavedTemplateFieldFamilyV3Record: "captureFamily" };
try {
  await build({ root: repoRoot, configFile: false, logLevel: "silent", ssr: { noExternal: true }, plugins: [{
    name: "test-only-session-authority-counts",
    transform(source, id) {
      if (!/\/session\/(?:templateSessionV2|templateFieldFamilySessionV2)\.ts$/.test(id)) return;
      for (const [name, key] of Object.entries(calls)) source = source.replace(new RegExp(`(?<!function )\\b${name}\\(`, "g"), `(globalThis.__sessionAuthorityCounts["${key}"] += 1, ${name})(`);
      return { code: source, map: null };
    },
  }], build: { target: "esnext", ssr: join(repoRoot, "packages/template-browser/test/sessionContract.integration.ts"), outDir: directory, rollupOptions: { output: { entryFileNames: "verify.mjs" } } } });
  const { verifySessionFixture, verifySessionFamily } = await import(pathToFileURL(join(directory, "verify.mjs")).href), rows = [];
  for (let trial = 1; trial <= 3; trial++) for (const { fixture, bytes } of fixtures) {
    const result = await verifySessionFixture(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), fixture.filename, fixture.id);
    rows.push(...result.map(row => ({ trial, ...row })));
    console.log(`${fixture.id} trial ${trial}: single/Family views, edits, Reset and save/reload equivalent; read authority calls=0`);
  }
  const family = await verifySessionFamily(fixtures.map(({ fixture, bytes }) => ({ id: fixture.id, filename: fixture.filename, buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })));
  const git = (...args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  const evidence = { runId, passed: true, commit: git("rev-parse", "HEAD").trim(), worktree: git("status", "--porcelain"), worktreeDiffSha256: sha256(git("diff", "HEAD")),
    implementationSha256: Object.fromEntries(["packages/template-browser/src/session/templateSessionV2.ts", "packages/template-browser/src/internal/sessionContract/types.ts", "packages/template-browser/src/internal/sessionContract/adapt.ts", "packages/template-browser/test/sessionContract.integration.ts", "scripts/repository/verify-session-contract.mjs"].map(file => [file, sha256(readFileSync(join(repoRoot, file)))])),
    scope: "Direct calls from Browser sessions into canonical, projection, tree and persistence-record authorities; nested Core calls and wall-clock scheduling are not attributed.",
    environment: { node: process.version, platform: process.platform, architecture: process.arch },
    fixtures: fixtures.map(({ fixture }) => ({ id: fixture.id, zipSha256: fixture.zipSha256, templateJsonSha256: fixture.templateJsonSha256, embeddedPreviewSha256: fixture.embeddedPreview.sha256 })),
    fonts: fonts.fonts.map(font => ({ id: font.id, sha256: font.verifiedSha256, byteSize: font.verifiedByteSize })),
    family, rows };
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, "report.json"), JSON.stringify(evidence, null, 2));
  console.log(`Session contract evidence: ${output}/report.json`);
} finally { rmSync(directory, { recursive: true, force: true }); }
