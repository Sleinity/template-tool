# Now Hiring: fresh text measurement before paint

Starting gate: `sdk-061-text-geometry-20261009d`. The previous repair preserved
unchanged Carrousel Date geometry; it did not certify geometry of newly edited
Now Hiring text. Seven current sources are retained and hash-verified in
[evidence/now-hiring-text-baseline/identity.json](evidence/now-hiring-text-baseline/identity.json),
with 365 runtime and 324 protected artifact identities.

## Audit and proposed bounded contract

The failure-first production trial uses the real Studio editor, exact registered
ZIP and fonts, and a disposable recovery context. Each sampled animation frame
carries its accepted content revision. Identical accepted headline text changes
from a browser line box (106.27 screen pixels) to semantic trim (81.39), and
multiline body updates cause a temporary image/sibling shift before reaching the
correct dependent layout. Sustained headline typing additionally demonstrates a
transient extra line before the current intrinsic width and constraints settle.
The retained source reproduction is not a new fixture or a reference approval.

Changed semantic inputs correctly invalidate the previous sample. The remaining
problem is the gap between that invalidation and the RAF measurement: the browser
can paint fallback geometry first. The experiment measures the *current* connected
DOM in a layout effect when font identity and mounted constraints are available.
It does not retain a measurement for changed text, freeze geometry, change the
metric/calibration algorithm, or accept an old publication. Unknown constraints
and unavailable faces keep asynchronous pending/fallback behavior. Observers and
font events still invalidate measurements; native generation, publisher,
settlement and export readiness guards remain authorities.

Frame checks distinguish intended changes between accepted revisions from extra
movement within the same revision/text. Final settled outputs must still pass
unchanged renderer, scene and settlement comparisons. This contract is local to
mounted measurement hooks; ADR 0010 remains Proposed. Historical selectable-mode
roadmap statements remain superseded by ADR 0071.

## Regeneration and status

```sh
node scripts/editor-performance/run.mjs --baseline docs/architecture/evidence/now-hiring-text-baseline/identity.json --phase before --trials 1 --mode production --scenario exporter-061-now-hiring --output fidelity/evidence/now-hiring-text-before
node scripts/text-geometry/assert-now-hiring.mjs fidelity/evidence/now-hiring-text-before/production-before.json --expect-jitter
```

The completed scoped implementation and qualified timing disposition are recorded
below. Automated browser evidence, stored capture inspection and manual live review
are separate. References and tolerances are protected; Carrousel Color correctness
continues to use ZIP numeric values.

## Root-cause refinement and accepted correction

An earlier experiment moved measurement before paint and removed burst/body
fallbacks, but sustained headline input still changed its wrapping constraints
when the trim wrapper appeared. A second layout check measures that *new* DOM.
The current cached object, rather than its semantic key alone, gates publication.
This prevents an intermediate same-key sample from publishing after its mounted
constraints changed. Metric algorithms and their existing equality comparisons
are unchanged; equal results retain identity.

The remaining trace discrepancy was an actual CSS animation, not stale intrinsic
telemetry: `getAnimations()` showed a height transition from 214.725 to 93.125
while the inline style and trim evidence were already 93.125. Studio's universal
reduced-motion rule set a nonzero duration with default transition-property `all`.
Its duration is now zero only for semantic text nodes and their paint descendants.
The temporary flushSync ResizeObserver experiment did
not solve that leak and is not part of the production implementation.

The final focused production trace passes all three workload assertions with one
geometry per accepted revision/text for every node. The complete five-pair trials,
normal-motion coverage and release/fidelity results follow below.

## First complete run: rejected broader sampling

`sdk-061-now-hiring-text-stability-20261010a` completed the production and
development workloads, Family probe, normal-motion probe and captures. All targeted
jitter checks passed. Its isolated five-pair analysis nevertheless flagged p95
handler increases in Cover continuous typing, Carrousel multiline input and Family
continuous typing. Canonical validation/materialization counts were unchanged;
renderer callbacks increased and React commits decreased. This is retained as
`fidelity/evidence/now-hiring-text-first-complete`, with source identities in
`evidence/now-hiring-text-measurement-a-sources/identity.json`. It is not a completed
performance gate.

