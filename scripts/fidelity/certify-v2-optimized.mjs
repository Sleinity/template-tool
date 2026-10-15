/** Run-bound stored-source review for the immutable optimized candidate.
 * No renderer, reference, archive or packing-manifest writes.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadManifest, repoRoot, sha256, stableStringify, surfaces, verifyFixture } from './core.mjs';
import { loadExactFontManifest } from './fonts.mjs';
import { readSdkGateCaptureRun, selectSdkGateFixtures } from './gate-profile.mjs';
import { trackedSdkGateDispositionPath, validateSdkGateDisposition } from './gate-disposition.mjs';
import { validateSdkGateComparisons, validateSdkGateEnvironments } from './gate-evidence.mjs';

const runId = 'sdk-v2-optimized-20261015';
const output = join(repoRoot, 'docs/architecture/evidence/sdk-v2-certification-20261015');
assert(!existsSync(join(output, 'source-review.json')), 'Review is immutable; use a new milestone for another candidate.');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const candidateDirectory = join(repoRoot, 'release-verification-artifacts', runId);
const manifest = read(join(candidateDirectory, 'LOCAL-CANDIDATE-MANIFEST.json'));
assert.equal(manifest.certification, 'not-yet-verified');
assert.equal(manifest.source.files.length, 3798);
for (const file of manifest.source.files) assert.equal(sha256(readFileSync(join(repoRoot, file.file))), file.sha256, `Candidate source differs: ${file.file}`);
for (const file of [...manifest.archives, ...manifest.documents]) assert.equal(sha256(readFileSync(join(candidateDirectory, file.file))), file.sha256, `Candidate artifact differs: ${file.file}`);
const fixtures = selectSdkGateFixtures(loadManifest());
const fonts = loadExactFontManifest(fixtures.flatMap(f => f.requiredFonts ?? []));
const root = join(repoRoot, 'fidelity/candidates', runId);
const capture = readSdkGateCaptureRun(join(repoRoot, 'fidelity/candidates'), runId, fixtures);
assert.equal(capture.environment.buildIdentifier, sha256(Buffer.concat([readFileSync(join(repoRoot, 'package.json')), readFileSync(join(repoRoot, 'pnpm-lock.yaml'))])));
const renderer = read(join(root, 'comparison.json'));
const scene = read(join(repoRoot, 'fidelity/scene-graph/candidates', runId, 'comparison.json'));
const settlement = read(join(repoRoot, 'fidelity/settlement/candidates', runId, 'reference-comparison.json'));
validateSdkGateComparisons({ runId, fixtures, renderer, scene, settlement });
validateSdkGateEnvironments({ fidelity: capture.environment,
  scene: read(join(repoRoot, 'fidelity/scene-graph/candidates', runId, 'environment.json')),
  settlement: read(join(repoRoot, 'fidelity/settlement/candidates', runId, 'environment.json')) });
assert(renderer.capturesComplete && renderer.repeatStable);
assert(renderer.comparisons.every(item => item.status === 'pass'));
assert(scene.comparisons.every(item => item.status === 'pass'));
assert(settlement.comparisons.every(item => item.equal));
assert.deepEqual(capture.environment.fallbackFonts, []);
for (const font of fonts.fonts) assert(capture.environment.fontSources.some(f => f.sha256 === font.sha256 && f.byteSize === font.byteSize));

// These are current stored-image observations by Codex, not automated pixel approval
// or a claim of manual live interaction. Historical review is supplementary only.
const observations = {
  'exporter-061-now-hiring': 'Personally inspected the exact embedded preview and all four current stored captures: the photo retains its subject and aspect, NOW/HIRING badges occupy the source corners, and headline/body/CTA retain their text, wrapping, hierarchy and olive/yellow paints. Current source-sized PNG differs from the source at the same 340 comparator pixels documented by the prior source review; exact managed font identities, source bounds and current placement evidence support retaining that bounded raster difference.',
  'exporter-061-cover': 'Personally inspected the exact embedded preview and all four current stored captures: the phone/hand, continuous dark footer fade, open SVG arrow inside the white circle, outlined Swipe control and footer wordmark are present with the source hierarchy. Exact source-sized PNG has the previously reviewed 2830 comparator pixels of text/image raster differences. The source-indexed SOLID/IMAGE/DARKEN owner and single vector stroke remain visible; no hard image edge or duplicate arrow border has returned.',
  'exporter-061-carrousel': 'Personally inspected the exact embedded preview and all four current stored captures: the rotated central image, two partially clipped thumbnails, discount/subtitle badges, two-column layout, headline, CTA and footer retain source intent. The source spelling in-storeee is preserved. The declared rectangular mask and current CROP/FILL evidence retain distinct roles. Source-sized PNG retains the previously reviewed 1817 comparator-pixel difference; the R07 viewport-history raster rationale remains bounded to its documented native sampling behavior.',
};
const priorBytes = readFileSync(trackedSdkGateDispositionPath);
const prior = JSON.parse(priorBytes);
const priorPath = `fidelity/gates/archive/sdk-061-dispositions-${prior.runId}.json`;
const rows = [];
const record = { schemaVersion: 'sdk-061-dispositions-v1', gate: 'sdk-061', runId,
  environmentSha256: sha256(JSON.stringify(capture.environment)),
  regenerate: 'pnpm sdk:gate:061 -- --run-id <new-unique-run>', fixtures: [] };
for (const fixture of fixtures) {
  const verified = verifyFixture(loadManifest(), fixture);
  const priorFixture = prior.fixtures.find(f => f.id === fixture.id);
  const entry = { id: fixture.id, zipSha256: fixture.zipSha256, templateJsonSha256: fixture.templateJsonSha256,
    embeddedPreviewSha256: fixture.embeddedPreview.sha256, surfaces: {}, settlement: {},
    scene: { comparison: 'pass', sourceReview: 'reviewed-source-faithful', cause: 'Current semantic/provenance evidence equals the unchanged approved scene.',
      reviewerRationale: `Current exact source has ${Object.keys(verified.template.nodes).length} nodes. Source IDs and exported bounds were cross-checked on each surface; scene comparison passes. ${observations[fixture.id]}`,
      regenerate: 'pnpm scene:compare -- --gate sdk-061 --run-id <new-unique-run>' } };
  for (const surface of surfaces) {
    const base = join(root, fixture.id, surface);
    const structure = read(join(base, 'structure-1.json'));
    assert.equal(structure.nodes.length, Object.keys(verified.template.nodes).length);
    for (const node of structure.nodes) assert.deepEqual(node.exportedBounds, verified.template.nodes[node.id]?.bounds, `Source bounds ${fixture.id}/${surface}/${node.id}`);
    const png = readFileSync(join(base, 'capture-1.png'));
    const priorPng = readFileSync(join(repoRoot, 'fidelity/candidates', prior.runId, fixture.id, surface, 'capture-1.png'));
    assert.equal(sha256(priorPng), priorFixture.surfaces[surface].candidatePngSha256);
    assert.equal(sha256(png), sha256(priorPng), 'Record and individually inspect any new raster difference before review.');
    const surfaceRationale = surface === 'fields' ? 'The field inspection outlines are intentional UI evidence and absent from export.' : surface === 'validate' ? 'The bounds-first scaled inspection presentation was reviewed independently.' : surface === 'editor' ? 'The fitted editor capture retains source composition under its recorded viewport/camera history.' : 'The source-sized export has no inspection outlines or application UI.';
    entry.surfaces[surface] = { capture: 'complete-stable', comparison: 'pass', candidatePngSha256: sha256(png),
      sourceReview: 'reviewed-source-faithful', cause: 'Current stored-source review supports this surface; no new visual/data difference.',
      reviewerRationale: `${observations[fixture.id]} ${surfaceRationale} All exported source bounds match by deep equality, fonts are exact and assets decode. Prior run ${prior.runId} has byte-identical output, retained explicitly as supplementary historical evidence, despite changed SDK implementations and capture build identifier.`,
      priorSourceReview: priorPath, evidence: `fidelity/candidates/${runId}/${fixture.id}/${surface}`,
      regenerate: 'pnpm sdk:gate:061 -- --run-id <new-unique-run>' };
    entry.settlement[surface] = { comparison: 'pass', sourceReview: 'reviewed-source-faithful',
      cause: 'Current same-run observational settlement equals the unchanged approved bundle.',
      reviewerRationale: `Reviewed with ${surface}'s current source/geometry/media evidence and exact fonts. No new settlement authority is inferred; Carrousel retains ADR 0092 declared mask-scope evidence.`,
      regenerate: 'pnpm settlement:compare -- --gate sdk-061 --fidelity-run <same-run> --run-id <same-run>' };
    let sourceDifference = null;
    if (surface === 'png-export') {
      const comparison = read(`/tmp/sdk-v2-certification-review-20261015/${fixture.id}/${surface}.json`).capture.sourceComparison.candidate;
      sourceDifference = { pixels: comparison.changedPixelCount, percentage: comparison.changedPixelPercentage };
      assert.equal(sourceDifference.pixels, fixture.id.endsWith('now-hiring') ? 340 : fixture.id.endsWith('cover') ? 2830 : 1817);
    }
    rows.push({ fixtureId: fixture.id, surface, pngSha256: sha256(png), structureSha256: sha256(readFileSync(join(base, 'structure-1.json'))),
      sourceBoundsVerified: structure.nodes.length, priorRun: prior.runId, priorPngByteIdentical: true, sourceDifference });
  }
  record.fixtures.push(entry);
}
validateSdkGateDisposition(record, fixtures, runId, record.environmentSha256);
const protectedFiles = {};
function collect(directory) { if (!existsSync(directory)) return; for (const file of readdirSync(directory, { withFileTypes: true })) { const path = join(directory, file.name); if (file.isDirectory()) collect(path); else protectedFiles[path.slice(repoRoot.length + 1)] = sha256(readFileSync(path)); } }
for (const path of ['fidelity/references/approved', 'fidelity/scene-graph/snapshots/approved', 'fidelity/settlement/snapshots/approved']) collect(join(repoRoot, path));
for (const path of ['fidelity/fixtures.json', 'fidelity/fonts.json']) protectedFiles[path] = sha256(readFileSync(join(repoRoot, path)));
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'protected.json'), stableStringify(protectedFiles));
writeFileSync(join(output, 'verification-before.json'), readFileSync(join(candidateDirectory, 'verification.json')));
writeFileSync(join(output, 'source-review.json'), stableStringify({ schemaVersion: 'optimized-candidate-source-review-v1', reviewedAt: new Date().toISOString(),
  reviewer: 'Codex stored-source/capture review', manualLiveReview: false, referencePromotion: false,
  candidateId: manifest.candidateId, sourceIdentity: manifest.source.filesSha256, originalSourceFilesVerified: manifest.source.files.length,
  archiveIdentity: manifest.archives, runId, environmentSha256: record.environmentSha256, fonts: fonts.fonts.map(f => ({ id: f.id, sha256: f.sha256 })),
  historicalReview: priorPath, observations, surfaces: rows, disposition: record }));
const archive = join(repoRoot, priorPath);
mkdirSync(join(repoRoot, 'fidelity/gates/archive'), { recursive: true });
if (existsSync(archive)) assert.equal(sha256(readFileSync(archive)), sha256(priorBytes)); else writeFileSync(archive, priorBytes);
writeFileSync(trackedSdkGateDispositionPath, stableStringify(record));
console.log(`Verified ${manifest.source.files.length} original source files; recorded ${rows.length} individual stored-source reviews. Reassess the existing gate before certification.`);
