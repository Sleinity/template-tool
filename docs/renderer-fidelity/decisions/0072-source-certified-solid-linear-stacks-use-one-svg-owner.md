# ADR 0072: Source-certified SOLID plus linear-gradient stacks use one SVG owner

- Status: Accepted
- Date: 2026-07-21

## Context

Two fidelity issue packets report the same missing gradient on an ordered NORMAL paint stack. Existing isolated linear-gradient and ordered-SOLID owners each reject mixed paint types, leaving the compatibility renderer to paint only the SOLID.

## Evidence

The exact real export `template-package-fill-stack-solid-linear-2.zip` is 154,188 bytes at SHA-256 `781e54def68e2dd769c96f9bc2a7152c9e0ab7db4f1137844d6fa15c019ace94`. Node `459:68` isolates one opaque SOLID below one 0.5-opacity source-certified linear gradient, both NORMAL, with no other appearance dependency. The implemented all-surface PNG is pixel-exact against the source preview.

## Decision

Add `ResolvedOrderedNormalPaintStackV1` and capability `PNT-ORDERED-SOLID-LINEAR-NORMAL` for exactly one eligible SOLID at source index 0 followed by one eligible `GRADIENT_LINEAR` at source index 1. Render both through one `ordered-normal-paint-svg` subtree and one shared primitive clip. Reuse the accepted SOLID opacity and linear-gradient geometry contracts; do not create a general compositing engine.

## Alternatives

CSS background stacking, independently mounted SOLID/gradient owners, reversing by UI order, broad mixed-paint support, Canvas, and leaving the visible source defect unresolved were rejected.

## Consequences

The supplied source renders faithfully and both issue packets collapse to a healthy semantic owner. Unsupported mixed combinations still fall back coherently.

## Compatibility impact

Only the exact property-gated subset changes pixels. Existing isolated gradients, ordered SOLIDs, media, masks, strokes, and unsupported stacks keep their current owners.

## Migration impact

Persisted canonical packages require no migration. The resolved stack and backend decision reconstruct deterministically from current package bytes.

## Verification

Strict lifecycle, focused unit/contract tests, two-pass four-surface capture, source/full-region pixel comparison, persistence/offline checks, and guarded renderer/scene/settlement comparisons are required. Reference promotion remains separately review-gated.

## Reversal strategy

Disable the new capability route and return the complete node to compatibility ownership while retaining canonical source/provenance and fixture evidence.

