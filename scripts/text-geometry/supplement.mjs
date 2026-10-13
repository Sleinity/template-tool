/** Final non-production harness/record checks after registering analysis coverage. */
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const dir=process.argv[2]??'fidelity/evidence/text-geometry-final-d',rows=[];
for(const [exe,args]of [['pnpm',['test:portable']],['pnpm',['docs:verify']],['node',['scripts/text-geometry/assert-publication-order.mjs',dir+'/performance/production-paired.json']],['node',['scripts/text-geometry/assert-publication-order.mjs',dir+'/performance/development-paired.json']],['node',['scripts/text-geometry/verify-style-reads.mjs','fidelity/evidence/text-geometry-read-confirmation/style-read-equivalence.json']]]){
 const startedAt=new Date().toISOString(),begin=performance.now(),r=spawnSync(exe,args,{encoding:'utf8',maxBuffer:16*1024*1024}),log=dir+'/supplement-'+rows.length+'.log';
 writeFileSync(log,(r.stdout??'')+(r.stderr??''));rows.push({command:exe+' '+args.join(' '),startedAt,durationMs:performance.now()-begin,exitCode:r.status??1,log});
 writeFileSync(dir+'/supplemental.json',JSON.stringify(rows,null,2)+'\n');console.log(exe+' '+args.join(' ')+' -> '+r.status);
}
if(rows.some(r=>r.exitCode!==0))process.exitCode=1;
