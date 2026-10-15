# Internal session contract and differential lifecycle gate

## Authority and audit

This milestone starts from `sdk-061-release-verification-20261008a`. The
supported release inputs remain the hash-gated exporter 0.6.1 Now Hiring,
Cover and Carrousel ZIPs. Their source schema 1.0 reader and normalization
remain necessary. Historical fixtures are used only as labelled synthetic
contract scenarios; they are not newly certified release sources.

`TemplateSessionV2` and `TemplateFieldFamilySessionV2` remain separate Browser
authorities. Both delegate field mutation, configuration reconciliation and
materialization to existing Core operations. Browser retains asynchronous
image ownership, serialized saves, restored resources and revision-bound
renderer evidence. React owns publisher mounting and exact-font/render
publication. Studio owns raw input drafts, its 650 ms autosave coordinator and
template recovery tokens. None of those responsibilities moves here.

The audit reproduced two single-session defects with accepted canonical input:

1. A second managed-asset read failing during restore left the first acquired
   object URL unrevoked, even after disposal.
2. Two image controls referencing the same replacement asset became invalid
   when the first was reset: its cleanup removed the surviving control's asset.

The new regression suite failed against the original implementation, first at
partial restore cleanup and, after that repair, at shared replacement retention.
Both now pass. Hydration tracks acquired URLs until ownership transfer, releases
them on failure/cancellation, and rejects stale work before allocating another
URL. Accepted Reset/replacement tests the remaining canonical references before
removing the previous asset. Existing URL leases, save pins and source ownership
remain in use; no registry or font owner was added.

## Private borrowed contract

`packages/template-browser/src/internal/sessionContract/` contains two typed
factories, `adaptSingleSession` and `adaptFamilySession`. They expose:

- Kind, native lifecycle status, publication/operation/content revisions.
- The complete native content envelope, ordered field state, session assets,
  readiness and error; all are borrowed by reference.
- Configured package (single base or selected Family effective package), working
  package, renderer package, resolved tree and existing materialization revision.
- Existing saved-record ID, full native snapshot and Family selected variant.
- Subscription, correctly typed native controllers and existing evidence methods.

Only the small view/adapter wrappers are frozen. Native data is neither cloned
nor frozen by this experiment. The last view is cached by native snapshot
identity, including idle, blocked and disposed snapshots. Construction and reads
do not publish, validate, materialize, capture persistence, lease URLs or activate
fonts. Controllers are forwarded without memoizing their captured generations.

Loading, configuration, save, reset, disposal, reimport and Family selection stay
on the discriminated borrowed `authority`. There is no generic load/save shape,
generated identity, new revision, new serialization or disposal method on the
adapter. At the initial equivalence gate no production consumer imported it. Package-boundary/declaration checks
rejected consumers and public exposure, and keep this experiment independent
of compiler results and Definition/Instance projections.

## Intentional native differences

| Concern | Single | Family |
| --- | --- | --- |
| Canonical content | V1 field-content envelope | V3 shared content with sparse variant placement |
| Selection | No variant selection operation | Existing direct/selector selection; absent fields retain shared content |
| Configuration revisions | Existing reconciliation advances content revision | Configuration-only changes may retain content and use publication watermark |
| Configuration return | Rejects old evidence through existing content/materialization identity | Rejects old evidence without manufacturing a content revision |
| Save identity | Existing optional ID and first-save reservation | Existing Family record identity |
| Lookup failure | Returns blocked native snapshot | Existing repository lookup rejection propagates |
| Reimport | Existing package plan/apply result | Existing selected-variant plan/apply with archived content |

`reset()` unloads either session; controller Reset restores that field's imported
default. Native `status: ready` is not a claim of PNG readiness. Existing error
codes, messages, notification counts, unchanged-selection no-ops and already
started storage writes remain authority-specific. Evidence is transient and not
part of canonical content or saved records.

## Differential evidence and measurement

Portable tests pair a direct native session with a second same-kind session
operated through the adapter. Complete snapshots and mutation/evidence results
use own-key equality, preserving undefined property presence and array order.
Repository transcripts compare complete saved payloads apart from independently
sampled ISO timestamps, whose presence/ordering are checked explicitly. Controlled
promises cover save ordering, failure/retry, reset/disposal cancellation and late
restore completion without sleeps.

Coverage includes all seven field types, invalid mutations, Choice identity,
Boolean participation, Fill/Fit/Crop, source/default Reset, configuration rollback,
Family absent-field content and variant placement, stale controllers, current and
stale line/font/settlement evidence, publisher replacement, reimport and reload.
Resource tests cover embedded/Blob replacements, equal hashes, partial hydration,
late hydration, resource handoff and final-owner cleanup. Existing native tests
continue covering first-save identity, pending save resource pins and failed
candidate loads.

`node scripts/repository/verify-session-contract.mjs --run-id <fresh-id>` verifies
the exact three ZIPs for three paired trials as singles and one-variant Families,
plus a three-source Family's complete selected snapshots. Independently allocated
URLs are matched through asset identity/descriptors and verified binary bytes,
not deleted from evidence. Carrousel Reset compares numeric source paints directly.

