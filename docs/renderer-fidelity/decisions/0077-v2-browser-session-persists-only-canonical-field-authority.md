# ADR 0077: V2 Browser sessions persist only canonical field authority

- Status: Accepted
- Date: 2026-09-02

## Context

ADR 0076 established one Core content reducer and one-way materializer. Browser
editing, persistence, reimport, family selection, and React hosts need a common
lifecycle without treating materialized renderer properties as editable state.

## Decision

`createTemplateSessionV2()` owns the immutable configured package, canonical
`TemplateFieldContentStateV1`, browser asset handles, revision-bound validation
evidence, and derived materialization. Typed controllers dispatch only Core V2
commands. A renderer compatibility package may be derived one-way, but it is
not persisted and cannot be read back into canonical content.

Persisted V2 records store the configured package, canonical content, and
managed asset references under explicit new schema versions. Existing V1
records are not reinterpreted. Reimport is planned by stable field ID and exact
binding semantics; removed content requires review and incompatible types or
properties block apply.

Template Field Families resolve common typed configuration plus sparse variant
overrides into one ordinary V2 package. Collections replace atomically. One
shared family content state survives variant changes even when the selected
variant makes it invalid. Correction still flows through the Core reducer.

Renderer line and runtime readiness evidence publishes only for the exact
current content/materialization identity. Pending hard evidence withholds
export, not editing.

## Consequences

- Working packages and renderer projections are reproducible derived state.
- Browser code owns image ingestion, managed assets, object URLs, stale work,
  and disposal, while Core owns canonical image intent.
- React hosts receive typed controller composition APIs without Studio or
  renderer-internal dependencies.
- The legacy V1 public session remains an isolated compatibility path until its
  current Studio consumer migrates; it is never synchronized with V2 and its
  saved records cannot be guessed into canonical V2 state.
- Structural Boolean layout, visual line measurement, crop rendering, and
  Studio V2 configuration remain outside this decision.
