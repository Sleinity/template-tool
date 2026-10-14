import assert from 'node:assert/strict';
export function assertBaselineWorkflow(source){
 assert(source.includes('pnpm sdk:baseline:verify --hosts'));
 assert(source.includes('contents: read')&&source.includes('packages: read'));
 assert(source.includes('github.event.pull_request.head.repo.full_name == github.repository'));
 assert(source.includes('node-version: 22.23.3')&&source.includes('version: 11.9.0'));
 assert(!/\bwrite\b|upload-artifact|fixtures\.enc|SDK_CERT_FIXTURE_KEY|\.certification-input|release-publication\/cli\.mjs|npm publish|pnpm release|gh release (?:edit|create|upload)|git tag/.test(source),'Active workflow must remain read-only and independent of temporary inputs');
 return true;
}
