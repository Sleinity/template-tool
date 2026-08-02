# Template Platform Boundary Audit

Status: Milestone 2F physical React-renderer ownership and SDK 0.4.2 patch
Audit date: 2026-08-02
Code baseline: the fixed SDK 0.4.2 train and compatibility-hardened generic template editor reference
Authority: current code and imports take precedence over intended folder names

## 1. Purpose and conclusions

This audit defines the boundary between the reusable Template Platform and the
Template Studio product. Milestones 1A–2C completed the application/UI movement,
the package/source, resolved/backend, field, browser-runtime and React-renderer physical migrations
without changing renderer behavior, public APIs, package contracts, fixtures,
or approved evidence.

The repository is already a public pnpm monorepo with three authenticated
GitHub npm facades, packed-package consumers, minimal and generic template
editor React consumers, and a public-release, secret-free vendored runtime
handoff. It is not yet fully physically separated:

- `apps/studio` now owns the real Vite application, routes, views, styles,
  assets, optional services and build;
- `template-core` physically owns package types, schema, ZIP/source parsing,
  normalization, validation, portable resolution models, resolved trees,
  primitive appearance, backend decisions and portable field contracts;
- `template-browser` physically owns browser assets, exact fonts, persistence,
  import orchestration, sessions, readiness, compatibility inspection,
  optional enrichment and PNG capture;
- `template-react` physically owns the production React renderer, previews,
  inspection viewport, renderer adapters and renderer-specific runtime routing;
- Studio production modules still use both public package imports and direct
  root implementation imports;
- Studio now owns its complete UI kit and product panels; the public inspection
  viewport has no Studio, icon, route or persistence dependency;
- resolved-tree, primitive-appearance and backend-decision implementations have
  one package owner and no renderer or root implementation dependency;
- browser font and template persistence share one package-internal
  content-addressed binary/storage layer without a font-to-persistence cycle.

The committed generic template editor consumer is itself a release gate rather
than documentation-only example code. An isolated Chromium harness installs
locally packed or registry-derived archives and verifies its complete import,
setup, edit, persistence, readiness and silent-export lifecycle. The reusable
setup workflow is now package-owned: `template-react/importer` composes the
host-owned browser session, managed-font preparation, core field-rule updates,
validation and the current render identity without importing Studio or
assuming product navigation, catalogue or persistence. Release publication
is tag-only; manual workflow dispatch may refresh assets solely from an
already-published fixed version. Public source and Release visibility do not
change the package manifests' `UNLICENSED` status; active
`sleinity-tools-only` policy authorizes Sleinity-owned applications only.

The required target is a reusable **Template Platform** plus an independent
**Studio application**, not a renderer extracted from an otherwise unchanged
application. Studio remains the Template Tool product, fidelity workbench, and
canonical consumer.

## 2. Audited repository snapshot

| Area | Current physical location | Current role | Target owner |
| --- | --- | --- | --- |
| Studio entry, routes, views, styles and assets | `apps/studio/src` | Product application | `apps/studio` |
| Studio UI and product panels | `apps/studio/src/components` | Product design system, field/font/quality panels and styled preview | `apps/studio` |
| Studio optional services | `apps/studio/server/figma-enrichment` | Optional Vite-local Figma enrichment; open-font resolution retired before SDK 0.3.0 | `apps/studio/server` |
| Core package/source contract | `packages/template-core/src` | Physical owner of types, schema, ZIP/source normalization/validation, portable models, resolved trees, primitive appearance and backend decisions | `packages/template-core` |
| Browser runtime | `packages/template-browser/src` | Physical owner of browser assets, fonts, storage, import, sessions, compatibility, readiness and capture | `packages/template-browser` |
| React renderer | `packages/template-react/src` | Physical renderer, preview, inspection, session-binding and importer-UI owner | `packages/template-react` |
| Platform compatibility source | `src/template-package` | Behavior-free forwarders plus remaining Studio/fidelity internals | Retire with ordinary Studio and fidelity public-entry migration |
| Certified evidence | `fidelity`, `tools/fidelity`, `scripts` | Exact fixtures and guarded comparisons | Remains shared repository infrastructure |
| Consumer proof | `examples/{minimal-renderer,template-editor-integration}` | Minimal render plus import/edit/persist/export host-integration proof | Keep public-entry-only and connect existing host services outside SDK |

The Milestone 0 inventory comprised 22 Studio TypeScript modules, 169
non-fixture `src/template-package` TypeScript/JSON modules, six package entry
modules, and nine Studio server modules. Milestone 1A relocated ownership
without adding a second application or changing that production behavior.

## 3. Current dependency graph

```text
template-core
      ↑
template-browser
      ↑
template-react
      ↑
apps/studio ──> checked root compatibility forwarders

apps/studio/server ──> checked root enrichment forwarders
```

The intended graph is:

```text
template-core
    ↓
template-browser
    ↓
template-react
    ↓
template-chromium (later)

apps/studio ──> core + browser + react
examples ─────> documented public entry points only
fidelity ─────> public APIs + explicit advanced inspection entry points
```

`template-react` may depend on both `template-browser` and `template-core`.
`template-browser` may depend only on `template-core`. `template-core` must not
depend on React, DOM, browser storage, network, or application code. No package
may depend on `apps/studio`.

## 4. Consumption-level classification

Every production module in the audited inventory has exactly one intended
consumption level. The rules below are ordered; the first matching rule owns a
module. Files not selected as a supported or advanced interface remain internal
even when they are currently reachable through a broad barrel export.

