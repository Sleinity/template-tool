# ADR 0018: Runtime migration from current helpers is gated and incremental

## Status

Accepted

## Context

The current renderer has accepted behavior and many duplicate property interpretations. Replacing them together would obscure regressions.

## Evidence

The machine-readable migration map covers layout, constraints, text/fonts, images, clip/masks, paints/strokes/effects/blend, transforms/motion, fields, export readiness, vectors, design systems, and diagnostics. Milestone 1 references expose static/editor/export differences.

## Decision

Migrate one coherent property family at a time behind explicit compatibility routing. Retire a helper only after source/edit/resize/export/fallback evidence and unchanged or reviewed references pass. The scene graph itself is not authorization to route runtime rendering.

## Alternatives

A flag-day resolver/renderer rewrite and fixture-specific bridging are rejected.

## Consequences

Duplicate implementations remain temporarily. Later milestones must pay the compatibility cost deliberately.

## Compatibility impact

Milestone 4 routed the proven now-hiring core layout/text chain with 16/16 unchanged references. Proposed ADRs 0010 and 0012 remain Proposed.

## Migration impact

Milestone 3 owns settlement/readiness/field invalidation; 4 owns layout/text/transforms; 5 owns media/paint/geometry/masks; 6 owns compositing; 7 owns design systems.

## Verification

Per-entry retirement gates, equivalence reports, full fidelity comparison, browser scenarios, and production bundle evidence.

## Reversal strategy

Keep or restore the existing helper route using the same `workingPackage`; never rewrite goldens merely to accept migration output.
