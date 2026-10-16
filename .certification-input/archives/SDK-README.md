# Template SDK 2.0.0

Build a React/TypeScript template editor for a Sleinity-owned application. Start with the complete host starter; the SDK supplies canonical editing, resources, validation and rendering while your application supplies its UI and storage policy.

> Unpublished local candidate 2.0.0. Not published or certified by packing. Do not mix it with published archives carrying the same version.


| Identity | Current contract |
| --- | --- |
| SDK packages | Core, Browser and React, all 2.0.0 |
| Accepted ZIP exporter | Figma exporter 0.6.1 only |
| Raw source schema | 1.0 |
| Canonical package schema | 2.2 |
| Reference host | React 19, React DOM 19, TypeScript, modern browser |

## Start here

1. [Install and run the starter](SDK-QUICKSTART.md).
2. [Follow the complete host workflow](SDK-HOST-IMPLEMENTATION.md).
3. [Choose features and understand limits](SDK-FEATURES.md).
4. [Find the supported API for a task](SDK-API-GUIDE.md).
5. [Adapt Studio interaction patterns](STUDIO-REFERENCE.md).

## Implementation references

- [V2 integration and checked TypeScript examples](SDK-V2-INTEGRATION.md)
- [Session, candidate and resource ownership](SDK-HOST-LIFECYCLE.md)
- [Operation outcomes and retry](SDK-OPERATION-OUTCOMES.md)
- [Installation](SDK-INSTALLATION.md), [runtime compatibility](CONSUMER-COMPATIBILITY.md) and [troubleshooting](SDK-TROUBLESHOOTING.md)
- [Field configuration and Studio policies](FIELD-RULES-STUDIO-AND-HOSTS.md)
- [Capability and entry inventory](SDK-CAPABILITIES.md)
- [Agent implementation prompts](AGENT-INTEGRATION-PROMPTS.md)

## Release and history

[Release notes](SDK-2.0-RELEASE-NOTES.md), [breaking changes](SDK-2.0-MIGRATION.md), [release preparation](SDK-RELEASE-PREPARATION.md), [runtime handoff](SDK-RUNTIME-HANDOFF.md) and [historical index](SDK-HISTORY.md).

V1 editing/wizard/confirmation/persistence workflows are retired. Source normalization and versioned read-only evidence remain where required; names ending in V1 do not imply a supported V1 editing journey. Existing current V2 records and recovery are preserved. No migration or deletion of unknown historical work is provided.

Studio is an application reference, not an importable UI SDK. Internal entries and repository source imports are unsupported. Distribution remains UNLICENSED and authorized for Sleinity-owned applications only.
