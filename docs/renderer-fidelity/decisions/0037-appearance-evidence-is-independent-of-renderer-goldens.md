# ADR 0037: Appearance evidence is independent of renderer goldens

## Status

Accepted

## Context

Observational contracts need repeatable evidence without creating another accidental golden-update path.

## Evidence

`appearance:baseline` writes candidates only and repeats each projection.

## Decision

Milestone 5 appearance evidence has no approval/update command and never modifies pixel, scene, or settlement references.

## Alternatives

Reusing pixel or scene snapshot promotion was rejected.

## Consequences

Contract drift is visible in run artifacts but cannot be approved casually.

## Compatibility impact

Approved references remain immutable.

## Migration impact

A future approved appearance snapshot policy requires a separate reviewed ADR.

## Verification

Reference directory digests before/after and deterministic candidate generation.

## Reversal strategy

Delete candidate tooling; approved evidence is untouched.
