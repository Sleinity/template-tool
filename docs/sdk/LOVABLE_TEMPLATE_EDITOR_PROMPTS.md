# Lovable Business template editor prompts

Use these prompts in Lovable one at a time. Review the reported files, tests,
and blockers before continuing. They build an isolated, host-neutral template
editor integration before connecting it to any existing product services.

The ownership boundary is deliberate:

- The Template Platform SDK owns ZIP import, validation, diagnostics, editable
  state, browser persistence, rendering, readiness, and PNG capture.
- The host application owns navigation, authentication, catalogues,
  collaboration, cloud storage, publishing, and other product workflows.
- Existing host services should be reused. The integration must not invent
  duplicate SDK-owned product infrastructure.

## Prompt 1 — audit the project

```text
Inspect this React/TypeScript repository for a future Template Platform integration.

Do not modify files yet.

Report:

1. The React and React DOM versions.
2. The package manager and lockfile in use.
3. The routing structure and the best location for an isolated template-editor integration test page.
4. Existing patterns for file uploads, forms, validation messages, diagnostics, and previews.
5. Existing services for authentication, catalogues, cloud persistence, publishing, and exported assets.
6. Whether the app already has an editor or content-management area.
7. Whether React StrictMode is enabled.
8. Whether IndexedDB and localStorage are already wrapped by project utilities.
9. Any CSP, browser, or build restrictions that could affect data URLs, blob URLs, IndexedDB, SVG, fonts, or PNG capture.

The initial integration must not alter existing production workflows.

The required SDK peer versions are React 19 and React DOM 19. If this project is not on React 19, stop and report the upgrade impact instead of installing the SDK.
```

## Prompt 2 — install the vendored SDK

Before using this prompt, copy the three checksum-verified archives from the
public
[`sdk-v0.3.0` release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.3.0)
into the repository's `vendor/` directory. Downloading the Release assets
requires no GitHub token.

```text
Integrate the checksum-verified Template Platform 0.3.0 archives already present in this private repository:

- vendor/sleinity-template-core-0.3.0.tgz
- vendor/sleinity-template-browser-0.3.0.tgz
- vendor/sleinity-template-react-0.3.0.tgz

Add these exact dependencies:

"@sleinity/template-core": "file:vendor/sleinity-template-core-0.3.0.tgz"
"@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.3.0.tgz"
"@sleinity/template-react": "file:vendor/sleinity-template-react-0.3.0.tgz"

Requirements:

- Use the repository’s existing package manager.
- Update and commit the existing lockfile.
- If the repository uses pnpm, add exact pnpm overrides mapping all three @sleinity packages to the same vendor archives. Do not use registry fallbacks.
- Do not add a GitHub Packages .npmrc.
- Do not add NODE_AUTH_TOKEN, a GitHub PAT, or another package-registry secret.
- Do not replace these dependencies with registry URLs or Git dependencies.
- Do not modify the SDK archives.
- Confirm all installed package versions resolve to 0.3.0.
- Run the existing typecheck and production build.
- Report changed files and any dependency conflicts before continuing.
```

## Prompt 3 — create an isolated editor workspace

```text
Create an isolated Template Platform editor page without changing existing product workflows.

Use the repository’s existing route and layout conventions. If no suitable convention exists, create an isolated route at:

/template-editor-integration-test

Use only these supported APIs:

From @sleinity/template-browser:
- TemplateImportConfirmationV1

From @sleinity/template-react/importer:
- useTemplateImportWizard
- TemplateImportWizard

Implementation requirements:

1. Create and own one import controller per mounted workspace with useTemplateImportWizard().
2. Let the owned-controller hook handle permanent disposal and React StrictMode development replay.
3. Import TemplateImportConfirmationV1 as a type from @sleinity/template-browser.
4. Import TemplateImportWizard from @sleinity/template-react/importer.
5. Import @sleinity/template-react/importer.css once in the application.
6. Pass the owned controller to TemplateImportWizard.
7. Let the wizard provide ZIP import, package validation, exact-font validation, render validation, diagnostics, field-rule configuration, confirmation, and completion.
8. In onComplete, retain the complete TemplateImportConfirmationV1 in host-owned page state and return to the host dashboard.
9. Add the template to the in-memory host catalogue only after onComplete runs.
10. Cancellation must return to the dashboard without creating a host record.
11. Keep the wizard session limited to setup. Do not use wizard.session as the downstream editor session.
12. Do not copy Studio import screens or recreate the wizard steps.
13. Do not implement a custom renderer.
14. Do not call external services during import or rendering.
15. Do not connect this page to existing cloud persistence or publishing yet.

Provide a concise summary of the files added and how to open the test page.
```

## Prompt 4 — add descriptor-driven editing

```text
Extend the Template Platform test page with confirmed-template reopening and a minimal host-owned field editor.

Use:

From @sleinity/template-react:
- useTemplateSession
- TemplateSessionProvider
- useTemplateSessionSnapshot
- TemplateSessionRenderer

- session.loadTemplateState
- snapshot.editableFields
- snapshot.workingPackage
- getPackageFieldValue from @sleinity/template-core
- session.setField
- session.resetField
- session.restoreImportedState
- session.replaceImage
- session.setImageReplacementMode

Requirements:

1. When the user selects a confirmed host record, create a fresh session with useTemplateSession().
2. Call session.loadTemplateState() with the record’s importedPackage, packageValue, source filename, and importValidation.
3. Treat applied=false as a blocked reopen and show its structured diagnostics. Never fall back to the wizard session.
4. Wrap the editor and TemplateSessionRenderer in TemplateSessionProvider using the fresh session.
5. Render controls from the freshly rebuilt editable-field descriptors.
6. Support text, textarea, number, date, color, and boolean fields.
7. Read current values with getPackageFieldValue instead of manually guessing node property paths.
8. Display field labels, constraints, mutation warnings, and rejected updates.
9. Add reset for each field and restore-all-imported-state.
10. For image fields:
   - validate the selected MIME type and file size;
   - convert the image to a data URL;
   - obtain width and height with createImageBitmap;
   - call session.replaceImage with MIME type, size, dimensions, and replacement-fill;
   - expose Fill and Fit mode controls.
11. Keep this editor descriptor-driven. Do not hard-code fields for a particular template.
12. Hosts may add stricter validation, crop tools, transformations, or richer controls before calling the SDK. Final values must still use a supported descriptor and pass SDK constraints.
13. Arbitrary package-node mutation is not part of the stable editing contract.
```

