# Text geometry stability during editor updates

Starting gate: `sdk-061-editor-responsiveness-20261009a`.

The task retains the exact pre-change renderer, runtime, editor and scheduling
sources with SHA-256 identities in
[evidence/text-geometry-baseline/identity.json](evidence/text-geometry-baseline/identity.json).
The previous 365 runtime identities matched before editing. The before renderer
comparison (`sdk-061-text-geometry-before-20261009a`) passed all twelve surfaces.

The failure-first browser trace reproduces unchanged Date geometry at 10.19 and
14.57 screen pixels, with the same content, fonts and stage transform. Generation
in local keys makes trim temporarily unavailable. The first correction also
proved that a paint span replaced by the trim wrapper can invalidate captured refs.
The bounded repair validates complete mounted inputs separately from publication
and measures the current connected paint ref. ADR 0093 records the authority.

The focused final production probe passes burst, sustained and multiline Date
stability. Intermediate experiments remain in local packets with their failures;
they are not certified measurements. Final paired and release verification is
recorded in the durable evidence record when complete.

No Studio schedule, autosave, recovery, native evidence authority, source values,
comparison tolerances or approved reference changes are authorized. Exact Color
values use ZIP numbers. Automated browser evidence, stored-capture inspection and
manual live review are reported separately.

The retained development trace additionally demonstrates fresh child measurement
publication followed by a parent passive clear in the same generation (Cover
burst, continuous and multiline). Generation turnover now clears the two runtime
maps in a layout effect, before child passive publication. Filtering, participation,
revision/generation matching and settlement readiness remain unchanged. This
orders existing ownership rather than preserving stale runtime publications.
The failure-first ordering proof regenerates with the final renderer and the
hash-verified original runtime:

```sh
node scripts/editor-performance/run.mjs --baseline docs/architecture/evidence/text-geometry-baseline/identity.json --phase current --trials 1 --mode development --scenario exporter-061-cover --publication-order-baseline --output fidelity/evidence/text-geometry-order-before
node scripts/text-geometry/assert-publication-order.mjs fidelity/evidence/text-geometry-order-before/development-current.json --expect-erasure
```

The current-source assertion omits `--expect-erasure`. Final typing
measurements remain an independent acceptance requirement.

Before the final `c` production trials, the timing analysis was specified as five
paired trials with exact enumeration of paired bootstrap resamples. A positive
lower endpoint of the 95% interval for median or p95 handler change flags a
repeatable increase. This is not a millisecond budget. Individual values and
mixed/uncertain results remain visible; the finite workload cannot prove latency
for every host. `scripts/text-geometry/assess-performance.mjs` also verifies
unchanged canonical call counts and sustained preview progress.

## Final implementation and verification record

The finalized production change is limited to the React text renderer, two
runtime map-clear effects and the new private `textMeasurementInputs.ts` helper.
The three retained final sources are hash-identified in
[evidence/text-geometry-final-d-sources/identity.json](evidence/text-geometry-final-d-sources/identity.json).
Studio's 100/325 ms input schedule, 650 ms autosave and recovery ownership remain
unchanged. Complete semantic inputs plus current mounted constraints authorize
local reuse; publication continues through current native guards. Unknown inputs
keep the existing pending/fallback path.

The final automated gate is `sdk-061-text-geometry-20261009d`. Its sequential
release checks, focused dependency tests, StrictMode/late-evidence tests, routing,
fonts, trim and Textarea scenarios all pass. The source-authoritative gate has
24 complete stable captures, 12 passing renderer comparisons, three passing
scene comparisons and 12 passing settlement comparisons. All twelve PNGs match
the prior individually reviewed PNG bytes. The 324 protected API, reference,
snapshot, fixture and font artifacts remain unchanged. Prior source-review
records are archived before rebinding; no reference is promoted.

Five warmed paired trials cover short bursts, sustained typing and multiline
edits for each exact export and a publicly assembled Family, separately in
production and development. In all 30 current Date traces per mode (Carrousel
plus selected Carrousel Family variant), unrelated edits retain one geometry
state. Width/wrapping, typography, stage resize and session replacement still
remeasure. Canonical validation/materialization counts match the retained native
baseline. Production measurement callbacks fall from 1,130 to 590 across the
60 measured workload rows per version; measured field-component commits fall
from 6,370 to 6,000. Production detailed traces contain no long tasks. Development
long tasks are retained separately and do not establish production performance.

The final stored Validate, Fields, editor and PNG captures for all three fixtures
were personally viewed. This is stored-capture inspection, not manual live typing. Automated
browser contexts are disposable; no manual edit or recovery was made in the
user's open application.

### Timing-analysis correction and instrumentation profiles

The first analysis mistakenly seeded bootstrap recursion with a complete sample,
so it calculated one median rather than enumerating 3,125 resamples. Its confidence
intervals and repeatability labels are invalid; the raw measurements remain
intact. The repaired analysis seeds the recursion with an empty sample, asserts
`5^5` results and checks exact intervals `[1,5]` and `[-.2,.2]` for controlled
inputs. The originally specified percentiles and positive-lower-endpoint rule are
unchanged. Historical invalid analyses are retained as harness-defect evidence.

Detailed traces inject measurement/publication logging and sample full DOM
geometry every frame. Their final production analysis flags a Cover sustained
handler signal (median interval 0.1–0.3 ms), which remains visible in the evidence.
A separate `--latency-only` profile runs unmodified production sources without
those injections or full-frame DOM sampling. It retains input timings, visible
preview progress, native acceptances, long tasks and final readiness. Use that
profile for typing acceptance; use detailed traces for geometry and authority
counts. Neither profile is an actual compositor-paint timestamp. A finite
five-trial interval spanning zero is absence of a demonstrated repeatable
increase under this workload, not a guarantee for every host or device.

The current durable record keeps both profiles, their individual observations,
source/environment identities and decisions. The final isolated-source run also has 120 workload rows and no demonstrated
repeatable handler increase under the same analysis. Sustained typing continues
to show intermediate previews, every run ends export-ready, and all production
trials in both profiles report no long tasks. The milestone is complete under
this recorded profile. The separately retained instrumented signal is a tracing
limitation, not hidden or used to widen a latency budget.

### Regeneration

```sh
node scripts/text-geometry/certify.mjs fidelity/evidence/text-geometry-final-d sdk-061-text-geometry-20261009d
node scripts/editor-performance/run.mjs --baseline docs/architecture/evidence/text-geometry-baseline/identity.json --phase paired --trials 5 --mode production --latency-only --output fidelity/evidence/text-geometry-final-d/latency
node scripts/text-geometry/verify-style-reads.mjs fidelity/evidence/text-geometry-read-confirmation/style-read-equivalence.json
node scripts/text-geometry/record.mjs
node scripts/text-geometry/assess-performance.mjs docs/architecture/evidence/text-geometry-20261009.json
node scripts/text-geometry/supplement.mjs
node scripts/text-geometry/finalize.mjs
```

The detailed-profile analysis can exit nonzero for its retained timing signal;
that is recorded separately, never erased. Finalization requires complete
passing release/fidelity commands, exact final-source hashes in the isolated
production workload and a passing identical timing criterion. It never writes
approved reference directories. Local binary/full-frame packets can be recreated
with these commands; the compact source and trial record is tracked.
