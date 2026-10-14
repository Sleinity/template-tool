# SDK 1.0.0 publication — Milestone 8

The immutable candidate is `sdk-1-candidate-20261013k`. This milestone prepares
and executes registry publication and stable promotion; completion requires actual
publication, registry acceptance on Linux/macOS, a fresh macOS fidelity gate and
human-approved stable promotion. The three packages are now published and macOS
registry acceptance passes on both platforms. Stable promotion completed after
the separate human approval; **Milestone 8 is complete**.

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

## Retained preparation evidence

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
execution decision. This failure remains retained historical evidence. The explicitly approved recovery
below resolved it without moving the tag; no deployment was approved by tools.


## Actual protected publication and registry acceptance

[Recovery run 38571485252](https://github.com/Sleinity/template-tool/actions/runs/38571485252)
executes reviewed tooling commit `a707846e6c29674a1f8b9719702c2b2832283dac`.
The immutable tag remains `33bd70dbca1f02cdd6c80a83dc1ba4666d2ed348`.
PR #26 was reviewed and merged before the recovery dispatch; its full preparation,
CI and rehearsal checks passed. The [read-only recovery preflight](evidence/sdk-1-publication-20261014/recovery-preflight.json)
passed twelve archive commands and validated 709 tagged SDK/Studio/example files.

The owner approved publication and handoff in GitHub's protected environment.
[Approval records](evidence/sdk-1-publication-20261014/deployment-approvals.json)
are distinct from automated acceptance and do not include stable approval.
The [publication report](evidence/sdk-1-publication-20261014/publication.json)
and [journal](evidence/sdk-1-publication-20261014/publication-journal.json)
record three ordered, verified package writes: Core, Browser, then React 1.0.0.
Their downloaded hashes equal the frozen candidate; lifecycle scripts were disabled.
There were no uncertain publication outcomes, tag changes, package rebuilds or
package deletion. CI used the protected job's package-write token. Local tests use
only the separately authorized package-read credential; no credentials are retained.

The [macOS registry matrix](evidence/sdk-1-publication-20261014/macos-registry.json)
passed all twelve npm/pnpm commands against registry-installed packages on
Node 22.23.3, pnpm 11.9.0 and npm 11.21.0, darwin arm64. It verifies strict guide
and delivered example compilation, single/Family V2 workflows, exact-font authority,
storage/recovery, and retained V1 single/Family compatibility. Fresh isolated stores,
registry lockfile origins/integrities, installed bytes and supported entries were
checked; no workspace SDK fallback was used. Each run rechecked frozen archives.
These are automated browser/CLI results, not new manual live design review.

The [Linux registry matrix](evidence/sdk-1-publication-20261014/linux-registry.json)
passed all twelve registry commands on Ubuntu 24.04, Node 22.23.3, pnpm 11.9.0 and
npm 10.9.9, x64. The same handoff job also passed all twelve archive commands before
running registry acceptance. Its [handoff receipt](evidence/sdk-1-publication-20261014/handoff.json)
and [asset inventory](evidence/sdk-1-publication-20261014/prerelease-asset-inventory.json)
bind 41 verified release assets and delivery-manifest hash
`5539f59126db6f5fda7a12a94beaf5b707d09eeb840fb7a1e907e2b962bc9d8f`.
The actual successful release run's Linux artifact is 11900706900, digest
`sha256:d21797f705d3f7dcac2045ca2160ba4dd0bed77879f9e55f4c2229cb910b20f8`,
retained until January 12, 2027. Its ZIP digest was independently checked locally.
Both platform reports bind the same tag, archive set and delivery manifest.
The [independent read-only check](evidence/sdk-1-publication-20261014/prerelease-verification.json)
downloaded and matched all 41 actual prerelease asset hashes.

[SDK 1.0.0](https://github.com/Sleinity/template-tool/releases/tag/sdk-v1.0.0)
was initially created as a prerelease. Promotion configuration pins the actual Linux
artifact and hash-bound macOS/fidelity receipts. It authorizes requesting the
protected human checkpoint, not automatic approval. Stable promotion rechecks
remote tag, registry archives, both receipts and every release asset before writing.
No runtime source or archive was changed after certification; there is consequently
no added canonical work, font activation or production execution path. Consumer
command durations are recorded in both reports. No new manual browser review,
screen-reader coverage or Linux-to-macOS raster comparison is claimed.

Stable promotion received separate human deployment approval and completed as
recorded below.
Formal baseline handoff and temporary-input retirement remain Milestone 9.


## Stable completion

The owner approved the protected promote job in
[run 38579849424](https://github.com/Sleinity/template-tool/actions/runs/38579849424).
It executed evidence merge commit `a80d41178ccbadb4f3831f5d4dc58a00119c241e`,
rechecked both platform receipts, the fidelity receipt, actual registry archives,
all release assets and remote tag identity, and completed successfully. Its result
records `alreadyStable: false`: this was the actual stable transition, not a
workflow-inspection claim. The [final stable receipt](evidence/sdk-1-publication-20261014/stable-release.json)
retains the run, human approval, release ID, all 41 asset identities and hashes of
the supporting reports. GitHub independently reports `draft: false` and
`prerelease: false` for [stable SDK 1.0.0](https://github.com/Sleinity/template-tool/releases/tag/sdk-v1.0.0).

The tag remains `33bd70dbca1f02cdd6c80a83dc1ba4666d2ed348`; the protected recovery
used reviewed tooling rather than moving it. The same three frozen archive hashes
bind candidate certification, publication, both registry matrices and final
promotion. No SDK source, version, dependency, lockfile, schema, fixture/font binary,
reference or tolerance changed in this milestone. The original checkout, index,
tracked diff and untracked-file status were rechecked and preserved.

Milestone 8 is complete. Milestone 9 owns the formal development-baseline handoff
and safe retirement of temporary inputs; no fixture artifact, certification secret,
package, release tag or unrelated resource has been deleted here. Historical
0.8 migration material and the frozen handoff's historical administration wording
remain distinguished from the current approved release contract. Public release
visibility does not grant an open-source licence: packages remain UNLICENSED for
Sleinity-owned applications only.
