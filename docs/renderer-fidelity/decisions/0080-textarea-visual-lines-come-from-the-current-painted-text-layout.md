# ADR 0080: Textarea visual lines come from the current painted text layout

- Status: Accepted
- Date: 2026-09-04

## Context

Field Rules V2 commits Textarea content before renderer-backed validation and
withholds export while configured `maxLines` evidence is pending or invalid.
The renderer already clusters `Range.getClientRects()` from the actual painted
text span for intrinsic text geometry, but that line count was not published to
V2 sessions. A legacy editor helper can construct an off-screen mirror; it is
not the visible renderer and cannot be V2 authority.

## Decision

The mounted DOM/CSS text paint is the sole visual-line owner. The existing
line-box clustering is shared by intrinsic text measurement and field evidence;
fixed-width Textareas observe the same painted span without becoming intrinsic
HUG/FILL inputs. Empty text is one rendered line. Count all laid-out lines
before downstream clipping, and do not derive count from aggregate or trimmed
height.

Evidence identifies the exact package, canonical-content revision,
materialization, settlement, font revision, renderer publication generation,
and structural participation. Each mounted V2 session renderer receives a
monotonic session generation range. Both hook measurement keys and renderer
generation must be current, preventing delayed A/B/A text, resize, font,
variant, or remount publication.

An active Textarea is pending until reliable evidence arrives, valid at or
below `maxLines`, and invalid above it. `warningAtLines` is inclusive and
advisory. A structurally excluded Textarea is inactive: canonical/configuration
validation remains, no line measurement runs, and its runtime line rule does
not block export. Showing it again restores pending until new evidence arrives.

The ordinary React V2 session renderer publishes readiness and evidence.
Controllers expose read-side status and line usage but hosts cannot submit line
counts through the normal API. Evidence changes do not rematerialize content.

## Evidence and boundary

The exact registered `now-hiring-post` ZIP supplies the authentic Textarea
binding, constrained width, wrapping, Auto Layout, and vertical-trim source.
The focused browser scenario proves one, two-warning, four-invalid, and empty
lines across Validate-labelled, Fields-labelled, editor, and PNG instances;
invalid blocks PNG and a corrected value exports 1000×1350. The scenario uses
deterministic system-font and embedded-asset inputs for its export pass; exact
font and font-epoch behavior remain owned by the existing font/text-trim gates
against the same source bytes.

This promotes renderer-backed line validation for ordinary active V2
Textareas under currently supported DOM/CSS text, fixed/HUG/FILL layout,
resizing, structural visibility, and selected Family variants. It does not add
truncation, shrink-to-fit, a second wrapper, persisted evidence, rich-text
expansion, or Studio V2 authoring. No approved reference or tolerance changes
are authorized.
