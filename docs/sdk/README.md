# Template SDK 2.0.0

Build a React/TypeScript template editor for a Sleinity-owned application. Start with the complete host starter; the SDK supplies canonical editing, resources, validation and rendering while your application supplies its UI and storage policy.

<!-- delivery-context:start -->
This describes the **SDK 2.0.0 contract**. A version label, packing or local certification does not establish publication. Verify delivery provenance and use one verified archive set.
<!-- delivery-context:end -->

| Identity | Current contract |
| --- | --- |
| SDK packages | Core, Browser and React, all 2.0.0 |
| Accepted ZIP exporter | Figma exporter 0.6.1 only |
| Raw source schema | 1.0 |
| Canonical package schema | 2.2 |
| Reference host | React 19, React DOM 19, TypeScript, modern browser |

## Start here

1. [Install and run the starter](QUICKSTART.md).
2. [Follow the complete host workflow](HOST_IMPLEMENTATION.md).
3. [Choose features and understand limits](FEATURES.md).
4. [Find the supported API for a task](API_GUIDE.md).
5. [Adapt Studio interaction patterns](STUDIO_REFERENCE.md).

## Implementation references

- [V2 integration and checked TypeScript examples](V2_INTEGRATION.md)
- [Session, candidate and resource ownership](HOST_LIFECYCLE.md)
- [Operation outcomes and retry](OPERATION_OUTCOMES.md)
- [Installation](INSTALLATION.md), [runtime compatibility](CONSUMER_COMPATIBILITY.md) and [troubleshooting](TROUBLESHOOTING.md)
- [Field configuration and Studio policies](../field-rules/STUDIO_AND_HOSTS.md)
- [Capability and entry inventory](SDK_CAPABILITIES.md)
- [Agent implementation prompts](AGENT_INTEGRATION_PROMPTS.md)

## Release and history

[Prepared 2.0.1 bugfix notes](SDK_2_0_1_RELEASE_NOTES.md) describe the next patch Changeset.

[Release notes](SDK_2_0_RELEASE_NOTES.md), [breaking changes](SDK_2_0_MIGRATION.md), [release preparation](RELEASE_PREPARATION.md), [runtime handoff](RUNTIME_HANDOFF.md) and [historical index](HISTORY.md).

V1 editing/wizard/confirmation/persistence workflows are retired. Source normalization and versioned read-only evidence remain where required; names ending in V1 do not imply a supported V1 editing journey. Existing current V2 records and recovery are preserved. No migration or deletion of unknown historical work is provided.

Studio is an application reference, not an importable UI SDK. Internal entries and repository source imports are unsupported. Distribution remains UNLICENSED and authorized for Sleinity-owned applications only.
