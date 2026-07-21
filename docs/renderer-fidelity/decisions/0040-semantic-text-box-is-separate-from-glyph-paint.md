# ADR 0040: Semantic text boxes are separate from glyph paint bounds

## Status

Accepted

## Context

Browser line boxes, Figma trim boxes, glyph paint, clipping, and selection were previously conflated.

## Evidence

Exact now-hiring metrics show 121.6/144/96 px browser line boxes but 93.125/124.4/76.4 px semantic boxes. Descender scenarios paint below the final baseline without requiring layout expansion.

## Decision

Represent layout, browser-line, Figma-trimmed, glyph-paint, clipping, and diagnostic bounds separately. Figma trim owns HUG geometry; glyph paint is translated but not scaled, and is clipped only by an independent explicit clip policy.

## Alternatives

Using `scrollHeight`, Range overhang, the flex wrapper, or glyph paint as final text height is rejected.

## Consequences

Diagnostics can classify line-box variance, glyph overhang, and actual clipping separately.

## Compatibility impact

Normal-line-box text retains existing behavior. Telemetry is inert and absent from exported pixels.

## Migration impact

Future clipping and rich-text work must name the box it owns.

## Verification

Single/multiline formulas, lowercase/descenders, overflow classification, structural telemetry, and export evidence.

## Reversal strategy

Return the affected text node to compatibility ownership without discarding the box evidence.
