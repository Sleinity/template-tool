# Semantic Renderer Rollout Policy

> Historical evidence only. ADR 0071 supersedes cohort governance for active product behavior. Stored cohort and preference records are inert.

Policy ID: `renderer-semantic-rollout-policy-v1`  
Status: Stage 1 implemented for local internal operators  
Scope: internal operator cohorts only  
Runtime effect: an explicitly enrolled subject may request Compare or Semantic inside `?renderer-admin=1`; every other path keeps the existing default or explicit Legacy rollback

## Purpose and authority boundary

This policy defines the evidence and approval lifecycle required before an internal operator may use Semantic rendering for a selected template. It builds on the accepted internal `legacy | semantic | compare` activation contract, `ResolvedBackendDecisionV1`, the diagnostic projection, existing readiness gates, and the fidelity harness. It does not change renderer ownership or decide feature support.

Rollout state is operational metadata. It is never imported design intent and must remain separate from `basePackage`, `workingPackage`, canonical scene semantics, fields, assets, fonts, and exporter provenance. A policy decision may select an already available mode; it may not change a backend decision, suppress an unsupported capability, or authorize a new fallback.

The ordinary-user default remains unchanged. No public control, automatic enrolment, percentage rollout, remote telemetry, reference promotion, Semantic-by-default migration, or Legacy removal is authorized by this document.

## Staged rollout model

| Stage | Audience and selection | Evidence and approval | Runtime consequence | Current status |
| --- | --- | --- | --- | --- |
| 0 — Internal development | Developers/admins; exact registered fixtures | Automated and visible-browser evidence; manual investigation | Existing global internal Legacy/Semantic/Compare preference only | Complete |
| 1 — Operator cohort | Small named internal or trusted operators; manually enrolled subjects | Machine eligibility, local observation record, explicit operator request, operator-supplied approval identity | Semantic may be requested only for the enrolled subject; immediate Legacy rollback | Implemented locally |
| 2 — Template opt-in | Individually approved templates | Revalidated evidence after every relevant identity change; explicit template approval | Approved template may persist Semantic as its internal effective mode | Not authorized |
| 3 — Default with capability fallback | Eligible packages within an explicitly approved rollout population | Sustained Stage 1–2 evidence, incident rate, performance, reviewed references, separate ADR | Semantic default for eligible packages; coherent compatibility subtrees remain | Not authorized |
| 4 — Legacy retirement review | Explicitly scoped legacy paths | Removal inventory, migration plan, reversal plan, long-running evidence | Possible legacy-path retirement | Not part of Phase 13 |

Progression is not automatic. Each stage needs an explicit decision and reversal plan. Stage 1 must not write a template-level preference or change the missing-preference default.

## Evaluation subject and identity

Eligibility applies to an exact evaluation subject, not to a filename, customer, fixture label, node ID, or template name. The subject identity is a content-addressed tuple containing, where available:

- package ID plus ZIP/package-content hash;
- canonical source and scene revisions;
- field-definition/configuration revision;
- active field-override identity without storing raw field content;
- asset and replacement revisions;
- managed-font resolution identity and binary hashes;
- layout settlement and measurement revisions;
- backend-decision revision;
- capability-registry revision;
- renderer build/content hash; Git metadata must not be fabricated;
- approved renderer-reference aggregate revision;
- policy ID and policy revision.

The template may remain enrolled after an edit, but its prior eligibility decision becomes stale whenever this subject identity changes materially. Enrolment is permission to re-evaluate, not permission to reuse stale approval.

## Eligibility outcomes

Outcomes are ordered from most restrictive to least restrictive. The first matching outcome wins.

| Outcome | Meaning | Allowed mode |
| --- | --- | --- |
| `blocked-pending-repair` | Import, required asset/font, validation, or source dependency is incomplete and an operator can repair it | Legacy/current default only; no cohort observation |
| `legacy-required` | A hard runtime/export invariant fails, ownership is duplicated, fallback is unsafe/missing, or deterministic restoration cannot be proven | Legacy; incident if Semantic was active |
| `compare-only` | Runtime is safe, but comparison evidence is absent, stale, incomplete, or contains an unreviewed meaningful difference | Current default or Compare; Semantic cannot be approved |
| `eligible-with-accepted-compatibility` | Semantic owners are safe and every compatibility fallback is coherent, export-safe, visible in diagnostics, and explicitly accepted for this subject revision | Semantic may enter observation with recorded fallback regions |
| `eligible-for-semantic` | Every meaningful region has a certified Semantic owner or an already accepted singular owner; all gates and evidence are complete | Semantic may enter observation |

