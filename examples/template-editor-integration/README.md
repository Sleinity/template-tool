# Template editor integration reference

This admin-only React 19 example demonstrates the supported Template Platform
consumer boundary without importing Template Studio.

It covers ZIP import, validation and diagnostics, descriptor-driven field
editing, image replacement with Fill/Fit, imported-state restoration,
browser-local IndexedDB save and explicit reload, revision-bound render
readiness, and silent PNG capture through `exportPng({ download: false })`.

The `onTemplateExportReady` callback is the intended boundary to host-owned
catalogue, cloud-storage, or publishing services. The SDK does not own those
product workflows.

Run it from the repository root:

```sh
pnpm --filter @sleinity/template-editor-integration dev
```

The release acceptance copies this committed example into an isolated
temporary project, installs locally packed archives instead of workspace
dependencies, and runs its complete Chromium lifecycle:

```sh
pnpm template-editor:acceptance
```

The `?acceptance=1` controls exist only to prove stale-export rejection and
permanent-unmount disposal. They are not part of the host integration recipe.

This example deliberately provides no product navigation, authentication,
catalogue, collaboration, cloud persistence, or publishing workflow.
