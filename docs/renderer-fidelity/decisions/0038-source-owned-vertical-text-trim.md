# ADR 0038: Vertical text trim is an explicit source-owned semantic

## Status

Accepted

## Context

Figma `CAP_HEIGHT` text was preserved but interpreted as a browser line box, enlarging HUG geometry.

## Evidence

The exact now-hiring ZIP carries `text.leadingTrim: CAP_HEIGHT` and raw matching provenance on four text nodes. Exact-font browser evidence reproduces the ZIP's 93/124/76 px source heights within 0.4 px only when cap-to-final-baseline semantics are applied.

## Decision

Canonical `text.leadingTrim` owns vertical-trim intent. Map `CAP_HEIGHT` to cap-height-to-baseline, `NONE`/absence to normal line-box behavior, and every unknown value to explicit compatibility fallback. Never infer trim from content.

## Alternatives

Native CSS feature detection, uppercase heuristics, exporter snapshot height, and fixed pixel corrections are rejected.

## Consequences

Trim becomes a dependency of HUG, parent layout, FILL siblings, media slots, diagnostics, and export readiness.

## Compatibility impact

Text without trim is unchanged. Unknown or unavailable trim inputs retain coherent compatibility ownership.

## Migration impact

Future source-supported Figma trim modes require a new semantic mapping and fixture evidence.

## Verification

Source/provenance tests, scene serialization, exact-font browser scenarios, all-surface geometry, edits, reset, and PNG.

## Reversal strategy

Select compatibility authority for the affected subtree without removing source data or provenance.
