# Migrating to SDK 0.5

> Historical guide for the 0.5 release. New integrations should start with the
> [SDK 0.7 documentation](README.md).

SDK 0.5.0 preserves all SDK 0.4.2 root and curated imports. Existing hosts may
upgrade the fixed train without changing their runtime code:

```sh
pnpm add @sleinity/template-core@0.5.0 \
  @sleinity/template-browser@0.5.0 \
  @sleinity/template-react@0.5.0
```

## New optional entries

Use the focused entries when an application needs a narrower contract:

- Core: `editor`, `assets`, `fonts`, `motion`, and advanced `inspection`.
- Browser: `assets`, `fonts`, `persistence`, `capture`, and `enrichment`.
- React: advanced `inspection`.

The two inspection entries are supported for technical hosts, but they remain
observational. They expose evidence and projections without selecting a
renderer backend or changing rendering authority. Ordinary importing, editing,
rendering, persistence, and PNG capture do not require them.

Do not import `renderer-internal`. Studio-only layout debugging, stress
reports, visual comparison, fidelity issue packets, and development harnesses
are not SDK APIs.

## Studio reference

Template Studio now consumes these same supported package entry points in its
production and server graphs. Its workflow and UI remain Studio-owned; the
migration does not replace them with the default SDK wizard or session model.

## Deferred portability

Confirmed templates still depend on browser-local managed-font and persistence
evidence. A portable cross-device artifact remains planned for SDK 0.6.0.
