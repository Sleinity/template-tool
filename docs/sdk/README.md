# Template Platform SDK

The Template Platform SDK is the reusable technical foundation used by
Template Studio and other Sleinity-owned React/TypeScript applications. Its
physical boundaries and migration order are recorded in the
[Template Platform boundary audit](../architecture/TEMPLATE_PLATFORM_BOUNDARY_AUDIT.md).

The public monorepo contains one reference application and three fixed-version
packages:

| Package | Responsibility | Environment |
| --- | --- | --- |
| `@sleinity/template-core` | ZIP import, strict validation, diagnostics, canonical/resolved models, and portable field editing | Framework-neutral TypeScript |
| `@sleinity/template-browser` | Browser session, headless import workflow, assets, fonts, persistence, readiness, and PNG capture | Modern browser/Chromium |
| `@sleinity/template-react` | React importer UI, headless editor bindings, renderer, responsive viewport, and revision-safe capture | React 19 browser app |

## Installation

All three packages use the same version and must be upgraded together.

### GitHub Packages

Configure the `@sleinity` scope with
[`.npmrc.example`](../../.npmrc.example), then install:

```sh
pnpm add @sleinity/template-core@0.7.0 \
  @sleinity/template-browser@0.7.0 \
  @sleinity/template-react@0.7.0
```

GitHub's npm registry requires authentication. Use a classic personal access
token with `read:packages` and access to the package.

### Vendored Release archives

The public
future `sdk-v0.7.0` Release
contains registry-derived archives and `SHA256SUMS`. Verify and commit the
three archives under `vendor/`, then declare exact `file:` dependencies. This
path requires no package-registry secret and is the supported Lovable Business
recipe.

See [Runtime handoff](RUNTIME_HANDOFF.md) for npm and pnpm configuration and
[Lovable template editor prompts](LOVABLE_TEMPLATE_EDITOR_PROMPTS.md) for the
sequential consumer workflow.

## Core-only importer

Consumers that only need ZIP import, normalization, strict validation, source
evidence, and an editable package may install only `template-core`:

```ts
import { importTemplatePackage } from "@sleinity/template-core";

const result = importTemplatePackage(await file.arrayBuffer(), file.name);

if (!result.importable || !result.workingPackage) {
  console.error(result.source.diagnostics, result.validation);
} else {
  useTemplate(result.workingPackage);
}
```

The importer runs directly in a modern browser and in Node. It has no peer
dependencies, server route, runtime secret, or network requirement. See the
[core importer handoff](CORE_IMPORTER_HANDOFF.md).

## React runtime contract

New integrations should use the curated browser entry points:

- `@sleinity/template-browser/session` for session ownership and mutation;
- `@sleinity/template-browser/importer` for the headless import workflow and
  confirmation types;
- `@sleinity/template-browser/compatibility` for runtime preflight,
  confirmation inspection and atomic reopening.

The broad browser root remains compatible for existing 0.3 integrations.

For a complete host-neutral setup flow, use the importer subpath:

```tsx
import {
  TemplateImportWizard,
  useTemplateImportWizard,
} from "@sleinity/template-react/importer";
import "@sleinity/template-react/importer.css";

const wizard = useTemplateImportWizard();

<TemplateImportWizard
  wizard={wizard}
  onComplete={(result) => {
    // Hand result.packageValue to existing host services.
  }}
/>;
```

The default five-page setup groups the headless seven-state workflow into
Package, Fonts, Validate, Fields and Confirm. It provides ZIP import, structured package validation,
exact-font validation, render validation, field-rule setup, confirmation and a
revision-safe completion result. Hosts may use its default UI or compose their
own through the controller, provider, snapshot hook and preview bridge. It does
not save, publish or navigate unless an optional host persistence adapter is
explicitly provided for post-confirmation storage.

See the [template import workflow](TEMPLATE_IMPORT_WIZARD.md) for default,
headless, page/modal/drawer, adapter, theming, restart, persistence and
migration guidance.

