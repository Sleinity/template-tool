# Linear-Gradient Runtime Authority

Status: source-certified and implemented for the bounded Milestone 7.3A subset on 2026-07-18  
Runtime owner: one SVG primitive path and one SVG `linearGradient` definition  
Reference status: eight reviewed renderer references approved and promoted; scene and settlement references unchanged

## Eligibility boundary

Runtime authority transfers only when one visible ordinary paint on an otherwise eligible FRAME or RECTANGLE is `GRADIENT_LINEAR` and all of the following are true:

- canonical and raw Figma evidence pair by the same source paint index;
- the source record has no canonical/raw conflict;
- exactly two or three stops have finite, strictly increasing positions in `[0,1]` and finite RGBA channels in `[0,1]`;
- the finite 2×3 affine transform has a nonzero determinant;
- paint opacity is finite in `[0,1]`, paint blend is `NORMAL`, and node opacity is 1;
- there is no additional visible/hidden paint, stroke, mask-input role, effect, media/vector owner, shader, or unsupported compositing input;
- geometry is an eligible rectangular primitive with uniform or four source-certified independent corners and either axis-aligned geometry or the source-certified pure-rotation case.

The whole primitive remains compatibility-owned when any condition fails. The renderer never mixes a partly routed gradient with compatibility appearance.

## Canonical source contract

`PackageGradientPaint.linearGradientSource` is a strict `linear-gradient-source-v1` record. Source normalization hydrates canonical `gradientStops` and `gradientTransform` only from the raw paint at the same source index. It records canonical/raw paths, alias sources, source-index pairing, normalization revision, and conflicts.

`extensions.figma.rawFills` remains preserved. Exporter-only stop metadata is not admitted into strict canonical stops. A populated canonical value is never silently replaced by conflicting raw data; the conflict blocks authority transfer.

## Matrix and geometry contract

The exported matrix `M` maps normalized node-local coordinates to normalized gradient coordinates. The resolver validates and inverts it once:

```text
start = M^-1(0, 0.5)
end   = M^-1(1, 0.5)
third = M^-1(0, 1)
```

`ResolvedLinearGradientGeometryV1` retains the raw matrix, determinant, inverse, inversion count, normalized handles, template-space handles, SVG user-space transform, stops, paint opacity, capability, owner, fallback, source revision, geometry revision, and provenance.

Normalized intent is immutable across resize. Template handles and the SVG transform recompute from current settled width and height. The source revision remains stable; the geometry revision changes. No exported source-size pixel vector becomes live resize authority.

## Color and opacity contract

Stops retain declared order and positions. SVG declares `color-interpolation="sRGB"`. Stop RGB and stop alpha remain separate. Each stop publishes its source RGB and `stop alpha × gradient paint opacity`; SVG then source-over composites the result. Node opacity below 1 and non-NORMAL blends remain outside this route. ADR 0072 reuses the same resolved gradient as source index 1 only inside the separately gated SOLID-below-linear NORMAL stack; it does not broaden isolated-gradient eligibility.

## Singular rendering and clipping

The authoritative backend emits one SVG with `gradientUnits="userSpaceOnUse"`, one deterministic React-root-safe definition, and one source-certified rounded-rectangle path. It emits no CSS gradient, compatibility background fill, duplicate radius owner, or second visible paint.

Gradient evaluation occurs in node-local space. The uniform or edge-locally normalized independent-corner path clips it. The outer node applies its transform afterward. This is not Canvas, offscreen rendering, masking, or general compositing.

## Revision and surface authority

Source and geometry revisions flow through `ResolvedRenderTreeV1` and `PrimitiveAppearanceV1`. If a supplied resolved primitive no longer matches the current canonical gradient-bearing node, `TemplatePackageRenderer` recomputes from current canonical input and refuses to publish the stale gradient result.

Validate, Fields, editor, shared live preview integrations using `TemplatePackageRenderer`, and hidden PNG export consume the same source/geometry identity. Test-only telemetry records matrix, inverse, handles, transform, stops, opacity, owner, fallbacks, revisions, and actual SVG output.

## Diagnostics and fallback

Supported nodes emit resolved-gradient evidence. Unsupported cases retain specific developer reasons for missing source pairing, conflict, invalid/singular transform, invalid stop count/order/position/color, invalid opacity, blend, mixed paints, stroke, node opacity, mask, effect, media/vector owner, or geometry. User-facing Validate diagnostics remain separate.

## Source evidence

Registered exact fixtures:

- `gradient-test-linear`: ZIP `d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b`, nine cases, 1000×1500;
- `gradient-test-paint-opacity`: ZIP `9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3`, isolated 0.5 paint opacity, 1000×1500.

Two-pass headless capture is exact within each surface. Source versus PNG is 3 changed pixels / 0.0002% for the nine-case fixture and exact for paint opacity. The three pixels are isolated raster-edge antialiasing; no correction rule or tolerance change was added. Save/reload with Figma blocked preserves identity and makes zero renderer-time requests. A visible Chromium persistence run also passes.

Artifacts:

- `fidelity/candidates/milestone-7-3a-linear-gradient/`
- `fidelity/candidates/milestone-7-3a-linear-gradient-compare/`
- `fidelity/evidence/milestone-7-3a-gradients/milestone-7-3a-linear-gradient/`
- `fidelity/evidence/milestone-7-1-primitives/milestone-7-3a-gradient-headless/`
- `fidelity/evidence/milestone-7-1-primitives/milestone-7-3a-gradient-headed/`

All eight fixture/surface renderer references were separately approved after Result A visual review and promoted from run `milestone-7-3a-all-regression` through the guarded reasoned workflow. The three deterministic rounded-edge source residual pixels remain accepted without tolerance or correction logic. Scene and settlement references were not promoted. This approval does not broaden the runtime subset described here.

## Deferred cases

Radial, angular, and diamond gradients; gradient strokes; more than three or non-strictly ordered stops; other color spaces; mixed paint stacks outside the exact ADR 0072 pair; non-NORMAL blend; node opacity below 1; masks; effects; shaders; arbitrary vectors; unsupported affine geometry; Canvas/WebGL; and general compositing remain compatibility-owned or unsupported.
