# Fallback and Unsupported-Feature Inventory

This is a current-code inventory, not a promise of future support. Detailed entries live in [CAPABILITIES.md](CAPABILITIES.md).

| Feature | Current fallback / behavior | Preservation | Diagnostic evidence | Classification |
| --- | --- | --- | --- | --- |
| Invalid/missing canonical data | Import/validation blocks | Raw source retained by loaded source while session exists | Source and validation diagnostics | Unsupported for rendering |
| Missing/unresolved font | Approved fallback family where configured; otherwise browser/system fallback and export blocker | Font requirement retained | Font readiness and resolved warnings | Approximated / unsupported for deterministic export |
| Delayed font activation | Remeasure on `document.fonts.ready` and `loadingdone` | Font identity retained | No complete browser scenario | Unknown pending audit |
| Mixed text style ranges | Node-level style in resolved path; renderer also has limited range spans when resolved ranges exist | Raw style metadata retained | `resolved-unsupported-mixed-text-styles` | Approximated |
| Text truncation/max lines | Overflow/field-policy checks; no general exact Figma line-clamp contract | Canonical text retained | Field diagnostics | Approximated |
| Unsupported fill (including gradients) | No resolved CSS fill | Paint source retained in resolved unsupported entry | `resolved-unsupported-fill` | Preserved only |
| Multiple fills | First visible solid drives background; additional supported effect is not compositionally reproduced | Fill array retained | Coverage/renderer warnings vary | Approximated |
| Non-solid/gradient strokes | Ignored by solid-stroke model | Canonical stroke retained | Stroke coverage can reveal count mismatch | Preserved only |
| Stroke alignment | Border/inset/centered/outer shadow emulation; static mode may use border | Source alignment retained | Layout/renderer diagnostics | Emulated / approximated |
| Frame clipping | CSS `overflow: hidden` | Clip source retained | Clip data attributes/diagnostics | Emulated |
| Opaque rectangular ALPHA mask with declared relation | One exact affected-node CSS inset clip; source paint excluded from ordinary RGB output | Raw node mask, relation, geometry, transform, paint, provenance, and revisions | Relationship/capability/strategy/clip/paint-role telemetry | Emulated exact subset |
| Partial/transformed ALPHA, luminance/vector/nested masks, malformed relations | Explicit unmasked compatibility; never approximate partial alpha as a hard clip | Raw mask metadata and relationship retained where exported | Specific capability/fallback warnings and developer attributes | Preserved only / unsupported |
| Primitive outside source-certified rectangular subset | Whole primitive stays `compatibility-authoritative`; no duplicate routed CSS/SVG owner | Ordered paints/strokes, geometry, opacity, transform, radii, and revisions retained | Primitive fallback telemetry; user diagnostic only when actionable | Compatibility-owned / fixture-blocked |
| Exporter-only paint such as `SHADER` | Preserved under `extensions.figma.unsupportedPaints` and excluded at source normalization before strict validation | Exact raw paint/index retained | Normalization warning | Preserved only |
| Image CROP without transform | `object-fit: cover` positional fallback | Scale mode retained | `resolved-crop-object-fit-fallback` | Approximated |
| Figma image transform | Object-fit/background crop geometry; matrix retained as provenance, not a full affine sampler | Matrix retained | Image render diagnostics/data attributes | Approximated |
| Image TILE without intrinsic size | Cover fallback | Mode retained | `resolved-tile-metadata-missing` | Approximated |
| Image filters/adjustments | Not reproduced | Raw Figma metadata retained | `resolved-unsupported-image-filters` | Preserved only |
| Explicit STRETCH | CSS `100% 100%` / `object-fit: fill` only for explicit mode/policy | Intent retained | Image resolution metadata | Emulated |
| Unsafe remote or missing asset | Placeholder/diagnostic in preview; export readiness blocks | Asset reference retained | Asset safety/reliability diagnostics | Unsupported for deterministic export |
| SVG/vector | Safe SVG asset or semantic/path rendering; snapshot/unsupported marker otherwise | Asset/path retained | Vector diagnostics | Native / emulated / preserved only by case |
| Boolean/vector geometry without usable path | SVG/raster source if available; otherwise unsupported visual | Node retained | Resolved/vector warning | Preserved only |
| Transform skew or inconsistent local geometry | CSS matrix when usable; snapshot-and-clip fallback for unsafe constraint axes | Raw matrix retained | Constraint/transform data attributes | Approximated |
| Drop/inner shadows | CSS `box-shadow` | Effect source retained | Resolved effect record | Emulated |
| Layer/background blur | CSS `filter` / `backdrop-filter` | Effect source retained | Resolved effect record | Emulated / approximated |
| Blend modes/group compositing | No explicit renderer semantics found | Raw data only if exporter preserves it | No complete current diagnostic found | Preserved only / Unknown pending audit |
| Components/instances | Rendered as ordinary node hierarchy if children/geometry are canonical | Component identity retained in node type/extensions | No complete semantic diagnostic | Preserved only |
| Variables/styles | Resolved literals/tokens may survive; live bindings/modes are not evaluated | Source/token data retained where present | No complete current diagnostic | Preserved only / Unknown pending audit |
| Motion easing/property not supported | Supported transform/opacity subset; unsupported easing/property diagnostics | Raw motion retained | Motion diagnostics | Approximated / preserved only |
| Figma enrichment unavailable | Continue with ZIP package and warning | ZIP data authoritative | Enrichment diagnostics | Supported fallback |
| Dashboard thumbnail unavailable | Loading/placeholder thumbnail | Preview hash/source metadata retained | UI state only | Static fallback |

Unsupported data must remain visible through diagnostics or preserved provenance. Several raw compatibility paths do not yet provide complete audience-specific diagnostics; these gaps belong in Milestones 1–3.
