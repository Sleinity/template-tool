# Linear-Gradient Intake Evidence: Adventure Travel Pinterest Pin Ad

Status: exploratory partial evidence; does not close the Milestone 7.3 fixture gate  
Audit date: 2026-07-17  
Production impact: none

## Exact package identity

- Path: `/Users/niels/Documents/Templates/template-package-adventure-travel-pinterest-pin-ad.zip`
- Size: 331,707 bytes
- ZIP SHA-256: `5e3c2c71384f1e809e12331927f5b1dfaffb8e259e22aec007f6ec1abf7a6147`
- `template.json`: 37,416 bytes; `d3dc35274bb0e1574badf19099db058148ab2e7179edb48652ea5dfb541d14e4`
- `preview.png`: 281,838 bytes; `c833d985625729a1e03961c7801ddc263616b67ebd39b377d006fc173c4340cb`; 1000×1500 RGBA
- `assets.json`: 1,660 bytes; `7a0a8e5813f14e9dea57254bc41ead9e141dcd6517926ee5c440c27d894d838c`
- Package/root: `pkg_451_97_1784285744004` / `451:97`
- Schema/package/exporter: 1.0 / `template-package-v1` / plugin 0.6.0
- Exported: `2026-07-17T10:55:43.966Z`
- Canvas: 1000×1500; opaque `#5c2638`
- Figma source: file `Tb4DXmBGjBDkJ9eoBQwFYO`, node `451:97`
- Editable fields: none

The archive also contains Geist/Geist Mono text, a logo image, two rotated dashed SVG paths, an opaque rectangular ALPHA mask relationship, and the gradient vector described below. The full canvas is not an isolated gradient reference.

## Gradient source and canonical gap

The only gradient is node `I451:97;7:2` (`Image`):

- type: VECTOR;
- local bounds: x 90, y 300, width 820, height 1020;
- node rotation: 0;
- one visible NORMAL `GRADIENT_LINEAR` fill, paint opacity 1, node opacity 1;
- no canonical stops or transform on `appearance.fills[0]`;
- full source data preserved at `extensions.figma.rawFills[0]`;
- vector asset: `asset:svg:8977914d`, external `assets/asset_image_002.svg`;
- SVG SHA-256: `92f547dd2f0585cb1bf54072f9e8dbd09cc6089c8f0fc216642ffa3d69d4773b`.

Raw stops:

| Source index | Position | Color | Alpha |
| --- | ---: | --- | ---: |
| 0 | 0 | `#5c2638` | 1 |
| 1 | 1 | `#bfd4ff` | 1 |

Raw transform, rounded only for presentation:

```text
M = [[ 0,  1, 0],
     [-1,  0, 1]]
```

The exact near-zero values are `6.123234262925839e-17`. The determinant is 1.

The external SVG independently records:

```xml
<linearGradient x1="410" y1="0" x2="410" y2="1020" gradientUnits="userSpaceOnUse">
  <stop stop-color="#5C2638"/>
  <stop offset="1" stop-color="#BFD4FF"/>
</linearGradient>
```

The path is a source-authored rounded vector silhouette. It is not a RECTANGLE/FRAME with independent corner radii.

## Matrix-to-handle derivation

For normalized node-local point `p=(x,y)`, the raw matrix produces gradient-space point:

```text
q = M p = (y, 1-x)
```

This means the first gradient coordinate varies from 0 at the node top to 1 at the node bottom. The inverse is:

```text
M^-1(qx,qy) = (1-qy, qx)
```

Applying that inverse to the conventional normalized gradient-space start/end handles `(0,0.5)` and `(1,0.5)` gives node-local handles `(0.5,0)` and `(0.5,1)`. Scaling by 820×1020 gives `(410,0)` and `(410,1020)`, exactly matching the independently exported SVG.

This is strong evidence for this orthonormal vertical case that:

- the raw matrix maps normalized node space to normalized gradient space;
- handle geometry for painting is obtained through one inverse;
- the gradient spans the non-square node's full vertical extent;
- stop 0 is at the top and stop 1 at the bottom.

It does not prove general shear, scale, translation, diagonal aspect handling, singular behavior, or the third handle.

