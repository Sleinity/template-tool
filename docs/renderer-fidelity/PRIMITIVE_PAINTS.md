# Primitive Geometry, Paint, and Stroke Authority

Milestone 7.1 transfers a bounded real-fixture-backed primitive subset from duplicated compatibility CSS to `PrimitiveAppearanceV1`. Milestone 7.3A extends the same singular-owner model to isolated source-certified linear gradients. Milestone 7.4 extends it to eligible ordered multiple-SOLID NORMAL stacks. ADR 0072 adds the exact issue-packet-led SOLID-below-linear NORMAL pair through one shared SVG owner. None of these milestones generalizes masks, effects, blend modes, arbitrary vectors, or compositing.

Milestone 7.2 resumed on 2026-07-17 after receipt of the exact `stroke-test-primitives` ZIP. It source-certifies independent corners, Figma edge-local radius clamping, opaque uniform rectangular `CENTER` and `OUTSIDE` strokes, singular DOM/SVG ownership, and ancestor-clipping interaction. See the [stroke geometry contract](PRIMITIVE_STROKE_GEOMETRY.md), the [closed fixture gate](PRIMITIVE_STROKE_FIXTURE_GATE.md), and ADRs 0057–0061.

## Data flow and ownership

`workingPackage source semantics -> CanonicalSceneGraphV1 geometry/appearance/provenance -> ResolvedRenderTreeV1.primitiveAppearance -> current settled bounds -> capability-selected DOM/CSS or SVG owner -> Validate / Fields / editor / previews / PNG`

Canonical scene remains semantic authority. `PrimitiveAppearanceV1` is the versioned resolved projection consumed by rendering. It records source and settled bounds, local/effective transform evidence, clipping, raw/effective radii, ordered paint/stroke entries, alpha and opacity layers, backend, capability, provenance, fallbacks, and independent source/geometry/paint/stroke revisions. Browser bounds are evidence only.

An authoritative primitive disables compatibility fill, radius, and stroke output. A node can never paint simultaneously through compatibility and routed CSS, CSS and SVG, or ordinary paint and mask input.

## Source-certified subset

The exact property gate is:

- source node is an axis-aligned `FRAME` or `RECTANGLE`;
- it is not a mask input, media/vector visual owner, or effect owner;
- node opacity is 1 and node/paint blend is supported NORMAL/PASS_THROUGH;
- either zero/one visible opaque NORMAL `SOLID`, one certified isolated linear gradient, two-or-more SOLIDs with current unambiguous apply-once opacity provenance and NORMAL blending, or the exact certified two-layer pattern of one such SOLID at source index 0 followed by one certified visible NORMAL linear gradient at source index 1;
- uniform or independent radii, normalized from current settled width/height using the source-certified edge-local Figma rule;
- zero or one visible stroke, and if present it is an opaque NORMAL uniform `SOLID`, `INSIDE`, `CENTER`, or `OUTSIDE`, not dashed, and not declared layout-included;
- expanded `CENTER`/`OUTSIDE` strokes do not combine with primitive self-clipping in the routed subset; ancestor clipping remains independently supported.

The ordinary SOLID uses the selected primitive owner. Uniform INSIDE keeps one CSS inset shadow. Independent-corner INSIDE and eligible CENTER/OUTSIDE use one SVG fill path plus one stroke path. No CSS border changes layout. Fill, clipping, stroke edges, and telemetry share one effective corner tuple; stroke visual bounds remain separate from layout bounds.

Canvas background is a separate `PrimitiveCanvasAuthorityV1`. Template canvas, root fill, frame fill, editor stage, inspection stage, and PNG treatment are never collapsed into one inferred color.

## Ordered paint and opacity contract

Every source entry retains its exact array index. Index 0 is backmost and increasing indices move toward the front; a genuine reverse control confirms direction. Strict `solid-paint-source-v1` provenance supplies apply-once opacity authority. `ResolvedOrderedSolidStackV1` retains all entries, including hidden paints, and selects one SVG group/clip owner only for the complete eligible stack. Entries are never sorted or reversed by type. Accepted ADR 0065 and `ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md` govern the implemented subset.

