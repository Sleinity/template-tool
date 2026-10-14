# Connected Studio product experience

The later [output refinements](OUTPUT_REFINEMENTS_20261012.md) supersede the
output Issues drawer, initial fit zoom, header surface and 340 px panel below.
This report retains its original milestone evidence.

## Design contract

The continuous field panel and light workspace form one editing surface: edit a
value, locate its bound region, understand its state, and export current content.
The header owns Library navigation, identity, persistence state, Issues and Export
PNG. Content owns input and inline correction. The preview owns view controls.
Save state and export readiness remain separate native SDK observations.

Desktop (1024 px+) uses a 340 px field panel and remaining-width preview. Tablet
(768–1023 px) uses Content / Preview tabs with one mounted renderer and stable
layout dimensions. Smaller screens keep Library, recovery and a visible exit.
Focus highlights without moving the camera. Fit field is explicit. Manual zoom
and pan survive ordinary edits; accepted design changes fit the new design.

Use 16 px panel padding, 8 px within controls, 12 px related-control gaps, 20 px
between fields and 24 px between sections. Output title is 20 px, importer title
28 px, input text 16 px, labels/help 14 px, metadata 12–13 px. Existing warm-neutral
tokens, 42 px ordinary controls, 36 px icon targets and focus rings remain the
foundation. Dividers separate meaningful groups; nested decorative cards are
avoided. Motion never masks layout instability.

All seven field types have a quiet Reset action beside their label. Suggested
choices supplement typed input; restricted choices are the primary input. Color
uses swatch + editable hex; Date keeps incomplete typing local with a calendar
correction control. Image thumbnails borrow the existing asset source.

## Finding map

| Findings | Delivery |
| --- | --- |
| S02, S03, S13, S17 | Connected header, field focus, viewport, thumbnail and Reset |
| S07, S08, S12 | Value controls, Issues links, Family and save/export feedback |
| S01, S04–S06, S09–S11 | Settings entry, correction ownership, concise journey |
| S14 | Theme and public-entry integration guide |
| S15, S16 | Keyboard/responsive coverage and paired production measurements |

S01–S16 retain the priorities and evidence classifications of the planning audit.
S17 is source-confirmed: compact output omitted Reset except for Choice fields.
Suspected behavior requires reproduction before a defect claim. No SDK, schema,
persistence, font owner or renderer-semantic change is authorized by this work.

The complete planning audit is retained verbatim as
[retained-audit.txt](evidence/product-experience-20261012/retained-audit.txt), with
[provenance](evidence/product-experience-20261012/audit-provenance.json). Its
original evidence classifications and priorities are historical context, not
claims of current live review.

## Implemented hierarchy and dispositions

