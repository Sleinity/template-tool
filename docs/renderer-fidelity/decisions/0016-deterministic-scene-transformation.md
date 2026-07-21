# ADR 0016: Deterministic package-to-scene transformation is pure and observational

## Status

Accepted

## Context

The canonical graph must be reproducible and safe to compare before it can become a runtime boundary.

## Evidence

The transformer preserves IDs/order, does not mutate input, stable-serializes identical input byte-for-byte, handles source-level default/edit states, validates all real fixtures, and performs no DOM/network/decode/font measurement.

## Decision

Transform validated/enriched `workingPackage` synchronously and purely into V1. Do not perform browser measurement, asset decoding, network enrichment, stabilization, time evaluation, or package mutation. Emit diagnostics and unmapped-property evidence with the graph.

## Alternatives

Lazy DOM-backed transformation and mutation of the package/resolved tree were rejected as nondeterministic and outside Milestone 2.

## Consequences

Final geometry remains unavailable until dependency settlement. The graph can be generated in Node and inspected without a renderer.

## Compatibility impact

Runtime route remains disabled and current rendering is unchanged.

## Migration impact

Milestone 3 may consume the graph as input to a separate versioned settlement engine after fidelity gates.

## Verification

Idempotency, non-mutation, serialization, validation, exact fixture snapshots, performance reports, and production-bundle comparison.

## Reversal strategy

Stop generating the observational graph; no persisted runtime state depends on it.
