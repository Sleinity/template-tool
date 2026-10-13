# Phase 4 — V1 Studio shell convergence

## Scope

Phase 4 restores the proven V1 Studio composition around the existing V2
workflow and content authorities. It keeps the frozen screen responsibilities in
[`WORKFLOW_RESTORATION.md`](WORKFLOW_RESTORATION.md): Library → Package/Family →
Fonts → Validate → Fields → Add/Review, followed by Template Settings or an
independent Draft Editor and export.

This phase does not add a public SDK operation, persistence version, canonical
schema, renderer behavior, selection-group model, cross-ID field link, or visual
redesign. Historical presentation and interaction patterns are reused where they
fit the V2 contracts; V1 state internals are not restored.

## Implemented shell behavior

- Library uses template cards with managed previews and a primary Create output
  action, compact recent Draft rows, a separate Existing work section, action
  menus, inline delete confirmation, and an explicit V1 archive compatibility
  entry. Canonical entity locators and the Phase 3 navigation coordinator remain
  authoritative.
- Setup uses `AppShell`, `PageWorkspace`, `PageContent`, and `PageFooter` with the
  accepted five-step order, completed-step indicators, operation status, and a
  sticky footer. A single design stays compact; accepting a second design reveals
  Family controls.
- Family rename, reorder, replace, and remove operations clone the accepted
  Family and canonical content, validate every surviving variant in a candidate
  V2 session, and replace the accepted session only on success. Variant IDs,
  common rules, sparse overrides, field order, source packages, fonts, content,
  and surviving image framing remain under their existing authorities.
- Settings dirtiness compares accepted metadata and configuration with the saved
  baseline. Step changes, variant preview selection, and renderer evidence do not
  mark Settings dirty; returning accepted values to the baseline clears leave
  protection. Source and font operations block navigation while pending.
- Validate projects current V2 validation/readiness evidence into a grouped issue
  workbench with selected issue context, Family scope, technical disclosure, and
  links to Package/Family, Fonts, or Fields. It owns no correction controls or
  second validator.
- Fields uses the historical expandable card shell with coverage, type, rule
  summary, common/variant authority, drag ordering, and accessible Move actions.
  Its expanded content remains the seven current V2 configuration editors.
- Draft Editor uses `EditorLayout`, `WorkspaceSidePanel`, and `PreviewWorkspace`.
  Canonical controls and progressive Family selection stay in the panel, the
  fitted preview remains primary, and diagnostics use the established drawer.
  Existing autosave, retry, invalid-input, navigation-flush, revision, and PNG
  gates remain intact.

## Current evidence

Automated checks completed on 2026-09-07:

- `pnpm test:portable`
- Studio TypeScript/build through `pnpm --dir apps/studio build`
- `pnpm api:contract`
- `pnpm boundaries:check`
- `pnpm studio:setup`
- `pnpm studio:drafts`
- `pnpm field-rules:studio`

The setup Chromium run covers single setup, Family add/rename/reorder/replace/
remove, retained rules/order/fonts, failure-safe candidate publication, Validate
correction routing, summary-only Review, exact ZIP/font preparation, and save/
reload. The draft run covers template/draft independence, autosave and recovery,
route collision handling, stale-load protection, conversion, shared assets,
seven field types, image framing, diagnostics, and PNG export. The independent
host run covers the existing V2 public integration.

Desktop and 768-pixel screenshots are recorded separately from automated
assertions under:

- `fidelity/evidence/studio-phase-4-setup/`
- `fidelity/evidence/studio-phase-4-drafts/`

Renderer goldens were not run or updated because this phase changes Studio host
composition only. Proven SDK blockers: none.

