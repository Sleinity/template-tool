#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";
import {
  artifactDirectory,
  createRepeatabilityReport,
  environmentMetadata,
  loadManifest,
  normalizeStructuralSnapshot,
  parseArguments,
  repoRoot,
  selectFixtures,
  selectSurfaces,
  stableStringify,
  verifyFixture,
} from "./core.mjs";
import { comparePng } from "./image.mjs";
import { resolveModel } from "./model.mjs";
import { approvedReferenceDirectory, approvedReferenceHash, assertReferenceImmutable, updateApprovedReference } from "./references.mjs";
import { runBrowserFixtures } from "./browser.mjs";
import { retainFailureArtifacts } from "./artifacts.mjs";
import { loadExactFontManifest } from "./fonts.mjs";

const command = process.argv[2] ?? "baseline";
const options = parseArguments(process.argv.slice(3));
const defaultCandidates = join(repoRoot, "fidelity", "candidates");
const defaultArtifacts = join(repoRoot, "fidelity", "artifacts");
const defaultEvidence = join(repoRoot, "fidelity", "update-evidence");

function runId() {
  return String(options["run-id"] || new Date().toISOString().replace(/[:.]/g, "-"));
}

function latestRun(root) {
  if (!existsSync(root)) return null;
  return readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().at(-1) ?? null;
}

function candidatePaths(root, selectedRun, fixtureId, surface) {
  const directory = artifactDirectory(root, selectedRun, fixtureId, surface);
  return { directory, png: join(directory, "capture-1.png"), structure: join(directory, "structure-1.json") };
}

function comparisonWithoutBinary(value) {
  const clone = { ...value };
  delete clone.differenceImage;
  return clone;
}

async function capture() {
  const fontProfile = String(options["font-profile"] || "application-default");
  if (!["application-default", "source-authoritative"].includes(fontProfile)) {
    throw new Error(`Unknown font profile ${fontProfile}.`);
  }
  const exactFontManifest = fontProfile === "source-authoritative"
    ? loadExactFontManifest()
    : null;
  const manifest = loadManifest();
  const fixtureRecords = selectFixtures(manifest, options.fixture || options._[0]).map((fixture) => ({ ...fixture, ...verifyFixture(manifest, fixture) }));
  const selectedSurfaces = selectSurfaces(options.surface);
  const selectedRun = runId();
  const candidateRoot = resolve(options.output || defaultCandidates);
  const models = new Map();
  for (const fixture of fixtureRecords) models.set(fixture.id, await resolveModel(fixture));
  const server = await createStudioViteServer({
    port: Number(options.port || 0),
    strictPort: Boolean(options.port),
  });
  await server.listen();
  const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("Fidelity Vite server did not publish a local URL.");
  try {
    const captured = await runBrowserFixtures({ baseUrl, fixtures: fixtureRecords, models, selectedSurfaces, runId: selectedRun, candidateRoot, headed: Boolean(options.headed), repeat: Number(options.repeat || 2), fontProfile, exactFontManifest });
    const fontDecisions = captured.results.flatMap((item) => item.fontDecisions);
    const environment = environmentMetadata({ ...captured.browser, loadedFonts: [...new Map(captured.results.flatMap((item) => Object.values(item.surfaces).flatMap((captures) => captures?.[0]?.fontReadiness?.fonts ?? [])).map((font) => [`${font.family}:${font.weight}:${font.style}`, font])).values()], fallbackFonts: fontDecisions.filter((decision) => decision.action === "Use replacement"), fontDecisions, fontSources: exactFontManifest?.fonts.map(({ id, family, weight, style, verifiedByteSize, verifiedSha256 }) => ({ id, family, weight, style, byteSize: verifiedByteSize, sha256: verifiedSha256 })) ?? [], fontProfile });
    const summaries = captured.results.map((result) => ({
      fixtureId: result.fixtureId,
      error: result.error ?? null,
      route: result.route,
      fontDecisions: result.fontDecisions,
      fullDurationMs: result.fullDurationMs,
      repeatability: Object.fromEntries(Object.entries(result.surfaces).map(([surface, captures]) => [surface, createRepeatabilityReport(captures)])),
    }));
    const runDirectory = join(candidateRoot, selectedRun);
    mkdirSync(runDirectory, { recursive: true });
    writeFileSync(join(runDirectory, "environment.json"), stableStringify(environment));
    writeFileSync(join(runDirectory, "run.json"), stableStringify({ schemaVersion: 1, runId: selectedRun, fontProfile, productRendererPath: "semantic-first-with-capability-fallback", fixtureDirectory: manifest.defaultFixtureDirectory, selectedFixtures: fixtureRecords.map((item) => item.id), selectedSurfaces, summaries }));
    const unstable = summaries.filter((item) => item.error || Object.values(item.repeatability).some((report) => !report.stable));
    return { manifest, fixtureRecords, selectedSurfaces, selectedRun, candidateRoot, environment, captured, summaries, unstable };
  } finally {
    await server.close();
  }
}

