import assert from 'node:assert/strict';
import {assertWorkloadCoverage} from './workloadCoverage.mjs';
const record={selectedScenarios:['fixture'],phase:'paired',trials:1,rows:['before','current'].flatMap(version=>['burst','continuous','multiline'].map(workload=>({scenario:'fixture',trial:0,version,workload})))};
assertWorkloadCoverage(record);
assert.throws(()=>assertWorkloadCoverage({...record,rows:record.rows.slice(1)}));
assert.throws(()=>assertWorkloadCoverage({...record,rows:[record.rows[0],...record.rows.slice(0,-1)]}));
assert.throws(()=>assertWorkloadCoverage({...record,selectedScenarios:['fixture','missing']}));
assert.throws(()=>assertWorkloadCoverage({...record,rows:record.rows.map(row=>({...row,trial:1}))}));
console.log('Partial, duplicated and cross-trial browser workloads fail closed.');
