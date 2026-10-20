/** Inventory-driven, non-overwriting GitHub delivery publication. Never publishes SDK packages. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPublicDelivery, publicNames, releaseBody } from './host-kit.mjs';
import { generateDeliveryBundle, sha256 } from './bundle.mjs';
import { loadRuntimeDistribution, resolveFixedRuntimeVersion } from '../repository/sdk-runtime-manifest.mjs';
const repo = 'Sleinity/template-tool';
const json = value => JSON.stringify(value, null, 2) + '\n';
function command(binary, args, buffer = false) {
  const result = spawnSync(binary, args, { encoding: buffer ? undefined : 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, `${binary} ${args.join(' ')}: ${result.stderr ?? ''}`); return result.stdout;
}
const gh = args => command(process.env.GH_BIN ?? 'gh', args).toString().trim();
const api = endpoint => JSON.parse(gh(['api', `repos/${repo}${endpoint ? '/' + endpoint : ''}`]));
const download = asset => command(process.env.GH_BIN ?? 'gh', ['api', `repos/${repo}/releases/assets/${asset.id}`, '-H', 'Accept: application/octet-stream'], true);
const gitRevision = ref => command('git', ['rev-parse', `${ref}^{commit}`]).trim();
function assetIdentity(asset) {
  assert(/^sha256:[a-f0-9]{64}$/.test(asset.digest), `Missing GitHub digest for ${asset.name}`);
  return { id: asset.id, name: asset.name, size: asset.size, digest: asset.digest };
}
export function assertPreserved(before, after, added) {
  assert.equal(after.id, before.id); assert.equal(after.tag_name, before.tag_name);
  const baseline = new Set(before.assets.map(a => a.name));
  for (const asset of before.assets) assert.deepEqual(assetIdentity(after.assets.find(a => a.name === asset.name) ?? {}), assetIdentity(asset), `Existing asset changed: ${asset.name}`);
  for (const asset of after.assets) assert(baseline.has(asset.name) || added.includes(asset.name), `Unexpected release asset: ${asset.name}`);
}
export function preflightAssets(existing, expected) {
  return expected.map(item => {
    const asset = existing.find(a => a.name === item.file);
    if (!asset) return item;
    assert.equal(asset.size, item.bytes, `Refusing conflicting asset: ${item.file}`);
    assert.equal(asset.digest, `sha256:${item.sha256}`, `Refusing conflicting asset: ${item.file}`);
    return null;
  }).filter(Boolean);
}
export async function uploadProjection(expected, operations) {
  // Preflight the entire set before the first external mutation.
  const before = await operations.current();
  const missing = preflightAssets(before.assets, expected);
  for (const item of missing) await operations.upload(item);
  const after = await operations.current();
  assertPreserved(before, after, expected.map(a => a.file));
  assert.equal(preflightAssets(after.assets, expected).length, 0, 'Incomplete uploaded inventory');
  for (const item of expected) await operations.verifyDownload(after.assets.find(a => a.name === item.file), item);
  await operations.updateBody();
  return after;
}
export async function prepareRefresh(directory) {
  const version = await resolveFixedRuntimeVersion(), tag = `sdk-v${version}`, names = publicNames(version, true);
  assert.equal(version, '2.0.1', 'The legacy additive refresh is bounded to 2.0.1');
  const release = api(`releases/tags/${tag}`); assert(!release.draft && !release.prerelease);
  const additions = [names.kit, names.manifest, names.sums];
  const original = release.assets.filter(a => !additions.includes(a.name)).map(assetIdentity);
  const old = release.assets.find(a => a.name === 'SDK-DELIVERY-MANIFEST.json'); assert(old);
  const oldBytes = download(old); assert.equal(sha256(oldBytes), old.digest.slice(7));
  const manifest = JSON.parse(oldBytes); assert.equal(manifest.schemaVersion, 'sdk-delivery-manifest-v1'); assert.equal(manifest.version, version);
  assert.deepEqual([...original.map(a => a.name)].sort(), [...manifest.uploadFiles].sort(), 'Legacy release assets must match the published inventory');
  assert.equal(original.length, 54);
  const sourceRevision = gitRevision(tag), deliveryRevision = gitRevision('HEAD');
  const tags = [tag, ...manifest.archives.map(a => `${a.name}@${version}`)];
  const tagObjects = tags.map(name => ({ name, object: api(`git/ref/tags/${encodeURIComponent(name)}`).object }));
  for (const name of tags) assert.equal(gitRevision(name), sourceRevision, 'SDK/package tags disagree');
  await mkdir(directory, { recursive: true });
  const archives = path.join(directory, 'archives'); await mkdir(archives, { recursive: true });
  for (const item of manifest.archives) {
    const asset = release.assets.find(a => a.name === item.file); assert(asset);
    assert.equal(asset.digest, `sha256:${item.sha256}`); assert.equal(asset.size, item.bytes);
    const bytes = download(asset); assert.equal(sha256(bytes), item.sha256); await writeFile(path.join(archives, item.file), bytes);
  }
  const snapshot = { schemaVersion: 'sdk-additive-release-baseline-v1', id: release.id, tag_name: tag, body: release.body, assets: original, sourceRevision, deliveryRevision, tags: tagObjects };
  await writeFile(path.join(directory, 'RELEASE-BASELINE.json'), json(snapshot));
  await generateDeliveryBundle({ archivesDirectory: archives, outputDirectory: path.join(directory, 'internal'), mode: 'release', provenance: 'registry-download' });
  return snapshot;
}
export async function publishPublic(directory, { additive = false, baselineDirectory = directory } = {}) {
  assert.equal(process.env.CI, 'true', 'Publish from the protected workflow');
  assert.equal(process.env.GITHUB_ACTIONS, 'true'); assert(process.env.GITHUB_RUN_ID);
  assert.equal(command('git', ['status', '--porcelain']).trim(), '', 'Publication requires a clean checkout');
  const { manifest } = await verifyPublicDelivery(directory, { additive }), tag = `sdk-v${manifest.version}`;
  assert.equal(manifest.deliveryRevision, gitRevision('HEAD')); assert.equal(manifest.sourceRevision, gitRevision(tag));
  const distribution = await loadRuntimeDistribution(); assert.equal(api('').visibility, distribution.releaseVisibility);
  assert.equal(distribution.licensePolicy, 'sleinity-tools-only'); assert.equal(distribution.authorizedUse, 'Sleinity-owned applications');
  for (const manager of ['npm', 'pnpm']) {
    const receipt = JSON.parse(await readFile(path.join(directory, 'acceptance', manager, 'report.json'), 'utf8'));
    assert.equal(receipt.status, 'pass'); assert.equal(receipt.manager, manager); assert.equal(receipt.kitSha256, manifest.kit.sha256);
    assert.equal(receipt.sourceRevision, manifest.sourceRevision); assert.equal(receipt.deliveryRevision, manifest.deliveryRevision);
    assert.equal(receipt.runId, process.env.GITHUB_RUN_ID, 'Kit must be tested in this workflow run');
  }
  let before, priorBody = '', retainedTags = [];
  const verifyTags = () => { for (const item of retainedTags) assert.deepEqual(api(`git/ref/tags/${encodeURIComponent(item.name)}`).object, item.object, 'Published tag changed'); };
  if (additive) {
    const baseline = JSON.parse(await readFile(path.join(baselineDirectory, 'RELEASE-BASELINE.json'), 'utf8'));
    assert.equal(baseline.schemaVersion, 'sdk-additive-release-baseline-v1'); assert.equal(baseline.tag_name, tag);
    assert.equal(baseline.sourceRevision, manifest.sourceRevision); assert.equal(baseline.deliveryRevision, manifest.deliveryRevision);
    before = api(`releases/tags/${tag}`); assertPreserved(baseline, before, manifest.uploadFiles); priorBody = baseline.body;
    retainedTags = baseline.tags; verifyTags();
  } else {
    // Publication tags are immutable; never refresh a previous flat delivery through this path.
    gh(['release', 'view', tag, '--repo', repo, '--json', 'id']);
    before = api(`releases/tags/${tag}`);
    assert(before.draft || before.assets.length === 0 || before.assets.every(a => manifest.uploadFiles.includes(a.name)), 'Use additive refresh for legacy releases');
    priorBody = before.body ?? '';
  }
  const expected = [];
  for (const file of manifest.uploadFiles) {
    const bytes = await readFile(path.join(directory, file)); expected.push({ file, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const bodyFile = path.join(directory, 'RELEASE-UPDATE.json');
  await writeFile(bodyFile, json({ body: releaseBody(manifest, priorBody), draft: false }));
  await uploadProjection(expected, {
    current: async () => api(`releases/tags/${tag}`),
    upload: async item => { gh(['release', 'upload', tag, path.join(directory, item.file), '--repo', repo]); },
    verifyDownload: async (asset, item) => { assert.equal(sha256(download(asset)), item.sha256, 'Uploaded download differs'); },
    updateBody: async () => {
      const current = api(`releases/tags/${tag}`); assertPreserved(before, current, manifest.uploadFiles);
      assert.equal(gitRevision(tag), manifest.sourceRevision); verifyTags();
      gh(['api', '--method', 'PATCH', `repos/${repo}/releases/${current.id}`, '--input', bodyFile]);
    },
  });
  verifyTags();
  const after = api(`releases/tags/${tag}`); assertPreserved(before, after, manifest.uploadFiles);
  assert.equal(after.body.trimEnd(), JSON.parse(await readFile(bodyFile, 'utf8')).body.trimEnd());
  if (!additive) assert.deepEqual(after.assets.map(a => a.name).sort(), manifest.uploadFiles.toSorted());
  await writeFile(path.join(directory, 'PUBLICATION.json'), json({ status: 'pass', tag, url: after.html_url, preservedAssets: before.assets.map(assetIdentity), addedOrReused: expected, sourceRevision: manifest.sourceRevision, deliveryRevision: manifest.deliveryRevision, runId: process.env.GITHUB_RUN_ID }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [commandName, supplied] = process.argv.slice(2), directory = path.resolve(supplied);
  if (commandName === 'prepare-refresh') await prepareRefresh(directory);
  else if (commandName === 'publish') await publishPublic(directory, { additive: process.argv.includes('--additive'), baselineDirectory: process.argv.includes('--baseline') ? process.argv[process.argv.indexOf('--baseline') + 1] : directory });
  else throw new Error('Expected prepare-refresh or publish');
}
