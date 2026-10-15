# Migrating to SDK 0.4.2

> Historical guide for the 0.4.2 release. New integrations should start with
> the [SDK 0.7 documentation](README.md).

SDK 0.4.2 is a behavior-preserving ownership and packaging patch. Upgrade the
fixed core, browser, and React train together:

```sh
pnpm add @sleinity/template-core@0.4.2 \
  @sleinity/template-browser@0.4.2 \
  @sleinity/template-react@0.4.2
```

No host code migration is required. Existing session, importer, compatibility,
React renderer, inspection, persistence, and PNG APIs are unchanged.

The renderer is now physically owned by `template-react` and canonical scene
behavior by `template-core`. The internal sibling entries
`@sleinity/template-core/renderer-internal` and
`@sleinity/template-react/renderer-internal` exist only for fixed-train
renderer/repository composition. Do not import them from application code.
Replace all three vendored archives together, update the lockfile, and rerun
the existing runtime preflight and integration acceptance.
