# Renderer Fidelity Delivery Plan

## Delivery rules

- One milestone or coherent sub-milestone per Codex task.
- Audit and define contracts before foundational changes.
- Preserve compatibility and add migration evidence before replacing an authority.
- Keep old and new paths comparable behind explicit routing until acceptance evidence permits retirement.
- Never update a golden solely to make a new implementation pass.
- Stop when exporter dependencies or architecture decisions exceed the approved milestone.

## Milestones

| Milestone | Scope | Acceptance focus | Status |
| --- | --- | --- | --- |
| 0 | Operating foundation, architecture inventory, registries, ADRs, handoff | New task can reconstruct current facts without chat history; runtime unchanged | Complete |
| 1 | Baseline and fidelity harness | Authoritative fixtures, deterministic capture, comparison reports, tolerances, performance baseline | Complete |
| 2 | Property authority and canonical scene-graph contract | Explicit precedence/provenance and no unresolved duplicate authority in the contract | Complete; bounded M4 runtime consumer active |
| 3 | Dependency and stabilization engine | Deterministic invalidation and settled-graph readiness | Complete; observational/runtime disabled |
| 4 | Core layout and text authority migration | Capability-routed basic Auto Layout/FIXED/HUG/FILL/text with coherent fallback | Complete; constraints/transforms/advanced text deferred |
| 5 | Typography, vertical trim, surface convergence, and approval | Exact source fonts, semantic trim, converged geometry, reviewed references | Complete |
| 6 | Media placement authority | Source-faithful FILL/CROP placement, sampling evidence, explicit compatibility | Implementation complete; reference review pending |
| 6.1 | Genuine CROP source certification | Real hash-registered CROP ZIP, source transform/preview agreement, resize/replacement/offline/all-surface evidence | Blocked at fixture gate; no authoritative CROP ZIP found 2026-07-16 |
| 7 | Effects, blend modes, and compositing | Backend evidence and compositing fidelity | Planned; renumbered from the original roadmap row 6 |
| 8 | Components, instances, variables, and styles | Design-system semantics and overrides | Planned |
| 9 | Capability-based routing and alternative backends | Routing justified by fixture evidence | Planned |
| 10 | Hardening, performance, rollout, and legacy retirement | Rollout gates, telemetry, migration, regression control | Planned |
| 11 | Backend orchestration reconciliation | One resolved node/subtree decision over existing stable owners | Complete; no owner pixels changed |
| 12 | Capability-aware diagnostic projection | Shared classification plus capability/region grouping in the quality workspace | Complete; visual diff remains non-blocking |
| 13 | Legacy/Semantic/Compare rollout | Persisted internal opt-in, current-default preservation, evidence-led widening | Internal modes and local Stage 1 operator cohort complete; Stage 2/public/default rollout blocked |

The active programme prompts split the original broad media row from the completed typography/surface work and call media placement Milestone 6. Historical ADRs and evidence retain their original numbers; future compositing work moves after media rather than being folded into this milestone.

Phase 13 rollout sequence is now explicit: Stage 0 internal development and Stage 1 local manual operator cohort are complete. Stage 2 template opt-in, Stage 3 Semantic default with capability fallback, and Stage 4 Legacy-retirement review each require separate evidence and approval. The recommended next action is a bounded real-template operator trial under Stage 1, not Stage 2 implementation. See [Semantic rollout policy](SEMANTIC_ROLLOUT_POLICY.md).

## Gate for every behavioral milestone

Required prompt sections: context, objective, scope, non-goals, invariants, audit, implementation, compatibility, acceptance, automated tests, browser scenarios, performance, and final report.

Required evidence:

- fixtures with stable identity;
- source-to-render trace;
- explicit authority and fallback;
- current automated results;
- current browser results where behavior is browser-dependent;
- generated-output comparison against unchanged references;
- performance and readiness observations;
- updated capability/fixture/status/handoff records.

## Milestone 4 delivered scope

Milestone 4 migrated the proven now-hiring sizing/Auto Layout plus text measurement chain to capability-gated runtime authority after exact/delayed font and real resize/export evidence. Coherent compatibility remains for unsupported/circular/export-sensitive paths. ADR 0010 remains Proposed because static inspection surfaces are still compare-mode; no paint/mask/effect or Canvas backend was added.
