# ADR 0012: Defer canvas or offscreen backend until evidence requires it

## Status

Proposed

## Context

DOM/SVG currently covers common features; compositing and masks may require another backend, but speculative infrastructure is prohibited.

## Evidence

Current renderer uses DOM/SVG and `html-to-image`. No registered gradient/mask/blend fixture currently proves a canvas/offscreen backend is necessary or sufficient.

## Decision

Propose deferring alternative-backend implementation until an authoritative fixture and comparison demonstrate a fidelity gap that DOM/SVG cannot safely close.

## Alternatives

Building a canvas renderer immediately is rejected as unevidenced scope.

## Consequences

Advanced capabilities remain classified/preserved; Milestone 1 must acquire fixtures and evidence.

## Compatibility impact

No runtime change.

## Migration impact

If evidence justifies a backend, introduce capability routing with a DOM compatibility path in Milestone 8 or an approved earlier ADR.

## Verification

Reproduce the gap, compare backend prototypes, measure fidelity/performance, and verify edit/export behavior.

## Reversal strategy

Keep DOM/SVG routing as the default and remove the experimental route without schema/data loss.
