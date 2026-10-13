/** Failure-first transient check; no pixels, references, or production thresholds. */
import assert from 'node:assert/strict';
import { decodePacket } from './packets.mjs';
import { assertWorkloadCoverage } from './workloadCoverage.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const path=process.argv[2], expected=process.argv.includes('--expect-jitter');
const record=decodePacket(JSON.parse(readFileSync(path))),rows=record.rows.filter(r=>['exporter-061-carrousel','family'].includes(r.scenario)&&r.trace.frames.some(f=>f.nodes['987:6835'])&&(!process.argv.includes('--current-only')||r.version==='current'));
assert.equal(record.failures.length,0);assert(rows.length>0);
assertWorkloadCoverage(record);
const results=rows.map(r=>{
 const frames=r.trace.frames.filter(f=>f.nodes['987:6835']);assert(frames.length);
 const geometries=[...new Set(frames.map(f=>JSON.stringify(f.nodes['987:6835'])))];
 const texts=[...new Set(frames.map(f=>f.nodeEvidence['987:6835'].text))];assert.equal(texts.length,1,'Date content must be unchanged');
 if(expected)assert(geometries.length>1,'Historical reproduction must demonstrate loss of unchanged geometry');
 else assert.equal(geometries.length,1,`${r.scenario}/${r.trial}/${r.workload}: dependency-valid Date must not jitter`);
 return {scenario:r.scenario,trial:r.trial,version:r.version,workload:r.workload,geometries,unchangedText:texts[0],measurementCallbacks:r.state.work.textMeasurementCallbacks};
});
console.log(JSON.stringify({path,expectedHistoricalJitter:expected,results},null,2));
