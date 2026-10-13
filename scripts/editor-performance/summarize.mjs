/** Durable compact evidence; raw frame packets stay local and reproducible. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
const directory=process.argv[2]??'fidelity/evidence/editor-performance-certification';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const candidate=JSON.parse(await readFile('docs/architecture/evidence/local-sdk-candidate-20261009.json','utf8'));
const sources=JSON.parse(await readFile('docs/architecture/evidence/editor-performance-baseline/identity.json','utf8'));
const modes=[];
const distribution=values=>{const sorted=[...values].sort((a,b)=>a-b);return {median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.ceil(sorted.length*.95)-1]};};
for(const mode of ['production','development']){
 const path=`${directory}/${mode}-paired.json`,bytes=await readFile(path),data=JSON.parse(bytes);
 assert.equal(data.trials,5);assert.equal(data.rows.length,120);assert.deepEqual(data.failures,[]);
 for(const [path,h] of Object.entries(data.current))assert.equal(hash(await readFile(path)),h,'Final implementation identity');
 const trials=data.rows.map(row=>{
 const acceptanceLatencies=row.trace.inputs.map(input=>row.state.acceptances.find(a=>a.at>=input.at)?.at-input.at).filter(Number.isFinite);
 const previewLatencies=row.trace.inputs.map(input=>row.trace.previews.find(p=>p.at>=input.at&&p.text.includes(input.value))?.at-input.at).filter(Number.isFinite);
 return {scenario:row.scenario,trial:row.trial,version:row.version,workload:row.workload,fieldId:row.fieldId,previewCatchUpMs:row.previewCatchUpMs,intermediateDuringTyping:row.intermediateDuringTyping,inputHandlerMs:row.inputHandlerMs,inputPaintOpportunityMs:row.inputPaintOpportunityMs,acceptances:row.state.acceptances.map(a=>({atMs:a.at-row.trace.start,revision:a.revision})),work:row.state.work,readiness:row.state.readiness,longTasks:row.trace.longTasks,inputToNextAcceptanceMs:acceptanceLatencies,inputToContainingPreviewMs:previewLatencies};});
 const jitter=[];
 for(const row of data.rows.filter(r=>r.scenario==='exporter-061-carrousel'&&r.workload==='continuous')){
  const frames=row.trace.frames;
  const ids=Object.keys(frames[0].nodes);
  jitter.push({trial:row.trial,version:row.version,viewportStates:new Set(frames.map(f=>JSON.stringify([f.stage,f.transform]))).size,nodes:ids.map(id=>{
   const states=[];let previous='';for(const f of frames){const key=JSON.stringify([f.nodes[id],f.nodeEvidence[id]?.attributes]);if(key!==previous){states.push({atMs:f.at-row.trace.start,bounds:f.nodes[id],text:f.nodeEvidence[id]?.text,attributes:f.nodeEvidence[id]?.attributes,settlementReadiness:f.attributes['data-package-settlement-readiness'],measurementCount:f.attributes['data-package-settlement-measurements']});previous=key;}}
   const texts=new Set(states.map(s=>s.text));const geometries=new Set(states.map(s=>JSON.stringify(s.bounds)));return {id,textUnchanged:texts.size===1,geometryStates:geometries.size,returnsToInitialBounds:JSON.stringify(states[0].bounds)===JSON.stringify(states.at(-1).bounds),states:id===row.nodeId||id==='987:6835'?states:undefined};
  }).filter(n=>n.geometryStates>1||n.id===row.nodeId)});
 }
 const summaries=data.summary.map(s=>{const rows=trials.filter(t=>t.scenario===s.scenario&&t.version===s.version&&t.workload===s.workload);return {...s,inputToNextAcceptance:distribution(rows.flatMap(r=>r.inputToNextAcceptanceMs)),inputToContainingPreview:distribution(rows.flatMap(r=>r.inputToContainingPreviewMs)),longTasks:s.longTasks.map(t=>({durationMs:t.duration}))};});
 for(const s of summaries)assert.equal(data.rows.filter(r=>r.scenario===s.scenario&&r.version===s.version&&r.workload===s.workload).length,5,'Complete per-scenario paired trials');
 modes.push({mode,packet:{path,sha256:hash(bytes)},environment:{node:data.node,platform:data.platform,arch:data.arch,browser:data.browser,viewport:data.viewport,deviceScaleFactor:data.deviceScaleFactor,paintPolicy:data.paintPolicy},fixtures:data.fixtures,fonts:data.fonts,summaries,trials,jitter});
}
const production=modes.find(m=>m.mode==='production');
const decisions=[];
for(const before of production.summaries.filter(s=>s.version==='before')){
 const after=production.summaries.find(s=>s.scenario===before.scenario&&s.workload===before.workload&&s.version==='current');
 decisions.push({scenario:before.scenario,workload:before.workload,reactInputP95BeforeMs:before.inputHandler.p95,reactInputP95AfterMs:after.inputHandler.p95,previewMedianBeforeMs:before.catchUp.median,previewMedianAfterMs:after.catchUp.median,intermediateBefore:before.intermediate,intermediateAfter:after.intermediate,inputProcessingImproved:after.inputHandler.p95<=before.inputHandler.p95,previewImproved:after.catchUp.median<before.catchUp.median});
}
assert(decisions.every(d=>d.inputProcessingImproved&&d.previewImproved),'Faster schedule must not ship with repeatable production input regression');
assert(decisions.filter(d=>d.workload==='continuous').every(d=>d.intermediateAfter.every(n=>n>0)),'Every sustained-typing trial must show intermediate preview updates');
const changed=[];for(const [path,h] of Object.entries(sources.protectedArtifacts.sha256))if(hash(await readFile(path))!==h)changed.push(path);assert.deepEqual(changed,[]);
for(const [path,h] of Object.entries(candidate.source.implementationSha256))assert.equal(hash(await readFile(path)),h,`Retained SDK candidate identity: ${path}`);
const runtimeFiles=execFileSync('rg',['--files','apps/studio/src','packages/template-core/src','packages/template-browser/src','packages/template-react/src'],{encoding:'utf8'}).trim().split('\n').sort();
const runtimeSha256=Object.fromEntries(await Promise.all(runtimeFiles.map(async path=>[path,hash(await readFile(path))])));
const packageVersions=Object.fromEntries(await Promise.all(['template-core','template-browser','template-react'].map(async name=>[name,JSON.parse(await readFile(`packages/${name}/package.json`,'utf8')).version])));
const implementation=Object.fromEntries(await Promise.all(Object.keys(sources.files).map(async path=>[path,hash(await readFile(path))])));
const toolingFiles=execFileSync('rg',['--files','scripts/editor-performance'],{encoding:'utf8'}).trim().split('\n').sort();
const toolingSha256=Object.fromEntries(await Promise.all(toolingFiles.map(async path=>[path,hash(await readFile(path))])));
const browserCheckPath='fidelity/evidence/editor-performance/browser-verification.json';
const browserCheckBytes=await readFile(browserCheckPath);
const checks=JSON.parse(await readFile(`${directory}/release-checks.json`,'utf8'));
const gatePath=`fidelity/candidates/sdk-061-editor-responsiveness-20261009a/sdk-gate.json`,gate=JSON.parse(await readFile(gatePath,'utf8'));
const captureComparison=JSON.parse(await readFile('fidelity/candidates/sdk-061-editor-responsiveness-20261009a/comparison.json','utf8'));
assert(captureComparison.capturesComplete&&captureComparison.repeatStable);
const retainedReviewPath='fidelity/candidates/sdk-061-editor-responsiveness-20261009a/retained-source-review.json';
const retainedReviewBytes=await readFile(retainedReviewPath);
const record={schemaVersion:'editor-responsiveness-verification-v1',recordedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineGate:'sdk-061-local-candidate-20261009a',source:{worktree:execFileSync('git',['status','--short'],{encoding:'utf8'}),trackedDiffSha256:hash(execFileSync('git',['diff','--binary'])),runtimeSha256,packageVersions,retainedCandidateImplementationsVerified:Object.keys(candidate.source.implementationSha256).length},implementation,toolingSha256,baselineSourceIdentity:'docs/architecture/evidence/editor-performance-baseline/identity.json',browserLifecycle:{path:browserCheckPath,sha256:hash(browserCheckBytes),record:JSON.parse(browserCheckBytes)},nonFinalAttempts:[{command:'pnpm sdk:gate:061 -- --run-id sdk-061-editor-responsiveness-20261009a',exitCode:1,cause:'Cross-run source-review disposition; every capture/comparison passed.',log:'fidelity/evidence/editor-performance-certification/initial-gate.log'},{command:'node docs/architecture/evidence/local-candidate-retain-review.mjs sdk-061-editor-responsiveness-20261009a',exitCode:1,cause:'Changed manifest build label. Existing guard correctly refused retention; editor-specific guard proved a delta of exactly two test scripts with unchanged dependency inputs.'}],retainedSourceReview:{path:retainedReviewPath,sha256:hash(retainedReviewBytes),record:JSON.parse(retainedReviewBytes)},protectedArtifactsUnchanged:sources.protectedArtifacts.count,productionSchedulingDecision:'100 ms trailing / 325 ms maximum wait enabled: all paired production scenarios improved React input p95 and preview catch-up, with sustained preview progress',decisions,modes,latencyPolicy:'Input-to-canonical is the first subsequent native content revision during append-only test input; intermediate drafts coalesce. Preview latency requires a later DOM text transition containing that input. Frame opportunity is a proxy, not compositor paint.',commands:checks.commands,gate:{file:gatePath,runId:gate.runId,go:gate.go,capturesComplete:gate.capturesComplete,captureCount:24,repeatStable:captureComparison.repeatStable,rendererComparisons:gate.comparisons.renderer.length,sceneComparisons:gate.comparisons.scene.length,settlementComparisons:gate.comparisons.settlement.length},automatedBrowserCoverage:'Exact-font headless editor, StrictMode, IME, invalid literals, commit/save failure and retry, session replacement, Family selection, guarded actions and latest-state PNG; plus existing host/Studio/font workflows.',manualLiveReview:false,rendererTimingChanged:false,referencePromotion:false,remainingWork:'Classify and repair renderer measurement transitions in a separate fixture-led milestone. Frame traces are evidence, not approval of temporary geometry.',complete:gate.go&&checks.commands.every(c=>c.exitCode===0)};
await writeFile('docs/architecture/evidence/editor-performance-20261009.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({complete:record.complete,decisions,gate:record.gate},null,2));if(!record.complete)process.exitCode=1;
