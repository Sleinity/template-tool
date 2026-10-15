/** Node/test-only paired real-ZIP work evidence. Never imported by an SDK entry. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const option = (key, fallback) => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
const baseline = resolve(option('--baseline', 'docs/architecture/evidence/sdk-v2-optimization-20261014/baseline'));
const candidate = resolve(option('--candidate', '.'));
const output = resolve(option('--output', 'docs/architecture/evidence/sdk-v2-optimization-20261014/m0-native.json'));
const counters = process.argv.includes('--counters');
const operations = option('--operations', 'edit,tree,save,recovery').split(',');
const currentSourceHashes = {};
for(const file of Object.keys(JSON.parse(await readFile(join(baseline, 'identity.json'),'utf8')).files)){try{currentSourceHashes[file]=createHash('sha256').update(await readFile(join(candidate,file))).digest('hex');}catch{currentSourceHashes[file]=null;}}
const identity = JSON.parse(await readFile(join(baseline, 'identity.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [file, expected] of Object.entries(identity.files)) assert.equal(hash(await readFile(join(baseline, file))), expected, file);
const entries = {};
for (const phase of ['before', 'current']) {
  entries[phase] = [];
  for (const name of ['template-core', 'template-browser', 'template-react']) {
    const root = phase === 'before' ? join(baseline, 'packages', name) : join(candidate, 'packages', name);
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    for (const subpath of Object.keys(manifest.exports)) {
      if (subpath.endsWith('.css')) continue;
      const stem = join(root, 'src', subpath === '.' ? 'index' : subpath.slice(2));
      let path = `${stem}.ts`;
      try { await readFile(path); } catch { path = `${stem}.tsx`; }
      entries[phase].push([`@sleinity/${name}${subpath === '.' ? '' : subpath.slice(1)}`, path]);
    }
  }
}
const directory = await mkdtemp(join(tmpdir(), 'sdk-v2-optimization-'));
try {
  await build({ configFile: false, logLevel: 'silent', plugins: [{ name: 'paired-sdk-source', enforce: 'pre',
    resolveId(id, importer) {
      if (id === '@optimization/before' || id === '@optimization/current') return `\0${id}`;
      const phase = importer?.startsWith(baseline) || importer === '\0@optimization/before' ? 'before' : 'current';
      return entries[phase].find(([name]) => name === id)?.[1];
    },
    load(id) {
      if (!id.startsWith('\0@optimization/')) return null;
      return `export {createTemplateSessionV2,createTemplateFieldFamilySessionV2} from '@sleinity/template-browser/session';
export {runTemplatePackageImportPipelineV2,createTemplateFieldFamilyFromSourcesV2} from '@sleinity/template-browser/importer';
export {createResolvedRenderTree} from '@sleinity/template-core';
export {InMemoryTemplateSessionRepositoryV2,createInMemoryTemplateRecoveryRepository} from '@sleinity/template-browser/persistence';`;
    },
    transform(code, id) {
      if (!counters) return null;
      const names = id.endsWith('/validateTemplatePackageV2.ts') ? ['validateTemplatePackageV2']
        : id.endsWith('/materializeTemplateFieldContentV2.ts') ? ['materializeTemplateFieldContentV2']
        : id.endsWith('/resolvePrimitiveAppearance.ts') ? ['resolvePrimitiveAppearance']
        : id.endsWith('/createResolvedRenderTree.ts') ? ['createResolvedRenderTree']
        : id.endsWith('/templateSessionV2.ts') ? ['projectTemplatePackageV2ToRendererV1'] : [];
      if(id.endsWith('/materializeTemplateFieldContentV2.ts')){
        code=code.replace('function stableHash(', 'function unprofiledStableHash(');
        code+='\nfunction stableHash(...args){const start=performance.now();try{return unprofiledStableHash(...args);}finally{const w=globalThis.__optimizationWork;if(w)w.materializationFingerprintMs=(w.materializationFingerprintMs??0)+performance.now()-start;}}\n';
      }
      if(id.endsWith('/assetRepository.ts')) {
        code=code.replace('  const nextPackages = packages.map', '  if(globalThis.__optimizationWork){const w=globalThis.__optimizationWork;w.assetCarriers=(w.assetCarriers??0)+packages.length;w.sceneNodesCopiedForCollection=(w.sceneNodesCopiedForCollection??0)+packages.reduce((n,p)=>n+Object.keys(p.nodes??{}).length,0);}\n  const nextPackages = packages.map');
        code=code.replace('  const dataUrl = asset.dataUrl', '  if(globalThis.__optimizationWork)globalThis.__optimizationWork.assetPayloadReads=(globalThis.__optimizationWork.assetPayloadReads??0)+1;\n  const dataUrl = asset.dataUrl');
        return {code,map:null};
      }
      if (id.endsWith('/validateTemplatePackageV2.ts')) code = code.replace('const schemaValidator = getSchemaValidator();',
        'if(globalThis.__optimizationWork)globalThis.__optimizationWork.schemaEvaluations=(globalThis.__optimizationWork.schemaEvaluations??0)+1;const schemaValidator = getSchemaValidator();');
      for (const name of names) {
        code = code.replace(`export function ${name}(`, `function measured_${name}(`);
        code += `\nexport function ${name}(...args){if(globalThis.__optimizationWork)globalThis.__optimizationWork.${name}=(globalThis.__optimizationWork.${name}??0)+1;const start=performance.now();try{return measured_${name}(...args);}finally{if(globalThis.__optimizationWork)globalThis.__optimizationWork.${name}Ms=(globalThis.__optimizationWork.${name}Ms??0)+performance.now()-start;}}\n`;
      }
      return names.length ? { code, map: null } : null;
    },
  }], ssr: { noExternal: true }, build: { ssr: resolve('scripts/repository/sdk-v2-optimization-workload.mjs'), outDir: directory, target: 'esnext', minify: false } });
  globalThis.__optimizationOptions = { counters, operations, scenarios: option('--scenarios', '').split(',').filter(Boolean), memory: process.argv.includes('--memory') };
  const { measure } = await import(pathToFileURL(join(directory, 'sdk-v2-optimization-workload.js')));
  const result = { ...await measure(), currentSourceHashes, baselineSourceHashes: identity.files, candidateSourceDirectory: candidate };
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result.summary, null, 2));
} finally { delete globalThis.__optimizationOptions; delete globalThis.__optimizationWork; await rm(directory, { recursive: true, force: true }); }
