# First host: install, import, edit and export

Audience: Bas and other React/TypeScript host implementers. No SDK repository checkout or GitHub Packages credential is required for a vendored host.

## Obtain one delivery

Use the approved SDK 2.0.0 delivery when released. Before publication, use the explicitly identified local candidate supplied by the SDK maintainer. The published 1.0.0 release has a different contract; do not substitute its archives.

Obtain all three `sleinity-template-*-2.0.0.tgz` archives, `SHA256SUMS`, the delivery manifest and `SDK-HOST-STARTER.zip`. Verify delivery hashes before use. Unzip the starter into a new application directory and put the three archives in its `vendor/` directory. Its dependencies and pnpm overrides already use these relative files.

```sh
# In the directory containing the supplied package archives:
shasum -a 256 -c SHA256SUMS
# In the extracted starter:
npm install
npm run dev
```

For pnpm use `pnpm install` and `pnpm dev` instead. Choose one manager and commit its lockfile. The starter includes React 19, TypeScript, Vite, source, styles and configuration. See [installation](INSTALLATION.md) for adapting an existing application.

## First successful workflow

1. Bring a ZIP exported by plugin **0.6.1**. The private fidelity ZIPs/fonts are deliberately not bundled. Use font binaries you are authorized to use.
2. Select one ZIP for a single template, or multiple ZIPs for a Family. Import is staged; the accepted editor stays intact until the new candidate is opened.
3. Upload the exact requested fonts. A same-named system font is insufficient. Correct a mismatch or storage failure and retry without discarding accepted work.
4. Open the candidate, edit fields and use Reset. For a Family, switch designs and confirm shared content survives.
5. Save a template. Reopen it from the saved list, choose Fresh or Resume, and verify recovery after a reload.
6. Export PNG only when current assets, fonts, field validation and renderer evidence are ready. A completed download and recovery cleanup are separate outcomes.

## Before adapting it

Read [host implementation](HOST_IMPLEMENTATION.md), [features](FEATURES.md) and [ownership](HOST_LIFECYCLE.md). The starter's 650 ms recovery autosave is example policy. It does not add implicit SDK autosave or Studio typing delays. The browser's local saved templates/fonts are not a cross-device service.

## Bas's acceptance checklist

- Build from only delivered files and supplied archives; no workspace aliases or Studio imports.
- Open a real single ZIP and a multi-source Family; correct missing fonts.
- Exercise all available typed fields, Choices, image replacement/crop/Reset and Family switching.
- Verify failed replacement preserves accepted work; Save/reload and offline reopening retain assets/fonts.
- Verify recovery Fresh/Resume/Discard and a superseded tab cannot overwrite current recovery.
- Verify pending/invalid content blocks PNG, then current corrected content exports.
- Test storage failure/Retry and cleanup-only Retry without downloading twice.

Automated fresh-host acceptance is the release gate. Bas's subsequent feedback informs host integration and the later Studio redesign.
