# SDK 0.7.0 runtime handoff

Use the fixed-version SDK train in any Sleinity-owned React/TypeScript browser
application:

| Package | Responsibility | Consumer requirement |
| --- | --- | --- |
| `@sleinity/template-core@0.7.0` | ZIP import, strict validation, diagnostics, portable fields, package models and optional advanced inspection | No peer dependencies |
| `@sleinity/template-browser@0.7.0` | Browser session, assets, fonts, persistence, readiness, capture and enrichment | Browser runtime |
| `@sleinity/template-react@0.7.0` | React setup wizard, headless host-editor bindings, renderer, responsive viewport and capture | React 19 and React DOM 19 |

## Installation

Authenticated local and CI consumers may install directly from GitHub
Packages:

```ini
@sleinity:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

```sh
pnpm add @sleinity/template-core@0.7.0 \
  @sleinity/template-browser@0.7.0 \
  @sleinity/template-react@0.7.0
```

`NODE_AUTH_TOKEN` must be a classic GitHub personal access token with
`read:packages` and package access.

For a credential-free installation, download the three archives and combined
`SHA256SUMS` from the public
future `sdk-v0.7.0` Release.
The archives are the exact bytes downloaded from GitHub Packages. Verify them,
commit them under `vendor/`, and declare:

```json
{
  "dependencies": {
    "@sleinity/template-core": "file:vendor/sleinity-template-core-0.7.0.tgz",
    "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.7.0.tgz",
    "@sleinity/template-react": "file:vendor/sleinity-template-react-0.7.0.tgz"
  }
}
```

A pnpm consumer must additionally map the private transitive closure to those
same archives:

```yaml
overrides:
  "@sleinity/template-core": "file:vendor/sleinity-template-core-0.7.0.tgz"
  "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.7.0.tgz"
  "@sleinity/template-react": "file:vendor/sleinity-template-react-0.7.0.tgz"
```

Do not add a GitHub Packages `.npmrc`, token, or registry secret to a vendored
consumer.

## Focused and advanced entries

Ordinary hosts can use the existing root, session, importer, compatibility,
and React contracts. Focused integrations may additionally import core
`editor`/`assets`/`fonts`/`motion`, browser
`assets`/`fonts`/`persistence`/`capture`/`enrichment`, plus
`@sleinity/template-core/inspection` and
`@sleinity/template-react/inspection`. Inspection entries expose technical evidence and
projections; they are optional and do not select rendering authority.

Do not import `renderer-internal`. Studio-only debug components, stress
reports, visual-difference tooling, issue packets, and development harnesses
are not shipped as SDK APIs.

## Runtime contract

For complete template setup, use `useTemplateImportWizard()` and render
`TemplateImportWizard` from `@sleinity/template-react/importer` with its
`@sleinity/template-react/importer.css` stylesheet. The default interface presents
Package, Fonts, Validate, Fields and Confirm while the seven-state headless workflow
owns ZIP selection, structured package validation, exact-font validation,
renderer-backed validation, atomic field rules and confirmation. Shared
validation-summary and field-editor components are available from the same
importer entry for custom shells. Handle the immutable
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

For ordinary post-confirmation editors, prefer the curated
`@sleinity/template-react/editor` entry:

- `TemplateSessionViewport` contains and refits the intrinsic renderer,
  publishes current-revision readiness and performs safe PNG capture;
- `useTemplateSessionEditableFields()` returns every ordered field controller;
- `useTemplateSessionEditableField(fieldId)` selects one controller or `null`;
- `useTemplateSessionDiagnosticSummary()` consolidates existing package, font,
  asset, session and current renderer evidence without validating again.

These primitives are headless. Hosts still own their forms, image preparation,
layout, navigation and product actions.

Run `inspectTemplateRuntimeSupport()` before presenting template workflows.
After confirmation, create a fresh session and reopen the host record with
`loadTemplateImportConfirmation()`. It verifies confirmation schema, package
identity, FNV fingerprint, SHA-256 digest and local font authority before
delegating to the session's fresh `loadTemplateState()` rebuild. The snapshot
publishes lifecycle status,
validation, ordered diagnostics, editable fields, base and working packages,
resolved state, and revisions. Mutate fields and images through the session,
reset individual fields, or restore all imported state.

Zero-routed compatibility templates may complete Render Validation through the
existing package, exact-font, asset, DOM, revision and export-safety checks;
routed templates still require current settlement. Invalid field-rule drafts
remain visible with structured blockers and never replace the last valid
working package. Device emoji fallback remains internal evidence and is not
presented as actionable setup guidance.

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

Use only the documented root and curated entry points above. Entries named
`renderer-internal` are fixed-train repository seams for package composition
and compatibility forwarders; they are not supported host APIs and must not be
imported by an application.

## Lovable Business recipe

Lovable Business uses the vendored-archive installation above, so no build
secret is required. Follow the
[sequential Lovable template editor prompts](LOVABLE_TEMPLATE_EDITOR_PROMPTS.md).
They first prove the isolated SDK boundary, then connect only to existing host
services.

Hosts upgrading from the hand-built 0.2.2 setup flow should follow the focused
[0.7.0 migration guide](SDK_0_7_MIGRATION.md). Adopt the SDK wizard for import
and confirmation, then reopen the host-owned confirmation in a fresh session;
retain existing dashboard, editor, image, storage, and export workflows.

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

Before that final tag, `pnpm release-candidate:create` creates a local,
credential-free candidate containing the archives, checksums, handoffs,
migration guide and [first-host acceptance checklist](FIRST_HOST_ACCEPTANCE.md).
Those local bytes are trial inputs only. Final Release assets are always
downloaded back from GitHub Packages after successful publication.

The package manifests remain `UNLICENSED`. The `sleinity-tools-only` policy
authorizes use in Sleinity-owned applications only.
