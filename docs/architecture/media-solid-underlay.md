# Established media underlay diagnostic correction

Starting recorded gate: `sdk-061-now-hiring-text-stability-20261010c`.
The user supplied `fidelity-issue-e5fc9a44.zip` for Carrousel bottom image
`987:6823`; its hash and the pre-change implementation are retained in
[the baseline identity](evidence/media-underlay-baseline/identity.json).

## Audit and bounded correction

The packet preserves exact source floats, NORMAL SOLID → NORMAL IMAGE order,
FILL placement and an active `media-dom` owner. The same node's primitive SVG
resolver rejects IMAGE ownership, as intended. `resolveNode` nevertheless emits
a generic multiple-paint warning from those unrelated primitive rejection reasons.
Backend projection consequently reports a degraded fallback even though the
established CSS background renderer already expresses this complete simple stack.
The provided screenshot and packet are evidence, not instructions or a new source
fixture. The exact registered exporter 0.6.1 ZIP remains the fidelity authority.

The correction recognizes the narrow property predicate in ADR 0095 and emits an
informational source-order explanation. Backend decision and diagnostic projection
remain their existing authorities. Paint/asset/geometry owners and DOM/CSS output
do not change. Primitive rejection evidence remains available in technical data;
only its applicability as a degraded media warning changes. No source values are
removed or normalized. General mixed stacks, new compositors, renderer measurement,
font ownership, sessions, persistence and public APIs are outside this task.

## Failure-first evidence and verification

The fresh pre-change run `sdk-061-media-underlay-before-20261010a` passes all 12
renderer comparisons. `mediaSolidUnderlay.test.ts` then fails on the original
`degraded-fallback` classification. Negative contract cases retain unsupported
reversed, additional, hidden, translucent, blended and unknown paints, missing
assets and other appearance dependencies. Mask diagnostics remain native.
An intermediate test identified that CROP fallback can still have an object-fit
render mode; the recognition therefore also requires explicit resolved FILL/FIT.
This did not change the CROP authority or its existing diagnostic policy.

## Current results

Gate `sdk-061-media-underlay-20261010a` is GO: 24 complete stable captures,
12 renderer comparisons, three scene comparisons and 12 settlement comparisons.
All 12 PNGs are byte-identical to the previously reviewed passing run. Individually
reviewed dispositions were retained only after guarded source/font/environment,
output and protected-artifact checks; there was no reference promotion.

All 15 release/workflow commands pass, including portable tests, SDK packed
consumers, boundaries, API/declaration checks, unchanged bundle budgets, builds,
typechecks, font reactivation, public V2 import/editor and Studio setup/recovery,
field rules, Family parity and workflow acceptance. The aggregate gate additionally
passes public single/Family hosts and Carrousel's exact ZIP-number Color check.
Only one of 365 tracked runtime implementations changes; all 324 protected
reference, snapshot, tolerance, fixture/font and declaration identities remain
unchanged. The retained-source differential requires equality of every other node
and of non-diagnostic resolved evidence, with unchanged backend owner collections.

Automated disposable-context Studio coverage verifies Checks, Fields, editor,
768/1440 viewport resize and a real 1920×1080 PNG download with no page errors.
The bottom image is `established-compatibility-owner`, without active fallback.
The exact ZIP's IMAGE-only top and main fields remain `semantic-owner`. Checks
contains no fallback card; its duplicate-field and large-media import warnings
remain visible. Stored Checks screenshot and current Carrousel PNG were personally
inspected. This is distinct from manual live review, which was not performed in
the user's browser or against the user's unsaved importer state.

The native public-operation probe verifies bottom-image replacement with a valid
transparent PNG, unchanged paints, save/reload and imported-default Reset. The
synthetic negative cases remain contract coverage, not new source certification.
Original/current resolver microbenchmarks use ten warmups and 50 iterations per
export; individual median/p95 values are retained. They are not typing-latency
measurements and make no optimization claim.

The browser's initial assumptions that all three image nodes have underlays and
that every media owner uses CSS backgrounds were rejected by exact source/runtime
evidence. The Node probe initially had no IndexedDB asset store and expected a
canonical `activePlacement` property after Reset; its final version supplies the
supported caller-owned store with exact ZIP bytes and asserts native reset data
and resolved imported-source authority. These were harness corrections; no
production behavior was changed to accommodate them. Failed attempt logs remain
local evidence. The failure-first Core regression remains independently retained.

The [durable verification record](evidence/media-solid-underlay-20261010.json)
contains implementation/source hashes, packet/fixture/font identities, command and
local evidence hashes, lifecycle results and measurements. No approved reference,
snapshot, tolerance, public API, package version or rendering owner changed.

## Regeneration

Use the recorded Node/pnpm/Chromium environment and provision the manifest's exact
external ZIP/font files. Build and pack sequentially through `pnpm sdk:verify`
before native public-operation checks. Regenerate the retained-source differential
with `node scripts/repository/verify-media-underlay.mjs` and isolated Studio
coverage with `node scripts/repository/verify-media-underlay-browser.mjs`.

For a fresh uniquely named run, execute source-authoritative two-pass
`pnpm fidelity:compare -- --gate sdk-061 --run-id <new-id> --font-profile source-authoritative --repeat 2`,
then `pnpm scene:compare` and `pnpm settlement:compare` with
`--gate sdk-061 --run-id <new-id> --fidelity-run <new-id>`.
`node scripts/fidelity/retain-media-underlay-review.mjs <new-id>` refuses changed
output, environment, unrelated runtime implementations or protected evidence.
After those guards pass, `pnpm sdk:gate:061 -- --run-id <new-id> --assess-existing`
checks the aggregate gate. The retention command writes dispositions only; it
never writes approved references. Broader runtime changes require another review.

