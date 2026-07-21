# Repository guidance

## Renderer-fidelity programme

Before changing renderer behavior, read the following in order:

1. [`docs/renderer-fidelity/CHARTER.md`](docs/renderer-fidelity/CHARTER.md)
2. [`docs/renderer-fidelity/ARCHITECTURE.md`](docs/renderer-fidelity/ARCHITECTURE.md)
3. [`docs/renderer-fidelity/DELIVERY_PLAN.md`](docs/renderer-fidelity/DELIVERY_PLAN.md)
4. [`docs/renderer-fidelity/STATUS.md`](docs/renderer-fidelity/STATUS.md)
5. [`docs/renderer-fidelity/CAPABILITIES.md`](docs/renderer-fidelity/CAPABILITIES.md)
6. [`docs/renderer-fidelity/FIXTURES.md`](docs/renderer-fidelity/FIXTURES.md)
7. [`docs/renderer-fidelity/HANDOFF.md`](docs/renderer-fidelity/HANDOFF.md)
8. Relevant records in [`docs/renderer-fidelity/decisions/`](docs/renderer-fidelity/decisions/)
9. [`docs/renderer-fidelity/HARNESS.md`](docs/renderer-fidelity/HARNESS.md) and its reference/environment/failure policies
10. [`docs/renderer-fidelity/SCENE_GRAPH.md`](docs/renderer-fidelity/SCENE_GRAPH.md), its [source mapping](docs/renderer-fidelity/SOURCE_TO_SCENE_MAPPING.md), [migration map](docs/renderer-fidelity/SCENE_MIGRATION.md), and [scene evidence tooling](docs/renderer-fidelity/SCENE_GRAPH_HARNESS.md)
11. [`docs/renderer-fidelity/RUNTIME_ROUTING.md`](docs/renderer-fidelity/RUNTIME_ROUTING.md) and ADRs 0025–0029 before changing routed layout, text measurement, or export readiness
12. [`docs/renderer-fidelity/IMAGE_PLACEMENT.md`](docs/renderer-fidelity/IMAGE_PLACEMENT.md), ADR 0047, and ADR 0069 before changing image fit, crop, focal placement, clipping, sampling, replacement, media telemetry, or PNG media-raster readiness
12. [`docs/renderer-fidelity/FONT_IDENTITY.md`](docs/renderer-fidelity/FONT_IDENTITY.md) and ADRs 0044–0046 before changing font import, matching, persistence, readiness, measurement, or linking
12. [`docs/renderer-fidelity/SURFACE_CONVERGENCE.md`](docs/renderer-fidelity/SURFACE_CONVERGENCE.md), [`FONT_EVIDENCE.md`](docs/renderer-fidelity/FONT_EVIDENCE.md), and [`APPEARANCE_CONTRACTS.md`](docs/renderer-fidelity/APPEARANCE_CONTRACTS.md) before changing live-surface core geometry or any appearance family
13. [`docs/renderer-fidelity/PRIMITIVE_PAINTS.md`](docs/renderer-fidelity/PRIMITIVE_PAINTS.md), [`PRIMITIVE_STROKE_GEOMETRY.md`](docs/renderer-fidelity/PRIMITIVE_STROKE_GEOMETRY.md), and ADRs 0053–0061 before changing primitive geometry, fills, corners, backgrounds, clipping, or strokes
13. [`docs/renderer-fidelity/MASK_SOURCE_CONTRACT.md`](docs/renderer-fidelity/MASK_SOURCE_CONTRACT.md), [`PRIMITIVE_PAINTS.md`](docs/renderer-fidelity/PRIMITIVE_PAINTS.md), and ADRs 0050–0052 before changing mask-source classification, sibling scope, paint roles, alpha lowering, or mask telemetry
14. [`docs/renderer-fidelity/LINEAR_GRADIENT_FIXTURE_GATE.md`](docs/renderer-fidelity/LINEAR_GRADIENT_FIXTURE_GATE.md) and ADR 0062 before changing gradient normalization, canonical semantics, resolved paint ownership, CSS/SVG output, clipping, telemetry, or export readiness
15. [`docs/renderer-fidelity/SEMANTIC_RENDERER_MVP_COURSE_CORRECTION.md`](docs/renderer-fidelity/SEMANTIC_RENDERER_MVP_COURSE_CORRECTION.md), [`BACKEND_ORCHESTRATION.md`](docs/renderer-fidelity/BACKEND_ORCHESTRATION.md), and [`DIAGNOSTIC_PROJECTION.md`](docs/renderer-fidelity/DIAGNOSTIC_PROJECTION.md) before adding an owner, backend, fallback, capability diagnostic, rendering-health field, or issue-packet field; rollout/cohort documents are historical after ADR 0071
15. [`docs/renderer-fidelity/PHASE_7_PAINT_STROKE_COMPLETION_AUDIT.md`](docs/renderer-fidelity/PHASE_7_PAINT_STROKE_COMPLETION_AUDIT.md) before proposing broader paint stacks, gradient families, or advanced stroke work
16. [`docs/renderer-fidelity/ORDERED_NORMAL_FILL_STACK_INTAKE.md`](docs/renderer-fidelity/ORDERED_NORMAL_FILL_STACK_INTAKE.md) before changing ordered paint arrays, SOLID alpha/opacity mapping, hidden-paint behavior, or layered primitive ownership
17. [`docs/renderer-fidelity/ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md`](docs/renderer-fidelity/ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md) and ADRs 0064–0065 before changing SOLID opacity provenance or implementing ordered SOLID stack ownership
18. [`docs/renderer-fidelity/ORDERED_SOLID_LINEAR_RUNTIME_AUTHORITY.md`](docs/renderer-fidelity/ORDERED_SOLID_LINEAR_RUNTIME_AUTHORITY.md) and ADR 0072 before changing the bounded mixed SOLID + linear-gradient owner

