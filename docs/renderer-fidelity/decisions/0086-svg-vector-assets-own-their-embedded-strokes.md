# ADR 0086: Rendered SVG vector assets own their embedded strokes

## Status

Accepted

## Context

The hash-verified exporter 0.6.1 Cover ZIP includes an open arrow as a complete
SVG asset. Its VECTOR node also declares a source stroke. The renderer painted
the SVG and independently converted that declaration into a CSS border on the
24×24 vector wrapper. The border made the arrow appear boxed across Validate,
Fields, editor, and PNG.

## Decision

When a VECTOR actually renders a complete SVG asset or SVG string, that source
owns its path, fill, and stroke pixels. The wrapper retains layout, clipping,
opacity, and effects, but does not paint a second compatibility CSS stroke.
The canonical stroke and its provenance remain unchanged. The rule depends on
the selected vector owner and a renderable source, never node or fixture identity.

Missing SVG sources, semantic-shape vectors, and ordinary non-vector strokes
retain their existing compatibility behavior. This decision does not add path
reconstruction, a general vector-stroke owner, or mixed-paint compositing.

## Evidence and limits

Cover ZIP SHA-256 `086559ca6e5cf2cc8527ed45638eeaf1669c0081b966bf24f44f5141099d0c09`
contains `assets/asset_arrow_icon_002.svg` SHA-256
`d7177007d3cc20a3f7e8ebbdcfd42ed247b59ae05756979cfd1afe02b2c47924`.
The SVG has one open arrow path with a 3.2px stroke. Before the correction,
browser structure reported a separate 3px CSS border on node `987:6779`; after,
that border is absent on all four surfaces. Two-pass captures are stable.
Only Cover's four surface images changed, and its source-sized PNG changes are
confined to the arrow's 24×24 node. The arrow-region count of pixels differing
from the embedded preview by more than 10 in any RGB channel fell from 2,439
to 2,261. This is regional improvement, not whole-template approval.

Cover's `SOLID + IMAGE + DARKEN` fade remains outside the certified paint
owner and still requires a separate compositing milestone. No approved
reference, scene snapshot, settlement snapshot, or tolerance changes here.
