# SDK 1.0.0 release source baseline — Milestone 6

Date: 2026-10-13. Candidate: `sdk-1-candidate-20261013k`. Release branch:
`codex/sdk-1-release`. Publication remains outside this milestone.

## Source reconciliation

The isolated checkout starts at remote main
`88510e5f16d16e119692a25c59f1b712acf905a3`, rather than the user's local main
`944c51b33433ce2e37ec05f7de66457d5154d5b4`. All 86 intervening remote-changed paths
are reconciled in the [inventory](evidence/release-source-20261013/inventory.json).
The later certified implementations supersede older versions on remote main;
remote history stays in the PR parent. Existing remote files outside the reviewed
source transfer are retained unless the certified worktree explicitly deletes them.

The inventory classifies 2,307 files/explicit deletions: 1752 included and 555
excluded. Required packages, Studio, examples, tests, scripts, configuration,
programme/ADR guidance, and compact historical/final reports are included. The
full inventory is retained so exclusions are visible rather than silently omitted.
Dependencies discovered through documentation links are copied separately where
they are compact text evidence. Seven retained SDK/Studio source snapshots are
included because portable tests require them; an 84 MB generated performance
trace remains local with its checksum recorded. Branch-only documentation and guard additions
are recorded with validation results.

The original checkout's HEAD, index and worktree identities are retained in
[original-checkout.json](evidence/release-source-20261013/original-checkout.json).
All four retained HEAD/index/worktree/status checks pass. Its checkout/index
are not switched, staged or committed. No temporary
`.certification-input`, package archives, external ZIP/font input or encryption
secret is transferred. Application-bundled fonts and previously approved renderer
references remain part of the existing source contract.

## Certified identity

The supplied frozen archives are retained unchanged. Current certified source
verification passes. All package source/configuration files match the frozen
candidate; release documentation and the narrowly scoped CI reference-intake
check are new. Of the 999 certified source files, only the CI workflow changes;
all other certified sources are byte-identical. The certification report, its CI preparation/review binding and
latest gate disposition were finalized after freezing; these evidence-only
changes are identified explicitly in the inventory.

[Certification](versioned-candidate-certification.md) binds exact archive hashes,
actual macOS/Linux acceptance and **24 stable captures, 12 renderer, three scene
and 12 settlement passes**. This milestone does not claim new renderer captures
or manual source/live/screen-reader review.

## Previously approved evidence intake

Remote main lacks 103 protected files already present in the certified source.
All are additions; none replaces or deletes a remote-approved reference. Their
exact hashes are recorded in
[the intake manifest](../../config/sdk-1-release-reference-intake.json) and checked
against the frozen source inventory. The retained SDK baseline documentation,
ADRs and source-review dispositions remain authoritative, including
[R07's guarded Carrousel/editor review](r07-carrousel-raster.md).

CI permits only this complete, hash-identical addition set against this exact
remote base. Modified/deleted references, missing/extra paths, altered bytes or
a different base fail. Future PRs with no protected changes pass normally. This
mechanical identity check does not grant new pixel approval or replace PR review;
CODEOWNERS still identifies Sleinity as the reviewer. References/tolerances are
not regenerated or promoted here.

Private screenshots, superseded runs and historical source backups remain local.
[Documentation exclusions](evidence/release-source-20261013/documentation-exclusions.json)
record seven historical documents whose links now explicitly identify local-only
evidence. Current host instructions retain working repository links. Missing
historical material is not replaced by fabricated screenshots or copied archives.

## Validation and remaining release work

Isolated-checkout validation and package-content equivalence are recorded in
[evidence](evidence/release-source-20261013/verification.json). All local stages pass, including strict packed consumers and unchanged bundle budgets.
The three isolated repacks are byte-identical to the frozen archives. The 27
release-tooling tests pass. [PR #22](https://github.com/Sleinity/template-tool/pull/22)
remains draft until its full GitHub verification passes.

Milestone 7 owns frozen-artifact publication tooling. The existing release workflow
is retained; no SDK release tag is created and no publishing command is invoked.
Registry round-trip installation remains unverified until Milestone 8.

The [release roadmap](../sdk/RELEASE_ROADMAP.md) defines the remaining gates.
