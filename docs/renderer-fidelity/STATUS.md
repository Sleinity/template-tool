# Renderer Fidelity Status

## SDK 2.0 release automation correction — 2026-10-16

[The release report](../architecture/sdk-host-onboarding.md) records candidate E's
local checks: all eight macOS npm/pnpm groups, portable checks, 29 tooling tests
and fresh individually source-reviewed 24/12/3/12 fidelity evidence pass. SDK
archives and starter bytes equal D; all 285 protected identities remain unchanged.
Linux and the new shared-input-action rehearsal await explicit approval for
encrypted private fixture transfer and CI-key replacement, which automatic
approval review blocked before execution. E is not yet certified for publication.
No reference promotion or runtime/API/schema change occurred; the existing
`sdk-v2.0.0` tag remains on `c6f489a`, and SDK 2.0.0 is not published.

## SDK 2.0 host release certification — 2026-10-16

[The host-delivery report](../architecture/sdk-host-onboarding.md) and [current candidate packet](../architecture/evidence/sdk-host-release-20261016d/certification.json) record GO for immutable `sdk-2-host-20261016d`: macOS/Linux npm/pnpm acceptance, 24 stable captures, 12 renderer, three scene and 12 settlement comparisons, with individual current stored-source review. D corrects publication-context documentation labels; SDK code/declarations and starter bytes are identical to C. Published 1.0.0 and prior packets remain unchanged. All 285 protected identities remain unchanged; no renderer/API/schema change or reference promotion occurred. The intended tag is `sdk-v2.0.0`; publication/tagging and registry round-trip verification remain separately approved operations.

## Family media readiness publication — 2026-10-15

[ADR 0098](decisions/0098-family-media-readiness-publication.md) and [the implementation report](../architecture/f7-readiness-publication.md) record the bounded Family-only change. Decode completion reuses the current accepted materialization/tree and projects readiness/status/error, preserving semantic references and one publication per accepted source completion. Full authoring derivation, font/line/renderer revision guards and PNG raster authority remain unchanged. Native differential, separate paired production timing and browser lifecycle evidence are retained. Fresh unpublished 1.0.0 candidate `unpublished-1.0.0-440c932335c46a7015cb074079fcd5cd2767a28d78ff8e4fe9fe0921912ece35` is GO under run `sdk-f7-readiness-20261015`; the earlier certified candidate remains immutable. Cold Cover readiness improves by approximately 90–99 ms median across two minimal paired runs; detailed warm timing differences remain a separate tracing limitation. Reproduce and review the exact evidence in the report. No API/schema, rendering capability, cache, batching, reference or tolerance change is included.


## F7 production profiling — 2026-10-15

[The bounded profile](../architecture/f7-production-profiling.md) is complete after candidate certification reached GO. Seven production workload sequences yield 120 measured steps / 60 matched observation pairs after warmup; four lifecycle diagnostics and the full-application Family smoke pass. Cover repeats 15 unchanged media-triggered derivations, about 76–77 ms aggregate detailed CPU time, with 14–15 preceding initial mount. This supports a separately scoped readiness-publication ownership/implementation plan, not a measured speedup or permission to change runtime behavior. No media derivation overlaps recorded >50 ms long tasks; decode and renderer/font settlement remain separate contributors. Production sources, archives and approved evidence are unchanged. Reproduce with `node scripts/f7/run.mjs --output /tmp/f7-new-run --trials 5`, then `scripts/f7/analyze.mjs` and `scripts/f7/validate-evidence.mjs`; retain detailed and minimal profiles separately.

## V2 SDK / exporter 0.6.1 boundary — 2026-10-15

See [ADR 0097](decisions/0097-v2-only-sdk-and-061-source-admission.md) and [the implementation/evidence report](../architecture/sdk-v2-optimization.md). The unpublished 1.0.0 candidate supports V2 hosts and exporter 0.6.1 ZIPs only; source schema 1.0 normalization and canonical schema 2.2 remain. Historical readers are test-only. Validation, primitive revision assembly and save/recovery reuse existing authorities; no visual owner, capability, provenance, settlement or export-readiness semantics changed. The three-export candidate gate is now GO after a current run-bound stored-source/capture review and fresh public host checks; see [candidate certification](../architecture/sdk-v2-candidate-certification.md). This certifies the immutable unpublished archives in the recorded environment; subsequent profiling tooling has a separate worktree identity. No reference/snapshot/tolerance/fixture/font promotion is authorized. Reproduce with the exact commands and source checkpoints in the report/evidence, followed by a fresh `pnpm sdk:gate:061 -- --run-id <unique-run>`.

## R07 Carrousel raster closure, 2026-10-13

Gate `sdk-061-r07-raster-20261013a` is GO: 24 complete stable captures, 12/12
renderer, 3/3 scene and 12/12 settlement passes with current run-bound source
reviews. [The R07 report](../architecture/r07-carrousel-raster.md) proves the
40% initial output viewport causes native sampling changes in two clipped
thumbnails, reversibly, with identical final unrounded inputs. Source review
warrants only Carrousel/editor's guarded reference update. All other references,
snapshots, tolerances, fixture/font identities, production source and R04 archive
bytes remain unchanged. No SDK release-ready claim follows from this gate.

The R01/R04 NO-GO records below are historical; their repairs and separately
bounded limitations remain intact.

## Host font registry continuity, 2026-10-12

ADR 0096 records the bounded R01 integration repair. Current evidence and limitations are in [the R01 report](../architecture/host-font-authority.md). This does not certify the complete SDK: R07 remains independently tracked, and a fresh gate result is recorded separately from packed-host tests.

Final gate `sdk-061-host-font-authority-20261012b` retains 24 stable captures,
11/12 renderer passes, three scene and 12 settlement passes. All 12 PNGs are
byte-identical to the pre-repair run. R07 remains one changed Carrousel/editor
pixel, so disposition is NO-GO. Twenty packed font scenarios, strict declarations,
npm/pnpm consumers and the complete SDK suite pass; no reference is promoted.

## Media underlay diagnostic correction, 2026-10-10

ADR 0095 corrects a generic primitive-stack warning applied to Carrousel's
already-supported SOLID → IMAGE media underlay. The existing owners, paint order,
source values and renderer output remain unchanged. Unsupported stacks retain
their existing warnings. Gate `sdk-061-media-underlay-20261010a` passes 24 stable
captures and all 12 renderer/three scene/12 settlement comparisons, with all
12 PNGs byte-identical to previously reviewed output. Current verification is in the
[media underlay report](../architecture/media-solid-underlay.md).

## Now Hiring text-update follow-up, 2026-10-10

ADR 0094 records the reproduced changed-text fallback and Studio reduced-motion
transition leak. Fresh current-DOM measurement and trim-commit validation are
bounded to the existing mounted text hooks. Studio no longer invents reduced-motion
height transitions. Gate `sdk-061-now-hiring-text-stability-20261010c` passes
24 stable captures, 12 renderer, three scene and 12 settlement comparisons, all
byte-identical reviewed PNGs and all 15 release/workflow checks. Forty-eight current
Now Hiring traces retain one geometry per accepted revision/text. Timing is
qualified: an initial Family median-handler flag [0.1, 0.3] ms remains recorded;
an independent five-pair repetition does not confirm it. See the
[Now Hiring report](../architecture/now-hiring-text-stability.md) and its durable
record for both results. No references or tolerances change. Stored captures were
inspected; manual live typing is not claimed. Failed experiments and the incomplete
oversized trace remain historical evidence and do not count as passing checks.

## Text geometry lifecycle, 2026-10-09

ADR 0093 records the bounded correction and retained pre-change reproduction. Current verification results are in the [text geometry report](../architecture/text-geometry-stability.md). References and tolerances are protected; no shared settled graph is introduced.

Final verification: `sdk-061-text-geometry-20261009d` passes 24 stable captures, 12 renderer, three scene and 12 settlement comparisons. All twelve reviewed PNG identities and 324 protected artifacts are unchanged. Thirty production and thirty development Date workload traces retain one unaffected geometry state. Isolated production timing detects no repeatable handler increase under the recorded five-pair analysis. Detailed tracing costs and the repaired analysis-harness defect remain explicit in the durable record. Stored captures were inspected; manual live typing is not claimed.


## 2026-10-07: observational mask gate closed

ADR 0092 projects the existing exact rectangular ALPHA mask resolution into
observational settlement. Carrousel's declared source/parent/sibling scope,
canonical bounds, clip insets and revision match the exact ZIP and all four
recorded browser surfaces. Dependency metadata preserves complete Figma IDs;
unknown properties invalidate safely, and output-route provenance omits
volatile editor IDs. Missing, stale or unsupported mask evidence remains
unresolved. Production pixels, canonical scenes and runtime authorities did
not change.

Run `sdk-061-mask-settlement-final-20261007a` has two complete stable captures per
surface. All 12 renderer comparisons, three scene comparisons and 12 reviewed
settlement bundles pass. The complete SDK gate, public single host and Color
browser lifecycle report **GO**. This supersedes the earlier mask-range no-go
below. General masks and the full observational graph remain outside runtime
authority. [Current evidence](OBSERVATIONAL_MASK_SETTLEMENT.md) records hashes,
commands, guard tests and review limits. The next separate milestone is
internal compiler-result consolidation, without a production-session switch.

## 2026-10-07: three-export source review and bounded Cover fade

ADR 0091 selects one source-property-gated owner for Cover's exact opaque
SOLID → FILL IMAGE → DARKEN linear-gradient stack. The fade and SVG arrow now
appear together on all four capture surfaces and in a live Studio Cover editor
review. A separate source-backed HUG text measurement correction removes the
browser's terminal letter-spacing contribution; Now Hiring's 306/405 px
exported text boxes now measure about 305.6/404.7 px. The exact-font two-pass
run `sdk-061-three-review-final-20261007a` is complete and stable for all
three exports. Twelve individually reviewed renderer references and three
observational scene snapshots now pass. Eight ready Now Hiring/Cover
settlement bundles pass. Carrousel's four settlement bundles remain unapproved:
node `987:6813` retains an unresolved observational `mask-range` dependency.
The active SDK gate is **no-go** pending that separate contract decision. See
the [three-export baseline](../architecture/sdk-061-three-export-baseline.md)
and [tracked dispositions](../../fidelity/gates/sdk-061-dispositions.json).

## 2026-10-06: bounded Matrix and Matrix 2 compositing owner

ADR 0090 adds one internal, source-property-gated paint and group owner for the
opaque exporter 0.6.1 subset. It retains exact source colors and paint order,
distinguishes pass-through from isolated NORMAL/OVERLAY groups, and suppresses
the former singular-background owner. The first two-pass capture sharply
reduces source-preview differences; remaining strong differences are confined
to photographic image regions. Final-run evidence and comparison disposition
are in the Phase 9 source gates. Cover's mixed image/gradient fade and missing
approved Matrix references keep the overall fidelity gate **no-go**. No golden,
snapshot, or tolerance was changed.

## 2026-10-06: live Matrix 2 paint setup verified against the re-export

