# ADR 0027: Compatibility fallback owns coherent subtrees

## Status

Accepted

## Context

Mixing absolute settled descendants into a compatibility Flex/HUG parent changed participation and export rasterization.

## Evidence

Milestone 4 preflight caught a compatibility boundary whose descendants reacquired settled ownership. Transitive fallback restored product-card geometry. The banner's equivalent absolute geometry still changed `html-to-image` pixels, so circular FILL-in-HUG remains compatibility-owned.

## Decision

A compatibility boundary is transitive. Descendants cannot reacquire settled authority within that boundary during the same route.

## Alternatives

Per-node fallback with mixed parent/child geometry ownership is rejected.

## Consequences

Routing may be conservative, but unsupported behavior cannot partially corrupt a subtree.

## Compatibility impact

Approved references remain unchanged.

## Migration impact

A boundary can shrink only after the entire smaller subtree has coherent evidence.

## Verification

Absolute-boundary tests, unsupported-wrap tests, real banner/deal fixtures, editor and PNG comparison.

## Reversal strategy

Promote the boundary to its nearest safe ancestor or disable the route globally for that family.

