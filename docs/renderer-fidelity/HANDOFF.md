# Renderer Fidelity Handoff

## SDK 2.0 automation rehearsal correction — 2026-10-16

[The current release report](../architecture/sdk-host-onboarding.md) supersedes
older pending-approval notes below. Explicit encrypted CI setup is approved.
F passed macOS/Linux archive hosts, portable/strict checks and the source-reviewed
24/12/3/12 gate. Its release rehearsal passed fixture restoration and reference
commands, then exposed missing installed dependencies in the isolated simulator.
A regression reproduces that failure; the narrow test-only fix passes all 32
tooling tests. G must renew certification and the rehearsal. No production source,
reference, tolerance or protected identity changed. Preserve F and earlier packets;
keep the existing release tag on `c6f489a` pending approval of the final target.

## SDK 2.0 release automation correction — 2026-10-16

Continue from [candidate E's progress packet](../architecture/evidence/sdk-host-release-20261016e/progress.json)
and [the release-input contract](../architecture/sdk-release-automation.md).
Local macOS npm/pnpm hosts, portable checks, 29 tooling tests and the source-reviewed
24/12/3/12 gate pass; frozen SDK archives/starter equal D and protected identities
remain unchanged. Linux and the shared-input-action rehearsal are pending.
Automatic approval review blocked encrypted private fixture transfer and fixture
secret replacement before execution; explicit approval was requested. Do not
retry those actions without it or infer overall certification from local GO.
Keep the `c6f489a` release tag and prior candidates immutable while completing
certification, then obtain approval for the final corrected tag target. No SDK
2.0.0 package has been published and no reference promotion is authorized.

## SDK 2.0 host release certification — 2026-10-16

[The host-delivery report](../architecture/sdk-host-onboarding.md) and [current candidate packet](../architecture/evidence/sdk-host-release-20261016d/certification.json) record GO for immutable `sdk-2-host-20261016d`: macOS/Linux npm/pnpm acceptance, 24 stable captures, 12 renderer, three scene and 12 settlement comparisons, with individual current stored-source review. D corrects publication-context documentation labels; SDK code/declarations and starter bytes are identical to C. Published 1.0.0 and prior packets remain unchanged. All 285 protected identities remain unchanged; no renderer/API/schema change or reference promotion occurred. The intended tag is `sdk-v2.0.0`; publication/tagging and registry round-trip verification remain separately approved operations.

## Family media readiness publication — 2026-10-15

[ADR 0098](decisions/0098-family-media-readiness-publication.md) and [the implementation report](../architecture/f7-readiness-publication.md) record the bounded Family-only change. Decode completion reuses the current accepted materialization/tree and projects readiness/status/error, preserving semantic references and one publication per accepted source completion. Full authoring derivation, font/line/renderer revision guards and PNG raster authority remain unchanged. Native differential, separate paired production timing and browser lifecycle evidence are retained. Fresh unpublished 1.0.0 candidate `unpublished-1.0.0-440c932335c46a7015cb074079fcd5cd2767a28d78ff8e4fe9fe0921912ece35` is GO under run `sdk-f7-readiness-20261015`; the earlier certified candidate remains immutable. Cold Cover readiness improves by approximately 90–99 ms median across two minimal paired runs; detailed warm timing differences remain a separate tracing limitation. Reproduce and review the exact evidence in the report. No API/schema, rendering capability, cache, batching, reference or tolerance change is included.


## F7 production profiling — 2026-10-15

[The bounded profile](../architecture/f7-production-profiling.md) is complete after candidate certification reached GO. Seven production workload sequences yield 120 measured steps / 60 matched observation pairs after warmup; four lifecycle diagnostics and the full-application Family smoke pass. Cover repeats 15 unchanged media-triggered derivations, about 76–77 ms aggregate detailed CPU time, with 14–15 preceding initial mount. This supports a separately scoped readiness-publication ownership/implementation plan, not a measured speedup or permission to change runtime behavior. No media derivation overlaps recorded >50 ms long tasks; decode and renderer/font settlement remain separate contributors. Production sources, archives and approved evidence are unchanged. Reproduce with `node scripts/f7/run.mjs --output /tmp/f7-new-run --trials 5`, then `scripts/f7/analyze.mjs` and `scripts/f7/validate-evidence.mjs`; retain detailed and minimal profiles separately.

## V2 SDK / exporter 0.6.1 boundary — 2026-10-15

See [ADR 0097](decisions/0097-v2-only-sdk-and-061-source-admission.md) and [the implementation/evidence report](../architecture/sdk-v2-optimization.md). The unpublished 1.0.0 candidate supports V2 hosts and exporter 0.6.1 ZIPs only; source schema 1.0 normalization and canonical schema 2.2 remain. Historical readers are test-only. Validation, primitive revision assembly and save/recovery reuse existing authorities; no visual owner, capability, provenance, settlement or export-readiness semantics changed. The three-export candidate gate is now GO after a current run-bound stored-source/capture review and fresh public host checks; see [candidate certification](../architecture/sdk-v2-candidate-certification.md). This certifies the immutable unpublished archives in the recorded environment; subsequent profiling tooling has a separate worktree identity. No reference/snapshot/tolerance/fixture/font promotion is authorized. Reproduce with the exact commands and source checkpoints in the report/evidence, followed by a fresh `pnpm sdk:gate:061 -- --run-id <unique-run>`.

## R07 reference and viewport history

Read [the R07 source review](../architecture/r07-carrousel-raster.md) before
changing the camera, initial output zoom or thumbnail sampling. Regenerate with
`pnpm sdk:gate:061 -- --run-id <new-unique-run>`. The current certified gate is
`sdk-061-r07-raster-20261013a`: 24 stable, 12 renderer, three scene, 12 settlement
passes. Preserve only the reviewed Carrousel/editor replacement; all unrelated
references remain unchanged. Native pre-Fit viewport history is recorded by the
test-only camera. Never infer a raster environment from final bounds alone or
reuse review for a changed candidate. There is no production renderer repair in
R07 and no new support/backend or release-readiness claim.

## Host font registry handoff

Read ADR 0096 and [the R01 report](../architecture/host-font-authority.md). Regenerate the retained packed reproduction and current public-host scenarios with `scripts/repository/verify-host-font-authority.mjs`. Keep registries borrowed, explicit null distinct from undefined, and handle exports bound to their committed renderer. Run exact-font reactivation, routing/fonts, text-trim, portable/packed/API/budget checks and the source-authoritative three-export gate. Preserve R07 and independently reproduced failures; never approve a changed reference merely to close R01.

## Established media underlay warning

ADR 0095 and [the media underlay report](../architecture/media-solid-underlay.md)
record the bounded false-fallback correction. Existing CSS/media owners and
primitive rejection evidence remain intact. Do not generalize it to arbitrary
ordered IMAGE paints or suppress unsupported stacks. Current-run commands and
protected hashes are recorded with the report. Gate `sdk-061-media-underlay-20261010a`
is GO; all 15 release checks pass and all 12 PNGs retain their reviewed identity.
No approved reference, snapshot or tolerance was changed.

## Text geometry lifecycle handoff

Read ADR 0093 and TEXT_MEASUREMENT_LIFECYCLE.md before further text-cache changes. Reproduce before/current with scripts/editor-performance/run.mjs and the retained text-geometry-baseline identity. Run scripts/text-geometry/assert-traces.mjs plus font/text-trim/routing and all guarded comparisons. Full commands/results are in the architecture report. Final source identities are retained in `docs/architecture/evidence/text-geometry-final-d-sources/identity.json`; the passing gate is `sdk-061-text-geometry-20261009d`. Regenerate detailed and isolated timing profiles separately, then run `scripts/text-geometry/supplement.mjs` and `scripts/text-geometry/finalize.mjs`. Do not use source-injected trace timings as uninstrumented product timings, and do not relabel old settlement/line publications. Broader canonical-rendering optimization remains a separate audit.


## 2026-10-07: mask settlement closure and next architecture milestone

Run `sdk-061-mask-settlement-final-20261007a` closes the three-export gate:
12 renderer, three scene and 12 settlement comparisons pass with two stable
captures per surface. `pnpm sdk:gate:061 -- --run-id sdk-061-mask-settlement-final-20261007a
--assess-existing` reports **GO** after rerunning the public single host and
Carrousel Color edit/Reset/export check. ADR 0092 describes the bounded
observational mask evidence and dependency repair; rendering and canonical
scene authority are unchanged. All settlement approvals used the matching
explicit `--source-run`, retained before/after evidence, and passed new
ready/complete/equivalent bundle guards. No renderer/scene reference or
tolerance was updated in this milestone.

Reproduce source checks with `pnpm settlement:mask-source-evidence --
--fidelity-run sdk-061-mask-settlement-final-20261007a`. Recompute settlement using
`pnpm settlement:compare -- --gate sdk-061 --fidelity-run sdk-061-mask-settlement-final-20261007a
--run-id sdk-061-mask-settlement-final-20261007a`. Fresh captures require a new unique run and
run-bound dispositions; see [the evidence record](OBSERVATIONAL_MASK_SETTLEMENT.md).
Current review uses headless captures and automated source/browser telemetry;
no new separate live manual review is claimed. Package/Studio builds,
package typechecks, portable tests, API and boundaries pass. Existing user
worktree changes were retained.

Next: audit and establish the smallest internal compiler-result contract with
differential tests over existing ZIP import and Family assembly authorities.
Do not unify sessions, migrate persistence or change production import routes
as part of that additive milestone. The historical ten-fixture gate and Matrix
research do not acquire approval from this three-export decision.

## 2026-10-07: three-export reference review transfer

Exact-font run `sdk-061-three-review-final-20261007a` captured Now Hiring,
Cover, and Carrousel twice on Validate, Fields, editor, and PNG. It is complete
and repeat-stable. ADR 0091 adds the bounded Cover mixed-paint owner; HUG text
measurement now excludes terminal CSS letter spacing. The source-sized PNG
preview comparator reports 340/2,830/1,817 changed pixels for the three
exports. Cover's fade and arrow were also checked in the live Studio editor;
the other fixture reviews used stored browser captures. All 12 renderer
references and three observational scene snapshots passed guarded, individual
source review. Eight ready settlement bundles were approved from the **same
source run**; the settlement update CLI now rejects an identified run without
matching `--source-run`, following a discovered unbound regeneration during
review. The erroneous intermediate updates and their correction remain in
update evidence. Carrousel's four settlement surfaces remain pending and
unapproved because node `987:6813` has unresolved `mask-range` dependency.
`pnpm sdk:gate:061 -- --run-id sdk-061-three-review-final-20261007a
--assess-existing` therefore reports **NO-GO** only on settlement. Do not
promote pending bundles as ready evidence. The next separate milestone must
decide how observational mask ranges are represented; no runtime mask
semantics were changed here. Full per-surface details are in
`fidelity/gates/sdk-061-dispositions.json` and the architecture baseline.

## 2026-10-06: bounded runtime compositing transfer

The internal resolver at `packages/template-core/src/compositing/resolveSourceCompositing.ts`
now selects eligible opaque exporter 0.6.1 paint rows and non-overlapping
PASS_THROUGH/NORMAL/OVERLAY groups. The resolved backend capability owns their
DOM paint layers on Validate, Fields, editor, and PNG; unsupported combinations
retain compatibility. See ADR 0090 and the two Phase 9 source gates. Reproduce
with `pnpm test:portable`, `pnpm compositing:group-source-evidence -- --run-id
<unique-id> --capture-run <two-pass-run>`, and the exact fixture capture and
comparison commands. Cover's mixed IMAGE/gradient fade remains separate work.

Current exact-byte two-pass capture runs are
`phase9-group-runtime-final-20261006-c`,
`phase9-matrix-runtime-final-20261006-c`, and
`phase9-compositing-regression-final-20261006-c`. The bound Matrix 2 packet is
`phase9-group-runtime-evidence-final-20261006-d`. All four surfaces are complete
and stable for each fixture. The three active SDK fixtures' twelve first-pass
PNGs are byte-identical to `sdk-061-cover-arrow-final-20261004`; their public
single-host check, package typechecks/build, Studio build, portable tests, API
contract, and package boundaries pass. Matrix/Matrix 2 renderer references and
scene references remain unapproved; Matrix 2 settlement references fail. The
active SDK gate has 12 unapproved renderer surfaces, three unapproved scenes,
and 12 settlement-reference failures. None of these reference comparisons is
a pass or permission to promote. Stored-capture visual review was performed;
no separate live-browser inspection was claimed for this final run.
The primitive browser harness needed one test-only navigation repair: after
its save transition it now retains `studio-mode=single-template-fidelity` when
reloading, so it returns to the same legacy fidelity host instead of mounting
the current Studio Library. The representative `stroke-test-primitives`
restore scenario passed in `phase9-primitive-resume-fixed-20261006` with no
renderer-time Figma requests. The complete 14-fixture primitive reload suite
then passed in `phase9-primitives-final-20261006`; every fixture retained its
primitive identity after reload and made zero renderer-time Figma requests.
The local 100-iteration primitive/backend microbenchmark
`fidelity/evidence/phase9-compositing-performance-20261006.json` measured
Matrix 2 at 0.199 ms per primitive tree and 0.999 ms per resolved tree, and
Matrix at 0.088 ms and 0.366 ms respectively. These are current-run local
measurements, not a release latency budget or a before/after claim.

## 2026-10-06: Matrix 2 direct Figma inspection and re-export

The source ZIP at `/Users/niels/Documents/Templates/template-package-matrix-2-v0.6.1.zip`
changed bytes under the same filename. The current hash is
`b8228a8c9d256ff0b78f89f720c57e3416f60289cae0a0344ef034a146f66c52`;
the previous `03537cf0916126252c1697ccce1f2e63af5db26d73a4d6d1db9bfa35d7b4cc38`
capture is historical. The read-only live Figma inspection is tracked at
`fidelity/gates/phase9-compositing-group-control-figma.json`. Run
`pnpm compositing:group-source-evidence -- --run-id <unique-id> --capture-run phase9-group-capture-20261006-a`
to regenerate the exact bound source packet. The new capture is complete and
stable across Validate/Fields/editor/PNG; renderer and scene references are
unapproved, and settlement references are missing or different. The third
group adds three bounded Overlay image-interior samples, not a general owner.
See [the source gate](PHASE_9_GROUP_CONTROL_SOURCE_GATE.md) and ADR 0089.
No golden/reference/tolerance was changed. The active SDK gate remains no-go.

## 2026-10-05: bounded Matrix 2 group-source result

The separate research profile `fidelity/gates/phase9-compositing-group-control.json`
pins Matrix 2 and six Figma screenshots. Regenerate its ignored evidence with
`pnpm compositing:group-source-evidence -- --run-id <unique-id> --capture-run phase9-group-capture-20261005-a`.
That run captured each of Validate, Fields, editor, and PNG twice with complete,
stable readiness. Source samples establish matched opaque-backdrop
`PASS_THROUGH` versus `NORMAL` group behavior and post-group 80% opacity.
Renderer comparison reports four unapproved surfaces, scene one unapproved
snapshot, and settlement four missing or different bundles. Current output
is not source-faithful in those groups; no reference was promoted. See
[the source gate](PHASE_9_GROUP_CONTROL_SOURCE_GATE.md) and ADR 0088.
Next runtime work requires a separate coherent milestone and must retain
explicit fallback for transparent-edge and untested group modes; Cover's
IMAGE/gradient fade remains a separate blocker. This source intake did not
change production rendering.

## 2026-10-04: Phase 9 compositing source intake

`fidelity/gates/phase9-compositing-source.json` pins Matrix and Cover ZIP,
template, preview, asset, and Figma screenshot hashes. Run
`pnpm compositing:source-evidence -- --run-id <unique-id> --capture-run phase9-matrix-cover-capture-20261004-a`
to regenerate the local ignored source report. That two-pass capture is complete
and stable on Validate, Fields, editor, and PNG for both fixtures; renderer has
eight unapproved surfaces, scene has two unapproved snapshots, and settlement
has missing or different approved bundles. Matrix's current PNG loses four
blend rows. The source math is bounded to opaque samples and does not resolve
group isolation, alpha, or backend choice. ADR 0087 retains Phase 9 as Result B
with no runtime authority transfer. Next input: matched 0.6.1 pass-through and
isolated group controls with partial alpha and parent opacity; do not promote
references or implement a general blend owner from these two ZIPs alone.

## 2026-10-04: Cover arrow SVG stroke ownership

ADR 0086 makes a selected, renderable SVG source the sole stroke painter for
its VECTOR node. The renderer retains the canonical stroke and wrapper
layout/clipping but skips compatibility CSS border/shadow layers. Focused
tests cover the SVG owner, missing source, semantic-shape vector, and ordinary
FRAME stroke. The pre-change run is `sdk-061-cover-arrow-pre-20261004`; the
stable two-pass exact-code run is `sdk-061-cover-arrow-final-20261004`.
Only Cover's four surface PNGs changed; the source-sized delta is within the
arrow's 24×24 bounds. The tracked three-export disposition is bound to the
post-change run. Cover's mixed-paint `DARKEN` footer fade is still a Phase 9
blocker, and all three fixtures still lack approved references. Do not treat
the regional arrow improvement as full Cover fidelity or promote references
without separate source review.

## 2026-10-04: imported Color precision

Core Color materialization now retains the exact bound SOLID paint when the
sparse imported default's control hex represents that paint. Binding checks
still precede this decision. Explicit edits and deliberately different V2
defaults write canonical RGB only to the indexed fill. Regression commands:
`pnpm test:portable`, `pnpm sdk:gate:061:single`, and the three-export
two-pass `pnpm sdk:gate:061 -- --run-id <unique-id>`. The latter compares
rendered output for unintended effects only; exact Color values are checked
against the ZIP `template.json` in the public host test. Never update
references to accept a changed Color default without separate source review.

## 2026-09-15 — Boolean reflow no longer leaves stale full-parent mask insets

Live inspection of the supplied carousel draft corrected the earlier diagnosis:
the discount and subtitle nodes remained structurally active, but product-card
`800:68` retained `clip-path: inset(164px 0)` after `CarVis` removed Boolean
groups `907:9933` and `907:9932`. That stale affected-node clip hid the sibling
badges.

The React renderer now recognizes only the source-certified full-parent subset:
an exact opaque rectangular ALPHA mask that is the first child, covers its parent,
declares `end_of_siblings`, affects every following sibling, and whose parent has
no stroke/effect. The same single clip owner moves to the stable parent as
`inset(0)` on every surface; other exact mask scopes retain the existing
affected-node inset.
Telemetry records `full-parent` and `full-parent-ancestor`. No hierarchy/name
heuristic, schema change, general mask backend, golden update, or tolerance change
was introduced. See ADR 0084.

Current-run evidence: the full unit suite, package typechecks/builds, Studio build,
documentation links, Boolean browser scenario, repeat-two four-surface mask
capture, and mask source evidence pass. Direct Studio inspection with `CarVis`
false visibly retains both badges. The older `mask:browser-scenarios` script timed
out before its assertion because it still waits for the removed
`package-editor-panel` test ID. The guarded comparison retains its documented
historical fail/unapproved states; the mask candidate itself is unapproved, and
no reference update ran.

## 2026-09-14 — Nested and multi-target Boolean field groups

Exporter V1 normalization now preserves nested content IDs by deriving
`<id>Visibility` for same-ID Boolean containers and merges compatible repeated
Boolean markers into one `StructuralVisibilityBindingV2` with additional
targets. Browser single/Family sessions expose only active content controls;
configuration, canonical content, persistence and ordering remain complete.

The supplied carousel ZIP normalized with zero V2 errors: `carVis` controls
groups `907:9933` and `907:9932`, hiding `top` and `bottom`, while `ctaVis`
independently hides `cta`. Full tests/build, Studio setup/drafts/Field Rules and
the Boolean runtime harness passed. ADR 0078 renderer behavior and approved
references remain unchanged. See ADR 0082.

## 2026-09-13 — Studio hard text-input limits (host-only)

Studio's Draft Editor now distinguishes neutral, 80%-warning, and exact-maximum
character counter states. Textarea typing, paste, composition completion, and
choice selection preflight candidate wrapping against the mounted preview node;
new values above `maxLines` are rejected before the V2 controller runs. Existing
invalid saved values remain visible and repairable. Direct SDK mutation semantics,
canonical schemas, renderer line-evidence authority, persistence versions, and
renderer output are unchanged. No hidden renderer or golden-reference update is
introduced.

## 2026-09-06 — Studio browser workflow hardening (host-only)

Phase 3 adds Studio-owned canonical single/Family locators, typed Existing-work routing, generation-guarded navigation, transition locking, accurate accepted-change Settings dirtiness, revision-aware retry states, and collision-safe Library lifecycle actions. Existing work retains its direct opening path and explicit conversion. No public SDK, persistence-version, canonical-schema, renderer-authority, fixture, tolerance, or approved-reference change was needed.

See [Phase 3 scope and current-run evidence](../studio/PHASE_3.md). Chromium draft, setup, and existing Studio/external-host regressions plus portable, build, API, boundary, and documentation checks passed. Hard offline app-shell reload remains deferred; loaded-shell IndexedDB reopening is covered. Historical renderer-fidelity reports below are not new pixel-parity claims from this host-only change.

## 2026-09-06 — Studio Template/Draft separation (host-only)

Phase 2 restores separate Library, Template Settings and Draft Editor responsibilities through existing V2/V3 persistence. Studio envelope annotations and bound writes preserve entity identity/metadata; drafts own independent content/configuration snapshots with shared binary assets. Autosave, explicit conversion, source-font Settings and generation-safe loads are implemented. No public SDK, persistence-version or renderer-authority change was needed.

See [Phase 2 scope, evidence and remaining limitation](../studio/PHASE_2.md). Chromium/IndexedDB draft, setup and existing Studio/external-host checks passed, as did portable tests and Studio build/API/boundary checks. Hard offline app-shell reload remains unsupported by the Vite host; offline saved-record reopening was verified separately. Historical renderer-fidelity reports below are not new pixel-parity claims from this host-only change.

## 2026-09-06 — Studio setup shell restoration (host-only)

The default V2 import entry now uses Package/Family → Fonts → Validate → Fields
→ Add/Review. Accepted configuration/order/font state survives navigation and
incremental source addition; Validate links to correction owners and Review only
summarizes/saves. Current public SDK APIs and renderer authority are unchanged.

Browser wizard and seven-field/external-host regression, portable tests, Studio
typecheck/build, API/boundary and documentation checks passed. Exact-font source
upload/replacement and field retention were browser-verified. See the
[frozen responsibilities and current-run report](../studio/WORKFLOW_RESTORATION.md).
Template/draft separation and full journey hardening remain subsequent Studio
phases. No new SDK milestone, persistence version or reference promotion was added;
historical renderer-fidelity results below are not new claims from this UI run.

## 2026-09-04 — Field Rules V2 closure corrections

- All four audited defects are fixed: stale active line evaluations are
  invalidated; representable invalid single-template Crop survives persistence
  and opens for repair; common Family Choice reconciliation is selected-variant
  independent; image cleanup retains all still-referenced shared assets/URLs.
- Family configuration is atomic. Unchanged canonical entries retain their
  content state/revision; changed entries advance once. Core's existing option
  removal behavior is unchanged. Existing operation/publication identities
  reject configuration-only ABA. No optional audit cleanup was performed.
- Narrow regressions plus full/portable/strict realistic suites, typechecks,
  builds, API/boundary/release/archive/packed-consumer/budget/docs gates pass.
  Actual Studio browser evidence includes invalid persisted Crop repair/reset.
  Stage 4A, nine routing scenarios, Boolean, fonts, trim, Textarea and session
  offline smoke pass. An initial concurrent routing timeout passed on isolated
  retry; it was not addressed by changing production semantics.
- `field-rules-closure` captures are repeat-stable across 23 fixtures/four
  surfaces; all 92 PNGs equal `field-rules-v2-m7`. Crop's registered source-region
  residual remains 0.19921875%. Guarded renderer/scene/settlement comparisons
  retain historical fail/unapproved classifications. No reference update ran.
- See the [four-part closure report](../field-rules/MILESTONE_7_REPORT.md#post-implementation-closure-corrections).
  Public APIs, schemas, legacy adapters and certified capability boundaries are
  unchanged. Field Rules V2 closure corrections passed. Field Rules V2 is closed.

## 2026-09-04 — Field Rules V2 Milestone 7 Studio and external-host proof

- The default Studio flow now imports/normalizes to V2, authors all seven typed
  configurations, and edits canonical content through public Browser sessions.
  Stable choices, editor ordering, optional roles, Family sparse configuration,
  shared/variant Crop, manual save/reload and reviewed reimport are included.
- Public `configure()` transactions validate atomically, reconcile content via
  Core, retain managed assets and materialize once. No Studio renderer or field
  validator was added. See [ADR 0081](decisions/0081-studio-and-custom-hosts-share-v2-configuration-and-content-authority.md)
  and the [complete report](../field-rules/MILESTONE_7_REPORT.md).
- Actual StrictMode browser integration exposed and fixed publisher-lease
  acquisition, stale operation callbacks, Blob asset carrier/dimension handling,
  and correction of content made semantically invalid by new configuration.
  Publisher replacement immediately exposes pending without rematerialization.
- `field-rules:studio` passes actual configuration, seven-type edits, line
  invalid/warning/inactive states, surface remounts, Crop/PNG, save/reload,
  reimport and selected Family rules/framing. Evidence lives in
  `fidelity/evidence/field-rules-v2-studio/report.json`. The independent host
  proves public ordered controllers, custom brand Color, Number/Date, canonical
  Crop and PNG; its exact source builds in the isolated packed consumer.
- Current-run full/portable/strict realistic suites, typechecks/builds,
  API/boundary/release/archive/consumer/budget checks and session browser smoke
  pass. Stage 4A, all routing scenarios, Boolean, fonts, trim and Textarea
  source/runtime scenarios pass. Crop source comparison remains unchanged.
- `field-rules-v2-m7` captures all 23 fixtures on all four surfaces twice with
  exact stability; all 92 PNGs equal the Milestone 6 final regression bytes.
  Guarded renderer/scene/settlement comparisons retain historical fail/unapproved
  states. No approved reference or tolerance changed.
- Legacy saved work is explicitly isolated at `?studio-mode=legacy`. Its old
  browser smoke retains the known Family-menu focus-label timeout; the V2
  browser scenario passes. Do not retire/migrate legacy records by inferring
  content from renderer properties.
- Family Crop is product/runtime proven, not newly multi-aspect source-certified.
  M7 does not expand any Boolean, Crop, text/font or layout subset. The seven
  Field Rules implementation milestones are complete within those boundaries.

## 2026-09-04 — Field Rules V2 Milestone 6 Textarea maxLines

- The visible DOM/CSS text paint now publishes its clustered visual-line count
  to V2 sessions. There is no mirror renderer, newline estimate, height division,
  or Studio-owned counter.
- `TemplateFieldSessionRendererV2` owns renderer/readiness publication for
  single and Family sessions. Evidence requires current content,
  materialization, settlement, font, participation, publisher lease, and
  renderer generation.
- Active `maxLines` remains pending/invalid and export-blocking without delaying
  edits. `warningAtLines` is inclusive and advisory. Hidden Textareas are
  inactive and unmeasured; showing them restores pending.
- The focused `runtime-routing:textarea-max-lines` run uses the registered
  `now-hiring-post` ZIP and passes one/warning/over/empty line states across four
  renderer instances plus invalid/valid PNG readiness. Exact-font behavior
  remains covered by the existing font/text-trim scenarios.
- Final source-backed evidence is
  `fidelity/runtime-routing/textarea-max-lines/milestone-6-final/report.json`.
  It verifies the exact ZIP hash, the `378:22` Textarea binding, active and
  structurally inactive states, inclusive warnings, the blocking maximum, and
  corrected 1000×1350 PNG export on Validate, Fields, editor, and PNG-labelled
  instances. Field validity remains pending until the existing package-font
  authority accepts the current face.
- Current-run passes: package typechecks/builds, full and strict realistic-ZIP
  suites, Stage 4A, routed scenarios, fonts, text trim, Boolean routing, the
  focused Textarea browser scenario, exact two-pass 23-fixture baseline, API,
  boundary, release, documentation, package archives, packed Core and external
  consumers, session browser smoke, Studio and example builds, and curated
  bundle budgets. The packed external consumer imports and mounts
  `TemplateFieldSessionRendererV2`.
- Final regression candidates are in
  `fidelity/candidates/milestone-6-final-regression`; all 23 fixtures and all
  four surfaces are exact across their two captures.
- Guarded renderer, scene, and settlement comparisons retain their documented
  existing fail/unapproved classifications; no update command ran. Studio
  browser smoke reaches the pre-existing Family variant-menu focus assertion
  and times out because the test expects `Actions for Blue Portrait` after
  opening the `More actions for Blue Portrait` trigger; this is unrelated to
  renderer-backed line evidence and was not changed in this milestone.
- Final curated measurements are 676,937/165,009 bytes/gzip for the renderer
  entry and 1,019,080/229,618 for the V2 field-session entry. The measured
  React profiles retain the repository's 5% budget guard.
- No approved reference or tolerance changed. Studio V2 configuration remains
  Milestone 7.

## 2026-09-04 — Field Rules V2 Milestone 5 Family Image framing

- Accepted ADR 0079. `TemplateFieldFamilyContentStateV3` keeps one shared
  replacement asset/default placement and sparse per-variant placement-only
  overrides. V2 content/saved records normalize once to V3; runtime and new
  saves do not maintain a V2 Family-content interpreter.
- Family Image controllers add `setVariantPlacement` and
  `resetVariantPlacement`. Shared placement edits preserve explicit overrides;
  shared asset replacement/reset clears them. Selected-variant authorization is
  enforced through the ordinary Core Image reducer.
- Effective placement is composed with the shared asset before the ordinary V2
  materializer. There is no Family renderer or asset fork. `editor-crop` uses
  the existing affine CROP owner, with centred cover-within-canonical adaptation
  for Square/Portrait/Landscape slot aspects.
- Structurally valid non-invertible persisted Family crops remain stored as
  Crop and keep export blocked. Any deterministic renderer preview fallback is
  visual only and never rewrites canonical state to Fill.
- Current-run pass evidence: package typechecks/builds, portable/full/strict
  realistic-ZIP tests, Stage 4A and routed browser scenarios, appearance
  baseline, public API contract, package boundaries, docs links, package
  archives, packed Core/external consumers, release contract, and curated
  bundle probes. Intentional Core declaration identity is 107,400 bytes /
  `c58082a…39f9c`. Curated bundle measurements remain within the recorded 5%
  budgets.
- Source evidence: exact-hash `deal-of-the-week-banner-crop-editable` is stable
  over two captures on Validate, Fields, editor, and PNG; its registered Crop
  region remains 0.19921875% different from the embedded source preview. The
  full 23-fixture run is stable. Guarded renderer/scene/settlement comparisons
  retain existing fail/unapproved classifications. The V1 replacement harness
  proves imported and first-field Fill/Fit/Fill plus PNG output, then times out
  at the pre-existing `package-editor-panel` lookup after persistence reload.
- No fidelity reference, scene snapshot, settlement snapshot, or tolerance was
  updated. A dedicated exporter-authored multi-aspect Family crop fixture and
  Studio crop UI remain deferred; this milestone does not claim those as
  source-certified.

## 2026-09-03 — Field Rules V2 Milestone 4 structural Boolean runtime (Result A)

- Accepted ADR 0078. The shared scene/layout pipeline now derives active,
  excluded-self, and excluded-ancestor participation from canonical visibility.
- Active FLOW children alone contribute Auto Layout gaps, HUG/FILL sizing, and
  alignment. Empty HUG containers resolve to padding-only size.
- Excluded subtrees return before React hooks/content mount and do not publish
  intrinsic/image/clip evidence, preload media, apply masks, or contribute
  active export-safety aggregation. Descendant canonical content is untouched.
- Renderer measurements and settlements carry both repeatable semantic revision
  and a renderer-local monotonic publication generation. Delayed first-true work
  is rejected after true/false/true even when the semantic hash repeats. Initial
  all-visible generation-zero identities remain unchanged.
- Browser V2 and Family sessions keep their existing monotonic content and
  materialization revision guards. Tests cover false persistence and a distinct
  Family variant target using shared false content.
- Current-run checks: all package typechecks/builds, public API and boundary
  checks, `pnpm test:portable`, `pnpm test`, `runtime-routing:stage4a`, routing
  browser scenarios, exact-font, text-trim, docs links, and appearance baseline
  pass. The pre-source 22-fixture baseline and the Boolean fixture's focused
  two-pass four-surface capture are repeat-stable. Guarded
  renderer/scene/settlement comparison retains the repository's documented
  fail/unapproved states; no update command ran. Mask and primitive browser
  scenarios timed out at their existing `package-editor-panel` harness/UI wait,
  before a Boolean assertion.
- The existing 2.48 MB V2 session observation completed 20 accepted mutations
  in 281.30 ms (14.07 ms average) with exactly one materialization per accepted
  mutation. This is local evidence, not a benchmark budget. Structural routing
  remains one active-graph recomputation and hidden React subtrees avoid their
  former descendant measurement/preload work.
- Registered source authority:
  `Exporter update testing/template-package-deal-of-the-week-post-boolean-v0.6.1.zip`,
  2,624,203 bytes, ZIP `47a109f…b6ac`, exporter 0.6.1, root `859:29`.
  `showHeadline` controls FLOW node `859:35` under vertical HUG parent `859:30`;
  false shrinks that parent from 375.69 to 112 logical px and moves/expands the
  following FILL node. `showEnddate` controls FLOW node `859:48` in the fixed
  1000×32 `SPACE_BETWEEN` row `859:32`; false removes its subtree without
  inventing row resizing or moving the start-aligned logo.
- Focused source run: `pnpm runtime-routing:boolean`. Default Validate/Fields,
  editor true/false/reset, resize-hidden-show, and real PNG exports pass. Both
  false states remove exact subtrees (3 headline nodes, 2 end-date nodes).
  Default/reset PNGs are byte-identical. The surviving header after headline
  exclusion and surviving logo after end-date exclusion each compare at zero
  changed pixels. Source comparison records 0.501254% changed pixels with the
  existing Rethink Sans replacement. No reference or tolerance update command
  ran.
- Source-certified subset: structural exclusion for the authentic vertical
  HUG/FILL chain and fixed horizontal `SPACE_BETWEEN` row. Portable evidence
  covers broader existing non-wrapping FIXED/HUG/FILL, padding, gaps, and
  MIN/CENTER/MAX/STRETCH paths. Wrapping, circular FILL-in-HUG, general
  `SPACE_BETWEEN` settlement authority, advanced masks/transforms, Image Crop,
  Textarea line measurement, and Studio V2 authoring remain deferred.

## 2026-09-02 — Field Rules V2 Milestone 3 Browser integration

### Result

- Added `createTemplateSessionV2()` with immutable base `TemplatePackageV2`,
  one canonical `TemplateFieldContentStateV1`, one materialization per accepted
  typed edit, ordered host-safe controller snapshots, and a derived-only V1
  renderer projection that is never read back or persisted.
- Added discriminated controllers for Text, Textarea, Image, Color, Number,
  Date, and Boolean. Core remains the mutation/validation authority; Browser
  owns only asset ingestion, object URLs, readiness composition, persistence,
  async revision safety, and disposal.
- Added exact revision-bound pending/valid/invalid Textarea evidence interfaces.
  Required `maxLines` evidence blocks export while pending or invalid without
  delaying or rejecting the canonical edit. No line measurement was added.
- Added explicit `saved-template-session-v2` and
  `saved-template-field-family-v2` records. They persist configured packages,
  canonical content, and content-addressed assets, never a materialized working
  package. V2-only in-memory/IndexedDB adapters share asset stores without
  adding V2 validation code to legacy session bundles.
- Added review-first ID-based single-template reimport. Compatible binding
  targets may move while configuration, stable choices, `controlRole`, content,
  and order survive; additions use imported defaults, removals require archive
  or discard review, and type/binding-kind changes block.
- Added `TemplateFieldFamilyV2` with common configuration, sparse scalar
  overrides, atomic collection replacement/clear, strict common/variant order,
  per-variant imported bindings/defaults, provenance, and one shared canonical
  content state. Variant switching preserves invalid content and uses the
  ordinary Core materializer rather than a family renderer.
- Added React provider/ownership/snapshot/controller hooks and packed-consumer
  coverage. `controlRole` remains inert data for host fallback composition.
- The existing V1 Studio session remains isolated until the Studio V2 consumer
  milestone. It is not synchronized with V2 and V1 saved working packages are
  not guessed into canonical content.

### Current-run evidence

- `pnpm packages:typecheck`, `pnpm exec tsc -b --pretty false`: pass.
- `pnpm packages:build` and `pnpm build`: pass, including the Studio production
  build. Vite retains its existing large-chunk warning.
- `pnpm example:build`: pass for the minimal renderer, template editor, and
  Template Family integration examples; Vite retains the same size warnings.
- `pnpm test:portable`, `pnpm test`, and `pnpm test:realistic-zip`: pass; the
  strict realistic lifecycle used the 2,500,574-byte package at SHA-256
  `96866712f10271407a182d3a905e112b2eb1b9170257c4d8fe6d05c9a7311b05`.
- `pnpm api:contract`, `pnpm boundaries:check`, `pnpm release:contract`, and
  `pnpm docs:verify`: pass. The public API baseline now records prior M1/M2
  contracts, the known carried-forward `SavedTemplateFamilyWriteOptions`, and
  intentional M3 Browser/Family/React additions; no unclassified drift remains.
- `pnpm packages:pack:check`: pass for Core 778,297 bytes, Browser 460,064
  bytes, and React 258,860 bytes.
- `pnpm packed-core-node:verify`: pass in an isolated DOM-free consumer.
- `pnpm packed-consumer:verify`: pass; the real tarball consumer now compiles
  V2 controller enumeration and typed mutation and bundles to 1,130,060 bytes /
  312,051 gzip bytes.
- `pnpm curated-bundles:verify`: pass. The first run exposed a 231,960-byte
  legacy Browser regression caused by V2 methods on legacy repository classes;
  dedicated V2 persistence adapters removed that coupling. Existing legacy
  profiles remain under their prior ceilings. New measured profiles are
  Browser V2 697,273 / 149,175 and React V2 977,489 / 220,975 bytes/gzip.
  Core Family's additive V2 resolver moved its measured baseline to 42,808 /
  10,854 bytes/gzip with the ordinary 5% guard retained.
- The final 20-mutation probe over a 2,476,585-byte package observed 317.45 ms
  total, 15.87 ms per accepted mutation, content revision 20, and exactly one
  materialization per accepted mutation. This is Node evidence, not a browser
  frame-time guarantee.
- `git diff --check`: pass.

No fidelity, scene, settlement, or reference-update command ran because this
milestone changes no renderer behavior. Boolean structural reflow, renderer
production of visual-line evidence, Crop renderer fidelity, and Studio Field
Configuration V2 remain Milestones 4–7.

## 2026-09-02 — Field Rules V2 Milestone 2 Core semantic kernel

### Result

- Accepted ADR 0076 and documented the semantic-kernel ownership boundary.
- Added one discriminated, package-aware validator for all seven V2 fields,
  including canonical parsing, grapheme limits, warnings versus blockers,
  finite Number ranges/step, Gregorian Date validation, opaque Color
  normalization, authorized Image placement/Crop validation, and Boolean.
- Added one immutable, revisioned, sparse canonical content reducer. Typed
  set/choice/image/reset helpers dispatch through it; rejected mutations do not
  advance state, and reset removes an override at a new revision.
- Added stable suggested/restricted choice selection with optional
  `selectedChoiceId` provenance beside the canonical value.
- Added one pure materializer from V2 base package plus canonical state to a
  cloned working V2 package. Number/Date formatting, exact indexed Color RGB,
  Image replacement state, and Boolean visibility never read back renderer
  properties.
- Added ordered safe host field descriptors that omit binding and source
  provenance rather than duplicating static field capability.
- Preserved Textarea `maxLines` as a pending blocking export requirement without
  adding DOM measurement or rejecting committed editable content.
- Preserved the existing V1 production session, persistence, Family, React,
  renderer, and Studio paths for the Milestone 3 coherent integration.

### Current-run evidence

- `pnpm --filter @sleinity/template-core typecheck`: pass.
- `pnpm packages:typecheck`: pass for Core, Browser, and React.
- `pnpm test:portable`: pass.
- `pnpm test`: pass against the current realistic ZIP.
- `pnpm packages:build`: pass.
- `pnpm boundaries:check`: pass.
- `pnpm packages:pack:check`: pass for all three SDK archives.
- `pnpm packed-core-node:verify`: pass in an isolated DOM-free consumer; the
  sandbox attempt could not resolve npm and the approved network retry passed.
- A direct 20-iteration materialization probe over the 2,500,574-byte realistic
  ZIP's normalized five-field package completed in 148.25 ms total in the
  current Node runtime (about 7.41 ms per pure materialization). This is local
  performance evidence, not a browser responsiveness claim.
- `pnpm docs:verify`: pass for 166 Markdown files and 357 local links.
- `git diff --check`: pass.
- Core declaration baseline: 106,800 bytes / SHA-256
  `d9bd14e9a6a737e61949083455374168d4f1c67a815bda3e9e72122dcbefbb5f`.

`pnpm api:contract` remains red for only the known unrelated dirty browser
exports: `SavedTemplateFamilyWriteOptions` in `@sleinity/template-browser` root
and `./persistence`. The intentional additive Core V2 symbol inventory matches
the updated contract exactly; an entry-by-entry comparison found no other add
or remove.

No fidelity baseline/comparison, scene/settlement comparison, or reference
update command ran because this milestone changes no renderer behavior.

### Next boundary

Milestone 3 may integrate typed controllers, production session state,
persistence/reimport, and Template Families with the Core reducer and
materializer. It must replace V1 mutation/readback coherently rather than
synchronizing two authorities. Boolean structural layout, image crop rendering,
rendered Textarea line evidence, and Studio configuration remain Milestones
4–7.

## 2026-09-01 — Field Rules V2 Milestone 1 architecture freeze

### Result

- Accepted ADR 0075 and added the Field Rules V2 migration map and fixture plan.
- Added strict `TemplatePackageV2` types and JSON schema for seven discriminated
  fields, typed bindings, optional labels/control roles, stable choices,
  portable editor order, opaque Color, and designer-authorized image placement.
- Added the separately versioned canonical content-state schema and structural
  validator without exposing raw state as a mutation authority.
- Added an explicit V1-to-V2 normalizer/parser with provenance-aware diagnostics.
  Color bindings resolve during import and ambiguous marker-only paint targets
  block publication.
- Added strict V2 semantic validation for field order, binding identity,
  choices, thresholds, calendar dates, image policy, and canonical Color.
- Added reimport order repair and atomic Template Family configuration
  replacement/clear helpers.
- Preserved the existing V1 runtime until the Milestone 2 semantic-kernel
  cutover; no renderer or persistence code interprets the new contract yet.

### Current-run evidence

- `pnpm --filter @sleinity/template-core typecheck`: pass with the bundled Node
  runtime on `PATH`.
- `pnpm test:portable`: pass, including the V2 descriptor/marker normalization,
  exact and ambiguous Color target, imported-crop rejection, order, choices,
  opaque-alpha boundary, V1 source parser, reimport-order, and atomic family
  override scenarios.
- `pnpm test`: pass against the current realistic ZIP.
- `pnpm packages:typecheck`: pass.
- `pnpm packages:build`: pass.
- `pnpm boundaries:check`: pass against the updated intentional declaration
  baseline.
- `pnpm packed-core-node:verify`: pass in an isolated DOM-free consumer (the
  sandboxed attempt could not resolve npm; the approved network retry passed).
- `pnpm docs:verify`: pass.
- Both new schema documents parse successfully with `jq`; `git diff --check`
  passes.
- The isolated intended Core declaration baseline is 98,784 bytes / SHA-256
  `d408f2abce9b65e996d9d835014b112093294e02976db8afb951ed45bf2b231d`.

The complete `pnpm api:contract` check remains red only because the pre-existing
dirty browser persistence work exports `SavedTemplateFamilyWriteOptions` from
two entries without updating its user-owned contract. The generated Core V2
symbol set matches this milestone's updated API contract; that unrelated export
was not absorbed here.

No fidelity baseline, scene snapshot, settlement snapshot, or approved-reference
update command was run because this milestone changes no renderer behavior.

### Next boundary

Milestone 2 must replace—not wrap—the current V1 field mutation/readback path
with the typed semantic kernel, canonical content state, controllers, and
one-way materializer before production import/session/render entry points switch
to V2. Do not make the current V1 renderer a second V2 field interpreter.

## 2026-09-01 — Deal of the Week typography fidelity follow-up

### Result

- Classified the typography residual as `FONT BINARY / FACE MISMATCH`.
- Confirmed that exporter-declared style ranges and font requirements survive
  source load, normalization, canonical scene projection, and resolved text
  selection unchanged.
- Confirmed that the package contains no exact font binary identity. The
  fidelity harness uses the Studio application's Rethink Sans replacement; the
  resolved tree correctly reports the managed face missing.
- Located the first numeric divergence at browser glyph measurement, where the
  replacement face has slightly different advances and cap/baseline metrics.
  Source bounds remain intact, no line wraps change, and settlement does not
  introduce a competing geometry decision.
- Made no production, schema, public API, importer-boundary, fixture, tolerance,
  or approved-reference change.

### Current-run evidence

Run `deal-typography-audit-default` is repeat-stable on Validate, Fields,
editor, and PNG export. Its PNG retains the previously reported 10,493 changed
pixels (0.506028%) against the embedded preview. Region isolation attributes
937 pixels to the four text boxes; 9,556 changed pixels lie outside those boxes
and are predominantly image/vector raster differences, not typography.

Scene run `deal-typography-audit-scene` is valid for all 19 nodes. Settlement
run `deal-typography-audit-settlement` preserves the compatibility-owned source
geometry and records replacement-face browser measurements. The measured widths
for `800:170`, `800:173`, and `734:76` are 398.8125, 479.9843, and 160.5937
pixels against source widths 400, 482, and 162. Node `734:79` remains 1000
pixels wide and measures 103.6874 pixels high against the 104-pixel source box.
All four remain single-line.

The active application variable face is SHA-256 `c7002241…f3347`; no evidence
proves it is the binary used by Figma. A separate repository static SemiBold
face exists at `523d8be1…e2be`, but it is likewise not source-identity evidence
and was not substituted as an invented exact face. Measurement telemetry's
family/style/weight-based `exact` label is not treated as a managed-font or
binary-identity claim; resolved font status and hash-gated evidence remain the
authority.

### Next boundary

No renderer or layout correction is recommended. Exact source fidelity requires
the actual Figma font binary to enter the existing managed-font linking and
private-family activation workflow. The non-text image/vector residual belongs
to separate owning milestones. Do not compensate for either limitation with
text offsets, altered line-height/letter-spacing semantics, tolerance changes,
or reference promotion.

## 2026-08-31 — Figma exporter 0.6.1 downstream alignment

### Result

- Added ADR 0074's renderer-internal native canonical SOLID evidence for the
  explicitly supported Figma exporter `0.6.1` source representation.
- Reused that evidence in the existing ordered-SOLID and bounded
  SOLID-then-linear-gradient capability resolvers. The existing SVG owner was
  already complete; no renderer implementation change was needed.
- Preserved the exporter `0.6.0` repair adapter and its
  `solid-paint-source-v1` evidence, exact gradient conflict comparison, strict
  canonical validation, source order, fallback boundaries, and public SDK.
- Registered the exact 0.6.1 SOLID, gradient/mixed, and Deal of the Week ZIPs as
  exploratory source-evidence fixtures without promoting a reference.
- Confirmed explicit font requirements bypass inference, canonical style ranges
  survive unchanged, and `extensions.figma.textStyleSegments` remains
  provenance-only.

### Verification boundary

Focused unit, TypeScript, package/Studio build, diagnostic ZIP, strict realistic
ZIP, appearance, paint source-evidence, performance, exact-font, and
source-authoritative font checks pass. Run `exporter-061-alignment-all` was
repeat-stable for all 22 fixtures on Validate, Fields, editor, and PNG. Final
run `exporter-061-corrected-source-gate` is stable on all four affected
surfaces. Corrected ZIP `e55ae505…fe8b` has exact canonical/raw SOLID RGB;
mixed nodes `811:459` and `811:460` select `ordered-normal-paint-svg` with
native support and no fallback. Its PNG is pixel-exact against the embedded
preview.

The Deal package preserves four canonical ranges, four rich Figma segment
records, and its explicit Rethink Sans requirement without inference. Browser
surfaces load the harness's application replacement while resolved managed-font
status remains missing; its PNG has 10,493 differing pixels (0.506028%) against
the embedded preview. Persistence reload currently fails after reload for both
new and historical control fixtures in the unrelated pre-existing dirty Studio
worktree; offline restoration is therefore not claimed. Guarded
renderer/scene/settlement comparisons retain documented historical or
unapproved failures, and the three new fixtures remain unapproved. No update or
promotion command ran.

### Next boundary

Treat Deal source-raster closure and Studio reload restoration as separate
follow-up work under their owning milestones. Do not weaken font identity,
gradient conflict, validation, or capability gates to close either result.

## 2026-08-04 — SDK 0.7.0 published stable release

### Result

- Froze the existing core/browser/React `0.7.0` exports, including
  `@sleinity/template-react/editor`, without adding another public capability.
- Added one checked entry-point inventory for package exports, Studio source
  aliases, API classification, build/archive validation and internal-entry
  protection.
- Corrected Studio importer source parity and removed React implementation
  self-imports that could resolve through an installed or stale package build.
- Added archive bundle probes for five representative adoption profiles and a
  local verification handoff generator with checksums.
- Replaced the pre-release first-host gate and duplicated general Lovable flow
  with one installation authority, provider-neutral agent tracks and a focused
  in-place SDK 0.2→0.7 Lovable handoff.
- Preserved broad roots, compatibility forwarders, renderer ownership, schemas,
  fixtures and approved evidence.
- Published the fixed train from annotated tag `sdk-v0.7.0` at merge commit
  `b19d0e3` and created the public registry-derived
  [GitHub Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.7.0).

### Verification boundary

Current-run portable CI, archive/API/release/docs/boundary contracts, package,
Studio and example builds, npm/pnpm vendored consumers, realistic ZIP tests,
session and Studio browser smokes and packed template-editor acceptance pass.
The packed acceptance covers normal/restricted CSP and reports no unexpected
network requests, downloads or console errors.

Published archives are 588,594 / 334,134 / 246,857 bytes for core/browser/React.
Their registry-derived SHA-256 values are
`431011bfb0160f416d62ecf5ef49b0338d0cc9dc81819c251ac6615f052d462d`,
`446e8f6745b1ab5fe328bf9a9f434f3173e5a63e26fa583d85fe690102202bac`, and
`ef883f46fbc51e445a79ba2004daa645027f0365e9d61b88d914c1e176466063`.
Curated core, browser, React renderer, React importer and React editor bundle
probes pass within their recorded initial baselines.

Renderer run `2026-08-04T16-09-07-981Z` is repeat-stable. Comparison
`2026-08-04T16-09-54-633Z` retains 31 approved passes, 17 documented
historical/environment-sensitive differences and 28 unapproved surfaces. Scene
retains four historical differences and 15 unapproved fixtures; settlement
retains its documented matrix. Appearance, routing, exact-font, text-trim,
mask/primitive browser and current source-evidence gates pass. The historical
`milestone-7-2-compatibility-before` candidate is absent, so the stroke
before/after source-evidence script is not claimed. No fixture, schema,
tolerance, reference update or promotion command ran.

### Published result

PR 18 and workflow run `30933771024` passed. The tag-only workflow published
all three packages, redownloaded registry archives, repeated core, secret-free
npm/pnpm and packed browser acceptance, verified public repository visibility
and uploaded the complete handoff. Independently downloaded Release assets pass
`SHA256SUMS` and `CORE-SHA256SUMS`. The first SDK 0.2→0.7 host migration is now
post-release implementation work; only a genuine SDK compatibility defect
should produce a fixed-train 0.7.1 patch.

## 2026-08-04 — SDK 0.7.0 headless host-editor integration

### Result

- Added the curated `@sleinity/template-react/editor` entry with a responsive,
  session-bound viewport, revision-safe identity/capture handle, ordered
  editable-field controllers and one deduplicated diagnostic projection.
- Reused the same viewport inside `TemplateImportWizardPreview` and removed the
  standalone reference's custom fitting, field-value and diagnostic glue.
- Preserved host ownership of forms, image preparation, navigation, storage,
  crop/AI workflows and publishing.
- Stabilized controller identity across readiness publications that do not
  change the session revision.

### Verification boundary

Portable tests, root/package TypeScript, all builds/declarations,
API/release/docs/boundary checks, archive inspection, the isolated curated-entry
consumer and packed generic-editor browser acceptance pass. The browser flow
proves shared responsive fitting, current-revision identity/capture, plural and
singular field parity, diagnostics, confirmation/reopening, host text/image
editing, Fill/Fit/reset, offline drafts, StrictMode, restricted CSP and zero
external SDK requests.

Core declarations remain 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Archives are 588,525 / 334,022 / 245,268 bytes for core/browser/React; the
isolated consumer is 893,788 / 261,806 gzip bytes. The generic example is
911.17 / 266.41 gzip kB and Studio is 1,000.85 / 290.99 gzip kB.

Source-authoritative font evidence and all 19 appearance projections are
stable. Renderer comparison `2026-08-04T14-21-58-135Z` retains 31 approved
passes, 17 historical/environment-sensitive differences and 28 unapproved
surfaces. Scene retains four historical and 15 unapproved states; settlement
retains its documented matrix. Approved renderer, scene and settlement
identities remain
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
`b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No approved evidence or guarded policy changed.

The packed browser acceptance passed after controller identity was stabilized.
The final stale renderer/asset callback guard then passed React typecheck, build
and archive inspection. A repeated clean-install browser run was blocked before
execution by npm-registry `ENOTFOUND`; it is recorded as an environment failure,
not a product pass or failure.

### Next boundary

Use these primitives in the first external 0.7 integration. Add autosave or
image-file preparation bindings only if the reference, Studio and that host
demonstrate the same remaining boilerplate.

## 2026-08-04 — SDK 0.6.0 release closeout

### Result

- Froze the fixed core/browser/React `0.6.0` contract after manual Studio and
  standalone-wizard review.
- Completed the host-neutral reference flow from dashboard through wizard
  confirmation to fresh-session reopening, host-owned editing, persistence and
  revision-safe PNG capture.
- Added a focused 0.2.2 migration path and an evidence gate for future
  host-editor primitives without exporting additional Studio workflow.
- Preserved exact-font authority, structured validation, atomic field rules,
  renderer output, package schemas, persistence records and public APIs.

### Verification boundary

Current-run portable tests, root/package TypeScript, all builds/declarations,
API/release/docs/boundary checks, archives, DOM-free core, packed consumers,
generic editor acceptance, session/Studio browser smokes, exact-font evidence,
source-authoritative capture and all 19 appearance projections pass. The
generic acceptance proves supported and restricted CSP, invalid/valid ZIP,
font rejection/upload/reuse, confirmation, fresh-session reopening, host
editing, offline drafts, stale-export rejection, silent PNG and zero external
SDK requests.

Core declarations remain 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local archives are 588,525 / 334,193 / 235,621 bytes for core/browser/React;
the packed consumer is 882,405 / 258,577 gzip bytes.

Renderer comparison `2026-08-04T12-52-50-241Z` reproduces the documented 31
approved passes, 17 historical/environment-sensitive differences and 28
unapproved surfaces. Scene retains four historical and 15 unapproved states;
settlement retains its documented matrix. Approved renderer, scene and
settlement identities remain
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
`b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No approved evidence or guarded policy changed.

### Next boundary

Publish through the reviewed `sdk-v0.6.0` tag workflow and verify the
registry-derived archives in authenticated and secret-free consumers. After a
real external migration, extract only recurring host boilerplate also present
in Studio and the reference; the responsive session viewport is the strongest
current candidate.

## 2026-08-03 — SDK 0.6.0 RC2 import experience and field rules

### Result

- Corrected product readiness for zero-routed compatibility templates without
  changing routing, rendering, DOM output, capture, or pixels.
- Guaranteed actionable structured evidence for blocked render validation.
- Fitted the complete intrinsic canvas into a responsive, no-scroll preview
  frame with protected padding.
- Removed emoji-fallback setup copy while retaining internal evidence.
- Kept Studio's established validation workbench and native field-card
  presentation; the generic validation duplication was removed.
- Added a compact actionable SDK validation projection and a host-neutral field
  editor limited to ordering plus meaningful text, textarea and image rules.
- Added revision-bound session font-preparation evidence so exact uploaded faces
  activate in the same preview and readiness path used by the editor.

### Review boundary

Publication is intentionally held until the detached Studio and standalone SDK
wizard pass manual review. Cross-device template transport remains host-owned
and outside this milestone.

### Verification boundary

Portable tests, direct root/core/browser/React/Studio typechecks, package and
Studio/example builds, API/release/docs/boundary contracts, and archive
inspection pass. Manual browser review passed the real deal-of-the-week banner
through package validation, exact Rethink Sans upload, current-revision Render
Validation, meaningful Field Rules, and Studio's native Validate/Fields views.
The preview uses the private exact runtime family, fits completely with protected
padding, and has no scrollbars or emoji setup copy. Invalid field drafts remain
separate from the last valid package. The packed generic browser acceptance
command did not complete in this run, so it remains a release-gate rerun rather
than a claimed pass.

Core root declarations remain 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local core/browser/React archives are 588,525 / 333,849 / 223,413 bytes. Studio
is 1,000.83 / 290.99 gzip kB and the generic example is 892.71 / 261.29 gzip
kB.

Appearance remains deterministic for 19 fixtures. Renderer run
`sdk-0-6-rc2-verification` is repeat-stable and retains the documented approved,
historical/environment-sensitive and unapproved states. Fresh scene and
settlement comparisons retain their documented historical/unapproved matrices.
Approved renderer, scene, and settlement identities remain
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
`b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No reference, fixture, schema, promotion, or tolerance update ran.

## 2026-08-02 — Milestone 2G Studio contract adoption / SDK 0.5.0

### Result

- Migrated ordinary Studio production and server imports to supported core,
  browser, React and advanced-inspection package entries.
- Added focused core editor/assets/fonts/motion/inspection, browser
  assets/fonts/persistence/capture/enrichment, and React inspection entries.
- Moved portable appearance/settlement inspection ownership to core and
  renderer quality/coverage/risk ownership to React.
- Moved layout debugging, stress reports, visual comparison, fidelity issue
  packets and development harness adapters into Studio fidelity ownership.
- Preserved every 0.4.2 public export and all Studio/rendering behavior.

### Verification boundary

Package/root TypeScript, portable tests, builds, API/release/docs contracts,
boundaries, archives, DOM-free core, packed consumer, Studio/session browser
smokes and packed generic editor acceptance pass. Core root declarations remain
87,431 bytes / `7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Archives are core 583,847, browser 323,857 and React 208,261 bytes; the growth
contains opt-in entries while the ordinary packed consumer stays flat at
856,967 / 251,414 gzip bytes. Studio stays flat at 1,001.01 / 291.02 gzip kB.

Appearance is deterministic for 19 fixtures. Renderer comparison
`2026-08-02T16-15-48-741Z` retains the prior 31 approved passes, 17 historical
differences and 28 unapproved surfaces. Scene retains four historical and 15
unapproved states; settlement retains its documented states. Approved
renderer, scene and settlement identities remain
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
`b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No reference, fixture, schema, promotion or tolerance update ran.

### Next boundary

SDK 0.6.0 may design a portable cross-device confirmed-template artifact with
managed font and asset evidence. That design must not blur the current host
persistence and renderer-authority boundaries.

## 2026-08-02 — Milestone 2F physical React-renderer ownership

### Result

- Moved canonical-scene ownership into `packages/template-core/src/scene`.
- Moved the production renderer, previews, inspection viewport, renderer
  adapters and renderer-specific runtime routing into `template-react`.
- Replaced consumed root scene/render/routing paths with checked behavior-free
  forwarders; retained fidelity-only `runtime-routing/devHarness` outside the
  production package.
- Added unsupported fixed-train internal sibling seams for repository
  composition while preserving every recorded 0.4.1 public entry and symbol.
- Externalized core/browser implementation from React and extended Studio's
  Tailwind scan to the new renderer owner, preserving its pixels and bundle.
- Corrected the browser-scenario harness to select a current complete fidelity
  baseline instead of a retired hard-coded candidate path.
- Published the fixed train from `sdk-v0.4.2`; the public
  [Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.4.2)
  contains the registry-derived archives, checksums and host-neutral handoffs.

### Verification boundary

Package/root TypeScript, portable tests, all builds, declarations, public API,
boundaries, release policy, archives, packed core/React consumers, session and
Studio browser smokes, generic-editor acceptance, routing stage 4a, exact-font,
text-trim and nine browser scenarios pass. Core declarations remain 87,431
bytes / `7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Core/browser/React archives are 347,076 / 209,476 / 153,598 bytes. The React
archive is 49.4% smaller and the isolated consumer is 856,967 / 251,434 gzip
bytes. Studio stays flat at 1,001.02 / 291.15 gzip kB.
Registry-derived archive SHA-256 values are core
`7bb364bec2630969bd5ac4f9f8e8e52b88f90ce99694ce10040489a4159ff74f`,
browser
`7c22e32cfcb9851b71af05768f857bf95705071c63daa9b5339cc258719c1fca`,
and React
`ced85dd35631f0347b30882c7c1105b166b7428205385c4d4b814b519d863408`.
The tag workflow passed portable CI, packed browser acceptance, authenticated
publication, secret-free npm/pnpm consumers and public Release creation. A
separate anonymous download passed checksums and generic-editor acceptance.

Appearance is deterministic for 19 fixtures. Renderer baseline
`2026-08-02T13-39-40-949Z` and comparison
`2026-08-02T13-40-25-642Z` reproduce the prior 31 approved passes, 17
historical/environment-sensitive differences and 28 unapproved surfaces.
Scene retains 4 historical and 15 unapproved states; settlement retains its
documented states. Approved renderer, scene and settlement identities remain
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
`b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No approved evidence or guarded policy changed.

### Next boundary

Migrate ordinary Studio production imports to curated package entries and
define explicit advanced inspection entries for remaining fidelity consumers.
Portable cross-device confirmed-template artifacts remain SDK 0.5 design work.

## 2026-07-30 — Milestone 2E physical browser-runtime ownership

### Result

- Moved the complete browser runtime into `packages/template-browser/src`:
  assets, exact fonts, browser storage, template/draft persistence, import,
  wizard/confirmation, sessions, readiness, enrichment and PNG capture.
- Added one internal content-addressed binary/storage owner shared by font and
  template persistence, removing the previous cycle.
- Retained Studio, renderer and fidelity compatibility through checked
  behavior-free root forwarders. Browser production source imports no root,
  React, Studio or renderer implementation.
- Externalized core from the browser build and core/browser from the React
  build while preserving every 0.4 root and curated public symbol.
- Moved pure browser runtime tests beside the package and strengthened archive,
  ownership, duplicate-owner, cycle and dependency checks.
- Published the fixed train from `sdk-v0.4.1`; the public
  [Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.4.1)
  contains registry-derived archives, checksums and host-neutral handoffs.
- Closed the concurrent Changesets `prepack` declaration race found by the
  first tag run. The corrected run published browser, retained fixed package
  tags and completed the Release without runtime or archive-content changes.

### Verification boundary

Portable CI, root/package TypeScript, all package/Studio/example builds,
declarations, API/export checks, boundaries, release policy, archive
inspection, DOM-free core, packed consumers, the session and Studio browser
smokes, and the packed generic editor pass. The local pnpm vendored runtime
consumer passes without credentials. The release workflow verifies both npm
and pnpm vendored consumers; the generic browser acceptance also passes
against anonymously downloaded public Release bytes.

Core declarations remain 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Archives are core 283,577, browser 209,477 and React 303,397 bytes, reducing the
browser archive by 47.8% from 0.4.0. Studio is 1,001.02 / 291.35 gzip kB
JavaScript; minimal and generic examples are 858.15 / 251.51 and 912.50 /
266.51 gzip kB; the packed consumer is 897,726 / 262,605 gzip bytes.
Registry-derived archive hashes are core
`1604c4923a6cba0ce039ad26b738b11fe4c755048a9c4d47cd08200f4bdf8654`,
browser
`cad8ab9e506973ad31926bdc9345640a7b6271de7f1c11c7d418b4274109d054`,
and React
`5169ee62db4ccde8437bae49f1d73915acbb4d8b2749d513a467260b734c3fe2`.

Appearance is valid/deterministic for all 19 fixtures. Renderer baseline
`2026-07-30T17-09-39-496Z`, exact-font evidence
`font-evidence-2026-07-30T17-12-09-413Z`, and source-authoritative baseline
`2026-07-30T17-12-16-183Z` are stable. Renderer comparison
`2026-07-30T17-10-29-068Z`, scene comparison
`scene-2026-07-30T17-12-05-022Z`, and settlement comparison
`settlement-2026-07-30T17-12-07-041Z` retain only the documented historical
and unapproved states. Approved identities remain renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No update, reference, fixture, schema, tolerance or promotion command ran.

### Next boundary

Move React renderer ownership into `template-react` under the existing
fidelity gate, then migrate ordinary Studio imports to curated package entry
points. Portable cross-device confirmed-template artifacts remain SDK 0.5
design work.

## 2026-07-30 — SDK 0.4.0 external-adoption contract hardening

### Result

- Added curated `template-browser/session`, `/importer`, and `/compatibility`
  entry points without removing broad root exports.
- Added structured runtime preflight, confirmation inspection, 0.4 SHA-256
  integrity evidence, supported 0.3 legacy loading, explicit local-font
  portability evidence, and atomic confirmation reopening.
- Added and enforced a machine-readable public API inventory plus migration,
  compatibility and troubleshooting guidance.
- Updated the generic host and release consumers to preflight, retain
  host-owned confirmation state, create a fresh session, inspect integrity and
  reopen atomically before host-owned editing.
- Made canonical AJV compilation lazy so restrictive CSP environments receive
  the stable `runtime.dynamic-code.unavailable` blocker rather than failing at
  module load. No validation result, schema, renderer, persistence record,
  editing or PNG behavior changed.

### Verification boundary

Portable tests, package/root TypeScript, all package builds/declarations,
Studio and example builds, API/export checks, boundaries, release policy,
archive inspection, DOM-free core, npm/pnpm packed consumers, session/Studio browser
smokes and the packed generic editor pass. The generic editor proves supported
and restricted CSP profiles, full wizard confirmation, fresh-session reopen,
host-owned edits, exact fonts, offline draft restoration, silent PNG,
disposal and zero external requests.

Core declarations remain 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local archives are core 283,577, browser 401,430 and React 303,406 bytes.
Studio is 1,000.89 / 291.48 gzip kB JavaScript; minimal and generic examples
are 846.43 / 248.93 and 903.04 / 264.80 gzip kB; the packed consumer is
885,908 / 260,129 gzip bytes.

Appearance is valid/deterministic for all 19 fixtures. Renderer baseline
`2026-07-30T14-56-21-866Z`, exact-font evidence
`font-evidence-2026-07-30T14-58-54-584Z`, and source-authoritative baseline
`2026-07-30T14-59-01-309Z` are stable. Full renderer
`2026-07-30T14-57-08-849Z`, scene
`scene-2026-07-30T14-58-50-470Z`, and settlement
`settlement-2026-07-30T14-58-52-279Z` comparisons retain only documented
historical/unapproved states. Approved identities remain renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No update, reference, fixture, schema, tolerance or promotion command ran.

### Next boundary

After external 0.4 acceptance, resume Milestone 2E browser-source ownership.
Portable cross-device confirmation artifacts remain a separate SDK 0.5
design milestone.

## 2026-07-30 — SDK 0.3.0 external shell composability and template reopening

### Result

- Added the `createTemplateImportWizard` headless browser controller with
  seven inspectable steps, subscriptions, restart/cancel/disposal and
  revision-safe stale-work rejection.
- Added structured import, exact-font and render-validation reports. Corrupt
  and otherwise blocked ZIP attempts now retain layered diagnostics while also
  exposing phase validation and a non-null compatibility validation result.
- Retained optional exact-font and post-confirmation persistence adapters.
  They are abortable and all returned data passes the
  existing SDK validators before state publication.
- Removed the unpublished wizard image-editor adapter and content-editing
  actions. The wizard configures image rules; external shells own content
  controls and submit final values through existing session mutation APIs.
- Added atomic `TemplateSession.loadTemplateState()` reopening with cloned,
  freshly validated baseline/working packages, identity checks, rebuilt
  resolved/editable state, new revisions, and stale-work rejection.
- Added React provider, snapshot hook and existing-renderer preview bridge plus
  a responsive optional default UI with drag/drop, seven steps, theming,
  class/action slots and an immutable host-neutral confirmation result.
- Preserved `TemplateImporterWizard` and its completion value as compatibility
  aliases, and preserved all 0.2.2 session, renderer, editing, persistence and
  PNG APIs.
- Updated the generic editor, packed consumer and documentation to use public
  RC3 entry points. No Studio, router, catalogue, cloud, publishing or product
  workflow moved into the SDK.

### Verification boundary

Portable tests, package/root/Studio typechecks, production builds,
documentation, package boundaries/archive inspection, DOM-free core, isolated
packed consumer, session/Studio smokes and the packed generic-editor Chromium
lifecycle pass for RC3. The packed browser run covers invalid/valid import,
exact-font upload/reuse, field rules, confirmation-to-dashboard, fresh
session hydration, host-owned preprocessing, downstream image mutation,
current render readiness, offline draft reload, silent PNG and disposal with
no external requests or console errors.

Core/browser/React published archives are 283,433 / 372,987 / 303,379 bytes.
Their registry-derived SHA-256 values are
`92183190066f93913d200714aecdf6515bbd8cf7b0e0169f719279e3f2f8656c`,
`a18235221191c1e5c6aa022d4e91e21026cf014075779f996bb57cf6e30ad236`
and
`8f8757d5371518aaff24d4c9c61e286fea18eb3b6d69e961aad04e5fc17e61f3`.
Core declarations remain 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Studio is 1,000.84 / 291.46 gzip kB JavaScript; minimal and generic editor
examples are 844.64 / 248.23 and 916.12 / 265.59 gzip kB. The isolated packed
consumer is 885,100 / 259,603 gzip bytes.

Appearance run `appearance-2026-07-30T12-10-06-005Z` is valid and
deterministic for all 19 fixtures. Renderer run
`2026-07-30T12-10-08-113Z` and source-authoritative run
`2026-07-30T12-10-55-869Z` are repeat-stable. Guarded renderer run
`2026-07-30T12-11-01-871Z`, scene run
`scene-2026-07-30T12-12-26-619Z` and settlement run
`settlement-2026-07-30T12-12-28-310Z` retain only documented historical or
unapproved states. Approved aggregates remain renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No update, promotion, fixture, schema, tolerance or approved-reference command
ran.

### Release boundary

The fixed train was published once from `sdk-v0.3.0`. The initial tag workflow
published all three packages successfully but withheld Release assets when a
duplicated PNG raster in the small npm lifecycle consumer did not settle on the
GitHub runner. PR #8 separated responsibilities: npm and pnpm consumers own
secret-free installation and session lifecycle, while the stronger packed
generic-editor test owns published-archive silent PNG acceptance. That test
remains required and passed.

The corrected manual workflow ran handoff-only from `main`; its publication job
was skipped. It reinstalled the published core package, downloaded all three
registry archives, passed npm and pnpm vendored consumers, passed the complete
packed generic editor, verified public distribution policy, and created the
public
[SDK 0.3.0 Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.3.0).
An independent anonymous download matched `SHA256SUMS` and repeated Dashboard
→ Wizard → Confirmation → fresh-session reopening, host-owned edits, exact
font and image paths, offline persistence, stale-export rejection, silent PNG,
disposal and zero external requests.

## 2026-07-29 — SDK 0.3.0 reusable template setup wizard

### Result

- Added the `@sleinity/template-react/importer` subpath with a complete,
  accessible and themeable `TemplateImporterWizard`.
- Kept setup ownership explicit: a host supplies `TemplateSessionV1`; the
  wizard does not dispose, save, publish, navigate or create product records.
- Added core-owned pure field-rule replacement, update and reordering, with
  current target/warning projection.
- Added browser-session working-package replacement and a shared exact-font
  preparation policy with validation, resolved-tree rebuilding, revision
  invalidation and stale-work rejection.
- Replaced candidate lists, open-font retrieval, compatible/replacement
  suggestions and fallback controls with one upload-only requirement card in
  Studio and the reusable wizard. Normal upright posture is verified but
  omitted from labels; exceptional italic/oblique, stretch and axis
  requirements remain visible.
- Exact upload requires one unambiguous family/PostScript, weight or
  variable-range, posture, stretch, axis and complete text-face glyph match.
  A shared deterministic coverage classifier delegates only explicit emoji
  presentation, ZWJ, skin-tone, flag and keycap sequences to the established
  device emoji fallback. Ordinary symbols and text characters remain strict.
  Stored exact faces are reused automatically, and an invalid replacement
  never removes the current valid link.
- Both font screens show the verified file and a neutral device-emoji note
  when that fallback applies. Genuine coverage failures identify the missing
  characters. The supplied Rethink Sans SemiBold binary verifies as exact for
  the real `Summer Sale ☀️` requirement. A current-run headless Studio
  reproduction with the supplied ZIP and font reports `Ready`, exact
  classification and enabled progression; the binary is
  `cc5cf4e24fef00ceb7546500d3f6ada6c0884ab1603d2f8608a80f811010b9b5`.
- Retired the Studio open-font client, resolution panel and
  `/api/template-package/resolve-open-font` endpoint. Historical fallback
  mutation is available only through the test-server fidelity harness and is
  absent from production bundles and package archives.
- Migrated the generic template-editor reference to the public wizard entry
  while preserving its downstream content editor, IndexedDB draft lifecycle
  and silent PNG capture.
- Advanced the fixed core/browser/React train to `0.3.0`; no fourth package,
  schema change, renderer behavior change or additional product workflow was
  introduced.

### Public setup contract

The supported setup path is:

1. create or receive a host-owned session, normally with
   `useTemplateSession()`;
2. render `TemplateImporterWizard` from
   `@sleinity/template-react/importer` and import its stylesheet;
3. let the wizard load the ZIP, prepare fonts, validate and configure field
   rules;
4. accept `onComplete` only when the current session revision has a ready render
   identity;
5. save, publish or navigate through host-owned services after completion.

The completion value contains the validated working package, current session
snapshot, source evidence, validation evidence and the current ready render
identity. Existing lower-level public APIs remain available.

### Current-run evidence

- Direct package and Studio TypeScript, portable tests, Studio/SDK/example
  builds, ownership checks, archive inspection, installed-core and packed
  consumers, browser-session and Studio smokes, and documentation checks pass.
- The packed generic-reference Chromium gate passes cancellation, invalid and
  valid ZIP import, corrupt-file rejection, exact upload, atomic replacement
  and persisted reuse, validation, field-rule editing, image defaults,
  current-revision completion, downstream text/image editing, Fill/Fit/reset,
  offline save/reload, stale-export rejection, silent PNG and permanent
  disposal. External runtime requests, browser downloads and console errors
  are zero.
- Core's declaration is 87,431 bytes /
  `7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
  Candidate core/browser/React archives are 283,433 / 347,441 / 304,595
  bytes. Studio is 1,000.84 / 291.46 gzip kB JavaScript and 68.26 / 12.12 gzip
  kB CSS; minimal and generic editor examples are 842.57 / 247.59 and 898.67 /
  260.76 gzip kB. The isolated packed consumer is 898,605 / 262,087 gzip
  bytes. The dedicated importer is 34.27 kB JavaScript / 7.20 kB gzip.
- Fresh renderer run `2026-07-29T18-55-30-592Z` is repeat-stable
  across all 19 fixtures and four surfaces. Source-authoritative run
  `2026-07-29T18-55-13-659Z` passes via the real upload UI. Guarded
  renderer comparison `2026-07-29T18-57-22-207Z`, scene and
  settlement runs retain their documented historical/environment-sensitive or
  unapproved states. The approved gradient/ordered-SOLID overlap remains clean
  except for the already reviewed Inspector-only paint-opacity difference. All
  19 appearance projections are valid and deterministic.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 /
  `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No update, promotion, fixture, schema, tolerance or approved-reference
  command ran.

### Release and next boundary

This is a locally verified release candidate, not yet a published release.
Review must precede the tag-only `sdk-v0.3.0` publication and the public
registry-derived archive handoff. After an external generic-host acceptance
test, the next physical platform milestone may migrate asset, font,
persistence and session implementation into `template-browser`; renderer and
Studio ownership remain separate.

## 2026-07-28 — SDK 0.2.2 generic template editor handoff

### Result

- Prepared the fixed package train at `0.2.2` without changing a runtime API,
  import contract, renderer, readiness rule, persistence record or PNG output.
- Replaced the active product-specific pilot policy with
  `sleinity-tools-only`, authorizing Sleinity-owned applications while package
  manifests remain `UNLICENSED`.
- Renamed the committed consumer and packed Chromium gate to a generic template
  editor reference with neutral component, storage, fixture, command and
  callback identities.
- Replaced active handoffs with platform-neutral SDK and core guides. Lovable
  Business remains a separate secret-free vendored installation recipe with
  sequential editor prompts.
- Updated release automation to generate `SDK-RUNTIME-HANDOFF.md`,
  `SDK-CORE-HANDOFF.md` and `LOVABLE-TEMPLATE-EDITOR-PROMPTS.md` and added a
  contract guard against retired product-specific naming.
- Preserved the immutable `sdk-v0.2.1` Release and its historical evidence.

### Verification boundary

Current-run `pnpm ci:portable` passes direct package/root checks, portable
tests, Studio and SDK builds, archive/boundary checks, installed-core and packed
consumers, documentation and both examples. The generic packed-reference
Chromium gate passes invalid/valid ZIPs, validation, diagnostics, text/image
editing, Fill/Fit/reset, offline save/reload, stale-export rejection, silent
PNG and permanent disposal with zero external requests, browser downloads or
console errors. The pnpm secret-free vendored consumer passes the runtime
lifecycle; npm verification remains a release-CI gate because this local
runtime has no npm executable.

Core/browser/React candidate archives are 279,287 / 334,484 / 277,566 bytes.
Packed output is 834,646 / 244,671 gzip bytes. Studio is 998.40 / 290.38 gzip
kB JavaScript and 68.52 / 12.20 gzip kB CSS; minimal and generic editor
examples are 827.45 / 242.56 and 863.21 / 250.22 gzip kB. Core's declaration
is still 86,272 bytes /
`e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.

Fresh renderer run `2026-07-28T15-09-16-072Z` is repeat-stable for all 19
fixtures and four surfaces. Appearance is valid and deterministic. The guarded
renderer, scene and settlement commands retain only their documented
historical/environment-sensitive or unapproved states. Approved aggregates
remain renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No update, promotion, fixture, schema or tolerance command ran.

### Release result

- PR [#5](https://github.com/Sleinity/template-tool/pull/5) passed both
  Portable CI jobs and squash-merged at reviewed `main` commit `d4dfb85`.
- Tag `sdk-v0.2.2` alone triggered workflow run 8. Both `publish` and `handoff`
  passed: direct published-core installation, registry archive download, npm
  and pnpm vendored consumers, the generic packed-reference browser gate,
  public visibility verification, checksums and Release upload.
- Registry-derived public archives are:
  - core, 279,287 bytes /
    `dec3f442f05392286e1b718114b31b700ffa64fb7f164bc74650db2c40512f6b`;
  - browser, 334,484 bytes /
    `afa917bfb547e6f051c8d7974e9a6ba2a2297587e45d8ade67cd3a64f839c569`;
  - React, 277,566 bytes /
    `fd3b32124267bee87f69e1eac7dcde5b60c82c818b1a03da39832f0f541fc918`.
- All Release archives and handoffs were downloaded anonymously. Both checksum
  manifests pass, and a second secret-free pnpm consumer plus generic
  packed-reference Chromium gate pass directly from those downloaded bytes.
- `sdk-v0.2.2` and the three package-version tags resolve to `d4dfb85`. The
  immutable 0.2.1 Release and historical evidence were not modified.

## 2026-07-28 — SDK 0.2.1 release closeout and Bas acceptance gate

### Result

- Published the fixed core/browser/React package train as `0.2.1` from reviewed
  `main` commit `b30a50d` and tag `sdk-v0.2.1`.
- Projected structured source/import diagnostics into blocked session snapshots,
  added opt-in silent PNG delivery and added StrictMode-safe React session
  ownership without changing importer, renderer, readiness or capture output.
- Completed the committed narrowcasting reference with visible validation
  evidence and an explicit browser-draft reload action.
- Added a packed-reference Chromium acceptance gate covering invalid/valid
  import, field and image editing, Fill/Fit/reset, offline save/reload,
  revision-safe silent PNG, stale-export rejection and permanent disposal.
- Added a compatibility contract covering runtime, CSP, storage, revisions,
  upgrades and licensing.
- Replaced the hard-coded three-package release orchestration with one validated
  runtime-package manifest. Pack, checksum, handoff and npm/pnpm verification
  derive their package set and fixed version from that manifest.
- Split release automation so only an exact fixed-version tag may publish.
  Manual dispatch can regenerate public handoff assets only from an
  already-published fixed train.
- Aligned distribution with the repository's confirmed public visibility:
  Release archives need no download token, GitHub npm installs remain
  authenticated, and `UNLICENSED` is documented as a separate adoption
  decision.

### Current-run evidence

- `pnpm ci:portable` passes package/root TypeScript, portable tests, Studio and
  SDK builds, documentation, ownership/archive checks, installed-core and
  packed consumers, plus both committed examples.
- Core/browser/React candidate archives are 279,287 / 334,486 / 277,566 bytes.
  Packed consumer output is 834,646 / 244,671 gzip bytes; minimal and
  narrowcasting examples are 827.45 / 242.56 and 863.21 / 250.24 gzip kB.
  Studio remains 998.40 / 290.38 gzip kB JavaScript and 68.52 / 12.20 gzip kB
  CSS.
- Both npm and pnpm secret-free archive consumers pass valid and invalid ZIPs,
  edit, stale-export rejection, IndexedDB save/reload, silent ready PNG export,
  offline reload and permanent unmount disposal. Runtime network requests and
  browser console errors are zero.
- The packed committed-reference browser gate passes the same candidate archive
  hashes and additionally proves validation presentation, image MIME rejection,
  Fill/Fit switching, explicit offline reload, no browser download and zero
  repository-relative/workspace imports.
- Fresh renderer run `2026-07-28T13-46-51-826Z` is repeat-stable for 19 fixtures
  across all four surfaces. Full renderer, scene and settlement guards retain
  only their documented historical/environment-sensitive or unapproved states;
  all 19 appearance projections are valid and deterministic.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No update, promotion, fixture, schema, tolerance or approved-reference command
  ran.

### Release result

- PR [#3](https://github.com/Sleinity/template-tool/pull/3) passed portable CI,
  packed-reference Chromium acceptance and protected-reference guarding before
  its squash merge.
- Tag `sdk-v0.2.1` alone executed publication. Workflow run 7 passed both
  `publish` and `handoff`; manual publication was not used.
- The registry-derived public archives are:
  - core, 279,287 bytes /
    `36c16c316ef32252e4b0878084aa3c0b0ff69c09afb0c3e0be64bf13d6e66916`;
  - browser, 334,486 bytes /
    `b9cf8f61ea784cc50fe6d9a312013060408b1408f1627efa0cd8706d712b4575`;
  - React, 277,568 bytes /
    `ed38f5d71ee6b59f2a5b9528f390a3c0173f464b264d3c4e3a9b375abfae1552`.
- Published-core installation, registry archive download, npm and pnpm
  secret-free consumers, the packed committed-reference gate, distribution
  visibility and public Release upload all pass in the tag workflow.
- All public assets were then downloaded anonymously, `SHA256SUMS` and
  `CORE-SHA256SUMS` passed, and the secret-free npm consumer repeated import,
  diagnostics, editing, stale-export rejection, persistence, PNG and offline
  reload without GitHub credentials.
- Core/browser/React package tags at `0.2.1` point to the same reviewed
  `b30a50d` commit. General adoption remains blocked by `UNLICENSED`; this
  Release authorizes the Bas narrowcasting pilot only.

## 2026-07-28 — SDK 0.2 Lovable runtime handoff

### Result

- Extended the private release from the core-only experiment to the complete
  fixed `0.2.0` core/browser/React runtime without rebuilding registry
  artifacts.
- Added a combined SHA-256 handoff, explicit npm/pnpm vendoring rules and
  sequential Lovable prompts that keep Bas's media storage, scheduling and
  playback outside Template Platform ownership.
- Added an isolated production browser consumer for preflight diagnostics,
  ZIP/session import, edit, stale-export rejection, browser persistence,
  render readiness, PNG export and offline reload.
- Documented the immutable 0.2.0 diagnostic seam: use the supported core
  importer as the malformed-ZIP preflight gate before passing valid bytes to
  `TemplateSession`.

### Current-run evidence

- Local registry-shaped archives install without GitHub credentials under npm
  and pnpm. pnpm uses explicit vendored overrides for the private transitive
  closure.
- Both consumer runs typecheck, build and pass the Chromium lifecycle with zero
  external runtime requests and no browser console errors.
- Archive inspection rejects Studio, workspace, credential, absolute-path and
  repository-relative import references.
- Documentation and release workflow verification run with the repository
  release gates before the private `sdk-v0.2.0` asset refresh.

### Compatibility

No package version, public API, importer normalization, renderer behavior,
persistence record, export output, fixture, tolerance or approved reference
changes. The runtime handoff consumes the already-published `0.2.0` archives;
Bas's screen/player receives only the exported media result.

## 2026-07-28 — SDK 0.2 core importer release readiness

### Result

- Versioned the existing fixed SDK train at `0.2.0` without changing importer
  or renderer behavior.
- Documented `importTemplatePackage(ArrayBuffer, sourceName?)` as the supported
  core-only ZIP importer. It needs no React peer, server route, runtime secret
  or importer-time browser/network service.
- Added a core `prepack` build, stricter archive contents and dependency checks,
  an actual published-registry consumer, and a secret-free vendored archive
  consumer.
- Extended the tag workflow to download the published core archive, generate
  its SHA-256 and Bas handoff, verify that exact artifact, and attach it to the
  private `sdk-v0.2.0` GitHub Release for Lovable Business.

### Current-run evidence

- `pnpm ci:portable` passes, including portable tests, repository/root/package
  TypeScript, Studio/SDK/minimal builds, boundaries, documentation, archive
  inspection and both existing isolated consumers. The first sandboxed
  temporary install failed on registry DNS; the identical gate passed with
  registry access.
- A local 0.2.0 archive passes the new secret-free Lovable-style React,
  TypeScript, valid-ZIP, invalid-ZIP and declaration verification. The
  authoritative published-registry and downloaded-artifact runs execute after
  tag publication.
- Core/browser/React archives are 279,286, 333,080 and 276,760 bytes. The
  packed consumer is 833,790 / 244,411 gzip bytes; the minimal consumer is
  826.54 / 242.27 gzip kB. Studio is 998.38 / 290.37 gzip kB JavaScript and
  68.52 / 12.20 gzip kB CSS.
- The core declaration remains 86,272 bytes /
  `e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
- Fresh renderer run `2026-07-28T10-00-02-265Z` is repeat-stable across 19
  fixtures and four surfaces. Renderer, scene and settlement comparisons retain
  their documented historical/environment-sensitive and unapproved states.
- Direct approved-byte aggregation remains renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.

### Release boundary

The `sdk-v0.2.0` tag is allowed only from the reviewed release commit. The
post-publish registry install, registry-derived archive hash, secret-free
vendored verification and private Release assets must all succeed before the
release is reported complete.

## 2026-07-23 — Template Platform Milestone 2D portable field editing ownership

### Result

- Moved the framework-neutral editor-session contract, effective-field
  discovery, immutable mutations, image replacement/reset, field constraints
  and measurement-result projection into `template-core`.
- Kept rendered line/fit measurement in the browser, moved field-label
  presentation into Studio and replaced retired root editor implementations
  with checked behavior-free forwarders.
- Preserved the complete SDK declaration at exactly 86,272 bytes /
  `e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
- Added package-owned field contract coverage and extended the installed core
  archive smoke through text, color, visibility, image and restore operations
  while rejecting DOM, CSS, storage, font and network globals.

### Current-run evidence

- Direct core/browser and root TypeScript, portable tests, repository audit,
  documentation, SDK/Studio/minimal builds, boundaries, archives, both
  isolated consumers, both browser smokes and all 19 appearance projections
  pass. The aggregate portable command's sandboxed dependency download was
  rerun successfully through the same isolated checks with network access.
- Core/browser/React JavaScript and declarations are 425.32/84.25,
  503.00/106.95 and 428.39/67.58 kB; archives are 278,164, 333,080 and
  276,760 bytes. Studio is 998.38/290.37 kB gzip JavaScript and 68.52/12.20
  kB CSS. Packed/minimal consumers remain 833,790/244,411 bytes and
  826.54/242.27 kB gzip.
- `milestone-2d-portable-field-editing` and its fresh-process comparison are
  repeat-stable. The guard retains 31 approved passes, 17 documented
  historical/environment-sensitive differences and 28 unapproved surfaces.
  Scene retains four historical differences/15 unapproved candidates;
  settlement retains its documented stable states.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.

### Next boundary

The next milestone may physically migrate browser assets, fonts, persistence
and session lifecycle into `template-browser`. Preserve file/decode and
revision-staleness guards as complete browser-owned lifecycles; keep React
rendering and Studio workflow outside that migration.

## 2026-07-22 — Template Platform Milestone 2C portable resolved/backend ownership

### Result

- Moved resolved graph construction, image placement, injected font readiness,
  backend decisions and the internal primitive-appearance closure into
  `template-core`; root compatibility paths are behavior-free forwarders.
- Preserved the complete SDK declaration at exactly 86,272 bytes /
  `e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
- Closed the 2B direct-typecheck gap, made package-owned tests execute
  explicitly, strengthened reverse-dependency checks, and extended the
  installed core archive smoke through resolved/backend/font-readiness APIs.
- Corrected the Ajv ESM entry used by the installed Node package; canonical
  validation behavior and declarations are unchanged.

### Current-run evidence

- Portable tests, root and package TypeScript, SDK/root/Studio/minimal builds,
  boundaries, archives, both packed consumers, both browser smokes,
  documentation and all 19 appearance projections pass.
- Core/browser/React JavaScript and declarations are 425.39/84.25,
  503.14/106.95 and 428.39/67.58 kB; archives are 278,660, 333,107 and
  276,760 bytes. Studio is 998.31/290.44 kB gzip JavaScript and 68.52/12.20
  kB CSS. Packed/minimal consumers are 833,790/244,411 bytes and
  826.54/242.27 kB gzip.
- `milestone-2c-portable-resolved-backend` and its fresh-process comparison
  are repeat-stable. The guard retains 31 approved passes, 17 documented
  historical/environment-sensitive differences and 28 unapproved surfaces.
  Scene retains four historical differences/15 unapproved candidates;
  settlement retains its documented stable states.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.

### Next boundary

Milestone 2D may move pure field mutation, constraints and editing-session
contracts into core. Keep file decoding, browser text measurement, persistence,
sessions, React presentation and Studio workflow outside that migration.

## 2026-07-22 — Template Platform Milestone 2B portable resolution dependency inversion

### Result

- Moved portable color/asset/axis, layout, stroke, transform and vector models
  plus backend output types into `template-core` without changing public SDK
  symbols, renderer output or runtime authority.
- Split CSS/React vector and transform adaptation from the portable models.
  Resolved-tree creation now has zero renderer imports; backend decision and
  diagnostic implementations have zero resolved-type imports.
- Preserved internal compatibility paths through behavior-free forwarders and
  typed public wrappers. Core's declaration remains exactly 86,272 bytes at
  `e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
- Added model parity coverage, enforced import directions and duplicate-owner
  checks, and added an isolated packed-core Node consumer with no repository
  fixture, alias, DOM, storage, font or network dependency.

### Current-run evidence

- Portable tests, root TypeScript, SDK/Studio/minimal builds, boundaries, archives,
  packed consumers, session and Studio browser smokes, documentation and all
  19 appearance projections pass.
- Core/browser/React JavaScript and declarations are 425.58/84.25,
  503.17/106.95 and 428.43/67.58 kB; archives are 278,706, 333,127 and
  276,779 bytes. Studio is 998.31/290.44 kB gzip JavaScript and 68.56/12.21
  kB CSS. Packed/minimal consumers are 833,790/244,411 bytes and
  826.54/242.27 kB gzip.
- `milestone-2b-portable-resolution-guard` is repeat-stable and retains 31
  approved passes, 17 historical/environment-sensitive differences and 28
  unapproved surfaces. Scene retains four historical differences/15
  unapproved candidates; settlement retains its documented stable states.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.

2C review correction: the 2B model fixture omitted a required asset field and
package-owned side-effect tests were not guaranteed to execute in the bundled
suite. Milestone 2C fixes the fixture, requires direct package typechecks and
uses explicit dynamic test imports. No 2B production behavior changed.

### Next boundary

Milestone 2C must audit and move the resolved/backend implementation together
with its actual primitive/appearance dependency closure. Do not copy primitive
contracts, introduce a core-to-root implementation dependency, or move field,
browser or React behavior in that milestone.

## 2026-07-22 — Template Platform Milestone 2A portable core source ownership

### Result

- Moved the canonical package types/schema, diagnostics, migration, parsing,
  validation, ZIP/source reader and normalization into `template-core` with
  the loader's portable registry, asset-reference, mask, motion-linking and
  Figma-URL dependency closure.
- Rebased the public core entry and synchronous ZIP importer to local owners.
  The built public declaration is byte-for-byte identical to Milestone 1B.
- Retained root consumers through checked behavior-free forwarders. No alias,
  copied contract or duplicate schema/type owner remains.
- Added a package-owned DOM-free source-contract suite and strengthened source,
  declaration and archive boundaries against root, browser, React, network and
  Studio edges.

### Current-run evidence

- The aggregate portable CI gate passes: portable tests, root/package
  TypeScript, direct/delegated Studio builds, SDK
  builds/declarations, boundaries, archives, repository audit, documentation,
  packed/minimal consumers, session/Studio browser smokes and all 19 appearance
  projections pass.
- Studio is 997.93 / 290.39 kB gzip JavaScript and 68.56 / 12.21 kB CSS.
  Core/browser/React are 425.51/84.25, 503.83/106.95 and 427.70/67.58 kB
  JavaScript/declarations; archives are 286,787, 342,222 and 277,126 bytes.
  Packed and minimal consumers remain 833,600/244,508 bytes and 826.35/242.35
  kB gzip.
- `milestone-2a-portable-core` is two-pass stable across 19 fixtures and four
  surfaces. The guard retains 31 passes, 17 documented historical/environment
  differences and 28 unapproved surfaces. Scene retains four historical
  differences/15 unapproved candidates; settlement retains its stable
  documented reference states.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No update, promotion, fixture, schema or tolerance command ran.

### Forwarder retirement and next boundary

- Package/source/validation forwarders retire when browser session and Studio
  production imports switch to the core public entry.
- Shared type, asset-reference, mask and motion forwarders retire after the
  resolved/backend/field and React renderer families physically move.
- Next, invert the five pure helpers imported by resolved-tree creation from
  the renderer directory and place shared backend decision types below both
  implementations. Do not relocate resolved/backend behavior before that
  acyclic boundary is verified.

## 2026-07-22 — Template Platform Milestone 1B Studio UI boundary

### Result

- Added public `TemplateInspectionViewport` state and imperative fit/target/zoom
  API while retaining live settled-target measurement, resize-centre behavior,
  inspection overlays and render-identity publication.
- Preserved `TemplateInspectionPreview` and its props through a native,
  Studio-independent compatibility composition. Studio owns a styled wrapper
  with the prior controls, icons, DOM classes and fidelity selectors.
- Moved the complete UI kit and seven editor/font/quality panels and their UI
  tests under `apps/studio`. Root technical helpers remain in place; no
  renderer, schema, persistence, diagnostic or export authority changed.
- Removed retired panel barrel exports and strengthened source, bundle,
  declaration, archive and packed-consumer checks against Studio/UI/icon edges.

### Current-run evidence

- Portable tests, root/package TypeScript, Studio/root builds, declarations,
  boundaries, archives, documentation and all 19 appearance projections pass.
- The Studio browser smoke imports the compact ZIP and verifies target
  publication, imperative `getSnapshot`, zoom, template/target fit, resize and
  observer disposal, in addition to routes/history/APIs/font URL and zero
  external requests or console errors.
- Studio output is 997.62 / 290.27 kB minified/gzip JavaScript and 68.56 / 12.21
  kB CSS. Core/browser/React package outputs are 426.69/84.25,
  503.96/106.95 and 427.72/67.58 kB JavaScript/declarations. The minimal
  consumer is 826.35 / 242.35 kB gzip; the packed consumer exercising both
  preview APIs is 833,600 / 244,508 gzip bytes.
- Renderer runs `milestone-1b-studio-ui-boundary` and
  `milestone-1b-studio-ui-boundary-compare` are four-surface repeat-stable and
  retain 31 passes, 17 historical/environment-sensitive differences and 28
  unapproved surfaces. Scene retains four historical differences/15 unapproved
  candidates; settlement retains its stable documented reference states.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No update, promotion, fixture, schema or tolerance command ran.

### Next boundary

The next milestone may move the portable package/source/validation contract
into `template-core`. Do not move resolved-tree families until their five pure
render-helper dependencies and shared backend decision types are inverted.

## 2026-07-22 — Template Platform Milestone 1A Studio ownership

### Result

- Moved the real Vite application, routes, views, styles, assets, optional
  Figma/font services, configuration and Studio-owned tests to `apps/studio`.
- Root build/dev/preview commands now delegate to that workspace. Programmatic
  browser/fidelity tools use one Studio-root Vite server helper; model-only
  builds remain repository-rooted with configuration disabled.
- Preserved root environment loading, application URLs, IndexedDB origin, both
  optional API paths, the exact `/src/assets/fonts/rethink-sans-600.ttf` URL,
  public SDK exports and every renderer surface selector.
- Strengthened boundaries so packages cannot reference `apps/studio`, required
  Studio owners are present, and duplicate root application/config owners fail.
- Retained `src/components/ui`, `src/template-package` and `src/test-suite.ts`
  explicitly. Milestone 1B must split the public inspection preview from Studio
  controls before moving the remaining UI.

### Migration evidence

- Portable tests, root/package TypeScript, direct Studio and root delegated
  builds, root dev delegation, repository audit, boundaries, archives,
  packed/minimal consumers, route/history/API/font smoke and session browser
  smoke pass.
- Studio output is 996.42 kB / 290.33 kB gzip JavaScript and 68.56 / 12.21 kB
  CSS, materially flat from Milestone 0. SDK, packed-consumer and minimal
  consumer sizes are unchanged.
- A working-directory-sensitive Tailwind content path initially exposed the
  diagnostics overlay in programmatic captures. Absolute Studio/root content
  paths restored the documented closed-diagnostics editor surface; no runtime
  or renderer behavior was changed.
- All 19 appearance projections are valid/deterministic. Fidelity run
  `milestone-1a-independent-studio` is four-surface repeat-stable and retains
  31 passes, 17 historical/environment-sensitive differences and 28 unapproved
  surfaces. Scene retains four historical differences/15 unapproved candidates;
  settlement retains its stable documented historical/unapproved states.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No update, promotion, fixture, schema or tolerance command ran.

## 2026-07-22 — Template Platform Milestone 0 boundary audit

### Result

- Added the authoritative
  [Template Platform boundary audit](../architecture/TEMPLATE_PLATFORM_BOUNDARY_AUDIT.md).
- Classified all audited production modules through exhaustive ordered path
  rules: platform UI-independent, reusable React, advanced inspection, Studio
  application, Studio fidelity/development-only, or internal.
- Recorded actual package/root/Studio import crossings, browser and network
  assumptions, public API coverage/gaps, React reusability, future importer
  experience direction, circular-dependency risks, temporary-forwarder rules,
  and a decision-complete Milestone 1 handoff.
- No implementation source moved and no production contract or behavior
  changed. The existing SDK 0.2 working-tree work remains the baseline.

### Current-run evidence

- Portable unit/lifecycle tests, root and package TypeScript, Studio production
  build, all three package builds/declarations, package boundaries, three
  archives, packed and minimal consumers, browser session smoke and
  documentation links pass.
- Studio remains 996.83 kB / 290.45 kB gzip JavaScript and 68.56 / 12.21 kB
  CSS. The packed consumer remains 827,428 / 242,805 gzip bytes; the minimal
  consumer remains 829.55 / 243.61 kB gzip.
- All 19 appearance projections are valid and deterministic. Renderer run
  `milestone-0-platform-boundary-audit` is repeat-stable across Validate,
  Fields, editor and PNG export.
- The renderer guard has 31 approved passes, 17 documented
  historical/environment-sensitive differences and 28 intentionally
  unapproved surfaces. Scene and settlement retain their documented historical
  and unapproved states.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No update, promotion or tolerance command ran.

### Next milestone boundary

Milestone 1 moves only the real Vite application, routes, UI, styles, assets and
optional Studio services under `apps/studio`, while keeping the three current
facades bridging root platform source. It must preserve every product route,
fidelity selector/surface and current package/consumer/evidence identity. It
does not move platform implementation or redesign public APIs.

## 2026-07-22 — SDK 0.2 consumer runtime contract

### Implemented

- Added `createTemplateSession()` to the browser package with versioned
  snapshots, immutable base/working package separation, resolved-tree and
  validation publication, typed edits, image replacement/reset/mode changes,
  full restore, injected adapters, persistence, subscription, and disposal.
- Extended import/font linking with an optional per-session managed-font
  registry while preserving the existing global browser default.
- Added React provider, external-store snapshot hook, session renderer, current
  render identity, and guarded imperative PNG export.
- Migrated the minimal consumer to the high-level contract, including an
  offline save/reload example, without adding Studio UI.
- Added an isolated packed-tarball consumer build and a browser smoke covering
  ZIP import, edit, persistence, PNG, reload, and offline restoration.
- Added a fixed-group minor Changeset for the three SDK packages. Source-package
  relocation and bundle de-duplication remain explicitly deferred.

### Authority

- No renderer owner, backend decision, schema, normalization, appearance
  family, runtime route, settlement rule, comparison tolerance, fixture, or
  approved reference changes in this milestone.
- The session composes existing authorities and rejects stale work; it does not
  introduce a parallel renderer or settled graph.

### Current-run verification

- Portable unit tests and TypeScript pass. All three SDK facades build with
  declarations; package boundary, packed-archive, and documentation checks pass.
- A clean temporary React consumer installed only locally packed tarballs and
  built without monorepo aliases or repository-relative declarations. Its
  output is 827,428 JavaScript bytes / 242,805 gzip bytes.
- The minimal session consumer builds at 829.55 kB / 243.61 kB gzip. The Studio
  remains effectively flat at 996.83 kB / 290.45 kB gzip JavaScript and 68.56 /
  12.21 kB CSS; its existing chunk-size warning is unchanged.
- The browser smoke passes ZIP import, ready identity, text edit, save, guarded
  PNG export, reload, and offline restoration with external requests blocked.
- All 19 appearance projections are valid and deterministic. Fidelity run
  `sdk-02-consumer-runtime-final` is repeat-stable for all 19 fixtures across
  Validate, Fields, editor, and PNG export.
- Full renderer, scene, and settlement comparisons retain their documented
  historical, environment-sensitive, and unapproved states. Approved identities
  remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No update or tolerance command ran.

## 2026-07-21 — Private GitHub monorepo and reusable SDK extraction

### Completed

- Created a clone-on-write pre-Git backup at
  `/Users/niels/Documents/Codex/2026-06-29/i-m-starting-a-new-project.pre-github-20260721`.
- Added Git hygiene for dependencies, builds, environment files, swap files,
  generated fidelity material, local fixture/font inputs, and package archives.
- Added the private proprietary notice and a secret-free `.env.example`.
- Added pnpm workspaces for Studio, three SDK packages, and the minimal consumer.
- Added framework-neutral `importTemplatePackage` returning immutable imported
  baseline and working copies without persistence, font linking, enrichment, or
  network access.
- Added package builds, declaration output, source maps, explicit exports,
  package-content inspection, and dependency-boundary verification.
- Added a minimal React consumer proving ZIP import, field editing, current
  render identity, and PNG export without Studio UI.
- Added Changesets, private GitHub Packages configuration, portable CI, guarded
  approved-evidence checks, release workflow, CODEOWNERS, and beginner GitHub
  setup documentation.
- Template Studio's primary import/editor renderer dependencies now resolve
  through the public workspace entry points while Studio-only panels remain
  private product code.

### Current-run verification

- Local initial commit: `46daac8` on `main`; 706 committed files and an 11.63
  MiB Git object store.
- A fresh clone under `/private/tmp` installed from the frozen lockfile and
  passed `pnpm ci:portable` without local environment files, generated evidence,
  external font directories, or the 31 GB fidelity workspace.
- Portable CI passed unit tests, TypeScript, Studio production build, portable
  realistic lifecycle, 140-document/284-link verification, all three SDK
  builds and declaration checks, dependency boundaries, three packed-archive
  inspections, and the minimal consumer build.
- The strict local diagnostic ZIP and strict realistic ZIP gates passed before
  the clean-clone run. `pnpm appearance:baseline` passed all 19 registered
  fixtures deterministically.
- Full renderer, scene, and settlement commands generated candidates only and
  retain the documented historical/unapproved comparison states. Direct
  pre-Git-backup comparison proves every approved file is byte-identical.
- Approved aggregates remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene
  4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
- Production output is 996.74 kB minified / 290.41 kB gzip JavaScript and
  68.56 / 12.21 kB CSS. The existing large-chunk warning remains; SDK/test
  tooling and generated fidelity material do not enter the Studio bundle.

### Authority and compatibility

- Renderer, canonical scene, settlement, backend decisions, persistence, and
  export readiness retain their existing implementations and authority.
- No new Figma capability, backend, fallback, schema, diagnostic, or renderer
  mode was added.
- External real fixtures and managed-font binaries remain hash-gated local
  inputs; published archives include neither them nor fidelity evidence.
- Approved renderer, scene, and settlement references remain guarded and no
  update command has run.

### Remaining external GitHub administration

The authenticated GitHub identity is `Sleinity`. The planned private repository
is `Sleinity/template-tool`. Creating the remote repository, inviting a colleague,
and enabling the `main` ruleset require the authenticated GitHub web/CLI action
after the local initial commit is verified. The colleague's GitHub username is
not recorded in the repository.

## 2026-07-21 — Diagnostic authority tightening

- Added explicit `text-dom` ownership and restricted primitive fallback evidence to primitive-eligible nodes.
- Added resolved backend disposition and redefined active fallback as a real loss-of-authority event.
- Added provenance-aware SVG asset inference for omitted vector render mode; explicit unsupported remains authoritative.
- Removed derivative backend font/asset diagnostics from the ordinary projection so dedicated dependency findings remain the root cause.
- Split technical compatibility ownership from review-required fallback regions in rendering health.
- Reclassified readable large-media performance and deterministic containment as Information without affecting readiness.
- Visible Chromium: now-hiring and deal-of-the-week are Ready with zero Review items; informational notes remain filterable; a fresh final tab has zero warning/error logs.
- No package schema, persisted data, renderer geometry, comparison tolerance, or approved reference changed.
- `diagnostic-authority-tightening-all` captured 19 fixtures × four surfaces × two repeats; every surface is stable. Both templates publish one identical product-render identity across Validate, Fields, editor, and PNG. Now-hiring is byte-identical to the preceding MVP smoke run on all four surfaces; deal-of-the-week Fields/editor/PNG are byte-identical to the preceding MVP run and its Validate difference is diagnostic UI only.
- Unapproved full-page Validate evidence is under `fidelity/candidates/diagnostic-authority-tightening-ui/`.
- Unit, TypeScript, production build, strict diagnostic ZIPs, strict realistic lifecycle, all 19 appearance projections, docs, stage 4A, routing scenarios, exact fonts, text trim, replacement/persistence/offline, mask, and primitive/stroke/gradient/ordered-paint scenarios pass. No renderer-time Figma requests were observed.
- Full renderer, scene, and settlement guards retain their documented historical/unapproved differences. The approved aggregates remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. No update command ran.
- Final production output is 996.74 / 290.61 kB minified/gzip JavaScript and 68.56 / 12.21 kB CSS. Relative to the prior 993.23 / 289.64 kB JavaScript build, the diagnostic contract adds 3.51 / 0.97 kB; CSS is unchanged. The existing large-chunk warning remains unchanged.
- Result: complete. Future work should use these dispositions rather than reintroducing compatibility-as-warning policy.

## 2026-07-21 — two missing-gradient issue packets resolved

- Both packets identify the same root cause: package `pkg_459_67_1784615329455`, node `459:68`, was compatibility-owned because it mixed one SOLID with one linear gradient. The packets are not independent failures.
- Exact source ZIP: `/Users/niels/Documents/Templates/template-package-fill-stack-solid-linear-2.zip`, 154,188 bytes, SHA-256 `781e54def68e2dd769c96f9bc2a7152c9e0ab7db4f1137844d6fa15c019ace94`; template `60609879…fc75`; preview `be980d75…8191`; package/root `pkg_459_67_1784615329455` / `459:67`; target `459:68`.
- Accepted ADR 0072 and `ORDERED_SOLID_LINEAR_RUNTIME_AUTHORITY.md` define the narrow source-certified route: source index 0 SOLID plus source index 1 `GRADIENT_LINEAR`, visible NORMAL, node opacity 1, eligible rectangular primitive, no competing appearance dependency.
- Production adds `ResolvedOrderedNormalPaintStackV1`, backend capability `PNT-ORDERED-SOLID-LINEAR-NORMAL`, and singular owner `ordered-normal-paint-svg`. One SVG group uses one primitive clip and paints both source-indexed layers. Existing isolated-gradient and ordered-SOLID owners are reused semantically, not double-mounted.
- Candidate run `fidelity/candidates/issue-2f69124d-7c79de23-resolution/` captures Validate, Fields, editor, and PNG twice. Every surface is repeat-stable and has the same stack identity. Source evidence under `fidelity/evidence/ordered-solid-linear-normal/` reports 0 changed target-region pixels and 0 changed full-canvas pixels.
- The exact fixture is now the nineteenth hash-gated registered fixture. Its source preview is not an approved renderer reference. No reference update command ran.
- Still unsupported: reversed/additional mixed patterns, IMAGE layers, hidden mixed layers, non-NORMAL blends, node/group opacity, masks, effects, strokes, other gradient families, Canvas/WebGL, and general compositing.
- Final verification passes unit tests, TypeScript, production build, strict diagnostic ZIPs, exact strict lifecycle, all 19 appearance projections, source evidence, two-pass four-surface capture, persistence/offline restoration, and documentation links. The new settlement candidate is stable and ready on every surface but has no approved settlement reference, as intended.
- The targeted renderer guard is 31/48 clean. Its 17 differences are unchanged historical/unapproved evidence: four established fixture families plus the Validate-only `ordered-solid-paint-opacity` Inspector presentation. Full scene comparison likewise retains three historical failures and unapproved newer fixtures. No result implicates the new owner and no update command ran.
- Approved counts remain renderer 96, scene 4, and settlement 80. Fixture manifest SHA-256 is now `2dfe5912c8a40cdbc8158018ad1afd2cbbfc3b43e74b037957a38ebc3e477fa0` because the nineteenth fixture was registered.
- Production output is 993.23 / 289.64 kB minified/gzip JavaScript and 68.56 / 12.21 kB CSS, a +6.82 / +1.24 kB JavaScript delta with CSS unchanged. The known large-chunk warning is unchanged; fixture and evidence data remain outside the bundle.
- The candidate PNG was inspected directly and matches the supplied source preview. A final in-app visible-page inspection could not be completed because Browser Use blocked navigation from the stale local error tab under its URL security policy; no alternate browser workaround was attempted. The controlled capture harness and persisted/offline browser scenario are the current browser evidence.
- Exact next step: optional human visual approval of the candidate evidence. Do not promote it or broaden mixed-stack support without separate explicit review.

## 2026-07-21 — Semantic Renderer MVP course correction

Formal result: **Result A — MVP product path and fidelity workbench are complete.** No critical import, edit, reset, persistence, offline, or export defect remains in the required smoke set.

The product authority transfer is implemented under [ADR 0071](decisions/0071-semantic-first-product-path-supersedes-rollout-governance.md). Production rendering no longer consumes rollout/cohort state. `TemplatePackageRenderer` consumes the unfiltered resolved graph and publishes `ResolvedProductRenderIdentityV1`; all product surfaces retain the same capability-selected owners and coherent compatibility boundaries. The old preference/cohort namespaces are inert and an idempotent migration marker is recorded without deleting unrelated IndexedDB data.

Validate no longer mounts `TemplatePackageVisualDiff`. It reports source-reference availability with comparison explicitly `not-run-in-product`, projects rendering health into the existing quality workspace, opens by default for saved-template settings, and is linked from the editor as “Review template health.” A selected finding can export a local deterministic issue packet containing bounded semantic evidence and optional explicitly selected pixels.

Production/harness changes include the product-render identity, semantic-first renderer wiring, PNG/fidelity readiness migration, retired rollout scripts/tests/UI styles, richer diagnostic contracts, and issue-packet generation. Historical rollout/cohort source evidence remains in the repository but is unreachable from the product and excluded from the main test suite and package scripts.

Baseline and final guarded identities are renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`; scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`; settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`; fixture manifest `9df548bb4c7c301e5528169f3e9949cf625490c3b5667b10d0cdc9175c29cf18`. No approved file or tolerance changed.

Current-run evidence:

- `semantic-renderer-mvp-final` covers all 18 fixtures and all four surfaces with two stable captures per surface under the final product-identity contract. Guarded comparison remains non-clean only for already documented historical/unapproved renderer states and the known Validate-only diagnostic presentation difference; it did not authorize a reference update.
- `semantic-renderer-mvp-smoke` covers now-hiring, editable media CROP/FIT/FILL, mask/media, primitives/strokes, linear gradients, ordered SOLIDs with compatibility-owned node opacity, and imperfect exported source. All seven fixtures repeat stably. For each fixture, Validate, Fields, editor, and PNG publish the same product-render identity.
- `semantic-mvp-identity-check-5` independently proves cross-surface identity for `optimized-for-template-export`: product identity `product-render:ca84ec70` and settlement revision `e4eca70d` on all four surfaces.
- Visible Chromium review opened the saved-template Validate workspace from “Review template health.” A clean reload showed one identity-bearing live renderer, no hidden comparison renderer, no rollout controls, no fresh warning/error logs, source comparison `not-run-in-product`, rendering-health summaries, region findings, and the selected-finding issue-packet action. The UI confirmed local packet download state. Unit coverage verifies ZIP contents, privacy exclusions, deterministic ID/path generation, and non-mutation.
- Unit tests, TypeScript, production build, strict diagnostic ZIPs, strict realistic ZIP lifecycle, all 18 appearance projections, runtime routing, exact-font and text-trim evidence, image replacement/reset/stale-work rejection, masks, primitives, strokes, gradients, ordered SOLIDs, reload/offline scenarios, and documentation links pass. Browser owner-family scenarios report zero renderer-time Figma requests.
- `pnpm scene:compare` and `pnpm settlement:compare` ran and retain their documented historical/unapproved results; approved aggregates remain byte-identical.

Production output is 986.41 / 288.40 kB minified/gzip JavaScript and 68.56 / 12.21 kB CSS. Against the pre-course-correction 983.84 / 285.85 kB JavaScript and 71.14 / 12.66 kB CSS, this is +2.57 / +2.55 kB JavaScript and -2.58 / -0.45 kB CSS. The known large-chunk warning is unchanged. Harness and issue evidence remain outside the production bundle.

Exact next step: begin the normal post-MVP fidelity loop on a real operator-reported template: Validate finding → bounded issue packet → focused correction proposal or fidelity pass → separate evidence review. Do not restore rollout governance, start a new feature-family gate, change a reference, or implement the ADR 0010 global settled graph without separate scope and evidence.

## Phase 13 Stage 1 operator cohort implemented (2026-07-20)

Formal result: **Result A — local Stage 1 implemented.** Read [`SEMANTIC_ROLLOUT_POLICY.md`](SEMANTIC_ROLLOUT_POLICY.md), [`ROLLOUT_MODES.md`](ROLLOUT_MODES.md), [`BACKEND_ORCHESTRATION.md`](BACKEND_ORCHESTRATION.md), [`DIAGNOSTIC_PROJECTION.md`](DIAGNOSTIC_PROJECTION.md), Accepted ADR 0068, and Accepted ADR 0070 before changing rollout behavior.

Implementation:

- `src/template-package/renderer-rollout/cohort/` contains the versioned records, deterministic subject/evaluator, observation counters, decisions/incidents, fail-closed metadata repository, provider, operator projection, UI, and unit coverage;
- `TemplatePackageRenderer` publishes only revision-current existing backend/diagnostic/readiness evidence and never adds a second renderer;
- `App` mounts cohort persistence only in development; access additionally requires `?renderer-admin=1`;
- direct mode buttons are gone; manual enrolment begins in Compare, Semantic requires an eligible observation and explicit operator identity, and rollback persists Legacy immediately;
- metadata key `renderer-rollout-cohort` is separate from `renderer-rollout-preference`, packages, and drafts;
- unknown schema/enums and corrupt records are quarantined; package/draft data is untouched;
- the 30-day expiry and any content-addressed authority change preserve history, revoke active approval, and return to Legacy.

Evidence:

- focused commands cover eligibility ordering, subject volatility exclusions, observation completion, compatibility acceptance, transitions, expiry, invalidation, migration, unknown enum rejection, incidents, and rollback;
- final browser runs `phase-13-stage1-cohort-policy-complete-headless-v3` and `phase-13-stage1-cohort-policy-complete-headed` completed a real now-hiring import, exact fonts, Compare observation, reviewed compatibility, operator-identified Semantic approval, one visible owner, reload/offline restoration, real PNG export, hard-failure incident rollback, expiry, history-preserving re-enrolment availability, and corrupt-store recovery with zero console errors and zero renderer-time Figma requests;
- the same headed/headless commands exercise a test-only policy UI harness for exact Semantic, compatibility acceptance, Compare-only, Legacy-required, and repair-blocked outcomes. The harness imports the production evaluator/provider/panel but is not a production entry point or renderer;
- `phase-13-stage1-control-final-v2` confirms the admin boundary, no direct mode-selection bypass, safe no-subject/current-default state, corrupt-preference current-default fallback, and no runtime Figma request;
- the Codex in-app browser opened the admin route, but its local-page security policy rejected the final DOM inspection; no workaround was attempted. The Playwright headed run is the current visible automation evidence.

Final verification passes `pnpm test`, explicit TypeScript checking, production build, strict diagnostic ZIPs, strict realistic ZIP lifecycle, all 18 appearance projections, docs links, runtime rollout control/scenarios, headed and headless cohort flows, runtime routing stage 4A/scenarios/fonts/text trim, media replacement/stale-result tests, mask evidence/browser tests, primitive/stroke evidence/browser tests, gradient evidence/browser tests, and ordered-SOLID evidence/browser tests. All 18 fixtures × four surfaces are repeat-stable in `phase-13-stage1-all-surface-final`.

The broad renderer, scene, and settlement guards were run and retain only their documented historical/unapproved failures. The approved gradient and ordered-SOLID overlap is 31/32 exact; the one failure remains the reviewed Phase 12 `ordered-solid-paint-opacity/validate` Inspector-only presentation difference. No reference-update command ran. Direct byte aggregation confirms renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

Production build: JavaScript 983.84 kB minified / 285.85 kB gzip and CSS 71.14 / 12.66 kB. Against the immediately preceding Phase 13 mode build (983.65 / 285.91 kB JS), Stage 1 is +0.19 kB minified and -0.06 kB gzip after the production evidence path was gated behind `import.meta.env.DEV` and internal access. The known large-chunk warning is unchanged; browser/evidence scripts and fixture artifacts remain outside the bundle.

Production/source files changed for Stage 1:

- `src/template-package/renderer-rollout/cohort/{types,model,state,repository,RendererRolloutCohortContext,InternalRendererCohortPanel}.ts(x)`;
- `src/template-package/renderer-rollout/{InternalRendererModeControl,index}.ts(x)`;
- `src/template-package/render/TemplatePackageRenderer.tsx`, `src/App.tsx`, `src/styles.css`, `src/test-suite.ts`, and `package.json`.

Test/evidence files changed:

- `src/template-package/renderer-rollout/cohort/cohort.test.ts`;
- `scripts/runtime-rollout/{cohort-unit,cohort-browser-scenarios,browser-scenarios}.mjs` plus test-only `cohort-state-browser-harness.{html,tsx}`;
- generated candidates and evidence under `fidelity/candidates/phase-13-stage1-all-surface-final`, `fidelity/evidence/phase-13-stage1-cohort/`, and `fidelity/evidence/phase-13-rollout/`; no approved directory was written.

Exact next step: conduct a bounded Stage 1 operator trial using real internal templates and record incidents/compatibility dispositions. Stop before Stage 2 template opt-in, public rollout, default migration, remote telemetry, or Legacy removal.

## Phase 13 operator-cohort policy ready (historical, 2026-07-20)

Formal result: **Result A — policy ready; no cohort implementation began.** Read [`SEMANTIC_ROLLOUT_POLICY.md`](SEMANTIC_ROLLOUT_POLICY.md), [`ROLLOUT_MODES.md`](ROLLOUT_MODES.md), Accepted ADR 0068, and Proposed ADR 0070 before changing rollout behavior.

The policy now records:

- stages 0–4, with internal development complete and Stage 1 operator cohort proposed next;
- content-addressed eligibility subjects and ordered `blocked-pending-repair`, `legacy-required`, `compare-only`, `eligible-with-accepted-compatibility`, and `eligible-for-semantic` outcomes;
- hard lifecycle, dependency, owner, export, revision, surface, persistence, offline, network, and comparison predicates derived from existing authorities;
- exact, regional, accepted-residual, review-required, and automatic-failure thresholds;
- five operating days plus minimum import/restore, edit/reset, export, reload, offline, capture, and operator-review evidence;
- automatic, operator-confirmed, and engineering-reviewed rollback triggers using the existing immediate Legacy path;
- invalidation on package/canonical/field/asset/font/geometry/settlement/backend/renderer/reference/capability/policy identity changes and 30-day inactivity expiry;
- a bounded incident procedure and guarded reference-review matrix;
- an internal plain-language operator workflow with technical detail disclosure;
- documentation-only `RendererRolloutEligibilityV1`, `RendererRolloutObservationV1`, `RendererRolloutCohortDecisionV1`, and `RendererRolloutIncidentV1` proposals.

No source or test code changed. No cohort record, enrolment, approval, template-level preference, public UI, remote telemetry, automatic migration, default change, renderer capability, fixture, comparison tolerance, or reference was introduced. Approved identities remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

Exact next step: seek separate approval for the policy's Stage 1 implementation only—pure aggregation of existing evidence, local versioned metadata, manual enrolment/approval, internal status UI, and automatic/manual Legacy rollback. Do not expose it publicly or persist Semantic in template semantics.

## Phase 13 internal rollout modes implemented (2026-07-20)

Phase 13 adds a bounded internal/admin `legacy | semantic | compare` preference without changing the missing-preference default. The final architecture is:

`repository metadata preference -> RendererRolloutProvider -> ResolvedRendererRolloutDecisionV1 -> ResolvedBackendDecisionV1 activation -> TemplatePackageRenderer -> Validate / Fields / editor / PNG`.

Important verified facts:

- the preference is global repository metadata (`renderer-rollout-preference`), not `basePackage`, `workingPackage`, canonical scene, or imported source data;
- missing, unknown, corrupt, or unreadable preference state preserves the prior current default safely;
- explicit Legacy/Semantic/Compare map centrally to core disabled/authoritative/compare and family-aware backend activation;
- one compatibility boundary owns an unsupported family coherently; accepted singular SVG/DOM/media owners are not rewritten merely to simulate an obsolete implementation;
- Compare is decision-only production observation with one visible owner and zero hidden renderers; pixels/geometry comparison remains harness evidence and is non-blocking;
- renderer components do not read persistence; the provider resolves one decision consumed by every surface;
- PNG readiness includes rollout preference/decision revision, so export cannot publish a stale mode;
- rollback to Legacy and clear-to-current-default need no re-import; persistence and offline reload retain mode identity;
- no renderer-time Figma request was added.

Production files added or changed:

- `src/template-package/renderer-rollout/{types,preference,preferenceRepository,resolveRendererRolloutDecision,RendererRolloutContext,InternalRendererModeControl,index}.ts(x)`;
- `src/template-package/render/TemplatePackageRenderer.tsx`;
- `src/template-package/enrichment/captureTemplatePackagePreview.ts`;
- `src/App.tsx` and `src/styles.css`.

Test/harness files added or changed:

- `src/template-package/renderer-rollout/rendererRollout.test.tsx` and `src/test-suite.ts`;
- `scripts/runtime-rollout/browser-scenarios.mjs`;
- `scripts/fidelity/{browser,model,cli}.mjs` and `package.json`.

Evidence runs completed before this handoff update:

- `phase-13-legacy-now-hiring`, `phase-13-semantic-now-hiring`, `phase-13-compare-now-hiring` — four surfaces × two captures, stable;
- `phase-13-compare-representative` — seven representative fixtures × four surfaces × two captures, stable;
- `phase-13-control-headless` — persisted mode, rollback, corrupt fallback, and zero Figma requests;
- visible Codex In-app Browser review at `http://127.0.0.1:5174/templates/new?renderer-admin=1` — Semantic/Compare switching, Compare reload persistence, Legacy rollback, clear-to-current-default, and empty warning/error console all verified.

Final current-run verification passes the full unit suite, type checking, production build, strict diagnostic and realistic ZIP lifecycle, all 18 appearance projections, documentation links, runtime-routing stage 4A/scenarios/fonts/text trim, the final internal-control browser scenario, and explicit Legacy/Semantic/Compare capture runs. The targeted approved renderer guard is 31/32 pixel-exact: its sole difference is the already reviewed `ordered-solid-paint-opacity/validate` Phase 12 Inspector presentation change, with equal template geometry and exact Fields/editor/PNG output. Scene and settlement guards retain only their documented historical or unapproved states. No update/reference command ran. Approved identities remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

ADR 0068 is Accepted only for internal modes. Public rollout remains blocked. At this historical checkpoint Stage 1 still required approval; the implemented and Accepted Stage 1 state at the top of this handoff supersedes it.

## Phase 12 visible Import Inspector approved (2026-07-20)

Formal result: **Result A.** Phases 11–12 are implemented and browser-approved. At this checkpoint Phase 13 had not begun; the completed internal Phase 13 handoff above supersedes that sequence note.

Visible review ran through the real import flow at `http://127.0.0.1:5173/templates/new` using `pnpm dev -- --port 5173`. The Codex In-app Browser used an 810×1343 CSS viewport at DPR 1.340000033378601; its control API did not expose the exact embedded Chromium version. The final browser console report is empty.

Reviewed evidence includes:

- healthy gradient `457:46`, ordered-SOLID `459:51`, and primitive/stroke DOM/SVG owners;
- now-hiring compare-mode settlement `core-b54cecf403a69fd4`, 6 routed / 4 compatibility nodes, and imported-source media node `387:336` at placement revision 0;
- compatibility node `459:59`, diagnostic `quality-5925e69e`, decision `backend:459:59:91eff43f`;
- preserved-only node `2453:1435`, diagnostic `quality-58a62a01`, decision `backend:2453:1435:f63f1542`;
- blocked exact-font node `2453:1444`, diagnostic `quality-b6419e9d`;
- transformed-bounds node `451:181`, diagnostic `quality-dac91302`, with aligned Fit affected layer selection at 176%.

The initial pass found only diagnostic/UI defects. The narrow correction hides raw capability jargon in the main view, moves owner metadata behind technical disclosure, groups derivative missing-motion warnings, demotes backend-covered raw renderer diagnostics to technical trace, separates repairability from unsupported visibility, prevents paint-fill language from becoming layout classification, reconciles normalized ZIP assets with stale unresolved traces, and makes blocker cards/counts audience-consistent. Expanded details now include diagnostic owner, decision ID, editability, export safety, fallback/source codes, and full source/resolved/geometry/asset/placement/settlement revisions.

Final screenshots and the complete review matrix are in [`fidelity/evidence/phase-12-import-inspector-visible/REVIEW.md`](../../fidelity/evidence/phase-12-import-inspector-visible/REVIEW.md). They are not approved references. No renderer output, schema, normalization rule, family resolver, runtime route, approved reference, snapshot, or tolerance changed; verification produced only unapproved candidates and evidence.

Current-run verification:

- `pnpm test`, `pnpm exec tsc -b --pretty false`, `pnpm build`, `pnpm test:diagnostic-zips`, `pnpm test:realistic-zip`, `pnpm appearance:baseline`, and `pnpm docs:verify` pass;
- runtime-routing stage 4A/scenarios/fonts/text-trim, image replacement/reset/stale-work rejection, and mask/primitive browser persistence/offline scenarios pass;
- `phase-12-import-inspector-approval` is repeat-stable for 12 fixtures × Validate/Fields/editor/PNG;
- 31 unaffected approved comparisons pass pixel-exact with equal geometry; `ordered-solid-paint-opacity/validate` has equal template geometry and a review-intended 1,411-pixel Inspector-only difference for node `459:59`; its Fields/editor/PNG surfaces remain exact;
- the four historical core fixtures and full scene/settlement guards retain their already documented non-promoted or unapproved differences;
- no update command ran and approved identities remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

Production files changed in this Phase 12 closure are `src/template-package/backend-decision/createDiagnosticProjection.ts`, `src/template-package/quality/TemplatePackageQualityPanel.tsx`, `src/template-package/quality/TemplatePackageDiagnosticContext.tsx`, `src/template-package/quality/diagnosticPresentation.ts`, `src/template-package/quality/createTemplatePackageQualityReport.ts`, and `src/views/import/ValidateReadinessPanels.tsx`. Focused tests changed in `src/template-package/backend-decision/backendDecision.test.tsx`, `src/template-package/quality/createTemplatePackageQualityReport.test.ts`, and `src/views/TemplatePackageImportFlow.test.tsx`. Documentation/evidence changes are `DIAGNOSTIC_PROJECTION.md`, `STATUS.md`, `HANDOFF.md`, ADRs 0067–0068, and the visible-review packet. The main JavaScript is 970.17 / 281.76 kB minified/gzip, +2.08 / +0.72 kB over the prior build; the known large-chunk warning is unchanged.

ADR 0067 remains Accepted. At this Phase 12 checkpoint ADR 0068 was Proposed; it is now Accepted for the bounded persisted internal contract documented above.

Exact next step: propose the bounded Phase 13 internal/admin opt-in described in `ROLLOUT_MODES.md`, with unchanged defaults, one visible owner in Compare, persisted/offline identity, and an immediate rollback path. Do not remove compatibility or make Semantic the default.

## Headed PNG determinism closed (2026-07-20)

Formal result: **Result A — headed PNG determinism fixed.** At this historical checkpoint Phase 13 had not begun and the visible Import Inspector review remained open; both later states are recorded above.

Root cause and correction:

- `deal-of-the-week-banner` nodes `346:38`, `346:41`, and `346:44` were fully decoded and geometry-identical, but headed Chromium's first `html-to-image` foreignObject-to-canvas raster for the new CSS-background media revision differed from all subsequent rasters. A discarded SVG serialization did not help, ruling out clone/resource embedding as the readiness boundary.
- `captureTemplatePackagePreview` now requires current media decode/intrinsic evidence and uses one completed discarded raster as the browser-paint readiness boundary for each new CSS-media capture-node revision. A `WeakMap` keys the DOM node to a semantic revision fingerprint and does not retain object URLs. The fingerprint excludes raw URL identity and includes package/canvas, settlement, primitive/backend, asset/placement, current geometry, and computed placement evidence.
- Capture telemetry records the media/decode state, revision, whether warmup ran, and readiness/final-raster timings. The fidelity browser harness records pre/post hidden-target state, object-URL creation/revocation, image source/decode/load/error events, network activity, and exact repeat comparison/diff artifacts. No fixed sleep, pixel snapping, coordinate correction, reference change, or tolerance change was introduced.

Determinism evidence:

- `phase-11-12-png-determinism-final-headed-a`: five exact PNGs, all SHA-256 `2af9ebaa4d941de15b05879ad443efe22acf1b8e377a9801b8295eba99b9a5b1`;
- `phase-11-12-png-determinism-final-headed-b`: second fresh process, five exact PNGs at the same hash;
- `phase-11-12-png-determinism-final-headless`: five exact profile-specific PNGs, all `af27daeecce1d4da9754621d8140e77b3bcaed3ca0716d3a3ac467bfdd1b0075`;
- node asset identity, 1125×750 intrinsic size, placement revision 0, backend revision `74de999e`, settlement identity, FILL geometry, opacity, visibility, and transforms are unchanged;
- object-URL count is unchanged from export 1 through 5. The settled asset URL is reused, never revoked during export, and the correction creates no URL.

Regression and guard evidence:

- `phase-11-12-png-determinism-all-regression`: 18 fixtures × four surfaces × two repeats, all 72 surfaces stable; all 96 overlapping PNGs byte-identical to `phase-11-12-browser-closure-final`;
- `phase-11-12-png-determinism-approved-guard`: 32/32 approved gradient/ordered-SOLID comparisons pass pixel-exact with equal geometry;
- image replacement Fill/Fit/reset and stale-work rejection pass for all three editable fields; routing scenarios, exact fonts, text trim, masks, primitives, strokes, gradients, ordered SOLIDs, save/reload, offline restoration, and zero runtime Figma requests pass;
- `pnpm test`, type checking, production build, strict diagnostic ZIPs, strict realistic ZIP lifecycle, and all 18 appearance projections pass;
- full scene and settlement guards ran and retain only their documented historical/unapproved failures. Approved aggregates remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

Production files changed are `src/template-package/enrichment/captureTemplatePackagePreview.ts` and `package.json`. Test/harness changes are `src/template-package/enrichment/templatePackageEnrichment.test.ts` and `scripts/fidelity/browser.mjs`. Documentation changes are `HARNESS.md`, `IMAGE_PLACEMENT.md`, `PROPERTY_AUTHORITY.md`, `STATUS.md`, `HANDOFF.md`, ADR 0069, and the ADR index. No schema, normalizer, scene/resolver contract, renderer DOM/geometry, backend decision, media placement, fixture, candidate, approved reference, or comparison tolerance changed.

The production main JavaScript is 968.09 / 281.04 kB minified/gzip, +3.64 / +1.13 kB from the prior browser-closure build. The approximately 400 ms warmup applies only to the first CSS-media export for a new revision; later exports skip it. Harness instrumentation stays outside the production bundle. The existing large-chunk warning remains.

Historical next step, now complete: the separately scoped visible Import Inspector approval above closed the remaining Phase 11–12 gate.

## Historical Phases 11–12 browser-backed closure pass (2026-07-20)

Historical result: **Result B — superseded by ADR 0069 and the visible Phase 12 Result A above.** No renderer feature family, rollout mode, reference, snapshot, or comparison tolerance was added or changed.

Browser environment and application:

- repository application command: `pnpm dev` (`vite --host 127.0.0.1`), with the existing application reachable at `http://127.0.0.1:5173/templates/new`;
- repository browser harnesses used their existing Vite `createServer` configuration with an OS-selected localhost port;
- macOS/Darwin 25.5.0 arm64, Node 24.14.0, pnpm 11.9.0, viewport 1440×1600, DPR 1, locale `en-US`, timezone `UTC`;
- headless Chromium 149.0.7790.0 and headed Chromium 149.0.7827.55 both ran;
- the in-app Browser claimed and reloaded the local tab, but its URL security policy rejected the subsequent DOM inspection request, so the requested visible Inspector screenshots and presentation approval are incomplete.

Two concrete Phase 11 defects were corrected narrowly:

1. The live renderer telemetry exposed only a reduced backend-decision summary, and fidelity snapshots omitted it. `TemplatePackageRenderer` now publishes complete `ResolvedBackendDecisionV1` records plus tree backend availability through its non-export telemetry object; the fidelity browser/model pipeline retains them as `backendRouting`. This does not emit new DOM or PNG content.
2. A pure single-image node incorrectly registered both generic compatibility paint and `media-dom`. Generic compatibility-fill registration now ignores an image fill already owned by resolved media. Pure image fixtures select `dom-css` / `media-dom`; mixed paint combinations retain their coherent compatibility boundary. Focused tests enforce the ownership boundary.

Test-only persistence scenarios now retain the backend decision and availability record. Primitive, stroke, linear-gradient, ordered-SOLID, mask, and image-replacement fixtures compare the exact pre-reload decision with the restored decision. Run `phase-11-12-closure-backend-identity` passes all 11 primitive-family fixtures and the mask fixture with identity equal and zero Figma requests. Media run `phase-11-12-closure-backend-identity-final` passes all CROP/FIT/FILL fields, replacement Fill/Fit, reset, reload identity, and stale-work rejection.

Final headless packet: `fidelity/candidates/phase-11-12-browser-closure-final/`. It contains 12 approved fixture directories × four surfaces × two captures. All 48 surfaces repeat exactly. All 48 candidate PNGs and all 48 normalized geometries are unchanged from `milestone-7-4-all-regression`. Across 328 node/surface decisions there are no missing contract fields, surface mismatches, unavailable active Canvas/WebGL owners, or primary-owner participation errors. All 48 console reports are empty.

Guarded approved-reference comparison remains clean for the two gradient fixtures and six ordered-SOLID fixtures (32 surfaces). The four historical core fixture directories retain their already documented non-promoted differences; their current pixels and geometry are nevertheless exactly unchanged from the pre-Phase-11 run. Full scene and settlement guards retain their documented historical/unapproved failures. No update command ran. Approved aggregate identities remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

Browser blocker: headed packet `phase-11-12-browser-closure-visible` has one nondeterministic surface. `deal-of-the-week-banner` Validate, Fields, and editor repeat exactly, but PNG export changes 645 thresholded pixels (`0.031105324074074077%`) between capture 1 and 2 in `x=421, y=0, width=221, height=1080`. Fresh-process run `phase-11-12-banner-visible-recheck` reproduces the same count and bounds. Geometry, structure, font readiness, and placement telemetry are equal. The region intersects FILL nodes `346:38` (`decorative-image-top`), `346:41` (`product-image`), and `346:44` (`decorative-image-bottom`), all selected as `dom-css` with primary owner `media-dom` and participating owners `core-layout`/`media-dom`. Headless PNG is exact. Smallest follow-up: a bounded Phase 6 media PNG-sampling investigation of repeated headed hidden-renderer export, asset decode, and object-URL state. Do not change tolerances or Phase 11 routing to mask it.

Visible Inspector blocker: the in-app Browser security policy prevented the requested representative healthy/compatibility/unsupported/repairable visual review and screenshots after the tab reload. Automated projection/UI tests pass, including capability and region grouping, plain-language titles, backend/owner/support metadata, repairability, source codes, and a single expanded technical-details panel. This is structural evidence only; a successful visible review is still required.

Current verification passes `pnpm test`, `pnpm exec tsc -b --pretty false`, `pnpm build`, `pnpm test:diagnostic-zips`, `pnpm test:realistic-zip`, `pnpm appearance:baseline`, runtime-routing stage 4A/scenarios/fonts/text trim, image replacement, mask/primitive/gradient/ordered-SOLID browser persistence, and CROP/mask/primitive/stroke/gradient/ordered-SOLID source evidence. `pnpm scene:compare` and `pnpm settlement:compare` correctly remain non-clean for documented historical/unapproved evidence. The isolated CROP region remains 816 pixels / 0.19921875%. Documentation verification passes after this handoff update.

The production main JavaScript is 964.45 kB minified / 279.91 kB gzip, `-0.09 / 0.00 kB` from the pre-browser-pass Phase 11 build; the known large-chunk warning remains. Changed production files in this closure pass are `src/template-package/render/TemplatePackageRenderer.tsx` and `src/template-package/backend-decision/resolveBackendDecision.ts`. Test/evidence changes are `src/template-package/backend-decision/backendDecision.test.tsx`, `scripts/fidelity/browser.mjs`, `scripts/fidelity/model.mjs`, `scripts/primitives/browser-scenarios.mjs`, `scripts/masks/browser-scenarios.mjs`, and `scripts/image-placement/replacement-authority.mjs`, plus this status/handoff update.

Exact next step: resolve or formally classify the headed `deal-of-the-week-banner` hidden-PNG sampling nondeterminism, then repeat the Import Inspector visual review in an automation environment allowed to inspect the local tab. Rerun the Phase 11–12 closure gate. Do not begin the bounded Phase 13 internal rollout preference until Result A is recorded.

## Phases 11–12 backend reconciliation (2026-07-19)

Implemented one versioned node/subtree backend-decision contract over the existing resolved family owners. `ResolvedRenderTreeV1` now carries the ordered decision aggregate, explicit unavailable Canvas/WebGL policy, and one capability-aware diagnostic projection. Renderer gates for primitive, media, vector, mask clip, and fallback consume the central decision; the proven family resolvers and pixel implementations are unchanged.

The existing quality report and Import Inspector now accept projected backend diagnostics, group repeated issues by capability, filter by capability or region, show concise capability/target badges, and expose backend owner, support, confidence, visual impact, repairability, fallback, source codes, and revision evidence in the expanded technical view. No separate validation engine was created.

Added `BACKEND_ORCHESTRATION.md`, `DIAGNOSTIC_PROJECTION.md`, `ROLLOUT_MODES.md`, Accepted ADRs 0066–0067, and Proposed ADR 0068. Updated repository guidance, architecture, data flow, property authority, routing, surface, capability, status, and delivery records. No support claim or approved reference was promoted.

Current rollout audit: compatibility exists but is not named as one product Legacy mode; Semantic is partial and capability-gated; Compare exists for internal core-layout observation and in the fidelity harness; template-level opt-in is absent; editor and static defaults remain unchanged. The historical proposed next step was a persisted internal/admin-only `legacy | semantic | compare` preference, but the Result B browser closure above now blocks that work until the two approval gaps are resolved.

Current-run verification passed `pnpm test`, `pnpm exec tsc -b --pretty false`, `pnpm build`, `pnpm test:diagnostic-zips`, `pnpm test:realistic-zip`, `pnpm appearance:baseline`, `pnpm docs:verify`, mask/primitive/stroke/gradient source-evidence commands, and the backend-decision/diagnostic tests included by the main suite. All 18 appearance projections remain valid and deterministic. The approved aggregates are unchanged: renderer 96 files / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`; scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`; settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. No update command ran.

Historical implementation-run note: browser-backed fidelity, routing, exact-font/text-trim, persistence/offline, and visible Import Inspector scenarios could not start a local listener in the 2026-07-19 managed run (`EPERM` on `127.0.0.1:5173`). The 2026-07-20 closure pass above supersedes that environment result for all browser suites except the still-blocked visible Inspector inspection. `scene:compare` and `settlement:compare` retained their documented non-clean historical/unapproved states without changing approved snapshots. The CROP source-evidence command retained its existing missing-structural-node failure for node `429:46`; no crop behavior changed.

Production build: `964.54 kB` minified / `279.91 kB` gzip for the main JavaScript, a delta of `+16.24 / +4.68 kB` from the last documented `948.30 / 275.23 kB` baseline. The existing large-chunk warning is unchanged. Fixture bytes and harness code remain outside the bundle. Local resolved-tree construction was approximately `0.48–2.22 ms/tree` across the three primitive benchmark fixtures during repeated current-run sampling; this is local evidence, not a budget. Backend selection is pure, revision-bound, and contains no renderer-time network access.

## Milestone 7.4 ordered multiple-SOLID approval and promotion

The user accepted the Result A visual review on 2026-07-19 and explicitly authorized guarded promotion from `milestone-7-4-ordered-solids` for six fixtures across Validate, Fields, editor, and PNG export.

- Exactly 48 approved renderer files were created: one `reference.png` and one normalized `structure.json` for each of the 24 approved fixture/surface pairs.
- All 48 pre-existing approved renderer files remain byte-identical. The renderer aggregate moved from `204d676628098e9440634be7fa33b73d79937fb9a2edc3ef5aefd17e2d065ede` to 96 files / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`.
- Scene remains 4 files / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`; settlement remains 80 files / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. No scene or settlement promotion ran.
- Fresh guarded renderer run `milestone-7-4-promotion-verify` passes 24/24 comparisons pixel-exact with equal geometry and two stable captures per surface. Existing gradient run `milestone-7-4-promotion-gradient-guard` remains 8/8 pixel-exact, geometry-equal, and repeat-stable.
- Source order, repeated NORMAL source-over, hidden-paint preservation without an SVG layer, apply-once paint opacity, and one shared independent-corner clip are now part of the approved renderer baseline.
- Certified target `459:57` is approved. Control `459:59` remains whole-node compatibility-owned because node opacity is 0.5; its reviewed appearance is included in the renderer reference but does not authorize node-opacity routing or a tolerance change.
- Headless save/reload/offline verification restored identical ordered-stack identities for all six fixtures with zero runtime Figma requests. Media replacement/stale work, mask persistence, primitive/stroke/gradient persistence, exact fonts, and vertical trim passed focused current-run checks.
- `pnpm test`, type checking, production build, diagnostic ZIPs, appearance baseline, ordered-SOLID source evidence, documentation links, and focused family regressions passed. The documented crop evidence remains 816 regional pixels; gradient regression remains 39/40 pixel-exact solely because of the existing one-pixel now-hiring Validate raster residual, with geometry 40/40 equal.
- Full renderer, scene, and settlement guards ran and remain non-clean only for their documented historical/profile differences and unapproved fixtures. They did not mutate approved references.
- No production source, schema, normalizer, resolver, renderer, diagnostic, test, fixture, or tolerance changed during promotion. The build remains 948.30 kB / 275.23 kB gzip for the main JavaScript with the existing large-chunk warning.

Milestone 7.4 is fully closed. Mixed SOLID+gradient and SOLID+IMAGE stacks, non-NORMAL blending, node-opacity routing, effects, broader masks, and general compositing remain separate source-certified work.

## Milestone 7.4 ordered multiple-SOLID implementation completed before approval

- Implemented `ResolvedOrderedSolidStackV1` inside `PrimitiveAppearanceV1`, retaining source index/order, visibility, RGB, canonical color alpha, paint opacity, effective alpha, strict `solid-paint-source-v1` provenance, current bounds/corners, canonical/geometry/stack revisions, capability, owner, and exact fallback reasons.
- Capability selection is property-only. Eligible multiple-SOLID NORMAL rectangles use one SVG subtree, one ascending source-index layer group, and one shared primitive clip. Hidden paints remain resolved but emit no SVG layer. Compatibility CSS/SVG painting is disabled for the authoritative owner.
- Whole-node compatibility remains active for mixed paints, ambiguous opacity provenance, non-NORMAL paint blend, node opacity below 1, masks, effects, strokes, media/vector ownership, invalid paint data, and unsupported geometry. No general compositing, Canvas, WebGL, or fixture-specific route was added.
- Registered six exact fixtures: `ordered-solid-blue-then-red`, `ordered-solid-red-then-blue`, `ordered-solid-three`, `ordered-solid-hidden-middle`, `ordered-solid-paint-opacity`, and `ordered-solid-independent-corners`. See `FIXTURES.md` and `fidelity/fixtures.json` for exact identities.
- Candidate packet: `fidelity/candidates/milestone-7-4-ordered-solids/`; source packet: `fidelity/evidence/milestone-7-4-ordered-solids/source/`. All six target regions are source-exact and all 24 surface pairs repeat structurally and pixel-identically. The paint-opacity full-canvas difference belongs only to the deliberately unsupported node-opacity control.
- Persistence/offline: `fidelity/evidence/milestone-7-1-primitives/milestone-7-4-ordered-solids-headless/` and `...-visible/`; every fixture restored identical identity with zero runtime Figma requests.
- Full regression: `milestone-7-4-all-regression` is byte-identical to `milestone-7-4-prechange` for all 48 pre-existing fixture/surface PNGs. Media replacement/reset/stale work, masks, primitives, strokes, gradients, exact fonts, and vertical trim passed their focused current-run checks. Gradient regression remains 39/40 pixel-exact solely because of the already documented one now-hiring Validate raster pixel; geometry is 40/40 equal.
- Verification passed: `pnpm test`; typecheck; production build; diagnostic ZIPs; six exact strict lifecycle runs; appearance baseline for 18 fixtures; source evidence; two-pass headless capture; visible/headless reload; media/mask/primitive/stroke/gradient/font/text regressions. The guarded ordered-stack renderer comparison correctly returned 24 `unapproved` states. Full scene/settlement guards remain intentionally non-clean for documented historical/unapproved differences.
- Performance: 0.0760–0.1418 ms/tree, 0.03800–0.05759 ms/node, and 0.198–0.325 ms full resolved-tree construction across the six local fixtures. Main JS is 948.30/275.23 kB minified/gzip, +8.01/+1.86 kB; the known large-chunk warning remains.
- At implementation completion, before the later approval above, no reference update or tolerance command had run; the then-current renderer/scene/settlement aggregates were `204d6766…5ede` / `b788f6f1…f54b` / `c8295ff4…296e`.
- Historical next step, now completed: visually review and explicitly promote the 24 candidates. Any subsequent source gate should remain within Phase 7 paint/stroke—likely isolated mixed SOLID+linear-gradient NORMAL stacks—rather than general compositing.

Milestone: ordered NORMAL fill-stack source intake  
Date: 2026-07-19  
Outcome: Result A — ordered-SOLID source gate closed; runtime implementation not started  
References: unchanged by this intake; Milestone 7.3A promotion remains the current approved renderer baseline

## Final opacity/corner source-gate closure completed in this task

- Added strict `solid-paint-source-v1` normalization for identified Figma exporter 0.6.0 packages. Equal finite unit `color.a` / `paint.opacity` values within `1e-6`, with no raw same-index paint, normalize to canonical alpha 1 plus authoritative paint opacity applied once. Both serialized values, predicate, paths, tolerance, confidence, revision, and conflicts remain inspectable.
- Same-index valid raw Figma SOLID evidence owns opacity directly. Differing values, invalid/conflicting raw evidence, unaffected exporter versions, and insufficient predicates remain unchanged and explicitly ambiguous or unclassified.
- Final ZIP: `/Users/niels/Documents/Templates/template-package-fill-stack-two-solids-corners.zip`; 19,211 bytes; SHA-256 `a080321e8689a342f64dca1d3e38b462a07042b04411f1d746af18fcb572bb47`; package/root `pkg_465_72_1784462354328` / `465:72`; exporter 0.6.0; template 7,538 bytes / `368d5813…ad5f`; preview 1000×1500, 11,451 bytes / `0644bd23…dd4`.
- Target `465:73` is a 710×880 RECTANGLE with index 0 red (`a=1`, opacity 1), index 1 blue (`a=0`, opacity 0), both `visible:true`, both NORMAL, node opacity 1, no stroke/effect/rotation/mask relationship, and corners top-left/top-right/bottom-right/bottom-left `120/48/84/24`. No selected-node screenshot was supplied; this is recorded rather than inferred.
- Normalization publishes mirrored-alias provenance for both paints. Preview centre is exact red `[92,38,56]`; representative outside/inside boundary samples at each distinct source corner confirm the one node-level rounded geometry. Because blue has zero effective opacity, this fixture is corner-geometry evidence; prior 60% and three-layer fixtures remain the evidence for multiple contributing paints and repeated source-over.
- Added [the durable runtime contract](ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md), Accepted ADR 0064 for opacity provenance, and Proposed ADR 0065 for a later singular SVG stack/clip owner. Formal gate result is Result A.
- No general paint-stack resolver, runtime route, SVG owner, fixture registration, candidate, reference, or tolerance change was made.
- Final verification passed: exact-fixture strict lifecycle; `pnpm test`; `pnpm exec tsc -b --pretty false`; `pnpm build`; `pnpm test:diagnostic-zips`; and `pnpm docs:verify` (124 Markdown files / 239 local links). Focused coverage includes strict predicate, raw-source precedence, apply-once/idempotence, ambiguity, strict serialization, and resolved-tree provenance.
- The main production JavaScript is 940.29 kB / 273.37 kB gzip, +6.00/+1.34 kB over the prior recorded build. This is importer/source-contract compatibility code; no paint-stack runtime owner was added. The existing large-chunk warning remains known.
- Immutable-state proof: fixture manifest `403d3be6…abb2`; package/lock `7f3feb4f…0acd` / `3826d8d4…7529`; candidates 7,177 / `e0aa6436…3cdb`; renderer references 48 / `204d6766…5ede`; scene references 4 / `b788f6f1…f54b`; settlement references 80 / `c8295ff4…296e`. No update command ran.

Exact next step: obtain separate approval for proposed Milestone 7.4. Do not broaden it beyond eligible rectangular multiple-SOLID NORMAL stacks.

## Corrected reverse-control intake completed in the previous task

- Re-hashed the exact replacement path before inspection: 17,064 bytes, ZIP SHA-256 `83e0345c7e85aac44f089de56a8c0bcf1d8a9968b45de338e18c34547730d8ff`; package/root `pkg_459_50_1784461254306` / `459:50`; exporter 0.6.0; template SHA-256 `1ad6630c…b9ab`; preview 1000×1500, SHA-256 `5c42c21d…9864c`.
- Confirmed target `459:51` is a genuine reverse array: index 0 red, index 1 blue. Preview interior `[175,174,203]` is within one channel of ascending source-over `[175,174,204]` and differs materially from reversed evaluation `[140,112,132]`, first-only `[152,118,126]`, last-only `[211,223,246]`, and doubled-opacity `[189,183,200]`.
- Confirmed the exact remaining source gaps: no `extensions.figma.rawFills`, no SOLID provenance/alias/apply-once record, `cornerRadius:0`, `cornerRadii:null`, and no new selected-node screenshot.
- Audited the workspace for the exporter serializer. This repository contains only the ZIP importer/normalizer and strict package contracts. `/Users/niels/Documents/Template Exporter tool` is a 21-line sample Figma codegen plugin and is not the exporter that emits these packages. No speculative edit was made to it, and no canonical data was mislabeled as raw Figma evidence.
- Verification passed: exact-ZIP strict lifecycle; `pnpm test`; `pnpm exec tsc -b --pretty false`; `pnpm build`; `pnpm test:diagnostic-zips`; and `pnpm docs:verify` (121 Markdown files / 232 links). No exporter-specific test could be added or run because the real serializer is unavailable.
- Immutability evidence is unchanged: production `src` `494681f4…8aa2`; approved renderer/scene/settlement aggregates `204d6766…5ede` / `b788f6f1…f54b` / `c8295ff4…296e`; fixture manifest `403d3be6…abb2`; candidates `e0aa6436…3cdb`; rebuilt `dist` `6acb75b0…6fdf`. Bundle delta is zero.
- Exact next step: provide the real exporter source (if Codex should patch it) or a provenance-corrected 0.6.x export of the already reversed node, with four non-zero independent corners and one selected-node screenshot. Do not request another order-control change.

## Initial ordered NORMAL fill-stack intake completed in the previous task

- Hashed and audited seven exact ZIPs and six selected-node screenshots. Full identity, node records, source pixels, model comparisons, and mixed-layer evidence are in [the intake](ORDERED_NORMAL_FILL_STACK_INTAKE.md).
- All seven ZIPs pass the strict realistic-ZIP lifecycle. Normalization preserves SOLID order/visibility and hydrates the mixed linear gradient only from raw source index 1; strict validation passes.
- Source index 0 is backmost and increasing indices move toward the visual front. The three-SOLID preview matches repeated source-over within one channel; reverse, first-only, last-only, average, and doubled-opacity models are decisively rejected.
- Hidden source index 1 is preserved canonically and as `hidden-preserved`, contributes no pixels, and leaves indices 0 and 2 in order. Current runtime remains complete compatibility with explicit hidden/multiple/partial-paint reasons.
- The two alleged reverse controls are not reversed: both contain blue index 0 then red index 1, and both embed the same preview SHA-256 `3082b8106276d0bcbb30e660ce002f640297bf91002f84e3fdda1e05560b9002`.
- Every partially transparent SOLID duplicates its panel percentage in `color.a` and `paint.opacity`, has no `extensions.figma.rawFills`, and matches source only when that percentage is applied once. `color.a × paint.opacity` is up to 50 channels wrong. No unproven field-precedence rule was invented.
- Node `459:59` separately proves node opacity is applied after the completed stack and remains outside the first production boundary.
- Mixed node `459:68` proves SOLID below a certified 0.5 linear gradient; node `459:61` proves an opaque IMAGE asset painted at 0.5 over a SOLID using existing FILL placement. Both stay later sub-milestones.
- Every supplied stack has zero corners, so shared independent-corner clipping remains unproven even though one singular SVG stack owner is technically feasible.
- Historical formal result was Result B on three gaps. The 2026-07-19 revision closes the reversed-array gap; only provenance and independent-corner screenshot evidence remain.
- No runtime, schema, normalization, resolver, diagnostic, test, fixture manifest, candidate, approved reference, package script, lockfile, or production bundle changed.
- Current-run verification: all seven strict realistic-ZIP lifecycle runs passed; `pnpm docs:verify` passed for 121 Markdown files and 232 links; production/manifest/package/lock/candidate/reference/dist aggregates remain byte-identical to the pre-intake baseline recorded in the intake document.

Historical next step was to close exporter provenance and shared corners. The current Result A record at the top supersedes this request.

## Phase 7 completion audit completed in this task

- Read the accepted primitive, stroke, gradient, appearance, authority, routing, status, fixture, and ADR records and traced current source-to-render ownership.
- Audited all 17 exact ZIPs in `/Users/niels/Documents/Templates`, including the 12 manifest-registered fixtures and five unregistered evidence archives. Exact bytes, hashes, package/root identities, and relevant occurrences are recorded in [the audit](PHASE_7_PAINT_STROKE_COMPLETION_AUDIT.md).
- Found 141 SOLID fills, 21 IMAGE fills, 29 linear-gradient fills, one SHADER, one VIDEO, and 15 SOLID strokes. Eight nodes have multiple fills. No node has multiple strokes.
- Found five semantic SOLID+IMAGE nodes across six archive occurrences, two complex SOLID/other/linear stacks, and one VIDEO+IMAGE stack. None is isolated enough to certify general ordered-stack behavior.
- Found no radial/angular/diamond gradient, gradient stroke, dash, cap/join/miter, per-edge weight, hidden paint, or multiple-stroke occurrence. Only bb-cover `421:25` uses a non-NORMAL paint blend (`DARKEN`).
- Confirmed the general runtime gap: canonical arrays and observational appearance contracts preserve order; resolved/compatibility paths independently choose the first SOLID and first IMAGE, and the primitive route rejects multiple visible paints. This is not ordered paint-stack authority.
- Formal result is Result B. The exact V1 gap is ordered `NORMAL` fill stacks for supported paint families with one owner, per-paint alpha/opacity/visibility, shared clipping, all-surface identity, persistence, and guarded evidence.
- Recommended exactly one next fixture family: ordered multiple fills with `NORMAL` blending. The first later production subset should be multiple SOLIDs only; mixed linear/image layers remain later sub-gates within that family.
- Advanced gradient families are Tier 2/3; open-path/advanced stroke work waits for Phase 8 geometry; non-NORMAL paint blend waits for Phase 9 isolation/compositing.
- No production or evidence tooling changed. No fixture was registered, no candidate was generated, and no update command ran.

Historical next step: the requested fixture family was supplied and audited. The current corrected-source request is now authoritative and is recorded above.

## Milestone 7.3A approval and promotion

The user accepted the Result A visual review on 2026-07-18 and explicitly authorized guarded promotion from `milestone-7-3a-all-regression` for `gradient-test-linear` and `gradient-test-paint-opacity` across Validate, Fields, editor, and PNG export.

- Exactly 16 approved renderer files were created: one `reference.png` and one normalized `structure.json` for each of the eight approved fixture/surface pairs.
- The 32 pre-existing approved renderer files remain byte-identical at aggregate `ddf89792caa8030e892e5d14d87e7aaccd43fa8374bbb7612f6c9491063fec6e`.
- The complete 48-file renderer-reference aggregate is `204d676628098e9440634be7fa33b73d79937fb9a2edc3ef5aefd17e2d065ede`.
- Scene remains 4 files / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`; settlement remains 80 files / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. No scene or settlement update command ran.
- Fresh guarded renderer run `milestone-7-3a-promotion-verify` passes all eight comparisons pixel-exact with equal geometry and two stable captures per surface.
- The source-preview residual pixels `(481, 201)`, `(508, 744)`, and `(511, 745)` in `gradient-test-linear` are accepted deterministic rounded-edge antialiasing. No renderer correction or comparison-tolerance change is authorized.
- The historical one-pixel now-hiring Validate inspection-outline variation remains unrelated rasterization evidence. Its approved reference was not replaced.
- No candidate outside the two approved gradient fixtures was promoted. No production implementation, schema, normalizer, resolver, runtime ownership, diagnostic, test, or tolerance changed during promotion.

Promotion verification:

- `pnpm test`: passed.
- `pnpm exec tsc -b --pretty false`: passed.
- `pnpm build`: passed at 934.29 kB / 272.03 kB gzip main JavaScript; known large-chunk warning only.
- `pnpm test:diagnostic-zips`: both strict fixtures passed.
- `pnpm appearance:baseline`: all twelve projections valid and deterministic.
- `pnpm docs:verify`: passed after the documentation update.
- `pnpm fidelity:compare -- --fixture gradient-test-linear,gradient-test-paint-opacity --surface validate,fields,editor,png-export --run-id milestone-7-3a-promotion-verify`: all eight approved comparisons passed.
- Full-manifest `pnpm scene:compare` and `pnpm settlement:compare` guards ran and remained non-clean for their already documented historical differences and unapproved newer fixtures. They wrote candidates only; approved aggregate identities remained unchanged.

Milestone 7.3A is fully closed. `GRADIENT_LINEAR` is part of the approved renderer baseline only for the source-certified bounded subset. Radial/angular/diamond gradients, gradient strokes, mixed paint stacks, blends, masks, effects, shaders, Canvas/WebGL, and general compositing remain outside this authority.

## Milestone 7.3A completed in this task

- Hydrated strict canonical linear-gradient stops/transform from the exact same raw source paint index while preserving `rawFills`, aliases, provenance, normalization revision, and conflicts.
- Added `ResolvedLinearGradientGeometryV1`: normalized node-local-to-gradient matrix, determinant, exactly one inverse, start/end/third handles, current-bounds template/SVG geometry, ordered stops, independent alpha, paint opacity, runtime owner, fallbacks, and source/geometry revisions.
- Extended the singular primitive SVG owner to eligible isolated FRAME/RECTANGLE gradients. Compatibility CSS fill/radius output is disabled for that owner. Uniform/independent corner clipping and pure node rotation retain their existing authorities.
- Added explicit complete fallbacks for missing/conflicting source, malformed/singular matrices, invalid stops/opacity, mixed paints, strokes, node opacity, masks, effects, blends, media/vector owners, and unsupported geometry.
- Added a current-canonical source-revision check so stale resolved gradient geometry cannot render.
- Registered exact `gradient-test-linear` and `gradient-test-paint-opacity` fixture bytes. Both are intentionally asset/font/field-free.
- Added focused canonical, conflict, matrix, inversion, handle, stop, opacity, resize, rotation, corner, fallback, singular-owner, deterministic-ID, resolved-tree, and stale-revision tests.
- Added source-region/all-surface evidence, persistence/offline scenarios, performance measurement, and gradient scripts.

Current evidence:

- `fidelity/candidates/milestone-7-3a-linear-gradient/`: two fixtures × four surfaces × two captures, all exact repeats.
- `fidelity/candidates/milestone-7-3a-all-regression/`: twelve fixtures × four surfaces × two captures, all repeatable; 40/40 comparable pre-gradient structures equal and 39/40 pixels exact against the prior all-fixture run. The sole difference is one now-hiring Validate raster pixel with unchanged geometry.
- `fidelity/evidence/milestone-7-3a-gradients/milestone-7-3a-linear-gradient/`: source/current/diff/region/structure packet.
- Source vs PNG: `gradient-test-linear` 3 pixels / 0.0002%; `gradient-test-paint-opacity` exact.
- Headless and visible save/reload with Figma blocked: identity equal; zero runtime requests.
- Historical pre-approval guard: eight `unapproved` states. Superseded by the Result A promotion and clean targeted renderer comparison recorded above.
- Crop, editable-media replacement/reset/stale work, mask, primitive, stroke, runtime routing, exact-font, and text-trim regressions pass at their established evidence levels.
- Historical implementation-run renderer aggregate before/after promotion review: 32 files / `ddf89792caa8030e892e5d14d87e7aaccd43fa8374bbb7612f6c9491063fec6e`. Superseded by the approved 48-file aggregate recorded above.
- Main JS: 934.29 kB / 272.03 kB gzip; +13.73/+3.69 kB versus the prior recorded build. Test/evidence code is excluded.

Exact current boundary: Milestone 7.3A is closed. Begin no broader gradient/compositing work without a separate source-certified milestone and explicit approval. Radial/angular/diamond gradients, gradient strokes, mixed paints, node opacity combinations outside the certified case, blends, masks, effects, shaders, Canvas, and compositing remain out of scope.

## User approval and current boundary

Milestone 7.2 is explicitly approved. Its 18 remaining pixels at the ancestor-clipped OUTSIDE edge are accepted as deterministic antialiasing variance. Do not add renderer-specific correction logic for them. At the Milestone 7.2 approval boundary all approved renderer, scene, and settlement references were unchanged; the later authorized Milestone 7.3A renderer promotion is recorded above.

Milestone 7.3A was separately approved and completed as the bounded source-certified linear-gradient authority-transfer milestone. It did not begin effects, compositing, masks, Canvas, gradient strokes, other gradient types, or unrelated primitive work.

The cumulative gradient-test evidence closed the source-authority gate on 2026-07-18. Preserve the established matrix direction, one-inverse handles, stop/interpolation, stop alpha, paint opacity, compositing, non-square diagonal, node-rotation, independent-corner, and controlled-resize findings. Accepted ADR 0063 and `LINEAR_GRADIENT_RUNTIME_AUTHORITY.md` now govern the implemented subset.

The user explicitly approved the separate asset-free lifecycle correction on 2026-07-18. Keep it in the production importer and canonical validation path. Empty or omitted asset authority is valid only for genuinely zero-dependency packages; declared assets and unresolved node or media-field dependencies remain blocking.

## Milestone 7.2 completed and approved

- Registered exact fixture `stroke-test-primitives` and bound filename, size, ZIP/template/preview hashes, package/root/exporter identity, canvas, source nodes, source regions, paints, strokes, corners, and clipping.
- Added safe source normalization for an omitted `assets.json` only when `template.json` explicitly declares no assets and no node, paint, field, vector, or preview reference exists. Missing manifests with any declaration/reference remain blocking.
- Extended `PrimitiveAppearanceV1` with explicit independent corner order, raw/effective values, per-corner edge-local normalization factors, source/fill/inner/centre/outer/visual stroke bounds, ancestor clip chain, SVG backend, and geometry telemetry.
- Implemented the Figma edge-local clamp: each corner takes the smaller scale of its two adjacent edge constraints. Source `[999,999,0,999]` at 181×209 resolves to `[90.5,90.5,0,104.5]`.
- Kept layout authority unchanged. INSIDE/CENTER/OUTSIDE stroke geometry is non-layout-affecting and recomputes from current settled bounds.
- Kept uniform INSIDE on its proven CSS inset owner. Independent-corner INSIDE and eligible CENTER/OUTSIDE use one SVG fill/stroke owner with no CSS/compatibility duplicate.
- Preserved source ancestor clipping independently from primitive overflow. Expanded self-clipped primitives remain compatibility-owned pending a real fixture.
- Added fixture-bound source evidence, regional/full pixel diffs, structural SVG/path telemetry, headless/visible repeated captures, performance coverage, and save/reload/offline evidence.
- Added ADRs 0057–0061 and updated the architecture, authority, capability, fixture, scene migration, settlement, routing, convergence, status, and repository guidance documents.

## Exact source and results

- Fixture: `/Users/niels/Documents/Templates/template-package-stroke-test.zip`
- Size: 32,574 bytes
- ZIP: `53564876e6bf9d9924528eefbbd8eea9ab8f176bb91bef731c0f9785c3b3eb29`
- Template: `28b6720e417ea339a432ff79f127b34a191801c975e121c73a4ac0d18f0c75a9`
- Preview: `8fb0bca096694f177f02871fa4dd775b8ae51c7fc510bfcf4b848a1a17e1c4be`
- Package/root/exporter: `pkg_443_87_1784276898719` / `443:87` / 0.6.0
- Canvas: 1200×630
- Fields/assets/fonts: none

Source-preview pixels:

- compatibility before: 13,193 / 1.745106%;
- final: 18 / 0.002381%;
- `443:88`, `443:89`, `443:94`, `443:95`: exact;
- `443:90`: 18 / 0.043253%, confined to the ancestor-clipped OUTSIDE raster edge.

## Evidence paths

- Compatibility before: `fidelity/candidates/milestone-7-2-compatibility-before/`.
- Final headless: `fidelity/candidates/milestone-7-2-final-edge-local/`.
- Final visible: `fidelity/candidates/milestone-7-2-final-edge-local-headed/`.
- Final all fixtures: `fidelity/candidates/milestone-7-2-all-final/`.
- Source packet: `fidelity/evidence/milestone-7-2-strokes/milestone-7-2-final-edge-local/`.
- Reload/offline: `fidelity/evidence/milestone-7-2-strokes/milestone-7-2-reload-headless/` and `milestone-7-2-reload-headed/`.
- Performance: `fidelity/evidence/milestone-7-2-strokes/performance.json`.

## Verification completed

- `pnpm test`: passed.
- `pnpm exec tsc -b --pretty false`: passed.
- `pnpm build`: passed at 920.44 kB / 268.27 kB gzip main JS; known large-chunk warning only.
- `pnpm test:diagnostic-zips`: both strict ZIPs passed.
- `pnpm appearance:baseline`: all ten projections valid and deterministic.
- `pnpm runtime-routing:stage4a`: passed font and root-resize gates.
- `pnpm runtime-routing:scenarios`: all nine edit/reset/image/resize scenarios stable and ready.
- `pnpm runtime-routing:fonts`: passed exact-font evidence.
- `pnpm runtime-routing:text-trim`: passed.
- `pnpm image-placement:crop-evidence -- --run-id milestone-7-2-all-final`: unchanged 816-pixel crop-region evidence.
- `pnpm image-placement:replacement-authority -- --run-id milestone-7-2-media-regression`: top/main/bottom and stale-work cases passed.
- `pnpm mask:source-evidence -- --run-id milestone-7-2-all-final`: unchanged 2,262 full / 1,461 region pixels.
- `pnpm primitives:source-evidence -- --run-id milestone-7-2-all-final`: unchanged Milestone 7.1 regional results.
- `pnpm primitives:stroke-source-evidence -- --run-id milestone-7-2-final-edge-local`: passed source and all-surface identity checks.
- Headless and visible two-pass four-surface captures: stable; real PNG included.
- Headless and visible save/reload with Figma blocked: identity equal, zero Figma requests, no console messages.
- All-ten-fixture capture: 40/40 surfaces stable; 36/36 comparable pre-existing surface pixels exact against Milestone 7.1.
- Guarded fidelity/scene/settlement comparisons: nonzero as expected for historical differences and unapproved fixtures; no update command ran.
- `pnpm docs:verify`: run after final documentation edits; see current command evidence in the completing task report.

No lint script exists; lint was not run or reported.

## Files changed

Runtime/contracts:

- `src/template-package/primitives/types.ts`
- `src/template-package/primitives/resolvePrimitiveAppearance.ts`
- `src/template-package/resolved/createResolvedRenderTree.ts`
- `src/template-package/render/TemplatePackageRenderer.tsx`
- `src/template-package/bundle/assetManifestAdapter.ts`
- `src/template-package/bundle/loadTemplatePackageBundleSource.ts`

Tests/harness:

- `src/template-package/primitives/primitiveAppearance.test.tsx`
- `src/template-package/render/TemplatePackageRenderer.test.tsx`
- `src/template-package/bundle/templatePackageBundle.test.ts`
- `fidelity/fixtures.json`
- `scripts/fidelity/fidelity.test.mjs`
- `scripts/fidelity/browser.mjs`
- `scripts/fidelity/model.mjs`
- `scripts/primitives/stroke-source-evidence.mjs`
- `scripts/primitives/browser-scenarios.mjs`
- `scripts/primitives/performance.mjs`
- `package.json`

Documentation:

- `AGENTS.md`
- renderer-fidelity index, architecture/data flow, property authority, capabilities, fixtures, appearance, primitive, scene migration, settlement, routing, convergence, status, and handoff files
- `PRIMITIVE_STROKE_GEOMETRY.md`
- closed `PRIMITIVE_STROKE_FIXTURE_GATE.md`
- ADRs 0057–0061 and decision index

Generated candidate/evidence directories are unapproved artifacts, not references.

## Known limitations and exact next step

- The 18 source-diff pixels at the ancestor clip edge remain a Chromium/SVG versus Figma raster-edge difference; geometry is identical and deterministic.
- Primitive self-clipping with an expanded stroke is compatibility-owned.
- Corner smoothing, transforms, partial/multiple/gradient strokes, independent widths, dashes/caps/joins, and layout-included strokes remain unsupported or compatibility-owned.
- ADR 0010 and ADR 0012 remain Proposed. No shared post-measurement appearance graph or Canvas backend was introduced.

## Milestone 7.3 fixture-gate audit

- Audited the exact registered fixtures and every ZIP currently in `/Users/niels/Documents/Templates` (eleven filenames).
- Found only two `GRADIENT_LINEAR` sources: bb-cover `421:25` and main-visual root `2453:1435`.
- Rejected both as authority fixtures. Bb-cover is a SOLID + IMAGE + `DARKEN` gradient stack; main-visual is a SOLID + unsupported SHADER + gradient stack.
- Confirmed that complete `gradientStops` and `gradientTransform` survive under `extensions.figma.rawFills`, while the corresponding canonical gradient entries in these exports omit them.
- Confirmed that the strict schema/type can represent stops and transform, `PaintStackV1` is observational, `resolveFill` diagnoses the gradient as unsupported, and the renderer has no gradient pixel owner.
- Added `LINEAR_GRADIENT_FIXTURE_GATE.md` with ten isolated source cases, exact intake metadata, the unresolved semantic inventory, resize/reload/offline/all-surface requirements, fallback boundaries, and guarded reference policy.
- Accepted ADR 0062 as a gate decision only. It does not accept any gradient coordinate model, backend, or renderer result.

Gate-run documentation files changed: `AGENTS.md`; renderer-fidelity README, capabilities, fixtures, property authority, feature trace, duplicate interpretations, appearance contracts, primitive paints, status, handoff; the new fixture-gate document; ADR 0062 and its index. Runtime, schemas, tests, fixtures, candidates, and approved references were not changed.

Current gate-run verification:

- `pnpm docs:verify`: passed, 114 Markdown files and 199 local links;
- exact external directory audit: eleven ZIP filenames, two gradient-bearing packages, zero qualifying packages;
- renderer approved references: 32 files, aggregate `ddf89792caa8030e892e5d14d87e7aaccd43fa8374bbb7612f6c9491063fec6e`;
- scene approved references: 4 files, aggregate `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`;
- settlement approved references: 80 files, aggregate `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

The runtime/type/build/browser suites were not rerun for this documentation-only gate because no production, schema, harness, fixture-manifest, candidate, or reference file changed. The completed Milestone 7.2 verification immediately above remains the latest runtime evidence and is now explicitly user-approved.

The original isolated-fixture intake request is superseded by the accepted gradient-test evidence and the narrower supplementary request recorded below. Milestone 7.3 remains correctly blocked before production implementation.

## Asset-free lifecycle correction — 2026-07-18

This is deliberately separate from gradient rendering authority.

Approval status: accepted for production by the user on 2026-07-18. No further implementation work is requested.

- `loadTemplatePackageBundleSource` now treats image-field `defaultValue`, `assetRef`, and `typedRef` as asset dependencies both when deciding whether an omitted `assets.json` may normalize to an empty registry and when resolving imported asset references.
- Canonical validation rejects an image field when it declares imported asset references but none resolves, including when `assets.json` exists and is explicitly empty.
- The strict saved-template lifecycle no longer assumes every realistic fixture contains an image, a historical byte-size mismatch, or editable text. It still verifies managed storage/aliases for every declared asset and editability for every declared testable field.
- Focused tests prove valid explicit-empty and normalized-omitted asset registries remain accepted, while package declarations, node references, and media-field references remain blocking dependencies.

Files changed for this correction:

- `src/template-package/bundle/loadTemplatePackageBundleSource.ts`
- `src/template-package/validateTemplatePackage.ts`
- `src/template-package/bundle/templatePackageBundle.test.ts`
- `src/template-package/lifecycle/zipSavedTemplateLifecycle.test.tsx`
- `docs/renderer-fidelity/STATUS.md`
- `docs/renderer-fidelity/HANDOFF.md`
- `docs/renderer-fidelity/LINEAR_GRADIENT_FIXTURE_GATE.md`
- `docs/renderer-fidelity/LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md`

Current-run verification:

- `pnpm test`: passed against `template-package-deal-of-the-week-post.zip` (`96866712f10271407a182d3a905e112b2eb1b9170257c4d8fe6d05c9a7311b05`).
- `TEMPLATE_PACKAGE_LIFECYCLE_ZIP=/Users/niels/Documents/Templates/template-package-gradient-test.zip pnpm test:realistic-zip`: strict full lifecycle passed for the exact asset-free ZIP (`aa55a9c4413f72c443b646bcf257cc21e6fbb465e500da0decbe7cbb184b01f8`).
- `pnpm exec tsc -b --pretty false`: passed.
- `pnpm build`: passed at 920.56 kB / 268.34 kB gzip main JavaScript, a +0.12/+0.07 kB delta from the recorded Milestone 7.2 build; known large-chunk warning only.
- `pnpm test:diagnostic-zips`: passed for both strict image-bearing diagnostic ZIPs.
- `pnpm docs:verify`: passed for 116 Markdown files and 209 local links.
- Approved directories remain 32 renderer, 4 scene, and 80 settlement files; none were modified in the current run and no update command ran.

No lint script exists; lint was not run or reported.

No gradient schema, canonical projection, resolver, renderer, runtime ownership, fixture registration, candidate, or approved reference changed.

The original supplementary request is superseded by the gradient-test-2 decision below. Independent corners and diagonal non-square geometry no longer need additional source cases.

## Gradient-test-2 supplementary intake

Formal decision: **Result B — gate remains open**.

- Exact archive: `/Users/niels/Documents/Templates/template-package-gradient-test-2.zip`; 588,502 bytes; ZIP `c2a41a23ed57651f50406bf645779191480eca38514c2a748cbe5b064ad6890a`.
- `template.json`: 39,215 bytes / `e55bfdfce84b9c3dcf36913d6e95008456abfc50e59d8aa6e832d5436958066f`.
- `preview.png`: 549,065 bytes / `f585ca5e13695d1a04f85f8006570b7e8341d3f049e912a6ff0f30200c32d698`; 1000×1500 RGBA.
- Package/root/exporter: `pkg_451_135_1784370704869` / `451:135` / 0.6.0; ten nodes, nine linear gradients, zero assets/fonts/fields.
- No selected-gradient handle screenshot or coordinate probe was supplied. Raw matrices and preview samples remain consistent with normalized node→gradient direction and one inverse, but the third-handle meaning is not independently certified.
- `451:175` is a strong 554×240 diagonal non-square case; interior source samples agree within one channel value.
- `454:32` closes source-side independent-corner clipping. Source `[0,170,80,50]` resolves through the accepted edge-local rule to `[0,163.2,76.8,50]`; corner/center samples distinguish clipped background from full-box gradient by 12–98 channels and match the expected owner within 0–1.
- `454:30` is node opacity `0.699999988`, not paint opacity. Raw/canonical paint opacity remains 1. Source-over samples match the node-opacity model within 0–2, but node versus paint opacity is pixel-equivalent for this isolated fill and the paint-opacity question remains open.
- Same node ID `451:175` changes from 240×240 to 554×240, but stops change from `0.245192/0.75` to `0/1` and the matrix changes. This is not controlled resize-only evidence for unchanged gradient intent.
- Durable evidence: `LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md` and `fidelity/evidence/milestone-7-3-gradient-intake/gradient-test-2/audit.json`.
- Exact strict lifecycle: passed for the 588,502-byte ZIP at SHA-256 `c2a41a23ed57651f50406bf645779191480eca38514c2a748cbe5b064ad6890a`.
- `pnpm docs:verify`: passed for 116 Markdown files and 210 local links.
- Approved directories remain 32 renderer, 4 scene, and 80 settlement files; no approved file was modified. No candidate image, fixture manifest, production schema, resolver, renderer, runtime owner, or package script changed.

Smallest remaining request: export one further revision starting from gradient-test-2. Resize `451:175` without changing its current stops or handle intent, provide selected start/end/third-handle evidence before and after, and set `454:30` node opacity to 1 while setting the gradient paint opacity below 1. Do not recreate the independent-corner case.

No schema, normalization, canonical projection, resolver, renderer, runtime owner, fixture manifest, candidate, or reference change is authorized.

## Gradient-test-3 second supplementary intake

Formal decision: **Result B — gate remains open on paint opacity only**.

- Exact ZIP: `/Users/niels/Documents/Templates/template-package-gradient-test-3.zip`; 611,320 bytes; `d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b`.
- Template/preview: `87295fc9534b9ef47d7ea607f2e527b5b5be5535b1ac80547e8fa8fae61bb8cd` / `1a1a4575d1309c33bd09e5030d9df055231af11a0d524173043eaf05648b0d79`; preview 1000×1500.
- Package/root/exporter: `pkg_451_135_1784371485904` / `451:135` / 0.6.0.
- Selected screenshots: 554×240 state `c7e991d2c3095dc23f05833440e3139378597f8adb174a85b1613e84aadda5ce`; 710×240 state `c0dded805b00a88db724a35f10d88ea337aa9c5a5cc58e8436c5a3675bd7a88a`.
- Start/end/third mapping closes: `start=M^-1(0,0.5)`, `end=M^-1(1,0.5)`, `third=M^-1(0,1)`. Predicted third centres differ from screenshot evidence by 0.746 and 0.959 pixels.
- Controlled resize closes: node `451:175` keeps byte-identical `[0,1]` stops and transform while bounds change 554×240→710×240; normalized preview samples remain within one channel.
- Paint opacity remains open: node `454:30` has node opacity 1 and stop alphas 0.8, but raw/canonical paint opacity stays 1. This is uniform stop-alpha evidence, not paint-opacity evidence.
- Durable audit: `fidelity/evidence/milestone-7-3-gradient-intake/gradient-test-3/audit.json`.
- Exact strict lifecycle: passed for the 611,320-byte ZIP at SHA-256 `d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b`.
- `pnpm docs:verify`: passed for 116 Markdown files and 210 local links.
- Approved directories remain 32 renderer, 4 scene, and 80 settlement files; none changed and no update command ran.

Exact remaining input: one isolated gradient with raw and canonical paint opacity below 1, node opacity 1, and all stop alphas 1. No further handle, corner, diagonal, or resize evidence is needed.

No production schema, normalizer, resolver, renderer, runtime owner, fixture manifest, candidate image, bundle, or reference changed.

## Gradient-test-4 final paint-opacity intake

Formal decision: **Result A — the cumulative source-authority fixture gate is closed**. Production authority transfer remains separately proposed and unapproved.

Historical boundary note: the bullets in this section record the state at fixture-gate closure. The later separately approved Milestone 7.3A implementation, visual review, and renderer-reference promotion are authoritative in the top section of this handoff.

- Exact ZIP: `/Users/niels/Documents/Templates/template-package-gradient-test-4.zip`; 193,635 bytes; `9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3`.
- Template/preview: `2871dc698f4e69b924fd6b46cbb503067529095716ecb5a3a3814c6487413049` / `4d12e49e0b0734f092c34a9257fb3c8b6287ba07ddd638704056bdee8665afc4`; preview 1000×1500 RGBA.
- Package/root/exporter: `pkg_457_36_1784372293276` / `457:36` / 0.6.0.
- Isolated node `457:46`: one raw/canonical `GRADIENT_LINEAR`, paint opacity 0.5, node opacity 1, stop alphas 1/1, no additional fill/stroke/mask/effect, NORMAL paint blend, known opaque root background.
- Preview evidence: correct straight-RGB/independent-alpha interpolation, paint-opacity multiplication, then source-over has maximum channel error 1. RGB-only opacity has error 47, double opacity 44, and ignored opacity 90. Pixel-equivalent alternatives are rejected as source authority by the explicit exported paint/node/stop fields and cumulative prior stop-alpha evidence.
- Complete certified subset: normalized node→gradient matrix, one inverse handles, ordered nonuniform two/three stops, straight RGB plus independent alpha, paint opacity, non-square diagonal geometry, local-before-node rotation, uniform/independent corners, and current-bounds resize.
- Durable audit: `fidelity/evidence/milestone-7-3-gradient-intake/gradient-test-4/audit.json` and `LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md`.
- At this historical boundary, the next proposal was `LINEAR_GRADIENT_IMPLEMENTATION_PLAN.md` and Proposed ADR 0063. That separate approval was later granted and is recorded above.

Current-run verification:

- `TEMPLATE_PACKAGE_LIFECYCLE_ZIP=/Users/niels/Documents/Templates/template-package-gradient-test-4.zip pnpm test:realistic-zip`: passed the strict full lifecycle for the exact 193,635-byte asset-free ZIP and SHA-256 `9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3`.
- `pnpm docs:verify`: passed for 118 Markdown files and 217 local links in the final documentation pass.
- `jq empty fidelity/evidence/milestone-7-3-gradient-intake/gradient-test-4/audit.json`: passed.

No production schema, canonical normalization, resolver, renderer, runtime owner, fixture manifest, candidate, or approved reference was changed. Broader production suites were not run because only documentation and intake evidence changed.

## Embedded-browser exact-font activation correction

- The standard exact-font path still parses and matches the uploaded binary, binds its SHA-256 and face identity to a private runtime family, loads a `FontFace`, and registers it with `document.fonts`.
- A runtime that exposes CSS font loading and `document.fonts` but omits `FontFace` or `FontFaceSet.add()` now installs the same exact private family through a local `@font-face` rule.
- That CSS path becomes ready only when the private family is stable across animation frames and produces identical widths over serif, sans-serif, and monospace fallback stacks while a deliberately missing-family control remains divergent. This keeps fallback substitution observable and does not treat `document.fonts.check()` as sufficient authority.
- The style uses only the already verified package or managed-registry source. CSP/font-load failure remains blocking. PNG export continues embedding the exact binary in the cloned capture document.
- This correction does not change matching, glyph coverage, family display identity, renderer routing, measurement ownership, fixtures, tolerances, scenes, settlements, or approved pixels.
- Current-run verification on 2026-08-18: package and repository TypeScript checks passed; core/browser/React/Studio builds passed; the portable suite, SDK API contract, package-boundary check, documentation links, and Studio browser smoke passed. The smoke retained exact-font rejection, upload, atomic replacement and reuse coverage.
- The in-app embedded browser that reproduced the defect exposes neither `FontFace` nor `FontFaceSet.add/load`. With the exact CSS path active, both family variants reported `Media & fonts: Ready` and `Export: Ready`, the prior duplicate missing-font blockers disappeared, and sequential all-variant validation completed through the existing single viewport.
- `pnpm runtime-routing:fonts` passed at `fidelity/runtime-routing/font-evidence/font-evidence-2026-08-18T15-14-09-983Z`. The source-authoritative baseline was stable on all four surfaces at `fidelity/candidates/2026-08-18T15-14-34-849Z`.
- Guarded comparisons were also run and deliberately not promoted. The source-authoritative comparison failed all four now-hiring surfaces against the current approved profile. The full 19-fixture baseline was repeat-stable, while the full approved comparison retained a mixture of pass, fail, and unapproved results, including Fields-surface dimension changes in the current dirty UI worktree. No reference, fixture, scene, settlement, tolerance, or approved evidence was updated.

## SDK 0.7.0 headless host-editor boundary

- React owns the supported `editor` entry. `TemplateSessionViewport` composes
  the intrinsic `TemplateSessionRenderer` with the existing fitting model and
  binds measurement, identity, readiness, issues and capture permission to one
  live session revision.
- Editable-field hooks project ordered descriptors and resolved values into
  state-plus-mutation controllers. They delegate to the existing session
  mutations and core target/constraint authority; no field validation or
  package mutation logic is copied into React.
- The diagnostic hook deduplicates existing package, exact-font, asset,
  session and current viewport evidence. It ignores stale viewport snapshots
  and does not absorb transient field mutation failures.
- The importer preview and generic reference use the shared viewport. The
  reference uses the public controller and diagnostic hooks while retaining
  host-owned forms, image-file preparation, navigation, draft actions and PNG
  callback behavior.
- No renderer DOM, template schema, persistence record, fixture, tolerance or
  approved reference changes are authorized by this milestone.

## Adventure-travel intake after gate approval

- Gate approval is recorded; it does not authorize production implementation.
- Supplied archive: `/Users/niels/Documents/Templates/template-package-adventure-travel-pinterest-pin-ad.zip`; 331,707 bytes; ZIP `5e3c2c71384f1e809e12331927f5b1dfaffb8e259e22aec007f6ec1abf7a6147`; template `d3dc35274bb0e1574badf19099db058148ab2e7179edb48652ea5dfb541d14e4`; preview `c833d985625729a1e03961c7801ddc263616b67ebd39b377d006fc173c4340cb`.
- Package/root/exporter/canvas: `pkg_451_97_1784285744004` / `451:97` / 0.6.0 / 1000×1500.
- Only gradient: VECTOR `I451:97;7:2`, 820×1020, two opaque stops at 0/1, raw matrix approximately `[[0,1,0],[-1,0,1]]`.
- External SVG `92f547dd…773b` independently records `(410,0)→(410,1020)`. Treating the raw matrix as normalized node→gradient and inverting once derives those exact handles.
- Seven unobstructed preview samples agree with direct two-stop interpolation within one 8-bit channel value.
- The case is insufficient: canonical stops/transform remain stripped; the existing SVG asset owns pixels; no alpha/paint-opacity distinction, nonuniform/multiple stops, diagonal/general affine case, independent corners, resize state, or all-surface authority exists.
- The exact package passed identity selection, the layered import gate, managed asset storage, and zero-missing-asset checks in the strict lifecycle run. That run then failed at a historical fixture-specific assertion requiring the deal-of-the-week package's known one-byte asset mismatch. Tests were not changed.
- Durable evidence: `LINEAR_GRADIENT_INTAKE_EVIDENCE.md` and `fidelity/evidence/milestone-7-3-gradient-intake/adventure-travel-pinterest-pin-ad/audit.json`.
- `audit.json` parses successfully; `pnpm docs:verify` passes 115 Markdown files and 205 local links.
- Approved aggregate identities remain renderer `ddf89792…fec6e` (32 files), scene `b788f6f…f54b` (4 files), and settlement `c8295ff…296e` (80 files). No update command ran.

Decision: do not register this ZIP as the authoritative gradient fixture, do not write the full gradient geometry/ownership contract, and do not change production code. The later gradient-test package supersedes it as the substantial partial authority; only the documented supplementary evidence remains the exact next input.

## Gradient-test intake

- Archive: `/Users/niels/Documents/Templates/template-package-gradient-test.zip`; 470,098 bytes; ZIP `aa55a9c4413f72c443b646bcf257cc21e6fbb465e500da0decbe7cbb184b01f8`; template `35763ee58e868cbd9446ee602608afd32500c4042535a204474becf9eca964f8`; preview `751f48e63e167c6792173a3eaad24d8293550c4cacd653bebbcd4ffcf3b2cc67`.
- Package/root/exporter/canvas: `pkg_451_135_1784286420523` / `451:135` / 0.6.0 / 1000×1500; seven nodes; no assets, fonts, fields, masks, effects, or strokes.
- Six source gradients: root vertical control; 58×120 and 120×120 same-gradient size/aspect pair; 240×240 diagonal matrix; 120×120 transparent-stop case; rotated 160×160 three-stop case.
- Preview-derived samples establish normalized node→gradient matrix direction, one inverse for the stop axis, exact stop positions/order, straight RGB plus separate alpha interpolation and source-over, local gradient before node transform, and uniform rounded clipping. Opaque sample differences are 0–3 channel values; the alpha case differs from a premultiplied-stop model by 18–51 channel values while matching straight interpolation within 1–2.
- The original intake run exposed a historical strict-lifecycle assumption that arbitrary realistic fixtures contain an image asset. The separate 2026-07-18 lifecycle correction removed that invalid test assumption without changing gradient behavior. The exact ZIP now passes the complete strict save/reload/render/export-readiness lifecycle.
- Durable evidence: `LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md` and `fidelity/evidence/milestone-7-3-gradient-intake/gradient-test/audit.json`.

Historical first-fixture decision: substantial partial authority, gate still open. The gradient-test-2 section above supersedes its minimum-evidence list by closing independent corners and diagonal non-square geometry. Do not register either archive as authoritative, write the final geometry/ownership contract, or change production code yet.

## 2026-09-20 schema 2.2 singular image-policy handoff

- Canonical Image configuration now has one required `replacementPlacement`:
  Fill, Fit, or Crop. The former allowed-placement set and separate default no
  longer exist.
- Loose exporter 1.0 input remains the compatibility boundary. Cover, contain,
  and user-crop normalize to the singular policy; absent rules normalize to
  Fill with provenance. Canonical 2.0 and 2.1 inputs require reimport.
- Imported Figma placement remains separate from replacement policy. Reset
  restores imported authority. Fill and Fit uploads apply their exact policy;
  Crop accepts canonical crop data and deterministically falls back to Fill
  when a host supplies no crop data.
- Studio and the public host example upload without a mode choice. Studio uses
  one required radio group; Family variants may inherit or override it but
  cannot clear it.
- Current saved envelopes are `saved-template-session-v3` and
  `saved-template-field-family-v4`. Older work remains discoverable as
  `Reimport required`, cannot be opened, and can be deleted through raw-record
  repository paths that retain shared-asset reference cleanup.
- Renderer ownership, imported pixels, scene contracts, settlement contracts,
  fixtures, approved references, and comparison tolerances are unchanged.

- Current-run passing evidence: full and portable tests; package typechecks and
  builds; Studio and example builds; API contract; package boundaries; docs;
  `field-rules:studio`; `studio:setup`; `studio:drafts`; Family parity;
  desktop/768 px workflow acceptance; and five-pass PNG determinism. The
  23-fixture four-surface baseline was repeat-stable at
  `2026-09-20T19-28-45-934Z`.
- Guarded renderer, scene, and settlement comparisons remain non-clean from the
  existing unapproved shared-worktree state and unapproved fixtures. The legacy
  V1 replacement-authority harness also remains blocked by duplicate raw and
  type-qualified Image controls introduced before this schema milestone; the
  V2 Studio/external-host policy workflow passes. No update command, reference
  promotion, or tolerance change ran.

## 2026-09-13 carousel editor text reflow handoff

- Root cause: renderer spans stopped at imported `text.styleRanges` endpoints, so edits longer than the source string were canonical and persisted but absent from pixels and intrinsic layout measurement.
- Core correction: V2 working-package materialization reconciles a contiguous edit into derived style ranges while leaving imported base-package ranges intact.
- Renderer correction: uncovered canonical text is always painted with adjacent run styling; a main-axis FILL text child inside a compatibility-owned HUG parent uses intrinsic flex basis before shrinking at the parent cap.
- Boundary: circular FILL-inside-HUG remains diagnosed and compatibility-owned. Fixed/FILL/TRUNCATE text keeps its source geometry and clip behavior.
- Exact local evidence: carousel exporter-0.6.1 ZIP `f894b4be…1c33` rendered 30/31/75 edited title/subtitle/headline characters; both badges grew, wrapped, and respected the 640 px maximum.
- Passed: portable suite; Core and React typechecks; full Studio build; `runtime-routing:stage4a`; `studio:drafts`; `field-rules:studio`; desktop/768 px `studio:workflow-acceptance`; exact carousel browser check; 23 fixtures × four surfaces captured stably in `2026-09-13T16-58-18-728Z`.
- Existing gate state: full renderer, scene, and settlement comparisons are non-clean from earlier unapproved worktree changes and unapproved fixtures. No approved reference, candidate promotion, or tolerance was changed.

## 2026-09-14 schema 2.1 field-identity handoff

- Canonical field IDs are `<type>:<name>`; choice IDs keep the portable V1 form.
- V1, schema 2.0, and schema 2.1 inputs converge on strict schema 2.1. Saved
  templates, drafts, Families, content, order, overrides, control order and
  variant image placements migrate before current validation.
- Compatible repeated Boolean descriptors/markers share one controller and one
  binding with ordered target IDs. Different field types may share a source
  name. Conflicting Booleans and repeated non-Boolean fields remain blocked.
- False shared Booleans exclude controls bound under any target. Hidden content,
  image replacements, crop, configuration and revisions remain canonical and
  return in original order when enabled.
- Exact supplied ZIP evidence: 2,301,391 bytes,
  `d6613b5f2a8668b37d1ba190de0f9717d5a2e7f35c7e0e078cdc88b76498ab5d`;
  strict lifecycle passed and `boolean:carVis` resolved both source groups.
- Automated evidence passed: full tests and package typechecks/builds, Studio
  build, `studio:setup`, `studio:drafts`, `field-rules:studio`,
  `runtime-routing:boolean`, API contract, boundaries, repository TypeScript,
  and docs links. No renderer/golden update command ran.

## SDK hardening verification boundary — 2026-09-25

The focused SDK pass keeps canonical field/renderer semantics unchanged. Font
activation caching separates face identity from per-text coverage checks; the
exact-font evidence gate passed in this run. See
[SDK contracts](../sdk-hardening/README.md) and [verification](../sdk-hardening/verification.md).
The old full-fidelity UI driver currently times out waiting for `zip-package-input`
at `open-import`; current Studio setup and Family parity workflows pass. The
measured pre-materialization clone reduction was reverted rather than accepted
without its required pixel/geometry gate. No references or tolerances were updated.


## SDK hardening completion — 2026-09-25

The importer driver blocker recorded earlier is resolved for current Studio.
Single/Family compatibility save queues and stale-import cleanup are covered in
addition to V2. The public-only host now imports a hash-gated 0.6.1 ZIP and verifies
preview reuse, batch/incremental equivalence, selectors, replacement, removal and
persistence.

Measured Browser copying is reduced before the unchanged Core materializer.
Strict package validation memoizes only recursively immutable plain data; mutable
and newly configured input remains fully validated. All six measured workloads
retain identical output/content/readiness hashes and one materialization per edit.
The four current-export fixtures produce 16 byte-identical before/after surface
PNGs and matching geometry. Approved-reference comparisons remain unapproved;
no reference, schema, renderer owner, scene/settlement contract or tolerance changed.
See [SDK verification](../sdk-hardening/verification.md) for current-run evidence.

## Now Hiring jitter follow-up

Current work follows ADR 0094 and [the architecture report](../architecture/now-hiring-text-stability.md).
Run `node scripts/text-geometry/certify-now-hiring.mjs` for current scoped trials,
lifecycle checks, release commands and the fresh three-export gate. Retained
baseline sources regenerate through the report's failure-first commands. Keep
unknown-font/constraint fallback and native publication/export guards intact.
References, snapshots and tolerances remain protected. Completion status requires
the new durable verification record; the focused probe alone is insufficient.

Final gate `sdk-061-now-hiring-text-stability-20261010c` passes 24/12/3/12,
with all twelve reviewed PNGs byte-identical and 324 protected artifacts unchanged.
The [durable current record](../architecture/evidence/now-hiring-text-stability-20261010.json)
retains five-pair production/development trials, 48 current Now Hiring traces,
release/workflow results and original failed experiments. The initial Family
timing flag is retained and not confirmed by an independent same-source five-pair
repetition: disposition **qualified**, not an unconditional performance pass.
Stored captures were inspected; no manual live typing review is claimed.
