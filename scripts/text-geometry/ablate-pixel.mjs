/** Isolated retained-source comparisons; no checkout or reference rewriting. */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='fidelity/evidence/now-hiring-text-ablation',results=[];
const base=JSON.parse(readFileSync('docs/architecture/evidence/now-hiring-text-baseline/identity.json'));
const current=JSON.parse(readFileSync('docs/architecture/evidence/now-hiring-text-measurement-c-sources/identity.json'));
const renderer='packages/template-react/src/render/TemplatePackageRenderer.tsx',css='apps/studio/src/styles.css';
const names=['old-css','old-renderer','no-property','opacity-only','text-only'];
for(const name of names){
 const dir=root+'/'+name;mkdirSync(dir,{recursive:true});
 const files={...base.files};
 if(name==='old-renderer')files[css]=current.files[css];
 else files[renderer]=current.files[renderer];
 if(!['old-css','old-renderer'].includes(name)){
  let style=readFileSync(base.files[css].path,'utf8');
  const replacement=name==='text-only'
   ?'transition-duration: 0.01ms !important;\n  }\n  [data-package-node-type="TEXT"],\n  [data-package-node-type="TEXT"] * {\n    transition-duration: 0s !important;'
   :'transition-duration: 0.01ms !important;\n    transition-property: '+(name==='no-property'?'none':'opacity')+' !important;';
  style=style.replace('transition-duration: 0.01ms !important;',replacement);
  const path=dir+'/style.txt';writeFileSync(path,style);
  files[css]={path,sha256:createHash('sha256').update(style).digest('hex')};
 }
 writeFileSync(dir+'/identity.json',JSON.stringify({files},null,2)+'\n');
 const runId='now-hiring-text-ablation-'+name+'-20261010';
 const identityPath=root+'/'+name+'/identity.json';
 const result=spawnSync('pnpm',['fidelity:compare','--','--fixture','exporter-061-carrousel','--surface','editor','--run-id',runId,'--font-profile','source-authoritative','--repeat','2'],{env:{...process.env,EDITOR_RETAINED_SOURCE_IDENTITY:identityPath},encoding:'utf8',maxBuffer:10*1024*1024});
 const log=root+'/'+name+'/comparison.log';writeFileSync(log,(result.stdout??'')+(result.stderr??''));
 results.push({name,runId,identityPath,identity:JSON.parse(readFileSync(identityPath)),exitCode:result.status,log});
 writeFileSync(root+'/comparisons.json',JSON.stringify(results,null,2)+'\n');
 console.log(name+' -> '+result.status);
}
