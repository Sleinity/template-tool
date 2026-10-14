# R07 — Carrousel editor raster review

R07 is resolved through the authorized source-review branch: the current output
honors the imported source, and the historical editor reference was captured
with a different initial viewport. Only **Carrousel/editor** was promoted. No
Studio or SDK production source, renderer owner, sampling algorithm, API, schema,
persistence, version, fixture, font, scene snapshot or tolerance changes.

The final post-promotion certification is recorded in
[evidence/verification.json](evidence/r07-raster-20261013/verification.json).
Closing R07 does not certify the entire SDK for release.

Post-promotion gate **sdk-061-r07-raster-20261013a** is **GO**: **24 complete
stable captures, 12 renderer, three scene and 12 settlement passes**. The first
assessment correctly rejected the older disposition identity; exact current-run
review binding and a fresh public-host assessment then passed.

## Baseline and cause

The starting R04 gate `sdk-061-blocked-storage-20261012c` had 24 stable captures,
11/12 renderer passes, 3/3 scene and 12/12 settlement passes. The editor had 6,140
raw RGBA differences, one exceeding the existing comparator threshold at
(234,475). Its 874×492 raster and structural geometry passed; PNG export passed.
Original sources, the reference and intervening captures are retained with
[hashes](evidence/r07-raster-20261013/baseline/identity.json).

[Chronology](evidence/r07-raster-20261013/chronology.json) identifies the relevant
transition: `sdk-061-studio-product-20261012c` passed with the original Fit startup;
`sdk-061-output-refinements-20261012b` was the first captured failure after the
requested **40% initial output zoom**. R01's pre-change capture already contains
it; R01 and R04 retain exactly those pixels. The same difference count occurred
in an earlier, repaired CSS investigation. That count was not a unique cause:
current CSS ablations do not reproduce that earlier causal result.

Two fresh Chromium processes each produced five identical failing captures.
[Seventeen isolated experiments](evidence/r07-raster-20261013/review/experiments.json)
then establish the current cause:

| One-factor experiment | Raw differences / thresholded | Conclusion |
| --- | --- | --- |
| Current Studio; initial 40%, then established Fit camera | 6,140 / 1 | Reproduces R07 |
| Zero duration on media, canvas, viewport or globally | 6,140 / 1 | Current reduced-motion rule does not explain it |
| Global duration zero before mount; retained reviewed global CSS | 6,140 / 1 | Not a current CSS cascade leak |
| Square outer stage; outer overflow visible; touch behavior restored | 6,140 / 1 | These presentation properties are not causal |
| Fixed-position stage, with the same final bounds | 7,010 / 1 | Browser raster depends on more than final bounds; not a repair |
| Retained reviewed preview, starting at Fit | 0 / 0 | Restores historical pixels with current SDK |
| Current preview, changing only initial zoom to Fit | 0 / 0 | The initial viewport is sufficient |
| Current preview, removing only session reset | 6,140 / 1 | Reset lifecycle is not causal |
| Retained reviewed preview, changing only startup to manual 40% | 6,140 / 1 | Reverse experiment produces the current raster |

The two current-wrapper paths have identical **complete unrounded traces** after
Fit: all node and ancestor bounds, computed styles, transforms, fonts, animation
state and native telemetry. Only volatile object-URL tokens are excluded from
that comparison. The final view is `translate(16px,476.188px) scale(0.455208)`;
the canvas is at (501,583.1875), size 874×491.625. The camera remains the
906×1444 stage at (485,107), viewport 1440×1600, DPR 1.

This proves a native browser raster dependency on the preceding viewport path.
It does **not** prove which Chromium cache/compositor implementation creates it.
No browser upgrade, forced repaint, renderer remount, pixel snapping, artificial
wait, frozen dimensions or replacement sampling backend is used to suppress it.

## Source review and disposition

