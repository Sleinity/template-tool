/** Test-only, hash-verified UI baseline overlay and development measurements. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {sha256} from '../fidelity/core.mjs';
export function fieldsMeasurementPlugin(baseline) {
 const identity=JSON.parse(readFileSync(process.env.EDITOR_FIELDS_IDENTITY??'docs/studio/evidence/fields-usability-20261011/identity.json'));
 const sources=new Map();
 for(const [file,record]of Object.entries(identity.files)){const bytes=readFileSync(record.path);assert.equal(sha256(bytes),record.sha256,file);sources.set(resolve(file),bytes.toString());}
 return {name:'test-only-fields-measurement',enforce:'pre',transform(original,id){
  const path=id.split('?')[0]; let code=baseline?(sources.get(path)??original):original;
  if(path.endsWith('/FieldConfigurationEditorV2.tsx'))code=code.replace('import { useEffect,','import { Profiler, useEffect,').replace('return <form ref={form}',`return <Profiler id="fields" onRender={(_id,phase,duration)=>{const m=(globalThis.__fieldsMetrics??={commits:[],validations:0,materializations:0,paints:[]});m.commits.push({phase,duration});}}><form ref={form}`).replace('</form>;','</form></Profiler>;');
  if(path.endsWith('/validateTemplatePackageV2.ts'))code=code.replace('export function validateTemplatePackageV2(input: unknown): TemplatePackageValidationResult {',`export function validateTemplatePackageV2(input: unknown): TemplatePackageValidationResult { const m=(globalThis.__fieldsMetrics??={commits:[],validations:0,materializations:0,paints:[]});m.validations++;`);
  if(path.endsWith('/materializeTemplateFieldContentV2.ts'))code=code.replace('): MaterializeTemplateFieldContentResultV2 {',`): MaterializeTemplateFieldContentResultV2 { const m=(globalThis.__fieldsMetrics??={commits:[],validations:0,materializations:0,paints:[]});m.materializations++;`);
  return code===original?null:{code,map:null};
 }};
}
export async function measureFields(page,kind,browser,baseline){
 const color=page.locator('[data-field-id="color:backgroundColor"]');await color.locator('.field-rule-card__select').click();
 const input=color.getByLabel('Label',{exact:true}), initial=await input.inputValue();
 await input.evaluate(node=>node.addEventListener('input',()=>{const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>globalThis.__fieldsMetrics.paints.push(performance.now()-start)));}));
 const trials=[];
 for(let trial=-1;trial<5;trial++){
  await page.evaluate(()=>{globalThis.__fieldsMetrics={commits:[],validations:0,materializations:0,paints:[]};globalThis.__fieldsResources={allocations:0,writes:0};});
  await input.fill(initial);await input.pressSequentially(' draft',{delay:20});
  await input.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const sample=await page.evaluate(()=>({...globalThis.__fieldsMetrics,resources:globalThis.__fieldsResources}));if(trial>=0)trials.push(sample);
  await color.getByRole('button',{name:'Discard',exact:true}).click();
 }
 const paints=trials.flatMap(t=>t.paints).sort((a,b)=>a-b),percentile=p=>paints[Math.min(paints.length-1,Math.floor(paints.length*p))];
 const record={baseline,kind,environment:'development Vite; test-only React Profiler and validator instrumentation',browser,viewport:{width:1440,height:1200},deviceScaleFactor:1,warmups:1,trials,medianInputToTwoFramesMs:percentile(.5),p95InputToTwoFramesMs:percentile(.95),interpretation:'Input-to-two-frames proxy, not canonical acceptance or production latency. Unapplied labels must not materialize or persist.'};
 const dir=process.env.EDITOR_FIELDS_MEASUREMENT_DIR??'fidelity/evidence/fields-usability';mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/measurement-${baseline?'before':'after'}-${kind}.json`,JSON.stringify(record,null,2));console.log(JSON.stringify({kind,baseline,median:percentile(.5),p95:percentile(.95),commits:trials.map(t=>t.commits.length),validations:trials.map(t=>t.validations)}));
}
