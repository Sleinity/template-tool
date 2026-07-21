# ADR 0008: STRETCH requires explicit intent

## Status

Accepted

## Context

Stretch is destructive and must not be inferred from missing crop data.

## Evidence

The resolved image model maps STRETCH to fill and otherwise defaults missing modes to aspect-preserving behavior; field replacement policies are explicit.

## Decision

Use stretch only when imported source or an explicit field rule requests it.

## Alternatives

Defaulting unknown images to stretch is rejected.

## Consequences

Unknown intent falls back to aspect-preserving rendering and a diagnostic where needed.

## Compatibility impact

Preserves existing explicit STRETCH packages.

## Migration impact

Milestone 2 must formalize mode precedence.

## Verification

Missing/unknown/explicit modes and replacement policies across preview/export.

## Reversal strategy

Keep explicit source intent and restore prior aspect-preserving fallback.