See the [0.7 migration guide](SDK_0_7_MIGRATION.md) for the responsive session
viewport, editable-field controllers, and consolidated diagnostic projection.
Before the final `sdk-v0.7.0` tag, use the
[first-host acceptance checklist](FIRST_HOST_ACCEPTANCE.md) with locally packed
release-candidate archives. The final public Release is regenerated only from
the packages published by the tag workflow.

React hosts should let `useTemplateSession()` own the lifecycle:

```tsx
const session = useTemplateSession();

await session.loadZip({ bytes, sourceName: file.name });
session.setField("headline", "Updated headline");

<TemplateSessionProvider session={session}>
  <TemplateSessionRenderer ref={rendererRef} mode="editor" />
</TemplateSessionProvider>
```

Before presenting template workflows, run
`inspectTemplateRuntimeSupport()` from the compatibility entry point. After
confirmation, retain the immutable result in host state, create a fresh
session, and reopen it with `loadTemplateImportConfirmation()`. This verifies
identity and digest evidence before delegating to the session's fresh,
atomic `loadTemplateState()` rebuild.

Use `useTemplateSessionSnapshot()` for lifecycle, validation, diagnostics,
editable fields, working package, resolved tree, and revisions. The session
supports typed field/image mutation, imported-state restoration, IndexedDB
save/reload, and revision guards for asynchronous work.

Post-confirmation editors should use the curated React editor entry:

```tsx
import {
  TemplateSessionViewport,
  useTemplateSessionDiagnosticSummary,
  useTemplateSessionEditableFields,
} from "@sleinity/template-react/editor";
```

The viewport owns responsive contain-and-centre fitting, current-revision
identity, readiness and safe PNG capture. The hooks expose ordered headless
field controllers and a deduplicated projection of existing package, font,
asset, session and renderer evidence. They do not prescribe forms or run a
second validator.

PNG capture is allowed only for the ready render identity belonging to the
current session revision:

```ts
const output = await rendererRef.current?.exportPng({ download: false });
```

The SDK owns template import, validation, editable state, browser persistence,
rendering, readiness, and capture. The host owns product navigation,
authentication, catalogues, collaboration, cloud storage, publishing, and
other domain workflows. Integrate those through existing host services or
injected adapters.

See [Consumer compatibility](CONSUMER_COMPATIBILITY.md) and the focused
[template editor reference](../../examples/template-editor-integration/README.md).
The repository verifies both workspace and isolated packed consumers.
For upgrades, see [Migrating from SDK 0.6 to 0.7](SDK_0_7_MIGRATION.md). Integration
failures are organized by stable compatibility code in the
[troubleshooting guide](TROUBLESHOOTING.md). The committed
[machine-readable API contract](../../config/sdk-public-api.json) is the
authoritative public export inventory.

Recommended high-level APIs are the curated browser subpaths and React entry
points. The broad core/browser roots remain supported low-level adapter
surfaces. SDK 0.5 also provides supported advanced inspection entries:

- `@sleinity/template-core/inspection` for UI-independent canonical,
  appearance, dependency, measurement, settlement, comparison, and diagnostic
  evidence;
- `@sleinity/template-react/inspection` for renderer feature coverage,
  fidelity risk, quality reports, and diagnostic presentation.

The advanced entries are optional and report existing authority. Ordinary
importing, editing, and rendering do not require them. Studio-only debug
panels, visual-difference tooling, fidelity issue packets, and development
harnesses stay outside package export maps.
The `@sleinity/template-core/renderer-internal` and
`@sleinity/template-react/renderer-internal` entries are reserved for
fixed-train renderer/repository composition; external applications and Studio
must not import them directly.

## Offline and network behavior

ZIP import and rendering require no external runtime requests. Assets and
managed fonts remain package- or browser-storage-backed. Default persistence is
browser-local IndexedDB; shared persistence is a host adapter concern.

## Release and authorization

Package bundles contain no Template Studio screens, workspace aliases, or
repository-relative source imports. A fixed `sdk-v*` tag publishes the package
train; manual release workflow runs can only recreate assets from an already
published version.

The repository and Release assets are publicly downloadable, but package
manifests remain `UNLICENSED`. The current `sleinity-tools-only` policy
authorizes use in Sleinity-owned applications only. Public visibility is not a
general reuse grant.
