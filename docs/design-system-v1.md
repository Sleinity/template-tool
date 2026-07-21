# Template Tool V1 Design System

Status: V1 shared visual system, calibrated through UI overhaul Phase 2.5. This is the ongoing implementation reference
for shared visual and interaction behavior.

## Principles

- Use semantic role tokens; do not choose colors by page or component name.
- Let spacing and surface hierarchy do most grouping work.
- Use cards only for objects, decisions, alerts, and genuinely framed tools.
- Keep status meaning visible in text and structure, not color alone.
- Preserve native HTML semantics where they provide robust keyboard behavior.
- The complete editing workspace starts at 768px. Smaller screens retain a
  readable shell and an explicit larger-screen requirement.

## Semantic Tokens

Tokens live in `src/styles.css` and Tailwind aliases live in
`tailwind.config.js`.

| Group | Roles |
| --- | --- |
| Surfaces | app, navigation, primary, secondary, raised, interactive, hovered, selected, disabled |
| Text | primary, secondary, muted, disabled, inverse, link |
| Lines | subtle, default, strong, divider, focus |
| Actions | primary, hover, pressed, secondary, destructive |
| Status | blocked, attention, repaired, info, neutral; each has foreground, background, border, and icon roles |
| Preview | light stage, dark stage, stage border, padding, and radius |
| Structure | type scale, weights, line heights, spacing, radii, shadows, control heights, content widths, motion, and layers |

Raw values remain permitted only inside the token definition or an explicitly
documented temporary migration boundary. New shared components must consume
semantic tokens.

## Surface Hierarchy

| Level | Background | Boundary | Radius | Padding and elevation |
| --- | --- | --- | --- | --- |
| Application background | `surface-app` | none | none | viewport gutter only |
| App shell | `surface-primary` | subtle | shell, 20px | owns the primary frame; no shadow |
| Page workspace | primary or navigation | divider where needed | none inside the shell | owns page header, content, and footer rhythm |
| Independent panel, card, or preview | primary or secondary | default | panel, 12px | 20–24px normally; shadow only when floating |
| Control | primary or interactive | default | control, 8px | control-specific padding |
| Selected or focused state | selected surface or focus treatment | strong or focus | inherited role | never indicated by color alone |

Large surfaces use the subtle outline. Independent cards, interactive panels,
preview stages, inputs, and secondary actions use the default outline. Strong
is reserved for hover emphasis, selection, and active controls. `divider` is an
alias of the subtle outline; preview outlines alias the default outline. Status
and focus colors remain semantic and must not be reused for ordinary structure.

Avoid bordered wrappers inside bordered wrappers. Use spacing or a divider when
the inner region is only a section of the parent. Shadows are reserved for
floating menus, drawers, and the preview motion toolbar.

## Radius Roles

| Role | Value | Usage |
| --- | --- | --- |
| Shell | 20px | App shell only |
| Panel | 12px | Cards, side panels, previews, quality panels, setup sections |
| Control | 8px | Inputs, buttons, menu items, compact disclosures |
| Pill | 999px | Statuses, count badges, and true pills only |

Legacy `workspace` and `card` token names remain aliases during migration; new
styles should use the semantic shell and panel roles.

## Typography Roles

Inter is used for all application roles. Sentence case is required for normal
headings and labels. Uppercase is reserved for technical codes, file extensions,
and source values where case is meaningful.

| Role | Usage | Size and weight |
| --- | --- | --- |
| Page title | Main page identity | 28px semibold |
| Page description | One-sentence page guidance | 14px regular |
| Section title | Major content region | 18px semibold |
| Subsection title | Group inside a panel | 16px semibold |
| Control group title | Media, Content, Colours, Visibility, Advanced | 14px semibold |
| Field label | Input or editable field name | 14px medium |
| Body copy | Primary explanatory content | 14px regular |
| Supporting copy | Secondary guidance | 14px regular |
| Metadata | Counts, dimensions, dates, and context | 13px regular or medium |
| Status text | Actionable state | 14px semibold |
| Technical detail | IDs, paths, diagnostic provenance | 12px monospace |
| Button label | Action outcome | 14px semibold |

## Shared Components

Shared components are exported from `src/components/ui/index.ts`:

- `AppShell`, `AppNavigation`, `AppNavigationItem`
- `Button`, `IconButton`, `Spinner`, `FilterChip`, `CountBadge`
- `Input`, `Textarea`, `Select`, `Toggle`, `CheckboxField`, `MediaInput`
- `Status`, `Alert`, `EmptyState`
- `Disclosure`, `Menu`, `MenuItem`, `Surface`
- `PageWorkspace`, `PageHeader`, `PageContent`, `PageFooter`, `SplitWorkspace`
- `WorkspaceSidePanel`, `TemplateThumbnailStage`, `TemplatePreviewStage`, `PreviewWorkspace`

The contracts are intentionally small. Add a new variant only when a supported
product interaction requires it. Icon-only controls require a label. Form
controls own label, help, invalid, required, and disabled associations.
Warning fields retain their normal semantics while using a distinct warning
surface. `MediaInput` owns the current thumbnail, accessible file selection,
loading state, accepted-format help, and persistent error or warning copy.

Normal buttons are 42px high with slightly expanded horizontal padding. Compact
buttons are 36px high and are reserved for dense toolbars, menus, and secondary
row actions. Large buttons are 48px high. A page-level action group should have
only one primary action.

Normal task labels and controls use 14px text or larger. Compact 10–12px text
is restricted to collapsed technical identifiers and raw debugging payloads.
Inter is the application UI family; fonts loaded for rendered templates remain
inside renderer output and never change shell or control typography.

`DesignSystemShowcase` is a non-routed developer surface used by static tests
and manual visual inspection. It is not a product destination.

## App Shell Contract

`AppShell` provides the application canvas, optional primary navigation,
header, clipped main frame, skip link, focus order, and workspace-width
guard. It does not know about routes, setup steps, templates, or page-specific
layouts.

`PageWorkspace` owns a page's header, one primary scrolling `PageContent`, and
an attached `PageFooter`. Setup follows that contract. The viewport-bound
editor uses `SplitWorkspace`; on desktop only the `WorkspaceSidePanel` body
scrolls, while at narrower supported widths the split becomes the primary
stacked scroll owner and the panel body expands naturally.

`TemplatePreviewStage` owns presentation, stage padding, tone, and dimensions.
`ScaledTemplatePackagePreview` owns only renderer measurement and scaling.
`TemplateThumbnailStage` keeps dashboard previews on their managed static PNG
source. `PreviewWorkspace` keeps live canvas, motion toolbar, and contextual
actions in one continuous region.

The default preview stage is light neutral gray with a default outline, panel
radius, shared responsive padding, and contain-based centering. Dashboard,
Validate, Fields, and editor previews use this presentation even though their
content sources differ. Dark grid presentation is an explicit developer or
inspection variant only. Rendered content receives no decorative drop shadow.
Loading, missing, and broken static references use the shared thumbnail states.

## Page Header And Setup Alignment

Dashboard and setup page titles use the same 28px role. Setup headers and their
content/footer use the same horizontal inset. Context appears above the title as
metadata; descriptions begin at the same content edge below the header. Every
setup step shares the 86rem workspace maximum, 32px desktop content inset,
section gap, and attached action footer. Narrower content such as Fonts may set
a readable maximum width but must remain left-aligned to that common edge.
Changing setup steps resets the shared content scroller to the top.

## Responsive Contract

| Viewport | Foundation behavior |
| --- | --- |
| 1200px and wider | Full navigation; preview and a 420px side panel share the editor workspace |
| 1024px to 1199px | Narrower navigation; editor panel contracts to 320–352px while preview remains dominant |
| 900px to 1023px | Compact side-by-side editor and stacked setup grids |
| 768px to 899px | Editor preview and panel stack under one primary workspace scroller; setup navigation stays available |
| Below 768px | No horizontal page overflow; navigation can be replaced by later mobile navigation; guarded editor content is replaced with a clear larger-screen message |

Dashboard, template information, validation, and essential navigation must be
made usable below 768px during their page migrations. The width guard applies
only to the complete editing workspace.

## Accessibility Contract

- A visible focus ring is applied globally with `:focus-visible`.
- `AppShell` provides a skip-to-content link.
- Active navigation uses `aria-current="page"`.
- Icon buttons require an accessible label.
- Toggle uses `role="switch"` and `aria-checked`.
- Invalid fields use `aria-invalid` and associated error/help text.
- Blocking alerts use `role="alert"`; other notices use `role="status"`.
- Reduced-motion preferences collapse decorative transitions and animation.
- Disabled, loading, selected, and status states have textual or semantic cues.

## V1 Screen Patterns

### Dashboard Collection

The Dashboard has one primary Templates collection. Cards are preview-led,
keyboard-accessible objects: the complete card opens a reusable template and
its overflow menu owns Settings, Rename, Duplicate, and Delete. Managed static
ZIP preview PNGs remain the thumbnail source. Card metadata is limited to
dimensions, update date, and motion availability.