The documentation index is [`docs/renderer-fidelity/README.md`](docs/renderer-fidelity/README.md). Treat current code evidence as the factual baseline if it differs from the programme roadmap; report the discrepancy and do not silently change the charter.

### Invariants

- Initial defaults and edited values must use the same resolution lifecycle.
- Editor, inspection previews, validation, review, and export must consume the same settled render graph.
- Imported source values must never be silently discarded.
- Every normalization, enrichment, override, approximation, and fallback must retain provenance.
- Renderer behavior must never depend on template names, node names, fixture identities, or hard-coded template hierarchies.
- Browser measurements supplement semantic intent; they do not silently replace Figma semantics.
- Images must never stretch unless the imported source or an explicit field rule requests stretch.
- Dynamic content changes must invalidate every affected ancestor, sibling, image slot, crop, mask, effect, and diagnostic.
- Figma enrichment must remain optional, cached, provenance-aware, and absent from renderer-time execution.
- Unsupported features must be classified, preserved where possible, and diagnosed; they must never disappear silently.
- Inspection highlights, dimming, overlays, debug attributes, and telemetry must never become exported template content.
- User-facing diagnostics must remain separate from exporter diagnostics and renderer telemetry.
- A capability is incomplete until it has a source fixture, edit test, resize test, export test, and documented fallback behavior.
- Golden references must not be changed merely because an implementation produces different output. Any intended golden change requires a documented fidelity reason and reviewed evidence.
- The canonical package schema must not be weakened to accept arbitrary exporter output.
- Renderer-time network access must not be required for deterministic rendering.
- Preserve existing user worktree changes.

### Operating rules

