# Host font authority through rendering and export — R01

This bounded milestone closes the host-registry continuity gap. Its baseline is
the audited unpublished 0.8.0 candidate, not a new package release. The retained
[source/archive identity and original reproduction](evidence/host-font-authority-20261012/baseline/identity.json)
record exact bytes. The pre-change gate `sdk-061-host-font-baseline-20261012a`
retains the same Carrousel/editor one-pixel R07 failure as the preceding gate.
No approved reference, fixture, font or tolerance is changed.

The R01 gate below remains historical evidence. Subsequent
[R07 source review](r07-carrousel-raster.md) resolves its independent editor
raster difference; R01 font authority and packed archive bytes remain unchanged.

## Contract

ADR [0096](../renderer-fidelity/decisions/0096-host-font-registry-is-render-and-export-authority.md)
defines borrowed optional registry input, explicit null, one authority through
font readiness and PNG embedding/capture, committed publication scopes and
checked download. Native session authorities, canonical records and font
activation/cache ownership remain unchanged. Missing exact embedding bytes reject
capture instead of silently relying on a live document face.

The supported additions are `fontRegistry` on V2 renderer, PNG and export-readiness
requests, the optional embedding registry argument and capture-options registry.
Renderer-handle options omit the registry and ignore conflicting untyped values.
Core declarations, schemas and package versions remain protected. See the
[host example](../sdk/V2_INTEGRATION.md#host-owned-font-registries).

## Evidence and regeneration

The first pipeline assertion failed before production edits. Original packed
archives remain under `release-verification-artifacts/host-font-before-20261012`;
their hashes are checked in the baseline record. The original audit reproduction
also remains executable against those archives. New browser tests use a compact
synthetic routed Textarea with the existing hash-verified Rethink Sans binary;
they are host-contract evidence, not new source certification.

```sh
node scripts/repository/verify-host-font-authority.mjs --archives release-verification-artifacts/host-font-before-20261012 --baseline --output fidelity/evidence/host-font-authority/baseline
node scripts/repository/verify-host-font-authority.mjs --archives <current-candidate> --output fidelity/evidence/host-font-authority/current
node scripts/repository/verify-host-font-authority.mjs --archives release-verification-artifacts/host-font-before-20261012 --baseline --compat-family --output fidelity/evidence/host-font-authority/compatibility-family-baseline
```

The compatibility flag is a diagnostic variant, not a promised failing scenario.
The executable, separately bounded reproduction is:

```sh
node scripts/repository/verify-host-font-authority.mjs --archives release-verification-artifacts/host-font-before-20261012 --baseline --kinds family --modes default --reuse-mounted-session --output fidelity/evidence/host-font-authority/in-place-family-baseline
```

It fails after resetting and loading a saved Family into the same mounted session:
font, renderer and line evidence stay pending. This happens with the retained
default-registry implementation and distinct package identities. It is not
repaired or counted as passing R01 coverage. Reopening through a new session and
fresh document passes. Earlier Family fixtures also reused package identities;
those initial failures do not establish a general selection defect. Entry export
removal and incomplete synthetic metadata failures remain non-passing evidence.

## Current verification and disposition

The [durable verification record](evidence/host-font-authority-20261012/verification.json)
binds implementation/test hashes, archives, current command results, complete host
transcripts, measurements and gate output. The unchanged Core archive is
`4f804cb26d9aa6fa97e2c2cd745e93c6699730143bdc36778528bffa231be32e`.
Browser is `f45c09352d65c1d1819bea232744245dd1abc42222e57a403749974db1907a82`;
React is `f7c50d68d04f3de8df6d0e70a2b80adcdc6b5775927aabde48f00ded29e9100a`.
All remain unpublished 0.8.0 archives. No package version or named export changes.

Automated packed hosts pass for both session kinds: custom, default, embedded/null,
missing records/binaries, corrupt bytes, binary mismatch, semantic-face mismatch, rejected
registry reads and null with registry-only sources. Valid paths cover exact
upload/linking, 20 edits, Reset, Family selection, save/reopen, silent PNG and actual
download. Custom paths also cover A/B/A with a deferred read, StrictMode, independent
simultaneous registries, session replacement/remount, and exports abandoned during
preparation, raster capture and unmount. Abandoned exports produce zero downloads.
Cold restoration starts with no managed face and reconstructs the adapter from
persisted test records and bytes. Caller-owned sessions and registry bytes survive
renderer cleanup.

Missing exact embedding bytes reject even with a previously activated face.
Corrupt upload is rejected. A deliberately corrupted storage adapter returns a
non-ready preparation report and cannot export; native readiness remains **pending**
in this probe. The same behavior is reproduced with the old default registry.
Settling that error into a final diagnostic is separate error-handling work; this
report does not claim a terminal blocked publication for that case.

Registry replacement also advances the existing child renderer publication
generation. A private immutable package shell changes only at committed lease
or native package changes; canonical data, native materialization and mounted
measurement caches are preserved. A failing intermediate reproduction showed why
clearing only the parent cache could relabel an unchanged child observation.
The final assertion requires a newer renderer generation after A/B/A.

The embedding test is explicitly called from the portable entry point; its module
must not disappear under the package's `sideEffects: false` tree-shaking policy.
Current logs include its completion marker.

Strict packed declarations (`skipLibCheck: false`) compile every documented
addition and reject a renderer-handle registry override. npm and pnpm consumers
use identical archives without workspace/source aliases; supported guide examples
compile. Portable tests, package/Studio builds and typechecks, API/boundary/release
checks, exact-font reactivation, font/text-trim/routing regressions and Studio
setup/drafts/field/Family/workflow checks pass. SDK verification initially failed
on sandbox dependency fetching; its remaining packed-consumer and budget checks
passed with network access. The complete SDK suite was then rerun successfully
after the final publication correction. Bundle budgets and their configuration
are unchanged.

### Measurements

Production and development evidence are separate. The paired production workload
uses 20 accepted canonical edits per session; the test build adds a commit counter
and deferred raster checkpoint only. Every before/after default/embedded workload
has **160 native notifications, 80 renderer commits, zero new face activations and
zero URL allocations**. Default performs 20 registry-record reads and no binary
reads; embedded performs neither. Custom matches those default counts after repair.
Custom before repair cannot produce a valid typing/export timing and is not given
a fabricated comparison.

| Production workload | Before median / p95 edit ms | After median / p95 edit ms |
| --- | --- | --- |
| Single default | 1.0 / 1.4 | 1.1 / 1.7 |
| Single embedded | 2.0 / 2.5 | 2.2 / 2.7 |
| Family default | 1.3 / 1.8 | 1.5 / 1.7 |
| Family embedded | 3.0 / 3.5 | 3.1 / 3.5 |

These are retained individual instrumented trials, not a broad performance target
or a repeatability claim. Default/embedded PNGs match the historical packed output
byte for byte. Detailed export durations, activation/URL lifetimes, registry reads
and notification transcripts remain in the record.

### Fidelity and remaining scope

Fresh `sdk-061-host-font-authority-20261012b` has **24 complete stable captures**,
11 passing renderer comparisons, three passing scene comparisons and 12 passing
settlement comparisons. All 12 PNGs are byte-identical to the pre-change gate.
Carrousel/editor retains R07's one changed pixel; the gate is **NO-GO**. The
source-review record remains unbound to this failing run. No reference, tolerance,
fixture/font identity or snapshot was promoted. Carrousel Color/default/Reset is
checked against ZIP numeric values by the current public gate.

Exactly five production files changed among the 272 recorded runtime sources;
the other 267 remain hash-identical. All 299 protected artifacts outside the 25
separately checked Browser/React declaration artifacts remain identical, including Core
declarations, fixture/font manifests, references and snapshots. Declaration file
names/import hashes change through the documented optional API additions; named
public symbols and supported entry boundaries remain unchanged.

**R01's font-continuity repair is verified. SDK release readiness remains NO-GO.**
R07, the old in-place Family reload failure, corrupt-storage diagnostic settlement
and the remaining P1 milestones need their own dispositions. Automated browser
checks and stored-capture hash comparison are current-run evidence. Manual live
browser/screen-reader review and Node 22/pnpm 11.9.0 release-environment certification
are not claimed by this milestone.

The subsequent [R04 blocked-storage milestone](blocked-storage.md) preserves this
font authority path and documents safe manual Retry. It does not change R01's
stored verification or resolve R07 and the remaining release findings.
