# Recommended V2 host example

> Unpublished local candidate 1.0.0. Not published or certified by packing. Do not mix it with published archives carrying the same version.

Copy [FieldRulesV2Host.tsx](FieldRulesV2Host.tsx) and [fieldHostLifecycle.ts](fieldHostLifecycle.ts) into a React 19 host installed from these archives. The helper is private example code, not an SDK API. It imports only supported entries; ordinary renders acquire no import resources.

Select ZIP or V2 JSON, upload exact fonts, then choose Open template. The accepted editor stays available during replacements. Cancelled/failed imports and obsolete callbacks preserve accepted work. All seven typed controls, Choices, custom overrides, Reset and native PNG readiness are retained.

An optional stable fontRegistry is borrowed: omitted/undefined uses default IndexedDB, null uses embedded authority. Import candidates retain ownership through preparation and handoff; old sessions end after editor cleanup.

See [ownership](SDK-HOST-LIFECYCLE.md), [operation outcomes](SDK-OPERATION-OUTCOMES.md) and [V2 integration](SDK-V2-INTEGRATION.md). Hosts own navigation, styling and product persistence decisions. No Family authoring, autosave or recovery UI is added by these two files.
