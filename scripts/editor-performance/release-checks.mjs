import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const root=process.cwd(),dir=process.argv[2]??'fidelity/evidence/editor-performance-certification';mkdirSync(dir,{recursive:true});
const commands=[['sdk:verify'],['test:portable'],['exec','tsc','-b','--pretty','false'],['--filter','@sleinity/template-studio','build'],['docs:verify'],['sdk:import-v2:verify'],['font:reactivation:verify'],['editor:verify'],['studio:setup'],['studio:drafts'],['field-rules:studio'],['studio:family-parity'],['studio:workflow-acceptance'],['template-editor:acceptance'],['template-family:acceptance']];
const record={node:process.version,platform:process.platform,arch:process.arch,commands:[]};
for(const [i,args] of commands.entries()){
 const at=new Date().toISOString(),begin=performance.now(),result=spawnSync('pnpm',args,{cwd:root,env:process.env,encoding:'utf8',maxBuffer:30*1024*1024});
 const log=`${dir}/check-${i}-${args.at(-1).replaceAll(/[^a-zA-Z0-9_-]/g,'-')}.log`;writeFileSync(log,(result.stdout??'')+(result.stderr??''));
 record.commands.push({command:'pnpm '+args.join(' '),startedAt:at,durationMs:performance.now()-begin,exitCode:result.status??1,error:result.error?.message??null,log});writeFileSync(`${dir}/release-checks.json`,JSON.stringify(record,null,2)+'\n');
 console.log(`pnpm ${args.join(' ')} -> ${result.status}`);
}
if(record.commands.some(c=>c.exitCode!==0))process.exitCode=1;