- Use one milestone or coherent sub-milestone per Codex task.
- Use High or Extra High reasoning for semantic-kernel, dependency-engine, compositing, and architecture work when available.
- Start foundational milestones with an audit and proposed contracts. Narrow implementation milestones may audit and implement in one run.
- Parallel work is allowed only for independent inventories, fixture creation, or isolated research. Never allow parallel tasks to rewrite the same scene-graph or renderer contracts.
- Every implementation prompt must state context, objective, scope, non-goals, invariants, audit requirements, implementation requirements, compatibility, acceptance, automated tests, performance checks, and final-report requirements.
- Require evidence rather than reassurance. Distinguish browser-verified scenarios from automated-only coverage, and never claim a scenario passed unless it was personally verified in the current run.
- Do not update a golden reference merely because a new implementation differs.
- Stop and report when a source/exporter dependency or major architecture decision exceeds the active milestone.

### Change discipline

- Keep loose exporter compatibility at the source-normalization boundary; keep canonical validation strict.
- Preserve raw source and provenance whenever a value is normalized or approximated.
- Do not introduce renderer-time Figma or network dependencies.
- Add or update capability, fixture, property-authority, ADR, status, and handoff records in the same change as renderer behavior.
- Run the commands in [`docs/renderer-fidelity/HANDOFF.md`](docs/renderer-fidelity/HANDOFF.md) and record current-run evidence before claiming completion.

### Fidelity-harness gate

- Verify exact fixture bytes with `pnpm fidelity:baseline`; fixture lookup is exact and hash-gated through `fidelity/fixtures.json`.
- Run `pnpm fidelity:compare` before and after renderer work. A missing approved reference is a failure, not permission to use the embedded `preview.png`.
- Normal baseline and comparison commands must never write `fidelity/references/approved`.
- Reference promotion is allowed only through `pnpm fidelity:update -- --reason "<reviewed fidelity reason>"`. Preserve the generated before/after/diff/structure/environment evidence.
- Treat Fields/Validate static mode, editor mode, and hidden PNG export as separate capture surfaces. Do not force parity by changing runtime behavior during a harness task.
- Current readiness means validated import, resolved-tree marker, decoded assets, `document.fonts.ready`, and stable DOM geometry across animation frames. It is evidence, not the proposed settled graph from ADR 0010.
- Browser fallback or substituted fonts must remain visible in environment and run reports. Do not approve fallback output as source-design truth.
- Harness code belongs in Node/test-only modules and must not enter the production bundle.

### Canonical scene-graph gate

- `CanonicalSceneGraphV1` is the backend-neutral semantic/provenance projection of validated `workingPackage`. Milestone 4 authorizes it only as input to the bounded capability-gated core layout route; all other runtime families remain on compatibility paths.
- Do not add DOM, React, CSS, browser measurement, asset decoding, network access, or settled geometry to the canonical scene transformer.
- Preserve source IDs/order, raw extension evidence, unsupported semantics, candidate authority, conflicts, fallbacks, and unmapped-property reports.
- Run `pnpm scene:compare` before and after scene-contract work. Normal scene commands never update approved snapshots.
- Scene snapshot updates require `pnpm scene:update -- --reason "<reviewed contract reason>"`; they are independent of pixel references and never authorize a pixel-golden update.
- Proposed ADR 0010 remains the future settled-graph direction. Do not describe the canonical scene graph as settled or render-authoritative.

### Dependency and settlement gate

- The full-surface `MeasurementSnapshotV1`, `DependencyGraphV1`, and `SettledSceneGraphV1` remain observational/test-only evidence from Milestone 3. Milestone 4's separate `CoreLayoutSettlementV1` is production authority only for capability-routed core geometry; `ResolvedRenderTreeV1` plus existing DOM/browser behavior remains authority everywhere else.
- Measurement publication requires an exact package/scene/override/font/asset/container/epoch revision match. Never allow older async work to win by completion time.
- Known changes invalidate property-key dependents; unknown properties and full scene revisions use an explicit safe full-tree fallback. Never encode fixture or node names in dependency behavior.
- Keep headless and visible Chromium raster evidence in separate environment profiles. Do not broaden tolerance or update headless references to accept visible-browser variance.
- Run `pnpm settlement:compare` after a fresh fidelity baseline. Normal settlement commands never update approved snapshots; `pnpm settlement:update` requires a reviewed reason and affects settlement evidence only.
- Proposed ADR 0010 and Proposed ADR 0012 remain Proposed. The bounded Milestone 4 core route is not authorization to promote the full observational settlement contract or add Canvas/offscreen rendering.

