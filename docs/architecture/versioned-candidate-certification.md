# SDK 1.0.0 candidate certification — R06 / R07

Date: 2026-10-13. Baseline: **sdk-061-release-delivery-20261013a**.
Certified frozen candidate: **sdk-1-candidate-20261013k**.

**R06 candidate certification is closed; R07 is reconfirmed.** The fixed Core,
Browser and React train is 1.0.0. The candidate passed actual macOS and GitHub
Linux acceptance against identical archives. It is ready for a separate release
approval/publication operation, not published or registry-round-trip verified.
No main-branch merge, release tag or package/registry upload occurred.

## Version and fidelity review

The [retained baseline](evidence/candidate-1-20261013/baseline/identity.json)
preserves sources, changesets, manifests, archive identities and the original dirty
worktree state. The pre-version Carrousel/editor reproduction matched R05 exactly.
R07 remains the documented startup-camera-path/reference resolution; no new
renderer correction or reference promotion was necessary.

Changesets planned exactly three major 1.0.0 releases and were applied once.
Internal workspace dependencies pack as 1.0.0. Lockfile refresh under the pinned
toolchain required no byte change. Generated changelogs and the delivered 1.0
migration/release notes cover schema 2.2, singular image policy, removed draft
APIs, reimport requirements and retained V1 compatibility.

[API review](evidence/candidate-1-20261013/api-review.json) confirms only version
metadata changed. Core's 110,540-byte declaration retains SHA-256
`dbd67c76ff75a1c56e05413e53b73c49b44bba8f33d499dd5ce3f79e4d137e32`;
the 1.0.0 protected expectation was added without altering its historical entry.
All 374 SDK/Studio runtime source hashes match R05. References, scene/settlement
snapshots, fixtures/fonts and tolerances remain unchanged.

## Frozen delivery and actual platform acceptance

Builds and packs ran sequentially using **Node 22.23.3 / pnpm 11.9.0**. Every final
consumer uses the supplied immutable archives and verifies hashes before and
after execution. The archive hashes are:

| Package | SHA-256 |
| --- | --- |
| Core 1.0.0 | `363d07b79d12d73fdc87dfd6341271e9c7819c810a34287f82e86685c9258185` |
| Browser 1.0.0 | `e8f7fc18f5ca0872bd639d0235ddcff496a8d9c794650be35bbcd242eeb3d1e8` |
| React 1.0.0 | `677254fd3fc6af2f85be0b4097ff9d4033d0eb44e6578190577cb641ab93c16b` |

[Mac report](evidence/candidate-1-20261013/macos-k/report.json) and
[Linux report](evidence/candidate-1-20261013/linux-final/report.json) each pass
12 final consumer commands: npm/pnpm current guide, exact single/Family contracts,
actual delivered V2 host, font authority, storage/failure recovery and V1 single/
Family compatibility. Both platforms use Node 22.23.3; Linux is x64 and macOS is
arm64. Strict declarations compile with library checking enabled.

The delivered host passes 24 browser scenarios for each package manager on each
platform, including seven typed controls, five Choice types in both modes,
malformed/overlapping imports, cancellation, accepted-work preservation, shared
owners, save pins, font correction, Reset and PNG export. Carrousel Color and
Reset use raw ZIP numeric values. Synthetic scenarios are explicitly separate
from exact source certification. The storage owner event probe is source-level;
its public host workflows use installed archives.

Actual [Linux run 38442123584](https://github.com/Sleinity/template-tool/actions/runs/38442123584)
passed at immutable commit `eac186d04a51d0757e1983e18741c04bc0e41668` on the isolated
`codex/sdk-1-certification-20261013c` branch. No force push was used. The user's
working checkout/index were not committed, reset or switched. The CI input and
result artifact IDs/digests are retained in the evidence record.

The CI source scope includes runtime/test code, current delivered guidance and
static fixture profiles; private stored review images remain local. Exact ZIPs
and external fonts, including the negative-test font, travel in AES-256-GCM
encrypted inputs with a fresh nonce and a dedicated GitHub secret. Authentication
and hashes are checked before use; plaintext is removed on success/failure.
Artifacts have three-day retention. No key or raw ZIP/font was committed or
printed. The dedicated secret remains repository-owned for reruns.

## Current gate, failures and limitations

Final source-authoritative gate **sdk-1-candidate-20261013k — GO** contains
**24 complete stable captures, 12 renderer passes, three scene passes and 12
settlement passes**. All twelve PNG hashes equal the preceding reviewed gate.
Current review binding retains the R05/R07 source dispositions after exact source,
font, environment, camera and raster checks. There was no reference promotion.
Linux functional checks were not compared to macOS pixel references.

Portable tests, package/Studio/example builds, TypeScript, SDK/API/boundary checks,
unchanged bundle budgets, strict consumers, ownership/storage regressions,
document links and delivery/publication simulation passed. Certification tooling
has 22 passing focused tests. The actual publication workflow prepare path was
simulated against local 1.0.0 archives; no publication command was executed.

Superseded frozen candidates and failures remain auditable. Linux exposed missing
static gate-profile and negative-font inputs, workspace Core normalization in the
example verifier, and Studio configuration coupling in the storage probe. These
were repaired in certification tooling, not SDK behavior. The normalizer now uses
the supplied Core's ESM public entry; an ESM-only regression covers resolution.
No workspace build was added to hide the cold Linux failures. Source changes after
freezing produced new candidate identities and acceptance reruns.

Evidence is automated browser/CLI coverage and stored-source identity inspection.
There is no new manual live, screen-reader or source-design review. Existing
source-reviewed pixels were retained only after byte identity. Registry install
round-trip, actual tagging/publication and environments beyond the recorded
macOS/Linux/browser versions remain unverified. This certification covers the
specified integration contract and exact three-export source baseline, not every
Figma feature, font or host platform.

[Final hash-bound evidence](evidence/candidate-1-20261013/verification.json)
records commands, reports, environments, source scopes, archive/delivery hashes,
review binding, CI commit/run/artifact identities and dispositions.