| Level | Meaning |
| --- | --- |
| P1 | Platform UI-independent API |
| P2 | Platform reusable React interface |
| P3 | Platform advanced inspection API |
| S1 | Studio application |
| S2 | Studio fidelity/development-only |
| I1 | Internal implementation detail |

### 4.1 Exhaustive path rules

| First-match path/module rule | Level | Intended destination / note |
| --- | --- | --- |
| `apps/studio/**` | S1 | Real Studio application and optional services |
| `apps/studio/src/components/template-package/**` | S1 | Studio field/font/quality workflows and styled inspection composition; later reusable interfaces are rebuilt from extracted controllers |
| `src/template-package/{debug/**,analysis/TemplatePackageStressReports.tsx,quality/fidelityIssuePacket.ts,runtime-routing/devHarness.ts}` | S2 | Explicit fidelity/development tooling |
| `src/template-package/analysis/{featureCoverage,fidelityRisk,types,index}.ts` | P3 | Advanced capability/risk inspection |
| `src/template-package/appearance-contracts/**`, `src/template-package/settlement/**` | P3 | Versioned observational evidence, not ordinary runtime API |
| `packages/template-core/src/scene/**` | P3 | Physical owner of versioned canonical semantic/provenance inspection; bounded runtime consumers remain internal |
| `src/template-package/scene/**` | I1 | Behavior-free compatibility forwarders to the core scene owner |
| `src/template-package/quality/{types,createTemplatePackageQualityReport,diagnosticPresentation,loadedSourceDiagnosticAdapter,qualityWorkspace}.ts` | P3 | Reusable diagnostic records/view models; presentation remains host-owned |
| `src/template-package/render/productRenderIdentity.ts` | P3 | Versioned readiness/identity evidence used by stable bindings |
| `packages/template-react/src/**`; renderer modules `TemplatePackageRenderer.tsx`, `ScaledTemplatePackagePreview.tsx`, `TemplateInspectionViewport.tsx`, compatibility `TemplateInspectionPreview.tsx`, and `previewViewport.ts` | P2 | Renderer, session bindings, the host-neutral importer wizard, and composable/compatibility preview interfaces |
| `packages/template-core/src/{types,schema,bundle,models,resolved,backend-decision,primitives}/**` and its package/validation modules | P1 | Physical owner of portable package, normalization, resolution, primitive appearance and backend contracts; primitives remain internal |
| Legacy root package/source/validation/resolved/backend/primitive paths | I1 | Behavior-free compatibility forwarders to `template-core`; never package implementation |
| `packages/template-browser/src/**` | P1 | Physical owner of browser assets, exact fonts, persistence, import orchestration, sessions, compatibility, readiness, enrichment adapters and capture |
| `src/template-package/assets/**`, `fonts/**`, `persistence/**`, `import/**`, `session/**`, `export/**` and browser enrichment paths | I1 | Checked behavior-free compatibility forwarders to `template-browser` |
| `src/template-package/assets/packageAssetResolution.ts` | I1 | Behavior-free compatibility forwarder to portable core asset resolution |
| `src/template-package/editor/{packageEditorSession,packageFieldBindings,fieldConstraints}.ts` | I1 | Behavior-free compatibility forwarders to portable core field ownership |
| `src/template-package/editor/textMeasurement.ts` | I1 | Behavior-free compatibility forwarder to browser-owned measurement |
| `src/template-package/motion/**` | P1 | Portable linking, summary and time evaluation |
| `packages/template-core/src/motion/**` | P1 | Portable motion linking and summary authority |
| `src/template-package/enrichment/visualDiff.ts` | S2 | Fidelity-only comparison helper; not browser package production |
| Remaining `src/template-package/render/**`, `masks/**`, `runtime-routing/**`, bundle helpers, enrichment `visualDiff.ts`, editor `fieldLabels.ts`, and unlisted barrels | I1 | Proven implementation details; exported only if a later contract explicitly promotes them |

Index barrels inherit the strictest public surface of their explicit exports;
they do not promote internal siblings automatically.

### 4.2 Reusable React assessment

| Current interface | Finding | Target |
| --- | --- | --- |
| `TemplatePackageRenderer` | Reusable now; no Studio route/persistence dependency | P2 stable renderer entry |
| Session provider, snapshot hook and renderer | Reusable and physically package-owned | P2 stable session entry |
| `ScaledTemplatePackagePreview` | Reusable behavior with browser observer | P2 renderer/preview entry |
| `TemplateInspectionViewport` | Reusable; UI-independent state, imperative fit/zoom API, live settled-target measurement and overlays | P2 composable viewport |
| `TemplateInspectionPreview` | Backward-compatible native-control composition over the viewport | P2 compatibility interface; Studio uses its local styled composition |
| `TemplatePackageFieldEditor` | Splittable; combines reusable mutations with Studio UI, file decode and measurement | Existing component stays S1; later `useTemplateFields` and composable P2 editor |
| `TemplatePackageFieldRulesEditor` | Studio-specific complete panel; workflow, drag UI and design tokens are coupled | Existing component stays S1; the package-owned pure rules and importer-wizard field-rules step are separate P1/P2 interfaces |
| `TemplatePackageQualityPanel` | Reusable filtering/view-model logic under Studio presentation | P3 view model; later small P2 summary/list, not this complete panel |
| Validate/readiness panels | Studio-specific copy, actions, persistence and UI components | S1; later new P2 validation summary/list |
| Font preparation/resolution panels | Studio acquisition workflow and UI | S1; the compact importer wizard now consumes public browser font/session operations without exporting these panels |
| Import flow/editor page/export controls | Complete product workflows | S1; never exported as SDK pages |

