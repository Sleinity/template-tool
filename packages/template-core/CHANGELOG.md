## Unpublished 1.0.0 candidate — V2-only / exporter 0.6.1

Retire V1 host workflows; retain source-schema 1.0 normalization and the private renderer bridge. ZIP import requires exporter 0.6.1; canonical schema remains 2.2. Existing V2 records and recovery remain supported, and historical stored bytes are untouched. Reduce duplicate validation, primitive interpretation and asset-collection scene copying without adding caches or backends.

# @sleinity/template-core

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

### Patch Changes

- Serialize single and Family session saves, bound ZIP decoded output and cumulative reads, add explicit import URL ownership, and expose existing V2 source assembly through the importer entry point. Reuse decoded previews and derive confirmation release metadata from the package manifest while retaining historical Family confirmations.

  Complete compatibility-session cancellation cleanup and save-held resource leases. Remove measured pre-materialization copies and cache strict validation only for deeply immutable packages, without changing canonical content, output or readiness semantics.

- Add V2 Family selection-property metadata, portable tuple resolution and
  availability helpers, atomic configuration mutations, independent editor-control
  ordering, and session option selection without changing canonical Family content.

## 0.8.0

### Minor Changes

- Add the portable `family` entry with stable family/field/variant identity,
  shared content, generic groups, typed rule inheritance, binding plans,
  validation, reimport evidence, and pure single-variant materialization.
- Preserve the strict single-ZIP `TemplatePackageV1` schema and every existing
  core entry unchanged.

## 0.7.0

### Patch Changes

- Freeze the fixed-train core contract and verify every published root/subpath
  against the shared SDK entry-point and packed-archive inventories.

## 0.6.0

### Minor Changes

- Add portable, structured editable-field rule validation through the supported
  `editor` entry point, including atomic constraint checks for text and image
  setup rules.

## 0.5.0

### Minor Changes

- Add supported `editor`, `assets`, `fonts`, `motion`, and advanced
  `inspection` entry points without changing the broad root contract.
- Physically own portable appearance and observational settlement inspection
  records previously reached through repository compatibility paths.

## 0.4.2

### Patch Changes

- Physically own the canonical scene contract previously bridged through root
  source while preserving the byte-identical public declaration.
- Add the unsupported `renderer-internal` sibling seam used exclusively by
  `@sleinity/template-react`; host applications must not import it.

## 0.4.1

### Patch Changes

- Advance the fixed SDK train for the browser-runtime ownership migration.
  Portable core behavior and the public core declaration are unchanged.

## 0.4.0

### Minor Changes

- Advance the fixed SDK train for the external-adoption compatibility contract.
  Portable importer, package, validation, field, and renderer-model behavior is
  unchanged.
- Initialize canonical schema compilation on first validation so browser
  runtime preflight can report restrictive CSP environments before import.

## 0.3.0

### Minor Changes

- Add the host-neutral template setup wizard, portable editable-field rule
  operations, and revision-safe session setup/font preparation APIs.
- Align portable font readiness with the established device-emoji fallback
  while keeping all non-emoji text-face coverage strict.

## 0.2.2

The fixed SDK train advances together with host-neutral installation,
authorization, and template-editor handoffs. Core importer behavior and its
public declaration are unchanged.

## 0.2.1

The fixed SDK train advances together. Core importer behavior and its public
declaration are unchanged in this patch.

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
