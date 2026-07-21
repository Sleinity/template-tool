# Linear-Gradient Test Fixture Intake Evidence

Status: cumulative source-authority gate closed; production implementation not started  
Audit date: 2026-07-18  
Production impact: none

The accepted evidence is cumulative. Each supplementary pass extends the prior audit; it does not discard or rerun established findings.

## Final paint-opacity intake — `template-package-gradient-test-4.zip`

Formal result: **Result A — the Milestone 7.3 source-authority fixture gate is closed**. This final archive isolates the sole remaining paint-opacity property. It does not authorize or begin production implementation.

### Exact identity

- ZIP: `/Users/niels/Documents/Templates/template-package-gradient-test-4.zip`; 193,635 bytes; `9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3`.
- `template.json`: 8,004 bytes; `2871dc698f4e69b924fd6b46cbb503067529095716ecb5a3a3814c6487413049`.
- `preview.png`: 185,409 bytes; `4d12e49e0b0734f092c34a9257fb3c8b6287ba07ddd638704056bdee8665afc4`; 1000×1500 RGBA.
- Package/root/exporter: `pkg_457_36_1784372293276` / `457:36` / 0.6.0; exported `2026-07-18T10:58:13.273Z`.
- Nodes/assets/fonts/fields: 2 / 0 / 0 / 0.
- Machine-readable evidence: `fidelity/evidence/milestone-7-3-gradient-intake/gradient-test-4/audit.json`.

The source ZIP was read without modification or normalization before these identities were recorded. It remains external and unregistered.

### Isolated source conditions

RECTANGLE `457:46`, bounds `(145,310,710,880)`, contains exactly one canonical and one raw `GRADIENT_LINEAR` paint. Both paint entries record opacity 0.5. Node opacity is 1; both stop alphas are 1; there are no additional fills, strokes, masks, or effects; paint blend is NORMAL; and node grouping is PASS_THROUGH. The opaque root `457:36` supplies the known SOLID background. Thus the source fields isolate paint opacity from stop alpha and node opacity.

The two stops are maroon at position 0 and pale blue at position 1. The raw matrix is:

```json
[
  [-3.5267131437421995e-8, 1, -1.2168755780805895e-8],
  [-2.254091501235962, -1.2212103683850728e-7, 1.627045750617981]
]
```

### Operation order and preview samples

The source-certified order is:

1. interpolate stop RGB directly;
2. interpolate stop alpha independently;
3. multiply the interpolated alpha by gradient-paint opacity;
4. composite source-over the opaque background.

Representative samples use `M^-1(t,0.5)` inside the rectangle:

| t / preview pixel | Actual RGB | Expected RGB | Maximum channel error |
| --- | --- | --- | --- |
| 0.1 / `(500,398)` | `97,47,66` | `97,47,66` | 0 |
| 0.5 / `(500,750)` | `117,82,106` | `117,81,106` | 1 |
| 0.9 / `(500,1102)` | `136,116,145` | `137,116,146` | 1 |

Across seven samples from `t=0.1` through `0.9`, the maximum channel errors are:

| Interpretation | Maximum channel error | Decision |
| --- | ---: | --- |
| Certified paint opacity, then source-over | 1 | Matches |
| Paint opacity applied to stop RGB only | 47 | Rejected |
| Paint opacity applied twice | 44 | Rejected |
| Paint opacity ignored | 90 | Rejected |
| Paint opacity treated as node opacity | 1 | Pixel-equivalent for this isolated one-fill node, but contradicted as source authority by node opacity 1 and paint opacity 0.5 |
| Opacity folded into stop alpha | 1 | Pixel-equivalent here, but contradicted by both raw stop alphas 1 and raw paint opacity 0.5 |
| Premultiplied-stop interpolation | 1 | Pixel-equivalent when all stop alphas are 1; the earlier accepted varying-stop-alpha case independently selects straight RGB interpolation |

Preview equivalence alone cannot distinguish some algebraically equivalent models. The exact exported fields locate opacity at the paint layer, while the cumulative earlier fixture establishes straight RGB versus premultiplied-stop behavior. Together they establish the declared operation order without reopening closed investigations.

