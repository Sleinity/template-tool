# `@sleinity/template-browser`

Private browser runtime for TemplatePackage assets, managed fonts, measurement,
persistence, revision-bound readiness, and PNG export. Consumers may replace
the default storage registries through the existing adapter interfaces.

As of 0.4.1 this package physically owns that complete browser runtime. Its
production modules depend on `@sleinity/template-core` and package-local
contracts; they do not compile implementation from the repository root,
Template Studio, React, or renderer JSX. Retained root paths are temporary
behavior-free compatibility forwarders for Studio and fidelity tooling.

Rendered text-line and visual-fit collection remain browser-owned. They project
DOM measurements into the portable field-fit model without moving DOM, CSS, or
font availability checks into `template-core`.

## Consumer session

New hosts should import from the curated entry points:

- `@sleinity/template-browser/session`
- `@sleinity/template-browser/importer`
- `@sleinity/template-browser/compatibility`

The broad package root remains supported for existing integrations.

`createTemplateSession()` is the supported high-level host contract. It owns a
revision-safe ZIP/import lifecycle, immutable imported baseline, editable
working package, validation, resolved tree, typed fields, and optional save/load
through the existing repository adapter. Asset, managed-font, and repository
adapters are injectable; browser defaults remain offline-capable IndexedDB.

The session exposes `loadZip`, `loadTemplateState`, `loadSavedTemplate`, `save`, `setField`, image
replacement/reset/mode operations, full imported-state restore, `getSnapshot`,
`subscribe`, and `dispose`. Older asynchronous imports cannot publish over a
newer operation revision.

`loadTemplateState()` reopens a host-retained confirmed template in a fresh
session. It clones and revalidates the imported baseline and working package,
requires matching package identity, rebuilds resolved and editable state, and
publishes atomically at a new revision. Stored validation, resolved trees,
readiness, and render identities are never trusted.

`inspectTemplateRuntimeSupport()` reports required browser, storage, font,
image, SVG, data/blob, rendering, and optional capture capabilities with stable
machine-readable codes. `inspectTemplateImportConfirmation()` validates
confirmation identity and integrity without changing session state.
`loadTemplateImportConfirmation()` is the recommended atomic reopening helper.
SDK 0.4 confirmations include SHA-256 content evidence; supported 0.3
confirmations without it remain loadable with a compatibility warning.

SDK 0.3 adds setup-specific operations used by the React importer:
`replaceWorkingPackage`, managed-font candidate lookup/linking, font upload,
and confirmed fallback selection. Package replacement validates before
publication, rebuilds the resolved tree, advances session revisions, and
rejects stale font work. Invalid candidates return validation evidence without
replacing the last ready package.

The supported setup UI uses `uploadFont()` as an exact-face gate. It accepts
only one verified family/PostScript identity with the requested weight or
variable-axis range, posture, stretch, axes, and complete required text-face
coverage. Explicit emoji presentation, ZWJ, skin-tone, flag, and keycap
sequences use the established device emoji fallback and remain a visible
non-blocking portability note. Ordinary text-style symbols and all other
characters remain strict. An exact face already stored in the managed registry is reused
automatically. Candidate/link/fallback methods remain lower-level compatibility
APIs for existing packages; the setup wizard does not present them as choices.

Blocked ZIP imports publish ordered structured diagnostics through
`snapshot.diagnostics`, including source layer/origin evidence in each
diagnostic's details. Consumers do not need to run a second core import
preflight before `session.loadZip()`.

## Import workflow controller

`createTemplateImportWizard()` is the headless, host-neutral seven-step import
workflow. It owns one session by default, or accepts an injected session that it
never disposes. Its immutable snapshots expose structured import, exact-font
and current-revision render reports plus sanitized field rules and explicit
step readiness. Every attempted import, including a corrupt ZIP, produces
`importValidation` and a non-null compatibility validation result.

Optional `TemplateFontAdapterV1` and `TemplateImportPersistenceAdapterV1`
connect host-owned font bytes and post-confirmation storage. Adapters receive
abort signals, stale results are rejected, and no adapter can bypass existing
package, font, or render validation. The controller never owns routing,
authentication, content-editing controls, catalogues, publishing or product
navigation.

After confirmation, any host UI may preprocess values before sending them
through the existing descriptor-driven `setField`, `replaceImage`,
`setImageReplacementMode`, reset, and restore methods. SDK constraints remain
the final safety and fidelity authority.

PNG export keeps its existing download default. Hosts that pass the returned
PNG to an existing storage or publishing service use
`exportPng({ download: false })` to capture the same ready revision without
initiating a browser download.
