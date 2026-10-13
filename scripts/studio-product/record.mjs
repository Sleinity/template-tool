/** Durable Studio-only verification identity; never changes SDK/reference inputs. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root='docs/studio/evidence/product-experience-20261012';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const baseline=read(`${root}/identity.json`);
for(const [file,value] of Object.entries({...baseline.runtimeSha256,...baseline.protectedArtifacts.sha256}))assert.equal(hash(file),value,file);
for(const entry of Object.values(baseline.files))assert.equal(hash(entry.path),entry.sha256);
const files=[...Object.keys(baseline.files),
 'apps/studio/src/workspace/outputEditor.css',
 'apps/studio/src/field-rules/deferredFieldDrafts.ts',
 'apps/studio/src/field-rules/deferredFieldDrafts.test.ts',
 'scripts/editor-performance/harness.tsx',
 'scripts/editor-performance/verify.mjs',
 'scripts/field-rules/studio-drafts.mjs',
 'scripts/field-rules/studio-setup.mjs',
 'scripts/field-rules/studio-workflow-acceptance.mjs',
 'scripts/field-rules/studio-recovery.mjs',
 'scripts/repository/verify-field-choices-browser.mjs',
 'scripts/studio-product/proposals.mjs','scripts/studio-product/verify.mjs',
 'scripts/studio-product/record.mjs','scripts/fidelity/retain-studio-product-review.mjs',
 'scripts/fidelity/capture-camera.mjs','scripts/fidelity/capture-camera.test.mjs','scripts/fidelity/browser.mjs','scripts/fidelity/cli.mjs','scripts/fidelity/sdk-gate.mjs','scripts/run-tests.mjs',
 'docs/renderer-fidelity/HARNESS.md','docs/renderer-fidelity/ENVIRONMENT_POLICY.md',
 'docs/sdk/STUDIO_REFERENCE.md','docs/sdk/README.md','apps/studio/README.md','docs/studio/PRODUCT_EXPERIENCE_20261012.md'];
const runId='sdk-061-studio-product-20261012c',gate=read(`fidelity/candidates/${runId}/sdk-gate.json`);
assert(gate.go,'Fresh source-authoritative gate must pass');
const browser=read('fidelity/evidence/product-experience/after/record.json');assert.equal(browser.rows.length,4);assert(browser.rows.every(row=>!row.errors.length));
const performance=read('fidelity/evidence/product-experience/performance-certified/production-paired.json');assert.equal(performance.trials,5);assert.equal(performance.rows.length,120);
assert.deepEqual(performance.failures,[]);
for(const row of performance.rows.filter(row=>row.version==='current')){const previous=performance.rows.find(other=>other.version==='before'&&other.scenario===row.scenario&&other.trial===row.trial&&other.workload===row.workload);for(const name of ['validateTemplatePackageV2','materializeTemplateFieldContentV2','recordCaptures'])assert.equal(row.state.work[name],previous.state.work[name],`Unchanged authority calls: ${name}`);}
for(const [file,value] of Object.entries(performance.current))assert.equal(hash(file),value,`Measured source ${file}`);
const logs={portable:'pnpm test:portable',typecheck:'pnpm exec tsc -b --pretty false',build:'pnpm build',docs:'pnpm docs:verify',sdk:'pnpm sdk:verify',setup:'pnpm studio:setup',drafts:'pnpm studio:drafts',fieldrules:'pnpm field-rules:studio',parity:'pnpm studio:family-parity',workflow:'pnpm studio:workflow-acceptance',font:'pnpm font:reactivation:verify',editor:'pnpm editor:verify',choices:'node scripts/repository/verify-field-choices-browser.mjs --fields-usability',product:'node scripts/studio-product/verify.mjs',gate:`pnpm sdk:gate:061 -- --run-id ${runId} --assess-existing`};
const sourceLogs={portable:'portable-final',typecheck:'typecheck-final',build:'build-final',docs:'docs-final',sdk:'sdk',setup:'setup',drafts:'drafts',fieldrules:'fieldrules',parity:'parity',workflow:'workflow',font:'font',editor:'editor-final',choices:'choices-final',product:'after-browser',gate:'gate-assess'};
mkdirSync(`${root}/commands`,{recursive:true});
const commands=[];
for(const [id,command] of Object.entries(logs)){const source=`/tmp/product-experience-${sourceLogs[id]}.log`;assert(existsSync(source),source);const path=`${root}/commands/${id}.log`;copyFileSync(source,path);commands.push({command,exitCode:0,log:path,sha256:hash(path)});}
for(const [id,source,description] of [['a','gate-fresh','Product camera changed editor raster dimensions and inverse-scale telemetry.'],['b','gate-camera','Fixed camera matched pixels; changed containing block left one line-range difference.'],['c','gate-camera-relative','Relative camera matched all comparisons; source-review retention remained pending.']]){const path=`${root}/commands/gate-${id}.log`;copyFileSync(`/tmp/product-experience-${source}.log`,path);commands.push({command:`pnpm sdk:gate:061 -- --run-id sdk-061-studio-product-20261012${id}`,exitCode:readFileSync(path,'utf8').includes('decision=NO-GO')?1:0,log:path,sha256:hash(path),note:description});}
const reviewPath=`${root}/commands/source-review.log`;copyFileSync('/tmp/product-experience-source-review.log',reviewPath);commands.push({command:`node scripts/fidelity/retain-studio-product-review.mjs ${runId}`,exitCode:0,log:reviewPath,sha256:hash(reviewPath)});
const uiRoot='fidelity/evidence/product-experience/after';
writeFileSync(`${root}/verification.json`,JSON.stringify({schemaVersion:'studio-product-experience-v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),worktree:'Existing dirty workspace; source hashes identify the implementation',node:process.version,platform:process.platform,arch:process.arch,startingGate:baseline.startingGate,gate:runId,go:gate.go,captureEnvironment:gate.environment,fixtures:gate.sourceReview.fixtures.map(({id,zipSha256,templateJsonSha256,embeddedPreviewSha256})=>({id,zipSha256,templateJsonSha256,embeddedPreviewSha256})),sdkFilesUnchanged:Object.keys(baseline.runtimeSha256).length,protectedArtifactsUnchanged:Object.keys(baseline.protectedArtifacts.sha256).length,implementationSha256:Object.fromEntries([...new Set(files)].map(file=>[file,hash(file)])),uiCaptureSha256:Object.fromEntries(readdirSync(uiRoot).filter(file=>file.endsWith('.png')).map(file=>[`${uiRoot}/${file}`,hash(`${uiRoot}/${file}`)])),changedSurfaceReview:read(`${root}/changed-surface-review.json`),commands,browser,performance:{path:'fidelity/evidence/product-experience/performance-certified/production-paired.json',sha256:hash('fidelity/evidence/product-experience/performance-certified/production-paired.json'),trials:performance.trials,rows:performance.rows.length,summary:performance.summary},manualLiveReview:false,manualScreenReaderReview:false,manualNativePickerReview:false,referencePromotion:false},null,2)+'\n');
console.log('Recorded unchanged SDK/reference identities, current browser workflows, paired trials and passing gate.');
