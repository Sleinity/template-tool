# Host-kit delivery contract

The public release download is a projection of the complete verified v1 acceptance bundle. SDK code, APIs, package versions, saved records and certification gates are unchanged.

## Public download

The standard release uploads exactly six files: `template-sdk-<version>-host-kit.zip`, the three fixed-train tarballs, `SDK-DELIVERY-MANIFEST.json` and `SHA256SUMS`. GitHub adds its own repository source archives. Standalone guides and example sources are packaged inside the kit.

The extracted kit is the canonical example application, with exact SDK tarballs already in vendor/, a root README for new/existing apps, and curated guides/reference/migration/agent folders. Historical and maintainer documents use explicit commit-pinned repository links. Unknown local references still fail; excluding a document does not permit a generic URL fallback. Private fixture/font binaries, credentials, node_modules and Studio implementation are excluded. Public application dependencies require installation; offline reopening after application load is a separate capability.

`host-kit.mjs` verifies the complete internal bundle before generating the projection. Public manifest `sdk-public-delivery-v2` records SDK source revision separately from delivery/documentation revision, each package's hash/size/version and every ZIP member's hash/size. External checksums cover the manifest, kit and standalone tarballs. Internal checksums cover vendored SDK packages. ZIP paths, duplicate names, non-regular entries, extraction bounds and packaged links are validated.

## Compatibility and refresh

The initial 2.0.1 host-kit refresh added three files while retaining the original 54 downloads. The user subsequently explicitly approved removing the 51 surplus attachments, breaking their old direct links, and replacing the two legacy metadata files. The canonical 2.0.1 layout is now the same six-file standard projection as future releases. The tested kit ZIP, all three SDK tarballs, SDK/package tags and package versions remain unchanged.

The bounded `compact-sdk-2-0-1.yml` workflow retains the protected environment and required reviewer. It backs up and hash-verifies all original assets, uploads the backups to a 90-day CI artifact before mutation, and accepts the exact unchanged kit with npm and pnpm. Only the two delivery metadata files may be replaced. It verifies all six downloads before switching the release body and removing explicitly known obsolete attachments. Unknown or modified attachments fail closed. Partial cleanup can resume using the known historical inventory; existing SDK/kit files are never replaced. The backed-up original bytes can be restored if needed.

The historical additive workflow remains separate. Its strict legacy v1 prerequisite prevents it from accidentally refreshing the compact release. The standard publisher continues to reject mixed legacy inventories and conflicting bytes. Neither path republishes packages or creates/moves tags. Source and delivery revisions inside the kit continue to identify the original accepted bytes; the cleanup receipt records its separate migration revision.

Invoke the bounded cleanup through the release workflow's mutually exclusive `compact_host_kit` input. Every publication still requires current workflow-run acceptance receipts. Required-review protection is retained; any specifically approved temporary branch allowance must be removed after completion.

## Verification

Run `node --test scripts/release-delivery/*.test.mjs`, `pnpm release:contract`, `pnpm docs:verify`, and `node scripts/host-starter/verify-kit.mjs --delivery <projection> --manager npm` (then pnpm; add `--additive` for 2.0.1). Exact-kit checks install/build without SDK copies or registry credentials, typecheck public entries and exercise single/Family import, editing/choices/reset, save/reload/recovery and PNG using controlled portable fixtures. Observations are injected only into a temporary test build after the unmodified delivered build passes. Reports bind both revisions, archive/kit hashes and CI run. Functional browser evidence is not source/font pixel certification.

Publication uses those same CI-run receipts. Existing full SDK acceptance and source certification remain separate authorities; their manifests, fixture identities, approved references and tolerances are unchanged.
