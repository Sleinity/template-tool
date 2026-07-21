# ADR 0020: Dependency and invalidation operate on property keys

## Status

Accepted

## Context

The current runtime recreates the resolved tree after package edits while browser observers update local values. It cannot explain which derived properties changed or why.

## Evidence

`DependencyGraphV1` covers semantic inputs, text/font measurement, ancestor HUG, sibling Auto Layout, parent/FILL allocation, constraints, image slot/placement, clip/mask/effect extents, diagnostics, and export readiness. Text, font, asset, and container scenarios produce deterministic traces.

## Decision

Represent dependencies as directed property-key edges with typed reasons. Invalidation traverses downstream only for known inputs. Scene revision and unknown future inputs use an explicit full-tree safe fallback; no edge may depend on fixture or node names.

## Alternatives

Template-specific invalidation and a permanent full-tree-only model were rejected.

## Consequences

The harness can answer what invalidated and why. The dependency graph is conservative and may over-invalidate; it does not yet optimize production rendering.

## Compatibility impact

None; runtime invalidation is unchanged.

## Migration impact

Per-family routing must prove edge completeness before replacing runtime observers or full resolution.

## Verification

Ancestor/sibling/media/diagnostic/export edges, scoped text/font/asset/container tests, unknown-input fallback tests, deterministic snapshots, and scenario traces.

## Reversal strategy

Keep the current full resolved-tree recreation and discard the observational graph.
