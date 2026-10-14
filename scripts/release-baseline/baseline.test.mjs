import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,access,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {validateRelease,validateAssetInventory,validateArchive,verifyLocal} from './verify.mjs';
import {assertBaselineWorkflow} from './contracts.mjs';import {validateCleanupRow,absenceOutcome,executeCleanup} from './cleanup.mjs';import {sha256} from '../release-publication/candidate.mjs';
test('stable audit refuses tag, draft/prerelease, archive and missing asset mismatches',()=>{
 const b={tagCommit:'a',releaseId:1,tag:'sdk-v1.0.0'},r={id:1,tag_name:b.tag,draft:false,prerelease:false};validateRelease(r,b,'a');for(const patch of [{draft:true},{prerelease:true},{id:2}])assert.throws(()=>validateRelease({...r,...patch},b,'a'));assert.throws(()=>validateRelease(r,b,'b'));
 const bytes=Buffer.from('archive'),row={bytes:bytes.length,sha256:sha256(bytes)};validateArchive(bytes,row);assert.throws(()=>validateArchive(Buffer.from('wrong'),row));assert.throws(()=>validateAssetInventory([],[{file:'a'}]));assert.throws(()=>validateAssetInventory([{name:'a'},{name:'a'}],[{file:'a'},{file:'b'}]));
});
test('durable local gate uses hash-bound receipts and no Actions expiry or fixture key',async()=>{delete process.env.SDK_CERT_FIXTURE_KEY;const c=await verifyLocal();assert.equal(c.assets.length,41);assert.equal(c.reports.get('fidelity').rendererPasses,12);const code=await readFile('scripts/release-baseline/verify.mjs','utf8');assert(!/actions\/artifacts|expires_at|SDK_CERT_FIXTURE_KEY/.test(code));});
test('active baseline workflow cannot write, upload or access retired inputs',async()=>{
 const s=await readFile('.github/workflows/sdk-baseline.yml','utf8');assertBaselineWorkflow(s);for(const extra of ['\npackages: write','\nSDK_CERT_FIXTURE_KEY','\nuses: actions/upload-artifact@v4','\nrun: npm publish'])assert.throws(()=>assertBaselineWorkflow(s+extra));
});
test('retired entrypoints fail before file/credential/network side effects',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sdk-retired-test-'));try{
 for(const [file,args] of [['scripts/release-publication/cli.mjs',['publish','--output',path.join(dir,'out')]],['scripts/release-publication/promotion.mjs',[]],['scripts/release-publication/preflight.mjs',[]],['scripts/release-publication/fixtures.mjs',['restore',path.join(dir,'fixtures')]],['scripts/candidate-certification/fixtures.mjs',['restore','missing',path.join(dir,'candidate')]],['scripts/candidate-certification/run.mjs',['--archives','missing','--output',path.join(dir,'out')]]]){const r=spawnSync(process.execPath,[file,...args],{encoding:'utf8',env:{...process.env,GH_TOKEN:'',NODE_AUTH_TOKEN:'',SDK_CERT_FIXTURE_KEY:''}});assert.notEqual(r.status,0,file);assert.match(r.stderr,/retired after stable publication/,file);}
 await assert.rejects(access(path.join(dir,'out')));await assert.rejects(access(path.join(dir,'fixtures')));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('cleanup refuses unrelated/shared/mismatched resources and access failures',()=>{
 const row={id:1,name:'sdk-1.0.0-sealed-fixtures',ownership:'verified-sdk-1.0.0-certification',ciphertextSha256:'a'.repeat(64),digest:'sha256:b',runId:2,headSha:'c'};const current={id:1,name:row.name,digest:row.digest,workflow_run:{id:2,head_sha:'c',repository_id:1307991360}};validateCleanupRow(row,current);for(const patch of [{name:'sdk-registry-acceptance'},{ownership:'shared'}])assert.throws(()=>validateCleanupRow({...row,...patch},current));assert.throws(()=>validateCleanupRow(row,{...current,digest:'different'}));assert.equal(absenceOutcome(404),'already-absent');for(const status of [401,403,500,0])assert.throws(()=>absenceOutcome(status));
});
test('allowlist validates everything before deletion; repeated cleanup reconciles absence',async()=>{
 const inventory={schemaVersion:'sdk-release-cleanup-inventory-v1',secret:{name:'SDK_CERT_FIXTURE_KEY_20261013C',ownership:'dedicated-sdk-1.0.0-certification',updatedAt:'now'},artifacts:[],localFiles:[]};const calls=[];const result=await executeCleanup(inventory,(route,method)=>{calls.push(method??'GET');return {status:404};});assert.equal(result[0].outcome,'already-absent');assert(!calls.includes('DELETE'));await assert.rejects(executeCleanup({...inventory,secret:{...inventory.secret,name:'OTHER'}},()=>{throw Error('Must never call API');}));
});
test('tampered receipt hash fails before any remote access',async()=>{
 const {mkdir,writeFile,copyFile}=await import('node:fs/promises');const dir=await mkdtemp(path.join(tmpdir(),'sdk-receipt-test-'));
 try{const b=JSON.parse(await readFile('config/sdk-release-baseline.json'));b.receipts[0].sha256='0'.repeat(64);await mkdir(path.join(dir,'config'),{recursive:true});await writeFile(path.join(dir,'config/sdk-release-baseline.json'),JSON.stringify(b));await copyFile(b.descriptor.file,path.join(dir,b.descriptor.file));await mkdir(path.dirname(path.join(dir,b.receipts[0].file)),{recursive:true});await copyFile(b.receipts[0].file,path.join(dir,b.receipts[0].file));await assert.rejects(verifyLocal(dir),/Evidence\/source hash differs/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('fixture functions refuse even correctly shaped bytes before output creation',async()=>{
 const {restoreReleaseFixtureBytes,retainSealedFixtures}=await import('../release-publication/fixtures.mjs');const dir=await mkdtemp(path.join(tmpdir(),'sdk-retired-restore-'));
 try{await assert.rejects(restoreReleaseFixtureBytes(Buffer.from('SDKFIX01'),path.join(dir,'output')),/retired/);await assert.rejects(retainSealedFixtures(path.join(dir,'output')),/retired/);await assert.rejects(access(path.join(dir,'output')));}finally{await rm(dir,{recursive:true,force:true});}
});
test('cleanup rejects a later invalid row before deleting an earlier valid resource',async()=>{
 const row={id:1,name:'sdk-1.0.0-sealed-fixtures',ownership:'verified-sdk-1.0.0-certification',ciphertextSha256:'a'.repeat(64),digest:'sha256:b',runId:2,headSha:'c'};let deleted=0;
 const inventory={schemaVersion:'sdk-release-cleanup-inventory-v1',secret:{name:'SDK_CERT_FIXTURE_KEY_20261013C',ownership:'dedicated-sdk-1.0.0-certification',updatedAt:'now'},artifacts:[row,{...row,id:3,ownership:'shared'}],localFiles:[]};
 await assert.rejects(executeCleanup(inventory,(route,method)=>{if(method==='DELETE')deleted++;const id=Number(route.split('/').at(-1));return {status:200,body:{id,name:row.name,digest:row.digest,workflow_run:{id:2,head_sha:'c',repository_id:1307991360}}};}));assert.equal(deleted,0);
});
test('retired low-level registry writer cannot make a package request',async()=>{
 const {RegistryWriteClient}=await import('../release-publication/registry.mjs');const client=new RegistryWriteClient({NODE_AUTH_TOKEN:'synthetic-not-a-credential'});let requests=0;client.npm=async()=>{requests++;};await assert.rejects(client.publish('archive',{name:'@sleinity/template-core'}),/retired/);assert.equal(requests,0);
});
test('workflow retirement refuses ordinary CI and unknown workflow identities',async()=>{
 const {validateWorkflowRow}=await import('./cleanup.mjs');const row={id:1,path:'.github/workflows/release.yml',ownership:'completed-sdk-1.0.0-execution'};validateWorkflowRow(row,{id:1,path:row.path,state:'active'});assert.throws(()=>validateWorkflowRow({...row,path:'.github/workflows/ci.yml'},{id:1,path:'.github/workflows/ci.yml',state:'active'}));assert.throws(()=>validateWorkflowRow(row,{id:2,path:row.path,state:'active'}));
});
test('cleanup records completed operations before a later failure',async()=>{
 const row={id:1,name:'sdk-1.0.0-sealed-fixtures',ownership:'verified-sdk-1.0.0-certification',ciphertextSha256:'a'.repeat(64),digest:'sha256:b',runId:2,headSha:'c'};
 const inv={schemaVersion:'sdk-release-cleanup-inventory-v1',secret:{name:'SDK_CERT_FIXTURE_KEY_20261013C',ownership:'dedicated-sdk-1.0.0-certification',updatedAt:'now'},artifacts:[row],localFiles:[]};let secretPresent=true;const updates=[];
 await assert.rejects(executeCleanup(inv,(route,method)=>{
  if(route.includes('secrets/')){if(method==='DELETE'){secretPresent=false;return {status:204};}return secretPresent?{status:200,body:{name:inv.secret.name,updated_at:'now'}}:{status:404};}
  if(method==='DELETE')throw Error('503 unavailable');return {status:200,body:{id:1,name:row.name,digest:row.digest,workflow_run:{id:2,head_sha:'c',repository_id:1307991360}}};
 },async rows=>updates.push(rows)),/503/);assert.equal(updates.length,1);assert.equal(updates[0][0].outcome,'deleted');assert.equal(updates[0][0].kind,'secret');
});
