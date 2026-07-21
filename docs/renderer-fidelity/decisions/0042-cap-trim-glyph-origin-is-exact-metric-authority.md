# ADR 0042: CAP_HEIGHT glyph origin is exact-metric authority

## Status

Accepted

## Context

Milestone 5.1 made the semantic trim height authoritative, but the renderer still flex-aligned an untrimmed browser line-box span and then applied cap compensation. HUG source CENTER/BOTTOM alignment therefore displaced glyph paint inside or across the correct semantic box.

## Evidence

All four now-hiring text nodes are vertically HUG while carrying CENTER or BOTTOM source alignment. The 5.1 exact candidate paints caps above the semantic outline. Milestone 5.2 browser telemetry proves local cap-top 0 and final baselines 93.125/124.40002/76.40002 across Validate, Fields, editor and hidden PNG after separating the semantic wrapper and paint span.

## Decision

For authoritative `CAP_HEIGHT`, derive glyph translation only as negative measured first-cap-top in browser line-box coordinates. HUG starts the semantic wrapper at local zero and bypasses vertical alignment. A larger fixed node may align the semantic wrapper TOP/CENTER/BOTTOM; it never aligns or centres the glyph layer directly.

## Alternatives

Flex-aligning the browser line box, centring by spare space, translating the outer node, glyph-bound alignment, exported-height correction, and fixed font offsets are rejected.

## Consequences

Semantic height and paint origin remain independent. Glyph overhang can exist outside the semantic box without changing HUG or implying clipping. Cached/exact font activation must invalidate both metrics and translation.

## Compatibility impact

Only exact/approved `CAP_HEIGHT` text changes. Normal text retains existing vertical alignment. Unsupported trim/rich-text/font states remain coherent compatibility routes. No schema, media, paint, mask, effect, or Canvas behavior changes.

## Migration impact

Future trim modes and rich runs require their own source/metric evidence. The semantic wrapper becomes the required fixed-box alignment boundary.

## Verification

Pure origin and centred-failure tests; exact/delayed font runs; uppercase, multiline, descender, edit/reset, HUG propagation, fixed CENTER/BOTTOM, all-surface captures, source overlay, and real PNG.

## Reversal strategy

Return affected text to coherent compatibility ownership while retaining canonical trim and metric evidence. Do not restore a fixture-specific offset or update references to mask the regression.
