# ADR 0025: Core layout properties have explicit runtime ownership

## Status

Accepted

## Context

CSS Flexbox, canonical bounds, resolved nodes, and browser measurements previously participated in geometry without one per-property runtime owner.

## Evidence

Milestone 4's machine-readable ownership table covers x/y/width/height, transforms, order, sizing, padding/gap/alignment, intrinsic/final text geometry, parent HUG, sibling FILL, image slots, rectangular clips, and export root geometry. Unit and browser evidence distinguishes routed and compatibility nodes.

## Decision

Use the six ownership states documented in `RUNTIME_ROUTING.md`. A routed property has exactly one final authority; browser measurements are inputs, not competing final owners.

## Alternatives

Implicit precedence and dual CSS/settlement ownership are rejected.

## Consequences

Compatibility helpers remain authoritative for unmigrated families. Ownership metadata is visible in test instrumentation.

## Compatibility impact

All 16 approved renderer references remain unchanged.

## Migration impact

Future milestones must extend the table before routing another property family.

## Verification

Contract tests, all-surface telemetry, edit/resize/export scenarios, and guarded reference comparison.

## Reversal strategy

Select `compatibility-authoritative` for the affected coherent subtree without changing package data.

