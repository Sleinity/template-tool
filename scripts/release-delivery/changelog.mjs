/** Documentation-only update of the compact 2.0.1 kit and seventh release file. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { zipSync } from 'fflate';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './bundle.mjs';
import { unpackKit, verifyPublicDelivery, publicNames, publicUploadFiles, releaseBody } from './host-kit.mjs';
import { executeCompaction } from './compact.mjs';
const repo = 'Sleinity/template-tool', tag = 'sdk-v2.0.1';
const json = value => JSON.stringify(value, null, 2) + '\n';
const record = (file, bytes) => ({ file, bytes: bytes.length, sha256: sha256(bytes) });
const identity = a => ({ id: a.id, name: a.name, size: a.size, digest: a.digest });
const ordered = assets => assets.map(identity).sort((a,b) => a.id-b.id);
function run(binary, args, buffer = false) {
  const result = spawnSync(binary, args, { encoding: buffer ? undefined : 'utf8', maxBuffer: 64*1024*1024 });
  assert.equal(result.status, 0, `${binary} ${args.join(' ')}: ${result.stderr ?? ''}`); return result.stdout;
}
const gh = args => run(process.env.GH_BIN ?? 'gh', args).toString().trim();
const api = suffix => JSON.parse(gh(['api', `repos/${repo}/${suffix}`]));
const download = a => run(process.env.GH_BIN ?? 'gh', ['api', `repos/${repo}/releases/assets/${a.id}`, '-H', 'Accept: application/octet-stream'], true);
export function documentationDelta(before, after) {
  const allowed = new Set(['README.md','CHANGELOG.md','DELIVERY.json']); const changed = [];
  for (const file of new Set([...Object.keys(before), ...Object.keys(after)])) {
    assert(after[file], `A documentation update cannot remove ${file}`);
    if (!before[file] || sha256(before[file]) !== sha256(after[file])) {
      assert(allowed.has(file), `A documentation update cannot change ${file}`); changed.push(file);
    }
  }
  return changed.sort();
}
export function addConsolidatedChangelog(seed, bytes, changelog, revision) {
  assert.equal(seed.version, '2.0.1'); assert.equal(seed.layout, 'standard'); assert.equal(sha256(bytes), seed.kit.sha256);
  assert(/^[a-f0-9]{40}$/.test(revision));
  const before = unpackKit(bytes), files = { ...before }, text = Buffer.from(changelog).toString();
  assert(text.startsWith('# Template SDK changelog\n')); assert(text.includes('## 2.0.1\n'));
  const readme = Buffer.from(files['README.md']).toString();
  assert(readme.includes('## Documentation\n'));
  const updated = readme.includes('[Consolidated changelog](CHANGELOG.md)') ? readme : readme.replace('## Documentation\n', '## Documentation\n\n- [Consolidated changelog](CHANGELOG.md): SDK history, breaking changes and release fixes.\n');
  files['README.md'] = Buffer.from(updated); files['CHANGELOG.md'] = Buffer.from(changelog);
  const changed = !before['CHANGELOG.md'] || sha256(before['CHANGELOG.md']) !== sha256(changelog) || readme !== updated;
  const manifest = structuredClone(seed);
  if (changed) {
    const provenance = JSON.parse(Buffer.from(files['DELIVERY.json']).toString());
    provenance.baseDeliveryRevision ??= seed.deliveryRevision; provenance.deliveryRevision = revision;
    provenance.changelogSource = { source: 'docs/sdk/CHANGELOG.md', sha256: sha256(changelog) };
    files['DELIVERY.json'] = Buffer.from(json(provenance));
    manifest.baseDeliveryRevision ??= seed.deliveryRevision; manifest.deliveryRevision = revision;
    const entries = Object.entries(files).sort(([a],[b]) => a.localeCompare(b,'en'));
    bytes = Buffer.from(zipSync(Object.fromEntries(entries.map(([file,data]) => [file,[data,{mtime:new Date(2020,0,1)}]])),{level:9}));
    manifest.kit = { ...record(seed.kit.file, bytes), entries: entries.map(([file,data]) => record(file,data)) };
  }
  manifest.uploadFiles = publicUploadFiles(manifest.archives, publicNames(manifest.version), false, true);
  return { manifest, bytes, changedFiles: documentationDelta(before, files) };
}
export function documentationUpdatePlan(release, manifest, generated) {
  assert.equal(release.tag_name, tag); assert.equal(release.draft, false);
  assert.deepEqual(generated.map(a => a.file), manifest.uploadFiles); assert.equal(manifest.uploadFiles.length,7);
  const allowed = new Set(manifest.uploadFiles), keep = [], replace = [];
  const archives = new Set(manifest.archives.map(a => a.file));
  for (const asset of release.assets) {
    assert(allowed.has(asset.name), `Unexpected release asset: ${asset.name}`);
    const desired = generated.find(a => a.file === asset.name);
    if (archives.has(asset.name)) {
      assert.equal(asset.size, desired.bytes); assert.equal(asset.digest, `sha256:${desired.sha256}`); keep.push(identity(asset));
    } else if (asset.size !== desired.bytes || asset.digest !== `sha256:${desired.sha256}`) replace.push(identity(asset));
  }
  assert.equal(keep.length,3); return { keep, replace, remove: [] };
}
export async function prepareChangelog(directory) {
  const release = api(`releases/tags/${tag}`), backup = path.join(directory,'backup'), output = path.join(directory,'public');
  await mkdir(backup,{recursive:true}); await mkdir(output,{recursive:true});
  for (const asset of release.assets) {
    assert(asset.name && path.basename(asset.name) === asset.name && !/[\\\r\n]/.test(asset.name));
    const bytes = download(asset); assert.equal(bytes.length,asset.size); assert.equal(`sha256:${sha256(bytes)}`,asset.digest);
    await writeFile(path.join(backup,asset.name),bytes);
  }
  const { manifest: seed } = await verifyPublicDelivery(backup);
  assert.deepEqual(release.assets.map(a => a.name).sort(),seed.uploadFiles.toSorted());
  const revision = run('git',['rev-parse','HEAD']).trim(), changelog = await readFile('docs/sdk/CHANGELOG.md');
  const update = addConsolidatedChangelog(seed,await readFile(path.join(backup,seed.kit.file)),changelog,revision);
  for (const archive of seed.archives) await copyFile(path.join(backup,archive.file),path.join(output,archive.file));
  await writeFile(path.join(output,seed.kit.file),update.bytes); await writeFile(path.join(output,'CHANGELOG.md'),changelog);
  const manifestBytes = Buffer.from(json(update.manifest)); await writeFile(path.join(output,'SDK-DELIVERY-MANIFEST.json'),manifestBytes);
  await writeFile(path.join(output,'SHA256SUMS'),[...seed.archives,update.manifest.kit,record('SDK-DELIVERY-MANIFEST.json',manifestBytes),record('CHANGELOG.md',changelog)].map(a=>`${a.sha256}  ${a.file}\n`).join(''));
  await verifyPublicDelivery(output);
  const generated = [];
  for (const file of update.manifest.uploadFiles) generated.push(record(file,await readFile(path.join(output,file))));
  const plan = documentationUpdatePlan(release,update.manifest,generated);
  const tags = [tag,...seed.archives.map(a=>`${a.name}@2.0.1`)].map(name=>({name,object:api(`git/ref/tags/${encodeURIComponent(name)}`).object}));
  for (const item of tags) { assert.equal(item.object.type,'commit'); assert.equal(item.object.sha,seed.sourceRevision); }
  const snapshot = {schemaVersion:'sdk-2.0.1-changelog-update-v1',updateRevision:revision,release:{id:release.id,tag_name:tag,draft:release.draft,body:release.body,assets:release.assets.map(identity)},seedManifest:seed,generated,plan,tags,changedFiles:update.changedFiles};
  await writeFile(path.join(directory,'CHANGELOG-BASELINE.json'),json(snapshot)); return snapshot;
}
export async function publishChangelog(directory) {
  assert.equal(process.env.CI,'true'); assert.equal(process.env.GITHUB_ACTIONS,'true'); assert(process.env.GITHUB_RUN_ID);
  assert.equal(run('git',['status','--porcelain']).trim(),'');
  const snapshot = JSON.parse(await readFile(path.join(directory,'CHANGELOG-BASELINE.json'),'utf8'));
  assert.equal(snapshot.schemaVersion,'sdk-2.0.1-changelog-update-v1'); assert.equal(snapshot.updateRevision,run('git',['rev-parse','HEAD']).trim());
  const output = path.join(directory,'public'), {manifest} = await verifyPublicDelivery(output);
  for (const manager of ['npm','pnpm']) {
    const report = JSON.parse(await readFile(path.join(output,'acceptance',manager,'report.json'),'utf8'));
    assert.equal(report.status,'pass'); assert.equal(report.manager,manager); assert.equal(report.kitSha256,manifest.kit.sha256); assert.equal(report.runId,process.env.GITHUB_RUN_ID); assert.equal(report.checks.length,10); assert.deepEqual(report.archives,manifest.archives);
  }
  for (const asset of snapshot.release.assets) assert.equal(`sha256:${sha256(await readFile(path.join(directory,'backup',asset.name)))}`,asset.digest);
  const generated = [];
  for (const file of manifest.uploadFiles) generated.push(record(file,await readFile(path.join(output,file))));
  assert.deepEqual(generated,snapshot.generated); assert.deepEqual(snapshot.plan,documentationUpdatePlan(snapshot.release,manifest,generated));
  const expected = addConsolidatedChangelog(snapshot.seedManifest,await readFile(path.join(directory,'backup',snapshot.seedManifest.kit.file)),await readFile('docs/sdk/CHANGELOG.md'),snapshot.updateRevision);
  assert.deepEqual(expected.manifest,manifest); assert.equal(sha256(expected.bytes),manifest.kit.sha256);
  const verifyTags = () => {for(const t of snapshot.tags)assert.deepEqual(api(`git/ref/tags/${encodeURIComponent(t.name)}`).object,t.object);};
  const bodyFile = path.join(directory,'CHANGELOG-RELEASE-UPDATE.json'); await writeFile(bodyFile,json({body:releaseBody(manifest,snapshot.release.body)}));
  await executeCompaction(snapshot.plan,generated,{
    preflight:async()=>{const r=api(`releases/tags/${tag}`);assert.equal(r.id,snapshot.release.id);assert.equal(r.draft,false);assert.deepEqual(ordered(r.assets),ordered(snapshot.release.assets));verifyTags();},
    remove:async a=>{gh(['api','--method','DELETE',`repos/${repo}/releases/assets/${a.id}`]);},
    ensureUploaded:async item=>{const r=api(`releases/tags/${tag}`),a=r.assets.find(a=>a.name===item.file);if(a){assert.equal(a.digest,`sha256:${item.sha256}`);assert.equal(a.size,item.bytes);}else gh(['release','upload',tag,path.join(output,item.file),'--repo',repo]);},
    verifyDownloads:async()=>{const r=api(`releases/tags/${tag}`);for(const item of generated){const a=r.assets.find(a=>a.name===item.file);assert(a);assert.equal(a.digest,`sha256:${item.sha256}`);assert.equal(sha256(download(a)),item.sha256);}verifyTags();},
    updateBody:async()=>{gh(['api','--method','PATCH',`repos/${repo}/releases/${snapshot.release.id}`,'--input',bodyFile]);},
    verifyFinal:async()=>{const r=api(`releases/tags/${tag}`);assert.deepEqual(r.assets.map(a=>a.name).sort(),manifest.uploadFiles.toSorted());for(const a of snapshot.plan.keep)assert.deepEqual(identity(r.assets.find(b=>b.name===a.name)),a);assert.equal(r.body.trimEnd(),JSON.parse(await readFile(bodyFile,'utf8')).body.trimEnd());verifyTags();},
  });
  await writeFile(path.join(directory,'CHANGELOG-PUBLICATION.json'),json({status:'pass',workflowRun:process.env.GITHUB_RUN_ID,updateRevision:snapshot.updateRevision,previousKitSha256:snapshot.seedManifest.kit.sha256,kitSha256:manifest.kit.sha256,changelogSha256:sha256(await readFile(path.join(output,'CHANGELOG.md'))),changedFiles:snapshot.changedFiles,preservedSdkArchives:snapshot.plan.keep,assetCount:7,files:generated,tags:snapshot.tags}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const[action,directory]=process.argv.slice(2);assert(directory);
  if(action==='prepare')await prepareChangelog(path.resolve(directory));else if(action==='publish')await publishChangelog(path.resolve(directory));else throw Error('Expected prepare or publish');
}
