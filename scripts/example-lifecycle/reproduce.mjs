/** Executable pre-repair reproductions, using hash-verified retained source. */
import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve}from'node:path';import{createHash}from'node:crypto';
import{createStudioViteServer}from'../repository/studio-vite-server.mjs';import{launchBrowser}from'../fidelity/browser.mjs';import{loadManifest,verifyFixture}from'../fidelity/core.mjs';import{unzipSync}from'fflate';
const base='docs/architecture/evidence/v2-example-lifecycle-20261013/baseline',id=JSON.parse(await readFile(`${base}/identity.json`,'utf8')),p='examples/template-editor-integration/src/FieldRulesV2Host.tsx';const original=await readFile(`${base}/${p}`);assert.equal(createHash('sha256').update(original).digest('hex'),id.sources[p]);
const instrumented=original.toString().replace('const session = useTemplateSessionV2();','const session = useTemplateSessionV2(); (window as any).__baseline.capture(session);').replace('await action();','await action(); (window as any).__baseline.completions++;').replace('catch (cause) { setError(String(cause)); }','catch (cause) { (window as any).__baseline.completions++; setError(String(cause)); }');
const f=loadManifest().fixtures.find(f=>f.id==='exporter-061-carrousel'),verified=verifyFixture(loadManifest(),f),files=unzipSync(verified.bytes),json=JSON.parse(new TextDecoder().decode(files['template.json']));
const server=await createStudioViteServer({plugins:[{name:'retained-v2-example',enforce:'pre',transform(_code,path){return path.split('?')[0]===resolve(p)?{code:instrumented,map:null}:null;}}]});server.middlewares.use(async(req,res,next)=>{if(req.url==='/__baseline'){res.setHeader('content-type','text/html');res.end(await server.transformIndexHtml('/__baseline',`<!doctype html><div id="root"></div><script type="module" src="/@fs/${resolve('scripts/example-lifecycle/baseline-host.tsx')}"></script>`));return;}next();});server.middlewares.stack.unshift(server.middlewares.stack.pop());await server.listen();const browser=await launchBrowser(false),rows=[];
const choose=async(page,value,name)=>page.getByLabel('Load V2 JSON or exporter ZIP',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
const gate=async(page,method,name)=>page.evaluate(({method,name})=>{const original=File.prototype[method];File.prototype[method]=function(){if(this.name!==name)return original.call(this);return new Promise((resolve,reject)=>{window.__baseline.release=()=>resolve(original.call(this));window.__baseline.reject=()=>reject(new Error('Older read failed'));});};},{method,name});
try{
 for(const scenario of['carrousel-url-leak','late-failure','invalid-replacement','unmount-during-read']){
  const context=await browser.newContext(),page=await context.newPage();await page.goto(server.resolvedUrls.local[0]+'__baseline');await page.waitForFunction(()=>Boolean(window.__baseline?.current));
  if(scenario==='carrousel-url-leak'){
   await page.getByLabel('Load V2 JSON or exporter ZIP',{exact:true}).setInputFiles(verified.path);await page.waitForFunction(()=>window.__baseline.current.getSnapshot().status==='ready');
   const urls=await page.evaluate(()=>Object.values(window.__baseline.current.getSnapshot().basePackage.assets).flatMap(a=>a.stableUrl?.startsWith('blob:')?[a.stableUrl]:[]));assert.equal(urls.length,2);
   await page.evaluate(()=>window.__baseline.unmount());await page.waitForFunction(()=>window.__baseline.disposals===1);
   const revoked=await page.evaluate(()=>window.__baseline.revoked);assert.equal(urls.filter(url=>revoked.includes(url)).length,0);rows.push({scenario,expectedFinalReleases:2,observedFinalReleases:0,leakedUrls:2});
  }else if(scenario==='unmount-during-read'){
   await gate(page,'arrayBuffer',f.filename);await page.getByLabel('Load V2 JSON or exporter ZIP',{exact:true}).setInputFiles(verified.path);await page.waitForFunction(()=>Boolean(window.__baseline.release));await page.evaluate(()=>window.__baseline.unmount());await page.waitForFunction(()=>window.__baseline.disposals===1);await page.evaluate(()=>window.__baseline.release());await page.waitForFunction(()=>window.__baseline.completions===1);
   const stats=await page.evaluate(()=>({created:window.__baseline.created.length,revoked:window.__baseline.revoked.length}));assert.deepEqual(stats,{created:2,revoked:0});rows.push({scenario,...stats});
  }else{
   const valid={...JSON.parse(await readFile('src/template-package/fixtures/figma-plugin-v0.4.1.json','utf8')),name:'New accepted source'};
   if(scenario==='late-failure'){await gate(page,'text','slow.json');await choose(page,valid,'slow.json');await page.waitForFunction(()=>Boolean(window.__baseline.reject));}
   await choose(page,valid,'valid.json');await page.waitForFunction(()=>window.__baseline.current.getSnapshot().status==='ready');
   if(scenario==='late-failure'){await page.evaluate(()=>window.__baseline.reject());await page.getByRole('alert').filter({hasText:'Older read failed'}).waitFor();rows.push({scenario,acceptedName:await page.evaluate(()=>window.__baseline.current.getSnapshot().basePackage.name),obsoleteFailureVisible:true});}
   else{await choose(page,{},'invalid.json');await page.waitForFunction(()=>window.__baseline.current.getSnapshot().status==='blocked');rows.push({scenario,acceptedStateBefore:'ready',acceptedStateAfter:'blocked'});}
   await page.evaluate(()=>window.__baseline.unmount());
  }
  await context.close();
 }
 await mkdir(`${base}/runs`,{recursive:true});await writeFile(`${base}/runs/reproduction.json`,JSON.stringify({sourceSha256:id.sources[p],fixtureZipSha256:f.zipSha256,chromium:browser.version(),sourceCertification:false,evidence:'automated failing original host; instrumentation observes public session and URL APIs',rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
}finally{await browser.close();await server.close();}
