import assert from 'node:assert/strict';
/** A partial or duplicated browser run never counts as a completed workload. */
export function assertWorkloadCoverage(record) {
 const scenarios=record.selectedScenarios??[...new Set(record.rows.map(row=>row.scenario))];
 const versions=record.phase==='paired'?['before','current']:[record.phase];
 assert(scenarios.length>0 && new Set(scenarios).size===scenarios.length);
 assert(Number.isInteger(record.trials)&&record.trials>0);
 const expected=new Set();
 for(const scenario of scenarios)for(let trial=0;trial<record.trials;trial++)for(const version of versions)for(const workload of ['burst','continuous','multiline'])expected.add(JSON.stringify([scenario,trial,version,workload]));
 assert.equal(record.rows.length,expected.size,'Every selected workload/trial must complete');
 for(const row of record.rows)assert(expected.delete(JSON.stringify([row.scenario,row.trial,row.version,row.workload])),'Missing, duplicate or unexpected workload row');
 assert.equal(expected.size,0,'Incomplete browser workload');
}
