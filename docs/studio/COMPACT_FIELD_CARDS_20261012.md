# Compact field cards — 2026-10-12

## Result

The importer Fields step and saved-template Settings now share a denser field inspector. A clean Color card measures 285 CSS px for a single template and 312.5 CSS px for a common Family field at 1440 × 900. The prior layouts measured 485.5 and 537 px. The card keeps its header and Label visible, groups the settings that matter for its type, and shows Apply/Discard only for an unapplied draft. Choices use editable rows; Field ID, host role and option IDs use a separate details drawer. The action bar follows the controls in document order, so it does not interrupt a long option list.

The renderer and SDK implementation were unchanged. The exact three-export capture run `sdk-061-compact-field-cards-20261012a` is GO. All 12 capture PNGs match the previously reviewed run byte for byte, and the approved references and tolerances were retained.

## Control hierarchy

| Area | Current presentation |
| --- | --- |
| Card header | Label, effective-setting summary, type, expand control and field-order menu. |
| Primary controls | Label, then relevant limits, range/step, image policy or Boolean impact. |
| Secondary controls | Line warning and Number/Date display format start collapsed; their summaries expose invalid state. |
| Choices | One toggle; when enabled, value-first rows, optional label, compact add action and per-row action menu. |
| Technical controls | Field ID and host role in one drawer; option ID in the same drawer pattern. Closing retains the parent draft. |
| Acceptance | Apply/Discard appears only for a dirty draft; the page continues to show accepted/save state. |

Family inheritance, explicit clears, atomic choice overrides, option IDs, source defaults and the existing SDK transactions remain intact. Invalid Color and number drafts remain editable locally. Reordering options is part of the unapplied draft; field reordering retains immediate acceptance and Undo.

## Evidence

The [baseline identity](evidence/compact-field-cards-20261012/identity.json) retains hash-verified copies of 14 Studio files from `sdk-061-fields-usability-20261011b`. Browser captures (retained locally: `../../fidelity/evidence/compact-field-cards/after/single-color-off.png`; excluded from release source) and their before counterparts (retained locally: `../../fidelity/evidence/compact-field-cards/before/single-color-off.png`; excluded from release source) cover Color off/on, multiple options, Number, Textarea and a 768 px layout for single and Family editors. At 768 px the 11-option Color draft has no horizontal overflow or internal card scrolling; focus remains above the workspace footer. The browser workflow also checks technical-drawer focus, invalid setting disclosure, option ordering/removal and guard behavior.

Test-only development Vite measurements used the same five warmed-up trials and hash-verified baseline overlay for both layouts. These measure input to two animation frames; they are a UI paint proxy, not production latency. Unapplied Label edits had unchanged React commit and SDK validation counts, with zero measured materializations. The test's resource placeholder is not an ownership measurement:

| Workload | Median before → after | p95 before → after | Commits/trial | Validations/trial |
| --- | --- | --- | --- | --- |
| Carrousel single | 14.3 → 10.5 ms | 43.2 → 43.6 ms | 7 → 7 | 0 → 0 |
| Three-export Family | 11.6 → 14.2 ms | 78.7 → 99.5 ms | 7 → 7 | 12 → 12 |

The Family tail is noisier in this small development sample; no speed improvement is claimed. [Individual trials](../../fidelity/evidence/compact-field-cards/measurements/measurement-after-family.json) and the paired before records are retained.

The current run passed portable tests, Studio typecheck/build, SDK verification with unchanged packed bundle budgets, Studio setup/drafts, field rules, Family parity, workflow acceptance and the complete single/Family Choices browser workflow. Its source-authoritative gate has 24 complete stable captures, 12 passing renderer comparisons, three passing scene comparisons and 12 passing settlement comparisons. The source review verifies 272 unchanged SDK runtime hashes, 324 protected artifact hashes, exact ZIP/font identities and all 12 byte-identical reviewed PNGs. The tracked review was rebound without reference promotion. Automated browser testing and stored-capture inspection were performed in this run; manual screen-reader and native calendar/color popover reviews were not.

## Regeneration

```sh
EDITOR_FIELDS_IDENTITY=docs/studio/evidence/compact-field-cards-20261012/identity.json node scripts/repository/verify-field-choices-browser.mjs --compact-cards --cards-before
node scripts/repository/verify-field-choices-browser.mjs --compact-cards
EDITOR_FIELDS_IDENTITY=docs/studio/evidence/compact-field-cards-20261012/identity.json EDITOR_FIELDS_MEASUREMENT_DIR=fidelity/evidence/compact-field-cards/measurements node scripts/repository/verify-field-choices-browser.mjs --measure-fields --fields-baseline
EDITOR_FIELDS_IDENTITY=docs/studio/evidence/compact-field-cards-20261012/identity.json EDITOR_FIELDS_MEASUREMENT_DIR=fidelity/evidence/compact-field-cards/measurements node scripts/repository/verify-field-choices-browser.mjs --measure-fields
pnpm test:portable
pnpm exec tsc -p apps/studio/tsconfig.app.json --noEmit --pretty false
pnpm build
pnpm sdk:verify
pnpm studio:setup
pnpm studio:drafts
pnpm studio:family-parity
pnpm studio:workflow-acceptance
pnpm field-rules:studio
pnpm font:reactivation:verify
pnpm sdk:gate:061 -- --run-id sdk-061-compact-field-cards-20261012a
node scripts/fidelity/retain-compact-card-review.mjs sdk-061-compact-field-cards-20261012a
pnpm sdk:gate:061 -- --run-id sdk-061-compact-field-cards-20261012a --assess-existing
pnpm docs:verify
```

Build and pack sequentially before testing packed consumers. A future changed capture requires individual source review; stability alone cannot retain a disposition.
