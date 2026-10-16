# Renderer Capability Registry

## SDK 2.0 host release certification — 2026-10-16

[The host-delivery report](../architecture/sdk-host-onboarding.md) and [current candidate packet](../architecture/evidence/sdk-host-release-20261016d/certification.json) record GO for immutable `sdk-2-host-20261016d`: macOS/Linux npm/pnpm acceptance, 24 stable captures, 12 renderer, three scene and 12 settlement comparisons, with individual current stored-source review. D corrects publication-context documentation labels; SDK code/declarations and starter bytes are identical to C. Published 1.0.0 and prior packets remain unchanged. All 285 protected identities remain unchanged; no renderer/API/schema change or reference promotion occurred. The intended tag is `sdk-v2.0.0`; publication/tagging and registry round-trip verification remain separately approved operations.

## Family media readiness publication — 2026-10-15

[ADR 0098](decisions/0098-family-media-readiness-publication.md) and [the implementation report](../architecture/f7-readiness-publication.md) record the bounded Family-only change. Decode completion reuses the current accepted materialization/tree and projects readiness/status/error, preserving semantic references and one publication per accepted source completion. Full authoring derivation, font/line/renderer revision guards and PNG raster authority remain unchanged. Native differential, separate paired production timing and browser lifecycle evidence are retained. Fresh unpublished 1.0.0 candidate `unpublished-1.0.0-440c932335c46a7015cb074079fcd5cd2767a28d78ff8e4fe9fe0921912ece35` is GO under run `sdk-f7-readiness-20261015`; the earlier certified candidate remains immutable. Cold Cover readiness improves by approximately 90–99 ms median across two minimal paired runs; detailed warm timing differences remain a separate tracing limitation. Reproduce and review the exact evidence in the report. No API/schema, rendering capability, cache, batching, reference or tolerance change is included.


## V2 SDK / exporter 0.6.1 boundary — 2026-10-15

See [ADR 0097](decisions/0097-v2-only-sdk-and-061-source-admission.md) and [the implementation/evidence report](../architecture/sdk-v2-optimization.md). The unpublished 1.0.0 candidate supports V2 hosts and exporter 0.6.1 ZIPs only; source schema 1.0 normalization and canonical schema 2.2 remain. Historical readers are test-only. Validation, primitive revision assembly and save/recovery reuse existing authorities; no visual owner, capability, provenance, settlement or export-readiness semantics changed. The three-export candidate gate is now GO after a current run-bound stored-source/capture review and fresh public host checks; see [candidate certification](../architecture/sdk-v2-candidate-certification.md). This certifies the immutable unpublished archives in the recorded environment; subsequent profiling tooling has a separate worktree identity. No reference/snapshot/tolerance/fixture/font promotion is authorized. Reproduce with the exact commands and source checkpoints in the report/evidence, followed by a fresh `pnpm sdk:gate:061 -- --run-id <unique-run>`.

## Host registry integration (ADR 0096)

V2 hosts may supply one borrowed font registry to the renderer and Browser PNG pipeline. Preparation, readiness and embedding use that authority; explicit null retains only package-provided sources. This adds no renderer capability, font owner or matching policy. Missing exact embedding bytes reject capture. See [R01](../architecture/host-font-authority.md).

## Established media underlay (ADR 0095)

The opaque NORMAL SOLID → FILL/FIT IMAGE pair under ADR 0095 uses the existing
media and CSS-background owners. Its primitive SVG-stack rejection is not a
degraded fallback. Hidden, reversed, additional, translucent, non-NORMAL or
otherwise unsupported mixed stacks retain existing diagnostics. This is a
bounded diagnostic recognition, not general ordered IMAGE-stack support.

## Mounted text lifecycle (ADR 0093)

Dependency-valid local intrinsic and line measurements survive unrelated publication changes. Current-commit input validation and existing native publication guards remain mandatory; changed/unknown inputs retain pending/fallback. No new layout route or text semantics.


## Observational mask evidence (ADR 0092)

The existing `exact-opaque-rectangular-alpha` capability is now represented in
test-only settlement when current scene declarations, existing resolver input,
geometry and revision agree. This closes the Carrousel evidence gap, not a new
renderer capability. Partial-alpha, luminance and unsupported
mask inputs retain explicit unresolved/fallback outcomes. No general nested or
overlapping-mask support is established. Missing input preserves the
old conservative inspection behavior. See [the contract](OBSERVATIONAL_MASK_SETTLEMENT.md).

ADR 0090 adds a bounded runtime owner for exporter 0.6.1 opaque Matrix paint
rows and Matrix 2 non-overlapping groups. The historical rows below describe
the earlier preserved-only state; for this certified subset, `PNT-008` and
`CMP-001`–`CMP-004`/`CMP-006` now route through one internal source-compositing
contract and DOM paint-layer owner. PASS_THROUGH, isolated NORMAL, and isolated
OVERLAY have distinct handling. No support is claimed for transparent
backdrops, overlapping children, masks, effects, other group modes, or Cover's
mixed IMAGE/gradient fade. See [ADR 0090](decisions/0090-bounded-opaque-source-compositing-owner.md).

Field Rules V2 Milestone 7 adds Studio/external-host authoring proof, not a new
renderer capability. The same Boolean structural owner, canonical Image Crop
owner and Textarea line authority are consumed through V2 controllers and the
public renderer bridge. Compact Family/host UI fixtures remain product evidence;
dedicated multi-aspect Family crop source certification is still outstanding.

The 2026-09-14 Boolean authoring extension adds no renderer capability. One
canonical Boolean may materialize to multiple structural target nodes, and
Browser/React content-controller projections omit fields nested below false
targets. ADR 0078 remains the sole renderer structural-participation authority.

Phase 13 adds no renderer feature capability. It selects among already resolved owners through an internal `legacy | semantic | compare` decision; unsupported rows and their fallback/support claims are unchanged. Stage 1 aggregates these rows and backend decisions into eligibility outcomes but cannot promote a support level, hide a fallback, or turn an accepted compatibility region into Native support. Accepted compatibility remains a distinct rollout outcome tied to exact region and subject revisions.

