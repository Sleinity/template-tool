# Ordered SOLID Stack Runtime Authority

Status: source-certified and implemented for the bounded eligible subset  
Gate closed: 2026-07-19  
Runtime transfer completed: 2026-07-19  
Roadmap: Phase 7 — Paint/stroke; Milestone C — Appearance fidelity

## Certified source contract

The bounded source family now establishes:

- `appearance.fills[]` is evaluated back-to-front: index 0 is backmost and increasing indices move forward;
- visible `NORMAL` SOLIDs use repeated source-over composition;
- hidden entries remain preserved at their source indices and contribute no pixels;
- node opacity is a later operation and remains outside the first runtime transfer;
- Figma `SolidPaint.color` is RGB without alpha, while `SolidPaint.opacity` owns SOLID transparency;
- exporter 0.6.0's equal serialized `color.a` / `paint.opacity` pair is one compatibility alias when the strict predicate below succeeds;
- all fills belong to one primitive geometry and share its uniform or four independent corners;
- corner normalization reuses the accepted edge-local rectangular rule and never affects layout bounds.

Official source-contract basis: [Figma Paint API](https://developers.figma.com/docs/plugins/api/Paint/), [RGB/RGBA contract](https://developers.figma.com/docs/plugins/api/RGB/), and [`figma.util.solidPaint`](https://developers.figma.com/docs/plugins/api/properties/figma-util-solidpaint/).

## Canonical opacity provenance

`PackageSolidPaint.solidPaintSource` is a strict `solid-paint-source-v1` record. Source normalization applies the compatibility rule only when all of these are true:

1. package source type is `figma` and `pluginVersion` is exactly `0.6.0`;
2. the source paint is canonical `SOLID`;
3. no same-index raw Figma paint is available;
4. serialized `color.a` and `paint.opacity` are finite and within `[0,1]`;
5. their absolute difference is at most `1e-6`.

For that bounded case, canonical RGB is unchanged, canonical color alpha becomes 1, canonical paint opacity remains the serialized paint opacity, and `effectiveOpacity` equals paint opacity exactly once. The record preserves both serialized values, paths, source index, affected exporter identity, tolerance, source-contract basis, normalization revision, effective rule, confidence, and conflicts.

Same-index raw Figma `SOLID` evidence, when present and valid, owns paint opacity directly and remains preserved under `extensions.figma.rawFills`. Differing values, invalid raw opacity, raw type conflicts, unaffected exporter versions, non-finite values, and out-of-range values never acquire mirrored-alias authority. Differing affected-exporter values remain unchanged with `ambiguous-independent-values`, `effectiveOpacity:null`, and an explicit conflict.

The canonical scene and resolved/primitive source clones retain `solidPaintSource`. This milestone does not make those observational values a general live stack owner.

## Production eligibility

The runtime selects an ordered SOLID stack only when:

- the node is an eligible axis-aligned FRAME or RECTANGLE;
- every paint is `SOLID`, uses `NORMAL`, and retains a source index;
- each contributing paint has unambiguous `solid-paint-source-v1` opacity authority;
- hidden paints are preserved but skipped without reordering;
- node opacity is 1;
- geometry uses the already accepted uniform or independent edge-local corner model;
- there is no stroke, mask input, effect, media/vector owner, transform outside the accepted rectangle subset, or unsupported compositing input.

Any unsupported layer selects coherent whole-primitive compatibility. Partial routing, first-paint routing under an authoritative stack, and duplicate CSS/SVG ownership are forbidden.

## Evaluation and singular geometry

The resolver retains the ordered entries and computes each source alpha from canonical color alpha × paint opacity exactly once. It never multiplies an exporter-0.6.0 mirrored serialized alpha by the same paint opacity again.

The bounded owner is one SVG primitive subtree:

- one node-local clip path from current settled bounds and accepted corner geometry;
- one source-indexed group of full-bounds SOLID layers, painted from index 0 upward;
- one clip operation around the complete group;
- no per-paint radius or clipping model;
- no compatibility background, CSS border-radius owner, or duplicate SVG paint.

Primitive clipping and parent/ancestor clipping remain distinct operations. Painting does not change node, parent, or layout bounds.

## Revision and surface requirements

`ResolvedOrderedSolidStackV1` binds the canonical source, primitive geometry, ordered paint, and stack revisions. Validate, Fields, editor, shared live previews, and hidden PNG consume the same ordered layer identity and template-space clip geometry. Stale supplied primitive trees are recomputed from the current canonical package before renderer or export publication.

## Compatibility boundary

Excluded from the first transfer:

- SOLID plus gradient or IMAGE stacks;
- IMAGE paint opacity;
- non-`NORMAL` blending;
- node-opacity routing;
- masks, effects, arbitrary vectors, gradient strokes, Canvas, WebGL, and offscreen compositing.

No candidate or reference change is authorized by source-gate closure.

## Milestone 7.4 implementation evidence

The bounded transfer is implemented through `ResolvedOrderedSolidStackV1` inside `PrimitiveAppearanceV1`. One capability-selected SVG subtree paints visible layers in ascending source-index order inside one shared primitive clip; hidden layers remain in resolved provenance. The route requires current `solid-paint-source-v1` opacity authority and falls back for ambiguous provenance or any unsupported whole-node dependency.

Run `milestone-7-4-ordered-solids` captures six exact fixtures, four surfaces, and two repeats. Every certified target region is pixel-exact against its source preview. The apply-once fixture's supported target is exact; its separate node-opacity-0.5 control remains compatibility-owned and explains its full-canvas difference. Headless and visible save/reload scenarios preserve identical stack identities with Figma blocked and zero runtime requests. `milestone-7-4-all-regression` is byte-identical to `milestone-7-4-prechange` for every pre-existing fixture/surface PNG.

The six fixtures and their 24 renderer candidates are registered but unapproved. Candidate generation does not authorize a renderer, scene, or settlement reference update. Mixed paints and general compositing remain outside this authority.
