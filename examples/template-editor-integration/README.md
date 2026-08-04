# Template editor integration reference

This admin-only React 19 example demonstrates the supported Template Platform
consumer boundary without importing Template Studio.

It uses the public `@sleinity/template-react/importer` five-page setup wizard for
ZIP import, structured package validation, exact-font preparation, render
validation, diagnostics, field-rule setup, confirmation and completion. The
landing view acts as an in-memory dashboard: Add template opens the wizard,
confirmation returns its host-neutral result to the dashboard, and selecting
the new record opens a fresh session through
`loadTemplateImportConfirmation()` without a
backend. After reopening it demonstrates host-owned descriptor-driven content
editing, image replacement with Fill/Fit, imported-state restoration,
browser-local IndexedDB save and explicit reload, revision-bound render
readiness, and silent PNG capture through `exportPng({ download: false })`.
The uppercase action is deliberately host-side preprocessing: it proves the
SDK does not dictate the input interface and accepts the final supported value
through `session.setField()`.

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
permanent-unmount disposal. The same mode mounts three minimal headless
page/modal/drawer compositions to prove independent controller ownership and
StrictMode-safe bindings. These controls are not part of the host integration
recipe.

This example deliberately provides no authentication, collaboration, cloud
persistence or publishing workflow. Its in-memory landing/editor transition is
only evidence that the SDK returns control to the host after confirmation.
