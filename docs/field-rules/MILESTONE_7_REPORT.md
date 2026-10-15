# Field Rules V2 Milestone 7 implementation report

Date: 2026-09-04. Decision: [ADR 0081](../renderer-fidelity/decisions/0081-studio-and-custom-hosts-share-v2-configuration-and-content-authority.md).

## Post-implementation closure corrections

The final audit identified four bounded defects in already-accepted contracts.
The corrections below supersede unconditional closure wording in the original
implementation report. They introduce no capability or additional milestone.

### 1. Current Textarea evidence

**Root cause:** Browser cached evaluated field statuses by content revision but
did not invalidate them when runtime settlement/font/publication identity changed.
**Fix/owner:** both Browser sessions now remove active evaluations on those
identity changes. Evidence validates only its own field; unchanged structural
inactivity survives runtime-only changes and publisher replacement. No Core
materialization occurs for evidence updates. Family configuration also retains
a publication watermark to reject first-A evidence after configuration-only ABA.
**Files:** `templateSessionV2.ts`, `templateFieldFamilySessionV2.ts`, and their
shared `templateSessionV2.test.ts` regression suite.
**API/schema:** unchanged. **Verification:** single/Family settlement, font,
generation, warning/invalid, multiple-field, inactive, lease and ABA regressions
pass; source-backed Textarea and ordinary Studio/browser scenarios pass.

### 2. Repairable single-template Crop

**Root cause:** saved-record admission treated semantic Crop errors as record
corruption; Studio also rejected loaded sessions lacking a working preview.
**Fix/owner:** Browser persistence retains finite schema-shaped Crop with
noninvertible/unauthorized-placement semantic errors, while retaining strict
structural, canonical type and unrelated-error rejection. Studio opens the
loaded blocked record for existing controller repair/reset. The ordinary
materializer stays blocked; preview reports unavailability rather than
converting canonical Crop to Fill.
**Files:** `savedRecordValidationV2.ts`, `StudioFieldRulesV2.tsx`,
`templateSessionV2.test.ts`, `scripts/field-rules/studio-v2.mjs`.
**API/schema:** unchanged. **Verification:** invalid Crop saves/reloads unchanged,
retains diagnostics/export blocking, corrects and resets. Non-finite, malformed
and wrong-field-type data remain rejected. Actual Studio browser repair passes.

### 3. Atomic shared Family Choice reconciliation

**Root cause:** configuration reconciled only fields in the selected effective
package and manufactured content revisions for unchanged values.
**Fix/owner:** Browser's Family transaction supplies affected common definitions
to existing Core stable-ID reconciliation independently of selected presence.
Core's existing option-removal behavior is unchanged: clear provenance, retain
value. Explicit variant overrides remain intact. Canonical entries are compared
before commit; unchanged entries retain the same state/revision, while all
changed entries commit once. Configuration/renderer currentness does not depend
on an artificial content revision. One resulting materialization remains.
**Files:** `templateFieldFamilySessionV2.ts`, `templateSessionV2.test.ts`.
**API/schema:** unchanged. **Verification:** present/absent fields, value changes,
labels/reorder, option removal, explicit overrides, atomic failure, persistence,
multi-field single-revision commit and configuration-only ABA all pass.

### 4. Shared replacement-asset ownership

**Root cause:** Family reset unconditionally removed an image asset that another
field could still reference, while hash-equal registration could lose old URL
ownership.
**Fix/owner:** Browser filters replacement assets against resulting canonical
Family image references after reset/replacement/reimport removal. Compatible
same-hash registration reuses the current asset and releases the redundant URL;
replacement of an owned URL releases the old one without losing ownership.
Stale operations release only their newly acquired resources. Non-image session
assets are not subject to image-reference cleanup.
**Files:** `templateFieldFamilySessionV2.ts`, `templateSessionV2.test.ts`.
**API/schema:** unchanged. **Verification:** identical Blob uploads, first/last
reset, replacement, persistence/reload, variant switching, stale replacement and
exactly-once URL disposal pass.

### Architecture, evidence and closure

One canonical value authority, existing Core mutation/reconciliation semantics,
one materializer and one renderer remain. Browser orchestrates Family state and
asset lifetime; Studio remains a consumer. Evidence updates cause no
materialization; accepted content mutations and configuration transactions use
one resulting materialization. Unchanged Family content gets no new revision.

Current-run full, portable and strict realistic lifecycle suites, Core/Browser/
React and root typechecks, package/Studio/example builds, API/boundary/release,
archives, packed Core/external consumers, bundle budgets and documentation
checks pass. The public API contract and existing bundle limits are unchanged.
Source/runtime checks pass Stage 4A, all nine routing scenarios, Boolean, fonts,
vertical trim, Textarea, Crop evidence, Studio and session/offline browser smoke.

