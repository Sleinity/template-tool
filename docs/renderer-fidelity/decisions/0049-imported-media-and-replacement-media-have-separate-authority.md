# ADR 0049: Imported media and replacement media have separate authority

## Status

Accepted

## Context

The source package can assign CROP, FIT, or FILL independently to image nodes that share one binary asset. The previous editor inferred replacement behavior from field constraints and could preserve a source CROP transform after a user uploaded a different image. That conflated immutable Figma placement with editor-authored replacement placement and allowed delayed image decoding to publish after a newer reset.

## Evidence

The exact `template-package-deal-of-the-week-banner-crop-2.zip` archive (2,258,157 bytes; SHA-256 `415062d2378194354f242dc643f965cbf7fa665ad3ecd034664d0211144b6382`) contains editable fields `top`/`429:43`, `main`/`429:46`, and `bottom`/`429:49`. All three use asset `asset:image:ceab5479`, yet their source modes are FILL, CROP, and FIT. The main field retains the source-certified affine matrix from ADR 0048. Headless and visible Chromium runs exercised Fill, Fit, Fill-after-Fit, reset, save/reload, rapid replacement, reset-before-decode, and real PNG export for every field.

## Decision

Imported image semantics and active editor replacement semantics are stored separately. `image.scaleMode`, `image.imageTransform`, and their provenance remain immutable imported source intent. Optional `image.activePlacement` owns the active state and a monotonic revision:

- `imported-source`: use the source node/paint mode; only source CROP may activate `imageTransform`;
- `replacement-fill`: use one aspect-preserving cover operation and ignore imported transforms;
- `replacement-fit`: use one aspect-preserving contain operation and ignore imported transforms;
- `editor-crop`: reserved and unimplemented; it cannot reuse imported CROP authority.

Older packages without the property resolve to `imported-source`. A legacy replacement asset without explicit state deterministically migrates to Fill, or Fit only when an existing contain rule supplies that evidence. Reset restores the imported asset and exact source semantics while issuing a new placement revision. Per-field operation revisions reject stale file-read and decode results.

This decision supersedes ADR 0047's temporary fixed-FILL compatibility exception: the new real fixture proves that FILL ignores `imageTransform` regardless of fixed or dynamic sizing. The raw matrix remains provenance.

## Alternatives

Preserving the original crop on replacement, storing only one mutable scale mode, making placement asset-global, inferring behavior from the original source mode, and reusing imported CROP as a future editor crop are rejected.

## Consequences

Replacement uploads default to Fill and expose only Fill/Fit active controls. The canonical scene, resolved tree, routing identity, renderer attributes, fidelity structure, persistence, and PNG source metadata carry active state and revision. Fixed FILL packages may now differ from historical renderer references; source evidence, not those historical pixels, governs the correction. Approved references remain unchanged pending review.

## Compatibility impact

Canonical schema remains strict and adds one optional object. Imported packages are byte-compatible. Existing persisted replacements lacking explicit state get a deterministic legacy migration rather than preserving a CROP transform. No mask, effect, gradient, Canvas, or crop-tool capability is added.

## Migration impact

Persisted packages naturally acquire explicit state on the next replacement, mode switch, or reset. Future editor crop work must introduce editor-owned transform/focal/zoom data under `editor-crop`; it must not mutate or appropriate imported Figma data.

## Verification

`pnpm image-placement:replacement-authority` passes all three real fields in headless and visible Chromium. The final headless packet is `fidelity/evidence/image-replacement/milestone-6-1-editable-replacement-final/`. Unit tests cover source parsing, strict serialization, shared-asset independence, Fill/Fit switching, transform inapplicability, revision increments, CROP reset, persistence, and renderer identity. No update command was run.

## Reversal strategy

Remove explicit active-state resolution and return this ADR to Proposed only if stronger source/product evidence requires a different replacement contract. Preserve the ZIP, source preview, raw transforms, candidates, diffs, and replacement evidence before reversal.
