# R05 closure and R06 release preparation

Date: 2026-10-13. Baseline: **sdk-061-v2-example-lifecycle-20261013a**.
Final gate: **sdk-061-release-delivery-20261013a — GO**.

**R05 is closed. R06 is prepared, not closed.** Core, Browser and React remain
0.8.0 in the workspace. Isolated Changesets staging produces major 1.0.0 for all
three. No package was uploaded, tagged or published. This bounded result is not
a declaration that the entire SDK is release-ready.

## Retained reproduction and contract

The executed original publication generator omitted the V2 guide and led with
V1. Its local counterpart left an anchored repository link unresolved. Archive
verification enabled V2 only when a local-candidate manifest existed. Recovery
API removal was labeled minor, and intermediate changeset prose promised
migration-on-read that current canonical validation does not provide.

[Baseline identities and retained sources](evidence/release-delivery-20261013/baseline/identity.json)
and [reproductions](evidence/release-delivery-20261013/baseline/reproduction.json)
precede production tooling edits. All **374 SDK/Studio source hashes**, **299
protected reference/API/budget artifacts**, three package manifests, the lockfile
and seven historical migration documents still match. Actual SDK archive bytes
are identical to the passing baseline.

## One delivery authority

[The inventory](../../config/sdk-delivery-inventory.json) describes sources,
destinations, classifications and transformations. The shared generator supplies
local-candidate tooling, runtime/Core compatibility wrappers and the publication
workflow. Runtime handoffs lead with V2; V1 examples remain explicitly labeled
compatibility. Historical published migration documents remain unchanged at
source and clearly historical in delivery.

Every bundle carries actual archive metadata/hashes, source/document/example
hashes, provenance, link evidence and the complete upload inventory. Local packs
say unpublished; publication-path simulations say simulated. Generation itself
is never certification. Core-only delivery remains usable without pretending to
supply Browser/React runtime acceptance.

Relative and anchored links are resolved from their original source and rewritten
into the emitted bundle. Validation checks actual emitted files and anchors,
including heading collisions, explicit IDs, references, encoded paths and HTML
links. Missing targets, unsafe schemes and escaping paths fail. External URLs are
explicitly unchecked. Repository documentation verification remains independent.
The current local bundle verifies **105 local links**; publication simulation
verifies **104**, differing by the local-only note. Each has one external URL.

The release workflow generates and verifies before consumer checks and uploading
exactly the verified inventory. Its actual prepare step ran against local archive
substitutes: three pack calls, no registry request, upload, tag or publication.
Manual handoff refresh cannot publish. Workflow mutation tests reject bypassed
verification, duplicated upload lists and manual publishing.

## Archive acceptance and guidance

V2 guide compilation, delivered host/helper compilation with
`skipLibCheck: false`, and exact single/Family acceptance now run regardless of
a local-candidate manifest. Candidate identity checks are additive. Verification
reports bind archive and delivery hashes; stale success reports are removed before
attempts. Missing guidance and genuinely older pre-R01 archives fail clearly;
there is no fallback to V1-only success.

Current guidance now explains:

- Candidate, staged-session and accepted-session ownership; borrowed repositories,
  asset stores and font registries; React cleanup and invocation-time save pins.
- Operation-specific import, mutation, restore, hydration, cancellation, save,
  storage/font and cleanup outcomes. Single restore blocked snapshots and Family
  repository-read rejection remain different contracts.
- Configuration draft → Apply → accepted configuration → Save in Review,
  separately from output recovery autosave at 650 ms, manual Retry and
  cleanup-only Retry after completed export.
- Strict canonical schema 2.2, singular Image replacement policy and removed draft
  catalog/Family saveDraft APIs. Incompatible canonical 2.0/2.1 packages and saved
  envelopes require reimport; source normalization and retained V1 compatibility
  do not imply automatic canonical migration.

Recovery removal is now a major changeset. Superseded intermediate migration
claims are corrected. [Isolated staging evidence](evidence/release-delivery-20261013/staging.json)
shows the fixed train reaches exactly 1.0.0 while workspace versions and lockfile
remain untouched.

## Verification and measurements

[Final identity-bound evidence](evidence/release-delivery-20261013/verification.json)
contains implementation/archive/bundle hashes, commands, logs and dispositions.
[Archive acceptance](evidence/release-delivery-20261013/acceptance/report.json)
records npm and pnpm success for local bundles with candidate manifests and
publication bundles without them, plus expected failures for missing guidance,
missing delivery manifest and incompatible archives.

The actual delivered V2 host passes **24 automated browser scenarios per package
manager**: ownership, overlapping imports, failure preservation, cancellation,
fonts, seven typed controls, Choices, Reset and export. Retained V1 single and
Family workflows also pass. Synthetic lifecycle scenarios remain separate from
exact source fidelity. Core/runtime wrappers execute and validate; local measured
generation plus validation was approximately **140/152 ms**, respectively. These
are local tooling observations, not runtime performance promises.

Portable tests, TypeScript, SDK/Studio/example builds, SDK/API/boundary checks,
unchanged bundle budgets, strict packed consumers, R01/R04 regressions, ownership
unit tests and Studio setup/draft/Fields/Family/output/recovery workflows passed.
The delivery suite has **16 passing tests**. The fresh gate has **24 stable
captures, 12 renderer passes, three scene passes and 12 settlement passes**.
Carrousel Color remains checked against raw ZIP numbers.

All twelve current raster hashes match the preceding reviewed gate exactly.
[Review retention evidence](evidence/release-delivery-20261013/review-binding.json)
binds unchanged sources, fixture/font identities, environment and camera to the
new run. No approved reference, tolerance or scene/settlement snapshot changed.
The initial assessment correctly failed for missing current review binding; a
sandboxed reassessment could not open its loopback server. The allowed local
browser reassessment completed GO. Neither attempt is treated as a passing check.

## Evidence limits and R06 handoff

Coverage is automated on macOS with installed supplied archives and Chromium.
There is no new manual live/source-design or screen-reader review. External URLs,
Linux CI and actual registry download/upload/tag/publication were not exercised.
The publication-path test substitutes local bytes and only changes the provenance
to simulation; registry-derived wording is tested, not claimed as provenance.

R06 must apply staged versions, update version-specific declarations/API baselines
and dependency/lockfile metadata as appropriate, generate final breaking release
notes, rebuild/pack and certify that exact train, then perform the guarded release
workflow under separate publication authorization. This milestone consumed no
changesets and applied no versions.
