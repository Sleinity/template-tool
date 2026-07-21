# Core Layout and Text Runtime Routing

## Phase 13 rollout wrapper

The persisted internal `legacy | semantic | compare` preference is resolved before final owner activation. Missing or corrupt state preserves the current surface default; explicit modes map core routing to `disabled | authoritative | compare`. `ResolvedRendererRolloutDecisionV1` filters the already-resolved family owner set, retains coherent fallback, and supplies the one effective tree consumed by the renderer. See [rollout modes](ROLLOUT_MODES.md) and Accepted ADR 0068.

The [operator-cohort policy](SEMANTIC_ROLLOUT_POLICY.md) is downstream operational aggregation only. The implemented pure eligibility evaluator reads lifecycle, decision, diagnostic, settlement, export, persistence, and comparison summaries, but cannot change property ownership, choose a backend, or make an unsafe node Semantic-eligible. Local Stage 1 is governed by Accepted ADR 0070; Stage 2 remains unimplemented.

## Central backend decision

Phase 11 adds `ResolvedBackendDecisionV1` above the existing family routes. Core layout still owns property routing and settlement; primitive, gradient, ordered-SOLID, media, vector, mask, and compatibility contracts still own their family evidence. The central record selects and revisions their runtime owners so `TemplatePackageRenderer` does not make a competing top-level choice from raw properties. See [backend orchestration](BACKEND_ORCHESTRATION.md) and ADR 0066.

## Source-certified mask route

Milestone 7 adds an appearance route outside core-layout ownership: a current-revision, exporter-declared relationship with capability `exact-opaque-rectangular-alpha` is authoritative only for its derived template-space clip inset and mask-source paint ownership. It does not consume browser geometry and does not alter core settlement. Unsupported or invalid relations remain coherent compatibility subtrees with explicit reasons. Package, scene, resolved mask, and renderer telemetry retain one relationship/revision identity across all live surfaces and PNG.

Milestone 4 introduces the first production consumer of the canonical scene graph. The route is capability-based, property-explicit, and reversible. It does not inspect package names, fixture IDs, node names, or known hierarchies.

## Runtime pipeline

`workingPackage -> CanonicalSceneGraphV1 -> CoreLayoutRouteV1 -> intrinsic text measurements -> CoreLayoutSettlementV1 -> editor/hidden PNG geometry`

`ResolvedRenderTreeV1` remains the compatibility and visual-semantics projection. Milestone 6 adds `ResolvedImagePlacementIntentV1` inside that projection: settlement owns the current routed slot, while the placement resolver owns source/destination image geometry. Paint, vectors, masks, effects, transforms, constraints, motion, fields, and diagnostics otherwise continue through existing helpers.

## Ownership states

The machine-readable table is `CORE_LAYOUT_PROPERTY_OWNERSHIP` in `src/template-package/runtime-routing/propertyOwnership.ts`.

| State | Meaning |
| --- | --- |
| `settled-authoritative` | Final geometry comes from `CoreLayoutSettlementV1`; CSS Flexbox may not recompute it. |
| `compatibility-authoritative` | Existing resolver/DOM/CSS helpers retain authority for the whole boundary subtree. |
| `intrinsic-measurement-input` | The browser supplies revision-tagged glyph/line metrics only, never final parent/sibling geometry. |
| `static-canonical` | A canonical value is consumed without dynamic interpretation. |
| `unsupported` | A capability is outside this route and selects compatibility or a diagnostic. |
| `unresolved` | Evidence is insufficient to assign final authority. |

Supported routed properties are basic non-wrapping vertical/horizontal Auto Layout, FIXED/HUG/FILL on non-circular axes, padding, gap, MIN/CENTER/MAX/STRETCH alignment, normal and source `CAP_HEIGHT` HUG text height, dependent HUG/FILL geometry, image slot bounds, and rectangular clip bounds.

## Capability and fallback rules

The router rejects or bounds:

- wrapping and SPACE_BETWEEN/baseline alignment;
- non-identity transforms;
- true mask semantics;
- absolute children as compatibility boundaries;
- a FILL child feeding the same HUG parent axis, because current PNG capture proved DOM-form sensitivity despite equivalent visible geometry;
- any unsafe flow descendant, which makes the affected ancestor route unsafe.

