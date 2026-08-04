# SDK 0.7.0 capability catalog

Use this catalog to choose the smallest supported SDK surface for a host
application. It describes the available building blocks and their ownership;
the linked guides remain the detailed implementation authorities.

## Start with the outcome

| I need to… | Start with | Runtime | Classification |
| --- | --- | --- | --- |
| Read and validate a ZIP without rendering | `importTemplatePackage()` from `@sleinity/template-core` | Modern Node or browser; no DOM | Supported low-level adapter |
| Build a setup flow without React | `createTemplateImportWizard()` from `@sleinity/template-browser/importer` | Browser | Recommended high-level integration |
| Use the complete setup interface | `TemplateImportWizard` and `useTemplateImportWizard()` from `@sleinity/template-react/importer`, plus `@sleinity/template-react/importer.css` | React 19 and modern browser | Recommended high-level integration |
| Put the setup workflow in custom React UI | `TemplateImportWizardProvider`, `useTemplateImportWizardSnapshot()` and `TemplateImportWizardPreview` | React 19 and modern browser | Recommended high-level integration |
| Reopen and edit a confirmed template | `loadTemplateImportConfirmation()`, `useTemplateSession()` and the React editor entry | React 19 and modern browser | Recommended high-level integration |
| Build a non-React editor | `createTemplateSession()` from `@sleinity/template-browser/session` | Browser | Recommended high-level integration |
| Inspect technical quality or fidelity risk | The core or React `inspection` entry | Depends on selected entry | Supported advanced inspection |
| Learn from a working integration | `examples/minimal-renderer` or `examples/template-editor-integration` | Browser example | Executable documentation |

Prefer a recommended high-level entry. Use a low-level adapter only when the
host needs to replace or compose that specific responsibility. Compatibility
entries are supported reopening and runtime checks, not a second renderer.

## Import and validation

Use the core importer for portable ZIP loading and strict canonical validation:

```ts
import { importTemplatePackage } from "@sleinity/template-core";

const result = importTemplatePackage(await file.arrayBuffer(), file.name);
if (!result.importable || !result.workingPackage) {
  showImportProblems(result.source.diagnostics, result.validation);
} else {
  useValidatedPackage(result.workingPackage);
}
```

The core package owns ZIP reading, source normalization with provenance,
canonical validation, package and field types, field mutation, renderer-neutral
resolution and scene projections. It has no DOM, storage, React, runtime secret,
or network requirement. It does not activate fonts, persist browser records,
render UI, or capture PNGs. See the [core importer handoff](CORE_IMPORTER_HANDOFF.md).

## Setup wizard

The default React wizard owns Package, Fonts, Validate, Fields and Confirm:

```tsx
import {
  TemplateImportWizard,
  useTemplateImportWizard,
} from "@sleinity/template-react/importer";
import "@sleinity/template-react/importer.css";

const wizard = useTemplateImportWizard();

<TemplateImportWizard
  wizard={wizard}
  onComplete={(confirmation) => retainInHostStorage(confirmation)}
/>;
```

For custom React presentation, compose `TemplateImportWizardProvider`,
`useTemplateImportWizardSnapshot()` and `TemplateImportWizardPreview`. For a
framework-neutral presentation, subscribe to the controller returned by
`createTemplateImportWizard()` and call `dispose()` when its setup flow is
permanently removed. The host owns the modal, page, navigation and completion
action. The [import workflow guide](TEMPLATE_IMPORT_WIZARD.md) defines the full
lifecycle and adapter contracts.

## Field rules and editing

During setup, `TemplateImportFieldRulesEditor` provides the optional shared UI
for field order and supported input constraints. A custom shell may use the
controller's field-rule snapshot and actions instead. Imported field identity,
type, targets and defaults remain read-only.

After confirmation, use the editor bindings inside a `TemplateSessionProvider`:

```tsx
import {
  TemplateSessionViewport,
  useTemplateSessionDiagnosticSummary,
  useTemplateSessionEditableFields,
} from "@sleinity/template-react/editor";

function Editor() {
  const fields = useTemplateSessionEditableFields();
  const diagnostics = useTemplateSessionDiagnosticSummary();
  return <>
    <TemplateSessionViewport mode="editor" />
    {fields.map((field) => renderHostControl(field))}
    <output>{diagnostics.status}</output>
  </>;
}
```

`useTemplateSessionEditableField(fieldId)` selects one controller. Controllers
expose descriptors, resolved values, target evidence and safe session mutations;
they are not input components. The host owns forms, labels, image preparation,
cropping UI and product actions. Core `editor` exports are supported low-level
validation and mutation tools for non-React compositions.

## Session, confirmation and reopening

