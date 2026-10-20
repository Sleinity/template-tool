/** Explicitly approved, backed-up migration of the 2.0.1 release asset list. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './bundle.mjs';
import { verifyPublicDelivery, releaseBody } from './host-kit.mjs';
const repo = 'Sleinity/template-tool', tag = 'sdk-v2.0.1';
const json = value => JSON.stringify(value, null, 2) + '\n';
const record = (file, bytes) => ({ file, bytes: bytes.length, sha256: sha256(bytes) });
function run(binary, args, buffer = false) {
  const result = spawnSync(binary, args, { encoding: buffer ? undefined : 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, `${binary} ${args.join(' ')}: ${result.stderr ?? ''}`); return result.stdout;
}
const gh = args => run(process.env.GH_BIN ?? 'gh', args).toString().trim();
const api = suffix => JSON.parse(gh(['api', `repos/${repo}/${suffix}`]));
const download = asset => run(process.env.GH_BIN ?? 'gh', ['api', `repos/${repo}/releases/assets/${asset.id}`, '-H', 'Accept: application/octet-stream'], true);
const identity = asset => ({ id: asset.id, name: asset.name, size: asset.size, digest: asset.digest });
const matches = (asset, item) => asset?.size === item.bytes && asset?.digest === `sha256:${item.sha256}`;
const ordered = assets => assets.map(identity).sort((a, b) => a.id - b.id);
export function compactManifest(seed) {
  assert.equal(seed.schemaVersion, 'sdk-public-delivery-v2'); assert.equal(seed.version, '2.0.1');
  assert(['additive', 'standard'].includes(seed.layout));
  assert.equal(seed.kit.file, 'template-sdk-2.0.1-host-kit.zip');
  assert.deepEqual(seed.archives.map(a => a.name), ['@sleinity/template-core', '@sleinity/template-browser', '@sleinity/template-react']);
  const manifest = structuredClone(seed); manifest.layout = 'standard';
  manifest.uploadFiles = [seed.kit.file, ...seed.archives.map(a => a.file), 'SDK-DELIVERY-MANIFEST.json', 'SHA256SUMS'];
  return manifest;
}
export function planCompaction(release, manifest, generated, allowed) {
  assert.equal(release.tag_name, tag); assert.equal(release.draft, false);
  const wanted = new Map(generated.map(a => [a.file, a])); assert.deepEqual([...wanted.keys()], manifest.uploadFiles);
  const keepNames = new Set([manifest.kit.file, ...manifest.archives.map(a => a.file)]);
  const known = new Map(allowed.map(a => [a.file ?? a.name, a]));
  const keep = [], replace = [], remove = [];
  assert.equal(new Set(release.assets.map(a => a.name)).size, release.assets.length);
  for (const asset of release.assets) {
    const desired = wanted.get(asset.name);
    if (desired && matches(asset, desired)) {
      if (keepNames.has(asset.name)) keep.push(identity(asset));
      continue;
    }
    const previous = known.get(asset.name); assert(previous, `Unexpected asset: ${asset.name}`);
    const old = previous.sha256 ? previous : { bytes: previous.size, sha256: previous.digest.slice(7) };
    assert(matches(asset, old), `Changed legacy asset: ${asset.name}`);
    if (previous.id !== undefined) assert.equal(asset.id, previous.id, 'Legacy asset identity changed');
    assert(!keepNames.has(asset.name), 'Never replace SDK archives or the tested kit');
    (desired ? replace : remove).push(identity(asset));
  }
  assert.deepEqual(keep.map(a => a.name).sort(), [...keepNames].sort(), 'All SDK archives and the tested kit must exist unchanged');
  return { keep, replace, remove };
}
export async function executeCompaction(plan, generated, operations) {
  // Every original file has a verified backup before the first deletion.
  await operations.preflight();
  for (const item of generated) {
    if (plan.keep.some(a => a.name === item.file)) continue;
    const replacement = plan.replace.find(a => a.name === item.file);
    if (replacement) await operations.remove(replacement);
    await operations.ensureUploaded(item);
  }
  await operations.verifyDownloads();
  // Switch checksum links while both old and new host-facing files still exist.
  await operations.updateBody();
  for (const asset of plan.remove) await operations.remove(asset);
  await operations.verifyFinal();
}
export async function prepareCompaction(directory) {
  const release = api(`releases/tags/${tag}`);
  const prior = JSON.parse(await readFile('docs/architecture/evidence/sdk-host-kit-20261020/publication.json', 'utf8'));
  assert.equal(prior.tag, tag); assert.equal(prior.status, 'pass');
  const allowed = [...prior.preservedAssets, ...prior.addedOrReused];
  const seedAsset = release.assets.find(a => a.name === 'HOST-KIT-MANIFEST.json') ?? release.assets.find(a => a.name === 'SDK-DELIVERY-MANIFEST.json');
  assert(seedAsset, 'Published host-kit manifest required');
  const seedBytes = download(seedAsset); assert.equal(`sha256:${sha256(seedBytes)}`, seedAsset.digest);
  const manifest = compactManifest(JSON.parse(seedBytes));
  assert.equal(manifest.sourceRevision, prior.sourceRevision);
  assert.equal(manifest.kit.sha256, prior.addedOrReused.find(a => a.file === manifest.kit.file).sha256, 'Use the already-tested public kit');
  const backup = path.join(directory, 'backup'), output = path.join(directory, 'public');
  await mkdir(backup, { recursive: true }); await mkdir(output, { recursive: true });
  const backups = [];
  for (const asset of release.assets) {
    assert(!/[\\/]/.test(asset.name) && asset.name !== '.' && asset.name !== '..', 'Unsafe backup name');
    const bytes = download(asset); assert.equal(asset.size, bytes.length); assert.equal(asset.digest, `sha256:${sha256(bytes)}`);
    await writeFile(path.join(backup, asset.name), bytes); backups.push({ ...identity(asset), sha256: sha256(bytes) });
  }
  for (const file of [manifest.kit.file, ...manifest.archives.map(a => a.file)]) await copyFile(path.join(backup, file), path.join(output, file));
  const manifestBytes = Buffer.from(json(manifest)); await writeFile(path.join(output, 'SDK-DELIVERY-MANIFEST.json'), manifestBytes);
  await writeFile(path.join(output, 'SHA256SUMS'), [...manifest.archives, manifest.kit, record('SDK-DELIVERY-MANIFEST.json', manifestBytes)].map(a => `${a.sha256}  ${a.file}\n`).join(''));
  await verifyPublicDelivery(output);
  const generated = [];
  for (const file of manifest.uploadFiles) generated.push(record(file, await readFile(path.join(output, file))));
  const plan = planCompaction(release, manifest, generated, allowed);
  const tags = [tag, ...manifest.archives.map(a => `${a.name}@2.0.1`)].map(name => ({ name, object: api(`git/ref/tags/${encodeURIComponent(name)}`).object }));
  for (const item of tags) { assert.equal(item.object.type, 'commit'); assert.equal(item.object.sha, manifest.sourceRevision); }
  const snapshot = { schemaVersion: 'sdk-2.0.1-compact-migration-v1', release: { id: release.id, tag_name: release.tag_name, body: release.body, assets: release.assets.map(identity) }, backups, generated, plan, tags, migrationRevision: run('git', ['rev-parse', 'HEAD']).trim(), kitSha256: manifest.kit.sha256 };
  await writeFile(path.join(directory, 'COMPACT-BASELINE.json'), json(snapshot));
  return snapshot;
}
export async function publishCompaction(directory) {
  assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true'); assert(process.env.GITHUB_RUN_ID);
  assert.equal(run('git', ['status', '--porcelain']).trim(), '');
  const snapshot = JSON.parse(await readFile(path.join(directory, 'COMPACT-BASELINE.json'), 'utf8'));
  assert.equal(snapshot.schemaVersion, 'sdk-2.0.1-compact-migration-v1'); assert.equal(snapshot.migrationRevision, run('git', ['rev-parse', 'HEAD']).trim());
  const output = path.join(directory, 'public'), { manifest } = await verifyPublicDelivery(output);
  assert.equal(manifest.kit.sha256, snapshot.kitSha256);
  for (const manager of ['npm', 'pnpm']) {
    const report = JSON.parse(await readFile(path.join(output, 'acceptance', manager, 'report.json'), 'utf8'));
    assert.equal(report.status, 'pass'); assert.equal(report.kitSha256, manifest.kit.sha256); assert.equal(report.runId, process.env.GITHUB_RUN_ID); assert.equal(report.manager, manager); assert.equal(report.checks.length, 10); assert.deepEqual(report.archives, manifest.archives);
  }
  assert.deepEqual(snapshot.backups.map(identity), snapshot.release.assets, 'Every original asset requires a backup');
  for (const item of snapshot.backups) assert.equal(sha256(await readFile(path.join(directory, 'backup', item.name))), item.sha256, 'Backup changed');
  const verifyTags = () => { for (const item of snapshot.tags) assert.deepEqual(api(`git/ref/tags/${encodeURIComponent(item.name)}`).object, item.object); };
  verifyTags();
  const generated = [];
  for (const file of manifest.uploadFiles) generated.push(record(file, await readFile(path.join(output, file))));
  assert.deepEqual(generated, snapshot.generated);
  const prior = JSON.parse(await readFile('docs/architecture/evidence/sdk-host-kit-20261020/publication.json', 'utf8'));
  assert.deepEqual(snapshot.plan, planCompaction({ ...snapshot.release, draft: false }, manifest, generated, [...prior.preservedAssets, ...prior.addedOrReused]), 'Cleanup targets must match the known inventory');
  const bodyFile = path.join(directory, 'COMPACT-RELEASE-UPDATE.json'); await writeFile(bodyFile, json({ body: releaseBody(manifest, snapshot.release.body) }));
  await executeCompaction(snapshot.plan, generated, {
    preflight: async () => { const current = api(`releases/tags/${tag}`); assert.equal(current.id, snapshot.release.id); assert.equal(current.draft, false); assert.deepEqual(ordered(current.assets), ordered(snapshot.release.assets)); verifyTags(); },
    remove: async asset => { gh(['api', '--method', 'DELETE', `repos/${repo}/releases/assets/${asset.id}`]); },
    ensureUploaded: async item => {
      const current = api(`releases/tags/${tag}`), asset = current.assets.find(a => a.name === item.file);
      if (asset) assert(matches(asset, item), 'Refusing conflicting compact metadata');
      else gh(['release', 'upload', tag, path.join(output, item.file), '--repo', repo]);
    },
    verifyDownloads: async () => {
      const current = api(`releases/tags/${tag}`);
      for (const item of generated) {
        const asset = current.assets.find(a => a.name === item.file); assert(matches(asset, item)); assert.equal(sha256(download(asset)), item.sha256);
      }
      verifyTags();
    },
    updateBody: async () => { gh(['api', '--method', 'PATCH', `repos/${repo}/releases/${snapshot.release.id}`, '--input', bodyFile]); },
    verifyFinal: async () => {
      const current = api(`releases/tags/${tag}`); assert.equal(current.id, snapshot.release.id); assert.equal(current.draft, false);
      assert.deepEqual(current.assets.map(a => a.name).sort(), manifest.uploadFiles.toSorted());
      for (const asset of snapshot.plan.keep) assert.deepEqual(identity(current.assets.find(a => a.name === asset.name)), asset);
      assert.equal(current.body.trimEnd(), JSON.parse(await readFile(bodyFile, 'utf8')).body.trimEnd()); verifyTags();
    },
  });
  await writeFile(path.join(directory, 'COMPACT-PUBLICATION.json'), json({ status: 'pass', version: '2.0.1', workflowRun: process.env.GITHUB_RUN_ID, migrationRevision: snapshot.migrationRevision, kitSha256: manifest.kit.sha256, preservedAssets: snapshot.plan.keep, replacedMetadata: snapshot.plan.replace, removedAssets: snapshot.plan.remove, finalAssets: generated, tags: snapshot.tags, assetCount: 6 }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, directory] = process.argv.slice(2); assert(directory);
  if (action === 'prepare') await prepareCompaction(path.resolve(directory));
  else if (action === 'publish') await publishCompaction(path.resolve(directory));
  else throw new Error('Expected prepare or publish');
}
