/** Explicit review-time operation, never called by publication or rehearsal. */
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { descriptorFile, sha256 } from './candidate.mjs';
import { refuseRetiredOperation } from '../release-baseline/retired.mjs';
refuseRetiredOperation('historical source binding refresh');
const allowed = [
  'package.json',
  '.github/workflows/release.yml',
  'scripts/release-delivery/workflow.mjs',
  'scripts/release-delivery/workflow.test.mjs',
  'scripts/release-delivery/simulate-publication.mjs',
  'scripts/repository/verify-release-contract.mjs',
  'docs/sdk/RELEASE_PREPARATION.md',
  'docs/sdk/GITHUB_SETUP.md',
  'scripts/repository/verify-runtime-release-consumer.mjs',
  'scripts/repository/verify-host-font-authority.mjs',
  'scripts/repository/blocked-storage-packed-host.mjs',
  'scripts/repository/verify-template-editor-reference.mjs',
  'scripts/repository/verify-template-family-reference.mjs',
  'scripts/example-lifecycle/verify.mjs',
];
const d = JSON.parse(await readFile(descriptorFile, 'utf8'));
d.reviewedToolingChanges = [];
for (const file of allowed) {
  const row = d.sourceFiles.find((r) => r.file === file);
  if (row) {
    const hash = sha256(await readFile(file));
    if (hash !== row.sha256)
      d.reviewedToolingChanges.push({
        file,
        sha256: hash,
        reason:
          'Milestone 8 private release tooling/acceptance; no SDK build or dependency change',
      });
  }
}
const files = execFileSync(
  'git',
  [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
    '--',
    'scripts/release-publication',
    '.github/workflows/release-rehearsal.yml',
    '.github/workflows/release-preparation.yml',
  ],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean)
  .sort();
d.publisherSourceFiles = await Promise.all(
  files.map(async (file) => ({ file, sha256: sha256(await readFile(file)) })),
);
await writeFile(descriptorFile, JSON.stringify(d, null, 2) + '\n');
console.log(
  'Reviewed tooling bindings refreshed; review this diff before publication.',
);
