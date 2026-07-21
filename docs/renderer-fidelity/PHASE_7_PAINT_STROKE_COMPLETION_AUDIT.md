# Phase 7 Paint and Stroke Completion Audit

Status: Result B — additional bounded Phase 7 work is required for V1  
Roadmap location: Phase 7 — Paint/stroke; Milestone C — Appearance fidelity  
Audit date: 2026-07-18  
Scope: source and implementation audit only; no runtime authority, fixture registration, candidate generation, or reference change

## Decision

Phase 7 is not complete for V1. The exact external corpus contains repeated ordered fill stacks, while the runtime has no general ordered paint-stack owner. Canonical and observational layers preserve source order, but compatibility rendering selects the first visible SOLID as a background and the first IMAGE as a separate CSS background image; it does not evaluate the fill array as an ordered stack. An isolated linear gradient has a singular SVG owner only when it is the sole visible paint. The next source fixture must therefore be **ordered multiple fills with `NORMAL` blending**.

The absence of real corpus examples for radial/angular/diamond gradients, gradient strokes, dashed strokes, caps/joins, multiple strokes, and per-edge weights does not justify guessing their semantics or making all of them V1 blockers. Those capabilities retain explicit compatibility or preservation boundaries and the priorities below.

## Current accepted authority

The audit confirms the accepted production subsets:

- one ordinary opaque SOLID on an eligible axis-aligned FRAME or RECTANGLE;
- uniform and four independent corners with edge-local normalization from current bounds;
- one opaque uniform rectangular SOLID stroke using INSIDE, CENTER, or OUTSIDE geometry, without changing layout;
- ancestor clipping of expanded strokes and singular DOM/CSS or SVG ownership;
- one isolated source-certified `GRADIENT_LINEAR`, including ordered two/three stops, nonuniform positions, straight-sRGB interpolation, independent stop alpha, paint opacity, one-inverse normalized geometry, pure node rotation, non-square bounds, independent corners, and resize;
- stable current-revision output through Validate, Fields, editor, hidden PNG, persistence, reload, and offline rendering for those bounded subsets;
- Phase 6 image FILL/FIT/CROP and replacement authority. This audit does not reopen media placement.

Accepted ADRs 0053–0063 remain in force. `PaintStackV1` and `StrokeStackV1` remain observational. ADR 0010 and ADR 0012 remain Proposed.

## Production pipeline audit

### Common source path

`ZIP template.json -> loose source contract -> normalization -> strict TemplatePackageV1 -> workingPackage -> CanonicalSceneGraphV1 -> ResolvedRenderTreeV1 / PrimitiveAppearanceV1 -> TemplatePackageRenderer -> Validate / Fields / editor / hidden PNG`

