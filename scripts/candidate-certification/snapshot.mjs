import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

/** Hydrate all tracked evidence before copying the frozen source scope. */
export function cloneCertificationSource(root, directory, branch) {
  for (const [args, cwd] of [
    [['clone', '--no-hardlinks', '--quiet', root, directory], root],
    [['checkout', '-b', branch], directory],
  ]) {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
}

export function assertCertificationInputsOnly(actual, frozenFiles) {
  const expected = new Set([
    '.certification-input/fixtures.enc',
    '.certification-input/archives/FROZEN-CANDIDATE.json',
    ...frozenFiles.map(file => `.certification-input/archives/${file}`),
  ]);
  assert.equal(actual.length, expected.size, 'Snapshot must stage exactly the approved input files');
  assert.equal(new Set(actual).size, actual.length, 'Duplicate staged input path');
  assert(actual.every(file => expected.has(file)), 'Snapshot must not stage source changes, deletions or unapproved inputs');
}
