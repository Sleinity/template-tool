# Renderer Fidelity Architecture

## Principles

1. ZIP-first offline data is the source boundary.
2. Exporter variance is normalized before strict canonical validation.
3. Canonical data is durable; resolved data is derived and disposable.
4. Every derived value retains its source and fallback reason.
5. One settled graph should ultimately feed all live previews and exports.
6. Resolution is dependency-driven, not fixture-driven.
7. Browser measurements are explicit inputs to resolution, not silent semantic replacements.
8. Backend routing is capability-based only after evidence demonstrates a need.
9. Optional Figma enrichment happens before persistence or from cache, never during rendering.
10. User diagnostics, exporter diagnostics, and telemetry remain audience-specific.

## Authority model

| Stage | Current authority | Future direction |
| --- | --- | --- |
| ZIP bytes | Uploaded ZIP and its indexed files | Unchanged |
| Source contract | `LoadedTemplatePackageSource.rawTemplateJson` plus bundle files | Explicit source graph with provenance |
| Normalized source | `normalizedTemplateJson` | Typed normalization records |
| Canonical package | Validated/enriched `TemplatePackageV1`; persisted as `workingPackage`, with `basePackage` as imported baseline | Unchanged role |
| Canonical scene semantics | `CanonicalSceneGraphV1` derived from `workingPackage`; bounded core runtime consumer active | Accepted backend-neutral input contract |
| Resolved semantics | `ResolvedRenderTreeV1` from `createResolvedRenderTree` remains current runtime projection | Migrate through the scene graph plus dependency graph after gates |
| Observational settlement | `MeasurementSnapshotV1` + `DependencyGraphV1` -> `SettledSceneGraphV1`; harness only | Candidate future published settled graph after routing gates |
| Core routed geometry | `CoreLayoutSettlementV1` for eligible editor/export properties; compatibility DOM/CSS elsewhere | Expand only after per-family gates |
| Export | Editor-mode offscreen DOM captured by `html-to-image` | Same settled graph as editor and validation |

The current resolved tree is the primary semantic projection, not a complete final authority: renderer helpers still inspect canonical nodes and `extensions.figma`, and HUG measurements mutate DOM styles locally. That split must be consolidated in later milestones without changing accepted behavior accidentally.

## Compatibility boundaries

- Loose exporter input is accepted only by `sourceContract.ts` and `normalizeTemplatePackageBundle.ts`.
- Strict schema and semantic validation begin at `parseTemplatePackage.ts` / `validateTemplatePackage.ts`.
- `extensions.figma` remains a compatibility store used by several runtime helpers; this is documented debt, not the desired endpoint.
- Asset/font registries and persistence provide offline render inputs.
- Figma REST/MCP providers are enrichment-time dependencies only.

See [current architecture](CURRENT_ARCHITECTURE.md), [data flow](DATA_FLOW.md), [property authority](PROPERTY_AUTHORITY.md), and [ADRs](decisions/README.md).

Milestone 3 supplies a separate pure observational settled result with revision-guarded measurements and dependency traces. Milestone 4 adds the smaller production `CoreLayoutSettlementV1` for capability-routed layout/text properties. Proposed ADR 0010 remains Proposed until every live surface and remaining property family can share one result.
