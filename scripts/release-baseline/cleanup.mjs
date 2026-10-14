/** Explicit allowlist retirement, only after merged read-only verification. */
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink,readdir} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
import path from 'node:path';import {pathToFileURL} from 'node:url';
import {sha256} from '../release-publication/candidate.mjs';
import {githubJson} from '../release-publication/github.mjs';
export function validateCleanupRow(row, current){
 assert(['sdk-1.0.0-sealed-fixtures','frozen-candidate-inputs'].includes(row.name),'Unrelated artifact name');
 assert.equal(row.ownership,'verified-sdk-1.0.0-certification');
 assert.match(row.ciphertextSha256,/^[a-f0-9]{64}$/);
 assert.equal(current.id,row.id);assert.equal(current.name,row.name);assert.equal(current.digest,row.digest);
 assert.equal(current.workflow_run.id,row.runId);assert.equal(current.workflow_run.head_sha,row.headSha);
 assert.equal(current.workflow_run.repository_id,1307991360);
}
export function validateWorkflowRow(row,current){
 assert.equal(row.ownership,'completed-sdk-1.0.0-execution');
 assert(['.github/workflows/candidate-certification.yml','.github/workflows/release-preparation.yml','.github/workflows/release-rehearsal.yml','.github/workflows/release.yml'].includes(row.path));
 assert.equal(current.id,row.id);assert.equal(current.path,row.path);assert(['active','disabled_manually','disabled_inactivity'].includes(current.state));
}
export function absenceOutcome(status){
 if(status===404)return 'already-absent';
 if(status>=200&&status<300)return 'present';
 throw new Error('Cleanup access/network failure: HTTP '+status);
}
function request(route,method='GET'){
 const r=spawnSync(process.env.SDK_GH_EXECUTABLE??'gh',['api','repos/Sleinity/template-tool/'+route,'--method',method,'--include'],{encoding:'utf8',maxBuffer:4*1024*1024});
 const status=Number(r.stdout?.match(/^HTTP\/\S+\s+(\d{3})/mi)?.[1]);
 assert(status,'Cleanup response has no observable HTTP status');
 const outcome=absenceOutcome(status);
 if(outcome==='already-absent'){
  const match=route.match(/^actions\/(secrets|artifacts|workflows)\/([^/]+)$/);assert(match,'Unexpected absent cleanup endpoint');
  const [,kind,id]=match;for(let page=1;;page++){
   const listing=githubJson(`actions/${kind}?per_page=100&page=${page}`);assert(Array.isArray(listing[kind]),'Cleanup listing unavailable');
   assert(!listing[kind].some(r=>kind==='secrets'?r.name===id:String(r.id)===id),'404 conflicts with visible resource; cleanup refuses ambiguous absence');
   if(listing[kind].length<100)break;
  }
  return {status};
 }
 assert.equal(r.status,0,'Cleanup request failed');
 const text=r.stdout.split(/\r?\n\r?\n/).slice(1).join('\n\n').trim();
 return {status,body:text?JSON.parse(text):null};
}
export async function executeCleanup(inventory,api=request,onResult=async()=>{}){
 assert.equal(inventory.schemaVersion,'sdk-release-cleanup-inventory-v1');
 assert.equal(inventory.secret.name,'SDK_CERT_FIXTURE_KEY_20261013C');
 assert.equal(inventory.secret.ownership,'dedicated-sdk-1.0.0-certification');
 const rows=[];
 const local=[];for(const row of inventory.localFiles){assert.equal(row.file,'/private/tmp/sdk-m7-certified-inputs.zip','Only reviewed temporary input file allowed');assert.equal(row.ownership,'created-sdk-release-transfer-copy');let bytes;try{bytes=await readFile(row.file);}catch(e){if(e.code!=='ENOENT')throw e;}if(bytes)assert.equal(sha256(bytes),row.sha256);local.push({row,present:!!bytes});}
 // Validate every present artifact before making any deletion.
 for(const row of inventory.artifacts){const r=api('actions/artifacts/'+row.id);if(absenceOutcome(r.status)==='present')validateCleanupRow(row,r.body);rows.push({row,before:r});}
 const workflows=[];for(const row of inventory.workflows??[]){const r=api('actions/workflows/'+row.id);if(r.status!==404)validateWorkflowRow(row,r.body);workflows.push({row,before:r});}
 const secret=api('actions/secrets/'+inventory.secret.name);
 if(absenceOutcome(secret.status)==='present'){assert.equal(secret.body.name,inventory.secret.name);assert.equal(secret.body.updated_at,inventory.secret.updatedAt);}
 const results=[];const append=async row=>{results.push(row);await onResult([...results]);};
 for(const {row,before} of workflows){if(before.status!==404&&before.body.state==='active'){api('actions/workflows/'+row.id+'/disable','PUT');assert.equal(api('actions/workflows/'+row.id).body.state,'disabled_manually');}await append({kind:'workflow',id:row.id,path:row.path,outcome:before.status===404?'already-absent':before.body.state==='active'?'disabled':'already-disabled'});}
 if(secret.status!==404){api('actions/secrets/'+inventory.secret.name,'DELETE');assert.equal(api('actions/secrets/'+inventory.secret.name).status,404);}
 await append({kind:'secret',name:inventory.secret.name,outcome:secret.status===404?'already-absent':'deleted'});
 for(const {row,before} of rows){if(before.status!==404){api('actions/artifacts/'+row.id,'DELETE');assert.equal(api('actions/artifacts/'+row.id).status,404);}await append({kind:'artifact',id:row.id,name:row.name,outcome:before.status===404?'already-absent':'deleted',preservedCiphertextSha256:row.ciphertextSha256});}
 for(const {row,present} of local){if(present)await unlink(row.file);await append({kind:'local-file',file:row.file,outcome:present?'deleted':'already-absent'});}
 return results;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const args=process.argv.slice(2);assert.equal(args.length,4);assert.equal(args[0],'--verification-run');assert.equal(args[2],'--output');
 const runId=Number(args[1]);assert(Number.isSafeInteger(runId)&&runId>0);
 const run=githubJson('actions/runs/'+runId);assert.equal(run.conclusion,'success');assert.equal(run.event,'workflow_dispatch');assert.equal(run.head_branch,'main');assert.equal(run.path,'.github/workflows/sdk-baseline.yml');assert.equal(run.head_repository.full_name,'Sleinity/template-tool');assert.equal(run.head_sha,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
 const jobs=githubJson('actions/runs/'+runId+'/jobs').jobs;assert(jobs.some(j=>j.name==='verify'&&j.conclusion==='success'));
 const active=await readdir('.github/workflows');for(const file of active){const text=await readFile('.github/workflows/'+file,'utf8');assert(!/SDK_CERT_FIXTURE_KEY_20261013C|\.certification-input|release-publication\/fixtures\.mjs/.test(text),'Temporary workflow reference remains');}
 const inventoryFile='docs/architecture/evidence/sdk-1-baseline-20261014/cleanup-inventory.json';const bytes=await readFile(inventoryFile);const inventory=JSON.parse(bytes);const baseline=JSON.parse(await readFile('config/sdk-release-baseline.json'));assert.equal(sha256(bytes),baseline.retirement.inventorySha256,'Cleanup inventory differs from reviewed main');
 const result={schemaVersion:'sdk-release-cleanup-receipt-v1',status:'running',verificationRunId:runId,sourceCommit:run.head_sha,inventorySha256:sha256(bytes),results:[],removedSecretValuesRecorded:false,gitHistoryRewritten:false,unclassifiedResourcesPreserved:true};
 await writeFile(args[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 try{result.results=await executeCleanup(inventory,request,async rows=>{result.results=rows;await writeFile(args[3],JSON.stringify(result,null,2)+'\n');});result.status='pass';}
 catch(error){result.status='fail';result.error=error.message;await writeFile(args[3],JSON.stringify(result,null,2)+'\n');throw error;}
 await writeFile(args[3],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'pass',resources:result.results.length,verificationRunId:runId}));
}
