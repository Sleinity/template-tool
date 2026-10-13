# Studio UI and UX audit — 2026-10-11

The main opportunity is clearer interaction and state, followed by denser field presentation. The five-step importer, shared components and output editor are a workable foundation. A redesign or another SDK abstraction is not warranted by this review.

This is an audit and proposed follow-up scope. No production implementation, SDK change or reference update was made.

## Scope and evidence

Reviewed the current development app in the Codex in-app browser, alongside its routing, UI components, styles, importer, configuration editor and output editor. Source identity: commit `944c51b33433ce2e37ec05f7de66457d5154d5b4` plus the existing dirty worktree. Current source, fixture, font and screenshot hashes are in the [evidence record](evidence/ui-ux-audit-20261011/record.json). Commit identity alone does not identify this implementation.

The existing Library and Carrousel settings were inspected without saving changes. A separate origin, `127.0.0.1:5184`, isolated new test records from the user's `5173` storage. The three current exports were imported, exact font files supplied, one design selector configured, the Family saved, and Now Hiring and Carrousel outputs opened. All five importer steps, shared/per-design field configuration, menus, recovery and diagnostics were inspected. The temporary tab and server were closed afterward; the user's Library remains open.

The previous [UI cleanup](UI_UX_CLEANUP.md) and [Choices implementation](../architecture/field-choices-implementation.md) are context, not fresh verification. In particular, Choices is now a supported, coherent feature; the earlier proposal to pause it has been superseded. This audit recommends simplifying presentation while retaining its completed configuration and editing flow.

Evidence labels:

- **Live:** personally observed through current-run UI interaction and screenshots.
- **Source:** inspected code supports the finding; the particular failure path was not exercised.
- **Reported:** the user reported it, but this audit did not reproduce it.
- **Historical:** previous audit or test evidence; not a current-run pass.

Responsive checks used measured CSS widths, including **600 px** importer and **769 px** output. A screenshot initially named `output-768.jpg` measured 1146 CSS px because browser viewport overrides and page scale differed; it is retained as `output-1146.jpg`. These are UI screenshots, not renderer golden captures. The precise browser build was not recorded. No production latency trial, accessibility certification, destructive deletion, save-failure injection or PNG export was performed. No fidelity gate was rerun.

## Page-by-page review

