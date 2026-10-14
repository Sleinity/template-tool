# ADR 0088: Matched Matrix group control certifies bounded isolation

## Status

Accepted

## Context

ADR 0087 found that Matrix and Cover did not distinguish pass-through from
isolated groups. The supplied exporter 0.6.1 Matrix 2 ZIP now contains
matched child paints in `PASS_THROUGH` and `NORMAL` groups at 80% opacity,
plus a two-paint row with a 40% top paint. Its exact source and screenshots
are pinned by a separate research profile.

## Decision

Accept the [bounded source contract](../PHASE_9_GROUP_CONTROL_SOURCE_GATE.md)
for the fixture's sampled opaque flat and image backdrops. It establishes
external-backdrop blending for `PASS_THROUGH`, isolated child blending for
`NORMAL`, ordered paint opacity, and post-group 80% opacity. Preserve the
third `OVERLAY` group as evidence without treating it as a matched isolation
control. No production visual owner, backend, renderer route, API, or schema
changes under this decision.

## Evidence and limits

The hash-gated checker validates all three source groups and their exact
paints, 18 flat and six image preview samples, an alternate child-opacity
model, deterministic scene/appearance projections, and a complete stable
two-pass four-surface capture. Current renderer output differs materially;
approved renderer/scene/settlement references are absent or different. The
fixture does not resolve transparent backdrops or edges, general nested
groups, `OVERLAY` group blending, or Cover's IMAGE/gradient fade. Repeat
stability does not approve the current pixels.

## Consequences

ADR 0087 remains historical, but its missing matched-group-control premise
is superseded for this bounded subset. Phase 9 remains incomplete. A later
runtime milestone must select one group/paint visual owner and prove edits,
resizes, export, fallback, invalidation, and performance before claiming
support. The active SDK three-export gate stays no-go.

## Reversal strategy

If a corrected exporter ZIP contradicts the sampled interpretation, retain
this exact evidence and supersede this ADR with a new source-reviewed record.
