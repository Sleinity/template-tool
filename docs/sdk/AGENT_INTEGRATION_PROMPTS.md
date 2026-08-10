# Agent prompts for SDK 0.8.0 integration

These provider-neutral prompts work with coding agents such as Codex, Lovable,
Cursor and Claude. Use only the tracks the host needs. Give an agent one prompt
at a time and review its changed files, test evidence and blockers before
continuing.

Before selecting a track, give the agent the copyable context in the
[SDK capability catalog](SDK_CAPABILITIES.md). The catalog explains all
supported entry points, components, headless alternatives, diagnostics and
examples; these prompts then implement the selected path.

The SDK owns template ZIP import, validation, diagnostics, editable session
state, browser-local persistence, rendering, readiness and PNG capture. The
host owns navigation, forms, authentication, image processing, cloud storage,
catalogues and publishing.

## Track 1 — audit without changing the host

```text
Audit this React/TypeScript application for Template Platform SDK 0.8.0.
Do not modify files, dependencies or configuration.

Report the package manager and lockfile, React/React DOM versions, routing,
StrictMode, CSP, browser targets, existing upload/form/editor patterns, and
existing authentication, storage, catalogue and publishing services.

Identify which adoption path fits:
1. core-only ZIP import and validation;
2. headless browser importer/session;
3. SDK React importer and headless editor primitives;
4. additive Template Families for shared content across ZIP variants;
5. adaptation of the single-template or family reference example.

React integrations require React 19. Stop and report upgrade impact if the
host is on an older version. Do not propose imports from Studio, repository
source, package src directories or an entry named renderer-internal.
```

## Track 2 — install verified archives

Copy the three archives and `SHA256SUMS` from the public `sdk-v0.8.0` Release
into `vendor/` before giving the agent this prompt.

```text
Install the checksum-verified Template Platform 0.8.0 archives already in
vendor/. Follow the supplied SDK-INSTALLATION.md exactly.

Use the repository's existing package manager, update its lockfile, and pin all
three SDK packages to the local 0.8.0 archives. For pnpm, add exact overrides
for the complete private package closure. Do not add registry configuration,
GitHub credentials, Git dependencies or workspace/source aliases.

Run the existing typecheck and production build. Report installed versions,
changed files, dependency conflicts and results before implementing SDK UI.
```

## Track 3 — core-only importer

```text
Add a host-owned ZIP selection flow using importTemplatePackage from
@sleinity/template-core.

Read the selected File as an ArrayBuffer and pass its filename. Accept the
result only when importable is true and workingPackage exists. Present source
diagnostics and strict validation when blocked. Preserve the imported baseline,
working package, source evidence and validation for the host callback.

Do not add React SDK components, a server upload route, network calls or a
second validation model. Test one valid ZIP and invalid ZIP bytes.
```

## Track 4 — headless browser workflow

```text
Build a custom host UI over the supported SDK 0.8.0 headless contracts.

Use inspectTemplateRuntimeSupport from
@sleinity/template-browser/compatibility before showing the workflow. Own one
createTemplateImportWizard controller from @sleinity/template-browser/importer
per mounted workflow. Render the controller snapshot with existing host UI.

Keep all seven states and their evidence: ZIP import, package validation,
fonts, render validation, field rules, confirmation and completion. Store the
immutable confirmation only after explicit confirmation. Dispose owned
controllers. Do not recreate validation, render the package manually, or use
Studio/repository/internal imports.
```

## Track 5 — React setup wizard

```text
Add the SDK 0.8.0 setup wizard through supported public entries.

Import useTemplateImportWizard and TemplateImportWizard from
@sleinity/template-react/importer and import
@sleinity/template-react/importer.css once. Own one wizard per mounted setup
flow. Pass its complete confirmation to a host callback, then return through
host navigation. Cancellation must not create a host record.

The wizard session is setup-only. Do not reuse it as the downstream editor
session. Do not copy Studio screens or rebuild the wizard steps.
```

## Family track A — audit variants without changing the host

```text
Audit this host for an SDK 0.8 Template Family integration without modifying
files. Identify the ZIP variants, fields expected to share content, exact
local field/node/property identities, rule differences, and host-owned
selector vocabulary. Treat labels and node names as suggestions, never stable
identity. Report whether a single-template workflow is still the simpler
correct choice.

Do not invent domain-specific family APIs. The SDK supports generic groups,
options and assignments; the host owns meanings such as format, colour or
language. Do not inspect or import renderer-internal APIs.
```

## Family track B — headless family setup

```text
Build a custom Template Family setup UI with
createTemplateFamilyImportWizard from @sleinity/template-browser/importer.
Import the first ZIP, add variants, present exact automatic field matches and
require explicit review of suggestions/conflicts. Let users configure optional
generic groups, common rules and sparse variant overrides. Preview variants
sequentially through the controller's single familySession; never mount hidden
comparison renderers. Retain TemplateFamilyImportConfirmationV1 only after all
bindings, group assignments, rule validation and selected-variant readiness
are confirmed. Dispose the wizard when its owning flow ends.
```