Reusable components must be accessible, unstyled/composable, controlled where
workflow state matters, and free of Studio routes, catalogue state,
notifications, design tokens and persistence. The host owns branding,
navigation, approval and completion behavior.

## 5. Capability boundary audit

| Capability | Technical behavior today | Presentation/orchestration today | Works without Studio? | Existing public coverage | Target owner and required extraction | Principal risk |
| --- | --- | --- | --- | --- | --- | --- |
| Import | Core sync ZIP import plus browser asset/font/enrichment pipeline | `TemplatePackageImportFlow` owns file state, revisions and workflow | Partly: packed minimal consumer proves browser session import | Core `importTemplatePackage`; browser pipeline/session | Core owns byte/source contract; browser owns provider-backed lifecycle; replace fixed endpoint and persistence types | Imported baseline/provenance or stale work changes |
| Normalization | Source contract and `normalizeTemplatePackageBundle` | Studio exposes source diagnostics | Yes | Broad core exports | Physically move pure boundary into core without changing loose-to-strict gate | Silent source loss or canonical weakening |
| Validation | AJV schema plus semantic validation | Studio status, blocker and technical panels | Yes | `validateTemplatePackage` and diagnostic types | Core stable result; P2 summary/list later | Changing diagnostic identity or blocking semantics |
| Diagnostics | Source, validation, resolved/backend and quality projections | Studio quality workspace, diagnosis panels and issue packets | Pure records mostly; complete report needs browser readiness evidence | Fragmented; quality modules are not package exports | P1 stable diagnostics plus P3 inspection projection; keep workbench S1/S2 | Collapsing diagnostic audiences or exposing unstable internals |
| Assets | Portable reliability/reference resolution plus IndexedDB/object URLs | Import/editor file UI and dashboard thumbnails | Yes with in-memory/browser adapters | Browser assets barrel | Core owns identity; browser owns storage/URL lifecycle; Studio owns thumbnails/catalogue | Object URL lifetime, byte identity, offline restore |
| Fonts | Portable identity/matching and browser registries/`FontFace` activation | Studio upload/link/acquisition panels | Technical matching yes; activation needs browser/Chromium | Broad browser exports | Core identity/matching; browser provider/activation; Studio acquisition UI | Exact binary identity, strict text-face coverage with explicit device-emoji fallback, stale activation |
| Fields | Pure bindings, constraints and image authority | Studio field editor/rules builder | Pure edits yes; file/decode and visual fit need browser | Core mutation exports; browser measurement | Core operations, browser file/measurement controller, later P2 hook/editor/rule step | Defaults/edit lifecycle divergence and stale image decode |
| Motion | Pure motion link/summary/evaluation | Studio playback toggle, timeline and RAF clock | Yes at explicit time | Root motion barrel only, not current package facade | Core stable motion API; renderer consumes `timeMs`; host owns controls | Timing semantics and final-frame export |
| Resolution | Resolved tree, backend decisions, bounded routing over core-owned portable models | Studio creates trees and inspects diagnostics | Yes; helper and backend type directions are now acyclic | Core exports resolved/backend | Core technical/advanced APIs; next move the implementation with its primitive/appearance closure | Accidental pixel authority change during physical movement |
| Readiness | Validation, asset, font, settlement and render identity evidence | Studio panels and export status | Browser/Chromium only for complete readiness | Browser export/readiness plus React identity | Browser owns versioned readiness; React publishes current identity; Studio presents | Stale revisions and surface disagreement |
| Rendering | React DOM/SVG/CSS with browser measurements and compatibility owners | Studio preview shells, highlighting and editor layout | Yes in React browser consumer | React renderer/previews | React owns final browser backend; no pure Node backend in this programme | Pixel changes, DOM timing, font/image measurement |
| Export | Readiness, asset waits, hidden DOM capture and download | Studio button/progress/error workflow | Capture works in minimal consumer; requires mounted browser renderer | Browser export and React imperative handle | Browser returns capture result; download remains optional helper; host owns workflow | Capturing stale/wrong surface or raster variance |
| Persistence | IndexedDB templates, assets, drafts, autosave, catalogue operations | Root `App` owns lists, navigation and previews | In-memory/browser repository works, but contract is Studio-shaped | Entire persistence barrel exported by browser | Studio owns catalogue/drafts; browser later receives narrow optional session persistence | Saved-record compatibility, asset/font hydration |

## 6. Public API coverage and gaps

### 6.1 Supported now

- Core: ZIP import, parsing/normalization/validation, package/types,
  canonical/resolved/backend records and pure field/image mutations.
- Browser: assets, fonts, persistence, import pipeline, enrichment, readiness,
  PNG export and SDK 0.2 `TemplateSession`.
- React: renderer, render identity, previews, runtime context and SDK 0.2
  session bindings.
- Distribution: one versioned runtime-package manifest, exact published
  core/browser/React archives, one checksum manifest, npm/pnpm vendored
  dependency rules and a full browser consumer proving
  import/edit/save/render/export without GitHub credentials.

These are real package exports, but the implementations are physically bundled
from root source. The core and browser barrels are broader than the intended
long-term stable surface.

### 6.2 Missing or incomplete

