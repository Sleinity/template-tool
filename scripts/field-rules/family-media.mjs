import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchBrowser } from '../fidelity/browser.mjs';
import { createStudioViteServer } from '../repository/studio-vite-server.mjs';
const root = process.cwd();
const out = resolve(root, 'fidelity/evidence/studio-family-media');
await mkdir(out, { recursive: true });
const fixture = JSON.parse(await readFile(resolve(root, 'src/template-package/fixtures/figma-plugin-v0.4.1.json'), 'utf8'));
const server = await createStudioViteServer(); await server.listen();
const browser = await launchBrowser(false);
try {
 const page = await browser.newPage(); await page.goto(server.resolvedUrls.local[0]);
 const result = await page.evaluate(async ({ fixture, root }) => {
  const { normalizeTemplatePackageV1ToV2 } = await import(`/@fs${root}/packages/template-core/src/index.ts`);
  const { createTemplateFieldFamilySessionV2, createTemplateFieldFamilyFieldV2 } = await import(`/@fs${root}/packages/template-browser/src/session/templateFieldFamilySessionV2.ts`);
  const { InMemoryTemplateSessionRepositoryV2, createInMemoryTemplateSessionRepositoryV2Storage } = await import(`/@fs${root}/packages/template-browser/src/persistence/v2SessionRepositories.ts`);
  const pkg = normalizeTemplatePackageV1ToV2(fixture).package;
  // Media-only synthetic probe: font acceptance remains covered by Studio workflows.
  pkg.fontRequirements = [];
  const textIds = new Set(Object.values(pkg.nodes).filter(node => node.type === 'TEXT' || node.text).map(node => node.id));
  for (const id of textIds) delete pkg.nodes[id];
  for (const node of Object.values(pkg.nodes)) if (node.children) node.children = node.children.filter(id => !textIds.has(id));
  pkg.editableFields = pkg.editableFields.filter(field => !textIds.has(field.binding.nodeId));
  pkg.editableFieldOrder = pkg.editableFieldOrder.filter(id => pkg.editableFields.some(field => field.id === id));
  const family = { schemaVersion:'template-field-family-v2', id:'media-proof', title:'Media proof', fields:pkg.editableFields.map(createTemplateFieldFamilyFieldV2), editableFieldOrder:pkg.editableFieldOrder, variants:[{id:'a',packageValue:pkg},{id:'b',packageValue:structuredClone(pkg)}] };
  const storage = createInMemoryTemplateSessionRepositoryV2Storage(); const repository = new InMemoryTemplateSessionRepositoryV2(storage);
  const author = createTemplateFieldFamilySessionV2({ repository }); author.load(family); const saved = await author.save();
  const stored = structuredClone(saved); const id = pkg.nodes['58:61'].image.assetId; const hash = 'a'.repeat(64);
  const bytes = await (await fetch(pkg.assets[id].dataUrl)).blob();
  for (const variant of stored.family.variants) { const asset = variant.packageValue.assets[id]; delete asset.dataUrl; delete asset.data; delete asset.stableUrl; asset.hash=hash; asset.source='stored'; asset.storageKey=`sha256:${hash}`; }
  storage.fieldFamilies.set(stored.id,stored);
  storage.assets.set(hash,{hash,blob:bytes,mimeType:bytes.type,sizeBytes:bytes.size,createdAt:new Date().toISOString()});
  const wait = async (s) => { const until=Date.now()+18000; while(s.getSnapshot().readiness.assets==='pending' && Date.now()<until) await new Promise(r=>setTimeout(r,20)); return s.getSnapshot(); };
  const healthy=createTemplateFieldFamilySessionV2({repository}); await healthy.loadSaved(saved.id); const ready=await wait(healthy);
  if(ready.readiness.assets!=='ready') throw new Error('Restored source media failed: '+JSON.stringify(ready.readiness));
  const { default: React } = await import('/node_modules/.vite/deps/react.js');
  const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
  const { TemplateFieldSessionRendererV2 } = await import(`/@fs${root}/packages/template-react/src/fieldSessionV2.tsx`);
  const host = document.createElement('div'); document.body.replaceChildren(host);
  const reactRoot = createRoot(host); const renderer = React.createRef();
  reactRoot.render(React.createElement(TemplateFieldSessionRendererV2, {session:healthy,ref:renderer,mode:'editor'}));
  const until = Date.now()+20000;
  while ((!renderer.current || !healthy.getSnapshot().readiness.exportReady) && Date.now()<until) await new Promise(r=>setTimeout(r,30));
  if(!healthy.getSnapshot().readiness.exportReady) throw new Error("Family renderer readiness: " + JSON.stringify(healthy.getSnapshot().readiness));
  const png = await renderer.current.exportPng({download:false});
  if(!png.pngDataUrl.startsWith('data:image/png') || !png.width || !png.height) throw new Error('Hydrated Family PNG capture failed');
  reactRoot.unmount();
  const badBlob=new Blob(['not an image'],{type:'image/png'}); storage.assets.set(hash,{hash,blob:badBlob,mimeType:badBlob.type,sizeBytes:badBlob.size,createdAt:new Date().toISOString()});
  const broken=createTemplateFieldFamilySessionV2({repository}); await broken.loadSaved(saved.id); const failed=await wait(broken);
  if(failed.readiness.assets!=='blocked'||failed.readiness.exportReady) throw new Error('Decode failure did not block media/export');
  broken.publishRuntimeReadiness({contentRevision:failed.contentState.revision,materializationRevision:failed.familyMaterialization.materialization.materializationRevision,settlementRevision:'ready',fontRevision:'ready',publicationGeneration:1,fonts:'ready',renderer:'ready'});
  if(broken.getSnapshot().readiness.exportReady) throw new Error('Renderer publication cleared media failure');
  storage.assets.delete(hash); const missing=createTemplateFieldFamilySessionV2({repository}); await missing.loadSaved(saved.id);
  if(missing.getSnapshot().readiness.assets!=='blocked'||missing.getSnapshot().readiness.exportReady) throw new Error('Missing hash did not block');
  for(const s of [author,healthy,broken,missing]) s.dispose();
  return {passed:true,checks:['hash-only Family source bytes restore and decode in Chromium','hydrated Family renderer produces guarded PNG output','corrupt source bytes block media and export','renderer evidence cannot erase decode failure','absent stored hash blocks media and export']};
 },{fixture,root});
 await writeFile(resolve(out,'report.json'),JSON.stringify(result,null,2)); console.log(JSON.stringify(result));
} finally { await browser.close(); await server.close(); }
