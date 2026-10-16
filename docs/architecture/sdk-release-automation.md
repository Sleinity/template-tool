# SDK release automation correction

## Context and objective

The approved `sdk-v2.0.0` target `c6f489a` passed Linux `ci:portable` in
[run 38877292992](https://github.com/Sleinity/template-tool/actions/runs/38877292992).
The next packed-reference step failed because the release workflow had not
restored the exact external Carrousel ZIP/fonts. No package publication step ran.
Candidate D's full private host checks had received those inputs through a
different workflow. This automation gap was missed in preparation.

The objective is to rehearse and provision the actual release path before the
next tag approval. This changes test/release automation and maintainer guidance;
SDK source, API, schema, renderer, host example and persistence are outside scope.
No optimization, publication, tag movement or reference promotion is authorized
by this correction itself.

## Contract and ownership

- Public CI keeps portable source/build/API/packed-native contracts. Exact-font
  browser hosts belong to private certification and protected release jobs.
- Each release job downloads the explicitly selected current certification
  artifact. Its run must have succeeded in this repository. An independently
  configured frozen-manifest hash binds its candidate bytes; current certified
  source and fixed version must match before fixture decryption.
- Existing AES-GCM fixture authority, exact fixture/font manifests and hash checks
  remain unchanged. Missing/expired/wrong inputs fail closed. Both jobs remove
  decrypted fixtures unconditionally; no private ZIP/font input is uploaded as
  a public release asset.
- Prepublication reference commands consume the supplied certified archives.
  Registry-derived handoff checks include fresh npm/pnpm starters, native
  consumers, font authority, storage and the existing packed references.
- Certification snapshots retain tracked historical evidence so clean-checkout
  documentation checks cannot pass through ignored local files. They still
  commit only encrypted external inputs and no decryption key.

## Acceptance and compatibility

Mutation tests must reject missing input binding, unsuccessful/wrong-repository
runs, wrong frozen hashes, missing cleanup and removed host gates. The new
candidate must pass macOS/Linux supplied-archive hosts and the Linux clean
portable gate, tooling tests and both release reference commands. Rehearse the
shared certified-input action against that successful artifact before tagging.
Preserve source-bound three-export renderer/scene/settlement evidence and review.

Compare package members and complete archive/starter hashes with D. No runtime
or performance change is expected or claimed. A source/delivery correction needs
new candidate identities; existing candidate D and prior certification remain
immutable. The new final commit/tag target requires human approval. Record
automated browser checks separately from stored-capture/source review.

## Current evidence — candidate G correction pending certification

[Candidate F's retained packet](evidence/sdk-host-release-20261016f/progress.json)
records passing macOS/Linux archive hosts, Linux clean portable checks, strict
ZIP tests and a fresh individually reviewed 24/12/3/12 GO gate. The shared
certified-input action and both reference commands also passed in the
[release rehearsal](https://github.com/Sleinity/template-tool/actions/runs/38884477741).
The subsequent isolated publication simulation failed because it omitted
`node_modules`, which starter generation needs to read installed tool versions.
F is not release-certified around that failure.

The bounded correction links installed dependencies into that isolated workspace.
A new executable regression reproduced the exact failure before the fix and
passes afterward; all 32 tooling tests pass. Candidate G must renew certification
and the shared-action rehearsal. SDK/runtime/example source is unchanged; F and
previous archives/evidence remain immutable. Explicit encrypted CI setup approval
covers the same seven private inputs and fixture-key replacement. The release tag
remains on `c6f489a`; no SDK 2.0.0 package is published.
