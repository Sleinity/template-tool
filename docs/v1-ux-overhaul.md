# Template Tool V1 UX/UI Overhaul

Status: Phase 1 target architecture approved for implementation planning.

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

Template setup is:

```text
Package -> Fonts -> Validate -> Fields -> Add template
```

Validation remains the canonical readiness and Package Quality gate. The
current Review step becomes Fields / Configure fields.

## 1. Current UX and UI Diagnosis

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
3. Template setup contains a duplicate Review stage. Validation already owns
   readiness; Review currently mixes files, field inventory, field rules,
   fonts, motion, and preview.
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
2. **Template setup** - package, fonts, validation, fields, final creation.
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

- **Package:** one ZIP source, detected-file summary, failure recovery, and
  advanced technical details.
- **Fonts:** required faces, current status, direct Add/Choose actions, safe
  continuation, and technical matching details on demand.
- **Validate:** the sole readiness gate, Package Quality workspace, affected
  preview, and technical details.
- **Fields:** detected field list plus focused configuration for supported
  labels, order/group, editability, helper/default data, and existing rules.
  Future input types belong in typed component/model boundaries, not inactive
  controls.
- **Add template:** preview, name, validation outcome, configured field count,
  visible blockers, and one Add template action. Description is not shown or
  required.

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

- Edit reusable template name, supported field behavior, managed font links,
  and Settings-only Motion JSON repair.
- Keep package internals and source metadata under Technical details.
- Keep Duplicate and Delete secondary and deliberate.
- Do not reuse the full import journey merely because settings share some
  domain components.

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
| Review step | Replace | Fields / Configure fields |
| Review package-file panel | Move | Validate technical details |
| Field inventory and rules | Consolidate | Fields |
| Motion JSON in normal setup | Remove | Settings repair / Technical details |
| Description field in Add template | Remove | No normal UI owner |
| Final Package files panel | Remove | Validate technical details |
| Import/settings mode shell reuse | Split gradually | Setup and Settings pages |
| Developer IDs, paths, raw payloads | Keep behind disclosure | Technical details |

## 6. Canonical Terminology and Copy Changes

| Avoid in normal UI | Canonical V1 term | Usage |
| --- | --- | --- |
| Template Package Platform | Templates | Page title or product area |
| Add Package | Package | Setup navigation |
| Add ZIP Package | Import package | Primary file action |
| Prepare Fonts / Preparing fonts | Fonts / Add missing fonts | Step and task language |
| Review | Fields | Setup navigation |
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
| Configure fields | Review -> expand rule panels | Dense and mixed with unrelated panels | Fields list -> focused field settings |

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

