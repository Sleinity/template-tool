import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  loadDescriptor,
  verifyArchives,
  verifySource,
  toolchain,
  retainArtifact,
  assertPublicationContext,
  sha256,
} from './candidate.mjs';
import { github, githubJson, preflightGithub } from './github.mjs';
import { RegistryReadClient, RegistryWriteClient } from './registry.mjs';
import { runTrain, protectReleaseAssets } from './driver.mjs';
import { verifyDeliveryBundle } from '../release-delivery/bundle.mjs';
const [command, ...args] = process.argv.slice(2),
  options = {};
for (let i = 0; i < args.length; i += 2) {
  assert(
    ['--archives', '--output', '--journal', '--download', '--assets'].includes(
      args[i],
    ) &&
      args[i + 1] &&
      !args[i + 1].startsWith('--'),
    'Unknown or missing option',
  );
  assert(!options[args[i]], 'Duplicate option');
  options[args[i]] = args[i + 1];
}
assert(
  ['prepare', 'verify', 'preflight', 'rehearse', 'publish', 'assets'].includes(
    command,
  ),
  'Expected prepare, verify, preflight, rehearse, publish or assets',
);
const d = await loadDescriptor(),
  environment = toolchain(),
  output =
    options['--output'] ??
    path.join(
      process.env.RUNNER_TEMP ?? '/private/tmp',
      'sdk-publication-results',
    );
await mkdir(output, { recursive: true });
const report = {
  schemaVersion: 'sdk-publication-report-v1',
  command,
  environment,
  candidate: d.candidate,
  version: d.version,
  archives: d.archives,
  status: 'running',
  mutations: [],
};
try {
  if (command === 'prepare') {
    assert(options['--archives'], 'Required empty output directory');
    const artifact = d.retainedArtifact ?? d.originArtifact;
    const run = githubJson('actions/runs/' + artifact.runId);
    assert.equal(
      run.conclusion,
      'success',
      'Artifact source run is not successful',
    );
    assert.equal(run.head_sha, artifact.headSha);
    report.retention = await retainArtifact(
      d,
      githubJson('actions/artifacts/' + artifact.id),
      github('actions/artifacts/' + artifact.id + '/zip', { binary: true }),
      options['--archives'],
      artifact,
    );
  } else {
    await verifySource(d);
    report.sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    if (command === 'assets') {
      report.github = preflightGithub();
      assert.equal(process.env.SDK_RELEASE_ENVIRONMENT, 'private-sdk-release');
      assert.equal(process.env.GITHUB_REPOSITORY, d.repository);
      assert(
        ['push', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME),
        'Assets require the guarded workflow',
      );
      if (process.env.GITHUB_EVENT_NAME === 'push')
        assertPublicationContext(
          d,
          process.env,
          execFileSync(
            'git',
            ['rev-parse', `refs/tags/sdk-v${d.version}^{commit}`],
            { encoding: 'utf8' },
          ).trim(),
        );
      else
        assert.equal(
          process.env.GITHUB_REF,
          'refs/heads/main',
          'Manual asset refresh requires main',
        );
      const dir = options['--assets'];
      assert(dir, 'Generated delivery required');
      const { manifest } = await verifyDeliveryBundle(dir);
      const expected = await Promise.all(
        manifest.uploadFiles.map(async (file) => ({
          file,
          sha256: sha256(await readFile(path.join(dir, file))),
        })),
      );
      const tag = 'sdk-v' + d.version;
      let release;
      try {
        release = githubJson('releases/tags/' + tag);
      } catch {
        throw Error(
          'Create the prerelease explicitly in the release workflow before uploading assets',
        );
      }
      assert.equal(release.tag_name, tag);
      const actions = await protectReleaseAssets(
        expected,
        release.assets ?? [],
        async (a) =>
          github('releases/assets/' + a.id, {
            binary: true,
            accept: 'application/octet-stream',
          }),
      );
      assert(
        release.prerelease || actions.every((x) => x.action === 'skip'),
        'Stable release assets cannot be changed',
      );
      for (const a of actions.filter((x) => x.action === 'upload'))
        execFileSync(
          process.env.SDK_GH_EXECUTABLE ?? 'gh',
          [
            'release',
            'upload',
            tag,
            path.join(dir, a.file),
            '--repo',
            d.repository,
          ],
          { stdio: 'inherit' },
        );
      report.assetActions = actions;
    } else {
      assert(options['--archives'], 'Supplied archives are required');
      await verifyArchives(d, options['--archives']);
      if (command !== 'verify') {
        const writer = command === 'publish';
        if (writer)
          assertPublicationContext(d, process.env, process.env.GITHUB_SHA);
        report.github = preflightGithub();
        if (writer) {
          const tag = 'sdk-v' + d.version;
          const commit = execFileSync(
            'git',
            ['rev-parse', `refs/tags/${tag}^{commit}`],
            { encoding: 'utf8' },
          ).trim();
          assertPublicationContext(d, process.env, commit);
          assert.equal(
            process.env.SDK_RELEASE_ENVIRONMENT,
            'private-sdk-release',
          );
        }
        const registry = writer
          ? new RegistryWriteClient()
          : new RegistryReadClient();
        report.journal = await runTrain({
          descriptor: d,
          archives: options['--archives'],
          registry,
          journalFile:
            options['--journal'] ?? path.join(output, 'journal.json'),
          sourceCommit: report.sourceCommit,
          write: writer,
        });
        if (options['--download']) {
          await mkdir(options['--download'], { recursive: true });
          for (const row of d.archives) {
            const state = await registry.inspect(row.name, d.version);
            assert.equal(state.state, 'present');
            const bytes = await registry.download(state);
            assert.equal(sha256(bytes), row.sha256);
            await writeFile(path.join(options['--download'], row.file), bytes, {
              flag: 'wx',
            });
          }
        }
        report.mutations = writer
          ? report.journal.packages
              .filter((x) => x.status === 'published')
              .map((x) => ({ package: x.name, operation: 'publish' }))
          : [];
      }
    }
  }
  report.status = 'pass';
} catch (e) {
  report.status = 'fail';
  report.error = {
    name: e.name,
    message:
      'Verification or operation failed; inspect the candidate, registry access, environment and journal',
  };
  throw e;
} finally {
  await writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
console.log(
  JSON.stringify({
    status: report.status,
    command,
    version: d.version,
    mutations: report.mutations.length,
  }),
);
