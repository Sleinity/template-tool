/** Sequential browser/release checks; preserve every failure and its log. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const dir=process.argv.includes('--final')?'fidelity/evidence/choices-completion/release-final':'fidelity/evidence/choices-completion';mkdirSync(dir,{recursive:true});
const commands=['font:reactivation:verify','studio:setup','studio:drafts','field-rules:studio','studio:family-parity','studio:workflow-acceptance'];
const results=[];
for(const command of commands){const result=spawnSync('pnpm',[command],{encoding:'utf8',env:process.env});const log=`${dir}/${command.replaceAll(':','-')}.log`;writeFileSync(log,(result.stdout??'')+(result.stderr??''));results.push({command:`pnpm ${command}`,exitCode:result.status??1,log,error:result.error?.message??null});writeFileSync(dir+'/release.json',JSON.stringify(results,null,2)+'\n');console.log(`${command}: ${result.status??1}`);}
if(results.some(row=>row.exitCode!==0))process.exitCode=1;
