/** Diagnostic-only imperative PNG guard; production modules are unmodified. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createStudioViteServer } from '../../../../scripts/repository/studio-vite-server.mjs';
import { loadManifest, verifyFixture } from '../../../../scripts/fidelity/core.mjs';
import { selectSdkGateFixtures } from '../../../../scripts/fidelity/gate-profile.mjs';
import { loadExactFontManifest } from '../../../../scripts/fidelity/fonts.mjs';
import { launchBrowser } from '../../../../scripts/fidelity/browser.mjs';
import { PNG } from 'pngjs';
const output = resolve(import.meta.dirname), manifest = loadManifest(), fixtures = selectSdkGateFixtures(manifest);
const fonts = loadExactFontManifest(fixtures.flatMap(f => f.requiredFonts ?? [])).fonts, inputs = new Map();
for (const f of fonts) inputs.set(`/inputs/${f.id}.font`, await readFile(f.path));
for (const f of fixtures) {
  inputs.set(`/inputs/${f.id}.zip`, Buffer.from(verifyFixture(manifest, f).bytes));
  inputs.set(`/inputs/${f.id}.json`, Buffer.from(JSON.stringify({ filename: f.filename, fonts: fonts.map(f => ({ ...f, filename: f.path.split('/').at(-1) })) })));
}
const plugin = { name: 'imperative-png-diagnostic', enforce: 'pre', transform(code, id) {
  if (id.endsWith('/DraftEditor.tsx')) return code.replace('  const renderer = useRef<TemplateFieldSessionRendererV2Handle>(null);', '  const renderer = useRef<TemplateFieldSessionRendererV2Handle>(null); (window as any).__directPng = () => renderer.current?.exportPng();');
  if (id.endsWith('/editor-performance/harness.tsx')) return code
    .replace('    const first = packages[0];', `    const asset = Object.values(packages[1].assets).find(a => a.type === 'image')!; packages[1].assets = {...packages[1].assets, [asset.id]: {...asset, stableUrl:location.origin+'/pending.png'}};\n    const first = packages[0];`)
    .replace('session = studioRecords.openSession(seed);', 'session = studioRecords.openSession(seed); (window as any).__directSession=session;')
    .replace('(session as any).load(seed.family)', '(session as any).load(seed.family,{selectedVariantId:seed.family.variants[1].id})');
} };
const server = await createStudioViteServer({ plugins: [plugin] });
server.middlewares.use(async(req,res,next) => {
  const input = inputs.get(req.url?.split('?')[0]); if(input){res.end(input);return;}
  if(req.url === '/__direct'){res.setHeader('content-type','text/html');res.end(await server.transformIndexHtml('/__direct',`<div id="root"></div><script type="module" src="/@fs/${resolve('scripts/editor-performance/harness.tsx')}"></script>`));return;} next();
});
server.middlewares.stack.unshift(server.middlewares.stack.pop()); await server.listen();
const browser = await launchBrowser(false), rows = [];
try {
  for (const mode of ['pending', 'blocked']) {
    const context = await browser.newContext({ viewport: { width:1440,height:1600 }, reducedMotion:'reduce' }), page = await context.newPage();
    let release; const held = new Promise(r=>{release=r;}); let started; const requested = new Promise(r=>{started=r;});
    const p = new PNG({width:4,height:3});p.data.fill(255);
    await page.route('**/pending.png',async route=>{started();if(mode==='pending')await held;await route.fulfill({contentType:'image/png',body:mode==='pending'?PNG.sync.write(p):Buffer.from('invalid')});});
    try {
      await page.goto(server.resolvedUrls.local[0]+'__direct'); await page.waitForFunction(()=>Boolean(window.editorProbe));
      await page.evaluate(ids=>window.editorProbe.start(ids,true),fixtures.map(f=>f.id));await requested;
      await page.waitForFunction(mode=>window.__directSession.getSnapshot().readiness.assets===(mode==='pending'?'pending':'blocked')&&Boolean(window.__directPng),mode);
      const rejection=await page.evaluate(async()=>{try{await window.__directPng();return null;}catch(e){return String(e);}});
      assert.match(rejection,/current renderer-backed field validation and render readiness/);
      if(mode==='pending'){
        release();await page.waitForFunction(()=>window.__directSession.getSnapshot().readiness.exportReady);
        const stale=await page.evaluate(()=>{const old=window.editorProbe.rendererEvidence.find(e=>e.method==='publishRuntimeReadiness'&&e.accepted)?.evidence;const field=window.__directSession.getFieldControllers().find(f=>f.type==='text');field.setValue('Current PNG');return old?window.__directSession.publishRuntimeReadiness(old):null;});
        assert.equal(stale,false);await page.waitForFunction(()=>window.__directSession.getSnapshot().readiness.exportReady);
        const result=await page.evaluate(async()=>{const r=await window.__directPng();return{width:r.width,height:r.height};});assert(result.width>0&&result.height>0);
        rows.push({mode,rejection,staleEvidenceAccepted:stale,png:result,status:'pass'});
      }else rows.push({mode,rejection,status:'pass'});
    } finally {release();await context.close();}
  }
  await writeFile(resolve(output,'direct-png.json'),JSON.stringify({profile:'automated headless development components; diagnostic media substitution only',browser:browser.version(),rows},null,2)+'\n');console.log('Direct pending/blocked PNG attempts reject; stale evidence rejects; current settled PNG succeeds.');
} finally {await browser.close();await server.close();}
