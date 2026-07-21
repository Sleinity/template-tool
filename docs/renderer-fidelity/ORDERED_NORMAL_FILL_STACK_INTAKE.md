# Ordered NORMAL Fill-Stack Source Intake

Status: Result A — initial multiple-SOLID source gate closed; runtime implementation not started  
Roadmap location: Phase 7 — Paint/stroke; Milestone C — Appearance fidelity  
Intake dates: 2026-07-18 initial set; 2026-07-19 corrected reverse-control revision  
Scope: exact source intake plus bounded canonical opacity-provenance normalization; no paint-stack resolver/runtime, fixture-manifest, candidate, or reference change

## Formal decision

The supplied source materially advances the ordered-paint audit:

- the Figma Fill panel and embedded previews agree that exported `appearance.fills[]` is stored back-to-front: source index 0 is the backmost paint and increasing indices move toward the visual front;
- the three-SOLID preview is repeated straight-sRGB source-over in that order;
- the hidden middle paint remains at source index 1, is canonically `visible:false`, contributes no pixels, and does not disturb the relative order of indices 0 and 2;
- paint transparency is applied once in the source preview;
- node opacity is applied after the completed paint stack;
- the mixed SOLID/linear and SOLID/IMAGE cases reinforce the same order and demonstrate later mixed-layer requirements.

The gate does **not** close because three required facts are absent or contradictory:

1. The two archives presented as a reversed pair are not reversed. Their target fill arrays are value-for-value identical and their `preview.png` members are byte-identical.
2. Every partially transparent SOLID mirrors the one Fill-panel percentage into both canonical `color.a` and `paint.opacity`, while `extensions.figma.rawFills` is absent. The preview proves that the percentage is applied once, but the package cannot prove which canonical field is source alpha, which is paint opacity, or whether the fields are exporter aliases. Multiplying them is demonstrably wrong; choosing one without provenance would still be a guess.
3. Every supplied stack node has `cornerRadius:0` and `cornerRadii:null`. Rectangular extent is proven, but a multiple-paint stack under the accepted four-independent-corner geometry is not.

No ordered-stack runtime authority is transferred. Accepted ADRs 0053–0063 and the complete compatibility boundary remain unchanged.

The statements above record the initial 2026-07-18 Result B. The reverse-control revision below closed the first gap; the final source-contract/corner closure later in this document closes the remaining two.

## 2026-07-19 corrected reverse-control result

The exact path `/Users/niels/Documents/Templates/template-package-fill-stack-two-solids-blue-over-red.zip` now contains new bytes and supersedes the 2026-07-18 archive of the same filename for reverse-control evidence only. The updated target array is genuinely reversed: source index 0 is red and source index 1 is blue. Its preview matches index-ascending source-over, so reversed-array behavior is now certified and must not be requested again.

The overall gate remains Result B for two exact reasons:

1. Exporter 0.6.0 still writes each 60% SOLID as both `color.a=0.6` and `paint.opacity=0.6000000238418579`, without `extensions.figma.rawFills`, a versioned SOLID provenance record, or an alias/apply-once declaration. The application repository contains import normalization and strict package contracts, but not the Figma exporter serializer that produced these ZIPs. `/Users/niels/Documents/Template Exporter tool` is only an unrelated sample codegen plugin; modifying it would not correct the package exporter. The exact exporter line and original Figma `SolidPaint` therefore cannot be verified or corrected in this task.
2. Target node `459:51` still exports `cornerRadius:0`, `cornerRadii:null`, no stroke, no mask, no effects, and no rotation. No selected-node screenshot accompanied this revision. Shared four-independent-corner clipping remains absent rather than failed.

At that interim boundary, no speculative normalizer flag was added. Copying the already compatibility-mapped canonical paint into `rawFills` would falsely label transformed data as original Figma evidence. The later source-contract rule below resolves the compatibility alias without mislabeling canonical data as raw.

## 2026-07-19 final source-contract and corner closure

The Figma Plugin API resolves the opacity authority without access to the exporter source:

