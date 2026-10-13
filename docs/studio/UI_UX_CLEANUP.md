# Studio UI/UX cleanup

This cleanup uses the current Studio workflow and existing design-system components.
It does not change public SDK contracts, canonical content, persistence formats,
rendering semantics, or renderer reference images.

## Implementation

- Draft Editor uses authored field labels, one diagnostics action, separate
  autosave status, and the existing MediaInput. Framing controls remain available
  in template configuration and are omitted from the output-content list.
- Character counters are neutral below 80%, attention-yellow from 80%, and
  blocked-red at the exact maximum. Studio rejects new character or measured
  visual-line overflow before calling the V2 controller, so canonical content,
  autosave, preview, diagnostics, and export readiness do not change.
- At the exact rendered-line maximum, Studio replaces the advisory line warning
  with one blocked-red maximum status and omits the redundant diagnostic issue.
- Textarea line preflight measures candidates from the mounted preview node's
  current width and computed typography. Deletions remain available while
  measurement is pending, and existing invalid saved values are never truncated.
- Studio preview sizing follows the left content panel composition. At constrained
  widths the content panel scrolls independently and the preview has a bounded row.
- Fields retains explicit candidate Apply. A Studio-local confirmation offers
  Apply, Discard, or Stay before leaving unapplied settings. Clean navigation stays
  synchronous to preserve validation inspection timing.
- Field identity and host role move into Advanced; coverage is neutral metadata.
  Correction targets remain reachable even when ordinary filters exclude them.
- Validate retains its quality panel and diagnostic context. Missing evidence does
  not produce a success message; residual Draft readiness is not labelled Family-wide.
- Library lineage uses available template names. Compatibility navigation and empty
  existing-work states are secondary. Font usage is disclosed, and Review uses a
  definition list and the existing footer save gate.

## Verification

Current-run automated checks: portable tests, SDK API contract, package boundaries,
documentation links, and Studio production build passed.

Current-run Chromium suites cover `studio:setup`, `studio:drafts`, and
`field-rules:studio`. Draft assertions include staged-field confirmation, distinct
counter states, rejected wrapped/newline/choice overflow, revision stability, and
the simplified image controls. Desktop and 768-pixel workflow captures are
inspected separately from automated assertions.

Browser evidence is written separately under `fidelity/evidence/studio-phase-5-setup`,
`fidelity/evidence/studio-phase-5-drafts`, and `fidelity/evidence/field-rules-v2-studio`.
These are workflow captures, not renderer goldens. No renderer goldens were updated.
