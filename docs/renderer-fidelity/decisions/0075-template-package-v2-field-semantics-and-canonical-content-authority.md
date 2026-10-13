# ADR 0075: TemplatePackageV2 owns typed field semantics and canonical content authority

## Status

Accepted

## Context

`TemplatePackageV1.editableFields` combines generic constraints, presentation
behavior, arbitrary property paths, defaults, and host workflow policy. Current
mutation writes renderer-facing node properties directly and can later read
those properties as field values. Color marker fallback records a generic fill
collection and mutation selects the first SOLID paint. Textarea line validation
can fall back to explicit newline counting when no renderer measurement is
available.

That model cannot safely express seven distinct field semantics, formatted
Number/Date values, structural Boolean layout participation, replacement Crop,
or hard rendered-line validation without duplicate authorities.

## Evidence

- The canonical appearance model and CSS/SVG render paths carry alpha, but the
  editable Color path accepts only six-digit hex, forces alpha to one, discards
  alpha on value extraction, and has no edit/resize/reset/all-surface/export
  alpha fixture.
- Imported `color.a` and paint opacity have exporter-specific normalization and
  provenance rules. Imported-alpha evidence is not editable-alpha evidence.
- Existing image placement evidence proves that imported placement and
  replacement placement are separate authorities and that replacement must not
  reuse imported CROP data.
- Field ordering in source/node order does not necessarily match useful editor
  order.
- Current Template Family rules use sparse overrides, but collection replacement
  must be explicit before choices and placement policies become structured V2
  configuration.

## Decision

`TemplatePackageV2` is the next strict canonical runtime contract. It has
`schemaVersion: "2.0"`, seven discriminated editable field definitions, typed
import-resolved bindings, and an `editableFieldOrder` exact permutation.

V1/exporter input is accepted only at the source boundary and normalized once
to V2. Runtime mutation must never search for a target or interpret V1 generic
rules after the Milestone 2 cutover. Ambiguous Color targets are rejected or
resolved during setup and then persisted as an exact binding.

Initial Color values are opaque lowercase `#rrggbb`. Alpha syntax and semantics
remain unavailable until a separate fixture-led capability expansion proves the
editable lifecycle. A Color edit changes RGB on the exact bound SOLID fill and
preserves separately imported paint alpha/opacity semantics.

Image replacement supports Fill, Fit, and a producer-independent normalized
Crop result. `allowedPlacements`, when present, is a designer authorization
policy. Replacement never preserves imported crop. Reset restores the imported
asset and imported placement.

Choice options have stable IDs. IDs and normalized values are unique within a
field. Family collection overrides replace atomically; `null` clears an
inherited optional collection, and arrays never merge.

Canonical content may retain `selectedChoiceId` as provenance beside the
canonical value. Changing a selected stable option's configured value never
silently changes renderer output or relies on renderer readback: Core
reconciliation commits the new canonical value under an explicit new content
revision.

Configured Textarea `maxLines` means rendered visual lines. Mutations commit
canonical content immediately after deterministic checks, then publish pending
render validation. Pending or invalid required evidence blocks export but not
editing. Stale evidence cannot publish over a newer content revision.

`label` is optional and falls back to the field ID. `controlRole` is a
non-semantic hint with the resolution order field-specific host override,
recognized role, then default field-type control. Unknown roles remain usable.

The hard content invariant is:

> Canonical editable-field values must never be reconstructed from materialized renderer properties.

Materialization is one-way:

`base package + field configuration + canonical content state -> format/transform/bind -> renderer-facing working package`

Number, Date, Color, Image, and Boolean canonical values remain authoritative
regardless of their renderer representation. Reset, persistence, reimport, and
Template Families operate on canonical state and imported defaults, never on
parsed renderer output.

## Milestone boundary

Milestone 1 freezes and tests the V2 types, schema, semantic validator, V1-to-V2
normalizer, diagnostics, portable order repair, and family collection resolver.
The installed renderer/session stack remains on V1 until Milestone 2 introduces
the typed semantic kernel, separately revisioned content state, materializer,
and controller mutation authority. This avoids a half-migrated runtime or a
second long-lived interpreter.

## Alternatives

- Redefining `TemplatePackageV1` was rejected because it silently changes a
  persisted public contract.
- Keeping both field-rule interpreters was rejected because it creates
  duplicate semantic authority.
- Runtime Color target discovery was rejected because selection can change with
  paint order and unsupported paint families.
- Canonical RGBA was deferred because general renderer alpha support is not
  sufficient editable-field evidence.
- Removing image placement authorization was rejected because Fit/Fill/Crop can
  materially preserve or break a designed slot.
- Synchronously waiting for line measurement was rejected because it would make
  ordinary editing unresponsive.

## Compatibility and migration

Exact source bytes remain unchanged. Loose exporter compatibility stays at the
normalization boundary and strict V2 validation follows it. A V1 field converts
only when type, default, and target intent are unambiguous. Unsupported legacy
rules remain in field provenance and receive diagnostics rather than becoming
runtime rules. `preserve-original-crop` has no V2 mapping.

Marker-only Color fields convert only when exactly one eligible SOLID fill
exists. Multi-fill markers require an exact exporter binding or explicit Studio
setup resolution. Reimport retains surviving editor-order IDs, removes missing
IDs, appends new fields deterministically, and reports both changes before
strict validation.

## Verification

- Strict V2 schema and semantic validation tests.
- V1 descriptor and marker normalization tests.
- Exact and ambiguous Color binding tests.
- Opaque Color and alpha rejection tests.
- Choice identity/value uniqueness tests.
- Exact field-order and reimport repair tests.
- Atomic Template Family collection replacement/clear tests.
- Existing portable test suite and package typecheck with renderer behavior
  unchanged.

Renderer, scene, settlement, and approved pixel references are not updated by
this contract milestone.

## Reversal strategy

Before Milestone 2 runtime cutover, remove the isolated V2 contract and source
normalizer while retaining this ADR as rejected history. After cutover, any
change requires a new versioned package/content migration; V1 must not be
reintroduced as a runtime rule authority.