| Needed capability | Required future contract | Reason it is not added in Milestone 0 |
| --- | --- | --- |
| Compatibility assessment | `TemplateRuntimeDescriptorV1` and versioned compatibility result | Requires separate API design without changing TemplatePackageV1 |
| Stable diagnostics projection | Versioned UI-independent report with audience separation | Current report combines static and browser/runtime evidence |
| Motion package entry | Explicit link/summary/evaluate exports | Must first confirm which current raw types are stable |
| Narrow session persistence | Load/save session state only | Current repository contract includes Studio product operations |
| Asset/font provider split | Durable byte/identity provider and browser activation provider | Current font registry imports persistence asset types |
| Capture without delivery | Closed in 0.2.1: `exportPng({ download: false })` returns the revision-safe result without anchor delivery | Capture/readiness and the default download behavior remain unchanged |
| Session source-diagnostic projection | Closed in 0.2.1: blocked session snapshots retain structured layered source diagnostics | Consumers no longer need a second core-importer preflight |
| React session ownership | Closed in 0.2.1: `useTemplateSession()` owns one workspace session and defers permanent disposal across StrictMode replay | Hosts remain free to inject an explicitly owned session |
| Reusable validation UI | View model, summary and issue list | Existing panels are Studio-styled and workflow-specific |
| Reusable fields UI | `useTemplateFields` and composable editor | Existing component combines UI, file IO, decode and measurement |
| Reusable importer wizard | Closed in SDK 0.3.0 RC3: `template-browser` owns the seven-step headless workflow and reports; `template-react/importer` provides bindings, preview bridge and optional UI. The wizard configures field rules but does not own content inputs. Confirmed state reopens atomically through `TemplateSession.loadTemplateState()` | Studio panels remain private; hosts own content controls, preprocessing, authentication, catalogues, publication, routing and navigation |
| Non-React browser mount | Host-owned React island | Deferred until renderer is physically package-owned |
| Headless pixels | Pinned Chromium runner | Browser platform separation must close first |

Expected package defects should remain returned diagnostics. Future async
adapter, readiness and capture failures should converge on typed SDK errors
without replacing the existing diagnostic records.

## 7. Boundary crossings that must be removed

### 7.1 Package facades into root source

Closed. Core, browser and React production modules have zero root-source
implementation imports. Retained root paths are checked behavior-free
forwarders used only while Studio and fidelity consumers migrate to supported
package or explicit advanced-inspection entries.

### 7.2 Platform modules into Studio UI

Milestone 1B removes this reverse dependency. No root platform production
module imports `apps/studio` or the Studio UI kit. The former editor, font and
quality panels are Studio-owned; `TemplateInspectionViewport` retains only the
browser/React behavior required by package consumers.

### 7.3 Studio into platform internals

Studio directly imports fifteen internal areas: persistence, quality, editor,
types, diagnostics, motion, enrichment, bundle, runtime routing, resolved,
render, import, fonts, export and assets. Public package imports have begun in
the import/editor views, but root `App`, diagnosis panels and readiness panels
still bypass them.

### 7.4 Internal cycles and wrong-way placement

- Milestone 2B closes the former resolved-to-render helper edge. Color/asset,
  layout, stroke, transform and vector intent now come from core-owned models;
  renderer modules are forwarders or CSS/React adapters.
- Milestone 2B also closes the backend-to-resolved implementation edge with
  narrow input ports and core-owned output contracts. Public wrappers retain
  the prior resolved-node signatures without reintroducing that implementation
  dependency.
- Milestone 2C physically moves resolved trees, injected font readiness,
  image placement, backend decisions and the required primitive-appearance
  closure into core. Root paths are checked behavior-free forwarders.
- Milestone 2E removed the font/persistence cycle through one browser-internal
  content-addressed binary layer and narrowed import source metadata.
- Milestone 2F physically moves canonical-scene authority to core and the
  production React renderer/runtime-routing closure to React. The fixed-train
  internal sibling entries exist only for renderer composition and are not
  supported host APIs.
- bundle diagnostics call resolved-tree creation. Keep this as an advanced
  inspection composition, not part of the low-level ZIP parser.

## 8. Environment and portability boundaries

| Environment dependency | Current locations | Decision |
| --- | --- | --- |
| IndexedDB | assets, fonts, persistence | Browser adapters only; in-memory alternatives remain |
| Blob/object URLs | assets, fonts, persistence, capture | Browser provider lifecycle with explicit disposal |
| `document.fonts`/`FontFace` | fonts, renderer, editor, capture | Browser/Chromium authority; never core |
| DOM range/canvas measurement | renderer, field measurement, visual diff | Renderer/browser; visual diff remains Studio/fidelity |
| Observers/animation frames | renderer, previews, Studio editor | Renderer hooks or host playback controls |
| Fixed `/api` fetches | Figma enrichment only | Host-injected optional provider; never renderer-time |
| Local filesystem fixture paths | scripts only | Private evidence configuration, never package runtime |
| Headless rendering | fidelity harness only | Later pinned Chromium package; React SSR is not final pixels |

Renderer-time network access remains forbidden. Optional Figma enrichment
occurs before rendering and remains cached/provenance-aware. Required fonts are
supplied as exact local uploads; setup performs no font-network request.

## 9. Reusable importer direction

The importer engine is an early platform responsibility. A reusable importer
wizard is deliberately later and lives under a future
`@sleinity/template-react/importer` entry point rather than a new package.

The later experience kit is assembled as:

```text
import/session controller
  → validation view model
  → font provider/controller
  → field-rule controller
  → readiness result
  → composable steps
  → optional default wizard recipe
```

The default recipe may offer Select ZIP → Inspect → Validate → Resolve fonts →
Configure fields → Check readiness → Complete. Hosts retain navigation,
branding, persistence, approval, notifications, available providers and step
selection. Existing complete Studio pages are not exported.

