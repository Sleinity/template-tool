/** Automated output-editor lifecycle checks in disposable exact-font contexts. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createStudioViteServer } from '../repository/studio-vite-server.mjs';
import { launchBrowser } from '../fidelity/browser.mjs';
import { loadManifest, resolveFixture, verifyFixture } from '../fidelity/core.mjs';
import { selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { loadExactFontManifest } from '../fidelity/fonts.mjs';
const manifest=loadManifest(),fixtures=selectSdkGateFixtures(manifest),fonts=loadExactFontManifest(fixtures.flatMap(f=>f.requiredFonts??[])),inputs=new Map();
for(const f of fonts.fonts)inputs.set(`/inputs/${f.id}.font`,await readFile(f.path));
for(const f of fixtures){verifyFixture(manifest,f);inputs.set(`/inputs/${f.id}.zip`,await readFile(resolveFixture(manifest,f)));inputs.set(`/inputs/${f.id}.json`,Buffer.from(JSON.stringify({filename:f.filename,fonts:fonts.fonts.map(x=>({id:x.id,family:x.family,weight:x.weight,style:x.style,sha256:x.sha256,filename:x.path.split('/').at(-1)}))})));}
const server=await createStudioViteServer();server.middlewares.use(async(req,res,next)=>{const b=inputs.get(req.url?.split('?')[0]);if(b){res.end(b);return;}if(req.url==='/__editor-performance'){res.setHeader('content-type','text/html');res.end(await server.transformIndexHtml('/__editor-performance',`<!doctype html><html><body><div id="root"></div><script type="module" src="/@fs/${resolve('scripts/editor-performance/harness.tsx')}"></script></body></html>`));return;}next();});const middleware=server.middlewares.stack.pop();server.middlewares.stack.unshift(middleware);await server.listen();const browser=await launchBrowser(false),checks=[];
const output=resolve('fidelity/evidence/text-geometry-contract');await mkdir(output,{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.resolvedUrls.local[0]+'__editor-performance');await page.waitForFunction(()=>window.editorProbe);
 await page.evaluate(()=>window.editorProbe.start(['exporter-061-carrousel']));
 const ready=()=>page.waitForFunction(()=>window.editorProbe.state().readiness.exportReady && document.querySelector('[data-package-node-id="987:6835"]')?.getAttribute('data-package-text-trim-authority')==='authoritative');
 await ready();
 const measurement=()=>page.evaluate(()=>{const n=document.querySelector('[data-package-node-id="987:6835"]');return {text:n.textContent,trim:n.getAttribute('data-package-text-trim-authority'),box:n.getAttribute('data-package-text-layout-box'),font:n.getAttribute('data-package-text-font-state'),rect:[n.clientWidth,n.clientHeight]};});
 const initial=await measurement();
 await page.evaluate(()=>window.editorProbe.reloadTextProbe('987:6835',{width:70}));await ready();const narrow=await measurement();
 assert(narrow.rect[1]>initial.rect[1],'Real wrapping constraints must remeasure, not freeze Date bounds');checks.push({case:'synthetic canonical width via native load',initial,narrow});
 await page.evaluate(()=>window.editorProbe.reloadTextProbe('987:6835',{fontSize:40}));await ready();const larger=await measurement();assert.notDeepEqual(larger.box,narrow.box);checks.push({case:'synthetic typography via native load',larger});
 await page.setViewportSize({width:1000,height:1200});await ready();checks.push({case:'stage resize',measurement:await measurement()});
 await page.evaluate(()=>window.editorProbe.replaceSession());await ready();checks.push({case:'session replacement and current publication',measurement:await measurement()});
 await page.evaluate(()=>window.editorProbe.dispose());
 // Now Hiring's edited HUG headline/body are the separate failure-first case.
 // Real dependency changes still need fresh geometry after the before-paint fix.
 await page.reload();await page.waitForFunction(()=>window.editorProbe);
 await page.evaluate(()=>window.editorProbe.start(['exporter-061-now-hiring']));
 const hiringReady=()=>page.waitForFunction(()=>window.editorProbe.state().readiness.exportReady && document.querySelector('[data-package-node-id="987:6765"]')?.getAttribute('data-package-text-trim-authority')==='authoritative');
 const hiringMeasurement=()=>page.evaluate(()=>{const n=document.querySelector('[data-package-node-id="987:6765"]');return {trim:n.getAttribute('data-package-text-trim-authority'),box:n.getAttribute('data-package-text-layout-box'),rect:[n.clientWidth,n.clientHeight]};});
 await hiringReady();const hiringInitial=await hiringMeasurement();
 await page.evaluate(()=>window.editorProbe.reloadTextProbe('987:6765',{width:150}));await hiringReady();const hiringWrapped=await hiringMeasurement();
 assert(hiringWrapped.rect[1]>hiringInitial.rect[1],'Now Hiring real wrapping must not reuse stale single-line metrics');
 checks.push({case:'Now Hiring synthetic canonical wrapping',initial:hiringInitial,wrapped:hiringWrapped});
 await page.evaluate(()=>window.editorProbe.reloadTextProbe('987:6765',{fontSize:64}));await hiringReady();const hiringTypography=await hiringMeasurement();
 assert.notDeepEqual(hiringTypography.box,hiringWrapped.box);checks.push({case:'Now Hiring genuine typography invalidation',measurement:hiringTypography});
 await page.evaluate(()=>window.editorProbe.replaceSession());await hiringReady();checks.push({case:'Now Hiring session replacement',measurement:await hiringMeasurement()});
 await page.evaluate(()=>window.editorProbe.dispose());assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'browser.json'),JSON.stringify({checks,errors,syntheticMutations:true,manualReview:false},null,2));console.log('Current-ref, width/wrap, typography, resize and replacement geometry checks passed');
} finally { await browser.close();await server.close(); }
