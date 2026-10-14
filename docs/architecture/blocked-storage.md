# Blocked storage and safe manual Retry — R04

This milestone repairs the shared IndexedDB opener and Studio's existing failure
feedback. The baseline is unpublished gate `sdk-061-host-font-authority-20261012b`.
The [original sources, archives and reproduction](evidence/blocked-storage-20261012/baseline/identity.json)
retain exact pre-change bytes. Database version 5, stores, canonical records,
renderer behavior, resource owners, recovery tokens and package versions stay unchanged.
Closing R04 does not certify the SDK for release. Its historical gate retained
R07 as NO-GO; the subsequent [R07 source review](r07-carrousel-raster.md) resolves
that independent raster difference without changing the storage repair.

## Connection contract

`TemplateStorageBlockedError` is the only supported API addition, exported from
Browser root and `/persistence`. Its readonly code is `template-storage-blocked`,
with database name, requested version and `retryable: true`. Ordinary native
errors, including synchronous `open()` failures, retain their original identity.

Each opening attempt publishes its promise before invoking native code. Concurrent
callers share that attempt. `blocked` rejects immediately, clears only its own
cached promise and retains a private native-request marker. Further calls reject
without accumulating requests. This is necessary: an open queued behind the
rejected request may never receive its own blocked event. Native success/error
clears only that marker's owner. The unchanged additive upgrade handler still runs;
an abandoned successful connection is closed without application writes.

Accepted version-change callbacks capture their connection. Obsolete callbacks
cannot close a replacement connection or invalidate its cache. Repeated callbacks
settle once. A late connection delivered even after terminal error is closed once;
repeated success must not close an accepted connection.

Single-session repository read failures still return blocked snapshots with
`saved-session-load-failed`; Family repository-read failures still reject. Save
capture, FIFO scheduling, publication policy and finalization remain native.

## Studio behavior

Existing failure surfaces show **Storage blocked** and the actionable instruction
to close other app tabs/windows and retry. Private state retains structured causes;
copy is not parsed to classify errors. Local drafts, accepted values, configuration,
source files and the accepted workspace remain available.

New edits retain the 650 ms autosave schedule. Failure leaves work dirty; there is
no retry loop. Manual Retry flushes valid drafts and saves the latest accepted
record. Obsolete autosave completions cannot notify a disposed/replaced lifecycle.
Library Retry retains route, history intent and the explicit fresh/resume decision.
A refresh failure retries refresh only; it does not reopen a session or replace a
recovery lease. Candidate sessions are accepted only after successful restore.
Failed reads never count as missing records, empty storage or superseded ownership.

After successful PNG with failed cleanup, `TemplateRecoveryCleanupError` retains
its cause. Retry performs cleanup only. Single and Family font setup both catch
registry checks and auto-link failures, expose Retry and retain the selected File
and requirement after a blocked upload. Success, cancellation, source replacement
and unmount clear retry intent. Stale callbacks cannot link the old source or
change replacement UI. Exact matching, parsing and activation policies are unchanged.

## Reproduction and verification

```sh
node scripts/repository/verify-blocked-storage.mjs --baseline --output <baseline-output>
node scripts/repository/verify-blocked-storage-unit.mjs
node scripts/repository/verify-blocked-storage.mjs --output <current-output>
node scripts/repository/verify-studio-blocked-storage.mjs
node scripts/repository/verify-studio-storage-fonts.mjs
node scripts/repository/verify-blocked-storage.mjs --archives <candidate> --manager npm --output <packed-npm-output>
node scripts/repository/verify-blocked-storage.mjs --archives <candidate> --manager pnpm --output <packed-pnpm-output>
```

The baseline native probe keeps a real version-4 connection open. Three callers
remain pending after the blocked event. The repaired probe settles all three
before closing that connection; ten further retries cause no additional open.
Unblocking runs the original upgrade and closes the abandoned connection; one new
request succeeds and subsequent calls reuse it. No database deletion or fixed
waiting period is part of recovery.

Real browser host checks exercise single/Family saves, native restore differences,
asset lookup, recovery inspect/begin/save/complete, exact font upload and auto-link.
Rejected attempts perform zero application writes. Successful retry operations
share one cached connection. Controlled callback tests cover synchronous/native
errors, repeated events, late success/error, blocked-marker ownership and obsolete
version-change handlers. Controlled save tests retain two resource generations
through a rejected active write and cancelled queued write; each final owner is
released exactly once. Existing shared-owner tests remain separate coverage.

Controlled Studio faults exercise already-open editors; they are not real
IndexedDB upgrade evidence. They cover Settings save Retry, destination restore,
latest input, fresh/resume intent and cleanup-only Retry with one download, for
both kinds. Font probes use exact hash-gated Rethink bytes, StrictMode and deferred
registration to check retained-file retry and abandoned source/mount callbacks.
Portable verification explicitly executes isolated callback tests, avoiding
`sideEffects: false` dropping them or another test's fake database cache leaking in.

The [verification record](evidence/blocked-storage-20261012/verification.json)
contains final source/archive identities, environments, command exits, logs,
measurements, protected-reference checks and gate disposition. Synthetic fault
injection and component hosts are labelled separately from source certification.

## Final candidate and disposition

R04 is closed. Portable tests, typechecks, Studio/package builds, documentation,
`sdk:verify`, API/boundary/release checks and unchanged bundle budgets pass.
The same archives pass npm and pnpm consumers, strict declarations with library
checking enabled, all documented examples and blocked-storage hosts. All 20 R01
font-authority cases pass. Exact-font reactivation, text/routing, setup, drafts,
field rules, Family parity and workflow acceptance pass in this run.

The unpublished artifacts remain at
`release-verification-artifacts/blocked-storage-after-20261012c`, version 0.8.0:

| Package | SHA-256 |
| --- | --- |
| Core | `4f804cb26d9aa6fa97e2c2cd745e93c6699730143bdc36778528bffa231be32e` |
| Browser | `7dd9899408be8dc8cada95b5a64a72abd4dd3f47e05dc4afd24a20a6ba95cb0a` |
| React | `f7c50d68d04f3de8df6d0e70a2b80adcdc6b5775927aabde48f00ded29e9100a` |

Core/React archive bytes match R01. Of 273 existing SDK source files, only the
IndexedDB opener changes. All 298 protected artifacts remain unchanged; the
public export inventory adds only the documented error in root and persistence.
The additive upgrade handler is byte-identical. No application writes occur in
rejected host attempts; each successful retry reuses one connection. Controlled
single/Family save rejection/cancellation yields two allocations and exactly two
final-owner releases, with five native notifications each.

## Gate and limitations

The final gate `sdk-061-blocked-storage-20261012c` contains 24 complete stable
captures, 12 renderer comparisons, three scene comparisons and 12 settlement
comparisons. All 24 capture PNGs are byte-identical to R01. Renderer is 11/12,
scene 3/3 and settlement 12/12. R07's unchanged
Carrousel/editor one-pixel difference remains a failing renderer comparison and
unbound source review. Repeat stability cannot approve it. No reference, snapshot,
fixture, font or tolerance is promoted or changed in this milestone.

An intermediate gate failed font upload because the added native cancellation
handler cleared the armed upload target used by the existing automation. The
final handler clears the retained retry File; source replacement still clears the
armed target. Native chooser and established upload workflows are both verified.
That incomplete run is retained as non-passing evidence.

Current browser checks are automated Chromium evidence, not a manual live or
screen-reader review. The separate R01 in-place Family reload and corrupt-storage
font diagnostic limitations remain outside R04. No Node 22/pnpm 11.9.0 release
profile, new compatibility policy or publication claim is introduced here.