### Complete source-certified subset

The four exact fixture revisions and selected screenshots cumulatively certify:

- normalized node-local-to-normalized-gradient matrix direction;
- one inverse for start `M^-1(0,0.5)`, end `M^-1(1,0.5)`, and third `M^-1(0,1)` handles;
- declared two- and three-stop order, nonuniform positions, and interval interpolation;
- straight RGB interpolation and independently interpolated stop alpha;
- paint opacity applied to the interpolated gradient alpha before source-over;
- vertical and general diagonal geometry, including a diagonal non-square node;
- gradient-local evaluation before node rotation;
- full-box evaluation followed by uniform or independent edge-local corner clipping;
- stable normalized intent across a source-reviewed same-node width resize, scaled to current bounds.

This subset is source authority only. Runtime support remains `Preserved only`. Radial/angular/diamond gradients, gradient strokes, multiple or mixed fills, non-NORMAL blends, node-opacity routing, effects, masks, shaders, Canvas, advanced compositing, malformed/singular transforms, and unproven stop-edge cases remain unsupported or compatibility-owned.

The smallest separate production proposal is [Milestone 7.3A](LINEAR_GRADIENT_IMPLEMENTATION_PLAN.md). No schema, normalizer, resolver, renderer, runtime ownership, fixture registration, candidate, or approved reference changed during this intake.

## Second supplementary intake — `template-package-gradient-test-3.zip`

Formal result: **Result B — gate remains open on paint opacity only**. The exact ZIP and two selected-gradient screenshots close the start/end/third-handle and controlled-resize questions. The attempted opacity case changes both stop alphas to 0.8 while raw and canonical paint opacity remain 1; it is not paint-opacity evidence.

### Exact identities

- ZIP: `/Users/niels/Documents/Templates/template-package-gradient-test-3.zip`; 611,320 bytes; `d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b`.
- `template.json`: 39,231 bytes; `87295fc9534b9ef47d7ea607f2e527b5b5be5535b1ac80547e8fa8fae61bb8cd`.
- `preview.png`: 571,867 bytes; `1a1a4575d1309c33bd09e5030d9df055231af11a0d524173043eaf05648b0d79`; 1000×1500 RGBA.
- Package/root/exporter: `pkg_451_135_1784371485904` / `451:135` / 0.6.0; exported `2026-07-18T10:44:45.883Z`.
- Nodes/linear gradients/assets/fonts/fields: 10 / 9 / 0 / 0 / 0.
- Selected 554×240 state: `/Users/niels/Desktop/Screenshot 2026-07-18 at 12.45.39.png`; 661,268 bytes; `c7e991d2c3095dc23f05833440e3139378597f8adb174a85b1613e84aadda5ce`; 816×1230 RGBA.
- Selected 710×240 state: `/Users/niels/Desktop/Screenshot 2026-07-18 at 12.43.47.png`; 662,161 bytes; `c0dded805b00a88db724a35f10d88ea337aa9c5a5cc58e8436c5a3675bd7a88a`; 818×1224 RGBA.

Machine-readable evidence is `fidelity/evidence/milestone-7-3-gradient-intake/gradient-test-3/audit.json`. The archive and screenshots remain unregistered source intake evidence.

### Selected handle authority

Both screenshots show the selected gradient on `451:175`: stop 0 at the maroon upper-right endpoint, stop 1 at the blue lower-left endpoint, and the separate perpendicular white handle above the rectangle. The third handle visually overlaps another source circle, but thresholded connected-component geometry isolates its centre.

The source contract is now directly evidenced:

```text
q = M p
start = M^-1(0, 0.5)
end   = M^-1(1, 0.5)
third = M^-1(0, 1)
```

For both sizes, the unchanged matrix derives normalized start `(0.999999957,0.014040455)`, end `(≈0,0.985959506)`, and third `(0.473446209,-0.636659981)`. Fitting screenshot coordinates from the observed start/end endpoints predicts the third-handle centre within 0.746 pixels for the 554×240 state and 0.959 pixels for the 710×240 state. The third point therefore represents the inverse-mapped normalized gradient-space `(0,1)` basis point; relative to start, it supplies the perpendicular gradient basis direction and scale.

