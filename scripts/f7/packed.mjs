/** Fresh supplied-archive consumers with durable manager-specific evidence. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyDeliveryBundle } from '../release-delivery/bundle.mjs';
const directory = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
mkdirSync(output, { recursive: true });
const candidate = JSON.parse(readFileSync(resolve(directory, 'LOCAL-CANDIDATE-MANIFEST.json')));
await verifyDeliveryBundle(directory);
for (const manager of ['npm', 'pnpm']) {
  const checks = [];
  for (const [id, script, args] of [
    ['public-contract', 'scripts/repository/verify-packed-consumer.mjs', ['--archives', directory]],
    ['delivered-example', 'scripts/example-lifecycle/verify.mjs', ['--archives', directory, '--delivered', '--manager', manager, '--output', resolve(output, manager)]],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { env: { ...process.env, TEMPLATE_CONSUMER_PACKAGE_MANAGER: manager }, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    writeFileSync(resolve(output, `${manager}-${id}.txt`), `${result.stdout || ''}\n${result.stderr || ''}`);
    checks.push({ id, script, args, exitCode: result.status, error: result.error?.message || null });
    writeFileSync(resolve(output, `${manager}-checks.json`), JSON.stringify(checks, null, 2) + '\n');
    assert.equal(result.status, 0, `${manager}/${id}\n${result.stdout}\n${result.stderr}`);
  }
  const example = JSON.parse(readFileSync(resolve(output, manager, 'report.json')));
  assert.equal(example.status, 'pass'); assert(example.deliveredCopies);
  for (const archive of example.archives) assert.equal(archive.sha256, candidate.archives.find(a => a.file === archive.file)?.sha256);
  const report = { schemaVersion: 'f7-packed-consumer-v1', candidateId: candidate.candidateId, manager,
    archives: candidate.archives, passed: true, literalGuideExamplesTypechecked: true,
    actualDeliveredExample: example, checks, publication: false };
  writeFileSync(resolve(directory, `CONSUMER-VERIFICATION-${manager}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(`${manager}: supplied public contracts, literal guide examples and delivered browser lifecycles pass`);
}
