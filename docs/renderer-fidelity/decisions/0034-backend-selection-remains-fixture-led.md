# ADR 0034: Appearance backend selection remains fixture-led

## Status

Accepted

## Context

Advanced masks and compositing may eventually require a different backend.

## Evidence

No registered real ZIP proves that DOM/SVG/CSS is insufficient, and no reviewed fixture proves Canvas or WebGL necessary.

## Decision

Record viable/preferred/current backend separately. Leave masks and effects/compositing unresolved until real evidence exists.

## Alternatives

Selecting Canvas/offscreen or WebGL in Milestone 5 was rejected.

## Consequences

ADR 0012 remains Proposed and no speculative engine ships.

## Compatibility impact

Existing DOM/SVG/CSS compatibility behavior remains authoritative.

## Migration impact

Backend changes need independent source/edit/resize/export evidence.

## Verification

Backend matrix consistency and bundle analysis.

## Reversal strategy

Revert matrix recommendations; no runtime code depends on them.