Instrumentation is inserted only in the temporary Node test build at Browser
session authority calls. It counts parsing, validation, mutation, materialization,
renderer projection, resolved-tree construction and saved-record capture. It is
not a count of nested Core calls or actual renderer paints. Direct/adapter counts
match for load, edits, save capture and restore. Ten thousand snapshot reads call
zero instrumented authorities. No instrumentation enters production packages.

Current measurement run: `session-contract-20261008c`.

| Operation, median across fixture trials | Single direct / adapter ms | Family direct / adapter ms |
| --- | ---: | ---: |
| 10,000 snapshot reads | 0.0511 / 0.0781 | 0.0490 / 0.0760 |
| Accepted non-image edit batch | 33.9743 / 24.8577 | 37.0167 / 38.0712 |
| Synchronous save capture | 2.8097 / 2.1469 | 0.5038 / 0.4110 |
| Complete restore | 7.3920 / 7.1765 | 10.0575 / 10.3159 |

These sequential timings include cache/JIT/order variation; lower numbers are
not a claimed optimization. The equality of authority-call counts is the useful
result. No latency target, caching beyond the view wrapper, or canonical
optimization was introduced.

`node scripts/repository/verify-session-contract-browser.mjs` exercises the existing
React renderer in headless Chromium: StrictMode replay, remount, single-to-Family
replacement, rejection of prior publisher generations and disposal of genuinely
unmounted owned sessions. Borrowed sessions survive renderer replacement/unmount.
This synthetic publication probe is not exact-font/source-fidelity certification;
the separate font and three-export gates provide that evidence.

## Verification and gate disposition

The compact durable command, implementation, fixture/font and performance record
is [internal-session-contract-20261008.json](evidence/internal-session-contract-20261008.json).
Local binary/browser packets remain regenerable under
`fidelity/evidence/session-contract/`; no raw external ZIP is embedded in the report.

Final run `sdk-061-session-contract-20261008b` is **GO**: 24 complete stable
captures, 12 renderer, three scene and 12 settlement comparisons pass. All
12 PNGs retain their individually reviewed preceding candidate hashes; the prior
disposition is archived. The initial aggregate result correctly remained NO-GO
until those source dispositions were bound to the fresh run.

Portable tests, source/test typechecks, package/Studio builds, `sdk:verify`, packed
consumers, public V2 single/Family hosts, React lifecycle, font reactivation, Studio
setup/drafts, field rules, Family parity and workflow acceptance pass. All ten
bundle profiles pass unchanged limits; React V2 is 869,271 raw / 205,667 gzip
bytes against 1,070,034 / 241,099. All 283 approved reference/snapshot files,
fixture/font/profile manifests, public API baseline and protected declarations
remain unchanged (321 protected artifacts checked).

Evidence is current-run automated headless interaction and stored hash/structure
review, not a new manual live source review. The capture environment's package
manager label uses the declared `pnpm@11.9.0` when invoked directly with Node;
the actual executable remains 11.25.0. Binary font decisions match the preceding
run exactly apart from upload timings. This metadata difference is retained in
the evidence rather than represented as a package/toolchain change.

Renderer, scene and settlement comparisons use one fresh run identity with 24
complete stable captures, 12 renderer, three scene and 12 settlement comparisons.
Any inherited source disposition requires exact candidate/reference identity and
passing structure/scene/settlement evidence, not stability alone.

No publication, version bump, persistence migration, session unification or
production adapter migration is authorized here. The initial handoff selected a separately scoped React snapshot-reading consumer,
preserving native lifecycle operations rather than introducing a universal session.
Its adoption is recorded below.

## First production consumer — React snapshot bridge (2026-10-08)

Starting gate: `sdk-061-session-contract-20261008b`. The verified borrowed view
now supplies V2 React snapshot reads through the restricted Browser
`session-internal` entry. It is classified `sdk-internal`, excluded from the
supported API inventory, and prohibited for host applications. Only the private
React bridge imports it. Its two factories expose `getSnapshot` and `subscribe`
only; the native sessions remain responsible for controllers, lifecycle,
publication, fonts, URLs, persistence and disposal.

The private hook memoizes a reader by native session identity. Public snapshot
hooks return the exact native object and retain their existing declaration.
Renderer reads, current evidence checks and PNG readiness reads use the same
interpretation. No readiness condition or publication algorithm changes;
absent content stays distinct from revision zero. Replacing a provider or override
unsubscribes the former reader. Legacy bindings remain on their existing paths.

The durable [adoption record](evidence/react-session-snapshot-bridge-20261008.json)
contains implementation hashes, exact inputs, commands, measurements and the gate
disposition. Supported declarations and the API baseline are byte-identical.
The separate internal declaration/build entry does not enter supported exports.
Installed-tarball consumers resolve React's external Browser dependency without
workspace aliases. Boundary tests reject direct consumers, re-exports and
dependencies between the compiler, Definition projection and session experiments.

### Differential and performance evidence

`node scripts/repository/verify-session-snapshot-bridge.mjs --run-id <fresh-id>`
checks the integrated browser lifecycle. To compare with the actual pre-migration
implementation, add `--before-source
fidelity/evidence/session-snapshot-bridge/react-snapshot-bridge-20261008c/before-fieldSessionV2.tsx`.
That retained local test input is hash-bound in the durable record. The test-only
Vite transform never enters a production bundle.

