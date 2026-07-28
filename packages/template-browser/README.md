# `@sleinity/template-browser`

Private browser runtime for TemplatePackage assets, managed fonts, measurement,
persistence, revision-bound readiness, and PNG export. Consumers may replace
the default storage registries through the existing adapter interfaces.

Rendered text-line and visual-fit collection remain browser-owned. They project
DOM measurements into the portable field-fit model without moving DOM, CSS, or
font availability checks into `template-core`.

## Consumer session

`createTemplateSession()` is the supported high-level host contract. It owns a
revision-safe ZIP/import lifecycle, immutable imported baseline, editable
working package, validation, resolved tree, typed fields, and optional save/load
through the existing repository adapter. Asset, managed-font, and repository
adapters are injectable; browser defaults remain offline-capable IndexedDB.

The session exposes `loadZip`, `loadSavedTemplate`, `save`, `setField`, image
replacement/reset/mode operations, full imported-state restore, `getSnapshot`,
`subscribe`, and `dispose`. Older asynchronous imports cannot publish over a
newer operation revision.

Blocked ZIP imports publish ordered structured diagnostics through
`snapshot.diagnostics`, including source layer/origin evidence in each
diagnostic's details. Consumers do not need to run a second core import
preflight before `session.loadZip()`.

PNG export keeps its existing download default. Hosts that pass the returned
PNG to an existing storage or publishing service use
`exportPng({ download: false })` to capture the same ready revision without
initiating a browser download.
