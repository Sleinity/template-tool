/** Build-local differential; no baseline source is written into the worktree. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'vite';
const out = resolve(process.argv[2] ?? '/tmp/f7-native-20261015'); await mkdir(out, { recursive: true });
const baseline = resolve('docs/architecture/evidence/f7-readiness-20261015/baseline');
const identity = JSON.parse(await readFile(join(baseline, 'identity.json'), 'utf8'));
const file = 'packages/template-browser/src/session/templateFieldFamilySessionV2.ts';
const bytes = await readFile(join(baseline, file)); assert.equal(createHash('sha256').update(bytes).digest('hex'), identity.files[file]);
const transcripts = {};
for (const version of ['before', 'current']) {
  const plugin = { name: 'native-media-differential', enforce: 'pre', transform(code, id) {
    if (id.endsWith('/' + file) && version === 'before') code = bytes.toString();
    const names = id.endsWith('/fieldRulesV2.ts') ? ['materializeTemplateFieldFamilyVariantV2'] : id.endsWith('/templateSessionV2.ts') ? ['projectTemplatePackageV2ToRendererV1'] : id.endsWith('/createResolvedRenderTree.ts') ? ['createResolvedRenderTree'] : [];
    for (const name of names) { assert(code.includes(`export function ${name}(`)); code = code.replace(`export function ${name}(`, `function f7_${name}(`); code += `\nexport function ${name}(...args: Parameters<typeof f7_${name}>) {globalThis.__f7NativeCounts??={};globalThis.__f7NativeCounts['${name}']=(globalThis.__f7NativeCounts['${name}']??0)+1;return f7_${name}(...args);}\n`; }
    return names.length || id.endsWith('/' + file) ? { code, map: null } : null;
  } };
  await build({ configFile: resolve('apps/studio/vite.config.ts'), plugins: [plugin], logLevel: 'error', ssr: { noExternal: true }, build: { ssr: resolve('packages/template-browser/test/familyMediaReadiness.test.ts'), outDir: join(out, version), target: 'esnext', minify: false } });
  globalThis.__f7NativeBaseline = version === 'before';
  await import(pathToFileURL(join(out, version, 'familyMediaReadiness.test.js')).href);
  transcripts[version] = globalThis.__f7NativeTranscript;
}
assert.deepEqual(transcripts.current, transcripts.before, 'Controlled callback transcripts differ');
await writeFile(join(out, 'differential.json'), JSON.stringify({ status: 'pass', outcomes: transcripts.current.length, baselineSha256: identity.files[file], transcripts }, null, 2) + '\n');
console.log(`F7 native differential: ${transcripts.current.length} exact outcomes; stable candidate references and zero completion semantic calls.`);
