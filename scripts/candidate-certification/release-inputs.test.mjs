import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertCertificationRun, verifyReleaseInputs } from './release-inputs.mjs';
import { freezeCandidate, frozenName } from './frozen.mjs';
import { stubArchives } from '../release-delivery/fixtures.mjs';
import { generateDeliveryBundle, sha256 } from '../release-delivery/bundle.mjs';

test('release fixtures require a successful certification from this repository', () => {
  const run = { repository: { full_name: 'Sleinity/template-tool' }, path: '.github/workflows/candidate-certification.yml', status: 'completed', conclusion: 'success' };
  assertCertificationRun(run, 'Sleinity/template-tool');
  for (const change of [{ repository: { full_name: 'other/repository' } }, { path: '.github/workflows/release.yml' }, { status: 'in_progress' }, { conclusion: 'failure' }]) {
    assert.throws(() => assertCertificationRun({ ...run, ...change }, 'Sleinity/template-tool'));
  }
});

test('wrong or missing approved manifest identity rejects inputs before decryption', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'release-input-binding-'));
  try {
    await stubArchives(dir);
    const delivery = join(dir, 'delivery');
    await generateDeliveryBundle({ archivesDirectory: dir, outputDirectory: delivery });
    await writeFile(join(delivery, 'LOCAL-CANDIDATE-MANIFEST.json'), JSON.stringify({ source: { files: [] } }));
    await freezeCandidate(delivery);
    const expected = sha256(await readFile(join(delivery, frozenName)));
    await verifyReleaseInputs(delivery, expected);
    await assert.rejects(() => verifyReleaseInputs(delivery, ''), /SDK_RELEASE_FROZEN_SHA256/);
    await assert.rejects(() => verifyReleaseInputs(delivery, '0'.repeat(64)), /differs from the approved/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
