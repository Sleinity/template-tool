# SDK 2.0.1 host-kit publication

The [SDK 2.0.1 release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v2.0.1) now leads with the [complete host kit](https://github.com/Sleinity/template-tool/releases/download/sdk-v2.0.1/template-sdk-2.0.1-host-kit.zip). Exactly three assets were added. All 54 original asset IDs, names, sizes, SHA-256 digests and URLs are preserved, as are the SDK tag and all three package tags. No SDK package was republished.

SDK source: `1fac7d63d4ccaf4daa5a4503a6e7df1b61305822`. Delivery/documentation source: `05d199486f643b6cee6d9f3b9479eb7e1830159b`. This evidence-only follow-up does not regenerate or replace published assets.

The host ZIP is 1,053,541 bytes with SHA-256 `2f50c7b85caf7b08e5e8a54692c935e2d9237564efff549eaa51099df81dcce9`. It includes the canonical application, three vendored SDK archives and 19 organized guide/reference files. Its README has separate new-application and existing-application instructions.

## Current-run evidence

- [Protected publication](https://github.com/Sleinity/template-tool/actions/runs/39407405667) succeeded; SDK publishing and legacy handoff jobs were skipped. The publication receipt binds uploaded files and preserved assets.
- [PR portable CI](https://github.com/Sleinity/template-tool/actions/runs/39405874207) passed, including builds, portable tests, TypeScript, SDK API/boundary checks and documentation. All 43 delivery regressions passed.
- The exact same public ZIP passed npm and pnpm installation/build plus ten automated application scenarios per manager on Linux Node 22.23.3 and macOS Node 24.19.0. SDK files were present at extraction; no post-extraction tarball copies or GitHub Packages credentials were supplied. Reports cover single/Family staged import, choices, edit/reset, save/reload/recovery and guarded PNG.
- Independent anonymous downloads of all three new files matched GitHub digests and public checksums. The downloaded kit passed public manifest, member-hash and documentation-link validation.
- The user explicitly approved the temporary allowance for only `codex/sdk-host-kit-delivery`, retaining the required reviewer, publishing, and removing the allowance. Cleanup removed rule `63692865`; all four original branch/tag policies and required-review protection remain unchanged.

The reports are portable functional/browser evidence. They make no new source/font pixel-certification claim and do not change fixtures, approved references or tolerances. The future six-asset layout is implemented in [PR 32](https://github.com/Sleinity/template-tool/pull/32); the existing 2.0.1 release retains its legacy assets for download compatibility.
