# ADR 0028: Browser text measurement is intrinsic input only

## Status

Accepted

## Context

Fonts and shaping require a browser, but final DOM boxes would preserve circular runtime authority.

## Evidence

Controlled exact/fallback/delayed/unavailable font scenarios, stale font-revision rejection, isolated max-content width probes, semantic line-box height, and now-hiring edit/reflow evidence all pass. Final routed geometry is computed without DOM bounds records.

## Decision

The browser supplies revision-tagged glyph width, line count, cap height, line height result, and font state. Settlement alone computes final node, ancestor, sibling, image-slot, and clip bounds.

## Alternatives

Treating `getBoundingClientRect()` final renderer boxes as authoritative settlement input is rejected for migrated properties.

## Consequences

Mixed runs, bidirectional text, variable axes, and advanced paragraph semantics remain compatibility routes until their probes are proven.

## Compatibility impact

Current approved text pixels remain unchanged.

## Migration impact

Future text capability work extends the intrinsic measurement schema rather than reintroducing final-box reads.

## Verification

Font Stage 4A evidence, stale-publication tests, rapid edits, reset, root resize, and PNG comparison.

## Reversal strategy

Route affected text subtree back to compatibility authority.

