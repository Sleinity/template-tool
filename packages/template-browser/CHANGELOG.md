# @sleinity/template-browser

## 1.0.0

### Major Changes

- Advance the canonical TemplatePackage and content contract to schema 2.2. Image
  fields now require one `replacementPlacement` policy—Fill, Fit, or Crop—instead
  of an allowed-placement set plus a separate default. Exporter 1.0 input receives
  provenance-preserving normalization and defaults to Fill, while canonical 2.0
  and 2.1 packages require reimport.

  Keep imported Figma placement separate from replacement policy, enforce the
  policy across single and Family sessions, use Fill when a Crop-policy host does
  not supply crop data, and restore imported placement on Reset. Add current saved
  session and Family envelopes plus lightweight `Reimport required` Library
  records for incompatible saved work.

- Replace the supported draft catalogue with a template-scoped recovery repository. This is a breaking pre-1.0 API change: draft list/get/save/delete helpers and Family `saveDraft` are no longer available through supported entry points. Generic template and session persistence remains available.

  Recovery provides inspect, fresh/resume, owned save, discard, and export completion for single and Family canonical payloads. Persistent ownership prevents superseded sessions and late autosaves from restoring completed work. Successful export callbacks complete only their matching recovery session; failed cleanup can be retried without exporting again.

### Minor Changes

- 944c51b: Correct and extend Template Family selection while preserving the published 0.8 tuple contract. Independent selection properties now resolve their combined option values to one concrete ZIP variant, expose availability without silently changing another property, and can be interleaved with editable fields through an optional stable control order. Studio authors properties and assignments directly on variant rows, and React exposes the same ordered selector-and-field inventory additively.
- Add public atomic V2 session configuration transactions and Core canonical
  configuration reconciliation, including stable choice identity and revision-safe
  configuration changes. Preserve corrective mutations for semantically invalid
  content. Correct local Blob image carriers/dimension ingestion and acquire React
  renderer publication leases on committed mounts with operation-current async
  callbacks. Prove Studio and external controls against the same public contracts.
- Add the strict TemplatePackageV2 field-contract foundation: seven discriminated
  field definitions, exact imported bindings, stable choices, portable editor
  order, opaque Color normalization, V1-to-V2 parsing and diagnostics, rendered
  line-validation evidence types, and atomic Template Family configuration
  overrides. Add the DOM-free seven-field semantic kernel, one immutable revisioned
  content reducer, typed mutation helpers, deterministic Number/Date formatting,
  exact Color/Image/Boolean materialization, ordered safe host descriptors, and a
  pure one-way V2 package materializer. V1 compatibility APIs remain available alongside the recommended V2 native
  session/renderer path. They do not imply canonical saved-record migration.

  Extend `date-display-v1` with deterministic prefix, suffix, separator,
  year-first, day/month and month/day presentation. Loose exporter input now
  normalizes unambiguous numeric displayed dates to canonical `YYYY-MM-DD`, using
  the recorded export year only when the displayed value intentionally omits it.

  Add canonical V2 Browser/React sessions and structural Boolean rendering. Add
  Family content V3 with one shared Image asset/default placement, sparse
  variant-only placement overrides, current saved-record validation, typed Family Image
  controller methods, and the ordinary affine editor-Crop path with
  cover-within-canonical aspect adaptation.

  Use typed `<type>:<name>` field identities and portable content/order/overrides.
  The current canonical contract is schema 2.2, superseding the intermediate 2.1
  roadmap. Canonical 2.0/2.1 packages and incompatible saved envelopes require
  reimport; no migration-on-read promise remains. Source schema 1.0 still uses
  provenance-preserving normalization. Different field types may share a source
  name; compatible repeated Booleans merge into a multi-target control. Descendant
  controls follow participation without discarding canonical child content.

- Add `runTemplatePackageImportPipelineV2` to the curated importer entry. Hosts receive canonical V2 packages, separate import/normalization evidence, explicit blocked/error outcomes and idempotent resource disposal. Studio ZIP ingestion now uses this operation while retaining existing authoring and session authorities. Compiler experiments remain private.

### Patch Changes

- Correct V2 line-evidence invalidation, repairable single-template Crop
  persistence, atomic Family Choice reconciliation, and reference-aware Family
  replacement-asset cleanup without changing public APIs or schemas.
- Serialize single and Family session saves, bound ZIP decoded output and cumulative reads, add explicit import URL ownership, and expose existing V2 source assembly through the importer entry point. Reuse decoded previews and derive confirmation release metadata from the package manifest while retaining historical Family confirmations.

  Complete compatibility-session cancellation cleanup and save-held resource leases. Remove measured pre-materialization copies and cache strict validation only for deeply immutable packages, without changing canonical content, output or readiness semantics.

- Add V2 Family selection-property metadata, portable tuple resolution and
  availability helpers, atomic configuration mutations, independent editor-control
  ordering, and session option selection without changing canonical Family content.
- Updated dependencies
- Updated dependencies [944c51b]
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @sleinity/template-core@1.0.0

## 0.8.0

### Minor Changes

- Add a revision-safe `TemplateFamilySessionV1`, family confirmation/reimport
  controller, headless family wizard, and dedicated family persistence stores.
- Present 0.7 templates and drafts as deterministic one-variant families in
  memory without eagerly rewriting or deleting legacy records.
- Updated dependencies
  - @sleinity/template-core@0.8.0

## 0.7.0

### Patch Changes

- Freeze the browser contract and verify its session, importer and focused
  subpaths through source-parity and packed-archive consumer gates.
- @sleinity/template-core@0.7.0

## 0.6.0

### Minor Changes

- Add structured field-validation evidence to import snapshots, confirmations,
  compatibility inspection, and legacy-confirmation reopening.
- Keep invalid setup drafts separate from the last valid package and guarantee
  actionable diagnostics for blocked render validation.
- Publish revision-bound managed-font preparation evidence from the session and
  activate exact managed faces through the injected registry before readiness.
- Limit wizard field rules to ordering and meaningful host-input constraints;
  legacy enabled/help-text confirmation metadata remains accepted but ignored.
- Treat zero-routed compatibility rendering as ready when its established
  package, font, asset, DOM, and export-safety checks pass.
- Updated dependencies
  - @sleinity/template-core@0.6.0

## 0.5.0

### Minor Changes

- Add supported `assets`, `fonts`, `persistence`, `capture`, and `enrichment`
  entry points while retaining every broad root and 0.4 curated export.
- Updated dependencies
  - @sleinity/template-core@0.5.0

## 0.4.2

### Patch Changes

- Advance the fixed SDK train for physical React renderer ownership. Browser
  runtime behavior and supported exports are unchanged.
- Updated dependencies
  - @sleinity/template-core@0.4.2

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
- Resolve workspace core declarations from source during local package builds
  so concurrent fixed-train `prepack` builds cannot race another package's
  output cleanup.
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