Current paired run `react-snapshot-bridge-20261008c` preserves complete native
snapshots, renderer DOM, field values, direct authority-call counts, evidence
payloads/acceptance and the 17-event native notification transcript. Both versions
make 19 observer commits. Subscription attach/detach pairs fall from 59 to 12;
all detach on unmount. Listener deliveries increase from 40 to 45 because stable
subscriptions stay attached across updates that formerly replaced subscriptions.
This does not change native publications or React commit counts. These counts
describe one controlled synthetic scenario, not an end-to-end performance claim.

Exact three-export measurement run `session-snapshot-reader-20261008a` records
three paired trials per fixture/kind. Ten thousand native/reader reads have
median costs of 0.0717/0.0943 ms for single and 0.0501/0.0956 ms for Family.
Reader reads invoke zero instrumented canonical, materialization, projection,
tree or persistence-capture authorities. Accepted edits, save capture and restore
retain equal direct authority counts. Sequential loop/JIT timings are observational;
no caching optimization, latency target or batching was added.

All ten packed bundle profiles pass unchanged budgets. React V2 is
871,115 raw / 206,093 gzip bytes, versus the preceding 869,271 / 205,667;
limits remain 1,070,034 / 241,099. The small integration cost remains visible.

### Verification and gate

Portable tests, package/Studio types and builds, `sdk:verify`, packed consumers,
API/boundary/release/docs checks, public V2 hosts, exact-font reactivation, legacy
smoke, React StrictMode/provider/override/remount/replacement, Studio setup/drafts,
field rules, Family parity and workflow acceptance pass. Reader tests additionally
cover revision zero, idle, blocked restore/errors, disposed reads and unsubscribe.
Existing differential tests retain stale controller/evidence, resource, selection,
configuration, save and reimport coverage.

Fresh `sdk-061-react-snapshot-bridge-20261008a` is **GO**: 24 complete stable
captures, 12 renderer, three scene and 12 settlement comparisons pass. All 12
PNGs match their preceding individually reviewed hashes. The aggregate initially
remained NO-GO until those exact reviews were bound to this run; the prior
disposition is archived. No reference update command ran. All 321 protected
artifacts, including 283 approved reference/snapshot files, remain unchanged.
The active fixture profile and comparison tolerances are unchanged.

Evidence comprises automated headless browser interaction and stored identity/
structure review. This is not a new manual live source-design review. Carrousel
Color values continue to use numeric ZIP paints as their oracle.

### Audit alignment and next bounded candidate

The audits' boundary direction remains intact: Core owns canonical semantics,
Browser owns import/session/resource authorities, and React observes sessions and
publishes through native evidence gates. Compiler ingestion and Family preparation
are consolidated; this milestone makes the common read view a production consumer.
Definition/Instance remains a lossless architecture experiment, not a runtime
authority. Neither common views nor evidence gates imply session unification.

The next candidate is a shared **serialized-save scheduling** audit. Both native
`save()` implementations repeat promise-tail serialization, failure recovery and
queued cancellation checks. Their payload capture, single first-save identity,
URL pins and post-save publication guards differ and must remain native. Establish
paired operation/repository/resource transcripts before proposing one private queue
helper; do not merge save arguments, schemas or sessions. Resource hydration and
evidence-state consolidation remain later, separately justified decisions.

## Serialized-save scheduling consolidation — 2026-10-08

The preceding candidate is implemented. Both native V2 sessions now use one
private session-local `createSerializedSaveQueue()` for FIFO Promise scheduling,
`finally` finalization and rejection recovery. The queue survives load and reset.
Its only operation is `enqueue<T>(write: () => Promise<T>, finalize: () => void)`.
It neither reads sessions nor owns records, identities, cancellation, resources or
publication. Boundary checks permit production imports only from the two native
session implementations; no package entry or supported declaration exposes it.

Record capture, validation, first-save identity reservation and URL-pin acquisition
remain synchronous native work at save invocation. Native callbacks retain their
exact disposal/generation checks and error messages immediately before repository
access. Already-started writes finish; obsolete queued callbacks reject and release
their pins. Single post-save publication still checks operation/content revisions;
Family publication still checks generation and Family identity. Those policies are
intentionally different. Restore-read failures also retain their native difference:
single publishes a snapshot error, while the Family repository-read failure throws.
No save arguments, schemas, recovery tokens, autosave timing or renderer behavior
changed.

### Baseline and differential evidence

Pre-extraction run `save-scheduling-before-20261008a` completed before either native
source was edited. Paired run `save-scheduling-after-20261008d` loads those retained
original source files with a test-only Vite transform and compares them with the
current implementations. Complete snapshots, notifications, repository payloads,
promise outcomes and URL-release transcripts are structurally equal. Deterministic
UUID/time inputs preserve identity relationships and timestamp presence; no content
revisions, diagnostics or optional properties are removed. V8 checksums identify
the retained files, not object-sharing or semantic equality.

Ten original and four supplemental scenarios cover first/explicit identities,
invocation-time content, edits/configuration/selection during saving, synchronous
throws, rejection/retry, load/restore/missing or failed restore/reset/disposal,
independent queues, shared owners and successive replacement generations. Pins
survive Reset/replacement and disposal until active writes and queued cancellations
settle, then release exactly once. Focused queue tests compare Promise microtask,
finalizer and caller ordering against the original scheduling expression.

