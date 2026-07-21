# Source-Certified Mask Authority

Milestone 7 activates one deliberately narrow mask route. It does not introduce a general mask engine, SVG mask backend, Canvas, effects, compositing, or heuristic sibling inference.

## Authoritative source

The exact source fixture is `template-package-deal-of-the-week-banner-crop-3.zip`, 2,265,128 bytes, SHA-256 `017204b839e4269174c822daeb3799eb7ebf8c5e8d955d47723ab7a7e498e689`. Its `template.json` SHA-256 is `ba35a165d57866e92f019e36dccb2d8141d3a0eedf10a644b000b47fe69291cc`; embedded `preview.png` SHA-256 is `f0a63ae176ad046f051763107af5b3b4665b4258435169fd8f2e422f73622d0a`.

The exporter declares:

- parent `429:40` with ordered children `429:41`, `429:42`;
- source `429:41`, `mask.isMask=true`, `mask.maskType=ALPHA`;
- affected sibling `429:42`;
- `maskRelationships[0]` with termination `end_of_siblings`.

`mask.isMask === true` is the active classifier. `maskType` on `isMask:false` nodes is preserved but never activates masking. Older extension-only packages remain compatibility evidence and do not acquire inferred scopes.

## Strict and derived contracts

`TemplatePackageV1` now optionally preserves node `mask` and package `maskRelationships`. Strict schema validation covers field shape; semantic validation covers source/parent/affected existence, same-parent scope, child membership, monotonic sibling order, self/duplicate source/affected ownership, non-empty scope, and active sources lacking a relationship. Raw exporter declarations remain separate from the validated derived resolution.

`CanonicalSceneGraphV1.maskRelationships` retains raw provenance, status, capability, paint role, source order, and deterministic mask revision. `ResolvedRenderTreeV1.maskRelationships` publishes render strategy, mask bounds, affected nodes, and clip insets. A stale supplied resolved mask revision is rejected and recomputed from the current package before rendering.

## Certified exact subset

The current source is a RECTANGLE with one visible fully opaque SOLID fill, node opacity 1, no strokes or effects, zero radii, PASS_THROUGH/NORMAL blend behavior, and identity linear transform. Therefore its binary ALPHA region is mathematically equivalent to a rectangular clip.

The renderer lowers this case to one `clip-path: inset(...)` on only the declared affected sibling. For the canonical source bounds, `429:42` has `{x:220,y:-164,width:640,height:1408}` and the clip is `{top:164,right:0,bottom:164,left:0}` in affected-node coordinates. Raw Figma translation `-164.0001220703125` remains provenance; normalized canonical geometry owns runtime placement.

This remains classified as `exact-opaque-rectangular-alpha`, not generic `clipsContent`. The source node stays in scene/resolved ordering but has no ordinary visible DOM/CSS/SVG owner. Its fill is `mask-input`; affected content is rendered once.

## Compatibility boundary

LUMINANCE, vector/nested masks, partial alpha, image/gradient/effect mask paints, nonzero radii, unsupported transforms, disjoint geometry, invalid relationships, and unsupported termination remain explicit compatibility/unsupported results. They preserve source data, suppress active mask-source RGB, and do not approximate partial alpha as a hard clip. ADR 0012 remains Proposed.

## Surface, persistence, and evidence

Validate, Fields, editor, and hidden PNG export publish the same relationship ID, mask revision, source ID, capability, clip insets, and template-space geometry. The headless two-pass run `milestone-7-alpha-mask-source-certified` is exact and stable on all four surfaces. PNG export differs from the embedded preview by 2,262 pixels (`0.1090856481%`); the left 1080×1080 mask region differs by 1,461 pixels (`0.1252572016%`). The diff is edge/raster noise, not a mask-boundary or paint-ownership error. In visible Chromium the same geometry/identity is stable, while repeated PNG raster output differs by 21 pixels (`0.0010127315%`) in the top image region; that profile is not claimed pixel-deterministic.

`mask:browser-scenarios` saves, reloads, blocks the Figma enrichment endpoint, and verifies identical mask identity with zero renderer-time Figma requests. Evidence lives under `fidelity/evidence/milestone-7-alpha-mask/`. References remain unapproved and unchanged.

## Commands

```text
pnpm fidelity:baseline -- --fixture deal-of-the-week-banner-crop-mask --repeat 2
pnpm mask:source-evidence -- --run-id <candidate-run>
pnpm mask:browser-scenarios -- --run-id <scenario-run>
pnpm scene:compare -- --fixture deal-of-the-week-banner-crop-mask
pnpm appearance:baseline -- --fixture deal-of-the-week-banner-crop-mask
```
