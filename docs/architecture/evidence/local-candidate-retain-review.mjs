/** Retain already reviewed dispositions only for unchanged source-faithful output.
 * This never promotes or writes approved references. All checks precede writes.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadManifest, repoRoot, sha256, stableStringify, surfaces, verifyFixture } from "../../../scripts/fidelity/core.mjs";
import { readSdkGateCaptureRun, selectSdkGateFixtures } from "../../../scripts/fidelity/gate-profile.mjs";
import { readSdkGateDisposition, sdkGateSourceReviewComplete, trackedSdkGateDispositionPath, validateSdkGateDisposition } from "../../../scripts/fidelity/gate-disposition.mjs";
import { validateSdkGateComparisons, validateSdkGateEnvironments } from "../../../scripts/fidelity/gate-evidence.mjs";
import { loadExactFontManifest } from "../../../scripts/fidelity/fonts.mjs";

const runId = process.argv[2];
assert(runId && /^[a-zA-Z0-9_-]+$/.test(runId), "Supply the exact new capture run ID");
const read = file => JSON.parse(readFileSync(file, "utf8"));
const baseline = read(join(repoRoot, "docs/architecture/evidence/field-render-evidence-20261009.json"));
const beforeRun = baseline.gate.runId;
assert.notEqual(runId, beforeRun);
const fixtures = selectSdkGateFixtures(loadManifest());
for (const fixture of fixtures) verifyFixture(loadManifest(), fixture);
loadExactFontManifest(fixtures.flatMap(item => item.requiredFonts ?? []));
const root = join(repoRoot, "fidelity/candidates");
const current = readSdkGateCaptureRun(root, runId, fixtures);
const previous = readSdkGateCaptureRun(root, beforeRun, fixtures);
const archiveRelative = `fidelity/gates/archive/sdk-061-dispositions-${beforeRun}.json`;
const archivePath = join(repoRoot, archiveRelative);
// Regeneration reads the immutable parent once it has been archived. The tracked
// disposition may already point at this run; it must not become its own parent.
const previousReview = existsSync(archivePath)
  ? validateSdkGateDisposition(read(archivePath), fixtures, beforeRun, sha256(JSON.stringify(previous.environment)))
  : readSdkGateDisposition(fixtures, beforeRun, previous.environment);
assert(sdkGateSourceReviewComplete(previousReview), "Previous individual source reviews must be complete");

function reviewEnvironment(value) {
  const copy = structuredClone(value);
  // Observational timing/memory only; retain every source/font/raster/tooling field.
  delete copy.testTimestamp;
  delete copy.approximateProcessMemoryBytes;
  for (const decision of copy.fontDecisions ?? []) delete decision.uploadAndLinkMs;
  return copy;
}
assert.deepEqual(reviewEnvironment(current.environment), reviewEnvironment(previous.environment), "Source/font/raster/tooling environment must match");
const renderer = read(join(root, runId, "comparison.json"));
const scene = read(join(repoRoot, "fidelity/scene-graph/candidates", runId, "comparison.json"));
const settlement = read(join(repoRoot, "fidelity/settlement/candidates", runId, "reference-comparison.json"));
validateSdkGateComparisons({ runId, fixtures, renderer, scene, settlement });
validateSdkGateEnvironments({ fidelity: current.environment,
  scene: read(join(repoRoot, "fidelity/scene-graph/candidates", runId, "environment.json")),
  settlement: read(join(repoRoot, "fidelity/settlement/candidates", runId, "environment.json")) });
assert(renderer.capturesComplete && renderer.repeatStable);
assert(renderer.comparisons.every(item => item.status === "pass"));
assert(scene.comparisons.every(item => item.status === "pass"));
assert(settlement.comparisons.every(item => item.equal));

const evidence = [];
for (const fixture of fixtures) for (const surface of surfaces) {
  const item = previousReview.fixtures.find(item => item.id === fixture.id).surfaces[surface];
  const previousPng = readFileSync(join(root, beforeRun, fixture.id, surface, "capture-1.png"));
  const currentPng = readFileSync(join(root, runId, fixture.id, surface, "capture-1.png"));
  assert.equal(sha256(previousPng), item.candidatePngSha256, "Reviewed PNG identity must match");
  assert.equal(sha256(currentPng), sha256(previousPng), `${fixture.id}/${surface}: changed output requires new review`);
  evidence.push({ fixtureId: fixture.id, surface, pngSha256: sha256(currentPng), retainedFrom: beforeRun });
}
const oldBytes = readFileSync(existsSync(archivePath) ? archivePath : trackedSdkGateDispositionPath);
const next = structuredClone(previousReview);
next.runId = runId;
next.environmentSha256 = sha256(JSON.stringify(current.environment));
const rationale = `Retained for ${runId} after exact ZIP/template/preview/font identities, unchanged raster/tooling environment, twelve byte-identical reviewed PNGs and passing unchanged renderer/scene/settlement references. Automated and stored-identity review; no new manual source review or reference promotion.`;
for (const fixture of next.fixtures) {
  for (const surface of surfaces) {
    for (const item of [fixture.surfaces[surface], fixture.settlement[surface]]) {
      item.priorSourceReview = archiveRelative;
      item.reviewRetainedFrom = beforeRun;
      item.reviewerRationale += ` ${rationale}`;
      item.regenerate = item.regenerate.replaceAll(beforeRun, runId);
    }
  }
  fixture.scene.priorSourceReview = archiveRelative;
  fixture.scene.reviewRetainedFrom = beforeRun;
  fixture.scene.reviewerRationale += ` ${rationale}`;
}
mkdirSync(join(repoRoot, "fidelity/gates/archive"), { recursive: true });
if (!existsSync(archivePath)) writeFileSync(archivePath, oldBytes);
writeFileSync(trackedSdkGateDispositionPath, stableStringify(next));
const record = { runId, beforeRun, archive: archiveRelative, sourceReview: "retained prior individual reviews after identity checks",
  manualLiveReview: false, referencePromotion: false,
  observationalEnvironmentFields: ["testTimestamp", "approximateProcessMemoryBytes", "fontDecisions.uploadAndLinkMs"], surfaces: evidence };
writeFileSync(join(root, runId, "retained-source-review.json"), stableStringify(record));
console.log(stableStringify(record));