### Core layout and text runtime-routing gate

- Every routed property must have one explicit ownership state: `settled-authoritative`, `compatibility-authoritative`, `intrinsic-measurement-input`, `static-canonical`, `unsupported`, or `unresolved`.
- Browser measurement may supply intrinsic text/font metrics for migrated properties; it must not become final container, ancestor, sibling, image-slot, clip, or export geometry authority.
- Capability routing must not inspect package, fixture, template, or node identity. A compatibility boundary owns its complete subtree until coherent evidence authorizes a smaller boundary.
- Routed PNG export must reject stale or pending settlement revisions. Do not replace this semantic gate with a fixed sleep.
- Fields and Validate remain intentional bounds-first compare surfaces in Milestone 4. ADR 0010 remains Proposed until all surfaces consume one shared settled instance.
- Run `pnpm runtime-routing:stage4a`, `pnpm runtime-routing:scenarios`, the full renderer comparison, scene comparison, and settlement comparison after routed core changes.

### Image-placement gate

- Treat asset identity, slot/mask bounds, fit mode, focal point, source transform, destination geometry, clipping, and sampling as separate evidence.
- Figma `imageTransform` is active only for `CROP`; preserve it as inapplicable provenance for source-authoritative `FILL`, `FIT`, and `TILE`.
- Dynamic routed `FILL` uses the current settled slot and browser-native aspect-preserving cover. `STRETCH` requires explicit source or field-policy intent.
- Fixed and dynamic `FILL + imageTransform` use one cover operation; the exact editable CROP/FIT/FILL fixture supersedes the former fixed-FILL compatibility exception. Do not route by fixture, template, node name, or node ID.
- Keep immutable imported `scaleMode/imageTransform` separate from revisioned `imported-source`, `replacement-fill`, `replacement-fit`, and reserved `editor-crop` authority. Replacement Fill/Fit must never reuse imported crop data; reset restores imported authority at a newer revision.
- Reject stale file-read, intrinsic-dimension, asset, slot, placement, replacement, and settlement revisions before renderer or PNG publication.
- CSS-background media PNG capture requires current decode/intrinsic evidence plus ADR 0069's revision-bound completed raster boundary. Never replace it with a fixed sleep, raw object-URL identity, pixel snapping, or a tolerance change.
- Add or update final visible source/destination telemetry when placement behavior changes. Do not introduce a custom resampler or Canvas backend without fixture evidence.
- Run exact two-pass captures for all four now-hiring surfaces and verify all non-now-hiring approved pixels remain unchanged. Never promote media references without explicit review.

### Font identity and linking gate

- Preserve requested family/style/weight separately from parsed OpenType face identity and the private runtime family.
- Candidate discovery, upload validation, explicit linking, auto-linking, and final validation must use the shared semantic matcher.
- Exact authority requires the linked binary hash, collection face, semantic match, private loaded `FontFace`, glyph coverage evidence, and current revisions. `document.fonts.check()` alone is insufficient.
- Never register an exact managed face under only its human family name; local/system faces must not satisfy binary identity.
- Use `pnpm fidelity:source-authoritative` for real Fonts upload/restore/all-surface evidence. Keep its candidates unapproved until explicit source review.

### Core surface and appearance-contract gate