| Stage | Fills | Strokes | Current limitation |
| --- | --- | --- | --- |
| Raw ZIP | `appearance.fills[]`; `extensions.figma.rawFills[]` | `appearance.strokes[]`, node weight/alignment, `extensions.figma.stroke*` and possible raw stroke evidence | Exporter presence varies; extension presence is not render support. |
| Normalization | Preserves fill order. Only same-index `GRADIENT_LINEAR` receives strict stops/transform hydration and conflict provenance. | Preserves canonical stroke entries and raw extension evidence; no advanced-stroke promotion. | Other gradient families and advanced stroke fields are not source-normalized into versioned authority contracts. |
| Strict validation | `PackagePaint` admits SOLID, IMAGE, and four gradient families with visibility, opacity, and blend. | An entry may be a paint or `{paint, weight, align}`. | No canonical dash offset/cap/join/miter/per-edge-weight contract. IMAGE does not carry a general layered compositing contract. |
| Canonical scene | Ordered fills/strokes are cloned with provenance. | Ordered entries plus node weight/alignment survive. | Scene capability labels are descriptive; they do not assign runtime ownership. |
| Observational appearance | `PaintStackV1` records all ordered paints. | `StrokeStackV1` records order and raw dash/cap/join evidence. | Both explicitly have `runtimeUse: disabled-observational`. |
| Resolved tree | Every visible fill receives a source index. SOLID and IMAGE resolve; eligible isolated linear gradient receives a geometry identity; other gradients become `unsupported`. | `resolvePackageStrokeModel` resolves visible SOLID layers only. | `backgroundColor` separately chooses the first visible SOLID; image resolution separately chooses the first IMAGE. Non-solid strokes do not reach the resolved stroke list. |
| Capability routing | One visible opaque SOLID or one eligible isolated linear gradient may route. | Zero/one eligible opaque rectangular SOLID stroke may route. | More than one visible paint or stroke, unsupported opacity/blend, media/vector ownership, or advanced stroke data selects complete primitive compatibility. |
| Compatibility runtime | First visible SOLID becomes color/background. First IMAGE becomes CSS background image; fixed DOM layering places it over background color. | Visible SOLID layers become border/inset/centre/outer shadows. | Fill array order is not generally evaluated; additional SOLIDs/images and all gradients are not layered. Multiple solid strokes are unverified approximations. |
| Singular routed runtime | DOM/CSS for one solid or uniform INSIDE stroke; one SVG path for eligible linear gradient and path-owned strokes. | One certified stroke path owner. | No singular general paint-stack or stroke-stack backend. |
| Persistence/reload | Full canonical arrays and extensions remain in `workingPackage`. | Full canonical arrays and extensions remain. | Persistence proves preservation, not pixel authority. |
| Surfaces/export | Validate and Fields use bounds-first/static appearance; editor and hidden PNG use editor mode. All call `TemplatePackageRenderer` in separate instances. | Same. | Certified primitive identities converge, but compatibility stacks can still expose mode-specific CSS behavior. No one post-measurement appearance graph exists. |
| Diagnostics | Unsupported gradient family and linear-gradient fallback reasons are emitted; resolved warnings preserve unsupported fill entries. | Non-solid stroke, mixed unsupported stroke, alignment, and mode-specific approximation warnings exist. | No complete user/developer account of ignored fill layers, image paint opacity, paint order loss, or every advanced raw stroke property. |
| Fidelity evidence | Approved isolated gradient references and regional primitive evidence exist. | Approved bounded stroke behavior and source evidence exist. | No approved source-isolated ordered-stack, radial/other-gradient, multiple-stroke, dash/cap/join, gradient-stroke, or per-edge fixture. |

### Authority by property

| Property | Current semantic authority | Current pixel authority | Fallback / divergence |
| --- | --- | --- | --- |
| Fill source order | Canonical `appearance.fills[]` and observational `PaintStackV1` | None for a general stack | Compatibility chooses first SOLID and first IMAGE by type, not an ordered layer evaluation. |
| Fill visibility | Each canonical paint | Hidden entries are filtered by helpers | Primitive route rejects any hidden paint; no isolated real source case proves stack behavior. |
| SOLID alpha/paint opacity | Color alpha and paint opacity remain separate | First-solid CSS color multiplies them | Partial SOLID is outside certified primitive authority. |
| Linear stop alpha/paint opacity | Certified canonical/resolved gradient contract | One SVG gradient in isolated subset | Mixed stacks reject the route. |
| IMAGE paint opacity | Canonical paint only | Not applied as a distinct image layer opacity | Preserve and diagnose; current background image remains opaque. |
| Paint blend mode | Per-paint canonical value and raw provenance | `NORMAL` only within singular certified owners; no general stack blend owner | Non-NORMAL paint remains preserved. The one real DARKEN case also needs Phase 9 isolation/compositing authority. |
| Stroke order | Canonical array and observational `StrokeStackV1` | Compatibility loops visible SOLID layers; primitive route accepts one | Multiple-source ordering and overlap are not source-certified. |
| Dash/cap/join | Raw extension when exported | None in semantic primitive owner | Complete compatibility; raw values are observational only. |
| Per-edge weight | Some raw key names are recognized by scene mapping | None; strict appearance uses one weight or per-entry weight | No real ZIP evidence and no canonical per-edge contract. |

## Exact ZIP corpus

The audit inspected all 17 exact `.zip` files present in `/Users/niels/Documents/Templates`. Twelve are registered by `fidelity/fixtures.json`; five are unregistered evidence archives. All report exporter 0.6.0. Similar names were not substituted.

