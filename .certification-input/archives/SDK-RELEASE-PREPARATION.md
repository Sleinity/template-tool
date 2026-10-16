# SDK 2.0.0 release preparation

Core, Browser and React are already versioned 2.0.0. This major version is authorized because published 1.0.0 retains V1 APIs removed by the current contract. Preserve all published 1.0.0 artifacts. Publication requires a separately approved `sdk-v2.0.0` operation; stop if that tag/version already exists.

The current release supports V2 hosts, raw source schema 1.0/exporter 0.6.1 ZIP admission and canonical schema 2.2. Retired V1 workflows are not compatibility routes. Existing current V2 records/resources/recovery remain supported; historical bytes stay untouched. See [release notes](SDK-2.0-RELEASE-NOTES.md) and [breaking changes](SDK-2.0-MIGRATION.md).

## Review and commit

Keep reviewed implementation, documentation and complete starter independently reviewable. Inventory staged paths; exclude credentials, local archives and private ZIP/font inputs. Preserve approved references and historical evidence. Current documentation and executable snippets must agree with checked API inventories. Record current tests, failures and limitations; never transfer historical approval by name alone.

## Generate and certify one candidate

Run portable/strict tests, package/Studio/example types and builds, API/boundary checks, SDK verification and documentation tests. Build and pack sequentially from the intended source commit. Generate a uniquely named local delivery, including the runnable starter and manifest/checksums. Verify every artifact before freezing. Packing still records `not-yet-verified`; certification is separate.

Use `scripts/candidate-certification/frozen.mjs` to freeze and verify the supplied set. Run final npm/pnpm consumers and fresh-host acceptance on macOS and Linux against the same frozen archives with Node 22.23.3 and pnpm 11.9.0. Do not repack or fall back to workspace sources. Current CI run identifiers and encrypted fixture input must be explicit, never borrowed from an old candidate. Keep private ZIPs/fonts encrypted and remove decrypted inputs after CI.

Run the source-authoritative three-export renderer/scene/settlement gate. Review each required surface against source evidence; compare macOS pixels only in their approved environment. Keep references, tolerances and fixture/font hashes unchanged. A correction after freeze requires a new candidate identity and renewed affected acceptance.

## Approval and delivery

Preparation ends with the source commit, intended tag, immutable candidate/checksums, archive-bound cross-platform reports, current guides, complete starter and Bas's [onboarding checklist](SDK-QUICKSTART.md). Bas's personal review follows automated acceptance and is not the publication gate.

Before tagging, verify the guarded publication preparation path reproduces the certified source/artifact inputs. Publication/tagging need explicit approval. Afterwards, registry-derived packages and release assets must pass the same host workflows before declaring the released handoff complete. Never present local/simulated provenance as registry verification. The distribution remains UNLICENSED, for Sleinity-owned applications only.
