# Field Choices audit — 2026-10-10

**Historical audit:** its pause recommendation was superseded by the approved
Complete Choices implementation. See [the implementation and current verification](field-choices-implementation.md).
The findings and retained baseline below remain auditable; they do not describe
the repaired current UI. Regenerate the historical browser findings with
`node scripts/repository/audit-field-choices-browser.mjs --historical`.

The recommendation is to pause new Choices authoring in Studio, preserve existing
configured templates and SDK semantics, and postpone a redesigned experience until
its product purpose is agreed. This is an audit recommendation, not authorization
to remove data or implement a new flow. Production code is unchanged.

The recorded starting gate is `sdk-061-media-underlay-20261010a`. This audit ran
controlled public-operation probes and an isolated Studio browser workflow; it did
not rerun the full release or fidelity gate. Exact active Now Hiring, Cover and
Carrousel ZIPs contain **zero configured Choice sets across 21 fields**. That
establishes absence in the release corpus, not absence in user-saved templates.
No user storage, current browser tab or unsaved work was inspected or changed.

## What currently exists

Choices is an optional static list on Text, Textarea, Number, Date and Color;
Image and Boolean have no such list. It is not an eighth field type and is separate
from Family design selectors. Suggested lists allow other valid values. Restricted
lists permit only configured canonical values. Each option has a portable stable
ID, optional label and typed value. Values still have to satisfy ordinary rules.

Core owns configuration/value validation and selected-option reconciliation.
Browser controllers expose `selectChoice()` alongside normal `setValue()`. Saved
content retains the canonical value and optional `selectedChoiceId`. Editing the
value of an option with the same ID changes content that selected it; removing an
option preserves its content value and drops the identity. Removing an option can
therefore leave restricted content invalid. Family configuration replaces lists
atomically; explicit null clears them, while removing an override restores shared
configuration. These behaviors have existing Core/Browser tests and are intentional
canonical mechanisms. The problematic Studio experience does not demonstrate that
the underlying semantic model should be discarded wholesale.

## Findings

| Finding | Evidence and impact | Disposition |
| --- | --- | --- |
| **P2: A valid selection cannot recover an invalid draft.** | Browser-reproduced: select Alternative, type an out-of-list value, then select the allowed original value. The text stays invalid, the previous selection remains, and export stays disabled. `FieldContentEditorV2.tsx:151` calls `flushKey()` before `selectChoice()`, while `deferredFieldDrafts.ts:71` refuses invalid input. | Repair if existing Choice fields remain supported. A deliberate valid choice needs an explicit draft-replacement policy; do not weaken restricted validation or export readiness. |
| **P2: Enabling Options only starts with an invalid default.** | Browser and native reproduction: Studio seeds `option-1` with generic `Option`, then Apply fails because the imported default is not in that list. Carrousel Subtitle defaults to `Online & in-storeee`. The UI supplies no source-aware explanation or matching seed. | Authoring problem. Core's default validation is correct and preserves imported-default Reset. If retained, seed/communicate that requirement rather than relaxing it. |
| **P2: Family Choices lacks the ordinary inheritance controls.** | Source inspection: other settings go through `property()` and offer Inherited/Overridden/Cleared plus Use shared value. The Choices disclosure bypasses it. No choices calls `update()` and writes `choices: null` for a variant; it clears shared settings rather than returning to inheritance. The supported native operations can clear and restore inheritance, verified by a controlled Family probe. | UI gap. Not claimed as a Family browser reproduction. |
| **P2: Important changes are not explained.** | Controlled native probes show that changing an option's value rewrites selected content; deleting the selected restricted option retains its value with a blocking error. The Studio option editor exposes Edit/Remove without explaining these consequences. | Product semantics need an explicit decision, not an automatic content reset. |
| **P3: Generalized authoring exposes technical complexity without a demonstrated baseline use case.** | IDs, labels, values, ordering and two modes appear across five field types; the output retains both a free-value control and a choices dropdown even in restricted mode. Studio locally checks only empty/duplicate trimmed IDs, while Core additionally checks portable IDs, duplicate normalized values and all ordinary field rules. | Reconsider scope after defining actual uses such as approved copy or a color palette. Do not assume all five types need the same experience. |

Typing a value equal to an option does not automatically establish selected-option
identity. The probe confirms this; it is an intentional difference between entering
a literal and selecting a named option, not classified here as a defect.

## Removal options and audit alignment

| Scope | Benefit | Consequences |
| --- | --- | --- |
| Pause creation for fields with no Choices; retain existing configured fields | Simplifies normal setup immediately and preserves existing behavior/data | Existing restricted fields still need the recovery correction above. No public API or storage removal. Recommended bounded next milestone. |
| Remove Studio authoring and editing of Choices altogether | Maximum UI reduction | Requires a decision for already-configured restrictions, selected identities, Family overrides and recovery. Simply hiding the dropdown can leave fields unusable. |
| Delete Choices from SDK/schema/content as well | Removes the entire feature | Breaking type/controller/schema change; needs measured saved-data migration, API baselines/docs/tests and packed-host verification. No current external hosts does not remove local saved-template risk. |

The architecture audits favored incremental changes behind canonical authorities,
lossless saved content and explicit failure/resource boundaries. Pausing a product
feature is compatible with that approach. Replacing the field kernel, sessions or
persistence because the UI is confusing is not supported by this audit's evidence.
Keep Family design selection, Choice identity handling for retained records and
all seven ordinary field types outside any accidental removal.

No value proposition or redesign was invented here. Before reimplementation,
settle which users need approved presets versus optional suggestions, what should
happen to selected outputs when a preset changes, and whether scope is global or
per Family design. Current behavior is not a substitute for those product choices.

## Current-run evidence

[Durable audit record](evidence/field-choices-audit-20261010.json) retains current
implementation and probe hashes, exact ZIP identities, outcomes and regeneration
commands. Run `node scripts/repository/audit-field-choices-native.mjs` after packages
are built; it verifies manifests and exercises isolated repositories/sessions.
Run `node scripts/repository/audit-field-choices-browser.mjs` with exact font files
available; it uses a disposable Studio server/context and intentionally reproduces
current defects. These assertions document current behavior and must change when
those defects are repaired; they are not acceptance tests endorsing them.

The stored restricted-choice screenshot was personally inspected. Browser evidence
covers a Text field on single Carrousel through configuration, save and output.
Other field types and Family UI received source review; Family null/inheritance
and native reconciliation received controlled Node coverage. No manual interaction
with the user's live page, full five-type browser matrix, performance benchmark,
reference promotion or fresh fidelity certification is claimed.
