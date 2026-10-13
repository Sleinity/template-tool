# Template core 1.0.0 importer handoff

> Unpublished local candidate 1.0.0. Not published or certified by packing. Do not mix it with published archives carrying the same version.

Package: @sleinity/template-core; archive [sleinity-template-core-1.0.0.tgz](sleinity-template-core-1.0.0.tgz); SHA-256 363d07b79d12d73fdc87dfd6341271e9c7819c810a34287f82e86685c9258185.

Core-only hosts use importTemplatePackage for portable ZIP/source evidence and parseTemplatePackageV2 for canonical V2 normalization/validation. Core does not prepare browser fonts, own native sessions or certify PNG readiness. Runtime hosts start with the [V2 guide](SDK-V2-INTEGRATION.md) and [runtime handoff](SDK-RUNTIME-HANDOFF.md).

## Install

Vendor the verified Core archive; ajv and fflate are transitive dependencies. See [installation](SDK-INSTALLATION.md) for the full runtime dependency closure. React is not required for Core-only import.

## Compatibility importer example

```ts
import { importTemplatePackage } from "@sleinity/template-core";
export function importZip(buffer: ArrayBuffer, name: string) {
  const result = importTemplatePackage(buffer, name);
  return { importable: result.importable, workingPackage: result.workingPackage, validation: result.validation, diagnostics: result.source.diagnostics };
}
```

Invalid source outcomes and invocation failures are described in [operation outcomes](SDK-OPERATION-OUTCOMES.md). Rendering and browser persistence are separate authorities.
