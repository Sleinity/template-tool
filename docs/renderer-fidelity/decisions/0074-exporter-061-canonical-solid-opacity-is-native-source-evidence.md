# ADR 0074: Exporter 0.6.1 canonical SOLID opacity is native source evidence

Status: Accepted  
Date: 2026-08-31

## Context

Figma exporter 0.6.1 writes canonical SOLID paints with `color.a = 1` and
Figma paint transparency in `paint.opacity`. The existing ordered-SOLID and
SOLID-plus-linear capability gates required `solid-paint-source-v1`, even
though that record exists to repair or classify exporter 0.6.0 source. Clean
0.6.1 paints therefore fell back solely because they did not need a historical
repair.

The exact 0.6.1 mixed fixture proves that its gradient layers already satisfy
the accepted linear-gradient contract and that the existing ordered SVG owner
can paint the complete supported pair. The missing input is native SOLID
opacity evidence, not a new renderer.

## Decision

The primitive resolver may derive renderer-internal
`native-canonical-source` SOLID evidence only when:

- `source.type` is `figma` and `source.pluginVersion` is exactly `0.6.1`;
- the canonical paint is a valid SOLID with `color.a === 1`, finite unit paint
  opacity, and supported visibility and NORMAL blend semantics;
- no `solid-paint-source-v1` record or known conflict is present;
- absent same-index raw SOLID evidence is accepted; when it is present, its
  type, color, opacity, visibility, and blend mode must agree exactly with the
  canonical paint.

The derived record uses `canonical-paint-opacity`, a content-addressed evidence
revision, and a null normalization revision. It does not mutate the canonical
package or fabricate `solid-paint-source-v1`.

The superseded mixed export retained higher-precision raw SOLID RGB beside
rounded canonical RGB and therefore remained compatibility-owned. The corrected
export preserves exact source RGB in both representations and passes this gate.
This ADR does not add a SOLID color normalizer or an approximate comparison.

## Consequences

- Existing ordered SOLID and exact SOLID-below-linear owners can admit clean
  0.6.1 constituents without changing their geometry, composition, or backend.
- Exporter 0.6.0 continues to require the bounded compatibility evidence from
  ADR 0064. Unidentified and future exporter versions do not inherit this rule.
- Isolated translucent SOLIDs remain on their existing compatibility renderer.
- The canonical schema and supported public SDK are unchanged. The new evidence
  is package-private renderer data.
- Reversed/additional mixed layers, IMAGE layers, non-NORMAL blending, node
  opacity, masks, effects, strokes, and other gradient families remain outside
  the certified subset.

## Evidence

- Clean SOLID ZIP: 29,853 bytes, SHA-256
  `7e09ef2d2d8dc7eab18584305558bd02ffd3d88945b848b47908060b185a9160`.
- Corrected gradient/mixed ZIP: 444,990 bytes, SHA-256
  `e55ae505921d0026d9508168dba46f2c53ddf74381a120f16a0b90429d61fe8b`.
- Mixed nodes `811:459` and `811:460` select
  `source-certified-solid-linear-normal-stack` / `ordered-normal-paint-svg`;
  isolated gradients `811:461` and `811:462` retain `linear-gradient-svg`.
- Four-surface run `exporter-061-corrected-source-gate` is repeat-stable and its
  PNG is pixel-exact against the embedded preview.
- Both ZIPs pass strict import, canonical validation, resolved-tree creation,
  and the exact realistic-ZIP lifecycle without a reference update.
