# Portable Core integration

Core 2.0.1 provides DOM-free ZIP/source reading, canonical parsing, validation, typed fields, Family semantics and read-only inspection. It does not own browser fonts, sessions, React or PNG readiness. For an editor start with [the complete host guide](QUICKSTART.md).

```ts
import { createZipBundleReader, loadTemplatePackageBundleSource, parseTemplatePackageV2 } from "@sleinity/template-core";
export function readTemplate(buffer: ArrayBuffer) {
  const source = loadTemplatePackageBundleSource(createZipBundleReader(buffer));
  if (!source.valid || !source.packageValue) return { source, canonical: null };
  return { source, canonical: parseTemplatePackageV2(source.packageValue) };
}
```

Keep source evidence separate from accepted canonical packages. Source schema 1.0/exporter 0.6.1 admission does not weaken canonical schema 2.2. Invalid source and invocation failures have different [operation outcomes](OPERATION_OUTCOMES.md). See [supported entries](API_GUIDE.md), [installation](INSTALLATION.md) and [runtime handoff](RUNTIME_HANDOFF.md). No source/private/internal repository imports are required.
