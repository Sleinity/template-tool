/** Final certification is separate from capture and personally recorded inspection. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {timingDisposition} from './timingDisposition.mjs';
const recordPath='docs/architecture/evidence/now-hiring-text-stability-20261010.json';
const read=path=>JSON.parse(readFileSync(path));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const record=read(recordPath),baseline=read('docs/architecture/evidence/now-hiring-text-baseline/identity.json');
assert.equal(record.commands.commands.length,26);
assert(record.commands.commands.every(command=>command.exitCode===0),'Every current certification command must pass');
assert.equal(record.release.commands.length,15);
assert(record.release.commands.every(command=>command.exitCode===0),'Every release workflow must pass');
assert.equal(record.performanceAnalysis.exitCode,record.performanceDecision.repeatableHandlerIncreases ? 1 : 0);
const repeat=spawnSync(process.execPath,['scripts/text-geometry/assess-family-replication.mjs'],{encoding:'utf8'});
assert.equal(repeat.status,0,'Revalidate complete, same-source/environment independent repetition');
assert.equal(hash(record.familyTimingReplication.path),record.familyTimingReplication.sha256);
assert.deepEqual(read('fidelity/evidence/now-hiring-text-final/family-replication/analysis.json'),record.familyTimingReplication.analysis);
assert.deepEqual(timingDisposition(record.performanceDecision,record.familyTimingReplication.analysis),record.performanceDisposition);
for(const mode of ['production','development']){
 assert.equal(record.modes[mode].rows.length,120);
 assert.deepEqual(record.modes[mode].failures,[]);
 for(const[file,expected]of Object.entries(record.modes[mode].sourceHashes))assert.equal(hash(file),expected,file);
}
assert.equal(record.family.rows.length,30);assert.equal(record.normalMotion.rows.length,3);
assert.equal(record.latency.rows.length,120);
for(const[file,value]of Object.entries(record.implementation))assert.equal(hash(file),value.sha256,file);
for(const[file,expected]of Object.entries(baseline.protectedArtifacts.sha256))assert.equal(hash(file),expected,file);
const changed=Object.entries(baseline.runtimeSha256).filter(([file,expected])=>hash(file)!==expected).map(([file])=>file).sort();
assert.deepEqual(changed,['apps/studio/src/styles.css','packages/template-react/src/render/TemplatePackageRenderer.tsx'].sort());
assert(record.gate.renderer.capturesComplete && record.gate.renderer.repeatStable);
assert.equal(record.gate.renderer.comparisons.length,12);
assert(record.gate.renderer.comparisons.every(item=>item.status==='pass'));
assert.equal(record.gate.scene.comparisons.length,3);
assert(record.gate.scene.comparisons.every(item=>item.status==='pass'));
assert.equal(record.gate.settlement.comparisons.length,12);
assert(record.gate.settlement.comparisons.every(item=>item.equal));
const runId=record.gate.runId,gate=read(`fidelity/candidates/${runId}/sdk-gate.json`);
assert.equal(gate.go,true);
const inspection=read(process.argv[2]);
assert.equal(inspection.runId,runId);assert.equal(inspection.kind,'stored-capture-inspection');
assert.equal(inspection.manualLiveReview,false);assert.equal(inspection.surfaces.length,12);
assert.equal(new Set(inspection.surfaces.map(item=>`${item.fixtureId}/${item.surface}`)).size,12);
for(const item of record.gate.retainedSourceReview.surfaces){
 const reviewed=inspection.surfaces.find(x=>x.fixtureId===item.fixtureId && x.surface===item.surface);
 assert(reviewed && reviewed.inspected===true,'Require personally recorded inspection for every surface');
 assert.equal(reviewed.pngSha256,item.pngSha256);
 assert.equal(hash(`fidelity/candidates/${runId}/${item.fixtureId}/${item.surface}/capture-1.png`),item.pngSha256);
}
record.storedCaptureInspection=inspection;record.complete=true;
record.decision='Now Hiring jitter fixed within measured workloads; complete local regression and fidelity gate passes. Timing is qualified: an initial Family flag remains recorded and was not confirmed by independent repetition.';
record.finalizedAt=new Date().toISOString();
record.toolingSha256['scripts/text-geometry/finalize-now-hiring.mjs']=hash('scripts/text-geometry/finalize-now-hiring.mjs');
writeFileSync(recordPath,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({complete:record.complete,runId,protectedArtifactsUnchanged:record.protectedArtifactsUnchanged,manualLiveReview:false}));
