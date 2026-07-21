# Renderer Capability Registry

Phase 13 adds no renderer feature capability. It selects among already resolved owners through an internal `legacy | semantic | compare` decision; unsupported rows and their fallback/support claims are unchanged. Stage 1 aggregates these rows and backend decisions into eligibility outcomes but cannot promote a support level, hide a fallback, or turn an accepted compatibility region into Native support. Accepted compatibility remains a distinct rollout outcome tied to exact region and subject revisions.

## Phase 11–12 infrastructure note

Support classifications below are unchanged. `ResolvedBackendDecisionV1` now projects the active runtime owner and fallback for each resolved node, and `ResolvedBackendDiagnosticProjectionV1` groups meaningful unsupported/compatibility evidence by capability and region. This infrastructure does not promote any backlog capability or authorize Canvas/offscreen, WebGL, mixed paint stacks, effects, node opacity, advanced masks, or additional gradients.

Audited 2026-07-13. Every row contains the required registry fields in compact form. Support is based on a traced runtime path; types alone are not proof.

Milestone 1 added current-behavior evidence without changing any support classification. All four registered ZIPs now have repeated Validate, Fields, editor, and PNG-export pixel/structural references. This proves harness reachability and repeatability in the recorded environment; it does not complete the charter’s required edit, resize, exact-font, fallback, and export matrix for any capability. Current runs used explicit recorded replacement fonts, so they do not increase exact-font confidence.

Milestone 4 adds runtime-authority evidence without broadly changing registry support labels. The now-hiring non-wrapping vertical Auto Layout, FIXED/HUG/FILL, padding/gap/alignment, HUG text, dependent FILL image slot, rectangular clipping, edit/reset, delayed exact font, root resize, and PNG chain are settled-authoritative. Circular FILL-in-HUG axes, SPACE_BETWEEN, wrapping, true masks, transforms, and advanced text remain compatibility-owned or unsupported. This is evidence for the bounded route, not a claim that every registry row in those families is complete.

Milestone 5.1 adds evidence-backed `CAP_HEIGHT` vertical trim for eligible single-style text. The exact source property, managed font metrics, routed settlement, inspection bounds, edits/reset, dependent HUG/FILL/image slots, and hidden PNG are covered. Unknown trim modes, mixed metric runs, and unverified fallback faces remain compatibility-owned. Renderer-reference promotion remains open.

Milestone 5.2 corrects the glyph-paint origin within that semantic box. Exact managed faces now prove first-cap-top/final-baseline placement, HUG vertical-alignment bypass, fixed-box wrapper alignment, delayed/cached activation, all-surface paint identity, and source-preview positions. This extends TXT-016 evidence but does not promote renderer references or change another capability family.

The Milestone 5 approval review verifies exact Geist Mono 500 glyph identity, line width, spacing, trim, and PNG painting across all four now-hiring surfaces. Exact private fonts are embedded into the `html-to-image` clone only for PNG capture; replacement/fallback profiles preserve compatibility behavior. The four reviewed references are approved. MED-003/MED-007 remain separate incomplete work because the now-hiring crop/placement still differs materially from the source reference.

Milestone 6 corrects MED-001 for the routed now-hiring chain: `FILL` uses one native aspect-preserving cover operation from the current settled slot while the retained CROP-only matrix remains provenance. Milestone 6.1 adds a real shared-asset editable fixture proving per-node imported FILL/CROP/FIT, replacement Fill/Fit, reset, reload, stale-work rejection, and PNG identity. The temporary fixed `FILL + imageTransform` compatibility path is retired.

Milestone 6.1's superseding package has three editable image fields using one asset with FILL/CROP/FIT. It proves normalized slot-to-source CROP, one inverse, clipped placement, replacement Fill/Fit transform inapplicability, exact reset, persistence, and stale decode rejection. See [editable image evidence](IMAGE_REPLACEMENT_EVIDENCE.md).

