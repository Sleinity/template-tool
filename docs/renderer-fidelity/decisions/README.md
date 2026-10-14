# Renderer ADRs

Architecture decision records are append-only evidence. Supersede a record with a new ADR; do not rewrite an accepted historical decision to match later code.

| ADR | Status | Decision |
| --- | --- | --- |
| [0096](0096-host-font-registry-is-render-and-export-authority.md) | Accepted | A borrowed host font registry is continuous authority for V2 rendering and PNG; committed publication and export guards reject abandoned work. |
| [0095](0095-established-media-underlay-is-not-primitive-fallback.md) | Accepted | An established opaque SOLID-below-FILL/FIT image is not a degraded primitive SVG-stack fallback; active owners and pixels stay unchanged. |
| [0090](0090-bounded-opaque-source-compositing-owner.md) | Accepted | One internal source-property-gated DOM owner paints the certified opaque Matrix and Matrix 2 blend/group subset; unsupported combinations stay on a coherent compatibility path. |
| [0089](0089-live-figma-matrix2-confirms-paint-stack-and-bounded-overlay.md) | Accepted | Direct Figma inspection matches all 14 Matrix 2 paints and certifies three bounded group-Overlay image-interior samples; no runtime transfer. |
| [0088](0088-matched-matrix-group-control-certifies-bounded-isolation.md) | Accepted | Matrix 2 certifies matched pass-through versus isolated group behavior and post-group opacity only over sampled opaque backdrops; no runtime transfer. |
| [0087](0087-phase9-matrix-cover-source-does-not-certify-isolation.md) | Accepted | Matrix and Cover certify sampled opaque paint blending, but not group isolation or a production compositing owner. |
| [0086](0086-svg-vector-assets-own-their-embedded-strokes.md) | Accepted | A rendered complete SVG vector owns its embedded stroke; its wrapper must not paint a duplicate CSS border. |
| [0085](0085-singular-image-replacement-policy.md) | Accepted | Image fields declare one required replacement policy while imported placement remains source-authoritative. |
| [0084](0084-full-parent-alpha-mask-owns-stable-parent-clip-boundary.md) | Accepted | A certified full-parent ALPHA mask owns the stable parent clip boundary across every surface. |
| [0081](0081-studio-and-custom-hosts-share-v2-configuration-and-content-authority.md) | Accepted | Studio and custom hosts share V2 configuration, canonical content and renderer authority. |
| [0001](0001-zip-first-offline-authority.md) | Accepted | ZIP-first offline rendering is authoritative |
| [0002](0002-normalize-before-strict-validation.md) | Accepted | Normalize raw exporter data before strict canonical validation |
| [0003](0003-optional-figma-enrichment.md) | Accepted | Figma enrichment is optional and non-blocking |
| [0004](0004-shared-dynamic-geometry-path.md) | Accepted | Imported defaults and edits share the dynamic editor geometry path |
| [0005](0005-resolved-image-semantics.md) | Accepted | Images resolve asset, slot, and placement separately |
| [0006](0006-fill-crop-preserve-aspect.md) | Accepted | FILL and CROP preserve aspect ratio |
| [0007](0007-fit-contains.md) | Accepted | FIT contains |
| [0008](0008-stretch-requires-intent.md) | Accepted | STRETCH requires explicit intent |
| [0009](0009-hug-uses-rendered-measurement.md) | Accepted | HUG text uses rendered measurement |
| [0010](0010-one-settled-graph.md) | Proposed | Editor, validation, and export converge on one settled graph |
| [0011](0011-inspection-overlays-not-export-content.md) | Accepted | Inspection overlays remain separate from export content |
| [0012](0012-defer-offscreen-backend.md) | Proposed | Defer canvas/offscreen rendering until a fixture proves necessity |
| [0013](0013-fidelity-evidence-system.md) | Accepted | Exact fixtures, separate references, and real application surfaces form the fidelity evidence system |
| [0014](0014-canonical-scene-graph-contract.md) | Accepted | A versioned backend-neutral scene contract is observationally derived from `workingPackage` |
| [0015](0015-property-authority-contract.md) | Accepted | Scene properties retain selected authority, competing candidates, provenance, conflicts, and fallbacks |
| [0016](0016-deterministic-scene-transformation.md) | Accepted | Package-to-scene transformation is pure, deterministic, and browser-free |
| [0017](0017-preserve-unmapped-and-unsupported-scene-data.md) | Accepted | Unmapped and unsupported source values stay preserved and visible |
| [0018](0018-scene-compatibility-migration.md) | Accepted | Runtime helpers migrate incrementally only after per-family fidelity gates |
| [0019](0019-versioned-measurement-snapshots.md) | Accepted | Browser measurements are explicit versioned observational inputs |
| [0020](0020-property-dependency-and-invalidation.md) | Accepted | Property-key edges and deterministic traces define invalidation |
| [0021](0021-revision-guarded-measurement-publication.md) | Accepted | Stale and future measurement work cannot publish |
| [0022](0022-observational-settlement-convergence.md) | Accepted | Settlement is pure, bounded, deterministic, and observational |
| [0023](0023-harness-only-settlement-integration.md) | Accepted | Settlement integration remains outside production routing |
| [0024](0024-raster-environment-profiles.md) | Accepted | Headless and visible raster references remain separate |
| [0025](0025-core-layout-property-ownership.md) | Accepted | Core layout properties have one explicit runtime owner |
| [0026](0026-capability-only-core-layout-routing.md) | Accepted | Core layout routing depends only on canonical capabilities |
| [0027](0027-coherent-compatibility-subtrees.md) | Accepted | Compatibility fallback is transitive across a coherent subtree |
| [0028](0028-browser-supplies-intrinsic-text-metrics.md) | Accepted | Browser text measurement supplies intrinsic inputs, not final boxes |
| [0029](0029-settlement-readiness-gates-export.md) | Accepted | Routed PNG export requires a current stable settlement |
| [0030](0030-converge-routed-core-geometry-across-live-surfaces.md) | Accepted | Capability-routed core geometry converges across live surfaces |
| [0031](0031-exact-font-binaries-are-hash-gated-test-inputs.md) | Accepted | Exact font claims require manifest-verified binaries |
| [0032](0032-fill-inside-hug-cycles-select-explicit-fallback.md) | Accepted | Circular FILL-in-HUG emits evidence and selects compatibility fallback |
| [0033](0033-versioned-backend-neutral-appearance-contracts.md) | Accepted | Appearance families use observational backend-neutral contracts |
| [0034](0034-backend-selection-remains-fixture-led.md) | Accepted | Backend selection remains fixture-led |
| [0035](0035-source-level-probes-cannot-authorize-rendering.md) | Accepted | Source-level probes cannot authorize rendering support |
| [0036](0036-optional-provider-absence-is-not-an-http-failure.md) | Accepted | Optional enrichment absence uses a typed non-error HTTP response |
| [0037](0037-appearance-evidence-is-independent-of-renderer-goldens.md) | Accepted | Appearance candidates cannot update renderer goldens |
| [0038](0038-source-owned-vertical-text-trim.md) | Accepted | Vertical text trim is explicit source-owned semantics |
| [0039](0039-exact-face-font-metrics-own-trim-inputs.md) | Accepted | Exact/approved face metrics own trim inputs |
| [0040](0040-semantic-text-box-is-separate-from-glyph-paint.md) | Accepted | Semantic text boxes remain separate from glyph paint and clipping |
| [0041](0041-inspection-text-bounds-use-semantic-trim.md) | Accepted | Inspection outlines use authoritative semantic trim bounds |
| [0042](0042-cap-trim-glyph-origin-is-exact-metric-authority.md) | Accepted | CAP_HEIGHT glyph origin derives from exact cap/baseline metrics |
| [0043](0043-reviewed-source-fidelity-can-supersede-historical-baselines.md) | Accepted | Reviewed source fidelity may supersede historically incorrect renderer baselines |
| [0044](0044-canonical-font-request-and-face-identity.md) | Accepted | Font requests and OpenType face identities remain separate and use one semantic matcher |
| [0045](0045-hash-derived-private-runtime-font-family.md) | Accepted | Linked binaries paint and measure through a hash-derived private family |
| [0046](0046-source-authoritative-font-capture-profile.md) | Accepted | Exact-font evidence uses the real Fonts UI and guarded capture profile |
| [0047](0047-scale-mode-governs-image-transform-applicability.md) | Accepted | Scale mode governs whether a preserved image transform may affect placement |
| [0048](0048-crop-transform-is-slot-to-source-and-inverted-once.md) | Accepted | Figma CROP maps normalized slot to normalized source and is inverted exactly once for painting |
| [0049](0049-imported-media-and-replacement-media-have-separate-authority.md) | Accepted | Immutable imported placement and revisioned replacement Fill/Fit have separate authority |
| [0050](0050-exporter-mask-relations-are-canonical-source-authority.md) | Accepted | Exporter-declared node masks and sibling relationships are the only source-certified mask scope authority |
| [0051](0051-mask-input-paint-has-one-visual-owner.md) | Accepted | Mask-input paint is preserved but excluded from ordinary visible rendering |
| [0052](0052-opaque-rectangular-alpha-may-lower-to-exact-clip.md) | Accepted | A proven opaque rectangular ALPHA mask may lower to one exact CSS clip |
| [0053](0053-capability-routed-primitive-appearance-has-one-owner.md) | Accepted | Eligible primitive appearance has one capability-selected runtime owner |
| [0054](0054-single-opaque-solid-is-the-first-routed-paint-subset.md) | Accepted | Preserve ordered paints and route only the real-fixture-backed single opaque SOLID subset |
| [0055](0055-rectangular-inside-stroke-uses-non-layout-affecting-inset-geometry.md) | Accepted | Exact rectangular INSIDE strokes use non-layout-affecting inset geometry |
| [0056](0056-advanced-primitive-appearance-remains-fixture-gated.md) | Accepted | Advanced paint, corner, stroke, and gradient capabilities stay fixture-gated |
| [0057](0057-independent-corner-radii-use-edge-local-figma-clamping.md) | Accepted | Independent corners use source-certified edge-local Figma clamping |
| [0058](0058-stroke-path-bounds-remain-separate-from-layout-bounds.md) | Accepted | Stroke path and visual bounds remain separate from settlement layout bounds |
| [0059](0059-center-and-outside-rectangular-strokes-use-singular-svg.md) | Accepted | Eligible CENTER/OUTSIDE and independent-corner INSIDE strokes use one SVG appearance owner |
| [0060](0060-ancestor-clipping-remains-separate-from-primitive-stroke.md) | Accepted | Source ancestor clipping remains separate from primitive appearance overflow |
| [0061](0061-primitive-backend-selection-is-capability-based-and-singular.md) | Accepted | Primitive DOM/SVG/compatibility selection is semantic, capability-based, and singular |
| [0062](0062-linear-gradient-authority-requires-an-isolated-source-fixture.md) | Accepted | Linear-gradient authority remains compatibility-owned until an isolated real ZIP proves source mapping and pixels |
| [0063](0063-source-certified-linear-gradient-contract-and-singular-runtime-owner.md) | Accepted | Transfer the certified isolated linear-gradient subset through a versioned contract to one singular SVG owner |
| [0064](0064-figma-solid-paint-opacity-owns-exporter-alias-normalization.md) | Accepted | Figma paint opacity owns bounded exporter-0.6.0 mirrored SOLID alias normalization |
| [0065](0065-ordered-solid-stacks-require-one-svg-owner-and-one-primitive-clip.md) | Accepted | Eligible ordered SOLID stacks use one SVG owner and one primitive clip |
| [0066](0066-resolved-backend-decisions-centralize-existing-owner-selection.md) | Accepted | Every resolved node publishes one central decision over its existing family owners |
| [0067](0067-backend-diagnostics-project-existing-evidence.md) | Accepted | Capability-aware diagnostics project existing evidence without duplicating validation |
| [0068](0068-product-rollout-modes-remain-proposed.md) | Superseded | Historical internal Legacy, Semantic, and Compare activation evidence |
| [0069](0069-css-media-png-export-requires-revision-bound-raster-readiness.md) | Accepted | CSS-media PNG export requires a revision-bound browser-raster readiness pass |
| [0070](0070-operator-cohort-eligibility-and-rollback-authority.md) | Superseded | Historical operator-cohort eligibility and rollback evidence |
| [0071](0071-semantic-first-product-path-supersedes-rollout-governance.md) | Accepted | One semantic-first product path uses automatic capability fallback, Validate, and harness-only comparison |
| [0072](0072-source-certified-solid-linear-stacks-use-one-svg-owner.md) | Accepted | The exact SOLID-below-linear NORMAL pair uses one ordered SVG owner and shared primitive clip |
| [0073](0073-backend-disposition-separates-ownership-from-fallback.md) | Accepted | Ownership implementation and actual fidelity fallback are separate resolved dispositions |
| [0074](0074-exporter-061-canonical-solid-opacity-is-native-source-evidence.md) | Accepted | Clean exporter 0.6.1 canonical SOLID opacity is native resolved capability evidence without legacy repair provenance |
| [0075](0075-template-package-v2-field-semantics-and-canonical-content-authority.md) | Accepted | TemplatePackageV2 owns seven typed field semantics, exact import bindings, portable order, and one-way canonical content authority |
| [0076](0076-v2-field-content-reducer-and-materializer-are-single-core-authorities.md) | Accepted | One immutable Core reducer and one-way materializer own deterministic V2 field content semantics |
| [0077](0077-v2-browser-session-persists-only-canonical-field-authority.md) | Accepted | V2 Browser, persistence, reimport, Family, and React lifecycles retain one canonical field-content authority |
| [0078](0078-boolean-visibility-is-structural-participation-with-generation-safe-publication.md) | Accepted | Visibility is shared structural participation and async publication also requires a monotonic generation |
| [0079](0079-family-image-framing-is-shared-content-with-sparse-variant-placement.md) | Accepted | Family Images share one asset/default placement and use sparse variant-only placement overrides |
| [0080](0080-textarea-visual-lines-come-from-the-current-painted-text-layout.md) | Accepted | Current visible DOM text line boxes are the sole renderer-backed Textarea line authority |
| [0081](0081-studio-and-custom-hosts-share-v2-configuration-and-content-authority.md) | Accepted | Studio and custom hosts share V2 configuration and content authority |
| [0082](0082-boolean-fields-may-control-multiple-structural-targets.md) | Accepted | One Boolean may control multiple structural targets while nested editor controls follow participation |
| [0083](0083-type-qualified-field-identity-and-shared-boolean-controls.md) | Accepted | Schema 2.1 uses type-qualified field IDs and compatible repeated Booleans share one control |
| [0091](0091-cover-mixed-image-gradient-owner.md) | Accepted | Bounded source-indexed Cover IMAGE/DARKEN-gradient visual ownership |
| [0092](0092-observational-mask-settlement-delegates-existing-authority.md) | Accepted, observational only | Mask settlement delegates current canonical authority and retains complete dependency identity |
| [0093](0093-mounted-text-input-validity-and-current-publication.md) | Accepted, bounded lifecycle | Mounted intrinsic-input reuse remains separate from current publication and settlement |

The [Phase 7 paint/stroke completion audit](../PHASE_7_PAINT_STROKE_COMPLETION_AUDIT.md) remains a historical Result B sequencing record. The later ordered-SOLID intake closes its bounded source gate through Accepted ADR 0064, and Milestone 7.4 implements its singular owner under Accepted ADR 0065. Reference promotion remains separate.

Use [TEMPLATE.md](TEMPLATE.md) for new records. Evidence must distinguish current code, automated coverage, browser verification, and intended architecture.

| [0094](0094-fresh-text-measurement-before-paint.md) | Accepted, bounded lifecycle | Fresh current text measurement before paint and isolation from application transitions |
