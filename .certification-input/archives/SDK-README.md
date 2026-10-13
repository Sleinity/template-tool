# Template Platform SDK

Core owns portable parsing, validation and canonical materialization. Browser
owns native sessions, resources, persistence, recovery and readiness. React owns
rendering and bindings. Host applications own product UI, navigation and services.

Start with [V2 integration](SDK-V2-INTEGRATION.md), [installation](SDK-INSTALLATION.md),
[ownership](SDK-HOST-LIFECYCLE.md) and [operation outcomes](SDK-OPERATION-OUTCOMES.md).
Install all three packages from one verified delivery. Current unpublished source
archives form the unpublished 1.0.0 candidate; do not substitute historical published 0.8.0.
The next fixed-train release is [1.0.0, versioned candidate](SDK-1.0-MIGRATION.md).

## Recommended V2 integration

The [independent host](V2-EXAMPLE.md)
imports/stages, prepares exact fonts and opens explicitly, retaining accepted work
through failures and cancellation. Configure typed fields/Choices through public
SDK validators/controllers. See [field guidance](FIELD-RULES-STUDIO-AND-HOSTS.md),
[Browser sessions](FIELD-RULES-BROWSER-SESSION.md), [recovery](TEMPLATE-RECOVERY.md)
and [capabilities](SDK-CAPABILITIES.md).

## V1 compatibility API examples

The [wizard](TEMPLATE-IMPORT-WIZARD.md), [Family reference](FAMILY-EXAMPLE-COMPATIBILITY.md)
and compatibility editor remain supported API examples. They are separate from
V2 and do not select a renderer mode. Published [0.8 migration](SDK-0.8-MIGRATION.md),
[0.7 migration](SDK-0.7-MIGRATION.md) and the [older 0.2 handoff](SDK-0.2-TO-0.7-HISTORICAL.md)
remain historical; they do not promise current canonical migration-on-read.

## Delivery and host support

Read [release preparation](SDK-RELEASE-PREPARATION.md), [agent prompts](AGENT-INTEGRATION-PROMPTS.md),
[Studio source integration](STUDIO-REFERENCE.md), [runtime handoff](SDK-RUNTIME-HANDOFF.md),
[Core handoff](SDK-CORE-HANDOFF.md), [compatibility](CONSUMER-COMPATIBILITY.md)
and [troubleshooting](SDK-TROUBLESHOOTING.md). The machine contracts are
[entry points](sdk-entry-points.json) and [public API](sdk-public-api.json).
No handoff-generation command publishes or uploads. Runtime distribution remains
UNLICENSED and authorized for Sleinity-owned applications.