| Finding | Disposition and current evidence |
| --- | --- |
| S01 · P1 · Live/code | Saved Settings starts at Fields; new import starts at Designs. Setup browser workflow. |
| S02 · P1 · Code/prior | Thumbnail source uses Core's asset-source resolver; absent, loading and failed decoding are distinct. Exact-export browser checks. |
| S03 · P1 · Code/prior | Field focus highlights; explicit Fit field, fit, zoom and pointer/keyboard pan. Camera and mount identity checked across edits. |
| S04 · P1 · Live | Expanded Checks names correction authority: fields, fonts, source/exporter or review. No invented renderer repair. Source review and setup checks. |
| S05 · P2 · Live/code | One Review decision combines save readiness and warnings; native acceptance remains unchanged. Setup/save workflows. |
| S06 · P2 · Live/code | Success notice expires after five seconds and clears on route changes; failures persist. Recovery/navigation workflow and source inspection. |
| S07 · P2 · Code/prior | Color swatch + editable hex; typed ISO Date + native calendar and configured-format context. Incomplete input stays local. Browser correction/Reset. |
| S08 · P2 · Code/prior | Issues has one quiet empty state and deduplicated field links; links reveal/focus the value control. Browser focus checks. |
| S09 · P2 · Live/code | One short task instruction per importer step; Library/design vocabulary aligned. Setup and workflow acceptance. |
| S10 · P2 · Code/prior | Findings and affected locations have distinct count labels; existing affected-design inspection retained. Source and Family setup coverage. |
| S11 · P3 · Live/code | Fixed-order chips become a compact type selector below 660 px panel width. Guarded filter workflow. |
| S12 · P2 · Code/prior | Current design stays explicit while an unavailable pending combination requires correction or Restore current design. Pending selection blocks navigation/export. Family parity. |
| S13 · P2 · Code/prior | Desktop split and tablet Content/Preview tabs preserve one renderer and equal layout dimensions; inactive panes are inert. 768/1024/1440 browser checks. |
| S14 · P2 · Code | Documented existing theme roles and host-owned seams using supported entries. Packed-consumer and boundary checks; Studio remains private. |
| S15 · P2 · Potential | Keyboard, focus return, invalid input, image work, drawers, tablet isolation and late callbacks covered automatically. Native-picker/screen-reader/contrast certification remains manual work; no blanket certification claimed. |
| S16 · P2 · Potential | Paired production measurements cover three exports plus Family, short/sustained/multiline edits. No new canonical optimization or claim about unmeasured large-template latency. |
| S17 · Confirmed source gap | Every compact field has Reset; queued edits are superseded using the latest native controller. Late image callbacks cannot update reset/unmounted controls. All-seven-type browser checks. |

The label/Reset row, value control and contextual correction form one consistent
field. Suggested presets supplement input; restricted presets replace it. Image
thumbnails borrow URLs without acquiring ownership. The persistent header owns
save state, Issues and Export. The stage owns camera controls; transforms affect
only Studio presentation. Tablet views overlap with visibility/inert isolation,
not a second renderer or altered template dimensions.

Technical configuration, crop authoring, field-order Undo and existing guards
remain available in their existing workspaces. The separate legacy combined
workspace retains detailed line-evidence status; the ordinary output editor uses
concise correction feedback. Native controllers, renderer evidence, autosave and
recovery remain their existing authorities.

## Evidence and acceptance

Pre-edit sources and 272 SDK / 324 protected hashes are retained in
[identity.json](evidence/product-experience-20261012/identity.json). The starting
gate is `sdk-061-compact-field-cards-20261012a`. Rendered proposals precede
production edits and cover the three source previews plus Family/state variants
at 1440×900, 1024×768 and 768×1024. These proposals are UI design evidence, not
renderer source certification.

Completion requires all findings disposed, public workflows and ownership
preserved, paired measurements recorded, and a fresh 24-capture / 12-renderer /
3-scene / 12-settlement gate with unchanged references and tolerances. Automated
browser evidence, stored-capture inspection and manual review are recorded
separately. Manual screen-reader and native picker reviews must not be inferred
from automated tests.

## Paired production measurements

Five warmed-up paired trials per scenario, alternating before/after order, used
Chromium 149.0.7827.55, Node v24.19.0, macOS arm64, 1440 × 1600 CSS px and
device scale 1. These instrumented production builds ran independently of other
heavy workloads. Frame-opportunity latency is a paint proxy, not compositor
paint timing. Development browser checks are correctness evidence and are not
pooled with these measurements.

