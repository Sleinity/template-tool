/** Test-only retained-source overlay. No production bundle or reference writes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const allowed = new Set([
 'packages/template-react/src/render/TemplatePackageRenderer.tsx',
 'packages/template-react/src/internal/runtime-routing/useCoreLayoutRuntime.ts',
 'packages/template-react/src/internal/runtime-routing/textMeasurementInputs.ts',
 'apps/studio/src/workspace/DraftEditor.tsx',
 'apps/studio/src/field-rules/FieldContentEditorV2.tsx',
 'apps/studio/src/field-rules/deferredFieldDrafts.ts',
 'apps/studio/src/styles.css',
]);
export function retainedSourcePlugin(identityPath) {
 const identity = JSON.parse(readFileSync(identityPath, 'utf8'));
 assert.deepEqual(Object.keys(identity.files).sort(), [...allowed].sort(), 'Retained comparison requires all seven audited sources');
 const sources = new Map();
 for (const [file, record] of Object.entries(identity.files)) {
  assert(allowed.has(file), `Unexpected retained source: ${file}`);
  const bytes = readFileSync(record.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, file);
  sources.set(resolve(file), bytes.toString());
 }
 return { name:'hash-verified-retained-text-sources', enforce:'pre', transform(code,id) {
  const source=sources.get(id.split('?')[0]);
  return source===undefined?null:{code:source,map:null};
 } };
}
