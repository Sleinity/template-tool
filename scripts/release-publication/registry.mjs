import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { registryUrl, packageNames } from './candidate.mjs';

export class RegistryReadClient {
  constructor(env = process.env) {
    this.env = env;
    this.token = env.NODE_AUTH_TOKEN;
    assert(this.token, 'Registry authentication is required');
  }
  async npm(args) {
    const dir = await mkdtemp(path.join(tmpdir(), 'sdk-registry-auth-'));
    try {
      const userconfig = path.join(dir, 'npmrc');
      await writeFile(
        userconfig,
        '@sleinity:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n',
        { mode: 0o600 },
      );
      const result = spawnSync(
        'npm',
        [...args, '--registry=' + registryUrl, '--json'],
        {
          env: { ...this.env, NPM_CONFIG_USERCONFIG: userconfig },
          encoding: 'utf8',
          maxBuffer: 32 * 1024 * 1024,
        },
      );
      let data;
      try {
        data = JSON.parse(result.stdout || '{}');
      } catch {
        throw Error('Registry returned an invalid response');
      }
      if (result.status !== 0) {
        const code = data.error?.code ?? 'REGISTRY_UNAVAILABLE';
        const error = new Error('Registry operation failed: ' + code);
        error.code = code;
        throw error;
      }
      return data;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  async inspect(name, version) {
    assert(packageNames.includes(name));
    assert.equal(version, '1.0.0');
    // An authenticated, successful package listing distinguishes absence from hidden/inaccessible packages.
    const versions = await this.npm(['view', name, 'versions']);
    const list = Array.isArray(versions) ? versions : [versions];
    assert(
      list.every((v) => typeof v === 'string'),
      'Invalid version listing',
    );
    if (!list.includes(version)) return { state: 'missing' };
    const meta = await this.npm(['view', name + '@' + version]);
    assert.equal(meta.name, name);
    assert.equal(meta.version, version);
    assert(typeof meta.dist?.tarball === 'string');
    const url = new URL(meta.dist.tarball);
    assert.equal(url.protocol, 'https:');
    assert.equal(
      url.hostname,
      'npm.pkg.github.com',
      'Unexpected tarball authority',
    );
    return {
      state: 'present',
      url: meta.dist.tarball,
      integrity: meta.dist.integrity,
    };
  }
  async download(state) {
    assert.equal(new URL(state.url).hostname, 'npm.pkg.github.com');
    const response = await fetch(state.url, {
      headers: { Authorization: 'Bearer ' + this.token },
    });
    assert(response.ok, 'Registry download unavailable');
    return Buffer.from(await response.arrayBuffer());
  }
}
import { refuseRetiredOperation } from '../release-baseline/retired.mjs';
export class RegistryWriteClient extends RegistryReadClient {
  async publish(file, row) {
    refuseRetiredOperation('registry publication');
    assert(packageNames.includes(row.name));
    assert.equal(path.basename(file), row.file);
    await this.npm(['publish', file, '--ignore-scripts']);
  }
}
