# ADR 0060: Ancestor clipping remains separate from primitive stroke

## Status

Accepted

## Context

OUTSIDE appearance must remain visible beyond its own layout box while still respecting a source-clipping ancestor.

## Evidence

Fixture node `443:90` has an 8px OUTSIDE stroke inside clipping ancestor `443:92`. The final source diff is confined to 18 raster-edge pixels at the ancestor boundary. Headless and visible reports publish the same nearest-first clip chain.

## Decision

Primitive SVG overflow remains visible. Canonical ancestor clipping remains a separate owner and `ancestorClipChain` participates in geometry identity. Do not disable clipping globally. Expanded strokes on a primitive that clips its own content remain compatibility-owned until a fixture proves a singular structure.

## Alternatives

Clipping every stroke to its node, disabling ancestor overflow, expanding layout, and using fixture-specific offsets were rejected.

## Consequences

OUTSIDE strokes are visible when allowed and clipped only by source authority.

## Compatibility impact

Self-clipping expanded strokes retain deterministic compatibility behavior.

## Migration impact

Future clip/mask work must preserve primitive/ancestor ownership separation.

## Verification

Clip-chain tests, telemetry, source edge diff, all-surface identity, and reload/offline evidence.

## Reversal strategy

Select whole-primitive compatibility for the affected boundary.
