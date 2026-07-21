# Editable Image Placement Evidence

Status: Milestone 6.1 source and replacement contract verified; renderer/scene/settlement references remain unapproved.

## Exact fixture

| Property | Verified value |
| --- | --- |
| Path | `/Users/niels/Documents/Templates/template-package-deal-of-the-week-banner-crop-2.zip` |
| Size / ZIP SHA-256 | 2,258,157 bytes / `415062d2378194354f242dc643f965cbf7fa665ad3ecd034664d0211144b6382` |
| Package / exporter | `pkg_429_39_1784233341362` / 0.6.0 |
| Root / canvas | `429:39` / 1920×1080 |
| Preview SHA-256 | `586f51fa3f5916df301667bd1393e2ca5ce150f09c5c506ed55ba237a997db53` |
| Shared asset | `asset:image:ceab5479`; `assets/asset_field_image_top_001.png`; 1,441,382 bytes; 1125×750; SHA-256 `5dcfbc0b02a55dde8a347ca283dc1babb25958fbaa7e977d89e4d063286491f0` |

This archive supersedes `template-package-deal-of-the-week-banner-crop.zip` only for editable-image and replacement certification. The earlier static fixture remains historical matrix evidence and is never substituted.

## Field inventory

| Field | Node | Settled slot | Imported mode | Raw transform applicability | Replacement modes | Reset authority |
| --- | --- | ---: | --- | --- | --- | --- |
| `top` / Top | `429:43` | 240×240 | FILL | `[[0.4816223085,0,0.2591888607],[0,1,0]]`, preserved inapplicable | Fill, Fit | imported FILL + original asset/provenance |
| `main` / Main | `429:46` | 640×640 | CROP | active; raw `[[0.2578398287,0.1052464917,0.3574257791],[-0.1578697264,0.3867596984,0.2352836877]]` | Fill, Fit | imported CROP + exact matrix/clip/provenance |
| `bottom` / Bottom | `429:49` | 240×240 | FIT | `[[0.4816223085,0,0.2591888607],[0,1,0]]`, preserved inapplicable | Fill, Fit | imported FIT + original alignment/provenance |

The shared binary and different node modes prove that placement is node/paint authority, not asset authority.

## Imported geometry

- Top FILL: centered cover destination `(x=-60,y=0,w=360,h=240)`, visible normalized source `(0.1666667,0,0.6666667,1)`.
- Main CROP: normalized source polygon `(0.3574258,0.2352837)`, `(0.6152656,0.0774140)`, `(0.7205121,0.4641737)`, `(0.4626723,0.6220434)`; determinant `0.1163372892`; one inverse; visible source bounds `(0.3574258,0.0774140,0.3630863,0.5446294)`; destination approximately `(-1203.241,-644.153,2706.647,2286.920)` inside the 640×640 clip.
- Bottom FIT: centered contain destination `(x=0,y=40,w=240,h=160)` and full normalized source `(0,0,1,1)`.
- The main source image region differs from `preview.png` by 816 pixels, `0.19921875%`, at threshold 0.1. Full-canvas difference is `29.8344%` and is classified separately as existing paint/background fidelity debt.

## Replacement, reset, persistence, and stale work

The real browser matrix ran Fill and Fit for every source mode. Fill always used cover and Fit always used contain. Both retained the raw source transform only as `preserved-inapplicable`; neither activated it. Fill→Fit→Fill was deterministic and incremented the placement revision. Each mode survived autosave and full page reload. Reset restored each field's source asset/mode/transform and issued a new revision; reset also survived reload.

A controlled development-only 750 ms decode delay proved that the second of two rapid replacements wins and that reset before the first decode publishes leaves `main` in imported CROP state. The delay hook is inert in production builds.

Evidence:

- imported all-surface candidates: `fidelity/candidates/milestone-6-1-editable-source/`;
- source CROP packet: `fidelity/evidence/crop-source/milestone-6-1-editable-source/`;
- final headless replacement packet: `fidelity/evidence/image-replacement/milestone-6-1-editable-replacement-final/`;
- visible Chromium packet: `fidelity/evidence/image-replacement/milestone-6-1-editable-replacement-visible/`.

Ten real PNG exports across imported, Fill, Fit, and reset states took 482.5–564.4 ms each. Readiness samples took 19.4–62.8 ms. No browser console warnings/errors occurred.

## Reference status and future crop boundary

The exact fixture is authoritative source evidence, but all four renderer candidates, its scene candidate, and its settlement candidates remain unapproved. No reference was promoted. Full-canvas approval requires separate review of non-media differences.

`editor-crop` is reserved only. A future crop tool must own a new editor-authored transform, focal point, zoom, interaction state, persistence, and reset behavior. It must never reuse imported Figma CROP as editor-authored state.
