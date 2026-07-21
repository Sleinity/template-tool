# Dependency, Measurement, and Settlement Contract

Milestone 3 adds an evidence-only branch:

Milestone 6.1 adds media active-state and placement-revision values to the production scene/routing identity. Upload, Fill/Fit switch, replacement asset change, and reset therefore invalidate the affected media placement and export readiness. Per-field asynchronous file/decode operation revisions reject stale work before it can mutate `workingPackage`; the existing package/scene/asset/settlement revision gates continue to reject stale resolved placement and PNG readiness.

Milestone 7 mask clip geometry is not browser-measured settlement. It is a pure derivation from canonical source/affected bounds under a validated relationship and carries a deterministic mask revision. A renderer given a stale resolved mask revision recomputes from the current package before publication. General mask/effect placeholders in the observational settlement remain unresolved.

`CanonicalSceneGraphV1 + DependencyGraphV1 + MeasurementSnapshotV1 -> SettledSceneGraphV1`

Milestone 4 does not turn this full observational object into production authority. It introduces a smaller `CoreLayoutSettlementV1` with intrinsic-only text inputs for the proven route; see [runtime routing](RUNTIME_ROUTING.md).

Milestone 5.1 extends that intrinsic contract with vertical-trim mode, trim authority, exact/approved face state, ascent/descent/cap/baseline/line-height metrics, and separate layout/browser-line/Figma-trim/glyph/clip boxes. For `CAP_HEIGHT`, settlement consumes `cap height + baseline gaps`; browser line and glyph boxes never become final HUG geometry. A non-authoritative trim measurement selects coherent compatibility routing before parent settlement.

It is pure and replayable. It does not render, mutate DOM/CSS, fetch resources, decode assets, or change production authority. `ResolvedRenderTreeV1` plus the current DOM/browser remains the live render path.

## Contracts

| Contract | Purpose | Comparison-critical identity |
| --- | --- | --- |
| `MeasurementSnapshotV1` | Serializable DOM/range/scroll/font/image/container observations | Fixture ID and ZIP hash, surface, environment profile, complete revision vector |
| `DependencyGraphV1` | Property-key vertices and typed downstream edges | Exact fixture, scene version, deterministic node order |
| `InvalidationResultV1` | Direct keys, propagated keys/nodes, refresh sets, export readiness, trace | Input events and dependency graph |
| `SettlementInputV1` | Scene, dependencies, current measurement publication, revision, options | All identities must agree |
| `SettledSceneGraphV1` | Bounds, text, media placement/crop, clip/mask/effect placeholders, readiness, convergence trace | Fixture/hash, surface/profile, source scene version, revision |

## Revision and stale-work rule

The revision vector has package, scene, override, font, asset, container, and epoch counters. Publication requires exact equality in every dimension. Older results are rejected as stale; results for a future state are rejected until that state is the current input. Timestamps never establish currency.

Font activation changes the runtime font revision. A fallback or approved-replacement measurement from the prior revision cannot publish into or overwrite the later exact-face settlement.

## Dependency model

Known changes traverse downstream edges only. The initial graph includes text/font measurement, HUG ancestors, Auto Layout siblings, FILL allocation, parent constraints, image slot/placement/crop, clip/mask/effect extents, diagnostics, and export readiness. Scene revisions and unknown property families use an explicit full-tree safe fallback. Template names, node names, fixture IDs, and hard-coded hierarchies never define an edge.

## Convergence and readiness

The engine uses at most 12 iterations and a 0.001 scene-pixel convergence threshold. Readiness is `ready`, `pending-fonts`, `pending-assets`, `pending-measurements`, `unstable`, or `unsupported`. Unresolved mask ranges and effect semantics remain explicit placeholders. A timeout does not become readiness.

Current DOM bounds are accepted as declared compatibility measurements. That makes current behavior replayable but does not prove that the semantic engine independently predicts all browser geometry. Milestone 4 must reduce those compatibility inputs family by family.

For capability-selected primitives, current settled node bounds are the only live input allowed to change uniform/independent effective radii, clipping, and INSIDE/CENTER/OUTSIDE stroke-path geometry. Source paint/stroke identity stays revisioned separately. Ancestor clip-chain identity comes from canonical source geometry. Browser viewport scaling and measured DOM bounds remain evidence; they cannot feed template-space primitive settlement.

## Current measurement inventory

The machine-readable inventory is `CURRENT_MEASUREMENT_INVENTORY` in `src/template-package/settlement/measurementInventory.ts`:

- renderer HUG/cap-height hook;
- editor field-fit and overflow measurement;
- layout debugger geometry;
- preview container scaling;
- image intrinsic/readiness work;
- fidelity capture stability sampling.

Each entry records trigger, consumer, current stale-work protection, and its Milestone 3 contract destination.

## Environment policy

`chromium-headless` is the approved raster profile. `chromium-visible` is observational and cannot reuse headless pixel references. Geometry may be compared across the two under unchanged tolerances. `synthetic-test` is contract evidence only. `unknown` cannot approve references.