The contract keeps source color alpha, paint opacity, node opacity, parent/group opacity, mask opacity, and blend mode separate. The ordered-stack route applies canonical color alpha × paint opacity exactly once, requires node opacity 1, and source-certifies hidden, transparent, and partial-opacity SOLID layers. Node opacity below 1 remains compatibility-owned.

`mask-input` remains semantic input owned by the Milestone 7 mask route and cannot become ordinary RGB. Ordinary same-colored paints remain visible.

`ResolvedOrderedNormalPaintStackV1` is a separate narrow mixed-family contract. It reuses the accepted SOLID and gradient layer semantics, retains source index 0→1 back-to-front order, applies each opacity once, and selects one `ordered-normal-paint-svg` group plus one shared primitive clip. Reversed/additional layer patterns and every IMAGE, hidden mixed layer, non-NORMAL, node-opacity, mask, effect, stroke, or general compositing combination remain compatibility-owned.

## Real fixture audit

### `bb-cover-thing-primitives`

- Path: `/Users/niels/Documents/Templates/template-package-bb-cover-thing.zip`
- Size / ZIP SHA-256: 1,311,193 / `7349496cd1cca9012d55791ac92b2d0d1ade2dc9fe204102b5074566ad06e4b3`
- Package/root/exporter: `pkg_421_19_1784061375618` / `421:19` / 0.6.0; 1080×1350
- Preview/template SHA-256: `671b2658e56604a070bc40e3fc356ef7581782662b1848005799a11471c321d8` / `e2f4d978fe1f3c3201d1ad9d014b23b8b132f05d60df4bb007f22a59260b60d1`
- Source regions: canvas black; frame `421:21` opaque `#171717`; CTA `421:27` 179×96, white INSIDE stroke 2.400000095px, radius 16; `421:29` radius 999 clamps to 48.
- Regional authority only: `421:25` contains SOLID + IMAGE + GRADIENT_LINEAR/DARKEN, so full-canvas approval is forbidden.

### `main-visual-section-primitives`

- Path: `/Users/niels/Documents/Templates/template-package-main-visual-section.zip`
- Size / ZIP SHA-256: 657,015 / `c3562c456978758384ba592fd463ac30ec7b7566ee55a67068691d8d260331df`
- Package/root/exporter: `pkg_2453_1435_1784061043132` / `2453:1435` / 0.6.0; 1080×1230
- Preview/template SHA-256: `3a4318ac27e83f251ed38ff442b87f3d60458d21c06c2866694e24e63f339095` / `078af8df6e2adf894bf3c6cb3afae75c239812de5348111fb7c637df59aee18b`
- Source regions: fixed frame `2453:1436` 96×96, white INSIDE stroke 2.400000095px, radius 999 clamps to 48; frame `2453:1441` opaque white, radius 16.
- Regional authority only: root SOLID + exporter `SHADER` + GRADIENT_LINEAR and rotated vector `2453:1437` CENTER stroke remain unsupported/compatibility.
- The exporter-only `SHADER` paint is preserved under `extensions.figma.unsupportedPaints` at normalization and removed before strict canonical validation. Validation was not weakened.

### `stroke-test-primitives`

- Path: `/Users/niels/Documents/Templates/template-package-stroke-test.zip`
- Size / ZIP SHA-256: 32,574 / `53564876e6bf9d9924528eefbbd8eea9ab8f176bb91bef731c0f9785c3b3eb29`
- Package/root/exporter: `pkg_443_87_1784276898719` / `443:87` / 0.6.0; 1200×630
- Preview/template SHA-256: `8fb0bca096694f177f02871fa4dd775b8ae51c7fc510bfcf4b848a1a17e1c4be` / `28b6720e417ea339a432ff79f127b34a191801c975e121c73a4ac0d18f0c75a9`
- Source nodes: `443:88` INSIDE control; `443:89` CENTER with 10/0/0/0 corners; `443:90` OUTSIDE clipped by ancestor `443:92`; `443:94` 40/20/80/8 corners; `443:95` 999/999/0/999 edge-local normalization.
- The clean full canvas is authoritative for this bounded family: it contains no asset, font, gradient, mask, effect, blend, vector, or transform dependency.

