# `@sleinity/template-react`

Private Studio-independent React integration exposing the proven
`TemplatePackageRenderer`, composable inspection primitives, and a small runtime
context. It deliberately excludes Template Studio routes, settings, Validate,
Fields, and product editor controls.

For application integration, use the StrictMode-safe `useTemplateSession`,
`TemplateSessionProvider`, `useTemplateSessionSnapshot`, and
`TemplateSessionRenderer`. The owned-session hook creates one active browser
session and disposes it after permanent unmount without letting React's
development effect replay dispose the live instance. The renderer
accepts either provider context or an explicit session, renders host-owned
fallback content until ready, and exposes an imperative `exportPng()` handle.
Export rejects pending or stale render identities instead of capturing an older
session revision. Pass `{ download: false }` when the host needs the PNG result
without a browser download.

For inspection surfaces, `TemplateInspectionViewport` owns fit, zoom,
settled-target measurement and non-export overlays while the host owns controls
and stage styling. Its imperative handle exposes `fitTemplate()`, `fitTarget()`,
`zoomBy()` and `getSnapshot()`. `TemplateInspectionPreview` remains available as
an accessible, UI-independent compatibility composition with its existing props.
