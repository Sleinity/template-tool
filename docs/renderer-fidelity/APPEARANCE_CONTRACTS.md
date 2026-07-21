# Appearance Contracts and Backend Requirements

## Milestones 7 and 7.1 runtime exceptions

The broad projections remain observational. Narrow production exceptions are the source-certified mask subset, primitive subset, isolated linear-gradient subset, ordered-SOLID subset, and exact two-layer SOLID-then-linear NORMAL subset. These do not migrate general mixed fills, other gradients, effects, blend/compositing, or Canvas; ADR 0012 remains Proposed.

Milestones 7.1–7.2 add the independently bounded [primitive appearance contract](PRIMITIVE_PAINTS.md) and [stroke geometry contract](PRIMITIVE_STROKE_GEOMETRY.md). `PrimitiveAppearanceV1` is a resolved runtime projection only for source-certified axis-aligned rectangles/frames with zero/one opaque ordinary SOLID, uniform or independent edge-clamped corners, and zero/one opaque rectangular INSIDE/CENTER/OUTSIDE SOLID stroke. The broad `GeometryShapeV1`, `PaintStackV1`, and `StrokeStackV1` remain observational; their advanced cases are not promoted wholesale.

Milestone 7.3A adds a production exception only for the [source-certified isolated linear-gradient subset](LINEAR_GRADIENT_RUNTIME_AUTHORITY.md). Source normalization pairs same-index canonical/raw evidence; `ResolvedLinearGradientGeometryV1` and one SVG primitive own eligible pixels. `PaintStackV1` remains observational and layered gradient sources stay compatibility-owned. Accepted ADR 0063 governs the bounded route.

The fidelity packets for package `pkg_459_67_1784615329455` establish one further bounded exception: exactly one certified SOLID at source index 0 followed by one certified `GRADIENT_LINEAR` at source index 1, both visible and NORMAL on an otherwise eligible primitive. `ResolvedOrderedNormalPaintStackV1` reuses the existing family contracts and selects one SVG group/shared clip. This is not general mixed-stack authority; see [the runtime contract](ORDERED_SOLID_LINEAR_RUNTIME_AUTHORITY.md) and Accepted ADR 0072.

The later [adventure-travel intake](LINEAR_GRADIENT_INTAKE_EVIDENCE.md) repeats that canonical/raw split and supplies one independently exported vertical SVG gradient. The raw matrix and SVG handles agree after one inverse, but the SVG asset itself owns those pixels. This is observational corroboration, not a runtime exception or backend decision.

The [gradient-test intake](LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md) closes matrix direction, handles, stops/alpha, paint opacity, non-square/diagonal geometry, independent corners, controlled resize, and node-transform order. Runtime evidence additionally proves SVG ownership and cross-surface identity; it does not make broad `PaintStackV1` render-authoritative.

Milestone 5 adds observational contracts derived from `CanonicalSceneGraphV1`. They are backend-neutral, deterministic, browser-free, and never imported by the renderer.

| Contract | Preserved authority | Deliberate unresolved state |
| --- | --- | --- |
| `MediaPlacementV1` | asset, slot, intrinsic size, fit, transform, focal, active replacement state/revision, adjustments | unsupported TILE/adjustment/editor-crop rendering |
| `GeometryShapeV1` | type, bounds, path/shape evidence, radii, smoothing, arc/polygon/star data | tessellation/backend |
| `PaintStackV1` | paint order, type, stops, transforms, opacity, blend evidence | compositing implementation |
| `StrokeStackV1` | stroke order, paint, weight, alignment, raw dash/cap/join evidence | expansion and raster rules |
| `MaskGraphV1` | source parent/order, mask type, clip, nesting evidence | masked sibling range |
| `EffectStackV1` | effect order and values | bounds expansion and filter backend |
| `CompositingGroupV1` | opacity, blend, visibility, child order, isolation evidence | offscreen requirement |

Every record contains source paths, raw Figma keys, and confidence. `AppearanceContractProjectionV1` also includes per-family source sufficiency and a replaceable backend requirement matrix. Validation rejects unknown nodes and reordered paint/effect indices.

Current backend conclusions:

- DOM/SVG/CSS remains preferred for proven image placement and semantic shape/vector work.
- Real-ZIP evidence proves one affine DOM image plus rectangular clip is sufficient for rotated/non-centred imported CROP. The editable revision proves per-node FILL/CROP/FIT and revisioned replacement Fill/Fit/reset without Canvas. This does not accept ADR 0012 or authorize interactive crop.
- True masks remain unresolved until sibling ranges and nested source semantics are available.
- Effects/compositing retain no selected future backend. Canvas 2D and WebGL are candidates, not decisions.
- Raster fallback is valid only when explicitly sourced or reviewed; the contracts do not manufacture it.

`pnpm appearance:baseline` imports each exact registered ZIP twice, creates the projection twice, validates it, and fails on nondeterminism. Outputs are candidates under `fidelity/appearance-contracts/candidates`; no approved-reference update command exists in Milestone 5.
