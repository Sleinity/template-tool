# Independent Corner and Stroke Geometry Contract

Milestone 7.2 source-certifies independent rectangular corner radii and opaque uniform `CENTER`/`OUTSIDE` solid strokes for eligible axis-aligned FRAME and RECTANGLE nodes. The authority is bounded by the exact `stroke-test-primitives` ZIP; gradients, effects, blend modes, arbitrary vectors, advanced strokes, transformed primitives, and Canvas remain outside this contract.

## Exact source fixture

- Path: `/Users/niels/Documents/Templates/template-package-stroke-test.zip`
- Size / ZIP SHA-256: 32,574 / `53564876e6bf9d9924528eefbbd8eea9ab8f176bb91bef731c0f9785c3b3eb29`
- Template / preview SHA-256: `28b6720e417ea339a432ff79f127b34a191801c975e121c73a4ac0d18f0c75a9` / `8fb0bca096694f177f02871fa4dd775b8ae51c7fc510bfcf4b848a1a17e1c4be`
- Package / root / exporter / canvas: `pkg_443_87_1784276898719` / `443:87` / 0.6.0 / 1200×630
- No assets, fonts, fields, gradients, masks, effects, blends, vectors, or transforms participate in the reviewed regions.

Source nodes use the same opaque gray fill, dark 8px solid stroke, and axis-aligned geometry:

| Node | Bounds | Source semantics | Purpose |
| --- | --- | --- | --- |
| `443:88` | 180×180 | radius 0, `INSIDE` | unchanged Milestone 7.1 control |
| `443:89` | 180×180 | corners 10/0/0/0, `CENTER` | half-inside / half-outside path |
| `443:90` | 180×180 | radius 0, `OUTSIDE` | full outward expansion plus clipping by ancestor `443:92` |
| `443:94` | 181×209 | corners 40/20/80/8, `INSIDE` | four independent source corners |
| `443:95` | 181×209 | corners 999/999/0/999, `INSIDE` | Figma edge-local radius normalization |

## Figma corner normalization

Corner order is always top-left, top-right, bottom-right, bottom-left. Raw source values and effective values remain separate.

For each edge, calculate a scale no greater than 1 from the edge length divided by the sum of its two source radii. Each corner receives the smaller scale of its two adjacent edges:

- top-left: `min(topScale, leftScale)`;
- top-right: `min(topScale, rightScale)`;
- bottom-right: `min(bottomScale, rightScale)`;
- bottom-left: `min(bottomScale, leftScale)`.

This is edge-local Figma clamping, not the CSS global border-radius factor. For source `[999, 999, 0, 999]` at 181×209, effective radii are `[90.5, 90.5, 0, 104.5]`. The per-corner scale tuple is revisioned and exposed in developer telemetry. Resize recomputes the tuple from current settled bounds; raw source values never change.

Fill, clipping, and stroke-path derivation consume the same effective scalar radii. Negative values floor to zero in defensive synthetic cases. Invalid or unsupported source values select coherent compatibility.

## Stroke path and layout bounds

Settlement owns the primitive layout box. Stroke output never expands or consumes that box.

For width `w`:

| Alignment | Inner edge | Centre path | Outer / visual edge |
| --- | --- | --- | --- |
| `INSIDE` | inset `w` | inset `w/2` | source bounds |
| `CENTER` | inset `w/2` | source bounds | expand `w/2` |
| `OUTSIDE` | source bounds | expand `w/2` | expand `w` |

Fill remains on the source path. Inner, centre-line, and outer corner radii subtract or add the corresponding offset and floor at zero; each derived path is normalized against its own bounds. `PrimitiveAppearanceV1` records source path, fill, inner, centre, outer and visual bounds rather than a CSS string.

## DOM/SVG ownership

- Uniform `INSIDE` retains the proven CSS inset-shadow owner.
- Independent-corner `INSIDE`, `CENTER`, and `OUTSIDE` use one non-layout-affecting SVG root with one fill path and one stroke path.
- Routed nodes clear compatibility background, border, and shadow output. A source primitive never has both CSS and SVG appearance owners.
- A node that clips its own content while requiring an expanded `CENTER`/`OUTSIDE` stroke remains compatibility-owned until a real fixture proves a singular self-clip structure. This prevents the SVG child from being accidentally clipped by its own box.

The SVG uses settled template-space bounds, subpixel values, `overflow: visible`, and no viewport-derived semantic geometry. It does not introduce Canvas or raster fallback.

## Clipping

Primitive appearance and ancestor clipping are separate. `443:90` expands eight source pixels outside its 180×180 layout box, then source ancestor `443:92` clips the right-hand extent at its own root-relative boundary. `ancestorClipChain` records nearest-first canonical bounds and participates in geometry identity. Inspection zoom does not alter template-space clipping.

## Evidence

- Final headless source run: `fidelity/candidates/milestone-7-2-final-edge-local/`.
- Final all-ten-fixture run: `fidelity/candidates/milestone-7-2-all-final/`; all four surfaces repeat exactly for every fixture.
- Visible run: `fidelity/candidates/milestone-7-2-final-edge-local-headed/`; all four surfaces repeat exactly.
- Source packet: `fidelity/evidence/milestone-7-2-strokes/milestone-7-2-final-edge-local/`.
- Save/reload/offline packets: `fidelity/evidence/milestone-7-2-strokes/milestone-7-2-reload-headless/` and `milestone-7-2-reload-headed/`; identity is equal and renderer-time Figma requests are zero.

The historical compatibility candidate differs from `preview.png` by 13,193 pixels (`1.745106%`). The final candidate differs by 18 pixels (`0.002381%`), all on the ancestor-clipped OUTSIDE edge. `443:88`, `443:89`, `443:94`, and `443:95` are pixel-exact; `443:90` changes 18 pixels (`0.043253%` of its isolated crop), classified as SVG/source raster-edge sampling rather than template-space geometry variance.

No approved renderer, scene, or settlement reference was changed. Source preview evidence remains separate from approved renderer references.

## Fallback boundary

Whole-primitive compatibility remains required for gradients, multiple/hidden/partial paints or strokes, non-normal blend, effects, masks, media/vector owners, layout-included strokes, dashes, caps/joins, independent stroke weights, rotation/shear, self-clipped expanded strokes, and unsupported node kinds. Gradient work is the next fixture-led appearance milestone.
