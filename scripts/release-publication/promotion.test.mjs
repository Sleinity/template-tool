import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDescriptor, sha256 } from './candidate.mjs';
import { validateAcceptance, validateFidelity } from './promotion.mjs';
test('promotion requires all twelve registry workflows on the exact train and tag', async () => {
  const d = await loadDescriptor(),
    tag = 'a'.repeat(40),
    report = {
      status: 'pass',
      mode: 'registry',
      candidate: d.candidate,
      environment: { platform: 'linux' },
      tagCommit: tag,
      archives: d.archives,
      deliveryManifestSha256: 'b'.repeat(64),
      rows: ['npm', 'pnpm'].flatMap((manager) =>
        [
          'consumer',
          'example',
          'fonts',
          'storage',
          'v1-single',
          'v1-family',
        ].map((name) => ({
          manager,
          name,
          exitCode: 0,
          installationMode: 'registry',
          logSha256: 'c'.repeat(64),
        })),
      ),
    };
  validateAcceptance(report, d, 'linux', tag);
  for (const patch of [
    { status: 'fail' },
    { mode: 'archive' },
    { tagCommit: 'other' },
    { archives: [] },
    { rows: report.rows.slice(1) },
    { environment: { platform: 'darwin' } },
    { rows: report.rows.map((r, i) => (i ? r : { ...r, exitCode: 1 })) },
    { rows: report.rows.map((r, i) => (i ? r : report.rows[1])) },
  ])
    assert.throws(() =>
      validateAcceptance({ ...report, ...patch }, d, 'linux', tag),
    );
});
test('fidelity gate cannot promote missing, reduced or changed-reference evidence', async () => {
  const d = await loadDescriptor(),
    report = {
      status: 'pass',
      candidate: d.candidate,
      stableCaptures: 24,
      rendererPasses: 12,
      scenePasses: 3,
      settlementPasses: 12,
      referenceChanges: 0,
      toleranceChanges: 0,
      environment: { platform: 'darwin' },
      camera: 'studio-reference-20261012',
      fontProfile: 'source-authoritative',
      archives: d.archives,
      fixtureManifestSha256: d.sourceFiles.find(
        (r) => r.file === 'fidelity/fixtures.json',
      ).sha256,
      fontManifestSha256: d.sourceFiles.find(
        (r) => r.file === 'fidelity/fonts.json',
      ).sha256,
      runtimeSourceSha256: sha256(
        JSON.stringify(
          d.sourceFiles.filter((r) =>
            /^(packages\/|apps\/studio\/src\/)/.test(r.file),
          ),
        ),
      ),
    };
  validateFidelity(report, d);
  for (const patch of [
    { stableCaptures: 23 },
    { rendererPasses: 11 },
    { scenePasses: 2 },
    { settlementPasses: 11 },
    { referenceChanges: 1 },
    { toleranceChanges: 1 },
    { environment: { platform: 'linux' } },
    { camera: 'other' },
    { fontProfile: 'system' },
    { runtimeSourceSha256: 'other' },
    { fixtureManifestSha256: 'other' },
  ])
    assert.throws(() => validateFidelity({ ...report, ...patch }, d));
});

test('remote release tag resolution rejects a moved or unsupported tag', async () => {
  const { resolveRemoteTag } = await import('./promotion.mjs');
  const commit = 'a'.repeat(40),
    annotation = 'b'.repeat(40);
  assert.equal(
    resolveRemoteTag(() => ({ object: { sha: commit, type: 'commit' } })),
    commit,
  );
  assert.equal(
    resolveRemoteTag((p) => ({
      object: p.startsWith('git/ref')
        ? { sha: annotation, type: 'tag' }
        : { sha: commit, type: 'commit' },
    })),
    commit,
  );
  assert.throws(() =>
    resolveRemoteTag(() => ({ object: { sha: commit, type: 'tree' } })),
  );
  assert.throws(() =>
    resolveRemoteTag(() => ({ object: { sha: annotation, type: 'tag' } })),
  );
});