This closes matrix direction, one-time inversion, handle coordinate space, start/end derivation, third-handle meaning, and diagonal non-square handle geometry for the certified subset.

### Controlled same-node resize

Node `451:175` is 554×240 in gradient-test-2 and 710×240 in gradient-test-3. Across those exact exports:

- node/root IDs remain `451:175` / `451:135`;
- stop positions remain exactly `[0,1]` with the same colors and alpha;
- the full `gradientTransform` is byte-equivalent;
- determinant remains `0.4301193591845731`;
- height remains 240 while width changes by 156;
- normalized handle coordinates remain fixed;
- local x coordinates scale from the current width while local y coordinates remain tied to the unchanged height;
- preview samples at normalized gradient coordinates 0.25, 0.5, and 0.75 differ by at most one channel between states and match the source model within one.

This closes source-reviewed resize semantics: gradient intent remains normalized and node-local, while source/template pixel handle geometry recomputes from current bounds. Stale original-width pixel coordinates are not authoritative.

### Attempted paint-opacity case

Node `454:30` now has node opacity 1, but it still does not carry paint opacity below 1:

- canonical gradient paint opacity: 1;
- raw gradient paint opacity: 1;
- first stop alpha: `0.800000011920929`;
- second stop alpha: `0.800000011920929`.

Five source samples agree with straight RGB plus alpha 0.8 followed by source-over within two channel values. Because uniform stop alpha and paint opacity can produce the same pixels for one isolated fill, preview pixels cannot override the explicit source fields. This case extends stop-alpha evidence only. Paint-level operation order remains the sole open source question.

### Minimum final input

Provide one exact revision in which a single isolated gradient records:

- `extensions.figma.rawFills[0].opacity < 1`;
- canonical `appearance.fills[0].opacity < 1` after exporter output;
- node opacity 1;
- every stop alpha 1.

No further handle, diagonal, corner, or resize evidence is requested. Schema promotion, resolver support, runtime ownership, renderer work, fixture registration, candidates, and references remain blocked until that exact source property is present and audited.

## Supplementary intake — `template-package-gradient-test-2.zip`

Formal result: **Result B — gate remains open**. The supplementary archive closes the source-side independent-corner question and strengthens diagonal non-square evidence. It does not contain selected-handle evidence, does not contain paint opacity below 1, and does not isolate resize-only behavior for unchanged gradient intent.

### Exact supplementary identity

- Path: `/Users/niels/Documents/Templates/template-package-gradient-test-2.zip`
- Size: 588,502 bytes
- ZIP SHA-256: `c2a41a23ed57651f50406bf645779191480eca38514c2a748cbe5b064ad6890a`
- `template.json`: 39,215 bytes; `e55bfdfce84b9c3dcf36913d6e95008456abfc50e59d8aa6e832d5436958066f`
- `preview.png`: 549,065 bytes; `f585ca5e13695d1a04f85f8006570b7e8341d3f049e912a6ff0f30200c32d698`; 1000×1500 RGBA
- Package/root: `pkg_451_135_1784370704869` / `451:135`
- Schema/package/exporter: 1.0 / `template-package-v1` / plugin 0.6.0
- Exported: `2026-07-18T10:31:44.852Z`
- Canvas: 1000×1500
- Nodes/linear gradients/assets/fonts/fields: 10 / 9 / 0 / 0 / 0
- ZIP entries: `template.json` and `preview.png` only. No selected-gradient screenshot, handle probe, `mcp.json`, or before/after annotation was supplied inside or alongside the exact archive.

The exact machine-readable audit is `fidelity/evidence/milestone-7-3-gradient-intake/gradient-test-2/audit.json`. This archive is retained as unregistered intake evidence and has not been added to the fidelity fixture manifest.

### Selected handles and diagonal non-square geometry

The existing interpretation remains consistent with the new preview: raw `gradientTransform` maps normalized node-local coordinates to normalized gradient coordinates, stop evaluation uses gradient-space x, and one inverse derives the conventional axis from `(0,0.5)` to `(1,0.5)`.

