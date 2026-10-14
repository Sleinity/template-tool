# Field Rules V2 Browser Session

## Canonical ownership

`createTemplateSessionV2()` owns one immutable configured `TemplatePackageV2`,
one revisioned `TemplateFieldContentStateV1`, browser-owned replacement assets,
and derived materialization/readiness snapshots. Every typed controller command
is sent to `mutateTemplateFieldContentV2()` and every accepted result is passed
once to `materializeTemplateFieldContentV2()`.

The V2 session does not update renderer nodes directly and never reconstructs
content from them. `rendererPackage` is a one-way V1-shaped compatibility
projection for the existing renderer contract. It is derived from the current
working V2 package, is never persisted, and has no mutation authority.

## Host controllers

`getFieldControllers()` follows `editableFieldOrder` and returns a discriminated
controller for Text, Textarea, Image, Color, Number, Date, or Boolean. A false
Boolean remains present while controllers bound below any of its structural
targets are omitted; enabling it restores those controllers with retained
canonical values and order. Common
state includes the ID, type, `label ?? id`, optional `controlRole`, effective
configuration, canonical current/default value, deterministic issues, warnings,
renderer-validation state, reset, and content revision. Renderer binding and
source provenance are absent from the ordinary host descriptor.

Text, Textarea, Number, Date, Color, and Boolean use typed `setValue` methods.
Fields with choices expose `selectChoice`. Image exposes browser-safe Blob/data
URL replacement, policy-authorized Crop placement, and reset. Each Image field
has one required replacement policy: Fill, Fit, or Crop. Uploads use that policy
automatically. Crop-policy uploads without host-supplied crop data fall back to
Fill; Fit remains invalid for a Crop-policy field. Imported Figma placement is
a separate immutable authority and reset restores it. Browser asset bytes and
object URLs remain outside canonical content; the content state contains only
asset identity and placement/crop intent.

## Readiness and revisions

An accepted Textarea mutation with `maxLines` commits immediately, updates the
working package, and publishes `pending`. Required pending evidence blocks
export but not editing. Layout evidence must match package, content, and
materialization identity. Runtime font/renderer evidence uses the same exact
content/materialization boundary. Older evidence returns `false` and cannot
publish.

`TemplateFieldSessionRendererV2` connects the ordinary renderer to this
readiness boundary. Current painted-span evidence also carries settlement,
font, structural-participation, and monotonic publication-generation identity.
Each mounted publisher receives a disjoint session generation range, so an old
renderer or an A/B/A measurement cannot regain authority. Evidence publication
updates controller/readiness projections without rematerializing canonical
content.

Active Textareas are pending until current reliable evidence arrives. Counts at
or below `maxLines` are valid; counts above are invalid. Line warnings are
inclusive and non-blocking. Structurally excluded Textareas publish `inactive`,
perform no hidden measurement, and do not block active export readiness; showing
them again restores pending status. Line evidence is never persisted.

Image reads, saved-record loads, reimport, resets, and family switches advance
an operation revision. Completion order is never authority. Reset/disposal
invalidates pending work and revokes session-owned object URLs.

## Persistence

`saved-template-session-v3` persists:

```text
configured TemplatePackageV2
+ TemplateFieldContentStateV1
+ browser replacement asset metadata and hash references
```

It deliberately has no `workingPackage`. Load strictly validates the schema 2.2 package
and canonical content, restores managed assets for offline use, rematerializes,
and recomputes readiness. V1 saved records retain their original schema meaning;
no V2 loader infers canonical values from a saved V1 working package.

V2 session records use dedicated in-memory and IndexedDB repository adapters.
They share the browser's content-addressed asset stores where applicable, while
keeping V2 validation and methods out of legacy session bundles and never
sharing record interpretation.

Schema 2.0/2.1 packages and their older saved envelopes are deliberately not
migrated. Repository listing exposes them as lightweight `Reimport required`
records so hosts can keep them discoverable and delete them safely without
interpreting canonical content. Compatible records continue loading even when
incompatible records share the same store.

## Reimport

`planTemplateReimportV2()` is review-first and keys logical identity only by
`field.id`. Compatible type/binding kinds retain configuration, choices,
`controlRole`, canonical content, and order while adopting the newly imported
binding/default/provenance. Added fields use imported defaults. Removed content
requires an explicit archive/discard disposition. Type or binding-kind changes
block apply. Labels are never identity evidence.

## Template Field Families

`TemplateFieldFamilyV2` avoids the repository's rejected unpublished
`template-family-v2` format. It combines common typed configuration with sparse
variant overrides. Scalars replace properties, arrays and Choice sets replace
atomically, and `null` clears an inherited optional property. The selected
variant becomes one ordinary effective `TemplatePackageV2` and uses the same
Core materializer; there is no family renderer.

`TemplateFieldFamilyContentStateV3` is the sole live Family content envelope.
It keeps ordinary values shared and adds sparse placement-only Image overrides
by variant. The asset and default placement remain shared; an override can
select the policy-compatible placement or canonical Crop but can never carry an
asset ID. Family Image controllers expose
`setVariantPlacement`/`resetVariantPlacement`, while ordinary `setPlacement`
continues to update the shared default and enforces the effective variant
policy. A variant switch never rewrites canonical state.

V2 Family content normalizes once to V3 with an empty override map. New saves
use `saved-template-field-family-v4`; older saved Family envelopes require
reimport. Replacing or resetting the shared image clears every
asset-bound variant crop. Content invalid under the selected variant remains
visible in controllers and blocks export.

## React and compatibility boundary

`template-react` exports `TemplateFieldSessionV2Provider`, ownership hooks,
snapshot hooks, and `useTemplateFieldControllersV2()`. These are composition
APIs only: no Studio component, renderer-internal module, picker, crop UI, or
control registry is imported.

The canonical V2 path is `createTemplateSessionV2`. The older
`createTemplateSession`/V1 record path remains present for the current Studio
and renderer compatibility surface; it is not synchronized with V2 and cannot
be loaded as canonical V2 state. Removing that compatibility entry requires the
Studio consumer cutover, so this milestone does not claim repository-wide V1
runtime deletion.

Boolean structural layout is delivered and source-certified in Milestone 4.
Renderer-backed visual line measurement is delivered in Milestone 6. Studio
Field Configuration V2 is now implemented in Milestone 7 through the same
public single/Family `configure()` APIs. See [Studio and hosts](STUDIO_AND_HOSTS.md).
