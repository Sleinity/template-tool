/** Read-only publication rehearsal. Synthetic contracts are NOT source/font/fidelity certification. */
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  rm,
} from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { loadDescriptor, verifyArchives, sha256 } from './candidate.mjs';
import { verifyDeliveryBundle } from '../release-delivery/bundle.mjs';
import { extractCandidateExamples } from '../repository/local-sdk-candidate.mjs';
import { createCompactLifecycleFixture } from '../compact-lifecycle-fixture.mjs';

const args = process.argv.slice(2);
assert(
  args.length === 4 && args[0] === '--archives' && args[2] === '--output',
  'Usage: consumer.mjs --archives DIRECTORY --output DIRECTORY',
);
const root = process.cwd(),
  archives = path.resolve(args[1]),
  output = path.resolve(args[3]);
const manager = process.env.TEMPLATE_CONSUMER_PACKAGE_MANAGER ?? 'npm';
assert(
  ['npm', 'pnpm'].includes(manager),
  'Only npm/pnpm rehearsal is supported',
);
await mkdir(output, { recursive: true });
const reportFile = path.join(output, `synthetic-consumer-${manager}.json`);
await rm(reportFile, { force: true });
const report = {
  schemaVersion: 'sdk-publication-synthetic-consumer-v1',
  manager,
  status: 'failed',
  evidence: 'automated synthetic functional rehearsal',
  exactSourceCertification: false,
  limitations: [
    'No exact private exporter fixtures, font activation, browser rendering or PNG capture; retained Milestone 5 certificate covers frozen bytes separately.',
  ],
};
const workspace = await mkdtemp(
  path.join(os.tmpdir(), 'sdk-publication-consumer-'),
);
const env = {
  ...process.env,
  CI: 'true',
  NPM_CONFIG_USERCONFIG: path.join(workspace, '.npmrc'),
};
for (const key of [
  'NODE_AUTH_TOKEN',
  'NPM_TOKEN',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'NODE_PATH',
])
  delete env[key];