| Page or flow | What works | Main improvement | Evidence |
| --- | --- | --- | --- |
| Library — empty | Clear import action and restrained empty state | Keep the initial action prominent; avoid instructional paragraphs | Live: [empty Library](evidence/ui-ux-audit-20261011/library-empty.jpg) |
| Library — saved templates | Useful previews; template settings and output actions are available | Remove duplicated persistent save handoff; repair delete confirmation and keyboard menus | Live: [saved handoff](evidence/ui-ux-audit-20261011/library-handoff.jpg) |
| Designs | Compact single/Family rows; source identity and selector values remain together | Make incomplete selector recovery explicit; keep an exit on narrow layouts | Live: [Family](evidence/ui-ux-audit-20261011/family-designs.jpg), [600 px](evidence/ui-ux-audit-20261011/designs-600.jpg) |
| Fonts | Shared Family font requirements and per-face uploads are useful | Say what is missing once; avoid repeated generic upload guidance on every row | Live: [missing fonts](evidence/ui-ux-audit-20261011/fonts-family-missing.jpg), [available](evidence/ui-ux-audit-20261011/fonts.jpg) |
| Checks | One expanded issue, preview targeting, technical disclosure and packet tooling | Distinguish findings from affected locations; make impact and correction specific | Live: [Family findings](evidence/ui-ux-audit-20261011/family-checks-all.jpg), [expanded issue](evidence/ui-ux-audit-20261011/checks-expanded.jpg) |
| Fields | Single-open cards, type filters, Apply/Discard and shared configuration UI | Reduce wrapping and inheritance noise; preview an affected design; relocate host metadata | Live: [fields](evidence/ui-ux-audit-20261011/fields.jpg), [Family scope](evidence/ui-ux-audit-20261011/family-field-absent-preview.jpg) |
| Fields — Choices | No choices / Suggested values / Options only is a coherent distinction | Preserve it; shorten routine guidance and keep stable identity behind technical disclosure | Live: [choices](evidence/ui-ux-audit-20261011/fields-choices.jpg), [inheritance](evidence/ui-ux-audit-20261011/family-choices-inheritance.jpg) |
| Review | Name, save action and readiness guard are present | Consolidate repeated readiness/warning statements; distinguish warnings from blockers | Live: [Review](evidence/ui-ux-audit-20261011/review.jpg) |
| Saved-template settings | Reuses the importer rather than a separate configuration interface | Scope success feedback to the operation; explain changes to the template versus existing output only when relevant | Live: existing Carrousel settings; Source: Library routing |
| Output — single/Family | Immediate local input, autosave status, native readiness and separate content panel | Correct image thumbnails; consistent Date/Color controls and labels; clearer narrow layout | Live: [Now Hiring Family output](evidence/ui-ux-audit-20261011/output-family-now-hiring.jpg), [Carrousel](evidence/ui-ux-audit-20261011/output-family-carrousel.jpg); single shares the component but was not separately edited |
| Output — diagnostics | Issues and readiness remain accessible in a drawer | Reduce redundant zero states; give actionable issues visual priority | Live: [diagnostics](evidence/ui-ux-audit-20261011/output-diagnostics.jpg) |
| Recovery | Continue / start fresh / cancel is explicit | Shorten the explanation while retaining the consequence of replacing the draft | Live: [recovery dialog](evidence/ui-ux-audit-20261011/recovery-dialog.jpg) |
| Existing/incompatible work | Code retains historical work and reports incompatibility | Keep this exceptional UI separate from the ordinary template workflow | Source only; no incompatible record or conversion was exercised |

## Priority findings

### P1 — reliable actions and truthful state

**UI-01. Delete confirmation is split across two interactions.** Live + Source. Opening a card menu and choosing Delete closes the menu. The card then shows the consequence and Cancel, but its Confirm delete action is inside the menu that must be reopened. This explains the extra clicks. It does not demonstrate a repository deletion failure.

Use a compact confirmation dialog with template name, “Also deletes its draft,” Delete and Cancel together. Keep the existing removal authority and recovery cleanup. Cancel should receive initial focus. A pending deletion must disable repeat submission; errors must leave a retryable, understandable state. Source: [StudioLibrary.tsx](../../apps/studio/src/workspace/StudioLibrary.tsx), [Menu](../../apps/studio/src/components/ui/surfaces.tsx).

**UI-02. Save feedback persists and duplicates the template card.** Live + Source. The extra template-name / Create output / Dismiss strip is generated by `savedTemplate`, including after settings updates. A separate success alert also exists. Feedback is rendered outside the destination's shell on settings/output routes and is not consistently scoped to the action that created it.

Use one short, operation-scoped success notice. “Template saved” may offer Create output after new import; “Changes saved” should not create another persistent template-action strip. Retire the notice on dismissal or subsequent navigation. Preserve the card action and record. Source: [StudioLibrary.tsx](../../apps/studio/src/workspace/StudioLibrary.tsx).

**UI-03. Output says “No image” while the design contains that image.** Live + Source. Observed on Now Hiring and Carrousel image controls. `DraftEditor` passes only `dataUrl ?? url` to the thumbnail. The SDK asset resolver also supports managed `stableUrl` and other valid representations; the template renderer already displays the asset.

Resolve the thumbnail using the existing supported asset-source authority. Distinguish an absent image from loading or unavailable bytes. Borrow the resolved resource; do not add a new URL owner. Source: [DraftEditor.tsx](../../apps/studio/src/workspace/DraftEditor.tsx), [MediaInput](../../apps/studio/src/components/ui/fields.tsx), [asset resolver](../../packages/template-core/src/models/packageRenderValues.ts).

**UI-04. Incomplete design selectors have misleading recovery guidance.** Live + Source. Adding a selector without all assignments disables navigation and says “Apply or discard,” but neither action is visible. Valid assignments commit automatically; removing the selector through its menu is possible, so this is not an irreversible trap.

