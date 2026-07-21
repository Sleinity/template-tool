# Milestone 7.3 Linear-Gradient Fixture Gate

Status: closed for source authority; bounded Milestone 7.3A implementation completed separately  
Audit date: 2026-07-18  
Scope: `GRADIENT_LINEAR` fills only

The first post-gate intake, `template-package-adventure-travel-pinterest-pin-ad.zip`, is documented in [LINEAR_GRADIENT_INTAKE_EVIDENCE.md](LINEAR_GRADIENT_INTAKE_EVIDENCE.md). It corroborates one normalized vertical matrix against an independently exported SVG but does not supply the isolated G1–G10 cases.

The later `template-package-gradient-test.zip` is documented in [LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md](LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md). The user accepted it on 2026-07-18 as substantial but incomplete source authority. It supplies six clean root/rectangle cases and source-certifies most matrix, stop, alpha, non-square, rotation, and static size/aspect semantics. At that stage it lacked selected-handle evidence, paint opacity below 1, four independent radii, and a source-reviewed same-node resize state. Each supplement extends this evidence; it does not restart the audit.

The exact supplementary `template-package-gradient-test-2.zip` extends that evidence. It source-certifies independent-corner clipping through the existing Milestone 7.2 geometry and adds a strong 554×240 diagonal case. That intake remained open because no selected-handle evidence was supplied, the supposed opacity case uses node opacity 0.7 while paint opacity remains 1, and node `451:175` changes stop positions as well as size/transform. See the supplementary section in [LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md](LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md).

The exact `template-package-gradient-test-3.zip` plus the two hash-bound selected screenshots supersede the remaining handle/resize gaps from gradient-test-2. They prove start/end/third derivation and unchanged normalized gradient intent across a 554→710 width resize. Its attempted opacity correction changes both stop alphas to 0.8; raw/canonical paint opacity remains 1. At that intake point, the gate remained open on paint opacity only.

The final exact `template-package-gradient-test-4.zip` closes that sole remaining input. Node `457:46` isolates one raw and canonical `GRADIENT_LINEAR` paint at opacity 0.5, with node opacity 1, two fully opaque stops, no other fill/stroke/mask/effect, NORMAL paint blending, and a known opaque SOLID root background. Preview samples match straight RGB plus independent alpha, paint-opacity multiplication, and source-over within one channel. The cumulative fixture gate therefore closes as **Result A**. The later separately approved Milestone 7.3A registers the final two source fixtures and implements only this certified subset; reference approval remains separate.

## Decision boundary

Milestone 7.3 is the fixture-led source gate. Milestone 7.3A separately completed the bounded authority transfer described in [LINEAR_GRADIENT_RUNTIME_AUTHORITY.md](LINEAR_GRADIENT_RUNTIME_AUTHORITY.md). Existing compatibility output remains authoritative for every gradient node outside that exact capability subset.

This milestone excludes radial, angular, and diamond gradients; gradient strokes; multiple visible paints; non-NORMAL paint blend modes; effects; masks; image or shader stacks; arbitrary vectors; unsupported transforms; Canvas, WebGL, and offscreen compositing. Gradient evaluation before an already-supported node rotation and independent corner radii are in scope only for one otherwise eligible linear-gradient fill.

Approved renderer, scene, and settlement references are not fixture evidence and must not change during fixture intake or implementation without a later explicit review reason.

## Current repository evidence

The original exact registered-fixture and external-directory audit is retained below as historical gate evidence. At second supplementary intake, sixteen ZIP filenames are present in `/Users/niels/Documents/Templates`; only the explicitly supplied gradient-test archives were added to this evidence chain, and no similarly named archive was substituted.

