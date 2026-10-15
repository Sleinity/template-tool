# V2 SDK and Studio optimization — exporter 0.6.1

The unpublished 1.0.0 candidate exposes V2 host workflows and admits only raw source-schema 1.0 ZIPs declaring exporter 0.6.1. Canonical packages remain schema 2.2. Source normalization and the private V1-shaped renderer bridge are retained. Nothing was published or tagged; no stored work or approved reference was deleted or promoted.

## Scope, ownership and implementation contracts

The objective is the approved bounded release cleanup plus F1/F3/narrowed F5. [ADR 0097](../renderer-fidelity/decisions/0097-v2-only-sdk-and-061-source-admission.md) records context, authority, scope, non-goals, invariants, compatibility, implementation requirements and abandonment gates. The original audit is the starting evidence; the actual corpus has 11/28/26 nodes. Synthetic padding and larger trees do not justify product speedup claims.

The pre-existing dirty worktree was preserved. Immutable source checkpoints in [evidence](evidence/sdk-v2-optimization-20261014/) separate the initial baseline, post-M1, post-M2 and post-M3 changes. No commits mix or reset the user's existing work. [Independent M2/M3/M4 review patches](evidence/sdk-v2-optimization-20261014/patches/identity.json) retain the bounded changes without staging existing user changes. Source and archive hashes, rather than the unchanged candidate version, identify verification inputs.

## M1: release boundary

Production exports remove V1 sessions, Family editing, wizard/confirmation, editor and persistence journeys. React `/importer` and `/importer.css` are absent. All three examples mount the shared V2 host; old query parameters cannot select V1. Read-only inspection remains in the advanced inspection entry. Existing V2 names remain intact; no universal session or replacement alias was added.

The production reader checks the first raw template inspection. Unsupported/missing/malformed exporter declarations and wrong source schema produce `SOURCE_EXPORTER_VERSION_UNSUPPORTED` and a blocked import with raw evidence; normalization, assets and fonts cannot create an accepted candidate. The ZIP is not read twice for admission. V1 source fixtures/readers and fidelity UIs live behind test-only adapters. Normal source normalization remains strict at the canonical boundary.

V1/unknown records are excluded from the catalogue and direct V2 restore, without deleting their bytes. Current V2 canonical incompatibility remains separate. Current V2 save/reload, recovery tokens and resource ownership are preserved. Retired runtime URL caches and V1 Family collection are test-only.

The [retired API inventory](evidence/sdk-v2-optimization-20261014/m1-retired-api.json), active entry/API contracts, protected 1.0.0 Core declaration and delivery documentation reflect the breaking candidate. Historical declaration identities remain unchanged. Original documentation and verification scripts are retained as historical evidence, rather than active V1 guidance.

## M2: validation reuse

A synchronous single edit uses the frozen base when replacement assets are absent. With overlays, mutation validation and materialization share one immutable operation-local merged shell. Reset uses the new asset dictionary after releasing an unreferenced replacement. The read-only reducer clone is gone. Async replacement, materialization copies, Family effective-package reconstruction and fingerprint algorithms remain unchanged.

Core still validates mutable/shallow-frozen/new input and isolates returned diagnostics. Family materialization reuses the existing materializer's package-content validity, without an effective-package cache.

Warm single edits: two schema evaluations become zero. Family edits: four become three. [Counter evidence](evidence/sdk-v2-optimization-20261014/m2-counters.json) is separate from timing.

## M3: primitive interpretation

Tree construction resolves each primitive once and collects that result's source revision in original source-node order. The standalone stale-tree checker uses the same fingerprint assembly and retains its independent resolution. React's supplied-tree guards remain unchanged. Native differential snapshots, revisions and real-corpus fingerprints are identical; resolver calls are halved. [Counters](evidence/sdk-v2-optimization-20261014/m3-counters.json) and [paired timings](evidence/sdk-v2-optimization-20261014/m3-isolated-timing.json) are retained separately.

## M4: assets-only collection

