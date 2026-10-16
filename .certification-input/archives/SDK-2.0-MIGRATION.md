# Migrating from SDK 1.0.0 to 2.0.0

> Unpublished local candidate 2.0.0. Not published or certified by packing. Do not mix it with published archives carrying the same version.

The [published 1.0.0 release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v1.0.0)
and its artifacts remain immutable. Do not mix packages from these releases.

## Breaking changes

| Published 1.0.0 contract | 2.0.0 contract | Host action |
| --- | --- | --- |
| V1 single/Family sessions, editor, wizard, confirmation and persistence workflows | Native V2 host workflows only | Integrate the existing V2 sessions/controllers using [the implementation guide](SDK-HOST-IMPLEMENTATION.md) |
| React importer entry and importer stylesheet | No supported React V1 importer or wizard styles | Use the copyable [starter](SDK-QUICKSTART.md); own controls, layout and styles |
| Broader exporter admission at the source boundary | Raw source schema 1.0 and `source.pluginVersion === "0.6.1"` required | Obtain exporter 0.6.1 ZIPs; handle blocked outcomes before acceptance |

Other or missing exporter versions return `blocked` with
`SOURCE_EXPORTER_VERSION_UNSUPPORTED`. Raw evidence is retained. Admission occurs
before asset persistence or font linking, and applies to replacement, reimport
and Family batches. Failed replacement preserves the accepted editor.

## Preserved contracts

Canonical schema remains **2.2**. Current V2 records, assets, fonts and recovery
tokens remain supported. There is no V1 restore/migration workflow; unknown
historical records remain untouched outside the supported catalogue. Handling
incompatible canonical V2 records remains separate from retiring V1 workflows.

Exporter source schema **1.0** normalization and the private V1-shaped renderer
bridge remain necessary for current exports. Read-only versioned evidence is not
a V1 editing API. Do not remove types solely because their names end in `V1`.

Schema 2.2, `replacementPlacement` and removal of the old draft catalogue were
already part of SDK 1.0.0; they are not additional 2.0.0 changes. See the
[historical 1.0 migration](SDK-1.0-MIGRATION.md).

## Integration and ownership

Start at [onboarding](SDK-QUICKSTART.md), then follow [V2 integration](SDK-V2-INTEGRATION.md),
[ownership](SDK-HOST-LIFECYCLE.md), [operation outcomes](SDK-OPERATION-OUTCOMES.md) and
[template recovery](TEMPLATE-RECOVERY.md). Keep single and Family
sessions native. Retain staged candidates through exact-font preparation and
acceptance. Borrow host adapters and dispose owned sessions/resources.

No universal session, new styled SDK framework, new renderer or new schema is
introduced. Publication and tagging require separate approval and archive-bound
certification; a version label or successful pack is insufficient.
