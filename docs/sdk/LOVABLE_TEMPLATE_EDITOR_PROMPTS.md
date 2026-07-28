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
[`sdk-v0.2.2` release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.2.2)
into the repository's `vendor/` directory. Downloading the Release assets
requires no GitHub token.

```text
Integrate the checksum-verified Template Platform 0.2.2 archives already present in this private repository:

- vendor/sleinity-template-core-0.2.2.tgz
- vendor/sleinity-template-browser-0.2.2.tgz
- vendor/sleinity-template-react-0.2.2.tgz

Add these exact dependencies:

"@sleinity/template-core": "file:vendor/sleinity-template-core-0.2.2.tgz"
"@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.2.2.tgz"
"@sleinity/template-react": "file:vendor/sleinity-template-react-0.2.2.tgz"

Requirements:

- Use the repository’s existing package manager.
- Update and commit the existing lockfile.
- If the repository uses pnpm, add exact pnpm overrides mapping all three @sleinity packages to the same vendor archives. Do not use registry fallbacks.
- Do not add a GitHub Packages .npmrc.
- Do not add NODE_AUTH_TOKEN, a GitHub PAT, or another package-registry secret.
- Do not replace these dependencies with registry URLs or Git dependencies.
- Do not modify the SDK archives.
- Confirm all installed package versions resolve to 0.2.2.
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
- TemplateSessionV1

From @sleinity/template-react:
- useTemplateSession
- TemplateSessionProvider
- useTemplateSessionSnapshot
- TemplateSessionRenderer
- TemplateSessionRendererHandle

Implementation requirements:

1. Create and own one TemplateSession per mounted workspace with useTemplateSession().
2. Let the owned-session hook handle permanent disposal and React StrictMode development replay.
3. Wrap the workspace in TemplateSessionProvider.
4. Add a ZIP file picker accepting .zip and application/zip.
5. Read the file bytes once and call session.loadZip with the ArrayBuffer and filename.
6. Show idle, loading, ready, blocked, disposed, and error states.
7. Show snapshot.validation, snapshot.diagnostics, and typed session errors when loading fails.
8. Render ready templates through TemplateSessionRenderer in editor mode.
9. Pair every onRenderIdentity result with the session snapshot revision that produced it. Treat it as ready only while that revision still equals the current snapshot revision.
10. Do not implement a custom renderer.
11. Do not call external services during import or rendering.
12. Do not connect this page to existing catalogues, cloud persistence, or publishing yet.

Provide a concise summary of the files added and how to open the test page.
```

## Prompt 4 — add descriptor-driven editing

```text
Extend the Template Platform test page with a minimal reusable field editor.

Use:

- snapshot.editableFields
- snapshot.workingPackage
- getPackageFieldValue from @sleinity/template-core
- session.setField
- session.resetField
- session.restoreImportedState
- session.replaceImage
- session.setImageReplacementMode

Requirements:

1. Render controls from the template’s editable-field descriptors.
2. Support text, textarea, number, date, color, and boolean fields.
3. Read current values with getPackageFieldValue instead of manually guessing node property paths.
4. Display field labels, constraints, mutation warnings, and rejected updates.
5. Add reset for each field and restore-all-imported-state.
6. For image fields:
   - validate the selected MIME type and file size;
   - convert the image to a data URL;
   - obtain width and height with createImageBitmap;
   - call session.replaceImage with MIME type, size, dimensions, and replacement-fill;
   - expose Fill and Fit mode controls.
7. Keep this editor descriptor-driven. Do not hard-code fields for a particular template.
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
2. Invalid ZIP bytes produce a blocked/error state with structured diagnostics and validation details.
3. A valid test ZIP reaches ready state.
4. Editing a field changes the current working package.
5. Reset restores the imported value.
6. Image constraints reject invalid input; a valid replacement supports Fill and Fit.
7. Saving returns an ID and explicit reload restores the edited draft.
8. The saved draft reloads while offline.
9. Export remains disabled before render readiness.
10. A field edit invalidates the previous export identity.
11. Export returns PNG metadata for the latest ready revision without a browser download.
12. Session disposal occurs on permanent unmount.
13. No GitHub token, .npmrc, registry dependency, or external SDK runtime request is introduced.

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
