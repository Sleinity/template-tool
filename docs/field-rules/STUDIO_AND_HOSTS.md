# Field Rules V2: Studio and external hosts

## One authority

Studio setup follows **Designs → Fonts → Checks → Fields → Review**. Saved
Settings opens at Fields; configuration Apply accepts a draft into the native
session and Save in Review persists the accepted configuration. Output editing
has a separate recovery lifecycle. Studio presentation and navigation remain
private; there is no new SDK UI or persistence contract.

Studio's default workspace imports exporter ZIPs through the existing asset/font
preparation boundary, normalizes once to `TemplatePackageV2`, and uses Browser
V2 sessions. Native V2 JSON may transfer a configured package. Configuration
forms hold uncommitted UI drafts; **Apply** calls public session `configure()`.
Core validates the candidate atomically. Content editors call typed controllers.
The ordinary `TemplateFieldSessionRendererV2` supplies preview, line evidence,
readiness and guarded PNG. Studio never reads working nodes back into content.

The Draft Editor rejects character overflow immediately by grapheme count.
Textarea line limits use an asynchronous Studio transaction: preview the candidate
through the native controller, await current painted evidence, then accept or
restore the previous default, choice or custom value. The previous-width mirror
is not a candidate veto. Rollback advances native revisions normally. Composition
retains its pre-composition draft, and newer input cannot be replaced by an older
callback. Measurement failure has a 10-second deadline and restores an owned
checkpoint instead of inventing valid evidence.

Provisional revisions never enter recovery capture. Other canonical writes queue
behind validation; Save, navigation, design selection and PNG drain the queue.
Already-invalid content remains visible and can be repaired progressively. The
SDK's direct controller contract remains unchanged: render-invalid values may be
kept editable and block export.

The React evidence publisher also follows the mounted renderer lifecycle. If a
canonical error temporarily removes the renderer, recovery obtains a fresh
committed publication lease; restarting the inner renderer's generation counter
cannot leave current line validation stuck pending. Ordinary edits keep the
existing lease, and stale evidence remains rejected. Family diagnostics consume
full effective content and assets; native reload/restore requires fresh
publication evidence.

## Configuration and output persistence

Configuration forms hold local incomplete drafts. **Apply** calls native
`configure()` and accepts valid configuration; **Discard** restores only that
unapplied form. **Save in Review** persists accepted configuration. Field reordering
is immediate accepted configuration with Undo, not part of the form's Discard.

Output recovery autosave is a separate Studio policy at **650 ms**. Typing commits
retain the 100 ms trailing / 325 ms maximum-wait schedule. Failed work stays dirty;
manual Retry flushes valid drafts and saves current accepted content. SDK sessions
do not schedule this automatically. Navigation/recovery guards preserve entered
work. Reload rematerializes and requires fresh renderer evidence.

Save state and export readiness are separate: persisted content can still require
correction. After successful export with failed recovery cleanup, retry cleanup
only. See [ownership](../sdk/HOST_LIFECYCLE.md) and [operation outcomes](../sdk/OPERATION_OUTCOMES.md).

## Seven fields

| Field | Canonical value | Portable rules |
| --- | --- | --- |
| Text | Single-line string; line separators rejected | Maximum characters, character warning, choices |
| Textarea | Multiline string | Character rules, maximum rendered lines, line warning, choices |
| Image | Replacement asset + Fill/Fit/Crop; imported default separate | One replacementPlacement policy: Fill, Fit or Crop |
| Color | Opaque lowercase `#rrggbb`; accepts #RGB/#RRGGBB input | Optional choices/palette |
| Number | Finite number | Min/max/step, prefix/suffix, decimal places/separators, choices |
| Date | Real timezone-free `YYYY-MM-DD` | Bounded ISO/day-first/month-first display presets, choices |
| Boolean | Boolean | One or more structural visibility targets |

Core formats Number/Date. Hosts never recover canonical values from display
strings. Color applies RGB to the exact imported SOLID binding while preserving
separate source alpha/opacity; hosts never select paint indexes. Alpha-bearing
Color input remains unsupported.

Labels are optional, falling back to stable IDs. Studio keeps field IDs read-only
because reimport and Family matching depend on them. `controlRole` is an opaque,
non-semantic hint; unknown values remain usable.

## Choices, ordering and configuration transactions

Text, Textarea, Color, Number and Date support suggested/restricted choices.
The shared Studio configuration editor offers **No choices**, **Suggested values**
and **Options only**. Enabling choices seeds actual imported defaults; common
Family restrictions include the defaults of every inheriting design in source
order. Explicit variant lists and clears remain independent. Conflicts with
ordinary rules identify the affected design instead of changing its default.

