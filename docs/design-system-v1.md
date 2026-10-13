# Template Tool V1 Design System

Status: V1 shared visual system, calibrated through UI overhaul Phase 2.5. This is the ongoing implementation reference
for shared visual and interaction behavior.

## Neo-modernist wayfinding foundation candidate

The next visual system is being developed as an opt-in, dark-only candidate
before it reaches product routes. Its preferred outcome combines
Swiss/International typographic discipline with the direct orientation of
airport and metro systems and a controlled neo-brutalist energy. It should
feel civic but friendly, structured but energetic, and visually distinctive
without compromising comprehension.

The candidate is currently scoped by `.studio-wayfinding-theme` and is visible
only in the development showcase at
`?studio-design-system=wayfinding`. The existing production tokens and layouts
remain authoritative until the Navigation Pilot proves the candidate with
real Variants, Fields, and Validate content. Page-local adoption is not
permitted during Foundation.

### Foundation token inventory

| Role | Token | Candidate value | Permitted use |
| --- | --- | --- | --- |
| Canvas | `surface-app` | `#070908` | Application background |
| Primary surface | `surface-primary` | `#111311` | Main working surface |
| Secondary surface | `surface-secondary` | `#191c1a` | Separate nested task or contrast layer |
| Interactive surface | `surface-interactive` | `#232623` | Selected/interactive row or control |
| Primary text | `text-primary` | `#f2efea` | Headings and primary working copy |
| Secondary text | `text-secondary` | `#b8bab5` | Supporting copy |
| Muted text | `text-muted` | `#92958f` | Metadata; raised from the seed for AA contrast |
| Structural border | `border-default` | `#343834` | Editable boundaries and sparse record dividers only |
| Focus | `focus-ring` | `#f2efea` | Keyboard focus only |
| Primary action | `action-primary` | `#f2efea` | One primary action per region; dark text |
| Lime accent | `accent-lime` | `#b8f000` / `#243000` | Bright signal and deep chromatic surface |
| Orange accent | `accent-orange` | `#ff5a1f` / `#3d1608` | Bright signal and deep chromatic surface |
| Periwinkle accent | `accent-periwinkle` | `#8390d8` / `#222741` | Bright signal and deep chromatic surface |
| Yellow accent | `accent-yellow` | `#ffd43b` / `#3a3000` | Bright signal and deep chromatic surface |
| Cobalt accent | `accent-cobalt` | `#6380ff` / `#151d40` | Bright signal and deep chromatic surface |
| Magenta accent | `accent-magenta` | `#f052b5` / `#3a122c` | Bright signal and deep chromatic surface |
| Variants route | `route-variants` | Lime bright | Location marker only |
| Fonts route | `route-fonts` | Orange bright | Location marker only |
| Fields route | `route-fields` | Periwinkle bright | Location marker only |
| Field rules route | `route-field-rules` | Yellow bright | Location marker only |
| Validate route | `route-validate` | Cobalt bright | Location marker only |
| Review route | `route-review` | Magenta bright | Location marker only |
| Feedback surface | `feedback-surface` | Interactive grey | Shared neutral status and alert layer |
| Ready signal | `feedback-ready-signal` | Lime bright | Icon plate only |
| Attention signal | `feedback-attention-signal` | Yellow bright | Icon plate only |
| Blocked signal | `feedback-blocked-signal` | Orange bright | Icon plate only |
| Information signal | `feedback-info-signal` | Cobalt bright | Icon plate only |
| Neutral signal | `feedback-neutral-signal` | Neutral grey | Icon plate only |

Route colour communicates location and never readiness, selection, focus, or
severity. Semantic status uses a shared neutral container and label plus a
separate per-tone icon signal. Interaction uses the consistent warm-white
action and focus treatment. Neutral surfaces and typography carry ordinary hierarchy.
Route colours may appear together only in route orientation; a working page
uses only its own route marker.

The six accent families are the only chromatic source for the Foundation.
Every family contains a bright signal value and a deep companion. Route and
semantic tokens alias these palette values but keep separate meaning: sharing
a palette family never permits a route token to be used as a status token.
Routine status badges and alerts use the same neutral interactive layer and
neutral text; only their compact icon plate carries semantic colour. Deep
companions remain part of the palette but are reserved for a future,
explicitly contracted high-emphasis surface rather than becoming the default
feedback container. Neither status component uses a passive outline, tinted
rail, or component-local colour.

Rethink Sans is bundled locally and becomes the candidate application family.
It is never used inside renderer-owned template output. Candidate typography
uses 40px/32px page titles, 22–24px section titles, 17–18px subsection titles,
15–16px working copy, 14px labels/actions, 13px metadata, and 12px monospace
technical evidence. Working rows are 48–56px; compact, normal, and major
controls are 36px, 42px, and 46–48px. Passive surfaces use 14–16px radii,
working controls 8–10px, and shadows are restricted to overlays.

### Foundation rhythm contract

The Foundation uses a 24px default page and panel rhythm, with 16px internal
grouping and 8–12px control relationships. The desktop page gutter is fluid
from 16px to 40px; it does not exceed the useful orientation space. At narrow
widths panel padding reduces from 24px to 16px rather than compressing the
working content inside desktop gutters.

