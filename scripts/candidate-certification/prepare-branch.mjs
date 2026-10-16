/** Prepare an isolated certification snapshot; never touch the user's index. */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { verifyFrozenCandidate } from './frozen.mjs';
import { prepareFixtures } from './fixtures.mjs';
import { cloneCertificationSource, assertCertificationInputsOnly } from './snapshot.mjs';

const [archives, gh, output, requestedBranch] = process.argv.slice(2);
assert(archives && gh && output, 'Required archives, authenticated gh path and evidence output');
const root = process.cwd();
const frozen = await verifyFrozenCandidate(path.resolve(archives), { sources: true });
const branch = requestedBranch ?? `codex/sdk-${frozen.version}-certification-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const dir = await mkdtemp(path.join(tmpdir(), 'sdk-candidate-branch-'));
const key = randomBytes(32);
function git(args) {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
try {
  cloneCertificationSource(root, dir, branch);
  // Retain tracked history: documentation checks must not rely on ignored files.
  for (const file of frozen.certifiedSourceFiles) {
    if (!/^(packages\/|apps\/|examples\/|scripts\/|src\/|tools\/|config\/|docs\/|fidelity\/|\.github\/|\.changeset\/)|^[^/]+$/.test(file.file)) throw Error(`Unreviewed source path: ${file.file}`);
    const destination = path.join(dir, file.file);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, file.file), destination);
  }
  await mkdir(path.join(dir, '.certification-input/archives'), { recursive: true });
  for (const file of [...frozen.files.map(item => item.file), 'FROZEN-CANDIDATE.json']) {
    await cp(path.resolve(archives, file), path.join(dir, '.certification-input/archives', file));
  }
  const encrypted = await prepareFixtures(path.join(dir, '.certification-input/fixtures.enc'), key);
  git(['add', '-A']);
  git(['add', '-f', '.certification-input']);
  const stagedPaths = git(['diff', '--cached', '--name-only', '--no-renames', '-z']).split('\0').filter(Boolean);
  assertCertificationInputsOnly(stagedPaths, frozen.files.map(item => item.file));
  const stagedDiff = git(['diff', '--cached', '--stat']);
  // Only the validated snapshot may change the CI secret. The key is never logged.
  const secret = spawnSync(gh, ['secret', 'set', 'SDK_CERT_FIXTURE_KEY', '--repo', 'Sleinity/template-tool'], { input: key.toString('hex'), encoding: 'utf8' });
  assert.equal(secret.status, 0, 'GitHub secret setup failed; no key is logged');
  git(['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'user.name=SDK candidate certification', '-c', 'user.email=certification@example.invalid', 'commit', '--no-verify', '-m', `Certify frozen SDK ${frozen.version} candidate without publication`]);
  const commit = git(['rev-parse', 'HEAD']);
  git(['remote', 'set-url', 'origin', 'https://github.com/Sleinity/template-tool.git']);
  const evidence = { status: 'prepared', branch, commit, directory: dir, sourceSha256: frozen.certifiedSourceSha256, workspaceSourceSha256: frozen.source.filesSha256, archives: frozen.files.filter(file => file.file.endsWith('.tgz')), encryptedFixtures: encrypted, plaintextFixturesCommitted: false, privateKeyCommitted: false, stagedPathsVerified: true, published: false, stagedDiff };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ branch, commit, directory: dir, status: 'prepared' }));
} catch (error) {
  await rm(dir, { recursive: true, force: true });
  throw error;
} finally {
  key.fill(0);
}
