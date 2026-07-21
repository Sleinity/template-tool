# ADR 0013: Fidelity evidence uses exact fixtures, separate references, and real application surfaces

## Status

Accepted

## Context

Later renderer milestones need regression evidence without changing renderer behavior or treating an exporter preview as a renderer golden. Current output differs by static inspection, editor, and hidden PNG-export surfaces and still depends on browser measurement.

## Evidence

- `fidelity/fixtures.json` verifies four external ZIPs by exact name, bytes, SHA-256, embedded preview hash, dimensions, root ID, and version.
- `scripts/fidelity/` resolves the current model, drives the real wizard/persistence/editor/export paths, captures each surface twice, and compares pixels and geometry separately.
- The 2026-07-13 final baseline captured all 16 fixture/surface combinations with exact repeated pixels and stable normalized structures.
- A fresh-process comparison passed all 16 approved references.
- Temporary guard tests proved missing approval, missing reason, one-pixel mismatch, diff generation, artifact retention, and reference immutability.

## Decision

Renderer-fidelity evidence is keyed by exact fixture hash and surface. Source references, approved renderer references, and current candidates are separate. Normal runs are reference-immutable. Updates require an explicit reviewed reason and retained evidence. Browser readiness uses current semantic evidence plus stable animation-frame geometry and is not a settled-graph contract.

## Alternatives

- Embedded previews as goldens: rejected because they are source intent, not current renderer output.
- One screenshot surface: rejected because static/editor/export paths differ.
- Runtime settled-ready API: deferred to later architecture milestones.
- Canvas/offscreen capture: deferred under Proposed ADR 0012.

## Consequences

Regressions become reviewable in pixels and structure. Runs depend on exact external fixtures and an environment-sensitive browser/font baseline. Initial approved images intentionally freeze current behavior, including known fallback-font limitations; they do not certify design fidelity.

## Compatibility impact

No schema, importer, renderer, preview, diagnostics, editor, or export behavior changes. Harness modules are Node/test-only and absent from the production bundle.

## Migration impact

Future fixture relocation uses `TEMPLATE_PACKAGE_FIXTURE_DIR`; exact filenames and hashes do not change. New fixtures and environments require explicit manifest/reference review.

## Verification

Run `pnpm test`, TypeScript checking, production build, diagnostic ZIP tests, `pnpm fidelity:baseline`, `pnpm fidelity:compare`, a headed run, reference guards, and documentation-link checks. Record results in `HANDOFF.md`.

## Reversal strategy

Remove the Node harness scripts, manifest, approved/evidence directories, package scripts/dependencies, and documentation. Runtime code and persisted package data require no rollback.