`Eligible with accepted compatibility` is not a lower support claim disguised as success. Each fallback must name its capability, region, visual impact, reason, owner, export safety, evidence, and approval. A new or changed fallback invalidates that decision.

## Machine-evaluable eligibility gates

The Stage 1 evaluator in `renderer-rollout/cohort/model.ts` aggregates existing authorities rather than reproducing their validation. It is pure, deterministic, browser/storage/network independent, and emits all gate results and reasons.

### Hard gates

All must pass:

1. Import lifecycle is complete under strict canonical validation.
2. Required assets and fonts are resolved under their existing exact/replacement policies; no blocker remains.
3. Every meaningful node has a current `ResolvedBackendDecisionV1` bound to the current tree revision.
4. Exactly one primary visual owner participates for each node/region; no duplicate paint, media, mask, or layout owner exists.
5. Every unsupported capability has a coherent, preserved, diagnosed, export-safe fallback. Unsupported-without-fallback is `legacy-required`.
6. Aggregate export safety is `safe`; `warn` requires engineering review and cannot produce `eligible-for-semantic`; `block` is `legacy-required` or `blocked-pending-repair` according to repairability.
7. Settlement, font, asset, media-placement, primitive, backend, and rollout revisions are current and stable.
8. Repeated PNG export succeeds at the exact expected dimensions and carries the same subject and rollout identities as the visible surfaces.
9. Save/reload and offline restoration reconstruct the same canonical, backend, mode, and placement identities.
10. No renderer-time Figma request or other undocumented network dependency occurs.
11. Required Compare/fidelity evidence is current for this subject revision.
12. Every material difference or compatibility fallback has an explicit current disposition.

### Outcome derivation

- A repairable lifecycle/dependency blocker yields `blocked-pending-repair`.
- Duplicate ownership, unsafe export, stale publication, network dependency, deterministic failure, or a missing coherent fallback yields `legacy-required`.
- Safe runtime with incomplete/stale comparison or an unreviewed difference yields `compare-only`.
- Complete evidence with one or more accepted compatibility regions yields `eligible-with-accepted-compatibility`.
- Complete evidence without meaningful compatibility regions yields `eligible-for-semantic`.

The evaluator must preserve all failed predicates and source diagnostic references. It must not collapse the result to one unexplained boolean.

## Observation evidence

`RendererRolloutObservationV1` should retain a minimal, content-conscious evidence index:

- subject/template/package identities and hashes;
- requested and effective modes plus rollout decision revision;
- backend-decision aggregate and per-region owner/fallback summaries;
- unsupported capabilities and diagnostic projection identities;
- comparison completeness, normalized geometry result, structural result, and regional pixel result;
- approved or accepted residual identifiers;
- validation/diagnostic change summary without duplicating raw template content;
- PNG dimensions, hashes, export status, and timing;
- save/reload and offline identities;
- console errors/warnings and renderer-time network failures;
- operation counters for imports/restores, edits, replacements/resets, exports, reloads, and offline cycles;
- operator observations, material-defect reports, rollback events, and incident IDs;
- observation start/end, last-evidence time, environment profile, and evidence artifact paths.

Store hashes, counts, result summaries, node/region identities, and bounded diagnostic text by default. Raw text content, replacement assets, source ZIPs, screenshots, and pixels stay in the existing local evidence stores only when required for a review, with their paths and hashes referenced rather than copied into the policy record. No external upload is authorized.

## Success thresholds

### Exact requirements

- zero lifecycle blockers;
- zero duplicate visual owners;
- zero renderer-time Figma requests and zero undocumented runtime network requests;
- zero export, save, reload, and offline-restoration failures;
- two identical captures per required surface in one process and one confirming capture sequence in a fresh process;
- equal package, scene, settlement, backend, mode, asset/placement, and export-readiness identities across Validate, Fields, editor, shared live previews where present, and PNG;
- equal normalized template-space geometry across surfaces under the existing comparison tolerance; no missing, extra, or reordered meaningful nodes;
- zero stale measurement, settlement, asset, placement, backend, or rollout publication;
- zero unreviewed meaningful fallback or unsupported region;
- zero renderer-lifecycle console errors;
- no operator-reported material defect during the observation window.