| ZIP | Bytes | SHA-256 | Package / root | Registration |
| --- | ---: | --- | --- | --- |
| `template-package-adventure-travel-pinterest-pin-ad-2.zip` | 460,656 | `1a6035727de4dd16c78f5a114b88a9d11e5ed711ce0e0e63c7fb44443b757a12` | `pkg_451_135_1784286053969` / `451:135` | unregistered |
| `template-package-adventure-travel-pinterest-pin-ad.zip` | 331,707 | `5e3c2c71384f1e809e12331927f5b1dfaffb8e259e22aec007f6ec1abf7a6147` | `pkg_451_97_1784285744004` / `451:97` | unregistered |
| `template-package-bb-cover-thing.zip` | 1,311,193 | `7349496cd1cca9012d55791ac92b2d0d1ade2dc9fe204102b5074566ad06e4b3` | `pkg_421_19_1784061375618` / `421:19` | registered |
| `template-package-deal-of-the-week-banner-crop-2.zip` | 2,258,157 | `415062d2378194354f242dc643f965cbf7fa665ad3ecd034664d0211144b6382` | `pkg_429_39_1784233341362` / `429:39` | registered |
| `template-package-deal-of-the-week-banner-crop-3.zip` | 2,265,128 | `017204b839e4269174c822daeb3799eb7ebf8c5e8d955d47723ab7a7e498e689` | `pkg_429_39_1784238619750` / `429:39` | registered |
| `template-package-deal-of-the-week-banner-crop.zip` | 2,281,149 | `611251da47e4eb64cc89074590a6718eef3af96c9f2f56f7f56ed29d53cbca80` | `pkg_429_39_1784231310726` / `429:39` | registered |
| `template-package-deal-of-the-week-banner.zip` | 2,342,981 | `b8ac9d2acf962de377114013ef91626b0426ef9645566917a6655ffb538b7e1b` | `pkg_346_34_1783763662819` / `346:34` | registered |
| `template-package-deal-of-the-week-post.zip` | 2,500,574 | `96866712f10271407a182d3a905e112b2eb1b9170257c4d8fe6d05c9a7311b05` | `pkg_225_117_1783547502647` / `225:117` | registered |
| `template-package-gradient-test-2.zip` | 588,502 | `c2a41a23ed57651f50406bf645779191480eca38514c2a748cbe5b064ad6890a` | `pkg_451_135_1784370704869` / `451:135` | unregistered evidence revision |
| `template-package-gradient-test-3.zip` | 611,320 | `d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b` | `pkg_451_135_1784371485904` / `451:135` | registered |
| `template-package-gradient-test-4.zip` | 193,635 | `9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3` | `pkg_457_36_1784372293276` / `457:36` | registered |
| `template-package-gradient-test.zip` | 470,098 | `aa55a9c4413f72c443b646bcf257cc21e6fbb465e500da0decbe7cbb184b01f8` | `pkg_451_135_1784286420523` / `451:135` | unregistered evidence revision |
| `template-package-main-visual-section.zip` | 657,015 | `c3562c456978758384ba592fd463ac30ec7b7566ee55a67068691d8d260331df` | `pkg_2453_1435_1784061043132` / `2453:1435` | registered |
| `template-package-neon-testimonial-facebook-post.zip` | 678,328 | `b5a8eaa5c1acda46a98721adfabf78ba1691f830b91c6fe1f81a9128283f08ad` | `pkg_443_46_1784276305696` / `443:46` | unregistered |
| `template-package-now-hiring-post.zip` | 2,570,689 | `14f895cbba1919cc39175e276fb34d7e3f4a92354c2085fe67656365246b906b` | `pkg_387_340_1783966486531` / `387:340` | registered |
| `template-package-optimized-for-template-export.zip` | 2,509,168 | `fa87c4eeefbad1e8c3bbe3bc03912870aeb2a9a6d0d16ea301de25270f1e0823` | `pkg_378_19_1783892960002` / `378:19` | registered |
| `template-package-stroke-test.zip` | 32,574 | `53564876e6bf9d9924528eefbbd8eea9ab8f176bb91bef731c0f9785c3b3eb29` | `pkg_443_87_1784276898719` / `443:87` | registered |

### Corpus totals

- 141 SOLID fills, 21 IMAGE fills, 29 `GRADIENT_LINEAR` fills, one SHADER fill, one VIDEO fill, and 15 SOLID strokes.
- Eight nodes have more than one fill. There are no nodes with multiple strokes.
- Every one of the 232 nodes has node blend `PASS_THROUGH`; no node-level non-PASS_THROUGH blend occurs.
- Exactly one paint-level non-NORMAL blend occurs: `DARKEN` on bb-cover node `421:25`, fill index 2.
- Exactly one paint opacity below 1 occurs: the already certified 0.5 linear-gradient paint on gradient-test-4 node `457:46`.
- No fill or stroke entry has `visible:false`.
- No ZIP contains `GRADIENT_RADIAL`, `GRADIENT_ANGULAR`, `GRADIENT_DIAMOND`, a gradient stroke, multiple strokes, dash data, cap/join/miter data, or per-edge stroke weights.

