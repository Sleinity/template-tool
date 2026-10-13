# SDK 1.0.0 release roadmap

The next release is the fixed **1.0.0** Core, Browser and React train. The starting
point is certified candidate `sdk-1-candidate-20261013k`; publication and registry
installation are still pending. Upcoming SDK milestones should start from the
stable `sdk-v1.0.0` tag once Milestones 6–9 are complete.

[Candidate certification](../architecture/versioned-candidate-certification.md),
[release-source baseline](../architecture/release-source-baseline.md),
[migration guide](SDK_1_0_MIGRATION.md), and
[release notes](SDK_1_0_RELEASE_NOTES.md) define the current contract.

| Milestone | Deliverable | Acceptance | Status |
| --- | --- | --- | --- |
| 6 — Release source baseline | Reviewed `codex/sdk-1-release` branch and PR; classified source/evidence inventory | Clean isolated checkout passes checks; runtime and package contents match the certified candidate; temporary/private inputs excluded | Prepared; validation and PR checks recorded in the baseline report |
| 7 — Certified-artifact publication | Guarded workflow publishes the frozen archives; dry-run rehearsal and partial-publication recovery | Commit, archive hashes and manifest verified; no rebuild substitution; conflicting published versions stop the release | Planned |
| 8 — Publish and verify delivery | GitHub Packages installation and prerelease assets, followed by stable release | Clean npm/pnpm registry acceptance and generated handoff pass; all three 1.0.0 packages verified before stable release | Planned; publication not performed |
| 9 — Record the working baseline | Durable release record and updated SDK handoff | Source commit, tag, registry identities and verification runs are linked; temporary certification inputs retired safely | Planned |

## Milestone 7 — Publication preparation

Publish the certified tarballs after validating their identity against the reviewed
source commit. Pin Node 22.23.3 and pnpm 11.9.0. Preflight permissions, package
versions, the release environment and `sdk-v1.0.0`. Rehearse without publishing,
tagging or uploading assets. For a partial publication, verify existing package
identities and publish only missing packages; never overwrite/delete a version.

## Milestone 8 — Registry acceptance

After release-source review and required checks, merge the release PR and tag its
verified commit. Download all three published packages and verify their identities.
Run the archive-bound npm/pnpm V2 single/Family, font, recovery, failure/Retry,
ownership/disposal, Reset and latest-value PNG workflows. Generate the handoff
from those downloaded archives, checking strict examples, files and anchors.
Keep the GitHub release a prerelease until these checks pass.

## Milestone 9 — Baseline handoff

Record the release tag/commit, archive and delivery hashes, CI results, migration
requirements and remaining limitations. Link `sdk-v1.0.0` from the SDK handoff as
the next development baseline. Retire temporary inputs/secrets only after they
are no longer needed, preserving reports and ownership of unrelated resources.

## Release boundaries

No additional SDK features, schema changes or reference promotion belong in this
roadmap. Runtime changes require a new candidate identity and certification.
Documentation/workflow changes can retain existing certification only when
runtime and package-content identity is established.

Stable publication requires passing API/boundary/build/typecheck/consumer and
bundle checks, actual registry acceptance, and fidelity evidence bound to the
final runtime: **24 stable captures, 12 renderer, three scene and 12 settlement
passes**. Linux functional evidence remains separate from macOS raster evidence.

GitHub release visibility remains public. Packages remain **UNLICENSED**, with
use authorized for **Sleinity-owned applications only**; repository visibility
is not an open-source licence. Milestone 6 performs no merge, tag or publication.
