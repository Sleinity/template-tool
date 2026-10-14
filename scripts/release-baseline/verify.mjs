/** Durable release audit. No writes to registry, GitHub assets, tags or SDK sources. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256, safeRelative } from '../release-publication/candidate.mjs';
import { validateAcceptance, validateFidelity, resolveRemoteTag } from '../release-publication/promotion.mjs';
import { github, githubJson } from '../release-publication/github.mjs';
import { RegistryReadClient } from '../release-publication/registry.mjs';
import { verifyDeliveryBundle } from '../release-delivery/bundle.mjs';
export const baselineFile = 'config/sdk-release-baseline.json';
export function validateRelease(release, baseline, tagCommit) {
  assert.equal(tagCommit, baseline.tagCommit, 'Immutable tag differs');
  assert.equal(release.id, baseline.releaseId);
  assert.equal(release.tag_name, baseline.tag);
  assert.equal(release.draft, false, 'Release is a draft');
  assert.equal(release.prerelease, false, 'Release is not stable');
}
export function validateAssetInventory(assets, inventory) {
  assert.equal(assets.length, inventory.length, 'Release asset count differs');
  assert.equal(new Set(assets.map(a => a.name)).size, assets.length);
  for (const row of inventory) assert(assets.some(a => a.name === row.file), 'Missing release asset: '+row.file);
}
export function validateArchive(bytes, row) {
  assert.equal(bytes.length, row.bytes, 'Registry archive size differs');
  assert.equal(sha256(bytes), row.sha256, 'Registry archive hash differs');
}
export function validateCleanupReceipt(receipt,inventory,inventorySha256){
 assert.equal(receipt.schemaVersion,'sdk-release-cleanup-receipt-v1');assert.equal(receipt.status,'pass');assert.equal(receipt.inventorySha256,inventorySha256);
 const expected=[...inventory.workflows.map(r=>({kind:'workflow',id:r.id,path:r.path})),{kind:'secret',name:inventory.secret.name},...inventory.artifacts.map(r=>({kind:'artifact',id:r.id,name:r.name,preservedCiphertextSha256:r.ciphertextSha256})),...inventory.localFiles.map(r=>({kind:'local-file',file:r.file}))];
 assert.equal(receipt.results.length,expected.length);const keys=new Set();
 for(const row of expected){const matches=receipt.results.filter(r=>r.kind===row.kind&& (row.id?r.id===row.id:row.name?r.name===row.name:r.file===row.file));assert.equal(matches.length,1,'Missing or duplicate cleanup outcome');const result=matches[0];for(const [key,value]of Object.entries(row))assert.equal(result[key],value);assert(['deleted','already-absent','already-deleted','disabled','already-disabled'].includes(result.outcome),'Unresolved cleanup outcome');keys.add(JSON.stringify(row));}
 assert.equal(keys.size,expected.length);assert.equal(receipt.removedSecretValuesRecorded,false);assert.equal(receipt.gitHistoryRewritten,false);
}
export async function verifyLocal(root = process.cwd()) {
  const b = JSON.parse(await readFile(path.join(root, baselineFile)));
  assert.equal(b.schemaVersion, 'sdk-release-baseline-v1');
  assert.equal(b.tag, 'sdk-v1.0.0');
  assert.equal(b.tagCommit, '33bd70dbca1f02cdd6c80a83dc1ba4666d2ed348');
  assert.equal(b.lifecycle, 'retired');
  const load = async row => {
    safeRelative(row.file);
    const bytes = await readFile(path.join(root,row.file));
    assert.equal(sha256(bytes),row.sha256,'Evidence/source hash differs: '+row.file);
    return bytes;
  };
  const d=JSON.parse(await load(b.descriptor));
  assert.deepEqual(b.archives,d.archives);
  assert.deepEqual(b.runtimeSources,d.sourceFiles.filter(r=>/^(packages\/|apps\/studio\/src\/)/.test(r.file)));
  const reports=new Map();
  for(const row of b.receipts) reports.set(row.role,JSON.parse(await load(row)));
  for(const platform of ['darwin','linux']) {
    const report=reports.get(platform);
    validateAcceptance(report,d,platform,b.tagCommit);
    assert.equal(report.deliveryManifestSha256,b.deliveryManifestSha256);
  }
  validateFidelity(reports.get('fidelity'),d);
  const stable=reports.get('stable');
  assert.equal(stable.status,'pass');assert.equal(stable.tagCommit,b.tagCommit);
  assert.equal(stable.promotion.conclusion,'success');
  assert(stable.humanApprovals.some(a=>a.state==='approved'&&a.user==='Sleinity'));
  assert.equal(reports.get('publication').status,'pass');
  assert.equal(reports.get('journal').complete,true);
  const assets=reports.get('assets');assert.equal(assets.status,'pass');assert.equal(assets.tagCommit,b.tagCommit);
  assert.equal(assets.deliveryManifestSha256,b.deliveryManifestSha256);
  assert.equal(assets.files.length,41);assert.equal(new Set(assets.files.map(r=>r.file)).size,41);
  for(const row of b.runtimeSources) {
    safeRelative(row.file);
    const bytes=execFileSync('git',['show',`${b.tagCommit}:${row.file}`],{cwd:root,maxBuffer:32*1024*1024});
    assert.equal(sha256(bytes),row.sha256,'Certified tag source differs: '+row.file);
  }
  for(const row of [...b.protectedFiles,...b.archivedWorkflows,...b.closureReports])await load(row);
  for(const row of b.documentationChanges) await load(row);
  if(b.retirement.receipt) {
    const cleanup=JSON.parse(await load(b.retirement.receipt));validateCleanupReceipt(cleanup,JSON.parse(await readFile(path.join(root,b.retirement.inventory))),b.retirement.inventorySha256);
    assert.equal(b.retirement.status,'complete');
  }
  if(b.postCleanupVerification){
    const post=JSON.parse(await load(b.postCleanupVerification));assert.equal(post.status,'pass');assert.equal(post.tagCommit,b.tagCommit);assert.equal(post.assets,41);assert.deepEqual(post.registryArchives,b.archives);assert.equal(post.fixtureKeyRequired,false);assert.equal(post.actionsArtifactsRequired,false);assert.equal(post.deliveryManifestSha256,b.deliveryManifestSha256);assert.equal(post.hosts.length,2);for(const manager of ['npm','pnpm']){const rows=post.hosts.filter(r=>r.manager===manager);assert.equal(rows.length,1);assert.equal(rows[0].status,'pass');assert.equal(rows[0].strictDeclarations,true);} 
  }
  return {baseline:b,descriptor:d,reports,assets:assets.files};
}
async function originalDeliveryRoot(d,commit) {
  const dir=await mkdtemp(path.join(tmpdir(),'sdk-baseline-source-'));
  try {
    const inventory=JSON.parse(execFileSync('git',['show',`${commit}:config/sdk-delivery-inventory.json`]));
    const files=new Set(['config/sdk-delivery-inventory.json','config/sdk-runtime-packages.json','package.json',...d.archives.map(a=>'packages/'+a.name.split('/')[1]+'/package.json'),...inventory.documents.map(r=>r.source)]);
    for(const file of files){safeRelative(file);const bytes=execFileSync('git',['show',`${commit}:${file}`],{maxBuffer:32*1024*1024});await mkdir(path.dirname(path.join(dir,file)),{recursive:true});await writeFile(path.join(dir,file),bytes);}
    return dir;
  }catch(e){await rm(dir,{recursive:true,force:true});throw e;}
}
export async function verifyRemote(context, directory, client = new RegistryReadClient()) {
  const {baseline:b,descriptor:d,assets}=context;
  const tag=resolveRemoteTag(),release=githubJson('releases/tags/'+b.tag);
  validateRelease(release,b,tag);validateAssetInventory(release.assets,assets);
  await mkdir(directory,{recursive:true});
  for(const row of assets){
    safeRelative(row.file);assert.equal(path.basename(row.file),row.file);
    const a=release.assets.find(a=>a.name===row.file);
    const bytes=github('releases/assets/'+a.id,{binary:true,accept:'application/octet-stream'});
    assert.equal(sha256(bytes),row.sha256,'Published asset hash differs: '+row.file);
    await writeFile(path.join(directory,row.file),bytes,{flag:'wx'});
  }
  const source=await originalDeliveryRoot(d,b.tagCommit);
  try{
    const delivery=await verifyDeliveryBundle(directory,{root:source,version:b.version});
    assert.equal(delivery.manifestSha256,b.deliveryManifestSha256);
  }finally{await rm(source,{recursive:true,force:true});}
  for(const row of b.archives){const state=await client.inspect(row.name,b.version);assert.equal(state.state,'present');validateArchive(await client.download(state),row);}
  assert.equal(resolveRemoteTag(),b.tagCommit,'Tag changed during verification');
  return {status:'pass',tagCommit:b.tagCommit,releaseId:release.id,assets:assets.length,registryArchives:b.archives,deliveryManifestSha256:b.deliveryManifestSha256,actionsArtifactsRequired:false,fixtureKeyRequired:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);assert(args.every(a=>a==='--local'||a==='--hosts'),'Usage: sdk:baseline:verify [--local] [--hosts]');
  const context=await verifyLocal();
  if(args.includes('--local'))console.log(JSON.stringify({status:'pass',mode:'local',tagCommit:context.baseline.tagCommit,retainedGate:'24/12/3/12'}));
  else {
    const temp=await mkdtemp(path.join(tmpdir(),'sdk-stable-audit-'));
    try{const result=await verifyRemote(context,path.join(temp,'delivery'));if(args.includes('--hosts')){const {verifyRegistryHosts}=await import('./hosts.mjs');result.hosts=await verifyRegistryHosts(context,path.join(temp,'delivery'));}console.log(JSON.stringify({...result,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),ciRunId:process.env.GITHUB_RUN_ID??null,manualLiveReview:false}));}
    finally{await rm(temp,{recursive:true,force:true});}
  }
}
