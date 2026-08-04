# @sleinity/template-react

## 0.7.0

### Minor Changes

- Add the headless host-editor entry point with a session-bound responsive viewport, editable-field controllers, and a consolidated revision-safe diagnostic projection. Reuse the viewport in the importer and generic template-editor reference.

### Patch Changes

- Align Studio's source aliases with the published importer entry, build all
  TypeScript entries together for declaration parity, and verify renderer,
  importer/CSS and editor bundles from packed archives.
- @sleinity/template-core@0.7.0
- @sleinity/template-browser@0.7.0

## 0.6.0

### Minor Changes

- Add compact actionable importer validation summaries, render-validation
  summary, and a robust atomic host-neutral field-rules editor. Studio retains
  its richer native validation and field-card presentation.
- Consolidate package, font, and render evidence into one reusable validation
  card while retaining the focused summaries for custom compositions.
- Combine Input Order and type-appropriate Input Rules in one accessible
  expandable field-card list and remove mutable enabled, label, help-text,
  pattern, counter, and overflow setup controls.
- Fit complete intrinsic template canvases into responsive preview frames with
  protected padding and no scrollbars while preserving renderer output.
- Keep device emoji fallback as internal evidence rather than setup copy.
- Updated dependencies
  - @sleinity/template-core@0.6.0
  - @sleinity/template-browser@0.6.0

## 0.5.0

### Minor Changes

- Add the supported advanced `inspection` entry for renderer feature coverage,
  fidelity risk, quality-report composition, and diagnostic projections.
- Keep Studio-only layout debugging, issue packets, stress reports, visual
  comparison, and development harnesses outside SDK archives.
- Updated dependencies
  - @sleinity/template-core@0.5.0
  - @sleinity/template-browser@0.5.0

## 0.4.2

### Patch Changes

- Physically own the renderer, inspection viewport, React/CSS/SVG adapters and
  renderer-specific runtime-routing closure previously compiled from root.
- Consume core renderer machinery through the fixed-train internal sibling
  seam, reducing embedded implementation without changing supported APIs or
  renderer behavior.
- Updated dependencies
  - @sleinity/template-core@0.4.2
  - @sleinity/template-browser@0.4.2

## 0.4.1

### Patch Changes

- Externalize the fixed-train core and browser packages from React builds
  without changing renderer, importer, inspection or PNG behavior.
- Updated dependencies
  - @sleinity/template-core@0.4.1
  - @sleinity/template-browser@0.4.1

## 0.4.0

### Minor Changes

- Consume the curated browser session and importer entry points without
  changing the React wizard, renderer, inspection, or PNG contracts.

### Patch Changes

- Updated dependencies
  - @sleinity/template-core@0.4.0
  - @sleinity/template-browser@0.4.0

## 0.3.0

### Minor Changes

- Add the host-neutral template setup wizard, portable editable-field rule
  operations, and session setup/font preparation APIs.
- Add provider/snapshot hooks, a renderer-backed preview bridge and a
  responsive seven-step default interface over the headless browser workflow.
- Replace setup font suggestions and replacements with a clear exact-file
  upload, verified reuse, and blocking readiness gate.
- Show exact emoji-fallback uploads as ready with a neutral portability note,
  while keeping ordinary missing characters blocking.
- Keep content editing host-owned: the wizard configures image constraints and
  Fill/Fit defaults without exposing its own image-editor adapter or content
  replacement controls.

### Patch Changes

- Updated dependencies
  - @sleinity/template-core@0.3.0
  - @sleinity/template-browser@0.3.0

## 0.2.2

### Patch Changes

- Replace the integration-specific distribution with host-neutral SDK and
  Lovable Business template-editor handoffs. React runtime behavior is
  unchanged.
- Updated dependencies
  - @sleinity/template-browser@0.2.2
  - @sleinity/template-core@0.2.2

## 0.2.1

### Patch Changes

- Project structured source diagnostics into blocked sessions, add opt-in silent
  PNG capture, and provide StrictMode-safe React session ownership for reusable
  host integrations. Build the React package during prepack so packed and
  published archives cannot reuse stale output.
- Updated dependencies
  - @sleinity/template-browser@0.2.1
  - @sleinity/template-core@0.2.1

## 0.2.0

### Minor Changes

- Add the SDK 0.2 consumer runtime contract: a revision-safe browser
  `TemplateSession`, injectable offline adapters, React session bindings, guarded
  current-identity PNG export, and isolated packed-tarball consumer verification.
  Add a UI-independent composable inspection viewport while preserving the
  existing inspection-preview API and moving Studio presentation out of the SDK.
  Make the portable ZIP importer, resolved/backend models, and field-editing
  contracts physically owned by `@sleinity/template-core`, and add a release
  handoff for direct GitHub Packages and secret-free Lovable Business consumers.

### Patch Changes

- Updated dependencies
  - @sleinity/template-core@0.2.0
  - @sleinity/template-browser@0.2.0
