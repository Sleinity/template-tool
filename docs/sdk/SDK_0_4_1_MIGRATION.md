# Migrating to SDK 0.4.1

SDK 0.4.1 is a behavior-preserving ownership and packaging patch. Upgrade the
fixed core, browser and React train together.

```sh
pnpm add @sleinity/template-core@0.4.1 \
  @sleinity/template-browser@0.4.1 \
  @sleinity/template-react@0.4.1
```

No application code or public import needs to change. Broad browser imports and
the curated `/session`, `/importer` and `/compatibility` entry points retain the
0.4.0 symbol contract.

The browser package now physically owns assets, exact-font handling,
IndexedDB persistence, import orchestration, sessions, readiness,
compatibility inspection, enrichment and PNG capture. Its build consumes
`@sleinity/template-core` as a package dependency instead of embedding a second
copy. The React build likewise keeps core and browser external.

Consumers should:

1. Replace all three archives or registry versions together.
2. Regenerate and commit the lockfile.
3. Run runtime preflight, wizard confirmation and fresh-session reopening.
4. Verify browser-local managed-font and IndexedDB restoration in the target
   browser.

Confirmation schemas, fingerprints and digests, persistence records, database
names and versions, session revisions, render identities and PNG behavior are
unchanged. This patch does not make browser-local fonts or saved records
portable across devices.