async function baseline() {
  const result = await capture();
  console.log(`[fidelity] run=${result.selectedRun} fixtures=${result.fixtureRecords.length} surfaces=${result.selectedSurfaces.join(",")}`);
  for (const summary of result.summaries) console.log(`[fidelity] fixture=${summary.fixtureId} status=${summary.error ? "error" : Object.values(summary.repeatability).every((item) => item.stable) ? "stable" : "nondeterministic"} durationMs=${summary.fullDurationMs.toFixed(1)}${summary.error ? ` error=${summary.error}` : ""}`);
  console.log(`[fidelity] candidates=${join(result.candidateRoot, result.selectedRun)}`);
  if (result.unstable.length) process.exitCode = 1;
}

async function compare() {
  const result = await capture();
  const comparisons = [];
  const approvedRoot = resolve(options["approved-root"] || join(repoRoot, "fidelity", "references", "approved"));
  for (const fixture of result.fixtureRecords) {
    const fixtureResult = result.captured.results.find((item) => item.fixtureId === fixture.id);
    for (const surface of result.selectedSurfaces) {
      const candidate = candidatePaths(result.candidateRoot, result.selectedRun, fixture.id, surface);
      const approvedDir = approvedReferenceDirectory(fixture.id, surface, approvedRoot);
      const approved = { directory: approvedDir, png: join(approvedDir, "reference.png"), structure: join(approvedDir, "structure.json") };
      if (!existsSync(candidate.png) || !existsSync(candidate.structure)) {
        comparisons.push({ fixtureId: fixture.id, surface, status: "capture-missing", error: fixtureResult?.error ?? "candidate missing" });
        continue;
      }
      if (!existsSync(approved.png) || !existsSync(approved.structure)) {
        comparisons.push({ fixtureId: fixture.id, surface, status: "unapproved" });
        retainFailureArtifacts({ fixture, surface, runId: result.selectedRun, candidate, approved, environment: result.environment, result: fixtureResult, artifactsRoot: resolve(options["artifact-output"] || defaultArtifacts) });
        continue;
      }
      const beforePng = approvedReferenceHash(approved.png);
      const beforeStructure = approvedReferenceHash(approved.structure);
      const pixel = comparePng(approved.png, candidate.png, { threshold: Number(options.threshold ?? 0.1), allowedChangedPixelPercentage: Number(options["allowed-percent"] ?? 0) });
      const { compareGeometry } = await import("./core.mjs");
      const geometry = compareGeometry(JSON.parse(readFileSync(approved.structure, "utf8")), normalizeStructuralSnapshot(JSON.parse(readFileSync(candidate.structure, "utf8"))));
      assertReferenceImmutable(beforePng, approvedReferenceHash(approved.png));
      assertReferenceImmutable(beforeStructure, approvedReferenceHash(approved.structure));
      const status = pixel.equal && geometry.equal ? "pass" : "fail";
      comparisons.push({ fixtureId: fixture.id, surface, status, pixel: comparisonWithoutBinary(pixel), geometry });
      if (status === "fail") retainFailureArtifacts({ fixture, surface, runId: result.selectedRun, candidate, approved, pixel, geometry, environment: result.environment, result: fixtureResult, artifactsRoot: resolve(options["artifact-output"] || defaultArtifacts) });
    }
  }
  const reportPath = join(result.candidateRoot, result.selectedRun, "comparison.json");
  writeFileSync(reportPath, stableStringify({ runId: result.selectedRun, comparisons }));
  for (const item of comparisons) console.log(`[fidelity] fixture=${item.fixtureId} surface=${item.surface} comparison=${item.status}`);
  console.log(`[fidelity] comparison-report=${reportPath}`);
  if (result.unstable.length || comparisons.some((item) => item.status !== "pass")) process.exitCode = 1;
}