## Phase 11–12 infrastructure note

Support classifications below are unchanged. `ResolvedBackendDecisionV1` now projects the active runtime owner and fallback for each resolved node, and `ResolvedBackendDiagnosticProjectionV1` groups meaningful unsupported/compatibility evidence by capability and region. This infrastructure does not promote any backlog capability or authorize Canvas/offscreen, WebGL, mixed paint stacks, effects, node opacity, advanced masks, or additional gradients.

Audited 2026-07-13. Every row contains the required registry fields in compact form. Support is based on a traced runtime path; types alone are not proof.

Milestone 1 added current-behavior evidence without changing any support classification. All four registered ZIPs now have repeated Validate, Fields, editor, and PNG-export pixel/structural references. This proves harness reachability and repeatability in the recorded environment; it does not complete the charter’s required edit, resize, exact-font, fallback, and export matrix for any capability. Current runs used explicit recorded replacement fonts, so they do not increase exact-font confidence.

Milestone 4 adds runtime-authority evidence without broadly changing registry support labels. The now-hiring non-wrapping vertical Auto Layout, FIXED/HUG/FILL, padding/gap/alignment, HUG text, dependent FILL image slot, rectangular clipping, edit/reset, delayed exact font, root resize, and PNG chain are settled-authoritative. Circular FILL-in-HUG axes, SPACE_BETWEEN, wrapping, true masks, transforms, and advanced text remain compatibility-owned or unsupported. This is evidence for the bounded route, not a claim that every registry row in those families is complete.

Field Rules V2 Milestone 4 implements generic structural exclusion for
`appearance.visible=false` in that existing bounded layout route, including
subtree pruning, gap closure, HUG/FILL recomputation, and generation-safe async
publication. The exact exporter-0.6.1 Boolean fixture source-certifies headline
removal from a vertical HUG/FILL chain and end-date removal from a fixed
horizontal `SPACE_BETWEEN` row. The latter certifies structural child exclusion
through the coherent compatibility owner; it does not promote general
`SPACE_BETWEEN` settlement authority. Default Validate/Fields, editor
true/false/reset, resize-hidden-show, and PNG export pass without a reference or
tolerance update.

Milestone 5.1 adds evidence-backed `CAP_HEIGHT` vertical trim for eligible single-style text. The exact source property, managed font metrics, routed settlement, inspection bounds, edits/reset, dependent HUG/FILL/image slots, and hidden PNG are covered. Unknown trim modes, mixed metric runs, and unverified fallback faces remain compatibility-owned. Renderer-reference promotion remains open.

Exact managed-font activation supports both the standard `FontFace`/`FontFaceSet.add()` route and a bounded embedded-browser CSS route. The latter retains hash-owned private-family identity and requires stable cross-fallback geometry evidence before readiness; CSS presence or `document.fonts.check()` alone is not support evidence.

Milestone 5.2 corrects the glyph-paint origin within that semantic box. Exact managed faces now prove first-cap-top/final-baseline placement, HUG vertical-alignment bypass, fixed-box wrapper alignment, delayed/cached activation, all-surface paint identity, and source-preview positions. This extends TXT-016 evidence but does not promote renderer references or change another capability family.

The Milestone 5 approval review verifies exact Geist Mono 500 glyph identity, line width, spacing, trim, and PNG painting across all four now-hiring surfaces. Exact private fonts are embedded into the `html-to-image` clone only for PNG capture; replacement/fallback profiles preserve compatibility behavior. The four reviewed references are approved. MED-003/MED-007 remain separate incomplete work because the now-hiring crop/placement still differs materially from the source reference.

Milestone 6 corrects MED-001 for the routed now-hiring chain: `FILL` uses one native aspect-preserving cover operation from the current settled slot while the retained CROP-only matrix remains provenance. Milestone 6.1 adds a real shared-asset editable fixture proving per-node imported FILL/CROP/FIT, replacement Fill/Fit, reset, reload, stale-work rejection, and PNG identity. The temporary fixed `FILL + imageTransform` compatibility path is retired.

Milestone 6.1's superseding package has three editable image fields using one asset with FILL/CROP/FIT. It proves normalized slot-to-source CROP, one inverse, clipped placement, replacement Fill/Fit transform inapplicability, exact reset, persistence, and stale decode rejection. See [editable image evidence](IMAGE_REPLACEMENT_EVIDENCE.md).

Milestone 7 registers crop-3 as the first authoritative exporter ZIP with an explicit mask source and sibling range. MSK-002 is Emulated only for a fully opaque, untransformed rectangular ALPHA source that lowers exactly to one scoped CSS clip. A certified first-child mask covering its complete parent owns `inset(0)` on that parent on every surface so live HUG reflow cannot retain stale source insets; other exact scopes keep the affected-node clip. Its fill remains `mask-input` and never paints as RGB. Partial alpha, transformed/vector/nested/luminance/effect masks remain preserved-only or unsupported. PNT-001 gains role/revision evidence for this fixture; multiple-paint compositing is unchanged.

Milestones 7.1–7.2 source-certify rectangular primitive geometry, ordinary single opaque SOLID, uniform/independent corners, and the bounded stroke subset. Milestone 7.3A adds one isolated source-certified `GRADIENT_LINEAR` with source-indexed canonical semantics, one-inverse geometry, two/three stops, stop alpha, paint opacity, rotation, independent corners, resize, and one SVG owner. Mixed paints, node opacity, gradient strokes, other gradient families, effects, masks, and compositing remain compatibility-owned or unsupported.

The official Phase 7 completion audit inspects 17 exact external ZIPs and historically returned Result B. The later isolated intake family closes the bounded multiple-SOLID source gate, while runtime ownership remains the V1 gap. The corpus still has no radial/angular/diamond gradient, gradient stroke, multiple stroke, dash, cap/join/miter, or per-edge-weight occurrence. Roadmap priority and dependency decisions are detailed in [the completion audit](PHASE_7_PAINT_STROKE_COMPLETION_AUDIT.md).

