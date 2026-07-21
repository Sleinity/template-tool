# ADR 0057: Independent corner radii use edge-local Figma clamping

## Status

Accepted

## Context

CSS applies one global normalization factor to all border radii. The real Figma source fixture proves different behavior when three source corners are 999 and the fourth is zero.

## Evidence

`stroke-test-primitives` node `443:95` is 181×209 with source radii `[999,999,0,999]`. One global factor leaves a 1.6644% regional mismatch. Edge-local scales produce `[90.5,90.5,0,104.5]` and a pixel-exact region. [Figma's RectangleNode API](https://developers.figma.com/docs/plugins/api/RectangleNode/) documents edge-based clamping when an edge is shorter than twice a corner radius.

## Decision

Preserve four source radii in top-left/top-right/bottom-right/bottom-left order. Compute a scale for every edge and apply to each corner the smaller factor of its two adjacent edges. Publish raw/effective values, the four scale factors, clamp reason, settled bounds, and geometry revision. All primitive paths consume this result.

## Alternatives

First-radius collapse, averaging, per-corner half-shortest-side clamping, browser-implicit CSS normalization, one global scale, and elliptical corner inference were rejected.

## Consequences

Independent corners are source-certified for eligible axis-aligned rectangles/frames. Resize changes effective values without mutating source values.

## Compatibility impact

Unsupported primitives remain whole-boundary compatibility-owned. Uniform Milestone 7.1 cases are unchanged.

## Migration impact

Future backends must consume the published effective tuple rather than normalize independently.

## Verification

Exact fixture hash, horizontal/vertical/tiny/zero/fractional synthetic tests, extreme source region, repeated surfaces, and PNG comparison.

## Reversal strategy

Select whole-primitive compatibility and retain the source/effective telemetry.
