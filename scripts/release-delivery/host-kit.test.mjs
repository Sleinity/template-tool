import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { zipSync, strToU8 } from 'fflate';
import { spawnSync } from 'node:child_process';
import { generateDeliveryBundle, sha256 } from './bundle.mjs';
import { stubArchives, currentVersion } from './fixtures.mjs';
import { generatePublicDelivery, verifyPublicDelivery, publicNames, unpackKit, safeKitPath, rewriteHostMarkdown, releaseBody } from './host-kit.mjs';
import { assertPreserved, preflightAssets, uploadProjection } from './publication.mjs';
const revision = '1'.repeat(40), deliveryRevision = '2'.repeat(40);
async function fixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'public-delivery-test-'));
  try {
    const archives = path.join(root, 'archives'), internal = path.join(root, 'internal'), output = path.join(root, 'public');
    await mkdir(archives); await stubArchives(archives);
    await generateDeliveryBundle({ archivesDirectory: archives, outputDirectory: internal, mode: 'release', provenance: 'registry-download' });
    const manifest = await generatePublicDelivery(internal, output, { sourceRevision: revision, deliveryRevision });
    await fn({ root, archives, internal, output, manifest });
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('seven public downloads contain the consolidated changelog and complete vendored application', () => fixture(async ({ output, manifest }) => {
  const verified = await verifyPublicDelivery(output); assert.equal(manifest.uploadFiles.length, 7);
  assert(manifest.uploadFiles.every(f => f === 'CHANGELOG.md' || !/\.md$|\.tsx?$/.test(f)));
  const files = unpackKit(await readFile(path.join(output, manifest.kit.file)));
  for (const a of manifest.archives) assert.equal(sha256(files['vendor/' + a.file]), a.sha256);
  for (const file of ['README.md', 'src/CompleteHost.tsx', 'docs/reference/recovery.md', 'docs/reference/api.md', 'docs/guides/installation.md', 'docs/agents/integration-prompts.md']) assert(files[file], file);
  assert(!verified.files.some(f => /STUDIO-REDESIGN|GITHUB-SETUP|RELEASE-PREPARATION|0\.8|1\.0-HISTORY|\.ttf$|node_modules|\.npmrc/.test(f)));
  assert(Buffer.from(files['README.md']).toString().includes('## Integrate into an existing app'));
  assert(Buffer.from(files['docs/guides/installation.md']).toString().includes('overrides:'));
  for (const [file, bytes] of Object.entries(files)) if (file.endsWith('.md')) assert(!/unpublished candidate pending|versioned patch candidate|when released|Before publication, use/.test(Buffer.from(bytes).toString()), file);
  assert.equal(JSON.parse(Buffer.from(files['DELIVERY.json']).toString()).sourceRevision, revision);
}));
test('additive layout leaves the original manifest/checksums/archives outside its upload set', () => fixture(async ({ internal, root, manifest }) => {
  const output = path.join(root, 'additive'); const added = await generatePublicDelivery(internal, output, { sourceRevision: revision, deliveryRevision, additive: true });
  assert.deepEqual(added.uploadFiles, [manifest.kit.file, 'HOST-KIT-MANIFEST.json', 'HOST-KIT-SHA256SUMS', 'CHANGELOG.md']);
  assert.equal(added.kit.sha256, manifest.kit.sha256); await verifyPublicDelivery(output, { additive: true });
}));
test('kit generation is deterministic including across builder time zones', () => fixture(async ({ internal, root, manifest }) => {
  for (const TZ of ['UTC', 'Europe/Amsterdam', 'America/Los_Angeles']) {
    const directory = path.join(root, TZ.replaceAll('/', '-'));
    const result = spawnSync(process.execPath, ['scripts/release-delivery/host-kit.mjs', 'generate', internal, directory, '--source-revision', revision, '--delivery-revision', deliveryRevision], { env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal((await verifyPublicDelivery(directory)).manifest.kit.sha256, manifest.kit.sha256);
  }
}));
test('tampered public archives, manifests, checksums and missing kit fail closed', () => fixture(async ({ output, manifest }) => {
  for (const name of [manifest.archives[0].file, 'SDK-DELIVERY-MANIFEST.json', 'SHA256SUMS', 'CHANGELOG.md', manifest.kit.file]) {
    const file = path.join(output, name), bytes = await readFile(file); await writeFile(file, Buffer.concat([bytes, Buffer.from('tampered')]));
    await assert.rejects(verifyPublicDelivery(output)); await writeFile(file, bytes);
  }
  await rm(path.join(output, manifest.kit.file)); await assert.rejects(verifyPublicDelivery(output));
}));
test('mixed versions, modified internal evidence and missing SDK archives cannot generate a kit', () => fixture(async ({ internal, output, manifest }) => {
  const file = path.join(internal, manifest.archives[0].file); await writeFile(file, 'corrupt');
  await assert.rejects(generatePublicDelivery(internal, output, { sourceRevision: revision, deliveryRevision }));
  await assert.rejects(generatePublicDelivery(internal, output, { sourceRevision: 'main', deliveryRevision }));
}));
test('nested documentation links resolve locally; only explicitly excluded documents become pinned source links', () => {
  const mapping = new Map([['SDK-API.md', 'docs/reference/api.md']]), excluded = new Map([['OLD.md', 'docs/sdk/history/OLD.md']]);
  assert.equal(rewriteHostMarkdown('[API](SDK-API.md#text) [old](OLD.md)', 'docs/guides/install.md', mapping, excluded, revision), `[API](../reference/api.md#text) [old](https://github.com/Sleinity/template-tool/blob/${revision}/docs/sdk/history/OLD.md)`);
  assert.throws(() => rewriteHostMarkdown('[missing](OTHER.md)', 'docs/index.md', mapping, excluded, revision));
});
test('unsafe ZIP paths, symlinks and duplicate names are rejected before extraction', () => {
  for (const name of ['../escape', '/absolute', 'C:drive', 'a\\b', 'a//b', './dot', 'a/../b', 'a\nname']) assert.throws(() => safeKitPath(name));
  assert.throws(() => unpackKit(zipSync({ '../escape': strToU8('bad') })));
  assert.throws(() => unpackKit(zipSync({ 'file': strToU8('one'), 'FILE': strToU8('two') })));
  const bytes = Buffer.from(zipSync({ file: strToU8('test') }));
  const directory = bytes.indexOf(Buffer.from([0x50,0x4b,0x01,0x02])); bytes.writeUInt32LE((0xa1ff << 16) >>> 0, directory + 38);
  assert.throws(() => unpackKit(bytes), /Non-regular/);
});
test('release entry point is idempotent and preserves bugfix notes', () => {
  const manifest = { version: currentVersion, layout: 'additive', kit: { file: publicNames(currentVersion).kit } };
  const first = releaseBody(manifest, '# Bugfix notes\nFixed choices.'); assert.equal(releaseBody(manifest, first), first);
  assert(first.includes('Download the complete host kit')); assert(first.includes('Fixed choices.')); assert(first.includes('Older individual downloads'));
});
const identity = item => ({ id: item.id, name: item.file, size: item.bytes, digest: 'sha256:' + item.sha256 });
const expected = [{ file: 'kit.zip', bytes: 1, sha256: '1'.repeat(64) }, { file: 'manifest.json', bytes: 2, sha256: '2'.repeat(64) }];
test('asset conflicts preflight the whole set before any upload', async () => {
  assert.equal(preflightAssets([], expected).length, 2); assert.equal(preflightAssets(expected.map(identity), expected).length, 0);
  const actions = [];
  await assert.rejects(uploadProjection(expected, { current: async () => ({ assets: [{ ...identity(expected[1]), digest: 'sha256:' + '3'.repeat(64) }] }), upload: async () => actions.push('upload'), updateBody: async () => actions.push('body') }));
  assert.deepEqual(actions, []);
});
test('partial upload failure leaves body untouched and retries reuse identical files', async () => {
  const state = { id: 1, tag_name: 'sdk-v2.0.1', assets: [] }, actions = []; let fail = true;
  const operations = { current: async () => structuredClone(state), upload: async item => { if (item.file === 'manifest.json' && fail) throw new Error('interrupted'); actions.push(item.file); state.assets.push({ ...identity(item), id: state.assets.length + 1 }); }, verifyDownload: async () => {}, updateBody: async () => actions.push('body') };
  await assert.rejects(uploadProjection(expected, operations)); assert.deepEqual(actions, ['kit.zip']);
  fail = false; await uploadProjection(expected, operations); assert.deepEqual(actions, ['kit.zip', 'manifest.json', 'body']);
});
test('changed/deleted legacy assets and unexpected additions stop release updates', () => {
  const before = { id: 1, tag_name: 'tag', assets: [{ ...identity(expected[0]), id: 3 }] };
  for (const after of [{ ...before, assets: [] }, { ...before, assets: [{ ...before.assets[0], id: 4 }] }, { ...before, assets: [...before.assets, { ...identity(expected[1]), id: 4 }] }]) assert.throws(() => assertPreserved(before, after, []));
});
test('failed download verification never updates the release entry point', async () => {
  const state = { id: 1, tag_name: 'tag', assets: expected.map((item, id) => ({ ...identity(item), id })) }; let updated = false;
  await assert.rejects(uploadProjection(expected, { current: async () => state, upload: async () => assert.fail(), verifyDownload: async () => { throw new Error('wrong download'); }, updateBody: async () => { updated = true; } })); assert.equal(updated, false);
});
test('delivery-only workflow is protected, portable, credential-free in hosts and cannot publish SDK packages', async () => {
  const source = await readFile('.github/workflows/host-kit-refresh.yml', 'utf8');
  for (const required of ['environment: private-sdk-release', 'contents: write', 'publication.mjs prepare-refresh', 'host-kit.mjs generate', 'verify-kit.mjs', 'for manager in npm pnpm', 'publication.mjs publish', '--baseline', 'if: always()']) assert(source.includes(required));
  assert(!/packages: write|npm publish|pnpm release|changeset publish|git (?:push|tag)|sdk-certified-inputs|NODE_AUTH_TOKEN|SDK_CERT_FIXTURE_KEY/.test(source));
  assert(source.indexOf('verify-kit.mjs') < source.indexOf('publication.mjs publish'));
  const standard = await readFile('.github/workflows/release.yml', 'utf8'); assert(standard.includes('uses: ./.github/workflows/host-kit-refresh.yml')); assert(!standard.includes('--clobber'));
});
