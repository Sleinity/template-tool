# Template SDK changelog

Consolidated changes for the Core, Browser and React packages, covering the recorded SDK releases from 0.2.0 through 2.0.1. Upgrade all three packages together. Historical entries describe their release's contract; current 2.x integrations use native V2 workflows. V1 APIs and wizard flows mentioned in older entries were retired in 2.0.0.

## 2.0.1

### Fixed

- Preserve shared Family choices when reordering fields, changing labels or editing unrelated rules.
- Reject stale renderer evidence after reload, reset and saved-session restoration. Restore publication after invalid content is repaired.
- In Studio, validate textarea line limits using the visible preview and restore rejected edits without saving provisional values to recovery or PNG output.
- Derive Family image diagnostics from effective per-design content and make invalid choice selections visible and repairable.

### Compatibility

- No public SDK API, canonical schema or saved-data migration changes. Core advances with the fixed package train; its portable behavior is unchanged.
- Current ZIP admission remains exporter 0.6.1 / source schema 1.0; canonical packages remain schema 2.2.

### Delivery documentation

- Provide a complete React/TypeScript host kit with all three SDK archives already in vendor/, organized offline guides and one README for new and existing applications.
- Consolidate release history into this CHANGELOG.md, included in the kit and available as the seventh uploaded release file.
- Keep SDK archives and SDK/package tags unchanged during documentation updates. Delivery manifests and checksums identify the updated host ZIP. Packaging checks do not claim new source/font pixel certification.

See the [2.0.1 release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v2.0.1).

## 2.0.0

- **Breaking:** retire V1 editing, single/Family sessions, importer wizard/confirmation, persistence workflows and the React importer entry/styles. Use native V2 host APIs.
- **Breaking:** require exporter 0.6.1 and raw source schema 1.0 at ZIP admission, before persistence or font linking. Missing and other exporter versions are blocked.
- Preserve canonical schema 2.2, current V2 records/resources/recovery and historical stored bytes; do not silently migrate or delete old work.
- Reduce duplicate validation, primitive interpretation and unrelated scene copying during asset collection. Family media readiness uses current accepted materialization.
- Deliver the complete single/Family host example with staged fonts, typed controls, choices, image placement, reset, persistence, recovery and guarded PNG.

See the [2.0 migration guide](https://github.com/Sleinity/template-tool/blob/1fac7d63d4ccaf4daa5a4503a6e7df1b61305822/docs/sdk/SDK_2_0_MIGRATION.md).

## 1.0.0

- Advance canonical packages/content to schema 2.2. Incompatible canonical 2.0/2.1 records require reimport from the original ZIP.
- Configure one image replacement policy: Fill, Fit or Crop. Preserve imported placement and restore it on Reset.
- Introduce the typed seven-field V2 semantic/content contract, native single/Family sessions, atomic field configuration, shared content and per-design image placement overrides.
- Add independent Family selection properties, portable tuple resolution and stable ordering of selectors and fields.
- Replace draft-catalogue workflows with template-scoped recovery and ownership-safe Fresh/Resume/Discard/export completion.
- Harden font-registry authority, blocked-storage retry, stale asynchronous work, URL/resource ownership and serialized saves.

## 0.8.0

- Add portable Template Families with stable field/design identity, shared content, generic groups, rule inheritance and pure selected-design materialization.
- Add Family sessions, import/reimport confirmation, persistence, importer components and editor bindings.
- Keep the established single-ZIP contract and present older single templates as one-design Families without eagerly rewriting records.

## 0.7.0

- Add the React host-editor entry with a session-bound responsive viewport, editable-field controllers and consolidated revision-safe diagnostics.
- Freeze and verify Core/Browser root and subpath contracts using entry-point inventories and packed-archive consumers.
- Align source aliases and declaration builds with published entry points.

## 0.6.0

- Add structured editable-field rule validation and an atomic host-neutral rule editor.
- Add shared import/render validation summaries and revision-bound exact-font activation evidence.
- Preserve invalid setup drafts while keeping the last valid package active. Fit intrinsic template canvases in responsive previews without changing renderer output.

## 0.5.0

- Add focused Core editor/assets/fonts/motion/inspection, Browser assets/fonts/persistence/capture/enrichment and React inspection entries.
- Keep inspection observational and Studio-only debug, stress, comparison and harness code outside public SDK archives.

## 0.4.2

- Move canonical scene ownership into Core and renderer/inspection/CSS/SVG ownership into React.
- Preserve supported public declarations and renderer behavior while reducing embedded implementation through fixed-train internal seams.

## 0.4.1

- Move browser assets, fonts, persistence, import orchestration, sessions, readiness and capture ownership into Browser.
- Remove the font/persistence dependency cycle and externalize sibling packages from Browser/React bundles without changing public behavior.

## 0.4.0

- Add curated Browser session/importer/compatibility entries while preserving existing root exports.
- Add structured runtime/confirmation compatibility inspection, SHA-256 confirmation integrity and atomic reopening.
- Report restrictive CSP capabilities explicitly and initialize Core schema compilation on first validation.

## 0.3.0

- Add the host-neutral setup wizard, seven-step headless import controller, portable field-rule operations and revision-safe font preparation.
- Require exact, glyph-complete font uploads while retaining explicit device-emoji fallback evidence.
- Add atomic confirmed-template reopening with fresh validation, rebuilt session state and stale-work rejection.

## 0.2.2

- Replace integration-specific distribution with host-neutral SDK and template-editor handoffs. Runtime and portable Core behavior remain unchanged.

## 0.2.1

- Project structured source diagnostics into blocked sessions, add opt-in silent PNG capture and provide StrictMode-safe React session ownership.
- Build Browser/React during prepack so packed archives cannot reuse stale output; Core behavior remains unchanged.

## 0.2.0

- Establish the revision-safe Browser TemplateSession, injectable offline adapters, React session bindings and current-identity PNG export.
- Add composable inspection and isolated packed-consumer verification.
- Move portable ZIP import, package validation, field editing and resolved/backend models into Core.

## Detailed package history

This summary consolidates the versioned package records. For complete package-level entries, see the pinned [Core changelog](https://github.com/Sleinity/template-tool/blob/1fac7d63d4ccaf4daa5a4503a6e7df1b61305822/packages/template-core/CHANGELOG.md), [Browser changelog](https://github.com/Sleinity/template-tool/blob/1fac7d63d4ccaf4daa5a4503a6e7df1b61305822/packages/template-browser/CHANGELOG.md) and [React changelog](https://github.com/Sleinity/template-tool/blob/1fac7d63d4ccaf4daa5a4503a6e7df1b61305822/packages/template-react/CHANGELOG.md). These historical records do not override current integration guidance.