## Preview pixel evidence

Unobstructed preview samples inside the source vector were compared with direct 8-bit interpolation from `#5c2638` to `#bfd4ff` at `t=(templateY-300)/1020`.

| Template point | t | Preview RGBA | Direct expected RGBA | Maximum channel delta |
| --- | ---: | --- | --- | ---: |
| 500,310 | 0.009804 | 93,40,58,255 | 93,40,58,255 | 0 |
| 500,350 | 0.049020 | 97,46,65,255 | 97,47,66,255 | 1 |
| 500,450 | 0.147059 | 107,64,86,255 | 107,64,85,255 | 1 |
| 200,600 | 0.294118 | 122,90,115,255 | 121,89,115,255 | 1 |
| 800,1000 | 0.686275 | 160,157,193,255 | 160,157,193,255 | 0 |
| 300,1200 | 0.882353 | 179,191,232,255 | 179,192,232,255 | 1 |
| 500,1300 | 0.980392 | 190,209,252,255 | 189,209,251,255 | 1 |

This source preview is consistent with the external SVG and simple two-stop opaque interpolation. It does not establish alpha interpolation, paint opacity, multiple/nonuniform stops, or a general interpolation/color-space contract.

## Current runtime owner

This node is not evidence that the current renderer supports canonical gradients. `resolveFill` still emits `resolved-unsupported-fill`. The VECTOR asset path resolves `asset:svg:8977914d` and paints the already-authored SVG, whose own `<linearGradient>` owns the pixels. `TemplatePackageRenderer` suppresses compatibility background fills when an SVG visual source exists.

The package therefore demonstrates a valid singular SVG asset owner for this vector, not a source-certified primitive gradient owner. Reusing the SVG fallback as proof for arbitrary canonical RECTANGLE/FRAME gradients would conflate two distinct capabilities.

## Fixture-gate assessment

| Required question | Result from this package |
| --- | --- |
| Matrix direction | Partially resolved for one orthonormal vertical case: normalized node → gradient; one inverse derives SVG handles. General affine cases remain unresolved. |
| Coordinate space | Partially resolved as normalized node/gradient coordinates for this full-height case. Pixel/normalized ambiguity for translated/scaled cases remains. |
| Start/end handles | Exact for vertical start `(0.5,0)` and end `(0.5,1)`; reversed, diagonal, translated, and third-handle evidence absent. |
| Stop ordering/interpolation | Two ordered endpoint stops agree with preview/SVG; nonuniform, repeated, out-of-range, and 3+ stop behavior absent. |
| Stop alpha vs paint opacity | Unresolved; both stop alphas, paint opacity, and node opacity equal 1. |
| Rotated and non-square geometry | Non-square node is covered for a vertical vector only. No diagonal/general handle rotation and no rotated gradient node. |
| Independent-corner clipping | Unresolved; geometry is an arbitrary vector path, not independent RECTANGLE/FRAME corners. |
| Resize behavior | Unresolved; fixed source bounds, no paired source state, editable sizing, or live resize evidence. |
| Singular runtime owner | Existing SVG asset owner is singular and source-faithful for this vector; it does not authorize canonical gradient routing. |
| Cross-surface authority | Not browser-verified in this intake. The package is not registered because it does not qualify; no all-surface or PNG authority claim is made. |

## Import verification

The strict realistic-ZIP test was run with this exact archive. It passed ZIP identity selection, the layered product import gate, managed storage for all declared assets, and zero missing assets. The generic lifecycle then stopped at an assertion hard-coded to the historical deal-of-the-week fixture's known 1,441,383→1,441,382 byte-size mismatch. This package has no such mismatch. The failure is a fixture-specific test assumption, not a gradient or import-validation failure; tests were not modified.

## Decision

Do not close the Milestone 7.3 gate, write the full geometry/ownership contract, change production gradient behavior, or register this package as the authoritative linear-gradient fixture.

Retain it as exploratory corroboration for one normalized vertical matrix and for the distinction between canonical gradient semantics and SVG-asset fallback ownership. The required isolated G1–G10 package and transform-sensitive Figma handle evidence remain outstanding.