The ordered-SOLID source gate is Result A. Initial previews establish order, repeated source-over, visibility, node-opacity-after-stack, and later mixed-paint requirements. A genuine reverse fixture closes direction. Figma's RGB-only SolidPaint contract plus a strict exporter-0.6.0 predicate closes apply-once mirrored opacity provenance. The final corner ZIP closes shared node-level independent-corner geometry. Runtime stack ownership remains unimplemented and separately proposed. See [the intake](ORDERED_NORMAL_FILL_STACK_INTAKE.md) and [runtime contract](ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md).

Milestone 7.2 resumed after the exact `stroke-test-primitives` ZIP satisfied the gate. Five clean rectangular nodes prove INSIDE control, independent corners, Figma edge-local clamping, CENTER, OUTSIDE, and source ancestor clipping. See [the fixture gate](PRIMITIVE_STROKE_FIXTURE_GATE.md) and [geometry contract](PRIMITIVE_STROKE_GEOMETRY.md).

Milestone 2 adds semantic capability records to `CanonicalSceneGraphV1` and preserves unsupported inputs/provenance. This changes no support level: scene representation is not renderer support. All four fixture graphs validate and all known fixture extension keys map to semantic or provenance destinations, while gradients, true masks, blend/compositing, components, variables, and style identity remain unsupported/partial exactly as classified below.

Milestone 3 adds observational dependency/measurement/settlement evidence without changing support levels. It verifies current now-hiring short/long/clear text edits, image replacement/clear, preview-container resize, and scoped text/font/asset/container invalidation. Exact and delayed managed-font activation, true masks/effects, and independent semantic prediction of all DOM geometry remain incomplete.

## Registry notation

- Availability: `Z` = ZIP (`Y`, `P` partial/exporter-dependent, `N` absent); `F` = optional Figma enrichment.
- Edit/export: `Edit` = directly editable (`Y`, `P`, `N`); `Export` = `Safe`, `Warn`, `Block`, or `Unknown`.
- Diagnostic audience: `U` user, `E` exporter/source-contract, `R` renderer telemetry. “Gap” means no complete diagnostic was found.
- Confidence: `H`, `M`, `L`. Fixture codes: `NH` now-hiring, `DP` deal post, `DB` deal banner, `F041` plugin 0.4.1 JSON, `RF` repository regression fixtures, `None` no authoritative fixture registered.
- Backends are preferred future targets, not implemented routing decisions: `DOM`, `SVG`, `Canvas/offscreen`, or `Raster`.

## Layout and constraints

| ID / capability | Figma source properties | Availability | Canonical representation / current strategy | Future backend / support | Edit / export | Fallback / diagnostics | Confidence / fixture | Known limitation / milestone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LAY-001 Vertical Auto Layout | `layoutMode=VERTICAL`, gap, padding, align | Z:Y F:P | `layout.mode=VERTICAL`; CSS column flex | DOM / Emulated | P / Safe with readiness | Snapshot bounds; E,R | H / NH,RF | Static/editor modes differ / M4 |
| LAY-002 Horizontal Auto Layout | `layoutMode=HORIZONTAL` | Z:Y F:P | HORIZONTAL; CSS row flex | DOM / Emulated | P / Safe | Snapshot; E,R | H / RF | Limited browser scenario / M4 |
| LAY-003 Auto Layout wrapping | `layoutWrap`, row/column gap | Z:P F:P | `wrap`, gaps; CSS flex-wrap | DOM / Emulated | N / Warn | No-wrap/snapshot; R | M / F041 | Complex wrap parity unverified / M4 |
| LAY-004 Packed distribution | primary align MIN/CENTER/MAX | Z:Y F:P | alignment; flex justify | DOM / Emulated | N / Safe | Start alignment; R | M / RF | Exact rounding unbaselined / M4 |
| LAY-005 Space-between distribution | `primaryAxisAlignItems=SPACE_BETWEEN` | Z:Y F:P | SPACE_BETWEEN; CSS `space-between` | DOM / Emulated | N / Safe | Packed start; R | M / RF | No resize/export fixture gate / M4 |
| LAY-006 Baseline alignment | counter align BASELINE | Z:Y F:P | BASELINE; CSS baseline | DOM / Emulated | N / Warn | Flex-start; R | M / RF | Figma text-baseline parity unverified / M4 |
| LAY-007 FIXED | axis sizing/bounds | Z:Y F:P | `sizing.*.mode=FIXED`; px/snapshot | DOM / Emulated | P / Safe | Exported bounds; E,R | H / NH,DP,DB,RF | Root/canvas mismatch policy / M2,M4 |
| LAY-008 HUG | AUTO/HUG, text auto-resize | Z:Y F:P | HUG; routed intrinsic measurement or compatibility DOM | DOM / Emulated | Indirect / Warn | Exported bounds; U,R | M / NH,RF, carousel 0.6.1 local evidence | Basic non-circular route and delayed-font lifecycle proven; capped circular text uses coherent compatibility CSS / M4,M5 |
| LAY-009 FILL | FILL/STRETCH/grow/align | Z:Y F:P | FILL and raw roles; CSS flex/stretch; intrinsic basis inside compatibility HUG | DOM / Emulated | Indirect / Warn | Snapshot bounds; R | H / NH,RF, carousel 0.6.1 local evidence | Circular FILL/HUG remains diagnosed and compatibility-owned / M2,M4 |
| LAY-010 Min/max dimensions | min/max width/height | Z:P F:P | axis min/max; editor CSS limits | DOM / Emulated | N / Warn | Omit limits; R | M / RF | Static mode does not apply live limits / M4 |
| LAY-011 Aspect-ratio sizing | aspect ratio/constraints | Z:P F:P | No explicit ratio contract found | DOM / Unknown pending audit | N / Unknown | Fixed bounds; Gap | L / None | Exporter/canonical gap / M2,M4 |
| LAY-012 Absolute children | `layoutPositioning=ABSOLUTE`, bounds | Z:Y F:P | positioning/bounds; absolute CSS | DOM / Emulated | N / Safe | Snapshot bounds; R | H / RF | Transform/constraint combinations partial / M4 |
| LAY-013 Horizontal constraints | `constraints.horizontal` | Z:P F:P | Raw extension + sizing; editor constraint CSS | DOM / Emulated | N / Warn | Snapshot-and-clip; R | M / RF | Static ignores live constraint path / M2,M4 |
| LAY-014 Vertical constraints | `constraints.vertical` | Z:P F:P | Raw extension + sizing; editor constraint CSS | DOM / Emulated | N / Warn | Snapshot-and-clip; R | M / RF | Static ignores live constraint path / M2,M4 |
| LAY-015 Nested transforms | `relativeTransform`, rotation, flips | Z:P F:P | raw matrix -> transform model/CSS | DOM/SVG / Approximated | N / Warn | Snapshot unsafe axes; R | M / F041 | Skew/local geometry and nesting parity / M4 |
| LAY-016 Structural visibility | `appearance.visible`; Boolean field `property=visible` | Z:Y F:Y | one active/excluded-self/excluded-ancestor projection before participant discovery; hidden subtree unmounted | DOM / Native structural exclusion; layout owner remains capability-routed | Y Boolean / Safe when current | Shared coherent compatibility outside routed subset; R | H subset / exporter-061 Boolean | Source-certified vertical HUG/FILL and fixed horizontal SPACE_BETWEEN child exclusion; not general SPACE_BETWEEN settlement authority; wrapping, circular and advanced mask/transform interactions deferred / Field Rules M4 |
| TXT-017 Textarea rendered-line validation | V2 Textarea `maxLines`, `warningAtLines`; exact text binding | Z:Y F:Y | clustered `Range` line boxes from the mounted paint span; revision/font/settlement/generation evidence | DOM text owner / Native browser wrapping | Y Textarea / Safe when current valid | Pending/unsupported blocks required export; R | H / now-hiring | Fixed/HUG/FILL, explicit newlines, empty=1, pre-clip count, structural inactivity, Family-selected validity / Field Rules M6 |

