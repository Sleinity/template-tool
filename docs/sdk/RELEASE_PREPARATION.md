# SDK 2.0.1 release preparation

Core, Browser and React are versioned 2.0.1 after applying the field-rule patch Changeset. This patch retains the 2.0.0 API and schema contracts. Preserve all published 1.0.0 and 2.0.0 artifacts. Publication requires a separately approved `sdk-v2.0.1` operation; stop if that tag/version already exists. The human approved a bounded template-independent patch release on 2026-10-19; its workflow retains the protected release environment and publishes accepted archives sequentially.

The current release supports V2 hosts, raw source schema 1.0/exporter 0.6.1 ZIP admission and canonical schema 2.2. Retired V1 workflows are not compatibility routes. Existing current V2 records/resources/recovery remain supported; historical bytes stay untouched. See [release notes](SDK_2_0_1_RELEASE_NOTES.md) and [breaking changes](SDK_2_0_MIGRATION.md).

## Approved 2.0.1 functional patch path

For this field-rule patch only, the repository workflow `.github/workflows/sdk-2-0-1-patch.yml` runs portable CI, field-rule/choice/renderer transactions, Studio drafts/setup, API/boundary checks and delivery mutation tests. It builds the three archives sequentially and validates those exact files in secret-free npm/pnpm consumers, including public import/edit/save/reopen, font authority, blocked storage and PNG currentness. The archive publisher is rehearsed with `npm publish --dry-run --ignore-scripts` and then publishes the same accepted bytes without concurrent prepack builds.

The scope guard permits only the reviewed native session and React field-session changes relative to `sdk-v2.0.0`; API/schema/renderer implementation changes cannot use this path. Archive hashes and source commit bind the acceptance receipt. Registry integrity must match the accepted bytes before all package tags are retained. A retry may reuse already-published versions only when their exact integrity and tag commit match; it never overwrites them. Registry-derived packages undergo installed-consumer acceptance before the draft becomes a public GitHub release.

Private exact-template ZIPs and source-pixel certification are outside this approved patch acceptance. No fixture, font hash, golden or tolerance is replaced or changed. This does not claim new source-fidelity certification. Other SDK releases retain the complete certification process below. The detailed repository contract is `docs/architecture/sdk-2-0-1-patch-release.md`.

## Review and commit

Keep reviewed implementation, documentation and complete starter independently reviewable. Inventory staged paths; exclude credentials, local archives and private ZIP/font inputs. Preserve approved references and historical evidence. Current documentation and executable snippets must agree with checked API inventories. Record current tests, failures and limitations; never transfer historical approval by name alone.

## Generate and certify one candidate

Run portable/strict tests, package/Studio/example types and builds, API/boundary checks, SDK verification and documentation tests. Build and pack sequentially from the intended source commit. Generate a uniquely named local delivery, including the runnable starter and manifest/checksums. Verify every artifact before freezing. Packing still records `not-yet-verified`; certification is separate.

Use `scripts/candidate-certification/frozen.mjs` to freeze and verify the supplied set. Run final npm/pnpm consumers and fresh-host acceptance on macOS and Linux against the same frozen archives with Node 22.23.3 and pnpm 11.9.0. Do not repack or fall back to workspace sources. Current CI run identifiers and encrypted fixture input must be explicit, never borrowed from an old candidate. Keep private ZIPs/fonts encrypted and remove decrypted inputs after CI.

Run the source-authoritative three-export renderer/scene/settlement gate. Review each required surface against source evidence; compare macOS pixels only in their approved environment. Keep references, tolerances and fixture/font hashes unchanged. A correction after freeze requires a new candidate identity and renewed affected acceptance.

## Approval and delivery

Preparation ends with the source commit, intended tag, immutable candidate/checksums, archive-bound cross-platform reports, current guides, complete starter and Bas's [onboarding checklist](QUICKSTART.md). Bas's personal review follows automated acceptance and is not the publication gate.

Before tagging, verify the guarded publication preparation path reproduces the certified source/artifact inputs. Publication/tagging need explicit approval. Afterwards, registry-derived packages and release assets must pass the same host workflows before declaring the released handoff complete. Never present local/simulated provenance as registry verification. The distribution remains UNLICENSED, for Sleinity-owned applications only.

Bind the protected release jobs to the current certification run and approved
frozen manifest using the [release environment setup](GITHUB_SETUP.md). Exact
browser fixtures are authenticated test inputs, never public delivery assets.

## Public host-kit delivery

The complete v1 delivery remains the internal acceptance bundle. The [host-kit delivery contract](../architecture/sdk-host-kit-delivery.md) defines the six-asset public projection, curated offline guides, exact extracted-kit checks and non-overwriting publisher. The explicitly approved 2.0.1 compaction removes surplus legacy attachments after verified backup and replaces delivery metadata, preserving the accepted kit, SDK archives and all SDK/package tags. Its protected workflow uses portable exact-kit acceptance and never republishes packages. Future SDK publication still requires all existing certification gates before the public projection is accepted and uploaded.
