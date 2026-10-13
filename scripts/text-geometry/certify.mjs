/** Sequential verification; performance trials do not overlap builds/browser gates. */
import { spawnSync } from 'node:child_process';
import { mkdirSync,writeFileSync } from 'node:fs';
const output=process.argv[2]??'fidelity/evidence/text-geometry-final-d',runId=process.argv[3]??'sdk-061-text-geometry-20261009d';mkdirSync(output,{recursive:true});
const commands=[
 ['node',['scripts/editor-performance/release-checks.mjs',output+'/release']],
 ['node',['scripts/text-geometry/verify.mjs']],
 ['node',['scripts/repository/verify-field-render-evidence-browser.mjs']],
 ...['runtime-routing:stage4a','runtime-routing:scenarios','runtime-routing:fonts','runtime-routing:text-trim','runtime-routing:boolean','runtime-routing:textarea-max-lines'].map(c=>['pnpm',[c]]),
 ['pnpm',['fidelity:compare','--','--gate','sdk-061','--run-id',runId,'--font-profile','source-authoritative','--repeat','2']],
 ['pnpm',['scene:compare','--','--gate','sdk-061','--run-id',runId,'--fidelity-run',runId]],
 ['pnpm',['settlement:compare','--','--gate','sdk-061','--run-id',runId,'--fidelity-run',runId]],
 ...['production','development'].map(mode=>['node',['scripts/editor-performance/run.mjs','--baseline','docs/architecture/evidence/text-geometry-baseline/identity.json','--phase','paired','--trials','5','--mode',mode,'--output',output+'/performance']]),
 ['node',['scripts/text-geometry/assert-traces.mjs',output+'/performance/production-paired.json','--current-only']],
 ['node',['scripts/text-geometry/assert-traces.mjs',output+'/performance/development-paired.json','--current-only']],
 ['node',['scripts/text-geometry/retain-review.mjs',runId]],
 ['pnpm',['sdk:gate:061','--','--run-id',runId,'--assess-existing']],
];
const record={runId,node:process.version,platform:process.platform,arch:process.arch,commands:[]};
for(const [i,[executable,args]]of commands.entries()){
 console.log(`START ${i} ${executable} ${args.join(' ')}`);
 const begin=performance.now(),startedAt=new Date().toISOString();
 const result=spawnSync(executable,args,{env:process.env,encoding:'utf8',maxBuffer:35*1024*1024});
 const log=output+`/command-${i}.log`;writeFileSync(log,(result.stdout??'')+(result.stderr??''));
 record.commands.push({command:executable+' '+args.join(' '),startedAt,durationMs:performance.now()-begin,exitCode:result.status??1,log,error:result.error?.message??null});
 writeFileSync(output+'/commands.json',JSON.stringify(record,null,2)+'\n');console.log(`END ${i} -> ${result.status}`);
}
if(record.commands.some(c=>c.exitCode!==0))process.exitCode=1;