## Text

| ID / capability | Figma source properties | Availability | Canonical representation / current strategy | Future backend / support | Edit / export | Fallback / diagnostics | Confidence / fixture | Known limitation / milestone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TXT-001 Single-style text | characters, style | Z:Y F:P | canonical text; DOM text | DOM / Emulated | Y / Safe | Browser fallback; U,E,R | H / NH,DP,DB,RF | Pixel baseline absent / M1,M4 |
| TXT-002 Mixed-style runs | styled segments/overrides | Z:P F:P | metadata/ranges; V2 edits reconcile one contiguous edit and renderer preserves uncovered text with adjacent style | DOM/SVG / Approximated | P / Warn | Node-level style; R | M / F041, carousel 0.6.1 local evidence | Full per-run properties and multi-edit rich-text intent not reproduced / M4 |
| TXT-003 Exact font face | family/style label/PostScript/weight/stretch/axes | Z:P F:Y | versioned request + parsed face + managed binary/hash/private family | DOM / Emulated | Y / Safe only when hash/face/revision ready | Explicit replacement or block; U,E,R | H / NH,DP,DB | Real upload/restore/all surfaces proven for NH; cross-browser and source-preview release/features open / M4,M5.3 |
| TXT-004 Fallback fonts | missing face/fallback mapping | Z:Y F:P | resolution status/fallback family | DOM / Approximated | N / Warn or Block | System/approved family; U,R | H / RF | Metric drift intentional / M4 |
| TXT-005 Variable fonts | axes/variation settings | Z:P F:P | asset may be variable; no axis model found | DOM / Unknown pending audit | N / Unknown | Default face instance; Gap | L / None | Axis semantics/fixtures absent / M2,M4 |
| TXT-006 Auto width | `textAutoResize=WIDTH_AND_HEIGHT` | Z:Y F:P | `widthAndHeight`; fit-content | DOM / Emulated | Indirect / Warn | Exported width; R | M / RF | Nested/fixed-parent cases unbaselined / M4 |
| TXT-007 Auto height | `textAutoResize=HEIGHT`, HUG | Z:Y F:P | `height`; browser content/cap height | DOM / Emulated | Indirect / Warn | Exported height; U,R | H / NH,RF | Settled value published only as harness evidence / M4 |
| TXT-008 Fixed text boxes | fixed bounds, no auto resize | Z:Y F:P | FIXED sizing; CSS box | DOM / Emulated | Y content / Safe or Block by rules | Clip/field blocker; U,R | H / DP,DB,RF | Overflow fidelity varies / M4 |
| TXT-009 Vertical alignment | `textAlignVertical` | Z:Y F:P | resolved top/center/bottom; flex alignment | DOM / Emulated | N / Safe | Top; R | M / F041 | Baseline against exact Figma unverified / M4 |
| TXT-010 Paragraph spacing | paragraph spacing/style | Z:P F:P | resolved px; newline block spacing | DOM / Approximated | P / Warn | Zero spacing; R | M / F041 | Paragraph model is simplified / M4 |
| TXT-011 Lists | list options/indentation | Z:P F:P | No explicit list model found | DOM / Preserved only | N / Unknown | Plain text; Gap | L / None | Markers/indentation unsupported / M2,M4 |
| TXT-012 Truncation | `TRUNCATE`, overflow rules | Z:P F:P | hidden overflow/field policy | DOM / Approximated | Rule P / Warn or Block | Clip; U,R | M / RF | Ellipsis and exact Figma rules absent / M4 |
| TXT-013 Maximum lines | max lines/truncation | Z:P F:P | field constraints can count lines; no general renderer clamp | DOM / Approximated | Rule P / Block by field | Clip; U,R | M / RF | Diagnostics and pixels use separate logic / M2,M4 |
| TXT-014 Rich-text decoration | decoration/case/leading trim/runs | Z:P F:P | node-level decoration/case, limited ranges | DOM/SVG / Approximated | P / Warn | Base style; R | M / F041 | Per-run decoration incomplete / M4 |
| TXT-015 Bidirectional text | characters/direction | Z:Y F:P | characters; browser default direction | DOM / Unknown pending audit | Y / Unknown | Browser Unicode bidi; Gap | L / None | No explicit direction/fixture/export test / M4 |
| TXT-016 Cap-height to baseline trim | `leadingTrim=CAP_HEIGHT` | Z:Y F:P | canonical provenance; exact metrics; semantic wrapper; source-grounded glyph origin; cap-to-final-baseline settlement | DOM + settlement / Emulated | Indirect / Safe when current exact or approved face | Coherent compatibility; R | H / NH | HUG/fixed alignment and all-surface paint proven in Chromium; mixed runs/other trim modes unsupported / M5.1-M5.2 |

