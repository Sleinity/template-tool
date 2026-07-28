# Template Platform SDK

The Template Platform SDK is the reusable technical foundation used by
Template Studio and other Sleinity-owned React/TypeScript applications. Its
physical boundaries and migration order are recorded in the
[Template Platform boundary audit](../architecture/TEMPLATE_PLATFORM_BOUNDARY_AUDIT.md).

The public monorepo contains one reference application and three fixed-version
packages:

| Package | Responsibility | Environment |
| --- | --- | --- |
| `@sleinity/template-core` | ZIP import, strict validation, diagnostics, canonical/resolved models, and portable field editing | Framework-neutral TypeScript |
| `@sleinity/template-browser` | Browser session, assets, fonts, persistence, readiness, and PNG capture | Modern browser/Chromium |
| `@sleinity/template-react` | React provider, renderer, inspection viewport, and revision-safe capture handle | React 19 browser app |

## Installation

All three packages use the same version and must be upgraded together.

### GitHub Packages

Configure the `@sleinity` scope with
[`.npmrc.example`](../../.npmrc.example), then install:

```sh
pnpm add @sleinity/template-core@0.2.2 \
  @sleinity/template-browser@0.2.2 \
  @sleinity/template-react@0.2.2
```

GitHub's npm registry requires authentication. Use a classic personal access
token with `read:packages` and access to the package.

### Vendored Release archives

The public
[`sdk-v0.2.2` Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.2.2)
contains registry-derived archives and `SHA256SUMS`. Verify and commit the
three archives under `vendor/`, then declare exact `file:` dependencies. This
path requires no package-registry secret and is the supported Lovable Business
recipe.

See [Runtime handoff](RUNTIME_HANDOFF.md) for npm and pnpm configuration and
[Lovable template editor prompts](LOVABLE_TEMPLATE_EDITOR_PROMPTS.md) for the
sequential consumer workflow.

## Core-only importer

Consumers that only need ZIP import, normalization, strict validation, source
evidence, and an editable package may install only `template-core`:

```ts
import { importTemplatePackage } from "@sleinity/template-core";

const result = importTemplatePackage(await file.arrayBuffer(), file.name);

if (!result.importable || !result.workingPackage) {
  console.error(result.source.diagnostics, result.validation);
} else {
  useTemplate(result.workingPackage);
}
```

The importer runs directly in a modern browser and in Node. It has no peer
dependencies, server route, runtime secret, or network requirement. See the
[core importer handoff](CORE_IMPORTER_HANDOFF.md).

## React runtime contract

React hosts should let `useTemplateSession()` own the lifecycle:

```tsx
const session = useTemplateSession();

await session.loadZip({ bytes, sourceName: file.name });
session.setField("headline", "Updated headline");

<TemplateSessionProvider session={session}>
  <TemplateSessionRenderer ref={rendererRef} mode="editor" />
</TemplateSessionProvider>
```

Use `useTemplateSessionSnapshot()` for lifecycle, validation, diagnostics,
editable fields, working package, resolved tree, and revisions. The session
supports typed field/image mutation, imported-state restoration, IndexedDB
save/reload, and revision guards for asynchronous work.

PNG capture is allowed only for the ready render identity belonging to the
current session revision:

```ts
const output = await rendererRef.current?.exportPng({ download: false });
```

The SDK owns template import, validation, editable state, browser persistence,
rendering, readiness, and capture. The host owns product navigation,
authentication, catalogues, collaboration, cloud storage, publishing, and
other domain workflows. Integrate those through existing host services or
injected adapters.

See [Consumer compatibility](CONSUMER_COMPATIBILITY.md) and the focused
[template editor reference](../../examples/template-editor-integration/README.md).
The repository verifies both workspace and isolated packed consumers.

## Offline and network behavior

ZIP import and rendering require no external runtime requests. Assets and
managed fonts remain package- or browser-storage-backed. Default persistence is
browser-local IndexedDB; shared persistence is a host adapter concern.

## Release and authorization

Package bundles contain no Template Studio screens, workspace aliases, or
repository-relative source imports. A fixed `sdk-v*` tag publishes the package
train; manual release workflow runs can only recreate assets from an already
published version.

The repository and Release assets are publicly downloadable, but package
manifests remain `UNLICENSED`. The current `sleinity-tools-only` policy
authorizes use in Sleinity-owned applications only. Public visibility is not a
general reuse grant.
