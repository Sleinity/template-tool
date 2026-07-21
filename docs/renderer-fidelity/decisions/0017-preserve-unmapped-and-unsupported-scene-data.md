# ADR 0017: Unmapped and unsupported source data remains visible

## Status

Accepted

## Context

Unsupported or newly exported properties must not disappear while the scene contract evolves.

## Evidence

Each node retains raw Figma extensions and mapped/unmapped key lists. The transformer emits exact `SceneUnmappedProperty` paths and preservation destinations. Current fixture keys are fully registered while advanced semantics remain explicitly classified.

## Decision

Preserve raw extension values, ordered unsupported paints/effects/strokes, source diagnostics, and provenance. Emit a deterministic unmapped report for unknown keys. Mapping does not imply runtime support.

## Alternatives

Dropping unknown keys and treating type availability as support were rejected.

## Consequences

Snapshots may grow and new exporter keys deliberately fail/change review evidence rather than vanish silently.

## Compatibility impact

No runtime behavior change. User/exporter/renderer diagnostic audiences remain separate.

## Migration impact

Promote a raw value into an accepted semantic field only with authority, fallback, fixture, and migration evidence.

## Verification

Unmapped-report tests, raw-provenance snapshots, fixture audit, and capability/mapping documentation.

## Reversal strategy

Raw canonical package data remains available; a faulty mapping can be superseded without data loss.
