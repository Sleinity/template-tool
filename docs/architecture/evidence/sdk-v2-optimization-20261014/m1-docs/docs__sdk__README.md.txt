# Template Platform SDK

Core owns portable parsing, validation and canonical materialization. Browser
owns native sessions, resources, persistence, recovery and readiness. React owns
rendering and bindings. Host applications own product UI, navigation and services.

Start with [V2 integration](V2_INTEGRATION.md), [installation](INSTALLATION.md),
[ownership](HOST_LIFECYCLE.md) and [operation outcomes](OPERATION_OUTCOMES.md).
Install all three packages from one verified delivery. Current unpublished source
archives form the unpublished 1.0.0 candidate; do not substitute historical published 0.8.0.
The next fixed-train release is [1.0.0, versioned candidate](SDK_1_0_MIGRATION.md).

## Recommended V2 integration

The [independent host](../../examples/template-editor-integration/README.md)
imports/stages, prepares exact fonts and opens explicitly, retaining accepted work
through failures and cancellation. Configure typed fields/Choices through public
SDK validators/controllers. See [field guidance](../field-rules/STUDIO_AND_HOSTS.md),
[Browser sessions](../field-rules/BROWSER_SESSION.md), [recovery](../architecture/template-recovery.md)
and [capabilities](SDK_CAPABILITIES.md).

## V1 compatibility API examples

The [wizard](TEMPLATE_IMPORT_WIZARD.md), [Family reference](../../examples/template-family-integration/README.md)
and compatibility editor remain supported API examples. They are separate from
V2 and do not select a renderer mode. Published [0.8 migration](SDK_0_8_MIGRATION.md),
[0.7 migration](SDK_0_7_MIGRATION.md) and the [older 0.2 handoff](SDK_0_2_TO_0_7_LOVABLE_HANDOFF.md)
remain historical; they do not promise current canonical migration-on-read.

## Delivery and host support

Read [release preparation](RELEASE_PREPARATION.md), [agent prompts](AGENT_INTEGRATION_PROMPTS.md),
[Studio source integration](STUDIO_REFERENCE.md), [runtime handoff](RUNTIME_HANDOFF.md),
[Core handoff](CORE_IMPORTER_HANDOFF.md), [compatibility](CONSUMER_COMPATIBILITY.md)
and [troubleshooting](TROUBLESHOOTING.md). The machine contracts are
[entry points](../../config/sdk-entry-points.json) and [public API](../../config/sdk-public-api.json).
No handoff-generation command publishes or uploads. Runtime distribution remains
UNLICENSED and authorized for Sleinity-owned applications.