Fresh `fidelity/candidates/field-rules-closure` captures are two-pass exact on
23 fixtures × four surfaces. All 92 PNGs are byte-identical to
`field-rules-v2-m7`; the Crop source region retains its prior 816-pixel /
0.19921875% residual. No renderer, scene or settlement references or tolerances
were updated. Guarded comparisons retain historical fail/unapproved states.
The first concurrently launched routing run timed out before import; the
isolated retry passed all nine scenarios. The unrelated legacy Studio
focus-label failure remains outside these corrections.

Focused browser evidence is in `fidelity/evidence/field-rules-v2-studio/report.json`,
`fidelity/runtime-routing/textarea-max-lines/field-rules-closure/report.json`,
and `fidelity/runtime-routing/boolean/field-rules-closure`.

Field Rules V2 closure corrections passed. Field Rules V2 is closed within its
documented supported subsets. Authentic multi-aspect Family Crop certification,
legacy-record retirement and unrelated renderer work remain separate.

## 1. Studio architecture

The default workspace is V2. Source ZIP import uses existing asset/font setup
before normalization; prepared V2 JSON is also accepted. Configuration drafts
commit through public Browser `configure()` transactions. Content edits use
typed controllers. One ordinary React session renderer supplies preview,
validation evidence and PNG. No Studio semantic interpreter or renderer was
added.

## 2. Field coverage

All seven fields have typed configuration and content controls: Text character
limits/warnings; Textarea character/visual-line limits/warnings; Image authorized
placements/default; Color optional palette; Number boundaries/step/format; Date
existing deterministic presets; Boolean structural visibility. Applicable fields
support choices. Stable field IDs are read-only; labels remain optional. The V2
UI contains none of the retired generic form rules.

## 3. Choices

Typed option controls support add/remove, label/value editing, up/down ordering,
and suggested/restricted mode. IDs survive edits/reordering. Core checks ID and
normalized-value uniqueness. Changing a selected option reconciles canonical
content explicitly; removing it clears selection provenance without reconstructing
a value from the renderer.

## 4. Ordering

Keyboard-operable reorder buttons replace `editableFieldOrder` atomically.
Core rejects invalid permutations. Family order can inherit or override;
reimport preserves surviving IDs and handles new/removed fields at its existing
boundary. Geometry does not consume editor order.

## 5. Control roles

Studio exposes an advanced opaque hint. Unknown roles remain valid. External
resolution is field-specific override, then recognized role, then default typed
control. No registry was introduced.

## 6. Family configuration

Common configuration plus sparse selected-variant overrides resolves through
existing Core Family authority. UI distinguishes inherited, overridden and
cleared properties. Collections replace atomically; optional collection `null`
clears inheritance. Imports match logical IDs and reject conflicting types.

## 7. Family Crop

Controls distinguish shared/default framing from selected-variant framing.
Replacement owns one shared asset; placement overlays contain no asset IDs.
Variant reset restores shared placement; field reset restores imported values.
The browser proof exercises variant framing, switching and V3 save/reload.
Its three labelled variants are product fixtures, not a new exporter-authored
multi-aspect source certification. That evidence gap remains explicit.

## 8. Validation UI

SDK states supply warnings, blocking errors, pending renderer evidence, valid,
invalid and inactive. Studio displays current line usage without counting lines.
The browser proof exercises over-limit correction, inclusive warning, hidden
Textarea inactivity and surface remounts. PNG uses session/product readiness.

## 9. Independent host

[`FieldRulesV2Host.tsx`](../../examples/template-editor-integration/src/FieldRulesV2Host.tsx)
is available through the existing example's `?fields-v2` route. It imports only
public SDK entries, enumerates ordered controllers, renders and exports through
the ordinary bridge, and presents current validation/readiness. The exact source
is also compiled in the isolated packed consumer without Studio imports.

## 10. Custom control

The `brand-color` palette calls ordinary Color `setValue()`. Field-specific
overrides and unknown-role fallback demonstrate that controls do not alter field
semantics. No SDK component library was needed; thin reference controls remain
in Studio/the example.

## 11. Host Crop

The example supplies a public normalized Crop on upload and through a fixed
center-crop control. It uses the same controller/materializer/renderer as Studio.
Number and Date inputs likewise submit canonical values without formatting them.

## 12. Public API and concrete integration fixes

- Added portable `TemplateFieldConfigurationV2` and single/Family session
  `configure()` transactions. Binding/default identity is not editable through
  this API. Configuration is not a second content setter.
- Added Core configuration reconciliation: one explicit content revision and
  one materialization per accepted transaction, retaining managed assets.
- Corrected the existing reducer guard so already-invalid semantic content can
  be corrected normally; structural/schema corruption still blocks mutation.