Fallback is transitive. Once a compatibility boundary is selected, descendants cannot reacquire settled ownership. `CoreLayoutRouteV1.circularDependencies` records the child, parent, axis, main/cross classification, reason, and fallback chain for FILL-inside-HUG. It does not solve the cycle. Registered deal-post unsupported layout and the banner circular HUG/FILL path therefore remain coherent compatibility routes. Now-hiring's root → HUG text → HUG content → FILL visual → image slot chain is settled-authoritative on all live renderer surfaces.

## Browser measurement boundary

The renderer creates an isolated invisible `width:max-content` typography probe for intrinsic width and uses clustered Range line evidence, Canvas metrics, and a controlled DOM baseline marker for line count, ascent, descent, cap height, baseline placement, glyph paint extents, and intrinsic height. `CAP_HEIGHT` uses `capHeight + (lineCount - 1) × lineHeight`; CSS feature detection and full browser line boxes do not own the result. A semantic wrapper owns the trim height; its inner line-box paint span uses `translationY=-firstLineCapTop`. HUG bypasses fixed-box vertical alignment, while fixed boxes align the semantic wrapper. Measurements and glyph origins carry the current package/font revision. A stale measurement is ignored and reported; it cannot publish final geometry.

Trim authority additionally requires a known source mode, exact loaded family/weight/style or confirmed replacement policy, available cap/baseline metrics, supported text-box mode, and no unsupported mixed runs. Missing inputs apply a complete compatibility boundary until an authoritative measurement exists. The renderer exposes separate layout, browser-line, trimmed, glyph-paint, and clip telemetry; only the trimmed height enters HUG settlement.

No routed final x, y, width, parent HUG height, sibling FILL size, image slot, or clip bound is read back from the renderer DOM.

For routed images, each new settled slot recomputes placement from immutable source intent and intrinsic asset dimensions. `FILL` uses aspect-preserving cover and `FIT` contains; a preserved `imageTransform` is CROP-only and cannot add zoom in any fixed or dynamic FILL/FIT node. A real exported fixture proves that the raw normalized slot-to-source CROP matrix is inverted once into CSS placement. Revisioned `activePlacementState` transfers authority to replacement Fill/Fit without mutating source semantics; reset restores imported authority at a newer revision. The scene/routing identity includes active state/revision, and UI operation revisions reject stale image decode results. See [image placement](IMAGE_PLACEMENT.md) and [editable image evidence](IMAGE_REPLACEMENT_EVIDENCE.md).

Managed-font routing separates source request, linked OpenType face, and runtime family. A linked face is registered under a hash/face/axis-derived private family; resolved node CSS, normalized text runs, intrinsic measurement, readiness, and export use that private family. The human family remains canonical semantics and UI evidence. Candidate selection and final linking share one semantic matcher, so a face accepted at upload cannot be rejected later by a competing family-name rule. Runtime font revisions are package-face-scoped and set-normalize equivalent browser registrations; unrelated application faces cannot perturb settlement, while delayed availability of a requested primary face still invalidates fallback geometry. See [font identity](FONT_IDENTITY.md) and ADRs 0044–0045.

## Surface and export policy

Milestones 7.1–7.2 add an orthogonal primitive-appearance route. It consumes resolved canonical appearance intent, current settled bounds, and canonical ancestor clip evidence, then selects one `primitive-authoritative` DOM/CSS or SVG owner or one complete `compatibility-authoritative` owner. Paint identity can remain stable while independent effective radii and path geometry revisions change. Stale primitive-tree publication is recomputed before render/PNG; the route does not broaden core layout capability or accept ADR 0010/0012.

Milestone 7.3A extends that primitive route only for the isolated source-certified linear-gradient capability. Same-index raw/canonical evidence supplies stops and a normalized node-local-to-gradient matrix. One inverse and current settled bounds produce the SVG geometry. One SVG path owns paint and corner clipping; the outer node owns rotation. A mismatched source revision is recomputed before publication. Mixed paints, strokes, node opacity, masks, effects, other gradient families, and general compositing remain complete compatibility boundaries.

