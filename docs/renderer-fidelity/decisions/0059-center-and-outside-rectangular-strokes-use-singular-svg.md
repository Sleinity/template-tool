# ADR 0059: CENTER and OUTSIDE rectangular strokes use singular SVG

## Status

Accepted

## Context

Inset borders and box shadows do not exactly represent expanded rounded stroke paths and can differ between static and editor modes.

## Evidence

Fixture nodes `443:89` and `443:90` reduce their isolated mismatches from 13.4131% and 16.6378% to 0% and 0.0433%. The residual 18 pixels are confined to the source ancestor-clipped raster edge.

## Decision

Eligible CENTER and OUTSIDE strokes use one SVG appearance root with one fill path and one stroke path. The DOM node clears compatibility fill/border/shadow output. Independent-corner INSIDE also selects SVG so fill and inset stroke consume one explicit path model; uniform INSIDE retains its proven CSS inset owner.

## Alternatives

CSS border, paired shadows, duplicate CSS fill plus SVG stroke, Canvas, and screenshot offsets were rejected.

## Consequences

Expanded stroke geometry is non-layout-affecting and source-faithful. SVG path telemetry is developer-only.

## Compatibility impact

Unsupported paints, transforms, stroke styles, and self-clipped expanded strokes keep compatibility ownership.

## Migration impact

This does not accept ADR 0012 or authorize general SVG/Canvas routing.

## Verification

No-duplicate markup tests, headless/visible repeated captures, real PNG export, and source-region evidence.

## Reversal strategy

Select whole-primitive compatibility and suppress the SVG root.
