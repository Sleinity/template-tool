# Scene-Graph Compatibility and Migration Map

## Milestone 7 mask slice

Exporter-declared mask classification/scope and exact opaque rectangular ALPHA lowering are the first migrated mask slice. The package declaration and canonical projection own semantics; the resolved projection owns capability/revision/clip evidence; one renderer branch owns the exact clip. General mask chains, partial alpha, luminance, vectors, nesting, unsupported transforms/paints, and offscreen compositing remain compatibility or preserved-only. The observational `MaskGraphV1` is not promoted wholesale, and ADR 0012 remains Proposed.

## Milestones 7.1–7.2 primitive slice

Canonical geometry/appearance/provenance now feeds `PrimitiveAppearanceV1` for a property-selected rectangular subset. Current settled bounds own uniform/independent edge-local radii and INSIDE/CENTER/OUTSIDE stroke paths; source/paint/stroke revisions remain independent. The compatibility first-solid/mode-specific stroke helpers are bypassed only when this complete primitive route is authoritative. Uniform INSIDE uses DOM/CSS; explicit path cases use one SVG owner. All advanced appearance remains compatibility or observational.

The machine-readable map is `src/template-package/scene/migrationMap.ts`. Milestone 2 does not retire any current helper. Every entry identifies current interpretation locations, current pixel authority, scene destination, compatibility plan, retirement gate, and owning milestone.

Milestone 6.1 migrates media replacement authority into the canonical scene projection: `nodes.*.image.activePlacement` maps to `nodes.*.media.activePlacementState` and `placementRevision`, while source `scaleMode/imageTransform` remain separate candidates. Legacy replacement constraints are compatibility input only and may infer Fill/Fit when an older persisted replacement has no explicit state.

| Area | Current pixel authority | Scene destination | Earliest retirement milestone |
| --- | --- | --- | ---: |
| FIXED/HUG/FILL and Auto Layout | renderer mode plus browser layout | layout/sizing semantics | 4 |
| Constraints | editor constraint helper | layout constraints | 4 |
| Text style/height/wrapping | resolver, renderer, cap-height hook, field measurement | text plus future measurements | 4 |
| Font readiness | FontFaceSet/export sequence | fonts plus future readiness input | 3 |
| Image fit/crop/focal/replacement | resolved image plus renderer branches | media | 5 |
| Clip/masks | clipping helper/rectangular CSS | appearance/relationships | 5 |
| Source-certified rectangular SOLID/uniform radius/INSIDE stroke | `PrimitiveAppearanceV1` singular DOM/CSS owner | ordered appearance plus settled geometry | 7.1 subset complete |
| Isolated certified linear gradient | raw/canonical source-index split | strict source-indexed stops/transform/provenance plus resolved one-inverse geometry | Milestone 7.3A singular SVG owner |
| Eligible multiple-SOLID NORMAL stack | canonical array plus `solid-paint-source-v1` | `ResolvedOrderedSolidStackV1` plus current primitive geometry | Milestone 7.4 singular SVG group/shared clip |
| Other strokes/gradients/fills | mode-specific stroke and first-solid behavior | ordered appearance semantics | future fixture-led |
| Effects/blend/compositing | CSS effects; blends incomplete | ordered appearance/compositing intent | 6 |
| Transform/motion | transform helper plus motion evaluator | transform and motion | 4 |
| Editable fields/defaults | mutated workingPackage and bindings | fields/relationships | 3 |
| Export readiness | validation/assets/fonts/fields plus mounted DOM | future settled readiness | 3 |
| Components/variables/styles | flattened canonical hierarchy/literals | relationships | 7 |
| Vector strategy | resolver plus renderer vector helper | semantic vector/shape | 5 |
| Diagnostics | separate resolver/render/layout/field streams | scene diagnostics/capabilities plus existing audience streams | 3 |

## Migration rules

- A scene family stays observational until an explicit routing ADR and fidelity gate approve a consumer. Milestone 5 extends the bounded core route across live surfaces in ADR 0030; appearance contracts in ADR 0033 remain observational.
- Each helper remains available as a compatibility route until its fixture/edit/resize/export evidence passes unchanged or reviewed references.
- Raw extension reads can be retired only after equivalent scene provenance and semantic values exist for every supported exporter version.
- Browser-derived values move into a versioned settled result in Milestone 3; they do not mutate the canonical scene graph.
- No helper is retired merely because a scene field has the same name.
- Proposed ADR 0010 remains Proposed until one settled graph is actually shared across surfaces.
- Proposed ADR 0012 remains Proposed; the scene contract is backend-neutral and does not imply Canvas/offscreen routing.
- Source-level appearance probes cannot satisfy a retirement gate. A real hash-registered ZIP, reviewed source reference, edits, resize, export, diagnostics, and fallback evidence are still required.