| ZIP / exact identity | Gradient node | Preserved source evidence | Why it cannot certify Milestone 7.3 |
| --- | --- | --- | --- |
| `template-package-bb-cover-thing.zip`; 1,311,193 bytes; `7349496cd1cca9012d55791ac92b2d0d1ade2dc9fe204102b5074566ad06e4b3` | `421:25`, 1080×838 | two stops at 0.07/0.27; alpha 1→0; 2×3 transform `[[-4.4981e-16,-1,1],[0.99999988,-2.2192e-16,2.3571e-8]]` | The gradient is source index 2 after SOLID and IMAGE, uses `DARKEN`, and therefore depends on unresolved paint-stack and blend/compositing semantics. |
| `template-package-main-visual-section.zip`; 657,015 bytes; `c3562c456978758384ba592fd463ac30ec7b7566ee55a67068691d8d260331df` | root `2453:1435`, 1080×1230 | two stops at 0/0.5; alpha 1→0; the same 2×3 transform | The source stack is SOLID + exporter-only SHADER + gradient and the root clips content. The SHADER is intentionally removed from canonical fills and preserved as unsupported Figma data. |
| `template-package-adventure-travel-pinterest-pin-ad.zip`; 331,707 bytes; `5e3c2c71384f1e809e12331927f5b1dfaffb8e259e22aec007f6ec1abf7a6147` | VECTOR `I451:97;7:2`, 820×1020 | two opaque endpoint stops; raw matrix; independently exported SVG endpoints and preview samples | Useful partial evidence for one normalized vertical matrix, but the external SVG asset owns the pixels. No alpha/opacity, nonuniform stops, general transform, independent corners, resize, or isolated all-surface case exists. |
| `template-package-gradient-test.zip`; 470,098 bytes; `aa55a9c4413f72c443b646bcf257cc21e6fbb465e500da0decbe7cbb184b01f8` | root `451:135` plus five RECTANGLE nodes | six isolated gradients: vertical/non-square/static size pair, diagonal matrix, transparent stop, three stops, node rotation, uniform-radius clipping | Substantial partial authority. Missing selected-handle coordinates, paint opacity below 1, four independent radii, and source-reviewed same-node resize evidence. |
| `template-package-gradient-test-2.zip`; 588,502 bytes; `c2a41a23ed57651f50406bf645779191480eca38514c2a748cbe5b064ad6890a` | root `451:135` plus eight RECTANGLE nodes | nine isolated gradients; 554×240 diagonal; four independent radii; node-opacity control; same node ID across source revisions | Independent-corner source semantics close and diagonal non-square strengthens. Missing selected handles; paint opacity remains 1; resize node changes stops and transform, so controlled resize remains open. |
| `template-package-gradient-test-3.zip`; 611,320 bytes; `d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b` | same root/nodes; `451:175` at 710×240; `454:30` alpha revision | unchanged transform/stops across controlled resize; two selected-handle screenshots; uniform stop alpha 0.8 | Handles and resize close. Paint opacity remains 1, leaving one final source input. |
| `template-package-gradient-test-4.zip`; 193,635 bytes; `9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3` | RECTANGLE `457:46`, 710×880 | one raw/canonical gradient at paint opacity 0.5; node opacity 1; opaque stops; isolated appearance; known opaque background | Closes paint-opacity authority and therefore the cumulative source gate. Remains unregistered until separately approved implementation. |

This table records the accepted evidence chain. It is not permission to substitute or incorporate other similarly named archives from the external directory without an explicit intake request.

All tabled packages expose a source/canonical gap that a qualifying fixture must make testable:

- `extensions.figma.rawFills` preserves `gradientStops`, `gradientTransform`, visibility, opacity, blend mode, stop alpha, and source order;
- the corresponding validated `appearance.fills` entries preserve only type, visibility, opacity, blend mode, and source order for these exports;
- `PackageGradientPaint` and the strict schema allow `stops`/`gradientStops` and `transform`/`gradientTransform`, but current normalization does not hydrate them from `rawFills`;
- `CanonicalSceneGraphV1` and observational `PaintStackV1` therefore receive an incomplete canonical gradient entry while retaining the complete raw extension as provenance;
- `createResolvedRenderTree.resolveFill` emits `resolved-unsupported-fill` and no gradient CSS/SVG value;
- `TemplatePackageRenderer` may show the first visible SOLID compatibility fill, but has no linear-gradient pixel authority.

The source data is preserved, but there is currently no canonical or runtime gradient authority.

## Qualifying fixture package

Provide one real Figma-exported ZIP with an embedded `preview.png` and stable bytes. The preferred filename is `template-package-linear-gradient-test.zip`; exact filename is part of identity and similar names cannot substitute.

The package must have:

