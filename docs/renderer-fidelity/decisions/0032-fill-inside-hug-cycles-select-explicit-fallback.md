# ADR 0032: FILL-inside-HUG cycles select explicit fallback

## Status

Accepted

## Context

The route previously used a generic export-unverified reason without a cycle record.

## Evidence

The contract probe creates a main-axis cycle from sizing semantics only.

## Decision

Record axis, classification, parent/child, reason, and fallback chain; keep the coherent subtree compatibility-owned.

## Alternatives

Bounded guessing or template-specific exceptions were rejected.

## Consequences

The cycle is visible and deterministic but intentionally unsolved.

## Compatibility impact

Current compatibility output is retained.

## Migration impact

A future solver needs exporter and PNG evidence before changing ownership.

## Verification

Pure route tests plus real fidelity fallback evidence.

## Reversal strategy

The explicit record can be removed without changing the fallback result.
