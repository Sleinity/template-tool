# ADR 0048: CROP transform is slot-to-source and inverted once

## Status

Accepted

## Context

The runtime affine CROP implementation existed with unit/static-render evidence, but no real exporter ZIP had established the matrix direction or coordinate space. Reversing the matrix, applying it twice, or interpreting normalized values as pixels can all produce plausible but incorrect crops.

## Evidence

The exact real ZIP `template-package-deal-of-the-week-banner-crop.zip` (SHA-256 `611251da47e4eb64cc89074590a6718eef3af96c9f2f56f7f56ed29d53cbca80`) declares `scaleMode=CROP` on node `429:46`, retains a finite non-identity rotated matrix, includes the 1125×750 source asset, and includes a source `preview.png`. Deriving the four source points by applying the raw matrix to the normalized 640×640 slot corners yields the visible landmarks and rotation in the preview. Inverting once and converting intrinsic source pixels to slot pixels yields the current DOM output. The isolated source region differs by 0.1992% at threshold 0.1; reversed or double-inverted alternatives do not produce the observed crop. Validate, Fields, editor, and PNG share the same semantic placement within 0.001 template pixels.

## Decision

For Figma `CROP`, the 2×3 `imageTransform` maps normalized node/slot coordinates to normalized source coordinates. The canonical/resolved contract preserves that direction. The renderer inverts the affine matrix exactly once when converting intrinsic source-pixel coordinates into slot-pixel CSS placement. Rectangular clipping is applied in slot coordinates after placement. FILL, FIT, and STRETCH do not consume this transform under ADR 0047.

## Alternatives

Treating the raw matrix as source-to-slot, applying no inverse, applying a second inverse in CSS, converting normalized translation directly to pixels before inversion, or replacing affine CROP with centred cover are rejected by the source preview and geometry evidence.

## Consequences

The static exported-slot CROP direction and inversion are source-grounded. Structural evidence must retain the rotated source polygon rather than replacing it with its axis-aligned bounds. Matrix determinant, inverse, source polygon/rectangle, destination geometry, clip bounds, and surface identity are retained in the CROP evidence packet. Resize and replacement semantics remain outside this decision because the fixture supplies neither an editable image field nor a second reviewed slot size.

## Compatibility impact

No production pixels change: the current generic CROP implementation already follows this model. The fidelity model now uses an inert test-only asset store so structural reports do not misclassify ZIP-backed assets as missing, and the browser report preserves the actual rotated polygon.

## Migration impact

Future canonical media work may adopt the same explicit coordinate-space label and revision telemetry. It must not infer different directions from fixture identity. MED-003 and MED-007 remain incomplete until source-authoritative resize/replacement evidence exists.

## Verification

`pnpm test` covers matrix validity, determinant, explicit direction, one inversion, and non-centred rotation. `pnpm fidelity:baseline -- --fixture deal-of-the-week-banner-crop --run-id milestone-6-1-crop-611251 --repeat 2` captured all four surfaces twice with exact repeat pixels and stable structure. `pnpm image-placement:crop-evidence` generated source/candidate/diff, geometry, and surface-identity reports. Visible Chromium review confirmed the candidate. No approved reference was updated.

## Reversal strategy

Revert the evidence-layer reporting changes and return this ADR to Proposed if a later exporter specification or stronger reviewed source fixture contradicts the coordinate model. Preserve both ZIP identities, raw matrix, preview, candidates, and diffs for comparison.
