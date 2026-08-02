# `@sleinity/template-core`

Private framework-neutral SDK for importing a TemplatePackage ZIP, preserving
source provenance, validating the strict canonical package, creating canonical
and resolved projections, and applying typed field values.

This package performs no renderer-time network access and does not export the
Template Studio UI.

`@sleinity/template-core/renderer-internal` is a package-private sibling seam
for `@sleinity/template-react`. It is not a host integration API and carries no
independent compatibility promise. Applications must use the documented core,
browser, and React entries instead.

The canonical package types, schema, diagnostics, ZIP/source reader,
normalization and strict validation are physically owned by this package.
Portable color/asset/axis, layout, stroke, transform and vector models plus the
resolved graph, injected font-readiness, image-placement, backend-decision and
internal primitive-appearance implementations are also physically owned here.
Portable editor-session, field mutation, image replacement/reset, field-rule
validation and measurement-result projection are physically owned here as
well. Their former root paths are checked behavior-free forwarders.

Legacy repository paths are internal compatibility forwarders only. Consumers
must import supported contracts from `@sleinity/template-core`.

## ZIP importer

`importTemplatePackage` is the supported importer entry point for consumers.
It accepts ZIP bytes as an `ArrayBuffer` and an optional source filename:

```ts
import { importTemplatePackage } from "@sleinity/template-core";

export async function importTemplateZip(file: File) {
  const result = importTemplatePackage(
    await file.arrayBuffer(),
    file.name,
  );

  if (!result.importable || !result.workingPackage) {
    return {
      ok: false as const,
      diagnostics: result.source.diagnostics,
      validation: result.validation,
    };
  }

  return {
    ok: true as const,
    template: result.workingPackage,
    importedBaseline: result.basePackage,
    source: result.source,
    validation: result.validation,
  };
}
```

The result contains the loaded source evidence, an independent imported
baseline, an editable working package, strict validation results, diagnostics,
and the final `importable` status. Lower-level ZIP-reader, normalization, and
validation exports remain available, but consumers should not orchestrate them
instead of this importer for the normal ZIP flow.

The importer runs directly in a modern browser after `File.arrayBuffer()` and
also runs in Node. It needs no API route, React runtime, runtime environment
variable, secret, DOM, storage, font, or network access. The package has no peer
dependencies. Its `ajv` and `fflate` runtime dependencies are installed
transitively.

## Install from GitHub Packages

Configure the scoped registry without committing a token:

```ini
@sleinity:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

Then install the exact reviewed version:

```sh
npm install @sleinity/template-core@0.4.2
```

`NODE_AUTH_TOKEN` must be a GitHub personal access token (classic) with
`read:packages`. The token's user must also have read access to the private
package or its linked repository.

## Lovable Business

Lovable Business cannot inject the private-registry build secret required for
GitHub Packages. Use the checksum-verified archive attached to the public
`sdk-v0.4.2` GitHub Release instead:

1. Verify `sleinity-template-core-0.4.2.tgz` against `SHA256SUMS`.
2. Commit it to the private Lovable-synced repository under `vendor/`.
3. Declare
   `"@sleinity/template-core":
   "file:vendor/sleinity-template-core-0.4.2.tgz"`.
4. Run `npm install` and commit the lockfile.

No `.npmrc` or GitHub token belongs in the Lovable repository. The release
archive is downloaded from the published GitHub Packages version before it is
attached, so it is not an independently rebuilt artifact.

The packed-core Node verification installs only the package archive, imports it
by package name, loads an inline ZIP, creates resolved/backend projections,
applies text/color/visibility/image edits and field-rule configuration, and
restores imported state without
repository fixtures, and rejects DOM, CSS, storage, font and network global
access. The built public declaration is
locked to the SDK 0.4.2 contract at 87,431 bytes and SHA-256
`7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033`.
