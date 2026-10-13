import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {retainedSourcePlugin} from './retained-source-plugin.mjs';
const path='docs/architecture/evidence/now-hiring-text-baseline/identity.json';
const original=JSON.parse(await readFile(path,'utf8'));
const plugin=retainedSourcePlugin(path),renderer='packages/template-react/src/render/TemplatePackageRenderer.tsx';
assert.equal(plugin.transform('current',resolve(renderer)+'?tsx').code,await readFile(original.files[renderer].path,'utf8'));
assert.equal(plugin.transform('unchanged',resolve('packages/template-core/src/index.ts')),null);
const directory=await mkdtemp(join(tmpdir(),'retained-text-sources-'));
try {
 const candidate=join(directory,'identity.json');
 const verify=async record=>{await writeFile(candidate,JSON.stringify(record));assert.throws(()=>retainedSourcePlugin(candidate));};
 const missing=structuredClone(original);delete missing.files['apps/studio/src/styles.css'];await verify(missing);
 const mismatch=structuredClone(original);mismatch.files[renderer].sha256='0'.repeat(64);await verify(mismatch);
 const unrelated=structuredClone(original);unrelated.files['packages/template-core/src/index.ts']=unrelated.files[renderer];await verify(unrelated);
} finally {await rm(directory,{recursive:true,force:true});}
console.log('Retained-source comparison rejects missing, unrelated and hash-mismatched sources.');
