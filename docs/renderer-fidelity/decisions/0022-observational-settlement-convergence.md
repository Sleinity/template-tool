# ADR 0022: Observational settlement uses bounded deterministic convergence

## Status

Accepted

## Context

The programme needs a versioned post-measurement result, but Proposed ADR 0010 has not authorized runtime convergence on one graph.

## Evidence

`SettledSceneGraphV1` records final bounds, text measurement, image slot/placement/crop, clip and mask/effect placeholders, readiness, unresolved dependencies, iteration trace, reuse counts, and performance. All 16 current surfaces stabilize within the fixed threshold.

## Decision

Run a pure, bounded settlement loop over `CanonicalSceneGraphV1`, `DependencyGraphV1`, and a current `MeasurementSnapshotV1`. Stop when no geometry changes beyond 0.001 scene pixels or after 12 iterations. Mark unresolved inputs and instability explicitly; never declare readiness by timeout alone.

## Alternatives

Mutating DOM styles from the engine, unbounded iteration, and silently falling back to source bounds were rejected.

## Consequences

The repository has a replayable settled result and trace. Current DOM bounds remain explicit compatibility inputs, so this milestone does not prove the semantic engine can predict every browser value independently.

## Compatibility impact

None. `runtimeUse` is `disabled-observational`; renderer authority is unchanged. ADR 0010 remains Proposed.

## Migration impact

Milestone 4 must reduce compatibility measurements property family by property family and prove pixel/edit/resize/export equivalence before routing.

## Verification

Pure contract tests, iteration normalization, 16 fixture/surface observations, text/image/resize scenarios, and unchanged pixel references.

## Reversal strategy

Remove settled evidence and retain canonical scene plus current runtime route.