Align copy and controls with one transaction model. Recommended bounded change: retain current valid auto-commit, say “Complete every design value,” and expose a visible Cancel selector changes action restoring the accepted state. Keep assignment validation and navigation guards. Do not imply an Apply button that does not exist. Source: [FamilySelectionMatrixV2.tsx](../../apps/studio/src/setup/FamilySelectionMatrixV2.tsx), [StudioSetupWizard.tsx](../../apps/studio/src/setup/StudioSetupWizard.tsx).

**UI-05. Narrow importer layouts lose application navigation.** Live + Source. At 600 CSS px, the sidebar containing Library and step navigation disappears without a replacement. Designs has disabled Back and only Continue, so the app provides no visible exit from that state.

Replace the hidden sidebar with a compact current-step selector and Library/back action using the existing unsaved-change guard. A constrained layout still needs escape, orientation and progress. This does not require changing template geometry. Source: [responsive shell styles](../../apps/studio/src/styles.css), [AppShell](../../apps/studio/src/components/ui/AppShell.tsx).

### P2 — scan speed, consistency and control presentation

**UI-06. Menu behavior is incomplete for keyboard users.** Live + Source. Escape, initial focus and outside click are implemented, but ArrowDown did not move focus; ArrowUp/Home/End navigation and deliberate Tab behavior are absent from a component declaring menu/menuitem roles. Add a complete shared menu keyboard pattern and focus return. Library actions also lack the disabled plumbing present on its other controls; concurrent-operation consequences are a Source-only risk requiring a focused reproduction.

**UI-07. The reported misplaced menu was not reproduced.** Reported. Current menus were anchored correctly in inspected desktop and narrower states. The portal implementation measures its trigger, flips at viewport edges, and listens to scroll/resize. Do not replace it based on an assumed cause. Add regression coverage for scrolling cards, nested scrollers, window resizing, page scale, bottom/right edges and action activation after repositioning.

**UI-08. The active importer step loses its selected appearance on hover.** Live + Source. The hover selector has greater CSS specificity than the current-step selector. Preserve a distinct current + hover/focus style. The existing `aria-current` stays intact. Source: [navigation styles](../../apps/studio/src/styles.css).

**UI-09. Shared Family fields can preview an unrelated design.** Live + Source. Selecting common `backgroundColor` showed Now Hiring, although that field belongs to Carrousel. Common scope deliberately selects the first variant; coverage says 1/3 designs without making the affected design obvious.

Keep All designs configuration scope, but investigate the selected field in an affected design and show “Used in Carrousel.” Alternatively expose a clearly labelled affected-design preview selector. Preview investigation must not rewrite scope or Family configuration. Source: [SetupFields.tsx](../../apps/studio/src/setup/SetupFields.tsx).

**UI-10. Checks mixes finding and occurrence counts.** Live + Source. The three-design Family reported four warnings/issues but displayed two grouped rows, each with two affected locations. Both counts can be correct, but the UI gives them the same meaning. Say “2 findings · 4 locations,” with occurrence counts on each group. Use existing issue grouping and diagnostic authority. Label check actions “Check all designs” and “Check this design,” matching their callbacks. Source: [SetupValidationWorkbench.tsx](../../apps/studio/src/setup/SetupValidationWorkbench.tsx), shared quality panel.

**UI-11. Issues need concrete impact and correction location.** Live + Source. A duplicate field-ID issue gives a generic fidelity consequence and then packet/technical tooling, without a useful ordinary correction path. Prefer a short title, exact field/design location, supported consequence and where to correct it. If correction is exporter-side, say so; do not invent a Studio repair or hide a genuine finding. Packet and technical evidence remain disclosed.

**UI-12. Review repeats readiness and warning state.** Live. “Ready to save,” a separate warnings banner and footer readiness repeat the same decision. Use one authoritative summary, for example “Ready · 2 warnings,” with warnings available below. Blocking issues, checking and operation failures remain distinct. Never turn a warning into a new mandatory acknowledgement or weaken the save gate.

