# SDK 1.0.0 publication — Milestone 8

The immutable candidate is `sdk-1-candidate-20261013k`. This milestone prepares
and executes registry publication and stable promotion; completion requires actual
publication, registry acceptance on Linux/macOS, a fresh macOS fidelity gate and
human-approved stable promotion. Those final operations are still pending.

## Prepared contract

[PR #24](https://github.com/Sleinity/template-tool/pull/24) is stacked on #23.
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
publication or manual live/source-design review. The local CLI still requires
GitHub Packages read access for macOS registry consumers. Original checkout/index
preservation and final source/archive/fidelity identities will be recorded before
tagging. Formal baseline handoff/input retirement remains Milestone 9.
