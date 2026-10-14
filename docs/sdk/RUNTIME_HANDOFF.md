# Runtime integration contract

[V2 integration](V2_INTEGRATION.md) is the recommended current source contract.
Use one verified fixed-train delivery, identified by actual archive hashes and
provenance. Published 0.8 migration material is historical. The current stable train is
[SDK 1.0.0](https://github.com/Sleinity/template-tool/releases/tag/sdk-v1.0.0);
read the [migration guide](SDK_1_0_MIGRATION.md) before reopening older canonical data.

## Recommended host journey

Import once through `runTemplatePackageImportPipelineV2`; stage in a fresh native
session; prepare exact fonts with the same borrowed authority; explicitly accept;
edit through typed controllers; export only with current native renderer evidence.
The [example](../../examples/template-editor-integration/README.md) keeps accepted
work usable during replacement and cleans late/cancelled candidates.

Use [ownership](HOST_LIFECYCLE.md), [operation outcomes](OPERATION_OUTCOMES.md),
[field configuration](../field-rules/STUDIO_AND_HOSTS.md) and
[recovery](../architecture/template-recovery.md). Apply, persisted Review/save,
output recovery autosave and PNG readiness are different responsibilities.

## Focused and advanced entries

The [capability catalog](SDK_CAPABILITIES.md) records public roots and curated
entries, including optional `@sleinity/template-react/inspection`. Entries named
`renderer-internal` or `session-internal` are repository seams;
**they are not supported host APIs**. Studio components are private examples,
not public UI contracts. Inspection is not a rendering backend selector.

## V1 compatibility API examples

The [import wizard](TEMPLATE_IMPORT_WIZARD.md), confirmed-state hydration and V1
session/editor examples remain available. Use the explicit compatibility route in
the reference example. Preserve their existing contract; do not promote legacy
working nodes into V2 canonical content or promise automatic saved-record migration.
Historical migration instructions are in [the published 0.8 guide](SDK_0_8_MIGRATION.md).

Generated handoffs use one inventory and verify links/anchors in their emitted
directory. Archive verification always compiles the current V2 guide and exercises
exact single/Family contracts, including when no local-candidate manifest exists.


## Stable baseline and future work

The runtime reference is immutable `sdk-v1.0.0` at
`33bd70dbca1f02cdd6c80a83dc1ba4666d2ed348`. Source development uses reviewed
post-handoff main; later tooling/documentation commits do not change that runtime
identity. Registry installation requires `read:packages` and package access;
verified public release archives need no registry credential. Keep adapter
lifetimes caller-owned and use supported packed entries only.

Configuration changes follow local draft → Apply → Save in Review. Output
recovery autosave retains the existing 650 ms schedule, manual Retry and
cleanup-only Retry after successful export. Persistence state and current PNG
readiness are separate; a saved record can still require input correction.
