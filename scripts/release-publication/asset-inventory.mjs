import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { verifyDeliveryBundle } from '../release-delivery/bundle.mjs';
import { sha256 } from './candidate.mjs';
import { refuseRetiredOperation } from '../release-baseline/retired.mjs';
refuseRetiredOperation('fixed release reporting/rehearsal');
const [delivery, output] = process.argv.slice(2);
assert(delivery && output);
const { manifest, manifestSha256 } = await verifyDeliveryBundle(delivery);
await writeFile(
  path.join(output, 'asset-inventory.json'),
  JSON.stringify(
    {
      status: 'pass',
      tagCommit: execFileSync(
        'git',
        ['rev-parse', 'refs/tags/sdk-v1.0.0^{commit}'],
        { encoding: 'utf8' },
      ).trim(),
      deliveryManifestSha256: manifestSha256,
      files: await Promise.all(
        manifest.uploadFiles.map(async (file) => ({
          file,
          sha256: sha256(await readFile(path.join(delivery, file))),
        })),
      ),
    },
    null,
    2,
  ) + '\n',
);