### Pixel and regional policy

One whole-canvas percentage is never sufficient.

- A region covered by an approved renderer reference must be pixel-exact under the existing comparison profile unless a reviewed residual ledger explicitly identifies the environment, capability, region, coordinates/bounds, threshold, and reason.
- A certified Semantic region without an approved whole-surface reference must match its source reference or reviewed regional evidence under that capability's documented tolerance.
- A compatibility-owned region must remain unchanged from its approved/current Legacy evidence or have an explicit accepted-compatibility review.
- Inspection overlays and product chrome are assessed separately from exported template pixels.
- Any dimension mismatch, meaningful geometry change, missing/extra node, ownership change, seam, clipping defect, text overflow, asset-placement change, or export-only difference is an automatic failure regardless of whole-canvas percentage.

### Accepted residuals

An accepted residual is valid only for its exact subject, region, environment profile, renderer/reference revisions, and documented cause. It must be deterministic and structurally unchanged. A tolerance must not be widened to absorb it. An identity change makes the acceptance stale.

### Review-required evidence

The following cannot auto-pass or auto-fail without engineering review unless another hard gate applies:

- a localized nonzero pixel difference with equal structure and geometry;
- a newly selected but export-safe compatibility fallback;
- a browser-profile-only antialiasing difference;
- a missing approved reference with credible source and regional evidence;
- a diagnostic presentation change outside exported template content;
- an aggregate performance variance without correctness impact.

## Minimum observation window

A static capture alone cannot qualify a template. Each Stage 1 subject needs both usage counts and elapsed time:

- at least five operating days between first Semantic use and approval;
- at least three import/restore sessions, including one fresh browser process;
- at least ten successful edit cycles, covering every editable field family present; each family needs change, identical/no-op where applicable, and reset;
- every editable image field policy present must exercise replacement Fill, replacement Fit, switching, and reset;
- at least five successful PNG exports across at least two sessions;
- at least three save/reload cycles;
- at least one offline restoration with renderer-time network access blocked;
- at least two repeated all-surface capture sequences, plus the fresh-process confirmation;
- one operator review of Validate/Fields/editor/PNG and every accepted compatibility region.

Non-applicable operations are recorded as such with a machine-readable reason; they are not silently counted as passed. A policy revision may increase these minimums but cannot retroactively waive missing evidence without an explicit decision.

## Rollback authority and triggers

Legacy rollback must be immediate, lossless, and independent of re-import. Evidence should be preserved before rollback when doing so does not delay recovery.

### Automatic rollback

The Stage 1 implementation writes the existing Legacy preference immediately when any of these occurs under Semantic:

- duplicate visual owner or mismatched all-surface rollout/backend identity;
- export failure, export dimension mismatch, or export using a stale revision;
- save/reload or offline restoration mismatch;
- renderer-time Figma or undocumented network dependency;
- unresolved blocking asset/font after activation;
- settlement timeout or stale measurement/placement/backend publication;
- a package update introduces an unsupported capability without an accepted safe fallback;
- Compare/eligibility identity is stale while Semantic remains requested.

Automatic rollback is a safety response, not a defect classification. It must create or link an incident record and confirm the restored Legacy identity/output.

### Operator-confirmed rollback

Operators may roll back immediately for a visible defect, lost edit/reset behavior, unexpected clipping/overflow, interaction failure, or confidence concern. Confirmation should ask only whether to preserve the evidence packet; it must not block rollback.

### Engineering-reviewed rollback

Localized raster differences, performance variance, new warnings, or changed compatibility regions require prompt engineering review when no hard invariant fails. Engineering may accept a bounded residual, continue Compare-only observation, or roll back. Lack of timely disposition leaves the subject `compare-only`, not silently Semantic-approved.

## Stale eligibility and invalidation

Any of the following invalidates the current eligibility decision and prevents automatic reuse:

