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
const outputIndex=process.argv.indexOf('--output');
const output=resolve(outputIndex<0?'fidelity/evidence/editor-performance':process.argv[outputIndex+1]);await mkdir(output,{recursive:true});
try{
 for(const family of [false,true]){
  const context=await browser.newContext({viewport:{width:1440,height:1600},acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(35000);
  try{
   await page.goto(server.resolvedUrls.local[0]+'__editor-performance');await page.waitForFunction(()=>Boolean(window.editorProbe));await page.evaluate(({ids,family})=>window.editorProbe.start(ids,family),{ids:family?fixtures.map(f=>f.id):['exporter-061-carrousel'],family});
   const ready=()=>page.waitForFunction(()=>window.editorProbe.state().readiness.exportReady);await ready();
   const fields=await page.evaluate(()=>window.editorProbe.fields),target=fields.find(f=>f.type==='text'),num=fields.find(f=>f.type==='number');
   const input=page.locator(`[id$="${encodeURIComponent(target.id)}"]`);
   await input.fill('Unsaved edit');assert.equal(await input.inputValue(),'Unsaved edit');await page.getByRole('status').filter({hasText:/^Unsaved changes$/}).waitFor();await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();await ready();
   await input.focus();await input.press('End');await page.keyboard.insertText('X');await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();assert.equal(await input.evaluate(el=>({focus:el===document.activeElement,caret:el.selectionStart,value:el.value})).then(s=>s.focus&&s.caret===s.value.length),true);
   await page.evaluate(()=>window.editorProbe.failCommit=true);await input.fill('Retryable input');await page.getByRole('alert').filter({hasText:/Controlled commit failure/}).waitFor();assert.equal(await input.inputValue(),'Retryable input');assert.equal(await page.evaluate(()=>window.editorProbe.guard()),false);await input.fill('Corrected input');await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();
   await page.evaluate(()=>window.editorProbe.failSave=true);await input.fill('Save failure input');await page.getByRole('status').filter({hasText:/^Save failed:/}).waitFor();await page.getByRole('button',{name:'Retry save',exact:true}).click();await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();
   if(num){const number=page.locator(`[id$="${encodeURIComponent(num.id)}"]`);const before=await page.evaluate(()=>window.editorProbe.state().revision);await number.fill('-');await page.getByRole('status').filter({hasText:/^Check input$/}).waitFor();assert.equal(await page.evaluate(()=>window.editorProbe.guard()),false);assert.equal(await page.evaluate(()=>window.editorProbe.state().revision),before);assert.equal(await number.inputValue(),'-');await number.fill('42');await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();}
   const date=fields.find(f=>f.type==='date');if(date){const el=page.locator(`[id$="${encodeURIComponent(date.id)}"]`);await el.fill('2026-');await page.getByRole('status').filter({hasText:/^Check input$/}).waitFor();assert.equal(await page.evaluate(()=>window.editorProbe.guard()),false);await el.fill('2027-04-16');await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();}
   // Composition must remain a literal local draft and block a flush until compositionend.
   const rev=await page.evaluate(()=>window.editorProbe.state().revision);
   await input.dispatchEvent('compositionstart');await input.fill('Composing');assert.equal(await page.evaluate(()=>window.editorProbe.guard()),false);assert.equal(await page.evaluate(()=>window.editorProbe.state().revision),rev);await input.dispatchEvent('compositionend',{data:'Composing'});await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();await ready();
   await input.fill('Abandoned local input');await page.evaluate(()=>window.editorProbe.replaceSession());await ready();assert.notEqual(await input.inputValue(),'Abandoned local input');
   if(family){const selector=page.getByLabel(/^(Selected variant|Design)$/,{exact:true});await input.fill('Flush before selection');const options=await selector.locator('option').evaluateAll(o=>o.map(x=>x.value));await selector.selectOption(options[1]);await ready();assert.equal(await page.evaluate(()=>window.editorProbe.state().selectedVariantId),options[1]);}
   await page.screenshot({path:resolve(output,family?'family-browser.png':'single-browser.png'),fullPage:true});
   // Export immediately after typing must flush and persist the latest input.
   const currentFields=await page.evaluate(()=>window.editorProbe.state().fields),text=currentFields.find(f=>f.type==='text'),latest=page.locator(`[id$="${encodeURIComponent(text.id)}"]`);await latest.fill('Latest PNG');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export PNG',exact:true}).click();const file=await download;await file.saveAs(resolve(output,family?'family.png':'single.png'));await page.waitForFunction(()=>window.editorProbe.exported===true);assert.equal(await page.evaluate(id=>window.editorProbe.state().fields.find(f=>f.id===id).value,text.id),'Latest PNG');
   assert.deepEqual(errors,[]);checks.push({family,checks:['StrictMode','immediate local input and pending status','caret/focus','commit exception and correction','save rejection/retry','incomplete numeric/date input and guarded navigation','IME','session replacement cancels pending input','selection flush','latest-state PNG export'],manualReview:false});await page.evaluate(()=>window.editorProbe.dispose());
  }finally{await context.close();}
 }
 await writeFile(resolve(output,'browser-verification.json'),JSON.stringify({environment:'headless Chromium development',checks},null,2)+'\n');console.log('Output editor browser lifecycle checks passed');
}finally{await browser.close();await server.close();}
