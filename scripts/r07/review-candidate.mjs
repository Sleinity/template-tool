/** Validate the documented source review before the explicitly authorized update. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { assertR07ReviewIdentity } from './review-contract.mjs';
import { loadManifest, verifyFixture, sha256 } from '../fidelity/core.mjs';
import { readSdkGateCaptureRun, selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { loadExactFontManifest } from '../fidelity/fonts.mjs';
const base='docs/architecture/evidence/r07-raster-20261013';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const review=read(`${base}/review/decision.json`),baseline=read(`${base}/baseline/identity.json`);
const manifest=loadManifest(),fixtures=selectSdkGateFixtures(manifest);
for(const f of fixtures)verifyFixture(manifest,f);
const font=loadExactFontManifest(fixtures.flatMap(f=>f.requiredFonts??[])).fonts.find(f=>f.id==='rethink-sans-600-normal');
const current=readSdkGateCaptureRun('fidelity/candidates',review.reviewedRun,fixtures);
const dir=`fidelity/candidates/${review.reviewedRun}/${review.fixtureId}/${review.surface}`;
const fixture=fixtures.find(f=>f.id===review.fixtureId);
assertR07ReviewIdentity(review,{
 candidateSha256:sha256(readFileSync(`${dir}/capture-1.png`)),
 repeatHashes:readdirSync(dir).filter(p=>/^capture-\d+\.png$/.test(p)).map(p=>sha256(readFileSync(`${dir}/${p}`))),
 beforeSha256:sha256(readFileSync(`fidelity/references/approved/${review.fixtureId}/${review.surface}/reference.png`)),
 environmentSha256:sha256(JSON.stringify(current.environment)),camera:'studio-reference-20261012',
 source:{zipSha256:fixture.zipSha256,templateJsonSha256:fixture.templateJsonSha256,previewSha256:fixture.embeddedPreview.sha256,
 assetSha256:sha256(readFileSync(`${base}/source/photo.png`)),assetDimensions:{width:1125,height:750},sourceEvidenceSha256:sha256(readFileSync(`${base}/source/source.json`)),fontBinarySha256:font.verifiedSha256},
});
for(const [p,h]of Object.entries({...baseline.r04SourcesVerified,...baseline.protected}))assert.equal(sha256(readFileSync(p)),h,`Protected source/reference ${p}`);
for(const [p,h]of Object.entries(baseline.sources).filter(([p])=>p.startsWith('apps/')))assert.equal(sha256(readFileSync(p)),h,`Studio source ${p}`);
const r04=read('docs/architecture/evidence/blocked-storage-20261012/verification.json');
for(const archive of r04.archives)assert.equal(sha256(readFileSync(`release-verification-artifacts/r07-20261013/${archive.file}`)),archive.sha256,'SDK archive must remain unchanged');
const experiments=read(`${base}/review/experiments.json`);
assert.equal(experiments.find(e=>e.run==='r07-initial-fit-20261013').sha256,review.beforeSha256);
assert.equal(experiments.find(e=>e.run==='r07-reviewed-40-20261013').sha256,review.afterSha256);
assert(read(`${base}/review/unrounded-equality.json`).completeTraceEqual);
console.log('Exact source/font/candidate/environment, reversible causal experiments, unchanged Studio/SDK archives and protected references verified.');
if(process.argv.includes('--promote')){
 const args=['fidelity:update','--','--run-id',review.reviewedRun,'--fixture',review.fixtureId,'--surface',review.surface,'--reason',review.reason,'--evidence-output',`${base}/promotion`];
 const start=new Date().toISOString();const result=spawnSync('pnpm',args,{encoding:'utf8',env:process.env});
 writeFileSync(`${base}/promotion-command.json`,JSON.stringify({command:['pnpm',...args],started:start,exitCode:result.status,stdout:result.stdout,stderr:result.stderr},null,2)+'\n');
 process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');assert.equal(result.status,0);
}
