# ADR 0026: Core layout routing is capability-only

## Status

Accepted

## Context

The first runtime scene consumer needs a deterministic eligibility boundary without template-specific behavior.

## Evidence

`createCoreLayoutRoute` consumes only canonical node semantics. Tests mutate wrapping and positioning capabilities without relying on identity. Real now-hiring routes; deal-post unsupported layout and banner export-sensitive circular sizing fall back.

## Decision

Route supported non-wrapping core layout by property capability. Never inspect fixture IDs, package names, node names, or hierarchy signatures.

## Alternatives

All-or-nothing global routing and known-template allowlists are rejected.

## Consequences

Some registered fixtures intentionally remain compatibility-owned even when isolated properties appear supported.

## Compatibility impact

Unchanged 16/16 pixels and geometry; no golden update.

## Migration impact

New capability eligibility requires source/edit/resize/export evidence.

## Verification

Router unit tests, telemetry, unsupported real-fixture fallback, and guarded browser comparisons.

## Reversal strategy

Remove a capability from eligibility; its exact package data remains available to the compatibility route.

