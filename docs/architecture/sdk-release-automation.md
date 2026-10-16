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

## Current evidence and blocker

The human subsequently approved encrypted CI setup. The isolated E preparation
exposed an unhydrated `--no-checkout` clone; its pushed run was cancelled without
accepting results. The corrected helper uses a normal checkout and validates the
complete staged-path inventory before changing the secret. A real-clone regression
and negative staging tests bring tooling coverage to 31 passing cases. Candidate F
must renew certification for that helper change; E's bytes/evidence remain retained.

[Candidate E](evidence/sdk-host-release-20261016e/progress.json) has passed all
local npm/pnpm host groups, the complete portable gate, 29 tooling tests and a
fresh individually reviewed 24-capture/12-renderer/3-scene/12-settlement gate.
All three SDK archives and the starter remain byte-identical to D. No production
performance change is claimed.

Automatic approval review blocked `prepare-branch.mjs` before process creation
because it would transfer encrypted private ZIP/font inputs to GitHub and
replace the repository fixture secret. Explicit approval is pending; Linux and
the shared-input-action rehearsal remain unrun. No certification GO for release,
new tag movement or publication is claimed. The protected publication tag is
still `c6f489a`.
