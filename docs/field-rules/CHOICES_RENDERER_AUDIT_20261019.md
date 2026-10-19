# Choices → canonical content → renderer audit — 2026-10-19

**C1 and C2 are now resolved.** See the
[fixes and current verification](CHOICES_RENDERER_FIXES_20261019.md).
This document retains the original audit findings and before-fix evidence.

At the audit baseline, the Core/materializer boundary held, but two reproducible
Family orchestration/presentation gaps remained. Neither required a renderer
rewrite, new saved-record schema or public API. The original audit changed tests
and documentation only; the subsequent bounded fix preserves existing worktree
changes.

## Findings at the audit baseline

### C1 · P1 · Design-only configuration can silently rewrite shared content

[Family configure](../../packages/template-browser/src/session/templateFieldFamilySessionV2.ts)
(original lines 979–985) reconciles every selected-design field whenever that design
appears in `update.variants`. It does not first determine whether that field's
choices actually changed. Common-field reconciliation already checks a choices
delta; the selected-design branch does not.

Reproduction, using valid restricted configurations:

1. Design A has `{ id: "primary", value: "Alpha" }`; Design B overrides the same
   option ID with `"Bravo"`. Their imported defaults are Alpha and Bravo.
2. Explicitly select primary in A. Shared content is
   `{ value: "Alpha", selectedChoiceId: "primary" }`, revision 1.
3. Switch to B. Shared content correctly stays unchanged. B reports the real
   ID/value mismatch and blocks export.
4. Configure **only B's field order**, passing its unchanged field overrides.
5. Shared content silently becomes
   `{ value: "Bravo", selectedChoiceId: "primary" }`, revision 2, although B's
   effective choices are byte-for-byte unchanged.

That is an implicit content edit induced by ordering. Switching back also carries
that changed shared value into A. This is a native SDK reproduction; Studio's
[design-scoped ordering](../../apps/studio/src/field-rules/StudioFieldRulesV2.tsx)
and [Setup ordering](../../apps/studio/src/setup/SetupFields.tsx) call the same
configuration branch. It does not mean editing a saved template rewrites every
independent output draft.

**Fix:** reconcile only fields whose choices changed under the affected
configuration authority. Order-only, label-only and unrelated rule updates must
preserve canonical entries and selected-choice provenance. Keep actual option
value edits/removal on Core's existing reconciliation path. Add regressions for
an already incompatible selection, order/inherit-order/label changes, and both
selected and nonselected design updates. Preserve operation/evidence invalidation
without manufacturing a content revision.

### C2 · P2 · Restricted dropdown can display a value it has not accepted

[Choice projection](../../apps/studio/src/field-rules/FieldContentEditorV2.tsx)
(original lines 108–109) prefers an option by selected ID without verifying its canonical
value. The same projected match suppresses the current-value repair message
(line 217).

After step 3 above, the real Studio dropdown displays **Bravo**, but the native
entry is still **Alpha / primary** and export is blocked. With only one configured
option, ordinary ArrowDown/Enter produces no change event because Bravo is
already displayed as selected. The actual canonical Alpha value is not shown in
the restricted control. The generic mismatch error is present, so the user sees
an error beside an apparently correct choice and an unavailable preview.

The isolated Chromium reproduction records zero change events and unchanged
canonical content after keyboard selection. It deliberately does not use
Playwright `selectOption()` as evidence of user repair, since that method
artificially dispatches a change even for the same selected option. Reset is a
working repair path and PNG remains blocked; this is not an export bypass.

**Fix:** a saved selected ID must match both ID and canonical value before the
control presents it as selected. Only literal/default content without saved
choice identity may use value-only matching. An incompatible/unknown ID should
show a repair placeholder and the actual canonical value, with all valid options
selectable through an ordinary change event. Keep native errors authoritative;
do not silently repair content during rendering.

[Restricted mismatch screenshot](../architecture/evidence/field-rule-patch-20261019/choices-renderer-audit-20261019/restricted-mismatch.png)
and [machine-readable findings](../architecture/evidence/field-rule-patch-20261019/choices-renderer-audit-20261019/report.json)
contain the reproduced state.