- Corrected local Blob replacement carriers to stored assets and obtain missing
  dimensions from local image decoding. No renderer-time network path was added.
- Fixed React StrictMode publisher acquisition, operation-revision checks and
  immediate pending publication on evidence-owner replacement. Read-side pending
  publication does not rematerialize. These were concrete browser integration
  failures, not renderer-layout changes.

The declaration/API and package-boundary snapshots intentionally include these
additions. Core remains free of UI component concepts; canonical values remain
authoritative and materialization remains one-way.

## 13. V1 compatibility

New source/V1 imports normalize into V2. Old saved work remains isolated behind
`?studio-mode=legacy`, with the existing fidelity route preserved. No V2 rules
were added to that editor and no formatted working values are inferred into
canonical content. Automatic conversion/retirement of old saved records is a
separate migration decision, not a second V2 runtime interpreter.

## 14. Persistence and reimport

Manual Save stores portable configuration plus canonical content; navigation
warns about unsaved work. Reload requests fresh evidence. Browser proof covers
single/Family configuration, order, content and framing persistence. Review-first
reimport retains stable-ID configuration/content; removed fields require explicit
discard approval. No line evidence or UI draft is serialized as canonical state.

## 15. Current-run verification

Passing checks include Core/Browser/React and Studio tests through full, portable
and strict realistic-ZIP suites; package/root typechecks; package, Studio and
example builds; API/boundary/release checks; archives; isolated Core and external
consumers; bundle budgets; and documentation links.

Browser-verified product evidence is in
`fidelity/evidence/field-rules-v2-studio/report.json`: actual Studio authoring,
seven-type content, preview/editor remounts, PNG, save/reload, reviewed reimport,
Family effective rules/framing, and the independent host. The separate session
smoke also passes persistence, PNG and offline reload.

Runtime regressions pass Stage 4A, all nine routing scenarios, Boolean, fonts,
vertical trim and Textarea line evidence. Source-backed current outputs include:

- `fidelity/runtime-routing/boolean/boolean-2026-09-04T13-18-45-716Z`
- `fidelity/runtime-routing/textarea-max-lines/textarea-max-lines-2026-09-04T13-30-14-997Z/report.json`
- `fidelity/evidence/crop-source/field-rules-v2-m7/deal-of-the-week-banner-crop-editable/png-export`

The fresh `fidelity/candidates/field-rules-v2-m7` baseline is exact across two
captures of all 23 fixtures and four surfaces. All 92 first-capture PNGs are
byte-identical to `milestone-6-final-regression`. No approved pixel, scene,
settlement reference or tolerance was changed.

## 16. Bundle/API impact

Core's intentional declaration is 108,339 bytes, SHA-256
`c1cf61b25cd191a03bbd73d60bcc0085cc6d1fc10b50d91a08cc0d7bfdd4a9f1`.
Public API and protected boundary checks pass with this identity. Curated
entry-point bundles remain within existing recorded budgets; M7 required no
budget increase. Studio/example builds retain their known large-chunk warning.
Harnesses, fixtures and source-comparison tooling remain outside production.

Final measurements: Studio main JS 1,429.32 kB / 397.78 kB gzip; isolated packed
host 1,194,377 / 328,596 bytes; curated renderer 677,211 / 165,102 bytes and V2
React field-session entry 1,024,462 / 230,885 bytes. These are bundle-size
observations, not runtime-performance benchmarks.

## 17. Known failing gates

Guarded renderer, scene and settlement comparisons retain historical
fail/unapproved classifications; the exact 92-image comparison establishes no
M7 pixel change rather than pretending these gates are green. No update command
was used. The isolated legacy Studio smoke still times out at the existing
Family-menu focus-label mismatch (`Actions for Blue Portrait` versus the
`More actions for Blue Portrait` trigger). The new V2 flow does not intersect
that menu and its independent browser proof passes.

## 18. Documentation

Updated the Field Rules index, authoring/host guide, session/kernel and migration
guides, package/example READMEs, ADR index/0081, capability/fixture/property
authorities, Status and Handoff. This report records implementation evidence;
the [authoring guide](STUDIO_AND_HOSTS.md) is the reusable public guide.

## 19. Intentionally unsupported concerns

No DAM/CMS, quotas, authentication, remote choices, required-before-publish,
general form validation, timezone framework, conditional content, plugin
registry, additional renderer or field type was added. Alpha Color input and
broader renderer features retain their existing deferred boundaries. Native V2
JSON expects prepared canonical assets/fonts; ZIP import retains font setup.

## 20. Completion decision

Field Rules V2's seven implementation milestones are complete within their
documented runtime/source-supported subsets. This is not a claim that every
historical repository gate is green, every old saved record is migrated, or
Family multi-aspect Crop has acquired missing authentic source certification.
Those limitations do not introduce a second mutation or rendering authority.
