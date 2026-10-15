# Template core 2.0.0 importer handoff

> Unpublished local candidate 2.0.0. Not published or certified by packing. Do not mix it with published archives carrying the same version.

Package: @sleinity/template-core; archive [sleinity-template-core-2.0.0.tgz](sleinity-template-core-2.0.0.tgz); SHA-256 386ec69f20fc7f3268e4b6fa163f5360120a59c63896cb70a1e1f33e5635160d.

Core-only hosts use createZipBundleReader/loadTemplatePackageBundleSource for portable ZIP/source evidence and parseTemplatePackageV2 for canonical V2 normalization/validation. Core does not prepare browser fonts, own native sessions or certify PNG readiness. Runtime hosts start with the [V2 guide](SDK-V2-INTEGRATION.md) and [runtime handoff](SDK-RUNTIME-HANDOFF.md).

## Install

Vendor the verified Core archive; ajv and fflate are transitive dependencies. See [installation](SDK-INSTALLATION.md) for the full runtime dependency closure. React is not required for Core-only import.

## Strict source reader example

```ts
import { createZipBundleReader, loadTemplatePackageBundleSource } from "@sleinity/template-core";
export function importZip(buffer: ArrayBuffer, name: string) {
  const result = loadTemplatePackageBundleSource(createZipBundleReader(buffer, { sourceName: name }));
  return { importable: result.valid, sourcePackage: result.packageValue, validation: result.validation, diagnostics: result.diagnostics };
}
```

Invalid source outcomes and invocation failures are described in [operation outcomes](SDK-OPERATION-OUTCOMES.md). Rendering and browser persistence are separate authorities.