New node `454:34` is a 120×120 diagonal control with determinant `0.5000001788`. One inverse derives normalized start approximately `(1,0)`, end `(0,0.99999976)`, and candidate third point `(0.5,-0.49999994)`.

Resized node `451:175` is now a genuinely non-square 554×240 diagonal case. Its determinant is `0.4301193592`; one inverse derives:

- start normalized `(0.999999957,0.014040455)`, local pixels `(553.999976,3.369709)`;
- end normalized `(0.0000000117,0.985959506)`, local pixels `(0.000006,236.630281)`;
- candidate third normalized `(0.473446209,-0.636659981)`.

Interior preview samples at gradient coordinates 0.25, 0.5, and 0.75 agree with straight interpolation within one 8-bit channel value. This strongly supports normalized node-local evaluation on a diagonal non-square node. It does not independently certify the third-handle interpretation: no selected start/end/third-handle coordinates or screenshot were supplied, and neither canonical fills nor another ZIP entry retains them. The source handle requirement therefore remains open.

### Opacity case

Node `454:30` is not the requested paint-opacity case:

- node opacity: `0.699999988079071`;
- canonical gradient paint opacity: 1;
- raw gradient paint opacity: 1;
- both stop alphas: 1.

Five unobstructed samples agree with straight gradient RGB followed by 0.7 node-layer opacity and source-over compositing against the root within a maximum of two channel values. Ignoring opacity differs by as much as 47 channel values. However, for one isolated fill with no child/stroke/effect content, applying 0.7 as node opacity and applying 0.7 as paint opacity are pixel-equivalent. The archive therefore cannot establish paint-opacity ordering or distinguish paint opacity from node opacity. A real fill-opacity-below-1 case with node opacity 1 remains required.

### Independent corners

Node `454:32` is a 240×240 rectangle with source radii top-left/top-right/bottom-right/bottom-left `[0,170,80,50]`. Reusing the accepted Milestone 7.2 edge-local rule yields effective radii `[0,163.2,76.8,50]`; the right-edge factor is `240/(170+80)=0.96` and each corner takes the smaller adjacent-edge factor.

Preview evidence supports one full-node-box gradient followed by that corner clip:

- top-left `(5,5)` matches the gradient exactly and differs from the background by 12 channels;
- top-right `(235,5)` matches the background exactly and differs from the unclipped gradient by 98;
- bottom-right `(235,235)` matches the background exactly and differs from the unclipped gradient by 38;
- bottom-left `(5,235)` matches the background within one and differs from the unclipped gradient by 71;
- center `(120,120)` matches the gradient exactly.

This closes the source-side independent-corner clipping question for the bounded subset. It reuses, rather than duplicates, Milestone 7.2 corner normalization. Gradient runtime ownership and cross-surface output remain unimplemented and therefore unverified.

### Same-node resize

Node ID `451:175` exists in both exact packages, and the root ID remains `451:135`:

| Evidence | Before | Supplementary |
| --- | --- | --- |
| Package ID | `pkg_451_135_1784286420523` | `pkg_451_135_1784370704869` |
| Node bounds | 240×240 | 554×240 |
| Stop positions | `0.2451923043`, `0.75` | `0`, `1` |
| Matrix determinant | `0.4999999555` | `0.4301193592` |
| Derived start | `(0.95416676,≈0)` | `(0.999999957,0.014040455)` |
| Derived end | `(0.045833378,0.999999972)` | `(≈0,0.985959506)` |

Stable node ID is strong continuity evidence, but the gradient stop positions and matrix both changed. The ZIP has no source file key or resize annotation proving that only bounds changed. This is not a controlled resize of unchanged semantic gradient intent, so it cannot establish resize authority. The smallest follow-up is one export made by resizing the current `451:175` state without editing its `0/1` stops or handles, preferably with selected-handle evidence before and after.

### Formal remaining evidence

One further exact ZIP can close the remaining source questions if it:

1. starts from the current `gradient-test-2` state and resizes node `451:175` without changing its stop positions or handle intent;
2. sets node `454:30` back to opacity 1 and sets the gradient paint opacity itself below 1;
3. includes selected start/end/third-handle evidence for `451:175` before and after the resize.

