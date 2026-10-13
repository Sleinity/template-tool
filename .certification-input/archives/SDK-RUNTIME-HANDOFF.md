# SDK 1.0.0 runtime handoff

> Unpublished local candidate 1.0.0. Not published or certified by packing. Do not mix it with published archives carrying the same version.

Start with [V2 integration](SDK-V2-INTEGRATION.md), [installation](SDK-INSTALLATION.md), [ownership](SDK-HOST-LIFECYCLE.md) and [operation outcomes](SDK-OPERATION-OUTCOMES.md).

## Recommended V2 contract

Use runTemplatePackageImportPipelineV2, native single/Family sessions and TemplateFieldSessionRendererV2 through supported entries. Staged imports retain their candidate until font preparation and explicit acceptance finish. Export remains gated by native readiness.

The [delivered example](V2-EXAMPLE.md) includes its [host](FieldRulesV2Host.tsx) and [private lifecycle helper](fieldHostLifecycle.ts). No Studio or internal imports are needed.

| Package | Archive | SHA-256 | Bytes |
| --- | --- | --- | ---: |
| @sleinity/template-core | [sleinity-template-core-1.0.0.tgz](sleinity-template-core-1.0.0.tgz) | 363d07b79d12d73fdc87dfd6341271e9c7819c810a34287f82e86685c9258185 | 532285 |
| @sleinity/template-browser | [sleinity-template-browser-1.0.0.tgz](sleinity-template-browser-1.0.0.tgz) | e8f7fc18f5ca0872bd639d0235ddcff496a8d9c794650be35bbcd242eeb3d1e8 | 403000 |
| @sleinity/template-react | [sleinity-template-react-1.0.0.tgz](sleinity-template-react-1.0.0.tgz) | 677254fd3fc6af2f85be0b4097ff9d4033d0eb44e6578190577cb641ab93c16b | 289360 |

## Ownership and recovery

Core validates canonical values; Browser owns native mutation acceptance, resources, persistence and readiness; React renders and binds. Configuration Apply is distinct from Review/save persistence and output recovery autosave. See [field configuration](FIELD-RULES-STUDIO-AND-HOSTS.md), [recovery](TEMPLATE-RECOVERY.md) and [the 1.0 migration plan](SDK-1.0-MIGRATION.md).

## Focused and advanced entries

Use the [capability catalog](SDK-CAPABILITIES.md) and delivered entry/API inventories. Entries named renderer-internal or session-internal are unsupported repository seams; hosts must never import those internal entries. Studio remains a private source example, not a public UI contract.

## V1 compatibility API examples

The [wizard](TEMPLATE-IMPORT-WIZARD.md) and compatibility examples remain available. Their API contract is separate from the recommended V2 path; no selectable renderer mode is introduced. Published [0.8 migration](SDK-0.8-MIGRATION.md) is historical and does not describe current canonical migration policy.

## Delivery provenance

Sleinity-owned applications; policy sleinity-tools-only. [Source repository](https://github.com/Sleinity/template-tool). Mode: local; provenance: local-pack. No handoff generation command uploads, tags or publishes.
