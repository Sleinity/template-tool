/** Private, authenticated test intake. Never used by SDK rendering or delivered to hosts. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { pathToFileURL } from 'node:url';
import { loadDescriptor, sha256 } from './candidate.mjs';
import { github, githubJson } from './github.mjs';
import { restoreFixtures } from '../candidate-certification/fixtures.mjs';
import { loadManifest, verifyFixture } from '../fidelity/core.mjs';
import { selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { loadExactFontManifest } from '../fidelity/fonts.mjs';
export const ciphertextSha256 =
  '7e89fb8cdd2931272342d9e701f220720cf7037bb964571141850973cff7dd6a';
export function sealedFixtureBytes(zip, digest) {
  assert.equal('sha256:' + sha256(zip), digest);
  const bytes = unzipSync(zip)['fixtures.enc'];
  assert(bytes, 'Sealed fixtures absent');
  return Buffer.from(bytes);
}
export function validateFixtureArtifact(a, pin) {
  assert.equal(a.id, pin.id);
  assert.equal(a.name, pin.name);
  assert.equal(a.digest, pin.digest);
  assert.equal(a.expired, false);
  assert(Date.parse(a.expires_at) > Date.now());
  assert.equal(a.workflow_run.id, pin.runId);
  assert.equal(a.workflow_run.head_sha, pin.headSha);
}
export async function retainSealedFixtures(output) {
  const d = await loadDescriptor(),
    pin = d.fixtureArtifact ?? d.originArtifact,
    a = githubJson('actions/artifacts/' + pin.id),
    run = githubJson('actions/runs/' + pin.runId);
  validateFixtureArtifact(a, pin);
  assert.equal(run.conclusion, 'success');
  const zip = github('actions/artifacts/' + pin.id + '/zip', { binary: true });
  const cipher = sealedFixtureBytes(zip, pin.digest);
  assert.equal(sha256(cipher), ciphertextSha256);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'fixtures.enc'), cipher, {
    flag: 'wx',
    mode: 0o600,
  });
  return {
    ciphertextSha256,
    originArtifact: pin.id,
    plaintextTransferred: false,
  };
}
export async function restoreReleaseFixtures(directory) {
  const d = await loadDescriptor(),
    pin = d.fixtureArtifact;
  assert(pin, 'A pinned sealed fixture artifact is required');
  const a = githubJson('actions/artifacts/' + pin.id),
    run = githubJson('actions/runs/' + pin.runId);
  validateFixtureArtifact(a, pin);
  assert.equal(run.conclusion, 'success');
  const zip = github('actions/artifacts/' + pin.id + '/zip', { binary: true });
  const bytes = sealedFixtureBytes(zip, pin.digest);
  assert.equal(sha256(bytes), ciphertextSha256);
  return restoreReleaseFixtureBytes(bytes, directory);
}
export async function restoreReleaseFixtureBytes(bytes, directory) {
  assert.equal(sha256(bytes), ciphertextSha256);
  const key = Buffer.from(process.env.SDK_CERT_FIXTURE_KEY ?? '', 'hex');
  assert.equal(key.length, 32, 'Fixture decryption credential unavailable');
  try {
    const env = await restoreFixtures(bytes, key, directory);
    for (const [k, v] of Object.entries(env)) {
      assert(!/[\r\n\0]/.test(v));
      process.env[k] = v;
    }
    const manifest = loadManifest();
    const fixtures = selectSdkGateFixtures(manifest);
    for (const f of fixtures) verifyFixture(manifest, f, env);
    const fonts = loadExactFontManifest([
      ...fixtures.flatMap((f) => f.requiredFonts),
      { family: 'Funnel Sans', weight: 400, style: 'normal' },
    ]).fonts;
    for (const f of fonts)
      assert.equal(sha256(await readFile(f.path)), f.sha256);
    return {
      environment: env,
      fixtureIds: fixtures.map((f) => f.id),
      fontIds: fonts.map((f) => f.id),
      ciphertextSha256,
    };
  } catch (e) {
    await rm(directory, { recursive: true, force: true });
    throw e;
  }
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const [mode, input, output] = process.argv.slice(2);
  assert(['retain', 'restore', 'restore-file'].includes(mode));
  if (mode === 'retain')
    console.log(JSON.stringify(await retainSealedFixtures(input)));
  else {
    const result =
      mode === 'restore'
        ? await restoreReleaseFixtures(input)
        : await restoreReleaseFixtureBytes(await readFile(input), output);
    const dir = mode === 'restore' ? input : output;
    await writeFile(
      path.join(dir, 'environment.json'),
      JSON.stringify(result.environment),
    );
    if (process.env.GITHUB_ENV)
      await writeFile(
        process.env.GITHUB_ENV,
        Object.entries(result.environment)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n') + '\n',
        { flag: 'a' },
      );
    console.log(
      JSON.stringify({
        fixtureIds: result.fixtureIds,
        fontIds: result.fontIds,
        authenticated: true,
      }),
    );
  }
}
