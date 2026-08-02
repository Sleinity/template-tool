# Canonical Scene Graph V1

## Mask relationship projection

Milestone 7 adds optional `maskRelationships` without making the whole scene settled. Each relation records source, parent, ordered affected siblings, mask type, termination, status, capability, render strategy, paint role, confidence, source paths, raw provenance, and deterministic revision. Source geometry, transform, opacity, and ordered paints remain on the canonical node and are referenced explicitly. `isMask=false`, `maskType` alone, names, IDs, and older extension-only hints never create a source-certified range.

Status: implemented in Milestone 2; Milestone 4 adds a bounded capability-routed core layout/text consumer.

Milestone 6.1 extends each media section with `activePlacementState` and `placementRevision`. These are semantic editor-authority values derived from strict working-package data; imported `scaleMode` and `imageTransform` remain separate immutable source candidates. No DOM geometry, asset decode, or crop-tool interaction state enters the canonical scene.

## Boundary and authority

`CanonicalSceneGraphV1` is a deterministic, versioned semantic projection of the validated/enriched `workingPackage`. It sits conceptually between `TemplatePackageV1` and renderer-specific resolution:

`workingPackage -> CanonicalSceneGraphV1 -> capability route -> intrinsic measurement -> core layout settlement`

The current application executes only the Milestone 4 core subset of that path. `ResolvedRenderTreeV1`, canonical nodes, raw Figma compatibility helpers, browser layout, and DOM measurement remain the visual and fallback render path. The scene graph is not a settled graph and does not accept browser measurements, CSS, DOM nodes, React elements, decoded images, or network results.

Code contract: `packages/template-core/src/scene/types.ts`. Transformer: `createCanonicalSceneGraph.ts`. Validation: `validateCanonicalSceneGraph.ts`. Stable serialization: `serializeCanonicalSceneGraph.ts`. The former root scene paths are behavior-free repository forwarders.

## Graph shape

The graph contains:

- exact source package identity, package version, root ID, canvas, and source/plugin metadata;
- deterministic depth-first node order followed by any disconnected canonical nodes in package insertion order;
- nodes keyed by unchanged source IDs;
- canonical assets, editable fields, font requirements/resolution metadata, motion source/linking, renderer hints, and source diagnostics;
- graph-wide capability records, transformation diagnostics, and unmapped-property reports;
- a legacy compatibility marker, `runtimeUse: disabled-observational`, retained in V1 serialization so approved scene snapshots do not change merely because a downstream consumer was added. Runtime eligibility lives in `CoreLayoutRouteV1`.

Each node has the required semantic sections:

| Section | Contents |
| --- | --- |
| Identity | source ID, name/type, parent, children, child order, stacking index |
| Layout | positioning, Auto Layout semantics, axis sizing, constraints, raw participation evidence |
| Transform | raw relative/ordinary matrices, rotation, origin, opacity |
| Geometry | absolute/relative source bounds, semantic shape data, vector payload |
| Text | characters, font identity, metrics intent, alignment, resize, source-owned `leadingTrim`, runs, explicit measurement inputs |
| Media | asset, fit/crop transform, focal/replacement intent, intrinsic metadata, aspect-ratio rule |
| Appearance | ordered fills/strokes/effects, opacity/blend, corners, clipping and mask intent |
| Relationships | assets, fields, mask relationship, component/instance, variables, styles |
| Capability | support classification, strategy, fallback, audience, confidence |
| Provenance | canonical path, raw Figma extension, renderer hint, diagnostics, mapped/unmapped keys |

## Property evidence

Important values use `SceneProperty<T>`, which records:

- selected semantic value and authority;
- every material candidate and source path;
- raw/canonical/enrichment/user/fallback provenance;
- confidence, conflict, ambiguity, and safe fallback.

The transformer does not erase a losing candidate. Current raw Figma compatibility data remains under node provenance even after a canonical value is selected. Known source keys are registered in `sourceToSceneMapping.ts`; genuinely unknown keys produce `unmappedProperties` entries that point back to their preservation path.

Callers may supply `basePackage` as transformation context. When a supported working value differs, the scene marks `user-working-package` as selected authority and retains the imported baseline candidate. Without that context the graph remains valid, but emits an explicit diagnostic that imported-versus-user provenance cannot be distinguished.

## Accepted precedence in the scene contract

These rules define the semantic contract. Milestone 4 consumes only its proven core subset; other runtime helpers remain compatibility-owned:

1. Current validated `workingPackage` values are canonical and include user edits.
2. Explicit canonical node semantics beat raw Figma extension candidates.
3. Raw Figma data may fill a missing canonical semantic value only with `figma-extension` authority and provenance.
4. Optional renderer/enrichment hints may fill an absent node/paint value but do not replace explicit canonical data.
5. Image asset: node, then image paint, then renderer hint, then missing.
6. Image fit: active explicit replacement policy, then node, paint, hint, asset, then aspect-preserving `FILL`.
7. Explicit `STRETCH` alone permits distortion. `FILL` and `CROP` cover; `FIT` contains.
8. Canonical layout/appearance clipping wins; raw `clipsContent` remains a compatibility candidate.
9. Browser measurement is declared as a future input when semantic intent requires it; it is never performed or substituted by the transformer.
10. Unresolved masks, components, variables, styles, blends, and unsupported paints are preserved and classified rather than assigned invented behavior.
11. `text.leadingTrim=CAP_HEIGHT` maps explicitly to cap-height-to-baseline at the runtime boundary; absence/`NONE` retains the normal line box and unknown modes remain compatibility-owned.

The complete machine-readable matrix is `propertyAuthority.ts`; the human inventory remains [Property authority](PROPERTY_AUTHORITY.md).

## Validation

Validation checks version/contract, root and parent/child integrity, source order, unique IDs, finite non-negative geometry, sizing modes/ranges, asset/field references, mask uncertainty, provenance, and JSON round-trip serialization. Warnings preserve unsupported or unresolved semantics; only structural contract violations make the graph invalid.

## Determinism and idempotency

The transformer:

- never mutates the package;
- preserves IDs and ordering;
- performs no DOM, CSS, font measurement, image decoding, network access, or time evaluation;
- returns byte-stable stable-serialized output for identical input;
- produces the same semantic output for imported defaults and an equivalent edited `workingPackage` state.

## Deliberate exclusions

This graph contains semantic intent, not final pixels. It deliberately excludes live widths/heights, line boxes, cap-height results, flex allocations, decoded intrinsic state, resolved network URLs, CSS strings as authority, export readiness, overlay/debug nodes, and a settled dependency version. Those belong to Milestone 3 or later and must not be smuggled into V1 as unversioned mutations.

## Current fixture evidence

All four registered fixtures produce valid deterministic snapshots with zero known fixture source keys left unmapped. They still contain many mapped raw Figma dependencies, proving migration work remains. Equivalence reports explicitly set `pixelEquivalenceClaimed: false` and enumerate browser-only/export-only state.

See [scene evidence tooling](SCENE_GRAPH_HARNESS.md), [source mapping](SOURCE_TO_SCENE_MAPPING.md), and [migration map](SCENE_MIGRATION.md).