`createTemplateSession()` owns one revision-safe editable runtime. In React,
prefer `useTemplateSession()` for StrictMode-safe creation and disposal. A
setup wizard is temporary: retain its immutable confirmation in host-owned
state or storage, create a fresh session, then reopen atomically:

```ts
import {
  inspectTemplateRuntimeSupport,
  loadTemplateImportConfirmation,
} from "@sleinity/template-browser/compatibility";

const support = await inspectTemplateRuntimeSupport();
if (support.status !== "blocked") {
  await loadTemplateImportConfirmation(session, confirmation);
}
```

Do not persist a resolved render tree or readiness snapshot as authority.
Reopening revalidates the package and rebuilds derived state. Dispose sessions,
wizard controllers, object URLs and subscriptions when their owning host
lifecycle ends.

## Rendering and PNG capture

For an ordinary React editor, `TemplateSessionViewport` is the preferred
render-and-capture boundary. It fits the intrinsic renderer without changing
template pixels and exposes current-revision readiness through its snapshot.
Call `exportPng({ download: false })` on its handle only when `canExport` is
true. The capture rejects pending or stale revisions.

`TemplateSessionRenderer` is the lower-level session renderer.
`TemplatePackageRenderer` renders a resolved package directly when the host
intentionally owns the surrounding lifecycle. Browser `capture` exports are
supported low-level primitives; they do not own rendering behavior and should
not replace the viewport readiness contract in a normal React editor.

## Diagnostics and inspection

Use `TemplateImportValidationSummary` for a combined setup result and
`TemplateImportRenderValidationSummary` only when a custom wizard needs the
render report separately. After confirmation,
`useTemplateSessionDiagnosticSummary()` projects existing package, font, asset,
session and viewport evidence without running a second validation system.

The core and React `inspection` entries are optional advanced surfaces for
canonical-scene evidence, package quality, feature coverage and fidelity-risk
projection. They report existing authority; they do not choose a renderer.
Studio comparison views, issue packets, stress tools, visual-difference tools
and fidelity harnesses are not SDK capabilities.

## Persistence, assets, fonts and enrichment

- `@sleinity/template-browser/persistence` provides IndexedDB and in-memory
  repositories, saved-record validation and autosave coordination. Hosts may
  instead store confirmations and product records through their own services.
- Core `assets` resolves portable references. Browser `assets` owns ingestion,
  browser storage and reliability checks.
- Core `fonts` reports portable requirements and readiness. Browser `fonts`
  owns OpenType inspection, managed font registration, exact matching and
  activation through browser font APIs.
- Browser `enrichment` is an optional, host-injected Figma evidence adapter.
  Import, rendering and capture do not require it and do not perform an
  SDK-owned external request.
- Core `motion` owns renderer-neutral motion linking and evaluation. React owns
  the rendered motion surface.

Host authentication, cloud persistence, publishing, navigation, collaboration
and catalogues stay outside the SDK. Browser-local defaults are conveniences,
not a requirement to adopt the host's product storage policy.

## Examples

- [Minimal renderer](../../examples/minimal-renderer/README.md) demonstrates a
  small supported React rendering integration. Use it to understand the basic
  provider/session/renderer relationship.
- [Template editor integration](../../examples/template-editor-integration/README.md)
  is executable documentation for setup, confirmation, fresh-session reopening,
  descriptor-driven editing, local/offline drafts and silent PNG capture. Copy
  its SDK composition, not its in-memory dashboard or product presentation.

Neither example authorizes repository-relative, package-source, Studio, or
`renderer-internal` imports in an external host.

## Checked entry-point inventory

The classifications and paths below are verified against
[`config/sdk-entry-points.json`](../../config/sdk-entry-points.json); named
exports are verified against
[`config/sdk-public-api.json`](../../config/sdk-public-api.json). Broad roots
remain supported, but focused entries reduce accidental coupling.

