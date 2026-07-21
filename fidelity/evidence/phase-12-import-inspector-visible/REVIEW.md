# Phase 12 visible Import Inspector review

Review date: 2026-07-20  
Result: **A — browser approved after narrow diagnostic-presentation corrections**

## Environment

- Application command: `pnpm dev -- --port 5173`
- Route: `http://127.0.0.1:5173/templates/new`
- Browser: Codex In-app Browser (Chromium). The control API did not expose an exact embedded Chromium version, so none is inferred here.
- CSS viewport: 810×1343
- Device-pixel ratio: 1.340000033378601
- Host: macOS arm64; repository timezone Europe/Amsterdam
- State: existing local application state with the previously managed font catalogue; each reviewed package was imported again from its exact external ZIP path.
- Browser console: no warnings or errors in the final pass.

## Representative cases

| Case | Fixture | Evidence |
|---|---|---|
| Healthy isolated gradient | `template-package-gradient-test-4.zip` | Ready; node `457:46` is singular `primitive-authoritative` / SVG; no backend review diagnostic |
| Healthy ordered SOLID | `template-package-fill-stack-two-solids-blue-over-red.zip` | Ready; node `459:51` is singular `primitive-authoritative` / SVG with two paint revisions; no backend review diagnostic |
| Primitive/stroke | `template-package-stroke-test.zip` | Nodes `443:88`, `443:89`, `443:90`, `443:94`, and `443:95` expose their established DOM/SVG stroke owners without duplicate primitive ownership |
| DOM/CSS core plus media | `template-package-now-hiring-post.zip` | Compare route ready at settlement `core-b54cecf403a69fd4`; 6 routed and 4 compatibility nodes; media node `387:336` is `object-fit-cover`, `imported-source`, placement revision 0 |
| Compatibility boundary | `template-package-fill-stack-solid-paint-opacity.zip` | Node `459:59`; diagnostic `quality-5925e69e`; backend decision `backend:459:59:91eff43f`; compatibility / `legacy-dom-css`; approximated; safe export; not user-repairable |
| Preserved-only boundary | `template-package-main-visual-section.zip` | Node `2453:1435`; diagnostic `quality-58a62a01`; backend decision `backend:2453:1435:f63f1542`; compatibility / `unsupported-preservation`; preserved-only |
| Repairable dependency | `template-package-main-visual-section.zip` | Node `2453:1444`; diagnostic `quality-b6419e9d`; exact Funnel Display 500 face is unresolved; blocked with one `Add or replace font` action |
| Measurement variance | `template-package-gradient-test-3.zip` | Node `451:181` / Rectangle 11; diagnostic `quality-dac91302`; transformed local bounds are explicitly approximated and region targeting remains aligned at 176% |

## Review findings

The default view now groups the three derivative missing-motion diagnostics into one motion problem, suppresses raw renderer warnings already represented by a backend projection, uses friendly asset and capability language, and does not show raw capability/backend identifiers in ordinary rows or the selected user summary. Blocking shortcuts and footer counts use only user-audience blockers.

Expanded technical details retain capability ID, region, runtime owner, selected backend, support, confidence, visual impact, repairability, fallback reason codes, source diagnostic codes, diagnostic owner, decision identity, editability, export safety, and source/resolved/geometry/asset/placement/settlement revisions. The node-opacity control is correctly visible but not marked user-repairable. A current source/exporter gap may still offer re-export or flattening as an explicit workaround.

Region selection, Fit template, Fit affected layer, zoom, dimming, and the orange inspection outline were exercised. The template-space target stayed aligned and inspection chrome did not enter template output.

## Screenshots

- `healthy-gradient-ready.png`
- `blocked-repairable-and-unsupported-reviewed.png`
- `compatibility-node-opacity-reviewed.png`
- `expanded-backend-decision-reviewed.png`
- `unsupported-preserved-expanded-reviewed.png`
- `gradient-transformed-region-selected.png`

These are review evidence only. They are not approved renderer references and have no reference-update path.

## Approval boundary

Phase 12 is implemented and browser-approved. This review did not change renderer pixels, schemas, normalization, family resolvers, runtime routing, reference files, snapshots, or tolerances. ADR 0068 remains Proposed because Legacy/Semantic/Compare product routing, persistence, and default selection are Phase 13 work.

## Verification

- Full unit tests, TypeScript build, production build, strict diagnostic ZIPs, strict realistic-ZIP lifecycle, 18 appearance projections, runtime-routing stage 4A/scenarios/fonts/text trim, image replacement authority, and mask/primitive browser persistence/offline scenarios pass.
- Fidelity run `phase-12-import-inspector-approval` is repeat-stable for 12 fixtures × four surfaces. Thirty-one unaffected approved comparisons are pixel-exact and geometry-equal.
- `ordered-solid-paint-opacity/validate` retains equal template geometry; its 1,411 changed pixels are the reviewed Inspector presentation correction for compatibility-owned node `459:59`. The fixture's Fields, editor, and PNG surfaces remain pixel-exact.
- The four historical core fixture comparisons and full scene/settlement guards retain only their documented non-promoted or unapproved differences.
- Approved roots remain 96 renderer files, 4 scene files, and 80 settlement files. No update command ran.
- The production main JavaScript is 970.17 kB minified / 281.76 kB gzip, +2.08 / +0.72 kB from the preceding build. The known large-chunk warning is unchanged.
