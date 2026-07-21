# ADR 0051: Mask-input paint has one visual owner

## Status

Accepted

## Context

The prior ordinary paint path would render a mask source as RGB even though its paint supplies alpha semantics.

## Evidence

Crop-3 source fill is opaque SOLID; candidate DOM omits source `429:41`; source region differs by only `0.1252572016%`; ordinary same-mode content remains visible.

## Decision

Every relevant source paint has an explicit role. Active mask-source fills are `mask-input`, retained semantically, excluded from ordinary CSS/SVG output, and owned only by the active mask route.

## Alternatives

Making the fill transparent loses semantics. Painting then covering duplicates ownership. Rasterizing the parent exceeds scope.

## Consequences

Paint identity/provenance survive without duplicate pixels or layout siblings. Unsupported masks suppress RGB but remain explicit.

## Compatibility impact

Ordinary solid fills retain the existing owner. `isMask:false`, same colors, and names do not affect classification.

## Migration impact

Effects and unsupported compositing roles remain reserved until fixture evidence exists.

## Verification

Unit/static markup tests, structural telemetry, source diff, all-surface and reload scenarios.

## Reversal strategy

Return the relationship to compatibility while retaining role metadata; do not restore visible mask RGB as a fidelity baseline.