Milestone 7 registers crop-3 as the first authoritative exporter ZIP with an explicit mask source and sibling range. MSK-002 is Emulated only for a fully opaque, untransformed rectangular ALPHA source that lowers exactly to one scoped CSS clip. Its fill remains `mask-input` and never paints as RGB. Partial alpha, transformed/vector/nested/luminance/effect masks remain preserved-only or unsupported. PNT-001 gains role/revision evidence for this fixture; multiple-paint compositing is unchanged.

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
| LAY-008 HUG | AUTO/HUG, text auto-resize | Z:Y F:P | HUG; routed intrinsic measurement or compatibility DOM | DOM / Emulated | Indirect / Warn | Exported bounds; U,R | M / NH,RF | Basic non-circular route and delayed-font lifecycle proven; advanced HUG remains / M4,M5 |
| LAY-009 FILL | FILL/STRETCH/grow/align | Z:Y F:P | FILL and raw roles; CSS flex/stretch | DOM / Emulated | Indirect / Warn | Snapshot bounds; R | H / NH,RF | Raw/canonical duplicate authority / M2,M4 |
| LAY-010 Min/max dimensions | min/max width/height | Z:P F:P | axis min/max; editor CSS limits | DOM / Emulated | N / Warn | Omit limits; R | M / RF | Static mode does not apply live limits / M4 |
| LAY-011 Aspect-ratio sizing | aspect ratio/constraints | Z:P F:P | No explicit ratio contract found | DOM / Unknown pending audit | N / Unknown | Fixed bounds; Gap | L / None | Exporter/canonical gap / M2,M4 |
| LAY-012 Absolute children | `layoutPositioning=ABSOLUTE`, bounds | Z:Y F:P | positioning/bounds; absolute CSS | DOM / Emulated | N / Safe | Snapshot bounds; R | H / RF | Transform/constraint combinations partial / M4 |
| LAY-013 Horizontal constraints | `constraints.horizontal` | Z:P F:P | Raw extension + sizing; editor constraint CSS | DOM / Emulated | N / Warn | Snapshot-and-clip; R | M / RF | Static ignores live constraint path / M2,M4 |
| LAY-014 Vertical constraints | `constraints.vertical` | Z:P F:P | Raw extension + sizing; editor constraint CSS | DOM / Emulated | N / Warn | Snapshot-and-clip; R | M / RF | Static ignores live constraint path / M2,M4 |
| LAY-015 Nested transforms | `relativeTransform`, rotation, flips | Z:P F:P | raw matrix -> transform model/CSS | DOM/SVG / Approximated | N / Warn | Snapshot unsafe axes; R | M / F041 | Skew/local geometry and nesting parity / M4 |

## Text

| ID / capability | Figma source properties | Availability | Canonical representation / current strategy | Future backend / support | Edit / export | Fallback / diagnostics | Confidence / fixture | Known limitation / milestone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TXT-001 Single-style text | characters, style | Z:Y F:P | canonical text; DOM text | DOM / Emulated | Y / Safe | Browser fallback; U,E,R | H / NH,DP,DB,RF | Pixel baseline absent / M1,M4 |
| TXT-002 Mixed-style runs | styled segments/overrides | Z:P F:P | metadata/ranges; limited spans or node style | DOM/SVG / Approximated | P / Warn | Node-level style; R | M / F041 | Full run properties not reproduced / M4 |
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
| MED-003 Image CROP | CROP + transform | Z:Y F:P | normalized source polygon; one affine inverse into clipped `<img>` | DOM / Approximated | Replacement uses Fill/Fit / Safe | Diagnosed cover; R | Editable real ZIP | Rotated/non-centred import, exact reset, all-surface/PNG proven; interactive crop deferred / M6.1 |
| MED-004 Image TILE | TILE, scaling factor | Z:P F:P | tile render mode; repeat when intrinsic known | DOM/Canvas / Approximated | Y replace / Warn | Cover; R | M / F041 | Scale/phase parity incomplete / M5 |
| MED-005 Explicit STRETCH | STRETCH or field policy | Z:Y F:P | object-fit fill only for explicit intent | DOM/Canvas / Emulated | Y / Safe | Never infer; preserve aspect ratio; R | H / RF | Source intent precedence needs M2 / M2,M5 |
| MED-006 Focal position | explicit object position; CROP transform separately | Z:P F:P | FILL/FIT focal alignment; CROP affine source polygon | DOM / Approximated | P / Warn | 50/50 center; R | M / NH + synthetic | No browser focal editor/source fixture / M6 |
| MED-007 Crop transforms | `imageTransform` with CROP | Z:P F:P | matrix retained, applicability classified, affine inverse applied once | DOM / Approximated | Imported-only; replacement ignores / Safe | Cover; R | Editable real ZIP | Direction/inversion/rotation/reset source-certified; editor crop unimplemented / M6.1 |
| MED-008 Image adjustments | filters/exposure/contrast/etc. | Z:P F:P | raw extension only | Canvas / Preserved only | N / Unknown | Unadjusted image; R warning | H unsupported / DP | No adjustment backend / M5 |
| MED-009 Replacement behavior | `image.activePlacement` | Z:Y F:N | revisioned imported-source/replacement-fill/replacement-fit; editor-crop reserved | DOM / Emulated | Y / Safe when asset ready | Legacy replacement defaults Fill; R | H / editable real ZIP | All 3 source modes × Fill/Fit, switching, reset/reload, stale decode, PNG verified / M6.1 |
| MED-010 Dynamic slot recalculation | layout dependency + image slot | Derived | current routed slot → pure placement geometry → native sampling | DOM / Emulated | Indirect / Safe | Coherent compatibility slot; R | H / NH | Initial/edit/reset/root-resize/export chain proven for FILL; CROP resize lacks real fixture / M4,M6 |

## Paint and strokes

