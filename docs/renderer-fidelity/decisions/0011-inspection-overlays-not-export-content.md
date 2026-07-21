# ADR 0011: Inspection overlays are not export content

## Status

Accepted

## Context

Highlights, dimming, debug overlays, attributes, and telemetry can contaminate captured output.

## Evidence

Inspection previews pass target/highlight controls. The hidden export renderer is called without debug/highlight props and is captured separately.

## Decision

Inspection/debug presentation remains outside export content and must never affect exported template pixels or semantics.

## Alternatives

Capturing an actively highlighted inspection surface is rejected.

## Consequences

Call sites and future graph/backends need an explicit non-export overlay layer.

## Compatibility impact

Preserves existing separate hidden export tree.

## Migration impact

Future settled graph shares content state, not inspection nodes.

## Verification

Export with selections/diagnostics enabled and assert no overlay pixels/content; structural DOM audit.

## Reversal strategy

Disable overlays and capture a clean renderer root.
