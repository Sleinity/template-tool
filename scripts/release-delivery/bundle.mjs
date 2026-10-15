/** One handoff authority for local candidates and registry-derived artifacts. */
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { loadRuntimeDistribution, loadRuntimePackageDefinitions, resolveFixedRuntimeVersion, runtimeArchiveName } from '../repository/sdk-runtime-manifest.mjs';
import { validateInventory, rewriteMarkdown, validateBundleLinks } from './markdown.mjs';
import { createStarter } from './starter.mjs';
export const deliveryManifestName = 'SDK-DELIVERY-MANIFEST.json';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export async function loadDeliveryInventory(root = process.cwd()) {
  const inventory = JSON.parse(await readFile(path.join(root, 'config/sdk-delivery-inventory.json'), 'utf8'));
  if (inventory.schemaVersion !== 'sdk-delivery-inventory-v1' || inventory.targetRelease !== await resolveFixedRuntimeVersion(root)) throw new Error('Invalid delivery inventory');
  validateInventory(inventory.documents);
  const occupied = new Set(inventory.documents.map(i => i.file.toLowerCase()));
  for (const file of [...inventory.generatedFiles, ...inventory.localGeneratedFiles]) {
    if (path.basename(file) !== file || occupied.has(file.toLowerCase())) throw new Error(`Generated inventory collision: ${file}`);
    occupied.add(file.toLowerCase());
  }
  return inventory;
}
export function archivePackageManifest(bytes) {
  const tar = gunzipSync(bytes); let result;
  for (let p = 0; p + 512 <= tar.length;) {
    const header = tar.subarray(p, p + 512); if (header.every(c => c === 0)) break;
    const string = (a, b) => header.subarray(a, b).toString().replace(/\0.*$/s, '');
    const prefix = string(345, 500), name = (prefix ? prefix + '/' : '') + string(0, 100);
    const size = Number.parseInt(string(124, 136).trim() || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0 || p + 512 + size > tar.length) throw new Error('Invalid archive header');
    if (name === 'package/package.json') {
      if (result || !['0', '\0', ''].includes(string(156, 157))) throw new Error('Invalid/duplicate archive package manifest');
      result = JSON.parse(tar.subarray(p + 512, p + 512 + size).toString());
    }
    p += 512 + Math.ceil(size / 512) * 512;
  }
  if (!result?.name || !result.version) throw new Error('Archive package manifest missing');
  return result;
}
export async function readDeliveryArchives(directory, { root = process.cwd(), version, scope = 'runtime' } = {}) {
  version ??= await resolveFixedRuntimeVersion(root);
  const records = [];
  for (const pkg of (await loadRuntimePackageDefinitions(root)).filter(p=>scope!=='core'||p.name==='@sleinity/template-core')) {
    const file = runtimeArchiveName(pkg, version), bytes = await readFile(path.join(directory, file)), actual = archivePackageManifest(bytes);
    if (actual.name !== pkg.name || actual.version !== version) throw new Error(`Archive name/version mismatch: ${file}`);
    records.push({ file, name: actual.name, version: actual.version, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return records;
}
function notice(context) {
  if (context.mode === 'local') return `> Unpublished local candidate ${context.version}. Not published or certified by packing. Do not mix it with published archives carrying the same version.\n`;
  if (context.provenance === 'test-simulation') return `> Publication-path simulation for ${context.version}. These supplied local archives have not been published or uploaded.\n`;
  return `> Registry-derived SDK ${context.version} delivery. Generation is not certification; require the archive-bound consumer verification reports.\n`;
}
function install(context) {
  const dependencies = Object.fromEntries(context.archives.map(a => [a.name, `file:vendor/${a.file}`]));
  return `# SDK installation\n\n${notice(context)}\nUse Node 22.23.3 and pnpm 11.9.0 (or npm) for host acceptance. Chromium is the certified browser target. Use every archive listed in this delivery and [verify their checksums](SHA256SUMS).\nThe [V2 guide](SDK-V2-INTEGRATION.md) is the recommended contract.\n\n## Vendored installation\n\nCopy the archives into your host's vendor directory. ${context.scope==='core'?'Core-only import has no React peer; full runtime hosts additionally require Browser/React and React 19.':'React and React DOM 19 are peers.'}\n\n\`\`\`json\n${JSON.stringify({ dependencies: { ...dependencies, ...(context.scope==='core'?{}:{react: '^19.0.0', 'react-dom': '^19.0.0'}) } }, null, 2)}\n\`\`\`\n\nRun npm install and commit the lockfile. For pnpm, map the same private dependency closure:\n\n\`\`\`yaml\noverrides:\n${Object.entries(dependencies).map(([name, value]) => `  "${name}": "${value}"`).join('\n')}\n\`\`\`\n\nVendored installation needs no registry credentials. Registry downloads are authorized release operations, separate from host runtime.\nArchives and documents are bound by [the delivery manifest](SDK-DELIVERY-MANIFEST.json); old published 0.8 migration instructions are [historical](SDK-0.8-MIGRATION.md).\nThe distribution is UNLICENSED, authorized for Sleinity-owned applications only.\n`;
}
function runtime(context) {
  return `# SDK ${context.version} runtime handoff\n\n${notice(context)}${context.scope==='core'?'> Core-only delivery: obtain the complete three-package train for runtime sessions, rendering and export.\n':''}\nStart with [V2 integration](SDK-V2-INTEGRATION.md), [installation](SDK-INSTALLATION.md), [ownership](SDK-HOST-LIFECYCLE.md) and [operation outcomes](SDK-OPERATION-OUTCOMES.md).\n\n## Recommended V2 contract\n\nUse runTemplatePackageImportPipelineV2, native single/Family sessions and TemplateFieldSessionRendererV2 through supported entries. Staged imports retain their candidate until font preparation and explicit acceptance finish. Export remains gated by native readiness.\n\n${context.scope==='core'?'Obtain the complete runtime delivery for the host starter.':'Start with [onboarding](SDK-QUICKSTART.md) and the complete [starter archive](SDK-HOST-STARTER.zip).'} It includes native single/Family editing, saved templates, recovery and guarded PNG. [Implementation](SDK-HOST-IMPLEMENTATION.md) and [features](SDK-FEATURES.md) explain ownership and limits. No Studio or internal imports are needed.\n\n| Package | Archive | SHA-256 | Bytes |\n| --- | --- | --- | ---: |\n${context.archives.map(a => `| ${a.name} | [${a.file}](${a.file}) | ${a.sha256} | ${a.bytes} |`).join('\n')}\n\n## Ownership and recovery\n\nCore validates canonical values; Browser owns native mutation acceptance, resources, persistence and readiness; React renders and binds. Configuration Apply is distinct from Review/save persistence and output recovery autosave. See [field configuration](FIELD-RULES-STUDIO-AND-HOSTS.md), [recovery](TEMPLATE-RECOVERY.md) and [the 2.0 migration plan](SDK-2.0-MIGRATION.md).\n\n## Focused and advanced entries\n\nUse the [capability catalog](SDK-CAPABILITIES.md) and delivered entry/API inventories. Entries named renderer-internal or session-internal are unsupported repository seams; hosts must never import those internal entries. Studio remains a private source example, not a public UI contract.\n\n## Retired workflows\n\nV1 wizard, confirmation, session/editor and persistence workflows are retired. ZIP admission requires raw schema 1.0 and exporter 0.6.1; canonical schema remains 2.2. The examples use V2. Unknown historical stored bytes remain untouched. Published [0.8 migration](SDK-0.8-MIGRATION.md) is historical and does not describe current canonical migration policy.\n\n## Delivery provenance\n\n${context.distribution.authorizedUse}; policy ${context.distribution.licensePolicy}. [Source repository](${context.distribution.repositoryUrl}). Mode: ${context.mode}; provenance: ${context.provenance}. No handoff generation command uploads, tags or publishes.\n`;
}
function core(context) {
  const a = context.archives.find(a => a.name === '@sleinity/template-core');
  return `# Template core ${a.version} importer handoff\n\n${notice(context)}\nPackage: @sleinity/template-core; archive [${a.file}](${a.file}); SHA-256 ${a.sha256}.\n\nCore-only hosts use createZipBundleReader/loadTemplatePackageBundleSource for portable ZIP/source evidence and parseTemplatePackageV2 for canonical V2 normalization/validation. Core does not prepare browser fonts, own native sessions or certify PNG readiness. Runtime hosts start with the [V2 guide](SDK-V2-INTEGRATION.md) and [runtime handoff](SDK-RUNTIME-HANDOFF.md).\n\n## Install\n\nVendor the verified Core archive; ajv and fflate are transitive dependencies. See [installation](SDK-INSTALLATION.md) for the full runtime dependency closure. React is not required for Core-only import.\n\n## Strict source reader example\n\n\`\`\`ts\nimport { createZipBundleReader, loadTemplatePackageBundleSource } from "@sleinity/template-core";\nexport function importZip(buffer: ArrayBuffer, name: string) {\n  const result = loadTemplatePackageBundleSource(createZipBundleReader(buffer, { sourceName: name }));\n  return { importable: result.valid, sourcePackage: result.packageValue, validation: result.validation, diagnostics: result.diagnostics };\n}\n\`\`\`\n\nInvalid source outcomes and invocation failures are described in [operation outcomes](SDK-OPERATION-OUTCOMES.md). Rendering and browser persistence are separate authorities.\n`;
}
function exampleReadme(context) {
  return `# Complete V2 editing host\n\n${notice(context)}\n${context.scope==='core'?'Obtain the three-package runtime delivery and its starter archive first.':'Unzip [SDK-HOST-STARTER.zip](SDK-HOST-STARTER.zip), copy this delivery’s three archives into vendor/, and follow [onboarding](SDK-QUICKSTART.md).'} The standalone project includes source, styles, exact dependency closure, React 19, TypeScript and Vite configuration.\n\nOne ZIP opens a single template; multiple prepared sources open a native Family. Exact fonts, typed controls, Choices, replacement/crop demonstration, Reset, Save/reopen, Fresh/Resume/Discard, 650 ms host-owned recovery autosave and guarded PNG are included. Cleanup-only Retry never exports twice.\n\n[CompleteHost.tsx](CompleteHost.tsx) and [starterPersistence.ts](starterPersistence.ts) compose public SDK entries with the staged [font/import lifecycle](fieldHostLifecycle.ts). [FieldRulesV2Host.tsx](FieldRulesV2Host.tsx) remains a focused single-source example. All helper code is private example composition, not a new SDK API.\n\nRead [implementation](SDK-HOST-IMPLEMENTATION.md), [features](SDK-FEATURES.md), [Studio references](STUDIO-REFERENCE.md), [ownership](SDK-HOST-LIFECYCLE.md) and [operation outcomes](SDK-OPERATION-OUTCOMES.md). No private ZIP/font inputs are bundled.\n`;
}

export async function generateDeliveryBundle({ archivesDirectory, outputDirectory, root = process.cwd(), version, mode = 'local', provenance = 'local-pack', scope = 'runtime' }) {
  if (!['runtime','core'].includes(scope)) throw new Error('Invalid delivery scope');
  if (!['local', 'release'].includes(mode) || !['local-pack', 'registry-download', 'test-simulation'].includes(provenance) || (mode === 'local' && provenance !== 'local-pack') || (mode === 'release' && provenance === 'local-pack')) throw new Error('Invalid delivery mode/provenance');
  version ??= await resolveFixedRuntimeVersion(root);
  await mkdir(outputDirectory, { recursive: true });
  await rm(path.join(outputDirectory, deliveryManifestName), { force: true });
  for (const label of ['npm','pnpm']) await rm(path.join(outputDirectory, `CONSUMER-VERIFICATION-${label}.json`), { force: true });
  const inventory = await loadDeliveryInventory(root), archives = await readDeliveryArchives(archivesDirectory, { root, version, scope });
  const context = { version, mode, provenance, scope, archives, distribution: await loadRuntimeDistribution(root) };
  const outputs = new Set([...inventory.documents.map(i => i.file), ...inventory.generatedFiles]);
  for (const archive of archives) {
    if (outputs.has(archive.file)) throw new Error(`Archive inventory collision: ${archive.file}`);
    if (path.resolve(archivesDirectory, archive.file) !== path.resolve(outputDirectory, archive.file)) await copyFile(path.join(archivesDirectory, archive.file), path.join(outputDirectory, archive.file));
  }
  const files = [];
  const starter = scope === 'runtime' ? await createStarter(root, archives, version) : null;
  if (starter) {
    await writeFile(path.join(outputDirectory, starter.record.file), starter.bytes);
    files.push(starter.record);
  } else await rm(path.join(outputDirectory, 'SDK-HOST-STARTER.zip'), { force: true });
  for (const item of inventory.documents) {
    let text = await readFile(path.join(root, item.source), 'utf8');
    const sourceSha256 = sha256(Buffer.from(text));
    if (item.transform === 'runtime') text = runtime(context);
    else if (item.transform === 'core') text = core(context);
    else if (item.transform === 'installation') text = install(context);
    else if (item.transform === 'example-readme') text = exampleReadme(context);
    else if (item.transform === 'example-source') {
      // Resolve relative source imports through the same inventory, not SDK aliases.
      text = text.replace(/(from\s+["'])(\.[^"']+)(["'])/g, (full, before, relative, after) => {
        const source = path.posix.normalize(path.posix.join(path.posix.dirname(item.source), relative));
        const target = inventory.documents.find(i => [i.source, i.source.replace(/\.(?:tsx?|jsx?)$/, '')].includes(source));
        if (!target) throw new Error(`Unmapped example import: ${relative}`);
        return before + './' + target.file.replace(/\.(?:tsx?|jsx?)$/, '') + after;
      });
    }
    const rendered = ['runtime', 'core', 'installation', 'example-readme'].includes(item.transform);
    if (item.file.endsWith('.md')) {
      if (!rendered) text = rewriteMarkdown(text, item, inventory.documents);
      if (item.classification === 'historical') text = '> Historical published-version guidance. Not the current V2 or upcoming 2.0 migration contract.\n\n' + text;
      if (item.classification === 'compatibility') text = '> V1 compatibility API example; not the recommended V2 integration.\n\n' + text;
      if (item.classification === 'upcoming') text = '> 2.0.0 is staged only. Consult actual archive versions in the delivery manifest.\n\n' + text;
      if (item.transform === 'context') text = text.replace(/<!-- delivery-context:start -->[\s\S]*?<!-- delivery-context:end -->/, notice(context));
    }
    const bytes = Buffer.from(text); await writeFile(path.join(outputDirectory, item.file), bytes);
    files.push({ file: item.file, source: item.source, classification: item.classification, sourceSha256, bytes: bytes.length, sha256: sha256(bytes) });
  }
  for (const [file, selected] of [['SHA256SUMS', [...archives, ...(starter ? [starter.record] : [])]], ['CORE-SHA256SUMS', archives.filter(a => a.name === '@sleinity/template-core')]]) {
    const bytes = Buffer.from(selected.map(a => `${a.sha256}  ${a.file}`).join('\n') + '\n'); await writeFile(path.join(outputDirectory, file), bytes);
    files.push({ file, classification: 'checksums', bytes: bytes.length, sha256: sha256(bytes) });
  }
  if (mode === 'local') {
    const file = inventory.localGeneratedFiles[0], bytes = Buffer.from(`# Unpublished SDK ${version} verification\n\nThese local archives are not published delivery. Packing alone is not certification.\nStart with [V2 integration](SDK-V2-INTEGRATION.md); validate the delivery and its consumer reports.\nThe candidate manifest records the creation snapshot separately. Do not reuse an existing tag or mix same-version published archives. Version ${version} requires current archive-bound cross-platform certification.\n`);
    await writeFile(path.join(outputDirectory, file), bytes);
    files.push({ file, classification: 'local-only', bytes: bytes.length, sha256: sha256(bytes) });
  }
  // Invalidate a previous handoff before validating this generation. The manifest
  // target exists for links, but can never masquerade as completed evidence.
  await writeFile(path.join(outputDirectory, deliveryManifestName), JSON.stringify({ schemaVersion: 'delivery-generation-in-progress' }));
  let links;
  try { links = await validateBundleLinks(outputDirectory, files.map(i => i.file)); }
  catch (cause) { await rm(path.join(outputDirectory, deliveryManifestName), { force: true }); throw cause; }
  const manifest = { schemaVersion: 'sdk-delivery-manifest-v1', version, targetRelease: inventory.targetRelease, mode, provenance, scope, certification: 'not-yet-verified', inventorySha256: sha256(await readFile(path.join(root, 'config/sdk-delivery-inventory.json'))), archives, files, links, uploadFiles: [...archives.map(a => a.file), ...files.map(f => f.file), deliveryManifestName] };
  await writeFile(path.join(outputDirectory, deliveryManifestName), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
export async function verifyDeliveryBundle(directory, { root = process.cwd(), version } = {}) {
  const bytes = await readFile(path.join(directory, deliveryManifestName)), manifest = JSON.parse(bytes);
  const inventory = await loadDeliveryInventory(root); version ??= await resolveFixedRuntimeVersion(root);
  if (manifest.schemaVersion !== 'sdk-delivery-manifest-v1' || manifest.version !== version || manifest.targetRelease !== inventory.targetRelease || manifest.certification !== 'not-yet-verified') throw new Error('Incompatible delivery manifest');
  if (!['runtime','core'].includes(manifest.scope)) throw new Error('Invalid delivery scope');
  if (manifest.inventorySha256 !== sha256(await readFile(path.join(root, 'config/sdk-delivery-inventory.json')))) throw new Error('Delivery inventory differs from the current contract');
  if (!['local','release'].includes(manifest.mode) || !['local-pack','registry-download','test-simulation'].includes(manifest.provenance) || (manifest.mode==='local') !== (manifest.provenance==='local-pack')) throw new Error('Invalid delivery provenance');
  const expected = [...inventory.documents.map(i => i.file), 'SHA256SUMS', 'CORE-SHA256SUMS', ...(manifest.scope==='runtime'?['SDK-HOST-STARTER.zip']:[]), ...(manifest.mode==='local'?inventory.localGeneratedFiles:[])].sort();
  if (JSON.stringify(manifest.files.map(f => f.file).sort()) !== JSON.stringify(expected)) throw new Error('Incomplete/duplicate delivery files');
  if (JSON.stringify(manifest.uploadFiles) !== JSON.stringify([...manifest.archives.map(a => a.file), ...manifest.files.map(f => f.file), deliveryManifestName])) throw new Error('Invalid delivery upload inventory');
  for (const item of [...manifest.archives, ...manifest.files]) {
    if (path.basename(item.file) !== item.file || /[\r\n\\]/.test(item.file)) throw new Error('Unsafe delivery filename');
    const actual = await readFile(path.join(directory, item.file));
    if (actual.length !== item.bytes || sha256(actual) !== item.sha256) throw new Error(`Delivery bytes differ: ${item.file}`);
  }
  for (const item of inventory.documents) {
    const evidence = manifest.files.find(f=>f.file===item.file);
    if (evidence.source !== item.source || evidence.classification !== item.classification || evidence.sourceSha256 !== sha256(await readFile(path.join(root,item.source)))) throw new Error(`Delivery source differs from current contract: ${item.file}`);
  }
  if (manifest.scope === 'runtime') {
    const expectedStarter = await createStarter(root, manifest.archives, version);
    const actualStarter = manifest.files.find(item => item.file === 'SDK-HOST-STARTER.zip');
    if (actualStarter.sha256 !== expectedStarter.record.sha256 || JSON.stringify(actualStarter.sources) !== JSON.stringify(expectedStarter.record.sources)) throw new Error('Starter differs from current source/dependency contract');
  }
  const archives = await readDeliveryArchives(directory, { root, version, scope: manifest.scope });
  if (JSON.stringify(archives) !== JSON.stringify(manifest.archives)) throw new Error('Delivery archive contract differs');
  const links = await validateBundleLinks(directory, manifest.files.map(f => f.file));
  if (JSON.stringify(links) !== JSON.stringify(manifest.links)) throw new Error('Delivery link evidence differs');
  return { manifest, manifestSha256: sha256(bytes), links };
}