Eleven renderer comparisons passed. Carrousel editor differed at one pixel, with
equal reported geometry and stable repeated captures; the difference remains
unapproved. Scene and settlement comparisons passed. A setup test also inspected
the issue list immediately after changing a rule without requesting fresh checks;
the corrected harness uses the supported Check again operation first. The review
guard's runtime inventory expectation was corrected to include Studio CSS, which
is present in the retained 365-file inventory. No reference was changed.

The bounded follow-up restricts before-paint sampling and trim-commit validation
to explicit `CAP_HEIGHT` intent. The demonstrated Now Hiring fallback is cap trim.
Untrimmed text and fixed-box line observations retain their previous asynchronous
scheduling and native readiness. This is a source-property boundary, not a fixture
branch. Fresh measurements still use current inputs, and every publication guard
remains intact. Repeated performance and fidelity checks must assess this narrower
implementation independently.

The trim-only five-pair run is retained in
`fidelity/evidence/now-hiring-text-trim-only`, with the B sources in
`evidence/now-hiring-text-measurement-b-sources/identity.json`. It removed the three
earlier flags but flagged a 0.1–0.3 ms median interval for Now Hiring multiline.
That result is not waived. The follow-up avoids redundant observer samples only
when the existing complete mounted-input check matches, the cached measurement
uses an exact loaded face, the actual face signature is unchanged and the font
set is loaded. Changed, missing or unknown inputs schedule normally. Font-loading
events always schedule; a fulfilled fonts-ready promise adds no duplicate task
after an already completed exact sample. These remain local borrowed observations,
not a new cache, font owner, settlement or publication authority.

## Evidence-writer failure and correction

The first full production trace stopped after 115 of its 120 required rows when
V8 rejected a JSON string exceeding its size limit. Its directory is retained as
`fidelity/evidence/now-hiring-text-incomplete`; it is an incomplete harness run,
not passing performance or fidelity evidence. Full workload assertions now reject
missing, duplicate and cross-trial rows. Row-local string/object dictionaries and
an atomic streamed writer preserve every frame, property and ordering without
constructing that oversized string. Historical packets still decode. Focused
roundtrip tests verify lossless encoding and reject invalid dictionary references.

## Third complete run and CSS isolation

The C sources are retained in
`evidence/now-hiring-text-measurement-c-sources/identity.json`; their complete run
is retained in `fidelity/evidence/now-hiring-text-third-complete`. All geometry
assertions and the isolated five-pair timing assessment pass. The renderer gate
still rejects Carrousel editor: one pixel exceeds the unchanged comparison
threshold, with 6,140 raw RGBA differences in image regions. Neither stable output
nor a small thresholded score authorizes approval.

Retained-source ablations isolate the change to the universal reduced-motion CSS
duration: current renderer plus old CSS is byte-identical to the reviewed D PNG;
old renderer plus universal-zero CSS reproduces the difference. Disabling every
transition property or retaining opacity only does not restore that raster. A
text-only duration rule does restore its exact PNG hash. The production rule now
uses a private class emitted from canonical node type TEXT, independent of
telemetry and fixture identity. Media and unrelated application behavior retain
their existing CSS. Fresh complete verification assesses this narrower candidate.

The C release check was interrupted for over ten hours during a temporary packed
install and reported a missing `ajv` module. Recovery later timed out on its
visible resume dialog. Both original results and the failure screenshot remain
retained. Fresh SDK and recovery reruns pass with all 365 runtime hashes unchanged;
they are separate evidence, not edits to the original failed transcript.

## Final scoped implementation and current-run decision

Gate `sdk-061-now-hiring-text-stability-20261010c` passes **24 complete stable
captures, 12 renderer, three scene and 12 settlement comparisons**. All twelve
PNGs are byte-identical to the previously source-reviewed gate. The guarded
identity check retains those individual reviews without promoting references.
All 324 protected API/reference artifacts are unchanged; 363 of 365 runtime files
are unchanged. The only runtime changes are the mounted intrinsic-text hook and
Studio's TEXT-only reduced-motion correction. No input schedule, field semantics,
font owner, session, persistence, public API or measurement algorithm changes.