## Media

| ID / capability | Figma source properties | Availability | Canonical representation / current strategy | Future backend / support | Edit / export | Fallback / diagnostics | Confidence / fixture | Known limitation / milestone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MED-001 Image FILL | `scaleMode=FILL` | Z:Y F:P | native cover; current slot; transform inapplicable | DOM / Emulated | Y replace / Safe | Centered cover; R | H + editable real ZIP | Dynamic/fixed source and replacement Fill verified / M6.1 |
| MED-002 Image FIT | `scaleMode=FIT` | Z:Y F:P | contain; transform inapplicable | DOM / Emulated | Y replace / Safe | Contain centered; R | Editable real ZIP | Imported and replacement Fit, reset/reload verified / M6.1 |
| MED-003 Image CROP | CROP + transform | Z:Y F:P | normalized source polygon; one affine inverse into clipped `<img>`; editor Crop reuses owner | DOM / Approximated | Replacement Crop supported / Safe when valid | Invalid Crop remains invalid; deterministic preview cover; R | Editable real ZIP + V2 host tests | Rotated/non-centred import and host-authored crop path; polished crop UI deferred / M6.1,FR-M5 |
| MED-004 Image TILE | TILE, scaling factor | Z:P F:P | tile render mode; repeat when intrinsic known | DOM/Canvas / Approximated | Y replace / Warn | Cover; R | M / F041 | Scale/phase parity incomplete / M5 |
| MED-005 Explicit STRETCH | STRETCH or field policy | Z:Y F:P | object-fit fill only for explicit intent | DOM/Canvas / Emulated | Y / Safe | Never infer; preserve aspect ratio; R | H / RF | Source intent precedence needs M2 / M2,M5 |
| MED-006 Focal position | explicit object position; CROP transform separately | Z:P F:P | FILL/FIT focal alignment; CROP affine source polygon | DOM / Approximated | P / Warn | 50/50 center; R | M / NH + synthetic | No browser focal editor/source fixture / M6 |
| MED-007 Crop transforms | `imageTransform` with CROP | Z:P F:P | matrix retained, applicability classified, affine inverse applied once; editor crops adapt within canonical region | DOM / Approximated | Imported and replacement Crop / Safe when current | Cover preview remains invalid/export-blocked; R | Editable real ZIP + V2 host tests | Family per-variant source art direction has automated coverage; polished UI deferred / M6.1,FR-M5 |
| MED-008 Image adjustments | filters/exposure/contrast/etc. | Z:P F:P | raw extension only | Canvas / Preserved only | N / Unknown | Unadjusted image; R warning | H unsupported / DP | No adjustment backend / M5 |
| MED-009 Replacement behavior | `image.activePlacement` | Z:Y F:N | revisioned imported-source/replacement-fill/replacement-fit/editor-crop | DOM / Emulated | Y / Safe when asset/current crop ready | Legacy replacement defaults Fill; R | H / editable real ZIP + V2 host tests | Fill/Fit source lifecycle plus canonical Crop and Family sparse framing / M6.1,FR-M5 |
| MED-010 Dynamic slot recalculation | layout dependency + image slot | Derived | current routed slot → pure placement geometry → native sampling | DOM / Emulated | Indirect / Safe | Coherent compatibility slot; R | H / NH | Initial/edit/reset/root-resize/export chain proven for FILL; CROP resize lacks real fixture / M4,M6 |

## Paint and strokes

| ID / capability | Figma source properties | Availability | Canonical representation / current strategy | Future backend / support | Edit / export | Fallback / diagnostics | Confidence / fixture | Known limitation / milestone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PNT-001 Solid fills | SOLID/color/opacity/role/index | Z:Y F:P | ordered primitive paint contract; one opaque ordinary SOLID or an eligible ordered partial-opacity SOLID stack routes; 0.6.0 repair and bounded native 0.6.1 opacity evidence remain distinct; mask input excluded | DOM/CSS/SVG / Native certified subset | Color field P / Safe subset | Coherent compatibility; preserve all entries | H subset / bb, main, crop-3 + ordered stack + exporter-061-solid-opacity | Mixed/non-NORMAL/node-opacity combinations deferred / M7.4, ADR 0074 |

