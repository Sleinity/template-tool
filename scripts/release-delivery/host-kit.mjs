/** Public delivery projection. The complete v1 acceptance bundle remains internal. */
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync, unzipSync, strToU8 } from 'fflate';
import { verifyDeliveryBundle, loadDeliveryInventory, sha256, readDeliveryArchives } from './bundle.mjs';
import { markdownLinks, splitTarget, validateBundleLinks } from './markdown.mjs';

export const repository = 'https://github.com/Sleinity/template-tool';
// Explicit host-facing selection; the remaining inventory stays in version-pinned source.
export const hostDocuments = {
  'SDK-V2-INTEGRATION.md': 'docs/guides/integration.md',
  'SDK-HOST-IMPLEMENTATION.md': 'docs/guides/host-implementation.md',
  'SDK-HOST-LIFECYCLE.md': 'docs/reference/lifecycle.md',
  'SDK-OPERATION-OUTCOMES.md': 'docs/reference/operation-outcomes.md',
  'SDK-INSTALLATION.md': 'docs/guides/installation.md',
  'SDK-QUICKSTART.md': 'docs/guides/quickstart.md',
  'SDK-CAPABILITIES.md': 'docs/reference/capabilities.md',
  'SDK-FEATURES.md': 'docs/reference/features.md',
  'SDK-API-GUIDE.md': 'docs/reference/api.md',
  'SDK-TROUBLESHOOTING.md': 'docs/reference/troubleshooting.md',
  'CONSUMER-COMPATIBILITY.md': 'docs/reference/compatibility.md',
  'FIELD-RULES-BROWSER-SESSION.md': 'docs/reference/field-rules.md',
  'FIELD-RULES-STUDIO-AND-HOSTS.md': 'docs/reference/field-configuration.md',
  'TEMPLATE-RECOVERY.md': 'docs/reference/recovery.md',
  'SDK-2.0-MIGRATION.md': 'docs/migration/sdk-2.0.md',
  'SDK-2.0.1-RELEASE-NOTES.md': 'docs/migration/sdk-2.0.1.md',
  'AGENT-INTEGRATION-PROMPTS.md': 'docs/agents/integration-prompts.md',
  'sdk-entry-points.json': 'docs/reference/sdk-entry-points.json',
  'sdk-public-api.json': 'docs/reference/sdk-public-api.json',
};
export const publicNames = (version, additive = false) => ({
  kit: `template-sdk-${version}-host-kit.zip`,
  manifest: additive ? 'HOST-KIT-MANIFEST.json' : 'SDK-DELIVERY-MANIFEST.json',
  sums: additive ? 'HOST-KIT-SHA256SUMS' : 'SHA256SUMS',
});
const json = value => JSON.stringify(value, null, 2) + '\n';
const record = (file, bytes) => ({ file, bytes: bytes.length, sha256: sha256(bytes) });
export function safeKitPath(file) {
  assert(typeof file === 'string' && file.length && !/[\\\x00-\x1f:]/.test(file) && !file.startsWith('/') && !file.split('/').some(s => !s || s === '.' || s === '..'), `Unsafe kit path: ${file}`);
  return file;
}
export function unpackKit(bytes) {
  const names = new Set(); let total = 0;
  // Inspect central directory attributes too: unzip libraries need not expose Unix symlinks.
  const buffer = Buffer.from(bytes); let end = buffer.length - 22;
  while (end >= Math.max(0, buffer.length - 65557) && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  assert(end >= 0 && buffer.readUInt32LE(end) === 0x06054b50, 'Missing ZIP directory');
  assert.equal(end + 22 + buffer.readUInt16LE(end + 20), buffer.length, 'Trailing ZIP data');
  assert.equal(buffer.readUInt16LE(end + 4), 0); assert.equal(buffer.readUInt16LE(end + 6), 0);
  const count = buffer.readUInt16LE(end + 10); assert.equal(buffer.readUInt16LE(end + 8), count);
  assert(count > 0 && count < 1000, 'Invalid ZIP entry count');
  let offset = buffer.readUInt32LE(end + 16); const start = offset;
  for (let i = 0; i < count; i++) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50, 'Invalid ZIP directory');
    const length = buffer.readUInt16LE(offset + 28), extra = buffer.readUInt16LE(offset + 30), comment = buffer.readUInt16LE(offset + 32);
    safeKitPath(buffer.subarray(offset + 46, offset + 46 + length).toString('utf8'));
    const mode = buffer.readUInt32LE(offset + 38) >>> 16;
    assert((mode & 0xf000) === 0 || (mode & 0xf000) === 0x8000, 'Non-regular ZIP entry');
    offset += 46 + length + extra + comment;
  }
  assert.equal(offset, end); assert.equal(offset - start, buffer.readUInt32LE(end + 12));
  const files = unzipSync(bytes, { filter: entry => {
    safeKitPath(entry.name); const key = entry.name.toLowerCase();
    assert(!names.has(key), 'Duplicate ZIP entry'); names.add(key);
    total += entry.originalSize; assert(entry.originalSize <= 256 * 1024 * 1024 && total <= 512 * 1024 * 1024, 'Oversized kit');
    return true;
  } });
  assert.equal(names.size, count);
  for (const file of Object.keys(files)) {
    safeKitPath(file);
    for (let parent = path.posix.dirname(file); parent !== '.'; parent = path.posix.dirname(parent)) assert(!names.has(parent.toLowerCase()), 'Conflicting ZIP paths');
  }
  return files;
}
export async function extractKit(bytes, directory) {
  const files = unpackKit(bytes);
  for (const [name, data] of Object.entries(files)) {
    const target = path.join(directory, name); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, data, { flag: 'wx' });
  }
  return files;
}
function rootReadme(version) {
  return `# Template SDK ${version} host kit

Start here. This kit includes the runnable React/TypeScript example, all three SDK packages in [vendor/](vendor/README.md), and offline host documentation.

## Run the example

Use Node 22.23.3 and pnpm 11.9.0 or npm. React 19 is included in the application dependencies. Chromium is the supported acceptance target.

1. Extract the complete ZIP into an empty directory.
2. Run \`npm install\` then \`npm run dev\`, or \`pnpm install\` then \`pnpm dev\`.
3. Import one exporter 0.6.1 ZIP for a single design, or multiple sources for a Family. Supply authorized exact fonts when requested.
4. Edit fields and Choices, Reset, Save, reopen Fresh or Resume, and export PNG when the preview is ready.
5. Run \`npm run build\` or \`pnpm build\` before integration. Keep one package-manager lockfile.

The SDK archives are already in vendor/. Installation downloads public application dependencies; no GitHub Packages credential is needed. Designs, private fixtures and font binaries are not included.

## Integrate into an existing app

Copy the three archives from vendor/ into your application's vendor/ directory. Follow [installation](docs/guides/installation.md) for dependencies and pnpm overrides, then [V2 integration](docs/guides/integration.md) and [host implementation](docs/guides/host-implementation.md). Upgrade Core, Browser and React together to ${version}.

Use the example's [CompleteHost](src/CompleteHost.tsx), [import lifecycle](src/fieldHostLifecycle.ts) and [persistence composition](src/starterPersistence.ts) as host-owned examples. Import supported public SDK entries only.

## Documentation

- Guides: [quickstart](docs/guides/quickstart.md), [installation](docs/guides/installation.md), [integration](docs/guides/integration.md), [implementation](docs/guides/host-implementation.md).
- Reference: [features](docs/reference/features.md), [API](docs/reference/api.md), [lifecycle](docs/reference/lifecycle.md), [operation outcomes](docs/reference/operation-outcomes.md), [field rules](docs/reference/field-rules.md), [field configuration](docs/reference/field-configuration.md), [recovery](docs/reference/recovery.md), [troubleshooting](docs/reference/troubleshooting.md), [compatibility](docs/reference/compatibility.md).
- Migration: [SDK 2.0](docs/migration/sdk-2.0.md), [2.0.1 bugfix notes](docs/migration/sdk-2.0.1.md).
- Agents: [integration instructions](docs/agents/integration-prompts.md).
- Machine-readable reference: [entry points](docs/reference/sdk-entry-points.json), [public API](docs/reference/sdk-public-api.json), [delivery provenance](DELIVERY.json).

Recovery autosave is this example host's 650 ms policy. Current native readiness guards PNG. See the lifecycle and outcomes references before adapting persistence or navigation.

UNLICENSED; authorized for Sleinity-owned applications only. Functional delivery checks do not constitute new source/font pixel certification.
`;
}
function installation(archives) {
  const deps = Object.fromEntries(archives.map(a => [a.name, `file:vendor/${a.file}`]));
  return `# Installation

The example already contains all SDK archives and dependency mappings. Run npm install or pnpm install from the extracted kit root.

## Existing application

Use Node 22.23.3 with pnpm 11.9.0 or npm, and React/React DOM 19. Copy all three archives from this kit's vendor/ into your application's vendor/. Add:

\`\`\`json
${json({ dependencies: { ...deps, react: '^19.0.0', 'react-dom': '^19.0.0' } }).trim()}
\`\`\`

For pnpm also add these overrides to pnpm-workspace.yaml so transitive SDK dependencies use the same archives:

\`\`\`yaml
overrides:
${Object.entries(deps).map(([name, value]) => `  "${name}": "${value}"`).join('\n')}
\`\`\`

Install and commit your application lockfile. Avoid mixing registry and vendored SDK packages or workspace/source aliases. Core-only consumers can use the Core archive independently; Browser needs a DOM, and React bindings require React 19.

Vendored SDK installation needs no registry credentials. Installation downloads public application dependencies; offline reopening after application load is separate from offline installation.

Read [V2 integration](integration.md), [host implementation](host-implementation.md), [lifecycle](../reference/lifecycle.md) and [compatibility](../reference/compatibility.md). SDK identity and archive hashes are in [delivery provenance](../../DELIVERY.json) and [checksums](../../SHA256SUMS).

UNLICENSED; authorized for Sleinity-owned applications only.
`;
}
function cleanPublishedText(text, version) {
  return text.replace(/^> (?:Registry-derived SDK|Unpublished local candidate|Publication-path simulation).*\n/gm, '')
    .replaceAll(`Use the approved SDK ${version} delivery when released`, `Use this SDK ${version} delivery`)
    .replace(/versioned patch candidate/g, 'published bugfix release');
}
export function rewriteHostMarkdown(text, file, mapping, exclusions, revision) {
  for (const link of markdownLinks(text).sort((a, b) => b.start - a.start)) {
    const target = splitTarget(link.target); if (target.external || !target.file) continue;
    assert(!target.file.includes('\\') && !path.posix.isAbsolute(target.file), 'Unsafe documentation link');
    const output = mapping.get(target.file); let replacement;
    if (output) replacement = encodeURI(path.posix.relative(path.posix.dirname(file), output)).replace(/#/g, '%23') + target.rawFragment;
    else {
      const source = exclusions.get(target.file); assert(source, `Unmapped host reference: ${file} -> ${link.target}`);
      replacement = `${repository}/blob/${revision}/${source}${target.rawFragment}`;
    }
    text = text.slice(0, link.start) + replacement + text.slice(link.end);
  }
  return text;
}
export async function generatePublicDelivery(internal, output, { root = process.cwd(), sourceRevision, deliveryRevision, additive = false } = {}) {
  for (const revision of [sourceRevision, deliveryRevision]) assert(/^[a-f0-9]{40}$/.test(revision), 'Full source and delivery revisions required');
  const { manifest: accepted } = await verifyDeliveryBundle(internal, { root });
  assert.equal(accepted.scope, 'runtime');
  assert(accepted.mode === 'release' && accepted.provenance === 'registry-download', 'Public kit requires registry-derived acceptance inputs');
  assert.notEqual(path.resolve(internal), path.resolve(output), 'Public projection must not overwrite internal acceptance staging');
  const version = accepted.version, names = publicNames(version, additive), inventory = await loadDeliveryInventory(root);
  const files = unpackKit(await readFile(path.join(internal, 'SDK-HOST-STARTER.zip')));
  delete files['vendor/.gitkeep'];
  const add = (file, data) => { safeKitPath(file); files[file] = typeof data === 'string' ? strToU8(data) : new Uint8Array(data); };
  const mapping = new Map(Object.entries(hostDocuments));
  const exclusions = new Map();
  for (const item of inventory.documents) {
    if (mapping.has(item.file)) continue;
    if (item.transform === 'example-source') mapping.set(item.file, 'src/' + item.file);
    else exclusions.set(item.file, item.source);
  }
  mapping.set('SDK-README.md', 'README.md'); mapping.set('SDK-HOST-STARTER.zip', 'README.md');
  mapping.set('SDK-DELIVERY-MANIFEST.json', 'DELIVERY.json'); mapping.set('CORE-SHA256SUMS', 'SHA256SUMS'); mapping.set('SHA256SUMS', 'SHA256SUMS');
  for (const archive of accepted.archives) {
    const bytes = await readFile(path.join(internal, archive.file)); assert.equal(sha256(bytes), archive.sha256);
    add('vendor/' + archive.file, bytes); mapping.set(archive.file, 'vendor/' + archive.file);
  }
  for (const [input, outputFile] of Object.entries(hostDocuments)) {
    const item = inventory.documents.find(i => i.file === input); assert(item, 'Unregistered host document: ' + input);
    let bytes = await readFile(path.join(internal, input));
    if (input.endsWith('.md')) {
      let text = cleanPublishedText(bytes.toString(), version);
      text = rewriteHostMarkdown(text, outputFile, mapping, exclusions, deliveryRevision);
      add(outputFile, text);
    } else add(outputFile, bytes);
  }
  add('README.md', rootReadme(version)); add('docs/guides/installation.md', installation(accepted.archives));
  add('docs/guides/quickstart.md', `# Quickstart\n\nStart with [Run the example](../../README.md#run-the-example) or [Integrate into an existing app](../../README.md#integrate-into-an-existing-app).\n\nThe kit contains all three SDK packages in vendor/. No additional SDK downloads or registry credentials are required. Read [installation](installation.md) and [host implementation](host-implementation.md) before adapting the example.\n`);
  add('vendor/README.md', `# SDK archives\n\nThese are the exact Core, Browser and React ${version} archives. Keep all three at the same version. See [installation](../docs/guides/installation.md) and [checksums](../SHA256SUMS).\n`);
  const provenance = { schemaVersion: 'sdk-host-kit-provenance-v1', version, sourceRevision, deliveryRevision, sdkProvenance: accepted.provenance, archives: accepted.archives, sourceFidelityCertification: false };
  add('DELIVERY.json', json(provenance));
  add('SHA256SUMS', accepted.archives.map(a => `${a.sha256}  vendor/${a.file}\n`).join(''));
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'host-kit-links-'));
  try {
    for (const [file, bytes] of Object.entries(files)) { await mkdir(path.dirname(path.join(temporary, file)), { recursive: true }); await writeFile(path.join(temporary, file), bytes); }
    await validateBundleLinks(temporary, Object.keys(files));
  } finally { await rm(temporary, { recursive: true, force: true }); }
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en'));
  const bytes = Buffer.from(zipSync(Object.fromEntries(entries.map(([file, data]) => [file, [data, { mtime: new Date(2020, 0, 1) }]])), { level: 9 }));
  const kit = { ...record(names.kit, bytes), entries: entries.map(([file, data]) => record(file, data)) };
  const manifest = { schemaVersion: 'sdk-public-delivery-v2', version, layout: additive ? 'additive' : 'standard', sourceRevision, deliveryRevision, archives: accepted.archives, kit,
    uploadFiles: additive ? [names.kit, names.manifest, names.sums] : [names.kit, ...accepted.archives.map(a => a.file), names.manifest, names.sums] };
  await mkdir(output, { recursive: true }); await writeFile(path.join(output, names.kit), bytes);
  if (!additive) for (const a of accepted.archives) await copyFile(path.join(internal, a.file), path.join(output, a.file));
  const manifestBytes = Buffer.from(json(manifest)); await writeFile(path.join(output, names.manifest), manifestBytes);
  await writeFile(path.join(output, names.sums), [...(additive ? [] : accepted.archives), kit, record(names.manifest, manifestBytes)].map(a => `${a.sha256}  ${a.file}\n`).join(''));
  await verifyPublicDelivery(output, { additive });
  return manifest;
}
export async function verifyPublicDelivery(directory, { additive = false } = {}) {
  const manifestName = additive ? 'HOST-KIT-MANIFEST.json' : 'SDK-DELIVERY-MANIFEST.json';
  const manifestBytes = await readFile(path.join(directory, manifestName)), manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schemaVersion, 'sdk-public-delivery-v2'); assert.equal(manifest.layout, additive ? 'additive' : 'standard');
  assert(/^\d+\.\d+\.\d+$/.test(manifest.version));
  for (const revision of [manifest.sourceRevision, manifest.deliveryRevision]) assert(/^[a-f0-9]{40}$/.test(revision));
  const names = publicNames(manifest.version, additive); assert.equal(manifest.kit.file, names.kit);
  assert.deepEqual(manifest.archives.map(a => a.name), ['@sleinity/template-core', '@sleinity/template-browser', '@sleinity/template-react']);
  assert.deepEqual(manifest.uploadFiles, additive ? [names.kit, names.manifest, names.sums] : [names.kit, ...manifest.archives.map(a => a.file), names.manifest, names.sums]);
  const bytes = await readFile(path.join(directory, names.kit)); assert.deepEqual(record(names.kit, bytes), (({ entries, ...r }) => r)(manifest.kit));
  const files = unpackKit(bytes), actual = Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([file, data]) => record(file, data));
  assert.deepEqual(actual, manifest.kit.entries, 'Kit contents differ from public manifest');
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'verify-host-kit-'));
  try {
    await extractKit(bytes, temporary);
    await validateBundleLinks(temporary, Object.keys(files));
    const found = await readDeliveryArchives(path.join(temporary, 'vendor'), { version: manifest.version }); assert.deepEqual(found, manifest.archives);
    const pkg = JSON.parse(Buffer.from(files['package.json']).toString()); assert.equal(pkg.version, manifest.version);
    for (const archive of found) {
      assert.equal(archive.version, manifest.version); assert.equal(archive.file, `sleinity-${archive.name.split('/')[1]}-${manifest.version}.tgz`);
      assert.equal(pkg.dependencies[archive.name], `file:vendor/${archive.file}`);
      assert(Buffer.from(files['pnpm-workspace.yaml']).toString().includes(`"${archive.name}": "file:vendor/${archive.file}"`));
      if (!additive) assert.deepEqual(record(archive.file, await readFile(path.join(directory, archive.file))), (({ name, version, ...r }) => r)(archive));
    }
    const metadata = JSON.parse(Buffer.from(files['DELIVERY.json']).toString());
    assert.equal(metadata.version, manifest.version); assert.equal(metadata.sourceRevision, manifest.sourceRevision); assert.equal(metadata.deliveryRevision, manifest.deliveryRevision); assert.deepEqual(metadata.archives, manifest.archives);
    assert.equal(Buffer.from(files['SHA256SUMS']).toString(), manifest.archives.map(a => `${a.sha256}  vendor/${a.file}\n`).join(''));
    const sums = [...(additive ? [] : manifest.archives), manifest.kit, record(names.manifest, manifestBytes)].map(a => `${a.sha256}  ${a.file}\n`).join('');
    assert.equal(await readFile(path.join(directory, names.sums), 'utf8'), sums, 'Incomplete or modified public checksums');
    return { manifest, files: Object.keys(files), kitSha256: sha256(bytes) };
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
export function releaseBody(manifest, previous = '') {
  previous = previous.replace(/<!-- host-kit:start -->[\s\S]*?<!-- host-kit:end -->\s*/g, '').replace(/^> Registry-derived SDK.*\n/gm, '').trim();
  const url = `${repository}/releases/download/sdk-v${manifest.version}/`;
  return `<!-- host-kit:start -->
# Template SDK ${manifest.version}

**[Download the complete host kit](${url}${manifest.kit.file})** · [Checksums](${url}${publicNames(manifest.version, manifest.layout === 'additive').sums})

Includes Core, Browser and React packages, a runnable React/TypeScript example, and organized offline documentation.

- **New app:** extract the ZIP, run npm install then npm run dev (or pnpm install then pnpm dev).
- **Existing app:** open README.md → Integrate into an existing app. Copy the included vendor archives and follow the installation guide.

Node 22.23.3; React 19; pnpm 11.9.0 or npm. Supply your designs and authorized fonts. Public application dependencies are downloaded during installation; no GitHub Packages credential is needed.

${manifest.layout === 'additive' ? 'Older individual downloads remain available below with their original URLs. ' : 'Individual SDK tarballs remain available for existing applications. '}GitHub's Source code ZIP/tar.gz links are repository snapshots; use the host kit for integration.

UNLICENSED; authorized for Sleinity-owned applications only. This delivery update does not change the SDK or claim new source/font pixel certification.
<!-- host-kit:end -->
${previous ? '\n' + previous + '\n' : ''}`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, directory, output] = process.argv.slice(2), additive = process.argv.includes('--additive');
  if (command === 'generate') {
    const option = name => process.argv[process.argv.indexOf(name) + 1];
    await generatePublicDelivery(path.resolve(directory), path.resolve(output), { additive, sourceRevision: option('--source-revision'), deliveryRevision: option('--delivery-revision') });
  } else if (command === 'verify' || command === 'upload-paths' || command === 'notes') {
    const { manifest } = await verifyPublicDelivery(path.resolve(directory), { additive });
    if (command === 'upload-paths') process.stdout.write(manifest.uploadFiles.map(f => path.join(directory, f)).join('\n') + '\n');
    if (command === 'notes') process.stdout.write(releaseBody(manifest));
  } else throw new Error('Expected generate, verify, upload-paths or notes');
}
