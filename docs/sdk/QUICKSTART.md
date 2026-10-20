# First host: install, import, edit and export

Use Node **22.23.3** and pnpm **11.9.0**, or npm, to reproduce host acceptance. React and React DOM 19 are required for the renderer. Chromium is the certified browser target; other browsers require host verification.

Audience: Bas and other React/TypeScript host implementers. No SDK repository checkout or GitHub Packages credential is required for a vendored host.

## Obtain one delivery

Use the published SDK 2.0.1 host kit. Its README provides the runnable-example and existing-application paths; vendor/ already contains all three SDK archives. The published 1.0.0 release has a different contract; do not substitute its archives.

Download [the complete host kit](https://github.com/Sleinity/template-tool/releases/download/sdk-v2.0.1/template-sdk-2.0.1-host-kit.zip) and [its checksums](https://github.com/Sleinity/template-tool/releases/download/sdk-v2.0.1/HOST-KIT-SHA256SUMS). Verify the ZIP hash before extraction. Extract into an empty application directory; no SDK archive copies are needed.

```sh
# In the extracted host kit:
npm install
npm run dev
npm run build
```

For pnpm use `pnpm install`, `pnpm dev` and `pnpm build` instead. Choose one manager and commit its lockfile. The kit includes React 19, TypeScript, Vite, source, styles, all three SDK archives and offline guides. Installation downloads public application dependencies. For an existing application, follow the kit README's **Integrate into an existing app** path for dependency mappings and pnpm overrides. The older standalone starter requires separate archives and remains available for compatibility.

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
