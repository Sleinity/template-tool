# Template Tool V1 UX/UI Overhaul

Status: Current Studio UX authority. Updated for the family-first six-step
template setup consolidation.

This document is the source of truth for the V1 interface overhaul. The
product is ZIP-only for new imports and saved templates. Raw JSON, pasted
source, JSX, RTF, and historical JSON-record compatibility are out of scope and
must not return through copy, navigation, or hidden import options.

The canonical product journey is:

```text
Templates
-> Template setup
-> Template workspace
```

Template setup and Template settings now share this structure:

```text
Variants -> Fonts -> Fields -> Field rules -> Validate -> Review
```

New imports unlock these pages in sequence. Existing settings unlock all six
pages immediately. Validation remains the canonical readiness and Package
Quality gate; Review is a concise confirmation and never duplicates detailed
diagnostics.

Studio uses **Template** and **variants**. **Template Family** is reserved for
SDK documentation and technical details.

## Neo-modernist wayfinding initiative

Studio is developing a reusable dark visual and interaction foundation inspired
by contemporary identity systems and civic wayfinding. It uses disciplined
typography, explicit routes, geometric symbols, flat colour, connected records,
and strong orientation while keeping forms, tables, previews, and diagnostics
calm and legible. The intent is a dependable public-navigation system with
creative energy, not an ornamental theme or a collection of page-specific
restyles.

Rollout is gated: **Foundation → Navigation Pilot → Setup Workflow → Secondary
Surfaces → Hardening**. Foundation is currently an opt-in development surface;
production setup remains on the current visual system. Route colour identifies
location only. Status, focus, selection, and product accents retain independent
semantic roles. Full details and the state matrix live in
[`design-system-v1.md`](design-system-v1.md).

## 1. Historical diagnosis and current direction

The diagnosis below records the single-template baseline that led to the V1
system. Where it conflicts with the six-step contract above, the current
contract is authoritative.

### What is already sound

- ZIP loading, normalization, managed assets and fonts, layered diagnostics,
  resolved rendering, motion, persistence, editing, and PNG export form one
  working product pipeline.
- Validate already owns import readiness and Package Quality.
- The template workspace's preview-and-fields split is the right desktop
  interaction model.
- Final-frame preview behavior, optional motion playback, autosave, and save
  failure handling are established behavior to preserve.
- Advanced diagnostic and technical information is available and should be
  reorganized through progressive disclosure rather than removed.

### Main experience problems

1. The interface presents the architecture instead of the user's task.
   `ZIP Package`, `Motion metadata`, repeated readiness states, package files,
   and raw diagnostic identifiers compete with names, previews, fields, and
   actions.
2. The dashboard is metadata-first. Cards have no preview image and expose
   package type, motion state, description, timestamp, Use, Settings, Rename,
   Duplicate, and Delete at once.
3. Template setup previously contained a duplicate Review stage. Validation
   now owns detailed readiness while Review contains only the final decision.
4. Font preparation works but reads as a technical registry tool. Required
   action, safe continuation, and the difference between Missing, Candidate,
   Fallback, and Ready are not visually dominant.
5. The workspace correctly prioritizes preview and inputs structurally, but
   repeats `Ready`, uses the vague `Post Content` title, and places preview
   controls in general page chrome.
6. Visual styling is page-local. Dark surface values, borders, radii, buttons,
   metrics, pills, panels, and input states are repeatedly implemented with
   Tailwind classes instead of semantic tokens and shared primitives.
7. The current 390px layout overflows horizontally. Fixed application frames,
   large workspace regions, and non-collapsing content make the editor
   unusable rather than deliberately limited.
8. Product navigation is an `AppView` state machine. It has no stable URL for
   templates, settings, drafts, or setup, so refresh, browser history, and deep
   links are weaker than the product model requires.
9. `TemplatePackageImportFlow.tsx` is overloaded: import, settings, setup
   navigation, font state, validation, field configuration, final creation,
   and technical panels share one component.

### Design direction

