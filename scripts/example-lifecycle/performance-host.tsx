/** Production-build workload instrumentation; never imported by the example. */
import {StrictMode} from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{FieldRulesV2Host as Before}from'../../docs/architecture/evidence/v2-example-lifecycle-20261013/baseline/examples/template-editor-integration/src/FieldRulesV2Host';
import{FieldRulesV2Host as After}from'../../examples/template-editor-integration/src/FieldRulesV2Host';
const w=window as any;w.__perf={notifications:0,commits:0,allocations:0,revocations:0,activations:0,readCalls:0,paint:[],acceptance:[],longTasks:[]};const seen=new WeakSet();
w.__capture=(s:any)=>{w.__session=s;if(seen.has(s))return;seen.add(s);let operation=s.getSnapshot().operationRevision;s.subscribe(()=>{w.__perf.notifications++;const next=s.getSnapshot().operationRevision;if(next!==operation&&w.__inputTime!==undefined)w.__perf.acceptance.push(performance.now()-w.__inputTime);operation=next;});};
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL),add=document.fonts.add.bind(document.fonts),read=File.prototype.text;
URL.createObjectURL=b=>{w.__perf.allocations++;return create(b);};URL.revokeObjectURL=u=>{w.__perf.revocations++;revoke(u);};document.fonts.add=f=>{w.__perf.activations++;return add(f);};File.prototype.text=function(){w.__perf.readCalls++;return read.call(this);};
new PerformanceObserver(list=>w.__perf.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
document.addEventListener('input',e=>{if(!(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement))return;const t=performance.now();w.__inputTime=t;requestAnimationFrame(()=>w.__perf.paint.push(performance.now()-t));},true);
const root=createRoot(document.getElementById('root')!);flushSync(()=>root.render(<StrictMode>{new URLSearchParams(location.search).get('before')==='1'?<Before/>:<After fontRegistry={null}/>}</StrictMode>));
w.__unmount=()=>flushSync(()=>root.unmount());
