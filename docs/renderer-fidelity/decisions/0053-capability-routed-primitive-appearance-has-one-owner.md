# ADR 0053: Capability-routed primitive appearance has one visual owner

## Status

Accepted

## Context

The compatibility renderer independently selected the first solid fill, corner CSS, and mode-specific stroke CSS. Real exporter fixtures now provide source regions for a bounded primitive subset.

## Evidence

`bb-cover-thing-primitives` and `main-visual-section-primitives` are exact hash-gated ZIPs with source previews. Repeated Validate, Fields, editor, and PNG captures publish the same primitive source/geometry revisions and capability decisions.

## Decision

`PrimitiveAppearanceV1` is the resolved runtime contract for axis-aligned FRAME and RECTANGLE appearance. Capability selection is property-based. When the contract is `primitive-authoritative`, compatibility fill, radius, and stroke output is disabled for that node. Unsupported properties select one coherent compatibility owner.

## Alternatives

Fixture-specific routing, duplicate CSS/SVG output, screenshot-derived colors, and DOM measurements as template-space authority were rejected.

## Consequences

The resolved contract retains ordered source entries, source/settled bounds, transforms, clipping, radii, opacity, revisions, provenance, backend, and fallback. General compositing remains outside this route.

## Compatibility impact

Media/vector owners, mask inputs, effects, non-axis-aligned geometry, and unsupported paint/stroke stacks stay compatibility-owned.

## Migration impact

Later fixture-backed capabilities may extend this contract without changing node identity routing.

## Verification

Unit classification/serialization/stale tests; exact fixture hashes; two-pass all-surface captures; source-region packets; save/reload/offline scenarios.

## Reversal strategy

Select `compatibility-authoritative` while retaining source contracts and evidence. Never leave both visual owners active.
