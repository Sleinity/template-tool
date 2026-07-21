# ADR 0045: Hash-derived private runtime font family

## Status

Accepted

## Context

Registering managed binaries under human family names lets an installed/system face satisfy CSS readiness and can make measurement authority disagree with painted glyphs.

## Evidence

The source-authoritative run records the requested family, binary hash, face index, private family, computed CSS family, exact measurement state, and identical repeated pixels across Validate, Fields, editor, and PNG. An independent probe measures the linked Geist binary at 864 px versus 771.2 px for system-ui for the same 40 px sample. Approval review also found that dynamic `FontFace` registration alone does not cross html-to-image's SVG clone boundary.

## Decision

Register and render linked binaries under a deterministic private family derived from full binary hash, collection face index, and axis instance. Human names remain semantic/UI identity. Readiness and measurement require the private loaded face. Compute the browser font portion of a render revision from effective package faces only, and treat equivalent repeated registrations as one descriptor.

## Alternatives

Human-family registration and `document.fonts.check()` alone were rejected because neither proves which binary paints.

## Consequences

Local face collisions cannot silently become exact authority. CSS/debug output contains internal families; developer telemetry retains both identities. Unrelated application fonts and duplicate registration do not create false settlement revisions; delayed requested-face activation still does. Exact linked binaries are embedded explicitly in the PNG clone without changing registration or revision authority.

## Compatibility impact

Unlinked and fallback text keeps prior human-family behavior. Linked package assets and managed assets use the private family without changing source text semantics.

## Migration impact

V1 managed records derive a private family on read. New links persist it. No font binary is copied into the production bundle.

## Verification

Hash identity, runtime registration, exact and delayed measurement, unrelated-face exclusion, duplicate-registration idempotence, repeated surfaces, persisted draft restore, and real PNG export are exercised by unit and source-authoritative browser profiles.

## Reversal strategy

Route linked nodes to explicit compatibility ownership while preserving the stored private identity fields and blobs.