## Prompt 5 — add browser-local persistence

```text
Add browser-local draft persistence to the Template Platform test page.

Use:

- session.save
- session.loadSavedTemplate

Requirements:

1. Add “Save browser draft” using session.save().
2. Store only the returned saved-template ID in a namespaced localStorage key.
3. Add an explicit “Reload browser draft” action using session.loadSavedTemplate().
4. Confirm the edited draft reloads from IndexedDB.
5. Confirm the draft can reload while the browser is offline.
6. Do not duplicate the working package in localStorage.
7. Do not invent a cloud API. Shared persistence must later reuse an existing host service or an injected SDK adapter.
```

## Prompt 6 — add revision-safe PNG capture

```text
Add PNG capture to the Template Platform integration page.

Requirements:

1. Keep a ref to TemplateSessionRendererHandle.
2. Enable Export only when:
   - the session snapshot status is ready;
   - a render identity exists for the exact current snapshot revision;
   - that render identity’s readiness is ready.
3. Call rendererRef.current.exportPng({ download: false }) only for that ready revision.
4. Handle readiness and export errors visibly.
5. Capture the returned filename, pngDataUrl, width, height, readiness, and diagnostics.
6. Show a small exported-image preview and metadata after export.
7. Expose the successful result through a local callback named onTemplateExportReady.
8. Include the PNG data URL, filename, dimensions, diagnostics, session revision, and render identity in the callback payload.
9. Do not upload or publish the PNG yet, and confirm silent capture does not trigger a browser download.
10. Confirm editing a field invalidates the previous identity and prevents stale export until the new render becomes ready.
```

## Prompt 7 — build the acceptance harness

```text
Make the Template Platform integration test-ready.

Add automated coverage consistent with this repository’s existing test stack.

Cover:

1. The route mounts without affecting existing routes.
2. TemplateImportWizard mounts from the public importer subpath with its packaged stylesheet.
3. Invalid ZIP bytes remain blocked with structured import validation, non-null compatibility validation, and diagnostics.
4. A valid test ZIP advances through Package Validation, Font Validation, Render Validation, Field Rules, Confirmation, and Completed.
5. The exact required family and weight are shown, invalid font files are rejected with a clear reason, a verified exact upload is reused after reload, and an unlinked, compatible, replacement, or fallback-only requirement remains blocked.
6. Field-rule labels, ordering, constraints, and image Fill/Fit defaults update the setup revision without editing content.
7. Confirmation is disabled before current render readiness and returns the current immutable package/evidence result.
8. Confirmation returns to the host dashboard, selecting the record creates a fresh session, and loadTemplateState() rebuilds ready editable state.
9. Editing a content field through host-owned controls changes the current working package after reopening.
10. Reset restores the imported value.
11. Image constraints reject invalid input; a valid host-provided replacement supports Fill and Fit.
12. Saving returns an ID and explicit reload restores the edited draft.
13. The saved draft reloads while offline.
14. A content edit invalidates the previous export identity.
15. Export returns PNG metadata for the latest ready revision without a browser download.
16. Session disposal occurs on permanent unmount.
17. No GitHub token, .npmrc, registry dependency, or external SDK runtime request is introduced.

Also provide a manual browser checklist for valid and invalid ZIP import, text edit/reset, image replacement, Fill/Fit switching, save/reload, offline reload, PNG capture, and browser network inspection.

Run typecheck, tests, and the production build. Report automated results separately from manual checks.
```

## Prompt 8 — connect existing host services

Run this only after the isolated integration passes.

```text
Connect the tested Template Platform editor to this project’s existing product services.

First inspect and reuse the existing authentication, catalogue, cloud persistence, asset storage, and publishing contracts. Do not create duplicate product infrastructure owned by the SDK.

Requirements:

1. Keep ZIP import, validation, field editing, readiness, and capture inside the supported SDK APIs.
2. Reuse existing host navigation and authorization for access to the editor.
3. Reuse the existing catalogue model for template or exported-result records where it fits.
4. Reuse existing cloud persistence or publishing services; adapt the SDK output at the host boundary.
5. Preserve filename, dimensions, template or saved-draft identity, session revision, render identity, diagnostics, and creation time where the host contract supports them.
6. Show progress and recoverable errors for host-owned operations.
7. Never publish an export produced from a stale or non-ready render identity.
8. Add integration tests using the project’s existing service test doubles.
9. Keep the browser-local IndexedDB repository as the standalone fallback unless a reviewed host adapter replaces it.

If a required host service has no suitable contract, stop and report the missing boundary rather than inventing a new backend.
```

## Completion checklist

- Valid ZIP imports without a server route.
- Invalid ZIP produces structured diagnostics and validation details.
- The template renders through the SDK renderer.
- Supported fields edit and reset correctly.
- Browser-local draft save/reload works offline.
- Only the latest ready revision exports silently.
- Existing host services receive SDK output through explicit adapters.
- The Lovable build requires no GitHub credential.
- SDK import, rendering, persistence, and capture make no external requests.
