/** Controlled Studio failures, separate from the real native-upgrade probe. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { normalizeTemplatePackageV1ToV2 } from '@sleinity/template-core';
import { createStudioViteServer } from './studio-vite-server.mjs';
const outputIndex=process.argv.indexOf('--output');
const output = path.resolve(outputIndex<0?'docs/architecture/evidence/blocked-storage-20261012/runs':process.argv[outputIndex+1]); await mkdir(output,{recursive:true});
const pkg = normalizeTemplatePackageV1ToV2(JSON.parse(await readFile('src/template-package/fixtures/figma-plugin-v0.4.1.json','utf8'))).package;
pkg.fontRequirements=[];
for(const node of Object.values(pkg.nodes)) if(node.type==='TEXT') {node.text.fontFamily='sans-serif';if(node.extensions?.figma?.style) node.extensions.figma.style.fontFamily='sans-serif';}
pkg.editableFields=[{id:'text:headline',type:'text',label:'Headline',binding:{kind:'text-characters',nodeId:'58:57'},defaultValue:'Original',configuration:{}}];pkg.editableFieldOrder=['text:headline'];
const server=await createStudioViteServer();await server.listen();const url=server.resolvedUrls.local[0], browser=await chromium.launch({headless:true});const rows=[];let lastPage;
try {
 for(const kind of (process.argv.includes('--single')?['single']:['single','family'])) {
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});const page=await context.newPage();lastPage=page;page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  const template=await page.evaluate(async({pkg,kind})=>{
   const {studioRecords:r}=await import('/src/workspace/studioRecords.ts');const {familyFromSources}=await import('/src/setup/setupSources.ts');const s=r.openSession({id:'seed',name:'Blocked retry',...(kind==='family'?{family:{}}:{})});s.load(kind==='family'?familyFromSources([pkg,{...pkg,packageId:pkg.packageId+'-second'}],'Blocked retry'):pkg);const record=await r.saveTemplate(s,{name:'Blocked retry'});s.dispose();return record;
  },{pkg,kind});await page.reload();
  await page.getByRole('button',{name:'Actions for Blocked retry',exact:true}).click();await page.getByRole('menuitem',{name:'Template Settings',exact:true}).click();
  await page.getByRole('button',{name:'Review',exact:true}).click();
  await page.evaluate(async()=>{const r=(await import('/src/workspace/studioRecords.ts')).studioRecords;const {TemplateStorageBlockedError}=await import('/@fs/Users/niels/Documents/Projects/template-tool/packages/template-browser/src/persistence.ts');window.originalSaveTemplate=r.saveTemplate; r.saveTemplate=async()=>{throw new TemplateStorageBlockedError('template-package-platform',5);};});
  await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Retry save',exact:true}).waitFor();assert.equal(await page.getByLabel('Template name').inputValue(),'Blocked retry');
  await page.evaluate(async()=>{(await import('/src/workspace/studioRecords.ts')).studioRecords.saveTemplate=window.originalSaveTemplate;});await page.getByRole('button',{name:'Retry save',exact:true}).click();await page.getByRole('heading',{name:'Library',exact:true}).waitFor();
  await page.evaluate(async()=>{const r=(await import('/src/workspace/studioRecords.ts')).studioRecords;const {TemplateStorageBlockedError}=await import('/@fs/Users/niels/Documents/Projects/template-tool/packages/template-browser/src/persistence.ts');window.originalResolve=r.resolve;let failed=false;r.resolve=async route=>{if(!failed){failed=true;throw new TemplateStorageBlockedError('template-package-platform',5);}return window.originalResolve(route);};});
  await page.getByRole('button',{name:'Create output',exact:true}).click();await page.getByRole('button',{name:'Retry',exact:true}).waitFor();await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByLabel('Headline',{exact:true}).waitFor();
  await page.evaluate(async()=>{(await import('/src/workspace/studioRecords.ts')).studioRecords.resolve=window.originalResolve;});
  const inspect=()=>page.evaluate(async({id,kind})=>(await import('/src/workspace/studioRecords.ts')).studioRecords.recovery.inspect({kind,templateId:id}),{id:template.id,kind});
  await page.getByLabel('Headline',{exact:true}).waitFor();
  await page.evaluate(async()=>{const r=(await import('/src/workspace/studioRecords.ts')).studioRecords;const {TemplateStorageBlockedError}=await import('/@fs/Users/niels/Documents/Projects/template-tool/packages/template-browser/src/persistence.ts');window.originalSave=r.recovery.save; r.recovery.save=async()=>{throw new TemplateStorageBlockedError('template-package-platform',5);};});
  await page.getByLabel('Headline',{exact:true}).fill('Retained during storage failure');await page.getByRole('button',{name:'Retry save',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Headline',{exact:true}).inputValue(),'Retained during storage failure');assert.equal(await inspect(),null);
  await page.getByRole('button',{name:'Back to Library',exact:true}).click();assert.equal(await page.getByTestId('studio-draft-editor').count(),1);assert.equal(await page.getByLabel('Headline',{exact:true}).inputValue(),'Retained during storage failure');
  await page.getByLabel('Headline',{exact:true}).fill('Latest retry value');
  await page.evaluate(async()=>{(await import('/src/workspace/studioRecords.ts')).studioRecords.recovery.save=window.originalSave;});
  await page.getByRole('button',{name:'Retry save',exact:true}).click();
  await page.waitForFunction(async({id,kind})=>{const r=(await import('/src/workspace/studioRecords.ts')).studioRecords;return (await r.recovery.inspect({kind,templateId:id}))?.payload.contentState.values['text:headline'].value==='Latest retry value';},{id:template.id,kind});
  await page.getByRole('button',{name:'Back to Library',exact:true}).click();await page.getByRole('heading',{name:'Library',exact:true}).waitFor();
  const modes=[];
  for(const mode of ['resume','fresh']) {
   await page.getByRole('button',{name:'Create output',exact:true}).click();await page.getByRole('heading',{name:'Continue your draft?',exact:true}).waitFor();
   await page.evaluate(async()=>{const r=(await import('/src/workspace/studioRecords.ts')).studioRecords;const {TemplateStorageBlockedError}=await import('/@fs/Users/niels/Documents/Projects/template-tool/packages/template-browser/src/persistence.ts');window.originalBegin=r.beginOutput;window.retryModes=[];let reject=true;r.beginOutput=async(record,mode)=>{window.retryModes.push(mode);if(reject){reject=false;throw new TemplateStorageBlockedError('template-package-platform',5);}return window.originalBegin(record,mode);};});
   await page.getByRole('button',{name:mode==='resume'?'Continue draft':'Start from scratch',exact:true}).click();await page.getByRole('button',{name:'Retry',exact:true}).waitFor();
   await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByLabel('Headline',{exact:true}).waitFor();
   const intent=await page.evaluate(()=>window.retryModes);assert.deepEqual(intent,[mode,mode]);modes.push(intent);
   assert.equal(await page.getByLabel('Headline',{exact:true}).inputValue(),mode==='resume'?'Latest retry value':'Original');
   await page.evaluate(async()=>{(await import('/src/workspace/studioRecords.ts')).studioRecords.beginOutput=window.originalBegin;});
   await page.getByLabel('Headline',{exact:true}).fill('Latest retry value');await page.getByRole('button',{name:'Back to Library',exact:true}).click();await page.getByRole('heading',{name:'Library',exact:true}).waitFor();
  }
  await page.getByRole('button',{name:'Create output',exact:true}).click();await page.getByRole('button',{name:'Continue draft',exact:true}).click();await page.getByLabel('Headline',{exact:true}).waitFor();
  await page.evaluate(async()=>{const r=(await import('/src/workspace/studioRecords.ts')).studioRecords.recovery;const {TemplateStorageBlockedError,TemplateRecoveryCleanupError}=await import('/@fs/Users/niels/Documents/Projects/template-tool/packages/template-browser/src/persistence.ts');window.originalComplete=r.complete; r.exportAndComplete=async(lease,capture)=>{await capture();throw new TemplateRecoveryCleanupError(new TemplateStorageBlockedError('template-package-platform',5));};let reject=true;r.complete=async lease=>{if(reject){reject=false;throw new TemplateStorageBlockedError('template-package-platform',5);}return window.originalComplete(lease);};});
  let downloads=0;page.on('download',()=>downloads++);const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export PNG',exact:true}).click();await download;await page.getByRole('button',{name:'Retry cleanup',exact:true}).waitFor();
  await page.getByRole('button',{name:'Retry cleanup',exact:true}).click();await page.getByText('Local storage is blocked. Close other tabs or windows of this app, then retry.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Retry cleanup',exact:true}).click();await page.getByRole('heading',{name:'Library',exact:true}).waitFor();assert.equal(downloads,1);assert.equal(await inspect(),null);assert.deepEqual(errors,[]);
  rows.push({kind,setupSaveRetry:true,restoreRetry:true,blockedNavigationRetainsWorkspace:true,retainedInput:true,latestRetry:true,modes,cleanupDownloads:downloads,unhandledErrors:errors});await page.screenshot({path:path.join(output,`studio-${kind}-after.png`)});await context.close();
 }
 await writeFile(path.join(output,'studio-retry.json'),JSON.stringify({chromium:browser.version(),evidence:'controlled storage rejection in already-open Studio',rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
}catch(error){await lastPage?.screenshot({path:"/private/tmp/r04-studio-failure.png"});await writeFile("/private/tmp/r04-studio-failure.txt",await lastPage?.locator("body").innerText()??"");throw error;}finally{await browser.close();await server.close();}
