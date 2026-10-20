# SDK 2.0.1 compact release

The [SDK 2.0.1 release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v2.0.1) now has six uploaded assets plus GitHub's two automatic source archives: the complete host kit, three SDK tarballs, the v2 delivery manifest and SHA256SUMS. All six anonymous downloads were verified against public digests; the downloaded standard projection passed member/hash/link validation.

The user explicitly approved deleting the 51 redundant attachments, breaking their previous direct download links, and replacing the two legacy metadata files. This overrides the earlier requirement to preserve all legacy links. The historical additive-publication receipts remain unchanged as records of that earlier release state.

The accepted host ZIP and all three SDK archives retain their original asset IDs, sizes and SHA-256 digests. SDK/package tags and package versions remain unchanged. The kit SHA-256 is `2f50c7b85caf7b08e5e8a54692c935e2d9237564efff549eaa51099df81dcce9`. SDK source remains `1fac7d63d4ccaf4daa5a4503a6e7df1b61305822`, kit delivery source remains `05d199486f643b6cee6d9f3b9479eb7e1830159b`, and the cleanup implementation is `7dde16f680c92563ac5f48617e139645015e1b8c`. This evidence follow-up does not regenerate any release file.

## Validation and recovery

[Protected cleanup run 39413816011](https://github.com/Sleinity/template-tool/actions/runs/39413816011) passed all 51 delivery regressions, archived every original before mutation, and reaccepted the exact unchanged kit with npm and pnpm on Linux Node 22.23.3. Each manager passed ten installed-application scenarios covering single/Family import, choices, edits/reset, persistence/recovery and PNG. The same ZIP previously passed both managers on macOS. No renderer changes, SDK republishing or new source/font pixel certification are included.

Before deletion, all 57 original assets were backed up and checksum-verified. The [original-assets recovery artifact](https://github.com/Sleinity/template-tool/actions/runs/39413816011/artifacts/12260583122) is retained until 2027-01-18. A second persistent local copy is in the ignored `release-verification-artifacts/sdk-2.0.1-before-compaction-20261020/` directory. Compact metadata was uploaded and all six downloads verified before obsolete attachments were removed. The final release body retains the bugfix notes and points to the current checksums.

Temporary branch rule `63698188` was removed after completion. All four original branch/tag policies and required-review protection remain unchanged. The publication and independent verification receipts record the exact removed, replaced and preserved asset identities.
