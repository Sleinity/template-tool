/** Bind final delivery evidence to unchanged production, contracts and supplied archives. */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {verifyDeliveryBundle,sha256} from './bundle.mjs';
const base='docs/architecture/evidence/release-delivery-20261013';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const baseline=await read(`${base}/baseline/identity.json`);
for(const f of baseline.production)assert.equal(sha256(await readFile(f.file)),f.sha256,f.file);
for(const[p,h]of Object.entries(baseline.protected))assert.equal(sha256(await readFile(p)),h,p);
for(const f of baseline.packageManifests)assert.equal(sha256(await readFile(f.file)),f.sha256,f.file);
assert.equal(sha256(await readFile('pnpm-lock.yaml')),baseline.lockfileSha256);
const historical=Object.entries(baseline.sources).filter(([p])=>/^docs\/sdk\/SDK_(?:0|0_).*MIGRATION\.md$/.test(p));
for(const[p,h]of historical)assert.equal(sha256(await readFile(p)),h,p);
const paths={local:'release-verification-artifacts/release-delivery-20261013a',publication:'release-verification-artifacts/release-delivery-publication-simulation-20261013a'};
const bundles={};for(const[label,p]of Object.entries(paths)){const v=await verifyDeliveryBundle(p);bundles[label]={path:p,manifestSha256:v.manifestSha256,mode:v.manifest.mode,provenance:v.manifest.provenance,archives:v.manifest.archives,files:v.manifest.files,uploadFiles:v.manifest.uploadFiles,localLinks:v.links.filter(r=>r.kind==='local-verified').length,externalUnchecked:v.links.filter(r=>r.kind==='external-unchecked').length};for(const a of baseline.archives)assert.equal(v.manifest.archives.find(r=>r.file===a.file).sha256,a.sha256);}
const checks=[];for(const file of await readdir(`${base}/checks`)){if(!file.endsWith('.json'))continue;for(const r of await read(`${base}/checks/${file}`)){assert.equal(r.exitCode,0,r.label);assert.equal(sha256(await readFile(r.log)),r.logSha256,r.label);checks.push(r);}}
const gate=await read('fidelity/candidates/sdk-061-release-delivery-20261013a/sdk-gate.json');assert.equal(gate.go,true);assert.equal(gate.capturesComplete,true);
const staging=await read(`${base}/staging.json`);assert.equal(staging.status,'pass');assert.equal(staging.releases.length,3);for(const r of staging.releases){assert.equal(r.type,'major');assert.equal(r.newVersion,'1.0.0');}
const acceptance=await read(`${base}/acceptance/report.json`);assert.equal(acceptance.status,'pass');for(const r of acceptance.rows)assert.equal(r.exitCode,r.expectedExitCode);
const examples={};for(const manager of['npm','pnpm']){const r=await read(`${base}/example-${manager}/report.json`);assert.equal(r.status,'pass');assert.equal(r.deliveredCopies,true);assert.equal(r.rows.length,24);examples[manager]=r;}
const simulation=await read(`${paths.publication}/PUBLICATION-PATH-SIMULATION.json`);assert.equal(simulation.status,'pass');for(const key of['uploaded','published','tagged'])assert.equal(simulation[key],false);
const files=[...execFileSync('rg',['--files','scripts/release-delivery'],{encoding:'utf8'}).trim().split('\n'),'config/sdk-delivery-inventory.json',...Object.keys(baseline.sources).filter(p=>!p.startsWith('.changeset/')||['.changeset/template-recovery-lifecycle.md','.changeset/typed-field-contracts-v2.md'].includes(p)),'docs/sdk/HOST_LIFECYCLE.md','docs/sdk/OPERATION_OUTCOMES.md','docs/sdk/SDK_1_0_MIGRATION.md','scripts/example-lifecycle/verify.mjs','docs/architecture/release-delivery.md','docs/architecture/sdk-release-readiness.md'];
const implementation=await Promise.all([...new Set(files)].sort().map(async file=>({file,sha256:sha256(await readFile(file))})));
const report={status:'pass',disposition:{R05:'closed',R06:'prepared; open for version application, release certification and publication'},baselineGate:baseline.baselineGate,runId:gate.runId,productionUnchanged:baseline.production.length,protectedUnchanged:Object.keys(baseline.protected).length,packageManifestsUnchanged:true,lockfileUnchanged:true,historicalMigrationSourcesUnchanged:historical.map(([p])=>p),implementation,bundles,staging,acceptance,examples,simulation,checks,gate,reviewBinding:await read(`${base}/review-binding.json`),wrappers:await read(`${base}/wrappers.json`),coverage:{automatedBrowser:true,actualInstalledArchives:true,manualLiveReview:false,registryRoundTrip:false,published:false,linuxCi:false},limitations:['External URLs explicitly classified, not fetched.','Publication preparation/upload inventory simulated; no registry download, upload, tag or publication.','macOS local browser/toolchain evidence; Linux CI remains unexecuted here.','Existing reviewed raster evidence retained only after exact sources, environment, camera and PNG hashes match; no new manual source-design review.']};
await writeFile(`${base}/verification.json`,JSON.stringify(report,null,2)+'\n');console.log(`R05 closed; R06 staged. ${checks.length} passing recorded checks; ${bundles.local.localLinks}/${bundles.publication.localLinks} local bundle links verified; gate GO.`);