- Validate, Fields, editor, review/import live previews, and hidden PNG apply `CoreLayoutSettlementV1` only for capability-routed core geometry. Compatibility-owned appearance remains surface-specific until migrated.
- Surface-local settlements may share content identity but are not one shared instance; ADR 0010 remains Proposed.
- FILL-inside-HUG cycles must emit explicit `circularDependencies` evidence and select coherent compatibility fallback. Do not solve them by bounded guessing or identity checks.
- Exact-font claims require the hash-gated identities in `fidelity/fonts.json` and `pnpm runtime-routing:fonts`; CSS availability or an alias font is not binary identity evidence.
- `MediaPlacementV1`, `GeometryShapeV1`, `PaintStackV1`, `StrokeStackV1`, `MaskGraphV1`, `EffectStackV1`, and `CompositingGroupV1` are observational contracts only. Do not import them into runtime routing until a later fixture-led milestone authorizes a family.
- Source-level appearance probes test preservation and order only. They are not exporter ZIPs, source references, approved renderer references, or support claims.
- Run `pnpm appearance:baseline` after scene or appearance-contract work. It has no approved-reference update path.
- Keep appearance/font harnesses and external font binaries out of the production bundle. Canvas, WebGL, and raster fallback remain evidence-led choices; ADR 0012 stays Proposed.

### Vertical text-trim gate

- Treat canonical `text.leadingTrim` as intent; `CAP_HEIGHT` means first cap top through final baseline. Never infer trim from characters, names, IDs, or exported snapshot offsets.
- Keep layout, browser-line, Figma-trimmed, glyph-paint, clipping, and diagnostic bounds separate. Glyph overhang must not silently expand HUG or imply clipping.
- Trim authority requires exact loaded family/weight/style or a confirmed replacement plus current cap/baseline metrics. Missing, stale, unknown, or unsupported mixed-run inputs select coherent compatibility routing.
- Font activation must change the measurement revision; an older fallback/replacement result cannot overwrite newer exact-face metrics.
- Ordinary Validate/Fields text outlines use the semantic trimmed box. Overlay and telemetry attributes remain non-export content.
- Run `pnpm runtime-routing:text-trim`, `pnpm runtime-routing:fonts`, all routing scenarios, and the guarded renderer/scene/settlement comparisons after vertical text changes.
- A HUG trim box has no vertical spare space: source CENTER/BOTTOM alignment must not reposition its glyph layer. Fixed-height alignment positions the semantic trimmed wrapper, never the browser line box or glyph bounds.
- Glyph translation derives only from revision-current first-cap-top/baseline metrics. Container spare space, centring heuristics, exported height and glyph overhang are forbidden inputs.
- For a reviewed source-fidelity correction, source design and structural evidence may supersede a historically incorrect approved renderer baseline, but the guarded reasoned update process remains mandatory. Never promote Milestone 5/5.1/5.2 candidates without explicit review.

### Primitive appearance gate

- `PrimitiveAppearanceV1` is runtime authority only for capability-selected axis-aligned FRAME/RECTANGLE nodes. One visual owner means compatibility fill/radius/stroke output is disabled for an authoritative primitive.
- Route only real-ZIP-certified zero/one opaque ordinary SOLID paint, uniform or independent edge-locally clamped corners, and zero/one opaque uniform rectangular `INSIDE`, `CENTER`, or `OUTSIDE` SOLID stroke. Mask inputs, media/vector owners, effects, unsupported blends, non-axis-aligned geometry, and self-clipped expanded strokes select coherent compatibility.
- Preserve every source paint/stroke entry, source index, alpha, opacity, visibility, role, transform, radius, provenance, and independent revision even when it cannot route.
- Hidden/transparent/partial-opacity/multiple paints, layout-included or advanced strokes, dashes/caps/joins, gradient combinations outside the certified isolated linear subset, effects, and compositing remain fixture-gated. Synthetic tests are not source certification.
- Stroke output must not affect layout. Preserve source path, fill, inner, centre, outer, and visual bounds separately. Uniform INSIDE may use its proven CSS inset owner; independent INSIDE and eligible CENTER/OUTSIDE use one SVG fill/stroke owner. Never emit duplicate CSS/SVG appearance.
- Independent corner order is top-left/top-right/bottom-right/bottom-left. Effective values use the source-certified edge-local Figma rule and recompute from current settled bounds; never defer semantic clamping to CSS.
- Primitive overflow and ancestor clipping are separate. An OUTSIDE stroke remains visible beyond its own layout box and may be clipped only by source-authoritative ancestors in the certified subset.
- Canvas background, root/frame fill, application stage, inspection background, and PNG transparency are distinct authorities. Application UI must never become template pixels.
- Eligible multiple-SOLID NORMAL stacks require current `solid-paint-source-v1` provenance and use one `ResolvedOrderedSolidStackV1` plus one SVG group/shared clip owner. Source index 0 is backmost; hidden entries remain preserved; color alpha and paint opacity apply once. Any ambiguous layer or unsupported node dependency selects whole-primitive compatibility.
- Run `pnpm primitives:source-evidence`, `pnpm primitives:stroke-source-evidence`, `pnpm primitives:browser-scenarios`, all guarded comparisons, and mask/media/font/text regressions after primitive changes. Never update references without explicit review.

