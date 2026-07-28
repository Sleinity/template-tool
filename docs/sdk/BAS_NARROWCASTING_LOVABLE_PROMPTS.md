# Bas narrowcasting integration prompts

Use these prompts in Lovable one at a time. Review the reported files, tests,
and blockers before continuing. The first six prompts create an isolated
Template Platform test. Prompt 7 connects its current PNG result to Bas's
existing narrowcasting media workflow.

The ownership boundary is deliberate:

- Template Platform owns ZIP import, validation, diagnostics, editable fields,
  browser session state, rendering, readiness, and PNG generation.
- Bas owns authentication, media upload and storage, campaigns, scheduling,
  distribution, and screen playback.
- A screen/player consumes the normal exported media asset. It does not import
  the Template Platform SDK merely to display a PNG.

## Prompt 1 — audit the narrowcasting project

```text
Inspect this narrowcasting repository for a future Template Platform integration.

Do not modify files yet.

Report:

1. The React and React DOM versions.
2. The package manager and lockfile in use.
3. The routing structure and the best location for an isolated admin-only template integration test page.
4. Existing patterns for file uploads, forms, error messages, and media previews.
5. Existing services for media upload, asset storage, campaigns, playlists, and screen playback.
6. Whether the app already has an editor or content-management area.
7. Whether React StrictMode is enabled.
8. Whether IndexedDB and localStorage are already wrapped by project utilities.
9. Any CSP, browser, or build restrictions that could affect data URLs, IndexedDB, SVG, fonts, or PNG capture.

The initial integration must not alter production playback or scheduling.

The required SDK peer versions are React 19 and React DOM 19. If this project is not on React 19, stop and report the upgrade impact instead of installing the SDK.
```

## Prompt 2 — install the vendored SDK

Before using this prompt, copy the three checksum-verified archives from the
private `sdk-v0.2.0` release into the repository's `vendor/` directory.

```text
Integrate the checksum-verified Template Platform 0.2.0 archives already present in this private repository:

- vendor/sleinity-template-core-0.2.0.tgz
- vendor/sleinity-template-browser-0.2.0.tgz
- vendor/sleinity-template-react-0.2.0.tgz

Add these exact dependencies:

"@sleinity/template-core": "file:vendor/sleinity-template-core-0.2.0.tgz"
"@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.2.0.tgz"
"@sleinity/template-react": "file:vendor/sleinity-template-react-0.2.0.tgz"

Requirements:

- Use the repository’s existing package manager.
- Update and commit the existing lockfile.
- If the repository uses pnpm, add exact pnpm-workspace.yaml overrides mapping all three @sleinity packages to the same vendor archives. Do not use registry fallbacks.
- Do not add a GitHub Packages .npmrc.
- Do not add NODE_AUTH_TOKEN, a GitHub PAT, or another package-registry secret.
- Do not replace these dependencies with registry URLs or Git dependencies.
- Do not modify the SDK archives.
- Confirm all installed package versions resolve to 0.2.0.
- Run the existing typecheck and production build.
- Report changed files and any dependency conflicts before continuing.
```

## Prompt 3 — create an isolated integration test page

```text
Create an admin-only Template Platform integration page without changing production narrowcasting playback.

Use the repository’s existing route and layout conventions. If no suitable convention exists, create an isolated route at:

/template-integration-test

Use only these supported APIs:

From @sleinity/template-core:
- importTemplatePackage

From @sleinity/template-browser:
- createTemplateSession
- TemplateSessionV1

From @sleinity/template-react:
- TemplateSessionProvider
- useTemplateSessionSnapshot
- TemplateSessionRenderer
- TemplateSessionRendererHandle

Implementation requirements:

1. Create one TemplateSession per mounted workspace with useState(() => createTemplateSession()).
2. Dispose it safely on permanent unmount without letting React StrictMode’s development remount dispose the active session.
3. Wrap the workspace in TemplateSessionProvider.
4. Add a ZIP file picker accepting .zip and application/zip.
5. Read the file bytes once and preflight them with importTemplatePackage(bytes, file.name). If importable is false, show result.source.diagnostics and result.validation and do not call the session.
6. For a preflight-valid package, call session.loadZip with the same ArrayBuffer and filename.
7. Show idle, loading, ready, blocked, disposed, and error states.
8. Show validation, source diagnostics, session diagnostics, and typed session errors when loading fails.
9. Render ready templates through TemplateSessionRenderer in editor mode.
10. Pair every onRenderIdentity result with the session snapshot revision that produced it. Treat it as ready only while that revision still equals the current snapshot revision.
11. Do not implement a custom renderer.
12. Do not call external services during import or rendering.
13. Do not connect this page to campaigns, playlists, or screens yet.

Provide a concise summary of the files added and how to open the test page.
```