## Boundaries that held

The five supported types—Text, Textarea, Number, Date and Color—share Core's value
validator. Choice IDs are saved provenance; values remain typed canonical data.
The ordinary one-way materializer writes text, formats Number/Date and applies
Color to the exact indexed fill. Rendering does not recover content from labels,
formatted strings or DOM. Image/Boolean choices and Family design selectors are
separate contracts.

| Boundary | Current-run evidence |
| --- | --- |
| Canonical selection | All five types preserve option IDs and string/number values in single and Family native sessions. Unknown IDs reject atomically; Core rejects ID/value mismatch and unlisted restricted literals. |
| Configuration | Stable labels/order preserve identity; actual selected-option value changes update content; removing an option retains the literal and clears identity; reset restores the imported default. C1 is the exception for an already incompatible design-scoped selection. |
| Authoring | Portable tests cover typed drafts, portable/unique IDs, duplicate canonical values, invalid dates/numbers/colors, ordinary limits, Family inherited defaults and independent variant clears. |
| Materialization | Actual text and formatted `$12.50` / `16/04/2026` are correct; Color lowers to canonical RGB and retains alpha. Warnings remain advisory. |
| Studio transactions | Choices supersede their own pending/invalid draft while preserving another field's invalid draft. Numeric zero is accepted and restored through persistence. |
| Painted line rules | A safe multiline choice settles in the visible renderer. An overflowing choice is provisional, then restores the preceding accepted choice ID and value at a newer revision, with no false Check input state. |
| Recovery | Holding actual line evidence beyond the autosave deadline never writes the overflow choice. Completed durable recovery and reload preserve all five accepted selections in both session kinds. |
| Family switching | Compatible designs retain shared choice provenance. Incompatible designs retain the shared value and expose the real errors without a switch-induced rewrite. |
| Reimport | Both native reimport paths retain canonical choices/identity; a stale reviewed plan cannot overwrite a newer selection. |
| PNG | Both real Studio output workflows produce guarded PNGs from accepted content. A real mismatch blocks PNG; Reset restores readiness. No pixel-equivalence claim is made. |

## Original verification and subsequent regression gate

The audit harness is now a strict regression gate in the standard field-rules
command. It writes current evidence separately from the original audit files.

Harness:
[scripts/field-rules/choices-audit.mjs](../../scripts/field-rules/choices-audit.mjs).
It uses isolated browser storage and a test-only adapted source fixture with
system fonts; it does not touch user templates, source fixture bytes, approved
references, tolerances or production code.

```sh
node scripts/field-rules/choices-audit.mjs          # Strict regression gate after the fix
node scripts/field-rules/choices-audit.mjs --check  # Equivalent explicit check invocation
```

- Original audit: **78 positive assertions passed; C1 and C2 reproduced**.
  At that baseline, `--check` exited 1 on those two findings after finishing
  the positive scenarios.
- Fresh portable suite: passed, including semantic kernel, choice authoring,
  single/Family configuration, persistence/reimport and draft coordinator tests.
- Original standard field-rules gate: passed, including the earlier **50/50**
  architecture checkpoints, output regressions and delayed-evidence scenarios.
  That gate did not cover C1/C2. The subsequent fix adds the strict choices
  regressions to the same command; see the linked closure report.
- Script syntax, documentation links and whitespace checks are recorded in the
  [verification manifest](../architecture/evidence/field-rule-patch-20261019/choices-renderer-audit-20261019/verification.json),
  alongside logs and source fingerprints.

Browser: headless Chromium 149.0.7827.55. PNG captures and screenshots are contract
and integration evidence, not source-design certification. No manual Figma or
exact-font fidelity review was performed. The previously registered
`template-package-carrousel-v0.6.1.zip` is still absent; this audit does not replace
it or claim the exact-font gate passed.

An initial recovery assertion was discarded because its asynchronous polling
returned before the storage predicate completed. Explicitly awaiting completed
IndexedDB reads showed matching current, persisted and restored revisions. This
is recorded as a harness correction, not a product finding. All final recovery
assertions use completed reads; the new audit has no asynchronous
`waitForFunction` predicates.
