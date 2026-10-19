# Field rule → renderer boundary fixes — 2026-10-19

The three findings in the [architecture audit](FIELD_RULE_TO_RENDERER_AUDIT_20261019.md)
are resolved. All 50 architecture checkpoints now pass. The new regressions run
inside `node scripts/field-rules/studio-v2.mjs`, alongside the existing workflows.

## Changes and authority

| Boundary | Implemented behavior |
| --- | --- |
| Native evidence | Single sessions retain a minimum accepted generation across invalidation, matching Families. Identical reload/reset cannot revive earlier evidence. Both session kinds suspend publication during saved-record restoration and remain non-exportable on failure. A newer accepted operation supersedes the old restore. Native error policies and React's operation guards remain intact. |
| Family diagnostics | Settings passes complete V3 content and current replacement assets to Core's Family materialization path. It projects effective per-design issues, including placement-only changes, preserves severity and deduplicates findings. Imported defaults and valid Fill/Fit/Crop overrides do not generate false red errors. No renderer is mounted for diagnostics. |
| Studio text | Character maxima remain synchronous and grapheme-based. Textarea line acceptance comes from current painted evidence. Studio previews a candidate in the ordinary renderer and restores the preceding canonical entry on confirmed overflow, preserving default/choice/custom provenance. The previous-width mirror veto was removed. |

The private Studio transaction owns source/design/configuration, operation and
content currentness. The native session continues owning typed values and the
renderer continues owning visual lines. Rollback uses ordinary controllers and
advances revisions; it never reinstalls an old snapshot or derives text from DOM.
The direct SDK controller contract is unchanged: hosts may keep render-invalid
content editable while PNG remains blocked.

Typing retains 100ms trailing / 325ms maximum-wait coalescing. New local input can
continue while older evidence settles; older UI callbacks cannot replace it.
IME keeps its pre-composition draft and validates that baseline before the final
candidate. Other canonical writes share the transaction barrier; earlier valid
text drains before visibility/image actions, without forcing unrelated incomplete
Number/Date/Color input to commit.

A transaction has a 10-second validation deadline. Unavailable evidence is never
accepted as proof of validity; an owned restorable checkpoint is restored with a
notice. Source/design/session replacement or disposal cancels the old owner,
which cannot compensate against replacement context. Known existing overflow can
be reduced progressively. Corrections reducing deterministic errors remain
possible while the preview is unavailable. Unrelated errors do not authorize
unvalidated text growth.

## Persistence and export

Provisional revisions are excluded from recovery capture. Save, navigation,
Family selection and PNG drain pending transactions; recovery stores accepted or
restored canonical state. Closing/reloading during validation resumes the last
accepted recovery rather than the transient candidate. A successful restoration
clears the local invalid-input state. Later resize/font/design changes expose
ordinary validation errors without retroactively rewriting text.

No public SDK API, schema, migration, Core materializer, renderer geometry,
source fixture, approved reference or tolerance changed. Existing worktree work
was preserved; the earlier React remount-recovery fix remains in place.

## Current-run verification

- Package builds; portable suite, including new native reload/restore and Studio
  transaction ownership, default/choice provenance, timeout, cancellation, repair
  and mutation-barrier tests.
- Full Studio field-rule gate: existing authoring/custom-host cases plus the
  single/Family output matrix, all **50/50** architecture checkpoints, and new
  delayed-evidence transaction scenarios.
- Actual Studio auto-width input, explicit/wrapped line rejection, IME rollback,
  stricter Family rules, inactive text, correction and PNG/recovery completion.
- Deliberately held real line evidence in isolated browser contexts: no
  provisional value reaches `recovery.save` after the real autosave deadline;
  visibility and Family selection wait; reload during validation restores
  accepted recovery; PNG drains validation. Both session kinds passed.
- Studio drafts and recovery gate, including bounded typing, image replacement,
  offline resume, supersession, failed export and cleanup retry.
- Setup gate: 20 workflow checks, including Common/sparse authoring, source
  replacement, managed-font setup, all-design review, save/reopen and responsive
  layouts. Family media restore/decode and invalid/missing-asset checks passed.
- Studio TypeScript and production build, public API contract, package boundary,
  documentation-link and whitespace checks.

[Verification and source fingerprints](../architecture/evidence/field-rule-patch-20261019/field-rule-renderer-fixes-20261019/verification.json),
[architecture results](../architecture/evidence/field-rule-patch-20261019/field-rule-renderer-fixes-20261019/architecture.json)
and [delayed-evidence browser results](../architecture/evidence/field-rule-patch-20261019/field-rule-renderer-fixes-20261019/transactions.json)
record the evidence. No user templates were modified by the isolated tests.

The registered `exporter-061-carrousel` ZIP remains missing. The separate
`editor:verify` exact-font/performance gate therefore cannot be certified; no
replacement archive or weakened gate is used. Browser typing timings are
observational. The production build retains its existing large-chunk advisory.
This milestone does not claim source-design pixel certification.
