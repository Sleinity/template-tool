# ADR 0070: Operator-cohort eligibility and rollback authority

- Status: Superseded for active product behavior by ADR 0071; retained as historical evidence

## Context

Accepted ADR 0068 provides persisted internal Legacy/Semantic/Compare modes, one visible Compare owner, shared all-surface identity, and immediate Legacy rollback. It does not define which templates may enter a trusted operator cohort, how evidence ages, or who may approve or revoke Semantic use.

The repository already exposes strict import readiness, exact asset/font status, `ResolvedBackendDecisionV1`, capability-aware diagnostics, settlement/export readiness, local persistence evidence, and guarded structural/pixel comparisons. A cohort policy should aggregate these authorities rather than build a second validator.

## Evidence

Phase 13 mode captures are deterministic across Validate, Fields, editor, and PNG; offline restoration preserves mode identity; renderer-time Figma requests remain absent; and rollback requires no re-import. The corpus also contains intentional compatibility regions, reviewed deterministic raster residuals, historical references that are not always source authority, and unsupported families. Therefore a single whole-canvas percentage or a one-time static capture cannot safely authorize Semantic rollout.

## Decision

Accept `renderer-semantic-rollout-policy-v1` and its five-stage model for the implemented local Stage 1 boundary. Stage 1 eligibility is tied to an exact content-addressed subject and derived from existing lifecycle, backend, diagnostic, readiness, persistence, and fidelity evidence.

The ordered outcomes are `blocked-pending-repair`, `legacy-required`, `compare-only`, `eligible-with-accepted-compatibility`, and `eligible-for-semantic`. Hard failures trigger immediate Legacy rollback. Accepted compatibility requires an explicit region/reason/evidence disposition. Missing, incomplete, stale, or unreviewed evidence cannot silently approve Semantic.

Operational records are `RendererRolloutEligibilityV1`, `RendererRolloutObservationV1`, `RendererRolloutCohortDecisionV1`, and `RendererRolloutIncidentV1`. They remain separate from imported package semantics and use content/revision identities rather than template names or customer conditions. Approval records require an operator-supplied identity because the repository has no authentication authority.

Stage 1 remains manual, internal, local-only, reversible, and evidence-led. It does not authorize public controls, remote telemetry, template-level Semantic persistence, default migration, reference updates, or Legacy removal.

## Alternatives

- Approve any package with no blocking diagnostic: rejected because fallback, comparison, persistence, and export evidence would be ignored.
- Use one whole-canvas pixel percentage: rejected because structural and regional failures can be hidden by a large canvas.
- Store approval in `TemplatePackageV1`: rejected because rollout policy is not source design semantics.
- Automatically promote after elapsed time: rejected because real edits, exports, reloads, offline restoration, and operator review are required.
- Upload cohort telemetry: rejected for the first cohort because local/repository evidence is sufficient and content sensitivity has not been governed.

## Consequences

The next implementation has an explicit pure evaluator, observation ledger, invalidation model, and rollback authority. Compatibility can participate only when reviewed rather than being hidden. Any material subject or policy revision makes approval stale.

The policy is intentionally conservative and creates operational work for each template. That cost is accepted before default behavior changes.

## Compatibility impact

The internal admin path may request an existing mode only through a valid cohort transition. Runtime routes, renderer owners, ordinary defaults, packages, drafts, fixtures, support claims, references, and tolerances remain unchanged.

## Migration impact

The local `renderer-rollout-cohort-store-v1` is added under IndexedDB metadata. Missing state means not enrolled. Readable version-zero entry arrays migrate; unknown schema/enum or corrupt records are quarantined and select Legacy. Existing preferences are never migrated into approval.

## Verification

Unit tests cover deterministic eligibility, outcome order, subject identity, compatibility, observation completion, state transitions, expiry/invalidation, incidents, migration, unknown-enum rejection, and corrupt-state recovery. Browser evidence covers real import, manual observation/approval, persistence, offline restoration, all-surface/PNG mode identity, one visible owner, zero renderer-time Figma requests, rollback, expiry, and corrupt recovery. Full renderer/reference guards remain required.

## Reversal strategy

Delete or ignore cohort metadata and write the already accepted Legacy preference. Imported package data remains untouched. Revoking this ADR cannot remove the existing internal mode contract from ADR 0068 without a separate decision.
