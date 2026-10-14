# ADR 0078: Boolean visibility is structural participation with generation-safe publication

- Status: Accepted
- Date: 2026-09-03

## Context

Field Rules V2 materializes canonical Boolean values to the existing
`appearance.visible` semantic property. The shared renderer previously retained
invisible nodes in routed Auto Layout, HUG/FILL allocation, intrinsic
measurement, media preload, and React mount work. Its repeatable semantic hash
also permitted an ABA collision: delayed work from the first visible state could
match a later visible state after a visible/hidden/visible sequence.

## Decision

The shared runtime derives one structural-participation projection from the
canonical scene. Every node is `active`, `excluded-self`, or
`excluded-ancestor`, with the exclusion-root ID retained. Canonical topology and
descendant values remain unchanged.

Only active FLOW children enter Auto Layout participant sequences. Gaps, HUG,
FILL, and alignment use that active sequence; an empty HUG container resolves to
padding-only size. Excluded subtrees do not route, form compatibility
boundaries, publish intrinsic/image/clip evidence, preload media, apply masks,
mount React content, or contribute active export-safety aggregation.

`semanticRevision` remains a repeatable geometry identity. Excluded root IDs are
included only when an exclusion exists, preserving existing all-visible
identities. A separate renderer-instance-local `publicationGeneration`
increments for every new package object and font measurement epoch. Asynchronous
measurement and settlement publication must match both identities. Generation
is omitted from deterministic settlement hashes and from initial generation-zero
telemetry.

V2 sessions retain their existing monotonic canonical-content revision and full
materialization revision as the outer readiness-publication guard. Template
Families use the same selected-variant materialization path.

## Consequences

- The Boolean host API does not change.
- The behavior is generic to `appearance.visible`; V1 invisible nodes receive
  the same shared-renderer correction.
- A hidden ancestor removes its subtree without mutating child canonical state.
- Show/reset restores descendants with their current canonical values.
- Delayed first-visible evidence cannot publish into a later visible generation,
  even when semantic hashes are equal.
- Future rendered-line evidence can bind to the same layout and generation
  identities without Boolean-specific timing.

## Supported boundary and evidence status

The source-certified boundary is structural visibility for the exact
exporter-0.6.1 fixture's vertical HUG/FILL chain and fixed horizontal
`SPACE_BETWEEN` row. The fixed row remains compatibility-owned and does not
promote general `SPACE_BETWEEN` settlement. Portable evidence additionally
covers the existing non-wrapping vertical/horizontal FIXED/HUG/FILL, padding,
gap, and MIN/CENTER/MAX/STRETCH paths. Wrapping, unsupported circular
FILL-in-HUG axes, and advanced mask/transform interactions remain outside this
decision.

Automated package-level coverage proves structural participation, vertical and
horizontal reflow, nested exclusion, padding-only empty HUG, FILL redistribution,
alignment, renderer pruning, media-preload pruning, persistence, Family target
switching, and delayed-publication ABA rejection. Source evidence is the
hash-registered `template-package-deal-of-the-week-post-boolean-v0.6.1.zip` at
`47a109f…b6ac`: Validate/Fields defaults, separate false/reset operations,
resize-hidden-show, and real PNG export pass. Default/reset exports are
byte-identical. No approved reference or tolerance is changed by this ADR.