The [durable record](evidence/save-scheduling-20261008.json) contains source and
fixture/font hashes, commands, measurements and binary-evidence regeneration links.
The [baseline restoration patch](evidence/save-scheduling-native-baseline.patch)
reconstructs the original native sources **only in a temporary mirror**, for cases
where the ignored local preimages are unavailable. Verify its resulting hashes
against the durable record before using reconstructed sources as a test baseline.
The runner also enforces those fixed before hashes with
`--before-source-directory <mirror>/packages/template-browser/src/session
--baseline-record docs/architecture/evidence/save-scheduling-20261008.json`.

Reproduce the paired evidence while the local baseline is retained:

```sh
node scripts/repository/verify-save-scheduling.mjs \
  --run-id <fresh-save-run-id> --before-run save-scheduling-before-20261008a
```

### Measurements and verification

Three paired trials per exact Now Hiring, Cover and Carrousel export measure
single and Family synthetic bursts of 1, 5 and 20 saves. Each side performs 468
captures, 468 repository calls and 468 finalizations. Invocation costs include
existing native cloning/validation, pinning and enqueue; queue waiting, controlled
repository execution and finalization are recorded separately. Controlled repository
waiting is not storage throughput. Sequential cache/JIT variation prevents treating
these observational figures as an optimization claim or latency target.

| Session | Burst | Median invocation before / after (ms) |
| --- | ---: | ---: |
| Single | 1 | 3.042 / 3.147 |
| Single | 5 | 0.515 / 0.570 |
| Single | 20 | 0.468 / 0.483 |
| Family | 1 | 0.531 / 0.518 |
| Family | 5 | 0.508 / 0.494 |
| Family | 20 | 0.498 / 0.486 |

Portable/focused tests, package and Studio types/builds, `sdk:verify`, public V2
import and single/Family hosts, packed consumers, exact-font reactivation, React
lifecycle, legacy smoke, Studio setup/drafts, field rules, Family parity and workflow
acceptance pass. All ten unchanged bundle budgets pass. Browser V2 is 601,392 raw /
137,728 gzip bytes (+39/+11); React V2 is 871,154 / 206,121 (+39/+28). Other profiles
match the preceding record. All 324 protected artifacts, including 283 approved
reference/snapshot files and all 321 previously protected artifacts, are unchanged.

Fresh `sdk-061-save-scheduling-20261008a` is **GO**: 24 complete stable captures,
12 renderer comparisons, three scene comparisons and 12 settlement comparisons.
All 12 PNGs exactly match the preceding individually reviewed candidates. Initial
aggregate NO-GO correctly rejected the older source-review run identity. That
disposition is archived; reviews were retained only after exact source/font/PNG
identity and approved structure/scene/settlement checks. No reference update ran.

Raster/runtime/font/viewport/build environment identities match. The current pnpm
launcher supplies a user agent reporting 11.25.0; the preceding direct-node capture
reported the manifest fallback `pnpm@11.9.0`. The collector already selects between
these representations. This metadata difference, process memory, upload timings
and timestamps are recorded explicitly; no comparison policy or tolerance changed.
Initial sandbox dependency-download and local-server failures passed on access-enabled
retries. Evidence is automated browser execution and stored identity/structure
review, **not a new manual live source-design review**. Color still uses ZIP numeric
paints as its value oracle.

The next decision remains a separate audit of resource hydration and evidence
lifecycle duplication. This extraction does not authorize a universal session,
broader resource registry, persistence migration or production convergence of the
Definition/Instance and compiler experiments.

## Stored-asset hydration and cleanup consolidation — 2026-10-09

The separate resource-hydration audit is complete. All 12 implementation hashes
from `sdk-061-save-scheduling-20261008a` matched before this work. Controlled Node
probes then reproduced two additional single-session defects with valid canonical
materialization: colliding source/replacement IDs with different hashes leaked the
source URL, and missing storage retained a previous session's blob URL while
reporting replacement assets ready. These are synthetic contract scenarios, not
additional certified source fixtures.

### Repairs and native ownership

Single sessions now retain source URLs independently from replacement ownership by
asset ID. Incoming leases are acquired before releasing accepted ownership; every
unique URL is retained once per session, and source/replacement overlap, receiving
sessions and save pins keep it alive until the final owner releases it. Cleanup
preserves the original single-session source-before-replacement release order.
Family ownership and native restore transactions retain their existing policies.

Both restore paths remove obsolete `blob:` URLs only from hash-backed descriptors
that require storage hydration. Embedded data/SVG resources remain untouched, and
opaque non-blob URLs retain their existing behavior. Single replacement readiness
now uses the existing Core `resolvePackageAssetSource` authority as well as descriptor
presence; absent sources block readiness, while deferred assets remain pending.
No new validator, asset schema or renderer policy was added.

### Private shared scope

`packages/template-browser/src/session/storedAssetHydration.ts` shares temporary
hash-based acquisition and cleanup. Its factory receives the native repository
reader, object-URL adapter and stale predicate. Synchronous `getCachedUrl`, asynchronous
`readUrl` (available/missing/stale), `getCreatedUrls`, idempotent `release` and terminal
`transfer` are its only operations. It performs no package mutation, materialization,
publication, canonical validation, accepted lease acquisition or font activation.

