# SDK 2.0.0 runtime handoff

> Unpublished local candidate 2.0.0. Not published or certified by packing. Do not mix it with published archives carrying the same version.

Start with [V2 integration](SDK-V2-INTEGRATION.md), [installation](SDK-INSTALLATION.md), [ownership](SDK-HOST-LIFECYCLE.md) and [operation outcomes](SDK-OPERATION-OUTCOMES.md).

## Recommended V2 contract

Use runTemplatePackageImportPipelineV2, native single/Family sessions and TemplateFieldSessionRendererV2 through supported entries. Staged imports retain their candidate until font preparation and explicit acceptance finish. Export remains gated by native readiness.

Start with [onboarding](SDK-QUICKSTART.md) and the complete [starter archive](SDK-HOST-STARTER.zip). It includes native single/Family editing, saved templates, recovery and guarded PNG. [Implementation](SDK-HOST-IMPLEMENTATION.md) and [features](SDK-FEATURES.md) explain ownership and limits. No Studio or internal imports are needed.

| Package | Archive | SHA-256 | Bytes |
| --- | --- | --- | ---: |
| @sleinity/template-core | [sleinity-template-core-2.0.0.tgz](sleinity-template-core-2.0.0.tgz) | 386ec69f20fc7f3268e4b6fa163f5360120a59c63896cb70a1e1f33e5635160d | 486840 |
| @sleinity/template-browser | [sleinity-template-browser-2.0.0.tgz](sleinity-template-browser-2.0.0.tgz) | f9eca522da3ea7754fb5535ecbd45919bef88737ec3897ac840cdeb1a55c4690 | 277173 |
| @sleinity/template-react | [sleinity-template-react-2.0.0.tgz](sleinity-template-react-2.0.0.tgz) | 97f991820bfeade38d86df02cfef2b4df044448eafc70cb70295c026da4e3051 | 212780 |

## Ownership and recovery

Core validates canonical values; Browser owns native mutation acceptance, resources, persistence and readiness; React renders and binds. Configuration Apply is distinct from Review/save persistence and output recovery autosave. See [field configuration](FIELD-RULES-STUDIO-AND-HOSTS.md), [recovery](TEMPLATE-RECOVERY.md) and [the 2.0 migration plan](SDK-2.0-MIGRATION.md).

## Focused and advanced entries

Use the [capability catalog](SDK-CAPABILITIES.md) and delivered entry/API inventories. Entries named renderer-internal or session-internal are unsupported repository seams; hosts must never import those internal entries. Studio remains a private source example, not a public UI contract.

## Retired workflows

V1 wizard, confirmation, session/editor and persistence workflows are retired. ZIP admission requires raw schema 1.0 and exporter 0.6.1; canonical schema remains 2.2. The examples use V2. Unknown historical stored bytes remain untouched. Published [0.8 migration](SDK-0.8-MIGRATION.md) is historical and does not describe current canonical migration policy.

## Delivery provenance

Sleinity-owned applications; policy sleinity-tools-only. [Source repository](https://github.com/Sleinity/template-tool). Mode: local; provenance: local-pack. No handoff generation command uploads, tags or publishes.
