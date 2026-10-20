# Host-kit delivery contract

The public release download is a projection of the complete verified v1 acceptance bundle. SDK code, APIs, package versions, saved records and certification gates are unchanged.

## Public download

The standard release uploads exactly seven files: `template-sdk-<version>-host-kit.zip`, the three fixed-train tarballs, `SDK-DELIVERY-MANIFEST.json`, `SHA256SUMS` and the consolidated `CHANGELOG.md`. GitHub adds its own repository source archives. The same changelog is linked from the kit's root README. Other guides and example sources are packaged inside the kit.

The extracted kit is the canonical example application, with exact SDK tarballs already in vendor/, a root README for new/existing apps, and curated guides/reference/migration/agent folders. Historical and maintainer documents use explicit commit-pinned repository links. Unknown local references still fail; excluding a document does not permit a generic URL fallback. Private fixture/font binaries, credentials, node_modules and Studio implementation are excluded. Public application dependencies require installation; offline reopening after application load is a separate capability.

`host-kit.mjs` verifies the complete internal bundle before generating the projection. Public manifest `sdk-public-delivery-v2` records SDK source revision separately from delivery/documentation revision, each package's hash/size/version and every ZIP member's hash/size. External checksums cover the manifest, kit, standalone tarballs and changelog. Internal checksums cover vendored SDK packages. ZIP paths, duplicate names, non-regular entries, extraction bounds and packaged links are validated.

## Compatibility and refresh

The initial 2.0.1 host-kit refresh added three files while retaining the original 54 downloads. The user subsequently explicitly approved removing the 51 surplus attachments, breaking their old direct links, and replacing the two legacy metadata files. That cleanup produced six uploaded files and preserved the tested kit ZIP, all three SDK tarballs, SDK/package tags and package versions. The subsequent requested changelog update adds a seventh file and updates only kit documentation and delivery metadata.

The bounded `compact-sdk-2-0-1.yml` workflow retains the protected environment and required reviewer. It backs up and hash-verifies all original assets, uploads the backups to a 90-day CI artifact before mutation, and accepts the exact unchanged kit with npm and pnpm. Only the two delivery metadata files may be replaced. It verifies all six downloads before switching the release body and removing explicitly known obsolete attachments. Unknown or modified attachments fail closed. Partial cleanup can resume using the known historical inventory; existing SDK/kit files are never replaced. The backed-up original bytes can be restored if needed.

The historical additive workflow remains separate. Its strict legacy v1 prerequisite prevents it from accidentally refreshing the compact release. The standard publisher continues to reject mixed legacy inventories and conflicting bytes. Neither path republishes packages or creates/moves tags. The cleanup receipt identifies that migration separately from the original accepted source and delivery revisions.

Invoke the bounded cleanup through the release workflow's mutually exclusive `compact_host_kit` input. Every publication still requires current workflow-run acceptance receipts. Required-review protection is retained; any specifically approved temporary branch allowance must be removed after completion.

## Changelog documentation update

The protected `host-kit-changelog.yml` workflow is invoked through the mutually exclusive `update_host_kit_changelog` release input. It consumes the six-file compact 2.0.1 release (or an identical seven-file retry), backs up the current downloads before mutation and adds the consolidated changelog both at the ZIP root and as the seventh download. Only `README.md`, `CHANGELOG.md` and `DELIVERY.json` may differ inside the ZIP. The manifest records the new documentation revision and retains the base delivery revision; the SDK source revision is unchanged.

Both npm and pnpm must accept the exact updated kit in the same CI run. The workflow verifies all seven uploaded downloads before updating the release description. The three SDK asset identities and bytes, package versions and all SDK/package tags remain unchanged. Repeating an identical update reuses identical assets and ZIP bytes. The historical cleanup workflow intentionally keeps its original no-kit-replacement guard.

## Verification

Run `node --test scripts/release-delivery/*.test.mjs`, `pnpm release:contract`, `pnpm docs:verify`, and `node scripts/host-starter/verify-kit.mjs --delivery <projection> --manager npm` (then pnpm; use `--additive` only for the historical additive projection). Exact-kit checks install/build without SDK copies or registry credentials, typecheck public entries and exercise single/Family import, editing/choices/reset, save/reload/recovery and PNG using controlled portable fixtures. Observations are injected only into a temporary test build after the unmodified delivered build passes. Reports bind both revisions, archive/kit hashes and CI run. Functional browser evidence is not source/font pixel certification.

Publication uses those same CI-run receipts. Existing full SDK acceptance and source certification remain separate authorities; their manifests, fixture identities, approved references and tolerances are unchanged.
