# SDK 1.0.0 publication — Milestone 8

The immutable candidate is `sdk-1-candidate-20261013k`. This milestone prepares
and executes registry publication and stable promotion; completion requires actual
publication, registry acceptance on Linux/macOS, a fresh macOS fidelity gate and
human-approved stable promotion. Those final operations are still pending.

## Prepared contract

[PR #24](https://github.com/Sleinity/template-tool/pull/24) followed #23.
Changes are private release/acceptance tooling. SDK behavior, public APIs, versions,
dependencies, lockfile, reference pixels and tolerances remain unchanged.

The sealed fixture payload is retained separately for three days and authenticated
against its originating artifact/ciphertext identities. The existing CI-owned key
is reused without exposure. Temporary plaintext is removed on every outcome.
Only JSON summaries/identities are uploaded; no fixture/font bytes, raw test logs
or private screenshots enter the delivery.

Archive and registry host installation run the same existing scenarios. Archive
is the default. Registry hosts use exact package names/versions, fresh stores,
scoped temporary authentication, lockfile origins/integrities and installed-byte
checks against certified archives. No workspace/local SDK override is permitted.
The full matrix has six commands per package manager, including actual V2 example,
font authority, storage/recovery and V1 single/Family compatibility. Exact-source
V2 coverage remains unconditional. Source-level storage-owner observations and
test instrumentation retain their existing evidence classifications.

Tag preflight runs full exact-input archive acceptance before the publication job
can request human deployment approval. Publication retains journal recovery and
ordered byte-verified writes. Handoff executes full archive and registry acceptance
before prerelease assets. Stable promotion is separate, human-approved and requires
complete Linux/macOS registry receipts, the fresh macOS fidelity receipt, matching
registry archives, tag identity and complete matching assets. Missing or inconsistent
evidence blocks promotion. No tool approves deployments or source reviews.

## Current evidence

Actual [preparation run 38551302611](https://github.com/Sleinity/template-tool/actions/runs/38551302611)
passed at `e76e1a92a2fda944b088566b118c372ec4d21283`:

- [Linux full matrix](evidence/sdk-1-publication-20261014/linux-preparation.json):
  all twelve frozen-archive commands passed on Node 22.23.3/pnpm 11.9.0.
- [Sealed artifact](evidence/sdk-1-publication-20261014/fixture-artifact.json):
  exact authenticated bytes retained as artifact 11886691893, expiring October 17.
- [Registry preflight](evidence/sdk-1-publication-20261014/registry-preflight.json):
  authenticated read/deployment checks passed; all three versions are absent and
  no package/release mutation occurred.

Current evidence is automated CLI/browser coverage. It is not actual registry
publication or manual live/source-design review. GitHub Packages read access is
now verified for macOS registry consumers. Formal baseline handoff/input retirement
remains Milestone 9.

## Reviewed merges and final pre-tag gate

Following explicit human source review, PRs #22, #23 and #24 were merged in order
with merge commits. Retargeted checks and the full preparation rerun passed.
The [merged-source record](evidence/sdk-1-publication-20261014/merged-source.json)
binds the approved heads, merge commits, frozen archive identities and verified
preservation of the original checkout/index. The final merged tree at
`3c9bd975ee32a1402eea228f98bcd963d4efe737` equals the approved #24 tree.

The [current Linux archive matrix](evidence/sdk-1-publication-20261014/linux-preparation-final.json)
passed all twelve commands in preparation run 38554320928, attempt 2.
The [macOS archive matrix](evidence/sdk-1-publication-20261014/macos-archive.json)
also passed all twelve commands against the same frozen train.

The [fresh macOS fidelity receipt](evidence/sdk-1-publication-20261014/final-fidelity.json)
records gate `sdk-1-publication-main-20261014a`: 24 complete stable captures,
12 renderer passes, three scene passes and 12 settlement passes. All twelve PNG
hashes equal the reviewed candidate in both repeats. Exact fixtures/fonts, browser,
OS, camera placement and native pre-Fit history match. The private root release
command changes the build-metadata hash; this is recorded separately from raster
environment and unchanged certified runtime identity.

The [current-run disposition](evidence/sdk-1-publication-20261014/final-fidelity-disposition.json)
retains the prior source review after those identity checks. The standard SDK gate
was reassessed successfully; the tracked disposition baseline was restored.
All 287 protected reference/budget records remain unchanged. No reference update,
tolerance change, new manual live review or SDK runtime change occurred.

These receipts are publication prerequisites, not registry acceptance. Package
publication, Linux/macOS registry-installed verification, prerelease assets and
human-approved stable promotion remain pending.

## First publication preflight stopped safely

Tag `sdk-v1.0.0` now points to `33bd70dbca1f02cdd6c80a83dc1ba4666d2ed348`.
Run 38563617164 stopped at fixture ZIP decoding before any package write. The
[intake repair and proposed recovery](sdk-1-publication-intake-repair.md) record
the confirmed Buffer/Uint8Array seam, retained reproduction and required immutable-tag
execution decision. Publication remains NO-GO; no deployment was approved by tools.
