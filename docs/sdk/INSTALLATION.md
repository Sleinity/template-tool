# Install SDK 1.0.0

The three packages form one fixed train. This page describes the current 1.0.0 contract; [0.8 migration guidance](SDK_0_8_MIGRATION.md) is historical. Until release approval and publication, use the exact supplied local candidate and its hashes.

## Recommended: vendored release archives

Download or receive one verified delivery containing Core, Browser and React archives, checksums and the delivery manifest. Verify `SHA256SUMS`, copy all archives into the host's `vendor/` directory, then use:

```json
{
  "dependencies": {
    "@sleinity/template-core": "file:vendor/sleinity-template-core-1.0.0.tgz",
    "@sleinity/template-browser": "file:vendor/sleinity-template-browser-1.0.0.tgz",
    "@sleinity/template-react": "file:vendor/sleinity-template-react-1.0.0.tgz",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

pnpm also needs this private dependency closure in `pnpm-workspace.yaml`:

```yaml
overrides:
  "@sleinity/template-core": "file:vendor/sleinity-template-core-1.0.0.tgz"
  "@sleinity/template-browser": "file:vendor/sleinity-template-browser-1.0.0.tgz"
  "@sleinity/template-react": "file:vendor/sleinity-template-react-1.0.0.tgz"
```

Run the chosen manager's install command, commit its lockfile and run the host typecheck/build. Do not mix registry and local SDK packages. No registry credential, token or SDK repository alias belongs in a vendored consumer. The complete [starter](QUICKSTART.md) supplies this configuration.

## Optional authenticated registry installation

After publication, authorized maintainers may install all three `@sleinity/template-*` packages at exact version `1.0.0` from GitHub Packages. Configure the `@sleinity` registry and provide a read-packages credential through the host's existing secret mechanism; never commit it. Archive installation is preferred for Bas's first host.

## Runtime and ownership

Core-only portable import/validation needs no React. Browser sessions need DOM/browser APIs, assets and fonts; React rendering/export needs React and React DOM 19. Browser sessions are not a server-rendering API. See [compatibility](CONSUMER_COMPATIBILITY.md) for platform/CSP limits and [API guide](API_GUIDE.md) for supported entries. Native browser rendering needs no renderer-time Figma connection.

Public downloadability does not grant general reuse rights: the packages remain UNLICENSED and authorized for Sleinity-owned applications only.
