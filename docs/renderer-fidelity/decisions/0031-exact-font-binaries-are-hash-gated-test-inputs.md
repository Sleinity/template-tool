# ADR 0031: Exact font binaries are hash-gated test inputs

## Status

Accepted

## Context

Alias-font tests did not prove Geist Mono 500 or Inter Tight 700.

## Evidence

`fidelity/fonts.json` records exact identity, bytes, digest, source, and external path policy.

## Decision

Only a manifest-verified binary explicitly installed by the harness is exact-font evidence.

## Alternatives

CSS availability checks and bundled production fonts were rejected as identity evidence.

## Consequences

Evidence is reproducible but requires external font provisioning.

## Compatibility impact

No runtime font resolution or production bundle changes.

## Migration impact

New exact identities require registry entries and hash verification.

## Verification

Initial, delayed, fallback, reload, repeat, all-surface, and PNG reports.

## Reversal strategy

Remove the test registry/tooling; renderer behavior is unaffected.