<!-- sdk-capability-entry-points:start -->
| Package | Entry | Classification | Representative exports |
| --- | --- | --- | --- |
| core | `@sleinity/template-core` | `supported-low-level-adapter` | `importTemplatePackage`, `validateTemplatePackage`, `createResolvedRenderTree` |
| core | `@sleinity/template-core/assets` | `supported-low-level-adapter` | `inspectPackageAssetSafety`, `resolvePackageAssetReference` |
| core | `@sleinity/template-core/editor` | `supported-low-level-adapter` | `validatePackageEditableFieldRules`, `updateTemplatePackageField`, `replaceTemplatePackageImage` |
| core | `@sleinity/template-core/fonts` | `supported-low-level-adapter` | `collectTemplatePackageFontRequirements`, `checkResolvedFontReadiness` |
| core | `@sleinity/template-core/inspection` | `supported-advanced-inspection` | `createCanonicalSceneGraph`, `createMeasurementSnapshot`, `settleSceneGraph` |
| core | `@sleinity/template-core/motion` | `supported-low-level-adapter` | `linkPackageMotionJson`, `evaluatePackageMotion` |
| core | `@sleinity/template-core/renderer-internal` | `sdk-internal` | Prohibited for host applications |
| browser | `@sleinity/template-browser` | `supported-low-level-adapter` | `createTemplateSession`, `createTemplateImportWizard` |
| browser | `@sleinity/template-browser/assets` | `supported-low-level-adapter` | `ingestTemplatePackageAssets`, `createIndexedDbAssetStore` |
| browser | `@sleinity/template-browser/capture` | `supported-low-level-adapter` | `exportTemplatePackagePng`, `waitForCurrentRuntimeSettlement` |
| browser | `@sleinity/template-browser/compatibility` | `recommended-high-level-integration` | `inspectTemplateRuntimeSupport`, `inspectTemplateImportConfirmation`, `loadTemplateImportConfirmation` |
| browser | `@sleinity/template-browser/enrichment` | `supported-low-level-adapter` | `enrichTemplatePackage`, `enrichTemplatePackageWithProvider` |
| browser | `@sleinity/template-browser/fonts` | `supported-low-level-adapter` | `inspectOpenTypeFontBinary`, `uploadExactManagedFontForRequirement` |
| browser | `@sleinity/template-browser/importer` | `recommended-high-level-integration` | `createTemplateImportWizard`, `TemplateImportConfirmationV1` |
| browser | `@sleinity/template-browser/persistence` | `supported-low-level-adapter` | `IndexedDbTemplateRepository`, `InMemoryTemplateRepository` |
| browser | `@sleinity/template-browser/session` | `recommended-high-level-integration` | `createTemplateSession`, `TemplateSessionV1` |
| react | `@sleinity/template-react` | `recommended-high-level-integration` | `useTemplateSession`, `TemplateSessionProvider`, `TemplateSessionRenderer`, `TemplatePackageRenderer` |
| react | `@sleinity/template-react/editor` | `recommended-high-level-integration` | `TemplateSessionViewport`, `useTemplateSessionEditableField`, `useTemplateSessionEditableFields`, `useTemplateSessionDiagnosticSummary` |
| react | `@sleinity/template-react/importer` | `recommended-high-level-integration` | `TemplateImportWizard`, `useTemplateImportWizard`, `TemplateImportWizardProvider`, `useTemplateImportWizardSnapshot`, `TemplateImportWizardPreview`, `TemplateImportFieldRulesEditor`, `TemplateImportValidationSummary`, `TemplateImportRenderValidationSummary` |
| react | `@sleinity/template-react/importer.css` | `recommended-high-level-integration` | Stylesheet for the default importer interface |
| react | `@sleinity/template-react/inspection` | `supported-advanced-inspection` | `analyzeRendererFeatureCoverage`, `createTemplatePackageQualityReport`, `analyzeFidelityRisk` |
| react | `@sleinity/template-react/renderer-internal` | `sdk-internal` | Prohibited for host applications |
<!-- sdk-capability-entry-points:end -->

## Context for a coding agent

Copy this block into Codex, Lovable, Cursor, Claude or another coding agent
before asking it to design or change an integration:

```text
Integrate Sleinity Template Platform SDK 0.7.0 using only published package
entry points. Read docs/sdk/SDK_CAPABILITIES.md first, choose the smallest
recommended high-level integration for the requested outcome, and follow its
linked detailed guide. Prefer @sleinity/template-browser/importer, /session and
/compatibility plus @sleinity/template-react, /importer and /editor. Use
low-level adapters only when the host explicitly owns that responsibility.

Never import from apps/studio, repository-relative source, package src/
directories, root compatibility forwarders, or any renderer-internal entry.
Do not copy Studio product UI or fidelity tooling into the host. Preserve host
navigation, authentication, forms, image preparation, cloud persistence and
publishing. The SDK owns import, validation, template session state, rendering,
readiness and safe capture. Retain the immutable import confirmation in
host-owned storage, reopen it in a fresh session, respect current-revision
readiness, and dispose owned controllers and sessions.

Before modifying code, report the chosen path, exact package imports, host/SDK
ownership boundary and lifecycle. After implementation, prove there are zero
Studio, repository-source or renderer-internal imports.
```

For staged implementation prompts, continue with the
[provider-neutral agent tracks](AGENT_INTEGRATION_PROMPTS.md). For installation,
archive verification and package-manager configuration, use the
[installation guide](INSTALLATION.md).
