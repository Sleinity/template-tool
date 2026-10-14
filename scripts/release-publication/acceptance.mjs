/** Full release matrix, with frozen authority separated from mutable handoff/reports. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import {
  loadDescriptor,
  verifyArchives,
  verifySource,
  sha256,
  toolchain,
} from './candidate.mjs';
import { RegistryReadClient } from './registry.mjs';
import {
  generateDeliveryBundle,
  verifyDeliveryBundle,
} from '../release-delivery/bundle.mjs';
import { refuseRetiredOperation } from '../release-baseline/retired.mjs';
refuseRetiredOperation('fixed candidate acceptance');
const args = process.argv.slice(2),
  option = (k) => {
    const i = args.indexOf(k);
    assert(i >= 0 && args[i + 1], k + ' required');
    return args[i + 1];
  };
const mode = option('--mode');
assert(['archive', 'registry'].includes(mode));
const frozen = path.resolve(option('--archives')),
  output = path.resolve(option('--output')),
  delivery = path.join(output, 'delivery');
await mkdir(output, { recursive: true });
const d = await loadDescriptor(),
  report = {
    schemaVersion: 'sdk-release-acceptance-v1',
    status: 'in-progress',
    mode,
    candidate: d.candidate,
    environment: toolchain(),
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    archives: d.archives,
    tagCommit: (() => {
      try {
        return execFileSync(
          'git',
          ['rev-parse', 'refs/tags/sdk-v1.0.0^{commit}'],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
        ).trim();
      } catch {
        return null;
      }
    })(),
    rows: [],
    manualReview: false,
    ci: {
      runId: process.env.GITHUB_RUN_ID ?? null,
      attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    },
  };
const save = () =>
  writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
await save();
try {
  await verifySource(d);
  await verifyArchives(d, frozen);
  if (mode === 'archive')
    await cp(frozen, delivery, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  else {
    await mkdir(delivery, { recursive: true });
    const client = new RegistryReadClient();
    for (const r of d.archives) {
      const state = await client.inspect(r.name, d.version);
      assert.equal(state.state, 'present');
      const bytes = await client.download(state);
      assert.equal(sha256(bytes), r.sha256);
      await writeFile(path.join(delivery, r.file), bytes, {
        flag: 'wx',
        mode: 0o444,
      });
    }
    await generateDeliveryBundle({
      archivesDirectory: delivery,
      outputDirectory: delivery,
      mode: 'release',
      provenance: 'registry-download',
    });
  }
  const bundle = await verifyDeliveryBundle(delivery);
  report.deliveryManifestSha256 = bundle.manifestSha256;
  for (const manager of ['npm', 'pnpm']) {
    const commands = [
      [
        'consumer',
        'scripts/repository/verify-runtime-release-consumer.mjs',
        ['--archives', delivery],
      ],
      [
        'example',
        'scripts/example-lifecycle/verify.mjs',
        [
          '--archives',
          delivery,
          '--manager',
          manager,
          '--delivered',
          '--output',
          path.join(output, manager, 'example'),
        ],
      ],
      [
        'fonts',
        'scripts/repository/verify-host-font-authority.mjs',
        [
          '--archives',
          delivery,
          '--output',
          path.join(output, manager, 'fonts'),
        ],
      ],
      [
        'storage',
        'scripts/repository/verify-blocked-storage.mjs',
        [
          '--archives',
          delivery,
          '--manager',
          manager,
          '--output',
          path.join(output, manager, 'storage'),
        ],
      ],
      [
        'v1-single',
        'scripts/repository/verify-template-editor-reference.mjs',
        ['--archives', delivery],
      ],
      [
        'v1-family',
        'scripts/repository/verify-template-family-reference.mjs',
        ['--archives', delivery],
      ],
    ];
    for (const [name, file, parameters] of commands) {
      await verifySource(d);
      await verifyArchives(d, frozen);
      for (const r of d.archives)
        assert.equal(
          sha256(await readFile(path.join(delivery, r.file))),
          r.sha256,
        );
      const start = Date.now(),
        result = spawnSync(process.execPath, [file, ...parameters], {
          encoding: 'utf8',
          maxBuffer: 32 * 1024 * 1024,
          env: {
            ...process.env,
            SDK_HOST_INSTALLATION: mode,
            SDK_FROZEN_AUTHORITY: frozen,
            TEMPLATE_CONSUMER_PACKAGE_MANAGER: manager,
            TEMPLATE_RUNTIME_RELEASE_VERSION: d.version,
          },
        });
      const log = (result.stdout ?? '') + (result.stderr ?? '');
      await writeFile(path.join(output, manager + '-' + name + '.log'), log, {
        mode: 0o600,
      });
      report.rows.push({
        manager,
        name,
        installationMode: mode,
        command: file,
        durationMs: Date.now() - start,
        exitCode: result.status,
        logSha256: sha256(log),
      });
      await save();
      console.log(manager + '/' + name + ': ' + result.status);
      assert.equal(
        result.status,
        0,
        'Release acceptance failed: ' +
          manager +
          '/' +
          name +
          '; inspect private local log',
      );
      await verifyArchives(d, frozen);
      await verifySource(d);
    }
  }
  report.status = 'pass';
} catch (error) {
  report.status = 'fail';
  report.error = {
    name: error.name,
    message:
      'Required acceptance failed; no publication/promotion is permitted',
  };
  throw error;
} finally {
  await save();
}
