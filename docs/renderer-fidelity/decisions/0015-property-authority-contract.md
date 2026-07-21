# ADR 0015: Scene properties retain selected authority and competing evidence

## Status

Accepted

## Context

Current properties can be interpreted by canonical nodes, raw extensions, enrichment hints, field mutations, resolver fallbacks, renderer helpers, and browser measurement.

## Evidence

`PROPERTY_AUTHORITY_MATRIX` records 35 required property families. `SceneProperty<T>` retains candidates, source paths, selection, provenance, confidence, conflict, ambiguity, and fallback. Current runtime duplicates remain inventoried.

## Decision

For scene semantics, current validated `workingPackage` is authoritative; explicit canonical values beat raw extension and enrichment candidates; valid user mutations are already part of `workingPackage`; enrichment fills only absence; browser measurements are future explicit inputs and never silent replacements. Losing candidates remain preserved.

## Alternatives

Last-writer-wins without provenance and raw-extension-first compatibility were rejected. Inventing final rules for masks, variables, components, or compositing was rejected.

## Consequences

Authority decisions are machine-readable and inspectable. Some entries remain low-confidence or explicitly unresolved until later fixture evidence.

## Compatibility impact

The contract does not change current helper precedence or pixels.

## Migration impact

Runtime consumers move only through the compatibility plan and owning milestone. Browser-derived authority belongs to a separate settled result.

## Verification

Uniqueness/completeness tests, source/edit transformation tests, snapshot evidence, equivalence reports, and fidelity gate.

## Reversal strategy

Retain the current runtime path and revise/supersede the matrix through a new ADR without discarding source provenance.
