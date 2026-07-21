# Core Surface Convergence

## Phase 13 mode identity

All live surfaces are under one global internal rollout preference. Each renderer resolves the same requested/effective mode and persistence identity against its current package/backend revision. Explicit Legacy, Semantic, and Compare map consistently across Validate, Fields, editor, live inspection/review, and hidden PNG; Compare never adds another rendered template. Missing preference preserves the historical surface defaults, which is an intentional compatibility rule rather than an automatic Semantic migration.

Phase 11 adds a shared backend-decision revision to the resolved tree used by Validate, Fields, editor, previews, and hidden PNG. This aligns owner identity across surfaces but does not create one shared post-measurement instance; ADR 0010 remains Proposed. Surface overlays and capture treatment may still differ without changing template-space backend ownership.

Milestone 5 applies `CoreLayoutSettlementV1` geometry to every live surface that uses `TemplateInspectionPreview`, while preserving the renderer's static presentation mode for compatibility-owned appearance. Editor and hidden PNG were already authoritative.

| Surface | Component | Core geometry | Compatibility appearance | Settlement instance |
| --- | --- | --- | --- | --- |
| Validate | `TemplateInspectionPreview` | authoritative when routed | static/resolved | surface-local |
| Fields | `TemplateInspectionPreview` | authoritative when routed | static/resolved | surface-local |
| Import/review diagnostic preview | `TemplateInspectionPreview` | authoritative when routed | static/resolved | surface-local |
| Editor | `TemplatePackageRenderer` | authoritative when routed | editor/resolved | surface-local |
| Hidden PNG | `TemplatePackageRenderer` | authoritative when routed | editor/resolved | surface-local |

Inspection cut-outs and outlines read the rendered target box only to align non-exported UI. For authoritative `CAP_HEIGHT` text they select the explicit Figma trimmed box rather than the browser line box, flex wrapper, scroll height, or glyph overhang. Layout, line, trim, glyph, and clip boxes remain separate developer telemetry. Overlay measurement is not published as semantic geometry and cannot reach export. Every renderer continues to derive a content-addressed settlement independently; therefore this is geometry convergence, not the single shared settled instance proposed by ADR 0010.

Milestone 5.2 verifies paint convergence in addition to box convergence. Validate, Fields, editor and hidden PNG expose the same semantic wrapper, browser paint offset, first cap top, final baseline, exact-font revision and settlement identity. Inspection outlines remain the semantic box; glyph overhang remains paint-only telemetry.

Milestone 5.3 verifies face-link convergence through the production workflow. The exact binary is uploaded once per requirement, persisted, restored, and registered under the same hash-derived private family on all surfaces. Each surface records the requested human family, binary hash, face index, exact classification, private/computed family, paint-range width, and exact measurement state.

The approval audit additionally verifies the actual exported raster. Because `html-to-image` clones the renderer into an SVG document, PNG capture embeds exact linked private binaries explicitly; otherwise dynamic `FontFace` registrations disappear at the clone boundary. Replacement/fallback profiles keep the prior automatic font-discovery path. Final repeated Validate, Fields, editor, and PNG captures are byte-identical per surface, and the exact-font comparison passes 4/4.

Unsupported families retain coherent subtree fallback. `CoreLayoutRouteV1.circularDependencies` now records FILL-inside-HUG axis, classification, parent/child IDs, reason code, and fallback chain. The route does not solve the cycle, inspect identity, or broaden tolerance.

Milestones 7.1–7.2 migrate only the exact rectangular primitive subset. Validate, Fields, editor, review/import live previews, and hidden PNG publish the same primitive source/geometry/paint/stroke revisions, DOM/SVG backend, capability, raw/effective radii and scales, path bounds, ancestor clip chain, and fallback. Inspection scale can create fractional measured-bound noise; it cannot alter template-space contract identity or exported pixels.

Milestone 7.3A adds the same convergence evidence for eligible isolated linear gradients: raw matrix, determinant, one inverse, normalized/template handles, stop order/alpha, paint opacity, SVG transform, source/geometry revisions, and singular owner are identical across Validate, Fields, editor, and hidden PNG. Both registered gradient fixtures are exact across repeated captures; source/PNG comparison is 3 pixels for the nine-case fixture and exact for paint opacity. The candidates remain unapproved.

Milestone 7.4 publishes one ordered-SOLID source/geometry/stack identity, ordered paint identities, effective alpha, current corner geometry, shared clip revision, and singular SVG owner across Validate, Fields, editor, and hidden PNG. All six target regions are source-exact and repeat twice. Headless and visible save/reload preserve the same identity offline. The 24 candidates remain unapproved.

Evidence commands:

- `pnpm fidelity:compare`
- `pnpm runtime-routing:fonts`
- `pnpm runtime-routing:stage4a`
- `pnpm runtime-routing:scenarios`
- `pnpm fidelity:source-authoritative`
- `pnpm primitives:source-evidence`
- `pnpm primitives:stroke-source-evidence`
- `pnpm primitives:browser-scenarios`
- `pnpm gradients:source-evidence`
- `pnpm gradients:browser-scenarios`

Approved references are never modified by these commands.
