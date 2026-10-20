/** Release workflow guard shared by repository checks and focused mutation tests. */
export function assertDeliveryWorkflow(source) {
  const begin = source.indexOf('\n  publish:'), refresh = source.indexOf('\n  host-kit-refresh:'), split = source.indexOf('\n  handoff:');
  if (begin < 0 || refresh <= begin || split <= refresh) throw new Error('Separate publication and handoff jobs required');
  const publish = source.slice(begin, refresh), handoff = source.slice(split);
  if (!publish.includes("if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/sdk-v')") || !publish.includes('pnpm release')) throw new Error('Only sdk-v tag pushes may publish');
  if (/pnpm release(?:\s|$)|(?:^|\s)npm publish(?:\s|$)|changeset publish(?:\s|$)/.test(handoff) || !handoff.includes('workflow_dispatch') || !handoff.includes('inputs.prepare_runtime_handoff == true')) throw new Error('Manual handoff must never publish packages');
  for (const required of ['npm pack', 'verify-runtime-release-consumer.mjs', 'verify-template-editor-reference.mjs', 'verify-template-family-reference.mjs', 'SDK_RELEASE_VISIBILITY', 'SDK_LICENSE_POLICY', 'SDK_AUTHORIZED_USE']) if (!handoff.includes(required)) throw new Error(`Missing release guard: ${required}`);
  const generation = handoff.indexOf('cli.mjs generate'), validation = handoff.indexOf('cli.mjs verify'), consumer = handoff.indexOf('verify-runtime-release-consumer.mjs'), uploads = handoff.indexOf('host-kit.mjs generate'), submission = handoff.indexOf('publication.mjs publish');
  if (!(generation >= 0 && validation > generation && consumer > validation && uploads > consumer && submission > uploads)) throw new Error('Generation, bundle verification and consumers must precede inventory-driven upload');
  if (!handoff.includes('--mode release --provenance registry-download') || !handoff.includes('verify-kit.mjs --delivery public-release-artifacts') || /cp docs\/sdk|release-artifacts\/SDK-[^\s]+\.md\s*\\/.test(handoff)) throw new Error('Publication must use one generated inventory');
  if (!handoff.includes('host-kit.mjs verify public-release-artifacts') || handoff.includes('--clobber') || handoff.includes('cli.mjs upload-paths')) throw new Error('Only the checked public projection may be uploaded');
  for (const job of [publish, handoff]) {
    const restore = job.indexOf('uses: ./.github/actions/sdk-certified-inputs');
    const firstPrivateConsumer = job.search(/verify-template-editor-reference\.mjs|verify-runtime-release-consumer\.mjs/);
    if (restore < 0 || firstPrivateConsumer < restore || !job.includes('vars.SDK_RELEASE_CERTIFICATION_RUN_ID') || !job.includes('vars.SDK_RELEASE_FROZEN_SHA256') || !job.includes('secrets.SDK_CERT_FIXTURE_KEY')) throw new Error('Exact host checks require bound certified inputs');
    if (!/name: Remove decrypted release test fixtures\n\s+if: always\(\)\n\s+run: rm -rf "\$RUNNER_TEMP\/sdk-fixtures"/.test(job)) throw new Error('Decrypted release fixtures require unconditional cleanup');
  }
  if (!publish.includes('--archives "$SDK_CERTIFIED_ARCHIVES"')) throw new Error('Prepublication reference checks must use certified archives');
  for (const required of ['scripts/host-starter/verify.mjs', 'verify-host-font-authority.mjs', 'verify-blocked-storage.mjs']) if (!handoff.includes(required)) throw new Error(`Missing published host acceptance: ${required}`);
  return true;
}
