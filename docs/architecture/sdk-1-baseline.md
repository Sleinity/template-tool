# SDK 1.0.0 development baseline — Milestone 9

The [stable release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v1.0.0)
is the runtime baseline. Work starts from reviewed post-handoff main; the immutable
tag remains `33bd70dbca1f02cdd6c80a83dc1ba4666d2ed348`. No SDK code, API, version,
dependency, schema, persistence, renderer, fixture/font, reference or tolerance
changes are part of this handoff. The original dirty checkout/index stays intact.

## Durable identities and verification

The [private baseline record](../../config/sdk-release-baseline.json) binds
candidate `sdk-1-candidate-20261013k`, three archive hashes, delivery identity,
certified runtime sources, protected references/budgets, archived workflow hashes
and sanitized receipts. [Publication](sdk-1-publication.md) records actual Linux
and macOS registry matrices, all 41 assets and human-approved stable promotion.
[Candidate certification](versioned-candidate-certification.md) remains historical.
The final fidelity gate retains 24/12/3/12 passes; no new raster capture or manual
live review is claimed here. Runtime tag-source and fixture/font identities are
checked rather than inferred from passing tests.

`pnpm sdk:baseline:verify --local` checks durable Git evidence. The read-only remote
check verifies tag/release/registry/assets and delivery links against the original
source, without needing expired Actions artifacts or the retired encryption key.
`--hosts` also compiles the delivered V2 example/guide and runs synthetic npm/pnpm
single/Family workflows. It preserves the distinction between ongoing smoke checks
and the full exact-font/PNG certification already retained. Authentication failures
fail the audit; they never mean missing packages. No package writes, build/repack,
fixture decryption or artifact-retention loop occurs in this workflow.

Repository handoff documentation is updated for stable 1.0.0. Its new hashes are
recorded separately; historical descriptors and published assets are unchanged.
Normal SDK documentation generation remains tested in temporary directories.

## Findings disposition

| Finding | Disposition and evidence |
| --- | --- |
| R01 | Closed: [host font authority](host-font-authority.md); borrowed registry and stale-work guards retained |
| R02/R03 | Closed: [V2 example ownership](v2-example-ownership-lifecycle.md); staging, cancellation and stale feedback retained |
| R04 | Closed: [blocked storage](blocked-storage.md); actionable failure and manual Retry retained |
| R05 | Closed: [shared release delivery](release-delivery.md); V2 coverage and bundle validation retained |
| R06 | Closed: [1.0 candidate certification](versioned-candidate-certification.md) plus actual publication/registry/stable receipts |
| R07 | Closed: [reviewed raster disposition](r07-carrousel-raster.md); no subsequent reference or tolerance change |

No broader renderer support claim follows from this release. Unsupported capability
boundaries, platform-specific raster evidence and historical migration limitations
remain explicit. A saved record can require input correction before export.

## Retirement and preservation

The [cleanup inventory](evidence/sdk-1-baseline-20261014/cleanup-inventory.json)
records exact resource IDs, owning runs, ciphertext hashes and allowed actions.
Deletion starts only after merged workflow retirement passes actual read-only
GitHub verification. The dedicated fixture key and verified temporary exact-input
artifacts are retired; journals, reports, frozen deliveries and release assets stay.
Local cleanup is limited to the reviewed encrypted transfer copy. Original source
fixtures/fonts, private captures, user credentials, managed registries, worktree
contents and active handoff workspace are preserved. Historical Git ciphertext is
not erased by key retirement. Unclassified/shared resources remain untouched.

Cleanup passed after the repaired main verification in
[run 38612390717](https://github.com/Sleinity/template-tool/actions/runs/38612390717).
The [actual receipt](evidence/sdk-1-baseline-20261014/cleanup-receipt.json) records
19 outcomes: four already-deleted workflow registrations, the deleted dedicated
key, 13 deleted encrypted-input artifacts and one deleted local transfer copy.
The initial attempt stopped with zero actions because GitHub uses `deleted` for
archived workflow metadata; [PR #30](https://github.com/Sleinity/template-tool/pull/30)
added that observed terminal state and a regression before cleanup resumed.
This bounded repair required an additional PR beyond the originally planned pair.
No SDK or cleanup scope changed. Historical ciphertext remains in Git history.

Status: Milestone 9 complete when this verified receipt is merged.

## Starting the next milestone

Fetch current main and use a new isolated codex branch/worktree; never reset the
original checkout to the release tag. State scope, boundaries and evidence before
runtime edits. Use exact 1.0.0 packed entries for host work; V2 is recommended and
V1 compatibility does not promise canonical 2.0/2.1 migration-on-read. Reimport
incompatible canonical data as documented. Renderer changes follow AGENTS guidance
and produce a new candidate and fresh fidelity gate. A future version needs its
own release contract, not a rerun of retired 1.0.0 publication.


## Known delivery wording limitation

The immutable published bundle retains historical 0.8 installation/administration
wording from its certified source. Use the updated repository installation and
runtime handoff for exact 1.0.0 instructions. No release asset was overwritten to
correct that text; current documentation hashes are separate from historical
bundle provenance. The migration contract remains schema 2.2 with source reimport
for incompatible canonical data, and retained V1 API compatibility.

## Verified implementation and platform evidence

[PR #29](https://github.com/Sleinity/template-tool/pull/29) merged as
`0a0b3f49484ac0c672da3142f0fd2a43006deb7d`; its CI and read-only registry workflow
passed. The narrow terminal-state repair merged as
`7e5065feee19a188bdaa65fc28cb556eb0d15974`; CI and its main read-only run also passed.
Portable CI was corrected to fetch tag history after a reproduced shallow-checkout
failure, with no weakening of the certified source comparison.
Local [verification](evidence/sdk-1-baseline-20261014/local-verification.json)
records builds/typechecks, portable/API/boundary/packed/budget checks. The first
local umbrella stopped at sandbox DNS; the remaining network checks passed on
the authorized rerun. [Read-only host evidence](evidence/sdk-1-baseline-20261014/local-readonly-verification.json)
remains explicitly synthetic; full exact-font and PNG coverage is retained from
Milestone 8. No new manual live review or performance benchmark is claimed.
All 466 certified package/Studio files, 287 protected records, the historical
publication descriptor and three certified archive hashes remain unchanged.
There is no new SDK execution or activation path in these private tools.


The [post-cleanup GitHub receipt](evidence/sdk-1-baseline-20261014/post-cleanup-verification.json)
comes from successful main dispatch
[38613007749](https://github.com/Sleinity/template-tool/actions/runs/38613007749),
after the key and all 13 input artifacts were removed. Both strict registry hosts,
all 41 release assets and published archive hashes passed again with no temporary
input access. Final completion is bound to the merged receipt PR; future work
starts from that reviewed main commit, retaining the runtime tag above.