Use a soft neutral application canvas, quiet structural chrome, white primary
workspaces, dark charcoal text, restrained borders, sparse near-black active
states, and selective accent colors. Cards should represent real objects or
grouped decisions, not every page section. Shadows are for overlays and
meaningful elevation, not ordinary grouping.

Phase 2 must establish semantic tokens and primitives before individual pages
are restyled.

## 2. Current Route and State Map

There is currently one browser document and no route-backed product model.
`App.tsx` switches between internal views:

| Current state | Component | State owner | Notes |
| --- | --- | --- | --- |
| `overview` | `TemplateOverviewPage` | `App.tsx` | Templates and drafts |
| `import` | `TemplatePackageImportFlow` | `App.tsx` | Five local setup steps |
| `settings` | `TemplatePackageImportFlow` | `App.tsx` | Reuses setup UI in settings mode |
| `editor` | `TemplatePackageEditorPage` | `App.tsx` | Opens a persisted output draft |

Setup navigation is `stepIndex` local state. The selected template, settings
record, editor session, repository records, persistence error, and autosave
state are held in `App.tsx`. A saved template opens by creating a draft and
then assigning the draft to `selectedSession`.

### Current state transitions

```text
overview --Add template--> import
overview --Use template--> create draft -> editor
overview --Continue draft--> editor
overview --Settings--> settings
editor --Back to templates--> overview
editor --Template settings--> settings
import/settings --complete or cancel--> overview
```

Browser back, forward, refresh, and deep links do not represent these
transitions. Refresh returns to the initial app state rather than reopening the
current template or draft.

## 3. Target Information Architecture

### Product-level destinations

1. **Templates** - visual library, recent drafts, import entry point.
2. **Template setup** - variants, fonts, fields, field rules, validation, and
   final confirmation.
3. **Template workspace** - live preview, edit content, diagnostics, export.
4. **Template settings** - reusable template configuration and repair tools.

### Proposed route model

Use stable URLs for product-level destinations and local state for setup
substeps:

| Destination | Proposed route | Rationale |
| --- | --- | --- |
| Templates | `/templates` | Stable home and browser-history target |
| New template setup | `/templates/new` | Refresh returns to a safe Package state |
| Template workspace | `/drafts/:draftId` | Reopens the exact persisted draft without creating another draft |
| Template settings | `/templates/:templateId/settings` | Stable settings and repair destination |
| Root | `/` -> `/templates` | One canonical home URL |

Setup substeps remain local state in V1. They are sequential states within one
import session, not durable resources. Putting each step in the URL would imply
refresh recovery that is unsafe while the original ZIP buffer is intentionally
short-lived. The current step may be mirrored in history later if testing shows
real value, but it is not a Phase 2 requirement.

Route-backed navigation should be implemented with the smallest suitable
router or a focused History API adapter. The decision depends on whether V1
needs nested route composition and redirects. Product components must receive
IDs and domain objects through typed boundaries rather than reading URL state
directly.

## 4. Page Responsibilities

### Templates

- Show saved templates as a visual library.
- Use the managed preview PNG as the dominant card content.
- Open a template from one clear card activation target.
- Keep Settings/overflow as a separate keyboard- and touch-accessible action.
- Put Rename, Duplicate, and Delete in the secondary menu; confirm Delete.
- Show recent drafts as resumable work without letting them dominate the
  template library.
- Handle loading, empty library, missing preview, corrupt preview, and
  persistence failure as distinct states with a next action.

### Template setup

- **Variants:** one compact table owns ZIP upload, inline variant naming,
  ordering and optional selection-property assignments. Details and replacement open in a
  side drawer; the page has no persistent renderer.
- **Fonts:** aggregate exact face requirements across variants. Upload once and
  link the verified face everywhere compatible.
- **Fields and Field rules:** keep the task list primary. Variant selection
  lives in the preview chrome, so larger families do not add horizontal page
  controls.
- **Review:** collect the explicit template name, show one compact preview and
  summarize only organization, editing and readiness with links to unfinished
  work.
