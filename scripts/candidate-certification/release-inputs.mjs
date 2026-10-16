/** Release-only input binding. No fixture decryption or publication happens here. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { verifyFrozenCandidate, frozenName } from './frozen.mjs';
import { sha256 } from '../release-delivery/bundle.mjs';
import { resolveFixedRuntimeVersion } from '../repository/sdk-runtime-manifest.mjs';

export function assertCertificationRun(run, repository) {
  assert.equal(run.repository?.full_name, repository, 'Certification must belong to this repository');
  assert.equal(run.path, '.github/workflows/candidate-certification.yml', 'Expected the frozen candidate workflow');
  assert.equal(run.status, 'completed', 'Certification must be complete');
  assert.equal(run.conclusion, 'success', 'Certification must have passed');
}

export async function verifyReleaseInputs(directory, expectedSha256) {
  assert.match(expectedSha256 ?? '', /^[a-f0-9]{64}$/, 'SDK_RELEASE_FROZEN_SHA256 must identify the approved frozen manifest');
  const bytes = await readFile(path.join(directory, frozenName));
  assert.equal(sha256(bytes), expectedSha256, 'Downloaded candidate differs from the approved frozen manifest');
  const frozen = await verifyFrozenCandidate(directory, { sources: true });
  assert.equal(frozen.version, await resolveFixedRuntimeVersion(), 'Candidate must match the fixed SDK version');
  return frozen;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [, , command, argument] = process.argv;
  if (command === 'check-run') {
    assert.match(argument ?? '', /^\d+$/, 'SDK_RELEASE_CERTIFICATION_RUN_ID is required');
    const repository = process.env.GITHUB_REPOSITORY;
    assert.match(repository ?? '', /^[\w.-]+\/[\w.-]+$/);
    const run = JSON.parse(execFileSync('gh', ['api', `repos/${repository}/actions/runs/${argument}`], { encoding: 'utf8' }));
    assertCertificationRun(run, repository);
    console.log(`Accepted completed certification run ${run.id} at ${run.head_sha}`);
  } else if (command === 'verify') {
    const directory = path.resolve(argument);
    assert(!/[\r\n]/.test(directory));
    const frozen = await verifyReleaseInputs(directory, process.env.SDK_RELEASE_FROZEN_SHA256);
    if (process.env.GITHUB_ENV) await writeFile(process.env.GITHUB_ENV, `SDK_CERTIFIED_ARCHIVES=${directory}\n`, { flag: 'a' });
    console.log(`Verified approved SDK ${frozen.version} inputs and ${frozen.certifiedSourceFiles.length} source files before fixture decryption`);
  } else throw new Error('Expected check-run RUN_ID or verify ARCHIVES');
}
