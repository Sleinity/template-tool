# ADR 0007: FIT contains

## Status

Accepted

## Context

FIT must show the whole image without distortion.

## Evidence

The resolver maps FIT to `contain`; renderer background and image branches honor contain.

## Decision

FIT preserves aspect ratio and contains the image within the current slot.

## Alternatives

Cover and stretch are rejected for FIT.

## Consequences

Unused slot area is expected and requires a defined background.

## Compatibility impact

Documents current behavior.

## Migration impact

Future backends retain contain semantics.

## Verification

Aspect-ratio matrix, replacement, resize, and PNG comparison.

## Reversal strategy

Route FIT back to the existing DOM contain implementation.
