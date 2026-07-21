# Image Placement Authority

Milestone 6 introduces one versioned resolved image-placement contract without introducing Canvas, an offscreen renderer, or a new settled graph. It separates immutable source intent from slot-dependent geometry and keeps unsupported or ambiguous cases explicit.

## Source-to-pixel order

1. `workingPackage` owns immutable imported asset/`scaleMode`/`imageTransform` intent plus optional revisioned `image.activePlacement` editor authority.
2. `ResolvedImagePlacementIntentV1` records fit mode, focal point, normalized source transform, transform applicability, coordinate space, clipping, sampling, and any compatibility fallback.
3. `CoreLayoutSettlementV1` owns the current slot bounds when the surrounding subtree is routed; compatibility layout owns the complete slot otherwise.
4. `resolveImagePlacementGeometry` combines the current slot and intrinsic asset size into a destination rectangle, visible source rectangle/polygon, crop percentages, scale, rotation, and aspect-ratio result.
5. The DOM renderer uses native background cover/contain/stretch/tile sampling or one affine `<img>` transform for an eligible `CROP`.
6. Slot clipping and border radius apply after image placement. Parent node transforms remain outside local image placement.
7. The hidden editor-mode PNG renderer consumes the same resolved intent and current routed slot as editor, Fields, and Validate.
8. PNG capture verifies current media decode and revision evidence, then uses the ADR 0069 revision-bound foreignObject raster boundary for CSS-background media before retaining the export raster.

No step reads template, fixture, node name, or node ID.

## Coordinate spaces and source semantics

`imageTransform` is preserved as a normalized node-to-normalized-source affine transform. Per the [Figma ImagePaint contract](https://developers.figma.com/docs/plugins/api/Paint/), that property is applicable to `CROP`; `FILL`, `FIT`, and `TILE` do not acquire a second crop merely because an exporter retained a matrix.

The operation order is asset selection → replacement policy → fit mode → focal/crop transform → current slot placement → rectangular clip/radius → parent transform → browser sampling. `STRETCH` is the only mode permitted to distort aspect ratio.

For centered `FILL`, with slot `Ws × Hs` and intrinsic source `Wi × Hi`:

`scale = max(Ws / Wi, Hs / Hi)`

The destination is `Wi × scale` by `Hi × scale`, centered or aligned by the explicit focal point. The visible source rectangle is the inverse intersection of that destination with the slot. Resizing the slot recomputes destination and visible source geometry; it does not mutate source intent.

For `CROP`, the source transform maps the four normalized slot corners into a visible source polygon. Its affine inverse is converted once into source-pixel-to-slot-pixel CSS coordinates. The intrinsic bitmap is painted once through that matrix and clipped by the slot. Singular or missing transforms select a diagnosed cover fallback.

## Now-hiring trace and first divergence

- Exact ZIP: `template-package-now-hiring-post.zip`, SHA-256 `14f895cbba1919cc39175e276fb34d7e3f4a92354c2085fe67656365246b906b`.
- Node: `387:336`; source slot 960×950; routed current slot approximately 960×949.188 after exact text settlement.
- Asset: `asset:image:ceab5479`; 1125×750.
- Source mode: `FILL`.
- Preserved matrix: `[[0.4816223084926605,0,0.25918886065483093],[0,1,0]]`.
- The prior first divergence was `createResolvedRenderTree.resolveImage`: it derived focal/zoom from that CROP-only matrix despite `FILL`. The renderer then applied `background-size: auto 139.8781%`, adding a second crop.
- Current authority preserves the matrix with `transformApplicability=preserved-inapplicable` and uses one native centered cover operation.
- At the source 960×950 slot, destination geometry is x=-232.5, y=0, width=1425, height=950. The visible normalized source rectangle is x=0.1631579, y=0, width=0.6736842, height=1.
- Current exact browser evidence reports approximately 16.287% left/right crop because the routed slot is 949.188 px high. Validate, Fields, editor, and PNG agree within subpixel surface scaling.

The independently sampled embedded preview selected approximately source x=184 through x=941, matching centered cover rather than the preserved matrix crop.

## Imported and replacement authority

The exact editable fixture proves fixed and dynamic FILL follow the same source rule: `imageTransform` is CROP-only. The temporary `compatibility-legacy-fill-transform` path is retired. Every imported FILL performs one cover operation and every imported FIT performs one contain operation; retained matrices remain `preserved-inapplicable` provenance.

`image.activePlacement` keeps editor replacement state separate from imported intent. `imported-source` selects the immutable source CROP/FIT/FILL semantics. `replacement-fill` selects cover; `replacement-fit` selects contain. Both replacement states ignore imported transform/focal/zoom/rotation and increment `placementRevision` on upload, switch, or reset. `editor-crop` is reserved and deliberately falls back because the future crop tool must own new editor-authored data.

Reset restores the imported asset and exact source mode/transform while issuing a new revision. Save/reload persists active state. A per-field asynchronous operation revision prevents older file reads or intrinsic-dimension decodes from publishing after a later replacement or reset.

## Telemetry

Renderer and fidelity reports expose:

- placement schema, scale mode, render mode, crop mode, and transform applicability;
- active placement state and placement revision;
- intrinsic asset dimensions and actual measured slot bounds;
- coordinate space and browser-native sampling backend;
- destination bounds, normalized/pixel visible source rectangle, visible source polygon, crop percentages, scale, and aspect-ratio preservation;
- compatibility zoom/axis and fallback reason where applicable.

Comparison-critical telemetry is rounded by the harness. It is developer evidence only and never exported as visible template content.

PNG evidence additionally records source URL as runtime telemetry only, intrinsic/decode state, hidden-target paintability, backend and settlement identity, object-URL creation/revocation events, and whether the current media revision required its browser-raster warmup. Raw object URLs never participate in semantic revision identity. The application asset cache owns the stable URL for the page lifetime; capture creates no URL and retains no image or URL after its readiness check.

## Current limits

- `deal-of-the-week-banner-crop-editable` source-certifies imported CROP/FIT/FILL and editor replacement Fill/Fit/reset/persistence/stale-work behavior. The CROP region differs from `preview.png` by 0.1992% at threshold 0.1. See [editable image evidence](IMAGE_REPLACEMENT_EVIDENCE.md).
- A second reviewed source resize state is intentionally not required by the corrected Milestone 6.1 scope. Source-defined interactive crop resizing remains future crop-tool work.
- TILE, explicit object-position replacement editing, image adjustments, alpha/luminance/vector masks, nested masks, and transformed mask chains remain partial or unsupported.
- Sampling uses browser-native image interpolation. No evidence currently justifies a custom resampler or Canvas backend.
- Rounded rectangular slot clipping is inherited from the existing renderer. True Figma mask-chain semantics are not claimed.