The exact source ZIP is
`6bd49eaf67453273f9da99da117d5db35abea9d85cf58af4412336e405f4f904`;
its template JSON is
`2db62356644280ba849a5b9df8ecdc949d000940091b57ed6ed265d86f8948e5`.
[Source nodes](evidence/r07-raster-20261013/source/source.json),
asset bytes (retained locally: `evidence/r07-raster-20261013/source/photo.png`; excluded from release source) and
source preview (retained locally: `evidence/r07-raster-20261013/source/preview.png`; excluded from release source) are retained.
The decoded photograph is 1125×750, SHA-256
`5dcfbc0b02a55dde8a347ca283dc1babb25958fbaa7e977d89e4d063286491f0`.
The private exact Rethink Sans 600 face uses binary
`523d8be1ea86cb2563d503c8de51bfd2c69ab78cdfb72038873adf9cdfcbe2be`;
there are no fallback fonts in the source-authoritative captures.

Both affected image slots are 240×240, at source root-relative (420,-164.000122…)
and (420,1003.999878…). Their browser-native centered `cover` implements source
FILL without stretching. The declared mask clips the 1080×1080 left region.
Imported `imageTransform` remains inapplicable provenance under the existing
FILL contract. The bottom SOLID underlay is unchanged and paints behind IMAGE.
Every editor delta lies inside the two thumbnail footprints, including partially
covered edge pixels. No text, background paint, main image, semantic crop,
clipping scope or content value changes. The 129 samples outside the strict
floating rectangle test are within its partially covered one-pixel edge band.

Aligned four-times crops (retained locally: `evidence/r07-raster-20261013/review/bottom-approved-current-raw-diff-4x.png`; excluded from release source)
show approved, current and raw difference panels. Differences are photographic
resampling detail, not a shifted subject or changed clip. The source review
uses asset and placement evidence as well as these pixels; embedded preview
similarity and comparison size alone are not approval reasons.

All four surfaces were inspected separately under reduced and ordinary motion:

| Surface | Reduced motion: raw / thresholded | Ordinary motion: raw / thresholded | Affected region |
| --- | --- | --- | --- |
| Validate | 4 / 0 | 1,354 / 0 | Main-image sparse samples; ordinary motion also changes thumbnail samples |
| Fields | 2 / 0 | 1,333 / 0 | Same bounded image regions; inspection outline remains non-export content |
| Editor | 6,140 / 1 | 6,140 / 1 | Two clipped thumbnails only |
| PNG export | 0 / 0 | 0 / 0 | Byte-identical approved export |

These are comparisons with the existing reduced-motion references, not new
ordinary-motion references. Full structures and differences are in the
[four-surface packet](evidence/r07-raster-20261013/review/four-surfaces.json).
The actual pre-promotion three-export run also retains eleven byte-identical,
previously reviewed rasters. All final output changes are accounted for.

The [review decision](evidence/r07-raster-20261013/review/decision.json) binds
source, asset, font, candidate, environment and the causal experiment to
`sdk-061-r07-review-20261013a`. It accepts current native FILL samples for the
intentional 40% startup, rather than changing valid production behavior to
reproduce the historical Fit startup. The guarded update preserves generated
before/after/diff/structure/environment evidence under
[evidence/promotion](evidence/r07-raster-20261013/promotion).

Approved PNG changes from `efa8b3b84c7730ae…` to `a75ce8622b75df92…`.
Only this surface's PNG and structural reference change. Source captures remain
unmodified. All other references, scene/settlement snapshots, fixtures, fonts,
API declarations and bundle budgets retain their recorded hashes.

## Verification and performance

Current command results and log hashes are in
[build](evidence/r07-raster-20261013/checks/build.json),
[browser](evidence/r07-raster-20261013/checks/browser.json) and
[packed-host](evidence/r07-raster-20261013/checks/packed.json) records.
Portable tests, package/Studio builds and types, SDK/API/boundary checks,
strict packed declarations, npm/pnpm consumers and unchanged bundle budgets pass.
The initial documentation check exposed incorrect relative links when the
review-packet generator used a custom output directory. Its test-only link
generation now derives the directory depth; the failed record is retained and
the final documentation check passes.
All three fresh archives are byte-identical to R04, version 0.8.0, unpublished.
All 273 SDK and 101 Studio production files match the R04 source inventory.

