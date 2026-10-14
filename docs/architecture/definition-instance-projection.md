# Internal Definition / Instance projection

## Current architecture gate — 2026-10-08

The [first production compiler consumer](internal-compiler-result.md#first-production-consumer--v2-zip-import-2026-10-08)
adds the curated Browser V2 ZIP import facade and migrates Studio's shared reader.
Its fresh `sdk-061-production-import-20261008b` gate has
12 renderer, three scene and 12 settlement passes, complete stable captures,
unchanged approved references and exact candidate hashes preserving the prior
source review. The Definition/Instance projection and compiler Family assembly
remain outside production adoption; the aggregate gate reports **GO**. They
remain test-consumed. Both architectural experiments remain independent;
boundary checks allow only the Browser single-source facade to consume compiler
internals in production and enforce that neither experiment consumes the other.
Session convergence and persistence migration remain separately scoped work.

### Previous architecture gate — 2026-10-07

The projection implementation remains internal and test-consumed. The curated
three-export 0.6.1 fidelity gate now reports **GO** in
`sdk-061-mask-settlement-final-20261007a`: 12 renderer, three scene and 12 settlement
comparisons pass with complete stable captures and run-bound source reviews.
ADR 0092 closes Carrousel's observational mask-range gap by delegating the
existing resolver; no production session or renderer starts consuming the
projection. Current portable projection equivalence, package builds/typechecks,
Studio build, API contracts, boundaries, public single host and Color browser
lifecycle pass. Historical broader-corpus no-go records below remain evidence
and are superseded only for this curated baseline.

[The current baseline](sdk-061-three-export-baseline.md) and
[mask evidence contract](../renderer-fidelity/OBSERVATIONAL_MASK_SETTLEMENT.md)
record exact identities, guarded settlement approvals and review limits. The
next milestone may establish an additive internal compiler-result contract and
differential tests, reusing ZIP import and public Family assembly authorities.
Production compiler/session convergence and persistence migration remain later
work. This gate decision is not a claim of general renderer support.

## Contract and scope

The projection is an additive, test-consumed Core architecture view. Production
sessions, rendering, import, persistence, React, and Studio do not consume it.
There are no public exports, new schema versions, fingerprints, or revision
counters. Existing content and materialization revisions pass through unchanged.

Implementation lives in `packages/template-core/src/internal/definitionProjection`:

- `types.ts`: deeply read-only branded Definition, Variant, and Instance views.
- `project.ts`: constructors, source-field accessor, exact detached reconstruction,
  explicit `ProjectionContractError`, and private WeakMap authorities.
- `materialize.ts`: delegation to the existing single and Family materializers.

A constructor clones and deeply freezes one input snapshot. Its views share that
snapshot's nested data; they cannot acquire competing mutable authority. The
private source envelope retains optional-property presence, imported labels and
configuration, provenance, extension data, diagnostics, source/preview/motion/mask
metadata, assets, and fonts. Reconstruction returns a detached copy. A paired
instance is checked by object identity; matching string IDs alone cannot combine
unrelated projections. The runtime guard complements compile-time private brands.

Single definitions expose package ID/name, semantic field configuration, package
field order, and one variant using the package ID. Family definitions expose
existing common fields, original variant IDs/order, sparse overrides, selector
assignments/groups and editor-control order. The source-field accessor preserves
discriminated binding/default types, including Boolean additional targets and
color source indices. Full source packages remain attached to variants.

Instances expose original values and Choice identity, content revision, selected
variant, complete session asset descriptors, and sparse Family image placements.
Absent values stay absent. Single image placement remains in its existing value;
it is not promoted into a Family override. Family values are not filtered by
selected variant. Field configuration continues to own image upload policy.

Family resolution, null clears, atomic collections, imported defaults, Choice
reconciliation, structural Boolean behavior and Crop semantics are delegated,
never reimplemented. Reimport is handled by reconstructing authorities, invoking
existing reimport operations, and projecting the accepted result anew.

## Losslessness boundary and failures

The input is canonical plain data, not original ZIP bytes. Explicit undefined
properties and array order are preserved; binary resources remain externally
owned. URL strings are opaque. No projection activates fonts, opens resources,
leases URLs, or prolongs their lifetime. Use the bridge while Browser owners are
still alive.

Unsupported prototypes, cycles, accessors, symbol/non-enumerable properties and
non-data values are reported explicitly rather than silently stripped by cloning.
Unsupported versions, incompatible content identity, absent selected Family
variant, malformed source structure and forged/mixed projection pairs produce a
ProjectionContractError. Constructors do not perform semantic validation or
repair: representable blocked values/configurations reach existing authorities
and retain their original failure result.

No renderer evidence, readiness, resolved tree, publication generation, or local
input draft is captured. Only loaded definitions and selected Family states are
in scope. Empty/disposed sessions and incomplete UI selection interactions are
not TemplateInstances in this milestone.

## Materialization bridge

Single: reconstruct package/content, overlay session assets with the existing
`{ ...base.assets, ...sessionAssets }` precedence, and call
`materializeTemplateFieldContentV2`.

Family: reconstruct Family/content, overlay assets on the selected variant only,
and call `materializeTemplateFieldFamilyVariantV2`. Return the entire existing
result including effective package, package content, configuration authority,
issues, and materialization. The bridge does not create a resolved tree or compute
Browser readiness. Tests compare its result with current Browser materialization.

## Equivalence evidence

New tests:

- `packages/template-core/test/definitionProjection.test.ts`: own-key structural
  round trips, immutability, all seven types, default/override state, choice
  reconciliation and duplicate-choice rejection, multi-target Boolean bindings,
  sparse variants, common/variant order, null clears, atomic Choice overrides,
  all selector outcomes, image Fill/Fit/Crop (including singular blocked Crop),
  warning-only/maxLines pending evidence, source metadata, asset overlay, and
  explicit malformed/pairing errors.
- `packages/template-browser/test/definitionProjection.integration.test.ts`:
  original/reconstructed paired sessions, renderer inputs/resolved trees,
  readiness and reliable line evidence, stale revision/generation rejection,
  selection invalidation, save/reload, reimport, and actual current ZIP input.
- `definitionProjection.fixtures.ts`: test-only seven-type fixture based on the
  existing Browser V2 regression fixture. It owns no production authority.

The package-boundary guard rejects production imports/re-exports of the internal
module. API-contract and exact declaration checks remain unchanged. No public
barrels or baseline identities were changed by this milestone.

### Current run: 2026-09-25

Before implementation: package typechecks and the full test suite passed.
The normal test runner selected current export `template-package-deal-of-the-week-post.zip`,
2,500,574 bytes, SHA-256
`96866712f10271407a182d3a905e112b2eb1b9170257c4d8fe6d05c9a7311b05`.

After implementation: package typechecks, full tests (including both new suites),
package builds, Studio build, API contract, package boundaries, and public-only
V2 import host passed. The public host exercised current ZIP import, preview reuse,
selectors, append/rename/replacement/removal, resource transfer and save/reload.

Browser workflow and fidelity outcomes are recorded below.
The initial sandboxed browser attempts could not bind a local server (EPERM);
they were rerun with local-server permission. An initial test attempt concurrent
with a package rebuild encountered a removed dist chunk; the isolated rerun passed.
No production change was made in response to either environmental failure.

Additional exact-export projection test: exporter 0.6.1
`template-package-deal-of-the-week-post-2-v0.6.1.zip`, SHA-256
`dc2ba9c89fb588c30b4f175dd988f9a9f9400ea216cce40864c3c234b7d32e28`.
This fixture's exact reconstruction and Browser/materialization equality passed.
The portable suite skips external ZIP access explicitly.

Browser-automated workflows passed in this run:

| Command | Result / evidence |
| --- | --- |
| `pnpm studio:setup` | Pass; `fidelity/evidence/studio-phase-5-setup` |
| `pnpm studio:drafts` | Pass; `fidelity/evidence/studio-phase-5-drafts` |
| `pnpm field-rules:studio` | Pass; `fidelity/evidence/field-rules-v2-studio` |
| `pnpm studio:family-parity` | Pass; parity invocation completed, same draft report directory |
| `pnpm studio:workflow-acceptance` | Pass; `fidelity/evidence/studio-phase-6-workflow-acceptance` |

These are automated browser runs, not a manual visual review. Paired-session font
publication tests exercise the readiness protocol; actual exact-font upload and
restoration are exercised by the setup workflow.

The guarded fidelity baseline (`node scripts/fidelity/cli.mjs baseline --run-id
definition-projection`) attempted 23 fixtures on four surfaces, repeat two. It
finished with four capture errors: `now-hiring-post` and
`optimized-for-template-export` timed out clicking disabled Save template;
`bb-cover-thing-primitives` lacks a verified Funnel Display 400 normal binary;
`main-visual-section-primitives` lacks a verified Funnel Sans 400 normal binary.
Candidates and per-fixture evidence are under
`fidelity/candidates/definition-projection`. These errors were not repaired by
changing rendering, readiness, fonts, or references.

`pnpm scene:compare` returned failure/unapproved classifications, with reference
failures for now-hiring-post, deal-of-the-week-post, deal-of-the-week-banner, and
optimized-for-template-export. `pnpm settlement:compare` likewise returned mixed
pass/fail/unapproved results against its existing evidence. These commands are
not proof of fresh successful captures where the new baseline failed. Historical
handoff records describe reference divergence, but this milestone does not claim
to have established a clean before/after reference baseline.

## Gate disposition

The internal projection implementation, Core differential tests, Browser paired
sessions, latest-export equality, and public/workflow non-regression checks pass.
The full fidelity/reference gate is not green. Compiler/session convergence must
not be justified as fully fidelity-approved by this report. Resolve the capture
and reference prerequisites separately before claiming the complete gate passed.
No valid canonical state in the tested corpus required semantic reinterpretation.
No goldens, scene references, settlement references, or tolerances were updated.

Final guarded comparison: `fidelity/candidates/definition-projection/comparison.json`
contains 92 fixture/surface results: 8 pass, 36 fail, 36 unapproved, and 12
capture-missing. The explicit fresh settlement command
`node scripts/settlement/cli.mjs compare --fidelity-run definition-projection --run-id definition-projection`
correctly rejects the incomplete capture set. The earlier unqualified settlement
comparison used an existing complete run and is not fresh-capture approval.

Final full tests and typechecks passed after adding shared Crop and variant Fit
retention to paired save/restore/reimport tests. Portable tests also passed in this
run; the final placement extension was subsequently exercised by the full suite.
API and boundary checks were rerun successfully. `git diff --check` passed.

## Review closure: 2026-09-25

The follow-up review identified three gaps, now addressed:

1. Constructors check record containers and entries for values, session assets,
   and nested Family placement maps. Arrays, strings, primitives, null, and
   malformed map entries raise `ProjectionContractError`; these checks do not
   evaluate field rules, Choice membership, Crop invertibility or readiness.
2. Core tests independently assert the exposed semantic fields, IDs, title,
   field/variant order, complete variant source and metadata, optional-property
   presence, selection, assets, placements, content revision, and source accessor
   provenance. These checks do not rely solely on private-snapshot reconstruction.
3. Browser tests republish valid evidence after editing and immediately before
   variant switching, assert the content revision stays unchanged, and then reject
   that evidence. Reimport results are projected anew, reconstructed, checked for
   values/Choice identity, and materialized against the live session result.

The follow-up full suite and package typechecks passed. Public API and boundary
checks were rerun. No production consumer or public export was added. The broad
browser/fidelity results above are from the implementation run, not a new manual
review. The fidelity/reference prerequisites remain unresolved: this closure does
not authorize substitutions for missing exact fonts, readiness bypasses, or
reference promotion. Completion of the full architecture gate remains contingent
on that separately documented evidence.

## Architecture regression gate recovery — 2026-09-26

### Disposition

| Independent gate | Current result |
| --- | --- |
| Harness implementation | Complete; no production runtime changes |
| Required captures | Complete: 23 exact fixtures × 4 surfaces × 2 repeats = 184 captures |
| Repeated evidence | All 92 fixture/surface pairs stable under unchanged comparisons |
| Approved renderer references | Not approved: 8 pass, 40 fail, 44 unapproved |
| Approved scene references | Not approved: 4 fail, 19 unapproved |
| Approved settlement references | Not approved: 16 differing bundles, 76 unapproved bundles |

The capture prerequisite is repaired. The full fidelity/reference gate remains
non-green. No differences in this run are classified as historical by assumption,
and repeatability is not reference approval. Compiler/session convergence is not
represented as fidelity-approved by this report.

### Reproduced causes and bounded repairs

The initial `architecture-gate-diagnosis` run reproduced the now-hiring disabled
save after an ordinary Review recheck. `architecture-gate-blocker-details`
retained Checks diagnostics for all four affected fixtures. Those diagnostics
identified missing managed font attachments after the harness claimed its upload
loop was finished. The production save gate was correctly enforcing readiness.

The harness iterated font rows by position, but Studio moves resolved fonts below
unresolved fonts. After uploading one face, the next index could select the same
resolved face again, skipping a different required font. The driver now snapshots
requirement IDs and locates each row by that stable ID. All uploads still pass
through the real UI and its exact classification/hash/readiness checks. No font
matching, resource ownership, session, or renderer behavior was changed.

Funnel Display and Funnel Sans were available locally. The existing binary parser
identified their typographic families, normal posture, and variable weight range
300–800. The manifest now registers Display 400/500 and Sans 400, with environment
path overrides and mandatory byte/hash checks. Real fixture uploads verified the
managed faces through the existing matcher. These identities are verified input
bytes, not a claim of newly approved source-reference fidelity:

| Binary | Bytes | SHA-256 |
| --- | ---: | --- |
| FunnelDisplay[wght].ttf | 55,900 | `9062978ead3d7a3e8b339e41204a5b551e66bc4a5659fa2c845bb0749431af99` |
| FunnelSans[wght].ttf | 55,508 | `998a4eb52c6d2e718517f9dcfee774b09db1daca10971cee3ec7bd15602b8c3e` |

The intermediate `architecture-gate-final` run completed every capture but found
one now-hiring Validate structural repeat difference: subpixel media-placement
coordinates differed while pixels were identical. Element screenshots scroll
their target into view, while the old driver measured structure before that
scroll. The driver now scrolls before readiness sampling and measurement.
`architecture-gate-scroll-check` passed all four now-hiring surfaces; the final
full run below passed all 92 repeated pairs. No coordinate rounding, pixel
snapping, tolerance adjustment, sleep, or runtime change was introduced.

Review now records feedback, actions, existing session revision attributes, and
renderer identities before saving. It invokes Check again only when needed and
waits for the ordinary enabled save action. Failure records include the owning
Checks page where available. A failed readiness wait never forces a save.

### Current-run evidence

Authoritative capture/comparison run: `architecture-gate-verified`.

- Renderer: `fidelity/candidates/architecture-gate-verified/run.json`,
  `environment.json`, and `comparison.json`.
- Per-fixture evidence: `workflow/review-readiness.json`, surface captures,
  structures, browser console, and existing failure/difference artifacts.
- Scene: `fidelity/scene-graph/candidates/architecture-gate-verified/comparison.json`.
  This independently transforms the exact manifest ZIPs; it does not consume
  browser measurements.
- Settlement: `fidelity/settlement/candidates/architecture-gate-verified/run.json`
  records `sourceFidelityRun: architecture-gate-verified`; its
  `reference-comparison.json` retains per-file differences/unapproved status.
  The settlement CLI's aggregate `equal: false` includes unapproved bundles;
  the table above distinguishes those from reference differences.

Environment: darwin 25.5.0 arm64; Node v24.19.0; Chromium 149.0.7827.55;
1440×1600 viewport; device scale 1; en-US; UTC; headless; application-default
profile using the documented exact-font upload path. Exact ZIP identities are
recorded in `run.json`, and font hashes in `environment.json`. This is evidence
against the existing dirty worktree, not a clean before/after runtime change.

Commands executed in this recovery:

```sh
node scripts/fidelity/cli.mjs compare --run-id architecture-gate-verified --repeat 2
node scripts/scene-graph/cli.mjs compare --run-id architecture-gate-verified
node scripts/settlement/cli.mjs compare --fidelity-run architecture-gate-verified --run-id architecture-gate-verified
node scripts/fidelity/capture-integrity.test.mjs
node scripts/fidelity/review-readiness.test.mjs
node scripts/runtime-routing/font-manifest.test.mjs
pnpm test
pnpm test:portable
pnpm packages:typecheck
pnpm api:contract
pnpm boundaries:check
pnpm docs:verify
git diff --check
```

All focused tests, full/portable suites (including Core/Browser projection tests),
package typechecks, API/boundary checks, and documentation checks passed. The three
reference comparisons returned failure as expected from the classifications above.
These are automated browser checks, not a new manual visual approval.

The focused tests cover delayed readiness, disabled/blocked save controls,
disabled fieldsets, row reorder during font uploads, missing/mismatched font bytes,
missing or incomplete captures, and unstable repeat reports. Capture-integrity
checks are registered in the full/portable test entry. The Chromium probes remain
an explicit harness command.

Run IDs cannot overwrite existing candidate runs. Settlement input validation now
requires successful complete repeated captures and their files, not just one
structure report. Negative checks explicitly rejected the incomplete
`architecture-gate-recovery` run and the unstable `architecture-gate-final` run;
there was no fallback to an older successful run. A duplicate capture run ID also
failed before starting capture.

### Preserved boundaries and next action

No production source, public API baseline, fixture ZIP/manifest, approved
reference, scene/settlement snapshot, or tolerance was changed in this recovery.
The approved directories have no git changes (96 renderer files, 4 scene files,
80 settlement files). Existing unrelated worktree changes were retained.

The next prerequisite is a separately scoped review of the recorded reference
and environment differences. Any intended reference promotion requires its
existing reviewed fidelity reason; any demonstrated runtime defect requires a
separate implementation milestone. The recovered harness provides reproducible
evidence for that decision without authorizing either action automatically.

### Pre-release regression disposition — 2026-09-30

This is a new current-worktree verification, separate from `architecture-gate-verified`.
Tested HEAD: `944c51b33433ce2e37ec05f7de66457d5154d5b4`; the worktree was already
modified and remains modified. The exact tracked/untracked inventory for this
run is `fidelity/evidence/prerelease-20260930/worktree-status.txt`. Core,
Browser and React package versions are each 0.8.0. The run JSON records all 23
exact ZIP paths, sizes and SHA-256 hashes. The environment JSON records the
verified font binary hashes and Chromium 149.0.7827.55 on darwin/arm64, headless
1440×1600, scale 1, en-US/UTC, application-default exact upload profile with no
fallback fonts. The earlier `prerelease-20260929-a` capture is incomplete because
it used a removed Checks preview class; it is retained as failure evidence and
is not compared as a successful run. The `-c` and `-d` captures completed but
were unstable because PNG repetitions changed FontFaceSet multiplicity/order
across output completion and new sessions. They are likewise not authoritative.

Authoritative current run: `prerelease-20260930-final`. The importer harness now
locates the current Checks preview, captures editor evidence before the export
operation completes the recovery session, starts a new output for the next PNG
repeat, and reloads its document as for the first repeat. Font readiness
comparison ignores FontFaceSet enumeration order but retains every face and its
status; a missing or extra face still fails. Focused tests cover capture order,
rejected exports, font order and missing faces. No pixel/geometry threshold or
reference was changed.

- Renderer: `fidelity/candidates/prerelease-20260930-final/{run,environment,comparison}.json`.
  All 184 captures are complete; all 92 fixture/surface pairs repeat stably.
  Against approved references: 8 pass, 40 differ, 44 have no approved reference.
- Scene: `fidelity/scene-graph/candidates/prerelease-20260930-final/comparison.json`.
  Four reference differences and 19 unapproved fixture scenes.
- Settlement: `fidelity/settlement/candidates/prerelease-20260930-final/{run,reference-comparison}.json`.
  `sourceFidelityRun` is exactly `prerelease-20260930-final`. Sixteen
  fixture/surface bundles have differing approved files; 76 lack approved files.
- Per-fixture and per-surface classifications, including historical status,
  changed-pixel percentage, geometry result, scene first difference and
  settlement file statuses, are in
  `fidelity/evidence/prerelease-20260930/surface-dispositions.json`. Every
  difference remains unresolved pending source/intent review. None was
  classified as intended merely because it repeated. Unapproved surfaces are
  missing references, not passes. The historical status counts match this run;
  this alone does not prove that each diff has the same cause.
  Measured renderer comparison groups: 36 of the 40 failures have different
  capture dimensions from the approved reference; three have equal dimensions
  but differing pixels and geometry; one has equal pixels but differing
  structural geometry. These are observed difference classes, not a proof of
  source-design correctness or a shared runtime cause.

The legacy smoke's old external-face-removal assumption reproduced: after
manually deleting the exact private face from `document.fonts`, its static
inspection preview changed variant and render/font revision but did not invoke
managed-font preparation again. The exact binary hash, private family, before/
after face state and revisions are recorded in
`fidelity/evidence/prerelease-20260929/legacy-font-removal-probe.json`.
This is a development-only legacy viewport interaction, not the supported
font-preparation lifecycle. The current public V2 host test at
`scripts/repository/verify-font-reactivation.mjs` uses public Core and Browser
entry points, verifies that same binary, removes its face, selects another
variant, and prepares fonts again. It passes activation, shared-owner survival,
variant switching, disposal and reactivation. No font runtime change was
required. The ordinary legacy smoke now keeps the face registered and passes;
its restored-page route was corrected to retain the development fidelity mode.
The supported runtime exact-font evidence gate also passes after sharing the
manifest's verified path resolver, including Funnel binaries.

Executed in this run: `pnpm test:portable`, `pnpm packages:typecheck`,
`pnpm packages:build`, `pnpm build`, `pnpm api:contract`,
`pnpm boundaries:check`, `pnpm sdk:import-v2:verify`, `pnpm studio:setup`,
`pnpm field-rules:studio`, `pnpm studio:family-parity`,
`pnpm studio:workflow-acceptance`, `pnpm studio:browser-smoke`,
`pnpm font:reactivation:verify`, `pnpm runtime-routing:fonts`, focused harness
unit tests, the renderer compare above, the scene compare and the settlement
compare bound to that renderer run. The three reference compares exit nonzero
for the classified differences. The other named gates pass. These are automated
browser results; no source-design visual approval is claimed. Approved pixel
references, scene snapshots, settlement snapshots, tolerances and public API
baselines are unchanged (`git status` shows no approved-reference changes).

Gate disposition: **harness complete: yes**; **captures complete and repeatable:
yes**; **reference approval: no**; **safe to begin compiler-result consolidation:
no**. The next action is source/intent review of the 40 renderer and four scene
reference differences and the 44/19 missing references, with the linked
settlement differences. A verified intended correction would need its own
reviewed reason and approval path. Stable output cannot by itself certify this
architecture baseline.

### Reference-review disposition — 2026-09-30

The [current source-linked review](fidelity-reference-review-20260930.md)
classifies all 92 renderer surfaces and their scene/settlement evidence from
`prerelease-20260930-final`. The 36 preview dimensions track uniform scaling
of unchanged logical canvases by current Studio containers; historical
container/viewport metadata is unavailable, so these remain reviewable layout
reference differences. Three changed PNG exports move closer to embedded
source previews but are not wholly source-correct; one PNG is pixel-identical
and differs only in image-placement structure. Four scene snapshots include
semantic/provenance differences beyond `packageBytes`. Missing references have
individual source-linked packets, with material layered-appearance gaps
identified for bb-cover and main-visual, plus a source/exporter conflict for
the crop banner's opaque background node. No reference
was promoted. The compiler-consolidation gate remains **no-go**.

### Exporter 0.6.1 SDK gate — 2026-10-04

The [curated ten-ZIP architecture gate](sdk-061-architecture-gate.md) supersedes
the historical mixed-export corpus for the next SDK milestone's go/no-go
decision. Six sources captured repeatably; four Family sources are blocked by
the exact public importer `field.invalid-property` diagnostic on a color field
bound to `appearance.fills` on a mask `RECTANGLE`. Eight individually reviewed
renderer paint surfaces have initial approvals, while the other renderer,
scene, and settlement surfaces remain unapproved or uncaptured. The tracked
per-surface disposition and run identity are linked in that report.
Compiler-result consolidation remains **no-go** until all ten current-export
sources pass the complete, stable, source-reviewed gate.
