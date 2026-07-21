# ADR 0039: Exact-face font metrics own vertical-trim inputs

## Status

Accepted

## Context

Cap-to-baseline geometry needs cap height and baseline placement that CSS line height alone cannot provide.

## Evidence

Hash-gated Geist Mono 500 and Inter Tight 700 runs expose stable Canvas cap/ascent/descent metrics and controlled DOM baseline calibration. Delayed activation produces a new revision and exact metrics replace approved-replacement metrics.

## Decision

Use revision-tagged Canvas metrics plus a controlled DOM baseline marker. Exact loaded family/weight/style identity, or an explicitly confirmed replacement policy, is required for trim authority. Browser availability checks alone do not prove exact identity.

## Alternatives

One browser metric API, system-font assumptions, per-glyph DOM measurement, and completion-time ordering are rejected.

## Consequences

Metric publication is small and event-driven. Font activation invalidates trim settlement; stale work remains rejected.

## Compatibility impact

Unverified fallback faces keep the existing compatibility path. Exact-font requirements are not weakened.

## Migration impact

Variable axes and mixed-run metrics remain compatibility-owned pending fixtures.

## Verification

Exact initial, approved replacement, delayed exact, source-height, repeated capture, and stale-revision coverage.

## Reversal strategy

Disable trim authority for the face/mode and retain normal compatibility measurement.
