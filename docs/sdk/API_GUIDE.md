# Find the API for a task

Use supported package entries. The delivery contains `sdk-entry-points.json` and `sdk-public-api.json`; these checked inventories are the exhaustive declaration authority. This guide groups them by task rather than inventing a second API.

| Task | Entry and principal contract |
| --- | --- |
| Portable source/validation | `@sleinity/template-core`: `createZipBundleReader`, `loadTemplatePackageBundleSource`, `parseTemplatePackageV2`, strict validators |
| Portable fields | Core `/editor`: canonical content, validation, formatting and materialization |
| Portable Families | Core `/family`: configuration, shared content and deterministic selection helpers |
| Browser admission/assembly | Browser `/importer`: `runTemplatePackageImportPipelineV2`, `appendTemplateSourcesV2`, `mutateTemplateFamilyV2` |
| Native editing | Browser `/session`: `createTemplateSessionV2`, `createTemplateFieldFamilySessionV2`, typed controller/session declarations |
| Persistence/recovery | Browser `/persistence`: current single/Family repositories, saved-record factories and template recovery repositories |
| Assets/fonts | Browser `/assets`, `/fonts`: existing stores, URL ownership, registry, upload/link and preparation operations |
| Runtime compatibility | Browser `/compatibility`: `inspectTemplateRuntimeSupport` |
| Mounted React editing | React `/editor`: `TemplateFieldSessionV2Provider`, `TemplateFieldSessionRendererV2`, snapshot/controller hooks and guarded export handle |
| Inspection | Core/React `/inspection`: read-only semantic/quality evidence |
| Capture/motion/enrichment | Browser `/capture`, Core `/motion`, Browser `/enrichment`: focused advanced operations and their existing limitations |

The [complete integration guide](V2_INTEGRATION.md) contains checked TypeScript examples. The [feature guide](FEATURES.md) links behavior to examples and limits. Font and source/evidence contracts retain versioned names such as V1 where required; that is distinct from retired V1 host workflows.

Never import `renderer-internal`, `session-internal`, package `src/`, Studio modules or test adapters. Internal entries may be physically exported for the fixed repository train but are not supported host contracts. No styled editor/control package or general SDK theme API is provided in 2.0.0.