## 10. Physical migration order

1. **Completed in Milestone 1A:** move application/build ownership, routes,
   views, styles, assets and optional services to `apps/studio`; retain the
   coupled root UI seam explicitly.
2. **Completed in Milestone 1B:** split reusable preview viewport behavior from
   Studio controls, move the remaining Studio UI, and remove the root UI seam.
3. **Completed in Milestone 2A:** move portable package/source/validation
   contracts and their portable loader closure into `template-core`.
4. **Completed in Milestones 2B–2C:** invert renderer/backend dependencies and
   move resolved/backend contracts with the internal primitive closure into core.
5. **Completed in Milestone 2D:** move pure field/edit contracts into core;
   retain checked root forwarders for remaining repository consumers.
6. **Completed in Milestone 2E:** move browser assets, fonts, import, session,
   readiness, compatibility, enrichment and capture into `template-browser`;
   introduce shared binary storage and narrow persistence boundaries.
7. **Completed in Milestone 2F:** move canonical scene authority into core and
   the React renderer, previews, renderer routing and browser hooks into
   `template-react`.
8. Migrate ordinary Studio behavior to public entries; isolate fidelity-only
   inspection entries.
9. Extract reusable validation/field/preview view models and selected
   composable interfaces, then prove the minimal editor and renderer-only
   consumers.
10. Only after browser certification, add the Chromium runner/CLI, render
   service and optional importer experience kit as separate milestones.

Temporary forwarding modules are permitted only when they re-export one new
owner without behavior or type duplication. Each forwarder must have a named
retirement step in the same family migration. Vite aliases must not be used to
hide incomplete physical ownership from packed-package tests.

Milestones 2A–2F retain checked forwarder groups. Package/source/validation
forwarders retire when Studio production imports switch to the core public
entry. Resolved/backend/primitive, shared type/asset/mask/motion, browser and
renderer forwarders retire when ordinary Studio and fidelity consumers use
supported package or explicit advanced-inspection entry points. The
boundary checker requires every listed legacy module to contain exactly one
re-export and rejects duplicate type/schema owners.

## 11. Baseline sizes and protected identities

### 11.1 Built output before Milestone 0 documentation

| Output | JavaScript | Gzip / note |
| --- | ---: | ---: |
| `template-core` facade | 436,935 bytes | 92,709 bytes gzip; 1.4 MiB complete `dist` with declarations/maps |
| `template-browser` facade | 518,423 bytes | 108,574 bytes gzip; 1.7 MiB complete `dist` |
| `template-react` facade | 443,924 bytes | 95,965 bytes gzip; 1.3 MiB complete `dist` |
| Three facade JavaScript total | 1,399,282 bytes | 297,248 aggregate gzip bytes; contains known overlapping implementation |
| Studio production JS | 996,829 bytes | 290.45 kB gzip in the SDK 0.2 verification |
| Studio production CSS | 68,555 bytes | 12.21 kB gzip |
| Packed isolated consumer | 827,428 bytes | 242,805 gzip bytes |
| Minimal workspace consumer | 829.55 kB | 243.61 kB gzip |

Bundle de-duplication is documented debt, not permission to relocate semantic
or renderer ownership without the relevant fidelity gates.

### 11.2 Approved evidence identity

| Evidence | Files | Aggregate SHA-256 |
| --- | ---: | --- |
| Renderer references | 96 | `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08` |
| Scene snapshots | 4 | `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b` |
| Settlement snapshots | 80 | `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e` |

The aggregates are computed from sorted per-file SHA-256 lines and are the
contract lock for subsequent physical migration. Milestone 0 runs no update,
promotion or tolerance command.

## 12. Migration safeguards

| Risk | Required safeguard |
| --- | --- |
| Renderer pixels | Exact pre/post capture; no golden promotion for relocation |
| Font identity | Preserve binary hash, face index, private family and current revision across moves |
| Asset hydration | Test ZIP import, stored bytes, object URL lifecycle, reload and offline restoration |
| Motion timing | Keep evaluation pure and explicit-time; compare live and final-frame export |
| DOM measurement | Move hooks with their full lifecycle; never replace browser evidence with guesses |
| Export | Bind capture to current ready render identity and retain hidden PNG as a separate surface |
| Diagnostics | Preserve codes, audiences, root-cause grouping and provenance |
| Types | One canonical owner with temporary forwarding only; no copied interfaces |
| Circular dependencies | Move shared types downward before implementation movement |
| Fixture paths | Preserve manifest/hash lookup and harness routes after Studio relocation |
| React context | Migrate provider/consumer together and browser-verify current revision behavior |
| Node/browser targets | Core Node test without DOM; browser/React packages retain explicit DOM targets |

## 13. Milestones 1A–2D result and physical-migration handoff

Milestone 1A makes `apps/studio` the actual Vite root and moves its entry,
routes, views, styles, assets, optional services and tests. Root commands
delegate to the workspace; all browser/fidelity harnesses share a Studio-root
server bootstrap. The old root application/configuration entry is gone.

Milestone 1B adds the public UI-independent `TemplateInspectionViewport`, keeps
the existing `TemplateInspectionPreview` props through a native compatibility
composition, and gives Studio an equivalent styled composition. The UI kit and
all seven Studio-classified editor/font/quality panels now live under
`apps/studio`; boundary and archive checks forbid the former reverse edge.

Milestone 2A gives `template-core` physical ownership of the canonical types,
schema, diagnostics, migration, parser, validator, ZIP/source reader,
normalization and the loader's portable asset/mask/motion/Figma-URL closure.
Existing public exports are unchanged. Root consumers use checked, behavior-free
forwarders; the package importer itself no longer crosses that seam.