- **Fields:** map package targets to stable fields, distinguish shared and
  variant-specific scope in one authored-order inventory, and keep technical
  target identity behind disclosure. Unresolved package targets are rows in
  this same inventory rather than a separate problem panel.
- **Field rules:** one ordered inventory using the mature rule-card controls,
  with common rules and deliberate applicable-variant differences. Package and
  family editing reuse the same constraint controls.
- **Validate:** the sole detailed readiness gate, selected-variant Package
  Quality workspace, one renderer, searchable diagnostics and focused issue
  evidence. Entering Validate automatically checks all Not checked or Stale
  variants once; current evidence is not rerun automatically.
- **Review:** template name, variants, selection mode, field-scope counts, font
  readiness and remaining warnings in one connected confirmation summary. It
  contains no package dump or diagnostic duplicate.

### Template workspace

- Keep template context, autosave state, export, and navigation stable.
- Make preview the dominant visual region on desktop.
- Place Motion preview and timeline controls with the preview.
- Use `Edit content` for user-facing text and media controls.
- Remove the Ready badge from the content panel.
- Keep Diagnostics as a secondary header action and technical details inside
  the diagnostic surface.
- Preserve all current field enforcement, motion, final-frame, persistence,
  and export semantics.

### Template settings

- Reuse the same six pages with every page immediately available.
- Edit the reusable template name, variants, selection behavior, field scope,
  rules and managed font links without forcing sequential completion.
- Keep package internals and source metadata under Technical details.
- Keep Duplicate and Delete secondary and deliberate.
- Use the same presentation and setup controller as import while preserving
  settings-specific save and repair behavior.

## 5. Keep / Move / Remove Decisions

| Current area | Decision | Target owner |
| --- | --- | --- |
| ZIP loader and import pipeline | Keep unchanged | Domain layer |
| Layered diagnostics and import gate | Keep unchanged | Validate |
| Package Quality | Keep and restyle | Validate / Diagnostics |
| Resolved tree and renderer | Keep unchanged | Runtime |
| Preview/content editor split | Keep and make responsive | Workspace |
| Motion toggle | Move | Preview toolbar |
| Diagnostics action | Keep | Workspace header |
| Ready badge in editable-fields panel | Remove | Readiness remains in Validate |
| Dashboard package/motion badges | Remove | Technical details if needed |
| Dashboard description | Remove from UI | Stored value may remain temporarily |
| Dashboard rename/duplicate/delete buttons | Move | Card overflow menu |
| Standalone variant-options step | Merge | Variants |
| Detailed Review diagnostics | Remove | Validate remains authoritative |
| Review package-file panel | Remove | Focused issue technical details |
| Field inventory and rules | Separate by task | Fields and Field rules |
| Motion JSON in normal setup | Remove | Settings repair / Technical details |
| Description field in Add template | Remove | No normal UI owner |
| Final Package files panel | Remove | Validate technical details |
| Import/settings setup shell | Share | The same six-page flow, with different gating |
| Developer IDs, paths, raw payloads | Keep behind disclosure | Technical details |

## 6. Canonical Terminology and Copy Changes

| Avoid in normal UI | Canonical V1 term | Usage |
| --- | --- | --- |
| Template Package Platform | Templates | Page title or product area |
| Add Package | Variants | Setup navigation |
| Add ZIP Package | Import package | Primary file action |
| Prepare Fonts / Preparing fonts | Fonts / Add missing fonts | Step and task language |
| Template Family | Template | Normal Studio UI |
| Detected Editable Fields | Configure fields | Field-builder title |
| Post Content | Edit content | Workspace panel |
| Motion metadata | Motion preview | User-facing preview control only |
| Render readiness | Preview status | Normal UI; internal term remains technical |
| Loaded source diagnostic report | Diagnostics / Template check | Normal UI |
| Can import: warning | Ready with warnings | Outcome language |
| Continue | Name the result | Import package, Add template, Open template, Retry |
| Ready badge beside fields | Remove | Readiness is not repeated in content UI |
| ZIP Package badge on cards | Remove | Source format is not selection metadata |
| Template description | Remove from normal UI | May remain in storage temporarily |

