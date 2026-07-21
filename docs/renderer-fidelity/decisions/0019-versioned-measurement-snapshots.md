# ADR 0019: Browser measurements are versioned observational inputs

## Status

Accepted

## Context

Text, layout diagnostics, image decode, preview scale, and capture stability currently measure browser state in separate modules. Their values were not serializable inputs and carried no shared revision identity.

## Evidence

Milestone 3 audited the renderer HUG hook, field-fit measurement, layout debugger, font listeners, image decode/export readiness, and fidelity capture. All 16 current fixture/surface reports now convert to `MeasurementSnapshotV1` and reproduce guarded snapshots.

## Decision

Use `measurement-snapshot-v1` for observational values. Every record identifies node/property, unit, coordinate space, source, dependencies, readiness, validity, confidence, and approximation. Snapshots bind fixture ZIP hash, surface, environment profile, and a complete revision vector. DOM/React objects are forbidden.

## Alternatives

Reading the DOM directly inside the semantic graph and treating measurements as unversioned callback results were rejected.

## Consequences

Browser results can be replayed, compared, rejected when stale, and kept separate from semantic intent. The current runtime continues its existing local measurement behavior.

## Compatibility impact

None. Measurements are collected by Node/harness tooling only.

## Migration impact

Milestone 4 may publish equivalent inputs from runtime instrumentation only after routing gates pass.

## Verification

Serialization, non-finite/non-serializable rejection, exact fixture binding, stale/future revision tests, 16 surface observations, and real editor scenarios.

## Reversal strategy

Remove the observational module and settlement snapshots; runtime data and output require no migration.
