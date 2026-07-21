# ADR 0014: Versioned backend-neutral canonical scene graph

## Status

Accepted

## Context

`ResolvedRenderTreeV1` mixes semantic projection with DOM/CSS-oriented choices and omits preserved semantics needed by future renderers. Runtime helpers also reread canonical nodes and raw Figma extensions.

## Evidence

Milestone 2 audited the package schema, resolver, renderer, raw extension reads, fields, diagnostics, previews, editor, and export. `CanonicalSceneGraphV1` snapshots validate for all four exact registered fixtures. The full Milestone 1 pixel gate remains a separate requirement.

## Decision

Adopt `canonical-scene-graph-v1` as the versioned backend-neutral semantic contract derived from validated `workingPackage`. It preserves source identity/order, layout, transform, geometry, text, media, appearance, relationships, capability classification, and provenance. Runtime use remains explicitly disabled in Milestone 2.

## Alternatives

Extending `ResolvedRenderTreeV1` in place was rejected because it would retain renderer-specific authority and risk behavior changes. A DOM/CSS scene contract was rejected as backend-specific. Introducing a settled graph was deferred to Milestone 3.

## Consequences

Future resolution can target a stable semantic input. The repository temporarily carries package, scene, and resolved projections plus comparison tooling.

## Compatibility impact

No importer, schema, renderer, preview, editor, diagnostics, or export route consumes the scene. Approved pixel references are unchanged.

## Migration impact

Use the explicit migration map and fixture gates before routing any consumer. Proposed ADR 0010 remains Proposed.

## Verification

Contract tests, validation/round-trip tests, exact fixture snapshots, equivalence reports, production build exclusion, and unchanged 16-surface fidelity comparison.

## Reversal strategy

Remove the scene/test tooling and snapshots. Current runtime/persisted data require no migration or rollback.
