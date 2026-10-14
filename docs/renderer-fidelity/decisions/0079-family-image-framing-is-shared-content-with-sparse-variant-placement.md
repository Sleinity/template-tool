# ADR 0079: Family image framing is shared content with sparse variant placement

- Status: Accepted
- Date: 2026-09-04

## Context

One replacement photograph may serve Square, Portrait, and Landscape Family
variants while requiring deliberate framing per format. A single shared Crop
cannot represent that art direction, but duplicating the asset per variant
would break shared content identity. Crop is authored content/presentation
state, not field configuration.

## Decision

`TemplateFieldFamilyContentStateV3` owns one shared Image value—asset plus
default placement—and a sparse `variantImagePlacements[variantId][fieldId]`
map. Entries contain only the existing Fill/Fit/Crop placement union and can
never contain an asset ID. Resolution overlays the selected placement onto the
shared asset before invoking the ordinary V2 materializer and image renderer.

Variant switching never mutates shared content. Replacing the shared asset
atomically clears all asset-bound variant placements. Shared reset removes the
replacement and every variant placement; variant reset removes only its sparse
entry. Every accepted change advances the single Family content revision.

Editor Crop uses ADR 0048's normalized slot-to-source matrix and existing
affine image owner. When the current slot aspect differs from the canonical
crop, runtime derives a centred, axis-preserving crop by shrinking within the
canonical source region. It never widens or mutates canonical Crop state.

V2 Family content and saved records migrate once at load into explicit V3
contracts with an empty placement map. Live sessions and new saves use V3 only.

Structurally canonical but semantically invalid persisted crops remain Crop
state and block export. A renderer may use deterministic cover for preview,
but that fallback cannot rewrite state, clear the error, or become valid Fill.
Malformed/non-finite crop data is rejected at persistence boundaries.

## Consequences

- Single-template Image APIs remain unchanged.
- Family Image controllers add `setVariantPlacement` and
  `resetVariantPlacement`; `setPlacement` continues to edit the shared default.
- No Family renderer, crop renderer, asset fork, or renderer-time network path
  is introduced.
- Imported Crop behavior remains unchanged; only `editor-crop` is promoted
  from its reserved Fill fallback into the established affine owner.

## Verification

Portable coverage exercises V2→V3 migration, shared and variant Crop
resolution, variant reset, shared replacement/reset, stale controller
rejection, persistence/reload, invalid persisted Crop blocking, affine editor
Crop routing, and crop-within-canonical aspect adaptation. Guarded renderer,
scene, and settlement comparisons remain required before source-certified
promotion; no reference update is authorized by this ADR.