The [durable evidence record](evidence/now-hiring-text-stability-20261010.json)
contains source hashes, retained before/after files, exact fixture/font identities,
commands, individual trials and compact per-accepted-revision bounds. The current
sources are retained under `evidence/now-hiring-text-final-sources/identity.json`.
The complete binary/frame packets and logs remain local under
`fidelity/evidence/now-hiring-text-final`; the record includes regeneration commands
and packet hashes. Production and development are measured separately using
Chromium 149.0.7827.55, Node 24.19.0, macOS arm64, viewport 1440×1600 and DPR 1.

Current-run automated evidence:

- 120 paired detailed production rows and 120 development rows, five pairs after
  warm-up across all three exports and the supported public Family.
- 30 additional paired Family rows selecting Now Hiring, plus three Now Hiring
  normal-motion workloads. The **48 current Now Hiring traces** retain exactly one
  all-node geometry state per accepted revision/text. Genuine changes between
  revisions remain allowed. The Carrousel and Family Date assertions also pass.
- Sustained Now Hiring typing publishes two intermediate accepted preview updates
  in each production trial. Validation/materialization and React commit counts
  remain unchanged in the investigated Family multiline workload; redundant
  measurement callbacks decrease from eight to zero, with no recorded long task.
- Genuine width, wrapping, typography, resize and session replacement invalidate
  current measurements; font, text-trim, routing and Boolean/Textarea coverage pass.
  StrictMode and stale-publisher checks continue blocking stale readiness/export.
- All 26 certification commands and all 15 release/workflow commands pass,
  including SDK/API/boundary, packed consumers/budgets, portable tests, builds and
  typechecks, public single/Family workflows, Studio setup/recovery, field rules
  and workflow acceptance. Carrousel Color uses exact ZIP numbers.

### Timing qualification, retained rather than waived

The first final-source isolated production assessment has 120 rows and flags
**one** case: Family multiline median handler change, 95% paired-bootstrap interval
**[0.1, 0.3] ms**; its p95 interval is **[-0.1, 0.1] ms**. This analysis remains
recorded with exit code 1 and its original flag. The other eleven groups have no
positive lower endpoint. Detailed tracing is not used as a typing-latency oracle.

Before repeating, the independent investigation was declared and its analysis
script written. It covers all three Family workloads, five pairs after warm-up,
with the exact same sources, baseline, fonts, fixtures, browser, viewport and
minimal instrumentation. No other build/workload ran concurrently. Its 30 rows
are complete; no trial is selected or dropped. The original exact bootstrap rule
and timer precision are unchanged. Family multiline median is **[0, 0.3] ms**,
p95 **[-0.1, 0.3] ms**, and paint-opportunity median **[-1.4, 0.5] ms**. All three
repeated Family cases have no positive lower endpoint. The original handler flag
is therefore **not confirmed by this independent repetition**, rather than erased.

The performance disposition is **qualified**. This supports shipping the bounded
jitter repair under the recorded workload; it is not an unconditional timing pass,
proof of zero overhead, or a general claim for every host. The result does not
justify broader rendering work or a new latency budget. The disposition tests
reject missing, mismatched, incomplete or positively flagged replication.

### Review and regeneration

All twelve final stored capture images were personally inspected. This is
stored-capture review, separate from automated browser interaction. No manual
live typing review is claimed, and the user's open editor/storage were untouched.
No approved reference, snapshot or comparison tolerance changed. Earlier failed
and interrupted runs remain explicitly retained as such.

```sh
node scripts/text-geometry/certify-now-hiring.mjs
node scripts/editor-performance/run.mjs --baseline docs/architecture/evidence/now-hiring-text-baseline/identity.json --phase paired --trials 5 --mode production --scenario family --latency-only --output fidelity/evidence/now-hiring-text-final/family-replication
node scripts/text-geometry/assess-family-replication.mjs
node scripts/text-geometry/record-now-hiring.mjs
node scripts/text-geometry/finalize-now-hiring.mjs fidelity/evidence/now-hiring-text-final/stored-capture-inspection.json
```

The last command requires a personally recorded inspection matching every current
PNG hash. Regenerated evidence must receive its own review and timing disposition;
the command is not permission to reuse an old inspection or discard a new failure.
