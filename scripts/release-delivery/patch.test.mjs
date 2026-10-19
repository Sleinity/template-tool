import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertPatchScope, assertPatchReceipt, registryState, publishArchives } from './patch.mjs';
import { assertPatchWorkflow } from './patch-workflow.mjs';
const source = await readFile('.github/workflows/sdk-2-0-1-patch.yml', 'utf8');
const standard = await readFile('.github/workflows/release.yml', 'utf8');
const api = { sdkVersion: '2.0.0', packages: [{ version: '2.0.0', exports: ['stable'] }] };
const current = { sdkVersion: '2.0.1', packages: [{ version: '2.0.1', exports: ['stable'] }] };
test('patch approval rejects a future train, API change, Core or renderer work', () => {
  assertPatchScope(api, current, ['packages/template-browser/src/session/templateSessionV2.ts']);
  for (const changed of [ ['src/template-package/renderer.tsx'], ['packages/template-core/src/index.ts'], ['packages/template-react/src/renderer.tsx'] ]) assert.throws(() => assertPatchScope(api, current, changed));
  assert.throws(() => assertPatchScope(api, { ...current, sdkVersion: '2.0.2' }, []));
  assert.throws(() => assertPatchScope(api, { ...current, packages: [{ version: '2.0.1', exports: ['new'] }] }, []));
});
test('registry absence is explicit; auth, malformed responses and conflicting bytes stop publication', () => {
  assert.equal(registryState({ status: 1, stdout: JSON.stringify({ error: { code: 'E404' } }) }, 'expected'), 'absent');
  assert.equal(registryState({ status: 0, stdout: '"expected"' }, 'expected'), 'matching');
  for (const result of [{ status: 1, stdout: '' }, { status: 1, stdout: '{"error":{"code":"E401"}}' }, { status: 0, stdout: '"other"' }]) assert.throws(() => registryState(result, 'expected'));
});
const archives = [{ name: 'Core', sha256: 'a' }, { name: 'Browser', sha256: 'b' }, { name: 'React', sha256: 'c' }];
test('all preflights precede sequential publication, verification and tag retention', async () => {
  const calls = [];
  await publishArchives(archives, {
    preflight: async a => { calls.push(`preflight:${a.name}`); return 'absent'; },
    publish: async a => calls.push(`publish:${a.name}`), verify: async a => calls.push(`verify:${a.name}`), tag: async a => calls.push(`tag:${a.name}`),
  });
  assert.deepEqual(calls, ['preflight:Core','preflight:Browser','preflight:React','publish:Core','verify:Core','publish:Browser','verify:Browser','publish:React','verify:React','tag:Core','tag:Browser','tag:React']);
});
test('a failed preflight publishes nothing and a failed registry check stops later packages and tags', async () => {
  for (const stage of ['preflight','verify']) {
    const calls = [];
    const op = name => async a => { calls.push(`${name}:${a.name}`); if (name === stage && a.name === 'Browser') throw Error('stop'); return 'absent'; };
    await assert.rejects(() => publishArchives(archives, { preflight: op('preflight'), publish: op('publish'), verify: op('verify'), tag: op('tag') }));
    assert(!calls.some(x => x.startsWith('tag:')));
    if (stage === 'preflight') assert(!calls.some(x => x.startsWith('publish:')));
    else assert(!calls.includes('publish:React'));
  }
});
test('resuming identical published bytes never republishes that package', async () => {
  const published = [];
  await publishArchives(archives, { preflight: async a => a.name === 'Core' ? 'matching' : 'absent', publish: async a => published.push(a.name), verify: async () => {}, tag: async () => {} });
  assert.deepEqual(published, ['Browser','React']);
});
test('acceptance is bound to exact source, archive identities and both installed manager gates', () => {
  const receipt = { schemaVersion: 'sdk-2.0.1-functional-patch-v1', status: 'pass', version: '2.0.1', sourceCommit: 'commit', sourceDirty: false, archives, sourceFidelityCertification: false,
    rows: ['npm/consumer','npm/fonts','npm/storage','pnpm/consumer','pnpm/fonts','pnpm/storage'].map(x => { const [manager,name] = x.split('/'); return { manager,name }; }) };
  assertPatchReceipt(receipt, archives, 'commit');
  for (const changed of [{ ...receipt, sourceCommit: 'other' }, { ...receipt, archives: archives.slice(1) }, { ...receipt, rows: receipt.rows.slice(1) }, { ...receipt, status: 'fail' }, { ...receipt, sourceDirty: true }]) assert.throws(() => assertPatchReceipt(changed, archives, 'commit'));
});
test('patch workflow keeps tag-only protected publication and accepted-byte handoff order', () => assert(assertPatchWorkflow(source, standard)));
test('patch workflow mutations cannot skip regressions, artifact ownership or registry acceptance', () => {
  for (const changed of [source.replace('tags: [sdk-v2.0.1]', 'tags: [sdk-v*]'), source.replace('needs: verify', 'needs: skipped'), source.replace('environment: private-sdk-release', 'environment: none'),
    source.replace('pnpm field-rules:studio', 'pnpm skipped'), source.replace('studio:setup --without-source-fidelity', 'studio:setup'), source.replace('patch.mjs compare', 'patch.mjs skipped'), source.replace('patch.mjs accept release-artifacts', 'patch.mjs skipped release-artifacts'), source.replace('--draft=false', '--draft=true'), source.replace('actions/download-artifact@v4', 'actions/skipped@v4')]) assert.throws(() => assertPatchWorkflow(changed, standard));
  assert.throws(() => assertPatchWorkflow(source, standard.replace("&& github.ref != 'refs/tags/sdk-v2.0.1'", '')));
});
