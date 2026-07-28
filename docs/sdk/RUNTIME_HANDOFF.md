# SDK 0.2.1 runtime handoff

The complete browser editor/runtime integration uses the fixed-version SDK
train:

| Package | Responsibility | Consumer requirement |
| --- | --- | --- |
| `@sleinity/template-core@0.2.1` | ZIP import, strict validation, diagnostics, portable fields and package models | No peer dependencies |
| `@sleinity/template-browser@0.2.1` | Browser session, assets, fonts, persistence, readiness and PNG export | Browser runtime |
| `@sleinity/template-react@0.2.1` | React provider, renderer, inspection viewport and revision-safe export handle | React 19 and React DOM 19 |

For Lovable Business, download the three published archives and the combined
`SHA256SUMS` from the public
[`sdk-v0.2.1` GitHub Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.2.1).
Commit the verified
archives under `vendor/` and declare all three as root `file:` dependencies.
Installing only `template-react` is insufficient because npm must resolve its
private browser/core dependency closure without contacting GitHub Packages.
The repository and Release are public, so downloading these assets requires no
GitHub token. GitHub's npm registry remains authenticated.

| Archive | Public download | SHA-256 |
| --- | --- | --- |
| `sleinity-template-core-0.2.1.tgz` | [download](https://github.com/Sleinity/template-tool/releases/download/sdk-v0.2.1/sleinity-template-core-0.2.1.tgz) | `36c16c316ef32252e4b0878084aa3c0b0ff69c09afb0c3e0be64bf13d6e66916` |
| `sleinity-template-browser-0.2.1.tgz` | [download](https://github.com/Sleinity/template-tool/releases/download/sdk-v0.2.1/sleinity-template-browser-0.2.1.tgz) | `b9cf8f61ea784cc50fe6d9a312013060408b1408f1627efa0cd8706d712b4575` |
| `sleinity-template-react-0.2.1.tgz` | [download](https://github.com/Sleinity/template-tool/releases/download/sdk-v0.2.1/sleinity-template-react-0.2.1.tgz) | `ed38f5d71ee6b59f2a5b9528f390a3c0173f464b264d3c4e3a9b375abfae1552` |

Verify these values with the Release's
[`SHA256SUMS`](https://github.com/Sleinity/template-tool/releases/download/sdk-v0.2.1/SHA256SUMS)
instead of copying hashes into an install script.

```json
{
  "dependencies": {
    "@sleinity/template-core": "file:vendor/sleinity-template-core-0.2.1.tgz",
    "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.2.1.tgz",
    "@sleinity/template-react": "file:vendor/sleinity-template-react-0.2.1.tgz"
  }
}
```

No GitHub Packages `.npmrc`, `NODE_AUTH_TOKEN`, or PAT belongs in the Lovable
repository.

An npm consumer resolves the exact root file dependencies as the private
transitive closure. A pnpm consumer must additionally declare:

```yaml
overrides:
  "@sleinity/template-core": "file:vendor/sleinity-template-core-0.2.1.tgz"
  "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.2.1.tgz"
  "@sleinity/template-react": "file:vendor/sleinity-template-react-0.2.1.tgz"
```

The release smoke verifies both npm and pnpm installation modes without
credentials.

## Application boundary

Use `createTemplateSession()` when the host owns lifecycle explicitly. In
React workspaces, prefer `useTemplateSession()` for StrictMode-safe creation
and permanent-unmount disposal. Use
`TemplateSessionProvider`, `useTemplateSessionSnapshot()` and
`TemplateSessionRenderer` for React integration.

Blocked imports publish ordered source diagnostics directly into the session
snapshot, so consumers call `session.loadZip()` once.

An editor renders in `editor` mode and mutates fields through the session.
Export is allowed only when the session is ready and the renderer has published
a ready identity for the exact current session revision. The returned PNG data
URL and metadata cross into Bas's existing media upload contract.
Use `exportPng({ download: false })` so this host callback does not also
initiate a browser download.

Bas owns authentication, media storage, campaigns, scheduling, distribution
and playback. The screen/player consumes the exported media URL or asset ID and
does not need the SDK solely to display the PNG.

Browser-local draft persistence uses the existing IndexedDB-backed repository.
A shared/cloud draft repository is a later injected-adapter integration rather
than part of the first Lovable test.

## Verification contract

The release workflow downloads the actual GitHub Packages archives, generates
one checksum manifest, and installs all three into an isolated consumer as
secret-free `file:vendor/...` dependencies. It also copies the committed
narrowcasting reference into a second isolated packed consumer. The browser
smokes verify:

- structured invalid-ZIP diagnostics;
- valid ZIP import and ready rendering;
- a field edit and stale-export rejection;
- browser save, offline reload and edited-state restoration;
- validation presentation, image MIME rejection, replacement, Fill/Fit and
  reset in the committed reference;
- ready PNG export and returned preview data;
- no external import, render, persistence or export requests;
- declarations and JavaScript free of Studio, workspace, root-source and
  credential references.

Use [the sequential Lovable prompts](BAS_NARROWCASTING_LOVABLE_PROMPTS.md) for
the repository-specific implementation.

The committed
[narrowcasting integration reference](../../examples/narrowcasting-integration/README.md)
is the copyable implementation authority for this release.

Package publication runs only for an exact `sdk-v*` tag. Manual workflow
dispatch may refresh checksums and handoff assets from an already-published
fixed version, but cannot execute package publication.