Recent drafts remain a secondary collection because they are saved output
instances, not duplicate template definitions. Opening a template starts a new
draft; opening Recent drafts resumes existing content. The distinction must be
stated in the section copy. Both collections remain sorted by repository update
time.

### Fields Workspace

Fields uses the shared split workspace: configuration on the left and a sticky
final-frame preview on wide screens. Fields are grouped by user task into Text,
Images, Colours, Visibility, and Advanced, and empty groups are omitted.
Filters are generated from real field data; All is always present, while Text,
Images, Required, and Warnings appear only when they have results.

Field identity is the descriptor field ID plus node ID. Selecting or expanding
a field selects it and highlights its resolved node without changing renderer
layout. Filtering out the selected field clears the selection and highlight.
Fields with no supported preview target remain configurable and show a calm
preview-unavailable explanation.

### Validate Workspace

Validate reads in this order: readiness, conditional blocker shortcuts,
compact template summary, Diagnostics with affected preview, then collapsed
Technical details. Blocker shortcuts are omitted entirely when no blockers
exist. The summary contains only source, template dimensions, root layer,
layer/media/field counts, motion availability, and reference-preview
availability; file inventory remains technical.

Diagnostics and Affected preview form a coordinated split workspace at 1200px
and above and stack below that width. The issue list owns one bounded local
scroll because it is a long, framed diagnostic tool. Needs action remains the
default filter and Information stays hidden by default. Issue rows use dividers,
not a stack of heavy cards. Structured issue identity controls selection; a
selection that becomes hidden is cleared together with its preview highlight.
The affected preview always renders the deterministic final frame and never
autoplays.

### Editor Hierarchy

The editor preserves Preview workspace beside Edit content. Motion controls
remain attached to the preview. The side-panel body is the desktop scroll owner
and its footer keeps Reset and Export PNG reachable. Field groups use Media,
Content, Colours, Visibility, and Advanced, and empty headings are omitted.
Diagnostics stays secondary and does not replace the Validate workspace.

### Empty And Short-Height States

No templates, no configurable fields, no matching field filter, no actionable
diagnostics, no selected issue, and no preview target each use a distinct title
and one concise explanation. Actions appear only when a direct recovery or next
step exists. At short heights, setup keeps PageContent as its main scroll owner;
the setup footer never covers content. Fields may keep one sticky preview on
wide screens, while Diagnostics may keep one bounded issue-list scroller.

## Phase 3 Product Migration

The Templates dashboard, template setup, and template workspace now use the
shared light shell and semantic component vocabulary. Product routes are
`/templates`, `/templates/new`, `/templates/:templateId/settings`, and
`/drafts/:draftId`; setup substeps intentionally remain local state.

Saved templates may reference an optional managed preview by SHA-256 hash. The
PNG blob lives in the existing shared asset repository, duplicates share the
reference, and reference-counted deletion removes it only after its last owner.
Records without a preview hash remain valid and render a neutral fallback.

The setup sequence is Package, Fonts, Validate, Fields, and Add template.
Description remains storage-compatible but is no longer requested or displayed
in the normal interface.

## Readiness Contract

The visible overall result is derived from the highest unresolved capability
state across import, preview fidelity, media and fonts, fields, and export:
Blocked, Needs attention, then Ready. Import readiness remains a capability
sub-status and cannot override a broader blocker. Diagnostic rows, counts, and
category summaries use the same presentation-state mapping.

## Remaining Migration Map

The following areas remain deliberately outside the completed product-surface
migration:

1. Settings remains behaviorally backed by the setup component; a future
   extraction may give it a smaller maintenance-only composition without
   changing its stable route.
2. Dialogs and destructive confirmations can move to a shared accessible dialog
   primitive when the first screen migration needs one.

Do not remove legacy styling globally. Migrate one screen boundary at a time,
verify behavior and responsive support, then delete only the styles proven
unused by that migration.

The remaining dark styling is confined to renderer inspection surfaces and
developer-only reports:

- `src/template-package/render/ScaledTemplatePackagePreview.tsx`
- `src/template-package/analysis/TemplatePackageStressReports.tsx`
- `src/template-package/debug/TemplatePackageLayoutDebugger.tsx`

`ScaledTemplatePackagePreview` may keep its technical preview backdrop when it
serves renderer inspection, but surrounding product chrome must use semantic
surface tokens.