Dense connected records use a 56px target row, 6px vertical and 16px
horizontal padding, a 32px type plate, a 36px action target, and stable
far-right status/action columns. Two-line record content determines the row
height; large action controls must not inflate it. Status badges share a 28px
minimum height whether or not an icon is present. Form inputs and selects use
the 42px normal-control height; multiline inputs retain a deliberate 96px
working area.

Independent panels size to their own content. Grid peers must not stretch a
short task into a large empty surface merely because the adjacent task is
taller. Responsive layouts preserve the same hierarchy with smaller gutters
and tighter route-grid gaps; they do not invent a second spacing system.

### Boundary and layer contract

Colour layers, spacing, and type establish ordinary grouping. The Foundation
uses four surface levels: canvas for the page, primary for a task area,
secondary for a nested or contrasting area, and interactive for controls,
selection, and hover. Overlays use the raised surface plus an overlay shadow.
Changing level is the default way to create an area; drawing a box around it is
not.

Borders and lines are permitted only when they communicate information that a
surface change cannot communicate as clearly:

- the boundary of an editable input or select;
- keyboard focus;
- invalid control state;
- a one-dimensional divider between repeated records or table rows;
- the exact edge of a preview or other bounded visual artifact;
- technical grids where row or column association would otherwise be lost.

Do not outline cards, panels, badges, alerts, buttons, menus, empty states,
route stations, or ordinary grouped content. Selected rows use a changed
surface, not an inset outline. A divider separates adjacent records; it never
wraps each record on all four sides. This is a system rule, not a page-level
styling preference.

### Foundation component/state matrix

| Primitive | Normal | Hover/active | Focus | Disabled/loading | Invalid/destructive |
| --- | --- | --- | --- | --- | --- |
| Button / IconButton | Warm-white primary or neutral secondary | Tokenized surface/pressed state | 2px high-contrast ring | Labelled, non-interactive, loading announces busy | Destructive token plus explicit label |
| Input / Select / Textarea | Label, value and default border | Stronger neutral border | Shared focus ring | Text remains legible | Error text and `aria-invalid`, not colour alone |
| Status / Alert | Neutral grey layer and label with one bright semantic icon plate | Not interactive | N/A unless actionable | N/A | No passive outline, tinted rail, or component-local colour |
| Connected row | Title, type and supporting scope | Interactive surface | Focus belongs to row action/control | Explicit disabled semantics | Attention/status remains text-labelled |
| Numbered station / directional mark | Flat neutral geometric shape and label | Lighter flat neutral hover | Parent control owns focus | N/A | Full route colour is reserved for the active destination |
| Menu / Drawer / Dialog | Overlay surface and accessible name | Tokenized item state | Trapped/restored where modal | Disabled item semantics | Destructive item is labelled and confirmed |
| Surface / grouped area | Separation through canvas, primary, secondary, or interactive layer | Move one layer only when interaction requires it | Focus belongs to contained control | N/A | No decorative perimeter outline |

Motion is functional, 120–180ms normally and no more than 220ms for a large
overlay. It uses opacity/transform, never loops, never moves working content
after interaction, and is removed where `prefers-reduced-motion` requests it.
The showcase is necessary but not sufficient: the Navigation Pilot must prove
the system at real product density before broad rollout.

Wayfinding prefers numbers, letters, and simple directional arrows over
illustrative iconography. Route stations use a single step number inside a
coloured circle; categories or destinations may use a short letter code; and
orientation moments may use one plain arrow inside a geometric plate. Lucide
icons are reserved for familiar functional actions, semantic status, and
controls where the symbol reduces reading effort. Do not add decorative icons
to headings, ordinary records, empty states, or route labels.

Index components have three explicit states. Inactive markers use a neutral
flat dark-grey surface, hover uses a lighter flat grey, and only the active
marker uses the full route colour. Passive stations have no outline. Route
stations pair an 18px number in a 44px circle with a 16px semibold label. The
number remains the primary sign without overpowering its destination. Route
rows do not add ornamental rules above or below the marker.

Badges have symmetric outer padding. Icon-to-label space is expressed with a
separate internal gap; it must never be faked by reducing the right padding.
Count badges use a fixed circular box rather than variable horizontal padding.
This anatomy applies to semantic status, filters, counts, and future route
metadata so aligned rows retain a consistent right edge.

Boolean switches use a 48×28px flat track with a 22px thumb and no perimeter
outline. The neutral track communicates off; the lime control signal
communicates on. Focus remains the one permitted external ring.

Dense working lists are a deliberate exception to the reduced-icon rule:
simple type or media symbols may establish a fast-scanning first column when
they encode record kind. The row grid then reserves a stable far-right column
for status and a final column for actions. Decorative heading icons remain
prohibited.

## Principles

- Use semantic role tokens; do not choose colors by page or component name.
- Create ordinary areas with surface layers, spacing, and type—not perimeter outlines.
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

Inter remains the current production family. Rethink Sans is the opt-in
wayfinding candidate until the Navigation Pilot is accepted. Sentence case is required for normal
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
- `IconPlate`, `WayfindingBadge`, `WayfindingMark`, `ConnectedList`, `ConnectedListRow`
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

`DesignSystemShowcase` is a development-only surface used by static tests and
manual visual inspection. Open it with `?studio-design-system=wayfinding`. It
is not a product destination and does not authorize production-route rollout.

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
