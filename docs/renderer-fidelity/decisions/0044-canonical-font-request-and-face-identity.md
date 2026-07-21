# ADR 0044: Canonical font request and face identity

## Status

Accepted

## Context

Exporter requests, OpenType name records, managed records, and CSS families previously collapsed into one family string. `GeistMono-Medium.ttf` was rejected because name ID 1 is `Geist Mono Medium` while the source correctly requests typographic family `Geist Mono` at weight 500.

## Evidence

The exact 149,328-byte binary hashes to `90b15711dc3779b2e64e8aff5228154dd019a90bce4947549c4a8a8a43f2ac25`. Its IDs 16/17 are `Geist Mono`/`Medium`; IDs 1/2 are `Geist Mono Medium`/`Regular`; ID 4 is `Geist Mono Medium`; ID 6 is `GeistMono-Medium`. Unit tests cover this naming pattern and the real UI accepts the hash-gated face as exact.

## Decision

Use versioned request and face objects. Preserve every relevant source and OpenType identity separately. Prefer typographic family/subfamily for semantic family matching and retain legacy/full/PostScript/raw records as evidence. One matcher owns candidate discovery and final link validation.

## Alternatives

Filename matching and legacy-family preference were rejected because they misclassify valid faces. Family-only CSS checks were rejected because browsers may satisfy them with local fallback.

## Consequences

Exact, compatible, replacement, missing, ambiguous, axis, and glyph-coverage outcomes are explicit. The managed-record schema advances compatibly to V2.

## Compatibility impact

Canonical validation stays strict. Older records normalize on read. Unknown faces retain fallback/replacement behavior rather than being guessed exact.

## Migration impact

New links persist request and face identity. Existing stored blobs are not duplicated and legacy records are not destructively rewritten.

## Verification

Parser, matcher, deduplication, history, mapping, real Fonts upload, restore, all surfaces, and PNG export are covered. Cross-browser equivalence remains open.

## Reversal strategy

Stop assigning exact authority to V2 fields and fall back explicitly; retain the V2 evidence and binary blobs for a corrected matcher.
