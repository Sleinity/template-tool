import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compactManifest, planCompaction, executeCompaction } from './compact.mjs';
import { releaseBody } from './host-kit.mjs';
const item = (file, index) => ({ file, bytes: index + 10, sha256: String(index).repeat(64) });
const source = {
  schemaVersion: 'sdk-public-delivery-v2', version: '2.0.1', layout: 'additive', sourceRevision: 'a'.repeat(40), deliveryRevision: 'b'.repeat(40),
  kit: item('template-sdk-2.0.1-host-kit.zip', 1),
  archives: ['core', 'browser', 'react'].map((name, i) => ({ ...item(`sleinity-template-${name}-2.0.1.tgz`, i + 2), name: '@sleinity/template-' + name, version: '2.0.1' })), uploadFiles: [],
};
const manifest = compactManifest(source);
const generated = [source.kit, ...source.archives, item('SDK-DELIVERY-MANIFEST.json', 5), item('SHA256SUMS', 6)];
const asAsset = (item, id) => ({ id, name: item.file, size: item.bytes, digest: 'sha256:' + item.sha256 });
const keep = generated.slice(0, 4).map((item, i) => asAsset(item, i + 1));
const oldMetadata = [item('SDK-DELIVERY-MANIFEST.json', 7), item('SHA256SUMS', 8)].map((item, i) => asAsset(item, i + 5));
const legacy = [item('OLD-GUIDE.md', 9), item('HOST-KIT-MANIFEST.json', 0)].map((item, i) => asAsset(item, i + 7));
const initial = { id: 1, tag_name: 'sdk-v2.0.1', draft: false, assets: [...keep, ...oldMetadata, ...legacy] };
const allowed = initial.assets;
const plan = planCompaction(initial, manifest, generated, allowed);
test('compact metadata preserves the accepted kit, packages and source provenance', () => {
  assert.equal(manifest.layout, 'standard'); assert.equal(manifest.uploadFiles.length, 6);
  assert.deepEqual(manifest.kit, source.kit); assert.deepEqual(manifest.archives, source.archives);
  assert.equal(source.layout, 'additive'); assert.equal(manifest.deliveryRevision, source.deliveryRevision);
  assert.throws(() => compactManifest({ ...source, version: '2.0.2' }));
});
test('the plan distinguishes four immutable downloads, two metadata replacements and surplus attachments', () => {
  assert.deepEqual(plan.keep, keep); assert.deepEqual(plan.replace, oldMetadata); assert.deepEqual(plan.remove, legacy);
});
test('unknown or modified assets, changed identities and missing packages fail before mutation', () => {
  const changes = [
    [...initial.assets, asAsset(item('UNREVIEWED.md', 9), 99)],
    initial.assets.map(a => a.id === 7 ? { ...a, size: 999 } : a),
    initial.assets.map(a => a.id === 7 ? { ...a, id: 77 } : a),
    initial.assets.map(a => a.id === 1 ? { ...a, digest: 'sha256:' + '9'.repeat(64) } : a),
    initial.assets.filter(a => a.id !== 2),
  ];
  for (const assets of changes) assert.throws(() => planCompaction({ ...initial, assets }, manifest, generated, allowed));
});
test('partial cleanup and an already compact release can resume without replacing the kit or SDKs', () => {
  const assets = [...keep, ...generated.slice(4).map((item, i) => asAsset(item, i + 20)), legacy[1]];
  const partial = planCompaction({ ...initial, assets }, manifest, generated, allowed);
  assert.deepEqual(partial.keep, keep); assert.deepEqual(partial.replace, []); assert.deepEqual(partial.remove, [legacy[1]]);
  const complete = planCompaction({ ...initial, assets: assets.slice(0, 6) }, manifest, generated, allowed);
  assert.deepEqual(complete.remove, []); assert.deepEqual(complete.replace, []);
});
function operations(actions, fail) {
  const step = async name => { actions.push(name); if (name === fail) throw new Error('controlled failure'); };
  return { preflight: () => step('preflight'), remove: a => step('remove:' + a.name), ensureUploaded: a => step('upload:' + a.file), verifyDownloads: () => step('downloads'), updateBody: () => step('body'), verifyFinal: () => step('final') };
}
test('new downloads verify and the entry point switches before obsolete attachments are removed', async () => {
  const actions = []; await executeCompaction(plan, generated, operations(actions));
  assert.deepEqual(actions, ['preflight', 'remove:SDK-DELIVERY-MANIFEST.json', 'upload:SDK-DELIVERY-MANIFEST.json', 'remove:SHA256SUMS', 'upload:SHA256SUMS', 'downloads', 'body', 'remove:OLD-GUIDE.md', 'remove:HOST-KIT-MANIFEST.json', 'final']);
  assert(!actions.some(a => /remove:.*(?:tgz|zip)$/.test(a)));
});
test('preflight, upload and download failures stop subsequent deletions and release-body updates', async () => {
  for (const fail of ['preflight', 'upload:SDK-DELIVERY-MANIFEST.json', 'downloads']) {
    const actions = []; await assert.rejects(executeCompaction(plan, generated, operations(actions, fail)));
    assert(!actions.includes('remove:OLD-GUIDE.md')); assert(!actions.includes('body'));
    if (fail === 'preflight') assert.deepEqual(actions, ['preflight']);
  }
});
test('compact release notes retain bugfix notes and point to current checksums', () => {
  const old = releaseBody(source, '# Fixes\nPreserve choices.');
  const body = releaseBody(manifest, old);
  assert(body.includes('/sdk-v2.0.1/SHA256SUMS')); assert(body.includes('Preserve choices.'));
  assert(!body.includes('Older individual downloads')); assert(!body.includes('HOST-KIT-SHA256SUMS'));
});
test('the compaction workflow retains backups before publication and keeps protected portable acceptance', async () => {
  const source = await readFile('.github/workflows/compact-sdk-2-0-1.yml', 'utf8');
  for (const value of ['environment: private-sdk-release', 'compact.mjs prepare', 'compact.mjs publish', 'retention-days: 90', 'verify-kit.mjs', 'for manager in npm pnpm', 'if: always()']) assert(source.includes(value), value);
  assert(source.indexOf('actions/upload-artifact@v4') > source.indexOf('compact.mjs prepare'));
  assert(source.indexOf('actions/upload-artifact@v4') < source.indexOf('compact.mjs publish'));
  assert(source.indexOf('verify-kit.mjs') < source.indexOf('compact.mjs publish'));
  assert(!/packages: write|npm publish|pnpm release|git (?:push|tag)|sdk-certified-inputs/.test(source));
  const entry = await readFile('.github/workflows/release.yml', 'utf8');
  assert(entry.includes('inputs.compact_host_kit == true && inputs.prepare_runtime_handoff != true && inputs.refresh_host_kit != true'));
});
