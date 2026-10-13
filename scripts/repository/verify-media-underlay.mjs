/** Exact ZIP lifecycle plus retained-source differential evidence; harness only. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {build} from 'vite';
import {PNG} from 'pngjs';
import {runTemplatePackageImportPipelineV2} from '@sleinity/template-browser/importer';
import {createTemplateSessionV2} from '@sleinity/template-browser/session';
import {InMemoryTemplateSessionRepositoryV2} from '@sleinity/template-browser/persistence';
import {loadManifest,verifyFixture,sha256} from '../fidelity/core.mjs';
import {selectSdkGateFixtures} from '../fidelity/gate-profile.mjs';
const dir='fidelity/evidence/media-underlay',baseline=JSON.parse(readFileSync('docs/architecture/evidence/media-underlay-baseline/identity.json'));
const target='packages/template-core/src/resolved/createResolvedRenderTree.ts',retained=baseline.files[target];
assert.equal(sha256(readFileSync(retained.path)),retained.sha256);
mkdirSync(dir,{recursive:true});
const entry=resolve(dir,'resolve-entry.ts');
writeFileSync(entry,`export {createResolvedRenderTree} from ${JSON.stringify(resolve(target))};\n`);
const resolvers={};
try {
 for(const version of ['before','current']) {
  const outDir=resolve(dir,'resolver-'+version);
  await build({configFile:false,logLevel:'error',plugins:version==='before'?[{name:'retained-core-diagnostic-source',enforce:'pre',load(id){if(id.split('?')[0]===resolve(target))return readFileSync(retained.path,'utf8');}}]:[],build:{ssr:entry,outDir,emptyOutDir:true,minify:false,target:'esnext',rollupOptions:{output:{entryFileNames:'entry.mjs'}}}});
  resolvers[version]=(await import(pathToFileURL(resolve(outDir,'entry.mjs')).href)).createResolvedRenderTree;
 }
 const png=new PNG({width:2,height:1});png.data.set([0,0,255,255,0,0,0,0]);
 const replacement='data:image/png;base64,'+PNG.sync.write(png).toString('base64');
 const rows=[],manifest=loadManifest();
 for(const fixture of selectSdkGateFixtures(manifest)) {
  const verified=verifyFixture(manifest,fixture),bytes=readFileSync(verified.path);
  // Node has no IndexedDB. Supply the supported caller-owned store with the
  // exact ZIP bytes, rather than treating an unavailable URL as ready media.
  const assetStorage={async put(hash,binary,mimeType){return{storageKey:hash,stableUrl:`data:${mimeType};base64,${Buffer.from(binary).toString('base64')}`};}};
  const imported=await runTemplatePackageImportPipelineV2({format:'zip',sourceId:fixture.id,sourceName:fixture.filename,buffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),fontRegistry:null,assetStorage});
  const repository=new InMemoryTemplateSessionRepositoryV2(),session=createTemplateSessionV2({repository});
  try {
   assert.equal(imported.status,'ready');session.load(imported.package);
   const snapshot=session.getSnapshot(),pkg=snapshot.rendererPackage;
   assert(pkg);const a=resolvers.before(pkg),b=resolvers.current(pkg);
   const recognized=b.nodeOrder.filter(id=>b.nodes[id].fidelityDiagnostics.some(d=>d.code==='resolved-media-solid-underlay-supported'));
   if(fixture.id==='exporter-061-carrousel')assert.deepEqual(recognized,['987:6823']);
   for(const id of b.nodeOrder) {
    const old=a.nodes[id],next=b.nodes[id];
    if(!recognized.includes(id)){assert.deepEqual(next,old);continue;}
    assert.equal(old.backendDecision.fallback.active,true);assert.equal(next.backendDecision.fallback.active,false);
    assert.equal(next.backendDecision.disposition,'established-compatibility-owner');
    assert.deepEqual(next.backendDecision.owners,old.backendDecision.owners,'No renderer owner changes');
    const withoutDiagnostic=node=>{const copy=structuredClone(node);delete copy.backendDecision;delete copy.fidelityDiagnostics;return copy;};
    assert.deepEqual(withoutDiagnostic(next),withoutDiagnostic(old),'All non-diagnostic resolved evidence remains exactly equal');
    assert.deepEqual(next.fidelityDiagnostics.filter(d=>d.code!=='resolved-media-solid-underlay-supported'),old.fidelityDiagnostics.filter(d=>!d.message.startsWith('Multiple-paint node remains compatibility-owned:')));
   }
   const withoutProjection=tree=>{const copy=structuredClone(tree);for(const key of ['nodes','fidelityDiagnostics','backendDecisionRevision','backendDiagnostics'])delete copy[key];return copy;};
   assert.deepEqual(withoutProjection(b),withoutProjection(a));
   const lifecycle=[];
   for(const field of session.getFieldControllers().filter(c=>c.type==='image')) {
    const definition=snapshot.basePackage.editableFields.find(f=>f.id===field.id),id=definition.binding.nodeId;
    if(!recognized.includes(id))continue;
    assert((await field.replaceImage({dataUrl:replacement,width:2,height:1})).accepted);
    const edited=session.getSnapshot();assert.equal(edited.resolvedTree.nodes[id].backendDecision.fallback.active,false);
    assert.deepEqual(edited.workingPackage.nodes[id].appearance.fills,snapshot.basePackage.nodes[id].appearance.fills);
    const saved=await session.save(),restored=createTemplateSessionV2({repository});
    try{await restored.loadSaved(saved.id);assert.equal(restored.getSnapshot().resolvedTree.nodes[id].backendDecision.fallback.active,false);assert(restored.getFieldControllers().find(c=>c.id===field.id).reset().accepted);const reset=restored.getSnapshot();assert.deepEqual(reset.workingPackage.nodes[id].image,snapshot.basePackage.nodes[id].image);assert.equal(reset.resolvedTree.nodes[id].image.activePlacementState,'imported-source');assert.equal(reset.resolvedTree.nodes[id].backendDecision.fallback.active,false);}finally{restored.dispose();}
    assert(session.getFieldControllers().find(c=>c.id===field.id).reset().accepted);
    lifecycle.push({fieldId:field.id,nodeId:id,replacement:true,saveReload:true,reset:true});
   }
   const timings={};
   for(const version of ['before','current']){for(let i=0;i<10;i++)resolvers[version](pkg);const samples=[];for(let i=0;i<50;i++){const start=performance.now();resolvers[version](pkg);samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);timings[version]={iterations:50,medianMs:samples[24],p95Ms:samples[47]};}
   rows.push({fixtureId:fixture.id,zipSha256:fixture.zipSha256,recognizedNodeIds:recognized,lifecycle,timings});
  }finally{session.dispose();imported.dispose();}
 }
 writeFileSync(dir+'/native.json',JSON.stringify({beforeSource:retained.sha256,currentSource:sha256(readFileSync(target)),rows,performanceLimit:'Resolution microbenchmark only; no typing-latency or universal performance claim.',manualReview:false},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
}finally{rmSync(entry,{force:true});}
