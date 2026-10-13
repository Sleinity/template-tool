/** Disposable exact-font Studio contexts; never opens user storage or tabs. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createStudioViteServer } from '../repository/studio-vite-server.mjs';
import { launchBrowser } from '../fidelity/browser.mjs';
import { loadManifest, resolveFixture, verifyFixture } from '../fidelity/core.mjs';
import { selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { loadExactFontManifest } from '../fidelity/fonts.mjs';

const before=process.argv.includes('--before');
const cameraOnly=process.argv.includes('--camera-only');
const originals=new Map();
if(before){const identity=JSON.parse(await readFile('docs/studio/evidence/product-experience-20261012/identity.json','utf8'));for(const [file,entry] of Object.entries(identity.files)){const bytes=await readFile(entry.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);originals.set(resolve(file),bytes.toString());}}
const manifest=loadManifest(),fixtures=selectSdkGateFixtures(manifest),fonts=loadExactFontManifest(fixtures.flatMap(f=>f.requiredFonts??[])),inputs=new Map();
for(const font of fonts.fonts)inputs.set(`/inputs/${font.id}.font`,await readFile(font.path));
for(const fixture of fixtures){verifyFixture(manifest,fixture);inputs.set(`/inputs/${fixture.id}.zip`,await readFile(resolveFixture(manifest,fixture)));inputs.set(`/inputs/${fixture.id}.json`,Buffer.from(JSON.stringify({filename:fixture.filename,fonts:fonts.fonts.map(font=>({id:font.id,family:font.family,weight:font.weight,style:font.style,sha256:font.sha256,filename:font.path.split('/').at(-1)}))})));}
const outputIndex=process.argv.indexOf('--output');
const out=resolve(outputIndex>=0?process.argv[outputIndex+1]:`fidelity/evidence/product-experience/${cameraOnly?'camera-':''}${before?'before':'after'}`);await mkdir(out,{recursive:true});
const server=await createStudioViteServer({plugins:before?[{name:'product-source-baseline',enforce:'pre',transform(source,id){const retained=originals.get(id.split('?')[0]);return retained?{code:retained,map:null}:null;}}]:[]});server.middlewares.use(async(req,res,next)=>{const bytes=inputs.get(req.url?.split('?')[0]);if(bytes){res.end(bytes);return;}if(req.url==='/__studio-product'){res.setHeader('content-type','text/html');res.end(await server.transformIndexHtml('/__studio-product',`<!doctype html><html><body><div id="root"></div><script type="module" src="/@fs/${resolve('scripts/editor-performance/harness.tsx')}"></script></body></html>`));return;}next();});server.middlewares.stack.unshift(server.middlewares.stack.pop());await server.listen();
const browser=await launchBrowser(false),rows=[];
try{
for(const scenario of [...fixtures.map(f=>({id:f.id,ids:[f.id],family:false})),{id:'family',ids:fixtures.map(f=>f.id),family:true}]){
 const context=await browser.newContext({viewport:{width:1440,height:cameraOnly?1600:900},acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(35000);
 try{
  await page.goto(server.resolvedUrls.local[0]+'__studio-product');await page.waitForFunction(()=>Boolean(window.editorProbe));await page.evaluate(s=>window.editorProbe.start(s.ids,s.family),scenario);const ready=()=>page.waitForFunction(()=>window.editorProbe.state().readiness.exportReady);await ready();
  if(scenario.family){await page.getByLabel(before?'Selected variant':'Design',{exact:true}).selectOption({index:2});await ready();}
  if(cameraOnly){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));rows.push({scenario:scenario.id,camera:await page.evaluate(()=>{const stage=document.querySelector('.studio-setup-canvas'),canvas=stage.querySelector('[data-template-package-canvas]'),view=canvas.closest('[style*="transform:"]');const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {stage:box(stage),canvas:box(canvas),view:box(view),transform:view.style.transform};})});await page.evaluate(()=>window.editorProbe.dispose());continue;}
  let fields=await page.evaluate(()=>window.editorProbe.state().fields),text=fields.find(f=>f.type==='text');
  const resetButtons=await page.getByRole('button',{name:/^Reset /}).count();
  const fitCount=await page.getByRole('button',{name:'Fit design',exact:true}).count();
  if(before){assert.equal(fitCount,0);assert(resetButtons<fields.length);}
  else {
   assert.equal(fitCount,1);assert.equal(resetButtons,fields.length);
   assert.equal(await page.getByRole('button',{name:'Open issues',exact:true}).count(),0,'Output Issues functionality removed');
   assert.equal(await page.locator('.inspection-preview-toolbar__scale').innerText(),'40%','Output opens at 40%');
   assert.deepEqual(await page.locator('.studio-output-header').evaluate(el=>{const style=getComputedStyle(el);return {background:style.backgroundColor,border:style.borderBottomWidth};}),{background:'rgba(0, 0, 0, 0)',border:'0px'});
   await page.setViewportSize({width:2048,height:1475});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert((await page.locator('.studio-output-shell .app-shell__frame').boundingBox()).width>=1998,'Wide output uses available page width');
   assert.equal((await page.locator('.template-workspace-layout__panel').boundingBox()).width,400,'Content panel is wider');
   await page.screenshot({path:resolve(out,`${scenario.id}-2048-initial.png`)});await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const canvas=page.getByLabel('Design canvas',{exact:true}),transform=page.locator('[data-studio-preview-transform]');
   await page.evaluate(()=>window.__productRenderer=document.querySelector('[data-package-node-id]'));
   const original=await transform.getAttribute('style');
   const input=page.locator(`[id$="${encodeURIComponent(text.id)}"]`);await input.focus();await page.locator(`[data-output-field="${text.id}"][data-active]`).waitFor();assert.equal(await transform.getAttribute('style'),original,'Focus does not move camera');
   await page.getByRole('button',{name:'Fit field',exact:true}).click();assert.notEqual(await transform.getAttribute('style'),original);
   await page.getByRole('button',{name:'Zoom in',exact:true}).click();const camera=await transform.getAttribute('style');
   await input.fill('Edited');await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();await ready();assert.equal(await transform.getAttribute('style'),camera,'Typing preserves manual view');
   assert(await page.evaluate(()=>window.__productRenderer===document.querySelector('[data-package-node-id]')),'Same renderer mount');
   await page.getByRole('button',{name:`Reset ${text.id.replace(/^.*:/,'')}`,exact:true}).count();
   await page.locator(`[data-output-field="${text.id}"]`).getByRole('button',{name:/^Reset /}).click();await ready();await page.waitForFunction(({id,value})=>window.editorProbe.state().fields.find(f=>f.id===id).value===value,{id:text.id,value:text.value});
   await page.evaluate(()=>window.editorProbe.deferCommit=true);await input.fill('Queued');await page.waitForFunction(()=>Boolean(window.editorProbe.releaseCommit));
   await page.locator(`[data-output-field="${text.id}"]`).getByRole('button',{name:/^Reset /}).click();await page.evaluate(()=>{window.editorProbe.releaseCommit();window.editorProbe.releaseCommit=null;});
   await page.waitForFunction(({id,value})=>window.editorProbe.state().fields.find(f=>f.id===id).value===value,{id:text.id,value:text.value});await ready();
   const date=fields.find(f=>f.type==='date');if(date){const input=page.locator(`[id$="${encodeURIComponent(date.id)}"]`);await input.fill('2026-');assert.equal(await page.evaluate(()=>window.editorProbe.guard()),false);assert.equal(await input.inputValue(),'2026-');await page.locator(`[data-output-field="${date.id}"]`).getByRole('button',{name:/^Reset /}).click();await ready();}
   const color=fields.find(f=>f.type==='color');if(color){const input=page.locator(`[id$="${encodeURIComponent(color.id)}"]`);await input.fill('#zz');assert.equal(await page.evaluate(()=>window.editorProbe.guard()),false);assert.equal(await input.inputValue(),'#zz');await page.locator(`[data-output-field="${color.id}"]`).getByRole('button',{name:/^Reset /}).click();await ready();await page.waitForFunction(({id,value})=>window.editorProbe.state().fields.find(f=>f.id===id).value===value,{id:color.id,value:color.value});}
   const image=page.locator('.ui-media-input__preview img').first();if(await image.count())assert(await image.evaluate(el=>el.complete&&el.naturalWidth>0),'Managed image thumbnail decodes');
   for(const field of fields){
    if(field.id===text.id)continue;
    const control=page.locator(`[data-output-field="${field.id}"]`),input=control.locator('input:not([type="color"]):not([type="date"]):not([type="file"]),textarea').first();
    if(field.type==='boolean')await control.getByRole('checkbox').setChecked(!field.value);
    else if(field.type==='image')await control.locator('input[type="file"]').setInputFiles({name:'replacement.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="red"/></svg>')});
    else await input.fill(field.type==='number'?'42':field.type==='date'?'2027-04-16':field.type==='color'?'#123456':'Short');
    await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();await ready();
    await control.getByRole('button',{name:/^Reset /}).click();
    await page.waitForFunction(({id,value})=>JSON.stringify(window.editorProbe.state().fields.find(f=>f.id===id).value)===JSON.stringify(value),{id:field.id,value:field.value});await ready();
   }
   const imageField=fields.find(field=>field.type==='image');if(imageField){const control=page.locator(`[data-output-field="${imageField.id}"]`);await page.evaluate(()=>window.editorProbe.deferImage=true);await control.locator('input[type="file"]').setInputFiles({name:'late.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')});await page.waitForFunction(()=>Boolean(window.editorProbe.releaseImage));await control.getByRole('button',{name:/^Reset /}).click();await ready();await page.evaluate(()=>{window.editorProbe.releaseImage();window.editorProbe.releaseImage=null;});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.getByRole('alert').filter({hasText:'Abandoned image read'}).count(),0,'Late abandoned image errors cannot update Reset controls');}
   await canvas.focus();const panBefore=await transform.getAttribute('style');await canvas.press('ArrowRight');assert.notEqual(await transform.getAttribute('style'),panBefore);await page.getByRole('button',{name:'Fit design',exact:true}).click();
   const textarea=fields.find(field=>field.type==='textarea');if(textarea && ['exporter-061-carrousel','family'].includes(scenario.id)) {
    await page.evaluate(id=>window.editorProbe.configureField(id,{maxLines:1}),textarea.id);
    const configuration=await page.evaluate(()=>window.editorProbe.previousFieldConfiguration);
    await page.waitForFunction(()=>window.editorProbe.state().readiness.state==='blocked');
    assert(await page.getByRole('button',{name:'Export PNG',exact:true}).isDisabled(),'Removing Issues preserves export validation');
    await page.locator('button#output-export-reason').click();await page.waitForFunction(id=>document.activeElement?.id.endsWith(encodeURIComponent(id)),textarea.id);
    assert.equal(await page.getByRole('dialog',{name:'Output issues'}).count(),0,'Export correction goes directly to inline field');
    await page.evaluate(({id,configuration})=>window.editorProbe.configureField(id,configuration),{id:textarea.id,configuration});await ready();
   }
  }
  await page.screenshot({path:resolve(out,`${scenario.id}-1440.png`)});
  await page.setViewportSize({width:1024,height:768});await page.screenshot({path:resolve(out,`${scenario.id}-1024.png`)});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'1024px no horizontal overflow');
  await page.setViewportSize({width:768,height:1024});
  if(!before) { await page.getByRole("tab",{name:"Content",exact:true}).waitFor(); await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); }
  if(!before){const transform=page.locator('[data-studio-preview-transform]');await page.evaluate(()=>window.__productRenderer=document.querySelector('[data-package-node-id]'));const size=await transform.boundingBox();const revision=await page.evaluate(()=>window.editorProbe.state().revision);await page.getByRole('tab',{name:'Preview',exact:true}).click();await page.getByRole('button',{name:'Fit design',exact:true}).waitFor();await ready();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.deepEqual(await transform.boundingBox(),size,'Presentation tab preserves viewport dimensions');await page.screenshot({path:resolve(out,`${scenario.id}-768-preview.png`)});await page.getByRole('tab',{name:'Content',exact:true}).click();assert(await page.evaluate(()=>window.__productRenderer===document.querySelector('[data-package-node-id]')));assert.equal(await page.evaluate(()=>window.editorProbe.state().revision),revision);assert.equal(await page.getByLabel('Design canvas',{exact:true}).isVisible(),false,'Inactive canvas inaccessible');}
  await page.screenshot({path:resolve(out,`${scenario.id}-768.png`)});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'768px no horizontal overflow');
  await page.setViewportSize({width:1440,height:900});await ready();
  if(!before&&scenario.id==='exporter-061-now-hiring'){
   const revision=await page.evaluate(()=>window.editorProbe.state().revision);
   const branding=await page.addStyleTag({content:':root { --color-surface-app: #edf2f7; --color-action-primary: #234e70; --color-action-primary-hover: #183b56; --color-focus-ring: #2266aa; }'});
   await page.waitForFunction(()=>{const button=[...document.querySelectorAll('button')].find(el=>el.textContent==='Export PNG');return button&&getComputedStyle(button).backgroundColor==='rgb(35, 78, 112)';});
   assert.equal(await page.getByRole('button',{name:'Export PNG',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(35, 78, 112)','Host tokens customize chrome without SDK edits');
   assert.equal(await page.evaluate(()=>window.editorProbe.state().revision),revision,'Branding performs no native mutation');
   await page.screenshot({path:resolve(out,'host-theme-tokens.png')});await branding.evaluate(el=>el.remove());
  }
  if(!before){const input=page.locator(`[id$="${encodeURIComponent(text.id)}"]`);await input.fill('Latest');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export PNG',exact:true}).click();await(await download).saveAs(resolve(out,`${scenario.id}.png`));await page.waitForFunction(()=>window.editorProbe.exported===true);}
  assert.deepEqual(errors,[]);rows.push({scenario:scenario.id,resetButtons,fitCount,viewportChecks:[1440,1024,768],manualReview:false,errors});await page.evaluate(()=>window.editorProbe.dispose());
 }finally{await context.close();}
}
await writeFile(resolve(out,'record.json'),JSON.stringify({before,rows,browser:browser.version(),tests:'full-width/wider panel, transparent header, 40% initial zoom, no Issues, inline correction/export guard, focus/camera, mount, Reset, invalid date/color, managed image, keyboard pan, tablet state, PNG'},null,2)+'\n');console.log(`Studio product ${before?'baseline':'integrated'}: ${rows.length} exact-font scenarios passed.`);
}finally{await browser.close();await server.close();}
