# Template Platform SDK

The current physical boundaries and the decision-complete migration order are
recorded in the
[Template Platform boundary audit](../architecture/TEMPLATE_PLATFORM_BOUNDARY_AUDIT.md).
That audit treats this SDK as the technical platform used by Studio and future
products; it does not treat Studio as disposable extraction scaffolding.

The repository is one authoritative public monorepo. Template Studio is the
reference application; three scoped packages provide the reusable engine for
other tools.

| Package | Responsibility | Environment |
| --- | --- | --- |
| `@sleinity/template-core` | ZIP contract, strict validation, canonical scene, resolved tree, backend decisions, typed field values | Framework-neutral TypeScript |
| `@sleinity/template-browser` | Asset/font registries, measurement, persistence adapters, readiness, PNG | Browser/Chromium |
| `@sleinity/template-react` | Proven renderer component and runtime context | React 19 browser app |

The core package now physically owns the package, ZIP/source, normalization and
validation contract. Its scene/resolved/editor exports and the browser/React
packages still bridge to the proven implementation. Package bundles contain
the implementation they need, not Template Studio screens, while each remaining
family moves under a separate fidelity gate.

## Consumer installation

1. Obtain GitHub Packages access and a GitHub personal access token (classic)
   with `read:packages`; GitHub's npm registry requires authentication even for
   public packages.
2. Configure the `@sleinity` registry using [`.npmrc.example`](../../.npmrc.example).
3. Install exact reviewed versions:

   ```sh
   pnpm add @sleinity/template-core@0.2.1 \
     @sleinity/template-browser@0.2.1 \
     @sleinity/template-react@0.2.1
   ```

4. Start with [`examples/minimal-renderer`](../../examples/minimal-renderer/README.md).

Do not copy renderer source into another repository. Upgrade the package version
deliberately so a fidelity correction can be tested and rolled back.

## Core importer integration

Consumers that only need ZIP import, normalization, strict validation, source
evidence, and an editable canonical package should install only
`@sleinity/template-core` and call `importTemplatePackage`.

```ts
import { importTemplatePackage } from "@sleinity/template-core";

const bytes = await file.arrayBuffer();
const result = importTemplatePackage(bytes, file.name);

if (!result.importable || !result.workingPackage) {
  console.error(result.source.diagnostics, result.validation);
} else {
  useTemplate(result.workingPackage);
}
```

The importer runs in the browser and in Node without a server route. It has no
peer dependencies or runtime secrets; `ajv` and `fflate` are installed as
ordinary package dependencies. Asset ingestion, managed-font activation,
persistence, readiness, rendering, and PNG export remain browser/React runtime
responsibilities and are not part of this core-only integration.

Lovable Business cannot provide the Enterprise build secret needed to install a
GitHub Packages dependency. The public `sdk-v0.2.1` GitHub Release therefore
includes the exact published core, browser and React archives, one SHA-256
manifest, and copyable Bas handoffs without requiring a download token. The
[core importer handoff](CORE_IMPORTER_HANDOFF.md) remains the narrow import-only
route. Use the [runtime handoff](RUNTIME_HANDOFF.md) and
[sequential Lovable prompts](BAS_NARROWCASTING_LOVABLE_PROMPTS.md) for the
import/edit/render/export narrowcasting test.

## Consumer runtime contract

SDK 0.2 adds one host-owned `TemplateSession` so applications do not have to
coordinate import, asset ingestion, managed-font linking, resolved-tree
creation, typed field updates, readiness, persistence, and export revisions by
hand.

```tsx
const session = useTemplateSession();

await session.loadZip({ bytes, sourceName: file.name });
session.setField("headline", "Updated headline");

<TemplateSessionProvider session={session}>
  <TemplateSessionRenderer ref={rendererRef} mode="editor" />
</TemplateSessionProvider>
```

An editor uses `editor` mode and the mutation methods. A narrowcasting client
uses `static` mode, loads a saved template or ZIP, applies current field values,
and leaves the renderer mounted. Both consume the same package, resolved tree,
backend decisions, and render-identity lifecycle. `dispose()` invalidates
in-flight work when the host permanently releases the session.

The repository verifies this contract twice: the workspace example exercises
the normal development flow, while `pnpm packed-consumer:verify` packs all three
archives, installs them into a temporary project with no workspace aliases,
type-checks, and builds that consumer.

See [Consumer compatibility](CONSUMER_COMPATIBILITY.md) for the browser, React,
CSP, persistence, revision, upgrade, and licensing contract. The committed
[narrowcasting reference consumer](../../examples/narrowcasting-integration/README.md)
shows the complete supported browser integration without Studio.

## Deferred package refinement

The current packages still embed overlapping renderer and browser
implementation. Portable package, resolved/backend, primitive and field
contracts are physically core-owned; browser lifecycle implementation remains
the next ownership migration. Bundle de-duplication remains separate debt and
must not change renderer ownership merely to reduce package size.

## Release workflow

```text
real template → validator/issue packet → focused change → pull request
→ portable and private fidelity gates → changeset → version tag
→ private package release → deliberate consumer update
```

Portable GitHub CI never needs proprietary fixture or font bytes. The complete
hash-gated fidelity suite remains a local release gate until a rights-reviewed
private asset distribution mechanism is added.

The repository and release assets are publicly downloadable, but package
manifests remain `UNLICENSED`. Public visibility is not a general reuse grant;
choose an explicit license before inviting adoption beyond authorized
collaborators such as this Bas integration.
