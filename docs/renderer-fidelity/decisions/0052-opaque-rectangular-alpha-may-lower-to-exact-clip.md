# ADR 0052: Opaque rectangular ALPHA may lower to an exact clip

## Status

Accepted

## Context

The source-certified mask is a binary opaque rectangle. A general compositing backend is unnecessary for this exact case.

## Evidence

RECTANGLE, one opaque SOLID, opacity 1, zero radii, no stroke/effect, identity linear transform, declared sibling scope, and source-preview pixel comparison.

## Decision

Capability `exact-opaque-rectangular-alpha` lowers to one CSS clip-path in affected-node coordinates. Telemetry retains ALPHA classification, relation, source geometry, paint role, and revision. Stale resolved revisions are recomputed before publication.

## Alternatives

Canvas and raster flattening were rejected. General SVG masks are deferred. Centered or parent-wide clipping was rejected because scope and coordinates are source-owned.

## Consequences

The current case is exact and cheap. Partial alpha, unsupported geometry/transforms, luminance, vector, nested, and effect masks remain explicit fallbacks.

## Compatibility impact

Milestone 6.1 media placement and normal rectangular clipping are unchanged. ADR 0012 remains Proposed.

## Migration impact

Future nontrivial alpha evidence may add a separate DOM/SVG capability without changing this lowering.

## Verification

Clip formula tests, invalid/unsupported cases, all-surface identity, source/PNG diff, headed/headless profiles, persistence/offline reload.

## Reversal strategy

Select `compatibility-unmasked` for the capability while preserving source and candidate evidence; never update goldens to conceal the loss.
