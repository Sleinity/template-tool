# Implement a host with the existing SDK

Start from [the complete starter](QUICKSTART.md). It is private example composition, not a new SDK abstraction. Keep single and Family sessions native and customize application controls without replacing validation or rendering authorities.

## Data flow

ZIP → inspectable import candidate → exact font preparation → native session acceptance → typed editing/current renderer evidence → saved template or recovery payload → guarded PNG → recovery completion.

Core owns canonical semantics; Browser owns operations/resources; React supplies the mounted renderer and subscriptions. Hosts own navigation, local input drafts, catalogue/storage policy and output delivery.

## Import and fonts

Use `runTemplatePackageImportPipelineV2` through Browser `/importer`. Accept only ready. A multi-source batch accepts nothing until every source and required font is valid; cancelled, failed and late candidates release their owners. Keep the accepted editor mounted while a replacement is prepared. The source reader already enforces exporter admission; do not unzip twice or infer support from filenames.

Use one stable managed font registry throughout upload, linking, rendering and PNG. Omitted/undefined selects the default; explicit null permits package-provided font sources without registry lookup. Keep raw font identity distinct from human family names. Do not silently replace exact requirements. The existing staged single-source lifecycle helper demonstrates cancellation and font-only patch authority; the complete starter composes those prepared sources for Families.

## Editing and custom controls

Use the session's typed controllers and the ordinary React V2 renderer. Display rejected mutation findings and current line-validation state. A host may retain incomplete form input, but must flush or correct it before Save/export. Do not coerce empty Number/Date drafts into canonical values or drop invalid input silently. Preserve imported defaults, Choice identity and independent image-placement authority. The starter blocks visibility changes while a local draft is incomplete, so hiding a child cannot discard its input. This is host policy.

Family switching changes selection, not shared values. Honor configured control order. Full field/selector authoring and review-first reimport are documented in [field guidance](../field-rules/STUDIO_AND_HOSTS.md); the starter intentionally provides editing rather than a replacement Studio authoring UI.

## Saved templates and recovery

The starter's saved list uses the public single and Family repositories. Save persists a canonical snapshot and assets; reopen uses native `loadSaved` and verifies its operation-specific result. A missing record, failed read and incompatible canonical record are different outcomes. Never delete historical work automatically.

An output uses `recovery.begin({kind, templateId}, 'fresh' | 'resume')`. Bind that lease to a private example repository adapter: native save supplies the canonical payload and resource pins, while the adapter writes through `recovery.save(lease, payload)`. Restore assets through recovery's existing resolver, with saved-template storage as fallback. Do not persist resolved trees or invent a second content store.

The example enables recovery after the first explicit Save creates a saved template ID; unsaved imports require confirmation before replacement. Adapters are supplied once for the host lifetime.

The example autosaves accepted content after 650 ms and flushes before changing work or exporting. This is host policy. Save errors retain dirty work and offer explicit Retry. A newer recovery lease supersedes older tabs; stale operations must never recreate completed work. Fresh/Resume/Discard are explicit decisions.

## Export and cleanup

Flush valid input and pending saves, wait for current session readiness and call the mounted renderer handle's `exportPng`. Keep its font/asset/revision/raster checks; never replace them with a fixed delay. Use `recovery.exportAndComplete` for an active recovery output. If output succeeds but cleanup fails, retain the output and show cleanup-only Retry; do not export twice.

## Ownership and host adaptation

Only dispose sessions you own, after renderer/subscription cleanup. Construction/render must not allocate candidate resources. StrictMode replay must not dispose a live editor. Registries and injected repositories remain borrowed. Guard late reads, uploads, saves and feedback against replacement/disposal.

See [lifecycle](HOST_LIFECYCLE.md), [operation outcomes](OPERATION_OUTCOMES.md), [compatibility](CONSUMER_COMPATIBILITY.md) and [Studio references](STUDIO_REFERENCE.md). Test the delivered starter in the actual host's CSP, browser, storage and navigation environment before shipping.