Typed option editors retain incomplete drafts locally: multiline Textarea,
decimal Number, calendar Date, and editable hex plus a Color picker. Apply uses
SDK validation and rejects empty lists, invalid identities, duplicate canonical
values and field-rule violations. Removing the last option requires another
option or an explicit No choices action. Optional labels fall back to SDK-formatted
values. IDs are generated automatically and remain behind Advanced; changing one
disconnects its existing selection. Labels, values and accessible up/down
reordering preserve IDs. Apply/Discard and navigation guards remain transactional.

Suggested values accompany ordinary input; Options only uses a dropdown.
Matching imported defaults and literal values display the matching option without
creating saved selection identity. A saved choice ID is displayed as selected
only when both its ID and canonical value match the effective option. Unknown or
incompatible provenance shows a repair placeholder and the actual canonical
value; selecting a configured option performs an ordinary native mutation.
A deliberate choice replaces that field's
invalid or queued draft, waits for active commits, then uses its latest native
controller. Unrelated drafts remain untouched. Unlisted restricted content stays
visible and blocked until corrected; Studio never selects the first option silently.
Number and Date labels use SDK display formatting; Color shows a swatch and hex.

Editing a selected option's value updates its content. Removing it retains the
value and clears selection identity; restrictions can then require correction.
Existing modes, IDs, labels, ordering, explicit clears and saved selections need
no migration. Invalid older configurations are reported for explicit repair.
Image and Boolean choices and Family design selectors remain separate.

`editableFieldOrder` is an exact permutation, not numeric ranks. Studio replaces
the list atomically; SDK controllers follow it. Bespoke hosts may ignore it and
renderer geometry never reads it.

`session.configure({ fields, editableFieldOrder })` replaces supplied portable
metadata/configuration only. It cannot rename IDs, change types or bindings, or
rewrite imported defaults. It retains managed replacement assets, invalidates
stale controllers/evidence, and materializes once. Single-template configuration
retains its existing revision policy. Family configuration advances canonical
content revision only when canonical entries (including selection provenance)
change; configuration-only A/B/A safety uses operation/publication currentness.
Changed selected options update canonical values explicitly; removed
options clear selection provenance without inventing values. Existing semantic
errors remain correctable through the same reducer.

## Families

Import multiple packages to create a Family. Matching IDs share content;
conflicting types block creation. The first occurrence supplies common
configuration; differing source rules become sparse overrides. Choose **Common
to Family** or **Selected variant overrides**. Controls identify inherited,
overridden and cleared properties. Editing creates an override; **Inherit**
removes it; **Clear** writes `null` for optional properties. Choices and format
objects replace atomically. Image replacement policy is required: a variant may
inherit or override Fill, Fit, or Crop but cannot clear it. Variant ordering can override or inherit common
filtered order.

Choices identifies **Inherited**, **Overridden**, or **Disabled for this design**.
Use shared value removes the atomic override; Disable for this design writes the
existing explicit null clear. These controls preserve imported defaults; changing
the effective option ID/value mapping reconciles selections as described below.

Common Choice changes reconcile shared content even when the selected variant
lacks that field. Core's existing removal behavior clears selection provenance
while retaining the canonical value. Explicit variant choices remain intact;
switching variants never reconciles shared values. Family configuration reconciles
only fields whose option ID/value mappings changed under the affected authority.
Field order, option order/labels, field labels, choice mode and unrelated rules
preserve canonical entries, including already incompatible selections. Selected
design updates compare previous and next effective choices; changes to another
field or a nonselected design cannot reinterpret that selection. Actual option
value changes, removal, clear and inheritance still use Core reconciliation.
A configuration transaction
publishes at most one materialization and, only if entries changed, one content
revision.

The selected effective package uses the ordinary materializer. Shared Textarea
text can be valid in one variant and invalid in another without changing the
shared value. Counts are never persisted.

Image replacement changes the shared asset and clears all old variant framing.
Every Image field declares one replacement policy. Fill and Fit uploads use
that mode automatically. Crop hosts may supply canonical Crop; without crop
data the upload uses Fill. Imported Figma placement remains unchanged until
replacement or reset.
**Framing scope** selects shared/default or selected-variant placement. The
normalized source-region crop control produces the public slot-to-source matrix,
not private renderer state. **Reset variant placement** removes only that
override; field **Reset** restores each variant's imported image/placement.
Automatic cover-within-canonical adaptation follows placement resolution.