- a new ZIP or changed package-content hash;
- canonical source or scene revision change;
- field definition/configuration change;
- field content, asset replacement, replacement mode, or reset revision affecting rendered output;
- font link, face, binary, axis, fallback, or font-resolution revision change;
- paint, geometry, measurement, settlement, media-placement, mask, primitive, or effect revision change;
- backend-decision or rollout-decision revision change;
- capability-registry or backend-availability revision change;
- renderer build/content hash change;
- approved-reference aggregate or accepted-residual ledger change;
- rollout-policy revision change.

Transient edits can be evaluated as observation events without discarding cohort enrolment, but the active output must receive a fresh eligibility result before Semantic export. A reverted/reset subject may reuse an earlier decision only when its entire content-addressed identity, policy revision, environment requirement, and evidence expiry still match exactly.

Eligibility expires after 30 days without qualifying operator activity or immediately when a hard input revision changes. Expiry returns the subject to `compare-only`; it does not alter imported content.

## Incident procedure

1. Detect and timestamp the issue; stop further Semantic exports for the subject.
2. Preserve the current subject identity, mode/backend decisions, diagnostics, console/network evidence, candidate/export, structural and regional comparison, and operator report.
3. Roll back to Legacy immediately; do not wait for root-cause analysis.
4. Confirm Legacy mode identity, visible output, field behavior, save/reload, and PNG export. Escalate if Legacy restoration itself fails.
5. Classify the primary boundary as source/exporter, normalization/import, canonical/resolved contract, renderer/backend, layout/measurement, asset/font, diagnostic presentation, browser/raster, persistence, or policy/control.
6. Open the smallest bounded fidelity correction or source-intake task. Do not broaden one incident into an unrelated renderer rewrite.
7. Run the affected capability suite plus the guarded renderer, scene, settlement, persistence, and offline corpus required by repository guidance.
8. Produce candidate/reference evidence when required and obtain separate visual/reference approval.
9. Recompute eligibility from the new complete subject identity and restart the observation minimums affected by the incident.
10. Close the incident only after rollback evidence, cause/disposition, regression evidence, and requalification state are recorded.

## Reference-review policy

| Evidence result | Required action |
| --- | --- |
| Pixel/geometry/structure exact to current approved evidence | No reference change |
| Difference is entirely an already accepted residual with matching identity | No reference change; link residual record |
| New template or surface has no approved reference | Generate candidates and regional/source evidence; explicit visual review required before approval |
| Source-certified correction proves a historical renderer reference wrong | Retain old/candidate/diff/structure/environment evidence; explicit replacement reason and approval required |
| Difference is unsupported but safely compatibility-owned | Record accepted compatibility or keep Compare-only; do not promote it as Semantic support |
| Difference is unexplained, material, or structurally unsafe | Reject Semantic eligibility and roll back |

Normal cohort observation must never run a reference-update command. Reference promotion remains a separate guarded operation with a developer-supplied reason. Cohort success is not permission to update a golden.

## Internal operator workflow

The smallest Stage 1 experience is an extension of the internal/admin control, not a public template setting. Its primary view should show:

- requested and effective mode in plain language;
- eligibility outcome and last evaluated subject revision;
- blocking reasons or accepted compatibility regions;
- observation progress against usage counts and elapsed time;
- Compare evidence completeness and last evidence time;
- immediate `Roll back to Legacy` action;
- manual `Enrol`, `Evaluate`, `Begin observation`, and `Request approval` actions;
- current approval/expiry state.

Backend IDs, capability IDs, owner sets, hashes, policy predicates, revisions, artifact paths, and raw diagnostic traces belong in one expanded technical view. The main view should say what is safe, what needs review, and what the operator can do. It must not imply that an unsupported renderer capability is user-repairable.

Manual approval must record approver identity supplied by the operator environment, reason, subject/policy identities, evidence packet, and expiry. This repository has no authentication authority; a future implementation must not invent identity from a browser string.

## Implemented versioned records

The records live under metadata key `renderer-rollout-cohort` using store schema `renderer-rollout-cohort-store-v1`. They are append-history records keyed by content-addressed subject ID and are separate from packages, drafts, imported semantics, assets, and the renderer-mode preference. Current records are validated structurally and semantically; unknown schemas or future enum values are quarantined and select Legacy without touching package data. A readable version-zero entry array migrates to the keyed store.

### `RendererRolloutEligibilityV1`