The supplied [Figma Matrix 2 node](https://www.figma.com/design/Tb4DXmBGjBDkJ9eoBQwFYO/Niels-s-AI-Playground?node-id=1099-218&m=dev)
was inspected read-only. Its 14 nodes and 14 paint entries match the current
ZIP's exact floats, order, modes, visibility, group opacity, and hierarchy.
The same external ZIP path now contains a new byte version; the old capture
remains historical and a fresh exact-byte two-pass capture was made. The
third `OVERLAY` group's three sampled image-interior pixels now support a
bounded isolated-child/group-Overlay model. They do not establish general
Overlay or transparent-edge behavior. Current renderer output still differs;
references remain unapproved. See [the source gate](PHASE_9_GROUP_CONTROL_SOURCE_GATE.md)
and ADR 0089. No production runtime authority changed; Phase 9 and the
active three-export SDK gate remain **no-go**.

## 2026-10-05: Matrix 2 certifies bounded group source behavior

The exact exporter 0.6.1 Matrix 2 ZIP supplies matched `PASS_THROUGH` and
`NORMAL` groups with identical DARKEN/MULTIPLY/SCREEN children and 80% group
opacity. Eighteen flat-strip and six image-side preview samples distinguish
group isolation and post-group opacity, including a two-paint 40%/100%
child. Canonical and observational projections retain the source. A two-pass
Validate/Fields/editor/PNG capture is complete and stable, but its current
output differs materially from the embedded preview and all four renderer
surfaces lack approved references. ADR 0088 and the [source gate](PHASE_9_GROUP_CONTROL_SOURCE_GATE.md)
record the bounded contract. No renderer owner or backend was added. The
unmatched `OVERLAY` group, transparent edge, and Cover mixed-stack fade remain
open. Phase 9 and the three-export SDK gate remain **no-go**.

## 2026-10-04: Phase 9 Matrix and Cover source gate is partial

The exact exporter 0.6.1 Matrix research ZIP preserves six named, opaque
SOLID blend modes over a CROP image and flat color. Source-pixel checks support
the serialized per-paint math at sampled locations; the current stable
four-surface capture paints DARKEN, MULTIPLY, SCREEN, and OVERLAY as plain pink.
Cover retains its SOLID + IMAGE + DARKEN gradient source stack and remains a
separate fade blocker. Neither ZIP establishes pass-through versus isolated
groups or partial-alpha order, so no compositing backend or production visual
owner was added. Result B and the next source prerequisite are recorded in
[the Phase 9 source gate](PHASE_9_COMPOSITING_SOURCE_GATE.md) and ADR 0087.
The active three-export SDK gate and approved references are unchanged.

## 2026-10-04: Cover SVG arrow has one visual owner

The exact exporter 0.6.1 Cover arrow SVG now owns its path and stroke pixels;
the VECTOR wrapper no longer adds a CSS border when that SVG actually renders.
The source stroke remains canonical data. Missing-source vectors, semantic
shapes, and ordinary non-vector strokes retain their compatibility treatment.
ADR 0086 records the ownership boundary. The stable two-pass three-export run
`sdk-061-cover-arrow-final-20261004` changed only Cover's four surfaces; its
source-sized PNG delta is confined to the 24×24 arrow node, while Now Hiring
and Carrousel captures are byte-identical to the pre-change run. Cover's
separate `SOLID + IMAGE + DARKEN` fade and unapproved references keep the SDK
gate **no-go**. No approved reference, snapshot, or tolerance changed.

## 2026-10-04: exact imported Color default preservation

The hash-verified exporter 0.6.1 Carrousel ZIP's `color:backgroundColor`
binding now keeps rectangle `987:6811` SOLID fill 0's exact source RGBA in
the normalized base, initial materialization, and Reset. The 8-bit control
hex is applied only for an explicit edit or a configured default different
from the source paint. The public three-export host check and portable Core
tests verify numeric source equality; PNG captures are regression evidence,
not the Color-value oracle. The three-export SDK gate remains no-go while
Cover source-fidelity and unapproved references remain unresolved. See
[`sdk-061-three-export-baseline.md`](../architecture/sdk-061-three-export-baseline.md).

Status date: 2026-09-20
Current status: TemplatePackage 2.2 singular Image replacement policy implemented

## 2026-09-20 — Singular Image replacement policy

TemplatePackage 2.2 replaces multi-option Image authorization and its separate
default with one required Fill, Fit, or Crop replacement policy. Imported Figma
placement stays immutable. Crop hosts may author canonical Crop; otherwise an
upload uses deterministic Fill. Draft Editors no longer expose placement mode
buttons, and Studio Fields presents one radio group. Older canonical packages
and saved envelopes require reimport and remain deletable. Renderer ownership,
layout, approved references, snapshots, and tolerances are unchanged; see ADR
0085.

## 2026-09-15 — Full-parent live mask boundary

The carousel field fixture exposed a paint defect after shared `CarVis` targets
were disabled: the intended image groups left layout correctly, but the affected
product-card retained source-derived mask insets and clipped its sibling discount
and subtitle badges. Exact full-parent, first-child, `end_of_siblings` ALPHA mask
scopes now lower to the stable parent clip boundary in editor mode. Static mask
geometry keeps the existing affected-node inset path. Focused mask regression,
the full unit suite, and live Studio evidence cover this correction. No schema,
general mask capability, renderer golden, or tolerance changed; see ADR 0084.

## 2026-09-14 — Nested and multi-target Boolean authoring

Loose V1 normalization now resolves a same-ID Boolean container plus nested
content marker into stable unique fields, and merges compatible repeated
Boolean markers into one multi-target structural binding. Browser and React
content editors omit descendant controls while any owning Boolean target is
false and restore them with retained canonical values. The supplied carousel
ZIP normalizes to strict V2 without field-ID blockers. Existing ADR 0078
structural rendering is reused unchanged; no reference or tolerance changed.

## Field Rules V2 closure corrections

The post-implementation audit's four contract defects are corrected and verified:
current runtime identity invalidates active line evaluations; finite canonical
invalid Crop remains persistable and accessible for correction; common Family
Choices reconcile independently of selected-variant presence without artificial
content revisions; shared image assets survive until their final canonical
reference disappears. No public API/schema or capability was added.

The full [closure report](../field-rules/MILESTONE_7_REPORT.md#post-implementation-closure-corrections)
records focused and broader verification. All 92 `field-rules-closure` PNGs equal
the Milestone 7 baseline; references/tolerances are unchanged. Historical guarded
failures remain separate. Field Rules V2 is closed within the established
source-certified/runtime-supported boundaries; there is no further milestone.

## Field Rules V2 Milestone 7 Studio and external hosts

Studio defaults to V2 configuration/content authoring. All seven types, stable
typed choices, opaque control roles, atomic editor ordering, Family common/sparse
configuration and shared/variant Crop controls use public Browser sessions and
the ordinary React bridge. The V1 workspace is explicitly isolated for old saved
work; no renderer-value migration is attempted. See the
[authoring guide](../field-rules/STUDIO_AND_HOSTS.md) and ADR 0081.

The actual Studio/browser proof covers rule authoring, canonical editing, line
invalid/warning/inactive states, Boolean show, Crop, PNG, reload, reviewed
reimport, selected-variant validation and sparse framing/reset. An independent
public-only host proves a brand palette, canonical Number/Date/Crop, portable
ordering and PNG. Family framing remains product/runtime evidence, not a new
multi-aspect source certification.

Integration exposed bounded contract bugs: discarded StrictMode publisher
leases, invalid Blob asset carriers, and uncorrectable existing semantic content
errors. These are corrected at the existing React/Browser/Core boundaries.
Configuration reconciliation and callbacks use current revision authorities;
renderer ownership is unchanged.

The fresh `field-rules-v2-m7` baseline is repeat-stable for all 23 fixtures × four
surfaces. All 92 first-capture PNGs are byte-identical to
`milestone-6-final-regression`. Guarded renderer/scene/settlement comparisons
retain historical fail/unapproved classifications. No approved reference or
tolerance changed. Package/lifecycle/host/runtime evidence is recorded in the
Handoff and implementation report; no broader renderer subset is promoted.

## Field Rules V2 Milestone 6 renderer-backed Textarea maxLines

Accepted ADR 0080 makes clustered line boxes from the actual mounted text paint
the sole visual-line authority. Active V2 Textareas publish revision-, font-,
settlement-, participation-, and generation-bound evidence through
`TemplateFieldSessionRendererV2`; fixed text observation does not become an
intrinsic layout input. Empty text is one line, clipping does not reduce laid-out
count, warning equality is advisory, and over-limit content remains editable
while blocking export. Structurally excluded Textareas are inactive until shown.

Session evidence updates do not rematerialize content. A session-issued
generation range plus the renderer generation and exact measurement key rejects
stale local hook state and delayed A/B/A or remounted publishers. Family
variants evaluate shared text against their selected effective geometry and
line rules without persisting counts.

The exact registered `now-hiring-post` source bytes back the focused browser
scenario. Validate-labelled, Fields-labelled, editor, and PNG renderer instances
agree on one short line, two lines at the advisory threshold, four invalid
lines, and one empty line. Invalid PNG export is rejected; corrected content
exports at 1000×1350. The focused export profile embeds the registered image
and uses deterministic system-font input; exact binary/font-epoch authority is
covered separately by the existing font and text-trim gates. No approved
reference, scene snapshot, settlement snapshot, or tolerance was updated.

Final focused evidence is
`fidelity/runtime-routing/textarea-max-lines/milestone-6-final/report.json`.
Package typechecks/builds, full and strict realistic-ZIP tests, Stage 4A,
routed/font/text-trim/Boolean/Textarea browser scenarios, the exact two-pass
23-fixture baseline, API/boundary/release/docs checks, package archives, packed
Core and external consumers, session smoke, Studio/example builds, and curated
bundle budgets pass. The packed consumer mounts the public V2 renderer bridge.
The final `fidelity/candidates/milestone-6-final-regression` run is repeat-stable
for all 23 fixtures and all four surfaces.
Guarded renderer/scene/settlement comparisons retain their documented
fail/unapproved classifications. Studio browser smoke stops at its unrelated
pre-existing Family variant-menu focus-label mismatch; the product build and
session browser lifecycle pass. No update command ran.

The final measured React renderer and V2 field-session bundle profiles are
676,937/165,009 and 1,019,080/229,618 bytes/gzip, respectively, with the normal
5% budget retained. Only requested fixed-width Textareas add an observer;
intrinsic Textareas reuse their existing measurement and there is no hidden
text tree or second wrapping pass.

## Field Rules V2 Milestone 5 canonical Image Crop and Family framing

Accepted ADR 0079 adds `TemplateFieldFamilyContentStateV3`: one shared Image
value owns the replacement asset and shared/default placement, while sparse
`variantImagePlacements[variantId][fieldId]` entries can override only Fill,
Fit, or canonical Crop for a selected variant. Family Image controllers expose
`setVariantPlacement()` and `resetVariantPlacement()`; ordinary
`setPlacement()` changes the shared default without overwriting explicit
variant framing. Replacing or resetting the shared asset clears every
asset-bound override. V2 Family records migrate once to V3 and live runtime and
new persistence use V3 only.

Resolution composes the shared asset and effective placement into an ordinary
package-scoped Image value before the existing V2 materializer and renderer.
`editor-crop` now uses the established affine CROP owner. Square, Portrait, and
Landscape slots derive centred cover crops by shrinking within the canonical
source region; canonical state is never widened or mutated. Structurally valid
but non-invertible persisted Family crops remain Crop, keep diagnostics, and
block export; renderer fallback never rewrites them to Fill.

Current-run typechecks, package/Studio builds, portable/full/strict realistic-ZIP
suites, Stage 4A and routed browser scenarios, appearance baseline, API and
package boundaries, documentation links, package archives, packed Core/external
consumers, release contract, and curated bundle probes pass.
The exact registered `deal-of-the-week-banner-crop-editable` source fixture is
repeat-stable on Validate, Fields, editor, and PNG surfaces; its established
640×640 CROP-region difference remains 0.19921875%. The full 23-fixture capture
is stable. Guarded renderer, scene, and settlement comparisons retain their
documented fail/unapproved states. The legacy replacement browser harness proves
the imported state plus first-field Fill/Fit/Fill and PNG output, then still
times out at its existing `package-editor-panel` lookup after persistence reload. No
reference, snapshot, or tolerance update command ran.

The implemented subset is host-authored canonical Fill/Fit/Crop, ordinary
single-template affine Crop rendering, shared Family asset/default placement,
and sparse variant placement framing with automatic aspect adaptation. A
dedicated exporter-authored Square/Portrait/Landscape Family crop fixture and
Studio crop UI remain outstanding evidence/UI work; no broader image stack,
mask, sampling, or renderer capability is claimed.

## Field Rules V2 Milestone 4 Boolean structural visibility

Accepted ADR 0078 makes `appearance.visible=false` a shared pre-settlement
structural exclusion. One derived participation projection removes controlled
nodes/subtrees from routing, Auto Layout participants, gaps, HUG/FILL,
measurement, media preload, masks, React content, and active export-safety
aggregation while preserving canonical topology and descendant state. The same
owner corrects V1 visibility behavior; no Boolean-specific renderer or public
API was added.

Async renderer publication now requires the repeatable semantic revision plus a
renderer-local monotonic generation. The generation advances for new package
objects and font epochs, stays outside deterministic geometry identity, and is
omitted at zero. Portable tests prove true/false/true delayed measurement and
Browser readiness rejection, vertical/horizontal gap closure, nested subtree,
padding-only empty HUG, FILL redistribution, alignment, renderer/media pruning,
persistence, and Family target switching. All package typechecks/builds, public
API/boundary checks, portable/full tests, core routing scenarios, exact-font,
text-trim, docs, and appearance checks pass. The pre-source 22-fixture baseline
and the registered Boolean fixture's two-pass four-surface capture are
repeat-stable. Guarded renderer/scene/settlement comparisons retain documented
fail/unapproved states; mask/primitive browser scenarios time out at the existing
editor-panel harness wait. No reference-update command ran.

The local 2.48 MB V2 session observation completed 20 accepted mutations in
281.30 ms (14.07 ms average) with one materialization per mutation. No separate
Boolean dependency engine or renderer instance was introduced; routing uses the
existing active-graph recomputation, while excluded React subtrees skip their
former descendant measurement and media-preload work.

Formal status is **Result A — source-certified for the registered subset**. The
exact exporter-0.6.1 fixture
`template-package-deal-of-the-week-post-boolean-v0.6.1.zip` is registered at ZIP
SHA-256 `47a109f…b6ac`. Its two authentic Boolean targets prove distinct source
behavior: `showHeadline` leaves a vertical HUG/FILL chain, shrinking the parent
from 375.69 to 112 logical px and moving the following FILL participant to y=112;
`showEnddate` leaves a fixed horizontal `SPACE_BETWEEN` row, whose 1000×32 box
and surviving logo position remain unchanged. Both controlled subtrees are
absent from DOM/measurement telemetry while false.

The focused browser run covers default Validate and Fields previews, separate
editor false/reset operations, resize-hidden-show, and real hidden PNG exports.
Reset restores byte-identical PNG output (`e2d79e…e9d77`). The default PNG is
1080×1920 and differs from the embedded source preview by 0.501254% under the
unchanged diagnostic 0.1 comparison threshold; the known Rethink Sans 600
replacement is recorded. The surviving header after headline exclusion and the
surviving logo region after end-date exclusion each have zero changed pixels
against the default PNG. No approved reference, scene snapshot, settlement
snapshot, or tolerance was changed.
Reference status: the 96-file approved renderer baseline remains guarded; scene and settlement references remain unchanged

## Field Rules V2 Milestone 3 Browser integration

Accepted ADR 0077 adds `createTemplateSessionV2()` as the canonical browser
editing path. Its typed controllers dispatch the Core reducer, cache one derived
materialization, expose ordered host-safe descriptors, and keep required
`maxLines` evidence pending until an exact revision-bound publisher responds.
Image Blob/data URL ingestion, managed asset references, object URLs, stale
completion rejection, and disposal remain Browser responsibilities.

Explicit `saved-template-session-v2` and `saved-template-field-family-v2`
records persist configured V2 packages, canonical content, and asset references;
they never persist a working package as authority. Review-first single-template
reimport uses field IDs and compatible binding kinds, preserves configuration,
choices, roles, content, and ordering, and requires reviewed removal. V2
Template Field Families resolve common configuration plus atomic sparse variant
overrides into the ordinary Core materializer while keeping one shared content
state across variant switches.

React exports V2 ownership/provider/snapshot/controller hooks with no Studio or
renderer-internal dependency. The existing V1 Studio session remains isolated
for compatibility and is not synchronized with or migrated into V2. This
milestone changes no renderer semantics or approved references; Boolean reflow,
line measurement, crop fidelity, and Studio V2 authoring remain pending.

Current-run Core/Browser/React typechecks, all package builds, the Studio build,
portable/full/strict-realistic lifecycle suites, public API contract, package
boundaries, release contract, documentation links, archive inspection, packed
Core, packed external React consumer, and curated entry-bundle gates pass. The
packed consumer compiles the V2 provider, descriptors, discriminated controller,
and typed Text mutation from real tarballs. Dedicated V2 persistence adapters
removed an initially observed 231,960-byte legacy Browser bundle regression;
legacy profiles remain within their existing budgets and new Browser/React V2
profiles have explicit measured budgets. A 20-edit session probe on a
2,476,585-byte package observed 15.87 ms per accepted mutation and exactly one
materialization per mutation in the current Node runtime.

## Field Rules V2 Milestone 2 Core semantic kernel

Accepted ADR 0076 establishes `mutateTemplateFieldContentV2()` as the single
deterministic V2 content reducer and `materializeTemplateFieldContentV2()` as
the single one-way package materializer. All seven discriminated fields now
have DOM-free Core parsing, validation, choice, warning/blocker, immutable
revision, sparse override, reset, and materialization semantics. Convenience
set/choice/image/reset functions only dispatch through the reducer.

Text uses grapheme-based limits and rejects line separators. Textarea commits
multiline content without approximating rendered lines and publishes
revision-bound pending evidence requirements. Number and Date retain canonical
values while applying bounded deterministic display formatting. Color accepts
the opaque hex subset and changes RGB only at the exact import-resolved SOLID
source index while preserving imported alpha/opacity. Image owns canonical
replacement asset plus authorized Fill/Fit/Crop state; missing overrides retain
complete imported authority. Boolean writes renderer-facing visibility only;
structural layout exclusion remains Milestone 4.

The materializer clones inputs, resolves values only from field definitions and
canonical content state, reports default/override provenance, and emits a
deterministic materialization identity. A pending configured `maxLines` blocks
export readiness but never blocks editing. Ordered host descriptors omit
renderer bindings and source provenance, and no parallel capability matrix was
added.

The production V1 browser/session/persistence/Family/React/Studio path remains
unchanged and has no hidden synchronization with V2 state. No renderer behavior,
fixture byte, approved reference, scene snapshot, or settlement snapshot was
changed.

Current-run Core and all-package typechecks pass. Portable and realistic-ZIP
test suites pass, including the new all-seven-field kernel/materializer suite.
All package builds, package-boundary checks, archive packing, documentation
links, diff hygiene, and the isolated packed-Core DOM-free consumer pass. The
intentional Core declaration baseline is 106,800 bytes / SHA-256
`d9bd14e9a6a737e61949083455374168d4f1c67a815bda3e9e72122dcbefbb5f`.

The aggregate `pnpm api:contract` command remains red only for the pre-existing
browser `SavedTemplateFamilyWriteOptions` export in the root and persistence
entries. A direct entry-by-entry comparison confirms no Core or other new API
drift.

## Field Rules V2 Milestone 1 architecture freeze

Accepted ADR 0075 freezes `TemplatePackageV2`, seven discriminated field
definitions, exact import-resolved bindings, stable choice-option IDs, portable
`editableFieldOrder`, designer-authorized image replacement modes, opaque
`#rrggbb` Color, atomic Template Family collection overrides, separately
revisioned canonical content state, and the one-way materialization invariant.

The framework-neutral Core now exposes strict V2 types/schema/semantic
validation, `normalizeTemplatePackageV1ToV2`, `parseTemplatePackageV2`,
the separately versioned canonical content-state schema/validator, portable
order reconciliation, and atomic family-configuration resolution.
Marker-only Color normalization accepts exactly one eligible SOLID fill and
blocks zero/multiple candidates. The V2 schema rejects alpha-bearing Color,
duplicate/unknown/omitted order IDs, invalid choice contracts, and unauthorized
image defaults.

This is intentionally a contract milestone. The installed import/session/
renderer stack remains V1 until Milestone 2 can introduce canonical content,
typed mutation, and one-way materialization as one coherent authority. No
renderer behavior, fixture bytes, approved references, tolerances, scene
snapshots, or settlement snapshots changed.

Current-run Core/package typechecks, package builds, portable and realistic-ZIP
tests, schema parsing, documentation links, and diff hygiene pass. The intended
isolated Core declaration is 98,784 bytes / SHA-256
`d408f2abce9b65e996d9d835014b112093294e02976db8afb951ed45bf2b231d`.
The package-boundary check passes. The aggregate API contract retains only
unrelated dirty-worktree drift from the existing family-persistence export,
which remains owned by its existing work rather than this milestone.

## Deal of the Week typography fidelity follow-up

The remaining Deal of the Week source-preview difference is not evidence of a
canonical typography, resolved-scene, settlement, or renderer-positioning
defect. The package requests Rethink Sans SemiBold 600 but supplies no font
binary, managed-font hash, or trustworthy PostScript name. The current fidelity
harness therefore uses the Studio application replacement face registered as
human-family `Rethink Sans`; the resolved tree correctly retains
`fontStatus: missing` and no exact source binary identity is proven. The
repository's variable application face is SHA-256 `c7002241…f3347`; its identity
cannot be equated with the binary used by Figma.

Current-run scene and settlement evidence preserves all four text nodes'
characters, style ranges, sizes, line heights, letter spacing, alignments,
auto-resize modes, leading trim, paragraph spacing, and source bounds. The first
numeric divergence is browser measurement against the replacement face: the
measured single-line widths are approximately 1.19, 2.02, and 1.41 scene pixels
narrower for nodes `800:170`, `800:173`, and `734:76`; node `734:79` retains its
1000-pixel width and measures 103.687 pixels high against the 104-pixel source
box. There is no wrapping or line-count change.

The stable PNG differs from the embedded preview by 10,493 pixels
(0.506028%), but only 937 changed pixels fall within the four text regions. The
remaining 9,556 pixels are predominantly image/vector raster differences and
are outside this typography follow-up. The primary typography classification is
`FONT BINARY / FACE MISMATCH`; no production change, tolerance change, or
reference promotion is warranted. Deterministic exact-source typography still
requires the existing managed-font workflow with the actual source binary.

Measurement telemetry may label a loaded human-family face `exact` from a
family/style/weight match. That label is not binary identity evidence; the
resolved managed-font status and hash-gated font evidence remain authoritative.
This audit does not redesign font readiness or measurement telemetry.

## Figma exporter 0.6.1 downstream alignment

Accepted ADR 0074 adds a renderer-internal native canonical SOLID evidence path
for exactly Figma exporter `0.6.1`. A valid SOLID with unit canonical color
alpha, finite unit paint opacity, supported visibility/blend semantics, and no
contradictory same-index raw evidence can now enter the existing ordered-SOLID
and bounded SOLID-then-linear-gradient owners without fabricated historical
repair provenance. Exporter `0.6.0`, unidentified sources, and contradictory
raw evidence retain their existing compatibility boundaries.

The corrected 0.6.1 SOLID and gradient/mixed ZIPs pass strict import and the
realistic lifecycle. In corrected ZIP `e55ae505…fe8b`, canonical and raw SOLID
RGB agree exactly. Mixed nodes `811:459` and `811:460` select
`ordered-normal-paint-svg` with native support and no fallback on all four
surfaces; isolated gradients retain `linear-gradient-svg`. Full-precision
gradients retain exact source-conflict detection, and historical rounded
disagreement remains a conflict.

Current browser capture `exporter-061-corrected-source-gate` is stable on all
four surfaces and its PNG is pixel-exact against the embedded source preview
(zero changed pixels). The superseded contradictory export remains external
audit evidence only and is not the registered fixture.

The current Deal of the Week 0.6.1 package preserves four canonical style
ranges, four rich Figma text-segment records, and one explicit Rethink Sans
requirement without `FONT_REQUIREMENTS_INFERRED`. All four browser surfaces
load the harness's application replacement, while resolved managed-font status
remains missing. Its PNG differs from the embedded preview by 10,493 pixels
(0.506028%), so zero-tolerance source-raster closure is not claimed.

All 22 registered fixtures were repeat-stable across Validate, Fields, editor,
and PNG in run `exporter-061-alignment-all`; the corrected-source rerun above
covers the final mixed fixture bytes. Guarded renderer, scene, and
settlement comparisons retain historical/unapproved failures; the three new
source fixtures remain unapproved. Save/reload browser persistence currently
times out after reload for both the new fixtures and historical controls in the
pre-existing dirty Studio worktree, so offline restoration is not claimed in
this milestone. No schema, public SDK, tolerance, approved reference, or
renderer implementation changed, and no reference-update command ran.

## SDK 0.7.0 — published stable release

The public feature contract is frozen at the three-package fixed `0.7.0`
train. A checked entry-point inventory now drives API classification, Studio
source aliases, package-boundary checks and archive verification. It covers
every supported root/subpath and the fixed-train internal renderer seams without
changing a published entry name. Studio's React importer alias now resolves the
same `src/importer.tsx` entry that packed consumers receive, and React inspection
implementation uses package-relative imports rather than self-resolving through
an installed or stale archive.

React builds all five TypeScript entries in one declaration-aware build while
keeping importer CSS separate. Curated archive bundle probes now exercise core
import/validation, browser session/importer, React rendering, React importer UI
plus CSS and the React editor entry. Their initial guarded byte/gzip baselines
are 336,679 / 80,490; 622,821 / 151,279; 641,719 / 156,786; 947,513 / 228,361;
and 658,317 / 160,688 respectively. The probes reject Studio or root-source
paths, embedded credentials and duplicated React runtime markers.

Current-run `ci:portable`, archive inspection, npm/pnpm vendored consumers,
session and Studio browser smokes, realistic-ZIP coverage and packed generic
template-editor acceptance pass. The packed flow passed under normal and
restricted CSP with no unexpected requests, downloads or console errors.
Registry-derived archives are core 588,594, browser 334,134 and React 246,857
bytes. Their published SHA-256 values are respectively
`431011bfb0160f416d62ecf5ef49b0338d0cc9dc81819c251ac6615f052d462d`,
`446e8f6745b1ab5fe328bf9a9f434f3173e5a63e26fa583d85fe690102202bac`, and
`ef883f46fbc51e445a79ba2004daa645027f0365e9d61b88d914c1e176466063`.

Renderer run `2026-08-04T16-09-07-981Z` is repeat-stable for all 19 fixtures.
Comparison `2026-08-04T16-09-54-633Z` retains the documented 31 approved
passes, 17 historical/environment-sensitive differences and 28 unapproved
surfaces. Scene retains four historical differences and 15 unapproved fixtures;
settlement retains its documented matrix. Appearance, runtime routing, exact
fonts, vertical trim, mask and primitive browser scenarios pass. Current mask,
primitive, linear-gradient and ordered-SOLID source evidence was reproduced.
The historical `milestone-7-2-compatibility-before` stroke candidate is not
available in this checkout, so the before/after stroke source-evidence script
cannot be replayed honestly; current stroke capture is stable. No fixture,
schema, tolerance, reference update or promotion command ran.

PR 18 merged as `b19d0e3`; annotated tag `sdk-v0.7.0` points to that merge.
Workflow run `30933771024` published the fixed train, downloaded the packages
back from GitHub Packages, passed core, npm, pnpm and packed browser consumers,
verified public visibility and created the public
[GitHub Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.7.0).
The Release
contains all three archives, checksum manifests, runtime/core handoffs, one
installation authority, provider-neutral agent prompts, a dedicated in-place
SDK 0.2→0.7 Lovable handoff and migration guidance. Independently downloaded
Release assets passed both checksum manifests. External implementation is now
ordinary post-release adoption.

## SDK 0.7.0 — headless host-editor integration

The fixed core/browser/React train is prepared at `0.7.0`. The new curated
`@sleinity/template-react/editor` entry supplies a session-bound responsive
viewport, ordered editable-field controllers, singular field selection and a
current-revision diagnostic projection. These are headless bindings over the
existing session, renderer, mutation, validation, font, asset and capture
authorities; they do not add a form system or another validator.

`TemplateImportWizardPreview` and the generic template-editor reference now use
the same viewport implementation. The reference also uses the field controllers
and diagnostic projection after reopening a confirmation in a fresh session.
Host image processing, navigation, persistence services and publishing remain
outside the SDK.

Current-run portable tests, root/package TypeScript, package/Studio/example
builds, API/release/docs/boundary contracts, archive inspection, the isolated
React consumer and the packed generic-editor browser acceptance pass. The
browser gate covers the shared responsive viewport, current-revision identity
and silent capture, ordered plural/singular field-controller parity, compact
diagnostics, wizard confirmation, fresh-session reopening, host edits, offline
drafts, StrictMode, restricted CSP and zero external SDK requests.

Core root declarations remain exactly 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local archives are core 588,525, browser 334,022 and React 245,268 bytes. The
isolated curated-entry consumer is 893,788 / 261,806 gzip bytes; the generic
example is 911.17 / 266.41 gzip kB and Studio remains 1,000.85 / 290.99 gzip
kB.

Exact-font/source-authoritative evidence is stable, appearance is deterministic
for all 19 fixtures, and renderer run `2026-08-04T14-20-55-464Z` is
repeat-stable. Renderer comparison `2026-08-04T14-21-58-135Z` retains 31
approved passes, 17 documented historical/environment-sensitive differences
and 28 unapproved surfaces. Scene retains four documented historical differences
and 15 unapproved fixtures; settlement retains its documented matrix. Approved
renderer, scene and settlement identities remain
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
`b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No fixture, schema, tolerance, promotion, reference-update or approved-evidence
command ran.

The packed browser acceptance passed after the controller-identity correction.
The final source-only stale-callback guard then passed React typecheck, build and
archive inspection. A second clean-install replay was attempted but could not
download public consumer dependencies because the registry was unavailable
(`ENOTFOUND`); no additional browser pass is claimed for that replay.

## SDK 0.6.0 — release closeout

The fixed core/browser/React train is release-ready at `0.6.0`. The standalone
reference now demonstrates the complete host-neutral Package, Fonts, Validate,
Fields and Confirm workflow, returns confirmation to a host-owned dashboard,
and reopens the record in a fresh session for host-owned editing, persistence
and current-revision PNG capture. The 0.2.2 migration guide preserves existing
host dashboards, controls, image workflows, storage and export pipelines while
replacing only the hand-built importer/setup flow.

Current-run package/root TypeScript, portable tests, package/Studio/example
builds, declarations, API/release/docs/boundary contracts, archive inspection,
DOM-free core, packed React consumer, packed generic-editor acceptance,
TemplateSession browser smoke and Studio browser smoke pass. The browser
acceptance covers supported/restricted CSP, invalid/valid ZIPs, exact-font
rejection/upload/reuse, compact validation, field rules, fresh confirmation
hydration, host text/image editing, Fill/Fit/reset, offline persistence,
stale-export rejection, silent PNG capture, disposal and zero external SDK
requests.

Core root declarations remain exactly 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local archives are core 588,525, browser 334,193 and React 235,621 bytes; the
isolated consumer is 882,405 / 258,577 gzip bytes. Registry-derived hashes are
recorded only after tag publication.

Exact-font evidence passes, source-authoritative capture is repeat-stable and
appearance remains deterministic for all 19 fixtures. Renderer comparison
`2026-08-04T12-52-50-241Z` retains 31 approved passes, 17 documented
historical/environment-sensitive differences and 28 unapproved surfaces.
Scene retains four documented historical differences and 15 unapproved
fixtures; settlement retains its documented matrix. Approved renderer, scene
and settlement identities remain
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
`b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No fixture, schema, tolerance, promotion, reference-update or approved-evidence
command ran.

External adoption now gates the next public feature milestone. Only recurring
boilerplate independently evidenced in Studio, the reference and a real host
qualifies for a future host-editor primitive.

## SDK 0.6.0 RC2 — import experience and field rules

The fixed train is prepared at `0.6.0` for manual Studio and standalone-wizard
review before publication. Zero-routed compatibility templates now bypass the
inapplicable core-settlement readiness gate while retaining all existing
package, font, asset, DOM, revision and export-safety checks. The real
deal-of-the-week banner completes Render Validation with its approved renderer
path and no renderer pixel change.

The importer preview uses the existing viewport fitting model around the
intrinsic session renderer, with observer-driven refitting, protected padding,
centred aspect-preserving output and hidden overflow. Exact emoji fallback is
still machine-readable but is no longer presented as a setup warning.

Core owns portable field-rule validation through its supported `editor` entry.
Browser wizard snapshots and confirmations expose a structured field report and
apply only valid drafts. React's host-neutral wizard now separates Input Order
from type-appropriate Input Rules. Studio retains its native field cards and
two-column preview instead of embedding the generic SDK presentation. Imported
labels, types, targets and defaults are read-only; content editing remains
host-owned.

The generic validation rows introduced in the first 0.6 candidate were removed
from Studio, whose existing fidelity workbench remains the single validation
presentation. The SDK wizard now projects existing validation authority into a
compact result, counts, package facts, affected areas and actionable repair
guidance, with successful phases and technical details collapsed.

Managed-font preparation is now session lifecycle evidence bound to the current
package, registry and session revision. The real Rethink Sans SemiBold upload
was browser-verified under private runtime family
`__template_font_cc5cf4e24fef00ce_0_static` at weight 600 in the rendered
preview. Font and render validation wait for that current-revision activation.

Current root/package TypeScript, portable tests, Studio and generic-example
production builds, API/release/docs/boundary checks, archive inspection and
manual Studio/wizard browser review pass. The real banner reaches
current-revision Render Validation, Continue is enabled, and its intrinsic
1920×1080 canvas fits without scrollbars with 26px horizontal and about 39px
vertical preview padding in the reviewed container. Core root declarations
remain exactly 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local core/browser/React archives are 588,525 / 333,849 / 223,413 bytes. Studio
is 1,000.83 / 290.99 gzip kB and the generic example is 892.71 / 261.29 gzip
kB. The packed generic browser acceptance command did not complete in the
current run and is not claimed as passing; archive inspection and the equivalent
workspace browser flow both passed.

Appearance is deterministic for all 19 fixtures. Fresh renderer run
`sdk-0-6-rc2-verification` is repeat-stable and retains the documented mix of
approved passes, historical/environment-sensitive differences and unapproved
surfaces. Fresh scene and settlement comparisons retain their documented
historical/unapproved matrices; no update command ran. Approved identities
remain renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No approved evidence or guarded policy changed.

## Milestone 2G — Studio contract adoption and advanced inspection

The fixed core/browser/React train is prepared at `0.5.0`. Studio production
and server modules now consume supported package entries rather than root
compatibility modules, package-source paths or renderer-internal seams. Its
workflow, UI, routes, persistence and rendering model remain unchanged.

Core now exposes focused editor, asset, font and motion entries plus an
advanced inspection entry for UI-independent evidence. Browser exposes focused
asset, font, persistence, capture and enrichment entries. React exposes an
advanced renderer-inspection entry. Advanced inspection remains observational
and does not select rendering authority. Studio-only layout/debug, stress,
visual-difference, issue-packet and development-harness code is physically
owned under `apps/studio/src/fidelity` and excluded from SDK archives.

Current package/root TypeScript, portable tests, builds, API/release/docs and
boundary checks, archive inspection, isolated consumers, browser smokes and
generic editor acceptance pass. Core root declarations remain exactly 87,431
bytes / `7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local core/browser/React archives are 583,847 / 323,857 / 208,261 bytes. The
ordinary packed consumer remains 856,967 / 251,414 gzip bytes. Studio is flat
at 1,001.01 / 291.02 gzip kB; minimal and generic examples are 816.87 / 239.87
and 871.21 / 254.99 gzip kB.

Appearance is deterministic for 19 fixtures. Renderer comparison
`2026-08-02T16-15-48-741Z` reproduces 31 approved passes, 17 historical
differences and 28 unapproved surfaces. Scene retains four historical and 15
unapproved states; settlement retains its documented stable/reference matrix.
Approved renderer, scene and settlement identities remain
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
`b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No approved evidence or guarded policy changed.

## Milestone 2F — physical React-renderer ownership

The fixed core/browser/React train is prepared at `0.4.2` without changing its
recorded public API. `template-core` now physically owns canonical-scene
construction, serialization, validation, equivalence and mappings.
`template-react` physically owns the complete production React renderer,
previews, inspection viewport, CSS/SVG/text/vector/constraint adapters and
renderer-specific runtime routing. Root paths retained by Studio and fidelity
tools are checked behavior-free forwarders.

The fixed-train `renderer-internal` sibling seams allow repository forwarders
and the React renderer to consume internal owners without bundling root source.
They are excluded from the public API inventory, explicitly unsupported for
hosts, and forbidden in Studio production modules, examples and browser code.
React externalizes core and browser; browser never imports React. Studio's
development aliases resolve the compatibility forwarders to the same workspace
owners, preventing a second renderer instance without exposing the seam to
application code.

The train was published from `sdk-v0.4.2` on 2026-08-02. The public
[GitHub Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.4.2)
contains the registry-derived archives, combined checksums, runtime/core
handoffs and Lovable prompts. Authenticated GitHub Packages reports `0.4.2` for
all three packages. Anonymous Release downloads passed the combined checksum
and the complete generic editor browser acceptance without credentials.

Current-run package/root TypeScript, portable tests, builds, declarations, API
inventory, boundaries, release contract, archives, DOM-free core, isolated
packed consumer, session/Studio browser smokes and the packed generic editor
pass. The generic editor again proves wizard confirmation, fresh-session
reopening, host editing, exact fonts, persistence, silent PNG, simultaneous
compositions and zero external SDK requests.

Core declarations remain exactly 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local core/browser/React archives are 347,076 / 209,476 / 153,598 bytes. React
is 49.4% smaller than 0.4.1 and the three-archive total is 10.8% smaller despite
the explicit core internal seam. The packed consumer is 856,967 / 251,434 gzip
bytes, down 4.3% gzip. Studio remains flat at 1,001.02 / 291.15 gzip kB;
minimal and generic examples are 816.87 / 239.88 and 871.21 / 255.00 gzip kB.
Registry-derived archive SHA-256 values are core
`7bb364bec2630969bd5ac4f9f8e8e52b88f90ce99694ce10040489a4159ff74f`,
browser
`7c22e32cfcb9851b71af05768f857bf95705071c63daa9b5339cc258719c1fca`,
and React
`ced85dd35631f0347b30882c7c1105b166b7428205385c4d4b814b519d863408`.

Appearance remains deterministic for all 19 fixtures. Renderer baseline
`2026-08-02T13-39-40-949Z` and comparison
`2026-08-02T13-40-25-642Z` reproduce the 0.4.1 result: 31 approved passes, 17
historical/environment-sensitive differences and 28 unapproved surfaces.
Scene retains four historical differences and 15 unapproved fixtures;
settlement retains its documented historical states. Runtime-routing stage 4a,
exact-font, text-trim and all nine browser scenarios pass. Approved identities
remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No reference, fixture, schema, tolerance, promotion or update command ran.

## Milestone 2E — physical browser-runtime ownership

The fixed core/browser/React train is prepared at `0.4.1` with no public-symbol
change. `template-browser` now physically owns browser assets, exact fonts,
IndexedDB storage, template/draft persistence, import orchestration, the
headless wizard, confirmation compatibility and integrity, sessions,
readiness, enrichment adapters and PNG capture. Root paths retained by Studio,
the renderer and fidelity tooling are checked behavior-free forwarders.

Font and template persistence share a browser-internal content-addressed
binary/storage layer, removing the prior font-to-persistence cycle. Browser
production source has no root, React, Studio or renderer implementation
dependency. Its build externalizes `template-core`; the React build declares
core and browser as external fixed-train dependencies. The 0.4 public API
inventory remains symbol-identical.

The train was published from `sdk-v0.4.1` on 2026-07-30. The public
[GitHub Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.4.1)
contains registry-derived archives, combined checksums, runtime/core handoffs
and Lovable prompts. An initial tag run exposed a concurrent `prepack`
declaration-resolution race after core and React publication; PR #12 made
workspace type resolution independent of another package's `dist` cleanup.
The corrected tag run published browser, retained package tags, verified the
published core plus secret-free npm/pnpm consumers, and created the Release.

Portable CI, direct package/root TypeScript, SDK/Studio/example builds,
declarations, API inventory, boundaries, release policy, archives, DOM-free
core, packed consumers, session/Studio browser smokes, and the packed generic
editor pass. The generic editor again proves supported/restricted CSP,
wizard confirmation, fresh-session reopening, host editing, exact fonts,
offline persistence, silent PNG, disposal, simultaneous headless compositions
and zero external requests. Secret-free npm and pnpm vendored consumers pass.
The same generic acceptance was rerun locally against anonymously downloaded
public Release bytes.

Core declarations remain exactly 87,431 bytes /
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local core/browser/React archives are 283,577 / 209,477 / 303,397 bytes.
Browser archive size is 47.8% below 0.4.0; core is identical and React is
materially flat. Studio is 1,001.02 / 291.35 gzip kB JavaScript; minimal and
generic examples are 858.15 / 251.51 and 912.50 / 266.51 gzip kB; the packed
consumer is 897,726 / 262,605 gzip bytes. Consumer and Studio gzip remain
materially flat while physical package duplication is reduced.
Registry-derived archive SHA-256 values are core
`1604c4923a6cba0ce039ad26b738b11fe4c755048a9c4d47cd08200f4bdf8654`,
browser
`cad8ab9e506973ad31926bdc9345640a7b6271de7f1c11c7d418b4274109d054`,
and React
`5169ee62db4ccde8437bae49f1d73915acbb4d8b2749d513a467260b734c3fe2`.

Appearance evidence is valid and deterministic for all 19 fixtures. Renderer
baseline `2026-07-30T17-09-39-496Z`, exact-font run
`font-evidence-2026-07-30T17-12-09-413Z`, and source-authoritative run
`2026-07-30T17-12-16-183Z` are stable. Guarded renderer run
`2026-07-30T17-10-29-068Z`, scene run
`scene-2026-07-30T17-12-05-022Z`, and settlement run
`settlement-2026-07-30T17-12-07-041Z` retain the documented historical and
unapproved comparison states. Approved aggregates remain renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No reference, fixture, schema, tolerance, promotion or update command ran.

## SDK 0.4.0 — external-adoption contract hardening

The fixed core/browser/React train is prepared at `0.4.0`. Browser consumers
now have curated `/session`, `/importer`, and `/compatibility` entry points
while every 0.3 root export remains supported. The committed machine-readable
API contract records every package path and public symbol and rejects
unversioned export drift.

`inspectTemplateRuntimeSupport()` reports required browser, storage, exact-font,
image, SVG, local data/blob, render and optional capture capabilities with
stable `ready`, `warning`, and `blocked` codes.
`inspectTemplateImportConfirmation()` freshly validates package state, package
identity, the compatible FNV fingerprint, 0.4 SHA-256 digest and browser-local
managed-font authority. Supported 0.3 confirmations without the new digest
remain loadable with a compatibility warning. Current confirmations missing
their digest, unsupported schemas, malformed packages, identity mismatches,
and integrity failures are blocked.
`loadTemplateImportConfirmation()` is the recommended atomic reopening path;
it never trusts stored validation, resolved trees, readiness or render
identities and delegates publication to the existing guarded
`loadTemplateState()` contract.

The runtime preflight exposed that AJV schema compilation requires CSP
`script-src 'unsafe-eval'`. Canonical compilation is now lazy, so an
intentionally restricted host mounts and receives
`runtime.dynamic-code.unavailable` instead of crashing before preflight. The
supported packed-CSP profile additionally verifies local data/blob images,
managed fonts, IndexedDB and silent PNG capture with zero external requests.

Current-run portable tests, root/package TypeScript, SDK builds, API/export
manifest, boundaries, archives, DOM-free installed core, isolated npm and pnpm
React consumers, Studio build/smoke, session smoke, examples, documentation and the
packed generic-editor lifecycle pass. Core declarations remain exactly 87,431
bytes / `7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Local core/browser/React archives are 283,577 / 401,430 / 303,406 bytes;
Studio is 1,000.89 / 291.48 gzip kB JavaScript; minimal and generic examples
are 846.43 / 248.93 and 903.04 / 264.80 gzip kB; the packed consumer is
885,908 / 260,129 gzip bytes.

Appearance evidence is valid and deterministic for all 19 fixtures. Renderer
run `2026-07-30T14-56-21-866Z`, exact-font run
`font-evidence-2026-07-30T14-58-54-584Z`, and source-authoritative run
`2026-07-30T14-59-01-309Z` are stable. Guarded renderer run
`2026-07-30T14-57-08-849Z`, scene run
`scene-2026-07-30T14-58-50-470Z`, and settlement run
`settlement-2026-07-30T14-58-52-279Z` retain the documented historical and
unapproved comparison states. Approved aggregates remain renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No reference, fixture, schema, tolerance, promotion or update command ran.

## SDK 0.3.0 — external shell composability and template reopening

The fixed core/browser/React train was published at `0.3.0` from
`sdk-v0.3.0` on 2026-07-30. The public
[GitHub Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.3.0)
contains registry-derived archives, combined checksums, host-neutral handoffs
and Lovable Business prompts.
`template-browser` now provides `createTemplateImportWizard`, a headless
controller with seven explicit steps: ZIP Import, Package Validation, Font
Validation, Render Validation, Field Rules, Confirmation and Completed. Every
step exposes revision-bound readiness, blockers, warnings, diagnostics and
navigation permissions. `template-react/importer` adds provider/snapshot hooks,
a preview bridge using the existing renderer, and an optional responsive
default interface. `TemplateImporterWizard` remains a compatibility alias.

Every attempted import now publishes a structured phase report and a non-null
compatibility validation result, including corrupt ZIP failures. Exact-font
and post-confirmation persistence adapters are optional,
abortable and cannot bypass the existing validation authorities. Confirmation
is immutable and contains the imported baseline, validated working package,
sanitized field rules, package/font/render evidence, diagnostics, current
identity, deterministic fingerprint, SDK version and source metadata.
Controller-owned sessions are disposed by the controller; injected sessions
are never disposed. The host retains ownership of authentication, catalogues,
routing, cloud storage, publishing and navigation.

The wizard now stops at field-rule configuration; the unpublished image-editor
adapter and wizard content-editing actions have been removed. External shells
own their controls and preprocessing and submit final descriptor-supported
values through the established session mutation contract.

`TemplateSession.loadTemplateState()` reopens an in-memory or host-retained
confirmation in a fresh session. It clones and revalidates the baseline and
working package, requires matching identity, rebuilds resolved/editable state,
and publishes atomically at a fresh revision without trusting stored readiness.

`template-core` now owns pure editable-field rule replacement, update,
reordering and target/warning projection. `template-browser` adds validated
working-package replacement and one shared exact-font setup policy. Studio and
the reusable wizard now accept only a unique family/PostScript, weight or
variable-range, posture, stretch, axis and complete text-face glyph match. A
shared deterministic classifier delegates only explicit emoji sequences to the
existing device emoji fallback; ordinary text-style symbols, letters, numbers,
punctuation, currency and accented characters remain blocking. Valid stored
faces are reused automatically; invalid replacement uploads are atomic and
cannot displace a ready link. Low-level candidate/link/fallback contracts remain
available for compatibility but are absent from setup UI. These additions
rebuild resolved state, invalidate prior render identities and prevent stale
asynchronous work from overwriting a newer session. Existing field mutation,
image placement, diagnostic, readiness, persistence, renderer and PNG
contracts are unchanged.

Studio and the reusable wizard show `Ready`, the verified filename and a
neutral device-emoji note when this narrow fallback applies. Genuine coverage
failures identify the missing characters. The supplied
`RethinkSans-SemiBold.ttf` now verifies as exact for the real
`deal-of-the-week-banner` requirement containing `Summer Sale ☀️`. A
current-run headless Studio reproduction with the supplied ZIP and font reports
`Ready`, exact classification and enabled progression; the verified font SHA-256
is `cc5cf4e24fef00ceb7546500d3f6ada6c0884ab1603d2f8608a80f811010b9b5`.

The generic template-editor reference now uses the RC3 wizard through public
package entry points, returns confirmation to an in-memory dashboard, and
reopens the selected record through a fresh hydrated session. The packed
Chromium acceptance gate exercises cancellation without catalogue mutation,
invalid and valid ZIPs, exact font rejection/upload and persisted reuse,
field-rule editing, image Fill/Fit defaults, revision-ready completion,
host-owned text preprocessing, downstream field/image editing, offline draft
reload, stale-export rejection, silent PNG and permanent disposal. It reports
zero external runtime requests, browser downloads or console errors.

Current RC3 direct package/root/Studio TypeScript, portable tests, production
builds, documentation, ownership/archive checks, DOM-free installed core,
browser session, Studio smoke, packed consumer and packed generic-editor
acceptance pass. The core declaration remains 87,431 bytes with SHA-256
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
Core/browser/React published archives are 283,433 / 372,987 / 303,379 bytes.
Their registry-derived SHA-256 values are respectively
`92183190066f93913d200714aecdf6515bbd8cf7b0e0169f719279e3f2f8656c`,
`a18235221191c1e5c6aa022d4e91e21026cf014075779f996bb57cf6e30ad236`
and
`8f8757d5371518aaff24d4c9c61e286fea18eb3b6d69e961aad04e5fc17e61f3`.
The dedicated importer output is 35.68 kB JavaScript (6.26 kB gzip), 7.18 kB
CSS, and 4.13 kB declarations.
Studio is 1,000.84 / 291.46 gzip kB JavaScript and 68.26 / 12.12 gzip kB CSS.
The minimal and wizard-backed generic editor examples are 844.64 / 248.23 and
916.12 / 265.59 gzip kB. The isolated packed consumer is 885,100 / 259,603
gzip bytes.

Fresh renderer run `2026-07-30T12-10-08-113Z` is repeat-stable for all
19 fixtures and four surfaces. Source-authoritative run
`2026-07-30T12-10-55-869Z` also passes through the real upload-only Studio UI.
Guarded renderer comparison `2026-07-30T12-11-01-871Z`, scene run
`scene-2026-07-30T12-12-26-619Z` and settlement run
`settlement-2026-07-30T12-12-28-310Z`
guards retain only their documented historical/environment-sensitive
or unapproved states; the approved gradient and ordered-SOLID overlap remains
clean except for the already reviewed Inspector-only paint-opacity difference.
All 19 appearance projections are valid and deterministic. Approved
aggregates remain renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
Direct byte aggregation confirms those approved identities after the final
run. No update, promotion, fixture, schema, tolerance or approved-reference
command ran.

Publication and external-host acceptance are complete. The tag workflow
published all three packages once, and a later manual handoff-only run did not
enter the publication path. Secret-free npm and pnpm consumers passed against
the registry-derived archives. An independent anonymous Release download
matched `SHA256SUMS` and passed the complete Dashboard → Wizard → Confirmation
→ fresh-session reopening flow, host-owned mutation, offline restoration,
silent PNG capture, disposal and zero-external-request checks.

## SDK 0.2.2 — generic template editor handoff

The fixed core/browser/React train is prepared at `0.2.2` without a public
runtime symbol or behavior change. Active distribution policy is now
`sleinity-tools-only`: the public repository and Release assets remain
`UNLICENSED` and are authorized for Sleinity-owned applications only.

The primary SDK documentation is host-neutral. It defines import, validation,
diagnostics, editable state, browser persistence, readiness, rendering and
silent PNG capture while leaving navigation, authentication, catalogues,
collaboration, cloud storage and publishing to the consuming application.
Lovable Business is a separate vendored-archive recipe with sequential
template-editor prompts and no registry secret.

The committed reference and its packed Chromium gate are renamed to the
generic template editor boundary. Fixture identities, callback names, storage
keys, headings and commands are host-neutral; the verified browser lifecycle
remains invalid/valid ZIP import, validation, diagnostics, field/image editing,
Fill/Fit/reset, offline save/reload, stale-export rejection, silent PNG and
permanent disposal.

Release automation now generates `SDK-RUNTIME-HANDOFF.md`,
`SDK-CORE-HANDOFF.md` and `LOVABLE-TEMPLATE-EDITOR-PROMPTS.md`. Contract checks
reject retired host-specific naming on active SDK surfaces. The immutable
`sdk-v0.2.1` Release and its historical records remain unchanged.

Current-run `pnpm ci:portable` passes repository and package TypeScript,
portable tests, Studio and SDK builds, documentation, ownership/archive checks,
the installed-core consumer, packed consumer and both examples. The generic
packed-reference Chromium gate passes the full browser lifecycle from the
candidate archives with zero external requests, browser downloads or console
errors. The secret-free pnpm vendored consumer passes the same runtime
lifecycle; npm verification remains assigned to release CI because the local
runtime has no npm executable.

Studio remains 998.40 / 290.38 gzip kB JavaScript and 68.52 / 12.20 gzip kB
CSS. Core/browser/React candidate archives are 279,287 / 334,484 / 277,566
bytes. Packed consumer output is 834,646 / 244,671 gzip bytes; minimal and
generic editor examples are 827.45 / 242.56 and 863.21 / 250.22 gzip kB.
Core's declaration remains exactly 86,272 bytes /
`e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.

Fresh renderer run `2026-07-28T15-09-16-072Z` is repeat-stable for all 19
fixtures and four surfaces. Renderer, scene and settlement guards retain their
documented historical/environment-sensitive or unapproved states. Appearance
projections are valid and deterministic. Direct approved-byte aggregation
remains renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No update, promotion, fixture, schema, tolerance or approved-reference command
ran.

PR [#5](https://github.com/Sleinity/template-tool/pull/5) passed portable CI,
generic packed-reference acceptance and protected-reference guarding before its
squash merge at `d4dfb85`. Tag `sdk-v0.2.2` alone published all three packages.
Workflow run 8 passed both `publish` and `handoff`, including authenticated
published-core installation, registry archive download, npm and pnpm vendored
consumers, the generic packed reference, public visibility and Release upload.

The registry-derived public archives are:

- core, 279,287 bytes /
  `dec3f442f05392286e1b718114b31b700ffa64fb7f164bc74650db2c40512f6b`;
- browser, 334,484 bytes /
  `afa917bfb547e6f051c8d7974e9a6ba2a2297587e45d8ade67cd3a64f839c569`;
- React, 277,566 bytes /
  `fd3b32124267bee87f69e1eac7dcde5b60c82c818b1a03da39832f0f541fc918`.

All public archives, checksum manifests and neutral handoffs were downloaded
anonymously. Both checksum manifests pass. A second secret-free pnpm consumer
and generic packed-reference Chromium run pass directly from those downloaded
bytes with the same hashes and zero external runtime requests. The release and
all three package tags point to reviewed commit `d4dfb85`; `sdk-v0.2.1` and its
historical assets remain unchanged.

## SDK 0.2.1 — release closeout and Bas acceptance gate

The fixed core/browser/React train is published as `0.2.1` from reviewed
`main` commit `b30a50d` and tag `sdk-v0.2.1`.
Blocked session imports now retain structured source diagnostics, so consumers
can call `TemplateSession.loadZip()` once instead of running a separate core
preflight. PNG capture accepts `download: false` for media-pipeline delivery
without changing capture, readiness or the backwards-compatible download
default. React now exports `useTemplateSession()` for one session per workspace
with StrictMode-safe deferred disposal.

A committed narrowcasting reference consumer demonstrates valid/invalid ZIP
import, descriptor-driven field editing, image replacement and Fill/Fit,
explicit and automatic browser-draft restoration, revision-bound render
readiness, silent PNG export and a host-owned `onTemplateExportReady` boundary.
It also presents validation status independently from the structured source
diagnostics.

A packed-reference Chromium gate now copies that committed example into an
isolated consumer and installs the three candidate archives. It exercises the
complete invalid/valid, edit/reset, image rejection/replacement, Fill/Fit,
save/offline-reload, stale-export, silent-PNG and permanent-disposal lifecycle
with zero external runtime requests, browser downloads or console errors.
A versioned runtime-package
manifest now drives release archives, checksums, handoffs and npm/pnpm isolated
consumer verification. All three SDK packages build during prepack.
The repository and `sdk-v0.2.1` Release assets are public and anonymously
downloadable, while direct GitHub npm installation remains authenticated.
`UNLICENSED` remains an explicit adoption blocker beyond authorized consumers.

Tag publication and manual Release-asset refresh now have separate workflow
paths. Only an exact fixed-version tag may execute `changeset publish`; manual
dispatch can only download an already-published fixed train, verify the
registry bytes and refresh its public handoff assets.

Current-run `pnpm ci:portable` passes. Studio is 998.40 / 290.38 gzip kB
JavaScript and 68.52 / 12.20 gzip kB CSS. Core/browser/React candidate archives
are 279,287, 334,486 and 277,566 bytes; packed consumer output is 834,646 /
244,671 gzip bytes. The minimal and narrowcasting consumers are 827.45 / 242.56
and 863.21 / 250.24 gzip kB. npm and pnpm secret-free archive consumers pass
valid import, structured invalid diagnostics, edit, stale-export rejection,
save/reload, ready silent capture, offline reload and permanent disposal with
zero external runtime requests and no browser console errors.

The registry-derived public archives are 279,287 / 334,486 / 277,568 bytes
with SHA-256:

- core:
  `36c16c316ef32252e4b0878084aa3c0b0ff69c09afb0c3e0be64bf13d6e66916`;
- browser:
  `b9cf8f61ea784cc50fe6d9a312013060408b1408f1627efa0cd8706d712b4575`;
- React:
  `ed38f5d71ee6b59f2a5b9528f390a3c0173f464b264d3c4e3a9b375abfae1552`.

The tag workflow's publish and handoff jobs pass. It verifies the published
core directly from GitHub Packages, downloads all three exact registry
archives, runs secret-free npm and pnpm consumers, runs the packed committed
reference, confirms public visibility and uploads the checksum-verified public
Release. A separate anonymous download and npm consumer repeat the same hashes
and lifecycle without GitHub credentials.

Fresh renderer run `2026-07-28T13-46-51-826Z` is repeat-stable for all 19
fixtures and four surfaces. Renderer, scene and settlement comparisons retain
their documented historical/environment-sensitive or unapproved states.
Appearance projections are valid and deterministic. Direct approved-byte
aggregation remains renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No update, promotion, fixture, schema, tolerance or approved-reference command
ran.

## SDK 0.2 — Lovable runtime handoff

The fixed `0.2.0` core, browser and React packages now have one secret-free
Lovable Business distribution contract. Release automation downloads the exact
published archives, generates one checksum manifest and a dependency/runtime
handoff, installs all three as root `file:vendor/...` dependencies, and uploads
the archives plus sequential Bas narrowcasting prompts to `sdk-v0.2.0`.

The isolated production-build browser consumer passes with both npm and pnpm.
It verifies core preflight diagnostics, valid session import, editor rendering,
field mutation, stale-export rejection, browser save/reload, ready PNG export
and offline restoration with zero external runtime requests. pnpm consumers
require explicit vendored overrides for the private transitive closure; npm
resolves the exact root file dependencies directly.

Immutable 0.2.0 has one documented compatibility seam: malformed-ZIP source
diagnostics are preserved by `importTemplatePackage()` but are not guaranteed
to be projected into every blocked `TemplateSession` snapshot. Consumers
preflight once with core, show its diagnostics on failure, and pass the same
bytes to the session only on success. A later version may close that projection
gap; the published 0.2.0 archives are not rebuilt.

This handoff changes release automation, documentation and isolated
verification only. Renderer, schema, import normalization, persistence,
readiness, export pixels, fixtures, tolerances and approved references are
unchanged.

## SDK 0.2 — core importer release readiness

The fixed SDK train is versioned at `0.2.0`. The supported core-only consumer
entry is `importTemplatePackage(ArrayBuffer, sourceName?)`; browser consumers
need no API route, runtime secret, React peer, DOM, storage, font or network
access. GitHub Packages remains the authoritative private distribution.
Lovable Business receives the exact published core archive as a
checksum-verified `file:` dependency because private-registry build secrets are
Enterprise-only.

Core now runs its build during `prepack`. Archive verification requires the
README, JavaScript, declaration and source map, rejects workspace/Studio/root
dependencies, and records sizes. Release automation installs the published
`0.2.0` package in an isolated React/TypeScript consumer, downloads that exact
registry artifact, generates `SHA256SUMS` and Bas's handoff, verifies it again
without credentials as a vendored dependency, and attaches all three files to
the private `sdk-v0.2.0` GitHub Release.

Current pre-release portable CI passes. Core/browser/React archives are
279,286, 333,080 and 276,760 bytes; the packed consumer is 833,790 /
244,411 gzip bytes and the minimal consumer is 826.54 / 242.27 gzip kB.
Studio remains 998.38 / 290.37 gzip kB JavaScript and 68.52 / 12.20 gzip kB
CSS. Core's declaration remains exactly 86,272 bytes /
`e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.

Fresh renderer run `2026-07-28T10-00-02-265Z` is repeat-stable on all 19
fixtures and four surfaces. Its full guard retains the documented approved
passes, historical/environment-sensitive differences and unapproved states.
Scene and settlement guards likewise retain their documented historical and
unapproved states. Direct approved-byte aggregation remains renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
No update, promotion, fixture, schema, tolerance or approved-reference command
ran.

## Template Platform Milestone 2D — portable field editing ownership

`template-core` now physically owns the framework-neutral editor-session
contract, effective-field discovery, field mutation, image replacement/reset,
constraint evaluation and measurement-result projection. Browser DOM/CSS text
measurement remains browser-owned, Studio owns field-label presentation and
the retired root editor paths are checked behavior-free forwarders.

The public core declaration remains exactly 86,272 bytes /
`e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
Direct package TypeScript, portable tests, ownership checks and the isolated
installed-core field-editing smoke pass. Full build, size, browser and guarded
comparison evidence is recorded in the current handoff entry.

The next milestone may migrate browser asset, font, persistence and session
lifecycle implementation into `template-browser`. File decoding, revision
guards and browser resource lifecycles must move with their complete dependency
closures; React rendering and Studio workflow remain outside that boundary.

## Template Platform Milestone 2C — portable resolved graph and backend ownership

`template-core` now physically owns resolved graph construction, injected font
readiness, image placement, backend decisions and the internal primitive
appearance closure. Legacy root paths are checked behavior-free forwarders;
renderer, browser lifecycle, fields, settlement and Studio behavior are
unchanged. The direct core typecheck gap is closed, and the isolated Node
archive verifies the package-owned resolved/backend contract and corrected Ajv
ESM entry without browser globals.

All package typechecks/builds, portable tests, boundaries, archives, packed
consumers, root/Studio/minimal builds, browser smokes, documentation and 19
appearance projections pass. Core's declaration remains exactly 86,272 bytes /
`e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
Core/browser/React are 425.39/84.25, 503.14/106.95 and 428.39/67.58 kB
JavaScript/declarations; archives are 278,660, 333,107 and 276,760 bytes.
Studio remains 998.31/290.44 kB gzip JavaScript and 68.52/12.20 kB CSS;
packed/minimal consumers remain 833,790/244,411 bytes and
826.54/242.27 kB gzip.

Renderer runs `milestone-2c-portable-resolved-backend` and
`milestone-2c-portable-resolved-backend-compare` are repeat-stable and retain
31 approved passes, 17 historical/environment-sensitive differences and 28
unapproved surfaces. Scene retains four historical differences and 15
unapproved candidates; settlement retains its documented stable states.
Approved renderer, scene and settlement aggregates are unchanged. No update,
promotion, fixture, schema or tolerance command ran.

Milestone 2D may move pure field mutation and editing contracts into core. It
must keep file decoding, browser measurement, sessions, React UI and Studio
workflow outside that boundary.

## Template Platform Milestone 2B — portable resolution dependency inversion

`template-core` now physically owns the portable color/asset/axis, layout,
stroke, transform and vector models plus backend output contracts.
`createResolvedRenderTree` imports no renderer module. Backend decision and
diagnostic implementations consume narrow input ports rather than resolved
types; public compatibility wrappers preserve the exact SDK signatures and
behavior.

The core declaration remains byte-identical to Milestone 2A at 86,272 bytes /
`e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
Portable tests, root TypeScript, builds, boundaries, archives, packed-core and React
consumers, browser smokes, documentation and all 19 appearance projections
pass. Studio is 998.31/290.44 kB gzip JavaScript and 68.56/12.21 kB CSS;
core/browser/React are 425.58/84.25, 503.17/106.95 and 428.43/67.58 kB
JavaScript/declarations. Archives are 278,706, 333,127 and 276,779 bytes;
packed/minimal consumers are 833,790/244,411 bytes and 826.54/242.27 kB gzip.

Renderer run `milestone-2b-portable-resolution-guard` is repeat-stable and
retains 31 approved passes, 17 documented historical/environment-sensitive
differences and 28 unapproved surfaces. Scene retains four historical
differences and 15 unapproved candidates; settlement retains its documented
stable states. Approved renderer, scene and settlement aggregates are
unchanged. No update, promotion, fixture, schema or tolerance command ran.

The subsequent 2C review found one evidence gap: the direct core test fixture
omitted a required asset field and package-owned side-effect tests could be
tree-shaken by the test bundle. 2C closes both gaps; no 2B runtime behavior was
affected.

Milestone 2C may physically migrate resolved and backend implementation only
with the actual primitive/appearance dependency closure. No copied primitive
contract or package-to-root implementation dependency is permitted.

## Template Platform Milestone 2A — portable core source ownership

`@sleinity/template-core` now physically owns the canonical types and schema,
package diagnostics/migration/parsing/validation, ZIP/source reader,
normalization, and the loader's portable registry, asset-reference, mask,
motion-linking and Figma-URL dependencies. Its public entry and synchronous ZIP
importer use those local owners; public names and behavior are unchanged.

Legacy root paths are checked behavior-free forwarders. Source/validation
forwarders retire with the browser-session and Studio public-entry migration;
shared type/asset/mask/motion forwarders retire after resolved/backend/field and
React renderer ownership moves. The next milestone must invert the five pure
renderer helpers and shared backend decision types before relocating resolved
implementation.

The aggregate portable CI gate passes, including portable tests, root/package
TypeScript, Studio/root builds, SDK declarations,
ownership/archive checks, repository audit, documentation, packed/minimal
consumers, both browser smokes and all 19 appearance projections pass. Core's
public declaration is byte-identical to Milestone 1B. Studio is 997.93 / 290.39
kB gzip JavaScript and 68.56 / 12.21 kB CSS; core, browser and React are
425.51/84.25, 503.83/106.95 and 427.70/67.58 kB JavaScript/declarations. The
packed and minimal consumers remain 833,600/244,508 bytes and 826.35/242.35 kB
gzip respectively.

`milestone-2a-portable-core` is repeat-stable across 19 fixtures and four
surfaces. Its guard retains exactly 31 passes, 17 documented historical or
environment-sensitive differences and 28 unapproved surfaces. Scene retains
four historical differences and 15 unapproved candidates; settlement retains
its stable documented reference states. Approved renderer, scene and
settlement aggregates are unchanged. No update, promotion, fixture, schema or
tolerance command ran.

## Template Platform Milestone 1B — Studio UI boundary and composable viewport

Studio now owns its complete design system plus the existing field, field-rule,
diagnostic, font-resolution and quality-workbench panels. No root platform
production module imports the Studio UI or `apps/studio`; the retired root UI
and panel owners are absent and enforced by package/archive boundary checks.

`@sleinity/template-react` adds `TemplateInspectionViewport`, a host-styled
viewport with revision-current target measurement, fit/zoom/resize behavior,
inspection overlays, snapshot publication and an imperative handle. The
existing `TemplateInspectionPreview` props remain available through a native,
Studio-independent compatibility composition. Studio uses its own composition
with the unchanged buttons, icons, class names and capture selectors.

Portable tests, TypeScript, Studio/SDK builds and declarations, boundaries,
archives, packed/minimal consumers, documentation, appearance projection and
the expanded Studio browser smoke pass. Studio is 997.62 kB / 290.27 kB gzip
JavaScript and 68.56 / 12.21 kB CSS; the minimal consumer is smaller than
Milestone 1A at 826.35 / 242.35 kB gzip. The isolated consumer that exercises
both inspection APIs is 833,600 / 244,508 gzip bytes.

Fidelity runs `milestone-1b-studio-ui-boundary` and
`milestone-1b-studio-ui-boundary-compare` are repeat-stable across 19 fixtures
and four surfaces and retain exactly 31 approved passes, 17 documented
historical/environment-sensitive differences and 28 unapproved surfaces.
Scene and settlement retain their documented historical/unapproved states.
Approved identities remain unchanged; no update, promotion, fixture, schema or
tolerance command ran.

## Template Platform Milestone 1A — independent Studio build ownership

`apps/studio` now owns the actual Vite entry, routes, views, styles, assets,
optional Figma/open-font services, configuration and production output. Root
commands delegate to the workspace, while browser and fidelity tooling use one
shared Studio-root Vite bootstrap. There is no duplicate root application.

This is a physical relocation only. `src/components/ui`, all
`src/template-package` implementation, and the repository test-suite entry
remain as explicit compatibility seams. Packages have no dependency on
`apps/studio`; Milestone 1B must split `TemplateInspectionPreview` from Studio
controls before moving the remaining UI.

Portable tests, TypeScript, direct/root Studio builds, root dev delegation,
routes/history, optional API and exact font URL checks, SDK builds/declarations,
boundaries/archives, repository audit, packed/minimal consumers and both browser
smokes pass. Studio is 996.42 kB / 290.33 kB gzip JavaScript and 68.56 / 12.21
kB CSS. All 19 appearance projections are valid and deterministic.

Renderer run `milestone-1a-independent-studio` is repeat-stable across 19
fixtures and four surfaces and retains the Milestone 0 state: 31 approved
passes, 17 historical/environment-sensitive differences and 28 unapproved
surfaces. Scene and settlement retain their documented historical/unapproved
states. Approved renderer, scene and settlement identities remain unchanged;
no update, promotion, fixture, schema or tolerance command ran.

## Template Platform Milestone 0 boundary audit

The evidence-backed
[Template Platform boundary audit](../architecture/TEMPLATE_PLATFORM_BOUNDARY_AUDIT.md)
now classifies the complete production inventory as UI-independent platform,
reusable React, advanced inspection, Studio application, Studio fidelity, or
internal implementation. It records the actual facade-to-root imports, six
reverse Studio-UI dependencies, fifteen Studio internal dependency areas, the
resolved-to-render helper inversion, font/persistence cycle, public API gaps,
reusable importer direction, and decision-complete physical migration order.

This milestone changes documentation only. No source moved; no API, schema,
normalization, renderer, persistence, fixture, tolerance, or approved evidence
changed. Portable tests, TypeScript, Studio and package builds, archives,
boundaries, packed/minimal consumers, browser session smoke, documentation and
all 19 appearance projections pass. Renderer run
`milestone-0-platform-boundary-audit` is repeat-stable across 19 fixtures and
four surfaces. Renderer, scene and settlement guards retain their documented
historical/environment-sensitive and unapproved states. Approved identities
remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

## SDK 0.2 consumer runtime contract

The reusable SDK now exposes a versioned browser `TemplateSession` contract over
the existing import, asset, font, persistence, field, resolved-tree, render
identity, and PNG authorities. React consumers use a thin provider, snapshot
hook, and renderer adapter; the adapter rejects PNG export until the identity
for the current session revision is ready. No Studio UI is exported.

The session preserves an immutable imported baseline and revisioned working
package, rejects stale asynchronous import publication, supports injected
asset/font/repository adapters with existing offline browser defaults, and
provides typed edit/image/reset/restore/save/load operations. This is SDK
orchestration only: canonical schema, renderer owners, runtime routing,
settlement, pixels, diagnostics, and approved references are unchanged.

Package verification now includes a temporary consumer installed from packed
tarballs with no workspace aliases. The minimal consumer is migrated to the
session contract and covers editor and static/narrowcasting integration shape.
Bundle overlap between the three behavior-preserving facades remains documented
debt for a separate fidelity-guarded physical extraction milestone.

Current-run verification passes the portable unit suite, TypeScript, all three
package builds and declaration checks, package boundaries and archives, the
isolated packed-tarball consumer, the minimal consumer, Studio production build,
documentation links, the browser session smoke, and all 19 deterministic
appearance projections. Fidelity run `sdk-02-consumer-runtime-final` is
repeat-stable across 19 fixtures and four surfaces. Renderer, scene, and
settlement guards retain only their documented historical, environment-sensitive,
or unapproved states; no reference or tolerance update command ran. Approved
identities therefore remain renderer 96 /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

## Private monorepo and reusable SDK extraction

The Template Tool now has a pnpm monorepo contract with the Studio as reference
consumer and three publishable private facades: `@sleinity/template-core`,
`@sleinity/template-browser`, and `@sleinity/template-react`. The core facade
exposes ZIP import, strict validation, canonical/resolved/backend contracts, and
typed field updates without exporting React or Studio UI. The browser facade
owns asset/font/persistence/measurement/readiness/PNG services. The React facade
exports the proven renderer plus a small UI-free runtime context.

This is a packaging and dependency-boundary change, not a renderer authority
change. The implementation is bundled from the proven source while Studio
consumes the public entry points through workspace aliases. A minimal consumer
demonstrates ZIP import, a typed text edit, render-identity publication, and PNG
export without Validate, Fields, navigation, or editor controls.

Real ZIP fixtures and managed fonts remain external and hash-gated. Approved
renderer, scene, and settlement evidence remains in Git; generated candidates,
captures, update evidence, and local archives are excluded. No reference update
is authorized by the SDK extraction.

The first local `main` snapshot is commit `46daac8` and contains 706 files in
an 11.63 MiB Git object store. A fresh clone with no ignored local inputs
installed from the frozen lockfile and passed the complete portable CI command,
including Studio build, SDK builds/declarations, archive inspection, boundary
checks, lifecycle tests, documentation links, and the minimal consumer build.
Approved evidence is byte-identical to the pre-Git backup: renderer 96 files /
`be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene
4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
and settlement 80 /
`c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
Remote creation, first push, branch rules, collaborator invitation, and the
first package publication remain external GitHub administration; no package
has been published yet.

## Diagnostic authority tightening

Accepted ADR 0073 corrects false Review findings without changing renderer pixels. Ordinary text now selects `text-dom` and cannot inherit primitive fallback reasons. A valid bundled SVG/vector asset may supply `asset-evidence` when source `renderMode` is omitted; explicit unsupported intent and missing/incompatible source remain unchanged.

Backend decisions now distinguish semantic ownership, established compatibility ownership, degraded fallback, preserved-only, and unsupported. `fallback.active` represents actual loss of authority rather than implementation class. Rendering health separately reports review-required fallback regions and technical compatibility-owner counts. Dedicated font/asset readiness remains the root-cause authority, while readable large media and deterministic containment are informational.

Visible Chromium checks show `now-hiring-post` and `deal-of-the-week-post` Ready with zero Review items; their large-media and containment notes remain under Information. The 19-fixture four-surface run is repeat-stable, and direct comparison with the preceding MVP candidates confirms unchanged template pixels outside the intentional Validate UI presentation. Approved renderer, scene, and settlement aggregates remain `be6047fe…9f08`, `b788f6f…f54b`, and `c8295ff4…296e`; no reference update ran.

## Fidelity issue resolution — ordered SOLID + linear gradient

Both supplied fidelity packets (`0875b827…ed857` and `d5fc4f63…c4a3`) collapse to package `pkg_459_67_1784615329455`, node `459:68`, where compatibility ownership preserved a source-index-1 linear gradient but painted only the source-index-0 SOLID. Exact source fixture `ordered-solid-linear-normal` is now registered at ZIP SHA-256 `781e54def68e2dd769c96f9bc2a7152c9e0ab7db4f1137844d6fa15c019ace94`.

Accepted ADR 0072 adds `ResolvedOrderedNormalPaintStackV1` and `ordered-normal-paint-svg` only for one eligible SOLID followed by one eligible linear gradient, both visible NORMAL at node opacity 1. It reuses the existing SOLID opacity, gradient matrix/stops/opacity, settled bounds, and primitive-corner contracts under one SVG group/shared clip. Every other mixed pattern remains compatibility-owned.

Run `issue-2f69124d-7c79de23-resolution` is exact-repeat stable on Validate, Fields, editor, and PNG. All surfaces publish the same source, geometry, stack, layer, gradient, clip, and backend identities. The PNG and 710×880 target region are both pixel-exact to the supplied ZIP's embedded preview (0 changed pixels); the full 1000×1500 canvas is also exact. Evidence is under `fidelity/evidence/ordered-solid-linear-normal/`.

The approved renderer, scene, and settlement baselines remain unchanged and unpromoted. The source preview remains source evidence rather than an approved renderer reference.

Final verification passes unit tests, TypeScript, production build, strict diagnostic ZIPs, exact strict lifecycle, all 19 appearance projections, source evidence, two-pass four-surface capture, persistence/offline restoration, and documentation links. The targeted approved renderer guard retains its established 31/48 clean state: the 17 differences are the previously documented four historical fixture families plus the Validate-only `ordered-solid-paint-opacity` Inspector presentation; none originates in this paint owner. Full scene comparison retains the documented three historical differences and all newer unapproved fixtures. The new fixture's settlement is stable/ready on all four surfaces and intentionally unapproved. Approved counts remain renderer 96, scene 4, and settlement 80; no update command ran.

Production output is 993.23 kB minified / 289.64 kB gzip JavaScript and 68.56 / 12.21 kB CSS. Relative to the pre-correction current build, the bounded owner adds 6.82 / 1.24 kB JavaScript; CSS is unchanged. The existing large-chunk warning remains unchanged.

## Semantic Renderer MVP authority transfer

ADR 0071 supersedes ADRs 0068 and 0070 for active product behavior. The product has one semantic-first path: unfiltered `ResolvedRenderTreeV1` backend decisions automatically activate certified owners and coherent compatibility boundaries. There is no product Legacy/Semantic/Compare choice, `renderer-admin` control, cohort panel, rollout provider, or rollout/cohort diagnostic. The obsolete IndexedDB records remain inert; startup writes only the idempotent `semantic-renderer-mvp-migration-v1` marker.

`ResolvedProductRenderIdentityV1` now projects package, canonical, resolved, backend, settlement, font, asset, placement, readiness, and export-safety revisions. Validate, Fields, editor, shared previews, and hidden PNG expose this non-selecting identity. PNG retains ADR 0069's revision-bound raster-readiness gate.

Validate is the product fidelity workbench. `rendering-health-projection-v1` summarizes readiness, semantic families, compatibility/preserved-only regions, unsupported capabilities, source-reference availability, and the current product identity. Findings carry a root cause, origin boundary, capability/owner/fallback, affected surfaces, impact, repairability, and one bounded action. The selected finding can export a deterministic local `fidelity-issue-packet-v1`; raw ZIP and asset bytes are excluded and pixel evidence is explicit opt-in.

The in-product hidden visual comparison renderer has been removed. Product reports state `not-run-in-product`; the fidelity harness remains the only candidate/comparison/reference path. Approved identities remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. No reference update is authorized by this course correction.

The final seven-template smoke run `semantic-renderer-mvp-smoke` is repeat-stable across Validate, Fields, editor, and PNG. Every fixture publishes one identical `ResolvedProductRenderIdentityV1` across all four surfaces. A clean visible Chromium reload confirmed one identity-bearing live renderer, no hidden comparison renderer, no rollout controls, the saved-template Validate workspace, rendering-health summary, region finding selection, local issue-packet action, and no fresh warning/error logs. Certified owner-family, persistence/offline, export, strict lifecycle, appearance, unit, type, and build checks pass. Full renderer, scene, and settlement comparisons retain only their documented historical, validator-UI, or unapproved evidence states; no update command ran.

Final production output is 986.41 kB minified / 288.40 kB gzip JavaScript and 68.56 / 12.21 kB CSS. Relative to the pre-course-correction 983.84 / 285.85 kB JavaScript and 71.14 / 12.66 kB CSS, the change is +2.57 / +2.55 kB JavaScript and -2.58 / -0.45 kB CSS. Fidelity tooling, candidates, fixtures, and issue evidence do not enter the production bundle. The existing large-chunk warning is unchanged.

Historical Phase 13 evidence below is retained but no longer describes the active product path.

## Phase 13 Stage 1 operator cohort

Formal result: **Result A — implemented; guarded final verification recorded in the current handoff.** The implementation adds the pure deterministic eligibility evaluator, content-addressed subject identity, versioned eligibility/observation/decision/incident histories, IndexedDB metadata repository, explicit progress events, manual enrolment, operator-identified approval, pause/reject, automatic/manual rollback, 30-day expiry, revision invalidation, incident preservation, and operator-only diagnostics.

The operational store key is `renderer-rollout-cohort`, separate from packages, drafts, assets, template semantics, and `renderer-rollout-preference`. Unknown schemas, invalid records, mismatched keyed subject IDs, or future enum values are quarantined and select Legacy without deleting package data. Subject hashing includes package/canonical/field/asset/font/geometry/settlement/backend/renderer/capability/policy/reference authority and excludes names, filenames, source URLs, timestamps, routes, storage keys, and browser object URLs.

The only UI is the development-only `?renderer-admin=1` disclosure. There is no unrestricted Semantic button: Compare/Semantic requests arise from valid cohort transitions. A real registered now-hiring import completed Compare observation, reviewed compatibility, Semantic approval, all-surface identity, one visible owner, PNG export, reload/offline restoration, incident rollback, expiry, and corrupt-record recovery with zero renderer-time Figma requests and zero console errors. Missing/incomplete evidence remains Compare-only; hard unsafe outcomes remain Legacy and are covered by the pure contract suite.

No renderer feature, family owner, source/canonical package schema, reference, tolerance, public control, default, remote telemetry, or template-level preference was added. ADR 0070 is Accepted only for this local Stage 1 boundary. The recommended continuation is an operator trial on real templates; Stage 2 remains a separate unapproved decision.

Current-run verification is complete. Headless and headed cohort runs both pass; all 18 registered fixtures are repeat-stable across four surfaces; family regressions pass. Full renderer/scene/settlement guards retain their documented historical/unapproved differences. Approved byte aggregates remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. Production output is 983.84 kB minified / 285.85 kB gzip JS and 71.14 / 12.66 kB CSS; Stage 1's JS delta versus the preceding Phase 13 build is +0.19 kB minified and -0.06 kB gzip. The known large-chunk warning is unchanged.

## Phase 13 operator-cohort policy

Historical policy checkpoint: **Result A — policy ready.** [`SEMANTIC_ROLLOUT_POLICY.md`](SEMANTIC_ROLLOUT_POLICY.md) defined the Stage 1 contract that is now implemented above.

Eligibility is tied to a content-addressed package/canonical/field/asset/font/settlement/backend/renderer/reference/policy identity. Ordered outcomes distinguish repair blockers, Legacy-required failures, Compare-only evidence gaps, accepted compatibility, and full Semantic eligibility. Exact hard gates cover lifecycle, dependencies, singular ownership, export safety, current revisions, deterministic all-surface/PNG output, save/reload, offline restoration, zero renderer-time Figma/network dependency, and reviewed regional evidence.

The policy requires at least five operating days plus real imports/restores, edits and resets, exports, reloads, offline restoration, repeated captures, and operator review. It defines automatic, operator-confirmed, and engineering-reviewed rollback triggers; all hard failures return immediately to the existing lossless Legacy path. Any material package, field, font, asset, geometry, settlement, backend, renderer, reference, capability, or policy revision makes eligibility stale.

The four record contracts and ADR 0070 are now implemented and Accepted for Stage 1. This historical paragraph records the earlier documentation-only gate.

Historical next step completed: the bounded Stage 1 implementation. Current next step is a real-template operator trial; do not implement Stage 2, public UI, remote telemetry, percentage rollout, a default change, or Legacy removal.

## Phase 13 internal rollout modes

Formal result: **Implemented and current-run browser-verified.** This closes the bounded internal/admin rollout task; it does not authorize a public setting, template-level opt-in, Semantic-by-default migration, legacy removal, or wider capability support.

`ResolvedRendererRolloutDecisionV1` now wraps each `ResolvedBackendDecisionV1` before final owner activation. Missing preference returns the original resolved tree and prior per-surface core mode unchanged. Explicit `legacy`, `semantic`, and `compare` map centrally to disabled, authoritative, and compare core routing while preserving family-level coherent fallback. Accepted singular semantic family owners remain active when no competing historical implementation exists; stable owners were not rewritten for naming purity.

The v1 preference is stored in the existing IndexedDB metadata store under `renderer-rollout-preference`, separate from imported ZIP/package semantics. Known legacy string/v0 values migrate; unknown or corrupt values select safe current-default fallback. Rollback writes Legacy without re-import, while clearing the preference restores the missing-preference default. The root provider is the only persistence reader; Validate, Fields, editor, shared renderer surfaces, and hidden PNG consume the same revisioned decision.

Compare is observational. It records eligible/selected owners and differences in decision telemetry, activates exactly one visible owner, creates no hidden renderer, and never blocks output merely because compare evidence is absent. Capability diagnostics reuse the Phase 12 technical projection and do not create duplicate user-facing cards.

Current evidence:

- unit tests cover missing/corrupt preferences, v0/string migration, persistence, rollback, mode mapping, coherent fallback, deterministic identity, one-owner Compare, developer diagnostics, and fixture/surface filtering;
- `phase-13-legacy-now-hiring`, `phase-13-semantic-now-hiring`, and `phase-13-compare-now-hiring` are repeat-stable across Validate, Fields, editor, and PNG, with identical mode/persistence identity per run;
- `phase-13-compare-representative` is repeat-stable across media, mask, primitive/stroke, linear-gradient, ordered-SOLID, preserved paint, and node-opacity compatibility representatives;
- the internal control browser scenario and visible in-app review prove persistence across reload, safe corrupt-value fallback, rollback, clear-to-current-default, one visible owner, empty console, and zero renderer-time Figma requests.

No new renderer feature family, schema support, normalization rule, family resolver, pixel implementation, comparison tolerance, or approved reference was introduced. The production main JavaScript is 983.65 kB minified / 285.91 kB gzip, +13.48 / +4.15 kB over the Phase 12 970.17 / 281.76 kB build. The delta is rollout contracts/provider/control and telemetry; fidelity browser tooling stays out of the bundle. The existing large-chunk warning remains unchanged.

ADR 0068 is Accepted for internal rollout modes, and ADR 0070 is Accepted for the bounded local Stage 1 cohort. ADRs 0010 and 0012 remain Proposed. Stage 2 and any public/default rollout require a new decision.

## Phase 12 visible Import Inspector approval

Formal result: **Result A — Phase 12 browser-approved.** The prior visible-review blocker is closed. At that checkpoint Phase 13 remained a separate task; the implemented Phase 13 status above supersedes that sequence note.

The application ran at `http://127.0.0.1:5173/templates/new` in the visible Codex In-app Browser at 810×1343 CSS pixels and DPR 1.340000033378601. The exact embedded Chromium version was not exposed by the browser-control API and is intentionally not inferred. Final console evidence contained no warnings or errors.

The review covered source-certified gradient, ordered-SOLID, primitive/stroke, DOM/CSS core-layout, and media owners; node-opacity compatibility; preserved-only mixed/unsupported paint; a genuinely blocked exact-font dependency; and transformed-bounds measurement evidence. Healthy gradient and ordered-SOLID fixtures remained Ready with singular SVG owners. Now-hiring published 6 routed / 4 compatibility nodes and one imported-source cover media owner at placement revision 0. The compatibility control `459:59`, preserved-only root `2453:1435`, repairable font node `2453:1444`, and transformed node `451:181` all selected the correct region.

The initial browser review found presentation/projection defects only. Narrow corrections now:

- keep raw capability IDs and renderer owners behind `Issue technical details`;
- group derivative missing-motion records as one user problem;
- keep renderer warnings covered by a backend projection in technical trace instead of duplicate user cards;
- distinguish visible-but-not-repairable compatibility from real font/asset/source repair paths;
- avoid classifying ordinary paint `fill` terminology as layout/stabilization evidence;
- reconcile a ZIP-backed external asset normalization with its stale unresolved source trace;
- keep blocker shortcuts/counts user-audience consistent;
- expose decision owner, editability, export safety, and complete revision identity in copied technical evidence.

Screenshots and exact diagnostic/node identities are in [`fidelity/evidence/phase-12-import-inspector-visible/REVIEW.md`](../../fidelity/evidence/phase-12-import-inspector-visible/REVIEW.md). They are review artifacts, not golden references. No renderer, schema, normalizer, resolver, runtime route, approved reference, snapshot, or tolerance changed; the verification commands generated only unapproved candidates and evidence.

Current-run verification passes the full unit suite, type checking, production build, strict diagnostic ZIPs, strict realistic-ZIP lifecycle, all 18 appearance projections, runtime-routing stage 4A/scenarios/fonts/text trim, image replacement/reset/stale-work rejection for all three editable media fields, and mask/primitive browser persistence/offline scenarios. Fidelity run `phase-12-import-inspector-approval` is repeat-stable across 12 fixtures × four surfaces. The 31 unaffected approved comparisons are pixel-exact and geometry-equal. Its only new approved-reference difference is `ordered-solid-paint-opacity/validate`: geometry is equal and the 1,411 changed pixels are confined to the deliberately improved Inspector diagnostic for compatibility-owned node `459:59`; Fields, editor, and PNG remain exact. The four historical core fixture directories retain their documented unpromoted differences. Full scene and settlement guards retain only their documented historical/unapproved states.

No update command ran. Approved identities remain renderer 96 files / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. The production main JavaScript is 970.17 kB minified / 281.76 kB gzip, +2.08 / +0.72 kB over the preceding 968.09 / 281.04 kB build. The delta is diagnostic projection/presentation code; no renderer owner or harness code entered the bundle. The known large-chunk warning is unchanged.

ADR 0067 remains Accepted with visible-browser evidence. At this Phase 12 checkpoint ADR 0068 was still Proposed; it is now Accepted for the bounded internal Phase 13 contract recorded above.

## Headed PNG determinism result

Formal result: **Result A — headed PNG determinism fixed.** At this historical checkpoint the broader Phase 11–12 approval still awaited the visible Import Inspector review and Phase 13 had not begun; both later states are recorded above.

The defect was Chromium's first foreignObject-to-canvas raster for a newly settled CSS-background media revision, not image placement, decode, object-URL lifetime, backend selection, layout, or settlement geometry. Before correction, five headed exports differed only between captures 1 and 2 by 645 pixels in `x=421, y=0, width=221, height=1080`; captures 2–5 were exact. A serialization-only preflight reproduced the defect. A completed discarded first raster followed by the retained raster removed it.

ADR 0069 adds a revision-bound raster-readiness gate to the real PNG path. Current media sources must decode with intrinsic dimensions; the gate fingerprints package/canvas, settlement, primitive/backend, asset/placement, current geometry, and computed placement state without using raw object-URL identity. One discarded raster is required for each new CSS-media capture-node revision; later captures of that revision skip it. A `WeakMap` retains neither DOM nodes nor URLs after node collection.

Fresh headed runs `phase-11-12-png-determinism-final-headed-a` and `phase-11-12-png-determinism-final-headed-b` each produced five byte-identical PNGs at SHA-256 `2af9ebaa4d941de15b05879ad443efe22acf1b8e377a9801b8295eba99b9a5b1`. Headless run `phase-11-12-png-determinism-final-headless` produced five byte-identical profile-specific PNGs at `af27daeecce1d4da9754621d8140e77b3bcaed3ca0716d3a3ac467bfdd1b0075`. The affected nodes `346:38`, `346:41`, and `346:44` remain `dom-css` / `media-dom`, decode the same 1125×750 asset, retain placement revision 0 and backend decision `74de999e`, and publish unchanged template geometry.

The first headed warmup measured approximately 400 ms; later exports record zero warmup and final raster times around 169–171 ms. Object-URL count stayed constant from capture 1 through capture 5 in headed and headless runs. No export created, recreated, or revoked the settled asset URL, and no leak was introduced.

Run `phase-11-12-png-determinism-all-regression` covers all 18 registered fixtures × four surfaces × two repeats; all 72 surfaces are stable. Its 96 overlapping PNG captures are byte-identical to `phase-11-12-browser-closure-final`. Guard `phase-11-12-png-determinism-approved-guard` passes all 32 approved gradient and ordered-SOLID surfaces pixel-exact with equal geometry. Media replacement/reset/stale work, routing, fonts, text trim, masks, primitives, strokes, gradients, ordered SOLIDs, persistence, reload, offline operation, and zero runtime Figma requests pass.

Approved identities remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. Full scene/settlement guards retain their documented historical and unapproved failures; no approved file or tolerance changed.

Current production main JavaScript is 968.09 kB minified / 281.04 kB gzip, a +3.64 / +1.13 kB delta from the 964.45 / 279.91 kB browser-closure build. Harness lifecycle/network evidence remains outside the production bundle. The known large-chunk warning is unchanged.

## Historical Phases 11–12 browser approval result (superseded)

Historical result: **Result B — superseded by ADR 0069 and the visible Phase 12 Result A above.** This section preserves the evidence that led to the two closure tasks.

Final headless run `phase-11-12-browser-closure-final` covers the 12 approved renderer fixture directories across Validate, Fields, editor, and PNG export with two captures per surface. All 48 surfaces repeat exactly. Against the pre-Phase-11 run `milestone-7-4-all-regression`, all 48 candidate PNGs are byte-identical and all 48 normalized geometry comparisons are equal. The capture exposes 328 node/surface `ResolvedBackendDecisionV1` records: every record is complete, every primary owner participates in its decision, no Canvas/WebGL backend is selected, and each fixture publishes the same decisions across all four surfaces. Current primary-owner counts are `primitive-dom-css` 156, `legacy-dom-css` 76, `media-dom` 24, `fallback-placeholder` 8, `linear-gradient-svg` 40, and `ordered-solid-svg` 24.

The browser pass found and corrected two narrow Phase 11 defects without changing rendered output. First, live non-export telemetry now publishes the complete backend decisions and backend-availability record, and the fidelity structural report retains them. Second, pure single-image nodes no longer register an obsolete generic compatibility-paint owner; they select `dom-css` / `media-dom` with only core-layout and media participation. Mixed-paint boundaries remain compatibility-owned. Persistence harnesses now compare the exact backend decision before and after reload. Primitive, stroke, gradient, ordered-SOLID, mask, and media scenarios preserve decision identity with Figma blocked and record zero renderer-time Figma requests.

The approval blocker is `deal-of-the-week-banner` PNG export in headed Chromium 149.0.7827.55. Validate, Fields, and editor repeat pixel-exactly, and PNG geometry, backend decisions, font readiness, and image-placement telemetry are equal, but PNG capture 1 versus 2 differs by 645 thresholded pixels (`0.031105324074074077%`) in bounds `x=421, y=0, width=221, height=1080`. The same result reproduced in fresh run `phase-11-12-banner-visible-recheck`. The region intersects native `media-dom` FILL nodes `346:38`, `346:41`, and `346:44`; their selected backend is `dom-css`, primary owner is `media-dom`, and family owners are `core-layout` plus `media-dom`. Headless Chromium 149.0.7790.0 is exact for the same PNG. This is classified as an existing visible-profile browser image-sampling/hidden-PNG issue, not a Phase 11 routing or geometry defect. No tolerance or renderer correction was added. The smallest follow-up is a bounded media PNG sampling investigation comparing asset decode/object-URL state between repeated headed hidden-renderer exports.

The actual application was reachable at `http://127.0.0.1:5173/templates/new`, and headed Playwright scenarios ran successfully through the repository's local Vite harness. The in-app Browser initially claimed and reloaded the local tab, but its URL security policy rejected the subsequent DOM inspection call. Therefore the visible Import Inspector's presentation, expanded technical details, and screenshot set remain unapproved in this pass. Automated diagnostic-projection tests continue to pass and verify capability/region grouping, plain-language titles, repairability, owner/support metadata, and one technical-details panel, but they do not substitute for the requested visual review.

Approved identities remain renderer 96 / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. No update command ran. Full guards retain their documented historical and unapproved states. The isolated CROP region remains 816 pixels / 0.19921875%; the node-opacity control `459:59`, one-pixel now-hiring Validate residual, historical scene/settlement differences, and missing structural-node issue for `429:46` remain unchanged.

Phase 11 adds `ResolvedBackendDecisionV1` to every resolved node and a tree-wide `backendDecisionRevision`. Existing core layout, DOM/CSS primitive, SVG primitive, SVG gradient, SVG ordered-SOLID, media, vector, mask clip, compatibility, fallback, and unsupported owners register behind the decision without rewriting their family contracts. Canvas/offscreen and WebGL are represented once as unavailable capability boundaries; ADR 0012 remains Proposed.

Phase 12 adds `ResolvedBackendDiagnosticProjectionV1`, bound to the decision revision. It classifies existing resolved evidence, groups it by capability and region, and adapts meaningful entries into the existing quality workspace. The Import Inspector shows a calm capability summary and affected target while retaining owner, fallback, confidence, visual impact, source codes, and revision evidence behind its technical view. Visual diff remains non-blocking.

Phase 13 is not implemented. Current internal behavior remains editor `authoritative`, static `compare`, and optional `disabled` for core layout, with family-specific resolved appearance routing. No template-level Legacy/Semantic/Compare preference exists and no default or legacy behavior changed. After the Result B blockers are closed, the recommended Phase 13 task remains the restricted internal opt-in described in [rollout modes](ROLLOUT_MODES.md).

Current-run verification passes the full unit suite, type checking, production build, strict diagnostic ZIPs, strict realistic lifecycle, all 18 deterministic appearance projections, source-evidence checks for CROP, masks, primitives, strokes, gradients, and ordered SOLIDs, and the browser-backed routing/font/text-trim/persistence suites. Documentation links pass after this result was recorded. The production main JavaScript is `964.45 / 279.91 kB` minified/gzip, `-0.09 / 0.00 kB` against the pre-browser-pass Phase 11 build. The existing large-chunk warning remains.

Milestone 7.4 implementation: the accepted source gate is now a bounded runtime transfer. Eligible axis-aligned FRAME/RECTANGLE nodes with two-or-more source-certified SOLIDs, NORMAL paint blending, node opacity 1, accepted corner geometry, and no mask/effect/stroke/media/vector/compositing dependency resolve to `ResolvedOrderedSolidStackV1`. One SVG subtree paints visible layers from index 0 upward inside one shared primitive clip. Hidden layers remain provenance; ambiguous opacity or any unsupported property selects coherent whole-node compatibility. Accepted ADR 0065 governs the owner.

Evidence run `milestone-7-4-ordered-solids` captures six exact fixtures × Validate/Fields/editor/PNG × two repeats. Every certified target region is pixel-exact to its embedded preview. The paint-opacity fixture's separate node-opacity-0.5 control remains compatibility-owned and explains 225,070 full-canvas pixels while target `459:57` is exact. Headless and visible persistence/offline runs restore identical source/geometry/stack identities with zero Figma requests. `milestone-7-4-all-regression` is byte-identical to `milestone-7-4-prechange` for every one of the 48 pre-existing fixture/surface PNGs.

Milestone 7.4 approval: the user accepted the Result A visual review on 2026-07-19 and explicitly authorized guarded promotion of the six ordered-SOLID fixtures across Validate, Fields, editor, and PNG export. Promotion created exactly 48 approved files: 24 `reference.png` files and 24 normalized `structure.json` files. All 48 pre-existing renderer files remain byte-identical. Approved identities are now renderer 96 files / `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`, scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and settlement 80 / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

Fresh run `milestone-7-4-promotion-verify` passes all 24 approved comparisons pixel-exact with equal geometry and two stable captures per surface. Existing gradients pass 8/8 in `milestone-7-4-promotion-gradient-guard`. Source order, repeated source-over, hidden-paint preservation, apply-once opacity, and shared independent-corner clipping are therefore part of the approved renderer baseline. Node `459:59` remains coherently compatibility-owned because node opacity is 0.5; its reviewed appearance is included in the surface reference but does not authorize node-opacity routing.

The main production JavaScript is 948.30 kB / 275.23 kB gzip, +8.01/+1.86 kB against the preceding 940.29/273.37 kB build. Evidence scripts and external fixtures are excluded; the known large-chunk warning remains. Local ordered-stack resolution ranges from 0.0760–0.1418 ms/tree and 0.03800–0.05759 ms/node; resolved-tree construction ranges 0.198–0.325 ms. These are local observations, not budgets.

Milestone 7.2 approval: accepted by the user on 2026-07-17. The remaining 18 pixels at the ancestor-clipped OUTSIDE SVG raster edge are an accepted deterministic antialiasing difference. No correction logic or tolerance/reference change is authorized or required.

Milestone 7.3A approval: the user separately authorized the bounded production implementation and, on 2026-07-18, accepted the Result A visual review and guarded promotion of Validate, Fields, editor, and PNG for both registered gradient fixtures. Eligible isolated `GRADIENT_LINEAR` now has strict source-indexed canonical semantics, one-inverse resolved geometry, one SVG runtime owner, and approved renderer baselines. All other gradient combinations retain compatibility ownership.

Phase 7 completion audit: Result B on 2026-07-18. The exact 17-ZIP external corpus contains eight multi-fill nodes, including five semantic SOLID+IMAGE nodes across six archive occurrences, but no source-isolated ordered stack. The runtime preserves paint arrays yet does not evaluate them as a general ordered stack. No audited archive contains radial/angular/diamond gradients, gradient strokes, multiple strokes, dashes, caps/joins/miters, or per-edge weights. The one evidence-backed next fixture family is ordered multiple fills with `NORMAL` blending. See [the completion audit](PHASE_7_PAINT_STROKE_COMPLETION_AUDIT.md).

Ordered-stack intake: Result A on 2026-07-19. The initial fixture family establishes index-ascending back-to-front evaluation, repeated source-over, visibility, one source Fill-opacity operation, and later mixed-paint requirements; the genuine reverse control remains certified. The Figma Plugin API establishes RGB-only `SolidPaint.color` and paint-owned opacity, allowing a strict exporter-0.6.0 mirrored-alias predicate with preserved serialized provenance and apply-once canonical opacity. Final ZIP `a080321e…b47` adds target `465:73` with two visible NORMAL SOLID entries and independent corners 120/48/84/24. Source preview samples confirm the accepted node-level rounded geometry; the blue layer is explicitly opacity 0, so the earlier partially opaque fixtures remain the compositing evidence. See [the intake](ORDERED_NORMAL_FILL_STACK_INTAKE.md) and [runtime contract](ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md).

At the earlier source-gate closure, verification passed the exact-fixture strict lifecycle, full tests, type checking, production build, diagnostic ZIPs, and documentation links. The importer/source-contract addition moved the main JavaScript from 934.29/272.03 kB to 940.29/273.37 kB minified/gzip. The renderer aggregate at that historical boundary was `204d6766…5ede`; the current promoted aggregate is recorded above. Scene and settlement aggregates remain `b788f6f1…f54b` and `c8295ff4…296e`.

Asset-free lifecycle correction: explicitly approved by the user on 2026-07-18. Keep the zero-dependency normalization, node/media-field dependency checks, canonical validation, and capability-aware strict lifecycle coverage in the production importer and validation path.

## Current architecture and authority

`workingPackage` remains canonical editing authority and `basePackage` preserves the imported baseline. `CanonicalSceneGraphV1` owns semantic geometry/appearance/provenance. `ResolvedRenderTreeV1` remains the primary rendering projection. `CoreLayoutSettlementV1` owns capability-routed layout geometry; `PrimitiveAppearanceV1` owns only its source-certified appearance subset. Browser pixels remain DOM/SVG/CSS output rather than one global settled appearance graph, so ADR 0010 remains Proposed.

Exact managed fonts now retain the same binary-hash/private-family authority in embedded browsers that implement CSS `@font-face` but omit the JavaScript `FontFace` registration API. Readiness is published only after stable cross-fallback geometry proves the private face is active; `document.fonts.check()` remains supporting evidence only. This is an activation compatibility correction, not a font-matching, renderer, measurement, or fidelity-authority change.

For eligible axis-aligned FRAME/RECTANGLE nodes, the primitive route now supports:

- zero or one opaque ordinary SOLID fill;
- uniform or four independent corners;
- source-certified edge-local Figma corner clamping from current settled bounds;
- zero or one opaque uniform rectangular INSIDE, CENTER, or OUTSIDE SOLID stroke;
- explicit source/fill/inner/centre/outer/visual stroke bounds;
- separate primitive and ancestor clipping evidence;
- singular capability-based DOM/CSS or SVG ownership;
- source, geometry, paint, stroke, and clip-chain revision identity across live surfaces and PNG.
- one isolated source-certified linear gradient with two/three ordered stops, stop alpha, paint opacity, normalized one-inverse geometry, pure node rotation, independent corners, and current-bounds resize.
- eligible two-or-more SOLID NORMAL stacks with strict apply-once opacity provenance, hidden-entry preservation, current-bounds corner geometry, and one SVG group/shared clip.

Uniform INSIDE retains its proven CSS inset owner. Independent-corner INSIDE and eligible CENTER/OUTSIDE use one SVG fill/stroke owner. Expanded strokes remain non-layout-affecting. A self-clipped expanded primitive, layout-included stroke, advanced stroke/paint, unsupported transform, mask/media/vector owner, effect, or blend selects the complete compatibility boundary.

## Milestone 7.3A current evidence

- Registered `gradient-test-linear`: 611,320 bytes; ZIP `d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b`; preview `1a1a4575d1309c33bd09e5030d9df055231af11a0d524173043eaf05648b0d79`; package/root `pkg_451_135_1784371485904` / `451:135`.
- Registered `gradient-test-paint-opacity`: 193,635 bytes; ZIP `9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3`; preview `4d12e49e0b0734f092c34a9257fb3c8b6287ba07ddd638704056bdee8665afc4`; package/root `pkg_457_36_1784372293276` / `457:36`.
- `fidelity/candidates/milestone-7-3a-linear-gradient/`: both fixtures, four surfaces, two captures, exact repeatability.
- `fidelity/candidates/milestone-7-3a-all-regression/`: all twelve fixtures and all 48 surfaces repeat exactly. Against `milestone-7-2-all-final`, all 40 comparable pre-gradient structures are equal and 39/40 pixels are exact; now-hiring Validate has one isolated raster pixel with unchanged geometry.
- Source/PNG: 3 pixels / 0.0002% for the nine-case fixture; 0 pixels for paint opacity. No correction logic or tolerance change was added.
- Headless and visible save/reload with Figma blocked: identity equal; zero runtime enrichment requests.
- Pure resolution: approximately 0.025 ms per gradient node; resolved tree 0.645 ms for nine gradients and 0.112 ms for one gradient. Heap deltas are noisy local evidence, not budgets.
- Build: 934.29 kB / 272.03 kB gzip main JS, +13.73/+3.69 kB against the last 920.56/268.34 kB recorded build. Evidence scripts and fixture bytes are excluded.
- Result A visual review accepted all eight fixture/surface candidates. The three source residual pixels at `(481, 201)`, `(508, 744)`, and `(511, 745)` are accepted deterministic rounded-edge raster antialiasing, not renderer defects; no correction logic or tolerance changed.
- Guarded promotion from `milestone-7-3a-all-regression` created exactly 16 approved files for the two gradient fixtures. The 32 pre-existing renderer files remain byte-identical at aggregate `ddf89792caa8030e892e5d14d87e7aaccd43fa8374bbb7612f6c9491063fec6e`; the complete 48-file renderer aggregate is `204d676628098e9440634be7fa33b73d79937fb9a2edc3ef5aefd17e2d065ede`.
- Fresh guarded renderer run `milestone-7-3a-promotion-verify` passes all eight approved comparisons pixel-exact with equal geometry and two stable captures per surface.
- Scene remains 4 files / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`; settlement remains 80 files / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`. Their full-manifest guards remain intentionally non-clean for documented historical differences and unapproved newer fixtures; no scene or settlement promotion ran.
- Existing family regressions pass: CROP region remains 816 pixels / 0.19921875%; editable Fill/Fit/reset/stale work passes all three fields; mask region remains 1,461 pixels; primitive regional counts remain 272 and 210; stroke source residual remains 18 pixels.

Accepted ADR 0063 and [runtime authority](LINEAR_GRADIENT_RUNTIME_AUTHORITY.md) are now the durable contract. ADR 0010 and ADR 0012 remain Proposed. Milestone 7.3A is fully closed. Any broader gradient, paint-stack, or compositing work requires a separate fixture-led milestone and explicit approval.

Milestone 7.4 is fully closed. Mixed SOLID+gradient or SOLID+IMAGE stacks, IMAGE opacity, non-NORMAL blending, node-opacity routing, effects, broader masks, arbitrary vectors, Canvas/WebGL, general compositing, and tolerance changes remain outside this authority.

## Milestone 7.2 authoritative fixture

- `/Users/niels/Documents/Templates/template-package-stroke-test.zip`
- 32,574 bytes
- ZIP SHA-256 `53564876e6bf9d9924528eefbbd8eea9ab8f176bb91bef731c0f9785c3b3eb29`
- template SHA-256 `28b6720e417ea339a432ff79f127b34a191801c975e121c73a4ac0d18f0c75a9`
- preview SHA-256 `8fb0bca096694f177f02871fa4dd775b8ae51c7fc510bfcf4b848a1a17e1c4be`
- package/root/exporter/canvas: `pkg_443_87_1784276898719` / `443:87` / 0.6.0 / 1200×630
- exact nodes: `443:88` INSIDE control; `443:89` CENTER; `443:90` OUTSIDE plus ancestor clip; `443:94` 40/20/80/8 corners; `443:95` 999/999/0/999 edge-local clamp.

The exporter omits `assets.json` while declaring and referencing no assets. Normalization synthesizes an empty registry only for this provably empty class and records provenance. Missing `assets.json` remains blocking whenever any source asset is declared or referenced.

## Current evidence

- Final source run: `fidelity/candidates/milestone-7-2-final-edge-local/`; every surface captured twice and stable.
- Visible Chromium run: `fidelity/candidates/milestone-7-2-final-edge-local-headed/`; every surface captured twice and stable.
- All-ten-fixture run: `fidelity/candidates/milestone-7-2-all-final/`; all 40 fixture/surface outputs repeat exactly.
- Source packet: `fidelity/evidence/milestone-7-2-strokes/milestone-7-2-final-edge-local/`.
- Offline persistence: `fidelity/evidence/milestone-7-2-strokes/milestone-7-2-reload-headless/` and `milestone-7-2-reload-headed/`; identity equal, console clean, zero Figma requests.

Source-preview comparison improves from 13,193 changed pixels (`1.745106%`) to 18 (`0.002381%`). INSIDE control, CENTER, four-corner, and extreme-normalization regions are pixel-exact. The 18 remaining pixels are confined to the ancestor-clipped OUTSIDE SVG raster edge (`0.043253%` of that crop). Template-space geometry and structural identity are exact across surfaces.

All 36 comparable Milestone 7.1 fixture/surface images remain byte-for-byte pixel-equivalent to `milestone-7-1-all-final-3`. Existing INSIDE evidence remains 272 perimeter pixels / 1.5829% for bb-cover and 210 / 2.2786% for main-visual. Mask evidence remains 2,262 full-canvas and 1,461 mask-region pixels. CROP evidence remains 816 pixels / 0.19921875% in its isolated 640×640 region. The replacement Fill/Fit/reset/stale-work matrix passes for all three editable image fields. Runtime-routing, exact-font, and text-trim scenarios pass.

## References and guarded comparisons

Current approved aggregate identities are:

- renderer: 48 files / `204d676628098e9440634be7fa33b73d79937fb9a2edc3ef5aefd17e2d065ede`; the pre-gradient 32-file subset remains `ddf89792caa8030e892e5d14d87e7aaccd43fa8374bbb7612f6c9491063fec6e`;
- scene: 4 files / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`;
- settlement: 80 files / `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.

The targeted gradient renderer guard is clean for all eight promoted surfaces. Full-manifest renderer, scene, and settlement comparisons remain non-clean where documented historical/profile differences or unapproved fixtures exist. `stroke-test-primitives` remains unapproved on all four renderer surfaces and in scene/settlement evidence. These failures are review guards, not permission to update references. No tolerance changed.

## Performance and bundle

Local primitive microbenchmarks: bb-cover 0.2648 ms/tree, main-visual 0.1104 ms/tree, stroke-test 0.1215 ms/tree (0.01736 ms/node); stroke-test full resolved tree 0.347 ms. The final stroke fixture run took 2,276–2,585 ms by environment; all-ten-fixture capture total was 27,198.7 ms.

Production build passes at 920.44 kB / 268.27 kB gzip for the main JavaScript chunk, +7.68/+2.13 kB over the documented Milestone 7.1 build. The delta contains generic corner/stroke geometry, SVG path output, normalization provenance, and telemetry. Fixture bytes, source previews, pixel tooling, and evidence scripts remain outside the production bundle. The existing >500 kB warning remains known.

## Supported, partial, and deferred

Source-certified families now include core layout/text routing, exact managed-font identity, CAP_HEIGHT vertical trim and glyph placement, imported FILL/FIT/affine CROP, replacement Fill/Fit/reset/persistence, rectangular clipping, opaque rectangular ALPHA-mask lowering, the bounded primitive subset above, and isolated `GRADIENT_LINEAR` within the accepted ADR 0063 contract.

Still compatibility-owned or deferred: hidden/partial/multiple paints or strokes, linear-gradient combinations outside the bounded certified subset, radial/angular/diamond gradients, gradient strokes, layout-included or independent-width strokes, dashes/caps/joins, primitive self-clipping with expanded strokes, corner smoothing, transforms outside the certified axis-aligned subset, partial/luminance/vector/nested masks, effects, blend/compositing, variables/components, arbitrary vector semantics, TILE, Studio crop UI and exporter-authored multi-aspect Family crop certification, Canvas/WebGL/offscreen rendering, and one shared post-measurement graph.

## Asset-free strict lifecycle correction

An intentionally asset-free ZIP is valid when `template.json.assets` is empty, no node or paint references an asset, no image field declares `defaultValue`, `assetRef`, or `typedRef` asset authority, no reference preview requires an asset, and `assets.json` is valid/empty or is provenance-normalized under the existing omitted-empty rule. This is a package-lifecycle rule, not gradient authority.

This behavior is approved production authority. It must not be reverted to a fixture-wide requirement for arbitrary image content, editable text, or byte-size mismatch evidence.

The strict realistic-ZIP lifecycle is now capability-aware: it verifies storage and alias behavior for assets that exist without requiring every fixture to contain an image, and it performs field edit checks only for fields that the package declares. Actual asset dependencies remain strict. Declared package assets, node/image-paint references, and media-field references prevent omitted-empty normalization; unresolved media-field references also fail canonical validation against an explicitly empty manifest.

Current-run evidence on 2026-07-18:

- `pnpm test`: passed with the default exact realistic ZIP;
- `TEMPLATE_PACKAGE_LIFECYCLE_ZIP=/Users/niels/Documents/Templates/template-package-gradient-test.zip pnpm test:realistic-zip`: passed in strict mode at 470,098 bytes / `aa55a9c4413f72c443b646bcf257cc21e6fbb465e500da0decbe7cbb184b01f8`;
- `pnpm exec tsc -b --pretty false`: passed;
- `pnpm build`: passed at 920.56 kB / 268.34 kB gzip for the main JavaScript chunk, +0.12/+0.07 kB versus the recorded Milestone 7.2 build; the known large-chunk warning remains;
- `pnpm test:diagnostic-zips`: both strict image-bearing fixtures passed;
- `pnpm docs:verify`: passed, 116 Markdown files and 209 local links;
- approved-reference directories retain 32 renderer, 4 scene, and 80 settlement files, with no files modified during this correction and no update command run.

No renderer behavior, gradient support claim, fixture registration, candidate, or approved reference changed.

## Historical fixture gate and current boundary

Milestone 7.3A is now implemented, visually approved, reference-promoted, and closed for the bounded isolated `GRADIENT_LINEAR` subset. The historical gate record below explains how source authority was established. It does not authorize radial/angular/diamond gradients, gradient strokes, mixed paint stacks, non-NORMAL blending, effects, masks, shaders, Canvas/WebGL, or general compositing.

The final exact revision supplies an isolated gradient whose raw and canonical paint opacity are 0.5, node opacity is 1, and every stop alpha is 1. Handles, independent corners, diagonal non-square geometry, controlled resize, and paint-opacity operation order are closed source questions. The historical [Milestone 7.3A plan](LINEAR_GRADIENT_IMPLEMENTATION_PLAN.md) was completed under Accepted ADR 0063 and the resulting renderer references are approved. Radial/angular/diamond gradients, gradient strokes, multiple paints, non-NORMAL blending, effects, masks, compositing, Canvas/WebGL, and unrelated primitive work remain excluded. ADR 0010 and ADR 0012 remain Proposed.

The supplied adventure-travel ZIP was audited and does not pass the gate. Its one VECTOR gradient has an exact raw matrix and independently exported SVG endpoints, partially supporting normalized node-to-gradient matrix direction with one inverse for handle geometry. All stops and opacity layers are opaque, the stops are only 0/1, geometry is an arbitrary vector path, there is no resize state, and the SVG asset—not a canonical gradient resolver—owns current pixels. Cross-surface authority was not claimed. See [LINEAR_GRADIENT_INTAKE_EVIDENCE.md](LINEAR_GRADIENT_INTAKE_EVIDENCE.md).

The supplied gradient-test ZIP materially advances the gate but does not close it. Exact ZIP `aa55a9c4413f72c443b646bcf257cc21e6fbb465e500da0decbe7cbb184b01f8`, package/root `pkg_451_135_1784286420523` / `451:135`, preview `751f48e63e167c6792173a3eaad24d8293550c4cacd653bebbcd4ffcf3b2cc67`. Six asset/font-free root/rectangle cases establish normalized node→gradient matrix direction, one inverse for the stop axis, preserved nonuniform and three-stop positions, straight-color plus separate-alpha interpolation, vertical non-square/static size pairing, diagonal geometry, uniform-radius clipping, and gradient-local-before-node-rotation order. Missing: selected diagonal handles, paint opacity below 1, four independent corners, source-reviewed same-node resize, runtime owner, and cross-surface results. See [LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md](LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md).

The exact supplementary ZIP `c2a41a23ed57651f50406bf645779191480eca38514c2a748cbe5b064ad6890a` (588,502 bytes; package/root `pkg_451_135_1784370704869` / `451:135`; preview `f585ca5e13695d1a04f85f8006570b7e8341d3f049e912a6ff0f30200c32d698`) closes source-side four-independent-corner clipping and strengthens diagonal non-square evidence through node `451:175` at 554×240. Formal gate result is Result B. Selected handles are absent; node `454:30` uses node opacity 0.7 while paint opacity remains 1; and resized node `451:175` changes stops from `0.245192/0.75` to `0/1`, so resize-only semantics are not isolated. Production gradient authority remains blocked.

The second supplementary ZIP `d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b` (611,320 bytes; package/root `pkg_451_135_1784371485904` / `451:135`; preview `1a1a4575d1309c33bd09e5030d9df055231af11a0d524173043eaf05648b0d79`) plus screenshots `c7e991d2…a5ce` and `c0dded80…a88a` closes selected handles and controlled resize. The third-handle prediction is within 0.746/0.959 screenshot pixels; `451:175` retains byte-identical stops/transform across 554×240 and 710×240, with normalized source samples stable within one channel. Node `454:30` now uses stop alpha 0.8, not paint opacity; raw/canonical paint opacity remains 1. Formal result remains Result B on that single source property.

Final ZIP `template-package-gradient-test-4.zip` is 193,635 bytes at `9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3`, package/root `pkg_457_36_1784372293276` / `457:36`, exporter 0.6.0, with 1000×1500 preview `4d12e49e0b0734f092c34a9257fb3c8b6287ba07ddd638704056bdee8665afc4`. RECTANGLE `457:46` contains one raw/canonical linear-gradient paint at opacity 0.5, node opacity 1, opaque stops, and no competing appearance. The correct paint-opacity-then-source-over model matches within one channel; RGB-only, double, and ignored opacity differ by up to 47, 44, and 90. Formal cumulative decision is Result A: the source gate is closed. At that historical gate boundary production was unchanged and ADR 0063 was Proposed; the later accepted implementation and approved references are recorded at the top of this status.
## 2026-09-13 carousel editor text reflow correction

V2 materialization now reconciles imported text style ranges around a contiguous content edit. Inserted characters inherit the preceding adjacent run, following ranges shift with the edit, the immutable base package retains its imported ranges, and the materialization revision continues to bind the derived working package to canonical content. The renderer also preserves any text not covered by imported range endpoints, preventing stale or incomplete source metadata from silently dropping canonical characters.

The FILL-inside-HUG route remains an explicit circular compatibility boundary. Its editor CSS now uses the child's intrinsic flex basis so text drives the HUG parent until declared min/max constraints clamp it; fixed and ordinary FILL distribution are unchanged. No route, backend, schema, persistence version, SDK field semantic, or approved reference changed.

The exact local carousel package rendered all edited characters after the correction: title 30, subtitle 31, and headline 75. Title and subtitle badges expanded and wrapped at their imported 640 px maximum; the fixed/FILL/TRUNCATE headline retained its imported box and clipping. Portable tests, Core/React typechecks, full Studio build, `runtime-routing:stage4a`, `studio:drafts`, `field-rules:studio`, and desktop/768 px `studio:workflow-acceptance` passed. The 23-fixture four-surface fidelity capture `2026-09-13T16-58-18-728Z` was stable. Full renderer, scene, and settlement comparisons remain non-clean because this shared worktree contains earlier unapproved contract/fixture changes; no reference update or tolerance change ran.

## 2026-09-14 type-qualified field identity

TemplatePackage and canonical content schema 2.1 use `<type>:<name>` field IDs.
Loose V1 input qualifies IDs before duplicate validation, accepts different
types with the same source name, and merges compatible repeated Booleans into
one ordered multi-target structural binding. Browser and React controller
projection hides descendants of every false target while preserving their
canonical content and order. Schema 2.0 saved sessions and Families migrate all
field-keyed package, content, order, override, control, and image-placement data
before current validation.

The supplied carousel ZIP passed strict lifecycle at 2,301,391 bytes and SHA-256
`d6613b5f2a8668b37d1ba190de0f9717d5a2e7f35c7e0e078cdc88b76498ab5d`.
It imports without blockers and resolves `boolean:carVis` to targets `907:9933`
and `907:9932`. Its source names the CTA Boolean `ctaVis`, producing
`boolean:ctaVis`, while the nested text is independently `text:cta`.

Current Core/Browser/React typechecks, package builds, full portable tests,
Studio build, strict supplied-ZIP lifecycle, `studio:setup`, `studio:drafts`,
`field-rules:studio`, `runtime-routing:boolean`, SDK API contract, package
boundaries, repository TypeScript build, and documentation links pass. No
renderer owner, fixture, golden reference, snapshot, or tolerance changed.


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
