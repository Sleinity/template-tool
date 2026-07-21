# Current Renderer Architecture Map

This map describes the repository as audited through 2026-07-20. Paths are code evidence, not intended future boundaries.

## Modules and ownership

| Stage | Primary modules | Owned data / responsibility |
| --- | --- | --- |
| ZIP index and bytes | `src/template-package/bundle/loadTemplatePackageBundle.ts`, `zipBundleReader.ts`, `zipReader.ts` | Required/optional file index and raw bytes |
| Source-contract parse | `sourceContract.ts`, `loadTemplatePackageBundleSource.ts` | Loose exporter contract, raw JSON, source diagnostics |
| Normalization | `normalizeTemplatePackageBundle.ts`, `assetManifestAdapter.ts` | Compatibility rewrite, canonical-shaped JSON, normalization diagnostics, preserved extensions |
| Strict validation | `parseTemplatePackage.ts`, `validateTemplatePackage.ts`, `schema/template-package-v1.schema.json` | Validated `TemplatePackageV1` or errors |
| Motion linking | `motion/packageMotion.ts` | Canonical motion and node-link diagnostics |
| Asset ingestion | `bundle/bundleAssetIngestion.ts`, `assets/*` | Managed asset records, content-addressed identity, runtime asset URLs |
| Font resolution | `fonts/*`, `server/font-resolution/*` | Font requirements, managed faces, readiness/fallback state |
| Optional enrichment | `import/runTemplatePackageImportPipeline.ts`, `enrichment/*`, `server/figma-enrichment/*` | Cached Figma metadata, renderer hints, comparison diagnostics |
| Persistence | `persistence/*`, `editor/packageEditorSession.ts` | `basePackage`, `workingPackage`, assets, preview hash, drafts |
| Canonical scene contract | `scene/*`, `scripts/scene-graph/*` | Pure `CanonicalSceneGraphV1`, authority/mapping/migration registries, validation and equivalence; Milestone 4 core routing is its first bounded runtime consumer |
| Core layout runtime authority | `runtime-routing/*` | Capability route, six-state property ownership, intrinsic text measurement publication, pure core settlement, coherent fallback, readiness telemetry |
| Appearance contract preparation | `appearance-contracts/*`, `scripts/appearance-contracts/*` | Pure observational appearance projections, source sufficiency, backend requirements; no renderer import |
| Mask source and relationship authority | `masks/packageMaskRelationships.ts`, canonical/resolved mask projections | Strict source relationship validation, capability selection, revisions, clip derivation, explicit fallback |
| Primitive appearance authority | `primitives/*`, `ResolvedRenderNode.primitiveAppearance` | Ordered paint/stroke intent, source/settled/path geometry, independent corners, clipping chain, revisions, and one capability-selected DOM/CSS or SVG owner |
| Linear-gradient authority | `bundle/normalizeTemplatePackageBundle.ts`, `primitives/linearGradient.ts`, `TemplatePackageRenderer.tsx` | Source-indexed canonical hydration/provenance, one-inverse normalized geometry, bounds-derived SVG transform, stop/paint opacity, revision guard, and singular SVG owner for the certified subset |
| Ordered-SOLID authority | `bundle/normalizeTemplatePackageBundle.ts`, `primitives/resolvePrimitiveAppearance.ts`, `TemplatePackageRenderer.tsx` | Apply-once SOLID opacity provenance, `ResolvedOrderedSolidStackV1`, current bounds/corners, ascending source-index layers, and one SVG group/shared clip for the certified subset |
| Ordered SOLID + linear authority | `primitives/resolvePrimitiveAppearance.ts`, `primitives/linearGradient.ts`, `backend-decision/*`, `TemplatePackageRenderer.tsx` | `ResolvedOrderedNormalPaintStackV1`, certified SOLID then `GRADIENT_LINEAR` source order, one shared primitive clip, one SVG owner, current bounds, immutable gradient-source revision, and explicit whole-node fallback outside the two-layer subset |
| Backend orchestration | `backend-decision/*`, `ResolvedRenderNode.backendDecision` | One versioned node/subtree decision over existing layout, DOM/CSS, SVG, media, vector, mask, compatibility, fallback, and unsupported owners |
| Internal rollout activation | `renderer-rollout/*`, `RendererRolloutProvider`, `TemplatePackageRenderer.tsx` | Persisted `legacy`/`semantic`/`compare` preference, safe current-default fallback, one mode decision over backend activation, rollback, and non-blocking compare evidence |
| Stage 1 operator cohort | `renderer-rollout/cohort/*`, `RendererRolloutCohortProvider`, internal admin disclosure | Content-addressed eligibility, explicit local observation, manual decision/approval, expiry/invalidation, incident history, and immediate Legacy rollback; never source/package authority |
| Resolved semantics | `resolved/createResolvedRenderTree.ts`, `resolved/types.ts` | `ResolvedRenderTreeV1`, nodes, assets, field targets, motion links, warnings and fidelity diagnostics |
| Runtime layout compatibility | `render/packageConstraintLayout.ts`, `packageTransformLayout.ts`, `packageClipping.ts`, `packageStrokeLayout.ts`, `packageTextLayout.ts`, `packageLayoutModel.ts` | Raw/canonical interpretation into CSS-compatible models |
| Renderer | `render/TemplatePackageRenderer.tsx` | DOM/SVG/CSS output, editor/static modes, motion application, HUG measurement, overlays |
| Preview shells | `render/TemplateInspectionPreview.tsx`, `ScaledTemplatePackagePreview.tsx` | Fit/zoom/highlight and scaled live rendering |
| Diagnostics | `backend-decision/createDiagnosticProjection.ts`, `packageDiagnostics.ts`, `quality/*`, `analysis/*`, `debug/*`, `bundle/layeredSourceDiagnostics.ts` | Source, renderer, layout, capability/backend, user-facing quality, and analysis reports with capability/region grouping |
| Export | `export/packageExportReadiness.ts`, `export/pngExport.ts`, `enrichment/captureTemplatePackagePreview.ts` | Validation/font/asset readiness, image decode, DOM capture, PNG download |
| Visual comparison | `enrichment/TemplatePackageVisualDiff.tsx`, `visualDiff.ts`, `comparePackageToFigmaMetadata.ts` | Live static render beside reference and structural difference metrics |

