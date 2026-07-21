# ADR 0010: One settled graph for live surfaces and export

## Status

Proposed

## Context

Current previews and export recreate resolved trees, and browser HUG values remain local to separate DOMs.

## Evidence

Fields/Validate create trees in inspection preview; the editor passes a page tree; the export renderer/readiness/capture independently recreate trees. No object stores all post-measurement values.

Milestone 4 adds a deterministic core settlement revision/identity shared by the visible editor and hidden PNG renderer. Fields and Validate remain intentional bounds-first compare surfaces, and compatibility visual families remain outside the core result. This is progress toward, but not acceptance evidence for, one shared settled instance.

## Decision

Propose that editor, inspection, validation, review, comparison, and export consume one versioned settled render graph for a package state.

## Alternatives

Independent per-surface resolution is retained only as current compatibility behavior.

## Consequences

Requires authority, invalidation, readiness, and overlay separation contracts before implementation.

## Compatibility impact

No Milestone 0 runtime change. Static/editor visual differences need explicit migration handling.

## Migration impact

Milestones 2–3 define the scene/full observational settlement. Milestone 4 routes a bounded core family. A later milestone must unify static inspection and remaining compatibility families before acceptance.

## Verification

Graph identity/version evidence across every entry point plus source/edit/resize/export parity.

## Reversal strategy

Keep current per-surface creation behind a compatibility route until the settled graph passes gates.
