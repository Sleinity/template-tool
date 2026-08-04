# Template editor integration reference

This admin-only React 19 example demonstrates the supported Template Platform
consumer boundary without importing Template Studio.

External hosts should install the SDK through the
[0.7.0 installation guide](../../docs/sdk/INSTALLATION.md). Coding agents can
adapt this example with the
[provider-neutral prompts](../../docs/sdk/AGENT_INTEGRATION_PROMPTS.md); copy
the SDK lifecycle, not this example's in-memory dashboard.

It uses the public `@sleinity/template-react/importer` five-page setup wizard for
ZIP import, structured package validation, exact-font preparation, render
validation, diagnostics, field-rule setup, confirmation and completion. The
landing view acts as an in-memory dashboard: Add template opens the wizard,
confirmation returns its host-neutral result to the dashboard, and selecting
the new record opens a fresh session through
`loadTemplateImportConfirmation()` without a
backend. After reopening it demonstrates the public
`@sleinity/template-react/editor` viewport, editable-field controllers and
diagnostic projection with host-owned content controls, image replacement with
Fill/Fit, imported-state restoration,
browser-local IndexedDB save and explicit reload, revision-bound render
readiness, and silent PNG capture through `exportPng({ download: false })`.
The uppercase action is deliberately host-side preprocessing: it proves the
SDK does not dictate the input interface and accepts the final supported value
through the field controller.

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
