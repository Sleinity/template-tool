import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  loadDescriptor,
  verifySource,
  verifyArchives,
  sha256,
  safeRelative,
  assertPublicationContext,
  toolchain,
} from './candidate.mjs';
import { validateFidelity, resolveReleaseTag } from './promotion.mjs';
import { preflightGithub } from './github.mjs';
import { RegistryReadClient } from './registry.mjs';
const d = await loadDescriptor();
toolchain();
await verifySource(d);
await verifyArchives(d, process.argv[2]);
assertPublicationContext(d, process.env, await resolveReleaseTag());
preflightGithub();
const evidence = JSON.parse(
  await readFile('config/sdk-release-verification.json', 'utf8'),
);
assert(
  evidence.fidelity,
  'Current macOS fidelity evidence is required before publication',
);
safeRelative(evidence.fidelity.file);
assert(evidence.fidelity.file.startsWith('docs/architecture/evidence/'));
const bytes = await readFile(evidence.fidelity.file);
assert.equal(sha256(bytes), evidence.fidelity.sha256);
validateFidelity(JSON.parse(bytes), d);
const client = new RegistryReadClient();
for (const row of d.archives) {
  const state = await client.inspect(row.name, d.version);
  if (state.state === 'present')
    assert.equal(sha256(await client.download(state)), row.sha256);
  else assert.equal(state.state, 'missing');
}
console.log(
  'Source, frozen archives, macOS fidelity, environment and authenticated registry preflight passed',
);
