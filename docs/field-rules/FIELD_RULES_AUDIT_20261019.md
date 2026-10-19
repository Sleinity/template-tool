# Studio field-rules audit — 2026-10-19

## Outcome and scope

Audited the current Studio host against the two reported screenshots, the seven
field types, single-template sessions, and Family common/sparse configuration.
The fixes cover Studio input guards/diagnostic presentation and the existing React
renderer bridge publication lifecycle. No public SDK API, schema, renderer pixels,
image placement, readiness acceptance, persistence, source fixture, approved
reference or tolerance was changed. Existing saved work is preserved.

## Confirmed findings and corrections

| Finding | Cause | Correction |
| --- | --- | --- |
| P1: Textarea typing could exceed the configured rendered-line maximum | Ordinary typing called the character guard only; the existing line guard was used for choices | Route ordinary typing, paste and completed IME input through both guards. Keep the previous value when growth exceeds a limit. |
| P2: Every untouched Family image could show a red placement error | The all-design diagnostic adapter sent imported defaults to the replacement-value validator | Preserve imported-default provenance. Validate sparse replacement overrides normally; source/package validation continues checking defaults. |
| P1: Correcting canonical content could leave line validation pending | The inner renderer remounted after a canonical error, restarting its local generation counter under the old publication lease | Renew the committed publisher lease when the renderer becomes available again. Existing revision and stale-publication guards remain strict. |
| P2: Family advisory findings appeared as errors | The adapter discarded issue severity and the view styled all findings as errors | Carry native severity through to warning/error presentation. |

Character maxima were already grapheme-based and enforced during ordinary input.
The reported screenshot showed a separate visual-line violation below the
character limit. Both constraints now participate in the Studio input guard.
The IME rollback also keeps its actual rejection reason and preserves a valid
pending draft instead of reporting every rejection as a character-limit failure.

## Preserved behaviour

- Native SDK controllers and current painted-text evidence remain authoritative;
  the Studio mirror is only an input guard, never renderer evidence.
- A stricter Family design can make previously shared content invalid. Switching
  designs preserves that content, displays its real errors, and blocks export
  until corrected. It does not silently truncate shared text.
- Existing over-limit content remains visible and can be reduced or reset.
  Structurally inactive fields do not apply visual-line limits; showing them
  requires fresh authoritative validation.
- Configuration Apply accepts a form draft; Save in Review persists it. Output
  autosave/recovery is a separate lifecycle.
- Invalid replacements and policy/crop conflicts still surface. The fix does not
  hide genuine image errors or change source crop behaviour.

## Current-run verification

- Portable suite, including Core/Browser/React rule, content, image, readiness,
  persistence and stale-publication regressions.
- `node scripts/field-rules/studio-v2.mjs`: all seven controls, rules, choices,
  ordering, Family overrides, source replacement, invalid crop repair, reload,
  and PNG. The standard gate now also runs `audit-regressions.mjs`.
- `node scripts/field-rules/studio-drafts.mjs`: hard limits, invalid input,
  composition, bounded typing, image replacement, offline resume, and PNG;
  includes single/Family recovery ownership, supersession and cleanup tests.
- `node scripts/field-rules/studio-setup.mjs`: common and per-design authoring,
  guarded Apply/Discard, retained configuration, exact font preparation, checks,
  save/reopen and responsive layouts. Its real-package scenario was updated from
  an obsolete exporter archive to the admitted, registered 0.6.1 post ZIP, using
  its manifest path and unchanged SHA-256 gate.
- Focused single/Family [browser matrix](../architecture/evidence/field-rule-patch-20261019/field-rules-audit-20261019/report.json): explicit newlines, automatic wrapping, grapheme limits,
  completed and pending IME input, stricter variants, inactive fields, correction,
  PNG and recovery completion. Input-handler timing is observational, not a
  performance certification.
- Studio TypeScript, production build, public API contract, package boundaries,
  documentation links, and whitespace checks.
- The user's open four-design Family Settings was inspected before and after the
  fix. A locally retained screenshot shows Main expanded without the false red
  errors. That screenshot of user content is excluded from the release; no user
  template was edited.

## Limits

The separate exact-font `editor:verify` run could not start because the registered
`exporter-061-carrousel` ZIP is absent at its expected path. A hash search of the
available template archives did not find those exact bytes. No substitute archive,
fixture registration, golden update or full fidelity certification is claimed.
The Studio build retains its existing large-bundle advisory. Automated Chromium
coverage and the live image-panel check do not constitute a complete manual
screen-reader or native-picker review.
