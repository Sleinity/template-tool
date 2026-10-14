/** Static release ordering/permission contract; runtime packages remain unchanged. */
export function assertDeliveryWorkflow(source) {
  const start = source.indexOf('\n  publish:'),
    split = source.indexOf('\n  handoff:'),
    promote = source.indexOf('\n  promote:');
  if (start < 0 || split <= start || promote <= split)
    throw Error('Separate publication, handoff and promotion jobs required');
  const preflight = source.slice(source.indexOf('\n  preflight:'), start),
    publish = source.slice(start, split),
    handoff = source.slice(split, promote),
    promotion = source.slice(promote);
  if (
    !publish.includes(
      "if: github.event_name == 'push' && github.ref == 'refs/tags/sdk-v1.0.0'",
    ) ||
    !publish.includes('pnpm release --archives') ||
    !publish.includes('needs: preflight')
  )
    throw Error('Exact SDK tag and successful preflight required');
  if (
    /changeset publish|pnpm (?:packages:build|sdk:verify|pack)|npm pack|version-packages/.test(
      publish,
    )
  )
    throw Error('Publication cannot build, pack or version');
  if (
    !publish.includes('packages: write') ||
    !publish.includes('contents: read') ||
    !publish.includes('environment: private-sdk-release') ||
    !publish.includes('resume-journal.mjs')
  )
    throw Error('Protected publication and journal required');
  if (
    !preflight.includes(
      "if: github.event_name == 'push' && github.ref == 'refs/tags/sdk-v1.0.0'",
    ) ||
    !preflight.includes('acceptance.mjs --mode archive') ||
    !preflight.includes('preflight.mjs') ||
    !preflight.includes('fixtures.mjs restore') ||
    /packages: write|contents: write/.test(preflight)
  )
    throw Error('Read-only exact-input acceptance must precede writes');
  if (
    /pnpm release|npm publish|changeset publish|packages: write/.test(
      handoff,
    ) ||
    !handoff.includes("github.event_name == 'workflow_dispatch'") ||
    !handoff.includes('inputs.prepare_runtime_handoff == true')
  )
    throw Error('Manual handoff must never publish');
  for (const part of [
    'node-version: 22.23.3',
    'version: 11.9.0',
    'runs-on: ubuntu-24.04',
    'cancel-in-progress: false',
  ])
    if (!source.includes(part))
      throw Error('Pinned release toolchain/concurrency required');
  const download = handoff.indexOf('cli.mjs preflight'),
    generate = handoff.indexOf('cli.mjs generate'),
    verify = handoff.indexOf('cli.mjs verify'),
    consumer = handoff.indexOf('acceptance.mjs --mode registry'),
    prerelease = handoff.indexOf('--prerelease'),
    assets = handoff.indexOf('cli.mjs assets');
  if (
    !(
      download >= 0 &&
      generate > download &&
      verify > generate &&
      consumer > verify &&
      prerelease > consumer &&
      assets > prerelease
    )
  )
    throw Error(
      'Registry identity, bundle verification and full acceptance must precede assets',
    );
  for (const part of [
    'acceptance.mjs --mode archive',
    '--mode release --provenance registry-download',
    'packages: read',
    'fixtures.mjs restore',
    'if: always()',
  ])
    if (!handoff.includes(part))
      throw Error('Complete handoff and cleanup required');
  if (/--clobber|--latest|gh release upload|npm pack/.test(handoff))
    throw Error('Unverified asset replacement or archive substitution');
  if (
    !promotion.includes("github.event_name == 'workflow_dispatch'") ||
    !promotion.includes("github.ref == 'refs/heads/main'") ||
    !promotion.includes('inputs.promote_stable == true') ||
    !promotion.includes('environment: private-sdk-release') ||
    !promotion.includes('promotion.mjs') ||
    /packages: write|pnpm release/.test(promotion)
  )
    throw Error(
      'Stable promotion requires separate human-approved evidence verification',
    );
  return true;
}
