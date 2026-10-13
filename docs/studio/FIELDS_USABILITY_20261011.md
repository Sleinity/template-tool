# Fields usability implementation — 2026-10-11

Implements the approved Fields usability plan in the shared importer/Settings editor. SDK validation, configuration acceptance, selection, materialization, save/recovery and rendering remain native. No supported API, schema, saved format, version or renderer implementation changed.

## Baseline and boundary

The [Fields audit](FIELDS_UX_AUDIT_20261011.md) is the behavioral baseline. Its 14 source identities were checked and retained before editing in [baseline.json](evidence/fields-usability-20261011/baseline.json). The starting renderer review is `sdk-061-choices-20261010c`. The workspace is commit `944c51b33433ce2e37ec05f7de66457d5154d5b4` plus existing user changes; a commit alone does not identify this implementation. [record.json](evidence/fields-usability-20261011/record.json) records current source identities and commands.

Studio's private authoring projection constructs isolated candidates and delegates existing Core package, Family resolution/configuration and content validators. It does not create sessions, materialize previews, persist records or acquire resources. Complete current candidates are validated before acceptance. Live rule validation retains its result through controlled label/host-hint string edits; changed rules or native context revalidate. This avoids repeated whole-Family work during label typing without bypassing native acceptance.

Common editing scope and inspection are separate. Inspection uses the existing temporary selection lifecycle, preserves intentional selection and restores it when leaving Fields. A common draft survives switching inspected designs. Editing-scope changes remain guarded. Family content/configuration findings name their design; they do not claim unobserved renderer readiness.

## Findings disposition

| Finding | Disposition and implementation | Current evidence |
| --- | --- | --- |
| F01 Family context | Resolved. Inspect design lists containing designs; an absent target inspects the first containing source while a valid current preview is retained. Shared drafts survive actual inspection switches. | Exact three-export Family browser workflow; inspection contract assertions. |
| F02 full validation | Resolved. Partial numeric strings stay local. Complete isolated candidates use SDK validation; precision 101 blocks Apply and identifies Decimal places. Configuration validity remains separate from current-content errors. | Portable SDK differential assertions; browser precision/sign reproduction. |
| F03 menu keyboard | Resolved. Arrow keys, Home/End, disabled-item skipping, Escape return and Tab dismissal. Initial focus is synchronous after positioning, preventing a frame callback from undoing keyboard navigation. | Single/Family keyboard checks; shared Library/setup menu regression. |
| F04 invalid guard | Resolved. Invalid drafts omit Apply and continue. Keep editing retains input and focuses its invalid control. Acceptance failures remain in the form. | Browser guard reproduction and personally verified invalid Color focus. |
| F05 empty Choices | Resolved. “Add an option or turn Choices off.” No obsolete instruction to remove all rows. | Remove-last-option browser check. |
| F06 invalid Color/errors | Resolved. Typed invalid values survive; a neutral Invalid color state replaces visible black fallback. Picker changes alone may correct it. Inline row errors and a polite summary replace duplicate assertive summaries. | Automated neutral-state check; live screenshot and retained invalid value. |
| F07 inspector effort | Resolved. Full-width Textarea values, secondary labels, compact identity disclosure, distinct row-action names, predictable focus after removal and footer scroll clearance. | Five-type choice workflows; measured 768px setup layout; source/focus checks. |
| F08 inheritance | Resolved. Quiet Uses shared settings, Restore shared only for actual property overrides, effect-specific clears; atomic option overrides and explicit null clears retained. | Family common/override/disable/restore Choices workflow and field-rule parity. |
| F09 cross-design attention | Confirmed and resolved in Studio projection. A controlled Family accepts a Number in the unconstrained selected design while another design is invalid; the selected native snapshot has no field error. All-design findings now expose that conflict. | Executable controlled native reproduction in `fieldAuthoring.test.ts`; no new certified fixture. |
| F10 Crop capability | Resolved presentation. Crop — custom host explains Studio Fill and host framing. Existing Crop is preserved; no crop tool added. | Current Crop repair/reset host workflow; source/copy evidence. |
| F11 scanning | Resolved. Effective limits, choice mode/count, placement and formatted defaults; readable fallback labels and fixed type-filter order. Authored labels and IDs remain unchanged. | All seven field editors; filter/browser contract assertions. |
| F12 acceptance/save | Resolved. Unapplied changes and Changes applied · Save in Review are distinct. Discard affects only the local form. Immediate accepted reorders remain separate. | Guarded reorder/Undo and setup save/reopen; existing save-failure/recovery regressions. |
| F13 filtered ordering | Resolved. Destinations and global positions are named; filtered dragging is disabled with explanation. Latest Undo applies order to current configuration, preserving unrelated accepted settings. Leaving Fields or changing native scope/source invalidates it; membership/order mismatches reject safely. | Filtered menu, immediate reorder, draft guard, unrelated-prefix preservation and stale Undo browser checks. |
| F14 technical metadata | Resolved. Compact Technical details, copyable ID and nested Host integration. Existing roles remain available and preserved. | Shared disclosure keyboard check; custom-role field-rule workflow. |
| F15 impact/copy | Resolved. Boolean explains hiding/reflow; image policy has one visible heading and retains its accessible legend. | Seven-type workflow plus source/copy inspection. |
| F16 examples | Resolved. Number/Date use imported defaults and identify the inspected Family design. No default rewriting. | Exact Carrousel formatting workflow; differing-default Family parity and source inspection. |

