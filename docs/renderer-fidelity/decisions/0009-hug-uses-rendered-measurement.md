# ADR 0009: HUG text uses rendered measurement

## Status

Accepted

## Context

Font metrics and line wrapping determine actual HUG text height.

## Evidence

`TemplatePackageRenderer.tsx` measures rendered text with Range/canvas data, observes resize and font loading, and applies cap-height-aware height for HUG text.

## Decision

HUG text uses browser-rendered measurement while retaining canonical semantic intent and font provenance.

## Alternatives

Exporter snapshot height alone and fixed heuristic metrics are rejected.

## Consequences

Font readiness and width are dependencies; current measurement must later be published into the settled graph.

## Compatibility impact

Preserves responsive now-hiring behavior.

## Migration impact

Milestone 3 owns explicit invalidation/readiness; Milestone 4 owns typography fidelity.

## Verification

Exact/fallback/delayed fonts, width changes, edit/clear, ancestor reflow, and export.

## Reversal strategy

Retain the current DOM measurement hook until a replacement passes equivalent browser evidence.
