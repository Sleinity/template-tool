# Internal Legacy, Semantic, and Compare Rollout Modes

> Historical evidence only. ADR 0071 supersedes these modes for active product behavior. The product now has one semantic-first path with automatic capability-level compatibility fallback.

## Status and boundary

Phase 13 implements a global internal/admin renderer preference without changing the ordinary-user default. The preference is separate from imported `TemplatePackageV1`, templates, drafts, source provenance, and renderer capabilities. Missing or invalid state preserves the current per-surface behavior.

The control is available only in development at `?renderer-admin=1`. It is deliberately absent from ordinary product copy and exported content. Stage 1 exposes mode changes through cohort state transitions rather than unrestricted mode buttons: enrolment begins in Compare, eligible observation may explicitly use Semantic, approval remains manual, and rollback writes `legacy` immediately without re-import.

## Persisted preference

`PersistedRendererRolloutPreferenceV1` is stored under `renderer-rollout-preference` in the existing IndexedDB `metadata` store:

- schema: `renderer-rollout-preference-v1`;
- scope: `global-internal`;
- mode: `legacy | semantic | compare`;
- update time for audit only.

The persistence identity hashes schema/status/mode, not time. A missing record is valid. Known string or version-zero records migrate to V1. Unknown or corrupt records become `safe-fallback` and keep the current surface default. Imported package bytes and saved template/draft records are never mutated.

## Resolved decision

`ResolvedRendererRolloutDecisionV1` wraps `ResolvedBackendDecisionV1` after family capability resolution and before final runtime owner activation. It records:

- requested/effective mode and activation source;
- current surface default and selected core `RuntimeRoutingMode`;
- current-default, compatibility, or semantic visible owner class;
- per-node selected owner set and primary owner;
- semantic/compatibility availability and coherent fallback reason;
- preference, source, resolved, backend, asset/placement, and export-safety identity;
- one `RendererCompareObservationV1`;
- nonblocking `technical-trace` rollout diagnostics.

Renderer components consume the centrally filtered backend decision. They do not read IndexedDB or raw preference values and do not independently reinterpret source properties.

## Mode semantics

| State | Core routing | Appearance owners | Visible template renders |
| --- | --- | --- | --- |
| No preference | Existing surface default: editor/hidden PNG `authoritative`, ordinary static `compare`, explicit inspection route retained | Existing accepted capability decisions | 1 |
| Legacy | `disabled` | Existing coherent compatibility owner where one exists; already accepted singular owners remain active when no separate legacy implementation exists | 1 |
| Semantic | `authoritative` | Certified semantic owner by family; unsupported families retain their coherent compatibility owner | 1 |
| Compare | `compare` | Current/default visible backend decision; alternate owner availability is observational | 1 |
| Invalid preference | Existing surface default | Original resolved tree unchanged | 1 |

Legacy does not roll back accepted source-certified primitive, gradient, ordered-SOLID, media, mask, or font implementations when no separate stable compatibility implementation exists. Phase 13 is rollout orchestration, not a renderer rewrite.

## Compare observation

`RendererCompareObservationV1` records legacy and semantic owner availability, effective visible owners, capability/fallback deltas, decision-level geometry/structure equality where provable, confidence, completeness, and revision. Production Compare is intentionally decision-only and may be partial. It records one visible and zero hidden template renders; it does not add hidden layout participants, double-paint, alter PNG capture, or upload data.

Pixel and full geometry evidence remain owned by the fidelity harness. Compare findings are developer telemetry, nonblocking, and not duplicated into ordinary Validate cards.

## Surface, export, and readiness rules

The provider resolves one global persistence identity before each renderer publishes. Validate, Fields, editor, inspection/review previews, visual-diff capture, and hidden PNG use the same requested/effective mode. PNG readiness waits for rollout preference loading and includes rollout decision/revision identity in the raster-readiness fingerprint.

All family capability and stale-revision gates remain in force. Semantic cannot force an unsupported node through a semantic owner. Compare cannot create a second visible or hidden template render. Renderer-time Figma access remains absent.

## Verification commands

- `pnpm runtime-rollout:control`: admin boundary, removal of direct mode bypass, safe no-subject state, immediate Legacy rollback, corrupt-preference fallback, console, and no-Figma request evidence.
- `pnpm runtime-rollout:cohort-eligibility`, `runtime-rollout:cohort-persistence`, `runtime-rollout:cohort-incidents`, and `runtime-rollout:cohort-invalidation`: deterministic evaluator, records, state transitions, migration/corruption, incidents, expiry, and invalidation.
- `pnpm runtime-rollout:cohort-browser`: real-package enrolment, observation, compatibility acceptance, approval, reload/offline identity, PNG, incident rollback, expiry, and corrupt cohort recovery.
- `pnpm runtime-rollout:scenarios -- --renderer-mode <legacy|semantic|compare> --fixture <ids> --surface validate,fields,editor,png-export`: two-pass all-surface mode evidence through the existing fidelity browser harness.
- `pnpm fidelity:compare`: unchanged ordinary-user/default approved-reference guard.
- Existing routing, font, text-trim, media, mask, primitive, stroke, gradient, ordered-SOLID, scene, and settlement commands remain authoritative for their families.

## Public rollout remains blocked

Phase 13 does not expose the selector publicly, migrate existing templates, make Semantic the default, remove compatibility, or make visual diffs blocking. Any public or percentage rollout requires a separate decision based on compare completeness, fallback distribution, export safety, performance, and reviewed fixture evidence.

## Operator-cohort policy

The implemented local operator policy is [Semantic Renderer Rollout Policy](SEMANTIC_ROLLOUT_POLICY.md). `RendererRolloutCohortProvider` is the sole cohort-metadata reader, and `TemplatePackageRenderer` publishes revision-current existing backend/diagnostic/readiness evidence only inside the internal access boundary. Pending font/text settlement evidence is not allowed to overwrite a newer ready subject.

Stage 1 stores append-history eligibility, observation, decision, and incident records under `renderer-rollout-cohort`, separate from `renderer-rollout-preference`. No existing preference is migrated into approval. Clearing cohort state clears only that subject and restores missing-preference behavior; it never deletes a template or draft. Stage 2 template opt-in remains unimplemented and unauthorized.