## Current authority by lifecycle

1. **After ZIP import:** the final validated `TemplatePackageV1` returned by `runTemplatePackageImportPipeline`; after save, `workingPackage` is the editable authority and `basePackage` is the imported baseline.
2. **For semantic rendering:** `ResolvedRenderTreeV1` remains the visual/content compatibility projection. `CanonicalSceneGraphV1` now feeds a bounded core layout route.
3. **For routed core geometry:** `CoreLayoutSettlementV1` owns supported live-surface x/y/width/height, Auto Layout, HUG/FILL propagation, image slots, and rectangular clip bounds. Browser text data is intrinsic input only.
4. **For compatibility pixels:** existing resolved/raw-Figma/DOM/CSS helpers retain whole-subtree appearance and unsupported-geometry authority. Fields/Validate keep static appearance but apply eligible routed core geometry.
5. **For PNG export:** the hidden editor renderer uses the same content-derived settlement revision/identity as the visible editor and is captured only after routed settlement readiness.
6. **For the source-certified ALPHA subset:** exporter `node.mask` and `maskRelationships` own classification/scope, the current mask revision owns derived clip geometry, and source paint has no ordinary DOM/SVG owner. All other masks remain compatibility-owned.
7. **For the Milestones 7.1–7.2 primitive subset:** canonical geometry/appearance semantics feed `PrimitiveAppearanceV1`; current settled bounds own uniform/independent effective radii and INSIDE/CENTER/OUTSIDE stroke-path geometry; the capability selects one DOM/CSS or SVG owner and disables duplicate compatibility output. Unsupported properties keep the complete primitive compatibility-owned.
8. **For the Milestone 7.3A linear-gradient subset:** same-index raw/canonical paint evidence owns strict stops and transform provenance; `ResolvedLinearGradientGeometryV1` owns the one-inverse normalized geometry and live-bounds SVG transform; one SVG path owns pixels. Stale resolved source revisions are recomputed from current canonical input.
9. **For the Milestone 7.4 ordered-SOLID subset:** the canonical fill array plus current `solid-paint-source-v1` evidence owns paint identity/order/opacity; `ResolvedOrderedSolidStackV1` owns the current stack and geometry revisions; one SVG group/shared clip paints source index 0 backmost. Any unsupported dependency keeps the whole primitive compatibility-owned.
10. **For the bounded ordered SOLID + linear subset:** canonical paint order and the existing certified SOLID/linear source contracts feed `ResolvedOrderedNormalPaintStackV1`; one SVG group and shared clip paint the SOLID at source index 0 and linear gradient at source index 1. `ResolvedBackendDecisionV1` selects `ordered-normal-paint-svg`; no compatibility paint is emitted for that node.
11. **For backend selection:** family contracts remain semantic evidence, while `ResolvedBackendDecisionV1` is the central node-level orchestration record consumed by renderer owner gates. `ResolvedRenderTreeV1.backendDecisionRevision` binds the complete set.
12. **For capability diagnostics:** `ResolvedBackendDiagnosticProjectionV1` classifies existing warnings/fallbacks and supplies capability/region groups; the quality workspace owns calm user presentation and technical expansion.
13. **For internal rollout activation (historical):** `ResolvedRendererRolloutDecisionV1` formerly wrapped backend decisions. ADR 0071 supersedes this product behavior; rollout metadata is inert and production now consumes unfiltered backend decisions.
14. **For Stage 1 operator rollout (historical):** the content-addressed cohort records remain auditable evidence only. ADR 0071 makes them inert product metadata; they cannot select rendering.