- schema/version and policy revision;
- exact subject identity and evaluation time;
- outcome;
- predicate results with authority/source references;
- blockers, compatibility regions, unsupported capabilities, export safety, and evidence completeness;
- invalidation keys and expiry;
- deterministic eligibility identity.

### `RendererRolloutObservationV1`

- schema/version, policy revision, subject and renderer identities;
- observation state: `not-started | collecting | ready-for-review | failed | expired`;
- requested/effective modes and rollout/backend revisions;
- operation counters, elapsed window, surfaces and environment profiles;
- comparison, persistence, offline, export, console, network, and operator evidence summaries;
- accepted residual/fallback links, incident IDs, artifact index, and completeness;
- deterministic observation identity excluding wall-clock timestamps from comparison-critical content.

### `RendererRolloutCohortDecisionV1`

This name avoids collision with the implemented per-render `ResolvedRendererRolloutDecisionV1`.

- schema/version and policy revision;
- subject, eligibility, and observation identities;
- state: `not-enrolled | enrolled | observing | paused | approved-semantic | approved-with-compatibility | rejected | rolled-back | expired | invalidated`;
- requested/effective mode and activation scope;
- reasons, required operator-supplied identity for approval, approval time, and invalidation state;
- rollback target and reversal evidence requirements;
- deterministic decision identity.

### `RendererRolloutIncidentV1`

- schema/version, policy revision, subject and active decision identities;
- detection source, trigger, severity, timestamps, and affected surfaces/regions;
- preserved evidence/artifact index;
- rollback type: `automatic | operator-confirmed | engineering-reviewed`;
- Legacy restoration result;
- cause classification, bounded correction link, regression result, reference disposition, and requalification state;
- incident status and deterministic identity.

Records must be append-only or retain a revision history. Timestamps support audit but must not make comparison-critical identities unstable.

## Implemented Stage 1 boundary

Stage 1 adds:

1. pure eligibility aggregation over existing lifecycle, backend, diagnostic, readiness, and fidelity summaries;
2. versioned local repositories for eligibility, observation, cohort decision, and incident records in existing metadata storage, separate from packages;
3. manual enrolment of an exact content-addressed subject;
4. internal-only status/progress/technical-details UI behind the existing admin gate;
5. local operation counters and evidence-path linking without raw-content duplication or remote upload;
6. manual approval after all predicates and minimum observations pass;
7. automatic hard-trigger rollback plus manual immediate rollback through the existing Legacy path;
8. tests for outcome precedence, invalidation, expiry, evidence completeness, persistence/offline restoration, and rollback.

The internal panel is development-only and requires `?renderer-admin=1`. It exposes subject, outcome, reasons, state, progress, revisions, incidents, operator note and identity, explicit evidence events, approval/rejection/pause, immediate rollback, and cohort-state clearing. Direct Legacy/Semantic/Compare selector buttons were removed so Semantic cannot bypass cohort policy. Renderer surfaces consume the existing one centrally resolved rollout decision; cohort code does not add a renderer or paint owner.

The content-addressed subject includes package/canonical/field/asset/font/geometry/settlement/backend/renderer/capability/policy/reference revisions. It deliberately excludes filename, display name, Figma URL, export timestamps, UI route, storage keys, and browser object URLs. A changed subject preserves prior history, invalidates its active decision, and selects Legacy. Thirty days without qualifying activity expires approval. A reset to byte- and revision-identical authority may address an earlier subject again only while its evidence remains current.

Stage 1 does not add public UI, template semantic fields, percentage allocation, automatic enrolment, automatic reference updates, remote telemetry, Semantic default migration, Legacy removal, or a new renderer capability. Stage 2 remains blocked.

## Gate decision

**Result A — Stage 1 operator cohort implemented.** The pure evaluator, versioned local records, manual enrolment, explicit observation events, operator-identified approval, invalidation, 30-day expiry, automatic/manual rollback, incident retention, guarded UI, and unchanged ordinary default are implemented. Headed and headless browser evidence covers exact Semantic, reviewed compatibility, Compare-only, Legacy-required, repair-blocked, real import, all-surface/PNG identity, reload, offline operation, rollback, expiry, corrupt-record recovery, one visible owner, zero console errors, and zero renderer-time Figma requests. Stage 2 has not begun.
