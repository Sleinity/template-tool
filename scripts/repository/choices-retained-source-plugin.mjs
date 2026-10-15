/** Test-only historical UI overlay. Never changes working sources or references. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
export function choicesRetainedSourcePlugin() {
 const identity=JSON.parse(readFileSync('docs/architecture/evidence/choices-baseline/identity.json','utf8'));
 const allowed=['apps/studio/src/field-rules/FieldConfigurationEditorV2.tsx','apps/studio/src/field-rules/FieldContentEditorV2.tsx','apps/studio/src/field-rules/deferredFieldDrafts.ts'];
 assert.deepEqual(Object.keys(identity.files).sort(),allowed.sort());
 const sources=new Map();
 for(const [file,record] of Object.entries(identity.files)) {
  const bytes=readFileSync(record.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,file);
  sources.set(resolve(file),bytes.toString());
 }
 return {name:'historical-choices-audit-only',enforce:'pre',transform(_code,id){const code=sources.get(id.split('?')[0]);return code===undefined?null:{code,map:null}}};
}
