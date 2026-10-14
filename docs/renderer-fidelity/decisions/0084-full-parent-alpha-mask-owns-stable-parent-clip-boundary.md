# ADR 0084: A full-parent ALPHA mask owns the live editor clip boundary

- Status: Accepted
- Date: 2026-09-15

## Context

Boolean structural exclusion correctly removed two image-only groups from the
carousel fixture. Their HUG ancestor then changed geometry, while an exact mask
clip remained expressed as source-derived insets on that affected ancestor. The
stale insets clipped sibling discount and subtitle badges even though those nodes
remained active. DOM participation and bounds alone therefore did not prove that
the siblings still painted.

## Decision

Keep exporter `maskRelationships` as the sole scope authority and keep the
`exact-opaque-rectangular-alpha` capability gate. On every surface, lower that
relationship at the parent boundary only when all of these facts hold:

- the mask source is the parent's first child;
- termination is `end_of_siblings` and every following sibling is affected;
- the mask bounds exactly equal the parent bounds;
- the source already qualifies for exact rectangular ALPHA lowering; and
- the parent has no stroke or effect.

The parent owns `clip-path: inset(0)`, and affected children do not also apply
source-derived clip insets. Exact masks that do not cover the complete parent
retain the existing affected-node inset path.

## Consequences

Live HUG and Boolean reflow cannot make a full-parent source mask crop active
sibling content with stale insets. Mask paint still has one visual owner, raw
scope and provenance remain unchanged, and no node name, fixture identity, or
hierarchy heuristic participates. Other masks remain on their existing
compatibility or unsupported paths. This decision adds no schema, public API,
general mask backend, golden update, or tolerance change.