### Every multi-fill occurrence

All entries are visible and opacity 1. The source order below is exact array order.

| ZIP / node / type | Ordered paints | Blend | Isolation assessment |
| --- | --- | --- | --- |
| bb-cover / `421:25` / FRAME | 0 SOLID, 1 IMAGE, 2 LINEAR | NORMAL, NORMAL, DARKEN | Not authoritative: image, non-NORMAL gradient, and full-template dependencies are inseparable. Raw gradient transform is `[[-4.498103880131734e-16,-1,1],[0.9999998807907104,-2.219198131490991e-16,2.3570928320282292e-8]]`. |
| crop-2 / `429:49` / RECTANGLE | 0 SOLID, 1 IMAGE | NORMAL | Authoritative for FIT media placement only. The opaque image does not expose enough of the lower paint to prove general ordering/compositing. |
| crop-3 / `429:49` / RECTANGLE | 0 SOLID, 1 IMAGE | NORMAL | Same limitation; mask/source fixture revision does not add stack authority. |
| main-visual / `2453:1435` / FRAME | 0 SOLID, 1 SHADER, 2 LINEAR | NORMAL | Not authoritative: unsupported SHADER and root clipping make the preview ambiguous. Raw gradient transform matches the bb-cover matrix. |
| neon / `443:53` / RECTANGLE | 0 SOLID, 1 IMAGE | NORMAL | Unregistered production template; no isolated alpha/order control. |
| neon / `443:61` / RECTANGLE | 0 SOLID, 1 IMAGE | NORMAL | Unregistered production template; also has a CENTER stroke. |
| neon / `443:63` / RECTANGLE | 0 SOLID, 1 IMAGE | NORMAL | Unregistered production template; also has an OUTSIDE stroke. |
| optimized / `378:20` / RECTANGLE | 0 VIDEO, 1 IMAGE | NORMAL | Exploratory and contains unsupported VIDEO; unsuitable for ordered-fill authority. |

No real node has multiple SOLID fills, a source-isolated SOLID+linear NORMAL stack, or a source-isolated IMAGE+linear NORMAL stack. The current corpus therefore proves product relevance but not the geometry, order, alpha, clipping, or backend contract needed for authority transfer.

### Stroke occurrences relevant to the remaining audit

The corpus has 15 one-paint opaque NORMAL SOLID strokes only. Every entry is source index 0, visible, opacity 1, unstacked, with no dash, offset, cap, join, miter, per-edge weight, or gradient data.

| ZIP / node / type | Weight / alignment | Source-preview authority for remaining work |
| --- | --- | --- |
| adventure-travel / `I451:97;4:34` / VECTOR | 4.999999523162842 / CENTER | No; arbitrary vector/asset context. |
| adventure-travel / `I451:97;4:35` / VECTOR | 4.999999523162842 / CENTER | No; arbitrary vector/asset context. |
| bb-cover / `421:27` / FRAME | 2.4000000953674316 / INSIDE | Regional authority already accepted for the bounded single stroke only. |
| bb-cover / `421:30` / VECTOR | 3.200000047683716 / CENTER | No; vector context. |
| main-visual / `2453:1436` / FRAME | 2.4000000953674316 / INSIDE | Regional authority already accepted for the bounded single stroke only. |
| main-visual / `2453:1437` / VECTOR | 3.200000047683716 / CENTER | No; vector context. |
| main-visual / `2453:1439` / FRAME | 2.4000000953674316 / INSIDE | Regional evidence only; adds no advanced semantics. |
| neon / `443:53` / RECTANGLE | 1 / INSIDE | No; unregistered and coupled to a SOLID+IMAGE stack. |
| neon / `443:61` / RECTANGLE | 1 / CENTER | No; unregistered and coupled to a SOLID+IMAGE stack. |
| neon / `443:63` / RECTANGLE | 1 / OUTSIDE | No; unregistered and coupled to a SOLID+IMAGE stack. |
| stroke-test / `443:88` / RECTANGLE | 8 / INSIDE | Yes for the already accepted single-stroke control. |
| stroke-test / `443:89` / RECTANGLE | 8 / CENTER | Yes for the already accepted single-stroke control. |
| stroke-test / `443:90` / RECTANGLE | 8 / OUTSIDE | Yes for the already accepted single-stroke and ancestor-clip control. |
| stroke-test / `443:94` / RECTANGLE | 8 / INSIDE | Yes for the already accepted independent-corner control. |
| stroke-test / `443:95` / RECTANGLE | 8 / INSIDE | Yes for the already accepted edge-local normalization control. |

