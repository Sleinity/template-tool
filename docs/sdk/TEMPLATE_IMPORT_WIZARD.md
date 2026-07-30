# Template import workflow

SDK 0.3 provides one host-neutral workflow for importing and preparing a
TemplatePackage. The SDK owns import, validation, exact-font preparation,
render readiness and editable-field rules. The host continues to own routing,
authentication, catalogues, cloud storage, publishing and navigation.

## Default React interface

The default interface is responsive and can be placed on a page, in a modal,
drawer or another workspace. It does not require a router or fixed viewport.

```tsx
import {
  TemplateImportWizard,
  useTemplateImportWizard,
} from "@sleinity/template-react/importer";
import "@sleinity/template-react/importer.css";

export function AddTemplate() {
  const wizard = useTemplateImportWizard({
    persistenceAdapter: {
      async persistConfirmedTemplate(result) {
        const id = await hostCatalogue.add(result);
        return { id };
      },
    },
  });

  return (
    <TemplateImportWizard
      wizard={wizard}
      theme="system"
      onComplete={(result) => {
        // The host decides what happens after confirmation.
        console.log(result.packageFingerprint);
      }}
      onCancel={() => closeWorkspace()}
    />
  );
}
```

The seven fixed steps are ZIP Import, Package Validation, Font Validation,
Render Validation, Field Rules, Confirmation and Completed. Each step exposes
status, readiness, revision, blockers, warnings, diagnostics and navigation
permissions.

## Public API inventory

`@sleinity/template-browser` exports the controller factory; controller,
snapshot, step and confirmation contracts; structured import, font and render
reports; and the font and persistence adapter contracts.

`@sleinity/template-react/importer` exports
`useTemplateImportWizard`, `TemplateImportWizardProvider`,
`useTemplateImportWizardSnapshot`, `TemplateImportWizardPreview`,
`TemplateImportWizard` and `TemplateImportWizardHandle`.
`TemplateImporterWizard` and `TemplateImporterCompletionV1` are retained as
compatibility aliases.

## Headless composition

Hosts may omit the default interface and build their own:

```tsx
import {
  TemplateImportWizardPreview,
  TemplateImportWizardProvider,
  useTemplateImportWizard,
  useTemplateImportWizardSnapshot,
} from "@sleinity/template-react/importer";

function Controls({
  wizard,
}: {
  wizard: ReturnType<typeof useTemplateImportWizard>;
}) {
  const snapshot = useTemplateImportWizardSnapshot();
  return (
    <>
      <p>{snapshot.activeStep}</p>
      <button
        disabled={!snapshot.steps[snapshot.activeStep].canContinue}
        onClick={() => wizard.next()}
      >
        Continue
      </button>
      <TemplateImportWizardPreview />
    </>
  );
}

export function CustomImportWorkspace() {
  const wizard = useTemplateImportWizard();
  return (
    <TemplateImportWizardProvider wizard={wizard}>
      <Controls wizard={wizard} />
    </TemplateImportWizardProvider>
  );
}
```

In a real custom interface, obtain the controller from context or pass it to
the component that invokes actions. The framework-neutral alternative is
`createTemplateImportWizard()` from `@sleinity/template-browser`; subscribe to
its snapshots and call `dispose()` when the host permanently removes it.

## Import and validation

Call `wizard.loadZip({ bytes, sourceName })` with one `ArrayBuffer`. Selecting a
new ZIP aborts pending adapter work and clears the previous attempt.
`snapshot.importValidation` is present after every attempted import, including
corrupt or unreadable ZIPs. `snapshot.packageValidation` remains non-null for a
blocked import for compatibility. Human-readable diagnostics and structured
phase reports are both available.

Import and rendering are local. The SDK performs no font-provider, cloud or
other external runtime request.

## Adapters

`TemplateFontAdapterV1` can return host-owned font bytes. Those bytes must pass
the same exact family/PostScript, weight, posture, stretch, variable-axis,
collection-face and glyph checks as a manual upload. CSS or a system-font name
cannot establish exact authority.

`TemplateImportPersistenceAdapterV1` is optional and only runs after explicit
confirmation. Success advances to Completed and exposes the host receipt.
Failure keeps the immutable confirmation result on Confirmation so the host can
retry. The SDK never saves automatically.

## Confirmation

Confirmation requires successful package validation, exact fonts, valid fields
and a current ready or non-blocking-warning render identity. The immutable
`TemplateImportConfirmationV1` contains:

- the imported baseline and validated working package;
- sanitized editable fields and complete configured field rules;
- import, package, font and render-validation reports;
- diagnostics, blockers, warnings and the current render identity;
- a deterministic package fingerprint, SDK version, filename and import time.

Node paths are not exposed through the wizard field projection. Disabled fields
and help text remain confirmation metadata; enabled field rules are materialized
into the working package.

## Restart, cancel and reopen

`restart()` clears the attempt and returns to ZIP Import. `cancel()` aborts
pending work but does not navigate or delete host data. Multiple controllers
are independent, and the React hook handles StrictMode lifecycle replay.

Browser records created through the existing `TemplateRepository` can be
reopened with `TemplateSession.loadSavedTemplate()`. A host can also retain a
confirmation result and open it in a fresh session without trusting stored
validation or render evidence:

```ts
const result = session.loadTemplateState({
  importedPackage: confirmation.importedPackage,
  packageValue: confirmation.packageValue,
  source: {
    type: "package-zip",
    sourceName: confirmation.sourceName,
  },
  importValidation: confirmation.importValidation,
});
```

`loadTemplateState()` clones and validates both package states, verifies their
identity, rebuilds editable fields and the resolved tree, and publishes a new
revision atomically. The imported baseline remains reset authority.

## Host-owned editing

The wizard configures editable-field rules; it is not the host's content
editor. After confirmation, hosts read `snapshot.editableFields` and current
values with `getPackageFieldValue()`, then deliver their final values through
`session.setField()`, `session.replaceImage()`,
`session.setImageReplacementMode()`, `session.resetField()` and
`session.restoreImportedState()`.

The host may use any form library, cropper, AI tool, validation, or
preprocessing before that call. It may be stricter and more capable than the
default controls, but the final value must address a supported descriptor and
pass the template's constraints. Arbitrary node mutation is not a stable SDK
editing contract.

## Theming and slots

The default interface supports `className`, `style`, named `classNames`,
`light`, `dark` and `system` themes, labels, step titles, diagnostic rendering
and custom action rendering. These are presentation hooks only; they do not
replace the validation or readiness authorities.

## Migration

- Existing 0.2.2 session and renderer integrations remain supported.
- Existing unpublished `TemplateImporterWizard` integrations continue through
  a compatibility alias.
- New integrations should prefer `TemplateImportWizard` or the headless
  controller/provider/hooks.
- PNG capture is unchanged and remains an editor/runtime concern after import.

## Current limitations

React 19 and a modern browser are required for the React interface and render
validation. Browser-local persistence remains the default repository behavior.
The SDK does not supply a form system, crop tool, online font provider, backend,
catalogue, router, publishing workflow or multi-user collaboration.
