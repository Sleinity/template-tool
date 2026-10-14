import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPublicationContext,
  verifyTaggedSdkSource,
  sha256,
} from './candidate.mjs';
import { publicationHistory, findPreviousWriter } from './resume-journal.mjs';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const tag = '33bd70dbca1f02cdd6c80a83dc1ba4666d2ed348';
const descriptor = {
  version: '1.0.0',
  existingTagRecovery: { tagCommit: tag },
};
const env = {
  GITHUB_REPOSITORY: 'Sleinity/template-tool',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main',
  SDK_RESUME_EXISTING_TAG: 'true',
  SDK_RECOVERY_EXPECTED_TAG_COMMIT: tag,
  SDK_RECOVERY_HANDOFF_INTENT: 'false',
  SDK_RECOVERY_PROMOTE_INTENT: 'false',
};
test('existing-tag recovery validates its actual dispatch and refuses arbitrary or mixed contexts', () => {
  assertPublicationContext(descriptor, env, tag);
  for (const patch of [
    { GITHUB_REPOSITORY: 'fork/tool' },
    { GITHUB_SHA: 'bad' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REF: 'refs/heads/other' },
    { SDK_RESUME_EXISTING_TAG: 'false' },
    { SDK_RECOVERY_EXPECTED_TAG_COMMIT: 'b'.repeat(40) },
    { SDK_RECOVERY_HANDOFF_INTENT: 'true' },
    { SDK_RECOVERY_PROMOTE_INTENT: 'true' },
  ])
    assert.throws(() =>
      assertPublicationContext(descriptor, { ...env, ...patch }, tag),
    );
  assert.throws(() =>
    assertPublicationContext(descriptor, env, 'b'.repeat(40)),
  );
  assert.throws(() => assertPublicationContext({ version: '1.0.0' }, env, tag));
  const push = {
    GITHUB_REPOSITORY: env.GITHUB_REPOSITORY,
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF: 'refs/tags/sdk-v1.0.0',
    GITHUB_SHA: tag,
  };
  assertPublicationContext(descriptor, push, tag);
  assert.throws(() =>
    assertPublicationContext(descriptor, push, 'b'.repeat(40)),
  );
});
test('tagged SDK source is independently hash verified and missing/drifted tags fail', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdk-tag-source-test-'));
  try {
    const file = 'packages/template-core/package.json',
      bytes = Buffer.from('{"version":"1.0.0"}');
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), bytes);
    const git = (args) =>
      execFileSync('git', args, {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    git(['init']);
    git(['add', '.']);
    git([
      '-c',
      'user.name=Source test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-m',
      'source',
    ]);
    const commit = git(['rev-parse', 'HEAD']).toString().trim(),
      d = { sourceFiles: [{ file, sha256: sha256(bytes) }] };
    assert.equal(verifyTaggedSdkSource(d, commit, root).certifiedFiles, 1);
    const modified = structuredClone(d);
    modified.sourceFiles[0].sha256 = '0'.repeat(64);
    assert.throws(() => verifyTaggedSdkSource(modified, commit, root));
    assert.throws(() => verifyTaggedSdkSource(d, '0'.repeat(40), root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('recovery preserves the latest writer journal across changed tooling heads and skipped preflights', async () => {
  const runs = [
    {
      id: 4,
      event: 'workflow_dispatch',
      head_branch: 'main',
      created_at: '2026-10-14T04:00Z',
      run_attempt: 1,
    },
    {
      id: 3,
      event: 'push',
      head_sha: tag,
      created_at: '2026-10-14T03:00Z',
      run_attempt: 1,
    },
    {
      id: 2,
      event: 'workflow_dispatch',
      head_branch: 'main',
      created_at: '2026-10-14T02:00Z',
      run_attempt: 1,
    },
    {
      id: 1,
      event: 'push',
      head_sha: 'b'.repeat(40),
      created_at: '2026-10-14T01:00Z',
      run_attempt: 1,
    },
  ];
  const history = publicationHistory(runs, 4, 1, tag);
  assert.deepEqual(
    history.map((r) => r.run.id),
    [3, 2],
  );
  const previous = await findPreviousWriter(history, ({ run }) => [
    {
      name: 'publish',
      steps: [
        {
          name: 'Publish exact archives after human environment approval',
          status: run.id === 2 ? 'completed' : 'skipped',
          conclusion: run.id === 2 ? 'failure' : 'skipped',
          started_at: run.id === 2 ? '2026-10-14T02:10Z' : null,
        },
      ],
    },
  ]);
  assert.equal(previous.run.id, 2);
  assert.equal(publicationHistory(runs, 4, 2, tag)[0].attempt, 1);
  assert.equal(await findPreviousWriter(history, () => []), null);
  assert.throws(() =>
    publicationHistory(
      Array.from({ length: 100 }, () => runs[0]),
      4,
      1,
      tag,
    ),
  );
});
test('recovery preserves real event identity, human gates and frozen publication only', async () => {
  const source = await readFile('docs/architecture/evidence/sdk-1-baseline-20261014/workflows/release.yml', 'utf8');
  assert(source.includes('resume_existing_tag'));
  assert(source.includes('expected_tag_commit'));
  assert(
    !/GITHUB_EVENT_NAME:\s*push|GITHUB_SHA:\s*\$|git tag|--force|--clobber/.test(
      source,
    ),
  );
  assert(source.includes('environment: private-sdk-release'));
  assert(
    source.includes(
      'inputs.prepare_runtime_handoff == false && inputs.promote_stable == false',
    ),
  );
  const cli = await readFile('scripts/release-publication/cli.mjs', 'utf8');
  assert(cli.includes('verifyTaggedSdkSource(d, commit)'));
  assert(cli.includes('resolveRemoteTag()'));
  assert(
    cli.includes(
      'sourceCommit: writer ? report.tagCommit : report.sourceCommit',
    ),
  );
});
