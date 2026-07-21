# ADR 0065: Ordered SOLID stacks require one SVG owner and one primitive clip

## Status

Accepted

## Context

The source gate now establishes order, repeated source-over, visibility, apply-once opacity provenance, and shared four-independent-corner geometry. Runtime compatibility still selects the first SOLID rather than evaluating the stack.

## Evidence

The exact intake family and final corner fixture are recorded in `ORDERED_NORMAL_FILL_STACK_INTAKE.md`. Existing primitive authority already supplies current-bounds rectangular geometry, edge-local corner normalization, singular backend selection, and separate ancestor clipping.

## Decision

Eligible rectangular multiple-SOLID `NORMAL` stacks use one SVG primitive subtree, one source-indexed layer group, and one primitive clip path. The complete primitive falls back coherently when any layer or geometry property is unsupported.

## Alternatives

Independent CSS backgrounds, repeated per-paint corner geometry, partial routing, first-paint-only authority, Canvas/WebGL, and mixed-paint expansion were rejected for the bounded first milestone.

## Consequences

One runtime owner preserves order and opacity without changing layout. Parent clipping stays separate. Renderer references remain separately review-gated.

## Compatibility impact

Mixed SOLID/gradient/IMAGE stacks, IMAGE opacity, non-NORMAL blends, node opacity, masks, effects, vectors, and general compositing remain compatibility-owned or unsupported.

## Migration impact

Milestone 7.4 adds a versioned resolved SOLID-stack identity, capability route, stale-revision checks, singular renderer owner, and all-surface evidence without changing canonical source order.

## Verification

Source/contract tests, two-pass all-surface capture, PNG, headless/visible save-reload, offline rendering, structural identity, performance, and full guarded regression pass. Every certified target region is source-exact; the 24 renderer candidates remain unapproved.

## Reversal strategy

Keep the whole primitive compatibility-owned while retaining canonical source/provenance and the closed fixture evidence.
