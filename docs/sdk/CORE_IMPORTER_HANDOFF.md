# Core importer 0.3.0 handoff

## Contract

- Package: `@sleinity/template-core`
- Version: `0.3.0`
- Supported importer export: `importTemplatePackage`
- Input: TemplatePackage ZIP bytes as an `ArrayBuffer`, plus an optional
  source filename.
- Output: loaded source evidence, imported baseline, editable working package,
  strict validation, diagnostics, and `importable`.
- Runtime secret: none.
- Peer dependencies: none.
- Runtime dependencies: `ajv` and `fflate`, installed transitively.
- Browser support: direct execution after `File.arrayBuffer()`; no API route is
  required.
- Node support: modern Node with the documented web-compatible primitives.

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

## Vendored installation

Download these files from the public
[`sdk-v0.3.0` Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.3.0):

- `sleinity-template-core-0.3.0.tgz`
- `SHA256SUMS`
- `SDK-CORE-HANDOFF.md`

Verify the archive, commit it to the private consumer repository, and declare:

```json
{
  "dependencies": {
    "@sleinity/template-core": "file:vendor/sleinity-template-core-0.3.0.tgz"
  }
}
```

This installation needs no `.npmrc`, package-registry token, or runtime
secret. Test one valid ZIP and require `importable === true`. Test invalid ZIP
bytes and require structured source diagnostics. Confirm the importer makes no
network requests.

Lovable Business consumers use this same vendored route. The complete
[runtime handoff](RUNTIME_HANDOFF.md) covers import, editing, rendering,
persistence, and PNG capture with all three packages.

## Optional direct registry installation

```ini
@sleinity:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

```sh
npm install @sleinity/template-core@0.3.0
```

`NODE_AUTH_TOKEN` must be a classic GitHub personal access token with
`read:packages` and package access.