**UI-13. Fields spends too much space on filters and generic metadata.** Live + Source. Filter chips wrap over several lines; unfiltered “Showing 11 of 11” adds little; “Imported settings” is less useful than an actual rule. At 600 px, title/type/actions wrap into larger cards. Keep a stable type order and use a compact filter selector when chips no longer fit. Give row titles a truncating region and reserve action space. Summarize meaningful rules only: “Fill,” “80 characters · 3 lines,” “DD/MM,” or “3 options.” Preserve all field actions and accessible full labels.

**UI-14. Family inheritance is explicit but noisy.** Live. Repeated Inherited badges and “Use shared…” actions appear even where shared values are already used. Show a concise inherited state and an Override action; show Use shared only after an override. Disabled for this design stays explicit and distinct from inheritance. Preserve atomic option lists and explicit clears; presentation must not change those semantics.

**UI-15. Output controls use inconsistent value presentation.** Live + Source. Ordinary Date uses a text field with ISO placeholder while choice authoring uses a calendar. Ordinary Color lacks the editable hex representation shown elsewhere. Raw IDs such as `backgroundColor`, `EndDate` and `carVis` are often visible labels. Reuse type-appropriate controls and formatters; preserve explicit authored labels and offer readable fallback labels without changing IDs. Show a Color swatch plus editable hex, but retain exact imported paint values until a real edit. Consider showing unlimited character counts on focus rather than as constant metadata.

**UI-16. Output preview inspection and narrow layout can be clearer.** Live + Source. At 769 CSS px, content stacks above preview and adds scrolling; desktop output hides shared zoom controls. Provide a deliberate Content / Preview switch on constrained layouts and consider fit/zoom for ordinary inspection. Controls must stay outside exported pixels. Do not freeze canvas dimensions or turn layout observations into a renderer defect. Source: [EditorLayout](../../apps/studio/src/components/EditorLayout.tsx), [SetupPreview](../../apps/studio/src/setup/SetupPreview.tsx), [769 px output](evidence/ui-ux-audit-20261011/output-769.jpg).

**UI-17. Diagnostics has multiple empty-state statements.** Live. A toolbar count of zero opens Current variant 0, Readiness 0 and No current diagnostics. Keep access to diagnostics, but make the zero state quiet and singular. Field errors stay beside the control, with the drawer for the overview and technical detail.

## What belongs in Fields → Advanced?

The current disclosure contains Field ID and `controlRole`; it is not a collection of missing user validation controls. The role is documented as a custom-host presentation hint, and the Studio editor does not use it to choose controls.

| Setting | Recommended Studio presentation | Preservation rule |
| --- | --- | --- |
| Field label and editor order | Ordinary authoring | Preserve authored values and stable field identity |
| Character/line limits, Number range/format, Date format | Ordinary authoring; concise impact help | Core validation remains authoritative |
| Choices modes/options | Ordinary authoring; contextual inheritance | Keep IDs, labels, order, selected values and explicit clears |
| Image replacement Fill/Fit | Ordinary authoring when Studio can perform it | Preserve imported placement and current policy semantics |
| Field ID | Read-only technical disclosure with Copy | Never rename merely to improve display copy |
| `controlRole` | Integration metadata, outside routine per-field setup | Preserve it unchanged when editing other properties |
| Choice option IDs | Technical disclosure; deliberate identity-edit action | Never regenerate during label/value/reorder edits |
| Host-dependent Crop policy | Integration context until Studio supports the interaction | Keep existing configuration; explain host capability rather than implying unavailable UI |

Recommendation: move host metadata out of routine Fields, keeping it inspectable and deliberately editable in an integration disclosure. Do not delete schema properties, clear existing roles, remove SDK handles or introduce a migration. Crop is a separate product scope decision: the compact output editor currently omits the crop controls present in the noncompact editor. This is Source evidence, not a current-run crop failure.

## Copy and component contract

