# ADR 0067: Backend diagnostics project existing evidence

- Status: Accepted

## Context

Importer, normalization, renderer, asset, font, field, export, and visual evidence already produced diagnostics, but backend capability and fallback identity was mainly available in tests and DOM telemetry.

## Evidence

The quality workspace already separates user, validation-history, and technical-trace audiences and supports grouped affected targets. Resolved family contracts already publish warnings and fallback codes.

The 2026-07-20 visible review exercised healthy semantic owners, compatibility, preserved-only output, blocked font readiness, and measurement-region selection. It confirmed that ordinary rows can remain plain-language while the expanded view retains decision/fallback/revision evidence. The review packet is [`phase-12-import-inspector-visible/REVIEW.md`](../../../fidelity/evidence/phase-12-import-inspector-visible/REVIEW.md).

## Decision

Create `ResolvedBackendDiagnosticProjectionV1` from backend decisions and existing resolved evidence. Add capability and region group identities. Adapt meaningful projected items into the existing quality report and Import Inspector; keep raw engineering fields in the expanded view. Do not duplicate validation logic or make visual diff blocking.

## Alternatives

- Add a second diagnostics product: rejected as duplicate presentation and authority.
- Show every backend decision as a warning: rejected as noisy and misleading.
- Keep capability evidence test-only: rejected because operators cannot explain fallbacks.

## Consequences

Users see calmer capability-level explanations and affected regions. Developers retain owner, support, confidence, fallback, revision, and source-code details.

## Compatibility impact

Diagnostic presentation gains additional non-blocking review/technical items. Renderer pixels and export readiness rules are unchanged.

## Migration impact

Later visual-regression and rollout telemetry can use the same classification and grouping contract.

## Verification

Unit tests cover deterministic projection identity, capability/region groups, quality adaptation, repairability, source-diagnostic deduplication, search/filter/group behavior, and technical detail exposure. Visible browser review covers hierarchy, grouping, repair actions, region selection, zoom, highlights, and expanded telemetry.

## Reversal strategy

Stop adapting the projection into the quality report while retaining backend decisions; existing diagnostics remain intact.