- [`SolidPaint.color` is RGB and has no alpha](https://developers.figma.com/docs/plugins/api/Paint/); paint `opacity` owns transparency;
- the [RGB/RGBA contract](https://developers.figma.com/docs/plugins/api/RGB/) states that RGB is the no-alpha color shape used by `SolidPaint` because paint opacity makes alpha redundant;
- [`figma.util.solidPaint`](https://developers.figma.com/docs/plugins/api/properties/figma-util-solidpaint/) assigns alpha-bearing utility input to `SolidPaint.opacity`.

Therefore, identified exporter-0.6.0 SOLIDs with no raw same-index paint and equal finite unit `color.a` / `paint.opacity` cannot represent two independent Figma source properties. Accepted ADR 0064 and strict `solid-paint-source-v1` normalization preserve both serialized values, set canonical color alpha to 1, retain paint opacity as source authority, and publish the effective opacity once. The equality tolerance is `1e-6`. Differing, invalid, conflicting, or unaffected evidence is never classified as an alias.

The final exact ZIP closes the geometry item. It contains one 710×880 target rectangle with two source-indexed visible NORMAL SOLIDs and node-level independent corners. Index 0 is opaque red; index 1 is blue with opacity 0. Both entries evaluate in order, although the blue layer is a no-op. The embedded preview therefore provides corner geometry evidence rather than a second multi-contributor blend sample; the already-certified 60% and three-layer fixtures remain the blend/order evidence.

One primitive owns bounds and corners for the complete fill list. Existing edge-local normalization leaves `[120,48,84,24]` unchanged at 710×880 because no opposing edge sum exceeds the corresponding dimension. Representative preview samples show background outside and red inside each corner transition: top-left `(145,310)` background and `(265,310)` red; top-right `(806,310)` red and `(854,310)` background; bottom-left `(145,1189)` background and `(169,1189)` red; bottom-right `(770,1189)` red and the right edge becomes background above the 84px corner. Painting does not alter the recorded 710×880 layout bounds.

The cumulative evidence establishes one shared node-local primitive clip, not a paint-specific corner model. A singular SVG group with one clip path is feasible; parent clipping remains a separate later operation. Proposed ADR 0065 records that future owner but does not authorize it in this task.

Formal decision: **Result A — initial multiple-SOLID source gate closed.**

## Exact ZIP identity

Every archive was hashed before parsing or normalization. All previews are 1000×1500, 8-bit RGBA.

| Exact archive | Bytes / ZIP SHA-256 | Package / root / exporter | `template.json` bytes / SHA-256 | `preview.png` bytes / SHA-256 | Relevant nodes |
| --- | --- | --- | --- | --- | --- |
| `template-package-fill-stack-two-solids-blue-over-red.zip` | 17,063 / `ca83393df197cd52a7c4addf5f3acd5e60d62ff064ec0b82899c7db692745ad4` | `pkg_459_50_1784400399011` / `459:50` / 0.6.0 | 7,474 / `f1ef9e871e3487ccf4334329cea77c28897fe9878290d93afd27644431194d99` | 9,367 / `3082b8106276d0bcbb30e660ce002f640297bf91002f84e3fdda1e05560b9002` | `459:51` |
| `template-package-fill-stack-two-solids-red-over-blue.zip` | 17,063 / `a5ef4e091e6a46f436705c86fdc6e5a664c4ab1e825742531540410c29b82d8b` | `pkg_459_48_1784400391740` / `459:48` / 0.6.0 | 7,474 / `7fe582f07377d70eb4e497e1577f95be9a94882d6369276ba9e2e3c1ca402cd7` | 9,367 / `3082b8106276d0bcbb30e660ce002f640297bf91002f84e3fdda1e05560b9002` | `459:49` |
| `template-package-fill-stack-three-solids.zip` | 17,513 / `050d0a8f444efca9508688434b80437bfa5a59223eb6808e3ba5d2c58d01bb6d` | `pkg_459_52_1784400406459` / `459:52` / 0.6.0 | 7,924 / `ea6bc0cee3e228996d28a235d51aa2e1d9d338ec7a630971d04c257d9fd6325f` | 9,367 / `79913c0b9754340a01c3366c55bd6a502f4626ea1c8aad72401bf263e2d20aad` | `459:53` |
| `template-package-fill-stack-hidden-middle-solid.zip` | 17,316 / `644950e26b06d7555f48b260c8d18b0aa2fd16f3fd9a3bcb85093b3fe1b696b1` | `pkg_459_54_1784400415342` / `459:54` / 0.6.0 | 7,728 / `a1c9738be1bd1026d65f9e98b8c4cf2d9956df9488e67602de0bc64ae2c66d01` | 9,366 / `c0aad7f89d73428ced5bb6cee903ee78f2f33c40202ae68537f8d36bc7293cf1` | `459:55` |
| `template-package-fill-stack-solid-paint-opacity.zip` | 19,873 / `d5b76315245df3036fd8ebc74120cfdfa6d4de1eccca14f417271728e2723734` | `pkg_459_56_1784400451612` / `459:56` / 0.6.0 | 10,258 / `d54cf9bfed4428f5128aebf30474ebc6d2acdc03970cd1805c8deacdf26c458b` | 9,393 / `11a889e5a16ec59c4f783b4160e53d8df97d88a932a3414d19804240f0ea9553` | `459:57`, `459:59` |
| `template-package-fill-stack-solid-transparent-image.zip` | 2,172,888 / `7cbd1c8ded4562b662e58552690cdf95d4939c7c70a49c0c2fa04113fd96ff7a` | `pkg_459_60_1784400462097` / `459:60` / 0.6.0 | 8,905 / `ea7e6b4d21a2c275b516e360f3603533cd6a8f06657d10124e3f59a7f50f92a0` | 721,618 / `3ec65c06c542c83209f347b611ad97d8eaac4c64da1c8d942de741edfcba2249` | `459:61` |
| `template-package-fill-stack-solid-linear.zip` | 153,754 / `7e732e9823f2a055680388df7a55251abb85f50418ea881544b62d926e49b641` | `pkg_459_67_1784400469908` / `459:67` / 0.6.0 | 8,898 / `9d5f83a6ca079c25739faf1c4ac5a8d9c052905441f837fa162ef2f2291a7fd7` | 144,634 / `be980d752b454675e839b986604bd80f2521aaf3867cbdb3ce20b1b8dd688191` | `459:68` |

### Superseding reverse-control revision

| Exact archive | Bytes / ZIP SHA-256 | Package / root / exporter | `template.json` bytes / SHA-256 | `preview.png` dimensions / bytes / SHA-256 | Relevant node |
| --- | --- | --- | --- | --- | --- |
| `template-package-fill-stack-two-solids-blue-over-red.zip` | 17,064 / `83e0345c7e85aac44f089de56a8c0bcf1d8a9968b45de338e18c34547730d8ff` | `pkg_459_50_1784461254306` / `459:50` / 0.6.0 | 7,474 / `1ad6630c185eb9311ac1f0e19bb6b0e05ae94706412b805dc90cd517ab17b9ab` | 1000×1500 / 9,368 / `5c42c21d226969a8bcb168312be41fd4f88b0adde6b5b7278c34780d45a9864c` | `459:51` |

No screenshot was supplied for this revision, so screenshot dimensions and SHA-256 are `not supplied` rather than inferred from the prior control.

### Final independent-corner revision

| Exact archive | Bytes / ZIP SHA-256 | Package / root / exporter | `template.json` bytes / SHA-256 | `preview.png` dimensions / bytes / SHA-256 | Relevant node |
| --- | --- | --- | --- | --- | --- |
| `template-package-fill-stack-two-solids-corners.zip` | 19,211 / `a080321e8689a342f64dca1d3e38b462a07042b04411f1d746af18fcb572bb47` | `pkg_465_72_1784462354328` / `465:72` / 0.6.0 | 7,538 / `368d58137b3a23312c1ce437a60cf50b12bb22faeecb0c0f2353ce8eeab8ad5f` | 1000×1500 / 11,451 / `0644bd23fa0d2d851c8915add4a29223027d358c3925ae23ea673787a3ce7dd4` | `465:73` |

No selected-node screenshot was supplied for the final ZIP. Screenshot dimensions and SHA-256 are recorded as `not supplied`; the strict corner values and preview geometry come from the exact ZIP rather than a substituted earlier screenshot.

The two reversed-control ZIP hashes differ because package/root/node identity and export metadata differ. Their paint values and preview pixels do not.

## Screenshot identity and source-panel evidence

| Exact screenshot | Dimensions / bytes / SHA-256 | Source evidence shown |
| --- | --- | --- |
| `Screenshot 2026-07-18 at 20.45.26.png` | 1756×1916 / 205,018 / `4cf02a6562b97a2ca8a54ff646c5709605f67b60a8a9a7b63d310daa88337be0` | Selected `fill-stack-two-solids-blue-over-red`; Fill panel top `#5C2638` 60%, bottom `#BFD4FF` 60%. No supplied screenshot selects the supposed reverse control. |
| `Screenshot 2026-07-18 at 20.45.35.png` | 1676×1860 / 194,866 / `b887a9c98ef40f30d25d5e1ad412ff1592d7ff1c82bae3bdcda80e294126017e` | Three paints, panel top-to-bottom `#F9FF62` 75%, `#FF009D` 55%, `#00FBFF` 35%. |
| `Screenshot 2026-07-18 at 20.45.43.png` | 1648×1908 / 192,352 / `6d2ded86292d06fd77de1b0c8004389eff796e5bad741ba403bd4193b21d2b42` | Same three-paint panel order with the middle `#FF009D` entry hidden. |
| `Screenshot 2026-07-18 at 20.46.04.png` | 1732×1988 / 203,589 / `cd95cec2f1589f36e6796383b373d6648b40f08b72ae070eb219a8cae3f6a5c9` | Top control has node opacity 100%, panel top `#5C2638` 50%, bottom `#BFD4FF` 100%; lower control shows the completed stack at node opacity 50%. |
| `Screenshot 2026-07-18 at 20.46.14.png` | 1820×1928 / 1,180,353 / `fc57cd329b2e9462c9774396d33d3650fc580427b99149fe6818fd4f056113b2` | Panel top IMAGE 50%, bottom `#5C2638` 100%. |
| `Screenshot 2026-07-18 at 20.46.21.png` | 1836×1912 / 448,985 / `a897103afbe172c36c718560e39c2e070ded1697a9066869b294c5795fdeb147` | Panel top Linear 50%, bottom `#F9FF62` 100%. |

Screenshots are panel/order evidence, not pixel references. Selection outlines and application chrome make the embedded `preview.png` the source pixel authority.

## Raw, normalized, and canonical paint records

The ZIP `template.json` files already use a canonical-shaped `appearance.fills[]`. Normalization preserves every source index, RGB value, visibility flag, paint opacity, order, and original serialized alpha evidence. For the bounded mirrored-alias predicate it changes canonical color alpha to 1 and records the serialized alpha in `solidPaintSource`; strict canonical validation succeeds.

| Node | Source array, index 0 upward | Normalization and provenance |
| --- | --- | --- |
| `459:51` and `459:49` | 0: `#BFD4FF`, serialized `a=0.6`, `opacity=0.6000000238418579`, visible; 1: `#5C2638`, same alpha/opacity, visible | Arrays are identical. No `rawFills`; current normalization adds mirrored-alias provenance, canonical alpha 1, and apply-once opacity. |
| `459:53` | 0: `#00FBFF`, serialized `a=0.35`, `opacity=0.3499999940395355`; 1: `#FF009D`, `a=0.55`, `opacity=0.550000011920929`; 2: `#F9FF62`, `a=0.75`, `opacity=0.75`; all visible | Order/values remain preserved as evidence; current normalization adds mirrored-alias provenance and canonical alpha 1. No `rawFills`. |
| `459:55` | Same indices and values as `459:53`, but index 1 has `visible:false` | Hidden entry is preserved canonically and in `PrimitiveAppearanceV1`. No `rawFills`. |
| `459:57` and `459:59` | 0: `#BFD4FF`, serialized `a=1`, `opacity=1`; 1: `#5C2638`, serialized `a=0.5`, `opacity=0.5`; both visible | Paint arrays are identical. Current normalization applies each alias once; node opacity remains a separate 1 / 0.5 operation. No `rawFills`. |
| `459:61` | 0: opaque `#5C2638`; 1: IMAGE, `opacity=0.5`; both visible | Preserved. IMAGE asset/placement resolves separately through the Phase 6 FILL contract. No `rawFills`. |
| `459:68` | 0: opaque `#F9FF62`; 1: `GRADIENT_LINEAR`, `opacity=0.5`; both visible | `rawFills[1]` supplies two opaque stops and the transform. Same-index normalization adds strict stops, transform, `linear-gradient-source-v1`, and no conflicts. |
| superseding `459:51` | 0: `#5C2638`, serialized `a=0.6`, `opacity=0.6000000238418579`, visible; 1: `#BFD4FF`, same alpha/opacity, visible | Genuine reverse array. No `rawFills`; current normalization adds strict mirrored-alias provenance, canonical alpha 1, and apply-once opacity while retaining serialized evidence. |
| final `465:73` | 0: `#5C2638`, serialized `a=1`, `opacity=1`, visible; 1: `#BFD4FF`, serialized `a=0`, `opacity=0`, visible | No `rawFills`. Strict normalization adds `solid-paint-source-v1` to both: `mirrored-compatibility-alias`, canonical `color.a=1`, effective opacity 1 / 0, apply once, tolerance `1e-6`, affected exporter/source-contract confidence, original serialized values retained. Corners TL/TR/BR/BL `120/48/84/24`. |

Every paint blend is `NORMAL`; every tested node blend is `PASS_THROUGH`; every tested node has no stroke, declared mask relationship, effect, or transform. The initial controls have zero corners; final node `465:73` adds the independent radii recorded above. Several source node names are copied from other controls (`459:57`, `459:59`, `459:68`), which is additional evidence that behavior must not depend on names.

## Paint-order authority

The observed source operation for visible entries is:

```text
C(-1) = root background
C(i)  = sourceOver(paint[i], C(previous visible index))
```

Source index 0 is backmost. Figma's Fill panel displays the same paints visually front-to-back, so its top entry corresponds to the highest visible source index.

### Two-SOLID control

At interior pixel `(500,750)`, both supplied previews are `[140,112,132,255]`.

| Model | Predicted RGB | Maximum channel error |
| --- | --- | ---: |
| index 0 blue, then index 1 red, opacity once | `[140,112,132]` | 0 |
| reverse evaluation | `[175,174,204]` | 72 |
| `color.a × paint.opacity` for both | `[176,160,174]` | 48 |
| first paint only / current type selection | `[211,223,246]` | 114 |
| last paint only | `[152,118,126]` | 12 |
| unweighted average | `[142,125,156]` | 24 |

This establishes the order of the supplied array. It does not establish reversed-control behavior because both archives contain that same array and pixel result.

### Superseding reversed two-SOLID control

At interior pixel `(500,750)`, the 2026-07-19 preview is `[175,174,203,255]`.

| Model | Predicted RGB | Maximum channel error |
| --- | --- | ---: |
| index 0 red, then index 1 blue, opacity once | `[175,174,204]` | 1 |
| reverse evaluation | `[140,112,132]` | 72 |
| first paint only | `[152,118,126]` | 77 |
| last paint only | `[211,223,246]` | 49 |
| `color.a × paint.opacity` for both | `[189,183,200]` | 14 |

The updated source array differs from the original blue-then-red control value-for-value, and its preview is no longer byte-identical. This closes the genuine reverse-order item without changing the already-certified back-to-front rule. At that intake point the aliases remained ambiguous; Accepted ADR 0064 later resolves them from the official source contract and strict predicate.

### Three-SOLID control

Using the one panel percentage as the effective source alpha, source-over intermediates are:

| Step | Approximate RGB after the step |
| --- | --- |
| root background | `[242,239,232]` |
| index 0 cyan at 0.35 | `[157,243,240]` |
| index 1 pink at 0.55 | `[211,109,195]` |
| index 2 yellow at 0.75 | `[239,219,122]` |

The embedded preview is `[239,218,122]`; the one-channel difference is consistent with the source's higher-precision color/quantization path.

| Alternative | Predicted RGB | Maximum channel error |
| --- | --- | ---: |
| certified ascending source-over | `[239,219,122]` | 1 |
| reversed order | `[163,161,184]` | 76 |
| first/type-selected paint only | `[157,243,240]` | 118 |
| last paint only | `[247,251,131]` | 33 |
| unweighted average | `[168,169,170]` | 71 |
| alpha/opacity applied twice | `[238,217,147]` | 25 |

## Visibility, paint opacity, and node opacity

`459:55` retains all three source paints. Omitting hidden index 1 predicts the preview within one channel; including it differs by up to 33. Visible indices 0 and 2 keep their original relative order. The canonical node and `PrimitiveAppearanceV1` retain the hidden entry and classify it `hidden-preserved`; the main resolved visible-fill list filters it before rendering.

Current primitive classification is coherent compatibility with:

- `hidden-paint-runtime-not-implemented`;
- `multiple-visible-paints-runtime-not-implemented`;
- `paint-outside-opaque-solid-subset`.

For `459:57`, opaque blue followed by the visible red 50% Fill gives source preview `[141,125,155]`. Applying 0.5 once predicts `[142,125,156]` within one channel. Multiplying canonical `color.a × paint.opacity` gives 0.25 and predicts `[166,168,205]`, up to 50 channels wrong.

`459:59` then applies node opacity 0.5 to the completed stack over the root. The predicted `[192,182,194]` is within one channel of source `[191,182,193]`. Node opacity is therefore a later, distinct operation and remains outside the first stack implementation.

At the initial intake, the preview alone proved one Fill-opacity operation but did **not** authorize choosing between the mirrored serialized `color.a` and `paint.opacity` fields. The official source contract and Accepted ADR 0064 now close that ambiguity for the strict affected-exporter predicate: both serialized values remain provenance, canonical RGB alpha becomes 1, and paint opacity is applied once. Values outside that predicate remain unchanged and explicitly ambiguous.

## Current compatibility behavior

| Case | Current result and diagnostic boundary |
| --- | --- |
| Two or three visible SOLIDs | Resolved entries retain visible indices, but DOM background still uses only the first visible SOLID. Bounded normalization makes affected aliases canonical alpha 1 plus paint opacity, so first-paint compatibility applies opacity once; it still does not compose the remaining stack. The primitive route reports unimplemented multiple paints plus paint outside the opaque subset. |
| Hidden middle | Canonical/primitive evidence preserves the hidden layer; visible resolved fills omit it. DOM still paints only visible index 0. Hidden and multiple-paint fallback reasons are explicit. |
| Paint-opacity controls | DOM paints opaque index 0 blue only; index 1 red does not contribute. Node opacity still applies on `459:59`. |
| SOLID + linear | Canonical normalization preserves both layers and certifies the isolated gradient geometry, but mixed ownership makes the whole primitive compatibility-authoritative. DOM paints flat index 0 yellow and emits `resolved-unsupported-fill` for the gradient. |
| SOLID + IMAGE | DOM uses index 0 as background color and the first IMAGE as an independent cover background. IMAGE paint opacity has no owner, so the image is effectively opaque. |

This behavior is evidence of the existing gap, not a baseline to preserve as source fidelity.

## Shared clipping and singular ownership

Every supplied paint stack uses fixed node bounds, so paints do not alter layout geometry. Final node `465:73` adds four distinct node-level corners, and its preview confirms that the complete painted result shares that one geometry. The zero-opacity blue layer makes this a geometry—not multi-contributor compositing—sample; the earlier partial-opacity fixtures supply the complementary compositing evidence.

For the bounded future subset, one SVG primitive subtree is source-feasible: one source-indexed paint sequence, one node-local rounded path/clip owner, and no simultaneous compatibility background. It reuses accepted edge-local corner normalization and does not create a clip path per paint. Proposed ADR 0065 records this ownership contract; runtime transfer remains unapproved.

## SOLID plus certified linear gradient

Node `459:68` stores opaque yellow at index 0 and a 0.5 linear gradient at index 1. The raw gradient has stops `#5C2638` and `#BFD4FF` at 0 and 1, and transform:

```text
[[-3.5267131437421995e-8, 1, -1.2168755780805895e-8],
 [-2.254091501235962, -1.2212103683850728e-7, 1.627045750617981]]
```

At the node centre, the gradient evaluates near its midpoint. Applying gradient paint opacity 0.5 over yellow predicts `[195,190,127]`, exactly the source preview sample. The accepted linear-gradient geometry contract is sufficient as a future layer input, and one SVG subtree could own both paths without duplicate gradient ownership. Mixed rendering remains outside the first implementation and is not authorized by this intake.

## SOLID plus IMAGE

Node `459:61` stores opaque red at index 0 and IMAGE opacity 0.5 at index 1.

- canonical asset: `asset:image:ceab5479`, source hash `ceab5479296c815cb14f4bcf3a71041a14f53ce2`;
- `assets.json`: 497 bytes / `d17edcebedf760427326ceecd2b9170c50372f200becf374b109a77719b717bd`;
- file: `assets/asset_fill_stack_two_solids_re_001.png`, 1,441,382 bytes, 1125×750, SHA-256 `5dcfbc0b02a55dde8a347ca283dc1babb25958fbaa7e977d89e4d063286491f0`;
- source placement: FILL in a 710×880 slot. The preserved `imageTransform` is inapplicable under accepted Phase 6 authority.

The asset itself is fully opaque: alpha min/max are 255 and it has zero transparent pixels. The visible transparency comes solely from IMAGE paint opacity 0.5. At the settled-slot centre, the FILL source sample is approximately `[6,6,4]`; applying it at 0.5 over red predicts preview `[49,22,30]` exactly.

This is strong later mixed-stack evidence, but the current background-image owner cannot apply per-paint opacity or join a singular stack. IMAGE layering must remain a dedicated later sub-milestone that consumes existing `ResolvedImagePlacementIntentV1` geometry without changing replacement or crop authority.

## Closed source request and next boundary

The previous request for opacity authority and independent corners is closed by the official Figma source contract, strict versioned compatibility provenance, and final exact ZIP. No further order, opacity, visibility, node-opacity, or corner fixture is required for the bounded source gate.

The next step is separate approval of proposed Milestone 7.4 in `ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md`. Do not begin mixed paints, IMAGE opacity, non-NORMAL blends, node-opacity routing, effects, masks, vectors, gradient strokes, Canvas/WebGL, candidates, or reference promotion under that approval.

## Proposed implementation boundary after gate closure

No runtime implementation is approved now. With the source gate closed, the smallest separate production milestone remains:

- eligible axis-aligned FRAME/RECTANGLE primitives;
- two or more preserved SOLID paints with `NORMAL` blend;
- source-indexed back-to-front order;
- visibility plus separately provenance-tagged color alpha and paint opacity;
- node opacity fixed at 1;
- uniform or accepted independent corners with one clip owner;
- one singular paint-stack owner and complete compatibility fallback for any unsupported layer;
- content-addressed source, paint-stack, and geometry revisions;
- identical stack identity through Validate, Fields, editor, shared previews, PNG, save/reload, resize, and offline rendering.

IMAGE, gradients, non-NORMAL blends, masks, effects, arbitrary vectors, Canvas/WebGL, and reference promotion remain outside that first milestone.

## Verification and immutability

- The final corner ZIP passed the strict realistic-ZIP lifecycle with exact 19,211-byte / `a080321e…b47` identity. Source-preview pixels were decoded directly from those immutable bytes.
- Focused tests cover equal aliases, apply-once behavior, rejected multiplication, opaque input, differing-value ambiguity, raw-source authority, idempotence, strict-schema validity, unaffected exporter versions, and resolved-tree provenance retention.
- `pnpm test`, `pnpm exec tsc -b --pretty false`, `pnpm build`, `pnpm test:diagnostic-zips`, and `pnpm docs:verify` passed in the final 2026-07-19 run. Documentation verification covers 124 Markdown files and 239 local links. The existing large-chunk warning remains known.
- The real exporter serializer is not present in this repository. The correction is therefore deliberately an importer/source-contract compatibility normalization, not a claimed exporter patch.
- Production `src` changed only for the strict opacity source record, schema/normalization, resolved-provenance test, and corrected compatibility diagnostic names. The rebuilt main JavaScript is 940.29 kB / 273.37 kB gzip, +6.00/+1.34 kB versus the prior 934.29/272.03 kB build; `dist` is 4 files at aggregate `13b72e8e16144d38649e64e86c3b520bb7865b9e55ae2dc1a503a7a2140b62c0`.
- `fidelity/fixtures.json`, `package.json`, and `pnpm-lock.yaml` remain respectively `403d3be6832abfccae16cba7398a477af904b4264c21e5800ea863e3265eabb2`, `7f3feb4fde087915e74d8beec825278ce63e534f6313fa177b1a6eda8c0b0acd`, and `3826d8d4e47d468edc03b53becb11fcb740c27c7b9cc99e35c3d078b988b7529`.
- Candidates remain 7,177 files at aggregate `e0aa6436e2f1c89ed3afcef111bbf68cd9ce8bc441443345caa226e2a8c73cdb`; approved renderer, scene, and settlement references remain 48 / 4 / 80 files at `204d676628098e9440634be7fa33b73d79937fb9a2edc3ef5aefd17e2d065ede`, `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`, and `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
- No fixture registration, candidate generation, reference update, comparison-tolerance change, paint-stack resolver, SVG stack owner, or renderer route was added.
