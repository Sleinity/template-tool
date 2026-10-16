import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { stubArchives } from './fixtures.mjs';
import { verifyDeliveryBundle } from './bundle.mjs';

test('the isolated publication rehearsal generates a complete starter using installed tooling', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-rehearsal-test-'));
  try {
    const archives = join(root, 'archives');
    const output = join(root, 'delivery');
    await mkdir(archives);
    await stubArchives(archives);
    const result = spawnSync(process.execPath, [resolve('scripts/release-delivery/simulate-publication.mjs'), archives, output], {
      encoding: 'utf8',
      env: process.env,
      timeout: 60_000,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const receipt = JSON.parse(await readFile(join(output, 'PUBLICATION-PATH-SIMULATION.json'), 'utf8'));
    assert.equal(receipt.status, 'pass');
    assert.equal(receipt.samePrepareStep, true);
    assert.equal(receipt.packed.length, 3);
    assert.equal(new Set(receipt.packed).size, 3);
    assert.equal(receipt.uploadInventoryVerified, true);
    for (const action of ['uploaded', 'published', 'tagged']) assert.equal(receipt[action], false);
    const { manifest } = await verifyDeliveryBundle(output);
    assert.equal(manifest.provenance, 'test-simulation');
    assert(manifest.uploadFiles.includes('SDK-HOST-STARTER.zip'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
