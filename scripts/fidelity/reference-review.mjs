#!/usr/bin/env node
/** Read-only source/reference/candidate intake for one complete fidelity run. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, relative as relativePath } from "node:path";
import { unzipSync } from "fflate";
import { captureRunIssues } from "./capture-integrity.mjs";
import { loadManifest, repoRoot, stableStringify, verifyFixture } from "./core.mjs";
import { comparePng } from "./image.mjs";

const runId = process.argv[2];
if (!runId || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(runId)) {
  throw new Error("Pass an exact fidelity run ID.");
}
const runRoot = join(repoRoot, "fidelity", "candidates", runId);
const outputRoot = resolve(process.argv[3] ?? join(repoRoot, "fidelity", "evidence", `reference-review-${runId}`));
if (existsSync(outputRoot)) throw new Error(`Review packet already exists: ${outputRoot}`);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const rendererRun = readJson(join(runRoot, "run.json"));
const rendererComparison = readJson(join(runRoot, "comparison.json"));
const sceneComparison = readJson(join(repoRoot, "fidelity", "scene-graph", "candidates", runId, "comparison.json"));
const settlementRun = readJson(join(repoRoot, "fidelity", "settlement", "candidates", runId, "run.json"));
const settlementComparison = readJson(join(repoRoot, "fidelity", "settlement", "candidates", runId, "reference-comparison.json"));
const environment = readJson(join(runRoot, "environment.json"));
const manifest = loadManifest();
const surfaces = rendererRun.selectedSurfaces;
const fixtures = rendererRun.fixtures.map(({ id }) => {
  const record = manifest.fixtures.find((candidate) => candidate.id === id);
  if (!record) throw new Error(`Run fixture is absent from the exact manifest: ${id}`);
  return record;
});
const issues = captureRunIssues(rendererRun, fixtures.map((fixture) => fixture.id), surfaces);
if (issues.length || !rendererComparison.capturesComplete || !rendererComparison.repeatStable) {
  throw new Error(`Review requires complete, stable captures: ${issues.join("; ") || "comparison incomplete"}`);
}
if (rendererComparison.runId !== runId || sceneComparison.runId !== runId ||
    settlementRun.runId !== runId || settlementRun.sourceFidelityRun !== runId ||
    settlementComparison.runId !== runId) {
  throw new Error("Renderer, scene and settlement reports must refer to the same run.");
}
const rendererByKey = new Map(rendererComparison.comparisons.map((item) => [`${item.fixtureId}/${item.surface}`, item]));
const settlementByKey = new Map(settlementComparison.comparisons.map((item) => [`${item.fixtureId}/${item.surface}`, item]));
const sceneByFixture = new Map(sceneComparison.comparisons.map((item) => [item.fixtureId, item]));
const expectedSurfaceCount = fixtures.length * surfaces.length;
if (rendererByKey.size !== expectedSurfaceCount || rendererComparison.comparisons.length !== expectedSurfaceCount ||
    settlementByKey.size !== expectedSurfaceCount || settlementComparison.comparisons.length !== expectedSurfaceCount ||
    sceneByFixture.size !== fixtures.length || sceneComparison.comparisons.length !== fixtures.length) {
  throw new Error("Comparison reports are incomplete or contain duplicate fixture/surface records.");
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const relative = (path) => path?.replace(`${repoRoot}/`, "") ?? null;

export function classifyRendererDifference(item, canvas) {
  if (item.status === "unapproved") return { kind: "missing-approved-reference", nextAction: "Source and surface review before initial approval" };
  if (item.status === "pass") return { kind: "approved-match", nextAction: "Retain approved reference" };
  if (item.status !== "fail") return { kind: "capture-blocker", nextAction: "Repair capture before review" };
  const pixel = item.pixel;
  if (!pixel?.dimensionsEqual) {
    const expected = pixel.expectedDimensions;
    const actual = pixel.actualDimensions;
    const scale = (size) => ({ x: size.width / canvas.width, y: size.height / canvas.height });
    const before = scale(expected);
    const after = scale(actual);
    const uniformScale = Math.abs(before.x - before.y) < 0.002 && Math.abs(after.x - after.y) < 0.002;
    return { kind: uniformScale ? "preview-scale-reference-drift" : "dimension-difference-unresolved",
      nextAction: "Review changed page container and logical geometry; do not resize pixels",
      capture: { expected, actual, approvedScale: before, currentScale: after, uniformScale } };
  }
  return { kind: pixel?.equal ? "structural-only-difference" : "equal-size-pixel-difference",
    nextAction: "Compare source intent, approved structure and current output" };
}

function sceneChanges(before, after, path = "", results = []) {
  if (typeof before !== typeof after || Array.isArray(before) !== Array.isArray(after)) {
    results.push({ path, before, after });
  } else if (Array.isArray(before)) {
    if (before.length !== after.length) results.push({ path, beforeLength: before.length, afterLength: after.length });
    before.slice(0, after.length).forEach((value, index) => sceneChanges(value, after[index], `${path}/${index}`, results));
  } else if (before && typeof before === "object") {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (!(key in before) || !(key in after)) results.push({ path: `${path}/${key}`, before: before[key], after: after[key] });
      else sceneChanges(before[key], after[key], `${path}/${key}`, results);
    }
  } else if (before !== after) {
    results.push({ path, before, after });
  }
  return results;
}

const rows = [];
mkdirSync(outputRoot, { recursive: true });
for (const fixture of fixtures) {
  const verified = verifyFixture(manifest, fixture);
  const runFixture = rendererRun.fixtures.find((item) => item.id === fixture.id);
  if (runFixture.zipSha256 !== fixture.zipSha256 || runFixture.byteSize !== fixture.byteSize) {
    throw new Error(`Run and manifest fixture identity disagree: ${fixture.id}`);
  }
  const fixtureRoot = join(outputRoot, fixture.id);
  mkdirSync(fixtureRoot, { recursive: true });
  const sourcePreview = fixture.embeddedPreview?.entry
    ? unzipSync(new Uint8Array(verified.bytes))[fixture.embeddedPreview.entry]
    : null;
  if (!sourcePreview || sha256(sourcePreview) !== fixture.embeddedPreview.sha256) {
    throw new Error(`Verified source preview unavailable: ${fixture.id}`);
  }
  const previewPath = join(fixtureRoot, "source-preview.png");
  writeFileSync(previewPath, sourcePreview);
  const source = { filename: fixture.filename, zipSha256: fixture.zipSha256, byteSize: fixture.byteSize,
    previewSha256: verified.previewHash, canvas: fixture.canvas, packageVersion: fixture.packageVersion,
    rootNodeId: fixture.rootNodeId, preview: relative(previewPath), packageNodes: Object.keys(verified.template.nodes ?? {}).length };
  const scene = sceneByFixture.get(fixture.id);
  if (!scene) throw new Error(`Scene evidence missing: ${fixture.id}`);
  const approvedScenePath = join(repoRoot, "fidelity", "scene-graph", "snapshots", "approved", fixture.id, "scene.json");
  const currentScenePath = join(repoRoot, "fidelity", "scene-graph", "candidates", runId, fixture.id, "scene.json");
  const sceneDelta = scene.status === "fail" && existsSync(approvedScenePath)
    ? sceneChanges(readJson(approvedScenePath), readJson(currentScenePath)) : [];
  writeFileSync(join(fixtureRoot, "scene-changes.json"), stableStringify(sceneDelta));
  const fixtureRows = [];
  for (const surface of surfaces) {
    const key = `${fixture.id}/${surface}`;
    const comparison = rendererByKey.get(key);
    const settlement = settlementByKey.get(key);
    if (!comparison || !settlement) throw new Error(`Missing comparison: ${key}`);
    const candidatePath = join(runRoot, fixture.id, surface, "capture-1.png");
    const currentStructurePath = join(runRoot, fixture.id, surface, "structure-1.json");
    const approvedPath = join(repoRoot, "fidelity", "references", "approved", fixture.id, surface, "reference.png");
    const approvedStructurePath = join(repoRoot, "fidelity", "references", "approved", fixture.id, surface, "structure.json");
    const classed = classifyRendererDifference(comparison, fixture.canvas);
    const sourceComparison = surface === "png-export" ? {
      candidate: comparePng(Buffer.from(sourcePreview), candidatePath),
      approved: existsSync(approvedPath) ? comparePng(Buffer.from(sourcePreview), approvedPath) : null,
    } : null;
    for (const result of [sourceComparison?.candidate, sourceComparison?.approved]) if (result) delete result.differenceImage;
    const row = { fixtureId: fixture.id, surface, source, capture: {
      candidate: relative(candidatePath), currentStructure: relative(currentStructurePath),
      approved: existsSync(approvedPath) ? relative(approvedPath) : null,
      approvedStructure: existsSync(approvedStructurePath) ? relative(approvedStructurePath) : null,
      failureArtifacts: relative(join(repoRoot, "fidelity", "artifacts", runId, fixture.id, surface)),
      status: comparison.status, ...classed, pixel: comparison.pixel ?? null, geometry: comparison.geometry ?? null,
      sourceComparison,
    }, scene: { status: scene.status, current: relative(currentScenePath), approved: existsSync(approvedScenePath) ? relative(approvedScenePath) : null,
      changes: relative(join(fixtureRoot, "scene-changes.json")), changeCount: sceneDelta.length },
    settlement: { sourceFidelityRun: runId, differingFiles: settlement.files.filter((file) => file.status === "fail"),
      unapprovedFiles: settlement.files.filter((file) => file.status === "unapproved") },
    environment: relative(join(runRoot, "environment.json")) };
    writeFileSync(join(fixtureRoot, `${surface}.json`), stableStringify(row));
    fixtureRows.push(row);
    rows.push(row);
  }
  const packetLink = (path) => relativePath(fixtureRoot, join(repoRoot, path)).replaceAll("\\", "/");
  const table = fixtureRows.map((row) => `| ${row.surface} | ${row.capture.status} | ${row.capture.kind} | [candidate](${packetLink(row.capture.candidate)}) | ${row.capture.approved ? `[approved](${packetLink(row.capture.approved)})` : "—"} |`).join("\n");
  writeFileSync(join(fixtureRoot, "README.md"), `# ${fixture.id} reference review\n\nExact ZIP: \`${source.zipSha256}\`. Embedded source preview: [image](source-preview.png).\n\n| Surface | Comparison | Evidence class | Candidate | Approved |\n| --- | --- | --- | --- | --- |\n${table}\n\nScene: ${scene.status}; ${sceneDelta.length} exact JSON changes in [scene-changes.json](scene-changes.json). Each surface JSON also links renderer structure, fonts/environment and settlement status. No source-fidelity approval is implied.\n`);
}
writeFileSync(join(outputRoot, "index.json"), stableStringify({ runId, sourceFidelityRun: settlementRun.sourceFidelityRun,
  fixtureCount: fixtures.length, surfaceCount: rows.length, packetComplete: true, capturesComplete: rendererComparison.capturesComplete,
  repeatStable: rendererComparison.repeatStable, environment: relative(join(runRoot, "environment.json")),
  rows: rows.map(({ fixtureId, surface, capture, scene, settlement }) => ({ fixtureId, surface, comparison: capture.status,
    kind: capture.kind, scene: scene.status, settlement: settlement.differingFiles.length ? "reference-difference" : "missing-approved-reference",
    packet: relative(join(outputRoot, fixtureId, `${surface}.json`)) })) }));
console.log(`Reference review packet: ${fixtures.length} exact fixtures, ${rows.length} surfaces, ${outputRoot}`);