No further independent-corner case is requested. Until those three focused inputs arrive, schema promotion, resolver support, runtime ownership, renderer work, fixture registration, candidates, and references remain blocked.

## Original fixture exact identity

- Path: `/Users/niels/Documents/Templates/template-package-gradient-test.zip`
- Size: 470,098 bytes
- ZIP SHA-256: `aa55a9c4413f72c443b646bcf257cc21e6fbb465e500da0decbe7cbb184b01f8`
- `template.json`: 27,566 bytes; `35763ee58e868cbd9446ee602608afd32500c4042535a204474becf9eca964f8`
- `preview.png`: 441,873 bytes; `751f48e63e167c6792173a3eaad24d8293550c4cacd653bebbcd4ffcf3b2cc67`; 1000×1500 RGBA
- `mcp.json`: 345 bytes; `24e7517d484a84936bb4b94422a0d7c52cf4e9b567ef0ea992c61bead17ceff3`
- Package/root: `pkg_451_135_1784286420523` / `451:135`
- Schema/package/exporter: 1.0 / `template-package-v1` / plugin 0.6.0
- Exported: `2026-07-17T11:07:00.517Z`
- Figma file/node link: `Tb4DXmBGjBDkJ9eoBQwFYO` / `451:171`
- Canvas: 1000×1500
- Nodes: 7
- Assets, fonts, editable fields, masks, effects, strokes, motion content, and variables: none

The ZIP is deterministic and intentionally small. It contains one gradient root, one layout frame, and five isolated `RECTANGLE` gradient cases. It is a materially better authority candidate than the earlier layered and VECTOR/SVG-owned sources.

## Canonical and raw-source audit

Every gradient is source index 0 and the only paint on its node. The exported canonical `appearance.fills[0]` retains:

- `type: GRADIENT_LINEAR`;
- visibility;
- paint opacity;
- blend mode.

It omits all stops and `gradientTransform`. Complete values survive only in `extensions.figma.rawFills[0]`. Pairing is unambiguous in this package because every case has one paint, but normalization still needs a provenance-preserving source-index contract before any runtime owner may consume the raw data.

All nodes use NORMAL paint blending, PASS_THROUGH node blending, node opacity 1, no strokes/effects/masks/assets, and finite nonsingular matrices.

## Source case inventory

Coordinates below are node-local. Near-zero floating-point values are normalized only for explanation, never rewritten in the source record.

| Node | Geometry | Stops | Raw transform summary | Source purpose |
| --- | --- | --- | --- | --- |
| root `451:135` | FRAME 1000×1500, clip true, radius 0 | maroon@0 → blue@1, opaque | `[[0,1,0],[-1,0,1]]`, det 1 | Full-height vertical control and root paint authority. |
| `451:170` | RECTANGLE 58×120, radius 170 | maroon@0.245192 → blue@0.75, opaque | vertical control, det 1 | Non-square normalized geometry, non-endpoint stops, pill clipping. |
| `451:179` | RECTANGLE 120×120, radius 170 | same as `451:170` | vertical control, det 1 | Same semantic gradient on a different size/aspect; circular clipping. |
| `451:175` | RECTANGLE 240×240, radius 170 | same two opaque stops | general diagonal matrix, det 0.4999999555 | Non-axis-aligned handle vector and translated/scaled gradient space. |
| `451:177` | RECTANGLE 120×120, radius 170 | maroon@0.245192 alpha 1 → blue@0.75 alpha 0 | vertical control, det 1 | Transparent-stop interpolation over the root gradient. |
| `451:181` | RECTANGLE 160×160, radius 170, node rotation −90° | maroon@0.091346 → white@0.370192 → blue@1, opaque | local vertical control plus node transform | Three nonuniform stops and transform order; preview becomes horizontal after node rotation. |

The package does not contain paint opacity below 1, four independent corner radii, malformed/singular matrices, or a second source/live resize state.

## Coordinate and handle derivation

Treat each raw 2×3 matrix as:

```text
q = M p
```

