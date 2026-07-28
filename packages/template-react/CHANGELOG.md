# @sleinity/template-react

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
