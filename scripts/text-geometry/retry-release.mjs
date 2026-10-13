/** Preserve interrupted failures; retry only the two recorded commands unchanged. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const dir='fidelity/evidence/now-hiring-text-final';
const read=path=>JSON.parse(readFileSync(path));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const original=read(dir+'/release/release-checks.json');
assert.equal(original.commands.length,15);
assert.deepEqual(original.commands.filter(x=>x.exitCode!==0).map(x=>x.command),['pnpm sdk:verify','pnpm studio:drafts']);
assert.match(readFileSync(original.commands[0].log,'utf8'),/ERR_MODULE_NOT_FOUND/);
assert.match(readFileSync(original.commands[0].log,'utf8'),/ajv\/dist\/2020\.js/);
assert.match(readFileSync(original.commands[9].log,'utf8'),/Continue your draft\?/);
const baseline=read('docs/architecture/evidence/now-hiring-text-baseline/identity.json');
const runtimeSha256=Object.fromEntries(Object.keys(baseline.runtimeSha256).map(file=>[file,hash(file)]));
for(const[file,expected]of Object.entries(baseline.protectedArtifacts.sha256))assert.equal(hash(file),expected,file);
const record={node:process.version,platform:process.platform,arch:process.arch,runtimeSha256,original:'release/release-checks.json',reason:'Fresh isolated verification after a missing temporary ajv dependency and a recovery locator timeout. Original failures remain retained; no production change is made for the retry.',commands:[]};
for(const command of ['sdk:verify','studio:drafts']){
 const startedAt=new Date().toISOString(),start=performance.now();
 const result=spawnSync('pnpm',[command],{env:process.env,encoding:'utf8',maxBuffer:35*1024*1024});
 const log=dir+'/release/retry-'+command.replaceAll(':','-')+'.log';
 writeFileSync(log,(result.stdout??'')+(result.stderr??''));
 record.commands.push({command:'pnpm '+command,startedAt,durationMs:performance.now()-start,exitCode:result.status??1,error:result.error?.message??null,log});
 writeFileSync(dir+'/release/retries.json',JSON.stringify(record,null,2)+'\n');
 console.log(command+' -> '+result.status);
}
for(const[file,expected]of Object.entries(runtimeSha256))assert.equal(hash(file),expected,file);
if(record.commands.some(x=>x.exitCode!==0))process.exitCode=1;
