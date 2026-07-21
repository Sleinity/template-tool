# ADR 0054: Single opaque SOLID is the first routed paint subset

## Status

Accepted

## Context

Canonical paint arrays preserve order, visibility, alpha, opacity, and blend mode, but real registered ZIPs do not certify hidden, transparent, partial-opacity, or multiple-visible-solid compositing.

## Evidence

Both Milestone 7.1 packages contain ordinary single opaque SOLID frame paints and source previews. No audited real ZIP contains the missing paint cases without an unsupported appearance dependency.

## Decision

Preserve every paint entry and source index in `PrimitiveAppearanceV1`, with independent revision, role, alpha, opacity, capability, owner, and fallback. Route only zero or one ordinary visible opaque SOLID with NORMAL blend. Mask input never enters ordinary output. The source array order remains authoritative evidence; multi-paint compositing direction remains fixture-blocked.

## Alternatives

First-paint-only support claims, reversing arrays from screenshot appearance, and flattening node opacity into every paint were rejected.

## Consequences

Single SOLID is source-certified. Hidden/transparent/partial-alpha/multiple-paint output is preserved and tested mathematically but remains compatibility-owned or blocked by a missing fixture.

## Compatibility impact

Existing color fields still update `workingPackage`; the next resolved revision uses the same route when eligible.

## Migration impact

Layered DOM/SVG or compositing work requires a new real fixture and separate capability.

## Verification

Source index, alpha/opacity, hidden/transparent/multiple fallback, mask exclusion, deterministic revision, and all-surface telemetry tests.

## Reversal strategy

Disable the paint capability and restore coherent compatibility ownership without discarding any paint entry.
