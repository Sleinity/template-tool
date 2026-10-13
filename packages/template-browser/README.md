# `@sleinity/template-browser`

The current workspace is an unpublished source candidate. Prefer the
[V2 integration guide](../../docs/sdk/V2_INTEGRATION.md); distinguish its archive
hashes from published 0.8.0 artifacts despite the unchanged package version.

V2 single/Family sessions expose atomic `configure()` transactions for portable
metadata, rules and editor ordering. These retain canonical content/assets and
use Core validation/reconciliation; ordinary editing still uses typed field
controllers. See [Studio and external hosts](../../docs/field-rules/STUDIO_AND_HOSTS.md).

Private browser runtime for TemplatePackage assets, managed fonts, measurement,
persistence, revision-bound readiness, and PNG export. Consumers may replace
the default storage registries through the existing adapter interfaces.

V2 Template and Family sessions accept renderer-backed Textarea line evidence
only for the current content, materialization, settlement, font, and monotonic
publisher generation. Active pending/invalid `maxLines` blocks export;
structurally excluded fields are inactive and line evidence is never persisted.

Install the fixed 0.8.0 train through the repository's
[installation guide](../../docs/sdk/INSTALLATION.md). Use the
[agent integration prompts](../../docs/sdk/AGENT_INTEGRATION_PROMPTS.md) for a
custom headless host, and use the
[SDK capability catalog](../../docs/sdk/SDK_CAPABILITIES.md) to choose between
the high-level workflow/session entries and focused browser adapters.

As of 0.4.1 this package physically owns that complete browser runtime. Its
production modules depend on `@sleinity/template-core` and package-local
contracts; they do not compile implementation from the repository root,
Template Studio, React, or renderer JSX. Retained root paths are temporary
behavior-free compatibility forwarders for Studio and fidelity tooling.

Rendered text-line and visual-fit collection remain browser-owned. They project
DOM measurements into the portable field-fit model without moving DOM, CSS, or
font availability checks into `template-core`.

## Consumer session

Field Rules V2 hosts use `createTemplateSessionV2()` from the session entry.
It normalizes V1/native V2 source into one configured `TemplatePackageV2`, owns
one `TemplateFieldContentStateV1`, and exposes ordered discriminated controllers
for all seven field types. Controllers nested below a false Boolean visibility
target are omitted until that Boolean is enabled; their canonical values and
portable order remain intact. Accepted commands use the Core reducer and trigger
one one-way materialization; `workingPackage` and the existing-renderer
compatibility projection are derived and never persisted as value authority.

V2 persistence uses explicit `saved-template-session-v3` records containing
the configured package, canonical content, and managed asset references.
`planTemplateReimportV2()` uses stable field IDs and binding kinds, and
`createTemplateFieldFamilySessionV2()` applies common configuration plus atomic
variant configuration overrides while keeping one shared Family content state.
Family content V3 adds sparse placement-only Image overrides: the asset remains
shared, `setPlacement()` edits the shared default, and
`setVariantPlacement()`/`resetVariantPlacement()` provide format-specific
framing. Replacing or resetting the shared asset clears every variant crop. See the
[V2 Browser contract](../../docs/field-rules/BROWSER_SESSION.md).

Image uploads follow the field's singular TemplatePackage 2.2 policy. Fill and
Fit resolve automatically; Crop accepts host-authored canonical crop data and
otherwise uses Fill. Older saved envelopes remain listable through the
incompatible-work repository APIs for `Reimport required` presentation and
ownership-safe deletion.

New hosts should import from the curated entry points:

- `@sleinity/template-browser/session`
- `@sleinity/template-browser/importer`
- `@sleinity/template-browser/compatibility`
- `@sleinity/template-browser/assets`
- `@sleinity/template-browser/fonts`
- `@sleinity/template-browser/persistence`
- `@sleinity/template-browser/capture`
- `@sleinity/template-browser/enrichment`

The broad package root remains supported for existing integrations.

### Canonical V2 ZIP import

Use `runTemplatePackageImportPipelineV2` from `@sleinity/template-browser/importer`
to import a ZIP once and obtain its canonical V2 package. Supply `format: "zip"`,
`buffer`, `sourceName` and a host-owned `sourceId`; existing asset-storage,
managed-font-registry and optional enrichment inputs remain available.

```ts
import { runTemplatePackageImportPipelineV2 } from "@sleinity/template-browser/importer";

const imported = await runTemplatePackageImportPipelineV2({
  format: "zip", buffer, sourceName: "design.zip", sourceId: "design-1",
});
try {
  if (imported.status === "ready" && imported.package) {
    session.load(imported.package); // Session keeps its own managed URL leases.
  } else {
    // Inspect importEvidence and parseResult separately; never accept blocked data.
    // failure retains the original exception and its import/normalization stage.
  }
} finally {
  imported.dispose();
}
```

Keep the import alive if later authoring transactions still reuse its source
package. `dispose()` is idempotent; it releases only import ownership, never a
caller-provided store. Evidence is borrowed and must not be mutated. A released
result remains inspectable, but temporary URLs need another live owner.
Invalid source IDs reject the call; pipeline exceptions are returned as `error`
outcomes. `ready` means import acceptance, not font, renderer or PNG readiness.
The operation is additive and importer-only; the internal compiler contract and
Family composition are not public SDK interfaces.

