/** Real Studio Checks/Fields/editor/export; disposable context, no user storage. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {PNG} from 'pngjs';
import {launchBrowser,waitForCurrentReadiness} from '../fidelity/browser.mjs';
import {loadManifest,verifyFixture} from '../fidelity/core.mjs';
import {loadExactFontManifest,requireExactFont} from '../fidelity/fonts.mjs';
import {awaitReviewSaveReady} from '../fidelity/review-readiness.mjs';
import {createStudioViteServer} from './studio-vite-server.mjs';
const dir='fidelity/evidence/media-underlay',manifest=loadManifest(),fixture=manifest.fixtures.find(f=>f.id==='exporter-061-carrousel');
const verified=verifyFixture(manifest,fixture),fonts=loadExactFontManifest(fixture.requiredFonts);
const ids=['987:6816','987:6819','987:6823'];
const server=await createStudioViteServer();await server.listen();const browser=await launchBrowser(false);
const rows=[],errors=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1600},deviceScaleFactor:1,acceptDownloads:true});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(server.resolvedUrls.local[0]+'templates/new');
 await page.getByLabel('Import source packages').setInputFiles(verified.path);
 await page.getByRole('button',{name:'Continue to fonts',exact:true}).click();
 await page.getByRole('region',{name:'Font preparation',exact:true}).waitFor();
 for(const row of await page.locator('[data-font-requirement-id]').all()){
  if(await row.getAttribute('data-font-resolution-classification')==='exact')continue;
  const font=requireExactFont(fonts,await row.getAttribute('data-font-family')??'',await row.getAttribute('data-font-weight')??'',await row.getAttribute('data-font-style')??'normal');
  await row.getByRole('button',{name:'Upload font file'}).click();await page.getByTestId('package-font-upload-input').setInputFiles(font.path);
  await page.waitForFunction(hash=>[...document.querySelectorAll('[data-font-requirement-id]')].some(e=>e.getAttribute('data-font-linked-binary-hash')===hash&&e.getAttribute('data-font-ui-status')==='Ready'),font.verifiedSha256);
 }
 async function check(surface){
  await waitForCurrentReadiness(page,'[data-template-package-canvas]');
  const row=await page.evaluate(ids=>{const canvas=document.querySelector('[data-template-package-canvas]');const decisions=canvas.__packageRuntimeTelemetry?.backendDecisions??[];return{decisions:decisions.filter(d=>ids.includes(d.nodeId)),media:ids.map(id=>{const node=canvas.querySelector(`[data-package-node-id="${id}"]`);if(!node)return{id,missing:true};const style=getComputedStyle(node);const image=node.querySelector('img');return{id,backgroundColor:style.backgroundColor,hasImage:style.backgroundImage!=='none',hasDecodedImageElement:Boolean(image?.complete&&image.naturalWidth>0),fit:style.backgroundSize,paintOrder:node.getAttribute('data-package-primitive-paint-order')};})};},ids);
  mkdirSync(dir,{recursive:true});writeFileSync(dir+'/browser-checkpoint.json',JSON.stringify({surface,...row},null,2));
  assert.equal(row.decisions.length,3,surface);for(const d of row.decisions){assert.equal(d.fallback.active,false,surface+'/'+d.nodeId);assert.equal(d.disposition,d.nodeId==='987:6823'?'established-compatibility-owner':'semantic-owner');assert.equal(d.runtimeOwner,'media-dom');}
  for(const media of row.media){assert(media.hasImage||media.hasDecodedImageElement,'Existing background or transformed image owner paints decoded media');assert.match(media.paintOrder,media.id==='987:6823'?/0:SOLID:ordinary-visible,1:IMAGE:ordinary-visible/:/0:IMAGE:ordinary-visible/);}
  rows.push({surface,...row});
 }
 await page.getByRole('button',{name:'Continue to checks',exact:true}).click();await page.getByRole('region',{name:'Validation workbench',exact:true}).waitFor();await check('checks');
 assert.equal(await page.getByText('Fallback rendering in use',{exact:true}).count(),0,'The false fallback card must be absent');
 mkdirSync(dir,{recursive:true});await page.screenshot({path:dir+'/checks.png',fullPage:true});
 await page.getByRole('button',{name:'Continue to fields',exact:true}).click();await check('fields');
 await page.getByRole('button',{name:'Continue to review',exact:true}).click();const name='Media underlay diagnostic probe';await page.getByLabel('Template name').fill(name);await awaitReviewSaveReady(page);await page.getByRole('button',{name:'Save template',exact:true}).click();
 await page.getByRole('heading',{name:'Library',exact:true}).waitFor();await page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})}).getByRole('button',{name:'Create output',exact:true}).click();await page.getByTestId('studio-draft-editor').waitFor();await check('editor');
 await page.setViewportSize({width:768,height:1600});await check('editor-resize-768');await page.setViewportSize({width:1440,height:1600});await check('editor-resize-1440');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export PNG',exact:true}).click();const download=await downloadPromise,png=PNG.sync.read(readFileSync(await download.path()));assert.equal(png.width,fixture.canvas.width);assert.equal(png.height,fixture.canvas.height);await page.getByRole('heading',{name:'Library',exact:true}).waitFor();
 assert.deepEqual(errors,[]);writeFileSync(dir+'/browser.json',JSON.stringify({fixtureId:fixture.id,zipSha256:fixture.zipSha256,browser:browser.version(),rows,png:{width:png.width,height:png.height},errors,automatedBrowser:true,manualLiveReview:false},null,2)+'\n');console.log('Carrousel false fallback cards absent; media owners, resize and PNG export pass.');
}finally{await browser.close();await server.close();}
