/** Synthetic DOM equivalence for the bounded computed-style read reduction. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transformWithEsbuild} from 'vite';
const sourcePath='packages/template-react/src/internal/runtime-routing/textMeasurementInputs.ts';
const original=JSON.parse(readFileSync('docs/architecture/evidence/text-geometry-final-c-sources/identity.json')).files[sourcePath];
const previous=readFileSync(original.path);assert.equal(createHash('sha256').update(previous).digest('hex'),original.sha256);
async function load(bytes){const out=await transformWithEsbuild(bytes.toString(),'input.ts',{loader:'ts',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(out.code).toString('base64'));}
const before=await load(previous),after=await load(readFileSync(sourcePath));
const styles=new Map(),calls=[];
function element(tag,text,properties={}){const value={tagName:tag,textContent:text,isConnected:true,parentElement:null,clientWidth:161,clientHeight:22,querySelectorAll:()=>[]};styles.set(value,new Proxy({width:'100px',height:'200px',...properties},{get:(obj,key)=>obj[key]??'initial'}));return value;}
const canvas=element('DIV',''),parent=element('DIV',''),box=element('DIV','Date'),paint=element('SPAN','Date'),run=element('SPAN','Date',{fontWeight:'500'});
canvas.getBoundingClientRect=()=>({width:200,height:400});box.closest=()=>canvas;box.parentElement=parent;parent.parentElement=canvas;paint.querySelectorAll=()=>[run];
const saved=Object.getOwnPropertyDescriptor(globalThis,'getComputedStyle');
Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:element=>{calls.push(element);return styles.get(element);}});
const cases=[];
try {
 for(const [label,mutate]of [['initial',()=>{}],['width',()=>box.clientWidth=80],['run typography',()=>styles.get(run).fontWeight='700'],['scale',()=>canvas.getBoundingClientRect=()=>({width:100,height:200})],['disconnected',()=>box.isConnected=false]]){
  mutate();calls.length=0;const expected=before.readMountedTextMeasurementInputs(box,paint),beforeCalls=calls.length;calls.length=0;const actual=after.readMountedTextMeasurementInputs(box,paint),afterCalls=calls.length;
  assert.equal(actual,expected,label);if(box.isConnected)assert.equal(beforeCalls-afterCalls,2);else assert.equal(afterCalls,0);
  cases.push({label,beforeCalls,afterCalls,fingerprintUnchanged:actual===expected});
 }
} finally {if(saved)Object.defineProperty(globalThis,'getComputedStyle',saved);else delete globalThis.getComputedStyle;}
const result={retainedOriginal:original,syntheticDom:true,sourceCertification:false,cases};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
