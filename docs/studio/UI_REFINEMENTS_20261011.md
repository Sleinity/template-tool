# Studio UI refinements — 2026-10-11

Implements the eleven browser comments following the [UI audit](UI_UX_AUDIT_20261011.md). Scope is Studio interaction and presentation. Existing SDK choice semantics, authoring transactions, persistence, resources, renderer behavior and reference tolerances remain unchanged.

| Comment | Result |
| --- | --- |
| 1 | Removed the persistent saved-template/Create output/Dismiss strip. The existing template card remains the entry to output; success copy is concise. |
| 2 | Delete keeps the action flyout open and replaces its contents with the template name, draft consequence, Cancel and Confirm delete. Cancel, Escape and outside dismissal clear confirmation; reopening starts normally. Menu size changes recompute positioning. |
| 3 | Removed the upper separator and redundant top padding from importer Checks filters. |
| 4 | Removed top/bottom separator strokes from preview controls; icon-button borders remain. |
| 5 | Zoom percentage has a box matching the adjacent small icon buttons. |
| 6 | Shared Select uses an explicit chevron with a 12 px right inset and reserved text space. |
| 7 | Removed the visible Showing X of Y element; filter announcements remain available. |
| 8 | Field-type counts are plain text without circular badges or count backgrounds. |
| 9 | Field filters occupy the full available row width and wrap within that width. |
| 10 | Choices is an accessible switch. Enabling reveals Suggested values / Options only, seeded from imported defaults; disabling hides controls and uses the existing no-choices/Family explicit-clear semantics when applied. |
| 11 | Advanced is a compact disclosure retaining field identity and host metadata controls. |

## Choices preservation

The switch edits only the local authoring draft until Apply. Re-enabling before Apply restores the chosen mode, row values, labels and stable option IDs. An off/on round-trip cannot regenerate identities. Discard restores the original configuration. Disabled local rows do not incorrectly mark an otherwise unchanged single configuration as dirty. Family inheritance and Use shared value remain reachable while disabled; restoring inheritance removes the existing override through the same operation as before.

Incomplete enabled rows still block Apply. Existing configured fields begin enabled, and no destructive migration occurs. Image and Boolean continue to have no Choices switch.

## Verification

- `pnpm exec tsc -b apps/studio --pretty false` passed.
- `pnpm test:portable` passed.
- Studio production build passed; Vite retains its existing large-chunk advisory.
- `pnpm studio:setup` passed, including keyboard toggle operation, Apply/Discard guards, importer/Family transactions, 768 px layouts, computed Checks chrome and delete confirmation/cancel in the same flyout. Initial verification runs exposed a test wait and a missing class on the current preview's zoom label; these were corrected before the passing run.
- `node scripts/repository/verify-field-choices-browser.mjs` passed all five types in both modes for single and exact three-export Family workflows: configuration, toggle round-trip, Apply, save, reopen, selection, Reset and PNG export. Family explicit disable/inheritance restoration passed. These are isolated authored configurations, not new source reference approvals.
- Manual in-app browser review confirmed Library strip removal, anchored delete confirmation with initial Cancel focus, cancellation without deleting user work, full-width plain-count filters, compact Advanced, Choices on/off with No changes afterward, stroke removal, 12 px chevron inset and equal zoom/icon box heights. No user template settings were applied or saved during manual review.

The [evidence record](evidence/ui-refinements-20261011/record.json) records implementation and screenshot hashes plus command results. Manual evidence: [Library flyout](evidence/ui-refinements-20261011/library-delete.jpg), [Fields](evidence/ui-refinements-20261011/fields.jpg), [Choices enabled](evidence/ui-refinements-20261011/choices-enabled.jpg), [Checks](evidence/ui-refinements-20261011/checks.jpg).

No manual destructive delete was performed. Repository failure/retry is not newly certified by the flyout-cancel test. No full renderer/scene/settlement gate or SDK release gate was rerun for these Studio changes; no approved reference, package API baseline or tolerance was updated. Remaining audit recommendations are separate scope.
