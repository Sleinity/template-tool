# Importer guided path

Studio guides an author from exported designs to a reusable template through five product-facing steps:

1. **Designs** establishes which visual compositions belong to the template and, when needed, how people choose between them.
2. **Fonts** resolves type dependencies that can change text layout.
3. **Checks** reports current readiness, practical impact, and the owning correction route.
4. **Fields** configures what people can edit and which limits, choices, or replacement policies apply.
5. **Review** confirms the accepted result and saves it.

The screens share navigation, evidence-based completion state, task introductions, correction return paths, and a persistent footer. They deliberately use different page archetypes:

- Designs is a collection setup surface with compact source thumbnails and optional selector assignments.
- Fonts is a full-width dependency checklist with a prominent ready outcome and visible upload or replacement actions.
- Checks groups readiness, filters, issues, corrections and issue packets in one pane beside the preview.
- Fields is a configuration workspace with separate single-open accordion cards, field-type filters and a scope-coupled accepted-state preview.
- Review is a completion summary with one representative preview and no duplicated editors.

## Product language

The ordinary UI uses **Template**, **Design**, **Design selector**, **Option**, **Field**, **Field settings**, **Rule**, **Checks**, and **Draft**. Internal package, Family, property, variant, scope, schema, and renderer terminology stays in code, stored contracts, technical disclosures, or documentation where precision requires it.

“Design” is the imported composition. “Variant” remains the technical relationship of that design inside a multi-design template. A design selector chooses among designs; adding an option never generates a new design.

## Preview roles

Designs uses source thumbnails and an inspection drawer. Fonts has no visible inspection action; its existing measurable, inaccessible preview remains mounted only on that step to publish font readiness through the current authority. Checks, Fields and Review use the same preview panel, toolbar, stage sizing and column proportions. Checks and Review place design selection below the stage. Fields couples preview selection to Settings for: All designs shows the first design, while a specific scope shows that design. Unapplied edits guard scope changes before preview selection changes.

All inspection surfaces use the accepted session render graph. The UI does not create a comparison renderer, change renderer ownership, or treat a source preview image as render authority.

## State and authority

Step completion is evidence-based. Visiting a step does not complete it. Field edits invalidate current checks, and Review can run checks again without duplicating the Checks workspace. Applying field settings still commits only through the existing configuration transaction; unapplied drafts do not change revisions, persistence, validation, export readiness, or the main preview.

Checks distinguish action required, warnings, repaired information, readiness, and stale evidence. Issue copy presents the practical impact and correction action first; codes, renderer evidence, filenames, canonical IDs, and provenance remain progressively disclosed.

This redesign changes Studio presentation and interaction only. It does not change public SDK contracts, canonical schemas, persistence, field semantics, Family behavior, validation authority, rendering, or golden references.

## Visual composition rules

Importer pages use the same shell alignment: the page header, primary content, and footer actions share one horizontal gutter. Content begins with a named section, readiness outcome, or task toolbar so controls never appear as an unlabelled group beneath the page title. Major regions use spacing first; borders identify connected lists, editable panels, and preview boundaries rather than every grouping.

Actions have three stable levels. The footer contains the single forward action. A section header contains actions that affect the whole section, such as adding a design. Rows keep required correction actions visible and reserve overflow for infrequent management. Fields alone have a local primary Apply action because their edits are transactional.

Status styling is reserved for conditions that change what the author should do: blockers, warnings, missing dependencies, and stale checks. Counts, field types, applicability, dimensions, and source facts are muted metadata. Healthy lists stay quiet when the page-level outcome already establishes readiness.

Reusable setup primitives standardize section headers, action groups, outcomes, notices, connected-list surfaces, and preview chrome. Their content remains domain-specific: a design row, font dependency, diagnostic issue, and field configuration keep markup and actions suited to their task. At narrow container widths, section actions stack beneath their headings, page gutters contract, and Fields switches between Settings and Preview without changing accepted state.

## September 2026 importer refinement