- one root with known dimensions, package ID, root node ID, schema/package-contract version, exporter/plugin version, and export timestamp;
- no fonts, images, vectors, masks, effects, blend modes other than NORMAL/PASS_THROUGH, shader paints, motion, variables, components, or network-time dependencies;
- an opaque ordinary root background so transparent stops have an unambiguous source-over reference;
- isolated axis-aligned FRAME or RECTANGLE cases, each with exactly one visible `GRADIENT_LINEAR` fill and no stroke;
- source node IDs, exact local bounds, raw and canonical paint entries, paint index, stop list, paint opacity, node opacity, radii, clip state, and transform/handle evidence;
- finite stop positions/colors/alpha and finite non-singular matrices where a transform is present;
- an embedded preview at exact template dimensions with clean non-overlapping crop regions for every case;
- either exported start/end/third handle coordinates or a retained Figma editor screenshot/probe showing the handles for each transform-sensitive node. Preview pixels alone are insufficient when two matrix directions could produce a plausible result;
- no live Figma requirement after import.

During the open gate, retain exact path, filename, byte size, ZIP/template/preview SHA-256, package ID, root ID, dimensions, exporter version, every case node ID, case bounds, stop/transform values, and reference-region bounds in the intake evidence. Do not add the package to `fidelity/fixtures.json` until the gate formally closes and a separate implementation approval authorizes registration. Any later registration must fail on every byte, root, dimension, version, node, stop, or transform mismatch.

## Required isolated source cases

Case labels below are fixture-documentation labels, never runtime routing inputs.

| Case | Required source construction | Semantic question isolated |
| --- | --- | --- |
| G1 — horizontal control | Opaque two-stop gradient, square node, start left/end right | Establish basic handle order, stop direction, endpoints, and edge colors. |
| G2 — vertical/reversed control | Asymmetric colors and unequal stop positions, start/end vertical or reversed | Prevent a visually plausible start/end swap or implicit 180° rotation. |
| G3 — diagonal non-square | At least 3:1 aspect ratio, visibly diagonal handles, asymmetric three-stop colors/positions | Distinguish normalized node space from pixels and expose CSS-angle/aspect distortion. |
| G4 — rotated handles | Non-axis-aligned start/end vector on a second non-square node | Prove angle derivation without introducing node rotation or transform ownership. |
| G5 — multiple stops | Three distinct opaque stops at nonuniform positions, including an interior position | Prove source order, exact positions, interpolation intervals, and no convenience redistribution. |
| G6 — stop alpha | Same RGB family with differing stop alpha over the known root background | Prove stop alpha and interpolation without an advanced blend mode. |
| G7 — paint opacity | Opaque stops with paint opacity below 1 over the known root background | Keep paint opacity separate from stop alpha and node opacity. Node opacity remains 1 in the certified subset. |
| G8 — genuine transform | A source-authored non-default `gradientTransform`, with handle evidence that is not equivalent to a simple horizontal/vertical control | Prove matrix direction, coordinate space, transform origin/order, determinant handling, and whether inversion is required. |
| G9 — independent corners | One eligible gradient rectangle with four unequal radii already covered by the Milestone 7.2 geometry contract | Prove gradient clipping to effective edge-local radii without introducing masks or strokes. |
| G10 — size/aspect pair | The same gradient definition on two source nodes with materially different width/height | Establish source behavior across size and aspect without relying only on a synthetic resize. |

For stable live resizing, the harness must additionally change the eligible node or root size through the existing application path, capture the current normalized gradient geometry, restore the original size, and prove deterministic return. Source certification of a second live size requires a second reviewed Figma source state; without one, the live resize proves deterministic semantic recomputation, not source-pixel equivalence at that unreviewed size.

## Source conclusions and implementation contract questions

The accepted source chain answers the coordinate, matrix, handle, non-square, stop, color/alpha, opacity, corner, rotation, and resize questions below. Canonical raw-to-paint pairing, malformed-data policy, runtime-owner selection, revision identity, and cross-surface verification remain implementation-contract work; they do not reopen the source gate.

