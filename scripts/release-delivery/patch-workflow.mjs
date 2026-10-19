/** Keep the one approved patch train separate from source-fidelity certification. */
export function assertPatchWorkflow(source, standard) {
  if (!source.includes('tags: [sdk-v2.0.1]') || /workflow_dispatch/.test(source)) throw Error('The patch path must be tag-only and bounded to 2.0.1');
  if (!standard.includes("&& github.ref != 'refs/tags/sdk-v2.0.1'")) throw Error('Only one workflow may publish 2.0.1');
  if (!source.includes('TEMPLATE_PACKAGE_FIXTURE_DIR: /tmp/sdk-patch-no-private-fixtures')) throw Error('Functional patch acceptance must prove independence from private fixtures');
  const split = source.indexOf('\n  publish:');
  const verify = source.slice(0, split), publish = source.slice(split);
  if (split < 0 || !publish.includes('needs: verify') || !publish.includes("if: github.event_name == 'push' && github.ref == 'refs/tags/sdk-v2.0.1'")) throw Error('Only a verified patch tag may publish');
  if (!publish.includes('environment: private-sdk-release')) throw Error('The patch must retain the protected release environment');
  for (const check of ['pnpm ci:portable','scripts/release-delivery/*.test.mjs','pnpm field-rules:studio','pnpm studio:drafts','pnpm studio:setup --without-source-fidelity']) {
    if (verify.indexOf(check) < 0 || verify.indexOf(check) > verify.indexOf('patch.mjs pack')) throw Error(`Missing patch prerequisite ${check}`);
  }
  if (!(verify.indexOf('patch.mjs pack') < verify.indexOf('patch.mjs accept') && verify.indexOf('patch.mjs accept') < verify.indexOf('actions/upload-artifact@v4'))) throw Error('Archive acceptance must precede artifact transfer');
  if (!publish.includes('sdk-2.0.1-candidate-${{ github.sha }}') || !publish.includes('actions/download-artifact@v4')) throw Error('Publication must consume the same verified artifact');
  const order = ['patch.mjs publish','cli.mjs generate','cli.mjs verify','patch.mjs compare','patch.mjs accept','pnpm published-core:verify','cli.mjs upload-paths','gh release upload','--draft=false'];
  let previous = -1;
  for (const check of order) { const index = publish.indexOf(check); if (index <= previous) throw Error(`Missing or reordered release guard ${check}`); previous = index; }
  for (const check of ['--mode release --provenance registry-download','--verify-tag','--notes-file release-artifacts/SDK-2.0.1-RELEASE-NOTES.md','"${release_assets[@]}"','SDK_RELEASE_VISIBILITY','SDK_LICENSE_POLICY','SDK_AUTHORIZED_USE']) if (!publish.includes(check)) throw Error(`Missing handoff guard ${check}`);
  if (/sdk-certified-inputs|fixtures\.mjs restore|verify-template-(?:editor|family)-reference|pnpm release(?:\s|$)|changeset publish/.test(source)) throw Error('The patch must use its functional archive gate and sequential publisher');
  return true;
}
