/** Test-only paired editor workload. Does not touch user browser storage or references. */
import assert from 'node:assert/strict';
import { writePacket } from '../text-geometry/packets.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer as httpServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { build, createServer } from 'vite';
import { loadManifest, resolveFixture, verifyFixture } from '../fidelity/core.mjs';
import { selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { loadExactFontManifest } from '../fidelity/fonts.mjs';
import { launchBrowser } from '../fidelity/browser.mjs';
const root = process.cwd(), args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const phase = option('--phase', 'paired'), mode = option('--mode', 'production'), trials = Number(option('--trials', '5'));
const familyIndex = Number(option('--family-index', '2'));
assert(Number.isInteger(familyIndex) && familyIndex >= 0 && familyIndex < 3);
const motion = option('--motion', 'reduce');
assert(['reduce', 'no-preference'].includes(motion));
assert(['before','current','paired'].includes(phase)); assert(['production','development'].includes(mode)); assert(trials > 0);
const out = resolve(option('--output', 'fidelity/evidence/editor-performance'));
await mkdir(out, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baseline = JSON.parse(await readFile(join(root, option('--baseline','docs/architecture/evidence/editor-performance-baseline/identity.json')), 'utf8'));
const originals = {};
for (const [file, identity] of Object.entries(baseline.files)) { const bytes = await readFile(identity.path); assert.equal(hash(bytes), identity.sha256); originals[resolve(file)] = bytes.toString(); }
const manifest = loadManifest(), fixtures = selectSdkGateFixtures(manifest), fonts = loadExactFontManifest(fixtures.flatMap(f => f.requiredFonts ?? []));
const inputs = new Map();
for (const font of fonts.fonts) inputs.set(`/inputs/${font.id}.font`, await readFile(font.path));
for (const fixture of fixtures) {
  verifyFixture(manifest, fixture);
  inputs.set(`/inputs/${fixture.id}.zip`, await readFile(resolveFixture(manifest, fixture)));
  inputs.set(`/inputs/${fixture.id}.json`, Buffer.from(JSON.stringify({ filename: fixture.filename, fonts: fonts.fonts.map(f => ({ id: f.id, family: f.family, weight: f.weight, style: f.style, sha256: f.sha256, filename: f.path.split('/').at(-1) })) })));
}
function instrumentation(before) { return { name: 'isolated-editor-evidence', enforce: 'pre', transform(source, id) {
  const file = id.split('?')[0];
  if (before && originals[file]) source = originals[file];
  if (args.includes('--publication-order-baseline') && file.endsWith('/useCoreLayoutRuntime.ts')) {
    assert(originals[file], 'Ordering reproduction requires retained hash-verified runtime');
    source = originals[file];
  }
  if (args.includes('--latency-only')) return before && originals[file] ? { code: source, map: null } : null;
  if (args.includes('--resource-counters') && file.endsWith('/harness.tsx')) {
    assert(source.includes('stop = session.subscribe(() => {'));
    return { code: source.replace('stop = session.subscribe(() => {', 'stop = session.subscribe(() => { window.__editorWork ??= {}; window.__editorWork.nativeNotificationsObserved = (window.__editorWork.nativeNotificationsObserved ?? 0) + 1;'), map: null };
  }
  const component = file.endsWith('/DraftEditor.tsx') ? 'DraftEditor' : file.endsWith('/SetupPreview.tsx') ? 'SetupPreview' : file.endsWith('/FieldContentEditorV2.tsx') ? 'FieldContentEditorV2' : null;
  if (component) {
    const marker = source.indexOf(`export function ${component}(`), end = source.indexOf(') {', marker);
    assert(marker >= 0 && end > marker, `Component instrumentation ${file}`);
    source = source.slice(0, end + 3) + `\n window.__editorWork ??= {}; window.__editorWork.${component}Renders = (window.__editorWork.${component}Renders ?? 0) + 1; __auditCommit(() => { window.__editorWork.${component}Commits = (window.__editorWork.${component}Commits ?? 0) + 1; });\n` + source.slice(end + 3);
    source = `import { useLayoutEffect as __auditCommit } from 'react';\n` + source;
  }
  if (file.endsWith('/studioRecords.ts')) source = source.replace('    const snapshot = session.getSnapshot();\n    if (!snapshot.contentState)', '    window.__editorWork ??= {}; window.__editorWork.recordCaptures = (window.__editorWork.recordCaptures ?? 0) + 1;\n    const snapshot = session.getSnapshot();\n    if (!snapshot.contentState)');
  if(file.endsWith('/TemplatePackageRenderer.tsx')) {
    source=source.replaceAll('    if (!enabled || !boxRef.current || !paintRef.current) {', `    if (!enabled || !boxRef.current || !paintRef.current) { window.__textGeometryEvents ??= [];window.__textGeometryEvents.push({kind:'disabled',at:performance.now(),nodeId:boxRef.current?.dataset.packageNodeId,enabled,paint:Boolean(paintRef.current),key:measurementKey});`);
    source=source.replaceAll('    if (reusable && cached.current) {', `    window.__textGeometryEvents ??= [];window.__textGeometryEvents.push({kind:'dependency-validation',at:performance.now(),nodeId:boxRef.current?.dataset.packageNodeId,key:measurementKey,reusable:Boolean(reusable),previousInputs:cached.current?.inputs,inputs,previousKey:cached.current?.value.measurementKey});
    if (reusable && cached.current) {`);
    source=source.replaceAll('const measure = () => {', `const measure = () => { window.__textGeometryEvents ??= []; window.__textGeometryEvents.push({kind:'measurement-callback',disposed,connected:Boolean(paintRef.current?.isConnected),at:performance.now(),nodeId:boxRef.current?.dataset.packageNodeId,key:measurementKey}); window.__editorWork.textMeasurementCallbacks=(window.__editorWork.textMeasurementCallbacks??0)+1;`);
    source=source.replace('  return measurement?.measurementKey === measurementKey ? measurement : null;', `  useLayoutEffect(()=>{window.__textGeometryEvents ??= [];window.__textGeometryEvents.push({kind:'intrinsic-commit',at:performance.now(),nodeId:boxRef.current?.dataset.packageNodeId,key:measurementKey,available:measurement?.measurementKey===measurementKey,stateKey:measurement?.measurementKey,publication:boxRef.current?.closest('[data-template-package-canvas]')?.getAttribute('data-package-settlement-generation')});});
  return measurement?.measurementKey === measurementKey ? measurement : null;`);
  }
  if(file.endsWith('/useCoreLayoutRuntime.ts')) {
    source=source.replace(/use(Effect|LayoutEffect)\(\(\) => setMeasurements\(\{\}\), \[publicationGeneration, revision\]\);/, (_match, phase) => `use${phase}(() => { window.__textGeometryEvents ??= [];window.__textGeometryEvents.push({kind:'runtime-clear',at:performance.now(),generation:publicationGeneration});setMeasurements({}); }, [publicationGeneration, revision]);`);
    source=source.replace('    const current = { ...measurement, revision, publicationGeneration };', `    window.__textGeometryEvents ??= [];window.__textGeometryEvents.push({kind:'runtime-publication',at:performance.now(),nodeId:measurement.nodeId,generation:publicationGeneration});
    const current = { ...measurement, revision, publicationGeneration };`);
  }
  const names = file.endsWith('/materializeTemplateFieldContentV2.ts') ? ['materializeTemplateFieldContentV2'] : file.endsWith('/validateTemplatePackageV2.ts') ? ['validateTemplatePackageV2'] : [];
  for (const name of names) { source = source.replace(`export function ${name}(`, `function measured_${name}(`); source += `\nexport function ${name}(...args: Parameters<typeof measured_${name}>) { window.__editorWork ??= {}; window.__editorWork.${name} = (window.__editorWork.${name} ?? 0) + 1; return measured_${name}(...args); }\n`; }
  return component || file.endsWith('/useCoreLayoutRuntime.ts') || file.endsWith('/TemplatePackageRenderer.tsx') || names.length || file.endsWith('/studioRecords.ts') || before && originals[file] ? { code: source, map: null } : null;
} }; }
const versions = phase === 'paired' ? ['before','current'] : [phase];
const servers = {};
for (const version of versions) {
  const config = { configFile: resolve('apps/studio/vite.config.ts'), plugins: [instrumentation(version === 'before')], logLevel: 'error' };
  if (mode === 'production') {
    const dist = join(out, `build-${version}`);
    await build({ ...config, root, build: { outDir: dist, emptyOutDir: true, rollupOptions: { input: resolve('scripts/editor-performance/index.html') } } });
    const server = httpServer(async (request, response) => {
      try { const url = request.url.split('?')[0]; const bytes = inputs.get(url) ?? await readFile(join(dist, url === '/' ? 'scripts/editor-performance/index.html' : url)); response.setHeader('Content-Type', url.startsWith('/inputs/') ? 'application/octet-stream' : ({'.js':'text/javascript','.css':'text/css','.html':'text/html'}[extname(url)] ?? 'text/html')); response.end(bytes); } catch { response.statusCode = 404; response.end(); }
    }); await new Promise(r => server.listen(0, '127.0.0.1', r)); servers[version] = { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(r => server.close(r)) };
  } else {
    const server = await createServer({ ...config, root, server: { host: '127.0.0.1', port: 0 } });
    server.middlewares.use((req, res, next) => { const bytes = inputs.get(req.url?.split('?')[0]); if (bytes) { res.end(bytes); return; } next(); });
    const middleware = server.middlewares.stack.pop(); server.middlewares.stack.unshift(middleware);
    await server.listen(); servers[version] = { url: server.resolvedUrls.local[0] + 'scripts/editor-performance/index.html', close: () => server.close() };
  }
}
const browser = await launchBrowser(false);
const currentHash = async file => { try { return hash(await readFile(file)); } catch(error) { if(error.code==='ENOENT' && file==='packages/template-react/src/internal/templateSessionContext.tsx') return 'retired-to-test-only'; throw error; } };
const record = { schemaVersion: 'editor-performance-v1', commit: execFileSync('git', ['rev-parse','HEAD'], { encoding: 'utf8' }).trim(), mode, phase, trials, browser: browser.version(), node: process.version, platform: process.platform, arch: process.arch, viewport: { width:1440,height:1600 }, deviceScaleFactor:1, familyIndex, reducedMotion:motion, selectedScenarios:args.includes('--scenario')?[option('--scenario')]:[...fixtures.map(f=>f.id),'family'], fixtures: fixtures.map(f => ({ id:f.id,zipSha256:f.zipSha256 })), fonts:fonts.fonts.map(f => ({id:f.id,sha256:f.sha256})), baseline:baseline.files, current:Object.fromEntries(await Promise.all([...new Set([...Object.keys(baseline.files),'packages/template-react/src/internal/runtime-routing/textMeasurementInputs.ts'])].filter(f=>!f.endsWith('/textMeasurementInputs.ts')||phase!=='before').map(async f => [f,await currentHash(f)]))), sourceOverrides:args.includes('--publication-order-baseline')?{runtime:baseline.files['packages/template-react/src/internal/runtime-routing/useCoreLayoutRuntime.ts']}:null, instrumentationProfile:args.includes('--latency-only')?'latency-minimal':'detailed-frame-and-call-trace', paintPolicy:'input event to next animation-frame opportunity; proxy, not compositor paint timing', rows:[], failures:[] };
const save = () => writePacket(join(out, `${mode}-${phase}.json`), record);
try {
  for (const scenario of [...fixtures.map(f => ({ id:f.id, ids:[f.id] })), { id:'family',ids:fixtures.map(f=>f.id) }].filter(s=>!args.includes('--scenario')||s.id===option('--scenario'))) {
    for (let trial = -1; trial < trials; trial++) for (const version of (trial % 2 ? [...versions].reverse() : versions)) {
      const context = await browser.newContext({ viewport:record.viewport,deviceScaleFactor:1, locale:'en-US',timezoneId:'UTC',reducedMotion:motion,acceptDownloads:true });
      if (args.includes('--resource-counters')) await context.addInitScript(() => {
        const count = name => { window.__editorWork ??= {}; window.__editorWork[name] = (window.__editorWork[name] ?? 0) + 1; };
        const create = URL.createObjectURL, revoke = URL.revokeObjectURL, load = FontFace.prototype.load, add = document.fonts.add;
        URL.createObjectURL = function(...args) { count('objectUrlAllocations'); return create.apply(this,args); };
        URL.revokeObjectURL = function(...args) { count('objectUrlReleases'); return revoke.apply(this,args); };
        FontFace.prototype.load = function(...args) { count('fontFaceLoads'); return load.apply(this,args); };
        document.fonts.add = function(...args) { count('fontFaceAdds'); return add.apply(this,args); };
      });
      const page = await context.newPage(); page.setDefaultTimeout(35000); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
      try {
        await page.goto(servers[version].url); await page.waitForFunction(()=>Boolean(window.editorProbe));
        await page.evaluate(({ ids,family,latencyOnly })=>{window.__editorLatencyOnly=latencyOnly;return window.editorProbe.start(ids,family);},{ ids:scenario.ids,family:scenario.id==='family',latencyOnly:args.includes('--latency-only') });
        await page.getByTestId('studio-draft-editor').waitFor();
        if(scenario.id==='family') await page.evaluate(index=>window.editorProbe.selectIndex(index), familyIndex);
        await page.waitForFunction(()=>window.editorProbe.state().readiness.exportReady);
        const fields = await page.evaluate(()=>window.editorProbe.fields);
        const field = (scenario.id === 'exporter-061-carrousel' || scenario.id === 'family' && familyIndex === 2) ? fields.find(f=>f.id==='text:subtitle') : fields.find(f=>f.type==='text') ?? fields.find(f=>f.type==='textarea');
        const body = fields.find(f=>f.type==='textarea');
        for (const workload of ['burst','continuous','multiline']) {
          const target = workload === 'multiline' ? body : field;
          if (!target) throw new Error('Required workload field missing');
          const input = page.locator(`[id$="${encodeURIComponent(target.id)}"]`); await input.fill('Seed');
          await page.waitForFunction(({nodeId})=>document.querySelector(`[data-package-node-id="${nodeId}"]`)?.textContent?.includes('Seed') && window.editorProbe.state().readiness.exportReady, target);
          await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();
          await page.evaluate(target=>{
            window.__priorTextGeometryEvents=window.__textGeometryEvents;window.__editorWork={}; window.__textGeometryEvents=[]; window.editorProbe.acceptances=[]; window.editorProbe.rendererEvidence=[];
            const input=document.querySelector(`[id$="${encodeURIComponent(target.id)}"]`),canvas=document.querySelector('[data-template-package-canvas]'),stage=document.querySelector('.studio-setup-canvas');
            const trace={ inputs:[], frames:[], previews:[], longTasks:[], finished:false,start:performance.now() }; window.editorProbe.trace=trace;
            const listener=()=>{ const row={at:performance.now(),value:input.value,paintOpportunityMs:null,handlerMs:null};trace.inputs.push(row);queueMicrotask(()=>row.handlerMs=performance.now()-row.at);requestAnimationFrame(()=>row.paintOpportunityMs=performance.now()-row.at); };
            input.addEventListener('input',listener);
            // This listener runs after React's delegated root listener and its
            // callback checkpoint; target-listener microtasks alone exclude React.
            const root=document.getElementById('root');
            const completed=event=>{if(event.target===input){const row=trace.inputs.at(-1);if(row)row.reactEventMs=performance.now()-row.at;}};
            root.addEventListener('input',completed);
            const long=new PerformanceObserver(list=>trace.longTasks.push(...list.getEntries().map(e=>({at:e.startTime,duration:e.duration}))));long.observe({type:'longtask',buffered:false});
            let last='';let frame;
            const sample=()=>{const at=performance.now(),text=document.querySelector(`[data-package-node-id="${target.nodeId}"]`)?.textContent??''; if(text!==last){trace.previews.push({at,text});last=text;}
              const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
              if(!window.__editorLatencyOnly) trace.frames.push({at,canonicalRevision:window.editorProbe.state().revision,nodes:Object.fromEntries([...canvas.querySelectorAll('[data-package-node-id]')].map(n=>[n.dataset.packageNodeId,rect(n)])),nodeEvidence:Object.fromEntries([...canvas.querySelectorAll('[data-package-node-id]')].map(n=>[n.dataset.packageNodeId,{text:n.textContent,style:n.style.cssText,computedHeight:getComputedStyle(n).height,computedMinHeight:getComputedStyle(n).minHeight,computedFlex:getComputedStyle(n).flex,computedAlign:getComputedStyle(n).alignSelf,animations:n.getAnimations().map(a=>({state:a.playState,effect:a.effect?.getKeyframes()})),clientHeight:n.clientHeight,paintStyle:n.querySelector('[data-package-text-paint-box]')?.style.cssText,attributes:Object.fromEntries(['data-package-runtime-ownership','data-package-text-font-state','data-package-text-trim-authority','data-package-text-layout-box','data-package-runtime-settlement'].map(a=>[a,n.getAttribute(a)]))}])),stage:rect(stage),transform:canvas.parentElement.style.transform,fonts:document.fonts.status,attributes:Object.fromEntries([...canvas.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])),readiness:window.editorProbe.state().readiness});
              if((window.__editorLatencyOnly||trace.frames.length<500)&&!trace.finished)frame=requestAnimationFrame(sample);};frame=requestAnimationFrame(sample);
            window.editorProbe.stopTrace=()=>{trace.finished=true;cancelAnimationFrame(frame);input.removeEventListener('input',listener);root.removeEventListener('input',completed);long.disconnect();};
          },target);
          await input.focus();
          const text = workload === 'multiline' ? 'One\nTwo\nThree' : workload === 'burst' ? 'ABCDEF' : 'abcdefghijklmnopqrst';
          const cadence = workload === 'continuous' ? 50 : 30;
          // Absolute driver deadlines are workload pacing, never readiness waits.
          const start=performance.now();
          for(const [index,char] of [...text].entries()){const delay=start+index*cadence-performance.now();if(delay>0)await new Promise(r=>setTimeout(r,delay));await page.keyboard.insertText(char);}
          const final='Seed'+text;
          await page.waitForFunction(({nodeId,value})=>document.querySelector(`[data-package-node-id="${nodeId}"]`)?.textContent?.includes(value)&&window.editorProbe.state().readiness.exportReady,{nodeId:target.nodeId,value:final});
          await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();
          const evidence=await page.evaluate(()=>{window.editorProbe.stopTrace();return {trace:window.editorProbe.trace,state:window.editorProbe.state(),measurementEvents:window.__textGeometryEvents,priorMeasurementEvents:window.__priorTextGeometryEvents,publicationEvents:window.editorProbe.rendererEvidence,status:document.querySelector('.studio-draft-toolbar [role="status"]')?.textContent};});
          const inputs=evidence.trace.inputs, finalPreview=evidence.trace.previews.find(p=>p.text.includes(final));
          assert(finalPreview,'Final preview must be observed, not inferred from readiness'); assert.equal(await input.inputValue(),final);
          if(trial>=0)record.rows.push({scenario:scenario.id,trial,version,workload,fieldId:target.id,nodeId:target.nodeId,inputPaintOpportunityMs:inputs.map(i=>i.paintOpportunityMs),inputTargetListenerMs:inputs.map(i=>i.handlerMs),inputHandlerMs:inputs.map(i=>i.reactEventMs),previewCatchUpMs:finalPreview.at-inputs.at(-1).at,intermediateDuringTyping:evidence.trace.previews.filter(p=>p.at>inputs[0].at&&p.at<inputs.at(-1).at&&inputs.some(i=>p.text.includes(i.value))).length,...evidence});
          await save();
        }
        assert.deepEqual(errors,[]);
        if (scenario.id==='family') { await page.evaluate(()=>window.editorProbe.selectNext()); await page.waitForFunction(()=>window.editorProbe.state().readiness.exportReady); }
        await page.evaluate(()=>window.editorProbe.dispose());
      } catch(error) { record.failures.push({scenario:scenario.id,trial,version,error:String(error),errors}); await page.screenshot({path:join(out,`failure-${mode}-${version}-${scenario.id}.png`),fullPage:true}); await save(); throw error; }
      finally { await context.close(); }
      console.log(`[editor-performance] ${mode} ${scenario.id} ${version} trial=${trial}`);
    }
  }
} finally { await save(); await browser.close(); for(const server of Object.values(servers))await server.close(); }
const stats=values=>{const ordered=values.filter(Number.isFinite).sort((a,b)=>a-b);return {median:ordered[Math.floor(ordered.length*.5)],p95:ordered[Math.min(ordered.length-1,Math.floor(ordered.length*.95))]};};
record.summary=[];
for(const scenario of [...fixtures.map(f=>f.id),'family'])for(const version of versions)for(const workload of ['burst','continuous','multiline']){const rows=record.rows.filter(r=>r.scenario===scenario&&r.version===version&&r.workload===workload);record.summary.push({scenario,version,workload,paintOpportunity:stats(rows.flatMap(r=>r.inputPaintOpportunityMs)),inputHandler:stats(rows.flatMap(r=>r.inputHandlerMs)),catchUp:stats(rows.map(r=>r.previewCatchUpMs)),intermediate:rows.map(r=>r.intermediateDuringTyping),work:rows.map(r=>r.state.work),longTasks:rows.flatMap(r=>r.trace.longTasks)});}
await save(); console.log(JSON.stringify(record.summary,null,2));