No audited real ZIP provides a clean authoritative case for hidden paints, multiple visible solids, node/group opacity, hidden/partial/multiple/gradient strokes, independent stroke weights, dashes/caps/joins, layout-included expanded strokes, or self-clipped expanded strokes. Linear-gradient paint opacity is certified only inside the isolated Milestone 7.3A route.

## Evidence and residual pixels

Final headless all-fixture run: `fidelity/candidates/milestone-7-1-all-final-3/`. Final visible profile: `fidelity/candidates/milestone-7-1-primitives-headed-final/`. Both primitive fixtures are structurally and pixel-repeat stable across Validate, Fields, editor, and PNG in each profile.

Source packet: `fidelity/evidence/milestone-7-1-primitives/`. On the isolated rounded-stroke perimeter at threshold 0.1:

- `421:27`: previous 845 changed pixels (4.9174% of the 179×96 crop), current 272 (1.5829%);
- `2453:1436`: previous 683 (7.4110% of the 96×96 crop), current 210 (2.2786%).

Remaining perimeter differences are raster-edge/antialiasing evidence. Full node regions also include text or an unsupported rotated vector and are therefore not stroke-only authority. Full canvases contain unrelated unsupported appearance and remain non-authoritative.

Headless and visible save/reload runs `milestone-7-1-primitives-reload-*-final` retain identical source/geometry/paint/stroke identities with the Figma endpoint blocked and zero renderer-time Figma requests.

Milestone 7.2 final source packet: `fidelity/evidence/milestone-7-2-strokes/milestone-7-2-final-edge-local/`. Full-canvas source mismatch falls from 13,193 pixels (1.745106%) to 18 (0.002381%). INSIDE control, CENTER, four-corner, and extreme-normalization regions are pixel-exact. The OUTSIDE region retains 18 pixels (0.043253%) on the source ancestor-clipped SVG raster edge. Headless and visible all-surface captures repeat exactly; save/reload with Figma blocked preserves identity and makes zero Figma requests.

Local pure-resolution microbenchmarks cover geometry/corners, ordered paints/strokes, and backend selection together: bb-cover 0.2648 ms/tree, main-visual 0.1104 ms/tree, and stroke-test 0.1215 ms/tree (0.01736 ms/node). Full stroke-test resolved-tree construction averages 0.347 ms. These are local evidence, not budgets; heap deltas include repeated tree allocations and GC noise.

## Compatibility and future fixtures

Fallback is coherent for the complete primitive when an unsupported property could produce duplicate output. Multiple paints require explicit source order/compositing evidence. The closed gate and [runtime contract](LINEAR_GRADIENT_RUNTIME_AUTHORITY.md) authorize isolated `GRADIENT_LINEAR`; [ADR 0072's bounded contract](ORDERED_SOLID_LINEAR_RUNTIME_AUTHORITY.md) additionally authorizes exactly one SOLID below one linear gradient. All other layered gradients and mixed families remain compatibility-owned. Canvas/WebGL remain deferred; ADR 0012 stays Proposed.

Evidence commands never alter approved references:

```sh
pnpm primitives:source-evidence -- --run-id milestone-7-1-all-final-3
pnpm primitives:stroke-source-evidence -- --run-id milestone-7-2-final-edge-local
pnpm primitives:performance
pnpm primitives:browser-scenarios -- --fixture stroke-test-primitives --run-id milestone-7-2-reload-headless
pnpm primitives:browser-scenarios -- --fixture stroke-test-primitives --run-id milestone-7-2-reload-headed --headed
```