async function update() {
  const manifest = loadManifest();
  const fixtures = selectFixtures(manifest, options.fixture || options._[0]);
  const selectedSurfaces = selectSurfaces(options.surface);
  const candidateRoot = resolve(options.output || defaultCandidates);
  const selectedRun = String(options["run-id"] || latestRun(candidateRoot) || "");
  if (!selectedRun) throw new Error("No candidate run exists; run fidelity:baseline first.");
  const envPath = join(candidateRoot, selectedRun, "environment.json");
  const environment = existsSync(envPath) ? JSON.parse(readFileSync(envPath, "utf8")) : null;
  const approvedRoot = resolve(options["approved-root"] || join(repoRoot, "fidelity", "references", "approved"));
  for (const fixture of fixtures) {
    for (const surface of selectedSurfaces) {
      const candidate = candidatePaths(candidateRoot, selectedRun, fixture.id, surface);
      if (!existsSync(candidate.png) || !existsSync(candidate.structure)) throw new Error(`Candidate missing for run ${selectedRun}, fixture ${fixture.id}, surface ${surface}.`);
      const result = updateApprovedReference({ fixtureId: fixture.id, surface, candidatePng: candidate.png, candidateStructure: candidate.structure, environment, fixtureIdentity: fixture, reason: options.reason, approvedRoot, evidenceRoot: resolve(options["evidence-output"] || defaultEvidence) });
      console.log(`[fidelity] fixture=${fixture.id} surface=${surface} approved=${result.approvedDir}`);
      console.log(`[fidelity] update-evidence=${result.evidenceDir}`);
    }
  }
}

function report() {
  const root = resolve(options.output || defaultCandidates);
  const selectedRun = String(options["run-id"] || latestRun(root) || "");
  if (!selectedRun) throw new Error("No fidelity candidate runs exist.");
  const run = JSON.parse(readFileSync(join(root, selectedRun, "run.json"), "utf8"));
  const comparisonPath = join(root, selectedRun, "comparison.json");
  const comparison = existsSync(comparisonPath) ? JSON.parse(readFileSync(comparisonPath, "utf8")) : null;
  const markdown = [
    `# Renderer fidelity run ${selectedRun}`,
    "",
    `Fixtures: ${run.selectedFixtures.join(", ")}`,
    `Surfaces: ${run.selectedSurfaces.join(", ")}`,
    "",
    "| Fixture | Status | Duration (ms) |",
    "| --- | --- | ---: |",
    ...run.summaries.map((item) => `| ${item.fixtureId} | ${item.error ? `error: ${item.error}` : Object.values(item.repeatability).every((value) => value.stable) ? "repeatable" : "nondeterministic"} | ${item.fullDurationMs.toFixed(1)} |`),
    "",
    comparison ? "## Approved-reference comparisons" : "No approved-reference comparison was recorded for this run.",
    ...(comparison ? ["", ...comparison.comparisons.map((item) => `- ${item.fixtureId} / ${item.surface}: ${item.status}`)] : []),
    "",
  ].join("\n");
  const path = join(root, selectedRun, "report.md");
  writeFileSync(path, markdown);
  console.log(markdown);
  console.log(`[fidelity] report=${path}`);
}

try {
  if (command === "baseline") await baseline();
  else if (command === "compare") await compare();
  else if (command === "update") await update();
  else if (command === "report") report();
  else throw new Error(`Unknown fidelity command ${command}.`);
} catch (error) {
  console.error(`[fidelity] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