Both in-memory and IndexedDB native repositories, plus recovery preparation, pass only asset dictionaries to the existing collector. Independently owned validated packages/Family data supply the record structure. Returned asset maps are reconstructed without a canonical-package cast or mutable alias. Capture, FIFO, pins, GC, recovery tokens and payload reading are unchanged.

[Collection evidence](evidence/sdk-v2-optimization-20261014/m4-counters.json) shows zero scene nodes copied for asset collection in all single/Family save and recovery cases. Payload reads are unchanged: a real three-source Family save reads 18 asset entries; save plus recovery reads 36. This is not payload deduplication.

The separate [memory profile](evidence/sdk-v2-optimization-20261014/m4-memory.json) samples clone boundaries with GC before each phase. Cover save and Family save/recovery have lower aggregate observed heap high-water marks; aggregate observed ArrayBuffer high-water marks do not increase. Individual samples vary with GC. This is native process evidence, not a browser-wide peak-memory guarantee or a timing measurement. No decoded-buffer cache was added.

## Native paired evidence

Each accepted timing uses five alternating before/current pairs after warmup, 50 operations per trial and the established floor-index quantile plus exact 3,125-resample paired interval. Timing excludes call instrumentation and memory hooks. Source ZIP hashes and candidate/checkpoint hashes are retained. These are synchronous Node measurements, not React/Studio latency or font/raster evidence.

| Operation | Now Hiring before → current | Cover before → current | Carrousel before → current | Three-source Family before → current |
| --- | --- | --- | --- | --- |
| Scalar edit, M2 | 3.14 → 1.88 ms | 5.66 → 3.72 ms | 5.04 → 3.12 ms | 3.94 → 3.53 ms |
| Tree construction, M3 | 0.42 → 0.34 ms | 1.37 → 1.02 ms | 1.06 → 0.65 ms | 0.43 → 0.27 ms |
| Save, M4 | 3.75 → 3.07 ms | 6.48 → 5.17 ms | 5.83 → 4.78 ms | 16.96 → 14.76 ms |
| Save plus recovery, M4 | 5.34 → 4.40 ms | 10.82 → 8.64 ms | 10.01 → 7.68 ms | 27.46 → 23.74 ms |

Every displayed median has a negative paired median interval. M3 tree and all single save/recovery p95 intervals improve. The first isolated M2 Family p95 interval was positive; [a separate five-pair repeat](evidence/sdk-v2-optimization-20261014/m2-family-repeat.json) retained that flag and did not reproduce it (interval −7.03 to −0.07 ms). The original result is not erased. Family save's p95 interval includes zero. These finite trials do not establish zero overhead in every workload.

Initial full-run and instrumented timings are retained as exploratory evidence. They are not substituted for the isolated accepted comparisons. Initialization, typed defaults/Choices/reset, Textarea, Boolean/reflow, selection, image/crop/reset, save/recovery/offline restoration and PNG are also covered by portable, strict-source and automated browser workflows; the native timing table measures only the listed operations.

## M5: investigation, no further implementation

The [instrumented native profile](evidence/sdk-v2-optimization-20261014/m5-native-profile.json) measures materialization fingerprinting and the private projection on actual packages. Fingerprinting remains a meaningful part of native materialization; this profile has probe overhead and does not authorize structural sharing, fingerprint caches or projection changes.

The [native-browser media profile](evidence/sdk-v2-optimization-20261014/m5-media.json) observes one cold Family sequence. Initial Now Hiring has one completion/two derivations; Cover selection has 15 completions/16 derivations (about 82 ms aggregate instrumented derivation work in this exploratory run); Carrousel has one/two; warm Cover revisiting has zero/one. F7 now has real counts, but one native-browser trial without a React surface or exact-font/PNG latency is insufficient for a readiness-state redesign. A separate authority and paired workflow plan is required.

Runtime validators and rasterizer remain. Existing unchanged V2 bundle probes reduce Browser from 761,130 to 604,104 JS bytes (164,202 to 138,509 gzip) and React from 1,019,080 to 879,239 (229,618 to 208,844 gzip). These are packed host probes, not total archive/transfer savings attributable solely to Ajv. Changed former-V1 probe coverage is renamed with `-v2`; its measured initial budget is not presented as a same-workload speedup. Historical budgets remain in the retained baseline. F8 stays deferred; no export context or renderer backend was introduced.