Milestone 2B gives `template-core` physical ownership of the portable
color/asset/axis, layout, stroke, transform and vector models plus backend
output contracts. Resolved-tree creation has no renderer import; backend
decision and diagnostic implementations consume narrow inputs rather than the
resolved-node contract. Renderer compatibility paths remain thin adapters, and
the package declaration is byte-identical to Milestone 2A.

Milestone 2C gives `template-core` physical ownership of resolved graph
construction, injected font readiness, image placement, backend decisions and
their internal primitive-appearance closure. Root paths are checked forwarders,
and the package declaration remains byte-identical.

Milestone 2D gives `template-core` physical ownership of the framework-neutral
editor-session contract, field discovery and mutation, image replacement/reset,
constraint evaluation and measurement-result projection. Browser-owned DOM
measurement remains in `template-browser`, Studio owns field labels, and the
legacy root editor paths are checked forwarders.

SDK 0.3 adds a package-owned product interface without changing those physical
boundaries. `template-core` owns pure field-rule setup mutations;
`template-browser` owns the seven-step headless import controller, structured
validation projections, adapter orchestration and revision-safe
working-package/font/session operations; `template-react/importer` owns the
provider, snapshot hook, preview bridge and optional accessible composition.
The wizard imports no Studio code. It may own its own session or accept an
injected one, and optional host adapters may supply exact font bytes, image
editing or post-confirmation persistence. Authentication, catalogues,
publishing, routing and navigation remain host-owned. After external-host
acceptance, the next physical boundary was browser-runtime ownership.

Milestone 2E gives `template-browser` physical ownership of assets, exact font
handling, browser storage, template/draft persistence, import orchestration,
the seven-step wizard controller, confirmation compatibility and integrity,
sessions, readiness, enrichment adapters and PNG capture. Font and template
persistence share one package-internal content-addressed binary storage layer.
The browser package depends on core plus package-local seams and has no root,
React, Studio or renderer implementation dependency. Root consumers remain on
checked behavior-free forwarders until the React renderer and ordinary Studio
public-entry migrations. Core and browser are external dependencies of their
downstream package bundles rather than duplicated embedded facades.

## 14. Milestone 0 verification record

This section is completed from the same working tree after the audit document
and its links are finalized. Commands that generate candidates may write only
to candidate/evidence directories and must not write approved references.

| Check | Result |
| --- | --- |
| Portable unit suite and TypeScript | Pass: portable lifecycle/full suite, root build-mode typecheck, and all three package typechecks |
| Studio production build | Pass: 996.83 kB / 290.45 kB gzip JavaScript and 68.56 / 12.21 kB CSS; existing chunk warning unchanged |
| Three package builds/declarations | Pass: core 426.69/84.25 kB JS/declarations; browser 506.27/106.95; React 433.52/66.26 |
| Package boundaries and archive inspection | Pass: boundary checker and all three private archives |
| Packed and minimal consumers | Pass: packed 827,428 / 242,805 gzip bytes; minimal 829.55 / 243.61 kB gzip |
| Browser session smoke | Pass: ZIP, edit, save, current-identity PNG, reload and offline restore |
| Documentation links | Pass: 141 Markdown files and 287 local links after final edits |
| Appearance projection | Pass: all 19 fixtures valid and deterministic |
| Renderer guard | `milestone-0-platform-boundary-audit` repeat-stable for 19 fixtures × four surfaces; 31 approved surfaces pass, 17 retain documented historical/environment-sensitive differences, and 28 are intentionally unapproved |
| Scene guard | All 19 candidates valid; full guard retains four historical differences and 15 intentionally unapproved snapshots |
| Settlement guard | All 19 candidate fixtures publish stable observational results; full guard retains its documented historical/unapproved reference states |

Historical/environment-sensitive failures and unapproved fixtures are review
states, not implementation regressions and not permission to update evidence.

The aggregate `pnpm ci:portable` wrapper was not used as evidence because the
managed non-interactive pnpm launcher attempted to reconcile `node_modules` and
aborted before running checks. Its installed-lockfile constituent commands were
run directly instead. The packed consumer initially lacked registry access in
the sandbox, then passed unchanged when rerun with normal registry access.

The approved identities in section 11.2 were recomputed after the guarded
commands and remain byte-identical. No update, promotion or tolerance command
ran.

## 15. Milestone 1A verification record

- Portable tests, root and package TypeScript, the direct Studio build, root
  delegated build/dev smoke, package boundaries/archives, repository audit,
  packed/minimal consumers and both browser smokes pass.
- `/`, `/templates`, `/templates/new`, missing settings/draft recovery, browser
  history, both optional API routes and
  `/src/assets/fonts/rethink-sans-600.ttf` pass from the Studio Vite root.
- Studio JavaScript is 996.42 kB / 290.33 kB gzip and CSS remains 68.56 kB /
  12.21 kB gzip. Package, packed-consumer and minimal-consumer sizes are
  unchanged from section 11.
- All 19 appearance projections remain valid/deterministic. Fidelity run
  `milestone-1a-independent-studio` is repeat-stable across all four surfaces
  and retains the Milestone 0 guard state: 31 pass, 17 historical/environment
  differences and 28 unapproved surfaces.
- Scene retains four historical differences and 15 unapproved candidates;
  settlement retains its stable documented historical/unapproved states.
- Approved renderer, scene and settlement aggregates remain exactly those in
  section 11.2. No update, promotion, fixture, schema or tolerance command ran.