Carrousel's bound Color SOLID additionally has exact value-level evidence: its
source-equivalent imported default and Reset retain the ZIP's floating-point
RGBA, while an explicit hex edit writes RGB only to the indexed fill. This
does not approve its PNG or extend the routed paint subset.
| PNT-002 Multiple fills | fills array/order/visibility/opacity/blend | Z:Y F:P | `ResolvedOrderedSolidStackV1` covers SOLID-only; `ResolvedOrderedNormalPaintStackV1` covers the exact SOLID-below-linear pair; one SVG group/shared clip; clean 0.6.1 SOLIDs need no repair record | SVG / Native certified subsets | P / Safe subset | Whole primitive compatibility with exact reason | H / six SOLID fixtures + ordered-solid-linear-normal + exporter-061-linear-and-mixed-paints | IMAGE layers, reversed/additional mixed patterns and non-NORMAL deferred / ADRs 0072, 0074 |
| PNT-003 Linear gradients | `GRADIENT_LINEAR`; raw `gradientStops`/`gradientTransform` | Z:P F:P | same-index canonical hydration plus `ResolvedLinearGradientGeometryV1`; reusable as index-1 layer only in ADR 0072 | SVG / Native certified subset | N / Safe subset | Whole-primitive compatibility with explicit reason | H / gradient-test-linear + paint-opacity + ordered-solid-linear-normal | Isolated subset plus exact SOLID-below-linear pair; other mixed paints, node opacity, gradient strokes and families deferred |
| PNT-004 Radial gradients | GRADIENT_RADIAL | Z:P F:P | type/order preserved; no source-index hydration or resolved geometry | SVG/Canvas / Preserved only | N / Unknown | Preserve/diagnose; R | H unsupported / zero corpus occurrences | Tier 2; separate source gate required |
| PNT-005 Angular gradients | GRADIENT_ANGULAR | Z:P F:P | type/order preserved; no source-index hydration or resolved geometry | Canvas / Preserved only | N / Unknown | Preserve/diagnose; R | H unsupported / zero corpus occurrences | Tier 3; separate source/backend authority |
| PNT-006 Diamond gradients | GRADIENT_DIAMOND | Z:P F:P | type/order preserved; no source-index hydration or resolved geometry | SVG/Canvas / Preserved only | N / Unknown | Preserve/diagnose; R | H unsupported / zero corpus occurrences | Tier 3; do not infer radial semantics |
| PNT-007 Paint opacity | source alpha + paint opacity by layer | Z:Y F:P | gradient retains stop alpha/paint opacity; `solid-paint-source-v1` repairs bounded 0.6.0 aliases; clean 0.6.1 alpha-1 plus paint opacity derives separate native evidence | DOM/SVG / Native certified gradient and bounded SOLID | Color P / Safe subset | Ambiguous, contradictory, unidentified, and future-version values remain compatibility-owned | H gradient, historical SOLID, and exporter 0.6.1 fixtures | IMAGE opacity remains later mixed-stack work / ADR 0074 |
| PNT-008 Paint blend modes | per-paint blend plus node/group isolation | Z:P F:P | `ResolvedSourceCompositingV1` preserves ordered source floats for the opaque exporter 0.6.1 subset | DOM paint layers / Native bounded subset | P / Safe subset | Whole-node compatibility for unsupported stacks | H source and runtime / Matrix, Matrix 2, Cover | DARKEN/MULTIPLY/SCREEN/OVERLAY/LIGHTEN rows and bounded groups under ADR 0090; one exact Cover SOLID/IMAGE/DARKEN-gradient stack under ADR 0091; all other mixed stacks remain unsupported |
| PNT-009 IMAGE in paint stacks | ordered IMAGE paint, opacity, blend, asset, placement | Z:Y F:P | image intent resolves separately; compatibility uses first IMAGE as CSS background | DOM layers / Approximated | Image field P / Warn | Existing media geometry plus complete stack compatibility | H source / 7 archive occurrences | V1 ordered NORMAL integration must not reopen Phase 6 placement |
| STR-001 Solid strokes | stroke SOLID/weight/align/index | Z:Y F:P | ordered stroke contract; exact opaque rectangular INSIDE/CENTER/OUTSIDE use one capability owner | DOM/CSS/SVG / Native subset | N / Safe subset | Compatibility for unsupported alignments/stacks | H subset / bb, main, stroke-test | Partial/multiple/gradient/advanced strokes fixture-blocked / M7.2 |
| STR-002 Gradient strokes | gradient stroke paint, path, alignment, transform | Z:P F:P | canonical paint can survive; resolved solid model ignores | SVG/Canvas / Preserved only | N / Unknown | Omit/preserve; R warning | H unsupported / zero corpus occurrences | Blocked by Phase 8 path geometry and missing source authority |
| STR-003 Stroke alignment | INSIDE/CENTER/OUTSIDE | Z:Y F:P | explicit path/inner/centre/outer/visual bounds; uniform INSIDE CSS, independent INSIDE/CENTER/OUTSIDE SVG | SVG/DOM / Native certified subset | N / Safe subset | Whole-primitive compatibility; R | H / stroke-test + bb/main | Self-clipped expanded, layout-included, transformed and advanced strokes deferred / M7.2 |
| STR-004 Dashes | dash array/offset | Z:P F:P | raw evidence may persist; observational stack only | SVG / Preserved only | N / Unknown | Solid stroke; incomplete diagnostic | H absence / zero corpus occurrences | Blocked by Phase 8 open/closed path geometry |
| STR-005 Caps and joins | butt/round/square cap; miter/round/bevel join; miter limit | Z:P F:P | raw evidence may persist; no strict/runtime model | SVG / Preserved only | N / Unknown | Browser/default solid stroke; incomplete diagnostic | H absence / zero corpus occurrences | Blocked by Phase 8 geometry and source authority |
| STR-006 Multiple strokes | ordered stroke paints, per-entry weight/align/opacity/blend | Z:P F:P | canonical/observational order survives; compatibility loops SOLID layers; primitive route accepts one | DOM/SVG / Approximated | N / Warn | Complete primitive compatibility | H absence / zero corpus occurrences | V1 compatibility boundary pending real demand/fixture |
| STR-007 Per-edge weights | `strokeTop/Right/Bottom/LeftWeight` raw candidates | Z:P F:P | possible extension provenance; no strict appearance contract | DOM/SVG / Preserved only | N / Unknown | Uniform weight | H absence / zero corpus occurrences | Blocked by missing source authority; exporter convenience must not be mistaken for Figma semantics |

## Geometry and masks

