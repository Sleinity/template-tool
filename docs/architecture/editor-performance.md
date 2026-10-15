# Output editor responsiveness and performance baseline

The starting recorded fidelity gate is `sdk-061-local-candidate-20261009a`.
This milestone changes Studio's output-editor subscriptions, draft scheduling and
feedback. It does not change Core/Browser/React renderer behavior, readiness,
recovery tokens, canonical semantics or the 650 ms autosave.

## Baseline and reproduction

The [retained baseline identity](evidence/editor-performance-baseline/identity.json)
binds three original Studio sources to their SHA-256 hashes. The browser driver
substitutes these sources in an isolated Vite build; it never rewrites workspace
sources to reproduce the baseline. Each trial gets disposable browser storage.
The exact active gate ZIPs and external font binaries are hash-verified before
running the public V2 importer and exact font-upload authority. Family preparation
uses the supported Browser constructor. This direct editor workload is not a
claim that the setup wizard passed; that is checked separately by the full gate.

Regenerate the paired workload with:

```sh
pnpm editor:performance -- --phase paired --trials 5 --mode production --output fidelity/evidence/editor-performance-certification
pnpm editor:performance -- --phase paired --trials 5 --mode development --output fidelity/evidence/editor-performance-certification
pnpm editor:verify
node scripts/editor-performance/release-checks.mjs
pnpm sdk:gate:061 -- --run-id sdk-061-editor-responsiveness-20261009a
node scripts/editor-performance/retain-review.mjs sdk-061-editor-responsiveness-20261009a
pnpm sdk:gate:061 -- --run-id sdk-061-editor-responsiveness-20261009a --assess-existing
node scripts/editor-performance/summarize.mjs
```

Each mode includes an unreported warm-up, five trials, three identical workloads
(short burst, sustained typing, multiline input), three single fixtures and one
three-source Family. Version order alternates by trial. Workload pacing uses
absolute input deadlines; readiness and persistence wait on observable state.
Counters are injected only into test builds. Performance numbers therefore describe
an instrumented, isolated editor rather than an uninstrumented production SLO.

Input-to-next-animation-frame is a **paint opportunity proxy**, not compositor
paint timing. A root listener registered after React's delegated listener observes
input processing through that callback checkpoint. The earlier target-listener
microtask measurement is retained separately and must not be called React input
latency. Reports retain per-input samples, actual canonical acceptance timestamps,
preview text transitions, long tasks, render/commit counts, authority/capture
counts, native readiness and frame geometry with current text/font/settlement
attributes. Preview changes must match an actual input value; the initial preview
is excluded from intermediate-update counts.

## Implementation boundary

Pending input no longer subscribes the entire `DraftEditor`. Small status,
retry-save and export controls consume cached pending/invalid/composition summaries.
A memoized output viewport prevents unrelated parent state from rerendering the
preview. Native renderer and session subscriptions remain intact.

The Studio coordinator uses a 100 ms trailing deadline with a 325 ms maximum wait
for a valid burst. Automatic callbacks are serialized across fields; newer values
coalesce, and explicit flush drains current work without a timer delay. Generation
identity guards local completion/error callbacks. Cancelling or replacing a
session cannot clear newer input, and disposal prevents not-yet-started mutations.
Active native operations retain their existing authorities.

Composition remains local and pending until compositionend; it is not styled as
invalid input. Incomplete Number/Date input stays visible and blocks guarded actions.
Rejected IME overflow restores and reschedules the preceding literal input. Choice
selection captures its option before asynchronous flushing. Commit exceptions
retain the literal value and display their original useful message.

Save feedback combines pending local input, accepted-but-not-yet-captured content
and existing persistence status. The brief acceptance-to-autosave-effect gap cannot
show `Saved`. Record capture, save ownership, unload guards and the locked
flush/persist/readiness/export/complete sequence remain unchanged.

## Paired measurements

The final certification workload completed 120 measured trials per build mode,
with zero workload failures. Each scenario/workload/version has five trials after
warm-up. Headless Chromium `149.0.7827.55`, macOS arm64, Node `24.19.0`, viewport
1440 × 1600 and device scale 1 were held constant. These numbers describe this
instrumented environment, not a general device performance guarantee.

Production sustained-typing results:

| Scenario | React input-processing p95, before → after | Final preview catch-up median, before → after | Intermediate updates per trial, before → after |
| --- | --- | --- | --- |
| Now Hiring | 3.2 → 1.5 ms | 343.4 → 96.5 ms | 0 → 2 |
| Cover | 4.7 → 1.1 ms | 354.9 → 108.1 ms | 0 → 2 |
| Carrousel | 4.5 → 0.7 ms | 358.9 → 115.8 ms | 0 → 2 |
| Three-source Family | 3.7 → 0.8 ms | 352.5 → 95.5 ms | 0 → 2 |

