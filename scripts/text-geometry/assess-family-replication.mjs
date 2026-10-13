/** Independent investigation of a retained timing flag; never rewrites that result. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodePacket} from './packets.mjs';
import {assertWorkloadCoverage} from './workloadCoverage.mjs';
import {quantile,pairedMedianInterval} from './pairedTimingAnalysis.mjs';
const dir='fidelity/evidence/now-hiring-text-final';
const read=path=>JSON.parse(readFileSync(path));
const original=decodePacket(read(dir+'/latency/production-paired.json'));
const repeat=decodePacket(read(dir+'/family-replication/production-paired.json'));
for(const p of [original,repeat]){assertWorkloadCoverage(p);assert.deepEqual(p.failures,[]);assert.equal(p.trials,5);assert.equal(p.mode,'production');assert.equal(p.instrumentationProfile,'latency-minimal');}
assert.equal(original.rows.length,120);assert.equal(repeat.rows.length,30);
assert.deepEqual(repeat.selectedScenarios,['family']);
for(const key of ['current','baseline','fixtures','fonts','browser','node','platform','arch','viewport','deviceScaleFactor','familyIndex','reducedMotion'])assert.deepEqual(repeat[key],original[key],key);
for(const[file,expected]of Object.entries(repeat.current))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),expected,file);
const prior=read(dir+'/latency-assessment-early.json').performanceDecision;
assert.deepEqual(prior.cases.filter(c=>c.repeatableHandlerIncrease).map(c=>[c.scenario,c.workload]),[['family','multiline']]);
const cases=['burst','continuous','multiline'].map(workload=>{
 const rows=repeat.rows.filter(r=>r.workload===workload),pairs=[];assert.equal(rows.length,10);
 for(let trial=0;trial<5;trial++){
  const a=rows.find(r=>r.trial===trial&&r.version==='before'),b=rows.find(r=>r.trial===trial&&r.version==='current');assert(a&&b);
  assert.equal(a.state.acceptances.length,b.state.acceptances.length);assert(b.state.readiness.exportReady);
  if(workload==='continuous')assert(b.intermediateDuringTyping>0);
  const delta=q=>Math.round((quantile(b.inputHandlerMs,q)-quantile(a.inputHandlerMs,q))*1e6)/1e6;
  pairs.push({trial,medianDeltaMs:delta(.5),p95DeltaMs:delta(.95),paintOpportunityMedianDeltaMs:Math.round((quantile(b.inputPaintOpportunityMs,.5)-quantile(a.inputPaintOpportunityMs,.5))*1e6)/1e6});
 }
 const medianIntervalMs=pairedMedianInterval(pairs.map(p=>p.medianDeltaMs)),p95IntervalMs=pairedMedianInterval(pairs.map(p=>p.p95DeltaMs)),paintIntervalMs=pairedMedianInterval(pairs.map(p=>p.paintOpportunityMedianDeltaMs));
 return{workload,pairs,medianIntervalMs,p95IntervalMs,paintIntervalMs,repeatableIncrease:medianIntervalMs[0]>0||p95IntervalMs[0]>0||paintIntervalMs[0]>0};
});
const record={method:'Independent five-pair Family repetition after a retained full-run flag; same exact bootstrap analysis, source/environment identity and no relaxed timing threshold. Original result is not overwritten.',priorDecision:prior,cases,originalFlagRetained:true,replicationPass:cases.every(c=>!c.repeatableIncrease),manualReview:false};
writeFileSync(dir+'/family-replication/analysis.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));
if(!record.replicationPass)process.exitCode=1;