| ID / capability | Figma source properties | Availability | Canonical representation / current strategy | Future backend / support | Edit / export | Fallback / diagnostics | Confidence / fixture | Known limitation / milestone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GEO-001 Rectangles | RECTANGLE/bounds/radius | Z:Y F:P | shape/node; DOM box | DOM/SVG / Emulated | N / Safe | Bounds box; R | H / all | Corner smoothing absent / M5 |
| GEO-002 Ellipses | ELLIPSE/bounds | Z:Y F:P | shape; CSS 50% radius | SVG / Emulated | N / Safe | Bounding ellipse; R | H / RF | Arc semantics separate / M5 |
| GEO-003 Arcs | arc data | Z:P F:P | no explicit rendered arc path proven | SVG / Unknown pending audit | N / Unknown | Full ellipse/preserve; Gap | L / None | Fixture/path evidence missing / M5 |
| GEO-004 Lines | LINE/vector path | Z:P F:P | vector/shape when exported | SVG / Unknown pending audit | N / Unknown | SVG asset or preserve; R | L / None | No registered source/edit/export fixture / M5 |
| GEO-005 Polygons | POLYGON/point count | Z:P F:P | vector/shape when exported | SVG / Unknown pending audit | N / Unknown | SVG asset; R | L / None | Semantic shape path unproven / M5 |
| GEO-006 Stars | STAR/point count/ratio | Z:P F:P | vector/shape when exported | SVG / Unknown pending audit | N / Unknown | SVG asset; R | L / None | No fixture / M5 |
| GEO-007 Vector paths | vector paths/SVG asset | Z:Y F:P | complete renderable SVG asset/string owns its embedded fill and stroke; canonical stroke survives as provenance without duplicate wrapper CSS paint | SVG / Native or Emulated | N / Safe if asset safe | Missing source and semantic shape keep compatibility; U,R | M / F041; exact 0.6.1 Cover arrow all-surface regional evidence | Complex path parity not broadly baselined; DARKEN cover fade separate / ADR 0086 |
| GEO-008 Boolean results | BOOLEAN_OPERATION/path | Z:P F:P | node/vector metadata | SVG / Approximated | N / Warn | Exported SVG/raster; R | M / F041 | Live boolean semantics not evaluated / M5 |
| GEO-009 Independent corner radii | four radii | Z:Y F:P | explicit source order; edge-local adjacent-edge normalization from settled bounds; shared fill/clip/stroke tuple | DOM/SVG / Native certified subset | N / Safe subset | Whole-primitive compatibility | H / stroke-test `443:94`,`443:95` | Corner smoothing, transforms, unsupported paint/stroke combinations deferred / M7.2 |
| GEO-010 Corner smoothing | smoothing value | Z:P F:P | no runtime model found | SVG/Canvas / Preserved only | N / Unknown | Ordinary radius; Gap | L / None | Squircle fidelity absent / M5 |
| MSK-001 Frame clipping | clipsContent | Z:Y F:P | canonical clip flags; overflow hidden | DOM/SVG / Emulated | N / Safe | Rectangular clip; R | H / NH,RF | Rounded/transform parity partial / M5 |
| MSK-002 Alpha masks | node mask + package relationship | Z:Y F:P | canonical/resolved relation; exact opaque rectangle lowers to scoped CSS clip | DOM/SVG / Emulated subset | N / Safe for subset | Explicit unmasked compatibility; R | H subset / crop-3 | Partial/transformed alpha unsupported / M7 |
| MSK-003 Luminance masks | maskType=LUMINANCE | Z:P F:P | raw metadata only | Canvas / Preserved only | N / Unknown | No mask; R | H unsupported / None | Unsupported / M5 |
| MSK-004 Vector masks | vector + isMask | Z:P F:P | separate vector and raw mask metadata | SVG/Canvas / Preserved only | N / Unknown | Rectangular clip; R | H unsupported / None | Sibling range semantics absent / M5 |
| MSK-005 Nested masks | nested mask groups | Z:P F:P | no resolved chain | Canvas / Unsupported | N / Block/Unknown | Preserve and diagnose; R gap | H unsupported / None | Not covered by NH / M5 |
| MSK-006 Masked sibling ranges | exporter relationship/order | Z:Y F:P | strict same-parent ordered scope in canonical/resolved graphs | DOM/SVG / Emulated subset | N / Safe for subset | Invalid/unsupported explicit; R | H subset / crop-3 | Multiple/nested source fixtures incomplete / M7 |

## Effects and compositing

| ID / capability | Figma source properties | Availability | Canonical representation / current strategy | Future backend / support | Edit / export | Fallback / diagnostics | Confidence / fixture | Known limitation / milestone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FX-001 Drop shadow | DROP_SHADOW | Z:Y F:P | effect -> CSS box-shadow | DOM/Canvas / Emulated | N / Safe/Warn | Omit unsupported values; R | M / F041 | Blur/compositing pixel parity unbaselined / M1,M6 |
| FX-002 Inner shadow | INNER_SHADOW | Z:Y F:P | inset CSS box-shadow | DOM/Canvas / Emulated | N / Safe/Warn | Omit; R | M / F041 | Clip/stroke interactions / M6 |
| FX-003 Multiple shadows | ordered effects | Z:Y F:P | joined CSS shadows | DOM/Canvas / Emulated | N / Warn | Supported subset; R | M / F041 | Exact ordering with strokes/compositing / M6 |
| FX-004 Layer blur | LAYER_BLUR | Z:Y F:P | CSS filter blur | DOM/Canvas / Approximated | N / Warn | No blur; R | M / F041 | Bounds expansion differs / M6 |
| FX-005 Background blur | BACKGROUND_BLUR | Z:Y F:P | backdrop-filter blur | DOM/Canvas / Approximated | N / Warn | No blur; R | M / F041 | Browser/backdrop support and isolation / M6 |
| CMP-001 Layer blend modes | blendMode | Z:P F:P | canonical values plus internal source-compositing revision | DOM paint layers / Native bounded subset | P / Safe subset | Whole-node compatibility outside predicate | H source and runtime / Matrix, Matrix 2 | One paint owner over opaque SOLID/IMAGE backdrop; mixed IMAGE/gradient stacks deferred / ADR 0090 |
| CMP-002 Pass-through groups | group blend pass-through | Z:P F:P | source group order and opacity; certified non-overlapping rows | DOM paint layers / Native bounded subset | P / Safe subset | Compatibility outside predicate | H source and runtime / Matrix 2 | External backdrop remains visible; post-group opacity distributed through ordered paints / ADR 0090 |
| CMP-003 Isolated groups | NORMAL/OVERLAY group blend | Z:P F:P | source mode, order, and opacity with internal group revision | DOM isolation and blend / Native bounded subset | P / Safe subset | Compatibility outside predicate | H source and runtime / Matrix 2 | NORMAL isolates; OVERLAY also blends the group; transparent edges and other modes remain open / ADR 0090 |
| CMP-004 Parent opacity | node opacity | Z:Y F:P | source opacity and certified post-child group order | DOM / Native bounded subset | P / Safe subset | Existing opacity compatibility elsewhere | H source and runtime / Matrix 2 | 80% group behavior proven for certified rows; not a general group opacity contract / ADR 0090 |
| CMP-005 Child opacity | child node opacity | Z:Y F:P | per-node CSS opacity | DOM/Canvas / Native | N / Safe | 1; R | H / RF | Interaction with parent/blend / M6 |
| CMP-006 Paint opacity | paint opacity | Z:Y F:P | exact source paint opacity; bounded pass-through redistribution retains post-group result | DOM/SVG / Native bounded subset | P / Safe subset | Whole-row compatibility outside predicate | H source and runtime / Matrix 2 40% top paint | First/second paint order and 80% group order covered on the certified opaque subset / ADR 0090 |
| CMP-007 Offscreen compositing | group/effect need | Derived | no offscreen backend/router | Canvas / Unsupported | N / Unknown | DOM approximation; Gap | H absent / None | Deferred until fixture proves need / M6,M8 |
| CMP-008 Raster fallback | exported raster/subtree image | Z:P F:P | image asset only when explicitly exported | Raster / Raster fallback | N / Safe if asset exists | Preserve raster; U,E,R | M / DP,DB | No automatic subtree raster router / M5,M8 |

