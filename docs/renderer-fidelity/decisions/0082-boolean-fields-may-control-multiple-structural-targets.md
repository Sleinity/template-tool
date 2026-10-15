# ADR 0082: Boolean fields may control multiple structural targets

- Status: Accepted
- Date: 2026-09-14

## Context

Exporter 0.6.1 can place the same Boolean marker on multiple sibling groups.
Treating those markers as duplicate logical fields blocks import even though
they express one value and one structural-visibility behavior. Boolean
containers may also contain another editable marker with the same source ID.

## Decision

`StructuralVisibilityBindingV2` retains one primary `nodeId` and may carry
`additionalNodeIds`. One canonical Boolean value materializes to every target.
Loose V1 normalization merges repeated same-ID Boolean markers only when their
defaults agree and their target nodes are unique. ADR 0083 supersedes the
temporary `<id>Visibility` rename: schema 2.1 type-qualifies both fields instead.
Raw source and normalization evidence remain available; ambiguous collisions
stay blocked.

Browser content-controller projection retains the controlling Boolean and omits
controls bound beneath any false target. Canonical child content, configuration,
portable ordering, persistence, validation, and reimport state remain intact.
Configuration surfaces continue to expose all fields.

## Consequences

- Existing single-target V2 Boolean bindings remain valid.
- The renderer still consumes ordinary materialized `appearance.visible`
  values through ADR 0078; no renderer owner, layout rule, or golden changes.
- Reimport target identity includes every structural target.
- Native strict V2 packages retain globally unique field IDs.
