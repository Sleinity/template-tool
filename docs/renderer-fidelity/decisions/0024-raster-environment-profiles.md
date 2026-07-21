# ADR 0024: Headless and visible raster evidence use separate profiles

## Status

Accepted

## Context

Visible and headless Chromium can produce different pixels despite identical geometry and within-profile repeatability.

## Evidence

The current visible now-hiring editor run is internally exact across two captures and structurally equal to the approved headless result, but differs by 6,876 pixels (0.9563%). The same result was observed in Milestone 2. No tolerance was broadened and no reference changed.

## Decision

Classify `chromium-headless` and `chromium-visible` as separate raster profiles. Pixel references are never shared across them. Geometry may be compared with the existing fixed tolerance. An unknown environment cannot approve references.

## Alternatives

Increasing the global pixel tolerance or treating headed variance as nondeterminism were rejected.

## Consequences

Raster evidence remains honest and reproducible per profile. Visible-browser output is observational until separately reviewed.

## Compatibility impact

None; approved headless references are unchanged.

## Migration impact

Cross-platform/profile approval requires explicit reference policy and evidence; it is not inferred from this ADR.

## Verification

Two repeated visible captures, exact within-run pixels, identical geometry, retained diff artifacts, and unchanged approved-reference digest.

## Reversal strategy

Supersede only if browser/platform evidence proves a reliable shared raster model; do not merge references retroactively.
