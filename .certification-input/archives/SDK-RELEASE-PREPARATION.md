# Unpublished SDK release preparation

Core, Browser and React are **1.0.0**, an unpublished fixed-train candidate.
Version application is complete; macOS and Linux certification must pass against
one frozen archive set before release approval. Do not reuse a historical tag.

## Current release changes

Pending changesets are inventoried with exact hashes in the architecture evidence
record. `pnpm exec changeset status` currently requests a major update for the
fixed three-package train. No changeset is consumed and no version is applied here.

| Change | Consumer impact |
| --- | --- |
| Typed V2 fields, canonical content and native single/Family sessions | New preferred seven-field editing path; content, Choice identity and placements stay canonical |
| Canonical package schema 2.2 and singular image replacement policy | Breaking: one Fill/Fit/Crop policy replaces allowed modes/default; canonical 2.0/2.1 requires reimport; source schema 1.0 normalization remains |
| Template-scoped recovery | Breaking: supported draft list/get/save/delete APIs and Family `saveDraft` removed; generic template/session persistence retained |
| V2 ZIP import | Supported importer operation, separated import/parse evidence, blocked/error outcomes and explicit disposal |
| Family selection/configuration | Shared content, explicit selectors, atomic configuration and review-first reimport |
| Lifecycle and source-fidelity corrections | Save queue, asset hydration/leases, exact imported Color, evidence freshness, mask and paint/vector corrections; current individually reviewed references retained |
| Private architecture consolidation | Compiler results, Family preparation and session snapshot/save/hydration/evidence helpers remain internal; no universal session contract for hosts |

The fixed-train major candidate is **1.0.0**, versioned but unpublished. Recovery removal is classified
major; schema 2.2 and singular Image policy already require the major train.
Superseded changeset migration claims are corrected to current reimport behavior.
Published [0.8 migration](SDK-0.8-MIGRATION.md) is historical; follow the current
[1.0 guide](SDK-1.0-MIGRATION.md). Apply changesets only during R06, reconciling
package/internal-dependency/lockfile and declaration-version metadata together.

There are no existing-host upgrade-certification requirements. Current accepted
templates and internal consumers still require verification. Published migration
guides remain historical; V1 wizard/confirmation/session APIs remain supported
compatibility journeys. Older ZIPs are outside the tested exporter 0.6.1 fidelity
baseline and must not be advertised as certified source representations.

## Produce and verify a candidate

Run commands from a cleanly identified worktree, retaining any existing changes:

```sh
pnpm ci:portable
pnpm release-local:verify release-verification-artifacts/<unique-candidate>
node scripts/repository/verify-runtime-release-consumer.mjs --archives release-verification-artifacts/<unique-candidate>
TEMPLATE_CONSUMER_PACKAGE_MANAGER=pnpm node scripts/repository/verify-runtime-release-consumer.mjs --archives release-verification-artifacts/<unique-candidate>
node scripts/repository/verify-template-editor-reference.mjs --archives release-verification-artifacts/<unique-candidate>
node scripts/repository/verify-template-family-reference.mjs --archives release-verification-artifacts/<unique-candidate>
pnpm sdk:gate:061 -- --run-id <unique-source-authoritative-run>
```

Packing builds first and packs sequentially. `LOCAL-CANDIDATE-MANIFEST.json`
records commit, dirty/untracked source inventory, archive hashes, dependencies,
supported/restricted entries, tooling and exact fixture/font identities.
`certification: not-yet-verified` is intentional: creating archives never proves
consumer or fidelity success. Per-package-manager verification reports bind to
that manifest and those archives. The durable architecture record supplies the
overall decision and retains failures as well as final successes.

The consumers install archives without source aliases or private registry
credentials, compile the current V2 guide, and run the exact single/Family
contracts against installed packages. The browser lifecycle and packed editor/
Family references provide separate automated rendering/export evidence.

Use the established macOS headless profile for the three-export fidelity gate.
Verify Node 22 and pnpm 11.9.0 from the release workflow separately; do not compare
Linux/visible-browser output to macOS headless approved pixels. Each capture,
comparison and source-review disposition must refer to the same run. Reusing a
previous reviewed disposition requires exact identity verification, never just
stable output. References and tolerances cannot change during this milestone.

## Handoff and decision

Local and registry-derived artifacts use the same delivery inventory and generator.
`SDK-DELIVERY-MANIFEST.json` binds archive/document/example hashes, provenance and
upload inventory. Validate local paths and anchors in the emitted directory:

```sh
node scripts/release-delivery/cli.mjs verify <bundle-directory>
```

V2 guide compilation and exact single/Family acceptance always run, including
without a local-candidate manifest. Missing guidance or incompatible old published
archives fail clearly; V1-only success is not fallback certification. Publication-
path simulations use local archives, explicitly marked, and upload nothing.

Start with `SDK-V2-INTEGRATION.md` from the bundle. The bundle includes
compatibility documentation with an explicit unpublished notice. Distribution
remains UNLICENSED and authorized for Sleinity-owned applications.

A versioned candidate is **ready for release approval only after macOS and Linux
acceptance pass against the same frozen archives**. It is not published, tagged
or registry-verified. Missing prerequisites or failed consumers/gates remain
release blockers. R06 certifies the applied 1.0.0 train; the guarded tag workflow
is a separate authorized publication operation.

After packaging, seal and verify the archive set before every final host check:

```sh
node scripts/candidate-certification/frozen.mjs freeze <candidate-directory>
node scripts/candidate-certification/run.mjs --archives <candidate-directory> --output <report-directory>
```

This runner never repacks or falls back to workspace packages. Any correction
after freezing requires a new candidate identity and acceptance rerun. GitHub
Linux functional evidence remains separate from the macOS fidelity references;
external exact fixtures/fonts travel as authenticated encrypted CI inputs.
