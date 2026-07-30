# @sleinity/template-browser

## 0.4.1

### Patch Changes

- Make the package the physical owner of browser assets, exact fonts,
  persistence, import orchestration, sessions, readiness, compatibility
  inspection, enrichment and PNG capture while retaining behavior-free root
  compatibility paths.
- Remove the font/persistence dependency cycle through one internal
  content-addressed binary storage layer and keep all public root and curated
  exports unchanged.
- Externalize `@sleinity/template-core` from the browser bundle so installed
  consumers no longer receive a second embedded copy of core.
- Updated dependencies
  - @sleinity/template-core@0.4.1

## 0.4.0

### Minor Changes

- Add curated session, importer, and compatibility entry points while retaining
  every existing root export.
- Add structured browser-runtime and confirmation compatibility inspection,
  SHA-256 confirmation integrity, and atomic confirmation reopening through
  fresh `loadTemplateState()` validation.
- Keep valid 0.3.0 confirmations loadable with a legacy-digest warning and make
  unavailable browser-local managed fonts explicit without claiming
  cross-device portability.
- Report the current validator's dynamic-code CSP requirement with a stable
  capability code and verify supported and intentionally restricted profiles.

### Patch Changes

- Updated dependencies
  - @sleinity/template-core@0.4.0

## 0.3.0

### Minor Changes

- Add the host-neutral template setup wizard, portable editable-field rule
  operations, and revision-safe session setup/font preparation APIs.
- Add the seven-step headless import controller, structured import/font/render
  reports, host adapters, immutable confirmation and blocked-import validation
  compatibility.
- Make the setup font path upload-only and require an exact, glyph-complete
  face while retaining lower-level compatibility contracts for existing
  packages.
- Accept an otherwise exact text face when only explicit emoji sequences use
  device fallback, and identify genuinely missing characters.
- Add atomic `loadTemplateState()` reopening for host-retained confirmed
  templates, with fresh validation, identity checks, rebuilt session state,
  baseline restoration and stale-work rejection.
- Keep the wizard focused on import and field-rule setup; external shells own
  content controls and preprocessing through the existing session mutation
  contract.

### Patch Changes

- Updated dependencies
  - @sleinity/template-core@0.3.0

## 0.2.2

### Patch Changes

- Replace the integration-specific distribution with host-neutral SDK and
  Lovable Business template-editor handoffs. Browser runtime behavior is
  unchanged.
  - @sleinity/template-core@0.2.2

## 0.2.1

### Patch Changes

- Project structured source diagnostics into blocked sessions, add opt-in silent
  PNG capture, and provide StrictMode-safe React session ownership for reusable
  host integrations. Build the browser package during prepack so packed and
  published archives cannot reuse stale output.
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