where `p` is normalized node-local position and `q` is normalized gradient position. Stop evaluation uses `q.x`. The conventional start/end axis is recovered by applying `M^-1` to gradient-space points `(0,0.5)` and `(1,0.5)`.

This interpretation predicts source pixels for all six gradients.

| Node | Determinant | Derived normalized start | Derived normalized end | Derived local-pixel start → end |
| --- | ---: | --- | --- | --- |
| root | 1 | (0.5,0) | (0.5,1) | (500,0) → (500,1500) |
| `451:170` | 1 | (0.5,0) | (0.5,1) | (29,0) → (29,120) |
| `451:179` | 1 | (0.5,0) | (0.5,1) | (60,0) → (60,120) |
| `451:175` | 0.4999999555 | (0.95416676,≈0) | (0.04583338,≈1) | (229.00002,≈0) → (11.00001,239.99999) |
| `451:177` | 1 | (0.5,0) | (0.5,1) | (60,0) → (60,120) |
| `451:181` local | 1 | (0.5,0) | (0.5,1) | (80,0) → (80,160) |

For `451:181`, the source node transform maps local `(x,y)` to parent `(-y+540,x+888)`. After the parent offset, the local vertical gradient becomes template-space right-to-left `(580,1194)→(420,1194)`, matching the preview's maroon-right/blue-left result. The gradient is resolved in node-local space before the node transform.

The diagonal case is especially discriminating. Applying the inverse to stop-axis samples produces the preview's top-right to bottom-left color field; using the matrix in the opposite direction does not.

No selected-gradient handle coordinates were supplied. Preview pixels validate the stop axis (`q.x`) and transform direction, but linear-gradient pixels cannot independently validate every second-axis/third-handle choice. The exact editor handle representation therefore remains partially unresolved.

## Stop positions and interpolation

Preview samples were taken at points derived from `M^-1(t,0.5)`, then mapped through node and ancestor transforms. Opaque cases agree with direct source-stop interpolation within 0–3 values in any 8-bit channel:

| Node / sample | Source t | Preview RGB | Direct expected RGB | Max delta |
| --- | ---: | --- | --- | ---: |
| `451:170` | 0.2 | 92,38,56 | 92,38,56 | 0 |
| `451:170` | 0.5 | 143,127,158 | 142,126,156 | 2 |
| `451:170` | 0.8 | 191,212,255 | 191,212,255 | 0 |
| `451:175` diagonal | 0.3 | 103,57,77 | 103,57,78 | 1 |
| `451:175` diagonal | 0.5 | 142,126,156 | 142,126,156 | 0 |
| `451:175` diagonal | 0.7 | 182,196,236 | 181,195,235 | 1 |
| `451:181` rotated/3-stop | 0.15 | 124,81,96 | 126,84,98 | 3 |
| `451:181` rotated/3-stop | 0.6 | 232,240,255 | 231,239,255 | 1 |
| root | 0.1 / 0.5 / 0.9 | source samples | direct interpolation | ≤1 |

The results support:

- declared source order is preserved;
- positions are not redistributed to 0/1;
- color clamps before the first and after the final stop;
- interpolation occurs independently within each adjacent interval;
- node rotation occurs after local gradient evaluation.

Repeated/equal/out-of-range stop positions remain untested and outside any proposed subset.

## Stop alpha versus paint opacity

Node `451:177` isolates stop alpha while paint and node opacity remain 1. Preview samples match straight RGB interpolation plus independent alpha interpolation followed by source-over compositing against the root gradient:

| t | Preview RGB | Straight-color + alpha expected | Premultiplied-stop expected | Straight max delta | Premultiplied max delta |
| ---: | --- | --- | --- | ---: | ---: |
| 0.3 | 110,69,91 | 108,67,89 | 99,50,70 | 2 | 21 |
| 0.4 | 133,111,139 | 133,110,138 | 112,73,95 | 1 | 44 |
| 0.5 | 151,140,173 | 149,139,172 | 125,95,122 | 2 | 51 |
| 0.6 | 159,156,191 | 159,155,190 | 138,119,149 | 1 | 42 |
| 0.7 | 160,158,194 | 161,159,194 | 152,143,176 | 1 | 18 |

