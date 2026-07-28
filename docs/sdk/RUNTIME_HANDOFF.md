# SDK 0.2.0 runtime handoff

The complete browser editor/runtime integration uses the fixed-version SDK
train:

| Package | Responsibility | Consumer requirement |
| --- | --- | --- |
| `@sleinity/template-core@0.2.0` | ZIP import, strict validation, diagnostics, portable fields and package models | No peer dependencies |
| `@sleinity/template-browser@0.2.0` | Browser session, assets, fonts, persistence, readiness and PNG export | Browser runtime |
| `@sleinity/template-react@0.2.0` | React provider, renderer, inspection viewport and revision-safe export handle | React 19 and React DOM 19 |

For Lovable Business, download the three published archives and the combined
`SHA256SUMS` from the private `sdk-v0.2.0` GitHub Release. Commit the verified
archives under `vendor/` and declare all three as root `file:` dependencies.
Installing only `template-react` is insufficient because npm must resolve its
private browser/core dependency closure without contacting GitHub Packages.

```json
{
  "dependencies": {
    "@sleinity/template-core": "file:vendor/sleinity-template-core-0.2.0.tgz",
    "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.2.0.tgz",
    "@sleinity/template-react": "file:vendor/sleinity-template-react-0.2.0.tgz"
  }
}
```

No GitHub Packages `.npmrc`, `NODE_AUTH_TOKEN`, or PAT belongs in the Lovable
repository.

An npm consumer resolves the exact root file dependencies as the private
transitive closure. A pnpm consumer must additionally declare:

```yaml
overrides:
  "@sleinity/template-core": "file:vendor/sleinity-template-core-0.2.0.tgz"
  "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.2.0.tgz"
  "@sleinity/template-react": "file:vendor/sleinity-template-react-0.2.0.tgz"
```

The release smoke verifies both npm and pnpm installation modes without
credentials.

## Application boundary

Use `createTemplateSession()` as the high-level owner of import, editable state,
resolved output, persistence and lifecycle revisions. Use
`TemplateSessionProvider`, `useTemplateSessionSnapshot()` and
`TemplateSessionRenderer` for React integration.

For immutable 0.2.0 consumers, run `importTemplatePackage(bytes, filename)` as
the ZIP preflight gate. It preserves source diagnostics for malformed ZIPs;
pass the same bytes to `session.loadZip()` only after the preflight result is
importable. Projecting every source-load diagnostic into blocked session
snapshots is a later runtime patch, not a reason to rebuild the published
0.2.0 archives.

An editor renders in `editor` mode and mutates fields through the session.
Export is allowed only when the session is ready and the renderer has published
a ready identity for the exact current session revision. The returned PNG data
URL and metadata cross into Bas's existing media upload contract.

Bas owns authentication, media storage, campaigns, scheduling, distribution
and playback. The screen/player consumes the exported media URL or asset ID and
does not need the SDK solely to display the PNG.

Browser-local draft persistence uses the existing IndexedDB-backed repository.
A shared/cloud draft repository is a later injected-adapter integration rather
than part of the first Lovable test.

## Verification contract

The release workflow downloads the actual GitHub Packages archives, generates
one checksum manifest, and installs all three into an isolated consumer as
secret-free `file:vendor/...` dependencies. Its browser smoke verifies:

- structured invalid-ZIP diagnostics;
- valid ZIP import and ready rendering;
- a field edit and stale-export rejection;
- browser save, offline reload and edited-state restoration;
- ready PNG export and returned preview data;
- no external import, render, persistence or export requests;
- declarations and JavaScript free of Studio, workspace, root-source and
  credential references.

Use [the sequential Lovable prompts](BAS_NARROWCASTING_LOVABLE_PROMPTS.md) for
the repository-specific implementation.
