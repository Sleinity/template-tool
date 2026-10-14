# Certified publication tooling — Milestone 7

Date: 2026-10-14. Source baseline: Milestone 6 `27cc1ac`. Candidate:
`sdk-1-candidate-20261013k`. SDK packages remain 1.0.0; publication is separate.

## Contract

The private driver verifies the pinned artifact, frozen manifest, three archive
hashes, protected source membership and exact reviewed tooling changes. It never
builds, packs or versions during publication. The root release alias invokes only
this guarded driver. Publication is tag-only at `sdk-v1.0.0`, serialized, ordered
Core → Browser → React, with lifecycle scripts disabled and a journal persisted
before each write. Matches are skipped; conflicts and inaccessible/unknown state
stop. GitHub reruns restore the preceding attempt journal; missing or expired
journals after a started publication require manual reconciliation.

`private-sdk-release` now requires approval from Sleinity, allowing owner
self-review. Its custom policies admit exactly the release tag and main handoff
refresh. No tool approves that deployment. Rehearsal has only read permissions;
production-write permissions remain untested until Milestone 8.

The delivery uses the shared handoff generator. Registry bytes must match the
certificate before consumer checks and prerelease assets. Matching existing assets
are skipped; conflicts cannot clobber. Stable release assets cannot be changed.
Historical package tags and source references are not modified.

## Evidence and boundaries

[Local preparation](evidence/publication-tooling-20261014/local-retention.json)
verifies the actual pinned artifact digest and 44 retained files, with no fixture
decryption. [Verification](evidence/publication-tooling-20261014/verification.json)
records focused tests, portable/build/type/API/boundary/budget checks, simulation,
actual GitHub rehearsal, artifact retention and source/package equivalence.

The original SDK/Studio sources, canonical schema, supported API, package versions,
dependencies, lockfile, references and tolerances remain unchanged. Only private
release tooling, workflow guards, the guarded root release alias and documentation
change. No new manual browser/source/screen-reader review is claimed. The prior
macOS fidelity certificate is retained by protected identity, not new captures.
No registry publication, tag, merge, GitHub release or release-asset upload is part
of this milestone; Actions input/report artifact uploads are explicit exceptions.

See the [publication runbook](../sdk/CERTIFIED_PUBLICATION.md) and
[release roadmap](../sdk/RELEASE_ROADMAP.md). All archived SDK bytes remain immutable.

## Rehearsal disposition

Run `38538500849` failed because the full exact-source consumer expected private
Mac fixture paths on Ubuntu. Run `38540916222` passed after separating an
explicit synthetic, read-only rehearsal from the unchanged full published verifier.
Both npm and pnpm compiled all marked guide snippets and delivered host/helper
with `skipLibCheck: false`, then exercised native single/Family session contracts.
The 90-day delivery artifact `11882221817` is bound to that successful run and
its exact head/digest, not a “latest” lookup. Required production fixture intake
and actual write authorization remain Milestone 8 prerequisites.
