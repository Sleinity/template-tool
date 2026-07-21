# ADR 0047: Scale mode governs image-transform applicability

## Status

Accepted

## Context

The exporter retained an `imageTransform` on now-hiring while declaring `scaleMode=FILL`. The previous resolver treated the matrix as an additional crop, producing a materially tighter image than the source preview. Other registered fixed images contain the same ambiguous exporter shape and have approved compatibility pixels but no reviewed source-reference authorization.

## Evidence

Figma documents `ImagePaint.imageTransform` as applicable to `CROP`. The exact now-hiring ZIP, 1125×750 asset, 960×950 source slot, embedded preview, independent source-pixel fit, all-surface candidates, and final placement telemetry agree on centered cover. Applying the matrix created `background-size: auto 139.8781%` and was the first source-to-pixel divergence. All non-now-hiring approved pixels remain byte-identical when fixed ambiguous nodes retain compatibility ownership.

## Decision

`ResolvedImagePlacementIntentV1` owns fit mode, source transform, transform applicability, focal point, coordinate space, clipping, and sampling. An `imageTransform` becomes active only for `CROP`. Dynamic `FILL` uses native aspect-preserving cover and preserves any retained matrix as inapplicable provenance. Fixed `FILL + imageTransform` remains an explicit compatibility boundary until a fixture-specific source review authorizes migration. `FIT` contains and explicit `STRETCH` alone may distort.

## Alternatives

Applying every retained matrix, deriving focal/zoom from a CROP-only matrix, deleting the matrix, selecting behavior by fixture identity, and adding a Canvas sampler are rejected.

## Consequences

Now-hiring image placement matches its source design and recomputes from the current settled slot. Fixed ambiguous packages retain unchanged pixels with a visible compatibility classification and fallback reason in developer telemetry. Runtime and harness telemetry share a versioned intent/geometry vocabulary. The compatibility boundary remains technical debt rather than silent support.

## Compatibility impact

Only capability-routed dynamic `FILL` changes pixels. Registered fixed ambiguous nodes retain the legacy background-size calculation. Approved references are never written by this decision.

## Migration impact

Acquire or review source references for fixed `FILL + imageTransform` and a real `CROP` ZIP before retiring compatibility. Do not generalize the now-hiring embedded preview into a global golden policy.

## Verification

Pure geometry tests cover centered/focal cover, portrait/landscape ratios, FIT, STRETCH, affine CROP, invalid fallback, fractional sizes, resize, and compatibility geometry. Static renderer tests cover active CROP and clipped affine painting. Exact two-pass Chromium captures cover Validate, Fields, editor, and PNG. All 12 non-now-hiring approved pixels remain exact.

## Reversal strategy

Route dynamic `FILL + retained transform` back to the explicit compatibility strategy. Source data, matrices, approved references, and candidate artifacts remain intact.
