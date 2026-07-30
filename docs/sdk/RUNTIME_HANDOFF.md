# SDK 0.3.0 runtime handoff

Use the fixed-version SDK train in any Sleinity-owned React/TypeScript browser
application:

| Package | Responsibility | Consumer requirement |
| --- | --- | --- |
| `@sleinity/template-core@0.3.0` | ZIP import, strict validation, diagnostics, portable fields and package models | No peer dependencies |
| `@sleinity/template-browser@0.3.0` | Browser session, assets, fonts, persistence, readiness and PNG capture | Browser runtime |
| `@sleinity/template-react@0.3.0` | React provider, setup wizard, renderer, inspection viewport and revision-safe capture handle | React 19 and React DOM 19 |

## Installation

Authenticated local and CI consumers may install directly from GitHub
Packages:

```ini
@sleinity:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

```sh
pnpm add @sleinity/template-core@0.3.0 \
  @sleinity/template-browser@0.3.0 \
  @sleinity/template-react@0.3.0
```

`NODE_AUTH_TOKEN` must be a classic GitHub personal access token with
`read:packages` and package access.

For a credential-free installation, download the three archives and combined
`SHA256SUMS` from the public
[`sdk-v0.3.0` Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.3.0).
The archives are the exact bytes downloaded from GitHub Packages. Verify them,
commit them under `vendor/`, and declare:

```json
{
  "dependencies": {
    "@sleinity/template-core": "file:vendor/sleinity-template-core-0.3.0.tgz",
    "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.3.0.tgz",
    "@sleinity/template-react": "file:vendor/sleinity-template-react-0.3.0.tgz"
  }
}
```

A pnpm consumer must additionally map the private transitive closure to those
same archives:

```yaml
overrides:
  "@sleinity/template-core": "file:vendor/sleinity-template-core-0.3.0.tgz"
  "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.3.0.tgz"
  "@sleinity/template-react": "file:vendor/sleinity-template-react-0.3.0.tgz"
```

Do not add a GitHub Packages `.npmrc`, token, or registry secret to a vendored
consumer.

## Runtime contract

For complete template setup, use `useTemplateImportWizard()` and render
`TemplateImportWizard` from `@sleinity/template-react/importer` with its
`@sleinity/template-react/importer.css` stylesheet. The seven-step workflow
owns ZIP selection, structured package validation, exact-font validation,
renderer-backed validation, field rules and confirmation. Handle the immutable
completion result through existing host services; it does not publish or
navigate automatically.

Hosts that need their own page, modal, drawer or workspace UI use
`TemplateImportWizardProvider`, `useTemplateImportWizardSnapshot` and
`TemplateImportWizardPreview`, or the framework-neutral
`createTemplateImportWizard()` controller from `template-browser`. Optional
font and post-confirmation persistence adapters remain host-owned and cannot
bypass SDK validation.

After import, use `createTemplateSession()` when the host explicitly owns the
editor lifecycle. In React, prefer `useTemplateSession()` for StrictMode-safe
creation and permanent-unmount disposal. Compose it with:

- `TemplateSessionProvider`
- `useTemplateSessionSnapshot()`
- `TemplateSessionRenderer`
- `TemplateSessionRendererHandle`

Call `session.loadZip()` once, or use `session.loadTemplateState()` to open a
host-retained confirmed baseline and working package in a fresh session. The
snapshot publishes lifecycle status,
validation, ordered diagnostics, editable fields, base and working packages,
resolved state, and revisions. Mutate fields and images through the session,
reset individual fields, or restore all imported state.

The host owns every content control and may perform richer validation,
transformation, cropping, or other processing before calling the supported
session mutation methods. The SDK validates the final supported value and
renders the resulting revision faithfully.

Default browser-local persistence uses `session.save()` and
`session.loadSavedTemplate()`. Store only the returned saved-template ID in
namespaced local storage. Shared/cloud persistence belongs to an injected
adapter or an existing host service.

Export only when the current session revision has a ready render identity.
`exportPng({ download: false })` returns the revision-safe PNG and metadata
without initiating a browser download.

The SDK owns import, validation, diagnostics, editable state, local
persistence, rendering, readiness, and capture. The host owns navigation,
authentication, catalogues, collaboration, cloud storage, publishing, and
other product workflows.

## Lovable Business recipe

Lovable Business uses the vendored-archive installation above, so no build
secret is required. Follow the
[sequential Lovable template editor prompts](LOVABLE_TEMPLATE_EDITOR_PROMPTS.md).
They first prove the isolated SDK boundary, then connect only to existing host
services.

## Verification contract

The release gate:

- downloads the published archives and verifies one checksum manifest;
- installs all three as secret-free npm and pnpm `file:vendor/...`
  dependencies;
- copies the committed
  [template editor reference](../../examples/template-editor-integration/README.md)
  into an isolated packed consumer;
- browser-tests invalid and valid import, rejected and exact font uploads,
  explicit emoji fallback, automatic exact-face reuse, validation, diagnostics, field-rule and image setup,
  downstream field/image editing, Fill/Fit/reset, offline save/reload,
  stale-export rejection, silent PNG capture, and permanent disposal;
- rejects external runtime requests, browser downloads, console errors,
  workspace aliases, root-source imports, Studio code, and credentials.

Package publication runs only for an exact `sdk-v*` tag. Manual workflow
dispatch may refresh handoff assets from an already-published fixed version,
but cannot publish packages.

The package manifests remain `UNLICENSED`. The `sleinity-tools-only` policy
authorizes use in Sleinity-owned applications only.
