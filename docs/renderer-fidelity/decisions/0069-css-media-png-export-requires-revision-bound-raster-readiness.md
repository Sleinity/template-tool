# ADR 0069: CSS media PNG export requires revision-bound raster readiness

## Status

Accepted

## Context

Decoded assets, stable DOM geometry, current backend decisions, and current settlement identity did not make the first headed-Chromium `html-to-image` PNG raster deterministic for `deal-of-the-week-banner`. The hidden renderer is connected, paintable, full-size, offscreen positioned, visible, and opaque. The first export differed from every later export only in the three `media-dom` CSS-background FILL regions.

## Evidence

Before correction, five headed exports produced 645 changed pixels between captures 1 and 2 at `x=421, y=0, width=221, height=1080`; captures 2–5 were exact. A discarded SVG-serialization pass did not change that result. A completed discarded foreignObject-to-canvas raster followed by the export raster made all five outputs exact.

Final fresh-process runs `phase-11-12-png-determinism-final-headed-a` and `phase-11-12-png-determinism-final-headed-b` each produced five byte-identical PNGs at SHA-256 `2af9ebaa4d941de15b05879ad443efe22acf1b8e377a9801b8295eba99b9a5b1`. Headless run `phase-11-12-png-determinism-final-headless` produced five byte-identical profile-specific PNGs at `af27daeecce1d4da9754621d8140e77b3bcaed3ca0716d3a3ac467bfdd1b0075`.

Harness telemetry confirms nodes `346:38`, `346:41`, and `346:44` share decoded 1125×750 asset `asset:image:ceab5479`, placement revision 0, backend decision `74de999e`, and unchanged geometry. Object-URL count remains constant across all five exports; the settled asset URL is not recreated or revoked during capture.

## Decision

PNG capture first requires current font, settlement, media-source, intrinsic-size, decode, asset, placement, backend-decision, and geometry evidence. A capture node containing CSS-background media then completes one discarded foreignObject raster for each new revision fingerprint. That completed raster is the browser-paint readiness boundary. The next raster is the export candidate.

The fingerprint excludes raw object-URL identity and binds package/canvas identity, settlement identity/revision, primitive/backend-decision revisions, media asset/active-state/placement revisions, current template-space geometry, and computed placement styles. A `WeakMap` binds readiness to the capture DOM node without retaining nodes or URLs. Revision changes require a new warmup; repeated captures of the same current revision do not.

## Alternatives

Arbitrary sleeps, pixel snapping, tolerance changes, asset-URL recreation, object-URL identity in semantic revisions, and renderer-specific coordinate corrections are rejected. A serialization-only preflight is rejected because it reproduced the defect.

## Consequences

The first CSS-media export for a new revision performs one additional raster pass. Current evidence measures approximately 400 ms for that warmup on the 1920×1080 banner. Later exports skip it. Capture telemetry exposes readiness, revision, decode state, and warmup/final timings.

## Compatibility impact

Media geometry, FILL/FIT/CROP semantics, backend selection, renderer DOM, visible surfaces, schemas, persistence, references, and tolerances are unchanged. Packages without CSS-background media do not warm a raster.

## Migration impact

None. This is an export-readiness correction over current resolved authority. ADR 0010 and ADR 0012 remain Proposed.

## Verification

Two fresh headed processes × five exports, one headless process × five exports, an 18-fixture/four-surface/two-repeat regression, approved gradient/ordered-SOLID comparisons, media replacement/reset/stale work, routed layout/fonts/text trim, mask/primitive/stroke persistence, offline restoration, and reference aggregate guards.

## Reversal strategy

Remove the revision tracker and raster preflight while retaining the decode/settlement evidence and harness telemetry. Do not replace references or broaden tolerances when reversing.
