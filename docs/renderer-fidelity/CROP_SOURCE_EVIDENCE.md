# CROP Source Evidence

Status: coordinate/inversion evidence accepted. The superseding editable fixture certifies replacement/reset/persistence; interactive crop and source resize remain deferred.

The original `template-package-deal-of-the-week-banner-crop.zip` remains the historical static packet described below. `template-package-deal-of-the-week-banner-crop-2.zip` has exact SHA-256 `415062d2378194354f242dc643f965cbf7fa665ad3ecd034664d0211144b6382`, preserves the same main CROP matrix, and adds editable FILL/CROP/FIT fields. Its full replacement evidence is in [Editable Image Placement Evidence](IMAGE_REPLACEMENT_EVIDENCE.md).

## Exact fixture identity

| Property | Value |
| --- | --- |
| Fixture ID | `deal-of-the-week-banner-crop` |
| ZIP | `template-package-deal-of-the-week-banner-crop.zip`; 2,281,149 bytes; SHA-256 `611251da47e4eb64cc89074590a6718eef3af96c9f2f56f7f56ed29d53cbca80` |
| Embedded preview | `preview.png`; 1920×1080; SHA-256 `e1c5e96aa1c8efccb720e76ccd54afb3cb982f0d2c1a8c937fd501deb7168fe7` |
| Package/root | `pkg_429_39_1784231310726` / `429:39`; schema 1.0; exporter 0.6.0 |
| CROP node | `429:46`; `product-image`; 640×640 slot at root-relative (220,220) |
| Asset | `asset:image:ceab5479`; `assets/asset_decorative_image_top_001.png`; 1,441,382 bytes; SHA-256 `5dcfbc0b02a55dde8a347ca283dc1babb25958fbaa7e977d89e4d063286491f0`; 1125×750 |
| Font dependency | Rethink Sans 600 is unresolved and uses a recorded replacement; it does not affect the isolated image region |

The external filename changed during intake. The first observed archive was 2,281,466 bytes with SHA-256 `a0fdfc85115394afad54754cd5a520101a7ad683e55b9254dc07426361aeb26d`. It was replaced in place by the final archive above. The manifest binds only the final bytes; the earlier archive is not silently substituted.

## Coordinate model

The source `imageTransform` is:

```text
[[ 0.2578398287296295,  0.10524649173021317, 0.3574257791042328],
 [-0.15786972641944885, 0.3867596983909607,  0.23528368771076202]]
```

It maps normalized slot/node coordinates to normalized source coordinates. Its determinant is `0.11633728924870401`. The renderer inverts it once, at source-to-slot CSS placement, producing:

```text
[[3.324468886017723, -0.9046668734494826, -0.9753975235577061],
 [1.3570002141098325, 2.216312846850193, -1.0064891185004683]]
```

For the 640×640 slot and 1125×750 asset, the CSS matrix is:

```text
[1.8912534107123047, 0.7719823440269269,
 -0.7719823986768919, 1.8912536293121647,
 -624.254415076932, -644.1530358402997]
```

The normalized source polygon, retaining rotation rather than collapsing to an axis-aligned rectangle, is:

```text
(0.3574257791, 0.2352836877)
(0.6152656078, 0.0774139613)
(0.7205120996, 0.4641736597)
(0.4626722708, 0.6220433861)
```

Its bounding source rectangle is `(0.3574257791, 0.0774139613, 0.3630863205, 0.5446294248)`, or approximately `(402.1040, 58.0605, 408.4721, 408.4721)` source pixels. The destination bounds are approximately `(-1203.2412, -644.1530, 2706.6469, 2286.9204)` before the 640×640 rectangular slot clip.

## Current evidence

`pnpm image-placement:crop-evidence -- --fixture deal-of-the-week-banner-crop --run-id milestone-6-1-crop-611251 --surface png-export` retains the source preview, current candidate, whole-canvas and isolated crop diffs, derived geometry, and all-surface identity report under:

`fidelity/evidence/crop-source/milestone-6-1-crop-611251/deal-of-the-week-banner-crop/png-export/`

- Two captures of Validate, Fields, editor, and PNG are pixel-exact and structurally stable within each surface.
- All four surfaces retain the same raw matrix, source polygon, visible source rectangle, strategy, coordinate-space classification, and transform applicability. Slot/destination geometry agrees within 0.001 template pixels; editor and PNG are numerically identical.
- The isolated 640×640 source image region differs by 816/409,600 pixels (`0.19921875%`) at threshold 0.1. Visual review classifies this as browser/native resampling along high-frequency edges; crop direction, rotation, translation, scale, and landmarks agree.
- The whole canvas differs by 31.0358%. The dominant differences are existing solid-fill/background ownership: the source preview has a dark left background and olive right panel, while the current renderer paints a light left background and black right panel. Those paint differences are outside Milestone 6.1 and are not evidence against the crop.
- The visible Chromium review confirmed the same non-centred rotated crop. No reference was promoted.

## Certification boundary

The historical ZIP certifies static coordinate direction and one-time inversion. The superseding editable ZIP additionally certifies that replacement Fill/Fit ignore the imported matrix, reset restores it exactly, active authority persists through reload, and stale decode work is rejected. Preserve-crop replacement and replacement STRETCH are intentionally outside the corrected product contract. Interactive editor crop and source-defined resize semantics remain future work; MED-003 remains Approximated rather than Native.
