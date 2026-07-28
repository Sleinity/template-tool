# Narrowcasting integration reference

This admin-only React 19 example demonstrates the supported Template Platform
consumer boundary without importing Template Studio.

It covers ZIP import, validation and diagnostics, descriptor-driven field
editing, image replacement with Fill/Fit, imported-state restoration,
browser-local IndexedDB save and explicit reload, revision-bound render
readiness, and silent PNG capture through `exportPng({ download: false })`.

The `onTemplateExportReady` callback is the only intended connection to a host
narrowcasting product. A real host converts the returned data URL to its
existing media-upload input and continues through its normal campaign,
playlist, distribution, and playback services. The screen player does not need
the Template Platform packages to display the resulting PNG.

Run it from the repository root:

```sh
pnpm --filter @sleinity/template-narrowcasting-integration dev
```

The release acceptance copies this committed example into an isolated
temporary project, installs locally packed archives instead of workspace
dependencies, and runs its complete Chromium lifecycle:

```sh
pnpm narrowcasting:acceptance
```

The `?acceptance=1` controls exist only to prove stale-export rejection and
permanent-unmount disposal. They are not part of the host integration recipe.

This example deliberately provides no authentication, cloud persistence,
media upload, campaign selection, scheduling, or screen playback.