| Scenario / workload | Frame opportunity median / p95, before → after (ms) | Preview catch-up median / p95, before → after (ms) |
| --- | --- | --- |
| now-hiring / burst | 3.1 / 7.6 → 3.8 / 7.6 | 125.8 / 130.1 → 123.8 / 124.3 |
| now-hiring / continuous | 4.6 / 8.8 → 3.8 / 8.2 | 96.0 / 99.2 → 96.3 / 101.5 |
| now-hiring / multiline | 3.9 / 7.8 → 4.1 / 7.4 | 115.6 / 117.4 → 117.9 / 120.8 |
| cover / burst | 3.7 / 7.9 → 4.4 / 7.5 | 136.0 / 141.7 → 137.8 / 140.3 |
| cover / continuous | 4.3 / 8.4 → 4.1 / 7.7 | 111.6 / 115.7 → 114.3 / 121.1 |
| cover / multiline | 3.6 / 7.7 → 3.8 / 7.7 | 125.1 / 127.5 → 123.3 / 124.9 |
| carrousel / burst | 3.7 / 8.0 → 4.5 / 8.2 | 133.9 / 139.8 → 134.5 / 134.9 |
| carrousel / continuous | 2.4 / 8.7 → 4.1 / 7.7 | 118.3 / 122.8 → 120.2 / 128.0 |
| carrousel / multiline | 3.7 / 7.9 → 4.3 / 7.8 | 124.0 / 125.8 → 124.3 / 127.0 |
| family / burst | 5.2 / 9.1 → 4.7 / 7.5 | 139.5 / 144.1 → 133.5 / 140.3 |
| family / continuous | 4.0 / 8.8 → 4.0 / 7.9 | 130.8 / 132.4 → 125.8 / 130.1 |
| family / multiline | 2.8 / 7.6 → 3.9 / 7.7 | 127.9 / 128.3 → 129.4 / 133.2 |

All 120 workload records completed without failures. Every sustained-typing
trial showed two intermediate preview updates; multiline trials showed one.
No long tasks were observed within these sampled edit windows. Input-handler
medians stayed between 0.3–0.5 ms. The sample does not establish a general speed
improvement or rule out long tasks outside those windows.

Measured validation/materialization/recovery-capture counts were unchanged:
for each single, burst 5/1/1, continuous 11/3/3 and multiline 8/2/2; Family
11/1/1, 21/3/3 and 16/2/2. Active-target/view updates add preview commits: on
continuous typing, Now Hiring 9 → 18, Cover 14–15 → 19, Carrousel 15 → 19 and
Family 15 → 19. This is presentation overhead, not additional canonical work.
The existing 100/325 ms input schedule and 650 ms autosave remain unchanged.

Individual trials and summaries (retained locally: `fidelity/evidence/product-experience/performance-certified/production-paired.json`; full generated trace excluded from release source)
are retained with sources, exact fixture/font identities and browser environment.
Earlier `performance` and `performance-final` directories are intermediate
runs; only `performance-certified` identifies the final production sources.

## Regeneration

Run isolated UI proposals/baselines before editing production sources; the
retained baseline overlay verifies each source hash. Synthetic authored values,
line limits, controlled promise failures and branding are UI/transaction tests,
not newly certified source fixtures.

```sh
node scripts/studio-product/proposals.mjs
node scripts/studio-product/verify.mjs --before
node scripts/studio-product/verify.mjs
pnpm editor:performance -- --phase paired --baseline docs/studio/evidence/product-experience-20261012/identity.json --output fidelity/evidence/product-experience/performance-certified
pnpm test:portable
pnpm exec tsc -b --pretty false
pnpm build
pnpm sdk:verify
pnpm studio:setup
pnpm studio:drafts
pnpm studio:family-parity
pnpm studio:workflow-acceptance
pnpm field-rules:studio
pnpm font:reactivation:verify
pnpm editor:verify
node scripts/repository/verify-field-choices-browser.mjs --fields-usability
pnpm sdk:gate:061 -- --run-id sdk-061-studio-product-20261012c
node scripts/fidelity/retain-studio-product-review.mjs sdk-061-studio-product-20261012c
pnpm sdk:gate:061 -- --run-id sdk-061-studio-product-20261012c --assess-existing
pnpm docs:verify
node scripts/studio-product/record.mjs
```

Build/pack sequentially before installed consumers. Run performance separately
from other browser/build workloads. Source review retention rejects altered
fixtures, fonts, SDK sources, protected artifacts or raster environments. Any
changed PNG requires a separate run/hash-bound source review with unchanged
measured nodes; repeat stability cannot approve it.

