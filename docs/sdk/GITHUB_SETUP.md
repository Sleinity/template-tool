# GitHub setup and collaboration

## Repository

- Owner: `Sleinity`
- Public repository: `template-tool`
- Default branch: `main`
- Do not auto-create GitHub starter files; the local project already owns them.

After the first push, add the colleague with **Write** access and create a ruleset
for `main` requiring pull requests and the `Portable CI / verify` status check.
Disable force pushes and branch deletion. The authenticated package release
workflow uses the protected `private-sdk-release` environment.

## Everyday terms

- A **commit** is a named snapshot.
- A **branch** isolates one change.
- A **pull request** reviews a branch before it reaches `main`.
- A **package release** is a versioned SDK build consumed by another product.

Use one focused branch per change, for example `fix/font-linking` or
`sdk/media-diagnostics`. Never update approved references merely to make a pull
request pass.

## External fidelity inputs

`fidelity/fixtures.json` and `fidelity/fonts.json` retain exact hashes and
expected paths. Real template ZIPs and managed font binaries are not part of the
published package. A new machine sets `TEMPLATE_PACKAGE_FIXTURE_DIR`,
`RENDERER_FIDELITY_FONT_DIR`, and `INTER_TIGHT_FIDELITY_FONT_PATH` only when it
is authorized to run the private full-fidelity gate.

GitHub Actions runs `pnpm ci:portable`, which selects `pnpm test:portable` and
therefore never probes those external paths. Local renderer releases still run
`pnpm test`, the strict diagnostic ZIP checks, and the full hash-gated fidelity
commands. Portable CI is a distribution and contract gate, not a replacement
for the private source-fidelity gate.

The release workflow publishes to the authenticated GitHub npm registry with
its repository-scoped workflow token and pushes the Changesets package tags
after publication. It also attaches checksum-verified archives to the public
GitHub Release for secret-free Lovable installation. Those tags bind each
immutable package version to the exact reviewed source commit.

Only an exact `sdk-v*` tag push can execute `changeset publish`. Manual workflow
dispatch is limited to rebuilding the public handoff from the already-published
fixed version; `pnpm release:contract` enforces that separation.

Public repository and Release visibility make source and release assets
downloadable by anyone. The package manifests remain `UNLICENSED`; choose an
explicit license before treating public visibility as a general reuse grant.
