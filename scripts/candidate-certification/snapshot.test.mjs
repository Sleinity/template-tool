import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { cloneCertificationSource, assertCertificationInputsOnly } from './snapshot.mjs';

test('certification clones retain tracked historical links without copying ignored or dirty input', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'sdk-snapshot-test-'));
  const source = join(temp, 'source'), snapshot = join(temp, 'snapshot');
  try {
    await mkdir(join(source, 'docs'), { recursive: true });
    const git = args => execFileSync('git', args, { cwd: source, encoding: 'utf8' }).trim();
    git(['init', '-q', '--initial-branch=codex/source']);
    git(['config', 'user.name', 'SDK snapshot test']);
    git(['config', 'user.email', 'snapshot@example.invalid']);
    await writeFile(join(source, '.gitignore'), 'private-input.bin\n');
    await writeFile(join(source, 'docs', 'historical.md'), 'Retained historical evidence\n');
    await writeFile(join(source, 'source.ts'), 'committed source\n');
    git(['add', '.']); git(['commit', '-qm', 'Source fixture']);
    await writeFile(join(source, 'private-input.bin'), Buffer.from([1, 2, 3]));
    await writeFile(join(source, 'source.ts'), 'user worktree change\n');
    cloneCertificationSource(source, snapshot, 'codex/certification-test');
    assert.equal(await readFile(join(snapshot, 'docs', 'historical.md'), 'utf8'), 'Retained historical evidence\n');
    assert.equal(await readFile(join(snapshot, 'source.ts'), 'utf8'), 'committed source\n');
    await assert.rejects(() => access(join(snapshot, 'private-input.bin')), { code: 'ENOENT' });
    assert.equal(execFileSync('git', ['status', '--short'], { cwd: snapshot, encoding: 'utf8' }), '');
    assert.equal(await readFile(join(source, 'source.ts'), 'utf8'), 'user worktree change\n');
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('snapshot staging rejects missing evidence or unexpected key/source files before secret setup', () => {
  const files = ['archive.tgz', 'LOCAL-CANDIDATE-MANIFEST.json'];
  const paths = ['.certification-input/fixtures.enc', '.certification-input/archives/FROZEN-CANDIDATE.json', ...files.map(file => '.certification-input/archives/' + file)];
  assertCertificationInputsOnly(paths, files);
  assert.throws(() => assertCertificationInputsOnly([...paths, 'docs/historical.md'], files));
  assert.throws(() => assertCertificationInputsOnly(paths.slice(1), files));
  assert.throws(() => assertCertificationInputsOnly([...paths.slice(1), '.certification-input/key.txt'], files));
});
