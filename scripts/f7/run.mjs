/** Production media characterization; no production behavior experiments. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import { PNG } from 'pngjs';
import { loadManifest, verifyFixture } from '../fidelity/core.mjs';
import { selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { loadExactFontManifest } from '../fidelity/fonts.mjs';
import { launchBrowser } from '../fidelity/browser.mjs';
import { mediaInstrumentation } from './instrumentation.mjs';

const args = process.argv.slice(2), option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const out = resolve(option('--output', '/tmp/f7-production-20261015'));
const trials = Number(option('--trials', '5'));
assert(Number.isInteger(trials) && trials > 0);
await mkdir(out, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
const read = async f => JSON.parse(await readFile(f, 'utf8'));
const candidate = await read('release-verification-artifacts/sdk-v2-optimized-20261015/LOCAL-CANDIDATE-MANIFEST.json');
const certification = await read('release-verification-artifacts/sdk-v2-optimized-20261015/certification.json');
assert.equal(certification.decision, 'GO'); assert.equal(candidate.candidateId, certification.candidateId);
const runtimeSources = candidate.source.files.filter(f => /^(packages\/[^/]+\/src\/|apps\/studio\/src\/)/.test(f.file));
for (const file of runtimeSources) assert.equal(hash(await readFile(file.file)), file.sha256, `Certified runtime changed: ${file.file}`);
const manifest = loadManifest(), fixtures = selectSdkGateFixtures(manifest), fonts = loadExactFontManifest(fixtures.flatMap(f => f.requiredFonts ?? []));
const inputs = new Map();
for (const f of fonts.fonts) inputs.set(`/inputs/${f.id}.font`, await readFile(f.path));
for (const f of fixtures) {
  const verified = verifyFixture(manifest, f); inputs.set(`/inputs/${f.id}.zip`, Buffer.from(verified.bytes));
  inputs.set(`/inputs/${f.id}.json`, Buffer.from(JSON.stringify({ filename: f.filename, fonts: fonts.fonts.map(f => ({ id: f.id, family: f.family, weight: f.weight, style: f.style, sha256: f.sha256, filename: f.path.split('/').at(-1) })) })));
}
const diagnosticPng = new PNG({ width: 4, height: 3 }); diagnosticPng.data.fill(255);
inputs.set('/inputs/diagnostic.png', PNG.sync.write(diagnosticPng)); inputs.set('/inputs/slow.png', PNG.sync.write(diagnosticPng));
const builds = {};
for (const profile of ['minimal', 'detailed']) {
  builds[profile] = join(out, `build-${profile}`);
  await build({ configFile: resolve('apps/studio/vite.config.ts'), root: process.cwd(), plugins: [mediaInstrumentation(profile)], logLevel: 'error',
    build: { target: 'esnext', outDir: builds[profile], emptyOutDir: true, rollupOptions: { input: resolve('scripts/f7/index.html') } } });
}
const appDist = join(out, 'build-app');
await build({ configFile: resolve('apps/studio/vite.config.ts'), root: resolve('apps/studio'), logLevel: 'error', build: { outDir: appDist, emptyOutDir: true } });
const appAssets = [];
for (const name of await readdir(join(appDist, 'assets'))) if (name.endsWith('.js')) {
  const bytes = await readFile(join(appDist, 'assets', name));
  assert(!bytes.includes(Buffer.from('__f7')), 'Test instrumentation entered the production application');
  appAssets.push({ file: name, sha256: hash(bytes), bytes: bytes.length });
}
const servers = {};
for (const profile of ['minimal', 'detailed']) {
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      let bytes = inputs.get(path), type = 'application/octet-stream';
      if (!bytes) {
        const relative = path === '/' || !extname(path) ? 'index.html' : path.slice(1);
        bytes = await readFile(join(builds[profile], relative)).catch(() => readFile(join(appDist, relative)));
        type = ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' })[extname(relative)] ?? type;
      }
      res.setHeader('Content-Type', type); res.end(bytes);
    } catch { res.statusCode = 404; res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  servers[profile] = { server, url: `http://127.0.0.1:${server.address().port}` };
}
const browser = await launchBrowser(false);
const packet = { schemaVersion: 'f7-production-profile-v1', recordedAt: new Date().toISOString(), candidateId: candidate.candidateId,
  certification: certification.gateRun, runtimeSources, productionAppAssets: appAssets,
  tooling: await Promise.all(['scripts/f7/run.mjs', 'scripts/f7/instrumentation.mjs', 'scripts/f7/probe.ts', 'scripts/f7/index.html'].map(async file => ({file, sha256:hash(await readFile(file))}))),
  tools: { vite: (await read('node_modules/vite/package.json')).version, react: (await read('node_modules/react/package.json')).version }, mode: 'production', trials,
  environment: { browser: browser.version(), node: process.version, platform: process.platform, architecture: process.arch, viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce' },
  fixtures: fixtures.map(f => ({ id: f.id, sha256: f.zipSha256 })), fonts: fonts.fonts.map(f => ({ id: f.id, sha256: f.sha256 })),
  coldPolicy: 'Fresh browser context/storage and session per member; browser process and compiled modules warmed. OS/disk caches uncontrolled. Warm steps retain the session.',
  measurementPolicy: 'Detailed and minimal are matched observation profiles of the same runtime, not before/after implementations. Detailed spans nest; do not sum them. Stable DOM observation includes three frames after export readiness; PNG duration is separate.',
  rows: [], warmups: [], diagnostics: [], smoke: null, failures: [] };
const save = () => writeFile(join(out, 'profile.json'), JSON.stringify(packet, null, 2) + '\n');
async function newPage(profile, initial = 0, diagnostic) {
  const context = await browser.newContext({ ...packet.environment, browser: undefined, node: undefined, platform: undefined, architecture: undefined, acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(35000); const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => { const url = route.request().url(); if (/^https?:/.test(url) && !url.startsWith(servers[profile].url)) { external.push(url); return route.abort(); } return route.continue(); });
  await page.goto(`${servers[profile].url}/scripts/f7/index.html?profile=${profile}&initial=${initial}${diagnostic ? '&diagnostic=' + diagnostic : ''}`);
  await page.waitForFunction(() => window.__f7?.ready);
  return { context, page, errors, external };
}
async function png(page, filename) {
  await page.evaluate(() => window.__f7.event('png-start', { identity: window.__f7.identity() }));
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG', exact: true }).click();
  const download = await downloading; await download.saveAs(filename);
  const decoded = PNG.sync.read(await readFile(filename));
  await page.evaluate(() => window.__f7.event('png-complete', { identity: window.__f7.identity() }));
  return { width: decoded.width, height: decoded.height, sha256: hash(await readFile(filename)) };
}
const scenarios = [...fixtures.map((f, i) => ({ id: `single-${i}`, ids: [f.id], family: false, initial: 0, order: [i] })),
  ...fixtures.map((_, i) => ({ id: `family-cold-${i}`, ids: fixtures.map(f => f.id), family: true, initial: i, order: [i] })),
  { id: 'family-switch', ids: fixtures.map(f => f.id), family: true, initial: 0, order: [0, 1, 2, 0, 1, 2] }];
try {
  for (const scenario of scenarios.filter(s => !args.includes('--scenario') || s.id === option('--scenario'))) {
    for (let trial = -1; trial < trials; trial++) for (const profile of trial % 2 ? ['detailed', 'minimal'] : ['minimal', 'detailed']) {
      const { context, page, errors, external } = await newPage(profile, scenario.initial);
      try {
        for (let step = 0; step < scenario.order.length; step++) {
          const index = scenario.order[step], stage = step === 0 ? 'cold-open' : step < 3 ? `cold-switch-${step}` : `warm-revisit-${step - 3}`;
          await page.evaluate(stage => window.__f7.stage(stage), stage);
          if (step === 0) await page.evaluate(s => window.editorProbe.start(s.ids, s.family), scenario);
          else await page.evaluate(i => window.__f7.select(i), index);
          const state = await page.evaluate(() => window.__f7.settle());
          // Successful export completes the product recovery lifecycle. Export
          // only at the end; keep warm switches in the same live session.
          const output = step === scenario.order.length - 1 ? await png(page, join(out, `${scenario.id}-${trial}-${profile}-${step}.png`)) : null;
          if (output) { assert.equal(output.width, fixtures[index].canvas.width); assert.equal(output.height, fixtures[index].canvas.height); }
          const events = await page.evaluate(stage => window.__f7.events.filter(e => e.stage === stage), stage);
          const row = { scenario: scenario.id, trial, profile, stage, step, fixtureId: fixtures[index].id, state, png: output, events };
          (trial < 0 ? packet.warmups : packet.rows).push(row);
        }
        assert.deepEqual(errors, []); assert.deepEqual(external, []);
        await page.evaluate(() => window.__f7.dispose());
      } finally { await context.close(); }
      await save(); console.log(`[f7] ${scenario.id} trial=${trial} ${profile}`);
    }
  }
  if (!args.includes('--skip-diagnostics')) {
    for (const mode of ['failure', 'rapid-switch', 'disposal', 'replacement-reset']) {
      const { context, page, errors, external } = await newPage('detailed', mode === 'replacement-reset' ? 0 : 1, mode === 'failure' ? 'failure' : mode === 'replacement-reset' ? null : 'slow');
      let release; const held = new Promise(r => { release = r; }); let requested;
      const started = new Promise(r => { requested = r; });
      if (['rapid-switch', 'disposal'].includes(mode)) await page.route('**/inputs/slow.png', async route => { requested(); await held; await route.fulfill({ contentType: 'image/png', body: inputs.get('/inputs/slow.png') }); });
      try {
        await page.evaluate(ids => window.editorProbe.start(ids, true), fixtures.map(f => f.id));
        if (mode === 'failure') {
          await page.waitForFunction(() => window.__f7.identity().readiness.assets === 'blocked');
          assert.equal(await page.evaluate(() => window.__f7.identity().readiness.exportReady), false);
        } else if (mode === 'replacement-reset') {
          await page.evaluate(() => window.__f7.settle());
          const before = await page.evaluate(() => window.__f7.identity());
          await page.evaluate(() => window.__f7.replace()); await page.evaluate(() => window.__f7.settle());
          await page.evaluate(() => window.__f7.resetImage()); await page.evaluate(() => window.__f7.settle());
          const after = await page.evaluate(() => window.__f7.identity());
          assert(after.contentRevision > before.contentRevision); assert.deepEqual(after.assetIds, before.assetIds);
          await png(page, join(out, 'replacement-reset.png'));
        } else {
          await started;
          assert.equal(await page.evaluate(() => window.__f7.identity().readiness.assets), 'pending');
          assert.equal(await page.evaluate(() => window.__f7.identity().readiness.exportReady), false);
          if (mode === 'disposal') await page.evaluate(() => window.__f7.dispose());
          else await page.evaluate(() => { window.__f7.select(2); window.__f7.select(0); window.__f7.select(2); window.__f7.event('selection-finished', { identity: window.__f7.identity() }); });
          release();
          await page.waitForFunction(() => window.__f7.events.some(e => e.kind === 'media-completion' && e.source.endsWith('/inputs/slow.png')));
          if (mode === 'rapid-switch') await page.evaluate(() => window.__f7.settle());
          const events = await page.evaluate(() => window.__f7.events);
          if (mode === 'disposal') { const end = events.findIndex(e => e.kind === 'disposed'); assert(!events.slice(end + 1).some(e => e.kind === 'publication')); }
          else { const end = events.findIndex(e => e.kind === 'selection-finished'), selected = events[end].identity; for (const e of events.slice(end + 1).filter(e => e.kind === 'publication')) { assert.equal(e.identity.selectedVariantId, selected.selectedVariantId); assert.equal(e.identity.contentRevision, selected.contentRevision); } }
        }
        assert.deepEqual(errors, []); assert.deepEqual(external, []);
        packet.diagnostics.push({ mode, status: 'pass', events: await page.evaluate(() => window.__f7.events) });
      } finally { release?.(); await context.close(); }
      await save(); console.log(`[f7] diagnostic ${mode} pass`);
    }
    // Use supported persistence to prepare an exact Family, then open the actual
    // production application and exercise its selector and export controls.
    const { context, page, errors, external } = await newPage('minimal');
    try {
      await page.evaluate(ids => window.editorProbe.start(ids, true), fixtures.map(f => f.id)); await page.evaluate(() => window.__f7.settle());
      await page.evaluate(() => window.__f7.saveTemplate());
      await page.goto(servers.minimal.url + '/');
      await page.getByRole('heading', { name: 'Library', exact: true }).waitFor();
      const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'F7 production Family smoke', exact: true }) });
      await card.getByRole('button', { name: 'Create output', exact: true }).click();
      await page.getByTestId('studio-draft-editor').waitFor();
      const select = page.getByLabel(/^(Selected variant|Design)$/, { exact: true });
      const options = await select.locator('option').evaluateAll(options => options.map(o => o.value)); assert.equal(options.length, 3);
      for (const value of options) { await select.selectOption(value); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Export PNG' && !b.disabled)); }
      const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export PNG', exact: true }).click();
      await (await downloading).saveAs(join(out, 'full-app-family.png'));
      assert.deepEqual(errors, []); assert.deepEqual(external, []);
      packet.smoke = { status: 'pass', seededThrough: 'public import/exact fonts/Family and Studio saveTemplate', exercised: ['production application route', 'Library Create output', 'three-design selector', 'PNG'], manualLiveReview: false };
    } finally { await context.close(); }
  }
} catch (error) { packet.failures.push({ error: String(error), stack: error.stack }); throw error; }
finally {
  await save(); await browser.close();
  for (const { server } of Object.values(servers)) await new Promise(r => server.close(r));
}
console.log(`[f7] complete rows=${packet.rows.length} warmups=${packet.warmups.length}`);
