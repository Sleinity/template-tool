# Phase 9 compositing source gate — Matrix and Cover

Status: **historical Result B; bounded Matrix owner transferred by ADR 0090**  
Date: 2026-10-04  
Producer: exact Figma exporter 0.6.1 ZIPs

## Matrix runtime transfer, 2026-10-06

ADR 0090 now gives the six ordinary opaque Matrix SOLID rows one ordered DOM
paint owner selected by source properties. The former one-background renderer
did not apply DARKEN, MULTIPLY, OVERLAY, or LIGHTEN. The final two-pass
`phase9-matrix-runtime-final-20261006-c` capture is complete and stable on
Validate, Fields, editor, and PNG. At the ZIP's source dimensions, all six
flat-color row regions have **zero** pixels with an RGB-channel difference
above 10 against the embedded preview. The six photographic-side row counts
are 0, 6,677, 1,306, 0, 1,410, and 0, concentrated around browser-native
image sampling. This is a candidate source comparison, not a reference
approval: all four renderer surfaces remain unapproved. The Cover fade still
requires a separate mixed IMAGE/gradient owner. The Result B findings below
describe the historical pre-transfer capture.

## Inputs and reproducibility

The separate [research profile](../../fidelity/gates/phase9-compositing-source.json)
selects only `exporter-061-compositing-matrix` and `exporter-061-cover`. It does
not change the active three-export SDK gate. The external ZIPs and Figma
screenshots stay outside the repository; the profile pins their hashes. The
command below verifies those bytes, checks the serialized paint and image
evidence, imports both packages twice, validates scene and appearance
projections, and optionally binds the browser captures:

```sh
pnpm compositing:source-evidence -- --run-id <unique-id> \
  --capture-run phase9-matrix-cover-capture-20261004-a
```

The current source report is the local ignored candidate at
`fidelity/appearance-contracts/candidates/phase9-matrix-cover-20261004-final/compositing-source.json`;
regenerate it with the command above. Run `phase9-matrix-cover-capture-20261004-a`
contains two complete stable Chromium captures for Validate, Fields, editor,
and source-sized PNG for both ZIPs, using the verified exact-font profile.
The capture environment record has SHA-256
`994802495aa630de088858d2bf852a677d736646730a04f3f70d670941a096fa`:
Chromium 149.0.7827.55 on macOS arm64, 1440×1600 viewport, DPR 1,
Node 24.19.0, and no fallback fonts. Cover linked the exact Funnel Display
binary `9062978ead3d7a3e8b339e41204a5b551e66bc4a5659fa2c845bb0749431af99`.
The checked-out HEAD was `944c51b33433ce2e37ec05f7de66457d5154d5b4`
with pre-existing worktree changes; the capture environment itself recorded
`gitCommit: null`, so this HEAD is context rather than a clean-build attestation.
Renderer comparisons report eight unapproved surfaces; scene comparisons
report two unapproved snapshots; settlement comparisons report missing or
different approved bundles. None is an approved reference.

| Input | ZIP SHA-256 | `template.json` SHA-256 | Embedded preview SHA-256 |
| --- | --- | --- | --- |
| Matrix, 1080×1350 | `85fa555c495202ea38b72d39853913b9325ba8aa9ef746048c38836fca03cd98` | `8be997f3850dd1589df6522ccbb188946755322924a4fff9eb39a67ac1d53ecf` | `d385d51467eb2932ccb0d691ff8796531316f11b1e80403440cb1a2cb1518a64` |
| Cover, 1080×1350 | `086559ca6e5cf2cc8527ed45638eeaf1669c0081b966bf24f44f5141099d0c09` | `ddff9abd7cb1043f3df557367f666328ad45433506841dbfb47867ebc5abb4b1` | `0dd23b9bf10fda2f5816c4bbaa0340c9009786591e119ecd6661495cac3fa336` |

The three supplied Figma screenshots are hash-gated by the profile. They show
the six named layers, the Matrix IMAGE frame, and one selected Lighten row
with `#E5B2FF` at 100%. They do **not** show every row's selected blend
control or a matched group-isolation control. The ZIP's canonical-shaped
Matrix paint entries carry the six blend values directly; `rawFills` is
absent and is not manufactured by the source check.

## What the source establishes

Matrix has one CROP image on its root, a flat-color strip at x=728–1079, and
six full-width 225px pink SOLID rectangles in back-to-front child order:
NORMAL, DARKEN, MULTIPLY, SCREEN, OVERLAY, LIGHTEN. Every paint and node has
opacity 1. The serialized name and paint blend agree for each row. At the
flat-strip center, all six embedded-preview RGB samples match the declared
straight-sRGB blend calculation within one 8-bit channel value. Two sampled
positions per row on the image side match within three values using the ZIP's
source-CROP transform and asset bytes. This supports **opaque SOLID per-paint
blending over opaque flat and image backdrops at those samples**. It does not
certify full-region image resampling or alpha/isolation behavior.

Cover frame `987:6774` retains exact source order `SOLID(NORMAL)`,
`IMAGE(NORMAL)`, `GRADIENT_LINEAR(DARKEN)`, its source-indexed raw gradient
stops/transform, and the imported FILL image placement. The embedded preview
shows a fade that current output lacks. Cover does not isolate the gradient's
blend backdrop from ancestor or group content, so it cannot alone define a
general isolation contract.

The source-sized Matrix capture currently paints all six rows plain pink.
NORMAL and LIGHTEN match the preview in this controlled layout; DARKEN,
MULTIPLY, SCREEN, and OVERLAY differ across all 79,200 flat-strip pixels per
row by more than 10 in at least one RGB channel. Across the whole Matrix
canvas, 888,809 of 1,458,000 pixels differ at that threshold. Cover's mixed
frame has 63,882 differing pixels at the same threshold; this count includes
all differences in that region and is **not** attributed solely to its fade.
All eight captures are stable. Stability is not fidelity approval.
The Matrix source preview and stored source-sized PNG were visually inspected
in this run; no live browser UI review was performed. The numeric source
checks and four-surface captures are automated evidence.

## Missing authority and next input

There is no matched PASS_THROUGH-versus-isolated group export, partial paint
alpha control, or parent-opacity control. The screenshots do not fill those
gaps. The broad Phase 9 gate therefore remains open: neither
`CompositingGroupV1` nor a DOM/SVG, Canvas, or offscreen route becomes a
production owner. Existing preserved-only diagnostics and the Cover fade
blocker remain in place. ADR 0087 records this decision.

The next source input is **one exporter 0.6.1 group-control ZIP**, with a
matching Figma canvas screenshot and selected group/paint settings. It must
place otherwise identical colored and image-backed stacks inside side-by-side
PASS_THROUGH and NORMAL groups over contrasting parent backgrounds, include
a transparent edge, one partially opaque paint, and one parent-opacity
control. Those controls should make local-paint, sibling, parent-backdrop, and
post-group-opacity interpretations yield visibly different pixels. If that
source still leaves isolation ambiguous, request a narrower counterexample
before implementing a runtime blend owner.

No renderer, backend, schema, API, reference, scene snapshot, settlement
snapshot, or comparison tolerance changed in this source-gate milestone.
