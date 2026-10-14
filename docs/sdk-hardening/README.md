# Focused SDK hardening

Scope: browser-session correctness, bounded import reads, resource ownership,
public V2 authoring parity, measured redundant copying, and confirmation metadata.
Core/browser/React boundaries, persistence schemas, canonical field semantics,
validation authority, renderer ownership, and legacy consumers remain unchanged.

## Current and compatibility journeys

The current typed-field journey uses `TemplateSessionV2` for a single design and
`TemplateFieldFamilySessionV2` for multiple designs. Core owns source parsing,
field configuration/content validation, Family resolution, and materialization.
Browser owns sessions, persistence, import resources, and asynchronous lifetimes.
React consumes those sessions; Studio supplies UI and authoring policies.

The V1 import wizards and sessions remain supported compatibility journeys.
They do not become V2 merely because their confirmation contains the current SDK
version. Confirmation schema, canonical package schema, and SDK release version
are independent. New confirmations obtain their release version from the browser
package manifest. Historical Family confirmations marked `0.9.0` remain valid
when their existing schema and integrity checks pass. Release metadata is descriptive;
supported confirmation schemas and integrity checks determine compatibility, not
equality with the currently installed SDK version.

## Save contract

Single and Family saves (V2 and supported compatibility sessions) capture content
at invocation and write sequentially within one session. Family draft saves use
the same queue and reserve their first-save identity.
Overlapping first saves reserve one single-session record ID. Failure rejects its
caller without poisoning later saves. Reset/loading another source cancels queued
writes; disposal cancels writes that have not started. A repository write already
in progress can finish, but cannot publish into a disposed/replaced session.
Its managed asset URLs stay leased until the write settles.

This is not cross-session or distributed conflict resolution. Repository schemas
and the repository interface are unchanged.

## ZIP contract

Existing per-archive, compressed-entry, and decoded-entry limits remain in force.
Inflation supplies fflate a fixed output buffer based on the declared size, bounded
by the configured limits. One extra sentinel byte detects truncated overflow;
forged sizes never return a successful truncated payload. This bounds output
allocation, not CPU work spent scanning compressed input.

`maxTotalUncompressedBytes` defaults to 512 MiB per reader. Repeated reads count
again. Failed inflation reserves its bounded capacity so corrupt retries cannot
bypass the aggregate allocation budget. Limits must be nonnegative safe integers.
Diagnostics retain the existing structured form. Preview bytes decoded during
source loading are reused rather than reopening the ZIP in Studio.

## Resource ownership

`PackageImportResult.dispose()` releases resources created by its default asset
store. Call it on cancellation/failure or after a V2 session has synchronously
loaded the imported package. A supplied asset adapter is borrowed: the host owns
its lifetime. `AssetStorageAdapter.dispose` is optional for compatibility.

The IndexedDB adapter leases runtime URLs, not persisted bytes. Independent stores,
V2 sessions, candidate successors, and in-flight saves share a realm-local,
versioned URL lease registry across separately built entry points. The final owner
revokes the URL once. A disposed adapter cannot publish a late URL. Studio retains
pending source imports during setup and releases them when setup closes.
Compatibility `TemplateSession.loadZip` owns accepted import results until source
replacement, reset or disposal, and immediately releases stale async results.
In-flight compatibility saves also pin resources until storage settles.

Native font activation is cached by face/source identity, not text sample. Current
text still goes through the existing coverage/readiness checks on every call;
removed or failed activations are not treated as current. The existing managed-font
registry's document/application lifetime is unchanged; this pass does not introduce
an automatic global font unload policy.

## Public V2 authoring

Only the importer entry point adds three operations:

- `createTemplateFieldFamilyFromSourcesV2`: reconcile source configurations into
  common settings and sparse design overrides.
- `appendTemplateSourcesV2`: create an isolated single/Family candidate, preserving
  accepted configuration and order.
- `mutateTemplateFamilyV2`: isolate rename/order/remove/selection/replacement edits;
  explicit replacement disposition remains host policy and archived content is returned.

Studio applies its text-limit defaults before calling these operations and keeps
its reviewed discard policy. The SDK adds neither policy by default. Promotion is
source-authoring only: an edited single output cannot silently lose canonical
content through promotion. Public V2 host verification imports no Studio modules.

## Performance evidence

`node scripts/repository/measure-v2-edits.mjs` now uses a hash-verified current
0.6.1 export, 20/80-node workloads (the larger one adds synthetic static leaves),
and 1/5/20 designs. Vite instruments a temporary test-only bundle to count actual
materializations, validation evaluations, cloning and latency; SDK bundles contain
no measurement hooks. Each row measures 20 edits after five warmups.

The retained changes remove Browser copies immediately before Core's authoritative
output copy and avoid copying every nonselected Family package. Core caches
validation only for recursively frozen plain data, using weak keys and isolated
result copies. Mutable inputs, shallow-frozen objects, accessors and changed
configurations still run the full validator. Content validation and materialization
are never skipped.

`edit-current-before.json` and `edit-current-after.json` record identical hashes
for materialized output, canonical content and readiness in all six workloads.
Materialization remains once per edit. Family schema evaluations fall from five
to four per edit. The largest case (20 designs × 80 nodes) measured 47.402 ms →
24.675 ms median; these are local Node observations, not a browser latency promise.
The original `edit-baseline.json` / `edit-after.json` are historical measurements
of the earlier reverted experiment.

The repaired current Studio fidelity driver captures all four surfaces using
registered exact fonts. All 16 before/after PNGs are byte-identical and geometry
comparisons pass; see `current-export-regression.json`. Current-export fixtures
remain unapproved against the historical reference registry. No reference or
tolerance was promoted to turn an unapproved result into a pass.

## Verification commands

- `pnpm packages:build`, `pnpm packages:typecheck`, `node scripts/run-tests.mjs`
- `node scripts/repository/verify-v2-import-host.mjs`
- `pnpm boundaries:check`, `pnpm api:contract`
- Relevant Studio setup and Family workflows, font evidence, renderer, scene and
  settlement gates. Record actual outcomes separately; generated candidates are
  never approval to update references.

The user-approved public-declaration/API baseline update records the intentional
additive interface changes; both guards now pass. No renderer goldens, scene snapshots,
settlement snapshots, or tolerances may be updated by this work.

Candidate creation accepts the existing single/Family session options for custom
repositories and object-URL adapters. A host using nondefault dependencies should
pass them for each candidate; dependencies are not inferred from opaque accepted
sessions. Standalone Family construction requires at least one source.
