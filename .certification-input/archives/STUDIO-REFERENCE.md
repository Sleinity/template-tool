# Adapting the Studio source example

Studio is a private application, not a supported SDK UI package. Hosts can copy
its interaction patterns and supply their own catalogue, routing, storage and
branding. [V2 integration](SDK-V2-INTEGRATION.md) documents supported entry points.
Do not import Studio, `session-internal`, `renderer-internal` or architectural
experiments into a host integration.

| Responsibility | Authority / integration seam |
| --- | --- |
| ZIP import | Browser importer `runTemplatePackageImportPipelineV2`; ready/blocked/error evidence and explicit candidate disposal |
| Fields / Family | Existing Core validators and Browser authoring transactions; UI owns local drafts and Apply/Discard |
| Editing | Native single/Family controllers; preserve order, imported defaults and Choice identity |
| Preview | React V2 session renderer; viewport transforms and highlights are presentation only |
| Assets / fonts | Browser leases and exact face linking; thumbnails borrow supported asset sources |
| Persistence | Host repository; Studio demonstrates IndexedDB and template-scoped recovery |
| Export | Flush valid drafts, persist, await current readiness, export through the mounted renderer, complete recovery |
| Diagnostics | SDK evidence; UI owns concise wording, correction links and technical disclosure |

Retain importer resources until session load acquires ownership. Dispose rejected,
cancelled and accepted candidates after the appropriate handoff. Do not add URL
or font registries. Saved content does not imply current font, asset, line or
settlement readiness. UI fonts remain separate from exact template faces.

## Presentation customization

Override existing root CSS roles: `--font-family-sans`, `--color-surface-*`,
`--color-text-*`, `--color-action-*`, `--color-focus-ring`, `--color-status-*`,
`--radius-*` and spacing/control-height tokens. Preserve accessible contrast,
focus and hit areas. Hosts may replace the field/preview composition without
changing controller semantics. `controlRole` remains an optional host hint.

For example, a host can override its application chrome while retaining the
native sessions and renderer:

```css
:root {
  --color-surface-app: #edf2f7;
  --color-action-primary: #234e70;
  --color-action-primary-hover: #183b56;
  --color-focus-ring: #2266aa;
}
```

These are Studio source-example roles, not an SDK theme API. Template fonts,
paint values and PNG content remain package-owned. The isolated product browser
check exercises this override without advancing the native content revision.

The output header owns Library navigation, save state, Issues and Export PNG.
Field focus highlights without moving the camera. View state is transient. The
tablet Content / Preview switch preserves drafts and one renderer mount. Review
stale-session and recovery behavior before replacing route/save handlers.
Studio's 100/325 ms draft scheduling and 650 ms autosave are product choices.

Follow [current V2 guidance](SDK-V2-INTEGRATION.md) and verify adapted examples through
packed public entries. Historical migration documents describe their published
artifacts, not the current unpublished source candidate.