### Linear-gradient fixture gate

- Milestone 7.3A routes only the exact source-certified isolated `GRADIENT_LINEAR` subset. Source index pairs canonical paint with `extensions.figma.rawFills`; preserve both, retain conflicts, and keep strict canonical validation.
- The certified matrix maps normalized node-local coordinates to normalized gradient coordinates. Derive start/end/third handles from exactly one inverse at `(0,.5)`, `(1,.5)`, and `(0,1)`, then project against current settled bounds.
- Preserve declared two/three-stop order and nonuniform positions. Interpolate straight sRGB and stop alpha independently; apply paint opacity once afterward, then source-over. Node opacity below 1 remains compatibility-owned.
- One eligible FRAME/RECTANGLE uses one SVG primitive path and one SVG linear-gradient definition. Disable compatibility fill/radius output for that owner; gradient-local paint evaluates before node rotation and clips through the source-certified uniform/independent corner path.
- Missing/conflicting source pairing, invalid/singular matrices, malformed/out-of-order stops, mixed paints, strokes, masks, effects, media/vector owners, unsupported blends, or unsupported transforms select the whole primitive compatibility boundary with an explicit reason.
- Renderer publication must reject a stale resolved gradient source revision. Resize recomputes bounds-dependent geometry while preserving normalized intent and immutable source revision.
- Keep radial/angular/diamond gradients, gradient strokes, multiple/mixed paints, non-NORMAL blends, effects, masks, shaders, Canvas/WebGL, and general compositing outside Milestone 7.3A.
- Run `pnpm gradients:source-evidence`, `pnpm gradients:browser-scenarios`, `pnpm gradients:performance`, exact strict lifecycle, two-pass four-surface capture, and guarded renderer/scene/settlement comparisons after gradient changes. Never promote candidates without separate explicit review.

### Phase 7 paint/stroke completion gate

- The 2026-07-18 corpus audit is a historical Result B. The bounded ordered-SOLID source gate closed as Result A on 2026-07-19, but Phase 7 V1 still lacks an ordered `NORMAL` fill-stack runtime owner.
- For Figma exporter 0.6.0 only, a SOLID with no same-index raw paint and finite unit `color.a` / `paint.opacity` equal within `1e-6` is a source-contract-backed mirrored alias. Preserve both serialized values in `solid-paint-source-v1`, canonicalize color alpha to 1, and apply paint opacity once. Differing, invalid, conflicting, or unaffected evidence remains ambiguous or unchanged.
- Canonical arrays and observational `PaintStackV1`/`StrokeStackV1` preserve order, but that alone is not runtime support. Current compatibility output selects the first visible SOLID and first IMAGE by type; it must not be described as a general ordered stack.
- Proposed Milestone 7.4 is multiple rectangular SOLID layers with `NORMAL` blending only. One SVG group and one shared primitive clip are Proposed under ADR 0065, not implemented authority. Do not route pixels without a separate approval.
- Do not reopen Phase 6 media geometry when an IMAGE becomes a future stack layer. A layered owner must consume the current media-placement result and certified linear-gradient result without allowing either compatibility owner to paint a duplicate.
- Radial/angular/diamond gradients, gradient strokes, dashes/caps/joins, multiple strokes, and per-edge weights have no real occurrence in the audited 17-ZIP corpus. Preserve explicit compatibility boundaries; do not infer semantics from types or synthetic probes.
- Non-NORMAL paint blending is blocked by Phase 9 isolation/compositing authority. Open-path stroke work is blocked by Phase 8 geometry. Neither is part of the next ordered-NORMAL fixture milestone.
- Source-gate closure authorizes the canonical provenance correction and documentation only. It does not authorize paint-stack resolver/rendering changes, fixture registration, candidate generation, tolerance changes, or approved-reference promotion.

