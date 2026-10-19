# Choices boundary fixes — 2026-10-19

Both findings in the [choices audit](CHOICES_RENDERER_AUDIT_20261019.md) are fixed.
The ordinary Core materializer and renderer remain the content/rendering
authorities. No public API, saved schema, migration, fixture bytes, references or
tolerances changed. Earlier worktree changes are preserved.

## Family reconciliation (C1)

Family configuration compares choice option ID/value mappings before deciding
which fields to reconcile. Labels, ordering and mode changes do not change that
mapping. Common changes retain their existing authority and work even when the
selected design lacks the field. Selected-design changes compare previous and
next effective choices and pass only affected entries to Core reconciliation.
Edits to nonselected designs do not rewrite shared content.

An incompatible shared Alpha/primary entry therefore survives field reordering,
return to common order, field/option labels, option order, mode and unrelated rule
changes. Actual option value changes still update their field; removal and clear
retain the canonical literal while clearing choice identity. Inheriting a changed
choice map still reconciles through Core. Editing another field's choice never
reconciles the incompatible entry.

Configuration continues invalidating native controllers and runtime evidence.
Unchanged content retains its canonical state/revision. A real canonical change
advances once in the ordinary transaction, with one configuration publication.
Core's one-way reducer/materializer was not changed.

## Dropdown projection and repair (C2)

A saved selection is displayed only when both its ID and canonical value match
an effective option. Value-only matching is available for literal/imported-default
content with no saved choice identity. This prevents both a known-ID/value
mismatch and an unknown ID whose value happens to match another option from
appearing already selected.

Restricted controls show Choose a value and the actual canonical value while
native errors continue blocking export. The user can select the sole configured
option through an ordinary browser change event; that action retains the normal
native controller, deferred-draft and rendered-line validation paths. Projection
never mutates content. Reset remains available.

The browser regressions use actual type-ahead keys and Enter to repair both
cases. They assert a real change event, accepted value/provenance, cleared errors
and current export readiness. Arrow navigation is inert in this headless macOS
select implementation; synthetic selectOption dispatch is not used as proof of
repair. The general five-type workflow still exercises native selectOption for
ordinary integration setup.

## Verification

The [verification manifest](../architecture/evidence/field-rule-patch-20261019/choices-renderer-fixes-20261019/verification.json)
records current checks, source fingerprints and logs. The
[browser report](../architecture/evidence/field-rule-patch-20261019/choices-renderer-fixes-20261019/report.json)
and repair screenshots record the strict choices gate. Original failing evidence
remains in the audit directory.

- **88/88 choices checks and 50/50 existing architecture checkpoints pass.**
  Both original findings are no longer reproduced.
- Portable suite includes a new native regression matrix for configuration-only
  updates, scoped option edits/removal/clear/inheritance, old-controller
  invalidation and one-publication/revision behavior.
- The standard field-rules command now requires choices regressions alongside
  the earlier 50 architecture checkpoints, normal Studio/custom-host output,
  draft limits and delayed-evidence transaction scenarios.
- Five-type single/Family selection, typed materialization, Number/Date formatting,
  canonical Color, zero, choice provenance, save/reload/reimport, provisional
  overflow recovery and guarded PNG remain covered by the browser gate.
- Package/Studio builds, TypeScript, public API, package boundaries, script
  syntax, documentation and whitespace verification are recorded in the manifest.

```sh
node scripts/field-rules/choices-audit.mjs --check
node scripts/field-rules/studio-v2.mjs
node scripts/run-tests.mjs --portable
```

Evidence uses isolated browser storage and a system-font integration fixture.
No user templates were changed. This is contract/integration closure, not a
source-design pixel certification. The registered exact-font carousel ZIP
remains missing; no substitute or exact-font certification is claimed.