Configuration persists in `TemplateFieldFamilyV2`; shared content/placement-only
overlays persist in `TemplateFieldFamilyContentStateV3` and
`saved-template-field-family-v4`. Older canonical package and saved-envelope
versions require source reimport. A dedicated
multi-aspect exporter fixture is still absent: Family framing is runtime/product
proven, not newly source-certified by Studio.

## External composition

Run the existing `template-editor-integration` example with `?fields-v2`.
[`FieldRulesV2Host.tsx`](../../examples/template-editor-integration/src/FieldRulesV2Host.tsx)
uses public package entries only and is copied unchanged into the packed-consumer
check. No SDK component library is necessary: discriminated controllers expose
the configuration needed by thin host controls. Studio controls remain local.

```tsx
const session = useTemplateSessionV2();
const snapshot = useTemplateFieldSessionV2Snapshot(session);
const fields = session.getFieldControllers(); // portable order
const brand = fields.find(field => field.type === "color");
if (brand?.type === "color") brand.setValue("#ff6644");
return <TemplateFieldSessionRendererV2 session={session} ref={renderer} />;
// Export button: disabled={!snapshot.readiness.exportReady}
// Click: await renderer.current.exportPng()
```

Control resolution is field-specific override → recognized role → default
field-type control. The example's `brand-color` palette calls ordinary
`setValue`. Number/Date controls submit canonical values and contain no formatter.
A host can supply exactly the same canonical Crop as Studio:

```ts
await image.replaceImage({ blob: selectedFile, placement: {
  mode: "crop",
  crop: {
    schemaVersion: "normalized-image-crop-v1",
    coordinateSpace: "normalized-slot-to-normalized-source",
    transform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
  },
} });
// image.setPlacement(placement)
// Family: image.setVariantPlacement(placement)
// Family: image.resetVariantPlacement()
```

Browser owns local Blob URLs, decoding/missing intrinsic dimensions and cleanup.
Core enforces placement authorization. Invalid persisted Crop remains invalid
and export-blocking even when a deterministic preview fallback exists; fallback
never silently rewrites it as Fill.

Single-template persistence retains finite schema-shaped invalid Crop for
repair, while malformed/non-finite data and unrelated typed content errors
remain rejected. Studio opens the loaded blocked session with correction/reset
controls; preview stays unavailable until the ordinary materializer can produce
valid output. Shared Family replacement assets remain owned until their final
canonical reference disappears; hash-equal uploads do not lose URL ownership.

## Validation, persistence and reimport

Studio displays SDK warnings/errors and pending/valid/invalid/inactive renderer
states. Line usage comes only from mounted text. Empty text is one line, clipping
does not reduce count, warning equality is advisory, and maximum overflow blocks
export. Hidden Textareas are runtime-inactive, not exempt from canonical/schema
validation. Boolean false removes its subtree before layout settlement. Studio
content editors also omit controls inside that subtree while retaining the
Boolean control. Field configuration continues to list every configured field,
including currently hidden descendants.

The React bridge acquires publishing authority on committed mount, not a discarded
StrictMode initializer. Async callbacks compare operation, content,
materialization, settlement, font, lease and generation currentness. Publication-scope changes reject old font/line work. Presentation-only tablet
tab switches preserve one renderer mount and never create another renderer.

Settlement, font or publication-generation changes invalidate active cached
line evaluations. New evidence validates only its own field. Structurally
inactive status survives runtime-only changes to the same materialization;
showing the field requires fresh evidence. Evidence publication does not
rematerialize canonical content.

Review-first reimport retains labels, roles, rules, choices, canonical content and
order by stable ID while adopting new source bindings/defaults/geometry. Removed
content requires explicit reviewed discard; incompatible types/binding kinds
block apply. Family reimport uses the selected variant's existing contract.

Incompatible canonical 2.0/2.1 packages and older saved envelopes require reimport.
They are not migrated from working nodes. Source schema 1.0 normalization and
required source-schema 1.0 normalization is separate from retired V1 host workflows and canonical migration. Existing
incompatible records remain visible for explicit reimport, not destructive reset.
See [the staged 1.0 migration](../sdk/SDK_1_0_MIGRATION.md).

## Evidence and non-goals

`pnpm field-rules:studio` exercises actual Studio configuration, canonical edits,
Family framing/rules, reload, review-first reimport and PNG, then independently
mounts the public external host. Its compact fixture is product evidence, not a
Figma reference. Existing source/runtime boundaries remain ADRs 0078–0080. No
pixel reference, tolerance or scene/settlement approval changes.

Upload quotas, DAM/CMS services, permissions, required-before-publish,
authentication, email/URL rules, remote choices, general localization,
conditional logic and a component registry remain host concerns/non-goals.