None supplies advanced stroke properties. The vector cases are asset/vector-path evidence, not authority for semantic open paths.

## Capability and roadmap matrix

The support value uses the programme taxonomy. Priority is a roadmap decision, not a claim that a fixture exists.

| Capability | Current support | Priority | Corpus / runtime finding | Required dependency or boundary |
| --- | --- | --- | --- | --- |
| One opaque SOLID | Native | V1 required | Source-certified and routed | Complete for bounded primitive subset. |
| Ordered fill stack | Approximated | V1 required | 8 real nodes; array preserved, runtime not order-driven | Next fixture; versioned stack geometry/ownership. |
| Source paint order | Preserved only | V1 required | Exact canonical/observational order survives | Singular layered owner must consume indices without reordering. |
| Multiple SOLID fills | Approximated | V1 required | No real occurrence; first visible SOLID wins | First bounded implementation subset after source fixture. |
| SOLID + certified linear gradient | Preserved only | V1 required | Two complex layered occurrences, neither isolated | Ordered NORMAL stack after multiple SOLIDs. |
| SOLID + IMAGE | Approximated | V1 required | 5 semantic nodes / 6 archive occurrences | Integrate existing media geometry as a paint layer; never reopen crop logic. |
| IMAGE + certified linear gradient | Preserved only | V1 compatibility boundary | Only real combination is DARKEN | NORMAL needs source fixture; DARKEN waits for Phase 9. |
| Per-paint visibility | Preserved only | Blocked by missing source authority | All 208 fill/stroke entries are visible | Isolated visible/hidden/reordered controls. |
| Partial SOLID paint opacity | Emulated | V1 required | First-solid CSS multiplies alpha/opacity; primitive route rejects it | Source-isolated alpha and operation-order evidence. |
| Linear-gradient paint opacity | Native | V1 required | Exact 0.5 source/PNG fixture | Complete only for isolated certified gradient. |
| IMAGE paint opacity | Preserved only | V1 compatibility boundary | No real occurrence; CSS background has no per-layer opacity | A layered image owner is prerequisite. |
| NORMAL paint blending in a stack | Approximated | V1 required | Fixed SOLID-background/IMAGE ordering only | Ordered stack owner and shared clipping. |
| DARKEN paint blend | Preserved only | Blocked by Phase 9 compositing | One real bb-cover occurrence | Requires local layer blend plus group/isolation evidence. |
| MULTIPLY, SCREEN, OVERLAY, LIGHTEN | Preserved only | Blocked by Phase 9 compositing | Synthetic probe only; no real occurrence | Do not implement in Phase 7 without isolated source and isolation contract. |
| `GRADIENT_LINEAR` isolated | Native | V1 required | Approved two-fixture subset | Complete for bounded subset. |
| `GRADIENT_RADIAL` | Preserved only | Tier 2 | Zero corpus occurrences | Independent isolated source gate; do not reuse linear assumptions. |
| `GRADIENT_ANGULAR` | Preserved only | Tier 3 | Zero corpus occurrences | Likely different backend; separate source authority. |
| `GRADIENT_DIAMOND` | Preserved only | Tier 3 | Zero corpus occurrences | Separate source authority and backend decision. |
| One opaque rectangular SOLID stroke | Native | V1 required | Approved INSIDE/CENTER/OUTSIDE subset | Complete for bounded rectangle subset. |
| Multiple stroke paints | Approximated | V1 compatibility boundary | No real occurrence; compatibility loops SOLID layers | Preserve/diagnose until a source fixture establishes overlap/order. |
| Gradient strokes | Preserved only | Blocked by Phase 8 geometry | Zero corpus occurrences; resolved solid model drops them | Path coordinate space and gradient-on-path authority first. |
| Dash array/offset | Preserved only | Blocked by Phase 8 geometry | Zero real occurrences; raw observational slot only | Open/closed path geometry, scaling, corners, and offset source evidence. |
| Caps, joins, miters | Preserved only | Blocked by Phase 8 geometry | Zero real occurrences | Semantic open/closed paths and SVG feasibility first. |
| Per-edge stroke weights | Preserved only | Blocked by missing source authority | Zero occurrence; no strict per-edge contract | Exporter/source fixture before schema work. |
| Per-stroke opacity/blend | Approximated | V1 compatibility boundary | No multi-stroke source evidence | Ordered stroke owner; non-NORMAL blend remains Phase 9. |
| SHADER/VIDEO paint layers | Unsupported | Tier 3 | One of each in complex stacks | Not part of Phase 7 V1 ordered supported-paint subset. |