No single shared instance yet contains every post-measurement value for every surface and visual family. This is why ADR 0010 remains Proposed.

Milestone 2 did not close this gap. It created a deterministic pre-measurement semantic contract and documented which browser/runtime values must enter a later settled result.

## Transformation boundaries

- Raw Figma/exporter values become canonical semantics mainly in `normalizeTemplatePackageBundle.ts` and enrichment helpers.
- Some raw Figma values remain in `node.extensions.figma` and become runtime semantics in constraint, transform, clipping, stroke, text, and image helpers.
- Canonical/resolved semantics become DOM/SVG/CSS in `TemplatePackageRenderer.tsx`, `packageVectorRender.ts`, and the compatibility helpers.
- Browser-measured values include rendered text line rectangles/cap height, element/viewport dimensions through `ResizeObserver`, `document.fonts` readiness, computed styles, and intrinsic image decode state.
- For source-certified static CROP, the raw affine matrix maps normalized node/slot coordinates to normalized source coordinates. The placement resolver inverts it once into intrinsic-source-pixel to slot-pixel CSS geometry, and the renderer clips the single image layer at the current slot. The browser supplies sampling only; it does not feed crop geometry back into authority.
- Imported media intent and editor replacement authority are separate. `node.image.scaleMode/imageTransform` retain Figma source semantics; optional `node.image.activePlacement` records `imported-source`, `replacement-fill`, `replacement-fit`, or reserved `editor-crop` plus a monotonic revision. Canonical scene, resolved tree, routing identity, renderer telemetry, persistence, and PNG metadata carry that state. Per-field async operation revisions prevent stale file/decode results from republishing after a newer replacement or reset.
- Exported mask declarations remain raw canonical package data. `resolvePackageMaskRelationships` validates source/parent/range/order, classifies the supported opaque rectangular ALPHA subset, and derives affected-node clip insets. Scene and resolved projections retain provenance and source references; renderer publication checks the mask revision and recomputes stale supplied trees.
- The exact mask source remains in semantic node order but is absent from ordinary visible DOM. Its SOLID paint is `mask-input`; the affected sibling is painted once and clipped once. This does not activate a general mask or paint-stack backend.
- Primitive appearance retains source/settled bounds, transform and clipping evidence, raw/effective radii, ordered paint/stroke entries, separate opacity layers, backend/capability/fallback, and source/geometry/paint/stroke revisions. Browser bounds are evidence, not template-space authority.
- The primitive route additionally supports one isolated source-certified `GRADIENT_LINEAR` on an eligible rectangular FRAME/RECTANGLE, including pure node rotation and independent corners. A separate bounded owner supports exactly one certified SOLID followed by one certified `GRADIENT_LINEAR`, with NORMAL blending and node opacity 1. Reversed, longer, IMAGE-containing, non-NORMAL, and other mixed stacks remain outside the route.
- The route also supports eligible two-or-more SOLID NORMAL stacks. It preserves hidden entries without pixels, applies canonical alpha × paint opacity once, and disables compatibility paint output for the singular SVG owner. Mixed paint types outside the exact SOLID-then-linear subset and node opacity below 1 remain outside the route.
- Milestone 3 still normalizes full DOM observations into `SettledSceneGraphV1` as independent evidence. Milestones 4–5 publish intrinsic text metrics into surface-local `CoreLayoutSettlementV1` instances; final DOM bounds are not routed semantic inputs. Inspection-only overlay alignment reads target boxes without entering export or settlement.

