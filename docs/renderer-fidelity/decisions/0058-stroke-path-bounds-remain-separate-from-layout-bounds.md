# ADR 0058: Stroke path bounds remain separate from layout bounds

## Status

Accepted

## Context

CSS borders can consume layout or hide whether a stroke is INSIDE, CENTER, or OUTSIDE. Settlement and appearance need separate authority.

## Evidence

The real fixture contains the same 180×180 layout box with 8px INSIDE, CENTER, and OUTSIDE strokes. The source preview shows visual bounds equal to, four pixels outside, and eight pixels outside the layout box respectively.

## Decision

Settlement owns layout bounds. `PrimitiveAppearanceV1` separately records source path, fill, centre path, inner edge, outer edge, and visual bounds. Stroke alignment never changes layout size.

## Alternatives

Layout-expanding borders, one inset approximation, and measuring final DOM pixels back into semantic geometry were rejected.

## Consequences

Stroke geometry is explicit and revisioned. Inspection and PNG can compare the same template-space values.

## Compatibility impact

Layout-included and advanced strokes remain compatibility-owned.

## Migration impact

Future stroke families extend path semantics without changing settlement authority.

## Verification

Focused bounds tests, all-surface structural identity, source regions, and unchanged old-fixture pixels.

## Reversal strategy

Restore coherent compatibility ownership for the full primitive.