All short-burst, sustained and multiline production groups improved input-processing
p95 and final preview catch-up median. The 100/325 ms schedule therefore remains
enabled. No production workload reported a >50 ms long task. Development sustained
catch-up medians improved from 387–431 ms to 150–189 ms; input p95 improved from
10.7–14.6 ms to 1.8–2.5 ms. Development still reported 135 long tasks across both
versions: additional intermediate canonical renders increased Cover/Carrousel task
counts. This is retained evidence, not a production timing claim.

Coalescing trades one final canonical update for three updates during the sustained
workload. For Carrousel, materialization calls were 1 → 3, validation calls 5 → 11,
and record captures 1 → 3. Preview React commits fell from 28 to 15 in each of its
five production trials. Now Hiring/Family preview commits fell from 27 to 11–13,
and Cover from 28 to 14–15. Native work remains real and revision-bound; this change
does not suppress accepted updates or readiness notifications.

## Reproduced jitter

Carrousel's subtitle workload reproduced the unchanged Date text `Ends 04/16`
changing geometry in both retained baseline and current builds. In production
current trial 0, its screen-space bounds alternate between approximately
`(1283.361, 1038.412, 73.431, 10.192)` and
`(1283.645, 1034.037, 73.146, 14.567)`, then return exactly to their initial values.
The stage and transform have one unchanged state; fonts remain loaded.

The temporary state coincides with absent node font/trim/layout-box attributes and
pending readiness. Exact-font/authoritative-trim attributes return about 11–12 ms
later in that trial. The Date's text is unchanged throughout. This demonstrates a
transient text authority/measurement transition rather than persistent final layout
movement. It does not establish which renderer invalidation should be narrowed.
A separately scoped renderer audit must trace revision dependencies and metric
availability before changing measurement reuse or publication. No renderer timing,
geometry freezing or stale-evidence reuse was introduced here.

## Verification and remaining renderer work

Current-run results, source identities, timings, protected hashes and command
outcomes are recorded in the [durable evidence record](evidence/editor-performance-20261009.json). Preliminary and superseded timing runs are not certification evidence.
No approved reference or comparison tolerance is updated by this milestone.

Geometry traces distinguish stable viewport transforms, affected node changes,
unchanged text and temporary measurement/settlement transitions. A node's unchanged
text alone does not prove that its containing layout should remain fixed. The next
renderer milestone must identify the complete constraints and authority transition
before fixing any demonstrated transient geometry. This milestone does not reuse
stale measurements, freeze dimensions or change measurement scheduling.

Automated headless browser checks and stored trace/screenshot review are recorded
separately from manual live review. No manual UX or source-fidelity approval is
implied by repeat stability or successful tests.

The first aggregate assessment correctly rejected a disposition attached to the
previous run. The existing retention script also rejected the changed environment
build label. That label is SHA-256 of root `package.json` plus `pnpm-lock.yaml`.
Removing only the two new `editor:performance` / `editor:verify` test commands
reproduces the previous label exactly (`14f8e573…`); the current label is
`1362f200…`. The editor-specific retention script proves this narrow delta,
requires all other raster/font/tooling fields to match, verifies 25 retained
candidate implementation hashes and all 324 protected artifacts, and requires
twelve byte-identical reviewed PNGs plus passing comparisons before rebinding.
No dependency/environment mismatch is ignored and no reference is promoted.

## Final disposition

**Implementation complete; performance workload complete; regression gate GO.**
The fifteen sequential release checks passed: portable tests, package typechecks
and builds, supported API/declaration/boundary contracts, packed consumers and all
curated bundle budgets, root typecheck, Studio build, documentation, public V2
import, font reactivation, editor lifecycle, Studio setup/recovery, field rules,
Family parity and all three acceptance workflows. The packed React V2 profile is
871,329 raw / 206,022 gzip bytes, within its unchanged budget.

Run `sdk-061-editor-responsiveness-20261009a` has 24 complete stable captures,
12 passing renderer comparisons, three passing scene comparisons and 12 passing
settlement comparisons. All twelve reviewed PNGs are byte-identical to the prior
local candidate. The supported public single/Family host and raw-ZIP Color browser
checks also pass. The Now Hiring capture reaches Review/save through the supported
workflow; no save or readiness gate was bypassed to obtain timing evidence.

The verification record includes individual paired results, median/p95 summaries,
canonical/preview latency relationships, authority counts, worktree/source/tooling
hashes, package versions, original sources, failed intermediate review decisions,
and regeneration commands. All 324 protected API/fixture/font/reference/snapshot/
budget artifacts and 25 prior candidate implementation hashes remain unchanged.
Package versions remain `0.8.0`; no publication was performed.

Evidence classification: controlled-clock coordinator tests; automated exact-font
headless browser performance/lifecycle/workflow checks; current stored Carrousel
editor screenshot and frame-trace inspection; retained prior source reviews via
exact identity checks. **No new manual live-browser UX or source-fidelity review**
was performed. Geometry jitter remains reproduced and explicitly deferred to its
separate renderer milestone; this does not block the bounded editor scheduling
milestone's completion.