## Family track C — React family setup

```text
Compose the family controller with TemplateFamilyImportWizardProvider,
TemplateFamilyZipInput, useTemplateFamilyImportWizardSnapshot and
TemplateFamilyImportPreview from @sleinity/template-react/importer. Use the
host design system for navigation and forms. Do not copy Studio setup screens
and do not turn generic group titles into SDK semantics. Confirm through the
headless controller and retain its immutable family/content/assets result in
host-owned storage.
```

## Family track D — shared-content editor

```text
Create one TemplateFamilySessionV1 and load the retained family, shared
content and shared image assets. In React, compose
TemplateFamilySessionProvider, useTemplateFamilyEditor,
useTemplateFamilyEditableFields, useTemplateFamilySelection and
useTemplateFamilyDiagnosticSummary from @sleinity/template-react/editor.

Render familySession.renderSession through TemplateSessionViewport. Keep one
shared control per family field and preserve shared values when selecting a
variant. Show per-variant validation without trimming or discarding invalid
shared content. Capture only the selected current revision. Do not create a
family renderer, hidden variant renderers or independent content copies.
```

## Family track E — persistence, legacy records and reimport

```text
Use the family repository APIs from @sleinity/template-browser/persistence.
Present existing 0.7 saved templates and drafts as deterministic one-variant
families in memory. Do not eagerly rewrite or delete legacy stores. Write a
family record only after an explicit family save and verify disposal/offline
reopening with shared text and images intact.

For variant reimport, call planTemplateFamilyVariantReimport first, present
added/removed/incompatible/unresolved targets, and call
applyTemplateFamilyVariantReimport only after review and against the expected
revision. A failed or stale plan must leave the current family unchanged.
```

## Track 6 — post-confirmation editor

```text
Add a host-owned editor for a confirmed Template Platform record.

Create a fresh useTemplateSession instance, reopen the stored confirmation with
loadTemplateImportConfirmation, and block when applied is false. Wrap the
editor in TemplateSessionProvider. Use TemplateSessionViewport,
useTemplateSessionEditableFields and useTemplateSessionDiagnosticSummary from
@sleinity/template-react/editor.

Build controls from field descriptors instead of template-specific node paths.
Use controller mutations and resets. Host code may prepare or crop images, but
must submit the final MIME type, byte size, dimensions and replacement mode
through the controller. Preserve the host's existing forms and product UI.
```

## Track 7 — persistence and offline reopening

```text
Add browser-local draft persistence without inventing a backend.

Save through session.save(), store only the returned ID in a namespaced host
record or localStorage key, and reload explicitly with
session.loadSavedTemplate(). Verify the edited draft reopens after a fresh
session and while external requests are blocked. Do not serialize the complete
working package into localStorage. Shared persistence remains a host adapter.
```

## Track 8 — current-revision PNG capture

```text
Add silent PNG capture through TemplateSessionViewportHandle.

Retain the latest viewport snapshot and enable export only when it belongs to
the current session revision and canExport is true. Call
exportPng({ download: false }), present recoverable readiness errors, and pass
the returned PNG data URL, filename, dimensions, diagnostics, revision and
render identity to a host callback. Never publish a stale or pending result.
Verify that an edit immediately invalidates the previous export permission.
```

## Track 9 — connect existing host services

```text
Connect the proven SDK integration to existing host services.

Reuse the application's navigation, authorization, catalogue, asset storage,
cloud persistence and publishing contracts. Adapt confirmed templates and PNG
results only at explicit host boundaries. Preserve identity, revision,
diagnostics, dimensions and filenames when supported.

Do not create duplicate product infrastructure inside the SDK integration. If
a required host service has no suitable contract, stop and report the missing
boundary instead of inventing a backend or expanding SDK APIs.
```

## Track 10 — final verification

```text
Verify the Template Platform SDK 0.8.0 integration using the host's existing
test stack and a manual browser pass.

Cover invalid and valid ZIPs, exact-font blocking and reuse, confirmation,
fresh-session reopening, text edit/reset, valid and invalid image replacement,
Fill/Fit, draft save/reload, offline reopening, stale-export rejection, silent
PNG capture and permanent disposal. Inspect network, console and downloads.

Require zero Studio, repository-source, package-src or renderer-internal
imports; zero SDK runtime network requests; and no registry credential in a
vendored host. Run typecheck, tests and production build. Report automated and
manual evidence separately and list any unverified scenario explicitly.

When the host adopts families, additionally cover two real ZIP variants,
exact/suggested/conflicting field matches, sparse rule inheritance, group
tuple resolution, shared text/image identity through switching, one-variant
legacy reopening, atomic reimport, selected-variant capture and permanent
family-session disposal. Prove that only one render session is active.
```