1. **Canonical source selection.** How a stripped canonical `GRADIENT_LINEAR` entry is paired by source index with `extensions.figma.rawFills`, and whether `gradientStops` or the compatibility alias `stops` wins if both exist or conflict.
2. **Coordinate space.** Whether stop handles and the 2×3 matrix are normalized to node-local bounds, expressed in local pixels, or use another exported paint space.
3. **Matrix direction.** Whether `gradientTransform` maps canonical gradient space to node space or node space to gradient space, and whether any inversion occurs. Crop-matrix findings must not be reused by analogy.
4. **Handle derivation.** Exact start, end, and third-handle meaning, including direction, perpendicular axis, origin, and how the exported matrix relates to those handles.
5. **Non-square geometry.** Whether the gradient vector is transformed before or after width/height scaling, and how Figma angle maps to CSS/SVG coordinates without aspect-ratio distortion.
6. **Stop evaluation.** Preservation of declared order and positions, behavior at endpoints, equal/out-of-range positions if the exporter can emit them, and whether normalization is permitted.
7. **Color and alpha interpolation.** Source color encoding, stop-alpha interpolation, paint-opacity multiplication, and the observable result over the fixture's opaque background. Advanced blend/compositing modes remain excluded.
8. **Transform applicability.** Whether every linear gradient carries a matrix or only source-transformed cases do, how identity/default transforms are recognized, and how malformed/singular data falls back.
9. **Corner clipping.** Whether the gradient is evaluated in the full node box and then clipped to effective radii, rather than recalculated inside an inset or mask box.
10. **Resize authority.** Which values remain normalized intent and which geometry recomputes from current settled bounds; stale original-size CSS lengths may not survive a resize.
11. **Runtime owner.** Whether one CSS linear gradient can express the certified subset exactly or an SVG gradient is required. Backend selection follows evidence; ADR 0012 remains Proposed and Canvas is not a candidate in this milestone.
12. **Surface/export identity.** Which versioned gradient identity and geometry must be shared by Validate, Fields, editor, live previews, and hidden PNG export, and what readiness rejects stale bounds or paint revisions.

## Proposed authority-transfer boundary after gate closure

If the fixture qualifies, implementation may be proposed for one visible `GRADIENT_LINEAR` fill on an otherwise Milestone 7.2-eligible axis-aligned rectangle/frame, with NORMAL/PASS_THROUGH blending, no stroke/effect/mask/media/vector owner, supported uniform or independent corners, finite supported stop/matrix data, and current settled bounds.

The future versioned result must retain raw and canonical paint values, source index, normalized handles or equivalent source vector, raw matrix, determinant/inverse stage if applicable, stop order/positions/colors/alpha, paint opacity, source and current bounds, clip geometry, selected backend, fallback reason, provenance, and package/scene/geometry/paint/settlement revisions. Exactly one owner may paint it; compatibility SOLID and gradient output cannot coexist accidentally.

Unsupported combinations remain whole-primitive compatibility-owned. No partial gradient is applied when source pairing, coordinate space, transform, stop data, opacity, geometry, or revision is unresolved.

## Required evidence after implementation

- exact fixture baseline and hash gate;
- pure source-to-canonical pairing and provenance tests;
- handle/matrix/stop/opacity geometry tests for every required case;
- normal, malformed, singular, missing, and unsupported fallback tests;
- independent-corner clip and live-resize tests;
- two-pass Validate, Fields, editor, shared-preview, and real PNG captures;
- template-space gradient identity across surfaces;
- source-region pixel and structural comparisons per isolated case;
- save/reload and offline capture with zero renderer-time Figma requests;
- regression captures for every existing fixture, especially Milestone 7.2 strokes;
- performance and production bundle delta;
- guarded renderer, scene, and settlement comparisons with no update command.

Reference promotion remains a separate user decision after review of source regions, full canvas, structure, environment, and fallbacks.

## Gate decision and next boundary

The cumulative exact source chain closes coordinate, handle, transform, stop, alpha, paint-opacity, corner, rotation, and resize authority for the isolated subset. Complete measurements and alternative-model errors are in [the intake evidence](LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md) and its machine-readable audits.

Production gradient support remains `Preserved only`. The smallest separate authority-transfer proposal is [Milestone 7.3A](LINEAR_GRADIENT_IMPLEMENTATION_PLAN.md): one source-indexed canonical contract, one revisioned resolved geometry result, and one singular capability-selected SVG primitive owner for isolated `GRADIENT_LINEAR` fills. It requires separate approval before code, fixture registration, candidates, or reference review.
