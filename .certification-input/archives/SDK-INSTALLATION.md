# SDK installation

> Unpublished local candidate 2.0.0. Not published or certified by packing. Do not mix it with published archives carrying the same version.

Use Node 22.23.3 and pnpm 11.9.0 (or npm) for host acceptance. Chromium is the certified browser target. Use every archive listed in this delivery and [verify their checksums](SHA256SUMS).
The [V2 guide](SDK-V2-INTEGRATION.md) is the recommended contract.

## Vendored installation

Copy the archives into your host's vendor directory. React and React DOM 19 are peers.

```json
{
  "dependencies": {
    "@sleinity/template-core": "file:vendor/sleinity-template-core-2.0.0.tgz",
    "@sleinity/template-browser": "file:vendor/sleinity-template-browser-2.0.0.tgz",
    "@sleinity/template-react": "file:vendor/sleinity-template-react-2.0.0.tgz",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

Run npm install and commit the lockfile. For pnpm, map the same private dependency closure:

```yaml
overrides:
  "@sleinity/template-core": "file:vendor/sleinity-template-core-2.0.0.tgz"
  "@sleinity/template-browser": "file:vendor/sleinity-template-browser-2.0.0.tgz"
  "@sleinity/template-react": "file:vendor/sleinity-template-react-2.0.0.tgz"
```

Vendored installation needs no registry credentials. Registry downloads are authorized release operations, separate from host runtime.
Archives and documents are bound by [the delivery manifest](SDK-DELIVERY-MANIFEST.json); old published 0.8 migration instructions are [historical](SDK-0.8-MIGRATION.md).
The distribution is UNLICENSED, authorized for Sleinity-owned applications only.
