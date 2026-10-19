/** Explicitly approved 2.0.1 functional patch path; no source-fidelity claim. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generateDeliveryBundle, verifyDeliveryBundle, sha256 } from './bundle.mjs';
import { loadRuntimePackageDefinitions, resolveFixedRuntimeVersion } from '../repository/sdk-runtime-manifest.mjs';

export const patchVersion = '2.0.1';
export const patchTag = `sdk-v${patchVersion}`;
const registry = 'https://npm.pkg.github.com';
const receiptName = 'PATCH-ACCEPTANCE.json';
const runtimePaths = new Set([
  'packages/template-browser/src/session/templateSessionV2.ts',
  'packages/template-browser/src/session/templateFieldFamilySessionV2.ts',
  'packages/template-react/src/fieldSessionV2.tsx',
]);
export function assertPatchScope(baseline, current, changed) {
  const api = value => {
    const copy = structuredClone(value);
    delete copy.sdkVersion;
    for (const item of copy.packages) delete item.version;
    return copy;
  };
  assert.equal(current.sdkVersion, patchVersion, 'This approval applies only to SDK 2.0.1');
  assert.deepEqual(api(current), api(baseline), 'A functional patch cannot change the public API');
  for (const file of changed) if (/^(?:packages\/[^/]+\/src\/|src\/)/.test(file)) {
    assert(runtimePaths.has(file) || file === 'src/test-suite.ts', `Outside the approved field-rule patch: ${file}`);
  }
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed:\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  return result.stdout.trim();
}
async function guardScope() {
  assert.equal(await resolveFixedRuntimeVersion(), patchVersion, 'This path is approved only for SDK 2.0.1');
  const baseline = JSON.parse(run('git', ['show', 'sdk-v2.0.0:config/sdk-public-api.json']));
  const current = JSON.parse(await readFile('config/sdk-public-api.json', 'utf8'));
  const changed = run('git', ['diff', '--name-only', 'sdk-v2.0.0', '--', 'packages', 'src']).split('\n').filter(Boolean);
  assertPatchScope(baseline, current, changed);
}
async function identity(directory) {
  const { manifest } = await verifyDeliveryBundle(directory, { version: patchVersion });
  return manifest.archives.map(({ name, file, sha256: hash }) => ({ name, file, sha256: hash }));
}
const sourceCommit = () => run('git', ['rev-parse', 'HEAD']);
export async function packPatch(directory) {
  await guardScope();
  await mkdir(directory, { recursive: true });
  for (const item of await loadRuntimePackageDefinitions()) {
    console.log(`Packing ${item.name} sequentially.`);
    run('pnpm', ['pack', '--pack-destination', path.resolve(directory)], { cwd: `packages/${item.directory}` });
  }
  await generateDeliveryBundle({ archivesDirectory: directory, outputDirectory: directory, mode: 'local', provenance: 'local-pack' });
  await identity(directory);
}
export async function acceptPatch(directory) {
  await guardScope();
  const archives = await identity(directory), rows = [];
  await writeFile(path.join(directory, receiptName), JSON.stringify({ status: 'in-progress', sourceCommit: sourceCommit(), archives }) + '\n');
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'sdk-patch-config-'));
  try {
    await writeFile(path.join(temporary, '.npmrc'), 'registry=https://registry.npmjs.org\n');
    const environment = { ...process.env, NPM_CONFIG_USERCONFIG: path.join(temporary, '.npmrc') };
    for (const key of ['NODE_AUTH_TOKEN','NPM_TOKEN','GITHUB_TOKEN','GH_TOKEN']) delete environment[key];
    for (const manager of ['npm', 'pnpm']) {
      const commands = [
        ['consumer', 'scripts/repository/verify-packed-consumer.mjs', ['--archives', directory, '--without-source-fidelity']],
        ['fonts', 'scripts/repository/verify-host-font-authority.mjs', ['--archives', directory, '--output', path.join(directory, 'acceptance', manager, 'fonts')]],
        ['storage', 'scripts/repository/verify-blocked-storage.mjs', ['--archives', directory, '--manager', manager, '--output', path.join(directory, 'acceptance', manager, 'storage')]],
      ];
      for (const [name, script, args] of commands) {
        assert.deepEqual(await identity(directory), archives);
        const started = Date.now();
        console.log(`${manager}/${name}: validating supplied archives.`);
        const log = run(process.execPath, [script, ...args], { env: { ...environment, TEMPLATE_CONSUMER_PACKAGE_MANAGER: manager } });
        assert.deepEqual(await identity(directory), archives);
        await mkdir(path.join(directory, 'acceptance', manager), { recursive: true });
        await writeFile(path.join(directory, 'acceptance', manager, `${name}.log.txt`), log + '\n');
        rows.push({ manager, name, elapsedMs: Date.now() - started, logSha256: sha256(log) });
      }
    }
    // Rehearse npm's actual archive lifecycle; no workspace prepack can race.
    for (const archive of archives) run('npm', ['publish', path.resolve(directory, archive.file), '--dry-run', '--ignore-scripts', `--registry=${registry}`], { env: environment });
    assert.deepEqual(await identity(directory), archives);
    const receipt = { schemaVersion: 'sdk-2.0.1-functional-patch-v1', status: 'pass', version: patchVersion,
      sourceCommit: sourceCommit(), sourceDirty: Boolean(run('git', ['status', '--porcelain'])),
      ci: { runId: process.env.GITHUB_RUN_ID ?? null }, archives, node: process.version, platform: process.platform, rows,
      sourceFidelityCertification: false, publisherRehearsal: 'npm publish supplied-archive --dry-run --ignore-scripts' };
    await writeFile(path.join(directory, receiptName), JSON.stringify(receipt, null, 2) + '\n');
    console.log('Functional patch archive acceptance passed; no source-fidelity certification claimed.');
    return receipt;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
export function assertPatchReceipt(receipt, archives, commit) {
  assert.equal(receipt.schemaVersion, 'sdk-2.0.1-functional-patch-v1');
  assert.equal(receipt.status, 'pass'); assert.equal(receipt.version, patchVersion);
  assert.equal(receipt.sourceCommit, commit); assert.deepEqual(receipt.archives, archives);
  assert.equal(receipt.sourceFidelityCertification, false);
  assert.equal(receipt.sourceDirty, false, 'Publication requires a clean source checkout');
  assert.deepEqual(receipt.rows.map(row => `${row.manager}/${row.name}`), ['npm/consumer','npm/fonts','npm/storage','pnpm/consumer','pnpm/fonts','pnpm/storage']);
}
export function registryState(result, expectedIntegrity) {
  if (result.status === 0) {
    const value = JSON.parse(result.stdout);
    assert.equal(value, expectedIntegrity, 'Existing published bytes differ; never overwrite a version');
    return 'matching';
  }
  const error = JSON.parse(result.stdout || '{}').error;
  assert.equal(error?.code, 'E404', 'Registry lookup failed; authentication/network errors are not absence');
  return 'absent';
}
export async function publishArchives(archives, operations) {
  // Preflight the whole train before the first irreversible publication.
  const states = [];
  for (const archive of archives) states.push(await operations.preflight(archive));
  for (let index = 0; index < archives.length; index++) {
    if (states[index] === 'absent') await operations.publish(archives[index]);
    else assert.equal(states[index], 'matching');
    await operations.verify(archives[index]);
  }
  for (const archive of archives) await operations.tag(archive);
}
export async function publishPatch(directory) {
  await guardScope();
  assert.equal(process.env.CI, 'true');
  assert.equal(process.env.GITHUB_REF, `refs/tags/${patchTag}`, 'Only the approved tag push may publish');
  const archives = await identity(directory), commit = sourceCommit();
  const receipt = JSON.parse(await readFile(path.join(directory, receiptName), 'utf8'));
  assertPatchReceipt(receipt, archives, commit);
  assert(process.env.GITHUB_RUN_ID, 'Publication requires the verifying workflow run');
  assert.equal(receipt.ci?.runId, process.env.GITHUB_RUN_ID);
  const tagFor = archive => `${archive.name}@${patchVersion}`;
  const expected = new Map();
  for (const archive of archives) expected.set(archive.name, `sha512-${createHash('sha512').update(await readFile(path.join(directory, archive.file))).digest('base64')}`);
  const lookup = archive => spawnSync('npm', ['view', `${archive.name}@${patchVersion}`, 'dist.integrity', '--json', `--registry=${registry}`], { encoding: 'utf8' });
  await publishArchives(archives, {
    preflight: async archive => {
      const tag = run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tagFor(archive)}`]).split(/\s/)[0];
      assert(!tag || tag === commit, 'An existing package tag must never move');
      return registryState(lookup(archive), expected.get(archive.name));
    },
    publish: async archive => {
      assert.deepEqual(await identity(directory), archives);
      console.log(`Publishing verified ${archive.name}@${patchVersion}.`);
      run('npm', ['publish', path.resolve(directory, archive.file), '--ignore-scripts', `--registry=${registry}`]);
    },
    verify: async archive => {
      for (let attempt = 0; attempt < 6; attempt++) {
        const state = registryState(lookup(archive), expected.get(archive.name));
        if (state === 'matching') return;
        if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 2000));
      }
      throw new Error(`Published ${archive.name} was not readable after publication`);
    },
    tag: async archive => {
      const tag = tagFor(archive);
      const existing = run('git', ['tag', '--list', tag]);
      if (existing) assert.equal(run('git', ['rev-list', '-n', '1', tag]), commit);
      else run('git', ['tag', tag, commit]);
      run('git', ['push', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
      assert.equal(run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]).split(/\s/)[0], commit);
    },
  });
}
export async function comparePublished(directory, candidate) {
  const accepted = await identity(candidate), actual = await identity(directory);
  assert.deepEqual(actual, accepted, 'Registry downloads must match the exact accepted archives');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, supplied, candidate] = process.argv.slice(2);
  assert(supplied, 'A supplied archive directory is required');
  const directory = path.resolve(supplied);
  if (action === 'pack') await packPatch(directory);
  else if (action === 'accept') await acceptPatch(directory);
  else if (action === 'publish') await publishPatch(directory);
  else if (action === 'compare') { assert(candidate); await comparePublished(directory, path.resolve(candidate)); }
  else throw new Error('Expected pack, accept, publish or compare');
}
