/** Current-generation samples must not be cleared by a later parent effect. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePacket} from './packets.mjs';
const path=process.argv[2],historical=process.argv.includes('--expect-erasure');
const packet=decodePacket(JSON.parse(readFileSync(path))),results=[];
assert.equal(packet.failures.length,0);
for(const row of packet.rows.filter(r=>r.version==='current')) {
 const events=row.measurementEvents,clears=events.filter(e=>e.kind==='runtime-clear');
 const erasures=clears.filter(clear=>events.some(e=>e.kind==='runtime-publication'&&e.generation===clear.generation&&e.at<clear.at));
 assert(clears.length>0,'Must exercise publication turnover');
 if(historical)assert(erasures.length>0,'Retained pre-ordering source must demonstrate erasure');
 else assert.equal(erasures.length,0,'Current publication must follow generation clearing');
 results.push({scenario:row.scenario,trial:row.trial,workload:row.workload,clears:clears.length,erasures:erasures.length});
}
assert(results.length);console.log(JSON.stringify({path,historical,results},null,2));