Native sessions keep record cloning, traversal and embedded-resource eligibility,
storage metadata, source/replacement classification, cancellation checkpoints,
accepted-state transfer and errors. Cache hits add no asynchronous boundary; reads
remain sequential. Cleanup attempts each unique allocation once, and cleanup failure
cannot replace an original read/allocation exception. Transfer disables temporary
cleanup only after native ownership has been established. Missing storage is not
negatively cached. Existing URL leases and the serialized save queue remain unchanged.

Boundaries allow production imports only from the two native V2 sessions. Supported
declarations expose neither the helper nor its inferred types. React, Studio,
compiler-result and Definition/Instance experiments do not consume it.

### Original, repaired and extracted evidence

Pre-edit `hydration-original-20261009a` records 32 complete native scenario transcripts.
The cleanup regression failed against the original implementation; the stale-URL
readiness assertion also failed after ownership repair and before the source check.
`hydration-repaired-20261009c` reconstructs the retained native repair stage, including
preserved deferred-asset behavior, and compares it with the original sources. Only
single collision, collision followed by field Reset, and missing-obsolete-blob cases
change. All unaffected snapshots, notifications and repository/resource events match.

`hydration-extracted-20261009e` compares the repaired sources with the integrated helper:
all 32 transcripts are structurally equal, preserving revisions, diagnostics,
optional-property presence and ordering. Eight supplemental paired cases exercise
already accepted live image leases during failed/stale restores. Those supplemental
cases were added after repair and rerun against retained native sources; they are
not described as pre-edit execution. Failed candidates retain accepted content and
leases; reset, disposal and replacement release temporary work without late allocation.

Coverage also includes equal hashes, source/replacement overlap, missing storage,
embedded and opaque non-blob sources, read/allocation exceptions, concurrent restores,
shared receiving sessions, save pins, Family selection after Reset, and idempotent
cleanup. Existing save scheduling and resource suites cover active repository writes,
shared image controls and final-owner cleanup. Single snapshot-error reporting and
Family original record-read rejection remain intentionally distinct.

The [durable record](evidence/stored-asset-hydration-20261009.json) identifies native
stages, fixture/font hashes, protected artifacts, commands and measurements. Ignored
binary transcripts can be regenerated from retained sources. If those are absent,
use the tracked [original](evidence/stored-asset-hydration-original.patch) or
[repaired](evidence/stored-asset-hydration-repaired.patch) restoration patch **only in
a temporary mirror** of the recorded final sources. Verify the mirror's stage hashes
against the durable record. The runner enforces the expected hashes:

```sh
node scripts/repository/verify-stored-asset-hydration.mjs \
  --stage extracted --run-id <fresh-hydration-run> \
  --baseline-source-directory <mirror>/packages/template-browser/src/session \
  --baseline-stage repaired \
  --baseline-record docs/architecture/evidence/stored-asset-hydration-20261009.json
```

### Measurements and current regression gate

Three paired trials use each exact Now Hiring, Cover and Carrousel export, both native
session kinds, and labelled synthetic repetitions of 1, 5 and 20 asset descriptors.
Successful and partial-failure restores provide 108 samples per side. Each side
performs 486 storage reads, 432 URL allocations and releases, 54 ownership transfers
and 54 temporary cleanups. Repository callbacks, allocation/revocation callbacks,
native ownership transfer and temporary cleanup are measured separately. Restore time
also includes native cloning, validation/materialization and publication. Mock storage
and URLs are not IndexedDB throughput or real browser allocation measurements.

| Session / outcome | Median restore repaired / extracted (ms) | Transfer (ms) | Temporary cleanup (ms) |
| --- | ---: | ---: | ---: |
| Single / success | 4.565 / 4.953 | 0.0071 / 0.0094 | — |
| Single / partial failure | 0.453 / 0.459 | — | 0.0011 / 0.0018 |
| Family / success | 7.328 / 7.430 | 0.0047 / 0.0088 | — |
| Family / partial failure | 0.494 / 0.487 | — | 0.0008 / 0.0021 |

These are observational measurements under sequential paired execution; cache/JIT
and process scheduling prevent attributing all restore-time differences to the helper.
No performance target or optimization claim is introduced.

Portable tests, repository/package types, package and Studio builds, `sdk:verify`,
packed consumers, all ten unchanged bundle budgets, public V2 import, exact-font
reactivation, session/legacy smoke, Studio setup/drafts, field rules, Family parity
and workflow acceptance pass. Browser V2 is 603,438 raw / 138,220 gzip (+2,046/+492
against the preceding gate); React V2 is 873,203 / 206,545 (+2,049/+424). The other
eight profiles are unchanged. All protected declarations, API baselines, fixtures,
fonts, approved references/snapshots and tolerances remain unchanged.

Fresh `sdk-061-stored-asset-hydration-20261009a` is **GO**: 24 complete stable captures,
12 renderer, three scene and 12 settlement comparisons pass. All 12 PNG identities
match previously individually source-reviewed evidence. The previous disposition is
archived; source/font identities, raster/runtime/viewport/build environment and approved
structural evidence were verified before rebinding reviews. Only process memory,
font upload timing and timestamps differ. The first aggregate NO-GO correctly rejected
the old review's run identity; no references were promoted or tolerances changed.
Temporary missing distribution files during intermediate concurrent build checks were
reported as prerequisites, then checks reran after sequential release verification.

