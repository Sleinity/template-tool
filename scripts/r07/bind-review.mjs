/** Retain eleven unchanged source reviews and bind the separately reviewed R07 raster. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { loadManifest, verifyFixture, sha256, stableStringify, surfaces } from '../fidelity/core.mjs';
import { readSdkGateCaptureRun, selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { validateSdkGateDisposition, sdkGateSourceReviewComplete, trackedSdkGateDispositionPath } from '../fidelity/gate-disposition.mjs';
import { validateSdkGateComparisons, validateSdkGateEnvironments } from '../fidelity/gate-evidence.mjs';
import { comparableEnvironment } from './review-contract.mjs';
const runId=process.argv[2];assert(runId && /^[\w-]+$/.test(runId));
const read=p=>JSON.parse(readFileSync(p,'utf8')),base='docs/architecture/evidence/r07-raster-20261013';
const review=read(`${base}/review/decision.json`),baseline=read(`${base}/baseline/identity.json`);
const manifest=loadManifest(),fixtures=selectSdkGateFixtures(manifest);for(const fixture of fixtures)verifyFixture(manifest,fixture);
const current=readSdkGateCaptureRun('fidelity/candidates',runId,fixtures),reviewed=readSdkGateCaptureRun('fidelity/candidates',review.reviewedRun,fixtures);
assert.deepEqual(comparableEnvironment(current.environment),comparableEnvironment(reviewed.environment),'Current raster/font/environment differs from source review');
const previousRun='sdk-061-compact-field-cards-20261012a',previous=readSdkGateCaptureRun('fidelity/candidates',previousRun,fixtures);
const previousPath=`fidelity/gates/archive/sdk-061-dispositions-${previousRun}.json`;
const previousReview=validateSdkGateDisposition(read(previousPath),fixtures,previousRun,sha256(JSON.stringify(previous.environment)));assert(sdkGateSourceReviewComplete(previousReview));
assert.deepEqual(comparableEnvironment(current.environment),comparableEnvironment(previous.environment),'Retained review environment');
const renderer=read(`fidelity/candidates/${runId}/comparison.json`),scene=read(`fidelity/scene-graph/candidates/${runId}/comparison.json`),settlement=read(`fidelity/settlement/candidates/${runId}/reference-comparison.json`);
validateSdkGateComparisons({runId,fixtures,renderer,scene,settlement});
validateSdkGateEnvironments({fidelity:current.environment,scene:read(`fidelity/scene-graph/candidates/${runId}/environment.json`),settlement:read(`fidelity/settlement/candidates/${runId}/environment.json`)});
assert(renderer.capturesComplete && renderer.repeatStable && renderer.comparisons.every(c=>c.status==='pass'));
assert(scene.comparisons.every(c=>c.status==='pass') && settlement.comparisons.every(c=>c.equal));
for(const [p,h]of Object.entries({...baseline.r04SourcesVerified,...baseline.sources}).filter(([p])=>p.startsWith('apps/') || p.startsWith('packages/')))assert.equal(sha256(readFileSync(p)),h,`Production source ${p}`);
const permitted=new Set(['fidelity/references/approved/exporter-061-carrousel/editor/reference.png','fidelity/references/approved/exporter-061-carrousel/editor/structure.json']);
for(const [p,h]of Object.entries(baseline.protected))if(!permitted.has(p))assert.equal(sha256(readFileSync(p)),h,`Protected reference/API/budget ${p}`);
assert.equal(sha256(readFileSync('fidelity/references/approved/exporter-061-carrousel/editor/reference.png')),review.afterSha256);
const r04=read('docs/architecture/evidence/blocked-storage-20261012/verification.json');for(const a of r04.archives)assert.equal(sha256(readFileSync(`release-verification-artifacts/r07-20261013/${a.file}`)),a.sha256,'Unchanged SDK archive');
const next=structuredClone(previousReview),evidence=[];
next.runId=runId;next.environmentSha256=sha256(JSON.stringify(current.environment));
for(const fixture of next.fixtures){
 const camera=read(`fidelity/candidates/${runId}/${fixture.id}/workflow/capture-camera.json`);
 assert.equal(camera.profile,review.camera);assert.equal(camera.nativeBefore.zoomLabel,'40%');assert.equal(camera.nativeBefore.mode,'manual');
 assert.deepEqual(camera.after,{x:485,y:107,width:906,height:1444});assert.equal(camera.nativeMutation,false);
 for(const surface of surfaces){
  const png=sha256(readFileSync(`fidelity/candidates/${runId}/${fixture.id}/${surface}/capture-1.png`));
  assert.equal(png,sha256(readFileSync(`fidelity/candidates/${runId}/${fixture.id}/${surface}/capture-2.png`)));
  const changed=fixture.id===review.fixtureId && surface===review.surface;
  if(changed)assert.equal(png,review.afterSha256,'New raster needs a new review');
  else assert.equal(png,fixture.surfaces[surface].candidatePngSha256,`${fixture.id}/${surface}: cannot retain review for changed raster`);
  const entry=fixture.surfaces[surface];entry.candidatePngSha256=png;entry.capture='complete-stable';entry.comparison='pass';entry.sourceReview='reviewed-source-faithful';
  entry.evidence=`fidelity/candidates/${runId}/${fixture.id}/${surface}`;entry.priorSourceReview=changed?`${base}/review/decision.json`:previousPath;entry.reviewRetainedFrom=changed?review.reviewedRun:previousRun;
  entry.cause=changed?review.cause:entry.cause;
  entry.reviewerRationale=changed?`${review.sourceReason} Stored-source/capture inspection; guarded Carrousel/editor promotion only. Recaptured output matches the reviewed candidate exactly.`:`Retained individual source review from ${previousRun} after exact source/font/environment and byte-identical raster checks. Current source-authoritative capture, renderer, scene and settlement checks pass; R01/R04 archives and all unrelated references remain unchanged. Prior rationale: ${entry.reviewerRationale}`;
  entry.regenerate=`pnpm sdk:gate:061 -- --run-id <new-unique-run-id>`;
  const settled=fixture.settlement[surface];settled.priorSourceReview=previousPath;settled.reviewRetainedFrom=previousRun;settled.comparison='pass';settled.reviewerRationale=`Current ${runId} settlement compares equal to unchanged approved snapshots. Prior source review retained after exact fixture/font/environment checks. ${settled.reviewerRationale}`;
  evidence.push({fixtureId:fixture.id,surface,sha256:png,reviewRetainedFrom:entry.reviewRetainedFrom,separateSourceReview:changed});
 }
 fixture.scene.priorSourceReview=previousPath;fixture.scene.reviewRetainedFrom=previousRun;fixture.scene.comparison='pass';fixture.scene.reviewerRationale=`Current ${runId} scene compares equal to unchanged approved snapshots; exact source identity verified. ${fixture.scene.reviewerRationale}`;
}
validateSdkGateDisposition(next,fixtures,runId,next.environmentSha256);assert(sdkGateSourceReviewComplete(next));
const old=read(trackedSdkGateDispositionPath),archive=`fidelity/gates/archive/sdk-061-dispositions-${old.runId}.json`;mkdirSync('fidelity/gates/archive',{recursive:true});if(!existsSync(archive))writeFileSync(archive,stableStringify(old));
writeFileSync(trackedSdkGateDispositionPath,stableStringify(next));
writeFileSync(`${base}/final-review-binding.json`,JSON.stringify({runId,reviewedRun:review.reviewedRun,retainedReview:previousPath,evidence,manualLiveReview:false,storedSourceInspection:true,referencePromotion:'Carrousel/editor only'},null,2)+'\n');
console.log(`Bound ${runId}: 11 byte-identical retained reviews and one independently reviewed viewport raster.`);