## Verification and release disposition

The original NO-GO below is historical. [Candidate certification](sdk-v2-candidate-certification.md) closes the run-bound review on 2026-10-15 with GO for the exact unpublished archives. The original verification is preserved separately; no reference or archive bytes changed.

Current-run portable and strict historical ZIP suites, package/Studio typechecks/builds, all example builds, SDK API/boundary/release/archive/bundle checks and isolated packed V2 import/edit/save/reload pass. The packed actual example covers exact Carrousel with custom/default/embedded font authority plus synthetic seven-type, Choices and failure/resource cases. Studio's automated single/Family input, IME, recovery Retry, selection flush and latest-content PNG lifecycle pass. Historical primitive/stroke/gradient/ordered-paint browser scenarios retain identity with zero Figma requests. This is automated browser evidence; no manual source review is claimed.

Gate `sdk-v2-optimized-20261015` has 24 repeat-stable captures, 12 passing renderer comparisons, three passing scene comparisons and 12 passing settlement comparisons, plus passing public single/Family and Color/export checks. Its overall disposition remains **NO-GO solely for missing fresh run-bound source review**, as did the initial baseline gate. No approval/disposition was fabricated, and no reference, snapshot, tolerance or fixture/font hash was promoted. The 136 initially recorded approved pixel/structure hashes remain identical.

The final [production Studio packet](evidence/sdk-v2-optimization-20261014/studio-production-paired.json) and [paired analysis](evidence/sdk-v2-optimization-20261014/studio-paired-analysis.json) cover twelve workloads with five alternating pairs each (120 measured rows), plus warmup, exact fonts and fresh browser contexts. There are no failures, recorded long tasks or confirmed positive handler-p95/catch-up intervals. Current sustained-input handler p95 is 0.9–1.3 ms and median catch-up is 102–123 ms including existing batching. These are finite workload observations, not SDK-only or universal latency guarantees. Cold startup remains unmeasured as an independent SDK metric.

Candidate/archive identities and their automated verification are retained in `release-verification-artifacts/sdk-v2-optimized-20261015/`. Packing preserves the candidate's `not-yet-verified` publication certification; source review is still pending. The existing batching, font identity, revision guards and media raster warmup remain unchanged. Publication and tagging remain unauthorized.

## Reproduction

Run `pnpm packages:typecheck`, `pnpm test:portable`, `pnpm test:realistic-zip`, `pnpm exec tsc -b --pretty false`, `pnpm build`, `pnpm example:build`, `pnpm sdk:verify` and `pnpm docs:verify` sequentially around package builds/packing. Packing rebuilds distribution files; do not run a consumer typecheck while another pack cleans those files. Run `node scripts/editor-performance/verify.mjs --output <fresh-directory>` and `node scripts/repository/verify-v2-example-reference.mjs` for automated output/example lifecycles. Run `node scripts/primitives/browser-scenarios.mjs --run-id <unique-run>` for historical adapters, and `pnpm sdk:gate:061 -- --run-id <unique-run>` for current exact-font captures/comparisons.

For native pairs, use `node scripts/repository/sdk-v2-optimization.mjs --baseline <checkpoint> --candidate <next-checkpoint> --operations edit|tree|save,recovery --output <new-json>`. Post-M1→post-M2 isolates M2; post-M2→post-M3 isolates M3; post-M3→current isolates M4. Counters use `--counters`; clone-boundary memory uses `node --expose-gc ... --memory`. Timing runs must be isolated from other builds/profiling. Studio pairs use `node scripts/editor-performance/run.mjs --phase paired --trials 5 --mode production --latency-only --baseline docs/architecture/evidence/sdk-v2-optimization-20261014/post-m1/studio-identity.json --output <fresh-directory>` and `sdk-v2-studio-analysis.mjs <packet> <analysis>`. No update/promotion command is part of this workflow.