Headings, labels, and buttons use sentence case. Action labels begin with a
verb and state the result. Persistent errors explain what happened, why it
matters, and what to do next. Status is never communicated by color alone.

### Shared setup presentation rules

- The setup header owns the only page-level heading. Body sections use section,
  subsection, control-group, label, supporting-copy and metadata roles in that
  order.
- A page region has one primary action. Reversible alternatives are secondary,
  low-priority actions are quiet, and destructive actions live in a confirmed
  overflow menu.
- The setup status vocabulary is **Ready**, **Needs attention**, **Blocked**,
  **Not checked**, **Checking**, and **Stale**. Shared and variant-specific
  scope is informational, never a warning by itself.
- Controls that form one decision share a surface. Separate surfaces represent
  separate tasks; ordinary spacing must not create nested-card stacks.
- Source filenames, node IDs, hashes, asset counts, package statistics and
  provenance stay under **Technical details**.
- Fields, Field rules, Validate and Review use the same compact preview dock.
  It retains selection across pages and opens an upward searchable list inside
  preview chrome, avoiding a second page-level control or renderer.
- Desktop uses a readable task column and sticky preview where useful. Tablet
  stacks the preview. Small-screen setup remains a single column without body
  overflow; the full editor keeps its documented desktop/tablet minimum.
- The sticky footer keeps Back, an explicit blocker explanation and one named
  forward action. Failed progression focuses the first actionable blocker.

## 7. Repeat-Use Efficiency Baseline

| Workflow | Current path | Baseline issue | V1 target |
| --- | --- | --- | --- |
| Open saved template | Templates -> Use template | One click, but card is metadata-heavy | One card activation |
| Resume draft | Templates -> Continue | Direct | Preserve one action |
| Switch template | Back -> Templates -> Use template | Safe but loses workspace URL | Back/library or direct template switch without duplicate drafts |
| Edit text | Open workspace -> field | Direct | Preserve direct field access and tab order |
| Replace image | Open workspace -> Replace image | Direct | Preserve, enlarge target, clarify constraints locally |
| Toggle motion | Workspace -> Motion | One action | Keep one action in preview toolbar; remember safe preference if approved |
| Open diagnostics | Workspace -> Diagnostics | One action | Preserve one secondary action |
| Export PNG | Workspace -> Export PNG | One action after readiness | Preserve action and adjacent failure state |
| Open template settings | Card -> Settings | One action | Preserve through sibling icon/menu action |
| Revalidate | Setup Validate -> Validate again | Direct | Preserve in Validate |
| Configure fields | Fields -> selected mapping | Direct | Preserve focused mapping and variant context |

V1 must not add confirmations to safe or reversible actions. Confirmations are
reserved for deletion or genuine data-loss risk. Optional shortcuts may be
added only after the visible interaction path is complete and keyboard testing
shows repeat-use value.

## 8. Responsive-Support Strategy

### Viewport matrix

| Range | Supported experience | Layout expectations |
| --- | --- | --- |
| Desktop: 1024px and wider | Complete setup and workspace | Side-by-side preview and fields where useful; persistent setup navigation |
| Tablet: 768-1023px | Complete editing workflow | Preview and fields stack or use an explicit switcher; setup navigation becomes compact; no horizontal page overflow |
| Small screen: 320-767px | Templates, package details, setup status, Validate, navigation, and basic actions | Single-column surfaces; compact step navigation; readable diagnostics; no horizontal page overflow |

The minimum supported width for the complete editing workspace is **768px**.
Below 768px, Templates, setup, validation, settings summaries, and basic
template actions remain usable. Opening the full editor should show a clear,
non-blocking width recommendation instead of compressing the canvas and field
panel into an unusable layout. A later usability test may approve a small-screen
preview/fields switcher, but V1 does not claim feature parity below 768px.

Implementation requirements:

- Remove fixed page geometry that produces horizontal body overflow.
- Define responsive shell, stack, sidebar, action-bar, and disclosure
  primitives once.