Evidence is controlled Node execution, automated browser workflows and retained stored
source review, **not new manual live source-design review**. Carrousel Color remains
checked against exact ZIP numeric paints. Both reproduced defects and the shared scope
are complete. The next bounded audit is evidence-lifecycle duplication; session
unification, persistence migration and universal resource ownership remain separate.

### Additional reproduction outside the extraction

A final controlled probe found unchanged accepted-resource retention when a single
image Blob is replaced by embedded data with the **same caller-provided asset ID**.
Both mutations succeed and the embedded descriptor replaces the Blob descriptor,
but the obsolete URL keeps its session lease until disposal. Disposal still releases
it once. Original and extracted implementations produce identical results; this is
not an extraction regression or a source-fixture fidelity failure. Accepted-resource
pruning is expressly outside this milestone and requires a separate narrow repair.

The [hash-gated reproduction](evidence/stored-asset-hydration-deferred-pruning.mjs)
runs with `node docs/architecture/evidence/stored-asset-hydration-deferred-pruning.mjs`.
An optional argument selects the reconstructed original single-session source when
ignored baseline files are unavailable. It verifies the source hash against the
durable record and asserts original/current equality and final disposal cleanup.
This follow-up should be considered alongside the next evidence-lifecycle audit;
it does not authorize a shared accepted-ownership policy.

## Same-ID embedded replacement ownership repair — 2026-10-09

This narrowly closes the deferred accepted-resource pruning reproduction above.
Planning verified all 18 implementation identities from the passing
`sdk-061-stored-asset-hydration-20261009a` record. Pre-edit native sources and
324 protected artifact hashes were retained before production changes.

The single session now calls its existing `revokeOwned(asset.id)` when an embedded
replacement is accepted. It runs after decoding, stale-work checks and canonical
mutation acceptance. The Blob path is unchanged. Source ownership, other replacement
references, receiving sessions and captured-save pins still determine final revocation
through the existing registry. No common pruning policy or helper was extracted;
Family production code is byte-identical to its baseline.

### Differential and browser evidence

`before-20261009a` retains 40 complete native scenarios (20 for each session kind).
The repair expectation failed against original single/same-ID behavior before the
one-line fix. `after-20261009c` then proves complete structural equality for canonical
snapshots, notifications, operation results and repository payloads. Property presence,
array order and revisions are preserved; generated IDs and dates are controlled.
Family resource transcripts are equal. Eleven single scenarios change only the
expected replacement-lease/revocation timing; allocation events, storage/write counts
and final revocation sets remain equal. Unaffected resource scenarios remain equal.

Coverage includes repeated embedded changes, embedded-to-Blob and different-ID
replacement, two fields sharing an ID, source collisions and source/replacement URL
overlap, receiving sessions, active saves, rejected saves and queued cancellation.
It also covers invalid/rejected replacements, failed decode, overlapping replacements,
reset/load/disposal during decode, equal/different hashes, save/reload, imported Reset,
Family selection and Crop. Deferred promises and observable transitions replace sleeps.

Automated headless Chromium coverage mounts current and receiving renderers in
StrictMode with a synthetic image-only canonical package and valid image bytes.
After same-ID embedded replacement, current PNG contains the new image and the
receiving PNG retains its old Blob image. The old URL remains fetchable until the
receiver leaves, then is revoked exactly once. Both single and Family pass through
existing renderer readiness and public PNG export. These synthetic pixels test
resource liveness, not certification of new source fixtures or Carrousel Color values.

The earlier deferred-pruning probe now runs both **retained historical stages**,
with explicit source-hash checks. It does not require repaired current code to
reproduce the historical defect. Historical records are preserved.

### Measurements and reproducibility

Three paired trials measure synthetic bursts of 1, 5 and 20 transitions for both
kinds. Each side allocates and finally releases 156 URLs with identical counts.
Previously the single editor released none at embedded acceptance; it now releases
all 78 at acceptance when no other owner remains. Family's 78 accepted releases
are unchanged. Preparation and transition timings include native canonical work;
accepted lease-release instrumentation is inserted only into temporary test builds.
The callback's final revocation timing and allocation-to-revocation lifetimes are
recorded independently. Mock URLs are not browser allocation benchmarks.

Measurement `after-20261009b` records these paired trials. Median aggregate single
preparation/transition times across these bursts were
15.593/15.112 ms before and 17.704/16.241 ms after. Median accepted lease-release
time was 0/0.0325 ms; final revocation callback time was 0.0044/0.0028 ms.
These observational paired measurements include JIT/order variation and are not
an optimization claim or a performance target. Full per-burst values are retained.

The [durable record](evidence/image-replacement-ownership-20261009.json) records
native/implementation hashes, commands, fixture/font identities, measurements and
binary evidence locations. Retained binary transcripts are regenerated with:

```sh
node scripts/repository/verify-image-replacement-ownership.mjs \
  --run-id <fresh-replacement-run> --before-run before-20261009a
```

