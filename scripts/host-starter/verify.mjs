/** Fresh extracted application, installed supplied archives only. Test hooks never ship. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, cp, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { unzipSync } from 'fflate';
import { build, preview } from 'vite';
import { verifyDeliveryBundle, sha256 } from '../release-delivery/bundle.mjs';
import { loadManifest, verifyFixture } from '../fidelity/core.mjs';
import { selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { loadExactFontManifest } from '../fidelity/fonts.mjs';
import { launchBrowser } from '../fidelity/browser.mjs';
const args=process.argv.slice(2),option=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const delivery=path.resolve(option('--archives','/tmp/sdk-complete-starter-preview')),manager=option('--manager','npm'),out=path.resolve(option('--output','/tmp/sdk-fresh-host'));
assert(['npm','pnpm'].includes(manager));await mkdir(out,{recursive:true});
const verified=await verifyDeliveryBundle(delivery),manifest=loadManifest(),fixtures=selectSdkGateFixtures(manifest),fonts=loadExactFontManifest(fixtures.flatMap(f=>f.requiredFonts??[])).fonts;
const temp=await realpath(await mkdtemp(path.join(tmpdir(),'sdk-fresh-starter-'))),checks=[];let server,browser,page;
const run=(command,argv)=>{const result=spawnSync(command,argv,{cwd:temp,env:{...process.env,CI:'true',NPM_CONFIG_USERCONFIG:path.join(temp,'.npmrc')},encoding:'utf8',maxBuffer:32*1024*1024});const label=argv.includes('install')?'install':'build';return writeFile(path.join(out,label+'.txt'),(result.stdout??'')+(result.stderr??'')).then(()=>assert.equal(result.status,0,`${command} ${argv.join(' ')}\n${result.stdout}\n${result.stderr}`));};
try{
 const bytes=await readFile(path.join(delivery,'SDK-HOST-STARTER.zip'));const extracted=unzipSync(bytes);
 for(const[name,data]of Object.entries(extracted)){assert(!path.isAbsolute(name)&&!name.split('/').includes('..'));const target=path.join(temp,name);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,data);}
 for(const a of verified.manifest.archives)await cp(path.join(delivery,a.file),path.join(temp,'vendor',a.file));
 await writeFile(path.join(temp,'.npmrc'),'registry=https://registry.npmjs.org\n');
 await run(manager,manager==='npm'?['install','--ignore-scripts','--no-audit','--no-fund']:['install','--prefer-offline']);
 const lock=await readFile(path.join(temp,manager==='npm'?'package-lock.json':'pnpm-lock.yaml'),'utf8');assert(!/workspace:|link:|npm\.pkg\.github\.com/.test(lock));
 await run(manager,['run','build']);
 checks.push({scenario:'unmodified-extracted-install-and-build',status:'pass'});
 const probe={name:'fresh-host-observation',enforce:'pre',transform(code,id){
  if(!id.endsWith('/CompleteHost.tsx'))return null;
  const anchor='current.current = { active, pending };';assert(code.includes(anchor));
  code=code.replace('await field.replaceImage({blob})', `await (async()=>{const result=await field.replaceImage({blob});if((window as any).__holdImage)await new Promise((_,reject)=>{(window as any).__rejectImage=()=>reject(new Error('Older image feedback'));});return result;})()`);
  return `import {TemplateRecoveryCleanupError as __TestCleanup} from '@sleinity/template-browser/persistence';\n`+code.replace(anchor,anchor+` (window as any).__starter={active,pending,storage,cleanupError:__TestCleanup};`);
 }};
 await build({root:temp,configFile:path.join(temp,'vite.config.ts'),plugins:[probe],logLevel:'error'});
 server=await preview({root:temp,configFile:path.join(temp,'vite.config.ts'),preview:{host:'127.0.0.1',port:0}});
 browser=await launchBrowser(false);const context=await browser.newContext({viewport:{width:1440,height:1600},acceptDownloads:true,reducedMotion:'reduce'});
 page=await context.newPage();page.setDefaultTimeout(40000);const errors=[],external=[];
 context.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(server.resolvedUrls.local[0]))external.push(r.url());});
 page.on('pageerror',e=>errors.push(e.message));
 const go=async()=>{await page.goto(server.resolvedUrls.local[0]);await page.waitForFunction(()=>Boolean(window.__starter));};
 const ready=()=>page.waitForFunction(()=>window.__starter.active?.session.getSnapshot().readiness.exportReady===true);
 const reopen=async(name)=>{const previous=await page.evaluate(()=>window.__starter.active?.id);await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(id=>Boolean(window.__starter.active&&window.__starter.active.id!==id),previous);await ready();};
 const input=()=>page.getByLabel('Load V2 JSON or exporter ZIPs',{exact:true});
 const prepare=async(selected,{testFontCorrection=false}={})=>{
  await input().setInputFiles(selected.map(f=>verifyFixture(manifest,f).path));
  for(let index=0;index<selected.length;index++){
   await page.waitForFunction(i=>window.__starter.pending?.sources[i]?.getSnapshot().pending?.busy===false,index);
   const view=await page.evaluate(i=>window.__starter.pending.sources[i].getSnapshot().pending,index);assert(view);
   if(testFontCorrection&&index===0&&view.requirements.some(r=>!r.exact)){
    const r=view.requirements.find(r=>!r.exact),fontInput=page.getByLabel(`Source ${index+1} font ${r.label}`,{exact:true});
    await fontInput.setInputFiles({name:'corrupt.ttf',mimeType:'font/ttf',buffer:Buffer.from('corrupt font')});
    await page.getByRole('alert').waitFor();await page.waitForFunction(i=>!window.__starter.pending.sources[i].getSnapshot().pending.busy,index);
    assert.equal(await page.getByRole('button',{name:'Open prepared sources',exact:true}).isEnabled(),false);
    const wrong=fonts.find(f=>!r.label.toLowerCase().includes(f.family.toLowerCase()));assert(wrong);
    await fontInput.setInputFiles(wrong.path);await page.getByRole('alert').waitFor();
    await page.waitForFunction(i=>!window.__starter.pending.sources[i].getSnapshot().pending.busy,index);
    assert.equal(await page.getByRole('button',{name:'Open prepared sources',exact:true}).isEnabled(),false);
    checks.push({scenario:'corrupt-and-mismatched-font-block-before-exact-correction',status:'pass'});
   }
   const raw=verifyFixture(manifest,selected[index]).template;
   for(const requirement of view.requirements.filter(r=>!r.exact)){
    const source=raw.fontRequirements.find(r=>r.id===requirement.id);assert(source,requirement.id);
    const font=fonts.find(f=>f.family.toLowerCase()===source.family.toLowerCase()&&f.weight===source.weight&&f.style===(source.cssStyle??'normal'));assert(font,requirement.label);
    await page.getByLabel(`Source ${index+1} font ${requirement.label}`,{exact:true}).setInputFiles(font.path);
    await page.waitForFunction(i=>window.__starter.pending.sources[i].getSnapshot().pending.busy===false,index);
   }
  }
  const previous=await page.evaluate(()=>window.__starter.active?.id);await page.getByRole('button',{name:'Open prepared sources',exact:true}).click();await page.waitForFunction(id=>Boolean(window.__starter.active&&window.__starter.active.id!==id),previous);await ready();
 };
 const textField=()=>page.evaluate(()=>{const f=window.__starter.active.session.getFieldControllers().find(f=>f.type==='text');return {id:f.id,label:f.label};});
 const save=async(name)=>{await page.getByLabel('Template name',{exact:true}).fill(name);await page.getByRole('button',{name:'Save template',exact:true}).click();await page.waitForFunction(()=>Boolean(window.__starter.active?.record&&window.__starter.active.lease));};
 await go();await prepare([fixtures[2]],{testFontCorrection:true});checks.push({scenario:'single-exact-zip-font-preparation',status:'pass'});

 // Controls use the real imported Carrousel. Choice/crop authoring below is an
 // explicitly configured derivative, not an additional exporter certification.
 const definitions=await page.evaluate(()=>window.__starter.active.session.getSnapshot().basePackage.editableFields);
 assert.deepEqual([...new Set(definitions.map(f=>f.type))].sort(),['boolean','color','date','image','number','text','textarea']);
 const values={text:'Starter text',textarea:'Starter body',number:20,date:'2026-12-05',color:'#123456'};
 const fields=Object.keys(values).map(type=>definitions.find(f=>f.type===type));
 const number=fields.find(f=>f.type==='number');
 const beforeNumber=await page.evaluate(id=>window.__starter.active.session.getFieldControllers().find(f=>f.id===id).value,number.id);
 await page.getByLabel(number.label,{exact:true}).fill('');
 assert.equal(await page.getByRole('button',{name:'Export PNG',exact:true}).isEnabled(),false);
 assert.equal(await page.evaluate(id=>window.__starter.active.session.getFieldControllers().find(f=>f.id===id).value,number.id),beforeNumber);
 await page.getByRole('button',{name:`Reset ${number.label}`,exact:true}).click();
 for(const f of fields){await page.getByLabel(f.label,{exact:true}).fill(String(values[f.type]));await page.getByRole('button',{name:`Reset ${f.label}`,exact:true}).click();}
 const boolean=definitions.find(f=>f.type==='boolean');await page.getByLabel(boolean.label,{exact:true}).setChecked(!boolean.defaultValue);await page.getByRole('button',{name:`Reset ${boolean.label}`,exact:true}).click();
 const image=definitions.find(f=>f.type==='image');
 for(const mode of ['suggested','restricted']){
  await page.evaluate(({fields,values,mode,image})=>{
   const updates=fields.map(f=>({...f,configuration:{...f.configuration,choices:{mode,options:[{id:'imported',value:f.defaultValue},{id:'other',value:values[f.type]}]}}}));
   updates.push({...image,configuration:{...image.configuration,replacementPlacement:'crop'}});
   window.__starter.active.session.configure({fields:updates});
  },{fields,values,mode,image});await ready();
  for(const f of fields){await page.getByLabel(`${f.label} choices`,{exact:true}).selectOption('other');assert.equal(await page.evaluate(id=>window.__starter.active.session.getFieldControllers().find(f=>f.id===id).value,f.id),values[f.type]);await page.getByRole('button',{name:`Reset ${f.label}`,exact:true}).click();}
 }
 const pixel={name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')};
 await page.getByLabel(`Replace ${image.label}`,{exact:true}).setInputFiles(pixel);await ready();
 await page.getByRole('button',{name:`Demonstrate center Crop ${image.label}`,exact:true}).click();await ready();
 assert.equal(await page.evaluate(id=>window.__starter.active.session.getFieldControllers().find(f=>f.id===id).value.placement.mode,image.id),'crop');
 await page.evaluate(()=>window.__holdImage=true);
 await page.getByLabel(`Replace ${image.label}`,{exact:true}).setInputFiles(pixel);
 await page.waitForFunction(()=>Boolean(window.__rejectImage));
 await page.getByRole('button',{name:`Reset ${image.label}`,exact:true}).click();
 await page.evaluate(()=>{window.__holdImage=false;window.__rejectImage();});await ready();
 assert.equal(await page.getByRole('alert').filter({hasText:'Older image feedback'}).count(),0);
 assert.equal(await page.evaluate(id=>window.__starter.active.session.getFieldControllers().find(f=>f.id===id).value.placement.mode,image.id),'imported');
 // Return to imported configuration before the independent save/recovery flow.
 await page.evaluate(fields=>window.__starter.active.session.configure({fields}),definitions);await ready();
 checks.push({scenario:'seven-typed-controls-invalid-number-choices-both-modes-crop-reset',status:'pass',configuredDerivative:true});
 // Controlled library write failure preserves the editor and retries explicitly.
 await page.evaluate(()=>{const r=window.__starter.storage.single,native=r.saveTemplateSessionV2.bind(r);let fail=true;r.saveTemplateSessionV2=(...args)=>{if(fail){fail=false;return Promise.reject(new Error('Controlled library write failed'));}return native(...args);};});
 await page.getByRole('button',{name:'Save template',exact:true}).click();await page.getByRole('alert').filter({hasText:'Controlled library write failed'}).waitFor();
 checks.push({scenario:'library-write-failure-preserves-editor-and-retries',status:'pass'});
 let field=await textField();await page.getByLabel(field.label,{exact:true}).fill('Bas saved');
 await page.evaluate(()=>{const r=window.__starter.storage.recovery,native=r.begin.bind(r);let fail=true;r.begin=(...args)=>{if(fail){fail=false;return Promise.reject(new Error('Controlled lease start failed'));}return native(...args);};});
 await page.getByLabel('Template name',{exact:true}).fill('Bas Single');await page.getByRole('button',{name:'Save template',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Controlled lease start failed'}).waitFor();
 assert.equal(await page.evaluate(()=>Boolean(window.__starter.active.record&&!window.__starter.active.lease)),true);
 await page.getByRole('button',{name:'Retry save / flush recovery',exact:true}).click();
 await page.waitForFunction(()=>Boolean(window.__starter.active.lease&&!window.__starter.active.getSnapshot().error));
 checks.push({scenario:'saved-library-survives-lease-start-failure-and-explicit-retry',status:'pass'});
 await page.getByLabel(field.label,{exact:true}).fill('Recovery content');await page.waitForFunction(()=>window.__starter.active.getSnapshot().dirty===false&&!window.__starter.active.getSnapshot().error);
 // Wait for the actual token-bound stored payload, not a fixed autosave delay.
 await page.waitForFunction(async()=>{const a=window.__starter.active;const r=await a.adapters.recovery.inspect(a.lease.key);return JSON.stringify(r?.payload.contentState).includes('Recovery content');});
 await go();await reopen('Resume Bas Single');
 assert((await page.evaluate(()=>JSON.stringify(window.__starter.active.session.getSnapshot().contentState))).includes('Recovery content'));
 checks.push({scenario:'save-reload-resume-assets-and-fonts',status:'pass'});
 await context.setOffline(true);await reopen('Fresh Bas Single');
 assert((await page.evaluate(()=>JSON.stringify(window.__starter.active.session.getSnapshot().contentState))).includes('Bas saved'));
 await context.setOffline(false);checks.push({scenario:'offline-reopen-after-app-load',status:'pass'});
 // Write failure remains dirty; manual Retry uses the same current lease.
 await page.evaluate(()=>{const r=window.__starter.storage.recovery,native=r.save.bind(r);let fail=true;r.save=(...args)=>{if(fail){fail=false;return Promise.reject(new Error('Controlled recovery write failed'));}return native(...args);};});
 field=await textField();await page.getByLabel(field.label,{exact:true}).fill('Retry content');
 await page.getByRole('alert').filter({hasText:'Controlled recovery write failed'}).waitFor();
 await page.getByRole('button',{name:'Retry save / flush recovery',exact:true}).click();await page.waitForFunction(()=>!window.__starter.active.getSnapshot().error&&!window.__starter.active.getSnapshot().dirty);
 checks.push({scenario:'recovery-write-failure-manual-retry',status:'pass'});
 // A failed replacement never removes accepted work.
 const accepted=await page.evaluate(()=>window.__starter.active.id);
 await input().setInputFiles({name:'broken.zip',mimeType:'application/zip',buffer:Buffer.from('broken')});await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>window.__starter.active.id),accepted);
 await page.getByRole('button',{name:'Cancel import',exact:true}).click();checks.push({scenario:'failed-import-preserves-accepted-work',status:'pass'});
 const beforeBatch=await page.evaluate(()=>window.__starter.active.id);
 await input().setInputFiles([{name:'valid-member.zip',mimeType:'application/zip',buffer:await readFile(verifyFixture(manifest,fixtures[0]).path)},{name:'bad-member.zip',mimeType:'application/zip',buffer:Buffer.from('bad')}]);
 await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>window.__starter.active.id),beforeBatch);
 assert.equal(await page.getByRole('button',{name:'Open prepared sources',exact:true}).isEnabled(),false);
 await page.getByRole('button',{name:'Cancel import',exact:true}).click();
 checks.push({scenario:'mixed-family-batch-blocked-atomically-and-cancelled',status:'pass'});
 const previousSession=await page.evaluate(()=>{window.__previousOutput=window.__starter.active;return window.__previousOutput.id;});
 await prepare(fixtures);assert.notEqual(await page.evaluate(()=>window.__starter.active.id),previousSession);await page.waitForFunction(()=>window.__previousOutput.disposed);assert.equal(await page.getByLabel('Design',{exact:true}).locator('option').count(),3);
 for(let index=0;index<3;index++){await page.getByLabel('Design',{exact:true}).selectOption({index});await ready();}
 await save('Bas Family');checks.push({scenario:'three-source-family-selection-and-save',status:'pass'});
 // Imperative pending exports are separately guarded by the public renderer;
 // this app also keeps its export button disabled while current readiness is pending.
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export PNG',exact:true}).click();await(await download).saveAs(path.join(out,'family.png'));
 await page.waitForFunction(()=>window.__starter.active.getSnapshot().finished);
 assert.equal(await page.evaluate(()=>{const a=window.__starter.active;return a.adapters.recovery.inspect(a.lease.key);}),null);
 checks.push({scenario:'current-family-png-completes-only-own-recovery',status:'pass'});
 // Cleanup-only retry must not execute the successful capture again.
 await reopen('Fresh Bas Single');
 await page.evaluate(()=>{const r=window.__starter.storage.recovery;r.exportAndComplete=async(_lease,capture)=>{await capture();throw new window.__starter.cleanupError(new Error('Controlled cleanup failure'));};});
 let downloads=0;page.on('download',()=>downloads++);const completed=page.waitForEvent('download');await page.getByRole('button',{name:'Export PNG',exact:true}).click();await completed;
 await page.getByRole('button',{name:'Retry cleanup only',exact:true}).click();await page.waitForFunction(()=>!window.__starter.active.getSnapshot().cleanupRequired);assert.equal(downloads,1);
 checks.push({scenario:'cleanup-only-retry-no-second-export',status:'pass'});
 // A second native lease supersedes the first; stale content cannot overwrite it.
 await reopen('Fresh Bas Single');
 const other=await context.newPage();await other.goto(server.resolvedUrls.local[0]);await other.waitForFunction(()=>Boolean(window.__starter));
 await other.getByRole('button',{name:'Fresh Bas Single',exact:true}).click();await other.waitForFunction(()=>Boolean(window.__starter.active?.lease));
 field=await textField();await page.getByLabel(field.label,{exact:true}).fill('Stale owner');
 await page.getByRole('button',{name:'Retry save / flush recovery',exact:true}).click();await page.getByRole('alert').waitFor();
 assert.equal(await page.evaluate(()=>Boolean(window.__starter.active.getSnapshot().error)),true);
 const currentLease=await other.evaluate(()=>window.__starter.active.lease);
 const stored=await other.evaluate(async()=>{const a=window.__starter.active;return a.adapters.recovery.inspect(a.lease.key);});
 assert(!JSON.stringify(stored).includes('Stale owner'));assert(currentLease);
 await other.getByRole('button',{name:'Discard recovery',exact:true}).click();await other.waitForFunction(()=>!window.__starter.active);
 assert.equal(await other.evaluate(key=>window.__starter.storage.recovery.inspect(key),currentLease.key),null);
 await other.close();checks.push({scenario:'superseded-tab-cannot-write-current-token-and-current-owner-discards',status:'pass'});

 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await page.screenshot({path:path.join(out,'host.png'),fullPage:true});
 await writeFile(path.join(out,'report.json'),JSON.stringify({status:'pass',manager,node:process.version,platform:process.platform,arch:process.arch,browser:browser.version(),deliveryManifestSha256:verified.manifestSha256,archives:verified.manifest.archives,starterSha256:sha256(bytes),fixtures:fixtures.map(f=>({id:f.id,sha256:f.zipSha256})),fonts:fonts.map(f=>({id:f.id,sha256:f.sha256})),checks,coverage:'automated actual extracted application; build-local test observation; no workspace SDK aliases or Studio modules; offline reopening after app load, not offline app bootstrap',published:false},null,2)+'\n');
 console.log(JSON.stringify({status:'pass',manager,checks:checks.length}));await context.close();
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});await writeFile(path.join(out,'failure-state.json'),JSON.stringify(await page.evaluate(()=>({body:document.body.innerText,active:window.__starter?.active?.session.getSnapshot(),pending:window.__starter?.pending?.sources.map(s=>s.getSnapshot())})),null,2));}await writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(error),checks},null,2));throw error;}
finally{await browser?.close();await server?.httpServer.close();await rm(temp,{recursive:true,force:true});}