### Operational detail by audited capability

| Capability | Backend / runtime owner | Editability / export safety | Fallback, diagnostics, fixture coverage, and known difference |
| --- | --- | --- | --- |
| One opaque SOLID | DOM/CSS `PrimitiveAppearanceV1` | Color field partial; safe in certified subset | Complete primitive compatibility outside eligibility; bb/main/crop-3 regional evidence. |
| Ordered fill stack / source order | No general owner; future layered DOM/SVG owner | Source fields persist; export warning/unknown | Canonical/observational order survives. Compatibility fixed type selection is not order fidelity; eight real nodes, no isolated fixture. |
| Multiple SOLIDs | First visible SOLID CSS only | First color may be editable; export warns | Additional SOLIDs do not paint. No real fixture or specific ignored-layer diagnostic. |
| SOLID + linear | Whole primitive compatibility; isolated gradient owner disabled | No gradient edit; export warns | Both complex real examples are ambiguous. Future owner should consume certified gradient geometry. |
| SOLID + IMAGE | First SOLID background color plus first IMAGE background image | IMAGE field may edit media; export can succeed with approximate stacking | Existing media placement is authoritative, but array order/opacity is not. Five semantic nodes, six archive occurrences. |
| IMAGE + linear | No supported combined owner | Media may edit; export unknown | BB uses DARKEN and remains a Phase 9-blocked compatibility boundary. No NORMAL source-isolated fixture. |
| Per-paint visibility | Helpers filter hidden entries; primitive route rejects any hidden paint | No stack UI; export unknown | Preserve canonical value. No real hidden paint in corpus, so behavior is source-gated. |
| Partial SOLID opacity | First-SOLID CSS color | Color edit partial; export approximate | Alpha and paint opacity multiply, but no source-certified partial SOLID case. |
| Gradient paint opacity | Singular SVG gradient | No edit; safe in certified subset | Exact gradient-test-4 source and approved four-surface output. |
| IMAGE paint opacity | No per-layer owner | Image replace does not edit paint opacity; export unsafe/unknown | Value persists but background image opacity is not applied; no real occurrence or complete diagnostic. |
| NORMAL stack blending | Fixed compatibility background layers only | No stack editor; export approximate | Source-over order is not evaluated from array indices. Next fixture/owner. |
| Non-NORMAL paint blends | No explicit owner | No edit; export unknown | Preserve source; DARKEN occurs once. Phase 9 must define group isolation and local/nonlocal behavior. |
| Isolated linear gradient | One SVG definition/path | No edit; safe in certified subset | Whole-primitive compatibility on conflict/unsupported combination; two registered approved fixtures. |
| Radial/angular/diamond | No owner; future backend undecided | No edit; export unknown | Unsupported resolved fill warning and preservation. Zero real occurrences; each needs its own source gate. |
| One opaque rectangular SOLID stroke | DOM/CSS or singular SVG primitive owner | No edit; safe in certified subset | Stroke-test and regional primitive evidence; explicit geometry/revisions. |
| Multiple stroke paints | Compatibility border/shadow loop for SOLID entries | No edit; export warning | Primitive route rejects more than one. No real fixture; order/overlap not source-certified. |
| Gradient stroke | No resolved/runtime owner | No edit; export unknown | Non-solid stroke warning and preservation; zero real occurrences; Phase 8 path geometry first. |
| Dash array/offset | No semantic owner | No edit; export unknown | Raw observational preservation only; zero real occurrences; current solid fallback changes appearance materially. |
| Caps/joins/miters | No semantic owner | No edit; export unknown | Browser defaults or asset-owned SVG may differ; no real semantic-path fixture. |
| Per-edge weights | No strict/runtime owner | No edit; export unknown | Uniform weight fallback; raw candidate keys only, zero occurrences. |
| Per-stroke opacity/blend | SOLID compatibility CSS may apply opacity; no blend stack | No edit; export warning/unknown | No multi-stroke fixture. Non-NORMAL remains Phase 9. |
| SHADER/VIDEO stack paints | No strict semantic owner | No edit; export unknown | Normalization/preservation boundary only; one complex occurrence each, no V1 authority plan. |