If ignored baseline files are absent, copy the recorded final native files into a
**temporary mirror**, apply the tracked
[restoration patch](evidence/image-replacement-ownership-before.patch) there only,
and verify the resulting hashes against `baseline.sourceHashes` in the durable
record. Put the record's `baseline` object in `baseline.json` alongside those files.
Then regenerate the baseline followed by its comparison:

```sh
node scripts/repository/verify-image-replacement-ownership.mjs \
  --run-id <fresh-baseline-id> --baseline --before-directory <mirror-session-directory>
node scripts/repository/verify-image-replacement-ownership.mjs \
  --run-id <fresh-replacement-id> --before-directory <mirror-session-directory>
```

This restoration and comparison procedure passed in the current run.

### Release disposition and next audit

Portable tests, root/package types, package/Studio builds, `sdk:verify`, packed
consumers and unchanged bundle budgets pass. Public V2 import, font reactivation,
session/legacy smoke, Studio setup/drafts, field rules, Family parity and workflow
acceptance pass. Fresh `sdk-061-image-replacement-ownership-20261009a` is **GO**:
24 complete stable captures, 12 renderer, three scene and 12 settlement comparisons.
All twelve PNGs are byte-identical to previously individually source-reviewed output.
Source/font/raster/viewport identities match; process memory, upload timings and
capture timestamps are the only environment differences. Prior dispositions were
archived before rebinding their reviewed evidence. No reference promotion ran.

Browser V2 is 603,447 raw / 138,222 gzip and React V2 is 873,212 / 206,546;
all profiles remain within unchanged budgets. Public declarations, fixtures, fonts,
references, snapshots and tolerances are unchanged. Automated browser checks and
stored-identity review are recorded separately from manual review: **no new manual
live source-design review was performed**. Carrousel Color still uses ZIP numbers.

The initial synthetic browser probe was rejected for an extra canonical property;
a subsequent PNG assertion exposed mismatched synthetic canvas dimensions. Both
were corrected in test-only fixture preparation, without changing runtime behavior.
The aggregate gate initially rejected the preceding review's run identity until
current identical evidence was verified and rebound.

The ownership repair is complete. Evidence-lifecycle duplication is the next audit;
renderer publication watermarks and native configuration differences must be studied
before extracting anything. Session unification, persistence migration and recovery
changes remain separate decisions.

## Accepted renderer-evidence consolidation — 2026-10-09

The evidence-lifecycle audit found matching accepted Textarea evaluation and
runtime-only cache removal in the native single and Family sessions. The private
`session/fieldRenderEvidence.ts` module now owns exactly those two operations.
Identity acceptance, publication generations, cache ownership, aggregate readiness,
canonical invalidation and notifications remain native. The helper has no session,
renderer, storage, font or asset dependency; it imports existing Core types only.

Evaluation preserves the existing precedence: structural exclusion, unavailable
reliable line evidence, exceeded maximum lines, then valid evidence with optional
threshold warnings. Issue codes/messages and emitted property presence/order are
unchanged. Runtime invalidation removes every non-inactive entry without replacing
the map or its retained inactive values. Canonical edits/configuration still clear
all entries through the native lifecycle. Boundary tests permit production imports
only from the two V2 sessions and reject re-exports, dynamic imports and dependencies
from Studio, React or the architecture experiments. Supported declarations remain
unchanged.

### Native differences retained

Single reads the base package and publishes through its native field/readiness
projection; Family reads the selected effective package and uses
`publishRuntimeOnly`. Family configuration can leave canonical content revision
unchanged, so its separate minimum-publication watermark continues rejecting
first-A evidence after configuration A/B/A. Single's existing revision guards also
reject first-A evidence. The existing publisher range increment, partial runtime
updates, exact freshness checks and identical-evidence notification suppression
remain unchanged. No attempt was made to merge runtime-readiness state or acceptance
policy. No new lifecycle defect was demonstrated by this bounded audit.

### Before/after evidence

The native sources and a baseline transcript were retained before either production
session was edited. The test-only runner substitutes those hash-verified sources in
a temporary Vite build, fixes UUID/time inputs explicitly, and compares complete V8
transcripts with the current implementation using structural deep equality. It
preserves undefined properties, NaN probes, array order, diagnostics and revisions;
it does not compare JSON serialization alone.

`after-20261009a` reproduces all **133 native checkpoints** exactly: evidence inputs,
acceptance/error outcomes, complete snapshots, every notification and observed
resource/repository events. Checks include warning/max boundaries, unavailable
measurements, active/inactive transitions, every identity guard, publisher
replacement, configuration A/B/A, canonical edits, Family variant/absent-field
selection, reset, rejected/blocked loads and disposed callbacks. The single-only
intermediate migration also matched all checkpoints. Both original and consolidated
runs perform 35 accepted evaluations and 26 runtime invalidations; parsing,
validation, materialization and renderer-projection call counts are identical.
The probes perform no persistence capture or resource allocation.

The [durable evidence record](evidence/field-render-evidence-20261009.json) contains
source, harness, fixture/font and protected-artifact identities, verification logs,
measurements and gate disposition. The [restoration patch](evidence/field-render-evidence-native-baseline.patch)
and [hash-verifying reconstruction command](evidence/field-render-evidence-baseline.mjs)
retain the original sources independently of ignored local binary evidence. They
write only a temporary mirror, never the workspace sessions:

