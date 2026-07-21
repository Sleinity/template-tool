# Source-to-Scene Mapping Inventory

The machine-readable registry is `src/template-package/scene/sourceToSceneMapping.ts`. It records a stable ID, feature family, raw paths, canonical path, scene destination, current resolved destination, current consumers, authority ID, mapping strategy, and limitation.

## Coverage summary

| Family | Source/canonical evidence | Scene destination | Current compatibility debt |
| --- | --- | --- | --- |
| Identity/order | node ID/name/type/parent/children | `identity` | None for current fixtures |
| Layout/sizing | canonical layout/sizing plus raw participation/min/max/gaps | `layout` | resolver, layout-role, constraints, renderer and browser all interpret |
| Constraints | positioning constraints plus raw Figma constraints | `layout.constraints` | live editor helper remains pixel authority |
| Bounds | absolute and relative bounds | `geometry` | static snapshot versus editor settlement |
| Transforms | raw matrices, rotation, origin | `transform` | CSS decomposition and motion remain runtime-specific |
| Text/fonts | detailed/legacy text, ranges, font requirements/assets | `text`, graph `fonts` | text helper, resolver, DOM measurement and export readiness differ |
| Vertical text trim | canonical `text.leadingTrim`; raw `extensions.figma.leadingTrim` provenance | `text.leadingTrim` | `CAP_HEIGHT` routes to exact-metric cap-to-baseline settlement; unknown/mixed metric modes fall back coherently |
| Images | node, image paint, field policy, hint, asset | `media` | resolver and two renderer branches remain |
| Paint/stroke/effect/blend | ordered canonical arrays plus extension metadata | `appearance` | gradients/blends unsupported; strokes/effects approximated |
| Clip/mask | canonical clip, optional `node.mask`, package `maskRelationships`, legacy raw mask flags/order | `appearance.clipping`, node relationship and graph `maskRelationships` | crop-3 exact opaque rectangular ALPHA subset routed; other mask families compatibility-owned |
| Vectors/shapes | vector payload, shape, asset | `geometry.vector/shape` | resolver and renderer helper select backend strategies |
| Editable fields | ordered registry and node targets | graph fields and relationships | mutation and clear/default ambiguity remains |
| Motion | canonical raw/linking | graph `motion` | time evaluation remains runtime-only |
| Components/variables/styles | node identity and extension metadata/literals | `relationships` | preserved, not evaluated |
| Enrichment | renderer hints, verification/source evidence | graph hints and provenance | optional, lower precedence, offline at render time |
| Diagnostics/unknown | canonical diagnostics and raw extensions | diagnostics, provenance, unmapped report | audiences remain separate |

## Unmapped rule

The transformer does not silently drop a key absent from the registry. It emits a deterministic `SceneUnmappedProperty` with node ID, exact source path, key/value, and preservation path. Current registered fixtures have zero unmapped keys after auditing their known extension properties. This does not prove that future exporter versions cannot introduce new keys; snapshot/validation runs must surface them.

## Evidence boundary

“Mapped” means the source value has an explicit scene destination or provenance destination. It does not mean the current renderer reproduces the feature. Runtime support remains classified in [Capabilities](CAPABILITIES.md), and migration ownership is in [Scene migration](SCENE_MIGRATION.md).
