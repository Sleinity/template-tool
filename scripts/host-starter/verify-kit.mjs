/** Exact public ZIP acceptance. Observation hooks exist only in a temporary test build. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { build, preview } from 'vite';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import { verifyPublicDelivery, extractKit } from '../release-delivery/host-kit.mjs';
import { createCompactLifecycleFixture } from '../compact-lifecycle-fixture.mjs';
import { launchBrowser } from '../fidelity/browser.mjs';
const args = process.argv.slice(2), option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const directory = path.resolve(option('--delivery', '/tmp/sdk-host-kit-preview')), manager = option('--manager', 'npm');
const output = path.resolve(option('--output', path.join(directory, 'acceptance', manager)));
assert(['npm', 'pnpm'].includes(manager));
const { manifest } = await verifyPublicDelivery(directory, { additive: args.includes('--additive') });
const temp = await realpath(await mkdtemp(path.join(os.tmpdir(), 'sdk-public-kit-'))), checks = [];
await mkdir(output, { recursive: true }); let server, browser, page;
const run = (binary, argv, name) => {
  const env = { ...process.env, CI: 'true', NPM_CONFIG_USERCONFIG: path.join(temp, '.npmrc'), NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org' };
  for (const key of ['NODE_AUTH_TOKEN', 'NPM_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN']) delete env[key];
  const result = spawnSync(binary, argv, { cwd: temp, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return writeFile(path.join(output, name + '.log'), (result.stdout ?? '') + (result.stderr ?? '')).then(() => assert.equal(result.status, 0, `${name}: ${result.stdout}\n${result.stderr}`));
};
try {
  await extractKit(await readFile(path.join(directory, manifest.kit.file)), temp);
  // No post-extraction archive copies. Install and build the delivered project first.
  await writeFile(path.join(temp, '.npmrc'), 'registry=https://registry.npmjs.org\n');
  await run(manager, manager === 'npm' ? ['install', '--ignore-scripts', '--no-audit', '--no-fund'] : ['install', '--prefer-offline'], 'install');
  const lock = await readFile(path.join(temp, manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml'), 'utf8');
  assert(!/workspace:|link:|npm\.pkg\.github\.com/.test(lock));
  await run(manager, ['run', 'build'], 'build'); checks.push('unmodified-extracted-kit-install-and-build');
  // Existing-app recipes compile against the same installed public entries.
  await writeFile(path.join(temp, 'src', '__integration-check.ts'), `import {createTemplateSessionV2,createTemplateFieldFamilySessionV2} from '@sleinity/template-browser/session';\nimport {TemplateFieldSessionRendererV2} from '@sleinity/template-react/editor';\nexport const supportedEntries=[createTemplateSessionV2,createTemplateFieldFamilySessionV2,TemplateFieldSessionRendererV2];\n`);
  await run(manager, ['run', 'build'], 'existing-app'); checks.push('existing-app-public-entry-typecheck');
  const observer = { name: 'kit-test-observation', enforce: 'pre', transform(code, id) {
    if (!id.endsWith('/CompleteHost.tsx')) return null;
    const anchor = 'current.current = { active, pending };'; assert(code.includes(anchor));
    return code.replace(anchor, anchor + ' (window as any).__kit={active,pending,storage};');
  } };
  await build({ root: temp, configFile: path.join(temp, 'vite.config.ts'), plugins: [observer], logLevel: 'error' });
  server = await preview({ root: temp, configFile: path.join(temp, 'vite.config.ts'), preview: { host: '127.0.0.1', port: 0 } });
  browser = await launchBrowser(false); const context = await browser.newContext({ acceptDownloads: true });
  page = await context.newPage(); page.setDefaultTimeout(40000); const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', dialog => dialog.accept());
  const url = server.resolvedUrls.local[0];
  context.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(url)) external.push(request.url()); });
  const go = async () => { await page.goto(url); await page.waitForFunction(() => Boolean(window.__kit)); };
  const ready = () => page.waitForFunction(() => window.__kit.active?.session.getSnapshot().readiness.exportReady === true);
  const fixture = await createCompactLifecycleFixture(), raw = JSON.parse(Buffer.from(unzipSync(fixture.bytes)['template.json']).toString());
  const variants = [0, 1, 2].map(index => {
    const source = structuredClone(raw); source.packageId += '-' + index; source.name = 'Portable design ' + (index + 1);
    const bytes = zipSync({ 'template.json': strToU8(JSON.stringify(source)), 'assets.json': strToU8(JSON.stringify({ version: 1, assets: [] })) });
    return { name: `portable-${index}.zip`, mimeType: 'application/zip', buffer: Buffer.from(bytes) };
  });
  const font = { name: 'rethink-sans-600.ttf', mimeType: 'font/ttf', buffer: await readFile('apps/studio/src/assets/fonts/rethink-sans-600.ttf') };
  const prepare = async sources => {
    const previous = await page.evaluate(() => window.__kit.active?.id);
    await page.getByLabel('Load V2 JSON or exporter ZIPs', { exact: true }).setInputFiles(sources);
    for (let index = 0; index < sources.length; index++) {
      await page.waitForFunction(i => window.__kit.pending?.sources[i]?.getSnapshot().pending?.busy === false, index);
      const view = await page.evaluate(i => window.__kit.pending.sources[i].getSnapshot().pending, index);
      for (const requirement of view.requirements.filter(r => !r.exact)) {
        await page.getByLabel(`Source ${index + 1} font ${requirement.label}`, { exact: true }).setInputFiles(font);
        await page.waitForFunction(i => !window.__kit.pending.sources[i].getSnapshot().pending.busy, index);
      }
    }
    await page.getByRole('button', { name: 'Open prepared sources', exact: true }).click();
    await page.waitForFunction(id => Boolean(window.__kit.active && window.__kit.active.id !== id), previous); await ready();
  };
  const value = () => page.evaluate(() => window.__kit.active.session.getFieldControllers().find(f => f.type === 'text').value);
  const field = () => page.getByLabel('Headline', { exact: true });
  const save = async name => { await page.getByLabel('Template name', { exact: true }).fill(name); await page.getByRole('button', { name: 'Save template', exact: true }).click(); await page.waitForFunction(() => Boolean(window.__kit.active?.lease)); };
  const reopen = async name => { const id = await page.evaluate(() => window.__kit.active?.id); await page.getByRole('button', { name, exact: true }).click(); await page.waitForFunction(old => Boolean(window.__kit.active && window.__kit.active.id !== old), id); await ready(); };
  const png = async name => { const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export PNG', exact: true }).click(); const file = path.join(output, name + '.png'); await (await download).saveAs(file); assert((await readFile(file)).subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))); };
  await go(); await prepare([variants[0]]); assert.equal(await page.getByLabel('Design', { exact: true }).count(), 0); checks.push('single-portable-zip-staged-import-fonts-and-preview');
  await field().fill('Host kit edit'); await ready(); assert.equal(await value(), 'Host kit edit');
  await page.getByRole('button', { name: 'Reset Headline', exact: true }).click(); await ready(); assert.equal(await value(), raw.editableFields[0].defaultValue); checks.push('single-edit-reset');
  const originalFields = await page.evaluate(() => window.__kit.active.session.getSnapshot().basePackage.editableFields);
  for (const mode of ['suggested', 'restricted']) {
    await page.evaluate(mode => { const s = window.__kit.active.session, fields = s.getSnapshot().basePackage.editableFields.map(f => ({ ...f, configuration: { ...f.configuration, choices: { mode, options: [{ id: 'imported', value: f.defaultValue }, { id: 'other', value: 'Host kit choice' }] } } })); s.configure({ fields }); }, mode);
    await ready(); await page.getByLabel('Headline choices', { exact: true }).selectOption('other'); await ready(); assert.equal(await value(), 'Host kit choice');
    await page.getByRole('button', { name: 'Reset Headline', exact: true }).click(); await ready(); assert.equal(await value(), raw.editableFields[0].defaultValue);
  }
  checks.push('single-suggested-and-restricted-choices-reset');
  await page.evaluate(fields => window.__kit.active.session.configure({ fields }), originalFields); await ready();
  await field().fill('Saved single'); await save('Host kit single');
  await field().fill('Recovered single');
  await page.waitForFunction(() => !window.__kit.active.getSnapshot().dirty);
  assert((await page.evaluate(async () => { const a=window.__kit.active; return JSON.stringify((await a.adapters.recovery.inspect(a.lease.key))?.payload.contentState); })).includes('Recovered single'));
  await go(); await reopen('Resume Host kit single'); assert.equal(await value(), 'Recovered single');
  await context.setOffline(true); await reopen('Fresh Host kit single'); assert.equal(await value(), 'Saved single'); await context.setOffline(false);
  checks.push('single-save-reload-recovery-and-offline-fresh-after-app-load'); await png('single'); checks.push('single-current-png');
  await prepare(variants); assert.equal(await page.getByLabel('Design', { exact: true }).locator('option').count(), 3);
  const familyFields = await page.evaluate(() => window.__kit.active.session.getSnapshot().family.fields);
  for (const mode of ['suggested', 'restricted']) {
    await page.evaluate(mode => {
      const session = window.__kit.active.session;
      session.configure({ fields: session.getSnapshot().family.fields.map(f => ({ ...f, configuration: { ...f.configuration, choices: { mode, options: [{ id: 'imported', value: session.getFieldControllers().find(c => c.id === f.id).importedDefaultValue }, { id: 'other', value: 'Shared choice' }] } } })) });
    }, mode); await ready();
    await page.getByLabel('Headline choices', { exact: true }).selectOption('other'); await ready();
    for (let index = 0; index < 3; index++) { await page.getByLabel('Design', { exact: true }).selectOption({ index }); await ready(); assert.equal(await value(), 'Shared choice'); }
    await page.getByRole('button', { name: 'Reset Headline', exact: true }).click(); await ready(); assert.equal(await value(), raw.editableFields[0].defaultValue);
  }
  await page.evaluate(fields => window.__kit.active.session.configure({ fields }), familyFields); await ready();
  checks.push('family-shared-suggested-and-restricted-choices-switch-reset');
  await field().fill('Shared Family edit'); await ready();
  for (let index = 0; index < 3; index++) { await page.getByLabel('Design', { exact: true }).selectOption({ index }); await ready(); assert.equal(await value(), 'Shared Family edit'); }
  await page.getByRole('button', { name: 'Reset Headline', exact: true }).click(); await ready(); assert.equal(await value(), raw.editableFields[0].defaultValue);
  checks.push('family-three-designs-shared-edit-switch-and-reset');
  await field().fill('Saved Family'); await save('Host kit Family'); await field().fill('Recovered Family');
  await page.waitForFunction(() => !window.__kit.active.getSnapshot().dirty);
  assert((await page.evaluate(async () => { const a=window.__kit.active; return JSON.stringify((await a.adapters.recovery.inspect(a.lease.key))?.payload.contentState); })).includes('Recovered Family'));
  await go(); await reopen('Resume Host kit Family'); assert.equal(await value(), 'Recovered Family');
  await reopen('Fresh Host kit Family'); assert.equal(await value(), 'Saved Family'); await png('family');
  await page.waitForFunction(() => window.__kit.active.getSnapshot().finished);
  assert.equal(await page.evaluate(() => { const a = window.__kit.active; return a.adapters.recovery.inspect(a.lease.key); }), null);
  checks.push('family-save-reload-recovery-current-png-and-cleanup');
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'pass', schemaVersion: 'sdk-host-kit-acceptance-v1', manager, node: process.version, platform: process.platform, browser: browser.version(), kitSha256: manifest.kit.sha256, archives: manifest.archives, sourceRevision: manifest.sourceRevision, deliveryRevision: manifest.deliveryRevision, runId: process.env.GITHUB_RUN_ID ?? null, checks, evidence: 'automated exact extracted application; portable functional fixtures; test-only observation in temporary build; no source/font pixel certification' }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'pass', manager, checks: checks.length, kitSha256: manifest.kit.sha256 })); await context.close();
} catch (error) {
  await writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), checks, body: page && !page.isClosed() ? await page.locator('body').innerText() : null }, null, 2)); throw error;
} finally { await browser?.close(); await server?.httpServer.close(); await rm(temp, { recursive: true, force: true }); }
