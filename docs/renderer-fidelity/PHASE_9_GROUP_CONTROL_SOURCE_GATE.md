# Phase 9 matched group control — Matrix 2

Status: **bounded source contract; opaque runtime subset transferred by ADR 0090**  
Updated: 2026-10-06  
Producer: Figma exporter 0.6.1

## Runtime transfer and final candidate, 2026-10-06

ADR 0090 selects one internal, source-property-gated DOM compositor for this
ZIP's opaque canvas, exact ordered SOLID paints, non-overlapping rectangles,
and PASS_THROUGH/NORMAL/OVERLAY groups. The previous first-SOLID background
owner is disabled for each selected row. The final two-pass run is
`phase9-group-runtime-final-20261006-c`; all four surfaces are complete and
repeatable. Regenerate the bound source packet with
`pnpm compositing:group-source-evidence -- --run-id <unique-id> --capture-run phase9-group-runtime-final-20261006-c`.
The current local packet is `phase9-group-runtime-evidence-final-20261006-d`.
Against the hash-verified embedded preview, pixels with any RGB channel more
than 10 levels different are 18,423 / 4 / 13,239 in the three 729,000-pixel
PASS_THROUGH / NORMAL / OVERLAY groups. Before this owner, the counts were
665,318 / 243,000 / 707,688. The remaining strong differences localize to the
photographic image regions; the flat-color controls agree. Direct Figma paint
and group values, not the PNG colors, remain the semantic oracle. Matrix 2 has
four unapproved renderer surfaces, one unapproved scene reference, and four
settlement-reference failures; these comparison results do not approve it.

Transparent edges, overlapping children, motion, Cover's mixed IMAGE/gradient
fade, and general group blending remain outside the route. The older source
gate result and capture below are historical evidence, not the current runtime
status.

## Exact inputs and reproducibility

The separate [research profile](../../fidelity/gates/phase9-compositing-group-control.json)
pins the supplied Matrix 2 ZIP, its `template.json`, embedded preview, image
asset, and six Figma screenshots by SHA-256. It does not change the active
three-export SDK gate. The re-export supplied on 2026-10-06 has 2,616,289
bytes and SHA-256
`b8228a8c9d256ff0b78f89f720c57e3416f60289cae0a0344ef034a146f66c52`;
`template.json` is
`087282c8327fdfdf8ddfae308e8ab2cf901abadc015e94c0d675ff7dd2bd0a31`;
`preview.png` is
`5d95df01bc7bf53831f540d705a2549e86e0b53f96efb69d1780df6e61716653`.
The image asset hash is
`5dcfbc0b02a55dde8a347ca283dc1babb25958fbaa7e977d89e4d063286491f0`.
The previous ZIP at this same external path had SHA-256
`03537cf0916126252c1697ccce1f2e63af5db26d73a4d6d1db9bfa35d7b4cc38`;
its 2026-10-05 capture is historical and cannot be bound to the new export.
The embedded preview and asset bytes are unchanged, while the package ID,
ZIP bytes, and `template.json` bytes changed. The earlier ZIP bytes are no
longer at the registered external path.

A [read-only inspection of the live Figma node](../../fidelity/gates/phase9-compositing-group-control-figma.json)
on 2026-10-06 records all 14 nodes and 14 paint entries. It checks exact
RGB floats, paint opacity, paint blend, visibility, group blend/opacity,
dimensions, and child order against the re-export. The live file has one
root IMAGE paint, one flat-strip SOLID, and four SOLID paints per group:
pink `DARKEN` plus yellow `NORMAL` at 40%, pink `MULTIPLY`, and pink
`SCREEN`. All three groups have 80% opacity; their modes are
`PASS_THROUGH`, `NORMAL`, and `OVERLAY` in that order. This live inspection
is a dated observation, not an immutable Figma version or approved pixel
reference.

Regenerate the ignored evidence packet without changing a reference:

```sh
pnpm compositing:group-source-evidence -- --run-id <unique-id> \
  --capture-run phase9-group-capture-20261006-a
```

The current packet was generated as `phase9-group-20261006-source-c`.
The referenced capture has two complete, stable runs of Validate, Fields,
editor, and source-sized PNG, with no required fonts or font fallback. Its
environment record has SHA-256
`8daf1938e1d8f937c8a09295632a1fe9f30fbe03dc7cb769b32e1b9937d9baa5`;
its run record has SHA-256
`3bb336de84ce8e82dee4248c31b67963210d296fc6def41071809d7f5a1d157f`.
The public Browser ZIP import, public Core V2 parser, and public Browser V2
session resolve this exact package and reuse its embedded preview. The imported
scene and appearance projections validate and are deterministic.
All source checks are automated. The embedded preview and stored PNG were
visually inspected; no live browser UI review was performed.