## 16. Milestone 1B verification record

- Portable tests, root/package TypeScript, Studio/SDK builds and declarations,
  boundaries, archives, packed/minimal consumers, documentation and all 19
  appearance projections pass.
- The Studio browser smoke covers ZIP import, snapshot-driven controls,
  template/target fit, zoom, resize and observer disposal with zero external
  requests or console errors.
- Studio is 997.62 / 290.27 kB gzip JavaScript and 68.56 / 12.21 kB CSS. Core,
  browser and React are 426.69/84.25, 503.96/106.95 and 427.72/67.58 kB
  JavaScript/declarations. Packed dual-preview and minimal consumers are
  833,600/244,508 bytes and 826.35/242.35 kB gzip respectively.
- The two-pass renderer baseline is stable and the fresh guard retains 31
  passes, 17 documented historical/environment-sensitive differences and 28
  unapproved surfaces. Scene retains four historical differences and 15
  unapproved candidates; settlement retains its stable documented states.
- Approved aggregates remain exactly those in section 11.2. No update,
  promotion, fixture, schema or tolerance command ran.

## 17. Milestone 2A verification record

- The aggregate portable CI gate passes. Portable tests include a package-owned DOM-free source-contract suite for
  canonical validation, invalid JSON, loose normalization, video diagnostics,
  ZIP traversal rejection, motion linking, preview metadata and zero network
  access. Root and package TypeScript pass.
- Direct and delegated Studio builds, all three SDK builds/declarations,
  ownership/archive checks, the repository audit, documentation, packed and
  minimal consumers, session smoke and Studio route/API/font/viewport smoke
  pass. The core declaration is byte-for-byte identical to Milestone 1B.
- Studio JavaScript is 997.93 / 290.39 kB gzip and CSS is 68.56 / 12.21 kB.
  Core/browser/React are 425.51/84.25, 503.83/106.95 and 427.70/67.58 kB
  JavaScript/declarations. Their archives are 286,787, 342,222 and 277,126
  bytes. Packed and minimal consumers remain 833,600/244,508 bytes and
  826.35/242.35 kB gzip.
- All 19 appearance projections remain valid/deterministic. Renderer run
  `milestone-2a-portable-core` is two-pass stable and retains 31 approved
  passes, 17 historical/environment-sensitive differences and 28 unapproved
  surfaces. Scene retains four historical differences and 15 unapproved
  candidates; settlement retains its stable documented reference states.
- Approved identities remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.

## 18. Milestone 2B verification record

- Portable tests, root TypeScript, all SDK builds/declarations,
  ownership/archive checks, documentation, Studio/minimal builds, isolated
  packed consumers and both browser smokes pass. The packed-core Node consumer
  imports only its installed archive, loads an inline ZIP and rejects browser,
  storage, font and network globals.
- Later 2C review found that the new model fixture was omitted from the
  effective direct-core typecheck evidence and lacked one required asset field;
  2C closes that gap and makes package-owned runtime tests explicit.
- Core's declaration remains exactly 86,272 bytes at
  `e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
  Core/browser/React JavaScript and declaration outputs are 425.58/84.25,
  503.17/106.95 and 428.43/67.58 kB. Archive sizes are 278,706, 333,127 and
  276,779 bytes.
- Studio is 998.31/290.44 kB gzip JavaScript and 68.56/12.21 kB CSS. The
  packed consumer is 833,790/244,411 bytes and the minimal consumer is
  826.54/242.27 kB gzip, all materially flat against Milestone 2A.
- Renderer run `milestone-2b-portable-resolution-guard` is repeat-stable and
  retains 31 approved passes, 17 documented historical/environment-sensitive
  differences and 28 unapproved surfaces. Scene retains four historical
  differences and 15 unapproved candidates; settlement retains its documented
  stable historical/unapproved states.
- Approved identities remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.

## 19. Milestone 2C verification record

- The direct core typecheck gap is closed and package-owned tests execute at
  runtime. Resolved trees, backend projections, ordered paint ownership, image
  placement and injected font readiness pass without browser globals.
- Core owns resolved, backend and primitive implementation; legacy root paths
  are behavior-free forwarders. Package typechecks/builds, boundaries,
  archives, packed consumers, root/Studio/minimal builds and both browser
  smokes pass. The isolated Node archive also verifies the corrected Ajv ESM
  entry without changing validation behavior.
- Core's declaration remains exactly 86,272 bytes at
  `e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
  Core/browser/React JavaScript and declarations are 425.39/84.25,
  503.14/106.95 and 428.39/67.58 kB; archives are 278,660, 333,107 and
  276,760 bytes.
- Studio remains 998.31/290.44 kB gzip JavaScript and 68.52/12.20 kB CSS.
  Packed/minimal consumers remain 833,790/244,411 bytes and
  826.54/242.27 kB gzip.
- Renderer runs `milestone-2c-portable-resolved-backend` and
  `milestone-2c-portable-resolved-backend-compare` are repeat-stable and retain
  31 approved passes, 17 historical/environment-sensitive differences and 28
  unapproved surfaces. Scene retains four historical differences and 15
  unapproved candidates; settlement retains its documented stable states.
- Approved identities remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.

## 20. Milestone 2D verification record

- Direct core/browser and root TypeScript, portable tests, repository audit,
  documentation, package/Studio/minimal builds, boundaries, archives, both
  installed consumers, both browser smokes and all 19 appearance projections
  pass. The initial aggregate run's sandboxed dependency download was rerun
  through the same isolated checks with network access.