function run(command, argumentsValue) {
  const r = spawnSync(command, argumentsValue, {
    cwd: workspace,
    env,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0)
    throw new Error(`${command} failed: ${r.stderr || r.stdout}`);
  return r.stdout;
}
try {
  const d = await loadDescriptor(root);
  await verifyArchives(d, archives);
  const delivery = await verifyDeliveryBundle(archives, {
    root,
    version: d.version,
  });
  await mkdir(path.join(workspace, 'vendor'));
  await mkdir(path.join(workspace, 'src'));
  await writeFile(
    path.join(workspace, '.npmrc'),
    'registry=https://registry.npmjs.org/\n',
  );
  const deps = Object.fromEntries(
    d.archives.map((r) => [r.name, `file:vendor/${r.file}`]),
  );
  for (const r of d.archives)
    await copyFile(
      path.join(archives, r.file),
      path.join(workspace, 'vendor', r.file),
    );
  for (const name of [
    'react',
    'react-dom',
    '@types/react',
    '@types/react-dom',
    'typescript',
  ])
    deps[name] = JSON.parse(
      await readFile(
        path.join(root, 'node_modules', name, 'package.json'),
        'utf8',
      ),
    ).version;
  const manifest = {
    name: 'sdk-publication-synthetic-consumer',
    private: true,
    type: 'module',
    dependencies: deps,
  };
  const overrides = Object.fromEntries(
    d.archives.map((r) => [r.name, deps[r.name]]),
  );
  if (manager === 'npm') manifest.overrides = overrides;
  else
    await writeFile(
      path.join(workspace, 'pnpm-workspace.yaml'),
      `packages:\n  - "."\noverrides:\n${Object.entries(overrides)
        .map(([k, v]) => `  "${k}": "${v}"`)
        .join('\n')}\n`,
    );
  await writeFile(
    path.join(workspace, 'package.json'),
    JSON.stringify(manifest),
  );
  run(manager, [
    'install',
    '--ignore-scripts',
    ...(manager === 'npm' ? ['--no-audit', '--no-fund'] : []),
  ]);
  const lock = await readFile(
    path.join(
      workspace,
      manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml',
    ),
    'utf8',
  );
  assert(
    !/workspace:|link:|npm\.pkg\.github\.com/.test(lock),
    'Workspace/private registry fallback is forbidden',
  );
  for (const r of d.archives) {
    assert(lock.includes(r.file), 'Lockfile must retain each supplied archive');
    const installed = JSON.parse(
      await readFile(
        path.join(workspace, 'node_modules', r.name, 'package.json'),
        'utf8',
      ),
    );
    assert.equal(installed.version, d.version);
  }
  await writeFile(
    path.join(workspace, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: false,
        jsx: 'react-jsx',
        noEmit: true,
      },
      include: ['src'],
    }),
  );
  const snippets = extractCandidateExamples(
    await readFile(path.join(archives, 'SDK-V2-INTEGRATION.md'), 'utf8'),
  );
  for (const [i, s] of snippets.entries())
    await writeFile(path.join(workspace, 'src', `guide-${i}.tsx`), s);
  const examples = delivery.manifest.files.filter((r) =>
    /\.tsx?$/.test(r.file),
  );
  assert(examples.length >= 2, 'Delivered V2 host/helper are required');
  for (const r of examples)
    await copyFile(
      path.join(archives, r.file),
      path.join(workspace, 'src', r.file),
    );
  run(process.execPath, [
    path.join(workspace, 'node_modules/typescript/bin/tsc'),
    '--project',
    'tsconfig.json',
  ]);
  const fixture = await createCompactLifecycleFixture();
  await writeFile(path.join(workspace, 'synthetic.zip'), fixture.bytes);
  await writeFile(
    path.join(workspace, 'probe.mjs'),
    `
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runTemplatePackageImportPipelineV2,appendTemplateSourcesV2} from '@sleinity/template-browser/importer';
import {InMemoryTemplateSessionRepositoryV2} from '@sleinity/template-browser/persistence';
import {createTemplateSessionV2,createTemplateFieldFamilySessionV2} from '@sleinity/template-browser/session';
const sessions=[], result=await runTemplatePackageImportPipelineV2({format:'zip',sourceId:'synthetic',sourceName:'synthetic.zip',buffer:new Uint8Array(await readFile('synthetic.zip')).buffer,fontRegistry:null});
try {
 assert.equal(result.status,'ready'); assert(result.parseResult.validation.valid);
 const repository=new InMemoryTemplateSessionRepositoryV2();
 const single=createTemplateSessionV2({repository}); sessions.push(single); single.load(result.package);
 const initial=single.getFieldControllers()[0].value;
 assert(single.getFieldControllers()[0].setValue('Accepted synthetic edit').accepted);
 const saved=await single.save({name:'Synthetic single'});
 const restored=createTemplateSessionV2({repository});sessions.push(restored);await restored.loadSaved(saved.id);
 assert.equal(restored.getFieldControllers()[0].value,'Accepted synthetic edit');
 assert(restored.getFieldControllers()[0].reset().accepted);assert.equal(restored.getFieldControllers()[0].value,initial);
 const family=appendTemplateSourcesV2(null,[],['one','two'].map(id=>({id,name:id,packageValue:result.package})), 'Synthetic family',{}, {single:{repository},family:{repository}});sessions.push(family);
 assert.equal(family.getSnapshot().family.variants.length,2);
 for(const variant of family.getSnapshot().family.variants){family.selectVariant(variant.id);assert.equal(family.getSnapshot().selectedVariantId,variant.id);assert(family.getFieldControllers()[0].setValue('Family edit').accepted);assert(family.getFieldControllers()[0].reset().accepted);}
 const familySaved=await family.save();const reopened=createTemplateFieldFamilySessionV2({repository});sessions.push(reopened);await reopened.loadSaved(familySaved.id);
 assert.deepEqual(reopened.getSnapshot().contentState,family.getSnapshot().contentState);assert.deepEqual(reopened.getSnapshot().family,family.getSnapshot().family);
} finally {for(const s of sessions)s.dispose();result.dispose();}
console.log('Synthetic V2 single/Family import, edit, Reset, save/reopen and disposal passed');
`,
  );
  report.contractResult = run(process.execPath, ['probe.mjs']).trim();
  await verifyArchives(d, archives);
  report.archives = d.archives;
  report.guideSnippets = snippets.length;
  report.deliveredExamples = examples.map((r) => r.file);
  report.fixtureSha256 = sha256(fixture.bytes);
  report.status = 'passed';
} catch (error) {
  report.error = error.message;
  throw error;
} finally {
  await writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
  await rm(workspace, { recursive: true, force: true });
}
console.log(
  `${manager}: strict delivered guide/example compilation and synthetic V2 contracts passed`,
);