R01 custom/default/embedded font and stale export scopes pass. R04 real blocked
upgrade, independent caller outcomes, late callbacks, exactly-once resource pin
release, save/recovery Retry and retained font files pass. Font reactivation,
text-trim/routing, setup/drafts, field rules, Family parity and workflow acceptance
pass. Exact-export single/Family output tests exercise all-field edits, image
replacement, Reset, resize, fit/zoom/pan, preserved camera/mount, latest-value PNG,
invalid input, IME, save failure/retry, session replacement and late work.
The public Carrousel Color check uses the ZIP's
`(0.8999999761581421, 0.699999988079071, 1, 1)` values for default and Reset,
then verifies explicit edits and the completed 1920×1080 PNG. No hex-derived
rewrite replaces imported numeric authority.

Five paired production trials after warm-up use the three exact exports plus a
publicly assembled Family, short bursts, continuous typing and multiline edits.
Development is recorded separately. Production sources are unchanged; measured
validation/materialization, text callbacks, preview progress, native notifications,
URL allocations and font activations are retained in the quantitative record.
The performance measurement is an instrumented input-to-animation-frame proxy,
not a compositor paint timestamp or an uninstrumented benchmark. No performance
optimization or new arbitrary target is claimed.

[Individual results and summaries](evidence/r07-raster-20261013/performance.json)
retain 120 counted production workloads (60 pairs). All pairs have equal
validation, materialization, text-callback and record-capture counts; every
continuous trial has two intermediate previews. There are zero measured long
tasks and zero URL allocations/releases or font loads/adds during these edits.
Input-event medians are 0.4–0.6 ms, p95 values at most 1.4 ms. Small React and
notification differences remain recorded; unchanged production sources and the
separate repeat measurements show no introduced bottleneck. Development's
12 workloads remain separate from production's five paired trials.

## Reproduction

```sh
# Each invocation is a fresh browser process; expected pre-promotion failure.
pnpm fidelity:compare -- --fixture exporter-061-carrousel --surface editor \
  --run-id <unique-run> --font-profile source-authoritative --repeat 5 \
  --capture-camera studio-reference-20261012
# Compare-only, hash-verified one-factor test variants:
R07_RETAINED_VARIANT=initial-fit R07_RASTER_PROBE=trace pnpm fidelity:compare -- \
  --fixture exporter-061-carrousel --surface editor --run-id <unique-run> \
  --font-profile source-authoritative --repeat 2 --capture-camera studio-reference-20261012
R07_RETAINED_VARIANT=preview-reviewed-40 R07_RASTER_PROBE=trace pnpm fidelity:compare -- \
  --fixture exporter-061-carrousel --surface editor --run-id <unique-run> \
  --font-profile source-authoritative --repeat 5 --capture-camera studio-reference-20261012
node --test scripts/r07/review-contract.test.mjs
node scripts/fidelity/capture-camera.test.mjs
pnpm sdk:gate:061 -- --run-id <new-unique-run>
```

The retained update command is a one-time reviewed operation, not a regeneration
shortcut. Diagnostic environment flags cannot run update commands. Normal compare
and baseline never write references. The camera now records the native pre-Fit
mode, transform, zoom label, scroll, DPR and motion state, without changing its
position, dimensions or action order.

## Evidence classes and remaining limits

Automated browser evidence is fresh, isolated headless Chromium 149.0.7827.55
on macOS arm64, Node 24.19.0/pnpm 11.25.0. Stored source and four-surface captures
were personally inspected in this run. There is no manual live user-browser,
screen-reader, native-picker or visible-Chromium certification. No Node 22/Linux
release environment is recertified by this milestone.

Chrome's internal sampling/cache details remain an inference. The experimentally
proven boundary is initial viewport history with invariant final source inputs.
R01/R04 remain intact; their separate in-place Family restore and corrupt-font
storage diagnostic limitations remain separately bounded. Other host-integration
release findings require their own milestones. This record resolves R07 only.
