# ADR 0035: Source-level probes cannot authorize rendering

## Status

Accepted

## Context

The registered ZIPs lack advanced appearance evidence, but contracts still need deterministic tests.

## Evidence

`fidelity/appearance-fixtures.json` separates real ZIPs from source-level probes.

## Decision

Use probes only for preservation, order, validation, and fallback contracts. They cannot become source references, approved renderer references, or support claims.

## Alternatives

Fabricating exporter provenance or silently substituting similar files was rejected.

## Consequences

Contract work proceeds while capability routing waits for real fixtures.

## Compatibility impact

No production or approved-reference impact.

## Migration impact

Replace gaps with registered real ZIP evidence; do not relabel probes.

## Verification

Manifest classification and automated contract tests.

## Reversal strategy

Remove probes without changing runtime behavior.