| ID / capability | Figma source properties | Availability | Canonical representation / current strategy | Future backend / support | Edit / export | Fallback / diagnostics | Confidence / fixture | Known limitation / milestone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PNT-001 Solid fills | SOLID/color/opacity/role/index | Z:Y F:P | ordered primitive paint contract; one opaque ordinary SOLID or an eligible ordered partial-opacity SOLID stack routes; mask input excluded | DOM/CSS/SVG / Native certified subset | Color field P / Safe subset | Coherent compatibility; preserve all entries | H subset / bb, main, crop-3 + ordered stack family | Mixed/non-NORMAL/node-opacity combinations deferred / M7.4 |
| PNT-002 Multiple fills | fills array/order/visibility/opacity/blend | Z:Y F:P | `ResolvedOrderedSolidStackV1` covers SOLID-only; `ResolvedOrderedNormalPaintStackV1` covers the exact SOLID-below-linear pair; one SVG group/shared clip | SVG / Native certified subsets | P / Safe subset | Whole primitive compatibility with exact reason | H / six SOLID fixtures + ordered-solid-linear-normal | IMAGE layers, reversed/additional mixed patterns and non-NORMAL deferred / M7.4 + ADR 0072 |
| PNT-003 Linear gradients | `GRADIENT_LINEAR`; raw `gradientStops`/`gradientTransform` | Z:P F:P | same-index canonical hydration plus `ResolvedLinearGradientGeometryV1`; reusable as index-1 layer only in ADR 0072 | SVG / Native certified subset | N / Safe subset | Whole-primitive compatibility with explicit reason | H / gradient-test-linear + paint-opacity + ordered-solid-linear-normal | Isolated subset plus exact SOLID-below-linear pair; other mixed paints, node opacity, gradient strokes and families deferred |
| PNT-004 Radial gradients | GRADIENT_RADIAL | Z:P F:P | type/order preserved; no source-index hydration or resolved geometry | SVG/Canvas / Preserved only | N / Unknown | Preserve/diagnose; R | H unsupported / zero corpus occurrences | Tier 2; separate source gate required |
| PNT-005 Angular gradients | GRADIENT_ANGULAR | Z:P F:P | type/order preserved; no source-index hydration or resolved geometry | Canvas / Preserved only | N / Unknown | Preserve/diagnose; R | H unsupported / zero corpus occurrences | Tier 3; separate source/backend authority |
| PNT-006 Diamond gradients | GRADIENT_DIAMOND | Z:P F:P | type/order preserved; no source-index hydration or resolved geometry | SVG/Canvas / Preserved only | N / Unknown | Preserve/diagnose; R | H unsupported / zero corpus occurrences | Tier 3; do not infer radial semantics |
| PNT-007 Paint opacity | source alpha + paint opacity by layer | Z:Y F:P | gradient retains stop alpha/paint opacity; `solid-paint-source-v1` normalizes bounded exporter aliases to RGB alpha 1 plus paint opacity once while preserving serialized evidence | DOM/SVG / Native certified gradient, Emulated solid | Color P / Safe subset | Ambiguous/unaffected values preserved; complete compatibility | H gradient and SOLID source contract | SOLID source gate closed; IMAGE opacity remains later mixed-stack work |
| PNT-008 Paint blend modes | per-paint blend plus node/group isolation | Z:P F:P | canonical value preserved; no resolved stack blend model | Layered DOM/SVG/offscreen / Preserved only | N / Unknown | NORMAL compatibility; non-NORMAL explicit gap | H source / DARKEN once | Non-NORMAL blocked by Phase 9; no MULTIPLY/SCREEN/OVERLAY/LIGHTEN corpus occurrence |
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
| GEO-007 Vector paths | vector paths/SVG asset | Z:Y F:P | vector metadata/asset | SVG / Native or Emulated | N / Safe if asset safe | Snapshot/preserve; U,R | M / F041 | Complex path parity not baselined / M1,M5 |
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
| CMP-001 Layer blend modes | blendMode | Z:P F:P | no explicit model | Canvas / Preserved only | N / Unknown | NORMAL; Gap | L / None | Unsupported / M6 |
| CMP-002 Pass-through groups | group blend pass-through | Z:P F:P | no group compositing model | Canvas / Preserved only | N / Unknown | Ordinary DOM group; Gap | L / None | Unsupported / M6 |
| CMP-003 Isolated groups | isolation/boolean | Z:P F:P | no explicit isolation model | Canvas / Preserved only | N / Unknown | Browser stacking defaults; Gap | L / None | Unsupported / M6 |
| CMP-004 Parent opacity | node opacity | Z:Y F:P | appearance opacity; CSS opacity | DOM/Canvas / Native | N / Safe | 1; R | H / RF | Group compositing exactness unbaselined / M6 |
| CMP-005 Child opacity | child node opacity | Z:Y F:P | per-node CSS opacity | DOM/Canvas / Native | N / Safe | 1; R | H / RF | Interaction with parent/blend / M6 |
| CMP-006 Paint opacity | paint opacity | Z:Y F:P | folded into solid color alpha | DOM/SVG / Emulated | P / Warn | Layer opacity approximation; R | M / RF | Multiple/gradient paints incomplete / M5,M6 |
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
