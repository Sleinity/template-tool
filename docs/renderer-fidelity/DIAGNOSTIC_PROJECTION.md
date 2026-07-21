# Capability-Aware Diagnostic Projection

> MVP extension: `rendering-health-projection-v1` carries these backend findings into Validate, adds root-cause/origin/impact/action metadata, and reports source comparison as `not-run-in-product`. Pixel comparison remains harness-only.

## Purpose

Phase 12 adds one diagnostic projection over resolved backend decisions and existing resolved diagnostics. It does not duplicate package validation, asset/font readiness, field validation, export readiness, or visual comparison.

`ResolvedBackendDiagnosticProjectionV1` is attached to `ResolvedRenderTreeV1` and bound to `backendDecisionRevision`. It contains node diagnostics plus machine-readable capability and region groups.

## Classification

The projection can distinguish:

- source/exporter issues;
- normalization issues;
- unsupported renderer capabilities;
- layout or stabilization issues;
- missing fonts or assets;
- measurement variance;
- visual regressions;
- user-actionable issues.

Resolved warnings and family fidelity diagnostics remain their original evidence. The projection classifies and presents them; it does not rerun their validation logic. Whole-canvas visual comparison remains owned by the fidelity/quality layer and uses the same capability/region metadata shape.

## Diagnostic item

Each meaningful item records capability ID, support level, selected backend, runtime owner, disposition, fallback, confidence, known visual impact, concise explanation, repairability, source diagnostic codes, node ID, and stable region ID. Supported decisions without a warning or fallback stay out of the main issue list; engineering identity remains available through resolved-tree telemetry.

Main Import Inspector presentation stays calm:

- user-facing degraded fallback or missing-dependency items appear as review items;
- established export-safe compatibility owners remain technical telemetry and do not activate fallback or Review;
- affected layer names and plain-language support summaries identify the issue without exposing raw capability IDs;
- capability and region filters support focused review;
- repeated nodes group at capability level while their regions remain selectable;
- raw owner, fallback, confidence, revision, and source codes remain in the expanded technical view.

Raw renderer diagnostics already named by `sourceDiagnosticCodes` on the projected backend item remain available as technical trace rather than appearing as duplicate user cards. Font and asset dependency failures remain owned by their dedicated readiness diagnostics; derivative backend notices do not create a second Review card. Missing optional motion file/version/node records group as one user problem while retaining all technical instances. A resolved ZIP asset normalization suppresses the stale unresolved source trace from the user view without weakening real missing-dependency validation.

Rendering health separates the technical count of established compatibility owners from review-required fallback regions. Only the latter affects the main unresolved summary. Readable, persisted, decoded and export-safe large media is Information. Deterministic editor containment is Information while no overflow is observed. Missing/decode/storage failures, unsupported constraints, measured clipping, stale geometry, and unsafe export remain Review or Blocked.

Visual diff remains non-blocking by default. The projection does not turn a pixel difference into an import or export blocker without a separate readiness decision.

## Audience separation

User diagnostics are emitted only when there is a meaningful fallback, unsupported capability, or repairable source/dependency issue. Non-actionable engineering evidence is marked `technical-trace`. Exporter diagnostics, renderer telemetry, and comparison evidence remain separate audiences even when the projection links them.

Phase 13 rollout evidence remains a separate technical projection on `ResolvedRendererRolloutDecisionV1`. Active mode, capability fallback, incomplete Compare evidence, and corrupt-preference fallback are `technical-trace`, nonblocking, and not user-repairable. They are available through renderer telemetry and the opt-in admin control; they do not create duplicate Import Inspector cards or change Phase 12 grouping.

The implemented operator-cohort evaluator consumes diagnostic identities and repairability; it does not reclassify source or renderer evidence. Repairable blockers produce `blocked-pending-repair`, unsafe/nonrepairable invariants require Legacy, and incomplete or unreviewed evidence produces Compare-only. `RendererRolloutOperatorDiagnosticV1` adds only operator-local eligibility, incomplete-observation, stale/expiry, rollback, incident, approval, and persistence summaries. These stay in the `renderer-admin=1` cohort panel and never become ordinary Validate cards or duplicate Import Inspector findings. See [Semantic rollout policy](SEMANTIC_ROLLOUT_POLICY.md).

Unsupported, preserved-only, and degraded-fallback regions remain visible even when no user repair exists. Established compatibility ownership remains available in technical telemetry without implying a defect. `userRepairable` is reserved for a real dependency/source action such as linking a font or asset, correcting missing source evidence, or re-exporting; it is not inferred merely because a renderer capability is unsupported.

## Visible approval

The 2026-07-20 visible Chromium review is Result A. Healthy, compatibility, preserved-only, blocked dependency, and measurement-region cases were exercised in the actual import route. Default rows and selected summaries remain plain-language; backend ID, owner, support, confidence, fallback, source codes, decision identity, editability, export safety, and full revision identity appear only after expanding technical details. See [`REVIEW.md`](../../fidelity/evidence/phase-12-import-inspector-visible/REVIEW.md).