## Prompt 4 — add editing and browser persistence

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
- session.save
- session.loadSavedTemplate

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
7. Add “Save browser draft” using session.save().
8. Store only the returned saved-template ID in a namespaced localStorage key.
9. Add “Reload browser draft” using session.loadSavedTemplate().
10. Confirm the draft reload works offline from IndexedDB.
11. Keep this persistence local to the browser for the integration test; do not invent a new backend API.
```

## Prompt 5 — add revision-safe PNG export

```text
Add PNG export to the Template Platform integration page.

Requirements:

1. Keep a ref to TemplateSessionRendererHandle.
2. Enable Export only when:
   - the session snapshot status is ready;
   - a render identity exists for the exact current snapshot revision;
   - that render identity’s readiness is ready.
3. Call rendererRef.current.exportPng() only for that ready revision.
4. Handle readiness and export errors visibly.
5. Capture the returned filename, pngDataUrl, width, height, readiness, and diagnostics.
6. Show a small exported-image preview and metadata after export.
7. Expose the successful export through a local callback named onTemplateExportReady.
8. Include the PNG data URL, filename, dimensions, diagnostics, session revision, and render identity in the callback payload.
9. Do not upload or publish the PNG yet.
10. Confirm editing a field invalidates the previous identity and prevents stale export until the new render becomes ready.
```

## Prompt 6 — build the test harness

```text
Make the Template Platform integration test-ready.

Add automated coverage consistent with this repository’s existing test stack.

Cover:

1. The route mounts without affecting existing routes.
2. Invalid ZIP bytes produce a blocked/error state with structured diagnostics.
3. A valid test ZIP reaches ready state.
4. Editing a field changes the current working package.
5. Reset restores the imported value.
6. Saving returns an ID and loading it restores the edited draft.
7. Export remains disabled before render readiness.
8. A field edit invalidates the previous export identity.
9. Export returns PNG metadata for the latest ready revision.
10. Session disposal occurs on permanent unmount.
11. No GitHub token, .npmrc, registry dependency, or external importer request is introduced.

Also provide a manual browser checklist for:
- valid ZIP import;
- invalid ZIP import;
- text edit;
- image replacement if the fixture contains an image field;
- Fill/Fit switching;
- save and reload;
- offline reload;
- PNG export;
- browser network inspection.

Run typecheck, tests, and the production build. Report automated results separately from manual checks.
```

## Prompt 7 — connect the export to narrowcasting

Run this only after the isolated integration passes.

```text
Connect onTemplateExportReady to this project’s existing narrowcasting media workflow.

First inspect and reuse the existing media upload and asset-storage services. Do not create a second storage system.

Requirements:

1. Convert pngDataUrl to a Blob/File using the existing project utility, or add one small tested utility if none exists.
2. Upload the PNG through the existing authenticated media service.
3. Preserve filename, width, height, template ID or saved-draft ID, session revision, render identity, and creation time as metadata where supported.
4. Return the existing narrowcasting media/asset identifier.
5. Let the user explicitly choose the campaign, playlist, or screen slot that receives the exported media.
6. Keep scheduling and playback behavior unchanged.
7. The screen/player should consume only the normal exported media URL or asset ID; it must not import Template Platform packages.
8. Show upload progress and recoverable errors.
9. Never publish an export produced from a stale or non-ready render identity.
10. Add an end-to-end test using the project’s existing media-service test doubles.

If the repository has no suitable media upload service, stop and report the missing backend contract rather than inventing one.
```

## Completion checklist

- Valid ZIP imports without a server route.
- Invalid ZIP produces structured diagnostics.
- The template renders through the SDK renderer.
- Supported fields edit and reset correctly.
- Browser-local draft save/reload works offline.
- Only the latest ready revision exports.
- The existing narrowcasting media pipeline receives the PNG.
- Existing screen playback displays the exported media.
- The Lovable build requires no GitHub credential.
- SDK import, rendering, persistence, and export make no external requests.
