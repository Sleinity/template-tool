# ADR 0071: Semantic-first product path supersedes rollout governance

- Status: Accepted
- Date: 2026-07-21
- Supersedes for active product behavior: ADR 0068 and ADR 0070

## Context

Backend orchestration, capability diagnostics, deterministic capture, internal modes, and cohort controls proved that existing semantic owners can be selected safely. The migration itself was still incomplete because product surfaces consulted an operational rollout wrapper and Validate mounted a hidden second renderer for visual comparison.

## Evidence

Every resolved node already publishes `ResolvedBackendDecisionV1`. Certified core layout, text, media, mask, primitive, stroke, linear-gradient, and ordered-SOLID owners are capability-selected and retain coherent compatibility boundaries. The fidelity harness already owns candidate/reference comparison and guarded promotion. Product rollout state therefore added selection and governance without adding source fidelity.

## Decision

The sole product path is semantic-first with automatic capability-level compatibility fallback.

- Renderers consume the unfiltered `ResolvedRenderTreeV1` and its backend decisions.
- Product code does not read Legacy/Semantic/Compare preference or cohort metadata.
- Compatibility remains a family/subtree owner, not a selectable renderer.
- `ResolvedProductRenderIdentityV1` records cross-surface revision identity without selecting behavior.
- Validate uses the shared backend diagnostic projection and never mounts a comparison renderer.
- Visual comparison, candidates, and references remain harness-only.
- Obsolete metadata is left inert and an idempotent marker records the migration.
- Surface-local settlements are permitted when their content-addressed identities agree; ADR 0010 remains Proposed.

## Alternatives

- Continue cohort rollout before finishing migration: rejected because it optimizes governance around a temporary split product path.
- Delete compatibility implementations: rejected because unsupported capabilities still require coherent, source-preserving fallback.
- Introduce a new renderer or global settled graph: rejected because the existing contracts and owners are sufficient for the MVP authority transfer.
- Run comparison in product: rejected because it creates hidden renderer work and confuses source evidence with approved references.

## Consequences

Operators see one renderer experience. Unsupported behavior remains explicit. Historical rollout records and ADR evidence remain auditable but cannot affect pixels. Validator-only UI and telemetry may change; renderer references remain guarded.

## Compatibility impact

Existing packages, drafts, imports, family owners, strict schemas, persistence, offline rendering, and PNG raster readiness remain intact. Old rollout records require no destructive database migration.

## Migration impact

Remove providers, controls, mode branching, cohort diagnostics, and rollout-specific scripts from active product paths. Store only `semantic-renderer-mvp-migration-v1`; never read or delete obsolete records during rendering.

## Verification

Verify obsolete-metadata isolation, singular ownership, coherent fallback, all-surface product identity, zero hidden comparison renderers, zero renderer-time Figma requests, persistence/offline restoration, deterministic issue packets, and unchanged approved-reference hashes.

## Reversal strategy

Revert this ADR and product-path changes as one bounded change. Do not reactivate stored rollout metadata without a new decision and explicit migration because it is now defined as inert.
