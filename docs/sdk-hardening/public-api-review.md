# Approved protected API baseline review

Historical focused-hardening review. “Additive” below applies to that bounded
change, not the full next-release delta. Current schema 2.2 and recovery include
breaking changes; see [release preparation](../sdk/RELEASE_PREPARATION.md) and
[architecture closure](../architecture/sdk-release-readiness.md). This milestone
does not regenerate the protected API baseline.

Implementation is additive. No exported symbol is removed. Current release remains
0.8.0; a changeset records the next release work.

The built importer entry adds exactly these names:

- `appendTemplateSourcesV2`
- `createTemplateFieldFamilyFromSourcesV2`
- `mutateTemplateFamilyV2`
- `TemplateImportSourceV2`
- `TemplateFamilyMutationV2`

Other additions extend existing interfaces: the optional cumulative ZIP read
limit, import-lifetime preview bytes, optional import/adapter disposal, and reuse
of existing session options for authoring candidates. Existing argument lists,
repository schemas, canonical content, and rendering semantics remain compatible.

The guarded core declaration changes from 110294 to 110540 bytes. Its newly built
SHA-256 is `dbd67c76ff75a1c56e05413e53b73c49b44bba8f33d499dd5ce3f79e4d137e32`.
The core additions are `ZipBundleReaderOptions.maxTotalUncompressedBytes` and
`PackagePreviewReference.bytes`, with their documentation.

User approval authorized updating only the exact declaration identity in
`scripts/repository/verify-package-boundaries.mjs` and the five importer names in
`config/sdk-public-api.json`. The guards remain enabled and exact. This does
not authorize changing renderer goldens, scene/settlement references or tolerances.

After the initial automatic-review rejection, the user explicitly approved these
baseline updates. The built artifacts were checked against the exact additions and
declaration identity above before updating either baseline. The API contract and
package-boundary checks both pass with the approved baselines.
