# Ordered SOLID + Linear-Gradient Runtime Authority

Status: source-certified and implemented for the exact bounded subset  
Date: 2026-07-21  
Issue evidence: `fidelity-issue-2f69124d.zip`, `fidelity-issue-7c79de23.zip`

## Source and defect

Both deterministic issue packets identify package `pkg_459_67_1784615329455`, node `459:68`, and fallback `ordered-solid-stack-mixed-paint-types`. The compatibility renderer painted source index 0 as a flat yellow background and preserved the source-index-1 gradient without a pixel owner.

The exact replacement source is `/Users/niels/Documents/Templates/template-package-fill-stack-solid-linear-2.zip`, 154,188 bytes, SHA-256 `781e54def68e2dd769c96f9bc2a7152c9e0ab7db4f1137844d6fa15c019ace94`. Its template and preview hashes are `6060987914aa5c377c44da4ca051fcb7f679ca1659586bf1d6872ef2e440fc75` and `be980d752b454675e839b986604bd80f2521aaf3867cbdb3ce20b1b8dd688191`.

Node `459:68` is an axis-aligned 710×880 RECTANGLE with node opacity 1, zero corners, no stroke, mask, effect, media, vector, or unsupported transform. Its exact back-to-front fills are:

1. source index 0: opaque NORMAL SOLID `#F9FF62`;
2. source index 1: NORMAL `GRADIENT_LINEAR` at paint opacity 0.5, opaque endpoint stops `#5C2638` and `#BFD4FF`, and the existing source-certified normalized node-local gradient transform.

The embedded preview isolates repeated source-over composition and makes the previously missing layer visible. The current PNG candidate is pixel-exact against the full source preview and the target region.

## Bounded contract

`ResolvedOrderedNormalPaintStackV1` is created only when all of these are true:

- exactly two fills exist in source order;
- source index 0 is a SOLID with current unambiguous `solid-paint-source-v1` apply-once opacity provenance;
- source index 1 is a current source-certified `GRADIENT_LINEAR`;
- both paints are visible and `NORMAL`;
- the node is an eligible axis-aligned FRAME or RECTANGLE at node opacity 1;
- the accepted primitive corner geometry applies;
- no stroke, mask relation, effect, media/vector owner, or unsupported compositing/geometry dependency exists.

The result retains both layer revisions, immutable source evidence, current bounds, corner geometry, gradient geometry, provenance, and one content-addressed stack revision. Resize recomputes gradient and stack geometry from current bounds without changing immutable gradient source identity.

## Singular owner

Backend capability `PNT-ORDERED-SOLID-LINEAR-NORMAL` selects runtime owner `ordered-normal-paint-svg`.

One SVG subtree contains one shared primitive clip and two full-bounds layers painted in ascending source-index order. The SOLID uses its effective source alpha once. The gradient reuses the accepted one-inverse matrix, stop order, straight-sRGB/independent-alpha behavior, and paint opacity once. Compatibility background and isolated-gradient owners are disabled for this node.

Validate, Fields, editor, and PNG publish the same stack identity, geometry, source order, layer revisions, clip, and two-stop SVG structure. Two captures per surface are stable.

## Compatibility boundary

This authority does not include reversed or additional mixed layer patterns, IMAGE layers, multiple gradients, hidden mixed layers, non-NORMAL blend modes, node/group opacity, masks, effects, strokes, arbitrary vectors, other gradient families, Canvas/WebGL, or general compositing. Those combinations remain coherent compatibility/preservation boundaries with explicit reasons.

The source preview is evidence, not an approved renderer reference. No approved renderer, scene, or settlement reference is changed by this correction.

## Evidence

- strict lifecycle: exact supplied ZIP passed;
- run: `fidelity/candidates/issue-2f69124d-7c79de23-resolution/`;
- source packet: `fidelity/evidence/ordered-solid-linear-normal/`;
- source comparison: 0 changed pixels in the 710×880 target region and 0 changed pixels over the full 1000×1500 canvas;
- all-surface identity: equal across Validate, Fields, editor, and PNG;
- repeatability: two captures per surface are stable.