Milestone 7.4 adds property-selected authority only for eligible multiple-SOLID NORMAL rectangles. Current `solid-paint-source-v1` provenance must establish apply-once opacity for every entry. `ResolvedOrderedSolidStackV1` preserves order, hidden entries, source identity, current geometry, and stack revision. One SVG group paints visible layers from source index 0 upward inside one shared clip, while compatibility fill output is disabled. Stale supplied primitive results are recomputed. Mixed paint types, ambiguous provenance, node opacity, masks, effects, strokes, media/vector ownership, invalid paint data, transforms, and non-NORMAL blends retain one whole-node compatibility owner.

Advanced stroke and blend boundaries are unchanged. Open-path dashes/caps/joins and gradient strokes wait for Phase 8 geometry; non-NORMAL paint blends wait for Phase 9 group/isolation authority. The audited corpus provides no real advanced-stroke occurrence from which to narrow those boundaries.

- Editor, hidden PNG, Fields, Validate, and other `TemplateInspectionPreview` integrations use authoritative mode for eligible core geometry and independently derive the same content-addressed revision and settlement identity.
- Fields/Validate retain static compatibility appearance. Inspection overlays align to rendered settled boxes but remain presentation-only and outside exported content.
- Each surface still owns a separate settlement instance. This keeps ADR 0010 Proposed even though eligible geometry converges.
- Export waits for two stable animation frames with the same ready settlement revision/identity. A routed stale or pending renderer is rejected. A zero-routed compatibility package bypasses settlement readiness and uses existing export readiness.
- Developer comparison metadata is emitted only as `data-package-*` attributes. It is not visual content and is absent from exported pixels.
- Rollout identity and Compare observations are developer-only telemetry. Compare publishes one visible and zero hidden template renders; PNG readiness binds to the current rollout revision.

## Evidence and commands

- `pnpm runtime-routing:stage4a`: controlled exact-initial, fallback-initial, delayed-exact, unavailable-exact, replacement, stale-revision contract, real root resize, shared editor/export identity, and real PNG dimensions.
- `pnpm runtime-routing:scenarios`: initial/short/long/clear/rapid/reset text, image replacement/clear, and preview resize through the real editor.
- `pnpm runtime-routing:fonts`: exact Geist Mono 500 and Inter Tight 700 initial/delayed/fallback evidence across live surfaces and real PNG.
- `pnpm runtime-routing:text-trim`: exact-font formula, edit, multiline, descender, propagation, and reset scenarios.
- `pnpm runtime-rollout:control` and `pnpm runtime-rollout:scenarios <mode>`: persisted mode, rollback, corrupt-state fallback, one-owner Compare evidence, and all-surface identity.
- `pnpm appearance:baseline`: deterministic observational appearance projections for exact registered ZIPs.
- `pnpm fidelity:compare`: guarded pixels and geometry for all registered surfaces.
- `pnpm fidelity:source-authoritative`: real Fonts UI import, persisted exact-face linking, and repeated all-surface/PNG evidence for now-hiring.
- `pnpm scene:compare` and `pnpm settlement:compare`: independent canonical and observational contracts.
- `pnpm primitives:source-evidence`, `pnpm primitives:stroke-source-evidence`, and `pnpm primitives:browser-scenarios`: regional/full source fidelity, singular ownership, all-surface identity, and offline persistence for the Milestones 7.1–7.2 subsets.
- `pnpm gradients:source-evidence`, `pnpm gradients:browser-scenarios`, and `pnpm gradients:performance`: source pixels, one-inverse telemetry, cross-surface identity, offline persistence, and local cost for Milestone 7.3A.
- `pnpm ordered-solids:source-evidence`, `pnpm ordered-solids:browser-scenarios`, and `pnpm ordered-solids:performance`: source pixels, order/provenance/clip telemetry, cross-surface identity, offline persistence, and local cost for Milestone 7.4.

Milestone 4 final evidence is under `fidelity/runtime-routing/stage-4a/milestone-4-delivery-final-stage4a-current/`, `fidelity/runtime-routing/stage-4a/milestone-4-stage-4a-final-visible/`, `fidelity/settlement/browser-scenarios/milestone-4-delivery-final-scenarios/`, and `fidelity/candidates/milestone-4-delivery-final-current-2/`. Approved references were not updated.

The controlled now-hiring route converged in 2 iterations using 2 intrinsic text measurements for 6 routed and 4 compatibility nodes. Browser telemetry reported 0–0.3 ms core settlement compute time. These values are a local baseline only, not performance budgets.
