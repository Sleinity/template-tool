# Template Package Vector Rendering

The embedded SVG asset is the visual source of truth for `SVG_ASSET` and
`FLATTENED_SVG` nodes. Package node bounds remain authoritative for placement
and size in both renderer modes.

## Rendering strategy

- `asset.svgString` is preferred and converted to a safe SVG image data URL.
- A safe SVG `dataUrl`, embedded `data`, or remote vector URL is the fallback.
- `vector.fit: FIGMA_BOUNDS` fills the package node viewport. The SVG's own
  `viewBox` and `preserveAspectRatio` control geometry inside that viewport.
- Asset width and height are intrinsic metadata and never replace node bounds.
- Opacity, visibility, stacking, clipping, transforms, Auto Layout, and
  absolute constraints are applied by the normal package node wrapper.
- Static mode keeps snapshot bounds. Editor mode uses the existing live layout
  and constraint model without vector-specific positioning rules.

## Intentional limits

The renderer does not edit paths, recolor individual paths, reconstruct vector
networks, rebuild boolean-operation trees, morph geometry, or animate path
data. Those capabilities would require structured path-level data. The
exported SVG is sufficient for faithful visual rendering without that extra
complexity.

`SEMANTIC_SHAPE` metadata is preserved. Rectangles and ellipses use existing
CSS appearance rendering; more complex semantic shapes currently produce a
compatibility warning instead of guessed geometry.