- Package-owned tests cover descriptors/markers, target diagnostics,
  text/color/visibility/image mutation, Unicode constraints, patterns,
  replacement revisions, reset, full restore, readiness and measurement
  projection. The installed core archive repeats the mutation/restore contract
  while rejecting DOM, CSS, storage, font and network globals.
- Core's declaration remains exactly 86,272 bytes at
  `e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8`.
  Core/browser/React JavaScript and declarations are 425.32/84.25,
  503.00/106.95 and 428.39/67.58 kB; archives are 278,164, 333,080 and
  276,760 bytes.
- Studio is 998.38/290.37 kB gzip JavaScript and 68.52/12.20 kB CSS.
  Packed/minimal consumers remain 833,790/244,411 bytes and
  826.54/242.27 kB gzip.
- Renderer runs `milestone-2d-portable-field-editing` and
  `milestone-2d-portable-field-editing-compare` are repeat-stable and retain
  31 approved passes, 17 historical/environment-sensitive differences and 28
  unapproved surfaces. Scene retains four historical differences and 15
  unapproved candidates; settlement retains its documented stable states.
- Approved identities remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.

## 21. Milestone 2E verification record

- `template-browser` physically owns browser assets, exact fonts, storage,
  persistence, import/wizard/confirmation orchestration, sessions, readiness,
  compatibility inspection, enrichment and PNG capture. Root consumers use
  checked behavior-free forwarders; browser production source imports no root,
  React, Studio or renderer implementation.
- Portable CI, root/package TypeScript, SDK/Studio/example builds,
  declarations/API inventory, boundaries, archives, DOM-free core, packed
  consumers, browser smokes and the packed generic editor pass. Secret-free npm
  and pnpm vendored consumers pass in the release workflow; the generic editor
  also passes against anonymously downloaded public Release bytes.
- Core declarations remain exactly 87,431 bytes at
  `7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
  Core/browser/React archives are 283,577 / 209,477 / 303,397 bytes. Browser is
  47.8% smaller than 0.4.0; consumer and Studio gzip remain materially flat.
  Registry-derived SHA-256 values are core
  `1604c4923a6cba0ce039ad26b738b11fe4c755048a9c4d47cd08200f4bdf8654`,
  browser
  `cad8ab9e506973ad31926bdc9345640a7b6271de7f1c11c7d418b4274109d054`,
  and React
  `5169ee62db4ccde8437bae49f1d73915acbb4d8b2749d513a467260b734c3fe2`.
- Studio is 1,001.02/291.35 kB gzip JavaScript. Packed, minimal and generic
  consumers are 897,726/262,605 bytes, 858.15/251.51 kB and
  912.50/266.51 kB.
- Appearance is deterministic for 19 fixtures. Renderer
  `2026-07-30T17-10-29-068Z`, scene
  `scene-2026-07-30T17-12-05-022Z`, and settlement
  `settlement-2026-07-30T17-12-07-041Z` comparisons retain the documented
  historical/unapproved states. Exact-font and source-authoritative evidence
  pass.
- Approved identities remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.

## 22. Milestone 2F verification record

- `template-core` physically owns canonical-scene construction, serialization,
  validation, equivalence and mappings. `template-react` physically owns the
  renderer, previews, inspection viewport, adapters and renderer-specific
  runtime routing. Neither package imports root implementation source.
- Root scene/render/routing compatibility paths contain one checked re-export.
  Unsupported `renderer-internal` fixed-train entries connect these repository
  forwarders without adding supported host APIs; ordinary Studio modules,
  examples and browser production code are forbidden from importing them.
- Package/root TypeScript, portable tests, builds, declarations/API inventory,
  boundaries, archives, packed core/React consumers, browser smokes, generic
  editor acceptance and runtime-routing scenarios pass.
- Core declarations remain exactly 87,431 bytes at
  `7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
  Core/browser/React archives are 347,076 / 209,476 / 153,598 bytes; the React
  archive is 49.4% smaller than 0.4.1 and the fixed-train total is 10.8%
  smaller. The packed consumer is 856,967 / 251,434 gzip bytes. Studio remains
  materially flat at 1,001.02 / 291.15 gzip kB.
- The train was published from `sdk-v0.4.2`. Authenticated package lookup,
  secret-free npm/pnpm consumers, public Release visibility, anonymous archive
  checksums and generic-editor acceptance pass. Registry-derived SHA-256 values
  are core
  `7bb364bec2630969bd5ac4f9f8e8e52b88f90ce99694ce10040489a4159ff74f`,
  browser
  `7c22e32cfcb9851b71af05768f857bf95705071c63daa9b5339cc258719c1fca`,
  and React
  `ced85dd35631f0347b30882c7c1105b166b7428205385c4d4b814b519d863408`.
- Appearance is deterministic for all 19 fixtures. Renderer run
  `2026-08-02T13-40-25-642Z` reproduces the 0.4.1 historical/unapproved states;
  scene retains four historical and 15 unapproved states, and settlement
  retains its documented states. Approved identities remain renderer 96 /
  `be6047fe9a3a84d711d4dee3fc125a1de741c8a8179fcb7d704590e1b0389f08`,
  scene 4 / `b788f6f11f8cf3bb319ee22eae81182380c493dd0a4db359c0e70f5edc59f54b`,
  and settlement 80 /
  `c8295ff446039e68e12bc6067fc7420da4694c5aee5263dbcc733238cc7e296e`.
  No approved file changed and no update, promotion, fixture, schema or
  tolerance command ran.
