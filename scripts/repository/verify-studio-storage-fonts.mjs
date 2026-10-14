import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {strFromU8,unzipSync} from 'fflate';
import {createCompactLifecycleFixture} from '../compact-lifecycle-fixture.mjs';
import {createStudioViteServer} from './studio-vite-server.mjs';
import {chromium} from 'playwright';
const server=await createStudioViteServer();await server.listen();const url=server.resolvedUrls.local[0];const browser=await chromium.launch({headless:true});const rows=[];let lastPage;
try{
 const fixture=await createCompactLifecycleFixture(),raw=JSON.parse(strFromU8(unzipSync(fixture.bytes)['template.json'])), bytes=await readFile('apps/studio/src/assets/fonts/rethink-sans-600.ttf');
 for(const kind of ['single','family']) for(const scenario of ['retry','source-replacement','unmount']){
  const context=await browser.newContext();const page=await context.newPage();lastPage=page;const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.route(url,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><title>Fonts retry</title><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script>`}));await page.goto(url);await page.waitForFunction(()=>window.__vite_plugin_react_preamble_installed__);
  await page.evaluate(async({raw,kind})=>{window.h=(await import('/src/workspace/storageFonts.browser.tsx')).startStorageFontProbe(raw,kind);},{raw,kind});
  await page.getByRole('button',{name:'Retry font check',exact:true}).waitFor();await page.evaluate(()=>window.h.inject(null));await page.getByRole('button',{name:'Retry font check',exact:true}).click();
  await page.waitForFunction(()=>window.h.counts.mappings>0);
  if(scenario==='retry'){
   await page.evaluate(()=>{window.h.inject('mapping');window.h.replace();});await page.getByRole('button',{name:'Retry font check',exact:true}).waitFor();await page.evaluate(()=>window.h.inject(null));await page.getByRole('button',{name:'Retry font check',exact:true}).click();
   await page.evaluate(()=>window.h.inject('upload'));
  }else await page.evaluate(()=>window.h.hold());
  const chooser=page.waitForEvent('filechooser');await (kind==='single'?page.getByRole('button',{name:'Upload font file',exact:true}):page.getByText('Upload font',{exact:true})).click();await (await chooser).setFiles({name:'rethink-sans-600.ttf',mimeType:'font/ttf',buffer:bytes});
  if(scenario==='retry'){
   await page.getByRole('button',{name:'Retry upload',exact:true}).waitFor();assert.equal(await page.getByText('File doesn’t match',{exact:true}).count(),0);await page.getByRole('button',{name:'Retry upload',exact:true}).click();
   await (kind==='single'?page.getByText('Exact font verified',{exact:true}):page.locator('[data-testid=family-font-preparation] [data-ready=true]')).waitFor();assert.equal((await page.evaluate(()=>window.h.counts)).accepted,1);assert.equal(await page.getByRole('button',{name:'Retry upload',exact:true}).count(),0);
  }else{
   await page.waitForFunction(()=>window.h.held());await page.evaluate(scenario=>{window.h[scenario==='unmount'?'unmount':'replace']();window.h.release();},scenario);
   // Observable registry completion precedes checking the abandoned UI callback.
   await page.waitForFunction(async()=>{const {getManagedFontRegistry}=await import('/@fs/Users/niels/Documents/Projects/template-tool/packages/template-browser/src/fonts.ts');return (await getManagedFontRegistry().listManagedFonts()).length===1;});
   assert.equal((await page.evaluate(()=>window.h.counts)).accepted,0);
  }
  assert.deepEqual(errors,[]);rows.push({kind,scenario,counts:await page.evaluate(()=>window.h.counts),unhandledErrors:errors});await context.close();
 }
 const outputIndex=process.argv.indexOf('--output');const output=outputIndex<0?'docs/architecture/evidence/blocked-storage-20261012/runs':process.argv[outputIndex+1];await mkdir(output,{recursive:true});await writeFile(`${output}/studio-fonts.json`,JSON.stringify({chromium:browser.version(),evidence:'controlled registry faults; exact Rethink bytes; StrictMode',rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
}catch(error){await mkdir("/private/tmp/r04-font-debug",{recursive:true});await lastPage?.screenshot({path:"/private/tmp/r04-font-debug/failure.png"});await writeFile("/private/tmp/r04-font-debug/state.json",JSON.stringify(await lastPage?.evaluate(()=>({text:document.body.innerText,counts:window.h?.counts})),null,2));throw error;}finally{await browser.close();await server.close();}
