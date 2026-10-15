# ADR 0095: Established media underlays are not primitive-stack fallback

Status: Accepted  
Date: 2026-10-10

## Context and source evidence

Issue packet `fidelity-issue-e5fc9a44.zip` identifies Carrousel's bottom image
`987:6823`. Its exact source order is one opaque NORMAL SOLID followed by one
opaque NORMAL IMAGE. The established media renderer already paints the image
as a CSS background above that solid background. A generic multiple-paint warning
incorrectly treats rejection by the unrelated primitive SVG stack as failure of
the active media owner. The exact baseline ZIP's top and main image fields contain
only IMAGE paints and retain their existing semantic-owner classification. The
packet's bottom-image stack is the source fixture for this correction.

## Decision and boundary

Resolved-node diagnostics recognize only an ordinary, axis-aligned, zero-corner
leaf FRAME/RECTANGLE with a present FILL/FIT image, exactly two visible NORMAL
paints in SOLID → IMAGE order, opaque solid alpha and paint opacities, node opacity
one, no vector, mask dependency, stroke, effect, unsupported preserved paint or
other primitive rejection. Recognition emits an informational explanation and
leaves the established compatibility/media owners intact. The backend decision
then correctly reports `established-compatibility-owner`, with no active fallback.

Primitive ineligibility, canonical paints, source indices, exact numeric values,
assets, image placement, masks and revision guards remain intact. No new owner,
public type, renderer branch or validation policy is introduced. This corrects
diagnostic applicability rather than hiding warnings by fixture, name or ID.

Reversed/additional/hidden/partial/non-NORMAL paints, unknown preserved paints,
missing assets, CROP fallback and other geometry/appearance dependencies keep their
existing diagnostic authorities. This is not a general ordered IMAGE stack or a
compositing expansion. Existing mask and asset authorities are not reclassified.

## Verification and reversal

The [current report](../../architecture/media-solid-underlay.md) records the
failure-first contract test, exact source evidence, browser lifecycle checks and
fresh unchanged-reference comparison. Remove only this diagnostic recognition to
reverse it; no persisted data, rendering semantics or references require migration.
