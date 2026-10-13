/** Test-only exact paired bootstrap; no production dependency or latency budget. */
import assert from 'node:assert/strict';
export const quantile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*p)];};
export function pairedMedianInterval(differences){
 assert.equal(differences.length,5,'This recorded workload requires five paired trials');
 assert(differences.every(Number.isFinite));
 const medians=[];
 function enumerate(sample){if(sample.length===differences.length){medians.push(quantile(sample,.5));return;}for(const value of differences)enumerate([...sample,value]);}
 enumerate([]);
 assert.equal(medians.length,differences.length ** differences.length,'Must enumerate every resample');
 return [quantile(medians,.025),quantile(medians,.975)];
}
