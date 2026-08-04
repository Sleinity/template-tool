# Template Platform SDK 0.7.0

Template Platform is the reusable SDK used by Template Studio and other
Sleinity-owned applications. It imports, validates, edits, renders and captures
technical template packages without requiring Studio.

All packages use the same version:

| Package | Owns | Runtime |
| --- | --- | --- |
| `@sleinity/template-core` | ZIP import, strict validation, package/scene models and portable field operations | Framework-neutral TypeScript |
| `@sleinity/template-browser` | Browser sessions, headless setup, assets, fonts, persistence, readiness and capture | Modern browser |
| `@sleinity/template-react` | React setup UI, renderer, responsive viewport and headless editor bindings | React 19 browser app |

Start with the [installation guide](INSTALLATION.md). External hosts and coding
agents should normally use the checksum-verified archives attached to the
public [`sdk-v0.7.0` Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.7.0).
Use the [SDK capability catalog](SDK_CAPABILITIES.md) to see every supported
entry point and choose between the wizard, headless controllers, editor
bindings, diagnostics, inspection and executable examples.

## Choose an integration path

### Import and validate a ZIP only

Install `@sleinity/template-core` and call `importTemplatePackage()` when the
host needs portable import/validation but no browser session or SDK renderer.

```ts
import { importTemplatePackage } from "@sleinity/template-core";

const result = importTemplatePackage(await file.arrayBuffer(), file.name);
if (!result.importable || !result.workingPackage) {
  showImportErrors(result.source.diagnostics, result.validation);
} else {
  useTemplate(result.workingPackage);
}
```

The core importer runs in a browser or modern Node without a server route,
runtime secret, DOM, storage or network request. See the
[core importer handoff](CORE_IMPORTER_HANDOFF.md).

### Build a custom headless workflow

Use these curated browser entries when the host owns all presentation:

- `@sleinity/template-browser/compatibility`
- `@sleinity/template-browser/importer`
- `@sleinity/template-browser/session`

Run `inspectTemplateRuntimeSupport()` first, own one
`createTemplateImportWizard()` controller per mounted setup flow, retain the
immutable confirmation in host state/storage, then reopen it in a fresh session
with `loadTemplateImportConfirmation()`.

### Use the React setup and editor building blocks

Use the SDK's five-page setup UI when the host wants Package, Fonts, Validate,
Fields and Confirm without building those screens:

```tsx
import {
  TemplateImportWizard,
  useTemplateImportWizard,
} from "@sleinity/template-react/importer";
import "@sleinity/template-react/importer.css";

const wizard = useTemplateImportWizard();

<TemplateImportWizard
  wizard={wizard}
  onComplete={(confirmation) => storeInHost(confirmation)}
/>;
```

The wizard session is setup-only. After confirmation, create a fresh
`useTemplateSession()`, reopen through `loadTemplateImportConfirmation()`, and
compose the host editor with:

```tsx
import {
  TemplateSessionViewport,
  useTemplateSessionDiagnosticSummary,
  useTemplateSessionEditableFields,
} from "@sleinity/template-react/editor";
```

These are headless editor bindings. The host still owns forms, layout, image
processing, navigation, storage and publishing. Capture through the viewport
handle only when its current-revision snapshot reports `canExport`.

### Adapt the reference example

The [template editor reference](../../examples/template-editor-integration/README.md)
is executable documentation for the complete browser lifecycle: setup,
confirmation, fresh-session reopening, descriptor-driven editing, image
Fill/Fit, local/offline drafts and silent PNG capture. Copy its SDK composition,
not its in-memory dashboard presentation.

## Agent-assisted implementation

Use the [provider-neutral agent prompts](AGENT_INTEGRATION_PROMPTS.md) with
Codex, Lovable, Cursor, Claude or another coding agent. Select only the tracks
needed by the host and review evidence after each prompt.

The first host upgrading its existing SDK 0.2 implementation should instead
follow the dedicated
[0.2→0.7 Lovable handoff](SDK_0_2_TO_0_7_LOVABLE_HANDOFF.md).

## Ownership boundary

The SDK owns template import, validation, diagnostics, editable session state,
browser-local persistence, rendering, readiness and PNG capture. The host owns
product navigation, authentication, forms, image processing, catalogues,
collaboration, cloud storage and publishing.

Studio-only screens, layout debugging, fidelity issue packets, visual
comparison, stress tooling and development harnesses are not SDK APIs. Never
import Studio code, repository paths, package `src/` files or an entry named
`renderer-internal`.

Advanced inspection is opt-in through `@sleinity/template-core/inspection`
and `@sleinity/template-react/inspection`; ordinary importing, editing and
rendering do not require it.

## Detailed references

- [Capability catalog](SDK_CAPABILITIES.md)
- [Installation](INSTALLATION.md)
- [Runtime handoff](RUNTIME_HANDOFF.md)
- [Template import workflow](TEMPLATE_IMPORT_WIZARD.md)
- [Consumer compatibility](CONSUMER_COMPATIBILITY.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Migrating from 0.6 to 0.7](SDK_0_7_MIGRATION.md)
- [Machine-readable public API contract](../../config/sdk-public-api.json)

Older migration guides remain version-specific historical records and are not
the starting point for a new 0.7 integration.

## Distribution policy

The GitHub Release archives are public and require no download credential.
Package manifests remain `UNLICENSED`; policy authorizes use only in
Sleinity-owned applications. Public visibility is not a general reuse grant.
