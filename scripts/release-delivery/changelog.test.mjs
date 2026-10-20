import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { zipSync, strToU8 } from 'fflate';
import { addConsolidatedChangelog, documentationDelta, documentationUpdatePlan } from './changelog.mjs';
import { unpackKit, releaseBody } from './host-kit.mjs';
import { sha256 } from './bundle.mjs';
const source='a'.repeat(40), previous='b'.repeat(40), revision='c'.repeat(40);
const record=(file,bytes)=>({file,bytes:bytes.length,sha256:sha256(bytes)});
const raw={'README.md':strToU8('# Host\n\n## Documentation\n\nExisting guide.\n'),'DELIVERY.json':strToU8(JSON.stringify({version:'2.0.1',sourceRevision:source,deliveryRevision:previous})), 'src/main.tsx':strToU8('original application'), 'vendor/core.tgz':strToU8('original SDK bytes')};
const bytes=Buffer.from(zipSync(raw));
const seed={schemaVersion:'sdk-public-delivery-v2',version:'2.0.1',layout:'standard',sourceRevision:source,deliveryRevision:previous,archives:['core','browser','react'].map((name,i)=>({file:`${name}.tgz`,name:`@sleinity/template-${name}`,bytes:i+1,sha256:String(i).repeat(64)})),kit:{...record('template-sdk-2.0.1-host-kit.zip',bytes),entries:Object.entries(raw).map(([file,data])=>record(file,data))},uploadFiles:[]};
const changelog=strToU8('# Template SDK changelog\n\n## 2.0.1\n\nChanges.\n');
const update=addConsolidatedChangelog(seed,bytes,changelog,revision);
test('documentation update changes only the changelog, README link and provenance',()=>{
  assert.deepEqual(update.changedFiles,['CHANGELOG.md','DELIVERY.json','README.md']);
  const files=unpackKit(update.bytes);assert.equal(Buffer.from(files['CHANGELOG.md']).toString(),Buffer.from(changelog).toString());
  assert.equal(sha256(files['src/main.tsx']),sha256(raw['src/main.tsx']));assert.equal(sha256(files['vendor/core.tgz']),sha256(raw['vendor/core.tgz']));
  assert(Buffer.from(files['README.md']).toString().includes('[Consolidated changelog](CHANGELOG.md)'));
  assert.equal(update.manifest.uploadFiles.length,7);assert.equal(update.manifest.uploadFiles.at(-1),'CHANGELOG.md');
  assert.equal(update.manifest.sourceRevision,source);assert.equal(update.manifest.deliveryRevision,revision);assert.equal(update.manifest.baseDeliveryRevision,previous);
});
test('repeating the same changelog update preserves ZIP bytes and original documentation revision',()=>{
  const repeated=addConsolidatedChangelog(update.manifest,update.bytes,changelog,'d'.repeat(40));
  assert.equal(sha256(repeated.bytes),sha256(update.bytes));assert.deepEqual(repeated.changedFiles,[]);assert.equal(repeated.manifest.deliveryRevision,revision);
});
test('runtime edits, missing members and unapproved additional files cannot hide in a docs update',()=>{
  for(const after of [{...raw,'src/main.tsx':strToU8('changed')},{...raw,'new-runtime.js':strToU8('new')},Object.fromEntries(Object.entries(raw).filter(([file])=>file!=='src/main.tsx'))])assert.throws(()=>documentationDelta(raw,after));
  assert.throws(()=>addConsolidatedChangelog({...seed,version:'2.0.2'},bytes,changelog,revision));
});
test('replacement plan protects all SDK archives and rejects unknown release files',()=>{
  const generated=update.manifest.uploadFiles.map((file,i)=>update.manifest.archives.find(a=>a.file===file)??{file,bytes:100+i,sha256:'e'.repeat(64)});
  const sdk=seed.archives.map((a,i)=>({id:i,name:a.file,size:a.bytes,digest:'sha256:'+a.sha256}));
  const old={id:9,name:seed.kit.file,size:bytes.length,digest:'sha256:'+sha256(bytes)};
  const release={tag_name:'sdk-v2.0.1',draft:false,assets:[...sdk,old]};
  const plan=documentationUpdatePlan(release,update.manifest,generated);assert.equal(plan.keep.length,3);assert.deepEqual(plan.replace,[old]);assert.deepEqual(plan.remove,[]);
  assert.throws(()=>documentationUpdatePlan({...release,assets:[...release.assets,{...old,name:'SURPLUS.md'}]},update.manifest,generated));
  assert.throws(()=>documentationUpdatePlan({...release,assets:release.assets.slice(1)},update.manifest,generated));
});
test('consolidated document covers every recorded package version with current compatibility guidance',async()=>{
  const document=await readFile('docs/sdk/CHANGELOG.md','utf8'),versions=new Set();
  for(const name of ['core','browser','react'])for(const match of (await readFile(`packages/template-${name}/CHANGELOG.md`,'utf8')).matchAll(/^## (\d+\.\d+\.\d+)$/gm))versions.add(match[1]);
  assert.deepEqual([...document.matchAll(/^## (\d+\.\d+\.\d+)$/gm)].map(m=>m[1]),[...versions].sort((a,b)=>b.localeCompare(a,'en',{numeric:true})));
  assert(document.includes('No public SDK API'));assert(document.includes('Studio'));assert(document.includes('V1 APIs and wizard flows'));
  const body=releaseBody(update.manifest,'# Patch notes\nExisting fixes.');assert(body.includes('/CHANGELOG.md'));assert(body.includes('Existing fixes.'));
});
test('documentation publication is protected and requires backup plus both installed-kit gates',async()=>{
  const workflow=await readFile('.github/workflows/host-kit-changelog.yml','utf8');
  for(const value of ['environment: private-sdk-release','changelog.mjs prepare','changelog.mjs publish','for manager in npm pnpm','verify-kit.mjs','if: always()'])assert(workflow.includes(value));
  assert(workflow.indexOf('actions/upload-artifact@v4')<workflow.indexOf('changelog.mjs publish'));
  assert(workflow.indexOf('verify-kit.mjs')<workflow.indexOf('changelog.mjs publish'));
  assert(!/packages: write|npm publish|pnpm release|git (?:push|tag)/.test(workflow));
});
