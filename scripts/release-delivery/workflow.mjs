/** Release workflow guard shared by repository checks and focused mutation tests. */
export function assertDeliveryWorkflow(source) {
  const begin = source.indexOf('\n  publish:'), split = source.indexOf('\n  handoff:');
  if (begin < 0 || split <= begin) throw new Error('Separate publication and handoff jobs required');
  const publish = source.slice(begin, split), handoff = source.slice(split);
  if (!publish.includes("if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/sdk-v')") || !publish.includes('pnpm release')) throw new Error('Only sdk-v tag pushes may publish');
  if (/pnpm release(?:\s|$)|(?:^|\s)npm publish(?:\s|$)|changeset publish(?:\s|$)/.test(handoff) || !handoff.includes('workflow_dispatch') || !handoff.includes('inputs.prepare_runtime_handoff == true')) throw new Error('Manual handoff must never publish packages');
  for (const required of ['npm pack', 'verify-runtime-release-consumer.mjs', 'verify-template-editor-reference.mjs', 'verify-template-family-reference.mjs', 'SDK_RELEASE_VISIBILITY', 'SDK_LICENSE_POLICY', 'SDK_AUTHORIZED_USE']) if (!handoff.includes(required)) throw new Error(`Missing release guard: ${required}`);
  const generation = handoff.indexOf('cli.mjs generate'), validation = handoff.indexOf('cli.mjs verify'), consumer = handoff.indexOf('verify-runtime-release-consumer.mjs'), uploads = handoff.indexOf('cli.mjs upload-paths'), submission = handoff.indexOf('gh release upload');
  if (!(generation >= 0 && validation > generation && consumer > validation && uploads > consumer && submission > uploads)) throw new Error('Generation, bundle verification and consumers must precede inventory-driven upload');
  if (!handoff.includes('--mode release --provenance registry-download') || !handoff.includes('"${release_assets[@]}"') || /cp docs\/sdk|release-artifacts\/SDK-[^\s]+\.md\s*\\/.test(handoff)) throw new Error('Publication must use one generated inventory');
  if (!handoff.includes('release_asset_paths="$(node scripts/release-delivery/cli.mjs upload-paths release-artifacts)"') || handoff.includes('mapfile -t release_assets < <(')) throw new Error('Upload inventory errors must propagate before release actions');
  return true;
}