Template Families continue through these same entries. The `importer` entry exports
`createTemplateFamilyImportWizard()` plus confirmation and
reviewable reimport contracts. The `session` entry exports
`createTemplateFamilySession()`, which owns one shared content state and
composes one existing render session. The `persistence` entry retains generic
Family repositories, internal historical record handling and lazy one-variant projections of legacy
0.7 records. Independent selection properties resolve their combined option
values to one concrete variant. Unavailable combinations are reported without
silently changing another property, and unchanged per-variant renderer evidence
is retained when only property labels or assignments change.

The five functional entries above expose the existing browser adapters and
services without requiring consumers to depend on the broad root. Enrichment
remains host-injected and optional; import, validation, fonts, rendering, and
capture still perform no SDK-owned external request.

`createTemplateSession()` remains the V1 Studio compatibility contract. It owns a
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
sequences use the established device emoji fallback as internal, non-blocking
evidence rather than setup guidance. Ordinary text-style symbols and all other
characters remain strict. An exact face already stored in the managed registry is reused
automatically. Candidate/link/fallback methods remain lower-level compatibility
APIs for existing packages; the setup wizard does not present them as choices.
`snapshot.fontPreparation` records pending, ready, warning, or blocked
activation for the current package revision. Preparation uses the session's
injected managed-font registry and the active browser `FontFaceSet`; render
readiness cannot accept a fallback face while a current exact managed face is
still pending or failed.

Blocked ZIP imports publish ordered structured diagnostics through
`snapshot.diagnostics`, including source layer/origin evidence in each
diagnostic's details. Consumers do not need to run a second core import
preflight before `session.loadZip()`.

## Import workflow controller

`createTemplateImportWizard()` is the headless, host-neutral seven-step import
workflow. It owns one session by default, or accepts an injected session that it
never disposes. Its immutable snapshots expose structured import, exact-font,
current-revision render, and field-validation reports plus sanitized rules and explicit
step readiness. Every attempted import, including a corrupt ZIP, produces
`importValidation` and a non-null compatibility validation result.

In SDK 0.6, Field Rules configure every field's host-facing order plus only the
constraints that change input behavior: maximum characters, textarea lines,
and image format/size/dimensions/aspect/placement policy. Imported labels,
types, targets and defaults remain read-only; number, date, colour and boolean
descriptors need no rule panel. Invalid field-rule drafts stay in the wizard snapshot with stable
per-field blockers while the last valid package remains active. Only a valid
rule update advances the session revision and makes render validation stale.
Compatibility inspection reconstructs field-validation evidence when reopening
confirmations produced before the report existed and ignores legacy
enabled/help-text setup metadata.

Render validation follows the established routing authority. Routed templates
require a current stable core settlement; zero-routed compatibility templates
may become ready through their existing package, font, asset, DOM, revision,
and export-safety gates. Every blocked render report contains an actionable
machine-readable issue.

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

`TemplateFamilySessionV1` materializes only the selected variant. Shared image
bytes are stored once and projected into variant-local asset references, even
when imported variants use different local asset IDs.
Content, selection, import and reimport operations are revision-bound; stale
work cannot replace newer state. Family save/dispose/offline reopening use the
same injectable browser services as a normal session. Existing
`TemplateSessionV1` and repository APIs do not flatten multi-variant families.

### V2 source authoring and temporary imports

The `importer` entry point exposes `appendTemplateSourcesV2`,
`mutateTemplateFamilyV2`, and `createTemplateFieldFamilyFromSourcesV2` for the
same source/configuration assembly used by Studio. Studio-specific text defaults
and reviewed replacement choices remain host policies. Existing V1 wizards remain
supported; these operations do not replace their contracts.

A `buildZipPackageImportResult` result owns its default store's temporary URLs.
Call its optional `dispose()` on cancellation, or after loading the package into
a V2 session (which retains its own lease). A custom asset adapter is borrowed and
remains host-owned. V2 saves retain resources while their serialized repository
writes are pending. See [SDK hardening contracts](../../docs/sdk-hardening/README.md)
for ordering, lifetime, compatibility, and measurement details.

### Template-scoped recovery

Use `getTemplateRecoveryRepository()` from `@sleinity/template-browser/persistence` for unfinished output. Inspect by `{ kind: "single" | "family", templateId }`, prompt before replacement, and keep the lease returned by `begin(key, "fresh" | "resume")`. Save existing canonical record envelopes only after local input is accepted. `exportAndComplete(lease, exportCallback)` clears recovery only after successful export; a cleanup error can be retried with `complete(lease)` without another export.

The supported repository and Family-session facades no longer expose draft catalogues or arbitrary draft CRUD. Generic template/session snapshots remain supported. Legacy stored data is retained internally. See [the recovery contract and migration notes](../../docs/architecture/template-recovery.md) and the public-only executable host in `scripts/repository/verify-v2-import-host.mjs`.

`@sleinity/template-browser/session-internal` is an unsupported fixed-version seam for the React snapshot bridge. Host applications must not import it; use `/session`. It borrows sessions without owning disposal or resources.
