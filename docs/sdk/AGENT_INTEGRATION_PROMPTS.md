# Agent prompts for SDK 2.0.1 V2 hosts

Read [host onboarding](QUICKSTART.md), [host implementation](HOST_IMPLEMENTATION.md), [V2 integration](V2_INTEGRATION.md), [capabilities](SDK_CAPABILITIES.md) and
[lifecycle](HOST_LIFECYCLE.md) first. Published archives use version
2.0.1. Keep unpublished local candidates explicitly labeled. Identify source and
archive hashes before changing a host. Give one track at a time.

## 1. Audit the host

```text
Audit without editing. Identify package manager/lockfile, React 19 compatibility,
StrictMode, browser/CSP targets, navigation, upload/forms and storage/delivery.
Choose core-only ZIP import and validation, headless Browser V2 import/session,
or React V2 bindings. Use a Family only when designs share canonical content.
Report host/SDK ownership and supported package imports. No Studio, repository
source, package src/, renderer-internal or session-internal imports.
```

## 2. Install one verified delivery

```text
Verify LOCAL-CANDIDATE-MANIFEST.json and SHA256SUMS against all supplied archives.
Install only those archives through the existing package manager. Pin the full
private dependency closure; pnpm needs exact overrides. Do not mix same-version
published packages, source aliases or private registry credentials. Run normal
host typecheck/build and report installed identities and conflicts.
```

## 3. Import and hand off

```text
Require raw source schema 1.0 and exporter 0.6.1. V1 editing/wizard/confirmation/persistence are retired; do not add fallbacks or migrations.
Use runTemplatePackageImportPipelineV2 from Browser /importer with a caller-owned
sourceId. Accept only ready; show separate importEvidence, parseResult and failure
stage/cause when rejected. Reuse preview/package evidence. Retain candidates
through review/authoring, and dispose after session ownership transfers or work
is abandoned. Failed batches accept nothing and release successful late results.
Do not add a second importer, normalization path or authoring defaults to parsing.
```

## 4. Configure single and Family sources

```text
Use existing Browser /importer appendTemplateSourcesV2 and mutateTemplateFamilyV2
transactions and native configure operations. Preserve source IDs, accepted common
settings, ordering, sparse overrides and complete source packages. Use current
selector configuration/resolution; never infer assignments from names. Retain
review-first reimport and unsaved-input guards. Swap/dispose accepted sessions
only after candidate validation and resource handoff succeed.
```

## 5. Edit and render

```text
Use native createTemplateSessionV2/createTemplateFieldFamilySessionV2 or their
React owning hooks. Render with TemplateFieldSessionRendererV2 from React /editor;
read snapshots and typed controllers through the supported hooks. Build controls
with existing host forms. Preserve all seven types, Choice identity, exact ZIP
Color defaults/Reset, Boolean participation and Image replacement policy/Crop.
Family switching retains absent-field values and shared assets. Dispose only
host-owned sessions; renderer subscriptions borrow them. Test StrictMode replay,
remount/replacement and stale evidence.
```

## 6. Exact fonts and PNG

```text
Prepare managed fonts with Browser /fonts. Verify semantic family/style/weight
and exact binary/private face identity; system CSS availability is insufficient.
Let the renderer publish current font/line/media evidence. Enable PNG only from
current readiness and call renderer exportPng({ download: false }). Preserve
pending/stale rejection; never submit fabricated line counts or use fixed sleeps.
The host owns downloaded output and publishing, not renderer readiness.
```

## 7. Recovery and generic persistence

```text
Use Browser /persistence recovery, one slot per template kind/ID. Inspect before
opening; host UI offers Continue, Start from scratch or Cancel. Begin fresh/resume
returns an ownership lease. Save accepted changes with canonical record capture;
resume the retained independent template/content/assets through native restore.
Keep generic template/session save/load separate from recovery, without a draft
catalogue. Guard navigation and flush valid pending input; retain invalid input.

Before export stop edits/navigation/autosave, flush, persist accepted state, then
export through exportAndComplete. Export rejection retains recovery. Cleanup
failure after successful export must be retried with complete(lease), without
exporting again or restarting autosave. Stale tokens cannot overwrite/delete
newer work. Keep host scheduling policies outside the SDK.
```

## 8. Verify

```text
Run installed-archive typechecks/builds and host tests. Cover valid/blocked ZIPs,
source evidence, single/Family selection, seven field types, configuration,
Reset/save/reload, exact fonts, replacement/Crop, recovery races and export failure/
cleanup retry. Verify resource final owners and silent PNG/current readiness.
Report automated and manual browser results separately. List prerequisites and
unverified scenarios; do not claim published provenance for a local candidate.
```

## Release boundary

Only V2 host workflows are supported. The V1 wizard, confirmation, session/editor and persistence APIs are retired. Keep source-schema 1.0 normalization and read-only renderer evidence; names ending in V1 are not a retirement rule. The published [0.8 migration](SDK_0_8_MIGRATION.md) is historical. No V1 migration or deletion of stored bytes is part of this release.
