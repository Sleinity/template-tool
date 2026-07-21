# ADR 0006: FILL and CROP preserve aspect ratio

## Status

Accepted

## Context

Implicit stretching corrupts image fidelity.

## Evidence

The resolver maps FILL/CROP to cover and the renderer uses cover/background crop geometry; now-hiring assertions reject `object-fit: fill` for its source image.

## Decision

FILL and CROP preserve intrinsic aspect ratio and cover the current slot.

## Alternatives

Stretch-to-slot is rejected unless explicit STRETCH intent exists.

## Consequences

Overflow is cropped; focal/transform fidelity must be improved without distortion.

## Compatibility impact

Matches current common image behavior.

## Migration impact

Canvas/SVG backends must reproduce cover semantics.

## Verification

Landscape/portrait/square assets across changing slots and export.

## Reversal strategy

Restore previous cover placement while retaining source transform provenance.
