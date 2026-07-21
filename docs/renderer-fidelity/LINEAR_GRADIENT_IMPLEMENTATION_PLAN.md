# Milestone 7.3A — Source-Certified Linear-Gradient Authority

Status: implemented, source-verified, visually approved, and renderer-reference promoted on 2026-07-18  
Source gate: closed on 2026-07-18  
Scope: one isolated `GRADIENT_LINEAR` fill on an otherwise eligible rectangle or frame

## Objective

Transfer the source-certified linear-gradient subset from preserved raw evidence into one versioned canonical contract, one resolved geometry result, and one singular runtime paint owner. The user separately approved this implementation; the resulting authority is recorded in [LINEAR_GRADIENT_RUNTIME_AUTHORITY.md](LINEAR_GRADIENT_RUNTIME_AUTHORITY.md).

## Canonical contract

Pair the visible canonical paint with `extensions.figma.rawFills` by the preserved source index. Retain both values and provenance. A supported entry records:

- paint type, source index, visibility, `NORMAL` blend mode, and paint opacity;
- declared stop order, finite positions, straight sRGB components, and independent alpha;
- the finite non-singular 2×3 node-local-normalized-to-gradient matrix;
- raw aliases, conflicts, normalization decisions, and source package/scene revisions.

The strict schema remains strict. Missing, conflicting, malformed, singular, non-finite, or unsupported data selects a coherent compatibility owner; it is never guessed or partly routed.

## Resolved geometry and evaluation

The resolved result retains the raw matrix and determinant, performs one inverse, and derives:

```text
start = M^-1(0, 0.5)
end   = M^-1(1, 0.5)
third = M^-1(0, 1)
```

These normalized node-local handles scale against the current settled bounds. Stop order and nonuniform positions remain source-owned. Evaluation uses straight RGB interpolation and independent alpha interpolation; paint opacity multiplies the interpolated alpha, then the result composites source-over. Paint evaluation occurs in node-local geometry before the node transform.

Uniform and four independent radii reuse the existing edge-local Figma normalization and the same primitive path. Gradient evaluation uses the full node box and is clipped afterwards. Resizing recomputes pixel geometry from unchanged normalized intent and current settlement revisions; source-size pixel lengths cannot remain authoritative.

## Singular runtime ownership

The preferred bounded owner is one SVG primitive path with one SVG linear gradient because it preserves non-square affine geometry, independent corners, and the existing singular SVG primitive ownership model. The implementation audit must confirm the exact SVG matrix mapping before accepting the backend. CSS compatibility fill/radius output must be disabled for an authoritative gradient primitive; no second gradient or SOLID owner may paint simultaneously.

Every result is bound to package, scene, geometry, paint, and settlement revisions. Validate, Fields, editor, shared live previews, and hidden PNG export must consume the same revision-current gradient identity and template-space geometry. Export readiness rejects stale or pending gradient geometry.

## Supported subset

- one visible isolated `GRADIENT_LINEAR` fill;
- axis-aligned FRAME or RECTANGLE primitive, with paint evaluated before an already-supported node rotation;
- two or three finite ordered stops at source-declared nonuniform positions;
- stop alpha and paint opacity in `[0,1]`;
- finite non-singular affine transform in the certified normalized coordinate model;
- `NORMAL` paint blending, `PASS_THROUGH` node grouping, and node opacity 1 for the first route;
- no stroke, mask, effect, media/vector owner, shader, or additional fill;
- uniform or four independent source-certified corner radii;
- current settled-bounds resize and deterministic save/reload/offline rendering.

## Unsupported subset

Radial, angular, and diamond gradients; gradient strokes; multiple or mixed paint stacks; non-`NORMAL` paint blends; node opacity below 1; masks; effects; shaders; Canvas; arbitrary vectors; repeated/equal/out-of-range stop positions; unsupported color spaces; perspective, singular, non-finite, or otherwise malformed transforms remain compatibility-owned or unsupported with provenance and diagnostics.

## Acceptance and evidence

- exact hash-gated fixture registration only after implementation approval;
- canonical pairing, conflict, serialization, and provenance tests;
- matrix direction, one inverse, handle derivation, non-square geometry, stop order, straight RGB, stop alpha, paint opacity, rotation, independent-corner clipping, resize, and stale-revision tests;
- explicit whole-primitive fallbacks for every unsupported condition;
- two-pass Validate, Fields, editor, shared-preview, and real PNG captures;
- common template-space gradient identity across surfaces;
- source-region comparisons, save/reload, and offline proof;
- regression runs for every registered fixture plus performance and bundle delta.

Candidate generation does not authorize reference changes. Source, candidate, expected, diff, structure, and environment evidence must be reviewed separately. Any approved-reference promotion requires the guarded update command and an explicit user-approved fidelity reason.

## Performance and bundle constraints

Cache immutable matrix inversion by source paint identity, recompute bounds-dependent geometry only when geometry revisions change, and avoid per-frame DOM measurement or duplicate compatibility/routed calculations. Fixture bytes and evidence tooling remain outside the production bundle. Report runtime module, minified, and gzip deltas.

## Completion state

Exact source-index pairing, SVG affine mapping, resize behavior, surface identity, persistence, and source-region pixels are verified. The implementation stopped at the bounded isolated subset and did not expand into general compositing, masks, other gradient families, or Canvas. The later separate Result A review approved and promoted all eight renderer references; scene and settlement evidence stayed unchanged.
