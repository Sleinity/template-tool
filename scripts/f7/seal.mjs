/** Bind fresh certification to immutable archives and current run-bound review. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceIdentity, verifyCandidateFiles } from '../repository/local-sdk-candidate.mjs';
import { loadRuntimePackageDefinitions } from '../repository/sdk-runtime-manifest.mjs';
const root = process.cwd(), output = 'docs/architecture/evidence/f7-readiness-20261015';
const directory = 'release-verification-artifacts/f7-readiness-20261015';
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const candidate = read(`${directory}/LOCAL-CANDIDATE-MANIFEST.json`);
await verifyCandidateFiles(directory, candidate, await loadRuntimePackageDefinitions(root), '1.0.0');
const priorDirectory = 'release-verification-artifacts/sdk-v2-optimized-20261015';
const prior = read(`${priorDirectory}/LOCAL-CANDIDATE-MANIFEST.json`);
await verifyCandidateFiles(priorDirectory, prior, await loadRuntimePackageDefinitions(root), '1.0.0');
const protectedFiles = read('docs/architecture/evidence/sdk-v2-certification-20261015/protected.json');
for (const [file, expected] of Object.entries(protectedFiles)) assert.equal(hash(readFileSync(file)), expected, file);
const checkpoint = read(`${output}/candidate/identity.json`);
for (const [file, expected] of Object.entries(checkpoint.files)) assert.equal(hash(readFileSync(file)), expected, file);
const gate = read('fidelity/candidates/sdk-f7-readiness-20261015/sdk-gate.json');
assert(gate.go); assert(gate.results.every(item => item.exitCode === 0));
const review = read(`${output}/source-review.json`);
assert.equal(review.candidateId, candidate.candidateId); assert.equal(review.runId, gate.runId);
assert.equal(review.environmentSha256, hash(JSON.stringify(gate.environment)));
assert.equal(review.surfaces.length, 12);
const checks = read(`${output}/verification.json`);
assert(checks.checks.length >= 12); assert(checks.checks.every(item => item.exitCode === 0));
for (const manager of ['npm', 'pnpm']) {
  const consumer = read(`${directory}/CONSUMER-VERIFICATION-${manager}.json`);
  assert(consumer.passed); assert.equal(consumer.candidateId, candidate.candidateId);
}
const metadataAllowed = new Set([
  'fidelity/gates/sdk-061-dispositions.json',
  'docs/architecture/f7-readiness-publication.md',
  ...['STATUS.md', 'HANDOFF.md', 'CAPABILITIES.md', 'PROPERTY_AUTHORITY.md', 'ARCHITECTURE.md', 'decisions/README.md', 'decisions/0098-family-media-readiness-publication.md'].map(p => 'docs/renderer-fidelity/' + p),
]);
const changes = candidate.source.files.flatMap(file => {
  const current = hash(readFileSync(file.file));
  if (current === file.sha256) return [];
  assert(metadataAllowed.has(file.file), 'Unexpected post-pack change: ' + file.file);
  return [{ file: file.file, packedSha256: file.sha256, currentSha256: current }];
});
const current = await sourceIdentity(root);
const packedFiles = new Set(candidate.source.files.map(f => f.file));
const additions = current.files.filter(f => !packedFiles.has(f.file));
assert(additions.every(f => f.file.startsWith(output + '/') || f.file.startsWith('fidelity/gates/archive/')), 'Unexpected post-pack addition');
const certificate = { schemaVersion: 'sdk-candidate-certification-v1', recordedAt: new Date().toISOString(), decision: 'GO',
  candidateId: candidate.candidateId, sourceIdentity: candidate.source.filesSha256, sourceFilesAtPack: candidate.source.files.length,
  archives: candidate.archives, gateRun: gate.runId, environment: gate.environment,
  sourceReview: { file: `${output}/source-review.json`, sha256: hash(readFileSync(`${output}/source-review.json`)) },
  verification: { file: `${output}/verification.json`, sha256: hash(readFileSync(`${output}/verification.json`)) },
  sourceChangesAfterPack: changes, sourceAdditionsAfterPack: additions,
  productionCheckpointFilesUnchanged: Object.keys(checkpoint.files).length,
  protectedFilesUnchanged: Object.keys(protectedFiles).length,
  previousCertifiedCandidateUnchanged: prior.candidateId,
  packingManifestPreserved: candidate.certification, publication: false, referencePromotion: false,
  limitation: 'Local automated headless browser workflows and personally reviewed stored comparison sheets; no manual live user-browser or other-platform certification.' };
for (const file of [`${output}/certification.json`, `${directory}/certification.json`]) writeFileSync(file, JSON.stringify(certificate, null, 2) + '\n');
writeFileSync(`${output}/sdk-gate.json`, JSON.stringify(gate, null, 2) + '\n');
console.log(JSON.stringify({ decision: certificate.decision, candidateId: certificate.candidateId, postPackMetadataChanges: changes.length, protected: certificate.protectedFilesUnchanged }));