## Verification

Current automated checks: portable suite; Studio application typecheck; Studio build; `sdk:verify` with sequential builds/packing, protected declarations, boundaries, packed consumers and unchanged bundle budgets; `studio:setup`; `studio:drafts`; `studio:family-parity`; `studio:workflow-acceptance`; `field-rules:studio`; `font:reactivation:verify`; complete Fields/Choices browser workflow.

The latter covers single and exact three-export Family configurations for all five choice types in both modes: create, Apply, template save/reopen, output selection, recovery reopen, Reset and PNG export. Seven-type editing, native rejection, shared configuration, explicit clears, Crop, reimport, save failures/retry and recovery remain covered by the complementary current workflows. Pure Family inspection is checked for unchanged IndexedDB write and object-URL allocation counts. These are isolated test records, not mutations to source fixture ZIPs or source certifications.

The fresh gate `sdk-061-fields-usability-20261011b` is **GO**: 24 complete stable captures, 12 renderer comparisons, three scene comparisons and 12 settlement comparisons. Public single/Family hosts and Carrousel's ZIP-numeric Color oracle pass. References, snapshots, fixtures/fonts and tolerances are unchanged.

Eight captures are byte-identical to the prior reviewed run. Four scaled inspection captures have individually recorded raster differences with unchanged node geometry; editor and PNG-export captures are byte-identical. [Changed-surface review](evidence/fields-usability-20261011/changed-surface-review.json) retains their exact identities and difference counts. Final captures are also byte-identical to the current-run captures personally inspected before the last UI-only corrections. No reference promotion occurred. Review binding is guarded by 272 unchanged SDK implementation identities, 324 protected artifact identities and exact source/font/raster environment checks.

Intermediate failures were recorded and corrected: obsolete test labels/coverage assertions, a real menu initial-focus race, and localhost/HMR/build-overlap harness interruptions. Final results do not rely on those interrupted runs.

## Measurements and review limits

Test-only development Vite instrumentation uses a hash-verified overlay of all 14 original UI sources, React Profiler, SDK validator/materialization counters and resource event counters. It runs identical label-typing workloads against Carrousel and the exact three-export Family, with one warm-up and five recorded trials. Individual measurements and summaries are retained in the evidence record. Input-to-two-animation-frames is a paint proxy, not production latency or canonical acceptance. No production timing improvement is claimed from these runs.

| Development label workload | Median before → after | p95 before → after | Commits/trial | SDK package validations/trial |
| --- | --- | --- | --- | --- |
| Carrousel single | 13.5 → 14.2 ms | 33.1 → 39.4 ms | 7 → 7 | 0 → 0 |
| Three-export Family | 12.1 → 13.3 ms | 81.0 → 95.4 ms | 7 → 7 | 12 → 12 |

Each phase has five trials after warm-up. Materialization, URL allocation and storage-write counts while editing unapplied labels are zero in both phases. Current development tails are higher; these small instrumented samples do not establish a production speed improvement. No notification batching, renderer scheduling or SDK optimization was added.

Live review personally verified the saved-template Carrousel Fields layout, precision rejection, invalid Color retention/neutral state, invalid guard correction focus and safe Discard. User configurations were not saved or reordered. Automated coverage includes narrow layout, actual Family preview switching, keyboard menus and complete workflows. Manual screen-reader testing and browser-native calendar/color popover testing were not performed; these remain explicit review limits, not certified accessibility claims. Crop remains a custom-host capability. The separate fallback field workspace keeps its existing host transaction presentation and receives the same candidate validation context; no fallback-workspace migration is included.

## Regeneration

```sh
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
node scripts/repository/verify-field-choices-browser.mjs --fields-usability
node scripts/repository/verify-field-choices-browser.mjs --measure-fields --fields-baseline
node scripts/repository/verify-field-choices-browser.mjs --measure-fields
pnpm sdk:gate:061 -- --run-id sdk-061-fields-usability-20261011b
node scripts/fidelity/retain-fields-review.mjs sdk-061-fields-usability-20261011b
pnpm sdk:gate:061 -- --run-id sdk-061-fields-usability-20261011b --assess-existing
node scripts/repository/record-fields-usability.mjs
pnpm docs:verify
```

Run package build/pack checks sequentially before consumers or protected-artifact checks. Fidelity regeneration verifies exact existing reviewed capture hashes; any new changed output requires another explicit review rather than modifying this record or raising tolerances.

The subsequent compact card presentation and its verification are recorded in [Compact field cards — 2026-10-12](COMPACT_FIELD_CARDS_20261012.md).
