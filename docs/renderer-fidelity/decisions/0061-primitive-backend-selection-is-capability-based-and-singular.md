# ADR 0061: Primitive backend selection is capability-based and singular

## Status

Accepted

## Context

Milestone 7.2 needs CSS for the already-proven simple INSIDE subset and SVG for explicit path geometry without duplicate output.

## Evidence

The exact stroke fixture, two Milestone 7.1 fixtures, and all ten registered fixtures repeat across every surface. All 36 comparable historical Milestone 7.1 surface images remain pixel-exact.

## Decision

Backend selection examines only semantic capability: uniform INSIDE may use DOM/CSS; independent-corner INSIDE and eligible CENTER/OUTSIDE use SVG; unsupported inputs select the complete compatibility primitive. Backend selection never reads fixture, package, template, node name, or node ID.

## Alternatives

One backend for all primitives, partial routing, duplicate layers, and identity routing were rejected.

## Consequences

One source primitive has one active appearance owner. Evidence tooling records but does not influence backend choice.

## Compatibility impact

The pre-existing broad compatibility path remains available for unsupported inputs.

## Migration impact

New appearance families require a separate fixture-led capability decision.

## Verification

Singular-owner tests, exact old-fixture regression, all-surface telemetry, guarded references, and production build.

## Reversal strategy

Disable the bounded capability and route its complete primitive through compatibility.
