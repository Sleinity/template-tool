# @sleinity/template-react

## 2.0.1

### Patch Changes

- 1cd4181: Fix stale renderer readiness after reload, reset and saved-session restoration.
  Preserve shared Family choices during ordering and unrelated configuration edits,
  and restore renderer publication after correcting invalid content.

  Studio now validates textarea line limits against the visible renderer, restores
  rejected edits without saving provisional content, uses effective Family image
  diagnostics, and exposes invalid choice selections for repair.

  No public API or saved-data migration changes. Core advances with the fixed SDK
  train; its portable behavior is unchanged.

- Updated dependencies [1cd4181]
  - @sleinity/template-core@2.0.1
  - @sleinity/template-browser@2.0.1

## 2.0.0

### Major changes

- Support V2 host workflows only; retire V1 editing/importer/persistence workflows.
- Require exporter 0.6.1 at ZIP admission; preserve source schema 1.0 normalization and canonical schema 2.2.
- Deliver current host documentation and the React/TypeScript single/Family starter. See the SDK 2.0 migration guide for package-specific removed entries.

Retire V1 host workflows; retain source-schema 1.0 normalization and the private renderer bridge. ZIP import requires exporter 0.6.1; canonical schema remains 2.2. Existing V2 records and recovery remain supported, and historical stored bytes are untouched. Reduce duplicate validation, primitive interpretation and asset-collection scene copying without adding caches or backends.

# @sleinity/template-react

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

### Minor Changes

- 944c51b: Correct and extend Template Family selection while preserving the published 0.8 tuple contract. Independent selection properties now resolve their combined option values to one concrete ZIP variant, expose availability without silently changing another property, and can be interleaved with editable fields through an optional stable control order. Studio authors properties and assignments directly on variant rows, and React exposes the same ordered selector-and-field inventory additively.
- Add the strict TemplatePackageV2 field-contract foundation: seven discriminated
  field definitions, exact imported bindings, stable choices, portable editor
  order, opaque Color normalization, V1-to-V2 parsing and diagnostics, rendered
  line-validation evidence types, and atomic Template Family configuration
  overrides. Add the DOM-free seven-field semantic kernel, one immutable revisioned
  content reducer, typed mutation helpers, deterministic Number/Date formatting,
  exact Color/Image/Boolean materialization, ordered safe host descriptors, and a
  pure one-way V2 package materializer. The final unpublished 1.0.0 candidate retires V1 host compatibility APIs; use the V2 native session/renderer path. They do not imply canonical saved-record migration.

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

### Patch Changes

- Keep source-certified full-parent ALPHA masks aligned with live editor layout so
  Boolean structural reflow does not clip active sibling content with stale insets.
- Add public atomic V2 session configuration transactions and Core canonical
  configuration reconciliation, including stable choice identity and revision-safe
  configuration changes. Preserve corrective mutations for semantically invalid
  content. Correct local Blob image carriers/dimension ingestion and acquire React
  renderer publication leases on committed mounts with operation-current async
  callbacks. Prove Studio and external controls against the same public contracts.
- Updated dependencies
- Updated dependencies
- Updated dependencies [944c51b]
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @sleinity/template-browser@1.0.0
  - @sleinity/template-core@1.0.0

## 0.8.0

### Minor Changes

- Add family importer components and family editor hooks through the existing
  `importer` and `editor` entries while continuing to render the selected
  variant through `TemplateSessionViewport`.
- Updated dependencies
  - @sleinity/template-core@0.8.0
  - @sleinity/template-browser@0.8.0

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
