# Phase 6 — Studio workflow restoration acceptance

## Scope

Phase 6 closes and certifies the restored V1 Studio workflow around the current
V2 Family, field-rule, content, persistence, and rendering authorities. It adds
no public SDK contract, persistence version, canonical schema, renderer change,
migration, service worker, or visual redesign.

## Accepted workflow responsibilities

| Screen | Accepted V1-equivalent capability | V2 authority retained |
| --- | --- | --- |
| Library | Template cards, recent Draft rows, Existing work, lifecycle recovery | Canonical entity locators and existing repositories |
| Package/Family | ZIP intake, progressive Family controls, rename/order/remove/reviewed replace | Candidate V2 Family sessions and stable IDs |
| Fonts | Exact managed-font preparation and saved reopening | Existing font assets, requirements, and reimport authority |
| Validate | Central grouped issue workbench with owning-step correction links | Existing source, field, renderer, and readiness evidence |
| Fields | One ordered workspace for Common rules, sparse coverage, and variant overrides | Seven V2 field editors and configuration transactions |
| Add/Review | Final summary and explicit save gate | Current validation and persistence result |
| Template Settings | Reusable source/configuration editing with accurate dirty state | Persisted accepted baseline and explicit save |
| Draft Editor | Independent canonical content, autosave, preview, diagnostics, and PNG | Captured configuration, V2 content, and serialized autosave |

The matrix in `WORKFLOW_RESTORATION.md` remains the ownership contract. Motion
or MP4 export, template Rename/Duplicate actions, selection groups, cross-ID
field linking, hard-offline shell delivery, and visual redesign are not part of
this acceptance.

## Closure changes

- Reviewed Family replacements are bound to their exact target, accepted
  session epoch, and operation revision. Changing target, leaving the owning
  step, or accepting another Family state invalidates the review.
- Duplicate canonical variant labels receive source-, size-, and ordinal-based
  presentation labels in Family controls, Validate, Fields preview, and Draft
  selection. Saved labels and IDs remain unchanged.
- V2 field issues do not expose configuration-property provenance. Validate
  therefore opens ambiguous field corrections in Common scope while retaining
  the field and variant context; users deliberately enter Variant scope to edit
  an override.
- Draft creation publishes the returned saved record to Library state before
  attempting to open it. If opening and refresh both fail, the row remains
  visible with independent Retry open and Retry Library refresh actions.

## Current-run verification

Completed on 2026-09-07:

- `pnpm test:portable`
- Studio TypeScript and production build
- `pnpm api:contract`
- `pnpm boundaries:check`
- `pnpm docs:verify`
- `pnpm studio:setup`
- `pnpm studio:drafts`
- `pnpm field-rules:studio`
- `pnpm studio:workflow-acceptance`

The acceptance run hash-checks and exercises these exact registered archives:

- `exporter-061-deal-of-the-week-post`
- `deal-of-the-week-banner-crop-editable`
- `field-rules-boolean-structural-visibility`

The real-package journey covers reusable single setup, exact fonts, seven
imported fields, a sparse portrait/landscape Family, editable image placement,
independent Drafts, Boolean structural visibility, autosave, reload, and guarded
PNG export. The established synthetic browser suite remains explicit coverage
for number, date, and color because no registered exporter archive supplies
those types.

Chromium reports and inspected desktop/768 evidence are stored in:

- `fidelity/evidence/studio-phase-6-workflow-acceptance/`
- `fidelity/evidence/studio-phase-5-setup/`
- `fidelity/evidence/studio-phase-5-drafts/`

Renderer goldens were not run or updated because this phase changes Studio host
workflow only. Proven SDK blockers: none. The restored workflow baseline is
accepted for the later visual redesign.
