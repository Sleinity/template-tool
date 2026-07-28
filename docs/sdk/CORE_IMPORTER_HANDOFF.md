# Core importer 0.2.0 handoff

## Contract

- Package: `@sleinity/template-core`
- Version: `0.2.0`
- Supported importer export: `importTemplatePackage`
- Input: TemplatePackage ZIP bytes as an `ArrayBuffer`, plus an optional
  source filename.
- Output: loaded source evidence, an imported baseline, an editable working
  package, strict validation, diagnostics, and `importable`.
- Runtime secret: none.
- Peer dependencies: none.
- Browser support: direct browser execution after `File.arrayBuffer()`; no API
  route is required.

```ts
import { importTemplatePackage } from "@sleinity/template-core";

export async function importTemplateZip(file: File) {
  const result = importTemplatePackage(await file.arrayBuffer(), file.name);
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

## Lovable Business installation

The private `sdk-v0.2.0` GitHub Release contains:

- `sleinity-template-core-0.2.0.tgz`
- `SHA256SUMS`
- `BAS-LOVABLE-HANDOFF.md`, generated with the published archive's exact hash

Download those files using a GitHub account with access to the private
repository. Verify the checksum, then commit the archive to the private
Lovable-synced consumer repository:

```text
vendor/sleinity-template-core-0.2.0.tgz
```

Declare the local package archive:

```json
{
  "dependencies": {
    "@sleinity/template-core": "file:vendor/sleinity-template-core-0.2.0.tgz"
  }
}
```

Run `npm install` and commit the lockfile. Do not add the GitHub Packages
`.npmrc`, a personal token, or `NODE_AUTH_TOKEN` to the Lovable repository.

Test one valid TemplatePackage ZIP and require `ok === true`. Test an invalid
ZIP and require `ok === false` with source diagnostics. Confirm the browser
makes no importer-time network requests.

## Optional direct registry installation

Authenticated local and CI consumers can install the package directly:

```ini
@sleinity:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

```sh
npm install @sleinity/template-core@0.2.0
```

`NODE_AUTH_TOKEN` must be a GitHub personal access token (classic) with
`read:packages`. Its user must also have read access to the package or linked
private repository.
