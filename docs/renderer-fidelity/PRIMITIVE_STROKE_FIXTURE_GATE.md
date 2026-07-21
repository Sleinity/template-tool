# Milestone 7.2 Primitive Corner and Stroke Fixture Gate

Status: satisfied by exact real ZIP on 2026-07-17  
Reference status: candidate/source-evidence only; renderer, scene, and settlement approved references unchanged

## Gate closure

The initial nine-fixture audit found no independent-radius rectangular node or visible rectangular `CENTER`/`OUTSIDE` stroke, so production work stopped. The user then supplied the exact file `/Users/niels/Documents/Templates/template-package-stroke-test.zip`. It satisfies the source gate without a Figma runtime dependency:

- 32,574 bytes;
- ZIP SHA-256 `53564876e6bf9d9924528eefbbd8eea9ab8f176bb91bef731c0f9785c3b3eb29`;
- `template.json` SHA-256 `28b6720e417ea339a432ff79f127b34a191801c975e121c73a4ac0d18f0c75a9`;
- `preview.png` SHA-256 `8fb0bca096694f177f02871fa4dd775b8ae51c7fc510bfcf4b848a1a17e1c4be`;
- package `pkg_443_87_1784276898719`, schema 1.0, exporter 0.6.0;
- root `443:87`, canvas 1200×630;
- no fonts, assets, fields, gradients, masks, effects, blends, vectors, rotation, or shear.

The exporter omits `assets.json` because the package has an explicit empty asset map and no asset references. Source normalization now synthesizes an empty registry only for that provably empty case, with diagnostics `bundle.asset-manifest-omitted-empty` and `ASSETS_JSON_OMITTED_EMPTY`. Any asset declaration or reference keeps the missing manifest blocking.

## Qualifying source regions

| Node | Root-relative bounds | Source data | Certified purpose |
| --- | --- | --- | --- |
| `443:88` | `(320,195,180,180)` | radius 0; 8px INSIDE | unchanged control |
| `443:89` | `(540,195,180,180)` | corners 10/0/0/0; 8px CENTER | independent corner plus half-outward stroke |
| `443:90` | `(760,195,180,180)` | radius 0; 8px OUTSIDE | fully outward stroke clipped by ancestor `443:92` at x=883 |
| `443:94` | `(57,181,181,209)` | corners 40/20/80/8; 8px INSIDE | four distinct corners |
| `443:95` | `(940,181,181,209)` | corners 999/999/0/999; 8px INSIDE | edge-local clamping proof |

All use one opaque gray fill and one opaque dark solid stroke. Parent `443:92` is `(280,155,603,260)` with `clipContent=true`, which proves ancestor clipping independently from primitive appearance.

## Authority enabled by the fixture

The fixture authorizes only the contract in [PRIMITIVE_STROKE_GEOMETRY.md](PRIMITIVE_STROKE_GEOMETRY.md):

- explicit top-left/top-right/bottom-right/bottom-left source ordering;
- Figma edge-local radius normalization against current settled bounds;
- non-layout-affecting source/fill/inner/centre/outer/visual stroke geometry;
- opaque uniform rectangular INSIDE, CENTER, and OUTSIDE strokes;
- capability-based singular DOM/CSS or SVG ownership;
- source ancestor clipping without accidental primitive-box clipping;
- revisioned telemetry and stale resolved-tree rejection.

ADRs 0057–0061 supersede ADR 0056 only for these proven independent-corner and stroke-alignment subsets. ADR 0056 continues to gate every advanced paint/stroke family without a real source fixture.

## Evidence

- Headless source run: `fidelity/candidates/milestone-7-2-final-edge-local/`.
- Visible source run: `fidelity/candidates/milestone-7-2-final-edge-local-headed/`.
- All-ten-fixture regression: `fidelity/candidates/milestone-7-2-all-final/`.
- Source packet: `fidelity/evidence/milestone-7-2-strokes/milestone-7-2-final-edge-local/`.
- Headless/visible offline reload: `fidelity/evidence/milestone-7-2-strokes/milestone-7-2-reload-headless/` and `milestone-7-2-reload-headed/`.

The final PNG differs from embedded `preview.png` by 18 pixels (`0.002381%`), all at the parent-clipped OUTSIDE edge. Historical compatibility output differs by 13,193 pixels (`1.745106%`). The four other source regions are pixel-exact. All live surfaces and PNG repeat exactly and share the same template-space primitive identity.

## Remaining gate

Still fixture-gated: hidden/partial/multiple paints or strokes, gradient strokes, dashes, caps/joins, independent side weights, layout-included CENTER/OUTSIDE, primitive self-clipping with expanded strokes, transforms, corner smoothing, gradients, effects, blend/compositing, arbitrary vectors, and Canvas. The next appearance gate is a clean source-certified linear-gradient ZIP.
