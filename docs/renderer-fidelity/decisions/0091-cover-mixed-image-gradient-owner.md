# ADR 0091: Bounded mixed IMAGE and DARKEN-gradient owner

Status: Accepted for the source-certified exporter 0.6.1 subset below  
Date: 2026-10-07

## Context

Cover node `987:6774` retains three source-indexed paints: an opaque NORMAL
SOLID, a NORMAL FILL image, and a DARKEN linear gradient. Compatibility painted
the SOLID and image but discarded the third paint, leaving a hard photographic
edge that disagreed with the hash-verified embedded preview. ADR 0090's
ordered-SOLID/group owner intentionally excludes mixed IMAGE stacks.

## Decision

The internal source-compositing resolver may select one mixed owner for a direct,
axis-aligned FRAME under a source-certified opaque, static root when its exact
ordered stack is opaque SOLID → FILL IMAGE → source-indexed linear-gradient
DARKEN. It also requires no mask, effect, stroke, radius, motion, clipping, or
other competing appearance owner. Existing image placement supplies the media
geometry; the certified linear-gradient resolver supplies handles and stops.
One SVG gradient child blends over the existing SOLID/image DOM paint, and the
backend decision suppresses the legacy duplicate fill. Source paints, order,
asset identity, matrix, stops, opacity, and provenance remain unchanged.

Other mixed orders, unresolved gradient provenance, missing media evidence,
translucent backdrops, motion, and unsupported blends retain the coherent
compatibility boundary. This is not a general compositor or a new public API.

## Evidence and limit

The exact Cover ZIP, `template.json`, preview, and required fonts are hash-gated
by `fidelity/fixtures.json` and `fidelity/fonts.json`. Two-pass run
`sdk-061-three-review-final-20261007a` is stable on Validate, Fields, editor,
and hidden PNG. The source-sized PNG now shows the hand and image fading into
the footer; the previous hard edge is absent. The exact SVG arrow still owns
its stroke once. The Cover source-preview comparator reports 2,830 changed
pixels (0.1941%) at its recorded threshold, concentrated on glyph and image
raster edges rather than a missing paint region. A live Studio editor review
also showed the fade and arrow. Individual renderer references were approved
with retained guarded before/after evidence. Carrousel's observational
mask-range settlement remains unresolved; this ADR does not authorize its
settlement reference or a three-export gate go decision.
