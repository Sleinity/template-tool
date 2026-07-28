# `@sleinity/template-react`

Private Studio-independent React integration exposing the proven
`TemplatePackageRenderer`, composable inspection primitives, and a small runtime
context. It deliberately excludes Template Studio routes, settings, Validate,
Fields, and product editor controls.

For application integration, use `TemplateSessionProvider`,
`useTemplateSessionSnapshot`, and `TemplateSessionRenderer`. The renderer
accepts either provider context or an explicit session, renders host-owned
fallback content until ready, and exposes an imperative `exportPng()` handle.
Export rejects pending or stale render identities instead of capturing an older
session revision.

For inspection surfaces, `TemplateInspectionViewport` owns fit, zoom,
settled-target measurement and non-export overlays while the host owns controls
and stage styling. Its imperative handle exposes `fitTemplate()`, `fitTarget()`,
`zoomBy()` and `getSnapshot()`. `TemplateInspectionPreview` remains available as
an accessible, UI-independent compatibility composition with its existing props.