- Ensure fixed headers and footers do not obscure focused controls.
- Test long template names, filenames, field labels, diagnostic messages, text
  zoom, and browser UI scaling.
- Preserve the preview's aspect ratio and use contain-style scaling.

## 9. Migration and Implementation Sequence

### Phase 1 - Documentation and architecture

- Maintain this document as the approved target.
- Preserve production code and runtime behavior.
- Resolve the explicit approvals listed below before Phase 2 reaches routing,
  preview persistence, or small-screen workspace behavior.

### Phase 2 - Design-system foundation

Implement in this order:

1. Semantic light tokens in `styles.css` and Tailwind role mappings:
   application canvas, navigation, primary/secondary/raised surfaces, text,
   borders, accent, focus, statuses, typography, spacing, radii, shadows,
   control heights, content widths, z-index, and motion.
2. Shared primitives: Button, IconButton, Input, Textarea, Select, Checkbox,
   Toggle, Status, Alert, Disclosure, Menu, Dialog, EmptyState, Skeleton, and
   Tooltip.
3. Responsive structural primitives: AppShell, PageHeader, WorkspaceSplit,
   SetupNavigation, StickyActionBar, PanelStack, and ThumbnailFrame.
4. Shared product patterns: TemplateCard, FontRequirementRow,
   DiagnosticRow, FieldConfigurationRow, and save-state presentation.
5. Primitive state coverage: default, hover, pressed, selected, focus-visible,
   disabled, loading, invalid, warning, and destructive.
6. Migrate only the outer shell and representative primitive examples before
   restructuring feature pages.

Do not independently restyle the dashboard before these contracts exist.

### Phase 3 - Product screens

1. Templates dashboard and managed thumbnails.
2. Setup navigation and Review-to-Fields replacement.
3. Font requirements task surface.
4. Final Add template summary without description.
5. Workspace header, preview toolbar, and Edit content panel.
6. Dedicated template settings composition.
7. Product-level route-backed navigation.

### Phase 4 - Diagnostics, copy, and states

- Apply canonical severity and terminology across Validate, Diagnostics,
  Fields, Fonts, empty states, loading, and persistence failures.
- Preserve diagnostic codes and provenance under copyable Technical details.
- Remove duplicate explanations and decorative status badges.

### Phase 5 - V1 quality pass

- WCAG 2.2 AA contrast and non-text contrast checks.
- Keyboard, focus order, dialog/menu focus, and screen-reader names.
- Desktop, tablet, and small-screen layout checks.
- Real ZIP states: valid, warnings, blocked, missing preview, missing asset,
  missing font, many fields, and many diagnostics.
- Screenshot coverage for the shell and core product states.
- Repeat-use action-count comparison against this baseline.

### Exact component migration map

| Current file/component | Migration |
| --- | --- |
| `src/App.tsx` | Add product-level route coordination; retain repository and autosave orchestration until a later extraction is justified |
| `src/styles.css` | Become semantic token source and light global baseline |
| `tailwind.config.js` | Map semantic roles; avoid page-specific palette names |
| `src/components/EditorLayout.tsx` | Replace with or evolve into shared AppShell/WorkspaceSplit primitives |
| `src/views/TemplateOverviewPage.tsx` | Compose Templates page from TemplateCard, ThumbnailFrame, Menu, EmptyState, and draft row patterns |
| `src/views/TemplatePackageImportFlow.tsx` | Keep import-session orchestration initially; extract setup shell and step compositions as they are migrated |
| `src/template-package/fonts/FontPreparationStep.tsx` | Retain font logic; replace presentation with FontRequirementRow and shared controls |
| `src/views/import/ValidateReadinessPanels.tsx` | Retain readiness data; migrate to shared status, alert, summary, and disclosure primitives |
| `src/template-package/quality/TemplatePackageQualityPanel.tsx` | Retain filtering/selection behavior; migrate issue rows, statuses, details, and controls |
| `src/template-package/editor/TemplatePackageFieldRulesEditor.tsx` | Recompose as Fields list plus focused FieldConfiguration editor; preserve supported rules |
| `src/template-package/editor/TemplatePackageFieldEditor.tsx` | Retain update/constraint logic; migrate inputs and grouped Text/Media presentation |
| `src/views/TemplatePackageEditorPage.tsx` | Preserve runtime orchestration; migrate workspace shell, preview controls, Edit content, diagnostics drawer, and save/export feedback |
| `src/views/import/PackageDiagnosisPanels.tsx` | Keep reusable technical panels only where still consumed; do not restore them as default Validate panels |
| `src/views/import/TemplateCreationReadinessPanels.tsx` | Reuse blocker data in the concise Add template summary and field focus actions |

