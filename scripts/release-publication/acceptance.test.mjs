import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sha256 } from './candidate.mjs';
import {
  installationMode,
  validateRegistryLock,
  archiveFiles,
} from './host-installation.mjs';
import {
  validateFixtureArtifact,
  restoreReleaseFixtureBytes,
} from './fixtures.mjs';
import {
  encryptFixturePayload,
  decryptFixturePayload,
} from '../candidate-certification/fixtures.mjs';
test('registry mode refuses workspace fallback, wrong versions, authorities and integrity', () => {
  const records = [
    {
      name: '@sleinity/template-core',
      version: '1.0.0',
      integrity: 'sha512-exact',
      tarballUrlSha256: sha256('https://npm.pkg.github.com/download/core'),
    },
  ];
  const item = {
    version: '1.0.0',
    resolved: 'https://npm.pkg.github.com/download/core',
    integrity: 'sha512-exact',
  };
  const lock = (value) =>
    JSON.stringify({
      packages: { 'node_modules/@sleinity/template-core': value },
    });
  validateRegistryLock(lock(item), 'npm', records);
  for (const patch of [
    { version: '0.8.0' },
    { resolved: 'https://registry.npmjs.org/core' },
    { resolved: 'file:vendor/core.tgz' },
    { integrity: 'sha512-wrong' },
  ])
    assert.throws(() =>
      validateRegistryLock(lock({ ...item, ...patch }), 'npm', records),
    );
  assert.throws(() =>
    validateRegistryLock(lock({ ...item, link: 'workspace:' }), 'npm', records),
  );
  validateRegistryLock(
    "packages:\n  '@sleinity/template-core@1.0.0':\n    resolution: {integrity: sha512-exact, tarball: https://npm.pkg.github.com/download/core}\n",
    'pnpm',
    records,
  );
  assert.throws(() =>
    validateRegistryLock(
      "packages:\n  '@sleinity/template-core@0.8.0':\n    resolution: {integrity: sha512-exact, tarball: https://npm.pkg.github.com/download/core}\n",
      'pnpm',
      records,
    ),
  );
  assert.throws(() =>
    validateRegistryLock(
      "packages:\n  '@sleinity/template-core@1.0.0':\n    resolution: {integrity: sha512-other, tarball: https://npm.pkg.github.com/download/wrong}\n  other@1:\n    resolution: {integrity: sha512-exact, tarball: https://npm.pkg.github.com/download/core}\n",
      'pnpm',
      records,
    ),
  );
  assert.equal(installationMode({}), 'archive');
  assert.equal(
    installationMode({ SDK_HOST_INSTALLATION: 'registry' }),
    'registry',
  );
  assert.throws(() => installationMode({ SDK_HOST_INSTALLATION: 'workspace' }));
  assert.throws(() => archiveFiles(Buffer.from('not-gzip')));
});
test('fixture artifact requires exact identity and unexpired authenticated bytes', async () => {
  const p = {
    id: 1,
    name: 'sealed',
    digest: 'sha256:test',
    runId: 2,
    headSha: 'head',
  };
  const a = {
    id: 1,
    name: 'sealed',
    digest: 'sha256:test',
    expired: false,
    expires_at: '2099-01-01',
    workflow_run: { id: 2, head_sha: 'head' },
  };
  validateFixtureArtifact(a, p);
  for (const patch of [
    { id: 9 },
    { digest: 'other' },
    { expired: true },
    { expires_at: '2000-01-01' },
    { workflow_run: { id: 2, head_sha: 'other' } },
  ])
    assert.throws(() => validateFixtureArtifact({ ...a, ...patch }, p));
  await assert.rejects(() =>
    restoreReleaseFixtureBytes(Buffer.from('wrong'), '/tmp/never-written'),
  );
  const key = Buffer.alloc(32, 1),
    payload = {
      schemaVersion: 'sdk-cert-fixtures-v1',
      files: [],
      environment: {},
    };
  const first = encryptFixturePayload(payload, key),
    second = encryptFixturePayload(payload, key);
  assert.notDeepEqual(first, second);
  assert.deepEqual(decryptFixturePayload(first, key), payload);
  assert.throws(() => decryptFixturePayload(first, Buffer.alloc(32, 2)));
  const tampered = Buffer.from(first);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decryptFixturePayload(tampered, key));
});
test('full preparation never publishes or uploads plaintext reports', async () => {
  const source = await readFile(
    '.github/workflows/release-preparation.yml',
    'utf8',
  );
  assert(source.includes('acceptance.mjs --mode archive'));
  assert(
    !/packages: write|contents: write|cli\.mjs publish|pull_request_target/.test(
      source,
    ),
  );
  assert(source.includes('retention-days: 3'));
  assert(source.includes('if: always()'));
  assert(source.includes('Remove plaintext'));
  assert(!source.includes('exact-fixtures/**'));
  assert(!source.includes('acceptance/**'));
  const orchestrator = await readFile(
    'scripts/release-publication/acceptance.mjs',
    'utf8',
  );
  assert(orchestrator.includes('verifySource(d)'));
  assert(orchestrator.replace(/\s/g, '').includes('verifyArchives(d,frozen)'));
  for (const name of [
    'consumer',
    'example',
    'fonts',
    'storage',
    'v1-single',
    'v1-family',
  ])
    assert(orchestrator.includes("'" + name + "'"));
  assert(!orchestrator.includes('sources:true'));
});
