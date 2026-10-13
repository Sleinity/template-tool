/** Sequential current-run evidence. Keeps all failures, never promotes references. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const output=process.argv[2]??'fidelity/evidence/now-hiring-text-final',runId=process.argv[3]??'sdk-061-now-hiring-text-stability-20261010c';
const baseline='docs/architecture/evidence/now-hiring-text-baseline/identity.json';
mkdirSync(output,{recursive:true});
const workload=(mode,dir,extra=[])=>['node',['scripts/editor-performance/run.mjs','--baseline',baseline,'--phase','paired','--trials','5','--mode',mode,'--output',output+'/'+dir,...extra]];
const commands=[
 workload('production','performance'),
 ['node',['scripts/text-geometry/assert-now-hiring.mjs',output+'/performance/production-paired.json','--current-only']],
 ['node',['scripts/text-geometry/assert-traces.mjs',output+'/performance/production-paired.json','--current-only']],
 workload('development','performance'),
 ['node',['scripts/text-geometry/assert-now-hiring.mjs',output+'/performance/development-paired.json','--current-only']],
 ['node',['scripts/text-geometry/assert-traces.mjs',output+'/performance/development-paired.json','--current-only']],
 workload('production','family-now-hiring',['--scenario','family','--family-index','0']),
 ['node',['scripts/text-geometry/assert-now-hiring.mjs',output+'/family-now-hiring/production-paired.json','--current-only']],
 process.argv.includes('--reuse-latency')?['node',['scripts/text-geometry/check-existing-latency.mjs',output+'/latency/production-paired.json']]:workload('production','latency',['--latency-only']),
 ['node',['scripts/editor-performance/run.mjs','--baseline',baseline,'--phase','current','--trials','1','--mode','production','--motion','no-preference','--scenario','exporter-061-now-hiring','--output',output+'/normal-motion']],
 ['node',['scripts/text-geometry/assert-now-hiring.mjs',output+'/normal-motion/production-current.json']],
 ['node',['scripts/editor-performance/release-checks.mjs',output+'/release']],
 ['node',['scripts/text-geometry/verify.mjs']],
 ['node',['scripts/repository/verify-field-render-evidence-browser.mjs']],
 ...['runtime-routing:stage4a','runtime-routing:scenarios','runtime-routing:fonts','runtime-routing:text-trim','runtime-routing:boolean','runtime-routing:textarea-max-lines'].map(c=>['pnpm',[c]]),
 ['node',['scripts/text-geometry/compare-retained.mjs',runId.replace('-stability-','-before-')]],
 ['pnpm',['fidelity:compare','--','--gate','sdk-061','--run-id',runId,'--font-profile','source-authoritative','--repeat','2']],
 ['pnpm',['scene:compare','--','--gate','sdk-061','--run-id',runId,'--fidelity-run',runId]],
 ['pnpm',['settlement:compare','--','--gate','sdk-061','--run-id',runId,'--fidelity-run',runId]],
 ['node',['scripts/text-geometry/retain-review.mjs',runId,'--now-hiring']],
 ['pnpm',['sdk:gate:061','--','--run-id',runId,'--assess-existing']],
];
const record={runId,node:process.version,platform:process.platform,arch:process.arch,commands:[]};
for(const [i,[executable,args]]of commands.entries()) {
 console.log(`START ${i} ${executable} ${args.join(' ')}`);
 const start=performance.now(),startedAt=new Date().toISOString(),result=spawnSync(executable,args,{env:process.env,encoding:'utf8',maxBuffer:35*1024*1024});
 const log=output+`/command-${i}.log`;writeFileSync(log,(result.stdout??'')+(result.stderr??''));
 record.commands.push({command:executable+' '+args.join(' '),startedAt,durationMs:performance.now()-start,exitCode:result.status??1,log,error:result.error?.message??null});
 writeFileSync(output+'/commands.json',JSON.stringify(record,null,2)+'\n');console.log(`END ${i} -> ${result.status}`);
}
if(record.commands.some(c=>c.exitCode!==0))process.exitCode=1;
