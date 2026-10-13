/** Event-driven real IndexedDB upgrade evidence; no fixed waits or destructive recovery. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {createPackedStorageHost} from './blocked-storage-packed-host.mjs';
import {createCompactLifecycleFixture} from '../compact-lifecycle-fixture.mjs';
import {readFile} from 'node:fs/promises';
import {strFromU8,unzipSync} from 'fflate';
import { chromium } from 'playwright';
import { createStudioViteServer } from './studio-vite-server.mjs';
const args = process.argv.slice(2), baseline = args.includes('--baseline');
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key)+1] : fallback;
const output = option('--output', 'fidelity/evidence/blocked-storage/current');
const root = process.cwd();
const archives=option("--archives",null), manager=option("--manager","pnpm");let packed;
const source = baseline ? 'docs/architecture/evidence/blocked-storage-20261012/baseline/packages/template-browser/src/storage/indexedDb.ts' : 'packages/template-browser/src/storage/indexedDb.ts';
if(baseline){const identity=JSON.parse(await readFile("docs/architecture/evidence/blocked-storage-20261012/baseline/identity.json","utf8"));assert.equal(createHash("sha256").update(await readFile(source)).digest("hex"),identity.originalSources["packages/template-browser/src/storage/indexedDb.ts"]);}
const server = await createStudioViteServer(); let browser;
try {
  await server.listen(); browser = await chromium.launch({headless:true}); const context = await browser.newContext(); const page = await context.newPage();
  await page.route(server.resolvedUrls.local[0], route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Isolated storage probe</title>" }));
  await page.goto(server.resolvedUrls.local[0]);
  const result = await page.evaluate(async ({ entry, baseline }) => {
    const events = [], outcomes = []; const log = name => events.push({ name, ms: performance.now() });
    const open = indexedDB.open('template-package-platform', 4);
    const holder = await new Promise((resolve, reject) => { open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
    holder.onversionchange = () => log('older-version-change-kept-open');
    const nativeOpen = indexedDB.open.bind(indexedDB); let requests = 0; let latestRequest; let unblock;
    const blocked = new Promise(resolve => { unblock = resolve; });
    let endNative;
    const nativeEnd = new Promise(resolve => { endNative = resolve; });
    indexedDB.open = (...args) => {
      requests++; log('open-request'); const request = nativeOpen(...args); latestRequest = request;
      for (const event of ['upgradeneeded','blocked','success','error']) request.addEventListener(event, () => { log(event); if(event==='blocked') unblock(); });
      return request;
    };
    const sdk = await import(entry);
    const describe = error => ({ name:error?.name,code:error?.code,databaseName:error?.databaseName,requestedVersion:error?.requestedVersion,retryable:error?.retryable,message:error?.message });
    const calls = Array.from({length:3}, () => sdk.openTemplatePlatformDatabase().then(db => { outcomes.push('success'); return db; }, error => { outcomes.push('rejected'); return describe(error); }));
    latestRequest.addEventListener("success", () => endNative());
    latestRequest.addEventListener("error", () => endNative());
    await blocked;
    if (baseline) { await Promise.resolve(); log('observed-pending'); }
    else { await Promise.all(calls); log('all-callers-rejected'); for (let i=0;i<10;i++) await sdk.openTemplatePlatformDatabase().catch(error => { outcomes.push(describe(error)); }); }
    const beforeClose = { requests, outcomes: [...outcomes] };
    holder.close(); log('blocker-closed'); await nativeEnd;
    if (baseline) { const dbs = await Promise.all(calls); dbs[0].close(); }
    else {
      const db = await sdk.openTemplatePlatformDatabase(); log('retry-accepted');
      const cached = await sdk.openTemplatePlatformDatabase();
      if (db !== cached) throw new Error('Successful cache not shared');
      const stores = [...db.objectStoreNames]; db.close(); return { events, beforeClose, requests, stores, cached:true };
    }
    return { events, beforeClose, requests };
  }, {entry:'/ @fs/'.replace(' ', '') + path.join(root, source),baseline});
  assert.equal(result.beforeClose.requests,1);
  if(baseline) assert.deepEqual(result.beforeClose.outcomes,[]);
  else { assert.deepEqual(result.beforeClose.outcomes.slice(0,3),['rejected','rejected','rejected']); assert.equal(result.requests,2); assert.equal(result.stores.length,10); assert(result.beforeClose.outcomes.slice(3).every(row => row.code==='template-storage-blocked' && row.retryable)); }
  const hosts = [];
  if (!baseline) {
    const fixture = await createCompactLifecycleFixture();
    const raw = JSON.parse(strFromU8(unzipSync(fixture.bytes)["template.json"]));
    const bytes = [...await readFile("apps/studio/src/assets/fonts/rethink-sans-600.ttf")];
    if (archives) packed=await createPackedStorageHost(archives,manager);
    const hostUrl=packed?.url??server.resolvedUrls.local[0];
    for (const kind of ["single", "family"]) {
      const isolated = await browser.newContext(); const hostPage = await isolated.newPage();
      await hostPage.route(hostUrl, route => route.fulfill({contentType:"text/html",body:"<!doctype html><title>Public storage host</title>"}));
      await hostPage.goto(hostUrl);
      hosts.push(await hostPage.evaluate(async ({entry,raw,bytes,kind}) => (await import(entry)).runBlockedHost(raw,bytes,kind), {entry:packed?.entry??"/@fs/"+path.join(root,"packages/template-browser/test/blockedStorageHost.browser.ts"),raw,bytes,kind}));
      await isolated.close();
    }
  }
  await mkdir(output,{recursive:true}); await writeFile(path.join(output,'real-upgrade.json'),JSON.stringify({ baseline,chromium:browser.version(),...result, hosts,packed:packed?{archives:packed.identities,manager,strictDeclarations:true}:null },null,2)+'\n');
  console.log(JSON.stringify({baseline,chromium:browser.version(),...result, hosts},null,2));
} finally { await browser?.close(); await packed?.close(); await server.close(); }
