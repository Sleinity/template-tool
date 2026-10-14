# ADR 0090: One bounded owner for opaque source compositing

Status: Accepted for the exact exporter 0.6.1 property subset below  
Date: 2026-10-06

## Context

Matrix and Matrix 2 retain exact source paint colors, order, blend modes, and
group opacity in canonical data. The compatibility renderer selected one SOLID
background for each rectangle, so those properties did not affect pixels. A
CSS opacity on a pass-through group would also isolate its children from the
external image and flat-color backdrop. The source gate and direct Figma
inspection in ADRs 0087–0089 establish the required distinction.

## Decision

An internal `ResolvedSourceCompositingV1` is selected by source properties,
never by fixture, node name, or ID. It admits exporter 0.6.1, an opaque canvas,
an axis-aligned ordinary root with one opaque NORMAL SOLID or IMAGE backdrop,
and leaf rectangular SOLID rows with certified
NORMAL/DARKEN/MULTIPLY/SCREEN/OVERLAY/LIGHTEN paint blends. A row may have a
second NORMAL SOLID paint. Eligible non-overlapping row groups may use
PASS_THROUGH, NORMAL, or OVERLAY with unit opacity. Source floats, source
indices, paint order, group mode, and geometry enter its revision.

One DOM/CSS paint-layer owner renders the eligible stack. The prior singular
background owner is suppressed. PASS_THROUGH groups keep the external backdrop;
their post-composition opacity is distributed across ordered paints only for
the certified non-overlapping row subset. NORMAL groups isolate and apply
opacity after the children; OVERLAY groups additionally blend the isolated
result with the external backdrop. The existing backend decision records this
capability. Unsupported inputs select the complete compatibility boundary.

The contract is internal. No public schema, session, renderer export, or
reference tolerance changes. Browser-native image sampling is retained.

## Evidence and limits

The final capture `phase9-group-runtime-final-20261006-c` was complete and
stable twice on all four surfaces. Source-sized Matrix 2 PNG pixels with a
channel difference above 10 fell from 665,318/243,000/707,688 to
18,423/4/13,239 in its pass-through/normal/overlay groups (729,000 pixels
each). Every remaining strong difference was on the photographic side, not the
flat-color control. The Matrix control's remaining strong differences likewise
occurred only over its image, while its flat-color strip matched. These are
candidate comparisons to the embedded preview, not approved references.

The three active SDK export captures remained byte-identical to their previous
run. The final capture and full regression disposition are recorded
in the Phase 9 gate documents. Cover's mixed SOLID/IMAGE/DARKEN-gradient fade,
transparent backdrops, overlap, effects, masks, unsupported group modes, and
general compositing remain outside this owner. No reference is promoted here.
