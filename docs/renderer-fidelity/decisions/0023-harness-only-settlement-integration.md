# ADR 0023: Settlement integration remains harness only

## Status

Accepted

## Context

Milestone 3 must compare current browser behavior with the new contracts without changing markup, style, pixels, or renderer authority.

## Evidence

Settlement source has no runtime import. The Node model compiles a temporary SSR entry, consumes exact ZIPs and fidelity reports, and emits candidates outside `dist`. Fresh headless comparison passes 16/16 renderer references.

## Decision

Integrate measurement and settlement through Node/test tooling only. Stable existing `data-package-*` selectors are read but no new production selector or instrumentation is required. Production consumers must not import the settlement index in Milestone 3.

## Alternatives

Adding a runtime feature flag or settled-graph renderer path was rejected as behaviorally premature.

## Consequences

Evidence is available without shipping the engine. Runtime/observational divergence remains visible rather than forcibly reconciled.

## Compatibility impact

No production source path, schema, preview, editor, export, or pixel output changes.

## Migration impact

Any runtime integration requires a later ADR and the full fidelity gate.

## Verification

Import search, build digest, 16 pixel comparisons, production bundle inspection, and browser edit/upload/resize scenarios.

## Reversal strategy

Delete settlement scripts, source contracts, tests, docs, and evidence.
