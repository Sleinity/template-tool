# Canonical Scene Graph Evidence Tooling

The Node-side tooling compiles a temporary Vite SSR entry, runs the real ZIP import pipeline, transforms the validated package, validates the scene, compares it with `ResolvedRenderTreeV1`, and writes reports. It is not imported by the production application.

## Commands

| Command | Behavior |
| --- | --- |
| `pnpm scene:baseline` | Verify exact fixture bytes and write candidate scene/equivalence/validation/performance/inspection reports |
| `pnpm scene:compare` | Regenerate candidates and compare exactly with approved scene snapshots; never updates them |
| `pnpm scene:update -- --run-id <id> --reason "…"` | Explicit guarded snapshot promotion with before/after/difference/update evidence |
| `pnpm scene:inspect` | Generate developer-readable JSON inspection reports |
| `pnpm scene:equivalence` | Generate package/scene/resolved equivalence reports |
| `pnpm scene:report -- --run-id <id>` | Print a compact Markdown run report |

Use `--fixture <exact-manifest-id>`, `--run-id <id>`, and `--output <candidate-root>` as needed. Fixture lookup reuses the Milestone 1 exact filename/size/SHA/dimension/root/version checks.

## Snapshot policy

Approved snapshots live at `fidelity/scene-graph/snapshots/approved/<fixture-id>/scene.json`. Candidates and update evidence are local ignored artifacts. Normal baseline and compare commands cannot write approved snapshots. A missing approval fails. Updates require a reason of at least eight characters and retain previous/next structures plus a first-difference report. Scene snapshots are independent from approved pixel references and cannot update them.

Comparison-critical snapshots omit timings and timestamps. They bind exact fixture ID, filename, byte size, ZIP SHA-256, embedded-preview SHA-256, canvas, root, and package version.

## Equivalence report

Each report classifies:

- mapped, inferred, conflicting, or missing values;
- mapped raw Figma dependencies;
- renderer/browser/export-only state;
- diagnostics-only state;
- scene-only or resolved-only semantics;
- unsupported-preserved values;
- provenance gaps and migration blockers.

The report always states `pixelEquivalenceClaimed: false`. Pixel behavior is guarded separately by `pnpm fidelity:compare`.

## Developer inspection

`inspection.json` exposes fixture/package identity, graph counts, property-authority matrix, source mapping, migration map, transformation diagnostics, and equivalence summary. This intentionally avoids the Validate UI; Milestone 2 does not redesign user-facing diagnostics.

## Performance evidence

`performance.json` records import, transformation, validation, and equivalence duration; input package/serialized scene byte size; and approximate process heap use. Heap is shared-process context, not isolated graph allocation. No strict budgets are introduced in Milestone 2.
