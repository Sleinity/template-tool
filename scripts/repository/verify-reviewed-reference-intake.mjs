import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const protectedPath = /^(fidelity\/references\/approved\/|fidelity\/scene-graph\/snapshots\/|fidelity\/settlement\/snapshots\/)/;
export function verifyIntake({ manifest, baseCommit, changes, read }) {
  if (!changes.length) return 0;
  assert.equal(manifest.schemaVersion, 'reviewed-release-reference-intake-v1');
  assert.equal(baseCommit, manifest.baseCommit, 'Reference intake applies only to its reviewed base commit');
  const allowed = new Map();
  for (const row of manifest.files) {
    assert(protectedPath.test(row.file) && !row.file.includes('..'), 'Invalid intake path');
    assert.equal(row.operation, 'add', 'Existing references cannot be replaced through intake');
    assert(!allowed.has(row.file), 'Duplicate intake path');
    allowed.set(row.file, row);
  }
  assert.equal(changes.length, allowed.size, 'Incomplete or additional protected changes');
  for (const change of changes) {
    assert.equal(change.status, 'A', 'Protected modifications and deletions require separate review');
    const row = allowed.get(change.file);
    assert(row, `Unreviewed protected change: ${change.file}`);
    const bytes = read(change.file);
    assert.equal(bytes.length, row.bytes, change.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, change.file);
    allowed.delete(change.file);
  }
  assert.equal(allowed.size, 0);
  return changes.length;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const base = process.argv[2];
  assert(base, 'A PR base revision is required');
  const git = args => execFileSync('git', args, { encoding: 'utf8' });
  const baseCommit = git(['merge-base', base, 'HEAD']).trim();
  const changes = git(['diff', '--name-status', '--no-renames', `${baseCommit}...HEAD`, '--', 'fidelity/references/approved', 'fidelity/scene-graph/snapshots', 'fidelity/settlement/snapshots']).trim().split('\n').filter(Boolean).map(line => { const [status, file] = line.split('\t'); return { status, file }; });
  const manifest = JSON.parse(readFileSync('config/sdk-1-release-reference-intake.json', 'utf8'));
  const count = verifyIntake({ manifest, baseCommit, changes, read: file => readFileSync(file) });
  console.log(`Protected evidence verified: ${count} exact previously approved additions; PR review remains required.`);
}
