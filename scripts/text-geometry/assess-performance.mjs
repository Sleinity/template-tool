/** Predeclared paired-trial analysis; no millisecond budget or percentile relaxation. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {quantile,pairedMedianInterval as interval} from './pairedTimingAnalysis.mjs';
const path=process.argv[2]??'docs/architecture/evidence/text-geometry-20261009.json';
const record=JSON.parse(readFileSync(path));
// Eliminate floating subtraction noise, not timer observations. Retain microsecond
// precision in the analysis; all original values remain in the durable record.
const round=value=>Math.round(value*1e6)/1e6;
assert.deepEqual(interval([1,2,3,4,5]),[1,5],'All 3125 resamples must be enumerated, not just the original median');
assert.deepEqual(interval([-.2,-.2,.1,.2,.2]),[-.2,.2],'Mixed paired tails must retain the resampling uncertainty');
assert(interval([1,2,3,4,5])[0]>0,'Consistent increases must be detected');
assert(interval([-1,0,0,1,1])[0]<=0,'Mixed observations must retain uncertainty');
const cases=[];
for(const scenario of ['exporter-061-now-hiring','exporter-061-cover','exporter-061-carrousel','family'])for(const workload of ['burst','continuous','multiline']){
 const rows=record.modes.production.rows.filter(r=>r.scenario===scenario&&r.workload===workload);
 assert.equal(rows.length,10);const pairs=[];
 for(let trial=0;trial<5;trial++){
  const before=rows.find(r=>r.version==='before'&&r.trial===trial),after=rows.find(r=>r.version==='current'&&r.trial===trial);assert(before&&after);
  if(record.instrumentationProfile!=='latency-minimal'){
   assert.equal(before.work.validateTemplatePackageV2,after.work.validateTemplatePackageV2);
   assert.equal(before.work.materializeTemplateFieldContentV2,after.work.materializeTemplateFieldContentV2);
  }
  assert.equal(before.acceptances.length,after.acceptances.length);
  assert(after.readiness.exportReady);if(workload==='continuous')assert(after.intermediateDuringTyping>0);
  pairs.push({trial,medianDeltaMs:round(quantile(after.inputHandlerMs,.5)-quantile(before.inputHandlerMs,.5)),p95DeltaMs:round(quantile(after.inputHandlerMs,.95)-quantile(before.inputHandlerMs,.95)),paintOpportunityMedianDeltaMs:round(quantile(after.inputPaintOpportunityMs,.5)-quantile(before.inputPaintOpportunityMs,.5)),previewCatchUpDeltaMs:round(after.previewCatchUpMs-before.previewCatchUpMs)});
 }
 const medianIntervalMs=interval(pairs.map(p=>p.medianDeltaMs)),p95IntervalMs=interval(pairs.map(p=>p.p95DeltaMs));
 cases.push({scenario,workload,pairs,medianIntervalMs,p95IntervalMs,repeatableHandlerIncrease:medianIntervalMs[0]>0||p95IntervalMs[0]>0});
}
record.performanceDecision={method:'Five paired production trials after warm-up; exact enumeration of 5^5 paired bootstrap resamples, percentile 95% intervals for median/p95 handler changes. Positive lower endpoints flag repeatable increases. No latency budget. Input-to-RAF is a paint-opportunity proxy.',predeclaredBeforeFinalProductionTrials:true,cases,repeatableHandlerIncreases:cases.filter(c=>c.repeatableHandlerIncrease).length,limitations:'Finite Chromium/profile/workload coverage; an interval spanning zero is no demonstrated increase, not proof for every host. Development is reported separately.'};
writeFileSync(path,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record.performanceDecision,null,2));
if(record.performanceDecision.repeatableHandlerIncreases)process.exitCode=1;
