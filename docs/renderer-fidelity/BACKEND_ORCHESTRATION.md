# Backend Orchestration Contract

> Active MVP product path: ADR 0071 feeds these decisions directly to renderer owner gates. No rollout wrapper filters or selects them. Compatibility is a decision-owned capability fallback, not a selectable Legacy renderer.

## Purpose

Phase 11 consolidates the backend decisions already produced by layout, primitive, gradient, ordered-paint, media, vector, mask, and compatibility resolvers. It does not replace those proven family contracts and does not add a rendering backend or feature family.

`ResolvedBackendDecisionV1` is the node-level orchestration record attached to every `ResolvedRenderNode`. It is derived only from resolved family decisions and current revisions. Renderer components consume its owner records before activating the corresponding stable DOM/CSS or SVG implementation.

Phase 13 adds `ResolvedRendererRolloutDecisionV1` as a mode-aware wrapper. Family resolvers still produce semantic and compatibility candidates; the wrapper selects the final visible owner set according to the persisted internal mode. The renderer receives the filtered decisions and never reads persistence directly.

## Contract

Each decision records:

- one selected backend: DOM/CSS, SVG, combined DOM/SVG, compatibility, raster fallback, or unsupported;
- a primary runtime owner plus an ordered set of family owners;
- required capability IDs and the repository support taxonomy;
- explicit fallback state, reason codes, and explanation;
- editability, export safety, confidence, and node/subtree scope;
- source, resolved, geometry, asset, placement, and future settlement revisions;
- references to unavailable alternative backends.

It also records one explicit disposition: `semantic-owner`, `established-compatibility-owner`, `degraded-fallback`, `preserved-only`, or `unsupported`. Compatibility names the implementation class; it does not by itself mean that fidelity authority was lost. `fallback.active` is reserved for a rejected preferred owner, placeholder/raster fallback, preservation-only output, unsupported semantics, or relevant unresolved source evidence.

`ResolvedRenderTreeV1.backendDecisionRevision` binds the complete ordered decision set. `ResolvedBackendAvailabilityV1` records Canvas/offscreen and WebGL as unavailable with their intended capability boundaries once per tree. This avoids per-node policy duplication. ADR 0012 remains Proposed.

## Existing owners registered

| Family | Existing resolved authority | Backend owner |
| --- | --- | --- |
| Core layout | `CoreLayoutRouteV1` and `CoreLayoutSettlementV1` | `core-layout` on DOM/CSS, with coherent compatibility boundaries |
| Text | resolved text, font, measurement, trim, and editing contracts | `text-dom` on DOM/CSS |
| Ordinary primitive | `PrimitiveAppearanceV1` | `primitive-dom-css` or `primitive-svg` |
| Linear gradient | `ResolvedLinearGradientGeometryV1` | `linear-gradient-svg` |
| Ordered SOLIDs | `ResolvedOrderedSolidStackV1` | `ordered-solid-svg` |
| Ordered SOLID + linear gradient | `ResolvedOrderedNormalPaintStackV1` | `ordered-normal-paint-svg` |
| Media | `ResolvedRenderImage` and placement contracts | `media-dom` |
| Vector | `ResolvedRenderVector` | `vector-svg` or preserved compatibility; an omitted source mode may infer `SVG_ASSET` only from a resolved vector asset and records `asset-evidence` provenance |
| Exact rectangular mask | resolved mask relationship | `mask-css-clip` |
| Other current appearance | resolved compatibility projection | `legacy-dom-css` |
| Missing/unrenderable source | resolved fallback reason | `fallback-placeholder` |
| Unsupported semantics | preserved source and diagnostics | `unsupported-preservation` |

The selected node backend may be `dom-svg` when independently resolved owners compose DOM/CSS layout with SVG appearance. This is one orchestration decision, not duplicate pixel ownership.

## Runtime consumption and revision safety

`TemplatePackageRenderer` consumes the central decision for primitive, media, vector, mask-clip, and fallback activation. It continues to call proven family geometry helpers after the owner has been selected; those helpers do not select a competing top-level owner. Existing primitive and mask tree stale guards recompute the complete resolved tree and therefore its backend decisions.

The decision revision is routing identity, not a pixel hash. Text content changes that do not change backend eligibility need not change the backend decision. Media replacement authority, primitive source changes, asset identity, and family route changes do.

Validate, Fields, editor, shared live previews, and hidden PNG receive the same resolved tree construction path and publish decision IDs through the canvas's non-export runtime telemetry object. Existing comparison-critical DOM attributes remain unchanged so the infrastructure milestone does not require structural-reference promotion. Persistence serializes the canonical package; restoring it deterministically reconstructs the same decisions without Figma or network access.

Historical rollout wrappers do not participate in the product path after ADR 0071. The unfiltered backend decision is consumed automatically on every surface.

## Deferred boundary

Canvas/offscreen is represented but unavailable for effects, advanced compositing, complex masks, and reviewed raster fallback. WebGL is represented but unavailable for shader paints and advanced compositing. No current node routes to either backend. The one ADR 0072 SOLID-below-linear NORMAL pair is a source-certified singular SVG owner, not a general compositing engine. Other mixed paint stacks, new gradient families, node/group opacity, effects, advanced masks, and non-NORMAL blending remain compatibility or unsupported.

Historical cohort evidence remains auditable but inert. No preference or cohort record may alter this contract.