## Source contract established

The 1080×2025 root has a CROP image. A flat-color strip covers x=728–1079
through y=1349. Three 1080×675 groups occupy successive vertical regions.
The first is `PASS_THROUGH`, the second `NORMAL`, and the third `OVERLAY`;
each has source opacity `0.800000011920929`. Each group contains the same
three 1080×225 `DARKEN`, `MULTIPLY`, and `SCREEN` rows. The first paint in
each row is the same fully opaque pink SOLID, with its row's blend mode.
The `DARKEN` row also has a second, yellow `NORMAL` SOLID at source opacity
`0.4000000059604645`. The six Figma screenshots corroborate the selected
paint values, the 80% group controls, and the second and third groups' modes;
the first group's `PASS_THROUGH` value is supplied by both the ZIP and the
live Figma property inspection.

At 18 flat-strip centers and six image-side centers, the embedded preview
matches the source-derived group model within one and three RGB levels,
respectively. Every flat center distinguishes `PASS_THROUGH` from `NORMAL`
by more than ten levels in at least one channel. For example, x=900 on the
`MULTIPLY` row is `[115,103,29]` in the pass-through group and
`[208,170,210]` in the isolated group. The `DARKEN` row additionally
distinguishes **80% post-group opacity** from independently scaling its two
paint opacities: the isolated source preview is `[215,194,159]`, while the
independent-scaling model predicts `[221,197,174]`.

The third group's `OVERLAY` value is also confirmed in live Figma. Three
image-interior samples at x=700 agree within one RGB level with an isolated
child result blended `OVERLAY` against the source image and then composited
at 80%. Each differs by more than ten levels from a model that first blends
the child paint directly with the external image. For the `MULTIPLY` row,
the actual preview is `[35,40,45]`, the isolated-overlay prediction is
`[34,40,45]`, and the competing pass-through-child prediction is `[7,10,9]`.
This adds **sampled opaque image-interior group-OVERLAY evidence**, not a
matched flat-strip control or general group blend implementation.

This certifies the matched behavior **over the fixture's sampled opaque flat
and image backdrops**: pass-through child blends see the external backdrop;
the `NORMAL` group isolates those child blends; ordered paint opacity is
applied within the child; group opacity then composites the group result.
It does not certify arbitrary nested groups, transparent backdrop or edge
behavior, general `OVERLAY` group blending, mixed IMAGE/gradient stacks, or
a backend. The third group has no matched isolation control or flat strip.

## Current renderer and comparison disposition

The stable current source-sized PNG does not paint the controlled groups as
the source preview does. Pixels differing by more than ten RGB levels within
the three 1080×675 group regions are 665,318, 243,000, and 707,688 out of
729,000, respectively. These are broad regional differences, **not all
attributed to compositing**. All four renderer surfaces lack approved
references; the scene snapshot is unapproved; settlement has four missing or
different approved bundles. The comparisons are incomplete as an approval
gate, despite complete repeatable capture. No references, snapshots, or
tolerances were changed.

## Decision and next boundary

ADR 0088 superseded only ADR 0087's finding that no matched group control
existed. ADR 0089 records the direct Figma inspection, re-export identity,
and the additional bounded `OVERLAY` samples. The source model is suitable
input to a separate fixture-led runtime implementation proposal. That
proposal must establish a single visual owner, source-indexed paint order, group isolation, opacity
order, transparent-edge behavior or explicit fallback, revision invalidation,
edit/resize/export tests, and performance before routing production output.
Cover's `SOLID + IMAGE + DARKEN` gradient fade needs its own mixed-stack
source and runtime gate. Phase 9 and the active three-export SDK gate remain
**no-go**.

## Current-run verification

For the 2026-10-06 re-export, `pnpm test:portable`, `pnpm packages:build`,
`pnpm packages:typecheck`, `pnpm api:contract`, `pnpm boundaries:check`,
`pnpm docs:verify`, `pnpm sdk:gate:061:single`, and the exact group-control
source command passed. `pnpm fidelity:baseline` completed two stable
captures per surface. Renderer `compare-existing`, scene `compare`, and
settlement `compare` were explicitly bound to
`phase9-group-capture-20261006-a` and exited nonzero for the unapproved or
missing/different references described above. These were not converted to
passes.
