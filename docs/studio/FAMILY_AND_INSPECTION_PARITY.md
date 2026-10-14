# Studio Family and inspection parity

This record continues the single Studio workflow-restoration programme. It
restores the strongest Family-era interactions inside the accepted five-step
V2 workflow; it is neither a visual redesign nor a new persistence milestone.

## Authority boundaries

- Package/Family owns reusable sources, variants, selection properties and
  their per-variant assignments. A complete unique tuple resolves an existing
  variant. Sparse, unavailable and ambiguous tuples never select a variant.
- Selection properties and `editorControlOrder` are reusable configuration and
  host-navigation metadata. The saved selection envelope contains only the
  resulting `selectedVariantId`.
- `TemplateFieldFamilyContentStateV3` remains the sole Family content authority.
  Selection never changes values, image placement, content revision, reset or
  materialized field content.
- `editableFieldOrder` remains the semantic order of editable fields. The
  editor-control order only positions selectors among field slots; those slots
  are filled from the current effective editable-field order.
- The Studio inspection preview adds viewport transforms, target outlines and
  focus outside the renderer. The template renderer, readiness and PNG path do
  not consume this presentation state.
- The Studio diagnostic projection groups, filters, labels and routes existing
  SDK evidence. SDK validation and readiness remain the only validity, save and
  export authorities.

## Restored workflow

Package/Family reveals a responsive selection matrix after a second design is
accepted. Property and option labels are entirely user-defined; Studio assigns
no meaning to examples such as Format, Color, Layout, Language or Audience.
The matrix keeps uploaded designs as rows and keeps incomplete inline property
values and assignments in a presentation-only draft. It publishes the Family
as soon as every row has one complete unique mapping. It never
turns source filenames into authoritative option values. Missing Cartesian
combinations remain valid and visible as coverage information. Families without
properties keep direct variant selection. Fonts use
the grouped Family preparation pattern. Validate presents existing evidence by
Import, Preview, Media & fonts, Fields and Export health. Fields combines search,
coverage filters, Common/Variant configuration and the separate selection-control
summary. Add/Review is a read-only readiness checklist.

Setup, Validate, Fields, Review and Draft Editor use the shared V2 inspection
preview. Draft Editor renders property selectors when configured. An
unavailable intermediate tuple remains Studio-local while the last resolved
variant stays rendered; content editing and export remain unavailable until the
tuple resolves or is reset. Only a uniquely resolved variant selection reaches
the session and autosave coordinator. Existing drafts retain their captured
Family configuration.

## Compatibility and acceptance

Records without selection properties normalize to direct variant selection.
Existing content and record versions are unchanged. Add, replacement, Family
mutation, save/reload, settings and draft creation retain stable group, option,
assignment and control identities through their existing candidate and
persistence transactions.

Acceptance requires portable contract tests, Studio typecheck/build, public API
contract, package boundaries, documentation links and current Chromium evidence
for setup and draft workflows. Browser evidence is recorded separately from
automated assertions. Renderer goldens are outside this host-composition change.

The bounded additive V2 Family selection contract is the only proven SDK
addition. Preview composition, diagnostic presentation, grouped fonts, review
detail and responsive behavior remain Studio-owned.

## Current-run evidence — 2026-09-08

Automated checks passed: `pnpm test:portable`, Studio TypeScript/Vite build,
`pnpm api:contract`, `pnpm boundaries:check`, `pnpm docs:verify`, and
`git diff --check`. The public API baseline contains only the additive Family
selection types and pure/session operations. The Studio build retains its
existing large-chunk warning (1,513.83 kB / 420.63 kB gzip).

Chromium checks passed independently:

- `pnpm studio:setup` covered the matrix transaction, stable assignments,
  five-step navigation, correction routing, exact-font restoration, save/reload,
  automatic checking of remaining Family variants on Add/Review, and
  desktop/768-pixel setup surfaces. Evidence is in
  `fidelity/evidence/studio-phase-5-setup`.
- `pnpm studio:family-parity` saved a property-configured Family, replaced direct
  selection with `Format`, autosaved the selected-variant envelope, preserved
  canonical content and sibling Draft isolation, and exercised the Draft shell
  at desktop/768 pixels. Evidence is in
  `fidelity/evidence/studio-phase-5-drafts`.
- `pnpm field-rules:studio` passed the existing Studio/external-host V2 suite,
  including all seven field types, Family overrides/framing, save/reload and PNG.
- `pnpm studio:workflow-acceptance` passed the three exact manifest-bound real
  exporter package journeys for single, two-aspect Family and Boolean output.

No renderer golden, canonical content schema, persistence version, validator or
export behavior changed in this slice.
