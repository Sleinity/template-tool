# ADR 0073 — Backend disposition separates ownership from fallback

Status: Accepted

## Context

`ResolvedBackendDecisionV1.fallback.active` previously became true whenever a compatibility backend was selected. Text also inherited `unsupported-primitive-kind`, and valid SVG assets with an omitted source `renderMode` were resolved as unsupported even though the established vector owner rendered them correctly. These classifications produced Review findings without a visible fidelity defect.

## Evidence

- Ordinary now-hiring text has resolved text, exact-font, measurement, trim, and editing authority, but the primitive audit reported it as an unsupported primitive kind.
- The deal-of-the-week logo resolves to a readable bundled SVG asset and renders through the SVG path; its source omits `vector.renderMode`.
- Visible Chromium review on 2026-07-21 shows both templates unchanged and Ready after the decision correction, with performance and containment cautions retained as Information.
- Explicit unsupported vector mode and missing dependency controls remain covered by negative tests.

## Decision

Every transient backend decision records one disposition: semantic owner, established compatibility owner, degraded fallback, preserved-only, or unsupported. Compatibility selection alone does not activate fallback. Text selects the explicit `text-dom` owner and primitive fallback reasons apply only to primitive-eligible kinds. An omitted vector mode infers `SVG_ASSET` only from a successfully resolved vector asset and records `asset-evidence` provenance; explicit unsupported intent is never inferred away.

Dedicated font and asset readiness diagnostics own dependency failures. The backend projection does not duplicate them. Review is reserved for credible visual, edit, persistence, or export risk; safe performance and containment cautions are Information.

## Alternatives

- Keep every compatibility owner as Review: rejected because it confuses implementation history with active fidelity loss.
- Suppress findings by template or approved-reference identity: rejected because classification must remain capability- and evidence-based.
- Promote all omitted vector modes: rejected because missing, incompatible, malformed, or explicitly unsupported sources must remain visible.

## Consequences

The validator becomes quieter for healthy templates while unsupported and unsafe behavior remains prominent. Backend identities change because ownership evidence changes; template pixels and persisted package schemas do not.

## Compatibility impact

No package migration is required. Older packages reconstruct the transient decision from current source and resolved evidence. Existing compatibility renderers remain available and unchanged.

## Migration impact

None for persisted template data. Rendering-health consumers gain `reviewFallbackRegionCount`; `compatibilityRegionCount` remains technical ownership telemetry.

## Verification

Unit coverage checks text ownership, primitive-reason isolation, SVG mode inference provenance, explicit unsupported preservation, informational cautions, and material fallback grouping. Real-template browser checks cover now-hiring and deal-of-the-week. Renderer, scene, settlement, lifecycle, persistence, offline, and PNG guards remain required.

## Reversal strategy

Revert the transient disposition and projection changes. No stored package data or approved reference requires reversal.
