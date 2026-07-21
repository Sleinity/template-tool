# ADR 0056: Advanced primitive appearance remains fixture-gated

## Status

Accepted

## Context

The fixture audit found gradients and one rotated vector CENTER stroke, but no authoritative clean cases for independent radii, hidden/transparent/partial-opacity paints or strokes, multiple visible solids, CENTER/OUTSIDE rectangular strokes, or advanced stroke geometry.

## Evidence

The nine-fixture registry and external Templates directory were audited by exact bytes. The two new regional fixtures contain unrelated gradient/SHADER/vector appearance, so their whole canvases cannot approve those families.

## Decision

Preserve these properties and exercise synthetic contract math, but do not route or claim source certification until a real ZIP, exact source property, identifiable node, and source region exist. Gradients remain unsupported/preserved; ADR 0012 remains Proposed.

## Alternatives

Screenshot tuning, synthetic certification, broad tolerances, and Canvas introduction were rejected.

## Consequences

Milestone 7.1 can complete for independently evidenced ordinary solids, uniform corners, backgrounds, and INSIDE strokes without misrepresenting advanced support.

## Compatibility impact

Current compatibility output remains visible and diagnosed where applicable.

## Migration impact

Each new family needs a fixture-led sub-milestone and guarded candidate review.

## Verification

Fixture manifest audit, explicit fallback tests, capability registry entries, and no reference update commands.

## Reversal strategy

Not applicable; the decision is a gate. Supersede it only with authoritative fixture evidence.
