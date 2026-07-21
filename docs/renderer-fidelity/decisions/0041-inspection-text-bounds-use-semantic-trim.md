# ADR 0041: Inspection text bounds use the semantic trimmed box

## Status

Accepted

## Context

Validate and Fields outlines followed oversized renderer line/wrapper boxes for CAP_HEIGHT text.

## Evidence

The shared `TemplateInspectionPreview` now reads authoritative trim telemetry. Exact-font Validate/Fields captures outline the 93.125/124.4/76.4 px semantic boxes while glyph overhang remains separately visible.

## Decision

For authoritative cap-to-baseline text, ordinary inspection and editable-target outlines use the Figma trimmed box. Developer telemetry retains outer layout, browser line, glyph paint, and clipping bounds.

## Alternatives

Flex-wrapper bounds, `scrollHeight`, browser line boxes, and glyph overhang bounds are rejected as default selection geometry.

## Consequences

Inspection overlays remain surface-only and cannot enter PNG content.

## Compatibility impact

Non-trim and compatibility-owned targets keep their existing rendered/resolved bounds.

## Migration impact

Other semantic selection shapes require their own ownership evidence.

## Verification

Pure bounds selection tests plus exact-font Validate, Fields, editor, and PNG captures.

## Reversal strategy

Fall back to the rendered compatibility target box for unsupported trim modes.
