/** Stable promotion accepts complete, immutable evidence; never synthesizes a pass. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { execFileSync } from 'node:child_process';
import {
  loadDescriptor,
  verifySource,
  sha256,
  safeRelative,
} from './candidate.mjs';
import { github, githubJson, preflightGithub } from './github.mjs';
import { RegistryReadClient } from './registry.mjs';
import { protectReleaseAssets } from './driver.mjs';
const required = [
  'consumer',
  'example',
  'fonts',
  'storage',
  'v1-single',
  'v1-family',
];
export function validateAcceptance(report, d, platform, tagCommit) {
  assert.equal(report.status, 'pass');
  assert.equal(report.mode, 'registry');
  assert.equal(report.candidate, d.candidate);
  assert.equal(report.environment.platform, platform);
  assert.equal(report.tagCommit, tagCommit);
  assert.deepEqual(report.archives, d.archives);
  assert.equal(report.rows.length, 12);
  for (const manager of ['npm', 'pnpm'])
    for (const name of required) {
      const rows = report.rows.filter(
        (r) => r.manager === manager && r.name === name,
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0].exitCode, 0);
      assert.equal(rows[0].installationMode, 'registry');
      assert.match(rows[0].logSha256, /^[a-f0-9]{64}$/);
    }
  assert(report.deliveryManifestSha256);
}
export function validateFidelity(report, d) {
  assert.equal(report.status, 'pass');
  assert.equal(report.candidate, d.candidate);
  assert.equal(report.stableCaptures, 24);
  assert.equal(report.rendererPasses, 12);
  assert.equal(report.scenePasses, 3);
  assert.equal(report.settlementPasses, 12);
  assert.equal(report.referenceChanges, 0);
  assert.equal(report.toleranceChanges, 0);
  assert.equal(report.environment.platform, 'darwin');
  assert.equal(report.camera, 'studio-reference-20261012');
  assert.equal(report.fontProfile, 'source-authoritative');
  assert.deepEqual(report.archives, d.archives);
  assert.equal(
    report.fixtureManifestSha256,
    d.sourceFiles.find((r) => r.file === 'fidelity/fixtures.json').sha256,
  );
  assert.equal(
    report.fontManifestSha256,
    d.sourceFiles.find((r) => r.file === 'fidelity/fonts.json').sha256,
  );
  assert.equal(
    report.runtimeSourceSha256,
    sha256(
      JSON.stringify(
        d.sourceFiles.filter((r) =>
          /^(packages\/|apps\/studio\/src\/)/.test(r.file),
        ),
      ),
    ),
  );
}
export async function resolveReleaseTag() {
  const d = await loadDescriptor();
  return execFileSync(
    'git',
    ['rev-parse', `refs/tags/sdk-v${d.version}^{commit}`],
    { encoding: 'utf8' },
  ).trim();
}
export async function promoteStable() {
  const d = await loadDescriptor();
  await verifySource(d);
  preflightGithub();
  assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(process.env.GITHUB_REF, 'refs/heads/main');
  assert.equal(process.env.GITHUB_REPOSITORY, d.repository);
  assert.equal(process.env.SDK_RELEASE_ENVIRONMENT, 'private-sdk-release');
  const evidence = JSON.parse(
    await readFile('config/sdk-release-verification.json', 'utf8'),
  );
  assert.equal(
    evidence.status,
    'ready-for-human-promotion',
    'Complete release evidence is required',
  );
  assert.equal(evidence.candidate, d.candidate);
  const tagCommit = await resolveReleaseTag();
  assert.equal(evidence.tagCommit, tagCommit);
  const load = async (record) => {
    safeRelative(record.file);
    assert(record.file.startsWith('docs/architecture/evidence/'));
    const bytes = await readFile(record.file);
    assert.equal(sha256(bytes), record.sha256);
    return JSON.parse(bytes);
  };
  validateAcceptance(await load(evidence.macos), d, 'darwin', tagCommit);
  validateFidelity(await load(evidence.fidelity), d);
  const pin = evidence.linux,
    artifact = githubJson('actions/artifacts/' + pin.id),
    run = githubJson('actions/runs/' + pin.runId);
  assert.equal(run.conclusion, 'success');
  assert.equal(run.head_sha, pin.headSha);
  assert.equal(artifact.id, pin.id);
  assert.equal(artifact.workflow_run.id, pin.runId);
  assert.equal(artifact.workflow_run.head_sha, pin.headSha);
  assert.equal(artifact.digest, pin.digest);
  assert.equal(artifact.expired, false);
  assert(Date.parse(artifact.expires_at) > Date.now());
  const zip = github('actions/artifacts/' + pin.id + '/zip', { binary: true });
  assert.equal('sha256:' + sha256(zip), pin.digest);
  const entries = unzipSync(zip),
    linux = JSON.parse(new TextDecoder().decode(entries['report.json']));
  validateAcceptance(linux, d, 'linux', tagCommit);
  const inventory = JSON.parse(
    new TextDecoder().decode(entries['asset-inventory.json']),
  );
  assert.equal(inventory.tagCommit, tagCommit);
  assert.equal(inventory.deliveryManifestSha256, linux.deliveryManifestSha256);
  assert.equal(inventory.status, 'pass');
  assert.equal(
    inventory.files.length,
    new Set(inventory.files.map((f) => f.file)).size,
  );
  assert(inventory.files.some((f) => f.file === 'SDK-DELIVERY-MANIFEST.json'));
  for (const row of d.archives)
    assert(
      inventory.files.some(
        (f) => f.file === row.file && f.sha256 === row.sha256,
      ),
    );
  const registry = new RegistryReadClient();
  for (const row of d.archives) {
    const state = await registry.inspect(row.name, d.version);
    assert.equal(state.state, 'present');
    assert.equal(sha256(await registry.download(state)), row.sha256);
  }
  const release = githubJson('releases/tags/sdk-v' + d.version);
  assert.equal(release.tag_name, 'sdk-v' + d.version);
  assert.equal(release.draft, false);
  const actions = await protectReleaseAssets(
    inventory.files,
    release.assets,
    (asset) =>
      github('releases/assets/' + asset.id, {
        binary: true,
        accept: 'application/octet-stream',
      }),
  );
  assert(
    actions.every((a) => a.action === 'skip'),
    'Complete verified release assets required',
  );
  assert.equal(
    release.assets.length,
    inventory.files.length,
    'Unexpected release assets require review',
  );
  if (release.prerelease)
    execFileSync(
      process.env.SDK_GH_EXECUTABLE ?? 'gh',
      [
        'release',
        'edit',
        release.tag_name,
        '--prerelease=false',
        '--repo',
        d.repository,
      ],
      { stdio: 'inherit' },
    );
  const stable = githubJson('releases/tags/' + release.tag_name);
  assert.equal(stable.prerelease, false);
  assert.equal(stable.draft, false);
  return {
    status: 'pass',
    tagCommit,
    releaseId: stable.id,
    url: stable.html_url,
    alreadyStable: !release.prerelease,
    manualReviewRequired: true,
  };
}
if (process.argv[1]?.endsWith('/promotion.mjs'))
  console.log(JSON.stringify(await promoteStable()));