## Current verification and decision

`sdk-061-studio-product-20261012c` is **GO**: 24 complete stable captures,
12 passing renderer comparisons, three passing scene comparisons and 12 passing
settlement comparisons. Carrousel Color is checked against raw ZIP numbers.
All 272 SDK runtime hashes and 324 protected API/reference/snapshot artifacts
match the retained baseline. Package versions, references and tolerances remain
unchanged. Supported packed imports and all existing bundle budgets pass; the
React V2 session profile remains 877,900 raw / 208,041 gzip bytes.

Portable tests, Studio/package typechecks and builds, SDK/API/boundary and packed
consumers, setup/drafts/recovery, seven-field rules, Family parity, workflow
acceptance, exact-font reactivation and StrictMode editor lifecycle checks pass.
The complete Choices workflow covers all five types in both modes for single
and Family configuration, Apply, persistence, reopen, selection, Reset and PNG.
The isolated product check covers all three exports plus Family at 1440×900,
1024×768 and 768×1024, all-field Reset, deferred commits, invalid Date/Color,
late image rejection, camera/mount persistence, Issues focus and latest-value
export. Token branding changes chrome without advancing native content.

[Durable verification record](evidence/product-experience-20261012/verification.json)
contains implementation hashes, command logs, environments and measurements.
Desktop (retained locally: `../../fidelity/evidence/product-experience/after/exporter-061-carrousel-1440.png`; excluded from release source),
tablet (retained locally: `../../fidelity/evidence/product-experience/after/family-768-preview.png`; excluded from release source) and
host-token example (retained locally: `../../fidelity/evidence/product-experience/after/host-theme-tokens.png`; excluded from release source)
are current automated browser captures inspected during this run.

### Capture-camera investigation and source disposition

The native-camera run `sdk-061-studio-product-20261012a` is retained as NO-GO.
The new 954 px preview stage produced 922 px editor screenshots versus the old
906 px stage / 874 px screenshots. Inverse-scale DOM telemetry also differed by
0.0001–0.0003 px. Downloaded PNGs were unchanged. Hash-verified retained-source
probes reproduced the prior stage at (485,107), 906×1444 within 1440×1600.

The test-only SDK capture now explicitly requests that reference camera; product
UI and performance checks still use the enlarged native viewport. A first fixed
position probe, run `sdk-061-studio-product-20261012b`, passed raster/scene but
changed one Now Hiring line-range observation by 0.0001 px. Keeping the existing
relative containing block in run `sdk-061-studio-product-20261012c` passes every
unchanged renderer/scene/settlement comparison. All failed runs and the initial
source-review rejection remain recorded. See [the capture-camera contract](../renderer-fidelity/HARNESS.md#explicit-studio-source-capture-camera--2026-10-12).

Eleven capture PNGs are byte-identical to the previous reviewed gate. Cover/editor
has 1,067 raw pixel differences around the lower Swipe control, while its complete
measured node array and final PNG are unchanged. It passes the established
anti-alias comparison without changing thresholds. Its full current capture,
exact source preview and before/after region received a separate current
[stored-capture review](evidence/product-experience-20261012/changed-surface-review.json);
that review is bound to exact before/after hashes. The other eleven source reviews
were retained after source/font/environment/SDK identity checks. No golden was
updated and no renderer behavior was changed.

### Limits

Automated browser checks and stored-capture inspection are current-run evidence.
The user browser was not manipulated; manual live, screen-reader and native
calendar/color-picker popover certification were not performed. Canvas text
editing/click selection, a custom crop tool, localization, general large-template
optimization and renderer convergence remain separate scopes. Five paired
trials do not establish performance on every host or on substantially larger
Families. The Studio build still reports its existing large-chunk advisory;
curated SDK budgets pass. No versioning or publication was performed.
