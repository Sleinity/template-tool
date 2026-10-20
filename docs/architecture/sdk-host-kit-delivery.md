# Host-kit delivery contract

The public release download is a projection of the complete verified v1 acceptance bundle. SDK code, APIs, package versions, saved records and certification gates are unchanged.

## Public download

The standard release uploads exactly six files: `template-sdk-<version>-host-kit.zip`, the three fixed-train tarballs, `SDK-DELIVERY-MANIFEST.json` and `SHA256SUMS`. GitHub adds its own repository source archives. Standalone guides and example sources are packaged inside the kit.

The extracted kit is the canonical example application, with exact SDK tarballs already in vendor/, a root README for new/existing apps, and curated guides/reference/migration/agent folders. Historical and maintainer documents use explicit commit-pinned repository links. Unknown local references still fail; excluding a document does not permit a generic URL fallback. Private fixture/font binaries, credentials, node_modules and Studio implementation are excluded. Public application dependencies require installation; offline reopening after application load is a separate capability.

`host-kit.mjs` verifies the complete internal bundle before generating the projection. Public manifest `sdk-public-delivery-v2` records SDK source revision separately from delivery/documentation revision, each package's hash/size/version and every ZIP member's hash/size. External checksums cover the manifest, kit and standalone tarballs. Internal checksums cover vendored SDK packages. ZIP paths, duplicate names, non-regular entries, extraction bounds and packaged links are validated.

## Compatibility and refresh

The existing 2.0.1 release keeps all 54 original asset IDs, names, hashes and URLs, its v1 manifest/checksums, and all SDK/package tags. Add only the kit, `HOST-KIT-MANIFEST.json` and `HOST-KIT-SHA256SUMS`; the additive upload inventory has three files. Its manifest covers the added kit, not a replacement of the old delivery. The release description leads with the kit and retains original bugfix notes.

The `host-kit-refresh.yml` workflow runs through `private-sdk-release` and can also be invoked using the existing release workflow's `refresh_host_kit` input. It reads already-published release archives and binds their bytes to the old manifest, rebuilds only documentation/example packaging, accepts the exact resulting ZIP with npm and pnpm, then publishes the additive files. It never publishes an npm package, creates/moves a tag or requests private source fixtures.

Publication preflights every filename before the first upload, rejects conflicting bytes, reuses identical files on retry, verifies uploaded download bytes, and updates the release body last. Original asset identities and tag objects must remain unchanged. The standard path cannot refresh a flat legacy release.

## Verification

Run `node --test scripts/release-delivery/*.test.mjs`, `pnpm release:contract`, `pnpm docs:verify`, and `node scripts/host-starter/verify-kit.mjs --delivery <projection> --manager npm` (then pnpm; add `--additive` for 2.0.1). Exact-kit checks install/build without SDK copies or registry credentials, typecheck public entries and exercise single/Family import, editing/choices/reset, save/reload/recovery and PNG using controlled portable fixtures. Observations are injected only into a temporary test build after the unmodified delivered build passes. Reports bind both revisions, archive/kit hashes and CI run. Functional browser evidence is not source/font pixel certification.

Publication uses those same CI-run receipts. Existing full SDK acceptance and source certification remain separate authorities; their manifests, fixture identities, approved references and tolerances are unchanged.
