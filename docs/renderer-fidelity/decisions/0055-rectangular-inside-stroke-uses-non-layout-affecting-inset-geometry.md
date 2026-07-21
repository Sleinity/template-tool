# ADR 0055: Rectangular INSIDE stroke uses non-layout-affecting inset geometry

## Status

Accepted

## Context

The compatibility stroke helper sometimes emitted CSS borders, which can participate in sizing or differ by surface. A fixed 96×96 source frame and a second real CTA source prove opaque uniform INSIDE strokes with uniform radii.

## Evidence

`main-visual-section-primitives` node `2453:1436` declares a 2.400000095px white INSIDE stroke and radius 999 clamped to 48. Source-perimeter mismatch improves from 683 to 210 pixels at threshold 0.1. `bb-cover-thing-primitives` node `421:27` improves from 845 to 272 pixels. Both are deterministic across surfaces.

## Decision

For one visible opaque SOLID INSIDE stroke on an eligible rectangular primitive, the outer box remains the settled node box and the inner edge is inset by the source width. DOM/CSS renders one inset shadow and no CSS border. Uniform radius clamps against current settled width/height and is shared by fill, clip, and stroke.

## Alternatives

Layout-affecting border, centered shadow, SVG duplication, and treating CENTER/OUTSIDE as INSIDE were rejected.

## Consequences

INSIDE is source-certified for the bounded subset. CENTER, OUTSIDE, dashes, gradient/multiple/hidden/partial-alpha strokes, independent weights, and `strokesIncludedInLayout=true` remain compatibility-owned or fixture-blocked.

## Compatibility impact

Existing unsupported stroke strategies remain unchanged.

## Migration impact

SVG is reserved for a future fixture proving non-inset geometry.

## Verification

Exact source declarations, geometry tests, no-border markup assertion, regional diffs, all-surface identity, and offline reload.

## Reversal strategy

Select the compatibility stroke owner and retain source/effective geometry telemetry.
