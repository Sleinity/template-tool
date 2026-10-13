/** Retain existing source review only after exact identity and output checks. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadManifest, repoRoot, sha256, stableStringify, surfaces, verifyFixture } from './core.mjs';
import { readSdkGateCaptureRun, selectSdkGateFixtures } from './gate-profile.mjs';
import { readSdkGateDisposition, sdkGateSourceReviewComplete, trackedSdkGateDispositionPath, validateSdkGateDisposition } from './gate-disposition.mjs';
import { validateSdkGateComparisons, validateSdkGateEnvironments } from './gate-evidence.mjs';
import { loadExactFontManifest } from './fonts.mjs';
const runId=process.argv[2];assert(runId&&/^[a-zA-Z0-9_-]+$/.test(runId));
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const identity=read(join(repoRoot,'docs/studio/evidence/product-experience-20261012/identity.json')),beforeRun=identity.startingGate;
assert.notEqual(runId,beforeRun);
const manifest=loadManifest(),fixtures=selectSdkGateFixtures(manifest);for(const fixture of fixtures)verifyFixture(manifest,fixture);loadExactFontManifest(fixtures.flatMap(f=>f.requiredFonts??[]));
for(const [file,entry] of Object.entries(identity.files))assert.equal(sha256(readFileSync(join(repoRoot,entry.path))),entry.sha256,`Retained source ${file}`);
for(const [file,expected] of Object.entries({...identity.runtimeSha256,...identity.protectedArtifacts.sha256}))assert.equal(sha256(readFileSync(join(repoRoot,file))),expected,`Protected SDK/reference ${file}`);
const root=join(repoRoot,'fidelity/candidates'),current=readSdkGateCaptureRun(root,runId,fixtures),previous=readSdkGateCaptureRun(root,beforeRun,fixtures);
const archive=`fidelity/gates/archive/sdk-061-dispositions-${beforeRun}.json`;
const previousReview=existsSync(join(repoRoot,archive))?validateSdkGateDisposition(read(join(repoRoot,archive)),fixtures,beforeRun,sha256(JSON.stringify(previous.environment))):readSdkGateDisposition(fixtures,beforeRun,previous.environment);assert(sdkGateSourceReviewComplete(previousReview));
const comparable=value=>{const copy=structuredClone(value);delete copy.testTimestamp;delete copy.approximateProcessMemoryBytes;for(const row of copy.fontDecisions??[])delete row.uploadAndLinkMs;return copy;};
assert.deepEqual(comparable(current.environment),comparable(previous.environment),'Raster/source/font/tooling environment');
const renderer=read(join(root,runId,'comparison.json')),scene=read(join(repoRoot,'fidelity/scene-graph/candidates',runId,'comparison.json')),settlement=read(join(repoRoot,'fidelity/settlement/candidates',runId,'reference-comparison.json'));
validateSdkGateComparisons({runId,fixtures,renderer,scene,settlement});validateSdkGateEnvironments({fidelity:current.environment,scene:read(join(repoRoot,'fidelity/scene-graph/candidates',runId,'environment.json')),settlement:read(join(repoRoot,'fidelity/settlement/candidates',runId,'environment.json'))});
assert(renderer.capturesComplete&&renderer.repeatStable);assert(renderer.comparisons.every(row=>row.status==='pass'));assert(scene.comparisons.every(row=>row.status==='pass'));assert(settlement.comparisons.every(row=>row.equal));
const evidence=[],changedReview=read(join(repoRoot,'docs/studio/evidence/product-experience-20261012/changed-surface-review.json'));
assert.equal(changedReview.runId,runId,'Changed review must be bound to this run');
for(const fixture of fixtures)for(const surface of surfaces){const bytes=readFileSync(join(root,runId,fixture.id,surface,'capture-1.png')),old=readFileSync(join(root,beforeRun,fixture.id,surface,'capture-1.png'));assert.equal(sha256(old),previousReview.fixtures.find(row=>row.id===fixture.id).surfaces[surface].candidatePngSha256);
 const changed=sha256(bytes)!==sha256(old);
 if(changed){const review=changedReview.surfaces.find(row=>row.fixtureId===fixture.id&&row.surface===surface);assert(review?.sourceReview==='reviewed-source-faithful',`${fixture.id}/${surface}: changed output requires separate source review`);assert.equal(review.beforeSha256,sha256(old));assert.equal(review.afterSha256,sha256(bytes));assert.equal(sha256(readFileSync(join(root,runId,fixture.id,surface,'capture-2.png'))),review.afterSha256);assert.deepEqual(read(join(root,runId,fixture.id,surface,'structure-1.json')).nodes,read(join(root,beforeRun,fixture.id,surface,'structure-1.json')).nodes,'Reviewed raster change must preserve complete measured node inputs and geometry');}
 evidence.push({fixtureId:fixture.id,surface,sha256:sha256(bytes),changed});}
mkdirSync(join(repoRoot,'fidelity/gates/archive'),{recursive:true});if(!existsSync(join(repoRoot,archive)))writeFileSync(join(repoRoot,archive),stableStringify(previousReview));
const next=structuredClone(previousReview);next.runId=runId;next.environmentSha256=sha256(JSON.stringify(current.environment));
const reason=`Retained for ${runId}: Studio presentation only, all ${Object.keys(identity.runtimeSha256).length} SDK source hashes and ${Object.keys(identity.protectedArtifacts.sha256).length} protected artifacts unchanged, exact fixtures/fonts and raster environment matched, ${evidence.filter(row=>!row.changed).length} byte-identical reviewed captures plus ${evidence.filter(row=>row.changed).length} separately hash-bound stored-capture source review, and passing unchanged renderer/scene/settlement comparisons. No manual live or reference promotion claim.`;
for(const fixture of next.fixtures){for(const surface of surfaces)for(const item of [fixture.surfaces[surface],fixture.settlement[surface]]){item.priorSourceReview=archive;item.reviewRetainedFrom=beforeRun;item.reviewerRationale+=` ${reason}`;item.regenerate=item.regenerate.replaceAll(beforeRun,runId);if(item===fixture.surfaces[surface]){item.candidatePngSha256=evidence.find(row=>row.fixtureId===fixture.id&&row.surface===surface).sha256;const review=changedReview.surfaces.find(row=>row.fixtureId===fixture.id&&row.surface===surface);if(review){item.cause=review.cause;item.reviewerRationale+=` ${review.rationale}`;item.evidence=`fidelity/candidates/${runId}/${fixture.id}/${surface}`;}}}fixture.scene.priorSourceReview=archive;fixture.scene.reviewRetainedFrom=beforeRun;fixture.scene.reviewerRationale+=` ${reason}`;}
writeFileSync(trackedSdkGateDispositionPath,stableStringify(next));writeFileSync(join(root,runId,'retained-source-review.json'),stableStringify({runId,beforeRun,evidence,reason,referencePromotion:false,manualLiveReview:false}));console.log(reason);
