/** One isolated installer contract for archive and registry acceptance; no SDK runtime imports. */
import assert from 'node:assert/strict';
import { readFile, writeFile, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  loadDescriptor,
  verifyArchives,
  sha256,
  registryUrl,
} from './candidate.mjs';
import { RegistryReadClient } from './registry.mjs';
export function installationMode(env = process.env) {
  const mode = env.SDK_HOST_INSTALLATION ?? 'archive';
  assert(
    ['archive', 'registry'].includes(mode),
    'Invalid host installation mode',
  );
  return mode;
}
export function archiveFiles(bytes) {
  const tar = gunzipSync(bytes),
    files = [];
  for (let p = 0; p + 512 <= tar.length; ) {
    const h = tar.subarray(p, p + 512);
    if (h.every((b) => b === 0)) break;
    const text = (a, b) => h.subarray(a, b).toString().replace(/\0.*$/s, '');
    const name = [text(345, 500), text(0, 100)].filter(Boolean).join('/'),
      size = parseInt(text(124, 136).trim() || '0', 8),
      type = text(156, 157);
    assert(
      Number.isSafeInteger(size) && size >= 0 && p + 512 + size <= tar.length,
      'Malformed tar',
    );
    if (type === '0' || type === '') {
      assert(
        name.startsWith('package/') && !name.includes('..'),
        'Unexpected packed path',
      );
      files.push({
        file: name.slice(8),
        bytes: tar.subarray(p + 512, p + 512 + size),
      });
    }
    p += 512 + Math.ceil(size / 512) * 512;
  }
  assert(files.length > 0, 'Empty archive');
  return files;
}
export async function prepareHostInstallation(
  directory,
  archives,
  manager,
  environment = { ...process.env },
  registry,
) {
  const mode = installationMode();
  assert(['npm', 'pnpm'].includes(manager));
  if (mode === 'archive') {
    if (manager === 'npm') {
      const file = path.join(directory, 'package.json'),
        pkg = JSON.parse(await readFile(file, 'utf8'));
      pkg.overrides = {
        ...(pkg.overrides ?? {}),
        ...Object.fromEntries(
          Object.entries(pkg.dependencies).filter(([name]) =>
            name.startsWith('@sleinity/'),
          ),
        ),
      };
      await writeFile(file, JSON.stringify(pkg, null, 2) + '\n');
    }
    return environment;
  }
  const d = await loadDescriptor();
  await verifyArchives(d, process.env.SDK_FROZEN_AUTHORITY ?? archives);
  for (const row of d.archives)
    assert.equal(
      sha256(await readFile(path.join(archives, row.file))),
      row.sha256,
    );
  const token = process.env.NODE_AUTH_TOKEN;
  assert(token, 'Registry host acceptance needs NODE_AUTH_TOKEN');
  const client = registry ?? new RegistryReadClient();
  const records = [];
  for (const row of d.archives) {
    const state = await client.inspect(row.name, d.version);
    assert.equal(state.state, 'present', 'Registry train is incomplete');
    const bytes = await client.download(state);
    assert.equal(sha256(bytes), row.sha256, 'Registry archive conflict');
    records.push({
      name: row.name,
      version: d.version,
      sha256: row.sha256,
      integrity: state.integrity,
      tarballUrlSha256: sha256(new URL(state.url).href),
    });
  }
  const file = path.join(directory, 'package.json'),
    pkg = JSON.parse(await readFile(file, 'utf8'));
  for (const row of d.archives) pkg.dependencies[row.name] = d.version;
  delete pkg.overrides;
  delete pkg.pnpm;
  await writeFile(file, JSON.stringify(pkg, null, 2) + '\n');
  if (manager === 'pnpm')
    await writeFile(
      path.join(directory, 'pnpm-workspace.yaml'),
      'packages:\n  - .\nallowBuilds:\n  esbuild: true\nonlyBuiltDependencies:\n  - esbuild\n',
    );
  else await rm(path.join(directory, 'pnpm-workspace.yaml'), { force: true });
  const config =
    'registry=https://registry.npmjs.org/\n@sleinity:registry=' +
    registryUrl +
    '\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n';
  for (const name of ['.npmrc', '.npmrc-public-only'])
    await writeFile(path.join(directory, name), config, { mode: 0o600 });
  await writeFile(
    path.join(directory, '.sdk-installation.json'),
    JSON.stringify({ mode, records }, null, 2) + '\n',
  );
  return {
    ...environment,
    NODE_AUTH_TOKEN: token,
    NPM_CONFIG_USERCONFIG: path.join(directory, '.npmrc'),
    NPM_CONFIG_CACHE: path.join(directory, '.registry-cache'),
    npm_config_store_dir: path.join(directory, '.registry-store'),
  };
}
export function validateRegistryLock(lock, manager, records) {
  assert(!/workspace:|link:/.test(lock), 'Workspace fallback is forbidden');
  const npm = manager === 'npm' ? JSON.parse(lock) : null;
  for (const record of records) {
    assert(record.integrity, 'Registry integrity missing');
    let resolved, integrity, version;
    if (npm) {
      const item = npm.packages?.['node_modules/' + record.name];
      assert(item, 'Missing registry package');
      ({ resolved, integrity, version } = item);
    } else {
      const lines = lock.split('\n'),
        key = record.name + '@' + record.version;
      const index = lines.findIndex(
        (line) =>
          line === `  '${key}':` ||
          line === `  "${key}":` ||
          line === `  ${key}:`,
      );
      assert(index >= 0, 'Exact pnpm package entry missing');
      let end = index + 1;
      while (end < lines.length && !/^\S|^  \S/.test(lines[end])) end++;
      const block = lines.slice(index + 1, end).join('\n');
      integrity = block.match(/integrity:\s*['"]?([^\s,'"}]+)/)?.[1];
      resolved = block.match(/tarball:\s*['"]?([^\s,'"}]+)/)?.[1];
      version = record.version;
    }
    assert.equal(version, record.version);
    assert.equal(integrity, record.integrity);
    const url = new URL(resolved);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'npm.pkg.github.com');
    assert.equal(
      sha256(url.href),
      record.tarballUrlSha256,
      'Registry lock tarball identity differs',
    );
  }
}
export async function verifyHostInstallation(directory, archives, manager) {
  const mode = installationMode(),
    lock = await readFile(
      path.join(
        directory,
        manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml',
      ),
      'utf8',
    );
  assert(!/workspace:|link:/.test(lock), 'Workspace SDK fallback is forbidden');
  if (mode === 'archive') {
    assert(
      !lock.includes('npm.pkg.github.com'),
      'Archive installation reached private registry',
    );
    return { mode };
  }
  const d = await loadDescriptor(),
    evidence = JSON.parse(
      await readFile(path.join(directory, '.sdk-installation.json'), 'utf8'),
    );
  const pkg = JSON.parse(
    await readFile(path.join(directory, 'package.json'), 'utf8'),
  );
  assert(!pkg.overrides && !pkg.pnpm, 'SDK overrides are forbidden');
  validateRegistryLock(lock, manager, evidence.records);
  for (const row of d.archives) {
    assert.equal(pkg.dependencies[row.name], d.version);
    assert(
      !/file:.*sleinity-template|vendor\/sleinity-template/.test(lock),
      'Local SDK tarball fallback is forbidden',
    );
    const record = evidence.records.find((r) => r.name === row.name);
    assert(record.integrity, 'Registry integrity missing');
    assert(lock.includes(record.integrity), 'Registry lock integrity differs');
    const installed = await realpath(
      path.join(directory, 'node_modules', row.name),
    );
    assert(
      installed.startsWith((await realpath(directory)) + path.sep),
      'SDK resolves outside isolated host',
    );
    for (const f of archiveFiles(await readFile(path.join(archives, row.file))))
      assert.equal(
        sha256(await readFile(path.join(installed, f.file))),
        sha256(f.bytes),
        `Installed SDK bytes differ: ${row.name}/${f.file}`,
      );
  }
  return evidence;
}
