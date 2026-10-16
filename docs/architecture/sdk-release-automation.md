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

## Current evidence — candidate G is GO for publication approval

[The final packet](evidence/sdk-host-release-20261016g/certification.json) records
passing macOS/Linux supplied-archive hosts, the clean Linux portable gate,
32 tooling tests, strict ZIP tests and current source-reviewed 24/12/3/12 evidence.
The shared certified-input action, reference commands and actual publication
preparation/upload-inventory step all passed in
[rehearsal 38906939936](https://github.com/Sleinity/template-tool/actions/runs/38906939936).
The release variables select certification run `38905061349` and frozen-manifest
SHA-256 `96852f55d8634e72420106110e86e8766bd23fcb1526c514d3e3bbdb066fdfe4`.

F's retained rehearsal failed because its isolated simulator omitted installed
dependencies needed for starter generation. G links them into that workspace;
a public-stub regression reproduces F's exact failure and passes with the fix.
All SDK archives and starter bytes remain identical to D/E/F. Earlier E's cancelled
snapshot and both stopped publication attempts remain recorded in the packets.
No production source, API, renderer, schema or reference changed here.

Explicit encrypted CI setup approval covers the same seven ZIP/font inputs and
fixture-key replacement. Staged snapshots contained only the 57 approved input
paths; raw inputs/key were absent. Successful certification and rehearsal jobs
removed decrypted inputs. The three-day artifact must still exist when release
runs; missing/expired evidence blocks decryption and publication.

The final evidence-only commit requires approval as the new tag target. The
existing tag remains `c6f489a`; SDK 2.0.0 is not published. Simulated packing is
separate from the registry-derived acceptance required after approved publication.
