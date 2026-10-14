/** Publication/delivery ordering checks; runtime packages remain unchanged. */
export function assertDeliveryWorkflow(source) {
  const start=source.indexOf('\n  publish:'),split=source.indexOf('\n  handoff:');
  if(start<0||split<=start)throw Error('Separate publication and handoff jobs required');
  const publish=source.slice(start,split),handoff=source.slice(split);
  if(!publish.includes("if: github.event_name == 'push' && github.ref == 'refs/tags/sdk-v1.0.0'")||!publish.includes('pnpm release --archives'))throw Error('Only exact SDK tag pushes may publish certified archives');
  if(/changeset publish|pnpm (?:packages:build|sdk:verify|pack)|npm pack|version-packages/.test(publish))throw Error('Publication cannot build, pack or version');
  if(!publish.includes('packages: write')||!publish.includes('contents: read')||!publish.includes('environment: private-sdk-release')||!publish.includes('resume-journal.mjs'))throw Error('Protected write scope and retry journal required');
  if(/pnpm release|npm publish|changeset publish|packages: write/.test(handoff)||!handoff.includes('workflow_dispatch')||!handoff.includes('inputs.prepare_runtime_handoff == true'))throw Error('Manual handoff must never publish packages');
  for(const part of ['node-version: 22.23.3','version: 11.9.0','runs-on: ubuntu-24.04','cancel-in-progress: false'])if(!source.includes(part))throw Error('Pinned release toolchain/concurrency required');
  const download=handoff.indexOf('cli.mjs preflight'),generate=handoff.indexOf('cli.mjs generate'),verify=handoff.indexOf('cli.mjs verify'),consumer=handoff.indexOf('verify-runtime-release-consumer.mjs'),prerelease=handoff.indexOf('--prerelease'),assets=handoff.indexOf('cli.mjs assets');
  if(!(download>=0&&generate>download&&verify>generate&&consumer>verify&&prerelease>consumer&&assets>prerelease))throw Error('Registry identity, generation, validation and acceptance must precede prerelease assets');
  for(const part of ['verify-template-editor-reference.mjs','verify-template-family-reference.mjs','--mode release --provenance registry-download','packages: read'])if(!handoff.includes(part))throw Error('Shared verified handoff required');
  if(/--clobber|--latest|gh release upload|npm pack/.test(handoff))throw Error('Unverified asset replacement or workspace archive substitution');
  return true;
}