Keep the existing visual system: 4/8/12/16/24/32 px spacing steps, existing control sizes and focus rings, 28 px page headings, 16 px body, 14 px supporting copy and 13 px metadata. The issue is repeated/wrapped content and hierarchy, not a need to make all text smaller.

- Use existing Button, Input, Select, Menu, Alert/Status, disclosure, drawer and dialog primitives. Fix shared menu behavior once.
- Reserve one primary action per context. Put destructive confirmation beside its consequence. Keep footer actions in a stable location.
- Use 16 px for related control groups, 24 px between sections, and existing page gutters. Reduce space locally where rows duplicate metadata; avoid another global CSS override layer.
- Use one current-state banner at the top of the relevant step, inline field errors, and transient operation success. Do not repeat one status in a banner, card, footer and drawer.
- Use Library consistently for the collection; Design for the user's Family member; retain Variant/source IDs in technical views. Current “Back to templates” / “Back to Library” and “Selected variant” vocabulary should align.
- One short instruction per page is enough. Reveal detail only for consequences, unusual constraints or technical investigation. The audit does not propose translating the app to Dutch.

| Context | Suggested concise copy |
| --- | --- |
| Designs instruction | Import design ZIPs. |
| Fonts instruction | Upload missing fonts. |
| Checks instruction | Resolve errors. Review warnings. |
| Fields instruction | Configure fields and editor order. |
| Review instruction | Name and save the template. |
| Delete | Delete “{name}”? / Also deletes its draft. |
| Incomplete selector | Complete every design value. |
| Recovery | Continue this draft? / Starting fresh replaces this draft. |
| Template update | Changes saved. |

These are proposed labels, not a new validation or acknowledgement policy. Use the actual operation's scope and consequences.

## Recommended next milestone

**Studio workflow clarity and interaction reliability.** Keep SDK, renderer, persistence, resource ownership and existing authoring transactions unchanged.

1. Repair UI-01–05: delete dialog, scoped feedback, asset thumbnails, honest selector recovery and narrow-layout navigation. Add failing interaction tests before each repair.
2. Complete shared menu keyboard behavior and anchoring regressions; correct current-step hover/focus states. Reproduce concurrency risks before claiming a defect.
3. Make Family field preview/coverage coherent, findings/locations counts explicit, and Review use one readiness summary.
4. Compact Fields filters/cards/inheritance; relocate host metadata without clearing it. Reuse Date/Color value controls and consistent labels.
5. Apply concise copy and responsive spacing through the same components across new import and saved settings. Keep existing safeguards and advanced technical access.

Acceptance should exercise empty and populated Library; delete cancellation/success/failure/repeat clicks; menu keyboard/scroll/resize; selector creation/cancel/assignments; field Apply/Discard and preview targeting; inherited/overridden/disabled Choices; all seven content types; save/reopen/recovery and latest-value export. Test 600, 768, 1200 and 1440 CSS px and measure the actual viewport. Keep user-impact settings reachable. Existing host metadata must survive unrelated edits and save/reopen unchanged.

Use focused UI tests and current Studio setup/recovery, field-rules, Family parity and workflow acceptance checks. Any implementation touching field transactions, rendering inputs or resource handoff also requires the existing SDK and source-authoritative three-export regression gates. Do not modify approved references or tolerances to accommodate a UI change.

## Disposition and limits

The audit is complete; implementation is proposed. There is no evidence here supporting removal of Choices, session unification, a typography redesign or renderer changes. The reported menu-placement symptom remains unreproduced, and operation-failure/concurrency paths need automated reproduction. Existing incompatible-work conversion, full keyboard/screen-reader coverage, destructive deletion and PNG success/failure were not manually certified.

Historical SDK/Choices/fidelity evidence remains useful context, but it is not counted as current UI verification. This report preserves the distinction between live inspection, source findings and future acceptance checks.

Audit artifact verification: exact ZIP, `template.json` and embedded-preview hashes matched the registry for all three exports; all four supplied font binaries matched the font registry. `pnpm docs:verify` passed (222 Markdown files, 606 local links). These checks validate the report's inputs and links, not rendering or complete workflow correctness.