The accepted presentation choices are a horizontally scrollable Designs selector matrix with a pinned identity column, separate compact Field cards, type filters without search, and coupled field scope/preview selection. Fonts removes usage and technical disclosures. Checks keeps design scope and Status together, with issue details and reproducible packets expanded inside the selected issue. Search, Area and Technical filters are omitted from the importer only. Review removes duplicate readiness explanation, template-details heading and included-design disclosure; its four summary rows and actionable warnings remain.

Shared setup primitives and existing tokens own chrome, status treatment, spacing and typography. Domain grids retain their different content. No renderer, canonical field, persistence or public API changes are part of this pass.

### Current-run verification

- Final `pnpm exec tsc -b --pretty false`, `pnpm test:portable` (including design-system coverage) and `pnpm build`: passed. Build retains the existing large-chunk advisory.

- `pnpm studio:setup`: passed 18 checks, including six selector columns, pinned identity while scrolling, canonical row/header alignment, type filtering, unapplied-change guards, coupled preview scope, and missing/available exact-font states.
- `pnpm field-rules:studio`: passed all seven field types, configuration, Crop, reimport, Family and independent public-host scenarios.
- `pnpm studio:workflow-acceptance`: passed three hash-gated ZIP import/edit/export/recovery journeys.
- `pnpm studio:family-parity`: passed Family/editor and recovery lifecycle scenarios.
- Setup screenshots and geometry assertions cover 1440, 1200, 768 and 600 pixel viewports. Evidence: `fidelity/evidence/studio-phase-5-setup/report.json` and adjacent PNGs. Reviewed desktop Fields, Checks, Review, Fonts and Designs plus narrow Fields screenshots during this implementation.

The setup corpus includes a seven-field synthetic template, two-design Family with six selectors, and an exact-font real export. This is not an exhaustive translated-copy or arbitrarily large collection certification. Renderer references and tolerances were not updated. The user's open unsaved import was not reloaded; browser verification used isolated harness sessions.

## September 28 refinement

Designs has an explicit zero-selector grid and one bounded horizontal scroll owner. Shared row insets and thumbnail geometry keep the first selector from changing row height. The identity column remains pinned; narrow containers reduce its width without hiding the trailing inputs and actions.

Checks offers All designs and named designs. Explicit selection in either dropdown synchronizes scope and preview. Opening an affected target under All designs changes only the preview, retaining the aggregate list. Pending renderer evidence must not clear the selected issue and restore an unrelated design. Run-check traversal disables issue selection and preserves the existing intentional-selection restoration.

Only one issue expands at a time. Its summary retains severity, impact, affected design/location and origin; its expansion contains existing field/font correction routes, affected targets, issue-packet generation and technical details. Generic Review designs actions are omitted. Other quality-panel consumers retain their existing filters and selection behavior.

Choices and Advanced are compact keyboard-operable disclosure controls. Return to checks and the sticky settings-changed reminder are removed. Existing automatic checks and save gates remain authoritative; check failures appear in the current Checks/Review outcome instead of a separate cross-step notice.

Verification for this refinement uses the setup harness's zero/one/six-selector cases, real interaction with the final column and overflow menus at 1440/1200/768/600 pixels, synchronized design selectors, All designs investigation, inline packet download, keyboard disclosures and cross-step notice absence. Regression commands: `pnpm exec tsc -b --pretty false`, `pnpm test:portable`, `pnpm build`, `pnpm studio:setup`, `pnpm field-rules:studio`, `pnpm studio:family-parity`, and `pnpm studio:workflow-acceptance`. Browser evidence is in the existing setup, field-rules, drafts and workflow-acceptance evidence directories. No renderer reference or tolerance changes are part of this refinement.

Current-run result (2026-09-28): all commands above passed; the final Studio-only build and portable suite also passed after the final disclosure/inline-layout adjustments. The build reports the existing large-chunk advisory. Visually reviewed zero-selector desktop rows, the six-selector narrow matrix, inline Checks investigation and Fields desktop screenshots. The setup harness independently exercised compact disclosure height and keyboard toggling, final-selector/menu reachability at all four widths, and packet creation with its required operator description. The currently open user output session was not reloaded.
