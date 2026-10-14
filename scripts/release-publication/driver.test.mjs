import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runTrain, protectReleaseAssets } from './driver.mjs';
import {
  sha256,
  assertPublicationContext,
  safeRelative,
} from './candidate.mjs';
import { assertEnvironment } from './github.mjs';
const bytes = Buffer.from('certified tar'),
  descriptor = {
    version: '1.0.0',
    candidate: 'test',
    archives: ['core', 'browser', 'react'].map((n) => ({
      name: n,
      file: n + '.tgz',
      bytes: bytes.length,
      sha256: sha256(bytes),
    })),
  };
async function scenario(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'publication-test-'));
  try {
    await fn({
      journalFile: path.join(dir, 'journal.json'),
      archives: dir,
      descriptor,
      sourceCommit: 'reviewed',
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
function registry(initial = {}) {
  const state = new Map(Object.entries(initial)),
    writes = [];
  return {
    state,
    writes,
    async inspect(name) {
      return state.has(name)
        ? { state: 'present', name }
        : { state: 'missing' };
    },
    async download(s) {
      return state.get(s.name);
    },
    async publish(file, row) {
      writes.push(row.name);
      state.set(row.name, bytes);
    },
  };
}
test('read-only rehearsal writes no packages; publication follows dependency order', () =>
  scenario(async (c) => {
    const r = registry();
    delete r.publish;
    const j = await runTrain({ ...c, registry: r });
    assert(j.complete);
    assert.deepEqual(
      j.packages.map((p) => p.status),
      ['would-publish', 'would-publish', 'would-publish'],
    );
    const w = registry();
    await runTrain({ ...c, registry: w, write: true });
    assert.deepEqual(w.writes, ['core', 'browser', 'react']);
  }));
test('matching existing versions are skipped and conflicts fail without mutation', () =>
  scenario(async (c) => {
    const r = registry({ core: bytes });
    await runTrain({ ...c, registry: r, write: true });
    assert.deepEqual(r.writes, ['browser', 'react']);
    const bad = registry({ core: Buffer.from('conflict') });
    await assert.rejects(
      () => runTrain({ ...c, registry: bad, write: true }),
      /Conflicting/,
    );
    assert.deepEqual(bad.writes, []);
    assert.equal(JSON.parse(await readFile(c.journalFile)).complete, false);
  }));
test('failure after Core is journaled and retry verifies accepted bytes before continuing', () =>
  scenario(async (c) => {
    const r = registry(),
      publish = r.publish;
    r.publish = async (f, row) => {
      await publish(f, row);
      if (row.name === 'browser') throw Error('lost response');
    };
    await assert.rejects(
      () => runTrain({ ...c, registry: r, write: true }),
      /uncertain/,
    );
    r.publish = publish;
    await runTrain({ ...c, registry: r, write: true });
    assert.deepEqual(r.writes, ['core', 'browser', 'react']);
  }));
test('unknown outcomes cannot be treated as missing on retry', () =>
  scenario(async (c) => {
    const r = registry();
    r.publish = async () => {
      throw Error('unknown');
    };
    await assert.rejects(() => runTrain({ ...c, registry: r, write: true }));
    let calls = 0;
    r.publish = async () => calls++;
    await assert.rejects(
      () => runTrain({ ...c, registry: r, write: true }),
      /unresolved/,
    );
    assert.equal(calls, 0);
  }));
test('unavailable registry, readback failure and stale journals fail clearly', () =>
  scenario(async (c) => {
    const unavailable = registry();
    unavailable.inspect = async () => {
      throw Error('403');
    };
    await assert.rejects(() =>
      runTrain({ ...c, registry: unavailable, write: true }),
    );
    assert.deepEqual(unavailable.writes, []);
    await assert.rejects(
      () => runTrain({ ...c, sourceCommit: 'other', registry: registry() }),
      /different release/,
    );
    const r = registry();
    r.publish = async () => {};
    await assert.rejects(() => runTrain({ ...c, registry: r, write: true }));
    assert.equal(
      JSON.parse(await readFile(c.journalFile)).packages[0].status,
      'verification-pending',
    );
  }));
test('tag context rejects manual publication, wrong repository, version and target', () => {
  const d = { version: '1.0.0' },
    env = {
      GITHUB_EVENT_NAME: 'push',
      GITHUB_REPOSITORY: 'Sleinity/template-tool',
      GITHUB_REF: 'refs/tags/sdk-v1.0.0',
      GITHUB_SHA: 'a'.repeat(40),
    };
  assertPublicationContext(d, env, env.GITHUB_SHA);
  for (const change of [
    { GITHUB_EVENT_NAME: 'workflow_dispatch' },
    { GITHUB_REPOSITORY: 'other/repo' },
    { GITHUB_REF: 'refs/tags/sdk-v0.8.0' },
    { GITHUB_SHA: 'b'.repeat(40) },
  ])
    assert.throws(() =>
      assertPublicationContext(d, { ...env, ...change }, env.GITHUB_SHA),
    );
});
test('human approval, exact deployment refs and safe paths are required', () => {
  const e = {
      protection_rules: [
        {
          type: 'required_reviewers',
          prevent_self_review: false,
          reviewers: [{ type: 'User', reviewer: { login: 'Sleinity' } }],
        },
      ],
      deployment_branch_policy: { custom_branch_policies: true },
    },
    p = {
      branch_policies: [
        { name: 'main', type: 'branch' },
        { name: 'sdk-v1.0.0', type: 'tag' },
      ],
    };
  assertEnvironment(e, p);
  assert.throws(() => assertEnvironment({ ...e, protection_rules: [] }, p));
  assert.throws(() =>
    assertEnvironment(e, {
      branch_policies: [...p.branch_policies, { name: '*', type: 'branch' }],
    }),
  );
  for (const path of ['../input', '/absolute', 'a\\b', 'a/../b'])
    assert.throws(() => safeRelative(path));
});
test('release assets skip matching bytes and never clobber conflicts', async () => {
  const rows = [{ file: 'package.tgz', sha256: sha256(bytes) }];
  assert.deepEqual(await protectReleaseAssets(rows, [], () => {}), [
    { file: 'package.tgz', action: 'upload' },
  ]);
  assert.deepEqual(
    await protectReleaseAssets(
      rows,
      [{ name: 'package.tgz' }],
      async () => bytes,
    ),
    [{ file: 'package.tgz', action: 'skip' }],
  );
  await assert.rejects(
    () =>
      protectReleaseAssets(rows, [{ name: 'package.tgz' }], async () =>
        Buffer.from('changed'),
      ),
    /Conflicting/,
  );
});

test('GitHub reruns restore the preceding attempt rather than ignoring the same run ID', async () => {
  const { previousInvocation } = await import('./resume-journal.mjs');
  const runs = [
    { id: 2, event: 'push', created_at: '2026-10-14T01:00Z', run_attempt: 2 },
    { id: 1, event: 'push', created_at: '2026-10-13T01:00Z', run_attempt: 1 },
  ];
  assert.deepEqual(previousInvocation(runs, 2, 2), {
    run: runs[0],
    attempt: 1,
  });
  assert.deepEqual(previousInvocation(runs, 2, 1), {
    run: runs[1],
    attempt: 1,
  });
  assert.equal(previousInvocation([runs[1]], 1, 1), null);
});

test('failed publication reporting retains confirmed and uncertain outcomes separately', async () => {
  const { publicationOutcomes } = await import('./driver.mjs');
  assert.deepEqual(
    publicationOutcomes({
      packages: [
        { name: 'core', status: 'published' },
        { name: 'browser', status: 'uncertain' },
        { name: 'react', status: 'unchecked' },
      ],
    }),
    {
      confirmed: [{ package: 'core', operation: 'publish' }],
      uncertain: [{ package: 'browser', status: 'uncertain' }],
    },
  );
  assert.deepEqual(publicationOutcomes(null), { confirmed: [], uncertain: [] });
});
