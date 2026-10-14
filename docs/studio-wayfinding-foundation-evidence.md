# Studio Wayfinding Foundation Evidence

Status: Foundation candidate. This record is UI review evidence only and is not
renderer, fidelity, scene, settlement, or approved-reference evidence.

## Scope

The Foundation milestone adds a scoped dark token system, locally bundled
Rethink Sans, route and semantic colour roles, icon plates, connected rows, and
a realistic component showcase. Production routes, renderer output, capture,
family schemas, persistence, and workflow behavior are unchanged.

Development review URL:

```text
http://127.0.0.1:5173/?studio-design-system=wayfinding
```

## Automated contracts

- Core text, action, and all six route-marker foreground/background pairs meet
  WCAG AA contrast in `designSystem.test.tsx`.
- Route identity includes a number and text label; semantic statuses include
  text and icons and use a separate palette.
- Route stations use numbered shapes, destinations may use lettered shapes,
  and orientation uses simple arrows;
  decorative heading icons are intentionally absent.
- Full route colour is active-only; inactive and hover states use flat dark and
  lighter-grey shapes without passive outlines.
- Dense record lists may use one simple type icon at the leading edge and keep
  status badges in a stable far-right column.
- Semantic badges and alerts use one neutral grey layer and neutral labels.
  Only their compact icon plates carry the original bright signal colours.
  Neither uses an outline, tinted container, or semantic rail.
- Badges use symmetric outer padding and a separate internal icon gap; counts
  use a fixed circular box so dense right-aligned columns remain consistent.
- Foundation rhythm is explicit: fluid 16–40px page gutters, 24px desktop and
  16px narrow panel padding, 42px normal form controls, 28px statuses, and
  dense connected rows capped by the documented 56px target.
- Independent grid panels size to their own content instead of inheriting the
  height of a taller neighbour.
- The larger 48×28px toggle uses a flat neutral off layer and the shared lime
  control signal for on, without a passive outline.
- Connected list fixtures retain list/listitem semantics.
- Foundation surfaces, menus, empty states, and selected rows use colour layers
  instead of decorative perimeter outlines; editable controls, focus, invalid
  states, and sparse record dividers retain functional lines.
- Rethink Sans is loaded from the repository with no remote font URL.
- Shared primitive states cover normal, hover, focus, active, disabled,
  loading, invalid, and destructive presentation.

## Manual browser checklist

Record a scenario as personally verified only when it has been inspected in the
current browser run. Automated-only evidence must remain labelled as such.

The table below records the initial candidate review. It is retained as
historical Foundation evidence; the current rhythm refinement requires a new
responsive capture set before Navigation Pilot acceptance.

| Scenario | 1440×1000 | 1024×768 | 768×1024 | 390×844 |
| --- | --- | --- | --- | --- |
| Page title and first task visible | Verified | Verified | Verified | Verified |
| No horizontal page overflow | Verified | Verified | Verified | Verified |
| Route labels and markers remain legible | Verified | Verified | Verified | Verified |
| Dense connected rows remain scannable | Verified | Verified | Verified | Verified |
| Long labels truncate/wrap without clipping controls | Verified | Verified | Verified | Verified |
| Keyboard focus remains visible | Verified | Verified | Verified | Verified |
| Overlay/menu remains distinguishable | Verified | Verified | Verified | Verified |

Initial-candidate screenshots:

- [1440×1000](evidence/studio-wayfinding-foundation/1440x1000.jpg)
- [1024×768](evidence/studio-wayfinding-foundation/1024x768.jpg)
- [768×1024](evidence/studio-wayfinding-foundation/768x1024.jpg)
- [390×844](evidence/studio-wayfinding-foundation/390x844.jpg)

These screenshots record the initial Foundation candidate. The subsequent
number/letter/arrow and spacing refinements are covered by current static
contracts and must be recaptured during the Navigation Pilot browser review;
the screenshots are not presented as visual evidence for those later
refinements.

Additional initial-candidate browser checks:

- [x] No external script, stylesheet, font, or asset URL and no browser error/warning.
- [x] Reduced-motion CSS removes nonessential animation and transitions.
- [x] Dark surfaces retain visible separation at realistic form and row density.
- [x] Primary action and semantic status remain distinct from route colour.
- [x] Showcase is comfortable at realistic form and record density.

The browser audit found one `main`, one `h1`, no unnamed controls, no
unlabelled form controls, and no duplicate IDs. Keyboard focus was verified on
the primary action with the shared high-contrast outline. The overlay menu was
verified with its labelled menu items, secondary surface, and overlay-only
shadow. Viewport measurements reported no document or showcase overflow. The
1024×768 and 768×1024 measurements round by one CSS pixel in the in-app browser.

## Pre-pilot build baseline

The current Studio build before Navigation Pilot emits:

- application JavaScript: 1,240.17 kB / 354.98 kB gzip;
- application CSS: 132.23 kB / 21.05 kB gzip;
- local Rethink Sans variable font: 120.59 kB.

This baseline includes the existing dirty 0.8/0.9 family worktree and therefore
must not be compared with an older clean release as if Foundation caused the
whole delta. Navigation Pilot performance and bundle growth should be measured
against this exact pre-pilot build. The development showcase is code-split out
of production and its identifying strings are absent from the production
JavaScript bundle.

## Current balance-pass verification

- Studio TypeScript project build: passed.
- Studio Vite production build: passed (existing large-chunk warning remains).
- Portable repository suite: passed.
- Documentation link verification: passed.
- Static contrast, semantics, state-matrix, and showcase contracts: passed as
  part of the portable suite.
- Initial-candidate browser console warnings/errors: none.
- Current refined responsive visuals have not replaced the historical capture
  set and await the Navigation Pilot recapture. The historical viewport rows
  above must not be presented as current balance-pass visual verification.

## Guarded renderer evidence

The read-only guarded comparisons were run against the complete current dirty
worktree. They are recorded here rather than treated as Foundation acceptance
because this milestone does not change renderer-owned code or approved
evidence.

- `fidelity:compare`: did not pass. Existing fixtures include pixel mismatches
  and unapproved surfaces; the generated report is
  `fidelity/candidates/2026-08-18T19-38-56-261Z/comparison.json`.
- `scene:compare`: did not pass. Current projections were structurally valid,
  but existing approved snapshots and newly unapproved fixtures do not form a
  clean comparison baseline.
- `settlement:compare`: did not pass. Most inspected surfaces reported stable
  settlement, while several reference comparisons failed and the crop-mask
  fixture reported pending measurements.

No fixture, approved renderer reference, scene, settlement, tolerance, or
promotion record was updated. These results must remain visible when deciding
whether the later Navigation Pilot can be merged into a reference-clean
branch; they are not permission to normalize or regenerate evidence during the
Studio restyle.

## Pilot gate

The Foundation does not authorize the shell or production-page restyle. The
Navigation Pilot may begin only after the token/state contracts pass and the
manual checklist is reviewed. Any hierarchy, contrast, density, or navigation
problem must be corrected in the foundation rather than compensated for with
page-local styling.
