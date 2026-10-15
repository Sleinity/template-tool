# SDK feature guide

Use this catalogue with [the runnable starter](QUICKSTART.md) and [API guide](API_GUIDE.md). These are current capabilities, not a claim to support every Figma feature. Exact source certification covers the registered Now Hiring, Cover and Carrousel exporter-0.6.1 ZIPs.

## Values and editing

All rows use typed controllers from Browser `/session`, exposed to React through `/editor`. The starter demonstrates setters, rejected mutations, diagnostics and Reset; [field guidance](../field-rules/STUDIO_AND_HOSTS.md) documents configuration recipes.

| Feature | Behavior/API | Limits and example |
| --- | --- | --- |
| Text | `setValue`, `reset`; canonical single-line string | Configured character rules; no silent truncation. Starter Text input. |
| Textarea | Multiline value plus renderer-backed line validation | Line readiness needs current mounted typography/width. Starter Textarea and validation state. |
| Number | Finite canonical number; Core formats configured display | Keep incomplete UI input separate from values; min/max/step/format and Choices. Starter numeric control. |
| Date | Real timezone-free `YYYY-MM-DD` | Use supported date formats; do not parse locale display text back into content. Starter date control. |
| Color | Typed opaque hex input; exact imported paints remain authoritative on default/Reset | Alpha editing is unsupported. Starter custom brand control and palette. |
| Image | `replaceImage`, placement operations and `reset` | One configured Fill/Fit/Crop replacement policy. Imported transform is separate. Starter replacement and center-crop demonstration; hosts build their crop UI. |
| Boolean | Structural visibility controller | Affects dependent layout/participation, not stored child values. Starter checkbox and Reset. |
| Static Choices | `selectChoice` for Text/Textarea/Number/Date/Color | Suggested/restricted modes; stable option identity, configured defaults and correction behavior. Starter choice controls. |

`configure()` accepts atomic field configuration; it does not save it. IDs, types, bindings and imported defaults are not arbitrary authoring inputs. Rejected changes preserve accepted state. Full configuration UX is documented but is not part of the starter's authoring UI.

## Sources and Families

| Feature | Supported seam | Behavior and limits |
| --- | --- | --- |
| ZIP import | Browser `/importer`, `runTemplatePackageImportPipelineV2` | Raw schema 1.0 + exporter 0.6.1 only; ready/blocked/error evidence, explicit disposal. Starter staged import. |
| Family assembly | `/importer`, `appendTemplateSourcesV2` and native Family sessions | Shared canonical content, independent source defaults, sparse variant overrides. Starter multi-ZIP open. |
| Family selection | Native `selectVariant` / `selectOption` and existing Core selection helpers | Preserve shared/absent-field values; explicit selection metadata, no name inference. Starter design selector; authoring recipes in field guidance. |
| Configuration/reimport | Existing native configure and review-first reimport operations | Apply is distinct from Save; incompatible canonical records require reimport, no hidden V1 migration. See V2 integration and field guidance. |

## Rendering, resources and persistence

| Feature | Supported seam | Behavior and limits |
| --- | --- | --- |
| React preview | `TemplateFieldSessionRendererV2`, provider, snapshot/controller hooks | Borrows sessions; editor/static modes are presentation, not selectable rendering engines. Starter mounted preview. |
| Exact fonts | Browser `/fonts` upload/link/preparation, stable managed registry | Verified binary/face identity; system fonts alone do not suffice. Default/explicit-null registry distinction is retained. Starter font correction. |
| Save/restore | Browser `/persistence`, native `save` / `loadSaved` | Current V2 records/assets/fonts; host chooses repository and catalogue. Starter saved list and reopen. |
| Recovery | `/persistence`, template-scoped repository and leases | Fresh/Resume/Discard; token checks reject superseded writers. Starter autosave policy is 650 ms. |
| PNG | Renderer handle `exportPng` | Current field/font/asset/renderer/raster readiness required; not a headless Node renderer. Starter export and cleanup-only Retry. |
| Diagnostics | Import/mutation/readiness evidence and React `/inspection` quality projections | Keep user wording, exporter evidence and technical telemetry separate. Unsupported features stay visible. |
| Advanced inspection | Core/React `/inspection`; checked read-only exports | Evidence is not a new editing authority or production visual owner. See capability inventory. |
| Motion | Core `/motion` and current renderer motion props | Supported channels only; no MP4/video-export promise. See API inventory and compatibility evidence. |

See [operation outcomes](OPERATION_OUTCOMES.md) for each failure boundary and [Studio reuse](STUDIO_REFERENCE.md) for application-level patterns. Hosted catalogues, authentication, cloud synchronization, routing, responsive product design and publishing are host responsibilities.
