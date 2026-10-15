# Post-release Studio redesign handoff

Begin after the SDK 2.0.0 release. This is an investigation backlog, not a promise of new SDK exports.

| Area | Current coupling to inspect | Desired evidence before extraction |
| --- | --- | --- |
| Typed field controls | Draft coordinator, input limits, formatting, validation and placement adapters | Accessible control contracts across seven types, invalid/incomplete input, IME, Choices and correction flows |
| Configuration/Choices | Studio forms, Family context and Apply/Discard state | Clear common/inherited/overridden/default states and atomic acceptance |
| Import/fonts | Candidate lifetime, per-source uploads and correction navigation | A coherent single/Family preparation flow preserving exact identity and accepted work |
| Editor/preview | Route state, responsive view switching, highlights and camera | Strong authoring/output journeys with one renderer and no lost drafts |
| Save/recovery/export | Studio record annotations, autosave, leases and cleanup Retry | Separate product decisions from reusable lifecycle behavior; no duplicate persistence authority |
| Diagnostics | SDK evidence versus Studio language/navigation | Actionable user issues with technical disclosure, accessibility and no repeated root causes |

Use Bas's independent host feedback to identify actual reuse needs. First design and validate improved Studio UX, then propose bounded components with ownership, accessibility, customization, API stability and tests. Preserve native sessions, resource/font authority and revision-safe PNG. Do not extract the current layout wholesale or introduce new component APIs during release preparation.

See [the pinned Studio reuse catalogue](STUDIO_REFERENCE.md).
