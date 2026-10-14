# Phase 5 — V1 workflow parity closure

## Scope

Phase 5 closes the remaining interaction defects around the restored V1 Studio
workflow. It retains Library → Package/Family → Fonts → Validate → Fields →
Add/Review, reusable Templates, independent Drafts, the V1 editor shell, and the
current V2 Family, field, content, persistence, and rendering authorities.

This phase adds no public SDK API, persistence version, canonical schema,
renderer behavior, field semantic, migration, service worker, or visual redesign.

## Implemented behavior

- Validate correction links carry their owning variant, field, and Common or
  Variant scope into Fields. The owning card expands, scrolls into view, and
  receives focus without changing accepted configuration.
- Package intake uses the historical keyboard- and drag-accessible dropzone.
  Product copy describes exporter ZIP packages; JSON remains available only to
  local development and browser fixtures.
- Family replacement starts from the selected design's action menu and retains
  reviewed-reimport ownership. Escape cancels a rename draft, while accepted
  rename, reorder, replace, and remove operations remain candidate transactions.
- Field ordering announces the accepted position and restores focus to the moved
  field. Boundary actions that cannot change the order are omitted.
- The five setup steps and Draft Editor fit the supported 768-pixel workspace
  without horizontally clipped controls.
- If draft persistence succeeds but its first load fails, Library refreshes and
  exposes the new Draft with a canonical Retry action. Failed persistence still
  publishes no Draft.
- Draft diagnostic counts present existing field and readiness evidence once;
  no additional validator was introduced.

## Verification

Current-run checks completed on 2026-09-07:

- `pnpm test:portable`
- Studio TypeScript and production build
- `pnpm api:contract`
- `pnpm boundaries:check`
- `pnpm docs:verify`
- `pnpm studio:setup`
- `pnpm studio:drafts`
- `pnpm field-rules:studio`

The setup browser run covers keyboard and drag source intake, sparse Family
coverage, correction target scope/focus, accessible ordering, candidate Family
mutations, exact fonts, all five steps, and explicit 768-pixel overflow checks.
The draft run covers persistence-before-load recovery, canonical Retry, editor
fit at 768 pixels, independent content, autosave, conversion, shared assets,
seven field types, image framing, and PNG export.

Chromium reports and desktop/768 screenshots are written separately to:

- `fidelity/evidence/studio-phase-5-setup/`
- `fidelity/evidence/studio-phase-5-drafts/`

Renderer goldens are not run or updated because this phase changes Studio host
workflow only. The desktop and 768-pixel screenshots were inspected in this run.
Proven SDK blockers: none.
