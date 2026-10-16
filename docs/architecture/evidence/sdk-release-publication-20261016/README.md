# SDK 2.0.0 publication correction

The human approved release commit `b158199baf06c9d5f59cf9c91b485429684bbb42`.
The exact `sdk-v2.0.0` tag was pushed. The first workflow attempt was rejected
because the release environment allowed only `sdk-v1.0.0`; adding only the
approved new tag retained the existing reviewer requirement. The approval was
submitted through that reviewer account, without bypassing protection.

[Attempt 2](https://github.com/Sleinity/template-tool/actions/runs/38874449309/attempts/2)
passed the repository audit, SDK builds, portable source tests, Studio types and
Studio build. It failed at documentation verification: 22 linked historical
evidence files were present locally but absent from Git. No publication step ran.
All three registry version inventories confirmed that 2.0.0 remained absent.

## Correction and ownership

The staging inventory records every retained evidence file and its original
SHA-256. Twenty-one files are retained byte for byte. The 87,598,981-byte
`production-paired.json` is retained as deterministic lossless gzip, and its
historical report link points to that gzip. Decompression must reproduce its
original SHA-256. The original local JSON remains untouched.

This packet does not approve or regenerate historical renderer output. It
retains previously referenced evidence so a clean checkout can follow the
existing links. It includes no raw exporter ZIPs, font binaries or credentials.
Approved reference directories, fixture/font manifests and tolerances remain
unchanged. SDK source, package manifests, public declarations, delivered guides,
the runnable starter and frozen candidate D are unchanged.

The release tag remains on the previously approved commit. A corrected commit
and clean-checkout checks are prepared for review before any tag replacement.
The immutable candidate's existing certification remains separate from the
failed publication attempt.

See [the staging inventory](staging-inventory.json), [failure log](attempt-2-failure.log.txt.gz)
and [verification record](verification.json). Subsequent checks must be recorded
as current-run evidence; a locally satisfied link is insufficient.

## Current correction checks

Commit `02658bde13b263158994e13fb2eb6a0e43a603f3` passed
`pnpm install --frozen-lockfile` and the complete `pnpm ci:portable` gate in a
temporary shallow Git clone on macOS arm64 with Node 22.23.3/pnpm 11.9.0.
The clone contained no ignored local evidence and remained clean afterward.
All 261 Markdown files/901 local links passed. The gate also passed portable
tests, package/Studio/example builds, types, public API/boundary/release checks,
packed Node and V2 consumers, and curated bundle checks. See the
[complete clean-checkout log](clean-portable.log.txt.gz) and
[installation log](clean-install.log.txt.gz).

All 1,055 certified candidate D source files matched in the clean clone. Frozen
delivery/archive/starter checks passed, all 285 protected identities remained
unchanged, and all 22 retained historical files matched their recorded hashes.
The existing Linux certification still applies to the identical frozen candidate;
the corrected tag's Linux publication gate has not run. Final record-only updates
to this packet do not alter the certified source scope.
