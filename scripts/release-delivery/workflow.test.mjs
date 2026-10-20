import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{assertDeliveryWorkflow}from'./workflow.mjs';
const source=await readFile('.github/workflows/release.yml','utf8');
test('actual workflow gates publication and verifies inventory before upload',()=>assert(assertDeliveryWorkflow(source)));
test('workflow mutation checks reject manual publish, skipped validation and independent uploads',()=>{for(const changed of[source.replace('      - name: Prepare shared published runtime handoff','      - run: pnpm release\n      - name: Prepare shared published runtime handoff'),source.replace('cli.mjs verify','cli.mjs skipped'),source.replace('verify-kit.mjs --delivery public-release-artifacts','skipped.mjs'),source.replace('host-kit.mjs generate','host-kit.mjs skipped'),source.replace('--mode release --provenance registry-download','--mode local --provenance local-pack'),source.replace('host-kit.mjs verify public-release-artifacts','host-kit.mjs skipped')])assert.throws(()=>assertDeliveryWorkflow(changed));});
test('release guards reject missing exact input ownership, cleanup or published host checks',()=>{
  for(const changed of [source.replace('uses: ./.github/actions/sdk-certified-inputs','uses: skipped'),source.replace('vars.SDK_RELEASE_FROZEN_SHA256','vars.UNBOUND'),source.replace('if: always()\n        run: rm -rf "$RUNNER_TEMP/sdk-fixtures"','if: success()\n        run: rm -rf "$RUNNER_TEMP/sdk-fixtures"'),source.replaceAll('scripts/host-starter/verify.mjs','scripts/skipped.mjs'),source.replaceAll('--archives "$SDK_CERTIFIED_ARCHIVES"','--archives unrelated')])assert.throws(()=>assertDeliveryWorkflow(changed));
});
test('portable CI excludes private-input hosts and certification rehearses them after restore',async()=>{
  const ci=await readFile('.github/workflows/ci.yml','utf8');assert(!/template-(?:editor|family):acceptance/.test(ci));
  const certification=await readFile('.github/workflows/candidate-certification.yml','utf8');
  assert(certification.includes('pnpm ci:portable'));
  assert(certification.indexOf('fixtures.mjs restore')<certification.indexOf('verify-template-editor-reference.mjs'));
  assert(certification.includes('verify-template-family-reference.mjs --archives'));
  const action=await readFile('.github/actions/sdk-certified-inputs/action.yml','utf8');
  assert(action.indexOf('release-inputs.mjs check-run')<action.indexOf('actions/download-artifact@v4'));
  assert(action.indexOf('release-inputs.mjs verify')<action.indexOf('fixtures.mjs restore'));
  const preflight=await readFile('.github/workflows/release-preflight.yml','utf8');
  assert(preflight.includes('uses: ./.github/actions/sdk-certified-inputs'));
  assert(preflight.includes('simulate-publication.mjs "$SDK_CERTIFIED_ARCHIVES"'));
  assert(!/pnpm release(?:\s|$)|npm publish|changeset publish|gh release (?:create|upload)/.test(preflight));
});