## 10. Risks, Dependencies and Deliberate Deferrals

### Managed preview persistence proposal

Current saved metadata records only whether `preview.png` existed. V1 needs an
optional managed reference:

```ts
interface SavedTemplatePreviewReference {
  assetHash: string;
  mimeType: "image/png";
  width?: number;
  height?: number;
}

interface SavedTemplateRecord {
  // existing fields
  preview?: SavedTemplatePreviewReference;
}
```

Persistence behavior:

1. Keep preview bytes short-lived in the import session until Add template.
2. Hash and save the PNG as a normal `SavedAssetRecord` in the existing asset
   store. Do not put Blob, data URL, object URL, or duplicate bytes in the
   template record.
3. Store only the hash and display metadata in `record.preview`.
4. Add the preview hash to the template's existing asset-owner references so
   duplicate previews deduplicate naturally.
5. Expose a repository read method that returns the preview Blob by hash. A
   dashboard view-model helper creates and revokes runtime object URLs; these
   URLs never enter persisted records.
6. On duplication, add the new template owner reference to the same hash.
7. On deletion, existing reference-count cleanup removes the preview blob only
   when no template or draft owns the hash.
8. Treat the field as optional. Existing saved templates continue to validate
   and show a designed missing-preview fallback.
9. Missing, invalid, or unreadable preview assets never block template loading,
   editing, validation, or export. The dashboard falls back and may expose a
   quiet repair action later.

This is an additive saved-record change. It does not alter TemplatePackageV1,
the renderer, resolved graph, asset resolution, ZIP indexing, or package
validation contracts. The ZIP reader is used only to supply the transient
preview attachment at creation time.

### Main risks

- Introducing page routes while draft creation remains implicit can create
  duplicate drafts. `/drafts/:draftId` avoids this by routing only after the
  draft has been persisted.
- Splitting `TemplatePackageImportFlow` too early could fork import-session
  state. Extract presentation around the existing pipeline rather than moving
  domain truth into new components.
- A light-theme conversion through ad hoc class replacement would reproduce
  the current inconsistency. Token and primitive migration is mandatory.
- Thumbnail object URLs require lifecycle cleanup. Keep URL creation in a
  view-model hook and revoke on unmount or record change.
- Fields UI must not expose semantic input types or rules the runtime cannot
  enforce.
- Small-screen attempts at full canvas editing could become misleading. V1
  documents 768px as the complete-workspace minimum.

### Deliberate deferrals

- No dark theme in V1.
- No speculative field types or inactive rule controls.
- No full mobile editor below 768px unless later testing validates a usable
  switcher.
- No setup-step URLs unless browser testing proves they improve recovery.
- No renderer, motion engine, ZIP contract, asset-resolution contract, or
  package-schema redesign.
- No large onboarding tour.
- No MP4 export requirement.

### Decisions requiring approval before implementation

1. Approve `/templates`, `/templates/new`, `/drafts/:draftId`, and
   `/templates/:templateId/settings` as the V1 route model, with setup steps
   remaining local state.
2. Approve 768px as the minimum width for the complete editing workspace and a
   clear reduced-capability message below that width.
3. Approve the optional `SavedTemplatePreviewReference` and repository asset
   lookup extension described above.
4. Approve retaining description in storage temporarily while removing it from
   all normal V1 UI.