## Design systems

| ID / capability | Figma source properties | Availability | Canonical representation / current strategy | Future backend / support | Edit / export | Fallback / diagnostics | Confidence / fixture | Known limitation / milestone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 Main components | COMPONENT metadata | Z:P F:P | COMPONENT node/extensions; generic render | DOM/SVG / Preserved only | N / Unknown | Flattened hierarchy; Gap | M / F041 | Component semantics absent / M7 |
| DS-002 Instances | INSTANCE/component id | Z:P F:P | INSTANCE node/extensions; generic render | DOM/SVG / Preserved only | N / Unknown | Exported children; Gap | M / F041 | No source-component resolution / M7 |
| DS-003 Variants | variant properties | Z:P F:P | extension metadata only | DOM / Preserved only | N / Unknown | Exported selected state; Gap | L / None | Switching unsupported / M7 |
| DS-004 Component sets | COMPONENT_SET | Z:P F:P | no semantic set model found | DOM / Preserved only | N / Unknown | Preserve metadata; Gap | L / None | Unsupported / M7 |
| DS-005 Text overrides | instance text override | Z:P F:P | flattened text/editable field if exported | DOM / Approximated | P / Safe if flattened | Exported literal; U gap | M / F041 | Instance linkage absent / M7 |
| DS-006 Asset overrides | image override | Z:P F:P | flattened image/editable field if exported | DOM / Approximated | P / Safe if flattened | Exported asset; U gap | M / F041 | Instance linkage absent / M7 |
| DS-007 Instance swaps | swap property | Z:P F:P | no swap model found | DOM / Preserved only | N / Unknown | Exported selected instance; Gap | L / None | Unsupported / M7 |
| DS-008 Boolean properties | component boolean | Z:P F:P | may flatten to visibility; no binding model | DOM / Preserved only | P only if boolean field / Unknown | Exported visibility; Gap | L / None | Property semantics absent / M7 |
| DS-009 Nested instances | nested INSTANCE | Z:P F:P | generic hierarchy if exported | DOM / Preserved only | N / Unknown | Flattened children; Gap | L / None | Override propagation absent / M7 |
| DS-010 Variable collections | collections | Z:P F:P | tokens/extensions only | DOM / Preserved only | N / Unknown | Resolved literals; Gap | L / None | No collection evaluator / M7 |
| DS-011 Variable aliases | aliases | Z:P F:P | raw/token metadata only | DOM / Preserved only | N / Unknown | Resolved literal; Gap | L / None | Alias graph absent / M7 |
| DS-012 Variable modes | mode values/selection | Z:P F:P | no live mode model found | DOM / Preserved only | N / Unknown | Exported selected literal; Gap | L / None | Mode switching absent / M7 |
| DS-013 Text styles | style id + resolved text | Z:P F:P | literal text values, identity in metadata | DOM / Approximated | Text P / Safe if literal | Literal values; R gap | M / F041 | Style linkage/update absent / M7 |
| DS-014 Color styles | style id + resolved paint | Z:P F:P | literal paint, identity optional | DOM/SVG / Approximated | Color P / Safe if solid literal | Literal solid; R gap | M / F041 | Style linkage and gradients absent / M7 |
| DS-015 Effect styles | style id + effects | Z:P F:P | literal supported effects | DOM/Canvas / Approximated | N / Warn | Supported subset; R | M / F041 | Identity/update and full effects absent / M7 |

## Registry conclusions

- No capability in this initial registry is “complete” under the charter because no row yet has the full source/edit/resize/export/fallback evidence bundle and reviewed visual tolerance.
- The highest-confidence current paths are canonical ZIP import, basic DOM geometry, single-style text, explicit image fit modes, solid fills, frame clipping, common CSS effects, field mutation, and PNG capture.
- The largest preserved-only areas are gradients, true masks, blend/compositing, component semantics, variables, and style identity.
- Milestone 3 provides explicit full-surface observational dependency settlement/readiness. Milestone 4 makes only the gated core layout/text family runtime-authoritative.
- Milestone 5 makes the already-routed core geometry authoritative on every live surface. It does not change the support level of any appearance row.
- `appearance:baseline` distinguishes real-ZIP source sufficiency from source-level contract probes. Advanced appearance rows remain preserved-only, unsupported, or unknown until a registered real fixture supplies source/edit/resize/export evidence.

## Mounted changed-text stability — ADR 0094

Fresh current text metrics may be measured before paint when face authority and
mounted constraints are available. Changed HUG/trim-wrapper constraints receive a
fresh commit check; unknown dependencies keep pending/fallback behavior. This is
intrinsic-input lifecycle work, not expanded text semantics or settled-graph
support. Now Hiring adds per-accepted-revision image/sibling and text traces to
the existing Carrousel Date regression. See [current evidence](../architecture/now-hiring-text-stability.md).