## V1 decisions

### Required before Phase 7 V1 exit

1. Resolve ordered `NORMAL` fill stacks for the already supported paint families without changing source order.
2. Source-certify and route multiple SOLID layers first, including separate color alpha and paint opacity.
3. Extend the same ordered contract to a supported linear-gradient layer and to an IMAGE layer whose geometry is supplied by the existing Phase 6 media contract.
4. Apply per-paint visibility and opacity within that supported stack and use one shared primitive clipping geometry.
5. Publish one content-addressed stack identity across Validate, Fields, editor, shared live previews, PNG, save/reload, and offline rendering.
6. Add explicit diagnostics for layers that are preserved but cannot enter the supported owner. A boundary must never silently render a subset as though it were complete.

### Explicit V1 compatibility boundaries

- multiple/advanced strokes remain ordered and preserved but compatibility-owned until real usage and source fixtures exist;
- IMAGE opacity and IMAGE+gradient stacks may remain explicit compatibility when the next fixture cannot isolate them;
- non-NORMAL paint blends remain Phase 9 work;
- open-path dashes/caps/joins, gradient strokes, and per-edge weights remain Phase 8/source-gated;
- radial is Tier 2; angular and diamond are Tier 3;
- SHADER, VIDEO paint stacking, Canvas/WebGL, masks, effects, and general compositing are not Phase 7 V1 exit requirements.

## Dependency graph

```text
exact ordered-NORMAL source fixture
  -> source-indexed stack contract and provenance
  -> multiple SOLID layers
  -> per-paint visibility + color alpha + paint opacity
  -> one shared clip and singular layered owner
  -> supported linear-gradient layer
  -> existing MediaPlacementV1 as an IMAGE layer input
  -> all-surface / persistence / PNG evidence
  -> Phase 7 V1 exit review

Phase 8 semantic path geometry
  -> open/closed path ownership
  -> dashes + offsets
  -> caps + joins + miters
  -> gradient strokes

Phase 9 isolation/compositing
  -> DARKEN / MULTIPLY / SCREEN / OVERLAY / LIGHTEN
  -> nonlocal group and parent interactions
```

Do not attempt gradient strokes before path geometry, or non-NORMAL paint blending before the Phase 9 isolation contract. Do not use a mask-heavy source to authorize paint-stack clipping. Do not add Canvas because a future family might need it.

## Remaining Phase 7 completion sequence

1. **Fixture intake:** receive and hash-gate one isolated ordered-multiple-fills NORMAL ZIP with the evidence below. Audit only; close or keep open its source gate.
2. **Multiple-SOLID authority:** separately approve a production milestone for a source-indexed ordered stack, multiple SOLID layers, alpha/paint opacity, shared clipping, one owner, revisions, diagnostics, and all surfaces.
3. **Supported mixed-layer authority:** after source evidence, let the same stack owner consume the existing certified linear-gradient result and existing image-placement result. Neither sub-resolver may paint independently.
4. **Compatibility hardening:** ensure an unsupported layer makes the complete stack compatibility-owned with one deterministic reason; do not partially route around SHADER, VIDEO, non-NORMAL blend, unsupported masks/effects, or stale media/gradient revisions.
5. **V1 exit review:** require source pixels, structural stack order, singular ownership, resize, persistence/offline, all-surface/PNG identity, no existing-family regressions, and guarded reference review. Record advanced stroke/gradient/compositing boundaries as deferred rather than silently complete.

## Recommended next fixture

Choose candidate 1: **ordered multiple fills with `NORMAL` blending**.

Evidence for this choice:

- multi-fill nodes occur eight times across the 17 exact archives;
- SOLID+IMAGE appears on five semantic nodes and six archive occurrences;
- no archive contains any competing next-fixture candidate: radial gradient, gradient stroke, multiple stroke, dash, cap, or join;
- an ordered stack is the prerequisite for SOLID+linear, image overlays, per-paint opacity, and any later local blend work;
- the existing SVG gradient owner and Phase 6 media geometry can eventually become inputs to one layered owner without changing either semantic contract;
- the first implementation can stay bounded to multiple SOLIDs, avoiding premature Phase 8 or Phase 9 work.

## Exact fixture construction requirements

Provide one real Figma-exported ZIP, proposed filename `template-package-ordered-normal-fill-stack-test.zip`, with an embedded source `preview.png` and no live-render dependency on Figma.

Required package properties:

- one FRAME root with a known opaque canvas/background, fixed dimensions, exporter/package versions, and no fonts or editable fields unless unavoidable;
- isolated axis-aligned RECTANGLE or FRAME children only;
- no masks, effects, strokes, node opacity below 1, non-NORMAL blend, variables, components, SHADER, VIDEO, or vector ownership;
- every tested paint uses `blendMode:NORMAL`, with exact canonical and `extensions.figma.rawFills` order retained;
- selected-paint evidence or screenshots identifying the Figma bottom-to-top UI order and the exported array indices.

Required isolated cases:

1. two visible SOLIDs: opaque lower paint plus translucent upper paint;
2. a twin with the same two SOLIDs reversed, so order cannot be mistaken for commutative alpha;
3. three visible SOLIDs with distinct color alpha and paint opacity, including values below 1;
4. the same three-paint node with the middle paint hidden;
5. SOLID plus the already certified `GRADIENT_LINEAR` using transparent/partial-alpha stops and NORMAL blend;
6. SOLID plus a transparent PNG IMAGE using one simple imported FILL placement, so lower paint remains visible and order is testable;
7. IMAGE plus supported linear gradient using NORMAL blend, isolated from text/effects/masks;
8. uniform-corner and four-independent-corner controls proving one shared clip without seams;
9. a source-reviewed second size of one unchanged semantic stack, preserving paint values/order while bounds change.

For each case provide node ID, bounds, corner values, fill array, raw fill array, paint index, type, visibility, color/stop alpha, paint opacity, blend, transform where applicable, asset ID/hash/intrinsic dimensions, and source sample points. Prefer a transparent checker or geometric image asset whose alpha edges expose wrong ordering. The preview must leave padding between cases so region diffs cannot overlap.

The first production authorization after intake should cover only cases 1–4. Cases 5–7 may close later sub-gates within the same fixture family; their presence does not authorize mixed-layer pixels automatically.

## Phase 7 V1 exit criteria

Phase 7 may be presented for V1 exit only when:

- the supported ordered fill subset has a strict source-indexed canonical contract and a revisioned resolved result;
- every source paint remains preserved with provenance, including unsupported entries;
- supported multiple SOLID, certified linear-gradient, and image layers render in source order with NORMAL blending, separate alpha/opacity, and shared clipping;
- one runtime owner paints the stack; individual compatibility background/image/gradient owners are disabled for routed stacks;
- unsupported layers select one coherent compatibility boundary and produce developer diagnostics;
- Validate, Fields, editor, shared live previews, hidden PNG, save/reload, and offline rendering share the same stack identity and template-space geometry;
- resize, corner clipping, image readiness, gradient revision, and stale-result rejection are verified;
- approved primitive, media, mask, font/text, gradient, scene, and settlement evidence does not regress;
- any reference change is separately reviewed and promoted through the guarded workflow;
- advanced gradient families, open-path/advanced strokes, non-NORMAL blend, masks/effects, and offscreen compositing are explicitly recorded as Tier 2/3, Phase 8/9, or source-authority boundaries.

## Formal result

**Result B — Phase 7 requires additional bounded work.**

This document records the historical Result B that identified ordered NORMAL fill-stack authority as the V1 gap. The later intake family, Figma source contract, strict exporter-alias provenance, genuine reverse control, and final independent-corner ZIP close the bounded multiple-SOLID source gate as Result A on 2026-07-19. See `ORDERED_NORMAL_FILL_STACK_INTAKE.md`, `ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md`, Accepted ADR 0064, and Proposed ADR 0065. Production implementation remains separately unapproved.
