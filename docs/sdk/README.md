# Private renderer SDK

The repository is one authoritative monorepo. Template Studio is the reference
application; three private packages provide the reusable engine for other tools.

| Package | Responsibility | Environment |
| --- | --- | --- |
| `@sleinity/template-core` | ZIP contract, strict validation, canonical scene, resolved tree, backend decisions, typed field values | Framework-neutral TypeScript |
| `@sleinity/template-browser` | Asset/font registries, measurement, persistence adapters, readiness, PNG | Browser/Chromium |
| `@sleinity/template-react` | Proven renderer component and runtime context | React 19 browser app |

The initial extraction uses publishable facade entry points over the proven
implementation. Package bundles contain the implementation they need, not
Template Studio screens. This preserves approved renderer behavior while the
source directories can be physically refined in later, separately verified
changes.

## Consumer installation

1. Obtain private repository access and a GitHub token with `read:packages`.
2. Configure the `@sleinity` registry using [`.npmrc.example`](../../.npmrc.example).
3. Install exact reviewed versions:

   ```sh
   pnpm add @sleinity/template-core@0.1.0 \
     @sleinity/template-browser@0.1.0 \
     @sleinity/template-react@0.1.0
   ```

4. Start with [`examples/minimal-renderer`](../../examples/minimal-renderer/README.md).

Do not copy renderer source into another repository. Upgrade the package version
deliberately so a fidelity correction can be tested and rolled back.

## Release workflow

```text
real template → validator/issue packet → focused change → pull request
→ portable and private fidelity gates → changeset → version tag
→ private package release → deliberate consumer update
```

Portable GitHub CI never needs proprietary fixture or font bytes. The complete
hash-gated fidelity suite remains a local release gate until a rights-reviewed
private asset distribution mechanism is added.
