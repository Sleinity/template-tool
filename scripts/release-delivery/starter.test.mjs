import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { spawnSync } from 'node:child_process';
import { createStarter } from './starter.mjs';
test('standalone starter is deterministic, complete and excludes repository/private inputs', async () => {
  const archives = ['core','browser','react'].map(name => ({ name:'@sleinity/template-'+name, file:`sleinity-template-${name}-2.0.0.tgz` }));
  const first = await createStarter(process.cwd(), archives, '2.0.0');
  const second = await createStarter(process.cwd(), archives, '2.0.0');
  assert.deepEqual(first.bytes, second.bytes);
  const files = unzipSync(first.bytes);
  for(const file of ['package.json','pnpm-workspace.yaml','index.html','vite.config.ts','tsconfig.app.json','src/main.tsx','src/CompleteHost.tsx','src/starterPersistence.ts','src/fieldHostLifecycle.ts','src/styles.css'])assert(files[file],file);
  assert(!Object.keys(files).some(f=>/\.(zip|ttf|otf|woff2?|ttc|tgz)$/.test(f)));
  const manifest=JSON.parse(strFromU8(files['package.json']));
  for(const a of archives)assert.equal(manifest.dependencies[a.name],`file:vendor/${a.file}`);
  assert(!strFromU8(files['package.json']).includes('workspace:'));
  assert(!strFromU8(files['vite.config.ts']).includes('alias'));
  assert(strFromU8(files['src/main.tsx']).includes('<CompleteHost'));
  for(const [name,bytes]of Object.entries(files))if(/\.[tj]sx?$/.test(name))assert(!/(from\s+["'][^"']*(?:apps\/studio|renderer-internal|session-internal))/.test(strFromU8(bytes)),name);
});

test('starter bytes are identical across builder time zones', () => {
  const code = `import {createStarter} from './scripts/release-delivery/starter.mjs';const archives=['core','browser','react'].map(name=>({name:'@sleinity/template-'+name,file:'sleinity-template-'+name+'-2.0.0.tgz'}));console.log((await createStarter(process.cwd(),archives,'2.0.0')).record.sha256);`;
  const hashes = ['UTC', 'Europe/Amsterdam', 'America/Los_Angeles'].map(TZ => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  });
  assert.equal(new Set(hashes).size, 1);
});