## Dynamic recalculation

- Edits clone and update `workingPackage`, then recreate `ResolvedRenderTreeV1` with `useMemo`.
- Routed production edits publish against a content/font revision; stale intrinsic measurements cannot enter the current settlement.
- Supported Flex/HUG/FILL geometry recalculates in the core solver; compatibility subtrees still use browser layout.
- HUG text remeasures on layout, resize, and font loading; routed metrics feed settlement while compatibility text keeps the local behavior.
- Source `CAP_HEIGHT` text publishes exact/approved face ascent, descent, cap, calibrated baseline, line, glyph, and semantic-box evidence. Settlement consumes the cap-to-final-baseline height; unverified metrics select a coherent compatibility route.
- CAP_HEIGHT painting uses a semantic-content wrapper plus an inner browser line-box span. The inner translation is revision-tagged negative first-cap-top; HUG always starts the wrapper at the node origin, and fixed-height vertical alignment positions the wrapper without changing glyph origin.
- Field-fit diagnostics independently remeasure text on package, resize, and font changes.
- Image backgrounds and `<img>` layers size against the current slot, so cover/contain/crop CSS recalculates as surrounding layout changes.
- Motion transforms are evaluated from current time and applied during rendering.

## Readiness

Current export readiness means strict package validation has no errors; assets are safe/resolvable and decoded; field constraints do not block; required fonts are loaded or an approved fallback is recorded; and any routed settlement is current, ready, and stable for two frames. This is not yet one globally shared settlement instance across live surfaces.

## Persistence and enrichment boundaries

- Saved templates retain `basePackage`, `workingPackage`, ZIP/source metadata, managed asset references, and an optional persisted preview hash.
- Dashboard cards use persisted preview URLs, not a live renderer.
- Figma enrichment runs only during the import pipeline when a Figma URL/provider is available. Failures are warnings; the normalized ZIP remains usable.
- No renderer-time Figma API call was found.

## Known compatibility adapters

- Loose source contract and bundle normalization.
- Asset-manifest and asset-reference adapters.
- Raw `extensions.figma` sizing, constraints, transforms, clipping/mask, stroke, text, and image interpretations.
- Legacy simple text payload support alongside canonical detailed text.
- Renderer hints and bundled MCP design hints.
- Bounds-first static mode versus dynamic editor mode.

## Divergence risks

- Compatibility-owned inspection appearance can still differ from editor/export even though eligible core geometry converges.
- The visual-diff renderer is static; PNG export is editor mode.
- Resolved-tree creation is repeated in previews/readiness/capture and may not represent the same moment as the mounted DOM.
- HUG height and field-fit measurements are separate browser algorithms.
- Vertical trim now separates layout, browser-line, Figma-trim, glyph-paint, glyph-origin, clip, and inspection bounds, but advanced mixed runs and cross-platform metric equivalence remain compatibility/evidence gaps.
- Renderer helpers may override or supplement resolved values from raw Figma metadata.
- Dashboard thumbnails can be older persisted images.
- Debug/highlight props are renderer capabilities; export avoids them by call-site convention rather than a distinct export-only component.

## Managed font identity boundary

`fontRequirements` remain the source request. Upload/fetch reads each OpenType/TTC face into `CanonicalFontFaceV1`; the shared matcher classifies request-to-face semantics. IndexedDB stores one blob by full hash, one managed record by hash plus face index, and a request mapping with classification/private family. `workingPackage` persists the selected asset and resolution history. `prepareTemplatePackageFonts` verifies the mapped hash, creates a blob URL, and registers the binary under a hash-derived private family. `ResolvedRenderTreeV1`, normalized runs, browser measurement, Fields/Validate/editor, and hidden PNG consume that private family while retaining the requested human family as evidence.

This closes the former candidate-versus-final-validation duplication. Browser availability remains only supporting evidence; the linked hash/face/private family and current measurement revision own exact status. See [font identity](FONT_IDENTITY.md).
