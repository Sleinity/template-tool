# ADR 0050: Exporter mask relations are canonical source authority

## Status

Accepted

## Context

Extension mask hints did not identify affected sibling ranges. The crop-3 exporter now supplies node `mask` data and package `maskRelationships`.

## Evidence

Exact ZIP `017204b8…e689`, source `429:41`, parent `429:40`, affected `429:42`; schema, semantic, scene, renderer, persistence, and browser tests.

## Decision

Strict optional node/package fields preserve raw declarations. `mask.isMask=true` is the classifier; declared same-parent ordered relations own scope. `maskType` alone and names/IDs never infer a mask.

## Alternatives

Inferring sibling ranges from order or extensions was rejected as unsourced. Requiring live Figma was rejected as nondeterministic.

## Consequences

Older packages remain compatible. Invalid relations are explicit. Canonical and resolved graphs can retain raw and derived forms separately.

## Compatibility impact

The schema remains strict but additive. No old package must add mask data.

## Migration impact

Future exporters may add more mask types/termination reasons; those require capability evidence, not schema weakening.

## Verification

Exact hash binding, validation edge cases, deterministic serialization, all-surface capture, reload with provider blocked.

## Reversal strategy

Disable the derived relationship consumer while preserving the optional raw fields and provenance.