```sh
node docs/architecture/evidence/field-render-evidence-baseline.mjs /tmp/<fresh-original-directory>
node scripts/repository/verify-field-render-evidence.mjs \
  --run-id <fresh-baseline-id> --baseline --before-directory /tmp/<fresh-original-directory>
node scripts/repository/verify-field-render-evidence.mjs \
  --run-id <fresh-paired-id> --before-directory /tmp/<fresh-original-directory>
```

This reconstruction was executed in the current run and regenerated the exact
133-checkpoint transcript hash. Reconstruction requires the recorded native
implementation and verifies both the patch and resulting original-source hashes.

### Measurements and browser coverage

Three trials used explicitly synthetic 1/5/20-field packages with independent text
nodes, not newly certified source fixtures. Median accepted-publication time for
20 fields was 2.347 → 2.005 ms in single and 0.438 → 0.398 ms in Family. Rejection and
invalidation timings are recorded separately. The instrumented 35 evaluations
(including native map updates) totalled 0.309 → 0.460 ms; 26 cache invalidations
0.114 → 0.168 ms. These small sequential-run measurements include JIT/timer noise
and establish no speedup or performance target. Evaluation, invalidation, acceptance
and notification counts are unchanged; no batching/caching optimization was added.

Automated headless Chromium exercised StrictMode replay, single/Family remount,
session replacement and delayed font/line publication. Three explicit stale
publication checkpoints rejected both runtime and line evidence, retained pending
readiness and rejected PNG export. Remount resumed normal accepted evidence;
unmount removed every subscription and disposed hook-owned sessions while borrowed
sessions remained live. The existing lifecycle browser check also passed. These are
synthetic automated browser checks, not a manual source-design review.

An initial packed-consumer attempt inside the restricted sandbox failed fetching
npm dependencies (`ENOTFOUND`). The same SDK verification completed successfully
with network permission. An initial synthetic performance package incorrectly bound
multiple fields to one node and was rejected by existing validation; the test fixture
was corrected to create independent nodes before retaining the baseline. Neither
failure caused a runtime, API, reference or tolerance change.

### Verification and gate disposition

Portable tests, package typechecks/builds, Studio typecheck/build, SDK/API/boundary
checks, archive/packed consumers and every curated bundle budget passed. Current
public V2 import and single/Family host workflows, exact-font reactivation, legacy
session/Studio smoke, Studio setup/drafts, field rules, Family parity and workflow
acceptance passed. Browser V2 measured 601,564 raw / 137,724 gzip bytes and React V2
871,329 / 206,022, respectively 1,883 raw bytes smaller in both profiles; all other
profiles are unchanged. Existing budget limits and public API baselines were not
modified.

Fresh source-authoritative gate **`sdk-061-field-render-evidence-20261009b`** is
**GO**: 24 complete stable captures, 12 passing renderer comparisons, three passing
scene comparisons and 12 passing settlement comparisons. Current public hosts and
Carrousel's ZIP-numeric Color oracle also pass. All 12 PNG surfaces are byte-identical
to the preceding individually reviewed gate. The prior disposition is archived;
its source reviews are retained only after exact PNG, source/font identity,
structural/scene/settlement and rendering-environment equality checks. There was no
new manual live source review and no reference promotion. All 324 protected
API/profile/fixture/font/reference/snapshot artifacts remain unchanged.

Run `sdk-061-field-render-evidence-20261009a` also passed every visual comparison but
is retained as non-final: direct Node invocation reported the declared pnpm version
instead of the runtime pnpm user agent, and the review still pointed to the older
run. Run b repeated all captures through the baseline pnpm invocation. Apart from
process memory, timestamps and font upload durations, its environment matches the
preceding review. Its initial assessment correctly rejected cross-run dispositions;
final assessment passed after the equality-checked review rebinding.

This bounded consolidation is complete. Shared accepted-evidence evaluation is now
in production; freshness, publisher watermarks and aggregate readiness remain
native. The next architecture decision should reassess remaining readiness/lifecycle
duplication and release readiness against demonstrated differences. This evidence
does not authorize session unification or a broader evidence-state owner.

## Architecture closure and local candidate — 2026-10-09

The [audit disposition matrix](sdk-release-readiness.md) closes the incremental
session audit for release preparation. Save scheduling, temporary hydration,
accepted replacement ownership and Textarea evidence evaluation share only
proven mechanics. Asset readiness, publication generations/watermarks, canonical
revisions and native transactions remain intentionally different; no demonstrated
remaining duplication requires a universal session implementation.

The [local candidate record](evidence/local-sdk-candidate-20261009.json) records
current source and archive identities, commands and toolchains. A fresh original-
source differential reproduced 133 structurally equal checkpoints and unchanged
authority-call counts. React lifecycle, shared ownership, font reactivation,
recovery, Studio and packed public consumers passed. Fresh **GO** gate
`sdk-061-local-candidate-20261009a` has 24 complete stable captures, 12 renderer,
three scene and 12 settlement comparisons; the 12 PNGs exactly match the preceding
reviewed gate. Review retention was identity-gated, with no new manual source
review or reference promotion. All 324 protected artifacts are unchanged.

The unpublished unchanged-version archives are ready for versioning and
publication preparation. Publication, session unification, persistence migration
and compatibility removal remain separate decisions; none occurred here.
