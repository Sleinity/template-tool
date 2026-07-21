# ADR 0005: Resolved image asset, slot, and placement semantics

## Status

Accepted

## Context

Image bytes, layout slot, and crop/placement intent are different concerns.

## Evidence

`ResolvedRenderImage` records asset/source/intrinsic size, scale/replacement mode, focal/crop/transform provenance, clip slot, and render mode; the renderer applies those values to the current node slot.

## Decision

Resolve image asset, slot, and placement separately and preserve property sources.

## Alternatives

Treating image bounds as intrinsic pixels or overwriting the source crop during replacement is rejected.

## Consequences

Layout changes can resize slots while placement recalculates; full affine crop fidelity remains future work.

## Compatibility impact

Preserves current image rendering and field replacement policies.

## Migration impact

Milestone 5 may change the backend, not the semantic separation.

## Verification

Source/edit/resize/export scenarios for FILL, FIT, CROP, TILE, STRETCH, focal position, and replacement.

## Reversal strategy

Retain source image metadata and select the previous renderer strategy per capability.
