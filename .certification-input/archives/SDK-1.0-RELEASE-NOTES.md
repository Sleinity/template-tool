# SDK 1.0.0 candidate release notes

Core, Browser and React form one **unpublished 1.0.0 candidate**. Certification
and publication are separate; no registry release is claimed by these notes.

## Breaking changes

- Canonical packages/content use schema **2.2**. Incompatible canonical 2.0/2.1
  packages and saved envelopes require reimport from the original ZIP; there is
  no automatic migration-on-read. Exporter source normalization remains separate.
- Image fields configure one `replacementPlacement` policy: Fill, Fit or Crop.
  Imported source placement is preserved; Reset restores imported authority.
- Draft catalogue APIs and Family `saveDraft` are removed. Use template-scoped
  output recovery; generic template/session persistence remains available.

## Integration fixes

- Supplied font registries remain authoritative through V2 rendering and PNG
  export. Omitted uses the default; null uses embedded authority. Registries are
  borrowed, and stale registry/session work cannot publish accepted evidence.
- Blocked IndexedDB operations reject with `TemplateStorageBlockedError` and
  permit manual Retry after the blocking connection closes. Native operation
  outcomes remain distinct; cleanup-only recovery Retry never exports twice.
- The recommended V2 host retains import candidates through preparation and
  acceptance. Failed replacement preserves accepted work; superseded callbacks
  cannot overwrite current feedback, and final resource owners release URLs.
- Local and publication handoffs share a verified document/example inventory.
  V2 guide/host compilation and exact single/Family acceptance are unconditional.

## Compatibility and responsibilities

V1 compatibility APIs/examples remain supported and explicitly labeled. Hosts
own their repository, asset-store and font-registry adapters and session disposal.
Studio configuration Apply/Save in Review is separate from output recovery
autosave. See [migration](SDK-1.0-MIGRATION.md), [V2 integration](SDK-V2-INTEGRATION.md),
[ownership](SDK-HOST-LIFECYCLE.md) and [operation outcomes](SDK-OPERATION-OUTCOMES.md).
