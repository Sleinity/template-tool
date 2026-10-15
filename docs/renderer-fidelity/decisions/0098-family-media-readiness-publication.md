# ADR 0098: Family media completion projects accepted readiness

## Status

Accepted, bounded Family media publication. Native differential (38 outcomes), separate primary production timing/repeats and browser lifecycle checks pass. Fresh candidate gate `sdk-f7-readiness-20261015` is GO; see [the implementation and certification report](../../architecture/f7-readiness-publication.md). Repeated instrumented warm timing increases remain a documented tracing limitation; independent minimal repeats show no confirmed corresponding increase. The certified pre-change 1.0.0 archives remain immutable.

## Context and objective

The [F7 profile](../../architecture/f7-production-profiling.md) observes fifteen Cover decode completions causing fifteen identical Family materializations, projections and trees, about 76–77 ms aggregate instrumented CPU work. This is duplicated work, not a predicted latency saving. The approved milestone replaces that callback derivation only.

## Contract and scope

One private ordered media collector and readiness/outcome projection serve full derivation and media completion. Decode initiation remains on full derivation. Accepted completion retains the existing disposed/map-entry checks, updates the existing decode entry, then projects the current snapshot's accepted materialization, working package, tree, content and selected variant. It publishes readiness and the existing derived status/error only, preserving semantic package/tree/field references and content/operation revisions. Each accepted completion retains one publication/snapshot increment, even if its source no longer belongs to the current selection. No callback publishes captured content or starts a replacement derivation.

Full authoring operations, decode ownership/deduplication/timeouts, URL lifetime, save ordering, runtime-only font/line publication, revision leases and PNG raster readiness are unchanged. Shared sources may complete after selection changes; reset clears entry authority and disposal rejects callbacks. Readiness reasons/order must match the existing full-derivation projection, which intentionally differs from runtime-only font/line diagnostics. No additional state authority or cache is introduced.

## Non-goals, compatibility and invariants

No public API/schema/persistence or single-session changes, renderer changes, notification suppression, batching, cache redesign, new backend, migration, publication, tagging or reference/tolerance promotion. Importer 0.6.1/source 1.0 and canonical 2.2 remain. Font, line, content, settlement, placement and raster evidence retain their current revision guards. ADRs 0010 and 0012 remain Proposed. Preserve the existing dirty worktree.

## Audit, tests and acceptance

Retain exact baseline sources before editing. Differential controlled decodes must preserve outcomes/diagnostics and publication semantics, with stable references and zero media-triggered semantic derivation. Cover failure, timeout, shared/distinct media, ABA selection, reset/disposal/reload, replacement/crop/reimport, invalid content, font/line transitions and pending-media persistence. Run production before/after pairs separately from counters using the exact corpus/fonts, plus current portable/strict, types/builds, API/boundaries, SDK/packed consumers, lifecycle, applicable media/font/text guards and renderer/scene/settlement certification.

Acceptance requires a negative paired readiness or stable-preview median interval on a primary Cover workload and no independently repeated latency/tail regression. Counts alone cannot accept implementation. Revert the runtime experiment if representative timing fails, or stop if correctness requires wider authority changes. Final reporting must distinguish automated browser and stored-source review, retain failed attempts and new archive/source identities, and state all limitations.
