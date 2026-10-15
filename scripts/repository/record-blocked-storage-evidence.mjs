/** Read-only certification aggregation; never promotes references or versions. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(), output='docs/architecture/evidence/blocked-storage-20261012';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const identity=await json(`${output}/baseline/identity.json`), previous=await json('docs/architecture/evidence/host-font-authority-20261012/verification.json');
const candidateDirectory='release-verification-artifacts/blocked-storage-after-20261012c', candidate=await json(`${candidateDirectory}/LOCAL-CANDIDATE-MANIFEST.json`);
const sourceFiles=Object.keys(identity.originalSources).filter(file=>file!=='config/sdk-public-api.json').concat('apps/studio/src/workspace/storageFailure.ts');
const sourceSha256=Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,sha(await readFile(file))])));
for(const file of sourceFiles) { const packed=candidate.source.files.find(item=>item.file===file);assert.equal(packed?.sha256,sourceSha256[file],`Candidate runtime identity: ${file}`); }
const testFiles=['packages/template-browser/test/blockedStorage.test.ts','packages/template-browser/test/blockedStoragePins.test.ts','packages/template-browser/test/blockedStorageHost.browser.ts','apps/studio/src/workspace/storageFailure.test.ts','apps/studio/src/workspace/storageFonts.browser.tsx','scripts/run-tests.mjs','scripts/repository/verify-blocked-storage-unit.mjs','scripts/repository/verify-blocked-storage.mjs','scripts/repository/blocked-storage-packed-host.mjs','scripts/repository/verify-studio-blocked-storage.mjs','scripts/repository/verify-studio-storage-fonts.mjs'];
const testSha256=Object.fromEntries(await Promise.all(testFiles.map(async file=>[file,sha(await readFile(file))])));
const protectedChanges=[], protectedSha256={};
for(const [file,expected] of Object.entries(previous.protected.sha256)){protectedSha256[file]=sha(await readFile(file));if(protectedSha256[file]!==expected)protectedChanges.push(file);}
assert.deepEqual(protectedChanges,['config/sdk-public-api.json']);
const beforeApi=await json(`${output}/baseline/config/sdk-public-api.json`), afterApi=await json('config/sdk-public-api.json'), apiChanges=[];
for(const [index,pkg] of beforeApi.packages.entries())for(const [j,entry] of pkg.entries.entries()){
 const next=afterApi.packages[index].entries[j];if(JSON.stringify(entry)!==JSON.stringify(next)){const added=next.symbols.filter(symbol=>!entry.symbols.includes(symbol));const removed=entry.symbols.filter(symbol=>!next.symbols.includes(symbol));assert.deepEqual(added,['TemplateStorageBlockedError']);assert.deepEqual(removed,[]);assert(['.','./persistence'].includes(entry.path));apiChanges.push({package:pkg.name,path:entry.path,added,removed});}
}
assert.equal(apiChanges.length,2);
const oldCandidate=await json('release-verification-artifacts/host-font-after-20261012b/LOCAL-CANDIDATE-MANIFEST.json');
const runtimeChanges=[];let runtimeTotal=0;
for(const item of oldCandidate.source.files.filter(item=>item.file.startsWith('packages/')&&item.file.includes('/src/'))){runtimeTotal++;if(sha(await readFile(item.file))!==item.sha256)runtimeChanges.push(item.file);}
assert.deepEqual(runtimeChanges,['packages/template-browser/src/storage/indexedDb.ts']);
const upgrade=file=>file.slice(file.indexOf('    request.onupgradeneeded'),file.indexOf('    request.onsuccess'));
const original=await readFile(`${output}/baseline/packages/template-browser/src/storage/indexedDb.ts`,'utf8'),current=await readFile('packages/template-browser/src/storage/indexedDb.ts','utf8');
assert.equal(upgrade(original),current.slice(current.indexOf('    request.onupgradeneeded'),current.indexOf('    request.onblocked')));
const logs=[
 ['unit','node scripts/repository/verify-blocked-storage-unit.mjs','r04-unit.log',0],
 ['portable','pnpm test:portable','r04-portable-final.log',0],['typecheck','pnpm exec tsc -b --pretty false','r04-typecheck-final.log',0],
 ['studio-build','pnpm --filter @sleinity/template-studio build','r04-studio-build-final2.log',0],['docs','pnpm docs:verify','r04-docs-final.log',0],
 ['sdk','pnpm sdk:verify','r04-sdk-final.log',0],['pack',`pnpm release-local:verify ${candidateDirectory}`,'r04-pack-final.log',0],
 ['npm-consumer',`node scripts/repository/verify-runtime-release-consumer.mjs --archives ${candidateDirectory}`,'r04-npm-consumer.log',0],
 ['pnpm-consumer',`TEMPLATE_CONSUMER_PACKAGE_MANAGER=pnpm node scripts/repository/verify-runtime-release-consumer.mjs --archives ${candidateDirectory}`,'r04-pnpm-consumer.log',0],
 ['packed-storage-npm',`node scripts/repository/verify-blocked-storage.mjs --archives ${candidateDirectory} --manager npm --output ${output}/runs/packed-npm`,'r04-packed-storage-npm.log',0],
 ['packed-storage-pnpm',`node scripts/repository/verify-blocked-storage.mjs --archives ${candidateDirectory} --manager pnpm --output ${output}/runs/packed-pnpm`,'r04-packed-storage-pnpm.log',0],
 ['studio-retry','node scripts/repository/verify-studio-blocked-storage.mjs','r04-studio-final.log',0],['studio-fonts','node scripts/repository/verify-studio-storage-fonts.mjs','r04-font-ui-final.log',0],
 ['host-font',`node scripts/repository/verify-host-font-authority.mjs --archives ${candidateDirectory} --output ${output}/runs/host-font`,'r04-host-font.log',0],
 ['reactivation','pnpm font:reactivation:verify','r04-reactivation.log',0],['font-evidence','pnpm runtime-routing:fonts','r04-fonts.log',0],['text-trim','pnpm runtime-routing:text-trim','r04-trim.log',0],['routing','pnpm runtime-routing:scenarios','r04-routing.log',0],
 ['setup','pnpm studio:setup','r04-setup.log',0],['drafts','pnpm studio:drafts','r04-drafts.log',0],['fields','pnpm field-rules:studio','r04-fields.log',0],['family','pnpm studio:family-parity','r04-family.log',0],['workflow','pnpm studio:workflow-acceptance','r04-workflow.log',0],
 ['gate','pnpm sdk:gate:061 -- --run-id sdk-061-blocked-storage-20261012c','r04-gate-c.log',1],
 ['incomplete-gate','pnpm sdk:gate:061 -- --run-id sdk-061-blocked-storage-20261012a','r04-gate.log',1],
 ['late-success-reproduction','node scripts/repository/verify-blocked-storage-unit.mjs (before final guard)','r04-late-success-reproduction.log',1],
];
await mkdir(`${output}/logs`,{recursive:true});const commands=[];
for(const [id,command,file,exitCode] of logs){const log=`logs/${file}`;await cp(`/private/tmp/${file}`,`${output}/${log}`);commands.push({id,command,exitCode,log,sha256:sha(await readFile(`${output}/${log}`))});}
const gateId='sdk-061-blocked-storage-20261012c',gate=await json(`fidelity/candidates/${gateId}/sdk-gate.json`),captures=await json(`fidelity/candidates/${gateId}/run.json`);
assert(gate.capturesComplete&&!gate.go);assert(captures.summaries.every(row=>row.completeness.complete&&Object.values(row.repeatability).every(value=>value.stable&&value.repeatCount===2)));
const failing=gate.comparisons.renderer.filter(row=>row.status!=='pass');assert.equal(failing.length,1);assert.equal(failing[0].fixtureId,'exporter-061-carrousel');assert.equal(failing[0].surface,'editor');assert.equal(failing[0].pixel.changedPixelCount,1);
const pixels=await json(`${output}/runs/pixels-vs-r01.json`);assert.equal(pixels.length,24);assert(pixels.every(row=>row.equal));
for(const [file,dest] of [[`fidelity/candidates/${gateId}/sdk-gate.json`,'gate.json'],[`fidelity/candidates/${gateId}/run.json`,'captures.json'],[`fidelity/candidates/${gateId}/environment.json`,'gate-environment.json']])await cp(file,`${output}/runs/${dest}`);
const hosts={npm:await json(`${output}/runs/packed-npm/real-upgrade.json`),pnpm:await json(`${output}/runs/packed-pnpm/real-upgrade.json`)};
for(const host of Object.values(hosts)){assert(host.packed.strictDeclarations);assert.equal(host.requests,2);assert.equal(host.beforeClose.requests,1);assert(host.hosts.every(row=>row.before.opens===1&&row.before.writes===0&&row.after.opens===2));}
const font=await json(`${output}/runs/host-font/verification.json`);assert.equal(font.rows.length,20);assert.deepEqual(font.failures,[]);
const studio=await json(`${output}/runs/studio-retry.json`),fontUI=await json(`${output}/runs/studio-fonts.json`);assert.equal(studio.rows.length,2);assert.equal(fontUI.rows.length,6);assert(studio.rows.every(row=>row.cleanupDownloads===1&&row.unhandledErrors.length===0));
const measurements=Object.fromEntries(Object.entries(hosts).map(([manager,host])=>[manager,{nativeOpenCount:host.requests,blockedEventToAllCallersRejectedMs:host.events.find(row=>row.name==='all-callers-rejected').ms-host.events.find(row=>row.name==='blocked').ms,repeatedBlockedRetries:10,hosts:host.hosts.map(row=>({kind:row.kind,...row.before,after:row.after,blockedEventToAllOperationsSettledMs:row.events.find(event=>event.event==='all-operations-settled').ms-row.events.find(event=>event.event==='blocked').ms}))}]));
const record={schemaVersion:'blocked-storage-verification-v1',createdAt:new Date().toISOString(),disposition:'R04 closed; SDK release NO-GO (unchanged R07)',baseline:identity,sourceSha256,testSha256,candidateDirectory,candidateId:candidate.candidateId,candidateSourceSha256:candidate.source.filesSha256,archives:candidate.archives,published:false,packageVersion:candidate.version,environment:{...candidate.environment,chromium:hosts.npm.chromium,viewport:{width:1440,height:900},deviceScaleFactor:1},commands,measurements,studio,fontUI,hostFont:{rows:font.rows.length,failures:font.failures,environment:font.environment},protected:{runtimeTotal,runtimeChanges,runtimeUnchanged:runtimeTotal-runtimeChanges.length,artifactsUnchanged:Object.keys(protectedSha256).length-1,allowedArtifactChanges:protectedChanges,sha256:protectedSha256,apiChanges,upgradeHandlerUnchanged:true,coreArchiveUnchanged:true,reactArchiveUnchanged:true},gate:{runId:gateId,stableCaptures:24,rendererPass:11,rendererTotal:12,scenePass:3,settlementPass:12,go:false,failure:failing[0],pixelsVsR01:pixels,sourceReview:gate.sourceReview},evidenceClasses:{realIndexedDb:'Isolated older-version Chromium upgrade, kept open until all current callers settle',controlled:'Fake native callbacks, deferred writes, injected Studio storage failures and registry barriers',automatedBrowser:'Single/Family UI Retry, Settings, restore, fonts, navigation, recovery and cleanup-only export',manualLiveReview:false,screenReaderReview:false},limitations:['R07 remains NO-GO; no reference promotion','R01 in-place Family reload and corrupt-font diagnostic settlement remain separately bounded','Node 22/pnpm 11.9.0 release environment not certified here','Post-pack changes are test/evidence metadata only; candidate runtime hashes checked above']};
await writeFile(`${output}/verification.json`,JSON.stringify(record,null,2)+'\n');console.log('R04 source/archive/command evidence recorded; 24 stable captures identical to R01; existing R07 NO-GO.');
