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
