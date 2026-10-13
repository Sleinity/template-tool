# ADR 0076: V2 field content reducer and materializer are single Core authorities

## Status

Accepted

## Context

ADR 0075 froze the seven-field `TemplatePackageV2` contract, separately
revisioned canonical content state, exact import-resolved bindings, and the
prohibition on reconstructing canonical values from renderer properties. The
existing V1 editor path mutates and reads materialized node properties, so it
cannot become the V2 implementation without retaining two value authorities.

Milestone 2 needs complete deterministic field behavior in framework-neutral
Core while browser sessions, persistence, Template Families, React, and Studio
remain on the unchanged V1 production path until their coherent integration.

## Decision

`mutateTemplateFieldContentV2()` is the only V2 canonical content reducer.
Typed set, choice, image-replacement, and reset functions dispatch commands to
it. An accepted command returns a deeply immutable sparse snapshot at the next
safe integer revision. A rejected command returns the original snapshot and
does not advance revision. Explicit empty strings, numeric zero, and Boolean
false are overrides; reset removes the override and advances revision.

The reducer dispatches deterministic parsing and validation from the
discriminated field definition:

- Text rejects line separators and applies grapheme-based character rules.
- Textarea applies deterministic character rules but does not approximate
  rendered lines.
- Number accepts finite values, canonicalizes negative zero, applies min/max
  and step anchored at `min` or zero, and retains a numeric canonical value.
- Date accepts only real Gregorian `YYYY-MM-DD` calendar dates.
- Color accepts the frozen opaque hex subset and normalizes to lowercase
  `#rrggbb`.
- Image accepts a package asset plus an authorized Fill, Fit, or finite
  invertible normalized Crop result.
- Boolean accepts only an exact boolean.

Static choice option values pass through the same deterministic validator.
Suggested choices remain open; restricted choices reject values without a
canonical match. A stable selected option ID is provenance beside the value,
not a replacement for it. Warning issues never block a mutation; deterministic
error issues do.

`materializeTemplateFieldContentV2()` is the only V2 package materializer. It
validates package/content identity, clones both authorities, resolves defaults
and overrides without inspecting current node values, formats Number/Date,
and writes to the exact typed binding. Color updates only RGB at the bound
SOLID source index while preserving imported alpha and opacity. Missing Image
overrides retain the cloned imported asset/placement; replacement writes only
the canonical replacement state. Boolean writes renderer-facing visibility in
this milestone but does not claim structural layout exclusion.

For a sparse Color value resolved from an imported default, the `#rrggbb`
control value is only an 8-bit representation. When it equals the bound
source SOLID's control representation, materialization retains the complete
source paint, including its higher-precision RGB. Reset returns to that same
path. An explicit content override, even one equal to the displayed hex, or
a configured default different from the bound source paint applies canonical
RGB to the exact indexed fill. Binding validation still runs first. This is
source-value preservation within the existing default/override lifecycle,
not a second Color authority or a new schema rule.

The materializer returns deterministic revision identity, per-field
default/override provenance, structured issues, and required pending render
validation. A configured Textarea `maxLines` publishes a blocking pending
requirement; `warningAtLines` alone publishes a non-blocking pending
requirement. Core performs no DOM measurement and never treats newline count as
visual line evidence.

`getOrderedHostEditableFieldsV2()` derives its projection directly from the
discriminated definitions and `editableFieldOrder`. It omits renderer binding
and source provenance. No parallel static capability matrix is introduced.

## Compatibility boundary

This decision adds Core APIs only. It does not migrate or synchronize the V1
browser session, persistence records, Template Families, React renderer, or
Studio. It does not change renderer behavior, Boolean layout participation,
crop rendering, visual line measurement, fixtures, or approved references.
Milestone 3 owns the production session and persistence integration.

## Consequences

- Canonical Number, Date, Color, Image, and Boolean values remain available
  after materialization without parsing display or geometry output.
- Exact Color and image targets are never discovered at mutation time.
- Imported defaults and sparse overrides use the same resolution and
  materialization lifecycle.
- Later typed controllers can wrap reducer commands without becoming another
  semantic authority.
- Milestone 4 can replace Boolean's current renderer-facing visibility write
  with structural exclusion without changing its public value contract.
- Milestone 6 can attach revision-bound line evidence without redesigning
  Textarea configuration or mutation acceptance.

## Verification

Repository-contained tests cover all seven fields, grapheme counting,
warnings versus blockers, suggested/restricted choices, finite Number and
calendar Date rules, exact indexed opaque Color mutation, image authorization
and crop matrices, immutable revisions/reset, package/state compatibility,
host ordering, deterministic no-input-mutation materialization, canonical
Number/Date retention, provenance, and pending `maxLines` export readiness.

No browser or pixel claim is made by these tests.

## Reversal strategy

Before Milestone 3, remove the additive kernel/materializer exports and retain
the V1 production path. After Milestone 3, any replacement must preserve the
canonical content envelope and one-way invariant through an explicit versioned
migration; renderer readback cannot be reinstated as content authority.