This strongly rejects a model that first premultiplies the two stop colors and then interpolates those premultiplied colors. The source result interpolates color and alpha separately, then composites.

Paint opacity below 1 is absent. The fixture cannot establish whether Figma applies paint opacity to the completed gradient layer, folds it into stop alpha, or changes any interpolation/compositing stage. The certified subset must either require paint opacity 1 or obtain an explicit paint-opacity case.

## Geometry, corners, and resizing

Uniform radius 170 produces a pill at 58×120 and circles at 120×120, 160×160, and 240×240. The preview supports evaluation in the full node box followed by ordinary rounded-geometry clipping. It does not source-certify four independent radii with a gradient.

`451:170` and `451:179` reuse the same stops and transform at different width/aspect ratios. Their centerline samples match, supporting normalized rather than template-pixel gradient coordinates. This is a source size/aspect pair, but not a live resize of one node. No fixture state proves revisioned recomputation or deterministic return after the settled bounds change.

## Runtime ownership implications

Unlike the earlier adventure-travel VECTOR, these FRAME/RECTANGLE nodes have no SVG asset fallback. Current behavior remains:

- canonical paint lacks stops/transform;
- `resolveFill` returns unsupported;
- the renderer has no gradient owner;
- the root `canvas.background` falls back to black because the root fill is non-solid;
- each gradient rectangle remains compatibility/unsupported rather than source-faithful.

The source math is compatible with a singular SVG gradient owner and may be expressible through CSS for a smaller subset, but backend selection is not accepted by this intake. A future owner must preserve local gradient evaluation, stop/alpha semantics, current settled bounds, rounded clipping, node transform order, and one visual owner. Canvas remains excluded.

## Original fixture gate assessment

| Gate question | Result |
| --- | --- |
| Source/canonical pairing | Sufficient for one-paint index-0 cases; conflict/multi-paint precedence remains outside subset. |
| Matrix direction | Sufficient for finite nonsingular matrices exercised here: normalized node → gradient; one inverse derives the stop axis. |
| Normalized vs template coordinates | Strongly supported by non-square and size/aspect-pair source cases. |
| Start/end handles | Stop axis is strongly supported; exact second axis/third handle remains unverified without selected-handle coordinates. |
| Stop ordering/interpolation | Sufficient for ordered finite 2–3 stop lists with positions in [0,1], including nonuniform positions. |
| Stop alpha | Sufficient for separate straight-color and alpha interpolation followed by source-over. |
| Paint opacity | Missing; all paint opacity values are 1. |
| Rotated/non-square geometry | Sufficient for local gradient before node rotation, vertical non-square, diagonal square, and static size/aspect pair. Diagonal non-square remains absent. |
| Independent corners | Missing; uniform/clamped radius only. |
| Resize behavior | Missing live or paired state for the same node; static size pair is partial evidence only. |
| Singular runtime owner | Current owner is unsupported. SVG/CSS choice remains a proposed implementation decision, not source authority. |
| Cross-surface authority | Not yet captured; no production result exists and the fixture is not registered as authoritative. |

## Import verification

The earlier first-fixture run exposed the now-approved asset-free lifecycle defect. After that separate correction, `template-package-gradient-test.zip` passes the full strict lifecycle. The same strict command also passes for `template-package-gradient-test-2.zip`; neither package declares or references an asset dependency.

## Decision and minimum remaining evidence

Do not close the fixture gate and do not write the final linear-gradient geometry/ownership contract yet.

The cumulative minimum additional source evidence is now:

1. selected-gradient handle coordinates or screenshot/probe for the diagonal transform, sufficient to bind start/end and the second/third handle representation;
2. one isolated paint-opacity-below-1 case with node opacity 1 over the same known root gradient;
3. one further export of current node `451:175` after a bounds-only resize with its `0/1` stops and handle intent unchanged.

The supplementary fixture sufficiently supplies the independent-corner and diagonal non-square source cases; do not request replacements for them. Equal/out-of-range stops, singular matrices, multiple paints, gradient strokes, other gradient types, masks, effects, blend modes, shaders, Canvas, and offscreen compositing remain compatibility-owned and outside Milestone 7.3.
