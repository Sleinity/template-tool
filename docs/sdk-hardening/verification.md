# Completion verification — 2026-09-25

Historical evidence, retained without reclassifying its failures. Current
architecture closure and candidate verification live in
[SDK release readiness](../architecture/sdk-release-readiness.md); the current
three-export gate has its own run identity and source-reviewed references.

## Scope and acceptance

Finish the six approved SDK hardening milestones against the current worktree,
with current-export verification as authorized by the user. Preserve Core/Browser/
React ownership, canonical output, validation authority, readiness invalidation,
persistence schemas and public compatibility. No reference promotion or renderer
behavior change is included. Existing worktree changes were preserved; deleting
old fixtures or drafts was not necessary.

## Implemented

1. **Save ordering:** V2 and compatibility single/Family sessions serialize captured
   writes. First-save identities are reserved, failures do not poison the queue,
   reset/disposal cancel pending writes, and active writes pin resource leases.
   Compatibility Family drafts share the queue. Cross-session conflicts remain
   outside the approved scope.
2. **Bounded reads:** decoded-entry buffers and aggregate reader limits remain
   enforced with structured diagnostics and malformed-size/boundary tests.
3. **Resources:** binary font activation remains separate from current glyph
   coverage. Import owners release stale results and accepted results on
   replacement/reset/disposal. Transfer and final-owner release are tested.
4. **Public V2 parity:** the public-only host covers actual current ZIP import,
   preview hash/reuse, incremental versus batch assembly, configuration preservation,
   selector assignments, rename/order/replacement/removal and repository save/reload.
   Studio-specific defaults and discard policy remain in Studio.
5. **Measured simplification:** redundant Browser clones are removed. Strict Core
   validation caches only recursively frozen plain data through weak keys, with
   independent result copies. New/mutable/shallow-frozen inputs always validate.
   Temporary test-only instrumentation counts materialization and validation work.
6. **Release clarity:** existing approved additive API baselines, manifest-derived
   versions and historical confirmation integrity remain in force. No exports were
   removed and no new public instrumentation/cache API was added.

## Automated and browser evidence

Passing commands in this completion run:

- `pnpm packages:typecheck`, `pnpm packages:build`, Studio build.
- `node scripts/run-tests.mjs` (full suite, including new compatibility save,
  cancellation, resource pinning and immutable-validation regressions).
- `node scripts/repository/verify-v2-import-host.mjs`.
- API contract, package-boundary and release-contract checks.
- `pnpm studio:setup`, `pnpm field-rules:studio`, `pnpm studio:family-parity`.
- `pnpm studio:workflow-acceptance`: current post and Boolean exports, sparse Family
  editing, image replacement, guarded PNG, persisted independent drafts, reload
  and desktop/768px review. Browser outputs remain in their existing
  `fidelity/evidence/studio-phase-*` and `field-rules-v2-studio` directories.

Current-export capture:

- Before: `fidelity/candidates/sdk-hardening-current-before-v2`.
- After: `fidelity/candidates/sdk-hardening-current-after`.
- Four fixtures × Checks/Fields/editor/PNG; repeated captures are stable.
- All 16 first captures are byte-identical, with matching geometry. Reproduce with
  `node scripts/repository/verify-sdk-hardening-regression.mjs sdk-hardening-current-before-v2 sdk-hardening-current-after docs/sdk-hardening/current-export-regression.json`.
- Durable evidence: [current-export-regression.json](current-export-regression.json).

Performance evidence: [before](edit-current-before.json), [after](edit-current-after.json).
All six output/content/readiness hashes match. Materialization remains once per
edit; Family schema evaluations fall from five to four per edit. The largest
20-design/80-node workload median decreased from 47.402 to 24.675 ms. Synthetic
volume and local Node timings are explicitly identified; no browser latency SLA
or source-fidelity support claim follows from these timings.

## Reference registry boundary

Guarded renderer, scene and settlement comparisons were run for the four current
exports. They return nonzero because those fixtures have no approved references
(the settlement CLI labels this `reference=fail`; its JSON classifies the files
as `unapproved`). Generated scenes are valid and observed settlements report
stable/ready, but this is not a passed approved-reference comparison or a claim
that every observed bound is exact. The independent before/after regression
comparison passes. No renderer golden, scene snapshot, settlement snapshot or
tolerance was updated.

The earlier obsolete-selector failure and reverted clone experiment are historical.
`edit-after.json` remains that older experiment; `edit-current-after.json` describes
the implementation retained now. Historical ZIPs and drafts were not deleted.