### Source-certified mask and primitive-paint gate

- `node.mask.isMask === true` plus an exporter-declared, same-parent ordered `maskRelationships` entry is the only source-certified mask classifier and scope. Never infer a relationship from names, IDs, colors, `maskType` alone, or sibling order.
- A mask source paint has exactly one visual role: `mask-input`. Preserve its source color, alpha, opacity, transform, geometry, order, and provenance, but do not also paint it as ordinary RGB content.
- Runtime lowering is authorized only for capability `exact-opaque-rectangular-alpha`: one opaque SOLID rectangle, opacity 1, zero radii, no stroke/effect, supported blend, identity linear transform, and valid intersecting declared scope. It may lower to one scoped CSS inset clip.
- Partial alpha, luminance, vector/nested masks, image/gradient/effect mask paints, unsupported transforms, malformed relationships, and unsupported termination remain explicit compatibility or unsupported states. Do not approximate them as hard clips or add Canvas/SVG masking without a new fixture-led milestone.
- Canonical and resolved mask revisions must match the current package. Reject or recompute stale supplied relations before renderer or PNG publication.
- Run `pnpm mask:source-evidence`, `pnpm mask:browser-scenarios`, the two-pass four-surface capture, scene/appearance/settlement comparisons, and guarded existing-fixture comparison after mask or paint-role work. These commands never authorize reference promotion.

### Backend orchestration and semantic-product gate

- Every production visual owner must register behind `ResolvedBackendDecisionV1`; renderer components must not add a competing raw-source routing decision.
- Keep family-specific semantic contracts authoritative inputs. Central orchestration is not permission to rewrite stable DOM/CSS or SVG owners.
- `ResolvedBackendDiagnosticProjectionV1` classifies existing evidence; do not duplicate package, font, asset, field, export, or visual-diff validation.
- Canvas/offscreen and WebGL remain explicit unavailable backends until a fixture and accepted ADR authorize them. ADR 0012 stays Proposed.
- ADR 0071 supersedes product Legacy/Semantic/Compare modes and cohorts. Production rendering consumes the unfiltered resolved backend decisions automatically; compatibility remains a capability/subtree owner, never a selectable Legacy renderer.
- `renderer-rollout-preference` and `renderer-rollout-cohort` are inert historical metadata. Product code must not read, migrate, delete, diagnose, or render from those records.
- `ResolvedProductRenderIdentityV1` is non-selecting evidence. Keep package, canonical, resolved, backend, settlement, font, asset, placement, and export-readiness identity consistent across Validate, Fields, editor, previews, PNG, reload, and offline restoration.
- Validate is the product fidelity workbench. Reuse existing validation and diagnostic authorities, collapse derivative findings under one root cause, and keep technical hashes/revisions behind disclosure.
- The product must not mount a hidden comparison renderer. Source-reference availability may be reported, but pixel/geometry comparison, candidates, and reference promotion remain harness-only.
- Local fidelity issue packets must be deterministic, privacy-bounded, read-only, and opt-in for pixels. Never include raw package ZIP or asset bytes by default and never upload evidence.
- Historical rollout and cohort ADRs/evidence remain auditable. Do not reactivate them without a new accepted decision and explicit migration.
