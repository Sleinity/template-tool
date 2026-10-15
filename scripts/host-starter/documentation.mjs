/** Current host guidance checks; historical evidence retains its original contract. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadDeliveryInventory } from '../release-delivery/bundle.mjs';
import { resolveFixedRuntimeVersion } from '../repository/sdk-runtime-manifest.mjs';

const version = await resolveFixedRuntimeVersion();
const inventory = await loadDeliveryInventory();
assert.equal(inventory.targetRelease, version);
const current = inventory.documents.filter(item => item.classification === 'current');
const retiredImports = /(?:from\s*|import\s*)["']@sleinity\/template-react\/(?:importer|importer\.css)["']/;
for (const item of current) {
  const source = await readFile(item.source, 'utf8');
  assert(!retiredImports.test(source), `Retired production import in ${item.source}`);
  assert(!/unpublished 1\.0\.0|upcoming 1\.0 migration|SDK 0\.8\.0 hosts/.test(source), `Obsolete current release claim in ${item.source}`);
}
const install = await readFile('docs/sdk/INSTALLATION.md', 'utf8');
for (const name of ['core', 'browser', 'react']) assert(install.includes(`sleinity-template-${name}-${version}.tgz`));
const studio = await readFile('docs/sdk/STUDIO_REFERENCE.md', 'utf8');
let pinnedReferences = 0;
for (const match of studio.matchAll(/https:\/\/github\.com\/Sleinity\/template-tool\/blob\/([a-f0-9]{40})\/([^\s)]+)/g)) {
  execFileSync('git', ['cat-file', '-e', `${match[1]}:${match[2]}`], { stdio: 'pipe' });
  pinnedReferences++;
}
assert(pinnedReferences >= 15);
const provenance = JSON.parse(await readFile('docs/sdk/history/sdk-v1.0.0/provenance.json', 'utf8'));
for (const item of provenance.assets) {
  const bytes = await readFile(`docs/sdk/history/sdk-v1.0.0/${item.storedAs}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
}
const files = execFileSync('git', ['ls-files', '-c', '-o', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(file => file.endsWith('.md'));
const target = 'docs/architecture/evidence/sdk-host-release-20261015/documentation-inventory.json';
if (process.argv.includes('--record')) {
  const documents = [...new Set(files)].sort().map(file => {
    const historical = /\/evidence\/|\/decisions\/|\/history\/|SDK_[01]_|\/archive\/|\/legacy\/|CHANGELOG|TEMPLATE_IMPORT_WIZARD|MILESTONE_\d|\/PHASE_|TEMPLATE_PACKAGE_V2_MIGRATION/.test(file)
      || file.startsWith('docs/architecture/') && !['docs/architecture/template-recovery.md'].includes(file);
    return { file, classification: historical ? 'historical-evidence' : /^(docs\/sdk\/|docs\/field-rules\/|examples\/|packages\/)/.test(file) ? 'current-host-guidance' : 'current-maintainer-guidance', policy: historical ? 'Preserve recorded evidence; current SDK guidance supersedes installation and supported-host claims.' : 'Audit current claims against supported API inventories; preserve explicitly Proposed renderer boundaries.' };
  });
  await writeFile(target, JSON.stringify({ method: 'Complete Markdown classification; current delivery/import/version checks, pinned Studio path checks and targeted active-guidance contradiction review. Historical evidence is not rewritten.', version, documents }, null, 2) + '\n');
}
console.log(JSON.stringify({ status: 'pass', version, currentDocuments: current.length, pinnedReferences, historicalAssets: provenance.assets.length }));
